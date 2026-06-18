import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSpendableAmountInput,
  sanitizeAmountInput,
} from '../src/services/amountInput.js';

test('formatSpendableAmountInput floors wallet balances to cents', () => {
  assert.equal(formatSpendableAmountInput('4.999'), '4.99');
  assert.equal(formatSpendableAmountInput(4.995), '4.99');
  assert.equal(formatSpendableAmountInput('5.000001'), '5');
});

test('sanitizeAmountInput keeps cash entry to two decimals', () => {
  assert.equal(sanitizeAmountInput('$0012..3456'), '12.34');
  assert.equal(sanitizeAmountInput('abc'), '');
});
