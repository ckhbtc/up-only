# Sequential Close All

The positions header replaces the redundant open-count subtitle with a large
red `Close all N` action. The count makes the scope explicit, and the control is
disabled whenever the shared wallet trade lock is held.

Closing uses the existing RFQ close transaction, but orchestration lives in a
small sequential runner. It awaits confirmation before starting the next
position, preventing account-sequence races. The global transaction banner
shows the current asset and batch progress. Each confirmed position is removed
optimistically so the strip visibly drains while the batch continues.

A failed close is logged and counted without aborting later positions. The
final toast reports the number closed and failed, balances and authoritative
positions refresh once, and the trade lock is always released. Unit coverage
proves no two closes overlap and that the sequence continues after an error.
