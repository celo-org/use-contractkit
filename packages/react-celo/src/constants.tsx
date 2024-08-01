import { isMobile } from 'react-device-detect';

import * as Icons from './components/icons';
import {
  ChainId,
  Maybe,
  Network,
  Provider,
  WalletConnectProvider,
} from './types';
import { isEthereumFromMetamask, isEthereumPresent } from './utils/ethereum';

export enum localStorageKeys {
  lastUsedAddress = 'react-celo/last-used-address',
  lastUsedNetwork = 'react-celo/last-used-network',
  lastUsedWalletType = 'react-celo/last-used-wallet',
  lastUsedWalletId = 'react-celo/last-used-wallet-id',
  lastUsedWallets = 'react-celo/last-used-wallets',
  lastUsedIndex = 'react-celo/last-used-index',
  lastUsedPrivateKey = 'react-celo/last-used-private-key',
  lastUsedFeeCurrency = 'react-celo/last-used-fee-currency',
}

export enum SupportedProviders {
  CeloExtensionWallet = 'Celo Extension Wallet',
  CeloTerminal = 'Celo Terminal',
  CeloWallet = 'Celo Wallet',
  CeloDance = 'CeloDance',
  Injected = 'Injected',
  Ledger = 'Ledger',
  MetaMask = 'MetaMask',
  PrivateKey = 'Private key',
  Valora = 'Valora',
  WalletConnect = 'WalletConnect',
  // backwards compatibility
  Steakwallet = 'Omni',
  Omni = 'Omni',
  CoinbaseWallet = 'Coinbase Wallet',
}
export enum WalletTypes {
  Valora = 'Valora',
  MetaMask = 'MetaMask',
  WalletConnect = 'WalletConnect',
  CeloDance = 'CeloDance',
  CeloWallet = 'CeloWallet',
  CeloTerminal = 'CeloTerminal',
  CeloExtensionWallet = 'CeloExtensionWallet',
  Ledger = 'Ledger',
  Injected = 'Injected',
  PrivateKey = 'PrivateKey',
  Unauthenticated = 'Unauthenticated',
  CoinbaseWallet = 'CoinbaseWallet',
}

export enum Priorities {
  Default = 0,
  Popular = 1,
  Recent = 2,
}

export enum Platform {
  Mobile = 'Mobile',
  Desktop = 'Desktop',
  Web = 'Web',
}

export const WalletIds = {
  WalletConnect: '_',
  Valora: 'd01c7758d741b363e637a817a09bcf579feae4db9f5bb16f599fdd1f66e2f974',
  CeloWallet:
    '36d854b702817e228d5c853c528d7bdb46f4bb041d255f67b82eb47111e5676b',
  CeloDance: 'TODO',
  CeloTerminal:
    '8f8506b7f191a8ab95a8295fc8ca147aa152b1358bee4283d6ad2468d97e0ca4',
  Omni: 'afbd95522f4041c71dd4f1a065f971fd32372865b416f95a0b1db759ae33f2a7',
};

