import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

let vite;
let WalletSelector;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: WalletSelector } = await vite.ssrLoadModule('/src/components/WalletSelector.jsx'));
});

after(async () => {
  await vite?.close();
});

test('wallet selector shows MetaMask, Rabby, and Keplr availability', () => {
  const markup = renderToStaticMarkup(createElement(WalletSelector, {
    wallets: [
      { id: 'metamask', label: 'MetaMask', monogram: 'M', installed: true, provider: {} },
      { id: 'rabby', label: 'Rabby', monogram: 'R', installed: true, provider: {} },
      { id: 'keplr', label: 'Keplr', monogram: 'K', installed: false, installUrl: 'https://www.keplr.app/download' },
    ],
    onSelect: () => {},
    onClose: () => {},
  }));

  assert.match(markup, /Connect wallet/);
  assert.match(markup, /MetaMask/);
  assert.match(markup, /Rabby/);
  assert.match(markup, /Keplr/);
  assert.match(markup, /Detected/);
  assert.match(markup, /href="https:\/\/www\.keplr\.app\/download"/);
  assert.match(markup, />Install</);
});

test('wallet selector renders connection errors without hiding the choices', () => {
  const markup = renderToStaticMarkup(createElement(WalletSelector, {
    wallets: [
      { id: 'keplr', label: 'Keplr', monogram: 'K', installed: true, provider: {} },
    ],
    error: 'User rejected the request.',
    onSelect: () => {},
    onClose: () => {},
  }));

  assert.match(markup, /role="alert"/);
  assert.match(markup, /User rejected the request/);
  assert.match(markup, /Keplr/);
});
