function marketChange(market) {
  const change = Number(market?.change24h ?? 0);
  return Number.isFinite(change) ? change : 0;
}

export const MARKET_SORT_GAINERS = 'gainers';
export const MARKET_SORT_LOSERS = 'losers';

export function normalizeMarketSortMode(mode) {
  return mode === MARKET_SORT_LOSERS ? MARKET_SORT_LOSERS : MARKET_SORT_GAINERS;
}

export function sortMarketsForUpOnly(markets, mode = MARKET_SORT_GAINERS) {
  const direction = normalizeMarketSortMode(mode) === MARKET_SORT_LOSERS ? 1 : -1;
  return [...markets].sort((a, b) => direction * (marketChange(a) - marketChange(b)));
}
