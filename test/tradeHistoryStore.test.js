import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Address } from '@injectivelabs/sdk-ts';
import {
  createTradeHistoryStore,
  settlementToTradeRecord,
} from '../src/server/tradeHistoryStore.js';

const walletA = Address.fromHex(`0x${'11'.repeat(20)}`).toBech32();
const walletB = Address.fromHex(`0x${'22'.repeat(20)}`).toBech32();

test('trade history store scopes records by wallet and preserves confirmation', () => {
  const store = createTradeHistoryStore({ database: new DatabaseSync(':memory:') });

  store.upsert({
    cid: 'up-only-first',
    wallet: walletA,
    marketId: 'market-a',
    symbol: 'BTC',
    action: 'open',
    status: 'submitted',
    createdAt: 100,
    updatedAt: 100,
  });
  store.upsert({
    cid: 'up-only-second',
    wallet: walletB,
    marketId: 'market-b',
    action: 'close',
    status: 'failed',
    createdAt: 200,
    updatedAt: 200,
  });
  store.upsert({
    cid: 'up-only-first',
    wallet: walletA,
    marketId: 'market-a',
    status: 'confirmed',
    txHash: 'ABC123',
    updatedAt: 300,
    source: 'indexer',
  });
  store.upsert({
    cid: 'up-only-first',
    wallet: walletA,
    marketId: 'market-a',
    status: 'failed',
    errorCode: 'reverted',
    updatedAt: 400,
  });

  const rows = store.list(walletA);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'confirmed');
  assert.equal(rows[0].txHash, 'ABC123');
  assert.equal(rows[0].symbol, 'BTC');
});

test('settlement conversion accepts only UpOnly CIDs and derives open or close', () => {
  assert.equal(settlementToTradeRecord({ cid: 'another-app-1' }), null);

  const opened = settlementToTradeRecord({
    cid: 'up-only-opened',
    taker: walletA,
    marketId: 'market-a',
    direction: 'long',
    margin: '5',
    quantity: '0.001',
    worstPrice: '70000',
    rfqId: 12,
    txHash: 'OPEN',
    transactionTime: 1_800_000_000_000,
  });
  const closed = settlementToTradeRecord({
    cid: 'up-only-closed',
    taker: walletA,
    marketId: 'market-a',
    margin: '0',
    direction: 'short',
    quantity: '0.001',
    worstPrice: '69000',
    rfqId: 13,
    txHash: 'CLOSE',
    transactionTime: 1_800_000_100_000,
  });

  assert.equal(opened.action, 'open');
  assert.equal(closed.action, 'close');
  assert.equal(closed.stake, null);
  assert.equal(opened.status, 'confirmed');
  assert.equal(opened.rfqId, '12');
});

test('trade history store persists returned amount and realized pnl', () => {
  const store = createTradeHistoryStore({ database: new DatabaseSync(':memory:') });

  store.upsert({
    cid: 'up-only-close-metrics',
    wallet: walletA,
    marketId: 'uni-market',
    symbol: 'UNI',
    action: 'close',
    status: 'confirmed',
    returnedAmount: '4.906950176095672850',
    realizedPnl: '-0.093049823904327150',
    createdAt: 1_800_000_000_000,
    updatedAt: 1_800_000_000_100,
    source: 'indexer',
  });

  const [record] = store.list(walletA);
  assert.equal(record.returnedAmount, '4.906950176095672850');
  assert.equal(record.realizedPnl, '-0.093049823904327150');
});

test('trade history store migrates an existing database for close metrics', () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE trade_history (
      cid TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      marketId TEXT NOT NULL,
      symbol TEXT,
      action TEXT,
      direction TEXT,
      status TEXT NOT NULL,
      stake TEXT,
      leverage TEXT,
      quantity TEXT,
      quotePrice TEXT,
      worstPrice TEXT,
      rfqId TEXT,
      txHash TEXT,
      errorCode TEXT,
      errorMessage TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      confirmedAt INTEGER,
      source TEXT NOT NULL
    )
  `);

  const store = createTradeHistoryStore({ database });
  const columns = database.prepare('PRAGMA table_info(trade_history)').all().map(column => column.name);

  assert.ok(columns.includes('returnedAmount'));
  assert.ok(columns.includes('realizedPnl'));
  store.close();
});

test('authoritative indexer confirmation overrides a newer client broadcasting timestamp', () => {
  const store = createTradeHistoryStore({ database: new DatabaseSync(':memory:') });
  store.upsert({
    cid: 'up-only-indexer-confirmed-late',
    wallet: walletA,
    marketId: 'uni-market',
    symbol: 'UNI',
    action: 'open',
    status: 'broadcasting',
    txHash: 'CONFIRMED-HASH',
    createdAt: 1_800_000_000_100,
    updatedAt: 1_800_000_000_400,
    source: 'client',
  });
  store.upsert({
    cid: 'up-only-indexer-confirmed-late',
    wallet: walletA,
    marketId: 'uni-market',
    status: 'confirmed',
    txHash: '0xconfirmed-hash',
    createdAt: 1_800_000_000_100,
    updatedAt: 1_800_000_000_300,
    confirmedAt: 1_800_000_000_300,
    source: 'indexer',
  });

  const [record] = store.list(walletA);
  assert.equal(record.status, 'confirmed');
  assert.equal(record.source, 'indexer');
  assert.equal(record.confirmedAt, 1_800_000_000_300);
});
