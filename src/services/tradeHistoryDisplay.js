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

export function paginateTradeHistory(records, pageIndex, pageSize = 5) {
  const items = Array.isArray(records) ? records : [];
  const safePageSize = Math.max(1, Number(pageSize) || 5);
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));
  const safePageIndex = Math.min(
    Math.max(0, Number(pageIndex) || 0),
    pageCount - 1,
  );
  const start = safePageIndex * safePageSize;

  return {
    pageIndex: safePageIndex,
    pageCount,
    records: items.slice(start, start + safePageSize),
    first: items.length === 0 ? 0 : start + 1,
    last: Math.min(start + safePageSize, items.length),
    total: items.length,
  };
}
