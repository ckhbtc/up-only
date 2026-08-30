# Trade History Action and Result

## Goal

Make each history row describe the trade event instead of mixing returned margin with realized profit and loss.

## Display

The ledger uses four columns: pair, action, amount or rPNL, and status.

- Open rows show `OPEN` and the cash amount committed to the position.
- Confirmed close rows show `CLOSE` and realized PnL only.
- Failed close rows show `CLOSE` with no result because no PnL was realized.
- The amount returned after a close is retained in the history data but is not displayed.

Transaction links remain attached to the status badge, and timestamps remain in the user's local time zone.

## Mobile

Pair and status occupy the first row. Action and the amount or rPNL occupy the second row so the event remains readable without horizontal scrolling.
