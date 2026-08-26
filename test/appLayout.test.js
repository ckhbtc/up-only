import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('market grid has no redundant available-pairs heading', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /up-market-heading|<h2>Available pairs<\/h2>/);
});
