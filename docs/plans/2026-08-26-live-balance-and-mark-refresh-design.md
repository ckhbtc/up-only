# Live Balance and Mark Refresh

Externally deposited USDC must become visible without a manual page refresh.
While a wallet is connected, the app refreshes portfolio balances every 15
seconds and immediately when the document becomes visible or the window regains
focus. Hidden tabs do not poll, and an in-flight refresh blocks overlapping
requests. Existing post-trade and bridge-specific refreshes remain intact.

Market cards and open positions use one Injective oracle stream subscribed by
market ID. Each oracle event updates the market card, cached execution price,
and matching position mark and PnL. This replaces a last-fill summary as the
primary live display without creating one polling request per market. The
existing five-second polling loop remains: market summaries refresh every 10
seconds for 24-hour change and fallback prices, while full positions refresh
every 30 seconds.

Lifecycle tests cover the 15-second balance cadence, hidden-tab suppression,
focus refresh, cleanup, live market price propagation, and the app/store stream
wiring. Full builds verify browser-compatible SDK integration.
