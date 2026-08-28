import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  USDCAD_MARKET_ID,
  filterRfqTradeableMarkets,
} from '../src/services/rfqMarketAvailability.js';

test('removes USDCAD while its RFQ and orderbook liquidity are unavailable', () => {
  const markets = [
    { marketId: '0x3cdf314da4868b824697bca1f9d8ed349224e735d437c12cd59a6fadb7992501', symbol: 'USDJPY' },
    { marketId: USDCAD_MARKET_ID.toUpperCase(), symbol: 'USDCAD' },
  ];

  assert.deepEqual(filterRfqTradeableMarkets(markets), [markets[0]]);
});

test('keeps unrelated verified markets available', () => {
  const markets = [
    { marketId: '0xbtc', symbol: 'BTC' },
    { marketId: '0xeth', symbol: 'ETH' },
  ];

  assert.deepEqual(filterRfqTradeableMarkets(markets), markets);
});
