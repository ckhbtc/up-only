import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldOpenPairSearch } from '../src/services/pairSearchShortcut.js';

function keyEvent(overrides = {}) {
  return {
    key: '/',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: {
      tagName: 'DIV',
      isContentEditable: false,
      matches: () => false,
    },
    ...overrides,
  };
}

test('slash opens pair search while the trading cash input is focused', () => {
  const event = keyEvent({
    target: {
      tagName: 'INPUT',
      isContentEditable: false,
      matches: selector => selector === '[data-pair-search-shortcut]',
    },
  });

  assert.equal(shouldOpenPairSearch(event), true);
});

test('slash remains available to unrelated editable fields', () => {
  const event = keyEvent({
    target: {
      tagName: 'INPUT',
      isContentEditable: false,
      matches: () => false,
    },
  });

  assert.equal(shouldOpenPairSearch(event), false);
});

test('slash opens pair search outside editable fields', () => {
  assert.equal(shouldOpenPairSearch(keyEvent()), true);
});

test('modified slash and other keys do not open pair search', () => {
  assert.equal(shouldOpenPairSearch(keyEvent({ ctrlKey: true })), false);
  assert.equal(shouldOpenPairSearch(keyEvent({ key: 'x' })), false);
});
