import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('market grid has no redundant available-pairs heading', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /up-market-heading|<h2>Available pairs<\/h2>/);
});

test('trade failures are shown only in the global transaction status', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const cardSource = await readFile(new URL('../src/components/MarketCard.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(appSource, /cardErrors|markCardError/);
  assert.doesNotMatch(cardSource, /\berror\s*=\s*['"]{2}|\{error\s*\|\|/);
});

test('document uses the UpOnly brand logo as its favicon', async () => {
  const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(source, /<link rel="icon" type="image\/png" href="\/uponlylogo\.png" \/>/);
});
