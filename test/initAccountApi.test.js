import { test } from 'node:test';
import assert from 'node:assert/strict';

test('init-account hides faucet configuration internals from users', async () => {
  const api = await import('../src/server/api.js');
  const response = api.initAccountFailureResponse(new Error('Faucet not configured'));

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, {
    error: 'New wallet setup is temporarily unavailable. Please try again.',
  });
});
