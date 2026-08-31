import { create } from 'zustand';
import {
  listMarkets,
  fetchAllPrices,
  fetchPositions,
  fetchPositionMarkPrices,
  fetchMarketsSummary,
  fetchVerifiedDerivativeMarkets,
} from '../services/injective';
import {
  LIVE_POSITION_POLL_MS,
  applyPositionMarkPrices,
  positionPollingActions,
} from '../services/livePositionPrices';
import {
  applyLiveMarketPrice,
  subscribeLiveMarketPrices,
} from '../services/liveMarketPrices';
import {
  applyOptimisticCloses,
  mergeFetchedAndOptimisticPositions,
  pruneOptimisticCloses,
  withOptimisticCloseExpiry,
  withOptimisticExpiry,
} from './optimisticPositions';

// Priority display order. All other TrueCurrent-verified markets are appended
// in BFF order, so new verified pairs are picked up without a deploy.
const PRIORITY_SYMBOLS = [
  'BTC', 'ETH', 'INJ', 'SOL', 'XRP', 'BNB',
  'TSLA', 'META', 'AAVE', 'COIN', 'AMZN', 'MSTR',
  'NVDA', 'AAPL', 'GOOGL', 'WIF', 'CRCL', 'HOOD',
];

function withBffMetadata(chainMarket, bffMarket) {
  return {
    ...chainMarket,
    symbol: bffMarket.symbol || chainMarket.symbol,
    ticker: bffMarket.ticker || chainMarket.ticker,
    tokenName: bffMarket.name || '',
    logo: bffMarket.logo || '',
    slug: bffMarket.slug || '',
    provider: bffMarket.provider || '',
    oracleStatusId: bffMarket.oracleStatusId || '',
    priceDecimals: bffMarket.priceDecimals ?? chainMarket.priceDecimals ?? null,
  };
}

function orderMarkets(markets) {
  const priority = new Map(PRIORITY_SYMBOLS.map((symbol, index) => [symbol, index]));

  return markets
    .map((market, index) => ({
      market,
      index,
      priorityIndex: priority.has(market.symbol.toUpperCase())
        ? priority.get(market.symbol.toUpperCase())
        : null,
    }))
    .sort((a, b) => {
      const aPriority = a.priorityIndex != null;
      const bPriority = b.priorityIndex != null;
      if (aPriority && bPriority) return a.priorityIndex - b.priorityIndex;
      if (aPriority) return -1;
      if (bPriority) return 1;
      return a.index - b.index;
    })
    .map(item => item.market);
}

function selectVerifiedMarkets(allMarkets, verifiedMarkets) {
  const chainById = new Map(allMarkets.map(m => [m.marketId.toLowerCase(), m]));

  return orderMarkets(
    verifiedMarkets
      .map(bffMarket => {
        const chainMarket = chainById.get(bffMarket.marketId.toLowerCase());
        return chainMarket ? withBffMetadata(chainMarket, bffMarket) : null;
      })
      .filter(Boolean)
  );
}

function selectFallbackMarkets(allMarkets) {
  const usdcPerps = allMarkets.filter(m => m.ticker.toUpperCase().includes('USDC'));
  return PRIORITY_SYMBOLS
    .map(sym => usdcPerps.find(m => m.symbol.toUpperCase() === sym))
    .filter(Boolean);
}

function enrichPositionsWithMarketMetadata(positions, markets) {
  if (!positions.length || !markets.length) return positions;

  const marketsById = new Map(markets.map(m => [m.marketId.toLowerCase(), m]));

  return positions.map(position => {
    const market = marketsById.get(position.marketId.toLowerCase());
    if (!market) return position;

    const symbol = market.symbol || position.symbol || position.asset;

    return {
      ...position,
      symbol,
      asset: symbol,
      ticker: market.ticker || position.ticker,
      logo: market.logo || position.logo || '',
      tokenName: market.tokenName || position.tokenName || '',
      slug: market.slug || position.slug || '',
      market: {
        ...position.market,
        ...market,
      },
    };
  });
}

function hasSummaryPrice(summary) {
  return Number.isFinite(summary?.price) && summary.price > 0;
}

async function fetchDisplayPrices(markets) {
  const summaries = await fetchMarketsSummary();
  const missingPriceMarkets = markets.filter(m => !hasSummaryPrice(summaries[m.marketId]));
  const oraclePrices = missingPriceMarkets.length > 0
    ? await fetchAllPrices(missingPriceMarkets)
    : {};

  const prices = {};
  for (const market of markets) {
    const summary = summaries[market.marketId];
    prices[market.marketId] = hasSummaryPrice(summary)
      ? summary.price
      : (oraclePrices[market.marketId] || 0);
  }

  return { prices, summaries };
}

