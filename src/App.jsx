import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

const THEMES = ['bauhaus', 'bauhaus-dark'];
const readInitialTheme = () => {
  if (typeof document === 'undefined') return 'bauhaus';
  const attr = document.documentElement.dataset.theme;
  return THEMES.includes(attr) ? attr : 'bauhaus';
};
import TopBar from './components/TopBar';
import MarketCard from './components/MarketCard';
import PositionStrip from './components/PositionStrip';
import AuthZSetup from './components/AuthZSetup';
import BridgeModal from './components/BridgeModal';
import Confetti from './components/Confetti';
import TransactionStatus from './components/TransactionStatus';
import WalletSelector from './components/WalletSelector';
import TradeHistoryModal from './components/TradeHistoryModal';
import AppUpdateToast from './components/AppUpdateToast';
import {
  buildRfqCloseInput,
  primeRfqAccountCache,
  sendRfqPrequoteRequest,
  tradeCloseRfq,
  tradeOpenRfq,
} from './services/rfq';
import { RFQ_PREQUOTE_INTERVAL_MS } from './services/rfqConstants';
import { marketsMatchingSearch } from './services/marketSearch';
import { sortMarketsForUpOnly } from './services/marketSort';
import { selectLiveMarketIds } from './services/liveMarketPrices';
import { shouldOpenPairSearch } from './services/pairSearchShortcut';
import { closePositionsSequentially } from './services/closeAllPositions';
import { createTradeLock } from './services/tradeLock';
import { startAppVersionMonitor } from './services/appVersion';
import { getOpenTradeStatus, userFacingTradeError } from './services/tradeResult';
import { startWalletBalanceRefresh } from './services/walletRefresh';
import { createUpOnlyCid } from './services/tradeCid';
import {
  classifyTradeFailure,
  recordTradeHistoryEvent,
} from './services/tradeHistory';
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

