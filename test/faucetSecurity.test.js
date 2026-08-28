import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSlidingWindowLimiter,
  isAllowedFaucetRequest,
  parseAllowedOrigins,
} from '../src/server/faucetSecurity.js';

const allowedOrigins = new Set(['https://uponly.click']);

test('accepts an exact same-origin request from uponly.click', () => {
  assert.equal(isAllowedFaucetRequest({
    origin: 'https://uponly.click',
    host: 'uponly.click',
    protocol: 'https',
    fetchSite: 'same-origin',
  }, allowedOrigins), true);
});

test('rejects missing, cross-site, and lookalike origins', () => {
  const base = { host: 'uponly.click', protocol: 'https', fetchSite: 'same-origin' };

  assert.equal(isAllowedFaucetRequest({ ...base, origin: '' }, allowedOrigins), false);
  assert.equal(isAllowedFaucetRequest({
    ...base,
    origin: 'https://evil.example',
    fetchSite: 'cross-site',
  }, allowedOrigins), false);
  assert.equal(isAllowedFaucetRequest({
    ...base,
    origin: 'https://uponly.click.evil.example',
  }, allowedOrigins), false);
  assert.equal(isAllowedFaucetRequest({
    ...base,
    origin: 'https://uponly.click',
    fetchSite: '',
  }, allowedOrigins), false);
});

test('parses a trimmed allowlist without accepting malformed origins', () => {
  assert.deepEqual(
    [...parseAllowedOrigins('https://uponly.click, http://localhost:36000,not-a-url')],
    ['https://uponly.click', 'http://localhost:36000'],
  );
});

test('sliding-window limiter blocks excess requests and resets', () => {
  let now = 1_000;
  const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 1_000, now: () => now });

  assert.equal(limiter.allow('203.0.113.1'), true);
  assert.equal(limiter.allow('203.0.113.1'), true);
  assert.equal(limiter.allow('203.0.113.1'), false);
  assert.equal(limiter.allow('203.0.113.2'), true);

  now = 2_001;
  assert.equal(limiter.allow('203.0.113.1'), true);
});
