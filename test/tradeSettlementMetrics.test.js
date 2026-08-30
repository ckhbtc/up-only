import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDerivativeSettlementMetrics } from '../src/server/tradeSettlementMetrics.js';

test('extracts the taker payout and realized pnl from v2 derivative execution events', () => {
  const payload = {
    tx_response: {
      events: [
        {
          type: 'injective.exchange.v2.EventBatchDerivativeExecution',
          attributes: [
            { key: 'market_id', value: '"uni-market"' },
            { key: 'is_buy', value: 'false' },
            {
              key: 'trades',
              value: JSON.stringify([
                { payout: '4.900000000000000000', pnl: '-0.090000000000000000' },
                { payout: '0.006950176095672850', pnl: '-0.003049823904327150' },
              ]),
            },
          ],
        },
        {
          type: 'injective.exchange.v2.EventBatchDerivativeExecution',
          attributes: [
            { key: 'market_id', value: '"uni-market"' },
            { key: 'is_buy', value: 'true' },
            { key: 'trades', value: '[{"payout":"0","pnl":"0"}]' },
          ],
        },
      ],
    },
  };

  assert.deepEqual(extractDerivativeSettlementMetrics(payload, {
    marketId: 'uni-market',
    direction: 'short',
  }), {
    returnedAmount: '4.90695017609567285',
    realizedPnl: '-0.09304982390432715',
  });
});
