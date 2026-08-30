import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('wallet menu opens authenticated trade history', async () => {
  const topBar = await readFile(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(topBar, /onClick=\{onOpenTradeHistory\}/);
  assert.match(topBar, />\s*Trade history\s*</);
  assert.match(app, /<TradeHistoryModal/);
  assert.match(app, /onOpenTradeHistory=\{\(\) => setShowTradeHistory\(true\)\}/);
});

test('open, close, and bulk close share their CID with history and RFQ', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const rfq = await readFile(new URL('../src/services/rfq.js', import.meta.url), 'utf8');

  assert.match(app, /const cid = createUpOnlyCid\(\)/);
  assert.match(app, /recordOpen\(\{ status: 'submitted' \}\)/);
  assert.match(app, /recordClose\(\{ status: 'submitted' \}\)/);
  assert.match(app, /record\(\{ status: 'submitted' \}\)/);
  assert.match(rfq, /tradeOpenRfq\(\{[\s\S]*cid = createUpOnlyCid\(\)/);
  assert.match(rfq, /tradeCloseRfq\(\{[\s\S]*cid = createUpOnlyCid\(\)/);
});
