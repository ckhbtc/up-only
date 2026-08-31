import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('empty market state explains that UpOnly is under maintenance', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(
    appSource,
    /UpOnly is currently undergoing scheduled maintenance\. Please check back in a few minutes\./,
  );
  assert.doesNotMatch(appSource, /No markets available/);
  assert.doesNotMatch(appSource, /Connect your wallet to see live markets/);
});
