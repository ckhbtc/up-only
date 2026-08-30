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

test('open trade history refreshes indexer-backed statuses periodically', async () => {
  const modal = await readFile(new URL('../src/components/TradeHistoryModal.jsx', import.meta.url), 'utf8');

  assert.match(modal, /HISTORY_REFRESH_MS\s*=\s*5_000/);
  assert.match(modal, /setInterval\(\(\) => \{/);
  assert.match(modal, /fetchDisplayedTradeHistory\(injAddress\)/);
  assert.match(modal, /clearInterval\(interval\)/);
});

test('trade history uses a compact flat activity ledger', async () => {
  const modal = await readFile(new URL('../src/components/TradeHistoryModal.jsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const listRule = css.match(/\.up-trade-history-list\s*\{([^}]*)\}/)?.[1] || '';
  const rowRule = css.match(/\.up-trade-history-row\s*\{([^}]*)\}/)?.[1] || '';
  const dialogRule = css.match(/\.up-trade-history-dialog\s*\{([^}]*)\}/)?.[1] || '';

  assert.doesNotMatch(modal, /Wallet activity/);
  assert.match(dialogRule, /max-width:\s*600px/);
  assert.match(listRule, /gap:\s*0/);
  assert.match(rowRule, /box-shadow:\s*none/);
  assert.match(rowRule, /border-bottom:/);
});

test('trade history rows only show pair, margin, transaction, and status', async () => {
  const modal = await readFile(new URL('../src/components/TradeHistoryModal.jsx', import.meta.url), 'utf8');

  assert.match(modal, />Pair</);
  assert.match(modal, />Margin</);
  assert.match(modal, />Transaction</);
  assert.match(modal, />Status</);
  assert.doesNotMatch(modal, /record\.rfqId/);
  assert.doesNotMatch(modal, /record\.leverage/);
  assert.doesNotMatch(modal, /record\.quantity/);
  assert.doesNotMatch(modal, /record\.quotePrice/);
  assert.doesNotMatch(modal, /record\.worstPrice/);
  assert.doesNotMatch(modal, /record\.errorMessage/);
  assert.doesNotMatch(modal, /formatTimestamp/);
});
