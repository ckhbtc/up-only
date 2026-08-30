import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { UP_ONLY_CID_PREFIX } from '../services/tradeCid.js';

const VALID_STATUSES = new Set(['submitted', 'quoted', 'broadcasting', 'confirmed', 'failed']);
const VALID_ACTIONS = new Set(['open', 'close']);
const FIELDS = [
  'cid',
  'wallet',
  'marketId',
  'symbol',
  'action',
  'direction',
  'status',
  'stake',
  'leverage',
  'quantity',
  'quotePrice',
  'worstPrice',
  'rfqId',
  'txHash',
  'errorCode',
  'errorMessage',
  'createdAt',
  'updatedAt',
  'confirmedAt',
  'source',
];

function text(value, max = 180) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).slice(0, max);
}

function timestamp(value, fallback = Date.now()) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  if (number > 1e17) return Math.round(number / 1e6);
  if (number > 1e14) return Math.round(number / 1e3);
  if (number < 1e11) return Math.round(number * 1000);
  return Math.round(number);
}

export function normalizeTradeRecord(record, { wallet = null } = {}) {
  const cid = text(record?.cid, 100);
  if (!cid?.startsWith(UP_ONLY_CID_PREFIX)) throw new Error('Invalid UpOnly trade CID');
  const normalizedWallet = text(wallet || record.wallet, 64);
  const marketId = text(record.marketId, 90);
  if (!/^inj1[a-z0-9]{38}$/.test(normalizedWallet || '')) throw new Error('Invalid trade wallet');
  if (!marketId) throw new Error('Trade market is required');

  const status = VALID_STATUSES.has(record.status) ? record.status : 'submitted';
  const action = VALID_ACTIONS.has(record.action) ? record.action : null;
  const createdAt = timestamp(record.createdAt);
  const updatedAt = Math.max(createdAt, timestamp(record.updatedAt, createdAt));

  return {
    cid,
    wallet: normalizedWallet,
    marketId,
    symbol: text(record.symbol, 20),
    action,
    direction: text(record.direction, 10),
    status,
    stake: text(record.stake, 60),
    leverage: text(record.leverage, 20),
    quantity: text(record.quantity, 60),
    quotePrice: text(record.quotePrice, 60),
    worstPrice: text(record.worstPrice, 60),
    rfqId: text(record.rfqId, 40),
    txHash: text(record.txHash, 100),
    errorCode: text(record.errorCode, 40),
    errorMessage: text(record.errorMessage, 180),
    createdAt,
    updatedAt,
    confirmedAt: record.confirmedAt ? timestamp(record.confirmedAt) : null,
    source: text(record.source, 20) || 'client',
  };
}

function rowToRecord(row) {
  if (!row) return null;
  const record = {};
  for (const field of FIELDS) record[field] = row[field] ?? null;
  return record;
}

