function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

export function marketMatchesSearch(market, query) {
  const needle = normalizeSearch(query);
  if (!needle) return true;

  return [
    market?.symbol,
    market?.ticker,
    market?.name,
    market?.tokenName,
    market?.slug,
  ].some(value => normalizeSearch(value).includes(needle));
}

export function filterMarketsBySearch(markets, query) {
  const needle = normalizeSearch(query);
  if (!needle) return markets;
  return markets.filter(market => marketMatchesSearch(market, needle));
}
