# Trade History Pagination

## Goal

Keep the trade-history modal compact as a wallet accumulates more activity.

## Behavior

- Show the five newest history records on the first page.
- Keep the existing server ordering so newer records remain first.
- Show a range counter such as `1–5 of 12` below the ledger.
- Provide previous and next buttons only when more than one page exists.
- Disable navigation at the first and last pages.
- Reset to the first page when the connected wallet changes.
- Clamp stale page indexes when refreshed history contains fewer pages.

## Presentation

The pager uses the app's existing blue navigation-button treatment and sits at the bottom right of the modal. Transaction rows and settlement data are unchanged.
