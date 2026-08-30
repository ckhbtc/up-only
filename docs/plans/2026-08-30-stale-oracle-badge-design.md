# Stale Oracle Badge Design

## Goal

Warn users when a TrueCurrent equity-market oracle is stale without preventing an UpOnly trade.

## Data Source

Use the same UI API status endpoints and provider rules as TrueCurrent. Pyth equity markets are stale when `market_hours.is_open` is explicitly false. SEDA markets are stale when `was_stale` is explicitly true. BFF `provider` and `oracleBase` metadata are preserved on each normalized market.

Status checks run only for supported equity providers and only while a card is in or near the viewport. Visible cards refresh every 60 seconds, matching TrueCurrent's polling cadence. A failed or incomplete status response does not claim that an oracle is stale.

## Interface

Show an orange `CLOSED` badge immediately after the leverage badge. Hover, keyboard focus, or tap reveals this tooltip:

> The oracle for this market is currently closed. You may have issues getting filled, but feel free to YOLO it anyway.

The warning remains informational. Amount controls and the trade button keep their existing behavior.
