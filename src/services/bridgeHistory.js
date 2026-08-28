const STORAGE_KEY = 'up-only-cctp-history-v1';
const MAX_HISTORY = 50;

const VALID_STATUSES = new Set([
  'awaiting_attestation',
  'ready_to_mint',
  'minting',
  'complete',
  'needs_attention',
]);

function getStorage(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; }
  catch { return null; }
}

function normalizedWallet(wallet) {
  const value = String(wallet || '').toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(value) ? value : '';
}

function normalizedHash(hash) {
  const value = String(hash || '').toLowerCase();
  return /^0x[0-9a-f]{64}$/.test(value) ? value : '';
}

export function bridgeTransferId(sourceDomain, burnHash) {
  const domain = Number(sourceDomain);
  const hash = normalizedHash(burnHash);
  if (!Number.isInteger(domain) || domain < 0 || !hash) return '';
  return `${domain}:${hash}`;
}

function normalizeRecord(record) {
  const wallet = normalizedWallet(record?.wallet);
  const burnHash = normalizedHash(record?.burnHash);
  const sourceDomain = Number(record?.sourceDomain);
  const id = bridgeTransferId(sourceDomain, burnHash);
  if (!wallet || !id) return null;

  const now = Date.now();
  const createdAt = Number(record.createdAt) || now;
  return {
    version: 1,
    id,
    wallet,
    sourceChainId: Number(record.sourceChainId) || null,
    sourceDomain,
    sourceName: String(record.sourceName || 'Unknown source'),
    amount: record.amount == null ? null : String(record.amount),
    transferMode: ['standard', 'fast'].includes(record.transferMode)
      ? record.transferMode
      : 'imported',
    burnHash,
    status: VALID_STATUSES.has(record.status) ? record.status : 'awaiting_attestation',
    createdAt,
    updatedAt: Number(record.updatedAt) || createdAt,
    mintHash: normalizedHash(record.mintHash) || null,
    error: record.error ? String(record.error).slice(0, 240) : null,
  };
}

function readAll(storage) {
  const target = getStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAll(records, storage) {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
  } catch {
    // Storage can be unavailable in private or quota-constrained contexts.
  }
}

export function listBridgeTransfers(wallet, storage) {
  const scope = normalizedWallet(wallet);
  if (!scope) return [];
  return readAll(storage)
    .filter(record => record.wallet === scope)
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
}

export function saveBridgeTransfer(record, storage) {
  const normalized = normalizeRecord(record);
  if (!normalized) throw new Error('Invalid bridge history record');

  const records = readAll(storage);
  const existing = records.find(row => row.id === normalized.id);
  const next = existing
    ? normalizeRecord({ ...existing, ...normalized, createdAt: existing.createdAt })
    : normalized;
  const remaining = records.filter(row => row.id !== next.id);
  writeAll([next, ...remaining].sort((a, b) => b.updatedAt - a.updatedAt), storage);
  return next;
}

export function updateBridgeTransfer(id, patch, storage) {
  const records = readAll(storage);
  const index = records.findIndex(row => row.id === id);
  if (index < 0) return null;

  const next = normalizeRecord({
    ...records[index],
    ...patch,
    id: records[index].id,
    burnHash: records[index].burnHash,
    sourceDomain: records[index].sourceDomain,
    wallet: records[index].wallet,
    createdAt: records[index].createdAt,
    updatedAt: patch?.updatedAt || Date.now(),
  });
  records[index] = next;
  writeAll(records.sort((a, b) => b.updatedAt - a.updatedAt), storage);
  return next;
}

export function newestRecoverableBridge(records) {
  return [...(records || [])]
    .filter(record => record.status !== 'complete')
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)[0] || null;
}
