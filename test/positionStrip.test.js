import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import {
  getPositionDisplay,
  getPositionLeverage,
  getPositionStripPage,
  getPositionStripTotals,
  getPositionValue,
  sortPositionsByValue,
} from '../src/services/positionStrip.js';

const positions = [
  { id: 'a', margin: 2, pnl: -0.2, pnlPct: -10 },
  { id: 'b', margin: 3, pnl: 0.7, pnlPct: 23.3 },
  { id: 'c', stake: 5, pnl: 0.1, pnlPct: 2 },
];

let vite;
let PositionStrip;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: PositionStrip } = await vite.ssrLoadModule('/src/components/PositionStrip.jsx'));
});

after(async () => {
  await vite?.close();
});

test('position strip is hidden when there are no open positions', () => {
  const markup = renderToStaticMarkup(createElement(PositionStrip, { positions: [] }));

  assert.equal(markup, '');
});

test('position strip marks the live price for update feedback', () => {
  const markup = renderToStaticMarkup(createElement(PositionStrip, {
    positions: [{
      id: 'btc-long',
      asset: 'BTC',
      side: 'long',
      direction: 'long',
      entryPrice: 100,
      markPrice: 105,
      currentPrice: 105,
      quantity: 0.2,
      margin: 10,
      leverage: 10,
      pnl: 1,
      pnlPct: 10,
      market: { priceDecimals: 2 },
    }],
    onCashOut: () => {},
  }));

  assert.match(markup, /class="up-live-mark-price">105\.00</);
  assert.match(markup, /class="up-position-leverage">10x</);
  assert.match(
    markup,
    /class="up-position-prices"><span class="up-position-entry-price">100\.00<\/span><span class="up-position-price-arrow">→<\/span><span class="up-live-mark-price">105\.00<\/span>/,
  );
});

test('live price feedback does not move the mark price off its baseline', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const animationStart = css.indexOf('@keyframes up-live-mark-tick');
  const animationEnd = css.indexOf('button:focus-visible', animationStart);
  const animation = css.slice(animationStart, animationEnd);

  assert.notEqual(animationStart, -1);
  assert.doesNotMatch(animation, /transform:/);

  const pricesRule = css.match(/\.up-position-prices \{([^}]*)\}/)?.[1] || '';
  assert.match(pricesRule, /display: inline-flex/);
  assert.match(pricesRule, /align-items: baseline/);
});

test('position leverage prefers the recorded value and derives indexed positions', () => {
  assert.equal(getPositionLeverage({ leverage: 10, entryPrice: 100, quantity: 0.2, margin: 10 }), 10);
  assert.equal(getPositionLeverage({ entryPrice: 100, quantity: 0.2, margin: 10 }), 2);
  assert.equal(getPositionLeverage({ entryPrice: 100, quantity: 0.2, margin: 0 }), null);
});

test('position strip sorts biggest current position value first', () => {
  assert.deepEqual(
    sortPositionsByValue(positions, 1_000).map(position => position.id),
    ['c', 'b', 'a'],
  );
  assert.equal(getPositionValue(positions[1], 1_000), 3.7);
});

test('position strip holds fresh open PnL at zero during confirmation grace', () => {
  const fresh = {
    margin: 3,
    pnl: 0.84,
    pnlPct: 28,
    pnlGraceExpiresAt: 2_000,
  };

  assert.deepEqual(getPositionDisplay(fresh, 1_000), {
    inOpenPnlGrace: true,
    pnl: 0,
    pnlPct: 0,
  });
  assert.equal(getPositionValue(fresh, 1_000), 3);
});

test('position strip totals cover every position, not only the visible page', () => {
  assert.deepEqual(getPositionStripTotals(positions, 1_000), {
    openPnl: 0.6,
    exposure: 10,
  });
});

test('position strip pages five positions and clamps the page index', () => {
  const items = Array.from({ length: 7 }, (_, index) => ({ id: index }));

  assert.deepEqual(getPositionStripPage(items, 1, 5).map(item => item.id), [5, 6]);
  assert.deepEqual(getPositionStripPage(items, 9, 5).map(item => item.id), [5, 6]);
});
