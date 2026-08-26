import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

let vite;
let MarketCard;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: MarketCard } = await vite.ssrLoadModule('/src/components/MarketCard.jsx'));
});

after(async () => {
  await vite?.close();
});

test('cash entry does not offer previously entered values', () => {
  const markup = renderToStaticMarkup(createElement(MarketCard, {
    market: {
      marketId: '0xbtc',
      symbol: 'BTC',
      price: 100_000,
      priceDecimals: 2,
      maintenanceMarginRatio: 0.025,
      initialMarginRatio: 0.1,
    },
    balance: 10,
  }));

  assert.match(markup, /<input[^>]+autocomplete="off"/i);
});

test('market card omits cash-down and position-size labels', () => {
  const markup = renderToStaticMarkup(createElement(MarketCard, {
    market: {
      marketId: '0xbtc',
      symbol: 'BTC',
      price: 100_000,
      priceDecimals: 2,
      maintenanceMarginRatio: 0.025,
      initialMarginRatio: 0.1,
    },
    balance: 10,
  }));

  assert.doesNotMatch(markup, /Cash down|Position size|up-position-strip/i);
  assert.match(markup, /aria-label="BTC UpOnly amount"/);
});
