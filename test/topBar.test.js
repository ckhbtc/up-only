import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

let vite;
let TopBar;

before(async () => {
  vite = await createServer({
    appType: 'custom',
    configFile: false,
    plugins: [react()],
    server: { hmr: false, middlewareMode: true, ws: false },
  });
  ({ default: TopBar } = await vite.ssrLoadModule('/src/components/TopBar.jsx'));
});

after(async () => {
  await vite?.close();
});

test('header removes the pairs tab and keeps search in the right-side actions', () => {
  const markup = renderToStaticMarkup(createElement(TopBar, {
    theme: 'bauhaus',
    onSetTheme: () => {},
    searchOpen: false,
    searchQuery: '',
    onOpenSearch: () => {},
    onCloseSearch: () => {},
    onSearchQueryChange: () => {},
    onSelectSearchResult: () => {},
    onAddFunds: () => {},
    onRevokeAutosign: () => {},
    sessionActive: false,
    revokingAutosign: false,
    devMode: false,
  }));

  assert.doesNotMatch(markup, />Pairs</);
  assert.match(markup, /class="up-head-actions"[\s\S]*aria-label="Search pairs"/);
});

test('header uses the UpOnly brand logo', () => {
  const markup = renderToStaticMarkup(createElement(TopBar, {
    theme: 'bauhaus',
    onSetTheme: () => {},
    searchOpen: false,
    searchQuery: '',
    onOpenSearch: () => {},
    onCloseSearch: () => {},
    onSearchQueryChange: () => {},
    onSelectSearchResult: () => {},
    onAddFunds: () => {},
    onRevokeAutosign: () => {},
    sessionActive: false,
    revokingAutosign: false,
    devMode: false,
  }));

  assert.match(markup, /class="up-logo-image" src="\/uponlylogo\.png"/);
});

test('header actions share one fixed control height', async () => {
  const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const controlHeight = css.match(/--header-control-height:\s*([^;]+);/)?.[1];

  assert.equal(controlHeight, '40px');

  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, declarations]) => ({
    selectors: selectors.split(',').map(selector => selector.trim()),
    declarations,
  }));

  for (const selector of [
    '.up-tabs',
    '.up-dev-pill',
    '.up-wallet-pill',
    '.up-add-cash',
    '.up-connect',
    '.theme-toggle',
    '.wallet-menu-trigger',
  ]) {
    const usesSharedHeight = rules.some(rule => (
      rule.selectors.includes(selector)
      && /height:\s*var\(--header-control-height\)/.test(rule.declarations)
    ));
    assert.equal(usesSharedHeight, true, `${selector} should use the shared height`);
  }
});
