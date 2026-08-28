// USDCAD is active on-chain but had no RFQ quotes and an empty orderbook on
// 2026-08-29. Keep it out of the trading grid until liquidity is restored.
export const USDCAD_MARKET_ID = '0x13dfffb735a6fe702d022ae53920aad4a8dfcf1886596394e9a1a312dc45683c';

const UNAVAILABLE_MARKET_IDS = new Set([
  USDCAD_MARKET_ID,
]);

export function filterRfqTradeableMarkets(markets) {
  return markets.filter((market) => (
    !UNAVAILABLE_MARKET_IDS.has(String(market?.marketId || '').toLowerCase())
  ));
}
