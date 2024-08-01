import { newKit } from '@celo/contractkit/lib/mini-kit';
import { GoldTokenWrapper } from '@celo/contractkit/lib/wrappers/GoldTokenWrapper';
import { StableTokenWrapper } from '@celo/contractkit/lib/wrappers/StableTokenWrapper';

import { Alfajores, Baklava, Mainnet } from '../constants';
import { Ethereum } from '../global';
import { CeloNetwork, ChainId, Network } from '../types';

const CELO_PARAMS = Object.freeze({
  chainName: 'Celo',
  testnet: false,
  nativeCurrency: {
    name: 'CELO',
  },
});

const ALFAJORES_PARAMS = Object.freeze({
  chainName: 'Alfajores Testnet',
  testnet: true,
  nativeCurrency: {
    name: 'A-CELO',
  },
});

const BAKLAVA_PARAMS = Object.freeze({
  chainName: 'Baklava Testnet',
  testnet: true,
  nativeCurrency: {
    name: 'B-CELO',
  },
});

type CHAIN_PARAMS =
  | typeof CELO_PARAMS
  | typeof ALFAJORES_PARAMS
  | typeof BAKLAVA_PARAMS;

const PARAMS: { [chain in ChainId]: CHAIN_PARAMS } = {
  [ChainId.Mainnet]: CELO_PARAMS,
  [ChainId.Alfajores]: ALFAJORES_PARAMS,
  [ChainId.Baklava]: BAKLAVA_PARAMS,
};

// First Class Supported Networks
const NETWORKS = {
  [ChainId.Mainnet]: Mainnet,
  [ChainId.Alfajores]: Alfajores,
  [ChainId.Baklava]: Baklava,
};

export interface ERC20Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;
}

export interface AddERC20TokenParameter {
  type: 'ERC20';
  options: ERC20Token;
}

export interface CeloTokens {
  CELO: GoldTokenWrapper;
  cUSD: StableTokenWrapper;
  cEUR: StableTokenWrapper;
  cREAL: StableTokenWrapper;
}
export type StableTokens = Omit<CeloTokens, 'CELO'>;

export interface AddEthereumChainParameter {
  chainId: string;
  chainName: string;
  nativeCurrency: Omit<ERC20Token, 'address'>;
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[]; // Currently ignored by metamask
}

export enum MetamaskRPCErrorCode {
  AwaitingUserConfirmation = -32002,
  UnrecognizedChainID = -32603, // this is the error that shows up on metamask mobile
  UnknownNetwork = 4902,
}

export interface MetamaskRPCError {
  code: MetamaskRPCErrorCode;
  message: string;
  stack: string;
}

export const makeNetworkParams = async (
  info: CeloNetwork,
  CELO: GoldTokenWrapper
): Promise<AddEthereumChainParameter> => {
  const [symbol, decimals] = await Promise.all([
    CELO.symbol(),
    CELO.decimals(),
  ]);

  return {
    chainId: `0x${info.chainId.toString(16)}`,
    chainName: PARAMS[info.chainId].chainName ?? info.name,
    nativeCurrency: {
      name: PARAMS[info.chainId].nativeCurrency.name,
      symbol,
      decimals,
    },
    rpcUrls: [info.rpcUrl],
    blockExplorerUrls: [info.explorer],
    iconUrls: [`https://celoreserve.org/assets/tokens/${symbol}.svg`], // unfortunately unused
  };
};

export const tokenToParam = async (
  token: GoldTokenWrapper | StableTokenWrapper
): Promise<AddERC20TokenParameter> => {
  const [symbol, decimals, name] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.name(),
  ]);

  return {
    type: 'ERC20',
    options: {
      address: token.address,
      name,
      symbol,
      decimals,
      image: `https://reserve.mento.org/assets/tokens/${symbol}.svg`,
    },
  };
};

export const makeAddCeloTokensParams = async (
  tokens: StableTokens
): Promise<AddERC20TokenParameter[]> =>
  Promise.all(Object.values(tokens).map(tokenToParam));

