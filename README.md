# UpOnly

Long-only max-leverage trading UI on Injective. Users connect a wallet,
authorize autosign once, pick an asset, enter an amount, and open a
max-leverage long through RFQ execution.

This app targets Injective mainnet and can place real max-leverage trades. Use
small size, understand the liquidation risk, and never configure operational
keys with more funds than the app needs.

## Product Scope

- Long opens only. No short entry UI.
- Max leverage only. The app derives the stepped market max from each market's
  initial margin ratio.
- YOLO-style entry. No take-profit target or confirmation sheet in the default
  flow.
- RFQ execution, AuthZ grants, autosign, fee delegation, bridge, faucet, and
  position close paths are part of the app flow.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
npm run dev:api
```

The Vite app runs on `:36000`. The dev API runs on `:36001` and receives
`/api/*` traffic through the Vite proxy.

Production-shaped local run:

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | What it does |
|---|---|---|
| `FAUCET_PRIVATE_KEY` | Optional | Hex EVM private key for a small INJ faucet used by fresh wallets before their first AuthZ grant. |
| `RFQ_BROADCAST_RPC_URLS` | Optional | Comma-separated Tendermint RPC URLs for the RFQ broadcast relay. |
| `RFQ_BROADCAST_LCD_URLS` | Optional | Comma-separated LCD base URLs for the RFQ broadcast relay. |
| `PORT` | Optional | Production listen port for `server.js`. Defaults to `36000`. |
| `API_PORT` | Optional | Dev-only API port for `dev-server.js`. Defaults to `36001`. |

Use a limited-balance operational wallet for `FAUCET_PRIVATE_KEY`. The same key
backs the fresh-wallet faucet and CCTP mint relayer, so it should never be a
primary wallet.

## Architecture

The browser generates an ephemeral grantee key, stores it in localStorage keyed
by the connected `inj1` granter, and asks the user to sign AuthZ grants once.
After that, opens and closes are signed locally as `MsgAuthzExec` and broadcast
through Injective fee delegation.

The server does not hold user trading keys. Its public API surface is limited to
fresh-wallet initialization, CCTP mint relay, RFQ broadcast relay, RFQ timing,
and `/api/health`.

Open orders route through RFQ first. UpOnly forces `side: 'long'` and uses the
market's max stepped leverage from `src/services/upOnly.js`. Position close
still sends the opposite order as required by the exchange, but the UI only
presents long positions as app-managed positions.

## Repo Layout

```text
src/
  App.jsx                   Top-level flow, RFQ warmups, optimistic positions
  components/               UI components
  services/
    upOnly.js               Product guardrails for long-only max leverage
    rfq.js                  RFQ prepare, quote selection, signing, broadcast
    autosign.js             AuthZ grant and revoke
    authzMessages.js        AuthZ message scopes
    trade.js                Direct orderbook fallback helpers
    bridge.js / cctp.js     USDC bridge support
  stores/                   zustand wallet, market, and session stores
  server/                   faucet and RFQ timing APIs
test/                       Node test runner coverage
```

## Tests

```bash
npm test
npm run build
```

## Hidden Dev Mode

Type `D`, `E`, `V` within 1.5 seconds outside inputs to toggle dev mode. It
adds a `DEV` pill and exposes "Cash Out All" for local testing.

## Deployment

Deployment details belong in local-only `DEPLOYMENT.md`, which is gitignored.
Do not commit hostnames, server IPs, SSH key paths, PM2 names, or production
environment values.
