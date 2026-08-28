import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const PROVIDER_SERVICES = [
  '../src/services/autosign.js',
  '../src/services/bridge.js',
  '../src/services/rfqConditional.js',
];

test('all wallet signing services use the selector provider', async () => {
  for (const relativePath of PROVIDER_SERVICES) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /window\.ethereum/, `${relativePath} hardcodes window.ethereum`);
    assert.match(source, /getActiveEvmProvider/, `${relativePath} should resolve the selected provider`);
  }
});