export const addTokensToMetamask = async (
  ethereum: Ethereum,
  tokens: StableTokens
): Promise<boolean> => {
  const tokenParams = await makeAddCeloTokensParams(tokens);
  const added = (
    await Promise.all(
      tokenParams.map((params) =>
        ethereum?.request({
          method: 'wallet_watchAsset',
          params,
        })
      )
    )
  ).every(Boolean);

  return added;
};

export const addNetworkToMetamask = async (
  ethereum: Ethereum,
  networkConfig: Network
): Promise<void> => {
  try {
    // For Celo Chains
    if (Object.keys(NETWORKS).includes(networkConfig.chainId.toString())) {
      const { CELO, ...tokens } = (await newKit(
        networkConfig.rpcUrl
      ).celoTokens.getWrappers()) as CeloTokens;

      await ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [await makeNetworkParams(networkConfig, CELO)],
      });

      await addTokensToMetamask(ethereum, tokens);

      // For other chains
    } else {
      await ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: networkConfig.chainId,
            chainName: networkConfig.name,
            rpcUrls: [networkConfig.rpcUrl],
            blockExplorerUrls: [networkConfig.explorer],
            nativeCurrency: networkConfig.nativeCurrency,
          },
        ],
      });
    }
  } catch (err) {
    const { code } = err as MetamaskRPCError;
    if (code === MetamaskRPCErrorCode.AwaitingUserConfirmation) {
      // user has already been requested to add the network
      // maybe add a user CTA
      throw new Error(
        `Please check your Metamask window to add ${networkConfig.name} to Metamask`
      );
    } else {
      throw err;
    }
  }
};

export async function addNetworksToMetamask(ethereum: Ethereum): Promise<void> {
  await Promise.all(
    Object.values(NETWORKS).map((network) =>
      addNetworkToMetamask(ethereum, network)
    )
  );
}

export async function switchToNetwork(
  network: Network,
  ethereum: Ethereum,
  getChainId: () => Promise<number>
): Promise<void> {
  const [chainId, walletChainId] = await Promise.all([
    getChainId(),
    getWalletChainId(ethereum),
  ]);
  if (network.chainId !== chainId || network.chainId !== walletChainId) {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [
          {
            chainId: `0x${network.chainId.toString(16)}`,
          },
        ],
      });
      await networkHasUpdated(getChainId, network.chainId);
    } catch (err) {
      const { code } = err as MetamaskRPCError;
      if (
        code === MetamaskRPCErrorCode.UnknownNetwork ||
        code === MetamaskRPCErrorCode.UnrecognizedChainID
      ) {
        // ChainId not yet added to metamask
        await addNetworkToMetamask(ethereum, network);
        return switchToNetwork(network, ethereum, getChainId);
      } else if (code === MetamaskRPCErrorCode.AwaitingUserConfirmation) {
        // user has already been requested to switch the network
        return;
      } else {
        throw err;
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SLEEP = 500;
const MAX_WAIT_MINUTES = 3;
const MAX_RETRY = Math.round((MAX_WAIT_MINUTES * 1000) / SLEEP);

// Hacky workaround to wait for the network to change.\

export const networkHasUpdated = async (
  getChainId: () => Promise<number>,
  expectedChainId: number
) => {
  let attempts = 0;
  let isNetworkUpdated = false;
  while (!isNetworkUpdated) {
    attempts++;
    if (attempts >= MAX_RETRY) {
      throw new Error('Network did not change');
    }
    const chainId = await getChainId();
    if (chainId === expectedChainId) {
      isNetworkUpdated = true;
      return true;
    }
    await sleep(SLEEP);
  }
};

export async function getWalletChainId(ethereum: Ethereum) {
  const walletChainId = ethereum.chainId
    ? ethereum.chainId
    : await ethereum.request({ method: 'eth_chainId' });
  return parseInt(walletChainId, 16);
}
