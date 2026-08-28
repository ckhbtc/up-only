import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearActiveEvmWallet,
  connectEvmWallet,
  getActiveEvmProvider,
  getActiveEvmWalletLabel,
  listEvmWallets,
} from '../src/services/evmWalletProvider.js';

afterEach(() => {
  clearActiveEvmWallet();
});

test('listEvmWallets recognizes MetaMask, Rabby, and Keplr EIP-6963 providers', () => {
  const metamask = { request: async () => [] };
  const rabby = { request: async () => [] };
  const keplr = { request: async () => [] };
  const wallets = listEvmWallets({
    announced: [
      { info: { name: 'Rabby Wallet', rdns: 'io.rabby', icon: 'data:image/svg+xml,rabby' }, provider: rabby },
      { info: { name: 'Keplr', rdns: 'app.keplr', icon: 'data:image/svg+xml,keplr' }, provider: keplr },
      { info: { name: 'MetaMask', rdns: 'io.metamask', icon: 'data:image/svg+xml,metamask' }, provider: metamask },
    ],
    windowObject: {},
  });

  assert.deepEqual(wallets.map(wallet => wallet.label), ['MetaMask', 'Rabby', 'Keplr']);
  assert.deepEqual(wallets.map(wallet => wallet.installed), [true, true, true]);
  assert.equal(wallets[2].provider, keplr);
});

test('listEvmWallets falls back to legacy provider arrays without confusing Rabby for MetaMask', () => {
  const request = async () => [];
  const metamask = { isMetaMask: true, request };
  const rabby = { isMetaMask: true, isRabby: true, request };
  const keplr = { isMetaMask: true, keplr: true, request };
  const wallets = listEvmWallets({
    announced: [],
    windowObject: { ethereum: { providers: [rabby, metamask, keplr] } },
  });

  assert.equal(wallets[0].provider, metamask);
  assert.equal(wallets[1].provider, rabby);
  assert.equal(wallets[2].provider, keplr);
});

test('listEvmWallets keeps supported but unavailable wallets visible', () => {
  const wallets = listEvmWallets({ announced: [], windowObject: {} });

  assert.deepEqual(wallets.map(wallet => wallet.label), ['MetaMask', 'Rabby', 'Keplr']);
  assert.deepEqual(wallets.map(wallet => wallet.installed), [false, false, false]);
  assert.ok(wallets.every(wallet => wallet.installUrl));
});

test('connectEvmWallet activates the explicitly selected provider', async () => {
  const provider = { request: async () => [] };
  const wallet = await connectEvmWallet({ label: 'Keplr', provider, installed: true });

  assert.equal(wallet.label, 'Keplr');
  assert.equal(getActiveEvmProvider(), provider);
  assert.equal(getActiveEvmWalletLabel(), 'Keplr');
});

test('connectEvmWallet refuses unavailable wallet options', async () => {
  await assert.rejects(
    connectEvmWallet({ label: 'Keplr', provider: null, installed: false }),
    /Keplr is not installed/,
  );
  assert.equal(getActiveEvmProvider({ required: false }), null);
});

test('getActiveEvmProvider fails clearly before a wallet is selected', () => {
  assert.throws(
    () => getActiveEvmProvider(),
    /Connect a wallet first/,
  );
});
