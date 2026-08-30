import { IndexerGrpcRFQApi } from '@injectivelabs/sdk-ts';
import { RFQ_GRPC_WEB_URL } from '../services/rfqConstants.js';
import { settlementToTradeRecord } from './tradeHistoryStore.js';
import { fetchTradeSettlementMetrics } from './tradeSettlementMetrics.js';

const RECONCILE_TTL_MS = 15_000;
const MAX_PAGES = 20;

export function createTradeHistoryService({
  store,
  rfqApi = new IndexerGrpcRFQApi(RFQ_GRPC_WEB_URL),
  fetchSettlementMetrics = fetchTradeSettlementMetrics,
  now = Date.now,
} = {}) {
  if (!store) throw new Error('Trade history store is required');
  const reconciledAt = new Map();

  async function enrichCloseRecords(records, wallet) {
    const existing = new Map(store.list(wallet, 1000).map(record => [record.cid, record]));
    const enriched = [];
    for (const record of records) {
      const saved = existing.get(record.cid);
      if (record.action !== 'close' || !record.txHash
        || (saved?.returnedAmount != null && saved?.realizedPnl != null)) {
        enriched.push(record);
        continue;
      }
      try {
        const metrics = await fetchSettlementMetrics({
          txHash: record.txHash,
          marketId: record.marketId,
          direction: record.direction,
        });
        enriched.push(metrics ? { ...record, ...metrics } : record);
      } catch (error) {
        console.warn('trade-history close settlement enrichment skipped:', error.message || error);
        enriched.push(record);
      }
    }
    return enriched;
  }

  async function reconcile(wallet) {
    if (!rfqApi) return;
    const last = reconciledAt.get(wallet) || 0;
    if (now() - last < RECONCILE_TTL_MS) return;

    let token;
    const seenTokens = new Set();
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await rfqApi.fetchSettlements({
        addresses: [wallet],
        perPage: 100,
        ...(token ? { token } : {}),
      });
      const records = (response?.settlements || [])
        .map(settlementToTradeRecord)
        .filter(Boolean);
      if (records.length) {
        store.upsertMany(await enrichCloseRecords(records, wallet), { wallet });
      }

      const next = (response?.next || []).find(candidate => candidate && !seenTokens.has(candidate));
      if (!next) break;
      seenTokens.add(next);
      token = next;
    }
    reconciledAt.set(wallet, now());
  }

  return {
    async list(wallet) {
      try {
        await reconcile(wallet);
      } catch (error) {
        console.warn('trade-history indexer reconciliation skipped:', error.message || error);
      }
      return store.list(wallet);
    },
    sync(wallet, events) {
      if (!Array.isArray(events)) throw new Error('Trade history events are required');
      if (events.length > 250) throw new Error('Too many trade history events');
      const clientEvents = events.map(event => ({
        ...event,
        status: event?.status === 'confirmed' ? 'broadcasting' : event?.status,
        confirmedAt: null,
        source: 'client',
      }));
      return store.upsertMany(clientEvents, { wallet });
    },
    reconcile,
  };
}