export function createTradeHistoryStore({ database, path } = {}) {
  let db = database;
  if (!db) {
    const databasePath = path || process.env.TRADE_HISTORY_DB
      || join(process.cwd(), '.data', 'trade-history.sqlite');
    mkdirSync(dirname(databasePath), { recursive: true });
    db = new DatabaseSync(databasePath);
  }

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS trade_history (
      cid TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      marketId TEXT NOT NULL,
      symbol TEXT,
      action TEXT,
      direction TEXT,
      status TEXT NOT NULL,
      stake TEXT,
      leverage TEXT,
      quantity TEXT,
      quotePrice TEXT,
      worstPrice TEXT,
      rfqId TEXT,
      txHash TEXT,
      errorCode TEXT,
      errorMessage TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      confirmedAt INTEGER,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS trade_history_wallet_created
      ON trade_history(wallet, createdAt DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS trade_history_tx_hash
      ON trade_history(txHash) WHERE txHash IS NOT NULL;
  `);

  const getStatement = db.prepare('SELECT * FROM trade_history WHERE cid = ?');
  const listStatement = db.prepare(`
    SELECT * FROM trade_history
    WHERE wallet = ?
    ORDER BY createdAt DESC, updatedAt DESC
    LIMIT ?
  `);
  const insertStatement = db.prepare(`
    INSERT INTO trade_history (
      cid, wallet, marketId, symbol, action, direction, status,
      stake, leverage, quantity, quotePrice, worstPrice, rfqId, txHash,
      errorCode, errorMessage, createdAt, updatedAt, confirmedAt, source
    ) VALUES (
      @cid, @wallet, @marketId, @symbol, @action, @direction, @status,
      @stake, @leverage, @quantity, @quotePrice, @worstPrice, @rfqId, @txHash,
      @errorCode, @errorMessage, @createdAt, @updatedAt, @confirmedAt, @source
    )
    ON CONFLICT(cid) DO UPDATE SET
      wallet = excluded.wallet,
      marketId = excluded.marketId,
      symbol = excluded.symbol,
      action = excluded.action,
      direction = excluded.direction,
      status = excluded.status,
      stake = excluded.stake,
      leverage = excluded.leverage,
      quantity = excluded.quantity,
      quotePrice = excluded.quotePrice,
      worstPrice = excluded.worstPrice,
      rfqId = excluded.rfqId,
      txHash = excluded.txHash,
      errorCode = excluded.errorCode,
      errorMessage = excluded.errorMessage,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      confirmedAt = excluded.confirmedAt,
      source = excluded.source
  `);

  function upsert(record, options = {}) {
    const incoming = normalizeTradeRecord(record, options);
    const existing = rowToRecord(getStatement.get(incoming.cid));
    if (existing && existing.wallet !== incoming.wallet) throw new Error('Trade CID belongs to another wallet');

    const stale = existing && incoming.updatedAt < existing.updatedAt;
    const preserveTerminal = existing && (
      existing.status === 'confirmed'
      || (existing.status === 'failed' && incoming.status !== 'confirmed')
    );
    const merged = {};
    for (const field of FIELDS) {
      const next = incoming[field];
      merged[field] = stale
        ? existing?.[field] ?? next ?? null
        : (next === null || next === undefined ? existing?.[field] ?? null : next);
    }
    merged.createdAt = existing ? Math.min(existing.createdAt, incoming.createdAt) : incoming.createdAt;
    merged.updatedAt = Math.max(existing?.updatedAt || 0, incoming.updatedAt);
    if (preserveTerminal && incoming.status !== 'confirmed') {
      merged.status = existing.status;
      merged.txHash = existing.txHash;
      merged.confirmedAt = existing.confirmedAt;
      merged.errorCode = existing.errorCode;
      merged.errorMessage = existing.errorMessage;
      merged.source = existing.source;
    }
    if (merged.status === 'confirmed') {
      merged.confirmedAt ||= merged.updatedAt;
      merged.errorCode = null;
      merged.errorMessage = null;
    }

    insertStatement.run(merged);
    return rowToRecord(getStatement.get(merged.cid));
  }

  return {
    upsert,
    upsertMany(records, options = {}) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const saved = records.map(record => upsert(record, options));
        db.exec('COMMIT');
        return saved;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    list(wallet, limit = 250) {
      return listStatement.all(wallet, Math.min(Math.max(Number(limit) || 250, 1), 1000)).map(rowToRecord);
    },
    close() {
      db.close();
    },
  };
}

export function settlementToTradeRecord(settlement) {
  if (!String(settlement?.cid || '').startsWith(UP_ONLY_CID_PREFIX)) return null;
  const confirmedAt = timestamp(
    settlement.transactionTime || settlement.eventTime || settlement.updatedAt || settlement.createdAt,
  );
  return normalizeTradeRecord({
    cid: settlement.cid,
    wallet: settlement.taker,
    marketId: settlement.marketId,
    action: String(settlement.margin || '0') === '0' ? 'close' : 'open',
    direction: settlement.direction,
    status: 'confirmed',
    stake: settlement.margin,
    quantity: settlement.quantity,
    worstPrice: settlement.worstPrice,
    rfqId: settlement.rfqId,
    txHash: settlement.txHash,
    createdAt: settlement.createdAt || confirmedAt,
    updatedAt: confirmedAt,
    confirmedAt,
    source: 'indexer',
  });
}
