import { IndexerGrpcOracleStream } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { applyPositionMarkPrices } from './livePositionPrices.js';

const INDEXER_ENDPOINT = getNetworkEndpoints(Network.MainnetSentry).indexer;

export function applyLiveMarketPrice(state, { marketId, price }) {
  const normalizedPrice = Number(price);
  const normalizedMarketId = String(marketId || '').toLowerCase();
  if (!normalizedMarketId || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0) return {};

  const canonicalMarketId = state.markets.find(
    market => String(market.marketId || '').toLowerCase() === normalizedMarketId,
  )?.marketId || marketId;

  return {
    markets: state.markets.map(market => (
      String(market.marketId || '').toLowerCase() === normalizedMarketId
        ? { ...market, price: normalizedPrice }
        : market
    )),
    prices: {
      ...state.prices,
      [canonicalMarketId]: normalizedPrice,
    },
    livePrices: {
      ...state.livePrices,
      [canonicalMarketId]: normalizedPrice,
    },
    positions: applyPositionMarkPrices(state.positions, {
      [canonicalMarketId]: normalizedPrice,
    }),
  };
}

export function subscribeLiveMarketPrices({ marketIds, onPrice, onEnd, onStatus }) {
  const uniqueMarketIds = [...new Set((marketIds || []).filter(Boolean))];
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
