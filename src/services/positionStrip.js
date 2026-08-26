import { STANDARD_MAX_LEVERAGE_STEPS } from './leverageLimits.js';

const numberOrZero = value => Number(value) || 0;

export function getPositionDisplay(position, now = Date.now()) {
  const inOpenPnlGrace = Number(position?.pnlGraceExpiresAt || 0) > now;
  return {
    inOpenPnlGrace,
    pnl: inOpenPnlGrace ? 0 : numberOrZero(position?.pnl),
    pnlPct: inOpenPnlGrace ? 0 : numberOrZero(position?.pnlPct),
  };
}

export function getPositionMargin(position) {
  return numberOrZero(position?.margin ?? position?.stake);
}

export function getPositionLeverage(position) {
  const recorded = Number(position?.leverage);
  if (Number.isFinite(recorded) && recorded > 0) return recorded;

  const entryPrice = Math.abs(Number(position?.entryPrice));
  const quantity = Math.abs(Number(position?.quantity));
  const margin = getPositionMargin(position);
  if (!entryPrice || !quantity || !margin) return null;

  const leverage = (entryPrice * quantity) / margin;
  return Number.isFinite(leverage) && leverage > 0 ? leverage : null;
}

export function getPositionLeverageLabel(position) {
  const leverage = getPositionLeverage(position);
  if (!leverage) return null;

  const nearestPreset = STANDARD_MAX_LEVERAGE_STEPS.reduce((nearest, preset) => (
    Math.abs(preset - leverage) < Math.abs(nearest - leverage) ? preset : nearest
  ));
  return `${nearestPreset}x`;
}

export function getPositionValue(position, now = Date.now()) {
  return getPositionMargin(position) + getPositionDisplay(position, now).pnl;
}

export function sortPositionsByValue(positions, now = Date.now()) {
  return [...(positions || [])].sort(
    (left, right) => getPositionValue(right, now) - getPositionValue(left, now),
  );
}

export function getPositionStripTotals(positions, now = Date.now()) {
  return (positions || []).reduce((totals, position) => ({
    openPnl: totals.openPnl + getPositionDisplay(position, now).pnl,
    exposure: totals.exposure + getPositionMargin(position),
  }), { openPnl: 0, exposure: 0 });
}

export function getPositionStripPage(positions, pageIndex, pageSize = 5) {
  const maxPageIndex = Math.max(0, Math.ceil((positions?.length || 0) / pageSize) - 1);
  const safePageIndex = Math.min(Math.max(0, Number(pageIndex) || 0), maxPageIndex);
  const start = safePageIndex * pageSize;
  return (positions || []).slice(start, start + pageSize);
}
