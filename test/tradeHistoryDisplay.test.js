import test from 'node:test';
import assert from 'node:assert/strict';
import { tradeHistoryDisplay } from '../src/services/tradeHistoryDisplay.js';

test('open history rows show the cash amount', () => {
  assert.deepEqual(tradeHistoryDisplay({
    action: 'open',
    status: 'confirmed',
    stake: '5',
  }), {
    actionLabel: 'Open',
    actionClass: 'is-open',
    value: '$5.00',
    valueClass: 'is-positive',
  });
});

test('confirmed close history rows show realized pnl instead of returned margin', () => {
  assert.deepEqual(tradeHistoryDisplay({
    action: 'close',
    status: 'confirmed',
    returnedAmount: '4.90695017609567285',
    realizedPnl: '-0.09304982390432715',
  }), {
    actionLabel: 'Close',
    actionClass: 'is-close',
    value: '-$0.09',
    valueClass: 'is-negative',
  });
});

test('failed close history rows do not present attempted margin as a result', () => {
  assert.deepEqual(tradeHistoryDisplay({
    action: 'close',
    status: 'failed',
    stake: '4.92',
  }), {
    actionLabel: 'Close',
    actionClass: 'is-close',
    value: '—',
    valueClass: 'is-empty',
  });
});
