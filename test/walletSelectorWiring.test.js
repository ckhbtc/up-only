import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('wallet store activates the selected provider before requesting its account', async () => {
  const source = await readFile(
    new URL('../src/stores/walletStore.js', import.meta.url),
    'utf8',
  );

  const selectIndex = source.indexOf('await connectEvmWallet(wallet)');
  const connectIndex = source.indexOf('await connectWallet()');
  assert.ok(selectIndex >= 0, 'wallet store should activate the wallet selection');
  assert.ok(connectIndex > selectIndex, 'account request should follow wallet selection');
});

test('wallet store clears the selected provider on disconnect', async () => {
  const source = await readFile(
    new URL('../src/stores/walletStore.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /clearActiveEvmWallet\(\)/);
});

test('App routes every connect entry point through the wallet selector', async () => {
  const source = await readFile(
    new URL('../src/App.jsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /<WalletSelector/);
  assert.match(source, /onConnect=\{openWalletSelector\}/);
  assert.match(source, /onSelect=\{handleWalletSelect\}/);
});
