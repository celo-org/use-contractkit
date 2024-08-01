import { CeloTokenContract } from '@celo/contractkit/lib/base';
import { MiniContractKit } from '@celo/contractkit/lib/mini-kit';
import React from 'react';

import { ConnectorEvents, EventsMap } from './connectors/common';
import { Platform, Priorities, WalletTypes } from './constants';

export type Maybe<T> = T | null | undefined;

/**
 * ID of a Celo chain.
 */
export enum ChainId {
  Alfajores = 44787,
  Baklava = 62320,
  Mainnet = 42220,
}
/**
 * Network connection information.
 */
export interface Network {
  name: string;
  rpcUrl: string;
  graphQl?: string;
  explorer: string;
  chainId: ChainId | number;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface CeloNetwork extends Network {
  chainId: ChainId;
}

/**
 * Information about a provider to use for the dApp.
 */
export interface Provider {
  name: string;
  type: Omit<WalletTypes.WalletConnect, WalletTypes>;
  description: string | JSX.Element;
  icon: string | React.FC<React.SVGProps<SVGSVGElement>>;
  canConnect: () => boolean;
  showInList: () => boolean;
  listPriority: () => Priorities;
  installURL?: string;
}

export interface WalletConnectProvider extends Provider {
  type: WalletTypes.WalletConnect;
  walletConnectId: string;
  supportedPlatforms: Platform[];
  getLink?: (uri: string, platform: Platform) => string | false;
}

/**
 * Connects to the blockchain.
 */
export interface Connector {
  kit: MiniContractKit;
  type: WalletTypes;
  feeCurrency: CeloTokenContract;
  /**
   * `initialised` indicates if the connector
   * has been fully loaded.
   */
  initialised: boolean;
  /**
   * `initialise` loads the connector
   *  and saves it to local storage.
   */
  initialise: (lastUsedAddress?: string) => Promise<this> | this;
  close: () => Promise<void> | void;
  on<E extends ConnectorEvents>(e: E, fn: (arg: EventsMap[E]) => void): void;
  updateFeeCurrency?: (token: CeloTokenContract) => Promise<void>;
  supportsFeeCurrency: () => boolean;
  getDeeplinkUrl?: (uri: string) => string | false;
  /**
   * This isn't the method you want
   * used when wallet changes chain. To change chain from app use startNetworkChangeFromApp()
   */
  continueNetworkUpdateFromWallet?: (network: Network) => void;

  /**
   * when network is changed from dapp side
   * connectors / wallets that dont support this should do X
   * connectors that do support MUST emit a NETWORK_CHANGED event
   */
  startNetworkChangeFromApp: (network: Network) => Promise<void> | void;
}

/**
 * Dapp information.
 */
export interface Dapp {
  name: string;
  description: string;
  url: string;
  icon: string;
  // NOTE for walletConnectProjectId
  // This property is mandatory when selecting a WalletConnect wallet
  // It will not crash the app but will show an error message saying it's
  // misconfigured
  walletConnectProjectId?: string;
}

export interface WalletEntryLogos {
  sm: string;
  md: string;
  lg: string;
}
export interface WalletEntry {
  id: string;
  name: string;
  description: string;
  homepage: string;
  chains: string[];
  versions: string[];
  logos: WalletEntryLogos;
  app: {
    browser: string;
    ios: string;
    android: string;
    mac: string;
    windows: string;
    linux: string;
  };
  mobile: {
    native: string;
    universal: string;
  };
  desktop: {
    native: string;
    universal: string;
  };
  metadata: {
    shortName: string;
    colors: {
      primary: string;
      secondary: string;
    };
  };
  responsive?: {
    mobileFriendly: boolean;
    browserFriendly: boolean;
    mobileOnly: boolean;
    browserOnly: boolean;
  };
}

export type AppRegistry = Record<string, WalletEntry>;

export enum Mode {
  Dark = 'dark',
  Light = 'light',
}

export interface Theme {
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  muted: string;
  background: string;
  error: string;
}

export type AppTheme = {
  [K in Mode]: Theme;
};
