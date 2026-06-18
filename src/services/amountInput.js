import Decimal from 'decimal.js';

export function sanitizeAmountInput(raw, decimals = 2) {
  const cleaned = String(raw ?? '').replace(/[^0-9.]/g, '');
  const [whole, ...fractionParts] = cleaned.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '';
  if (fractionParts.length === 0) return normalizedWhole;
  return `${normalizedWhole || '0'}.${fractionParts.join('').slice(0, decimals)}`;
}

export function formatSpendableAmountInput(value, decimals = 2) {
  try {
    const n = new Decimal(value || 0);
    if (!n.isFinite() || n.lte(0)) return '0';

    return n
      .toDecimalPlaces(decimals, Decimal.ROUND_DOWN)
      .toFixed(decimals)
      .replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}
