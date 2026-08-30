import { formatUsdcBalance } from '../data/mockData.js';

function formatSignedUsd(value) {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);
  if (!Number.isFinite(number)) return '—';

  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}$${formatUsdcBalance(Math.abs(number))}`;
}

export function tradeHistoryDisplay(record) {
  if (record?.action === 'close') {
    const hasRealizedPnl = record.status === 'confirmed'
      && record.realizedPnl !== null
      && record.realizedPnl !== undefined
      && record.realizedPnl !== '';
    const realizedPnl = Number(record.realizedPnl);

    return {
      actionLabel: 'Close',
      actionClass: 'is-close',
      value: hasRealizedPnl ? formatSignedUsd(record.realizedPnl) : '—',
      valueClass: hasRealizedPnl && Number.isFinite(realizedPnl)
        ? (realizedPnl < 0 ? 'is-negative' : 'is-positive')
        : 'is-empty',
    };
  }

  const hasStake = record?.stake !== null
    && record?.stake !== undefined
    && record?.stake !== '';

  return {
    actionLabel: 'Open',
    actionClass: 'is-open',
    value: hasStake ? `$${formatUsdcBalance(record.stake)}` : '—',
    valueClass: hasStake ? 'is-positive' : 'is-empty',
  };
}
