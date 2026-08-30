import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('authorize and revoke autosign use the same modal shell', async () => {
  const [authorize, transactionStatus, css] = await Promise.all([
    readFile(new URL('../src/components/AuthZSetup.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/TransactionStatus.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
  ]);
  const dialogRule = css.match(/\.up-authz-dialog\s*\{([^}]*)\}/)?.[1] || '';
  const backdropRule = css.match(/\.up-authz-backdrop\s*\{([^}]*)\}/)?.[1] || '';
  const actionRule = css.match(/\.up-authz-action\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(authorize, /className="up-authz-backdrop"/);
  assert.match(authorize, /className="up-authz-dialog"/);
  assert.match(authorize, /className="up-authz-action"/);
  assert.doesNotMatch(authorize, /style=\{\{/);

  assert.match(transactionStatus, /function RevokeAutosignStatus/);
  assert.match(transactionStatus, /className="up-authz-backdrop tx-authz-status"/);
  assert.match(transactionStatus, /className="up-authz-dialog"/);
  assert.match(transactionStatus, /className="up-authz-action is-loading"/);
  assert.match(transactionStatus, /lower\.includes\('revoking autosign'\)/);

  assert.match(backdropRule, /place-items:\s*center/);
  assert.match(dialogRule, /max-width:\s*420px/);
  assert.match(dialogRule, /box-shadow:\s*10px 10px 0 var\(--border\)/);
  assert.match(actionRule, /width:\s*100%/);
  assert.match(actionRule, /background:\s*var\(--accent-grad\)/);
});
