import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketMatchesSearch, marketsMatchingSearch } from '../src/services/marketSearch.js';

const markets = [
  {
    symbol: 'HYPE',
    ticker: 'HYPE/USDC PERP',
    name: 'HYPE/USDC PERP',
    tokenName: 'Hyperliquid',
    slug: 'hype-usdc-perp',
  },
  {
    symbol: 'INJ',
    ticker: 'INJ/USDC PERP',
    name: 'INJ/USDC PERP',
    tokenName: 'Injective',
    slug: 'inj-usdc-perp',
  },
];

test('marketMatchesSearch matches symbols, names, token names, and slugs', () => {
  assert.equal(marketMatchesSearch(markets[0], 'hype'), true);
  assert.equal(marketMatchesSearch(markets[0], 'hyper'), true);
  assert.equal(marketMatchesSearch(markets[1], 'inj-usdc'), true);
  assert.equal(marketMatchesSearch(markets[1], 'btc'), false);
});

test('marketsMatchingSearch returns no highlighted matches for a blank query', () => {
  assert.deepEqual(marketsMatchingSearch(markets, ''), []);
});

test('marketsMatchingSearch finds matches by the normalized query without changing order', () => {
  assert.deepEqual(marketsMatchingSearch(markets, ' INJECT '), [markets[1]]);
});
