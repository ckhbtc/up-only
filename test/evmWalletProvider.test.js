import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearActiveEvmWallet,
  connectEvmWallet,
  disconnectEvmWallet,
  getActiveEvmProvider,
  getActiveEvmWalletLabel,
} from '../src/services/evmWalletProvider.js';

afterEach(() => {
  clearActiveEvmWallet();
});

test('connectEvmWallet activates the provider selected by the wallet modal', async () => {
  const provider = { request: async () => [] };
  const onboard = {
    connectWallet: async () => [{ label: 'Keplr', provider }],
  };

  const wallet = await connectEvmWallet(onboard);

  assert.equal(wallet.label, 'Keplr');
  assert.equal(getActiveEvmProvider(), provider);
  assert.equal(getActiveEvmWalletLabel(), 'Keplr');
});

test('connectEvmWallet does not replace the provider when the modal is dismissed', async () => {
  const provider = { request: async () => [] };
  await connectEvmWallet({
    connectWallet: async () => [{ label: 'Rabby', provider }],
  });

  await assert.rejects(
    connectEvmWallet({ connectWallet: async () => [] }),
    /Wallet connection was cancelled/,
  );
  assert.equal(getActiveEvmProvider(), provider);
});

test('disconnectEvmWallet clears and disconnects the selected wallet', async () => {
  const disconnected = [];
  const provider = { request: async () => [] };
  const onboard = {
    connectWallet: async () => [{ label: 'MetaMask', provider }],
    disconnectWallet: async ({ label }) => disconnected.push(label),
  };
  await connectEvmWallet(onboard);

  await disconnectEvmWallet(onboard);

  assert.deepEqual(disconnected, ['MetaMask']);
  assert.equal(getActiveEvmProvider({ required: false }), null);
  assert.equal(getActiveEvmWalletLabel(), null);
});

test('getActiveEvmProvider fails clearly before a wallet is selected', () => {
  assert.throws(
    () => getActiveEvmProvider(),
    /Connect a wallet first/,
  );
});
