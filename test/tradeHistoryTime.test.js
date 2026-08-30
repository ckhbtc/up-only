import test from 'node:test';
import assert from 'node:assert/strict';

import { formatLocalTradeTimestamp } from '../src/services/tradeHistoryTime.js';

test('formatLocalTradeTimestamp includes the date and time in the requested local zone', () => {
  const timestamp = Date.UTC(2026, 7, 30, 18, 5);

  assert.equal(
    formatLocalTradeTimestamp(timestamp, 'en-US', 'UTC'),
    'Aug 30, 2026, 6:05 PM',
  );
});

test('formatLocalTradeTimestamp returns nothing for a missing or invalid timestamp', () => {
  assert.equal(formatLocalTradeTimestamp(null), '');
  assert.equal(formatLocalTradeTimestamp('not-a-date'), '');
});
