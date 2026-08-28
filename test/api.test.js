import test from 'node:test';
import assert from 'node:assert/strict';
import { callApiWithRetry } from '../src/services/api.js';

function response(status, body = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('relay API retries a transient 502 and returns the successful mint', async () => {
  const requests = [];
  const result = await callApiWithRetry('/relay-mint', {
    method: 'POST',
    body: { message: '0xmessage', attestation: '0xattestation' },
  }, {
    attempts: 3,
    retryDelayMs: 0,
    sleepFn: async () => {},
    fetchFn: async (...args) => {
      requests.push(args);
      return requests.length === 1
        ? response(502)
        : response(200, { ok: true, txHash: '0xmint' });
    },
  });

  assert.equal(requests.length, 2);
  assert.equal(result.txHash, '0xmint');
});

test('relay API does not retry a non-transient client error', async () => {
  let requests = 0;
  await assert.rejects(
    callApiWithRetry('/relay-mint', { method: 'POST' }, {
      attempts: 3,
      retryDelayMs: 0,
      sleepFn: async () => {},
      fetchFn: async () => {
        requests += 1;
        return response(400, { error: 'Invalid CCTP message hex' });
      },
    }),
    /Invalid CCTP message hex/,
  );
  assert.equal(requests, 1);
});
