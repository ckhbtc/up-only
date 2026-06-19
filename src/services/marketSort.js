function marketChange(market) {
  const change = Number(market?.change24h ?? 0);
  return Number.isFinite(change) ? change : 0;
}

export function sortMarketsForUpOnly(markets) {
  return [...markets].sort((a, b) => marketChange(b) - marketChange(a));
}
