# Trade History Minimal Redesign

## Goal

Make trade history feel like a compact part of UpOnly instead of a large
secondary dashboard. Preserve the app's bold heading type, yellow accent,
monospace metadata, and semantic status colors while removing redundant visual
weight.

## Decision

Use one compact activity ledger inside a smaller modal. The modal keeps a thin
UpOnly frame and yellow title bar, but drops the kicker, oversized spacing, and
large offset shadow. Trades share one outer border and are separated by quiet
dividers instead of appearing as individually shadowed cards.

Each row keeps three levels of information:

1. Pair, action, and a small semantic status tag.
2. Cash, leverage, quantity, and quote in a tight responsive grid.
3. Timestamp, transaction link, RFQ ID, and any failure message as subdued
   metadata.

Confirmed, failed, broadcasting, quoted, and submitted states use restrained
tinted backgrounds rather than outlined badges. Failure details remain visible
but use a compact inline strip instead of a full-width alert panel.

## Responsive Behavior

Desktop rows use four compact metric columns. Narrow screens use two columns,
keep pair and status on one line, and stack only the secondary metadata. The
list remains independently scrollable so the title and close control stay in
place.

## Verification

- Add a UI regression test for the flat ledger structure and reduced header.
- Preserve status, transaction-link, error, refresh, and wallet-auth behavior.
- Run the full test suite and production build before deployment.
