# Live Mark Price Refresh

## Goal

Make open-position mark prices and PnL feel live without increasing the overall
read load on Injective APIs.

## Design

The current ten-second loop refreshes market summaries and performs a full
position reconciliation together. A full reconciliation fetches positions,
open exchange orders, and RFQ conditional orders, so shortening that whole loop
would multiply several unrelated requests.

Use one five-second scheduler with three cadences:

- Every five seconds, fetch only `fetchPositionsV2` and merge fresh mark prices,
  PnL, and PnL percentage into positions already visible in the store.
- Every ten seconds, refresh market summary prices and 24-hour change.
- Every thirty seconds, perform the existing full position and order
  reconciliation instead of the lightweight mark refresh for that tick.

Skip scheduled reads while the document is hidden. The initial full fetch and
trade-triggered refreshes remain unchanged.

## Feedback

Wrap the displayed mark price in a keyed element. When its formatted value
changes, React remounts the element and a short CSS animation flashes the value.
No animation runs when the API returns the same visible price.

## Verification

Add pure tests for polling cadence and mark-price/PnL merging, plus a component
test for the live-price marker. Run the complete test suite and production build
before deployment.
