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

export function marketsMatchingSearch(markets, query) {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  return markets.filter(market => marketMatchesSearch(market, needle));
}
