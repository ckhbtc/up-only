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
    const hasReturnedAmount = record.status === 'confirmed'
      && record.returnedAmount !== null
      && record.returnedAmount !== undefined
      && record.returnedAmount !== '';
    const hasRealizedPnl = record.status === 'confirmed'
      && record.realizedPnl !== null
      && record.realizedPnl !== undefined
      && record.realizedPnl !== '';
    const realizedPnl = Number(record.realizedPnl);

    return {
      actionLabel: 'Close',
      actionClass: 'is-close',
      amount: hasReturnedAmount ? `$${formatUsdcBalance(record.returnedAmount)}` : '',
      amountClass: hasReturnedAmount ? 'is-positive' : 'is-empty',
      realizedPnl: hasRealizedPnl ? formatSignedUsd(record.realizedPnl) : '',
      realizedPnlClass: hasRealizedPnl && Number.isFinite(realizedPnl)
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
    amount: hasStake ? `$${formatUsdcBalance(record.stake)}` : '',
    amountClass: hasStake ? 'is-positive' : 'is-empty',
    realizedPnl: '',
    realizedPnlClass: 'is-empty',
  };
}
