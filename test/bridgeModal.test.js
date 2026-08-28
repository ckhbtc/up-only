import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

let vite;
let BridgeModal;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: BridgeModal } = await vite.ssrLoadModule('/src/components/BridgeModal.jsx'));
});

after(async () => {
  await vite?.close();
});

function renderBridge() {
  return renderToStaticMarkup(createElement(BridgeModal, { onClose: () => {} }));
}

test('bridge panels use matching identity and value columns', () => {
  const markup = renderBridge();
  const valueBlocks = markup.match(/class="up-bridge-value-block/g) || [];

  assert.equal(valueBlocks.length, 2);
});

test('destination token label omits the native qualifier', () => {
  const markup = renderBridge();

  assert.doesNotMatch(markup, /USDC \(native\)/i);
});

test('bridge speed boxes omit finality status words', () => {
  const markup = renderBridge();

  assert.doesNotMatch(markup, /Finalized|Confirmed/i);
  assert.match(markup, /<strong>Standard<\/strong><span>free · 1–13 min<\/span>/);
});

test('bridge defaults to fast transfer mode', () => {
  const markup = renderBridge();

  assert.match(markup, /<button[^>]*aria-pressed="true"[^>]*><strong>Fast<\/strong>/);
  assert.match(markup, /<button[^>]*aria-pressed="false"[^>]*><strong>Standard<\/strong>/);
});

test('bridge direction uses a centered vector arrow', () => {
  const markup = renderBridge();

  assert.match(markup, /class="up-bridge-direction-icon"/);
  assert.doesNotMatch(markup, /class="up-bridge-direction"[^>]*>↓/);
});
