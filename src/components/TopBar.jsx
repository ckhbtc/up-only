import { useEffect, useRef } from 'react';
import useWalletStore from '../stores/walletStore';
import { formatUsdcBalance } from '../data/mockData';

const THEME_SEGS = [
  { id: 'bauhaus', icon: 'sun', label: 'Light' },
  { id: 'bauhaus-dark', icon: 'moon', label: 'Dark' },
];

function ThemeIcon({ icon }) {
  if (icon === 'moon') {
    return (
      <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.3 15.7A8.1 8.1 0 0 1 8.3 3.7a8.7 8.7 0 1 0 12 12Z" />
      </svg>
    );
  }

  return (
    <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="up-search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.2 15.2 5.3 5.3" />
    </svg>
  );
}

export default function TopBar({
  theme,
  onSetTheme,
  searchOpen,
  searchQuery,
  onOpenSearch,
  onCloseSearch,
  onSearchQueryChange,
  onAddFunds,
  onRevokeAutosign,
  sessionActive,
  revokingAutosign,
  devMode,
}) {
  const { connected, connecting, ethAddress, injAddress, usdcBalance, connect, disconnect } = useWalletStore();
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [searchOpen]);

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCloseSearch();
    }
  };

  return (
    <header className="up-shell-head">
      <div className="up-header">
        <button type="button" className="up-logo" onClick={onCloseSearch} aria-label="UpOnly home">
          <img className="up-logo-image" src="/up-only-logo.png" alt="" width={78} height={78} />
        </button>

        <nav className="up-tabs" aria-label="Primary">
          <button
            type="button"
            onClick={onCloseSearch}
            className={`up-tab ${searchOpen ? '' : 'is-active'}`}
          >
            Pairs
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            className={`up-tab up-search-tab ${searchOpen ? 'is-active' : ''}`}
            aria-label="Search pairs"
            aria-keyshortcuts="/"
            title="Search pairs"
          >
            <SearchIcon />
            <span>Search</span>
          </button>
          {searchOpen && (
            <div className="up-nav-search">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={event => onSearchQueryChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pairs"
                aria-label="Search pairs"
              />
              <button
                type="button"
                className="up-search-clear"
                onClick={searchQuery ? () => onSearchQueryChange('') : onCloseSearch}
                aria-label={searchQuery ? 'Clear search' : 'Close search'}
              >
                x
              </button>
            </div>
          )}
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
                <ThemeIcon icon={seg.icon} />
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
