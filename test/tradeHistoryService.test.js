import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Address } from '@injectivelabs/sdk-ts';
import { createTradeHistoryStore } from '../src/server/tradeHistoryStore.js';
import { createTradeHistoryService } from '../src/server/tradeHistoryService.js';

const wallet = Address.fromHex(`0x${'33'.repeat(20)}`).toBech32();

test('history reconciliation paginates settlements and filters other CIDs', async () => {
  const store = createTradeHistoryStore({ database: new DatabaseSync(':memory:') });
  const calls = [];
  const pages = {
    first: {
      settlements: [
        {
          cid: 'up-only-chain-open',
          taker: wallet,
          marketId: 'btc-market',
          direction: 'long',
          margin: '5',
          quantity: '0.001',
          worstPrice: '70000',
          rfqId: 1,
          txHash: 'OPEN',
          transactionTime: 1_800_000_000_000,
        },
        { cid: 'another-app-trade', taker: wallet },
      ],
      next: ['page-2'],
    },
    'page-2': {
      settlements: [{
        cid: 'up-only-chain-close',
        taker: wallet,
        marketId: 'btc-market',
        direction: 'short',
        margin: '0',
        quantity: '0.001',
        worstPrice: '69000',
        rfqId: 2,
        txHash: 'CLOSE',
        transactionTime: 1_800_000_100_000,
      }],
      next: [],
    },
  };
  const service = createTradeHistoryService({
    store,
    now: () => 1_800_000_200_000,
    rfqApi: {
      async fetchSettlements(params) {
        calls.push(params);
        return pages[params.token || 'first'];
      },
    },
  });

  const records = await service.list(wallet);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].addresses, [wallet]);
  assert.equal(records.length, 2);
  assert.equal(records[0].action, 'close');
  assert.equal(records[1].action, 'open');
});

test('history sync binds every record to the authenticated wallet', () => {
  const otherWallet = Address.fromHex(`0x${'44'.repeat(20)}`).toBech32();
  const store = createTradeHistoryStore({ database: new DatabaseSync(':memory:') });
  const service = createTradeHistoryService({ store, rfqApi: null });

  service.sync(wallet, [{
    cid: 'up-only-local-failure',
    wallet: otherWallet,
    marketId: 'eth-market',
    status: 'failed',
    errorCode: 'no_liquidity',
    createdAt: 10,
    updatedAt: 20,
  }]);

  assert.equal(store.list(wallet).length, 1);
  assert.equal(store.list(otherWallet).length, 0);
});

test('client sync cannot self-assert a confirmed settlement', () => {
  const store = createTradeHistoryStore({ database: new DatabaseSync(':memory:') });
  const service = createTradeHistoryService({ store, rfqApi: null });

  service.sync(wallet, [{
    cid: 'up-only-client-confirmed',
    marketId: 'eth-market',
    status: 'confirmed',
    txHash: 'UNVERIFIED',
    source: 'indexer',
    createdAt: 10,
    updatedAt: 20,
  }]);

  const [record] = store.list(wallet);
  assert.equal(record.status, 'broadcasting');
  assert.equal(record.source, 'client');
  assert.equal(record.confirmedAt, null);
});
