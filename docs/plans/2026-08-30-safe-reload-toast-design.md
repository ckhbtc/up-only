# Safe Reload Toast

## Goal

Notify a user when a newer UpOnly frontend has been deployed without automatically
refreshing the page or interrupting a trade that is already settling.

## Design

The server exposes a no-cache `/api/version` response containing a deterministic
fingerprint of the built `dist/index.html`. The browser records the first version
it sees, checks again every 30 seconds and whenever the tab becomes visible, and
marks an update as available when the fingerprint changes.

The app then shows a persistent bottom-right toast with the exact copy “Reload to
keep using the app.” and a user-controlled Reload button. The prompt is deferred
while the global trade lock is held or another transaction status toast is visible.
There is no automatic reload and version-check failures are ignored so they cannot
block trading.

The loaded SPA remains usable because its JavaScript is already in browser memory
and deploys retain hashed asset files. The notification improves release awareness,
but it is not itself a zero-downtime server guarantee. Existing RFQ direct-broadcast
fallbacks continue to protect trades from a brief relay restart.

## Verification

- Unit test version baseline and change detection.
- Test the server response and no-cache endpoint wiring.
- Verify the reload toast is bottom-right, contains the requested copy, and calls
  `window.location.reload()` only from the button.
- Run the full test suite and production build before deployment.
