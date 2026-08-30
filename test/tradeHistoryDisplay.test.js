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
    amount: '$5.00',
    amountClass: 'is-positive',
    realizedPnl: '',
    realizedPnlClass: 'is-empty',
  });
});

test('confirmed close history rows show returned margin and realized pnl separately', () => {
  assert.deepEqual(tradeHistoryDisplay({
    action: 'close',
    status: 'confirmed',
    returnedAmount: '4.90695017609567285',
    realizedPnl: '-0.09304982390432715',
  }), {
    actionLabel: 'Close',
    actionClass: 'is-close',
    amount: '$4.90',
    amountClass: 'is-positive',
    realizedPnl: '-$0.09',
    realizedPnlClass: 'is-negative',
  });
});

test('failed close history rows leave unavailable settlement values blank', () => {
  assert.deepEqual(tradeHistoryDisplay({
    action: 'close',
    status: 'failed',
    stake: '4.92',
  }), {
    actionLabel: 'Close',
    actionClass: 'is-close',
    amount: '',
    amountClass: 'is-empty',
    realizedPnl: '',
    realizedPnlClass: 'is-empty',
  });
});
