# EVM Wallet Selector Design

## Goal

Let users explicitly connect MetaMask, Rabby, or Keplr while preserving the
existing UpOnly trading, AuthZ, take-profit, account-change, and CCTP behavior.

## Decision

Use Web3-Onboard's open-source core and injected-wallet module to present the
wallet selector and return the selected wallet's EIP-1193 provider. Its
EIP-6963 discovery handles multiple installed extensions without relying on
whichever wallet last overwrote `window.ethereum`. Keep that selected provider
for the entire browser session and persist the selected wallet label so later
connections can prefer the same wallet.

Native `window.keplr` Cosmos signing is intentionally out of scope. Keplr's EVM
provider follows the same interface already used by MetaMask and Rabby, so this
approach keeps one signing path and one address identity across trading and
cross-chain CCTP funding.

## Data Flow

1. A Connect action opens the Web3-Onboard wallet selector.
2. Its injected-wallet module discovers MetaMask, Rabby, Keplr, and other
   EIP-6963-compatible browser wallets.
3. Selecting an installed wallet calls `eth_requestAccounts` on that provider.
4. The wallet store derives the Injective address from the selected EVM
   address and subscribes to that provider's account-change events.
5. AuthZ, revoke, TP signing, network switching, and CCTP writes resolve the
   same active provider instead of reading `window.ethereum` directly.
6. Disconnect clears the active provider and the wallet-bound local session.

## Failure Handling

- Installed wallets are discovered by Web3-Onboard, with a legacy injected
  fallback for extensions that have not implemented EIP-6963.
- A rejected connection leaves the app disconnected and surfaces the wallet
  error without changing the active provider.
- If a selected provider disappears after reload, Connect reopens the selector.
- No operation silently falls back to another installed wallet after selection.

## Verification

- Test Web3-Onboard selection and provider activation through a mocked adapter.
- Test that connection and account events use the selected provider.
- Verify AuthZ, TP, bridge, and wallet services no longer hardcode
  `window.ethereum`.
- Run the full test suite and production build before deployment.
