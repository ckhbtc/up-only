# Up Only Design Handoff

## Product Summary

Up Only is a stripped-down Injective trading app for one action: open a
max-leverage long on a perpetual market. It inherits BET's RFQ execution,
AuthZ autosign, fee delegation, bridge, faucet, wallet, and position close
plumbing, but removes short entry, leverage selection, target-win inputs, and
confirmation friction.

## Design Goal

Make the app feel direct, high-conviction, and operationally clear. The user
should understand within one screen that every trade is:

- Long only
- Max leverage only
- One-click after autosign authorization
- RFQ-routed and gas-free after setup

The interface should feel more like a focused trading console than a betting
game. It can carry energy, but the controls should stay sparse and hard to
misread.

## Target User

Crypto-native traders who already understand perpetuals and want the fastest
possible way to express upside exposure. They care about speed, current price,
liquidation distance, wallet state, and clean exits.

## Core Flow

1. Connect wallet.
2. Sign one AuthZ autosign grant if the wallet is not ready.
3. Pick a market.
4. Enter USDC amount.
5. Review fixed direction and fixed leverage.
6. Open max long.
7. Track position and cash out through RFQ.

There is intentionally no short toggle, no leverage selector, no take-profit
input, and no confirmation sheet.

## Information Architecture

Top navigation:

- `Markets`: grid of tradable assets.
- `Positions`: active app-managed long positions.
- Wallet actions: add funds, revoke autosign, disconnect.
- Theme toggle: light and dark.

Primary surfaces:

- Market grid
- Max-long order panel
- Positions list
- AuthZ setup modal
- Add funds bridge modal
- Transaction status toast

## Screen Notes

### Markets

Each market card should make the max-long action obvious without turning into
a dense trading terminal. Required data:

- Asset logo and symbol
- Asset name
- Current oracle or mark price
- 24h change
- Small sparkline
- Derived max leverage label, for example `50x Max`

The CTA can say `50x Max`, `Max Long`, or a similar short phrase. Avoid any
copy that implies choice of direction or leverage.

### Order Panel

This is the most important screen. It should show only the controls and risk
facts needed for a max long:

- Asset and current price
- Sparkline
- Direction: `Long only`
- Leverage: derived market max
- Amount input
- Quick amount chips
- Liquidation estimate
- Insufficient balance warning
- Authorization warning when needed
- CTA: `Open Max Long`

Do not introduce:

- Direction toggles
- Leverage sliders or segmented controls
- Take-profit inputs
- Stop-loss inputs
- Confirmation modal

### Positions

Positions should emphasize live state and exit readiness:

- Asset
- Long badge
- Stake amount
- PnL and PnL percent
- Entry price
- Current price
- Liquidation price
- Optional progress indicator when a take-profit exists from external state
- Cash out button

Only long positions are shown as app-managed positions.

### AuthZ Setup

The AuthZ modal should stay direct and trust-building. Required ideas:

- One-time authorization
- Funds stay in the wallet
- Revoke anytime
- Wallet confirmation state

Avoid heavy education. The app is for users who already trade perps.

### Bridge Modal

Keep the inherited CCTP bridge behavior. Designers may restyle it, but should
not remove source-chain selection, allowance, burn, attestation, mint, recovery
or status handling.

## Interaction States

Required states:

- Wallet disconnected
- Wallet connecting
- Connected but AuthZ not ready
- Authorizing
- RFQ warmup active
- Order submitted
- RFQ matched
- Open confirmed
- Open failed
- Position syncing after optimistic match
- Cash out submitted
- Cash out confirmed
- Cash out failed
- Bridge idle, approval, burn, attestation, mint, success, error

The transaction toast should remain globally visible and should link to the
explorer when a transaction hash exists.

## Visual Direction

Current scaffold direction:

- Industrial trading console
- White or near-black surfaces
- Ink text
- Signal green for action and upside
- Cobalt for wallet and system state
- Safety yellow for emphasis
- Red only for loss, liquidation, and destructive revoke

Suggested typography:

- Keep a condensed, high-impact display face for headers and CTAs.
- Use a readable grotesk for body copy.
- Use a mono face for prices, hashes, amounts, and status details.

Spacing should favor speed and scanability. Cards should be compact, not
marketing-style. Keep controls stable so price updates and status changes do
not shift layout.

## Copy Guidelines

Preferred language:

- `Open Max Long`
- `Long only`
- `50x Max`
- `Positions`
- `Cash Out`
- `Authorize Wallet`
- `Revoke autosign`

Avoid language:

- `Bet`
- `Down`
- `Short`
- `Aggressiveness`
- `Choose leverage`
- `Target win`

`YOLO` can remain an internal mode name in engineering, but it should not be
primary product copy unless the final brand deliberately chooses it.

## Technical Constraints

The implementation currently uses React, Vite, inline component styles, and
CSS variables in `src/styles/global.css`. The app does not use Tailwind or a
component library.

Do not design flows that require:

- Server custody of user keys
- A backend trade executor
- Per-trade wallet popups after AuthZ
- Short entry
- User-selected leverage
- Required take-profit placement

The `src/services/upOnly.js` module is the product guardrail for direction and
leverage. Designs should assume those rules are fixed.

## Open Design Questions

- Final product name: `Up Only`, `Max Long`, or another brand.
- Production domain.
- Whether the market grid should rank by volume, volatility, favorites, or a
  curated list.
- Whether to expose realized trade history in addition to open positions.
- Whether to show an advanced risk drawer for liquidation math.