function buildOptimisticOpenPosition(bet, executionInput = null) {
  const side = UP_ONLY_SIDE;
  const entryPrice = latestCachedPrice(bet.market.marketId, bet.market.price) || bet.market.price || 0;
  const quantity = executionInput?.quantity || (entryPrice > 0
    ? String((Number(bet.stake) * Number(bet.leverage)) / entryPrice)
    : '0');

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
    leverage: Number(bet.leverage) || null,
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
  const [txStatus, setTxStatus] = useState(null); // { type: 'loading'|'success'|'warning'|'error', message, txHash? }
  const [confetti, setConfetti] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState(null);
  const [walletConnectError, setWalletConnectError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDismissedFor, setAuthDismissedFor] = useState(null);
  const [openedCards, setOpenedCards] = useState({});
  const [openingCards, setOpeningCards] = useState({});
  const [tradeBusy, setTradeBusy] = useState(false);
  const [appUpdateAvailable, setAppUpdateAvailable] = useState(false);
  const tradeLockRef = useRef(null);
  const marketCardRefs = useRef(new Map());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(readInitialTheme);
  const [devMode, setDevMode] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('up-only-dev-mode') === '1';
  });

  if (!tradeLockRef.current) {
    tradeLockRef.current = createTradeLock();
  }

  useEffect(() => startAppVersionMonitor(() => setAppUpdateAvailable(true)), []);

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
  const {
    markets,
    positions,
    loading,
    startPolling,
    stopPolling,
    startMarketPriceStream,
    stopMarketPriceStream,
  } = useMarketStore();
  const session = useSessionStore();
  const visiblePositions = useMemo(() => positions.filter(isUpOnlyPosition), [positions]);
  const sortedMarkets = useMemo(() => sortMarketsForUpOnly(markets), [markets]);
  const liveMarketIds = useMemo(() => selectLiveMarketIds(markets), [markets]);
  const liveMarketIdsKey = liveMarketIds.join(',');
  const searchMatches = useMemo(() => (
    marketsMatchingSearch(sortedMarkets, searchQuery)
  ), [sortedMarkets, searchQuery]);

  const clearTxStatusSoon = useCallback(() => {
    setTimeout(() => setTxStatus(null), 5000);
  }, []);

  const openWalletSelector = useCallback(() => {
    setWalletConnectError('');
    setShowWalletSelector(true);
  }, []);

  const closeWalletSelector = useCallback(() => {
    if (connectingWalletId) return;
    setShowWalletSelector(false);
    setWalletConnectError('');
  }, [connectingWalletId]);

  const handleWalletSelect = useCallback(async (wallet) => {
    setConnectingWalletId(wallet.id);
    setWalletConnectError('');
    try {
      await connect(wallet);
      setShowWalletSelector(false);
    } catch (err) {
      setWalletConnectError(err.message || 'Wallet connection failed.');
    } finally {
      setConnectingWalletId(null);
    }
  }, [connect]);

  const beginTrade = useCallback(() => {
    if (!tradeLockRef.current.tryAcquire()) return false;
    setTradeBusy(true);
    return true;
  }, []);

  const endTrade = useCallback(() => {
    tradeLockRef.current.release();
    setTradeBusy(false);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const selectSearchResult = useCallback((market) => {
    const marketId = market?.marketId ?? market?.id;
    closeSearch();
    window.requestAnimationFrame(() => {
      marketCardRefs.current
        .get(marketId)
        ?.querySelector('input[inputmode="decimal"]')
        ?.focus();
    });
  }, [closeSearch]);

  const setMarketCardRef = useCallback((marketId, node) => {
    if (marketId == null) return;
    if (node) {
      marketCardRefs.current.set(marketId, node);
    } else {
      marketCardRefs.current.delete(marketId);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!shouldOpenPairSearch(event)) return;
      event.preventDefault();
      openSearch();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

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
        setTxStatus({ type: 'success', message: 'Wallet authorized' });
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3500);
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

    if (authDismissedFor === injAddress) return;
    setShowAuthModal(true);
  }, [connected, injAddress, needsAuthorization, authDismissedFor]);

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
    if (!connected || !injAddress || !session.rfqReady || !visiblePositions.length) return;

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
  }, [connected, injAddress, session.rfqReady, visiblePositions]);

  // Start polling when wallet connects
  useEffect(() => {
    if (connected && injAddress) {
      startPolling(injAddress);
      return () => stopPolling();
    }
  }, [connected, injAddress, startPolling, stopPolling]);

  useEffect(() => {
    if (!connected || !injAddress) return undefined;
    return startWalletBalanceRefresh({ refreshBalances });
  }, [connected, injAddress, refreshBalances]);

  useEffect(() => {
    if (!liveMarketIdsKey) return undefined;
    startMarketPriceStream(liveMarketIds);
    return () => stopMarketPriceStream();
  }, [liveMarketIdsKey, startMarketPriceStream, stopMarketPriceStream]);

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

  const submitBet = useCallback(async (bet) => {
    if (!bet?.market || !connected) return;
    if (!beginTrade()) return;

    const needsTakeProfitSignature = bet.targetPrice && Number(bet.targetPrice) > 0;
    const marketId = bet.market.marketId;
    const cid = createUpOnlyCid();
    const tradeCreatedAt = Date.now();
    const recordOpen = (updates) => recordTradeHistoryEvent({
      cid,
      wallet: injAddress,
      marketId,
      symbol: bet.market.symbol,
      action: 'open',
      direction: 'long',
      stake: String(bet.stake),
      leverage: String(bet.leverage),
      createdAt: tradeCreatedAt,
      updatedAt: Date.now(),
      ...updates,
    });
    let tradeReleased = false;
    const releaseTrade = () => {
      if (tradeReleased) return;
      tradeReleased = true;
      endTrade();
    };

    setOpeningCards(state => ({ ...state, [marketId]: true }));
    setTxStatus({
      type: 'loading',
      message: `UpOnly order submitted for ${bet.market.symbol}`,
    });
    recordOpen({ status: 'submitted' });

    let openConfirmed = false;
    let openMatched = false;
    let optimisticPositionId = null;

    const showOptimisticOpen = (executionInput = null) => {
      if (openMatched) return;
      openMatched = true;
      const optimisticPosition = buildOptimisticOpenPosition(bet, executionInput);
      optimisticPositionId = optimisticPosition.id;
      useMarketStore.getState().addOptimisticPosition(optimisticPosition);
      setTxStatus(null);
      markCardOpened(marketId);
    };

    const settleOpenConfirmed = (result) => {
      if (openConfirmed) return;
      openConfirmed = true;
      if (!openMatched) showOptimisticOpen(result?.input);
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
      releaseTrade();
      refreshBalances();
      useMarketStore.getState().fetchPositions(useWalletStore.getState().injAddress);
    };

    try {
      const result = await tradeOpenRfq({
        cid,
        granterAddress: injAddress,
        marketId: bet.market.marketId,
        side: UP_ONLY_SIDE,
        stakeUsdt: bet.stake,
        leverage: bet.leverage,
        tpPrice: bet.targetPrice,
        market: bet.market,
        onProgress: ({ phase, prepared, result: progressResult, input: progressInput }) => {
          if (phase === 'matched') {
            recordOpen({
              status: 'quoted',
              quantity: progressInput?.quantity,
              worstPrice: progressInput?.worstPrice,
              quotePrice: prepared?.quotes?.[0]?.price,
              rfqId: prepared?.rfqId,
            });
            showOptimisticOpen(progressInput);
          }
          if (phase === 'confirmed') {
            recordOpen({
              status: 'confirmed',
              quantity: progressInput?.quantity,
              worstPrice: progressInput?.worstPrice,
              quotePrice: prepared?.quotes?.[0]?.price,
              rfqId: prepared?.rfqId,
              txHash: progressResult?.txHash,
              confirmedAt: Date.now(),
            });
            settleOpenConfirmed(progressResult);
          }
        },
      });

      const status = getOpenTradeStatus(result);
      recordOpen({
        status: 'confirmed',
        quantity: result?.input?.quantity,
        worstPrice: result?.input?.worstPrice,
        quotePrice: result?.prepared?.quotes?.[0]?.price,
        rfqId: result?.prepared?.rfqId,
        txHash: result?.txHash,
        confirmedAt: Date.now(),
      });
      if (!openConfirmed) settleOpenConfirmed(result);
      setTxStatus(status);

      clearTxStatusSoon();
    } catch (err) {
      const message = userFacingTradeError(err.message);
      recordOpen({ status: 'failed', ...classifyTradeFailure(err.message) });
      if (optimisticPositionId) {
        useMarketStore.getState().removeOptimisticPosition(optimisticPositionId);
      }
      setOpeningCards(state => {
        const next = { ...state };
        delete next[marketId];
        return next;
      });
      setTxStatus({ type: 'error', message });
      releaseTrade();
      clearTxStatusSoon();
    }
  }, [connected, injAddress, refreshBalances, clearTxStatusSoon, markCardOpened, beginTrade, endTrade]);

  const handleCardConfirm = useCallback((bet) => {
    return submitBet(bet);
  }, [submitBet]);

  const handleCashOut = useCallback(async (position) => {
    if (!connected || !position.market) return;
    if (!beginTrade()) return;

    const cid = createUpOnlyCid();
    const tradeCreatedAt = Date.now();
    const recordClose = (updates) => recordTradeHistoryEvent({
      cid,
      wallet: injAddress,
      marketId: position.marketId,
      symbol: position.asset || position.symbol,
      action: 'close',
      direction: position.side === 'long' ? 'short' : 'long',
      stake: String(position.margin ?? position.stake ?? ''),
      leverage: position.leverage ? String(position.leverage) : null,
      quantity: String(position.quantity),
      createdAt: tradeCreatedAt,
      updatedAt: Date.now(),
      ...updates,
    });

    setTxStatus({ type: 'loading', message: 'Submitting cash-out order' });
    recordClose({ status: 'submitted' });

    let closeConfirmed = false;
    let closeMatched = false;
    const optimisticCloseId = position.id;
    let tradeReleased = false;
    const releaseTrade = () => {
      if (tradeReleased) return;
      tradeReleased = true;
      endTrade();
    };

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
      releaseTrade();
      refreshBalances();
      useMarketStore.getState().fetchPositions(useWalletStore.getState().injAddress);
    };

    try {
      const result = await tradeCloseRfq({
        cid,
        granterAddress: injAddress,
        marketId: position.marketId,
        side: position.side,
        quantity: position.quantity,
        market: position.market,
        oraclePrice: position.markPrice
          || position.currentPrice
          || latestCachedPrice(position.marketId, position.market?.price),
        onProgress: ({ phase, prepared, result: progressResult, input: progressInput }) => {
          if (phase === 'matched') {
            recordClose({
              status: 'quoted',
              worstPrice: progressInput?.worstPrice,
              quotePrice: prepared?.quotes?.[0]?.price,
              rfqId: prepared?.rfqId,
            });
            showOptimisticClose();
          }
          if (phase === 'confirmed') {
            recordClose({
              status: 'confirmed',
              worstPrice: progressInput?.worstPrice,
              quotePrice: prepared?.quotes?.[0]?.price,
              rfqId: prepared?.rfqId,
              txHash: progressResult?.txHash,
              confirmedAt: Date.now(),
            });
            settleCloseConfirmed(progressResult);
          }
        },
      });

      if (!closeConfirmed) settleCloseConfirmed(result);
      recordClose({
        status: 'confirmed',
        worstPrice: result?.input?.worstPrice,
        quotePrice: result?.prepared?.quotes?.[0]?.price,
        rfqId: result?.prepared?.rfqId,
        txHash: result?.txHash,
        confirmedAt: Date.now(),
      });

      clearTxStatusSoon();
    } catch (err) {
      const message = userFacingTradeError(err.message);
      recordClose({ status: 'failed', ...classifyTradeFailure(err.message) });
      if (closeMatched) {
        useMarketStore.getState().removeOptimisticClosedPosition(optimisticCloseId, position);
      }
      setTxStatus({ type: 'error', message });
      releaseTrade();
      clearTxStatusSoon();
    }
  }, [connected, injAddress, refreshBalances, clearTxStatusSoon, beginTrade, endTrade]);

  // Sequential close - avoids nonce races on the same wallet. One failure
  // doesn't abort the rest; the final toast summarizes successes vs failures.
  const handleCashOutAll = useCallback(async () => {
    if (!connected) return;
    const list = useMarketStore.getState().positions.filter(p => p.market && isUpOnlyPosition(p));
    if (!list.length) return;
    if (!beginTrade()) return;
    try {
      const { closed, failed } = await closePositionsSequentially({
        positions: list,
        onProgress: ({ index, total, position }) => {
          setTxStatus({
            type: 'loading',
            message: `Closing ${index + 1} of ${total}: ${position.asset}`,
          });
        },
        closePosition: async pos => {
          const cid = createUpOnlyCid();
          const createdAt = Date.now();
          const record = updates => recordTradeHistoryEvent({
            cid,
            wallet: injAddress,
            marketId: pos.marketId,
            symbol: pos.asset || pos.symbol,
            action: 'close',
            direction: pos.side === 'long' ? 'short' : 'long',
            stake: String(pos.margin ?? pos.stake ?? ''),
            leverage: pos.leverage ? String(pos.leverage) : null,
            quantity: String(pos.quantity),
            createdAt,
            updatedAt: Date.now(),
            ...updates,
          });
          record({ status: 'submitted' });
          try {
            const result = await tradeCloseRfq({
              cid,
              granterAddress: injAddress,
              marketId: pos.marketId,
              side: pos.side,
              quantity: pos.quantity,
              market: pos.market,
              oraclePrice: pos.markPrice
                || pos.currentPrice
                || latestCachedPrice(pos.marketId, pos.market?.price),
              onProgress: ({ phase, prepared, result: progressResult, input }) => {
                if (phase === 'matched') record({
                  status: 'quoted',
                  worstPrice: input?.worstPrice,
                  quotePrice: prepared?.quotes?.[0]?.price,
                  rfqId: prepared?.rfqId,
                });
                if (phase === 'confirmed') record({
                  status: 'confirmed',
                  worstPrice: input?.worstPrice,
                  quotePrice: prepared?.quotes?.[0]?.price,
                  rfqId: prepared?.rfqId,
                  txHash: progressResult?.txHash,
                  confirmedAt: Date.now(),
                });
              },
            });
            record({
              status: 'confirmed',
              worstPrice: result?.input?.worstPrice,
              quotePrice: result?.prepared?.quotes?.[0]?.price,
              rfqId: result?.prepared?.rfqId,
              txHash: result?.txHash,
              confirmedAt: Date.now(),
            });
            return result;
          } catch (error) {
            record({ status: 'failed', ...classifyTradeFailure(error.message) });
            throw error;
          }
        },
        onClosed: ({ position }) => {
          useMarketStore.getState().addOptimisticClosedPosition(position);
        },
        onError: ({ position, error }) => {
          console.error(`cash-out-all: ${position.asset} failed`, error);
        },
      });
      setTxStatus({
        type: failed === 0 ? 'success' : 'error',
        message: failed === 0
          ? `Closed ${closed} position${closed === 1 ? '' : 's'}`
          : `Closed ${closed}, ${failed} failed`,
      });
      endTrade();
      refreshBalances();
      useMarketStore.getState().fetchPositions(useWalletStore.getState().injAddress);
      clearTxStatusSoon();
    } finally {
      if (tradeLockRef.current.isLocked()) endTrade();
    }
  }, [connected, injAddress, refreshBalances, clearTxStatusSoon, beginTrade, endTrade]);

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
        theme={theme}
        onSetTheme={setThemeTo}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchMatches={searchMatches}
        onOpenSearch={openSearch}
        onCloseSearch={closeSearch}
        onSearchQueryChange={setSearchQuery}
        onSelectSearchResult={selectSearchResult}
        onConnect={openWalletSelector}
        onAddFunds={() => setShowBridge(true)}
        onOpenTradeHistory={() => setShowTradeHistory(true)}
        onRevokeAutosign={handleRevokeAutosign}
        sessionActive={session.active}
        revokingAutosign={session.revoking}
        devMode={devMode}
      />

      {searchOpen && (
        <button
          type="button"
          className="up-search-scrim"
          onClick={closeSearch}
          aria-label="Close pair search"
        />
      )}

      {/* Transaction status toast */}
      {confetti && <Confetti />}
      <TransactionStatus status={txStatus} />
      {appUpdateAvailable && !tradeBusy && !txStatus && <AppUpdateToast />}

      <div className="up-page">
        <main style={{ flex: 1, minWidth: 0 }}>
          {connected && session.active && !session.rfqReady && (
            <div className="up-inline-auth">
              <span>RFQ autosign needs a fresh authorization before orders can leave the lot.</span>
              <button type="button" onClick={handleAuthorizeWallet} disabled={session.granting}>
                {session.granting ? 'Authorizing...' : 'Authorize Wallet'}
              </button>
            </div>
          )}

          <PositionStrip
            positions={visiblePositions}
            onCashOut={handleCashOut}
            onCashOutAll={handleCashOutAll}
            tradeBusy={tradeBusy}
          />

          <div className="up-market-grid">
            {sortedMarkets.map(market => {
              const marketRefId = market.marketId ?? market.id;
              return (
                <MarketCard
                  key={market.id}
                  cardRef={node => setMarketCardRef(marketRefId, node)}
                  market={market}
                  balance={usdcBalance}
                  requestAddress={injAddress}
                  connected={connected}
                  connecting={connecting}
                  rfqReady={session.rfqReady}
                  authorizing={session.granting}
                  opened={Boolean(openedCards[market.marketId])}
                  opening={Boolean(openingCards[market.marketId])}
                  tradeBusy={tradeBusy}
                  onConnect={openWalletSelector}
                  onAuthorize={handleAuthorizeWallet}
                  onConfirm={handleCardConfirm}
                />
              );
            })}
          </div>
          {markets.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              {connected ? 'No markets available' : 'Connect your wallet to see live markets'}
            </div>
          )}
        </main>
      </div>

      {showBridge && <BridgeModal onClose={() => setShowBridge(false)} />}

      {showTradeHistory && connected && (
        <TradeHistoryModal
          ethAddress={ethAddress}
          injAddress={injAddress}
          markets={markets}
          onClose={() => setShowTradeHistory(false)}
        />
      )}

      {showWalletSelector && (
        <WalletSelector
          connectingId={connectingWalletId}
          error={walletConnectError}
          onSelect={handleWalletSelect}
          onClose={closeWalletSelector}
        />
      )}

      {showAuthModal && (
        <AuthZSetup
          onAuthorize={handleAuthorizeWallet}
          onClose={dismissAuthModal}
        />
      )}
    </>
  );
}
