import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAppVersionTracker,
  fetchAppVersion,
} from '../src/services/appVersion.js';

test('app version tracker only reports versions newer than its baseline', () => {
  const tracker = createAppVersionTracker();

  assert.equal(tracker.observe('release-a'), false);
  assert.equal(tracker.observe('release-a'), false);
  assert.equal(tracker.observe('release-b'), true);
});

test('app version fetch bypasses caches and validates the response', async () => {
  const calls = [];
  const version = await fetchAppVersion(async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { ok: true, version: 'release-a' };
      },
    };
  });

  assert.equal(version, 'release-a');
  assert.deepEqual(calls, [{
    url: '/api/version',
    options: { cache: 'no-store' },
  }]);
});
