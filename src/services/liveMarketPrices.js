import { IndexerGrpcOracleStream } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { applyPositionMarkPrices } from './livePositionPrices.js';
import { sortMarketsForUpOnly } from './marketSort.js';

const INDEXER_ENDPOINT = getNetworkEndpoints(Network.MainnetSentry).indexer;
export const LIVE_MARKET_STREAM_LIMIT = 40;
export const LIVE_PRICE_BATCH_MS = 250;

export function selectLiveMarketIds(markets) {
  return sortMarketsForUpOnly(markets || [])
    .map(market => market.marketId)
    .filter(Boolean)
    .slice(0, LIVE_MARKET_STREAM_LIMIT);
}

export function applyLiveMarketPrices(state, updates) {
  const pricesByMarketId = new Map();
  for (const update of updates || []) {
    const price = Number(update?.price);
    const marketId = String(update?.marketId || '').toLowerCase();
    if (!marketId || !Number.isFinite(price) || price <= 0) continue;
    pricesByMarketId.set(marketId, price);
  }
  if (pricesByMarketId.size === 0) return state;

  const appliedPrices = {};
  const matchedMarketIds = new Set();
  const markets = state.markets.map(market => {
    const normalizedMarketId = String(market.marketId || '').toLowerCase();
    const price = pricesByMarketId.get(normalizedMarketId);
    if (price == null) return market;

    matchedMarketIds.add(normalizedMarketId);
    appliedPrices[market.marketId] = price;
    return Number(market.price) === price ? market : { ...market, price };
  });

  for (const [marketId, price] of pricesByMarketId) {
    if (!matchedMarketIds.has(marketId)) appliedPrices[marketId] = price;
  }

  return {
    markets,
    prices: {
      ...state.prices,
      ...appliedPrices,
    },
    livePrices: {
      ...state.livePrices,
      ...appliedPrices,
    },
    positions: applyPositionMarkPrices(state.positions, appliedPrices),
  };
}

export function applyLiveMarketPrice(state, update) {
  return applyLiveMarketPrices(state, [update]);
}

export function createLivePriceBatcher({
  onBatch,
  intervalMs = LIVE_PRICE_BATCH_MS,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  const pending = new Map();
  let timer = null;
  let stopped = false;

  const flush = () => {
    timer = null;
    if (stopped || pending.size === 0) return;
    const batch = [...pending.values()];
    pending.clear();
    onBatch(batch);
  };

  const push = update => {
    if (stopped) return;
    const marketId = String(update?.marketId || '').toLowerCase();
    if (!marketId) return;
    pending.set(marketId, update);
    if (timer == null) timer = schedule(flush, intervalMs);
  };

  const stop = () => {
    stopped = true;
    pending.clear();
    if (timer != null) cancel(timer);
    timer = null;
  };

  return { push, stop };
}

export function subscribeLiveMarketPrices({ marketIds, onPrice, onEnd, onStatus }) {
  const uniqueMarketIds = [...new Set((marketIds || []).filter(Boolean))]
    .slice(0, LIVE_MARKET_STREAM_LIMIT);
  if (uniqueMarketIds.length === 0) return () => {};

  const stream = new IndexerGrpcOracleStream(INDEXER_ENDPOINT);
  const subscription = stream.streamOraclePricesByMarkets({
    marketIds: uniqueMarketIds,
    callback: onPrice,
    onEndCallback: onEnd,
    onStatusCallback: onStatus,
  });
  let stopped = false;

  return () => {
    if (stopped) return;
    stopped = true;
    subscription.unsubscribe();
  };
}
