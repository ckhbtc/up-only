# EVM Wallet Selector Design

## Goal

Let users explicitly connect MetaMask, Rabby, or Keplr while preserving the
existing UpOnly trading, AuthZ, take-profit, account-change, and CCTP behavior.

## Decision

Use the selected wallet's EIP-1193 provider for the entire browser session.
Discover providers through EIP-6963 first, then fall back to legacy injected
provider arrays and `window.ethereum`. Present the three supported wallets in a
brutalist selector matching the existing UpOnly visual system. Persist the
selected wallet type so later connections prefer the same provider.

Native `window.keplr` Cosmos signing is intentionally out of scope. Keplr's EVM
provider follows the same interface already used by MetaMask and Rabby, so this
approach keeps one signing path and one address identity across trading and
cross-chain CCTP funding.

## Data Flow

1. A Connect action opens the wallet selector.
2. Provider discovery returns supported MetaMask, Rabby, and Keplr options.
3. Selecting an installed wallet calls `eth_requestAccounts` on that provider.
4. The wallet store derives the Injective address from the selected EVM
   address and subscribes to that provider's account-change events.
5. AuthZ, revoke, TP signing, network switching, and CCTP writes resolve the
   same active provider instead of reading `window.ethereum` directly.
6. Disconnect clears the active provider and the wallet-bound local session.

## Failure Handling

- Installed but undiscovered wallets show a clear unavailable state.
- A rejected connection keeps the selector open and displays the wallet error.
- If a selected provider disappears after reload, Connect reopens the selector.
- No operation silently falls back to another installed wallet after selection.

## Verification

- Test EIP-6963 discovery, classification, deduplication, and legacy fallback.
- Test that connection and account events use the selected provider.
- Render-test all three selector options and unavailable/error states.
- Verify AuthZ, TP, bridge, and wallet services no longer hardcode
  `window.ethereum`.
- Run the full test suite and production build before deployment.
