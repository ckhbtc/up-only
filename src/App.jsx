import { useState, useCallback, useEffect, useMemo } from 'react';

const THEMES = ['bauhaus', 'bauhaus-dark'];
const readInitialTheme = () => {
  if (typeof document === 'undefined') return 'bauhaus';
  const attr = document.documentElement.dataset.theme;
  return THEMES.includes(attr) ? attr : 'bauhaus';
};
import TopBar from './components/TopBar';
import MarketCard from './components/MarketCard';
import ActiveBets from './components/ActiveBets';
import AuthZSetup from './components/AuthZSetup';
import BridgeModal from './components/BridgeModal';
import Confetti from './components/Confetti';
import TransactionStatus from './components/TransactionStatus';
import {
  buildRfqCloseInput,
  primeRfqAccountCache,
  sendRfqPrequoteRequest,
  tradeCloseRfq,
  tradeOpenRfq,
} from './services/rfq';
import { RFQ_PREQUOTE_INTERVAL_MS } from './services/rfqConstants';
import { getOpenTradeStatus, userFacingTradeError } from './services/tradeResult';
import useWalletStore from './stores/walletStore';
import useMarketStore from './stores/marketStore';
import useSessionStore from './stores/sessionStore';
import { nextOpenPnlGraceExpiresAt } from './stores/optimisticPositions';
import {
  UP_ONLY_DIRECTION,
  UP_ONLY_SIDE,
  UP_ONLY_TARGET_MODE,
  isUpOnlyPosition,
} from './services/upOnly';

function latestCachedPrice(marketId, fallback = null) {
  const state = useMarketStore.getState();
  return state.prices[marketId]
    || state.markets.find(market => market.marketId === marketId)?.price
    || fallback;
}

function buildOptimisticOpenPosition(bet) {
  const side = UP_ONLY_SIDE;
  const entryPrice = latestCachedPrice(bet.market.marketId, bet.market.price) || bet.market.price || 0;
  const quantity = entryPrice > 0
    ? String((Number(bet.stake) * Number(bet.leverage)) / entryPrice)
    : '0';

  return {
    id: `${bet.market.marketId}_${side}`,
    symbol: bet.market.symbol,
    ticker: bet.market.ticker || bet.market.name || bet.market.marketId,
    marketId: bet.market.marketId,
    market: bet.market,
    side,
    direction: UP_ONLY_DIRECTION,
    quantity,
    entryPrice,
    markPrice: entryPrice,
    margin: Number(bet.stake) || 0,
    liqPrice: bet.liqPrice || null,
    tpPrice: bet.targetPrice || null,
    targetMode: bet.targetMode || UP_ONLY_TARGET_MODE,
    letItRide: !bet.targetPrice,
    pnl: 0,
    pnlPct: 0,
    stake: Number(bet.stake) || 0,
    currentPrice: entryPrice,
    asset: bet.market.symbol,
    logo: bet.market.logo || '',
    tokenName: bet.market.tokenName || '',
    slug: bet.market.slug || '',
    status: 'opening',
    optimisticConfirmed: false,
  };
}

