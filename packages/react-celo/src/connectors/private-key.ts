import type { StrongAddress } from '@celo/base';
import { CeloTokenContract } from '@celo/contractkit/lib/base';
import { MiniContractKit, newKit } from '@celo/contractkit/lib/mini-kit';
import { LocalWallet } from '@celo/wallet-local';

import { localStorageKeys, WalletTypes } from '../constants';
import { Connector, Network } from '../types';
import { setTypedStorageKey } from '../utils/local-storage';
import {
  AbstractConnector,
  ConnectorEvents,
  updateFeeCurrency,
} from './common';

export default class PrivateKeyConnector
  extends AbstractConnector
  implements Connector
{
  public initialised = false;
  public type = WalletTypes.PrivateKey;
  public kit: MiniContractKit;
  private wallet: LocalWallet;
  constructor(
    private network: Network,
    privateKey: string,
    public feeCurrency: CeloTokenContract
  ) {
    super();
    this.wallet = new LocalWallet();
    this.wallet.addAccount(privateKey);
    this.kit = this.newKit(network);
    setTypedStorageKey(localStorageKeys.lastUsedPrivateKey, privateKey);
  }

  async initialise(): Promise<this> {
    if (this.initialised) return this;

    await this.updateFeeCurrency(this.feeCurrency);
    this.initialised = true;

    this.emit(ConnectorEvents.CONNECTED, {
      networkName: this.network.name,
      walletType: this.type,
      walletChainId: null,
      address: this.kit.connection.defaultAccount as string,
    });
    return this;
  }

  async startNetworkChangeFromApp(network: Network) {
    this.kit = this.newKit(network);
    await this.updateFeeCurrency(this.feeCurrency); // new kit so we must set the feeCurrency again
    this.emit(ConnectorEvents.NETWORK_CHANGED, network.name);
  }

  private newKit(network: Network) {
    const kit = newKit(network.rpcUrl, this.wallet);
    kit.connection.defaultAccount =
      this.wallet.getAccounts()[0] as StrongAddress;
    return kit;
  }

  supportsFeeCurrency() {
    return true;
  }

  updateFeeCurrency: typeof updateFeeCurrency = updateFeeCurrency.bind(this);

  close(): void {
    setTypedStorageKey(localStorageKeys.lastUsedPrivateKey, '');
    try {
      this.kit.connection.stop();
    } finally {
      this.disconnect();
    }
  }
}
