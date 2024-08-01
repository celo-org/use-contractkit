import type { StrongAddress } from '@celo/base';
import {
  type CeloTokenContract,
  CeloContract,
} from '@celo/contractkit/lib/base';
import {
  type MiniContractKit,
  newKit,
  newKitFromWeb3,
} from '@celo/contractkit/lib/mini-kit';
import {
  type CoinbaseWalletProvider,
  CoinbaseWalletSDK,
} from '@coinbase/wallet-sdk';

import { WalletTypes } from '../constants';
import type { Ethereum } from '../global';
import type { Connector, Dapp, Network } from '../types';
import { getApplicationLogger } from '../utils/logger';
import { switchToNetwork } from '../utils/metamask';
import { type Web3Type, AbstractConnector, ConnectorEvents } from './common';

export default class CoinbaseWalletConnector
  extends AbstractConnector
  implements Connector
{
  public initialised = false;
  public type = WalletTypes.CoinbaseWallet;
  public kit: MiniContractKit;
  public feeCurrency: CeloTokenContract = CeloContract.GoldToken;

  private provider: CoinbaseWalletProvider | null = null;

  constructor(
    private network: Network,
    private manualNetworkingMode: boolean,
    dapp: Pick<Dapp, 'name' | 'icon'>
  ) {
    super();
    this.kit = newKit(network.rpcUrl);

    const sdk = new CoinbaseWalletSDK({
      appName: dapp?.name ?? '',
      appLogoUrl: dapp?.icon ?? '',
      reloadOnDisconnect: false,
      diagnosticLogger: {
        log: (e, p) => {
          // this fixes the app trying to resurrect the cb connector after the wallet has initiated a disconnection as the sdk then reloads the page
          if (
            'walletlink_sdk_metadata_destroyed' === e &&
            p?.alreadyDestroyed === false
          ) {
            this.close();
          }
          getApplicationLogger().debug(
            '[coinbase-wallet] sdk event',
            e,
            'properties',
            p
          );
        },
      },
    });
    this.provider = sdk.makeWeb3Provider(network.rpcUrl, network.chainId);
  }

  async initialise(): Promise<this> {
    if (!this.provider) {
      throw new Error('Coinbase wallet provider not instantiated');
    }
    if (this.initialised) {
      return this;
    }
    const { default: Web3 } = await import('web3');
    const web3 = new Web3(this.provider);

    const [defaultAccount]: StrongAddress[] = await this.provider.request({
      method: 'eth_requestAccounts',
    });

    this.removeListeners();

    try {
      if (!this.manualNetworkingMode) {
        await switchToNetwork(
          this.network,
          this.provider as unknown as Ethereum,
          () => web3.eth.getChainId()
        );
      }
    } catch (e) {
      // if user rejects the switch it will throw but we dont want it to disrupt everything
      // they different chain ids will be enough for dapp devs to decided to reprompt
    }

    const walletChainId: string = await this.provider.request({
      method: 'eth_chainId',
    });

    this.provider.on('chainChanged', this.onChainChanged);
    this.provider.on('accountsChanged', this.onAccountsChanged);

    this.newKit(web3 as unknown as Web3Type, defaultAccount);
    this.initialised = true;

    this.emit(ConnectorEvents.CONNECTED, {
      walletType: this.type,
      walletChainId: Number.parseInt(walletChainId, 16),
      networkName: this.network.name,
      address: defaultAccount,
    });

    return this;
  }

  private onChainChanged = (chainIdHex: string) => {
    const chainId = Number.parseInt(chainIdHex, 16);
    if (this.network.chainId !== chainId) {
      this.emit(ConnectorEvents.WALLET_CHAIN_CHANGED, chainId);
    }
  };

  private removeListeners() {
    if (this.provider) {
      this.provider.removeListener('chainChanged', this.onChainChanged);
      this.provider.removeListener('accountsChanged', this.onAccountsChanged);
    }
  }

  private newKit(web3: Web3Type, defaultAccount: StrongAddress) {
    this.kit = newKitFromWeb3(web3 as unknown as Web3Type);
    this.kit.connection.defaultAccount = defaultAccount;
    return this.kit;
  }

  private onAccountsChanged = (accounts: StrongAddress[]) => {
    if (accounts[0]) {
      this.kit.connection.defaultAccount = accounts[0];
      this.emit(ConnectorEvents.ADDRESS_CHANGED, accounts[0]);
    }
  };

  supportsFeeCurrency() {
    return false;
  }
  async startNetworkChangeFromApp(network: Network) {
    const web3 = this.kit.connection.web3;
    await switchToNetwork(network, this.provider! as unknown as Ethereum, () =>
      web3.eth.getChainId()
    );
    this.continueNetworkUpdateFromWallet(network);
  }

  // for when the wallet is already on the desired network and the kit / dapp need to catch up.
  continueNetworkUpdateFromWallet(network: Network): void {
    this.network = network; // must set to prevent loop
    const web3 = this.kit.connection.web3;
    this.newKit(web3, this.account as StrongAddress); // kit caches things so it need to be recreated
    this.emit(ConnectorEvents.NETWORK_CHANGED, network.name);
  }

  close(): void {
    this.removeListeners();
    try {
      this.kit.connection.stop();
    } catch (e) {
      getApplicationLogger().error(
        '[methods.close] could not stop a already stopped CeloConnection',
        e
      );
    }
    this.disconnect();
    if (this.provider?.connected) {
      // must be called last as it refreshes page which then starts the resurector if disconnect has not been called
      void this.provider?.close();
    }
    return;
  }
}
