# UpOnly Design Handoff

## Product Summary

UpOnly is a long-only, max-leverage Injective perpetual trading app. The user
connects a wallet, authorizes autosign once, types a USDC amount on a market
card, and clicks the inline UpOnly CTA. The app keeps BET's RFQ execution,
AuthZ autosign, fee delegation, bridge, faucet, wallet, and position close
plumbing.

## Creative Direction

The high-fidelity direction is an early-2000s dealership blowout adapted for a
trading lot. It should feel loud, direct, and intentionally commercial:

- Big sale signage and sticker language.
- Heavy black borders, hard shadows, and small rotations.
- Web-safe display typography, led by Impact-style headings.
- Yellow, red, green, and cobalt as the main signals.
- Fast market scanning with no separate order panel.

Use the name `UpOnly` everywhere. Prior product-name copy should not appear in
the app. `50x` or similar is acceptable only as a leverage fact.

## Core Flow

1. Connect wallet.
2. Authorize RFQ autosign if needed.
3. Stay on `The Lot`.
4. Enter amount directly on a market card.
5. Use `HALF` or `ALL-IN` when useful.
6. Click `UPONLY >`.
7. Show a transient `UPONLY OPENED!` stamp on that card.
8. Track and cash out positions in `My Garage`.

There is no direction toggle, leverage selector, order review panel,
confirmation modal, take-profit input, or short flow.

## Navigation

- `The Lot`: market cards with inline order controls.
- `My Garage`: active UpOnly positions and cash-out actions.
- Header actions: RFQ readiness badge, theme toggle, add cash, wallet menu.
- Marquee: product-level urgency and one-line rules.

## Market Card Requirements

Each card is both market display and order ticket:

- Asset logo, symbol, and market name.
- 24h move sticker.
- Price and sparkline.
- Fixed facts: `UP ONLY`, market max leverage, estimated liquidation.
- Amount input with a dollar prefix.
- Balance label.
- `HALF` and `ALL-IN` chips.
- Position size preview.
- Inline error stamp for insufficient balance or RFQ failure.
- CTA that changes across connect, authorize, opening, disabled, and ready
  states.
- Success overlay: `UPONLY OPENED!` for roughly 2.4 seconds.

## Visual Rules

- Cards may use up to 8px radius, but the design should read as hard-edged.
- Use sticker shadows, not soft elevation.
- Red is for sales energy and errors. Green is for action and long exposure.
  Yellow is for signage. Cobalt is for system and wallet accents.
- Keep layouts stable. Price updates, labels, and order states must not resize
  buttons or shift the grid.
- Avoid dark atmospheric crypto styling, glassmorphism, gradients as page
  decoration, floating orbs, and generic SaaS cards.
- Do not add instructional paragraphs inside the app. Controls should be
  self-explanatory.

## Copy

Preferred:

- `UpOnly`
- `The Lot`
- `My Garage`
- `UPONLY >`
- `UPONLY OPENED!`
- `UP ONLY`
- `50x`
- `Authorize RFQ`
- `Add Cash`
- `Cash Out`

Avoid:

- `Bet`
- `Short`
- `Down`
- `Choose leverage`
- `Target win`
- `Review order`

## Technical Constraints

- React and Vite frontend.
- No Tailwind or component library.
- Product guardrails live in `src/services/upOnly.js`.
- RFQ prequote warmup should run from each valid market card.
- The app must keep RFQ, AuthZ, autosign, and gas-free execution behavior.
- Close orders still use the required opposite-side exchange order internally,
  but the UI only presents app-managed long positions.

## Open Design Questions

- Final card density for mobile once real market count is high.
- Whether to add favorites or volume sorting beyond the current hottest sort.
- Whether `My Garage` should include realized history in a later version.
- Whether advanced liquidation math belongs in an optional drawer.
