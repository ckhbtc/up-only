import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitCompactPrice } from '../src/data/priceDisplay.js';

test('splitCompactPrice exposes the zero count as a controllable subscript', () => {
  assert.deepEqual(splitCompactPrice('0.0₄899255'), [
    { text: '0.0', subscript: false },
    { text: '4', subscript: true },
    { text: '899255', subscript: false },
  ]);
  assert.deepEqual(splitCompactPrice('0.001234'), [
    { text: '0.001234', subscript: false },
  ]);
});

test('compact price subscripts use controlled midpoint positioning', async () => {
  const [css, marketCard, topBar, positionStrip, priceText] = await Promise.all([
    readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/MarketCard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/PositionStrip.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/PriceText.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(css, /\.up-price-zero-count\s*\{[^}]*font-size:\s*0\.52em;/s);
  assert.match(css, /\.up-price-zero-count\s*\{[^}]*top:\s*0\.35em;/s);
  assert.match(css, /\.up-price-zero-count\s*\{[^}]*vertical-align:\s*baseline;/s);
  assert.match(priceText, /<sub[^>]*className="up-price-zero-count"/);
  assert.equal((marketCard.match(/<PriceText/g) || []).length, 2);
  assert.equal((topBar.match(/<PriceText/g) || []).length, 1);
  assert.equal((positionStrip.match(/<PriceText/g) || []).length, 3);
});
