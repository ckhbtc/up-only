const INJECTIVE_EVM_CHAIN = {
  id: '0x6f0',
  token: 'INJ',
  label: 'Injective EVM',
  rpcUrl: 'https://sentry.evm-rpc.injective.network/',
};

let onboardPromise = null;
let activeWallet = null;

async function createWalletOnboard() {
  if (typeof window === 'undefined') {
    throw new Error('Wallet selection is only available in a browser.');
  }

  const [{ default: Onboard }, { default: injectedModule }] = await Promise.all([
    import('@web3-onboard/core'),
    import('@web3-onboard/injected-wallets'),
  ]);
  const injected = injectedModule();

  return Onboard({
    wallets: [injected],
    chains: [INJECTIVE_EVM_CHAIN],
    appMetadata: {
      name: 'UpOnly',
      description: 'Long-only max-leverage trading on Injective',
      recommendedInjectedWallets: [
        { name: 'MetaMask', url: 'https://metamask.io/download/' },
        { name: 'Rabby', url: 'https://rabby.io/' },
        { name: 'Keplr', url: 'https://www.keplr.app/download' },
      ],
    },
    connect: {
      autoConnectLastWallet: true,
      removeWhereIsMyWalletWarning: true,
      removeIDontHaveAWalletInfoLink: true,
    },
    accountCenter: {
      desktop: { enabled: false },
      mobile: { enabled: false },
    },
    notify: { enabled: false },
    disableFontDownload: true,
    theme: {
      '--w3o-background-color': '#fffdf0',
      '--w3o-foreground-color': '#ffffff',
      '--w3o-text-color': '#101014',
      '--w3o-border-color': '#101014',
      '--w3o-action-color': '#184fe8',
      '--w3o-border-radius': '8px',
      '--w3o-font-family': 'Trebuchet MS, Arial, sans-serif',
    },
  });
}

export async function getWalletOnboard() {
  if (!onboardPromise) onboardPromise = createWalletOnboard();
  return onboardPromise;
}

export async function connectEvmWallet(onboard = null) {
  const client = onboard || await getWalletOnboard();
  const wallets = await client.connectWallet();
  const selected = wallets?.[0];

  if (!selected?.provider) {
    throw new Error('Wallet connection was cancelled.');
  }

  activeWallet = {
    label: selected.label || 'Injected Wallet',
    provider: selected.provider,
  };
  return activeWallet;
}

export async function disconnectEvmWallet(onboard = null) {
  const selected = activeWallet;
  if (!selected) return;

  try {
    const client = onboard || await getWalletOnboard();
    await client.disconnectWallet({ label: selected.label });
  } finally {
    activeWallet = null;
  }
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
