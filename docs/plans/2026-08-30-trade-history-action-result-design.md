# Trade History Action and Result

## Goal

Make each history row describe the trade event instead of mixing returned margin with realized profit and loss.

## Display

The ledger uses five columns: pair, action, amount, rPNL, and status.

- Open rows show `OPEN` and the cash amount committed to the position.
- Confirmed close rows show `CLOSE`, the margin returned, and realized PnL.
- Open rows leave rPNL blank because no profit or loss has been realized.
- Failed close rows leave unavailable settlement values blank.

Transaction links remain attached to the status badge, and timestamps remain in the user's local time zone.

## Mobile

Pair and status occupy the first row. Action and amount occupy the second row, with close rPNL below the amount so the event remains readable without horizontal scrolling.
