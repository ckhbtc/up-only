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

test('completed transaction toasts are anchored bottom right', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const toastRule = css.match(/\.tx-status-toast \{([^}]*)\}/)?.[1] || '';
  const loadingRule = css.match(/\.tx-loading-stage \{([^}]*)\}/)?.[1] || '';

  assert.match(toastRule, /bottom:/);
  assert.match(toastRule, /right:/);
  assert.doesNotMatch(toastRule, /\btop:|\bleft:|translateX/);
  assert.match(loadingRule, /top:/);
});

test('a new deployment offers a user-controlled bottom-right reload toast', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const toastSource = await readFile(new URL('../src/components/AppUpdateToast.jsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const toastRule = css.match(/\.app-update-toast \{([^}]*)\}/)?.[1] || '';

  assert.match(appSource, /startAppVersionMonitor/);
  assert.match(appSource, /appUpdateAvailable && !tradeBusy && !txStatus/);
  assert.match(toastSource, /A new version of UpOnly is available\. Please reload to keep using the app\./);
  assert.match(toastSource, /window\.location\.reload\(\)/);
  assert.match(toastRule, /bottom:/);
  assert.match(toastRule, /right:/);
  assert.match(toastRule, /position:\s*fixed/);
});

test('market-card confirmation returns the trade settlement promise', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(source, /handleCardConfirm[\s\S]*?return submitBet\(bet\)/);
  assert.doesNotMatch(source, /handleCardConfirm[\s\S]*?void submitBet\(bet\)/);
});
