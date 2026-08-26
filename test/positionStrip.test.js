import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPositionDisplay,
  getPositionStripPage,
  getPositionStripTotals,
  getPositionValue,
  sortPositionsByValue,
} from '../src/services/positionStrip.js';

const positions = [
  { id: 'a', margin: 2, pnl: -0.2, pnlPct: -10 },
  { id: 'b', margin: 3, pnl: 0.7, pnlPct: 23.3 },
  { id: 'c', stake: 5, pnl: 0.1, pnlPct: 2 },
];

test('position strip sorts biggest current position value first', () => {
  assert.deepEqual(
    sortPositionsByValue(positions, 1_000).map(position => position.id),
    ['c', 'b', 'a'],
  );
  assert.equal(getPositionValue(positions[1], 1_000), 3.7);
});

test('position strip holds fresh open PnL at zero during confirmation grace', () => {
  const fresh = {
    margin: 3,
    pnl: 0.84,
    pnlPct: 28,
    pnlGraceExpiresAt: 2_000,
  };

  assert.deepEqual(getPositionDisplay(fresh, 1_000), {
    inOpenPnlGrace: true,
    pnl: 0,
    pnlPct: 0,
  });
  assert.equal(getPositionValue(fresh, 1_000), 3);
});

test('position strip totals cover every position, not only the visible page', () => {
  assert.deepEqual(getPositionStripTotals(positions, 1_000), {
    openPnl: 0.6,
    exposure: 10,
  });
});

test('position strip pages five positions and clamps the page index', () => {
  const items = Array.from({ length: 7 }, (_, index) => ({ id: index }));

  assert.deepEqual(getPositionStripPage(items, 1, 5).map(item => item.id), [5, 6]);
  assert.deepEqual(getPositionStripPage(items, 9, 5).map(item => item.id), [5, 6]);
});
