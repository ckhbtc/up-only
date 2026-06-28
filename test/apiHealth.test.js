import { test } from 'node:test';
import assert from 'node:assert/strict';

test('healthResponse returns a stable public health payload', async () => {
  const api = await import('../src/server/api.js');

  assert.deepEqual(api.healthResponse(), {
    ok: true,
    service: 'up-only',
  });
});
