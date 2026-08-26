import Decimal from 'decimal.js';

export const LIVE_POSITION_POLL_MS = 5_000;
const MARKET_REFRESH_TICKS = 2;
const FULL_POSITION_REFRESH_TICKS = 6;

export function positionPollingActions(tick) {
  const refreshPositions = tick % FULL_POSITION_REFRESH_TICKS === 0;

  return {
    refreshMarks: !refreshPositions,
    refreshMarkets: tick % MARKET_REFRESH_TICKS === 0,
    refreshPositions,
  };
}

export function applyPositionMarkPrices(positions, markPrices) {
  const normalizedPrices = new Map(
    Object.entries(markPrices || {}).map(([marketId, price]) => [marketId.toLowerCase(), price]),
  );

  return positions.map(position => {
    const nextMarkPrice = new Decimal(
      normalizedPrices.get(String(position.marketId || '').toLowerCase()) || 0,
    );
    if (!nextMarkPrice.isFinite() || nextMarkPrice.lte(0)) return position;

    const entryPrice = new Decimal(position.entryPrice || 0);
    const quantity = new Decimal(position.quantity || 0);
    const margin = new Decimal(position.margin ?? position.stake ?? 0);
    const direction = String(position.side || position.direction || '').toLowerCase() === 'short'
      ? -1
      : 1;
    const pnl = nextMarkPrice.minus(entryPrice).mul(quantity).mul(direction);
    const pnlPct = margin.gt(0) ? pnl.div(margin).mul(100) : new Decimal(0);

    return {
      ...position,
      markPrice: nextMarkPrice.toNumber(),
      currentPrice: nextMarkPrice.toNumber(),
      pnl: pnl.isZero() ? 0 : pnl.toNumber(),
      pnlPct: pnlPct.isZero() ? 0 : pnlPct.toNumber(),
    };
  });
}
