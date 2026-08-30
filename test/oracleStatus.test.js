import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchMarketOracleStale,
  oracleStatusUrlForMarket,
} from '../src/services/oracleStatus.js';

test('Pyth equity status uses the TrueCurrent price-feed endpoint', () => {
  assert.equal(
    oracleStatusUrlForMarket({ provider: 'pythEquity', oracleStatusId: '339' }),
    'https://api.ui.injective.network/api/v1/price_feeds/pyth-pro/339',
  );
});

test('Pyth equity status is stale only when market hours are explicitly closed', async () => {
  const closed = await fetchMarketOracleStale(
    { provider: 'pythEquity', oracleStatusId: '339' },
    async () => ({ ok: true, json: async () => ({ market_hours: { is_open: false } }) }),
  );
  const open = await fetchMarketOracleStale(
    { provider: 'pythEquity', oracleStatusId: '339' },
    async () => ({ ok: true, json: async () => ({ data: { market_hours: { is_open: true } } }) }),
  );

  assert.equal(closed, true);
  assert.equal(open, false);
});

test('SEDA status follows the TrueCurrent was_stale signal', async () => {
  const stale = await fetchMarketOracleStale(
    { provider: 'seda', oracleStatusId: 'AAPL/USD' },
    async () => ({ ok: true, json: async () => ({ was_stale: true }) }),
  );

  assert.equal(
    oracleStatusUrlForMarket({ provider: 'seda', oracleStatusId: 'AAPL/USD' }),
    'https://api.ui.injective.network/api/v1/price_feeds/seda/AAPL',
  );
  assert.equal(stale, true);
});

test('unsupported markets do not request an oracle status', async () => {
  let requested = false;
  const stale = await fetchMarketOracleStale(
    { provider: null, oracleStatusId: 'BTC' },
    async () => {
      requested = true;
      return { ok: true, json: async () => ({}) };
    },
  );

  assert.equal(stale, false);
  assert.equal(requested, false);
});
