import type { CeloTokenContract } from '@celo/contractkit/lib/base';
import type { StrongAddress } from '@celo/base';

import { type MiniContractKit, newKit } from '@celo/contractkit/lib/mini-kit';
import {
  type LedgerWallet,
  newLedgerWalletWithSetup,
} from '@celo/wallet-ledger';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

import { WalletTypes } from '../constants';
import type { Connector, Network } from '../types';
import {
  AbstractConnector,
  ConnectorEvents,
  updateFeeCurrency,
} from './common';

export default class LedgerConnector
  extends AbstractConnector
  implements Connector
{
  public initialised = false;
  public type = WalletTypes.Ledger;
  public kit: MiniContractKit;
  private wallet: LedgerWallet | undefined;
  constructor(
    private network: Network,
    private index: number,
    public feeCurrency: CeloTokenContract
  ) {
    super();
    this.kit = newKit(network.rpcUrl);
  }

  private getWallet() {
    return this.wallet;
  }

  private async createWallet(index: number) {
    const transport = await TransportWebUSB.create();
    this.wallet = await newLedgerWalletWithSetup(transport, [index]);
    return this.wallet;
  }

  private async createKit(wallet: LedgerWallet, network: Network) {
    this.kit = newKit(network.rpcUrl, wallet);
    this.kit.connection.defaultAccount =
      wallet.getAccounts()[0] as StrongAddress;
    if (this.feeCurrency) {
      await this.updateFeeCurrency(this.feeCurrency);
    }
  }

  async initialise(): Promise<this> {
    if (this.initialised) {
      return this;
    }

    const wallet = await this.createWallet(this.index);
    await this.createKit(wallet, this.network);

    this.initialised = true;

    this.emit(ConnectorEvents.CONNECTED, {
      walletChainId: null,
      walletType: this.type,
      address: this.kit.connection.defaultAccount as string,
      index: this.index,
      networkName: this.network.name,
    });
    return this;
  }

  supportsFeeCurrency() {
    return true;
  }

  async startNetworkChangeFromApp(network: Network) {
    await this.createKit(this.getWallet() as LedgerWallet, network);
    this.emit(ConnectorEvents.NETWORK_CHANGED, network.name);
  }

  updateFeeCurrency: typeof updateFeeCurrency = updateFeeCurrency.bind(this);

  close(): void {
    try {
      this.kit.connection.stop();
    } finally {
      this.disconnect();
    }
  }
}
