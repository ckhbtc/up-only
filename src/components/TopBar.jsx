import { useEffect, useRef, useState } from 'react';
import useWalletStore from '../stores/walletStore';
import { formatPrice, formatUsdcBalance } from '../data/mockData';
import { moveSearchCursor } from '../services/marketSearch';
import { maxLongConfigForMarket } from '../services/upOnly';
import CoinLogo from './CoinLogo';
import PriceText from './PriceText';

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

function MarketSortIcon({ direction }) {
  const path = direction === 'down'
    ? 'M10 4v12m-5-5 5 5 5-5'
    : 'M10 16V4M5 9l5-5 5 5';

  return (
    <svg className="market-sort-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function TopBar({
  theme,
  onSetTheme,
  marketSortMode = 'gainers',
  onSetMarketSortMode,
  searchOpen,
  searchQuery,
  searchMatches = [],
  onOpenSearch,
  onCloseSearch,
  onSearchQueryChange,
  onSelectSearchResult,
  onConnect,
  onAddFunds,
  onOpenTradeHistory,
  onRevokeAutosign,
  sessionActive,
  revokingAutosign,
  devMode,
}) {
  const { connected, connecting, ethAddress, injAddress, usdcBalance, disconnect } = useWalletStore();
  const searchInputRef = useRef(null);
  const searchListRef = useRef(null);
  const resultRefs = useRef(new Map());
  const [cursorIndex, setCursorIndex] = useState(0);

  useEffect(() => {
    if (!searchOpen) return;
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [searchOpen]);

  useEffect(() => {
    setCursorIndex(0);
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    const list = searchListRef.current;
    const activeRow = resultRefs.current.get(cursorIndex);
    if (!list || !activeRow) return;

    const rowTop = activeRow.offsetTop;
    const rowBottom = rowTop + activeRow.offsetHeight;
    if (rowTop < list.scrollTop) list.scrollTop = rowTop;
    if (rowBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = rowBottom - list.clientHeight;
    }
  }, [cursorIndex]);

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCloseSearch();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setCursorIndex(index => moveSearchCursor(
        index,
        event.key === 'ArrowUp' ? -1 : 1,
        searchMatches.length,
      ));
      return;
    }
    if (event.key === 'Enter' && searchMatches[cursorIndex]) {
      event.preventDefault();
      onSelectSearchResult(searchMatches[cursorIndex]);
    }
  };

  return (
    <header className="up-shell-head">
      <div className="up-header">
        <button type="button" className="up-logo" onClick={onCloseSearch} aria-label="UpOnly home">
          <img className="up-logo-image" src="/uponlylogo.png" alt="" width={96} height={64} />
        </button>

        <div className="up-head-actions">
          <div className={`up-tabs up-search-area ${searchOpen ? 'is-open' : ''}`}>
            {!searchOpen ? (
              <button
                type="button"
                onClick={onOpenSearch}
                className="up-tab up-search-tab"
                aria-label="Search pairs"
                aria-keyshortcuts="/"
                title="Search pairs"
              >
                <SearchIcon />
                <span>Search</span>
                <kbd className="up-search-key">/</kbd>
              </button>
            ) : (
              <>
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
                  aria-controls="up-search-results"
                  aria-activedescendant={searchMatches.length ? `up-search-result-${cursorIndex}` : undefined}
                  autoComplete="off"
                />
                <span className="up-search-count">{searchMatches.length} match</span>
                <button
                  type="button"
                  className="up-search-clear"
                  onClick={searchQuery ? () => onSearchQueryChange('') : onCloseSearch}
                  aria-label={searchQuery ? 'Clear search' : 'Close search'}
                >
                  x
                </button>
              </div>

              {searchQuery.trim() && (
                <div className="up-search-dropdown">
                  <div className="up-search-dropdown-head">
                    <span>{searchMatches.length} pairs match &quot;{searchQuery.trim()}&quot;</span>
                    <span>{marketSortMode} first</span>
                  </div>

                  {searchMatches.length > 0 ? (
                    <div
                      id="up-search-results"
                      ref={searchListRef}
                      className="up-search-results"
                      role="listbox"
                      aria-label="Matching pairs"
                    >
                      {searchMatches.map((market, index) => {
                        const marketId = market.marketId ?? market.id;
                        const maxConfig = maxLongConfigForMarket(market);
                        const change = Number(market.change24h || 0);
                        return (
                          <button
                            key={marketId}
                            id={`up-search-result-${index}`}
                            ref={node => {
                              if (node) resultRefs.current.set(index, node);
                              else resultRefs.current.delete(index);
                            }}
                            type="button"
                            role="option"
                            aria-selected={cursorIndex === index}
                            className={`up-search-result ${cursorIndex === index ? 'is-active' : ''}`}
                            onMouseEnter={() => setCursorIndex(index)}
                            onClick={() => onSelectSearchResult(market)}
                          >
                            <CoinLogo symbol={market.symbol} logoUrl={market.logo} size={32} />
                            <span className="up-search-result-name">
                              <strong>{market.symbol}</strong>
                              <span>{market.ticker || market.name} · {maxConfig.label}</span>
                            </span>
                            <span className="up-search-result-price">
                              <strong>$<PriceText value={formatPrice(market.price, market.priceDecimals)} /></strong>
                              <span className={change >= 0 ? 'is-up' : 'is-down'}>
                                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                              </span>
                            </span>
                            {cursorIndex === index && <kbd className="up-search-enter">↵</kbd>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="up-search-empty">
                      No pairs match &quot;{searchQuery.trim()}&quot;
                    </div>
                  )}

                  {searchMatches.length > 0 && (
                    <div className="up-search-dropdown-foot">
                      <span>↑ ↓ move · ↵ open pair · esc close</span>
                      {searchMatches.length > 5 && (
                        <span>{searchMatches.length - 5} more below</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              </>
            )}
          </div>

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
          <div className="market-sort-toggle" role="group" aria-label="Market ranking">
            <button
              type="button"
              className={`market-sort-seg is-gainers ${marketSortMode === 'gainers' ? 'on' : ''}`}
              onClick={() => onSetMarketSortMode?.('gainers')}
              aria-pressed={marketSortMode === 'gainers'}
              aria-label="Top gainers"
              title="Top gainers"
            >
              <MarketSortIcon direction="up" />
            </button>
            <button
              type="button"
              className={`market-sort-seg is-losers ${marketSortMode === 'losers' ? 'on' : ''}`}
              onClick={() => onSetMarketSortMode?.('losers')}
              aria-pressed={marketSortMode === 'losers'}
              aria-label="Top losers"
              title="Top losers"
            >
              <MarketSortIcon direction="down" />
            </button>
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
                    onClick={onOpenTradeHistory}
                    className="wallet-menu-item"
                  >
                    Trade history
                  </button>
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
            <button type="button" className="up-connect" onClick={onConnect} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
