import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTradeFailure,
  listLocalTradeHistory,
  mergeDisplayedTradeHistory,
  saveLocalTradeEvent,
} from '../src/services/tradeHistory.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const walletA = 'inj1walletaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const walletB = 'inj1walletbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

test('local trade history persists per wallet and merges lifecycle updates', () => {
  const storage = memoryStorage();
  saveLocalTradeEvent({
    cid: 'up-only-local-1',
    wallet: walletA,
    marketId: 'market-a',
    action: 'open',
    status: 'submitted',
    createdAt: 100,
    updatedAt: 100,
  }, storage);
  saveLocalTradeEvent({
    cid: 'up-only-local-1',
    wallet: walletA,
    marketId: 'market-a',
    status: 'confirmed',
    txHash: 'HASH',
    quotePrice: '100',
    updatedAt: 200,
  }, storage);
  saveLocalTradeEvent({
    cid: 'up-only-local-2',
    wallet: walletB,
    marketId: 'market-b',
    status: 'failed',
    createdAt: 300,
    updatedAt: 300,
  }, storage);

  const rows = listLocalTradeHistory(walletA, storage);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'confirmed');
  assert.equal(rows[0].txHash, 'HASH');
});

test('failure classifier stores safe actionable categories', () => {
  assert.deepEqual(classifyTradeFailure('no quotes received within wait time'), {
    errorCode: 'no_liquidity',
    errorMessage: 'No liquidity was available for this trade.',
  });
  assert.equal(classifyTradeFailure('the order has insufficient margin').errorCode, 'insufficient_margin');
  assert.equal(classifyTradeFailure('account sequence mismatch expected 2').errorCode, 'sequence_mismatch');
  assert.equal(classifyTradeFailure('some private upstream detail').errorMessage, 'Trade failed before confirmation.');
});

test('display history preserves a matching local chain confirmation over broadcasting server state', () => {
  const cid = 'up-only-confirmed-before-indexer';
  const txHash = '5077161550AF7DFEE561DD9F27C10BEBC9AE9C286CB42B7D9FBCDF64B98FDDEC';
  const rows = mergeDisplayedTradeHistory([{
    cid,
    wallet: walletA,
    marketId: 'uni-market',
    status: 'broadcasting',
    txHash,
    updatedAt: 200,
  }], [{
    cid,
    wallet: walletA,
    marketId: 'uni-market',
    status: 'confirmed',
    txHash: txHash.toLowerCase(),
    confirmedAt: 150,
    updatedAt: 150,
  }]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'confirmed');
  assert.equal(rows[0].confirmedAt, 150);
});
