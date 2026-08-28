import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FaucetBudget,
  FaucetBudgetError,
  evaluateFaucetBudget,
} from '../src/server/faucetBudget.js';

test('allows spend below both the daily limit and protected reserve', () => {
  assert.doesNotThrow(() => evaluateFaucetBudget({
    balanceWei: 6_000n,
    costWei: 100n,
    spentWei: 200n,
    dailyLimitWei: 1_000n,
    minReserveWei: 5_000n,
  }));
});

test('rejects spend that exceeds the daily limit', () => {
  assert.throws(() => evaluateFaucetBudget({
    balanceWei: 10_000n,
    costWei: 101n,
    spentWei: 900n,
    dailyLimitWei: 1_000n,
    minReserveWei: 5_000n,
  }), FaucetBudgetError);
});

test('rejects spend that crosses the protected reserve', () => {
  assert.throws(() => evaluateFaucetBudget({
    balanceWei: 5_100n,
    costWei: 101n,
    spentWei: 0n,
    dailyLimitWei: 1_000n,
    minReserveWei: 5_000n,
  }), FaucetBudgetError);
});

test('persists reservations and restores the current UTC day total', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-only-faucet-'));
  const stateFile = join(dir, 'usage.json');
  const now = () => new Date('2026-08-29T12:00:00.000Z');
  const options = {
    stateFile,
    dailyLimitWei: 1_000n,
    minReserveWei: 5_000n,
    now,
  };

  const budget = new FaucetBudget(options);
  await budget.reserve({ balanceWei: 6_000n, costWei: 100n });

  const restored = new FaucetBudget(options);
  await restored.reserve({ balanceWei: 5_900n, costWei: 150n });

  const state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.date, '2026-08-29');
  assert.equal(state.spentWei, '250');
});

test('resets persisted usage on the next UTC day', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-only-faucet-'));
  const stateFile = join(dir, 'usage.json');
  let current = new Date('2026-08-29T23:59:00.000Z');
  const budget = new FaucetBudget({
    stateFile,
    dailyLimitWei: 1_000n,
    minReserveWei: 5_000n,
    now: () => current,
  });

  await budget.reserve({ balanceWei: 6_000n, costWei: 900n });
  current = new Date('2026-08-30T00:01:00.000Z');
  await budget.reserve({ balanceWei: 5_100n, costWei: 100n });

  const state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.date, '2026-08-30');
  assert.equal(state.spentWei, '100');
});

test('serializes concurrent reservations so they cannot exceed the daily limit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-only-faucet-'));
  const budget = new FaucetBudget({
    stateFile: join(dir, 'usage.json'),
    dailyLimitWei: 150n,
    minReserveWei: 5_000n,
  });

  const results = await Promise.allSettled([
    budget.reserve({ balanceWei: 6_000n, costWei: 100n }),
    budget.reserve({ balanceWei: 6_000n, costWei: 100n }),
  ]);

  assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'rejected']);
  assert.ok(results[1].reason instanceof FaucetBudgetError);
});

test('fails closed when persisted state is corrupt', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'up-only-faucet-'));
  const stateFile = join(dir, 'usage.json');
  await writeFile(stateFile, '{not-json', 'utf8');
  const budget = new FaucetBudget({
    stateFile,
    dailyLimitWei: 1_000n,
    minReserveWei: 5_000n,
  });

  await assert.rejects(
    budget.reserve({ balanceWei: 6_000n, costWei: 100n }),
    FaucetBudgetError,
  );
});
