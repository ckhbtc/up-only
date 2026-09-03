import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_SORT_GAINERS,
  MARKET_SORT_LOSERS,
  normalizeMarketSortMode,
  sortMarketsForUpOnly,
} from '../src/services/marketSort.js';

test('sortMarketsForUpOnly ranks largest positive gains first', () => {
  const markets = [
    { symbol: 'DUMP', change24h: -20 },
    { symbol: 'MID', change24h: 3 },
    { symbol: 'PUMP', change24h: 12 },
    { symbol: 'SLIP', change24h: -2 },
  ];

  assert.deepEqual(
    sortMarketsForUpOnly(markets).map(market => market.symbol),
    ['PUMP', 'MID', 'SLIP', 'DUMP'],
  );
});

test('sortMarketsForUpOnly does not mutate the source list', () => {
  const markets = [
    { symbol: 'A', change24h: 1 },
    { symbol: 'B', change24h: 2 },
  ];

  sortMarketsForUpOnly(markets);

  assert.deepEqual(markets.map(market => market.symbol), ['A', 'B']);
});

test('sortMarketsForUpOnly ranks largest losses first in losers mode', () => {
  const markets = [
    { symbol: 'DUMP', change24h: -20 },
    { symbol: 'MID', change24h: 3 },
    { symbol: 'PUMP', change24h: 12 },
    { symbol: 'SLIP', change24h: -2 },
  ];

  assert.deepEqual(
    sortMarketsForUpOnly(markets, MARKET_SORT_LOSERS).map(market => market.symbol),
    ['DUMP', 'SLIP', 'MID', 'PUMP'],
  );
});

test('market sort mode defaults invalid saved values to gainers', () => {
  assert.equal(normalizeMarketSortMode(MARKET_SORT_GAINERS), MARKET_SORT_GAINERS);
  assert.equal(normalizeMarketSortMode(MARKET_SORT_LOSERS), MARKET_SORT_LOSERS);
  assert.equal(normalizeMarketSortMode('volume'), MARKET_SORT_GAINERS);
  assert.equal(normalizeMarketSortMode(null), MARKET_SORT_GAINERS);
});
