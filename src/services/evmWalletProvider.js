import { createStore } from 'mipd';

const SUPPORTED_WALLETS = [
  {
    id: 'metamask',
    label: 'MetaMask',
    installUrl: 'https://metamask.io/download/',
    monogram: 'M',
    matchesInfo: (info) => includesWalletName(info, ['metamask']),
    matchesProvider: (provider) => Boolean(
      provider?.isMetaMask
      && !provider?.isRabby
      && !provider?.rabby
      && !provider?.isKeplr
      && !provider?.keplr,
    ),
  },
  {
    id: 'rabby',
    label: 'Rabby',
    installUrl: 'https://rabby.io/',
    monogram: 'R',
    matchesInfo: (info) => includesWalletName(info, ['rabby']),
    matchesProvider: (provider) => Boolean(provider?.isRabby || provider?.rabby),
  },
  {
    id: 'keplr',
    label: 'Keplr',
    installUrl: 'https://www.keplr.app/download',
    monogram: 'K',
    matchesInfo: (info) => includesWalletName(info, ['keplr']),
    matchesProvider: (provider) => Boolean(provider?.isKeplr || provider?.keplr),
  },
];

let providerStore = null;
let activeWallet = null;

function includesWalletName(info = {}, names) {
  const identity = `${info.name || ''} ${info.rdns || ''}`.toLowerCase();
  return names.some(name => identity.includes(name));
}

function safeWalletIcon(icon) {
  return typeof icon === 'string' && /^data:image\/(?:png|jpe?g|webp|svg\+xml)[;,]/i.test(icon)
    ? icon
    : null;
}

function legacyProviders(windowObject) {
  const ethereum = windowObject?.ethereum;
  if (!ethereum) return [];
  const providers = Array.isArray(ethereum.providers) ? ethereum.providers : [ethereum];
  return [...new Set(providers.filter(provider => provider?.request))];
}

export function listEvmWallets({ announced = [], windowObject } = {}) {
  const browserWindow = windowObject ?? (typeof window !== 'undefined' ? window : {});
  const legacy = legacyProviders(browserWindow);

  return SUPPORTED_WALLETS.map(wallet => {
    const detail = announced.find(candidate => wallet.matchesInfo(candidate?.info));
    const provider = detail?.provider || legacy.find(candidate => wallet.matchesProvider(candidate));

    return {
      id: wallet.id,
      label: wallet.label,
      installUrl: wallet.installUrl,
      monogram: wallet.monogram,
      icon: safeWalletIcon(detail?.info?.icon),
      provider: provider || null,
      installed: Boolean(provider),
    };
  });
}

function getProviderStore() {
  if (typeof window === 'undefined') return null;
  if (!providerStore) providerStore = createStore();
  return providerStore;
}

export function getEvmWallets() {
  const store = getProviderStore();
  return listEvmWallets({
    announced: store?.getProviders() || [],
    windowObject: typeof window !== 'undefined' ? window : {},
  });
}

export function subscribeEvmWallets(listener) {
  const store = getProviderStore();
  if (!store) return () => {};
  return store.subscribe(() => listener(getEvmWallets()));
}

export function refreshEvmWallets() {
  getProviderStore()?.reset();
}

export async function connectEvmWallet(wallet) {
  if (!wallet?.provider || !wallet.installed) {
    throw new Error(`${wallet?.label || 'Wallet'} is not installed.`);
  }

  activeWallet = {
    label: wallet.label,
    provider: wallet.provider,
  };
  return activeWallet;
}

export function getActiveEvmProvider({ required = true } = {}) {
  if (activeWallet?.provider) return activeWallet.provider;
  if (!required) return null;
  throw new Error('Connect a wallet first.');
}

export function getActiveEvmWalletLabel() {
  return activeWallet?.label || null;
}

export function clearActiveEvmWallet() {
  activeWallet = null;
}
