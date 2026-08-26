import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLET_BALANCE_POLL_MS,
  startWalletBalanceRefresh,
} from '../src/services/walletRefresh.js';

function fakeEventTarget(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    emit(type) {
      listeners.get(type)?.();
    },
    has(type) {
      return listeners.has(type);
    },
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('wallet balances refresh periodically and when a visible tab resumes', async () => {
  const windowTarget = fakeEventTarget();
  const documentTarget = fakeEventTarget({ visibilityState: 'visible' });
  let intervalCallback = null;
  let clearedInterval = null;
  let refreshCount = 0;

  const stop = startWalletBalanceRefresh({
    refreshBalances: async () => { refreshCount += 1; },
    windowTarget,
    documentTarget,
    setIntervalFn(callback, intervalMs) {
      assert.equal(intervalMs, WALLET_BALANCE_POLL_MS);
      intervalCallback = callback;
      return 42;
    },
    clearIntervalFn(intervalId) {
      clearedInterval = intervalId;
    },
  });

  assert.equal(WALLET_BALANCE_POLL_MS, 15_000);
  intervalCallback();
  await flush();
  assert.equal(refreshCount, 1);

  documentTarget.visibilityState = 'hidden';
  intervalCallback();
  await flush();
  assert.equal(refreshCount, 1);

  documentTarget.visibilityState = 'visible';
  documentTarget.emit('visibilitychange');
  await flush();
  assert.equal(refreshCount, 2);

  windowTarget.emit('focus');
  await flush();
  assert.equal(refreshCount, 3);

  stop();
  assert.equal(clearedInterval, 42);
  assert.equal(windowTarget.has('focus'), false);
  assert.equal(documentTarget.has('visibilitychange'), false);
});

test('App starts external wallet balance refresh while connected', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /startWalletBalanceRefresh\(\{\s*refreshBalances\s*\}\)/);
});
