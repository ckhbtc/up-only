import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

let vite;
let MarketCard;
let OracleStaleBadgeView;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: MarketCard } = await vite.ssrLoadModule('/src/components/MarketCard.jsx'));
  ({ OracleStaleBadgeView } = await vite.ssrLoadModule('/src/components/OracleStaleBadge.jsx'));
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

test('market card renders displayed zero change as neutral', () => {
  const renderCard = change24h => renderToStaticMarkup(createElement(MarketCard, {
    market: {
      marketId: `0xbtc-${change24h}`,
      symbol: 'BTC',
      price: 100_000,
      priceDecimals: 2,
      maintenanceMarginRatio: 0.025,
      initialMarginRatio: 0.1,
      change24h,
    },
    balance: 10,
  }));

  for (const change24h of [0, -0.001]) {
    const markup = renderCard(change24h);
    assert.match(markup, /class="up-heat is-neutral">0\.00%/);
    assert.doesNotMatch(markup, /class="up-heat is-down">-0\.00%/);
  }
});

test('market card mark price uses the live ticker animation', () => {
  const markup = renderToStaticMarkup(createElement(MarketCard, {
    market: {
      marketId: '0xbtc-live',
      symbol: 'BTC',
      price: 100_000,
      priceDecimals: 2,
      maintenanceMarginRatio: 0.025,
      initialMarginRatio: 0.1,
    },
    balance: 10,
  }));

  assert.match(markup, /class="up-live-mark-price up-card-live-mark-price"/);
});

test('closed oracle badge exposes the warning as an accessible tooltip', () => {
  const markup = renderToStaticMarkup(createElement(OracleStaleBadgeView));

  assert.match(markup, /up-market-badge-oracle-stale/);
  assert.match(markup, />CLOSED</);
  assert.match(markup, /role="tooltip"/);
  assert.match(
    markup,
    /The oracle for this market is currently closed\. You may have issues getting filled, but feel free to YOLO it anyway\./,
  );
});

test('closed oracle tooltip stays centered in the card regardless of badge position', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const cardTopRule = css.match(/\.up-card-top\s*\{([^}]*)\}/)?.[1] || '';
  const badgeRule = css.match(/\.up-market-badge-oracle-stale\s*\{([^}]*)\}/)?.[1] || '';
  const tooltipRule = css.match(/\.up-oracle-stale-tooltip\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(cardTopRule, /position:\s*relative/);
  assert.match(badgeRule, /position:\s*static/);
  assert.match(tooltipRule, /left:\s*50%/);
  assert.match(tooltipRule, /transform:\s*translate\(-50%,\s*-3px\)/);
  assert.doesNotMatch(tooltipRule, /right:/);
});
