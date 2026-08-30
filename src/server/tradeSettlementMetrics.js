import Decimal from 'decimal.js';

const TX_REST_URL = 'https://sentry.lcd.injective.network/cosmos/tx/v1beta1/txs';
const DERIVATIVE_EXECUTION_EVENT = 'injective.exchange.v2.EventBatchDerivativeExecution';

function parsedValue(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function eventAttributes(event) {
  return new Map((event?.attributes || []).map(attribute => [
    attribute.key,
    parsedValue(attribute.value),
  ]));
}

function sumTradeField(trades, field) {
  return trades
    .reduce((total, trade) => total.plus(new Decimal(trade?.[field] || 0)), new Decimal(0))
    .toString();
}

export function extractDerivativeSettlementMetrics(payload, { marketId, direction } = {}) {
  const events = payload?.tx_response?.events || payload?.txResponse?.events || [];
  const expectedIsBuy = String(direction || '').toLowerCase() === 'long';

  for (const event of events) {
    if (event?.type !== DERIVATIVE_EXECUTION_EVENT) continue;
    const attributes = eventAttributes(event);
    if (String(attributes.get('market_id') || '') !== String(marketId || '')) continue;
    if (Boolean(attributes.get('is_buy')) !== expectedIsBuy) continue;

    const trades = attributes.get('trades');
    if (!Array.isArray(trades) || trades.length === 0) continue;
    return {
      returnedAmount: sumTradeField(trades, 'payout'),
      realizedPnl: sumTradeField(trades, 'pnl'),
    };
  }

  return null;
}

export async function fetchTradeSettlementMetrics({
  txHash,
  marketId,
  direction,
  fetchImpl = fetch,
} = {}) {
  const normalizedHash = String(txHash || '').replace(/^0x/i, '');
  if (!normalizedHash) return null;
  const response = await fetchImpl(`${TX_REST_URL}/${normalizedHash}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Transaction lookup failed (${response.status})`);
  return extractDerivativeSettlementMetrics(await response.json(), { marketId, direction });
}