const useMarketStore = create((set, get) => ({
  markets: [],
  prices: {},
  livePrices: {},
  positions: [],
  optimisticClosedPositions: {},
  loading: false,
  error: null,
  pollInterval: null,
  markPriceSubscription: null,

  fetchMarkets: async () => {
    set({ loading: true });
    try {
      const [allMarkets, verifiedMarketsResult] = await Promise.allSettled([
        listMarkets(),
        fetchVerifiedDerivativeMarkets(),
      ]);

      if (allMarkets.status === 'rejected') throw allMarkets.reason;

      let markets = [];
      if (verifiedMarketsResult.status === 'fulfilled') {
        markets = selectVerifiedMarkets(allMarkets.value, verifiedMarketsResult.value);
      } else {
        console.warn('Failed to fetch TrueCurrent verified markets:', verifiedMarketsResult.reason);
      }

      if (markets.length === 0) {
        markets = selectFallbackMarkets(allMarkets.value);
      }

      const { prices, summaries } = await fetchDisplayPrices(markets);

      const uiMarkets = markets.map(m => {
        const summary = summaries[m.marketId];
        return {
          ...m,
          id: m.marketId,
          name: m.ticker,
          price: prices[m.marketId] || 0,
          change24h: summary?.change24hPct || 0,
          sparkline: [], // No sparkline data from market summary
        };
      });

      set(state => {
        const nextMarkets = uiMarkets.map(market => (
          state.livePrices[market.marketId]
            ? { ...market, price: state.livePrices[market.marketId] }
            : market
        ));
        return {
          markets: nextMarkets,
          prices: { ...prices, ...state.livePrices },
          positions: enrichPositionsWithMarketMetadata(state.positions, nextMarkets),
          loading: false,
          error: null,
        };
      });
    } catch (err) {
      set({ loading: false, error: err.message });
      console.error('Failed to fetch markets:', err);
    }
  },

  fetchPositions: async (injAddress) => {
    if (!injAddress) return;
    try {
      const positions = await fetchPositions(injAddress);
      const enrichedPositions = enrichPositionsWithMarketMetadata(positions, get().markets);
      set(state => ({
        optimisticClosedPositions: pruneOptimisticCloses(state.optimisticClosedPositions),
        positions: mergeFetchedAndOptimisticPositions(
          applyOptimisticCloses(enrichedPositions, state.optimisticClosedPositions),
          state.positions
        ),
      }));
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  },

  addOptimisticPosition: (position) => {
    const optimisticPosition = withOptimisticExpiry(position);
    set(state => ({
      optimisticClosedPositions: Object.fromEntries(
        Object.entries(state.optimisticClosedPositions).filter(([id]) => id !== optimisticPosition.id)
      ),
      positions: [
        optimisticPosition,
        ...state.positions.filter(existing => existing.id !== optimisticPosition.id),
      ],
    }));
  },

  updateOptimisticPosition: (id, patch) => {
    set(state => ({
      positions: state.positions.map(position =>
        position.id === id
          ? { ...position, ...patch }
          : position
      ),
    }));
  },

  removeOptimisticPosition: (id) => {
    set(state => ({
      positions: state.positions.filter(position => !(position.id === id && position.optimistic)),
    }));
  },

  addOptimisticClosedPosition: (position) => {
    if (!position?.id) return;
    set(state => ({
      optimisticClosedPositions: {
        ...state.optimisticClosedPositions,
        [position.id]: withOptimisticCloseExpiry(position),
      },
      positions: state.positions.filter(existing => existing.id !== position.id),
    }));
  },

  removeOptimisticClosedPosition: (id, restorePosition = null) => {
    set(state => {
      const nextClosed = Object.fromEntries(
        Object.entries(state.optimisticClosedPositions).filter(([closedId]) => closedId !== id)
      );
      const shouldRestore = restorePosition
        && !state.positions.some(position => position.id === restorePosition.id);

      return {
        optimisticClosedPositions: nextClosed,
        positions: shouldRestore ? [restorePosition, ...state.positions] : state.positions,
      };
    });
  },

  updatePrices: async () => {
    const { markets } = get();
    if (markets.length === 0) return;
    try {
      const { prices, summaries } = await fetchDisplayPrices(markets);
      set(state => ({
        prices: { ...prices, ...state.livePrices },
        markets: state.markets.map(m => {
          const summary = summaries[m.marketId];
          return {
            ...m,
            price: state.livePrices[m.marketId] || prices[m.marketId] || m.price,
            change24h: summary?.change24hPct ?? m.change24h,
          };
        }),
      }));
    } catch (err) {
      console.error('Price update failed:', err);
    }
  },

  updatePositionMarks: async (injAddress) => {
    if (!injAddress || get().positions.length === 0) return;
    try {
      const markPrices = await fetchPositionMarkPrices(injAddress);
      set(state => ({
        positions: applyPositionMarkPrices(state.positions, markPrices),
      }));
    } catch (err) {
      console.error('Position mark price update failed:', err);
    }
  },

  startPolling: (injAddress) => {
    const { pollInterval } = get();
    if (pollInterval) return; // Already polling

    // Initial fetch
    get().fetchMarkets();
    if (injAddress) get().fetchPositions(injAddress);

    let tick = 0;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      tick += 1;
      const actions = positionPollingActions(tick);
      if (actions.refreshMarkets) get().updatePrices();
      if (!injAddress) return;
      if (actions.refreshPositions) get().fetchPositions(injAddress);
      else if (actions.refreshMarks) get().updatePositionMarks(injAddress);
    }, LIVE_POSITION_POLL_MS);

    set({ pollInterval: interval });
  },

  stopPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
      set({ pollInterval: null });
    }
  },

  startMarketPriceStream: (marketIds = []) => {
    if (marketIds.length === 0) return;

    get().markPriceSubscription?.();
    let stopped = false;
    const unsubscribe = subscribeLiveMarketPrices({
      marketIds,
      onPrice: update => set(state => applyLiveMarketPrice(state, update)),
      onEnd: () => {
        if (!stopped) set({ markPriceSubscription: null, livePrices: {} });
      },
      onStatus: status => {
        if (status?.code) console.warn('Market mark price stream status:', status);
      },
    });
    const stop = () => {
      if (stopped) return;
      stopped = true;
      unsubscribe();
    };
    set({ markPriceSubscription: stop });
  },

  stopMarketPriceStream: () => {
    get().markPriceSubscription?.();
    set({ markPriceSubscription: null });
  },
}));

// Auto-fetch markets on store creation (no wallet needed for browsing)
useMarketStore.getState().fetchMarkets();

export default useMarketStore;
