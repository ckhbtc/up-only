# Positions, search, and bridge redesign

## Outcome

UpOnly becomes a single trading surface. Open positions sit above Available Pairs, search opens as a keyboard-friendly dropdown in the top bar, and Add Cash opens a wider dealership-style CCTP bridge with chain art. Existing RFQ, AuthZ, optimistic position, fee-delegation, theme, and bridge execution behavior stays unchanged.

## Architecture

- Replace `ActiveBets` with `PositionStrip`. The component owns five-item paging and the 500 ms open-PnL grace ticker. Pure helpers derive display PnL, position value, totals, liquidation distance, sorting, and paging so the financial display rules have direct tests.
- Remove the `bets` page state. `App` always renders the positions strip and market grid, and keeps close-RFQ prequotes warm whenever visible positions exist.
- Keep market search matching in `marketSearch.js`. Add a pure wrapping cursor helper, while `TopBar` owns the active result index and result-row refs. Selection closes search and asks `App` to focus the matching card's amount input.
- Keep `BridgeModal` state and service calls unchanged. Move presentation into `up-bridge-*` classes and add a `ChainLogo` component that maps chain IDs to existing token art plus a local Base mark.

## Interface and states

The positions shell always renders. With positions it shows portfolio-wide Open PnL and Exposure totals, value-sorted compact cards, a five-item pager, liquidation meters, and one-tap cash-out actions. Without positions it shows the existing branded empty banner at reduced scale. Dev mode retains Cash Out All.

Search has a visible `/` hint, scrim, match count, four-and-a-half-row dropdown, mouse selection, wrapping arrow navigation, Enter selection, Escape close, and a no-results state. Market cards no longer auto-scroll or pulse when typing.

The bridge keeps all phase, error, success, MAX, speed, outside-click, and Escape behavior. The redesign changes only its shell, controls, chain picker, logos, and responsive layout.

## Error handling and accessibility

Existing transaction errors and phase copy remain authoritative. New controls use semantic buttons, `aria-expanded`, listbox and option roles, live regions, focus-visible outlines, disabled states, and reduced-motion support. Search selection moves focus to the cash field so keyboard users land at the intended action.

## Verification

- Unit-test position sorting, totals, grace-period display, liquidation distance, paging, and search cursor wrapping.
- Render-test key component contracts where practical.
- Run the full Node test suite and Vite production build.
- Inspect light and dark themes at desktop and mobile widths with local Chrome.
