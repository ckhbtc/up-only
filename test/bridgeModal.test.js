import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

let vite;
let BridgeModal;
let BridgeHistoryPanel;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: BridgeModal } = await vite.ssrLoadModule('/src/components/BridgeModal.jsx'));
  ({ default: BridgeHistoryPanel } = await vite.ssrLoadModule('/src/components/BridgeHistoryPanel.jsx'));
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

test('bridge modal exposes bridge and local history tabs', () => {
  const markup = renderBridge();

  assert.match(markup, /role="tablist" aria-label="Bridge views"/);
  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>Bridge<\/button>/);
  assert.match(markup, /role="tab"[^>]*aria-selected="false"[^>]*>History<\/button>/);
});

test('post-burn failures direct the user to History rescue', async () => {
  const source = await import('node:fs/promises').then(fs => (
    fs.readFile(new URL('../src/components/BridgeModal.jsx', import.meta.url), 'utf8')
  ));

  assert.match(source, /USDC was burned successfully, but automatic mint was interrupted\. Press Rescue to finish\./);
  assert.match(source, /setActiveTab\('history'\)/);
});

test('bridge history renders recovery controls and transaction links', () => {
  const burnHash = `0x${'ab'.repeat(32)}`;
  const markup = renderToStaticMarkup(createElement(BridgeHistoryPanel, {
    wallet: '0x1111111111111111111111111111111111111111',
    transfers: [{
      id: `3:${burnHash}`,
      wallet: '0x1111111111111111111111111111111111111111',
      sourceChainId: 42161,
      sourceDomain: 3,
      sourceName: 'Arbitrum One',
      amount: '10',
      transferMode: 'standard',
      burnHash,
      status: 'needs_attention',
      createdAt: 100,
      mintHash: null,
      error: 'Attestation pending',
    }],
    recoveringId: null,
    recoveryNotice: null,
    recoveryError: null,
    importHash: '',
    importChainId: 42161,
    importing: false,
    onImportHashChange: () => {},
    onImportChainChange: () => {},
    onImport: () => {},
    onRecover: () => {},
  }));

  assert.match(markup, /10 USDC/);
  assert.match(markup, /Needs attention/);
  assert.match(markup, /https:\/\/arbiscan\.io\/tx\/0xabab/);
  assert.match(markup, />Rescue<\/button>/);
});

test('bridge direction uses a centered vector arrow', () => {
  const markup = renderBridge();

  assert.match(markup, /class="up-bridge-direction-icon"/);
  assert.doesNotMatch(markup, /class="up-bridge-direction"[^>]*>↓/);
});
