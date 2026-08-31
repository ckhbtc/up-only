import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_MARKET_STREAM_LIMIT,
  applyLiveMarketPrice,
  selectLiveMarketIds,
} from '../src/services/liveMarketPrices.js';

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

test('live market stream selects the top 40 markets by daily gain', () => {
  const markets = Array.from({ length: 45 }, (_, index) => ({
    marketId: `market-${index}`,
    change24h: index - 20,
  }));

  const marketIds = selectLiveMarketIds(markets);

  assert.equal(marketIds.length, LIVE_MARKET_STREAM_LIMIT);
  assert.deepEqual(marketIds.slice(0, 3), ['market-44', 'market-43', 'market-42']);
  assert.deepEqual(marketIds.slice(-3), ['market-7', 'market-6', 'market-5']);
  assert.deepEqual(markets.slice(0, 3).map(market => market.marketId), [
    'market-0',
    'market-1',
    'market-2',
  ]);
});

test('market store wires one oracle stream for the selected top markets', async () => {
  const [storeSource, serviceSource, appSource] = await Promise.all([
    readFile(new URL('../src/stores/marketStore.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/liveMarketPrices.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(serviceSource, /streamOraclePricesByMarkets/);
  assert.match(storeSource, /subscribeLiveMarketPrices/);
  assert.match(appSource, /selectLiveMarketIds\(markets\)/);
  assert.match(appSource, /startMarketPriceStream\(liveMarketIds\)/);
  assert.match(appSource, /stopMarketPriceStream\(\)/);
});
