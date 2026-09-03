import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function themeVariables(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escapedSelector} \\{([\\s\\S]*?)\\n\\}`))?.[1] || '';
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

function relativeLuminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map(channel => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('dark mode uses dark surfaces with readable text and no light first paint', async () => {
  const [css, html] = await Promise.all([
    readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);
  const dark = themeVariables(css, '[data-theme="bauhaus-dark"]');

  for (const surface of ['bg-primary', 'bg-secondary', 'bg-card', 'bg-card-hover', 'paper']) {
    assert.ok(relativeLuminance(dark[surface]) < 0.04, `${surface} should be genuinely dark`);
  }
  assert.ok(contrastRatio(dark['text-primary'], dark.paper) >= 7);
  assert.ok(contrastRatio(dark['text-secondary'], dark['bg-card']) >= 7);
  assert.ok(contrastRatio(dark['text-muted'], dark['bg-card']) >= 4.5);

  const firstPaint = html.match(/html\[data-theme="bauhaus-dark"\] \{ background: (#[\da-f]+); color: (#[\da-f]+); \}/i);
  assert.equal(firstPaint?.[1].toLowerCase(), dark['bg-primary']);
  assert.equal(firstPaint?.[2].toLowerCase(), dark['text-primary']);
});

test('dark mode mark prices use a lighter blue than the interface accent', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const dark = themeVariables(css, '[data-theme="bauhaus-dark"]');
  const priceRule = css.match(/\.up-price\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(priceRule, /color:\s*var\(--price-blue\)\s*;/);
  assert.ok(relativeLuminance(dark['price-blue']) > relativeLuminance(dark.blue));
  assert.ok(contrastRatio(dark['price-blue'], dark['bg-card']) >= 4.5);
});

test('dark mode gain badges use a restrained high-contrast green palette', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const dark = themeVariables(css, '[data-theme="bauhaus-dark"]');
  const gainRule = css.match(/\.up-heat\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(gainRule, /background:\s*var\(--gain-badge-bg\)\s*;/);
  assert.match(gainRule, /color:\s*var\(--gain-badge-text\)\s*;/);
  assert.ok(relativeLuminance(dark['gain-badge-bg']) < relativeLuminance(dark['accent-light']));
  assert.ok(contrastRatio(dark['gain-badge-text'], dark['gain-badge-bg']) >= 4.5);
});
