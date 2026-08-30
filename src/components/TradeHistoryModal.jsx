import { useEffect, useMemo, useState } from 'react';
import { txExplorerUrl } from '../services/explorer.js';
import {
  fetchDisplayedTradeHistory,
  listLocalTradeHistory,
  unlockAndFetchTradeHistory,
} from '../services/tradeHistory.js';

const HISTORY_REFRESH_MS = 5_000;

function tradeStatusLabel(status) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'failed') return 'Failed';
  if (status === 'quoted') return 'Quoted';
  if (status === 'broadcasting') return 'Broadcasting';
  return 'Submitted';
}

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value}${suffix}`;
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 8 })}${suffix}`;
}

export default function TradeHistoryModal({ ethAddress, injAddress, markets = [], onClose }) {
  const [records, setRecords] = useState(() => listLocalTradeHistory(injAddress));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const marketNames = useMemo(() => new Map(markets.map(market => [
    market.marketId,
    market.symbol || market.ticker,
  ])), [markets]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await unlockAndFetchTradeHistory({ ethAddress, injAddress });
      setRecords(response.records || []);
    } catch (err) {
      setRecords(listLocalTradeHistory(injAddress));
      setError(err?.code === 4001
        ? 'History signature was cancelled.'
        : (err.message || 'Trade history could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ethAddress, injAddress]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDisplayedTradeHistory(injAddress)
        .then(response => setRecords(response.records || []))
        .catch(() => {});
    }, HISTORY_REFRESH_MS);
    return () => clearInterval(interval);
  }, [injAddress]);

  return (
    <div className="up-bridge-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="up-bridge-dialog up-trade-history-dialog" role="dialog" aria-modal="true" aria-labelledby="trade-history-title">
        <header className="up-bridge-header">
          <h2 id="trade-history-title">Trade History</h2>
          <button type="button" className="up-bridge-close" onClick={onClose} aria-label="Close trade history">×</button>
        </header>

        <div className="up-bridge-body up-trade-history-body">
          {loading && (
            <div className="up-bridge-history-empty">Unlocking and reconciling trade history...</div>
          )}

          {!loading && error && (
            <div className="up-trade-history-auth-error">
              <span>{error}</span>
              <button type="button" onClick={load}>Try Again</button>
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="up-bridge-history-empty">No UpOnly trade attempts yet.</div>
          )}

          {!loading && records.length > 0 && (
            <div className="up-trade-history-list">
              <div className="up-trade-history-columns up-trade-history-columns-head" aria-hidden="true">
                <span>Pair</span>
                <span>Margin</span>
                <span>Status</span>
              </div>
              {records.map(record => {
                const symbol = record.symbol || marketNames.get(record.marketId) || 'Market';
                const margin = formatValue(record.stake);
                const statusLabel = tradeStatusLabel(record.status);
                const statusClass = `up-trade-history-status is-${record.status}`;
                return (
                  <article key={record.cid} className="up-trade-history-row up-trade-history-columns">
                    <strong className="up-trade-history-pair">{symbol}</strong>
                    <span className="up-trade-history-margin">{margin ? `$${margin}` : '—'}</span>
                    {record.txHash ? (
                      <a
                        className={statusClass}
                        href={txExplorerUrl(record.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${statusLabel} transaction`}
                      >
                        {statusLabel}
                      </a>
                    ) : (
                      <span className={statusClass}>{statusLabel}</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
