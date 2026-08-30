import { getActiveEvmProvider } from './evmWalletProvider.js';

const STORAGE_KEY = 'up-only-trade-history-v1';
const MAX_LOCAL_RECORDS = 1000;

function readAll(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeAll(value, storage = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // History persistence is best effort and must never block a trade.
  }
}

function mergeRecord(existing, incoming) {
  const confirmed = existing?.status === 'confirmed' && incoming.status !== 'confirmed';
  const merged = {
    ...(existing || {}),
    ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => (
      value !== null && value !== undefined && value !== ''
    ))),
  };
  merged.createdAt = Math.min(existing?.createdAt || Infinity, incoming.createdAt || Date.now());
  merged.updatedAt = Math.max(existing?.updatedAt || 0, incoming.updatedAt || Date.now());
  if (confirmed) {
    merged.status = existing.status;
    merged.txHash = existing.txHash;
    merged.confirmedAt = existing.confirmedAt;
  }
  return merged;
}

export function saveLocalTradeEvent(record, storage = localStorage) {
  if (!record?.cid?.startsWith('up-only-') || !record.wallet || !record.marketId) return null;
  const all = readAll(storage);
  const records = Array.isArray(all[record.wallet]) ? all[record.wallet] : [];
  const existingIndex = records.findIndex(item => item.cid === record.cid);
  const merged = mergeRecord(existingIndex >= 0 ? records[existingIndex] : null, record);
  if (existingIndex >= 0) records[existingIndex] = merged;
  else records.push(merged);
  all[record.wallet] = records
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, MAX_LOCAL_RECORDS);
  writeAll(all, storage);
  return merged;
}

export function listLocalTradeHistory(wallet, storage = localStorage) {
  if (!wallet) return [];
  const all = readAll(storage);
  return (Array.isArray(all[wallet]) ? all[wallet] : [])
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export function classifyTradeFailure(message) {
  const text = String(message || '');
  if (/no quotes received|no executable rfq quote|selected 0 quote/i.test(text)) {
    return { errorCode: 'no_liquidity', errorMessage: 'No liquidity was available for this trade.' };
  }
  if (/insufficient margin/i.test(text)) {
    return { errorCode: 'insufficient_margin', errorMessage: 'Transaction reverted due to insufficient margin.' };
  }
  if (/sequence mismatch|incorrect account sequence/i.test(text)) {
    return { errorCode: 'sequence_mismatch', errorMessage: 'The wallet sequence changed before confirmation.' };
  }
  if (/expired|quote moved beyond safe margin/i.test(text)) {
    return { errorCode: 'quote_expired', errorMessage: 'The quote expired before it could be confirmed.' };
  }
  if (/revert|contract execution failed/i.test(text)) {
    return { errorCode: 'reverted', errorMessage: 'Transaction reverted before confirmation.' };
  }
  return { errorCode: 'failed', errorMessage: 'Trade failed before confirmation.' };
}

async function historyCall(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/trade-history${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Trade history request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function authenticateTradeHistory({ ethAddress, injAddress }) {
  const provider = getActiveEvmProvider();
  const challenge = await historyCall('/challenge', {
    method: 'POST',
    body: { ethAddress, injAddress },
  });
  const signature = await provider.request({
    method: 'personal_sign',
    params: [challenge.message, ethAddress],
  });
  return historyCall('/verify', {
    method: 'POST',
    body: { challengeId: challenge.challengeId, signature },
  });
}

export async function syncLocalTradeHistory(wallet, storage = localStorage) {
  const events = listLocalTradeHistory(wallet, storage);
  if (!events.length) return { synced: 0 };
  return historyCall('/sync', { method: 'POST', body: { events } });
}

export async function fetchTradeHistory() {
  return historyCall('');
}

export async function unlockAndFetchTradeHistory({ ethAddress, injAddress }, storage = localStorage) {
  try {
    const current = await fetchTradeHistory();
    if (current.wallet !== injAddress) throw Object.assign(new Error('Wallet changed'), { status: 401 });
  } catch (error) {
    if (error.status !== 401) throw error;
    await authenticateTradeHistory({ ethAddress, injAddress });
  }
  await syncLocalTradeHistory(injAddress, storage);
  return fetchTradeHistory();
}

export function recordTradeHistoryEvent(record, storage = localStorage) {
  const saved = saveLocalTradeEvent(record, storage);
  if (!saved || typeof fetch !== 'function') return saved;
  historyCall('/sync', { method: 'POST', body: { events: [saved] } }).catch(() => {});
  return saved;
}
