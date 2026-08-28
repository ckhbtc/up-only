import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('wallet store opens the selector before requesting the selected account', async () => {
  const source = await readFile(
    new URL('../src/stores/walletStore.js', import.meta.url),
    'utf8',
  );

  const selectIndex = source.indexOf('await connectEvmWallet()');
  const connectIndex = source.indexOf('await connectWallet()');
  assert.ok(selectIndex >= 0, 'wallet store should open the wallet selector');
  assert.ok(connectIndex > selectIndex, 'account request should follow wallet selection');
});

test('wallet store disconnects the selected provider', async () => {
  const source = await readFile(
    new URL('../src/stores/walletStore.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /disconnectEvmWallet\(\)/);
});
