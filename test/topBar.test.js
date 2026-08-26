import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
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
