import { useMemo } from 'react';
import { isMobile } from 'react-device-detect';

import {
  localStorageKeys,
  Priorities,
  PROVIDERS,
  WalletTypes,
} from '../constants';
import { ConnectorProps } from '../screens';
import { Maybe, Provider, WalletConnectProvider, WalletEntry } from '../types';
import localStorage from './localStorage';
import { defaultProviderSort } from './sort';

export function walletToProvider(wallet: WalletEntry): WalletConnectProvider {
  return {
    name: wallet.name,
    type: WalletTypes.WalletConnect,
    description: wallet.description || 'Missing description in registry',
    icon: wallet.logos.md,
    canConnect: () => true,
    showInList: () =>
      isMobile ? Object.values(wallet.mobile).some(Boolean) : true,
    listPriority: () => 0,
    installURL: wallet.homepage,
  };
}

export function getRecent(): Maybe<Provider> {
  const type = localStorage.getItem(localStorageKeys.lastUsedWalletType);
  const id = localStorage.getItem(localStorageKeys.lastUsedWalletId);
  let provider;

  if (id && WalletTypes.WalletConnect === type) {
    provider = Object.values(PROVIDERS).find(
      (p) => (p as WalletConnectProvider).walletConnectId === id
    );
  } else {
    provider = Object.values(PROVIDERS).find((p) => p.type === type);
  }

  if (provider) return provider;
  return null;
}

export default function useProviders(
  wallets: WalletEntry[] = [],
  allScreens: Record<string, React.FC<ConnectorProps>>,
  sort = defaultProviderSort,
  search?: string
) {
  const record: Record<string, Provider> = useMemo(
    () => ({
      ...Object.keys(allScreens).reduce((all, current) => {
        // @ts-ignore
        all[current] = PROVIDERS[current];
        return all;
      }, {}),
      ...wallets.reduce((acc, wallet) => {
        acc[wallet.id] = walletToProvider(wallet);
        return acc;
      }, {} as Record<string, Provider>),
    }),
    [wallets, allScreens]
  );

  const providers = useMemo<[providerKey: string, provider: Provider][]>(() => {
    return Object.entries(record)
      .filter(
        ([providerKey, provider]) =>
          provider.showInList() &&
          (!search || providerKey.toLowerCase().includes(search.toLowerCase()))
      )
      .sort(([, a], [, b]) => sort(a, b));
  }, [record, sort, search]);

  const recentlyUsedProvider = getRecent();
  const prioritizedProviders = useMemo(() => {
    const map = providers.reduce((acc, [providerKey, provider]) => {
      const priority =
        recentlyUsedProvider && recentlyUsedProvider.name === provider.name
          ? Priorities.Recent
          : Priorities.Default;

      if (!acc.has(priority)) {
        acc.set(priority, []);
      }

      acc.get(priority)?.push([providerKey, provider]);
      return acc;
    }, new Map<Priorities, [providerKey: string, provider: Provider][]>());

    return [...map.entries()].sort(([prioA], [prioB]) => prioB - prioA);
  }, [recentlyUsedProvider, providers]);

  return prioritizedProviders;
}
