import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIVE_POSITION_POLL_MS,
  applyPositionMarkPrices,
  positionPollingActions,
} from '../src/services/livePositionPrices.js';

test('live position polling refreshes marks every five seconds without frequent full syncs', () => {
  assert.equal(LIVE_POSITION_POLL_MS, 5_000);
  assert.deepEqual(positionPollingActions(1), {
    refreshMarks: true,
    refreshMarkets: false,
    refreshPositions: false,
  });
  assert.deepEqual(positionPollingActions(2), {
    refreshMarks: true,
    refreshMarkets: true,
    refreshPositions: false,
  });
  assert.deepEqual(positionPollingActions(6), {
    refreshMarks: false,
    refreshMarkets: true,
    refreshPositions: true,
  });
});

test('fresh mark prices update visible position price and PnL', () => {
  const positions = [{
    id: 'btc-long',
    marketId: 'btc',
    side: 'long',
    entryPrice: 100,
    markPrice: 100,
    currentPrice: 100,
    quantity: 0.2,
    margin: 10,
    pnl: 0,
    pnlPct: 0,
  }];

  assert.deepEqual(applyPositionMarkPrices(positions, { btc: 105 }), [{
    ...positions[0],
    markPrice: 105,
    currentPrice: 105,
    pnl: 1,
    pnlPct: 10,
  }]);
});
