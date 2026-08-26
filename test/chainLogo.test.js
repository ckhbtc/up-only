import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainLogoSymbol } from '../src/services/chainLogo.js';

test('chainLogoSymbol maps every supported CCTP chain to its visual identity', () => {
  assert.equal(chainLogoSymbol(42161), 'ARB');
  assert.equal(chainLogoSymbol(8453), 'BASE');
  assert.equal(chainLogoSymbol(10), 'OP');
  assert.equal(chainLogoSymbol(1), 'ETH');
  assert.equal(chainLogoSymbol(137), 'MATIC');
  assert.equal(chainLogoSymbol(43114), 'AVAX');
  assert.equal(chainLogoSymbol(1776), 'INJ');
});
