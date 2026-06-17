# Up Only

Long-only max-leverage trading UI on Injective mainnet.

## What It Is

Users connect MetaMask or Rabby, sign one AuthZ grant, then open a max-leverage
long on a selected perpetual market. The app intentionally removes short entry,
leverage selection, target-win input, and the confirmation sheet from BET.

## Product Rules

- Opens are always `side: 'long'`.
- Opens always use the stepped market max leverage from `src/services/upOnly.js`.
- The default open flow is YOLO-style with no take-profit order.
- The positions view only displays long positions as app-managed positions.
- Closing a long still sends the exchange-required opposite order through RFQ.

## Architecture

**Client-side AuthZ.** The grantee `privateKeyHex` lives in `localStorage`
keyed by granter `inj1` address. The browser signs `MsgAuthzExec` itself and
broadcasts via Injective fee delegation. The server holds no trade-related
secrets.

**Server is minimal.** Only API support routes run server-side, including the
fresh-wallet faucet and RFQ timing capture. Session state, trade signing,
market lookups, balance reads, and position fetching happen in-browser.

**Stack.** React 18, Vite, zustand, Express, `@injectivelabs/sdk-ts`, and
`decimal.js`.

## Layout

```text
src/
  App.jsx                   top-level flow and RFQ warmups
  components/               UI components
  services/
    upOnly.js               long-only max-leverage guardrails
    grantee.js              localStorage helpers keyed by granter inj1
    rfq.js                  RFQ prepare, quote selection, signing, broadcast
    autosign.js             AuthZ grant and revoke
    authzMessages.js        shared AuthZ grant/revoke message builders
    injective.js            read APIs for markets, balances, positions
    api.js                  browser API client
    cctp.js                 CCTP V2 chain configs and ABIs
    bridge.js               CCTP V2 burn-and-mint bridge support
    wallet.js               connect/disconnect wallet helpers
  stores/                   zustand wallet, session, market stores
  styles/global.css         CSS-variable themes
  server/                   faucet and RFQ timing APIs
test/                       node:test coverage
```

## Dev Workflow

```bash
npm run dev
npm run dev:api
npm test
npm run build
```

The Vite config proxies `/api/*` to `localhost:36001`.

## Conventions

- Single quotes and 2-space indent.
- Use ESLint/Prettier conventions where available.
- Keep `CLAUDE.md` and `DEPLOYMENT.md` out of git.
- Do not refactor copied BET plumbing unless the product rule requires it.
- Keep RFQ, AuthZ, fee delegation, bridge, faucet, and autosign behavior intact.

## Deployment

No production host is assigned yet. When first deployed, create a local-only
`DEPLOYMENT.md` with host, SSH key, app directory, PM2 process, port, domain,
nginx config path, env vars, deploy commands, status checks, logs, SSL renewal,
and rollback notes.