export const PROVIDERS: {
  [K in SupportedProviders]: Provider;
} = {
  [SupportedProviders.Valora]: {
    name: SupportedProviders.Valora,
    type: WalletTypes.WalletConnect,
    description:
      'Connect to Valora, a mobile payments app that works worldwide',
    icon: Icons.Valora,
    canConnect: () => true,
    showInList: () => true,
    listPriority: () => Priorities.Popular,
    installURL: 'https://valoraapp.com/',
    walletConnectId: WalletIds.Valora,
    supportedPlatforms: [Platform.Mobile],
    getLink: (uri: string, platform = Platform.Mobile) => {
      switch (platform) {
        case Platform.Mobile:
          return `celo://wallet/wc?uri=${uri}`;
        default:
          return false;
      }
    },
  } as WalletConnectProvider,
  [SupportedProviders.WalletConnect]: {
    name: SupportedProviders.WalletConnect,
    type: WalletTypes.WalletConnect,
    description: 'Scan a QR code to connect your wallet',
    icon: Icons.WalletConnect,
    canConnect: () => true,
    showInList: () => true,
    listPriority: () => Priorities.Default,
    supportedPlatforms: [Platform.Mobile],
  } as WalletConnectProvider,
  [SupportedProviders.Ledger]: {
    name: SupportedProviders.Ledger,
    type: WalletTypes.Ledger,
    description: 'Sync with your Ledger hardware wallet',
    icon: Icons.Ledger,
    canConnect: () => true,
    showInList: () => !isMobile,
    listPriority: () => Priorities.Popular,
  },
  [SupportedProviders.CeloWallet]: {
    name: SupportedProviders.CeloWallet,
    type: WalletTypes.WalletConnect,
    description: 'Connect to Celo Wallet for web or desktop',
    icon: Icons.Celo,
    canConnect: () => true,
    showInList: () => true,
    listPriority: () => Priorities.Default,
    walletConnectId: WalletIds.CeloWallet,
    installURL: 'https://celowallet.app/',
    supportedPlatforms: [Platform.Desktop, Platform.Web],
    getLink: (uri: string, platform = Platform.Mobile) => {
      switch (platform) {
        case Platform.Desktop:
          return `celowallet://wc?uri=${encodeURIComponent(uri)}`;
        case Platform.Web:
          return `https://celowallet.app/wc?uri=${encodeURIComponent(uri)}`;
        default:
          return false;
      }
    },
  } as WalletConnectProvider,
  [SupportedProviders.CeloTerminal]: {
    name: SupportedProviders.CeloTerminal,
    type: WalletTypes.WalletConnect,
    description: 'Connect to the Celo Terminal desktop app',
    icon: Icons.CeloTerminal,
    canConnect: () => true,
    showInList: () => !isMobile,
    listPriority: () => Priorities.Default,
    installURL: 'https://celoterminal.com/',
    walletConnectId: WalletIds.CeloTerminal,
    supportedPlatforms: [],
  } as WalletConnectProvider,
  [SupportedProviders.MetaMask]: {
    name: SupportedProviders.MetaMask,
    type: WalletTypes.MetaMask,
    description: isMobile
      ? isEthereumFromMetamask()
        ? 'Connect with MetaMask Mobile App'
        : 'Open MetaMask Mobile App'
      : 'Use the Metamask browser extension. Celo support is limited.',
    icon: Icons.MetaMask,
    canConnect: () => isMobile || isEthereumFromMetamask(),
    showInList: () => true,
    listPriority: () => Priorities.Popular,
    installURL: isMobile
      ? 'https://metamask.app.link/dapp/' +
        window.location.href.replace(/^https?:\/\//, '')
      : 'https://metamask.app.link/',
  },
  [SupportedProviders.CeloExtensionWallet]: {
    name: SupportedProviders.CeloExtensionWallet,
    type: WalletTypes.CeloExtensionWallet,
    description: 'Use a wallet from the the Celo chrome extension',
    icon: Icons.ChromeExtensionStore,
    canConnect: () => !!window.celo,
    showInList: () => !isMobile,
    listPriority: () => Priorities.Default,
    installURL:
      'https://chrome.google.com/webstore/detail/celoextensionwallet/kkilomkmpmkbdnfelcpgckmpcaemjcdh/related',
  },
  [SupportedProviders.Injected]: {
    name: SupportedProviders.Injected,
    type: WalletTypes.Injected,
    description: 'Connect any Ethereum wallet to Celo',
    icon: Icons.Ethereum,
    canConnect: () => isEthereumPresent(),
    showInList: () => isEthereumFromMetamask(),
    listPriority: () => Priorities.Default,
  },
  [SupportedProviders.PrivateKey]: {
    name: SupportedProviders.PrivateKey,
    type: WalletTypes.PrivateKey,
    description:
      'Enter a plaintext private key to load your account (testing only)',
    icon: Icons.PrivateKey,
    canConnect: () => true,
    showInList: () => process.env.NODE_ENV !== 'production',
    listPriority: () => Priorities.Default,
  },
  [SupportedProviders.CeloDance]: {
    name: SupportedProviders.CeloDance,
    type: WalletTypes.WalletConnect,
    description: 'Send, vote, and earn rewards within one wallet',
    icon: Icons.CeloDance,
    canConnect: () => true,
    showInList: () => true,
    listPriority: () => Priorities.Default,
    installURL: 'https://celo.dance/',
    walletConnectId: WalletIds.CeloDance,
    supportedPlatforms: [Platform.Mobile],
    getLink: (uri: string, platform = Platform.Mobile) => {
      switch (platform) {
        case Platform.Mobile:
          return `celo://wallet/wc?uri=${uri}`;
        default:
          return false;
      }
    },
  } as WalletConnectProvider,
  [SupportedProviders.Omni]: {
    name: SupportedProviders.Omni,
    description: 'Scan a QR code to connect your wallet',
    type: WalletTypes.WalletConnect,
    icon: Icons.Omni,
    canConnect: () => true,
    showInList: () => true,
    listPriority: () => Priorities.Default,
    installURL: 'https://omniwallet.app.link',
    walletConnectId: WalletIds.Omni,
    supportedPlatforms: [Platform.Mobile],
    getLink: (uri: string, platform = Platform.Mobile) => {
      switch (platform) {
        case Platform.Mobile:
          return `omni://wc?uri=${uri}`;
        default:
          return false;
      }
    },
  } as WalletConnectProvider,
  [SupportedProviders.CoinbaseWallet]: {
    name: SupportedProviders.CoinbaseWallet,
    type: WalletTypes.CoinbaseWallet,
    description: 'Scan a QR code to connect your wallet',
    icon: Icons.CoinbaseWallet,
    canConnect: () => true,
    showInList: () => true,
    listPriority: () => Priorities.Default,
  },
};

// If adding another chain be sure to add it to the ChainId enum
// and to requiredNamespaces in packages/walletconnect/src/wc-wallet.ts
export const NetworkNames = {
  Alfajores: 'Alfajores' as const,
  Baklava: 'Baklava' as const,
  Mainnet: 'Mainnet' as const,
  Localhost: 'Localhost' as const,
};

export const Alfajores = {
  name: NetworkNames.Alfajores,
  rpcUrl: 'https://alfajores-forno.celo-testnet.org',
  graphQl: 'https://explorer.celo.org/alfajores/graphiql',
  explorer: 'https://explorer.celo.org/alfajores',
  chainId: ChainId.Alfajores,
} as const;

export const Baklava: Network = {
  name: NetworkNames.Baklava,
  rpcUrl: 'https://baklava-forno.celo-testnet.org',
  graphQl: 'https://explorer.celo.org/baklava/graphiql',
  explorer: 'https://explorer.celo.org/baklava',
  chainId: ChainId.Baklava,
} as const;

export const Mainnet: Network = {
  name: NetworkNames.Mainnet,
  rpcUrl: 'https://forno.celo.org',
  graphQl: 'https://explorer.celo.org/mainnet/graphiql',
  explorer: 'https://explorer.celo.org/mainnet',
  chainId: ChainId.Mainnet,
} as const;

export const Localhost: Network = {
  name: NetworkNames.Localhost,
  rpcUrl: 'http://localhost:8545',
  graphQl: '',
  explorer: '',
  chainId: 1337,
} as const;

/**
 * These wallets cannot have their networks
 * updated via react-celo
 */
export const STATIC_NETWORK_WALLETS = [WalletTypes['CeloExtensionWallet']];

/**
 * Gets the provider associated with a wallet type.
 * @param wallet
 * @returns
 */
export const getProviderForWallet = (
  wallet: WalletTypes
): Maybe<SupportedProviders> =>
  wallet === WalletTypes.Unauthenticated ? null : SupportedProviders[wallet];

/**
 * Default networks to connect to.
 */
export const DEFAULT_NETWORKS: Network[] = [
  Mainnet,
  Alfajores,
  Baklava,
  ...(process.env.NODE_ENV !== 'production' ? [Localhost] : []),
];

/**
 * Chain ID of a default network.
 */
export type DefaultChainId = ChainId.Mainnet | ChainId.Alfajores;
