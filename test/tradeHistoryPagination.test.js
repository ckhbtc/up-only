import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateTradeHistory } from '../src/services/tradeHistoryDisplay.js';

test('trade history paginates five newest transactions at a time', () => {
  const records = Array.from({ length: 12 }, (_, index) => ({ cid: `tx-${index}` }));

  assert.deepEqual(paginateTradeHistory(records, 0, 5), {
    pageIndex: 0,
    pageCount: 3,
    records: records.slice(0, 5),
    first: 1,
    last: 5,
    total: 12,
  });
  assert.deepEqual(paginateTradeHistory(records, 1, 5), {
    pageIndex: 1,
    pageCount: 3,
    records: records.slice(5, 10),
    first: 6,
    last: 10,
    total: 12,
  });
});

test('trade history pagination clamps stale page indexes', () => {
  const records = Array.from({ length: 7 }, (_, index) => ({ cid: `tx-${index}` }));
  const page = paginateTradeHistory(records, 99, 5);

  assert.equal(page.pageIndex, 1);
  assert.equal(page.pageCount, 2);
  assert.deepEqual(page.records, records.slice(5));
  assert.equal(page.first, 6);
  assert.equal(page.last, 7);
});
