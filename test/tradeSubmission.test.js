import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetAmountAfterSubmission } from '../src/services/tradeSubmission.js';

test('resetAmountAfterSubmission clears after success and failure', async () => {
  const successClears = [];
  const result = await resetAmountAfterSubmission(
    Promise.resolve('confirmed'),
    () => successClears.push('cleared'),
  );

  assert.equal(result, 'confirmed');
  assert.deepEqual(successClears, ['cleared']);

  const failureClears = [];
  await assert.rejects(
    resetAmountAfterSubmission(
      Promise.reject(new Error('failed')),
      () => failureClears.push('cleared'),
    ),
    /failed/,
  );
  assert.deepEqual(failureClears, ['cleared']);
});