export default function App() {
  const [view, setView] = useState('home');
  const [txStatus, setTxStatus] = useState(null); // { type: 'loading'|'success'|'warning'|'error', message, txHash? }
  const [confetti, setConfetti] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDismissedFor, setAuthDismissedFor] = useState(null);
  const [openedCards, setOpenedCards] = useState({});
  const [openingCards, setOpeningCards] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [theme, setTheme] = useState(readInitialTheme);
  const [devMode, setDevMode] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('up-only-dev-mode') === '1';
  });

  // Sync theme to <html data-theme> + localStorage
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('up-only-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const setThemeTo = useCallback((next) => {
    if (THEMES.includes(next)) setTheme(next);
  }, []);

  // D-E-V keystroke (sequence within ~1.5s, ignored while typing in form fields) toggles devMode.
  useEffect(() => {
    let buf = '';
    let timer = null;
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      buf = (buf + e.key.toUpperCase()).slice(-3);
      if (buf === 'DEV') {
        setDevMode(d => {
          const next = !d;
          try { localStorage.setItem('up-only-dev-mode', next ? '1' : '0'); } catch { /* ignore */ }
          return next;
        });
        buf = '';
      }
      clearTimeout(timer);
      timer = setTimeout(() => { buf = ''; }, 1500);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, []);

  const { connected, connecting, injAddress, ethAddress, usdcBalance, connect, refreshBalances } = useWalletStore();
  const { markets, positions, loading, startPolling, stopPolling } = useMarketStore();
  const session = useSessionStore();
  const visiblePositions = useMemo(() => positions.filter(isUpOnlyPosition), [positions]);
  const sortedMarkets = useMemo(() => (
    [...markets].sort((a, b) => Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0))
  ), [markets]);

  const clearTxStatusSoon = useCallback(() => {
    setTimeout(() => setTxStatus(null), 5000);
  }, []);

  const needsAuthorization = connected && injAddress && !session.rfqReady;

  const dismissAuthModal = useCallback(() => {
    setShowAuthModal(false);
    if (injAddress) setAuthDismissedFor(injAddress);
  }, [injAddress]);

  const handleAuthorizeWallet = useCallback(() => {
    if (!connected || !injAddress || session.granting) return;

    setShowAuthModal(false);
    setAuthDismissedFor(injAddress);
    setTxStatus({ type: 'loading', message: 'Confirm authorization in wallet' });

    session.grant({ injAddress, ethAddress })
      .then(() => {
        setTxStatus({ type: 'success', message: 'Wallet authorized.' });
        clearTxStatusSoon();
      })
      .catch((err) => {
        setTxStatus({ type: 'error', message: err.message });
        clearTxStatusSoon();
      });
  }, [connected, injAddress, ethAddress, session, clearTxStatusSoon]);

  useEffect(() => {
    if (!connected || !injAddress || !needsAuthorization) {
      setShowAuthModal(false);
      if (!connected) setAuthDismissedFor(null);
      return;
    }

    if (view !== 'home' || authDismissedFor === injAddress) return;
    setShowAuthModal(true);
  }, [connected, injAddress, needsAuthorization, view, authDismissedFor]);

  // Re-validate the session token against the currently-connected wallet.
  // Prevents a stale sessionToken (bound to a prior granter) from being
  // treated as active after the user swaps MetaMask accounts.
  useEffect(() => {
    useSessionStore.getState().refresh(injAddress);
  }, [injAddress]);

  useEffect(() => {
    if (!connected || !injAddress || !session.rfqReady) return;
    primeRfqAccountCache(injAddress).catch((err) => {
      console.warn('RFQ account cache warmup failed:', err.message || err);
    });
  }, [connected, injAddress, session.rfqReady]);

  useEffect(() => {
    if (!connected || !injAddress || !session.rfqReady || view !== 'bets' || !visiblePositions.length) return;

    let cancelled = false;
    const sendCashOutPrequotes = async () => {
      if (cancelled) return;
      const warmupPositions = visiblePositions.filter(position => position.market && position.side).slice(0, 8);
      for (const position of warmupPositions) {
        const price = position.markPrice
          || position.currentPrice
          || latestCachedPrice(position.marketId, position.market?.price);
        if (!price || Number(price) <= 0) continue;
        try {
          const input = buildRfqCloseInput({
            market: position.market,
            oraclePrice: price,
            side: position.side,
            quantity: position.quantity,
          });
          await sendRfqPrequoteRequest({
            requestAddress: injAddress,
            marketId: position.marketId,
            ...input,
          });
        } catch {
          // Warmup only; click-time cash-out still validates and reports errors.
        }
      }
    };

    void sendCashOutPrequotes();
    const interval = setInterval(() => {
      void sendCashOutPrequotes();
    }, RFQ_PREQUOTE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connected, injAddress, session.rfqReady, view, visiblePositions]);

  // Start polling when wallet connects
  useEffect(() => {
    if (connected && injAddress) {
      startPolling(injAddress);
      return () => stopPolling();
    }
  }, [connected, injAddress, startPolling, stopPolling]);

  const markCardOpened = useCallback((marketId) => {
    setOpenedCards(state => ({ ...state, [marketId]: true }));
    window.setTimeout(() => {
      setOpenedCards(state => {
        const next = { ...state };
        delete next[marketId];
        return next;
      });
    }, 2400);
  }, []);

  const markCardError = useCallback((marketId, message) => {
    setCardErrors(state => ({ ...state, [marketId]: message }));
    window.setTimeout(() => {
      setCardErrors(state => {
        const next = { ...state };
        delete next[marketId];
        return next;
      });
    }, 5200);
  }, []);

  const submitBet = useCallback(async (bet) => {
    if (!bet || !connected) return;

    const needsTakeProfitSignature = bet.targetPrice && Number(bet.targetPrice) > 0;
    const marketId = bet.market.marketId;

    setOpeningCards(state => ({ ...state, [marketId]: true }));
    setCardErrors(state => {
      const next = { ...state };
      delete next[marketId];
      return next;
    });
    setTxStatus({
      type: 'loading',
      message: `UpOnly order submitted for ${bet.market.symbol}`,
    });

    let openConfirmed = false;
    let openMatched = false;
    let optimisticPositionId = null;

    const showOptimisticOpen = () => {
      if (openMatched) return;
      openMatched = true;
      const optimisticPosition = buildOptimisticOpenPosition(bet);
      optimisticPositionId = optimisticPosition.id;
      useMarketStore.getState().addOptimisticPosition(optimisticPosition);
      setTxStatus(null);
      markCardOpened(marketId);
    };

    const settleOpenConfirmed = (result) => {
      if (openConfirmed) return;
      openConfirmed = true;
      if (!openMatched) showOptimisticOpen();
      if (optimisticPositionId) {
        useMarketStore.getState().updateOptimisticPosition(optimisticPositionId, {
          optimisticConfirmed: true,
          txHash: result?.txHash || null,
          pnlGraceExpiresAt: nextOpenPnlGraceExpiresAt(),
        });
      }
      setOpeningCards(state => {
        const next = { ...state };
        delete next[marketId];
        return next;
      });
      setTxStatus({
        type: needsTakeProfitSignature ? 'info' : 'success',
        message: needsTakeProfitSignature
          ? 'next, confirm the take profit order through your connected wallet'
          : `${bet.market.symbol} UpOnly opened.`,
        txHash: result?.txHash,
      });
      refreshBalances();
      useMarketStore.getState().fetchPositions(useWalletStore.getState().injAddress);
    };

    try {
      const result = await tradeOpenRfq({
        granterAddress: injAddress,
        marketId: bet.market.marketId,
        side: UP_ONLY_SIDE,
        stakeUsdt: bet.stake,
        leverage: bet.leverage,
        tpPrice: bet.targetPrice,
        market: bet.market,
        oraclePrice: latestCachedPrice(bet.market.marketId, bet.market.price),
        onProgress: ({ phase, result: progressResult }) => {
          if (phase === 'matched') {
            showOptimisticOpen();
          }
          if (phase === 'confirmed') {
            settleOpenConfirmed(progressResult);
          }
        },
      });

      const status = getOpenTradeStatus(result);
      if (!openConfirmed) settleOpenConfirmed(result);
      setTxStatus(status);

      clearTxStatusSoon();
    } catch (err) {
      const message = userFacingTradeError(err.message);
      if (optimisticPositionId) {
        useMarketStore.getState().removeOptimisticPosition(optimisticPositionId);
      }
      setOpeningCards(state => {
        const next = { ...state };
        delete next[marketId];
        return next;
      });
      markCardError(marketId, message);
      setTxStatus({ type: 'error', message });
      clearTxStatusSoon();
    }
  }, [connected, injAddress, refreshBalances, clearTxStatusSoon, markCardOpened, markCardError]);

  const handleCardConfirm = useCallback((bet) => {
    void submitBet(bet);
  }, [submitBet]);

  const handleCashOut = useCallback(async (position) => {
    if (!connected || !position.market) return;

    setTxStatus({ type: 'loading', message: 'Submitting cash-out order' });

    let closeConfirmed = false;
    let closeMatched = false;
    const optimisticCloseId = position.id;

    const showOptimisticClose = () => {
      if (closeMatched) return;
      closeMatched = true;
      useMarketStore.getState().addOptimisticClosedPosition(position);
      setTxStatus(null);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3500);
    };

    const settleCloseConfirmed = (result) => {
      if (closeConfirmed) return;
      closeConfirmed = true;
      if (!closeMatched) showOptimisticClose();
      setTxStatus({
        type: 'success',
        message: 'Cash-out order confirmed',
        txHash: result?.txHash,
      });
      refreshBalances();
      useMarketStore.getState().fetchPositions(useWalletStore.getState().injAddress);
    };

    try {
      const result = await tradeCloseRfq({
        granterAddress: injAddress,
        marketId: position.marketId,
        side: position.side,
        quantity: position.quantity,
        market: position.market,
        oraclePrice: position.markPrice
          || position.currentPrice
          || latestCachedPrice(position.marketId, position.market?.price),
        onProgress: ({ phase, result: progressResult }) => {
          if (phase === 'matched') {
            showOptimisticClose();
          }
          if (phase === 'confirmed') {
            settleCloseConfirmed(progressResult);
          }
        },
      });

      if (!closeConfirmed) settleCloseConfirmed(result);

      clearTxStatusSoon();
    } catch (err) {
      const message = userFacingTradeError(err.message);
      if (closeMatched) {
        useMarketStore.getState().removeOptimisticClosedPosition(optimisticCloseId, position);
      }
      setTxStatus({ type: 'error', message });
      clearTxStatusSoon();
    }
  }, [connected, injAddress, refreshBalances, clearTxStatusSoon]);

  // Sequential close - avoids nonce races on the same wallet. One failure
  // doesn't abort the rest; the final toast summarizes successes vs failures.
  const handleCashOutAll = useCallback(async () => {
    if (!connected) return;
    const list = useMarketStore.getState().positions.filter(p => p.market && isUpOnlyPosition(p));
    if (!list.length) return;
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < list.length; i++) {
      const pos = list[i];
      setTxStatus({ type: 'loading', message: `Cash out ${i + 1}/${list.length}: ${pos.asset}...` });
      try {
        await tradeCloseRfq({
          granterAddress: injAddress,
          marketId: pos.marketId,
          side: pos.side,
          quantity: pos.quantity,
          market: pos.market,
          oraclePrice: pos.markPrice
            || pos.currentPrice
            || latestCachedPrice(pos.marketId, pos.market?.price),
        });
        ok += 1;
      } catch (err) {
        fail += 1;
        console.error(`cash-out-all: ${pos.asset} failed`, err);
      }
    }
    setTxStatus({
      type: fail === 0 ? 'success' : 'error',
      message: fail === 0
        ? `Closed ${ok} position${ok === 1 ? '' : 's'}`
        : `Closed ${ok}, ${fail} failed`,
    });
    refreshBalances();
    useMarketStore.getState().fetchPositions(useWalletStore.getState().injAddress);
    clearTxStatusSoon();
  }, [connected, injAddress, refreshBalances, clearTxStatusSoon]);

  const handleRevokeAutosign = useCallback(async () => {
    if (!connected || !injAddress || session.revoking) return;

    setTxStatus({ type: 'loading', message: 'Revoking autosign...' });
    try {
      const result = await session.revoke(injAddress);
      setTxStatus({
        type: 'success',
        message: result.txHash
          ? 'Autosign revoked.'
          : 'Autosign cleared.',
        txHash: result.txHash || null,
      });
      clearTxStatusSoon();
    } catch (err) {
      setTxStatus({ type: 'error', message: err.message });
      clearTxStatusSoon();
    }
  }, [connected, injAddress, session, clearTxStatusSoon]);

  return (
    <>
      <TopBar
        onNavigate={setView}
        currentView={view}
        theme={theme}
        onSetTheme={setThemeTo}
        onAddFunds={() => setShowBridge(true)}
        onRevokeAutosign={handleRevokeAutosign}
        sessionActive={session.active}
        revokingAutosign={session.revoking}
        devMode={devMode}
      />

      {/* Transaction status toast */}
      {confetti && <Confetti />}
      <TransactionStatus status={txStatus} />

      <div className="up-page">
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === 'home' && (
            <>
              {connected && session.active && !session.rfqReady && (
                <div className="up-inline-auth">
                  <span>RFQ autosign needs a fresh authorization before orders can leave the lot.</span>
                  <button type="button" onClick={handleAuthorizeWallet} disabled={session.granting}>
                    {session.granting ? 'Authorizing...' : 'Authorize Wallet'}
                  </button>
                </div>
              )}
              <div className="up-market-grid">
                {sortedMarkets.map(market => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    balance={usdcBalance}
                    requestAddress={injAddress}
                    connected={connected}
                    connecting={connecting}
                    rfqReady={session.rfqReady}
                    authorizing={session.granting}
                    opened={Boolean(openedCards[market.marketId])}
                    opening={Boolean(openingCards[market.marketId])}
                    error={cardErrors[market.marketId]}
                    onConnect={connect}
                    onAuthorize={handleAuthorizeWallet}
                    onConfirm={handleCardConfirm}
                  />
                ))}
              </div>
              {markets.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  {connected ? 'No markets available' : 'Connect your wallet to see live markets'}
                </div>
              )}
            </>
          )}

          {view === 'bets' && (
            <>
              <div className="up-lot-head">
                <div>
                  <h1 className="up-lot-title">MY GARAGE</h1>
                  <p className="up-lot-copy">
                    Active UpOnly positions, cash-out lanes, and liquidation markers.
                  </p>
                </div>
              </div>
              {connected ? (
                <ActiveBets
                  bets={visiblePositions}
                  onCashOut={handleCashOut}
                  onCashOutAll={handleCashOutAll}
                  devMode={devMode}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                  Connect wallet to see your positions.
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {showBridge && <BridgeModal onClose={() => setShowBridge(false)} />}

      {showAuthModal && (
        <AuthZSetup
          onAuthorize={handleAuthorizeWallet}
          onClose={dismissAuthModal}
        />
      )}
    </>
  );
}
