import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLiveMarketPrice } from '../src/services/liveMarketPrices.js';

test('live market prices update cards, cached marks, and position PnL', () => {
  const state = {
    markets: [
      { marketId: 'btc', price: 100 },
      { marketId: 'eth', price: 200 },
    ],
    prices: { btc: 100, eth: 200 },
    livePrices: {},
    positions: [{
      marketId: 'btc',
      side: 'long',
      entryPrice: 100,
      markPrice: 100,
      currentPrice: 100,
      quantity: 0.2,
      margin: 10,
      pnl: 0,
      pnlPct: 0,
    }],
  };

  const next = applyLiveMarketPrice(state, { marketId: 'BTC', price: '105' });

  assert.deepEqual(next.markets, [
    { marketId: 'btc', price: 105 },
    { marketId: 'eth', price: 200 },
  ]);
  assert.deepEqual(next.prices, { btc: 105, eth: 200 });
  assert.deepEqual(next.livePrices, { btc: 105 });
  assert.equal(next.positions[0].markPrice, 105);
  assert.equal(next.positions[0].pnl, 1);
  assert.equal(next.positions[0].pnlPct, 10);
});

test('market store wires one oracle stream for all visible markets', async () => {
  const [storeSource, serviceSource, appSource] = await Promise.all([
    readFile(new URL('../src/stores/marketStore.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/liveMarketPrices.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(serviceSource, /streamOraclePricesByMarkets/);
  assert.match(storeSource, /subscribeLiveMarketPrices/);
  assert.match(appSource, /startMarketPriceStream\(\)/);
  assert.match(appSource, /stopMarketPriceStream\(\)/);
});
