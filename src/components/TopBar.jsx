import useWalletStore from '../stores/walletStore';
import { formatUsdcBalance } from '../data/mockData';

const THEME_SEGS = [
  { id: 'bauhaus', glyph: 'L', label: 'Light' },
  { id: 'bauhaus-dark', glyph: 'D', label: 'Dark' },
];

export default function TopBar({
  onNavigate,
  currentView,
  theme,
  onSetTheme,
  onAddFunds,
  onRevokeAutosign,
  sessionActive,
  revokingAutosign,
  devMode,
}) {
  const { connected, connecting, ethAddress, injAddress, usdcBalance, connect, disconnect } = useWalletStore();

  return (
    <header className="up-shell-head">
      <div className="up-header">
        <button type="button" className="up-logo" onClick={() => onNavigate('home')} aria-label="UpOnly home">
          <img src="/iso.png" alt="" width={32} height={32} />
          <span className="up-brand">UPONLY</span>
          <span className="up-tagline">THE LONG-ONLY SUPERSTORE</span>
        </button>

        <nav className="up-tabs" aria-label="Primary">
          {[
            { id: 'home', label: 'Pairs' },
            { id: 'bets', label: 'Positions' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`up-tab ${currentView === item.id ? 'is-active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="up-head-actions">
          {devMode && (
            <span className="up-dev-pill" title="Dev mode active. Type D-E-V to toggle off.">
              DEV
            </span>
          )}
          <div className="theme-toggle" role="group" aria-label="Theme">
            {THEME_SEGS.map(seg => (
              <button
                key={seg.id}
                type="button"
                onClick={() => onSetTheme(seg.id)}
                className={`seg ${theme === seg.id ? 'on' : ''}`}
                aria-pressed={theme === seg.id}
                aria-label={`${seg.label} theme`}
                title={`${seg.label} theme`}
              >
                {seg.glyph}
              </button>
            ))}
          </div>

          {connected ? (
            <>
              <button type="button" className="up-add-cash" onClick={onAddFunds}>
                + Add Cash
              </button>
              <div className="up-wallet-pill">
                <span>USDC</span>
                <strong>${formatUsdcBalance(usdcBalance)}</strong>
              </div>
              <div title={injAddress} className="wallet-menu">
                <button type="button" className="wallet-menu-trigger" aria-haspopup="menu">
                  <span>
                    {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}
                  </span>
                  <span className="wallet-menu-arrow">v</span>
                </button>
                <div className="wallet-menu-dropdown" role="menu">
                  {sessionActive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onRevokeAutosign}
                      disabled={revokingAutosign}
                      className="wallet-menu-item is-danger"
                    >
                      {revokingAutosign ? 'Revoking autosign...' : 'Revoke autosign'}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={disconnect}
                    className="wallet-menu-item"
                  >
                    Disconnect wallet
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button type="button" className="up-connect" onClick={connect} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
