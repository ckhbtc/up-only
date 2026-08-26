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

export function moveSearchCursor(currentIndex, direction, itemCount) {
  if (!itemCount || itemCount < 1) return 0;
  const current = Math.min(Math.max(0, Number(currentIndex) || 0), itemCount - 1);
  const step = direction < 0 ? -1 : 1;
  return (current + step + itemCount) % itemCount;
}
