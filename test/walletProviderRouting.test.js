import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { connectWallet, onAccountsChanged } from '../src/services/wallet.js';
import {
  clearActiveEvmWallet,
  connectEvmWallet,
} from '../src/services/evmWalletProvider.js';

afterEach(() => {
  clearActiveEvmWallet();
});

test('wallet connection requests accounts from the selector provider', async () => {
  const calls = [];
  const provider = {
    request: async (request) => {
      calls.push(request);
      return ['0x1111111111111111111111111111111111111111'];
    },
  };
  await connectEvmWallet({
    connectWallet: async () => [{ label: 'Keplr', provider }],
  });

  const wallet = await connectWallet();

  assert.equal(wallet.ethAddress, '0x1111111111111111111111111111111111111111');
  assert.deepEqual(calls, [{ method: 'eth_requestAccounts' }]);
});

test('account events subscribe to and unsubscribe from the selector provider', async () => {
  let handler = null;
  let removed = null;
  const provider = {
    request: async () => ['0x1111111111111111111111111111111111111111'],
    on(event, listener) {
      assert.equal(event, 'accountsChanged');
      handler = listener;
    },
    removeListener(event, listener) {
      removed = { event, listener };
    },
  };
  await connectEvmWallet({
    connectWallet: async () => [{ label: 'Rabby', provider }],
  });
  const changes = [];

  const unsubscribe = onAccountsChanged(info => changes.push(info));
  handler(['0x2222222222222222222222222222222222222222']);
  unsubscribe();

  assert.equal(changes[0].ethAddress, '0x2222222222222222222222222222222222222222');
  assert.deepEqual(removed, { event: 'accountsChanged', listener: handler });
});
