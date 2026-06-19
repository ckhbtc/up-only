import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortMarketsForUpOnly } from '../src/services/marketSort.js';

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
