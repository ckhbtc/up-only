import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTradeLock } from '../src/services/tradeLock.js';

test('trade lock rejects another trade until the active trade releases', () => {
  const lock = createTradeLock();

  assert.equal(lock.isLocked(), false);
  assert.equal(lock.tryAcquire(), true);
  assert.equal(lock.isLocked(), true);
  assert.equal(lock.tryAcquire(), false);

  lock.release();

  assert.equal(lock.isLocked(), false);
  assert.equal(lock.tryAcquire(), true);
});
