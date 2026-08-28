import { SOURCE_CHAINS } from '../services/bridge';
import { txExplorerUrl } from '../services/explorer';

const STATUS_COPY = {
  awaiting_attestation: 'Awaiting attestation',
  ready_to_mint: 'Ready to mint',
  minting: 'Minting on Injective',
  complete: 'Complete',
  needs_attention: 'Needs attention',
};

function shortHash(hash) {
  return hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : '';
}

function sourceFor(record) {
  return SOURCE_CHAINS.find(chain => (
    chain.id === record.sourceChainId || chain.domain === record.sourceDomain
  ));
}

export default function BridgeHistoryPanel({
  wallet,
  transfers,
  recoveringId,
  recoveryNotice,
  recoveryError,
  importHash,
  importChainId,
  importing,
  onImportHashChange,
  onImportChainChange,
  onImport,
  onRecover,
}) {
  return (
    <div className="up-bridge-history">
      {!wallet ? (
        <div className="up-bridge-history-empty">Connect a wallet to view bridge history.</div>
      ) : transfers.length === 0 ? (
        <div className="up-bridge-history-empty">No transfers saved in this browser yet.</div>
      ) : (
        <div className="up-bridge-history-list">
          {transfers.map((transfer) => {
            const source = sourceFor(transfer);
            const recovering = recoveringId === transfer.id;
            return (
              <article key={transfer.id} className="up-bridge-history-row">
                <div className="up-bridge-history-main">
                  <div>
                    <strong>{transfer.amount ? `${transfer.amount} USDC` : 'USDC transfer'}</strong>
                    <span>{transfer.sourceName} → Injective · {transfer.transferMode}</span>
                  </div>
                  <span className={`up-bridge-history-status is-${transfer.status}`}>
                    {STATUS_COPY[transfer.status] || transfer.status}
                  </span>
                </div>
                <div className="up-bridge-history-meta">
                  <span>{new Date(transfer.createdAt).toLocaleString()}</span>
                  <span>
                    <a
                      href={`${source?.explorer || '#'}${source ? '/tx/' : ''}${transfer.burnHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      burn {shortHash(transfer.burnHash)}
                    </a>
                    {transfer.mintHash && (
                      <a
                        href={txExplorerUrl(transfer.mintHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        mint {shortHash(transfer.mintHash)}
                      </a>
                    )}
                  </span>
                </div>
                {transfer.error && <div className="up-bridge-history-error">{transfer.error}</div>}
                {transfer.status !== 'complete' && (
                  <button
                    type="button"
                    className="up-bridge-rescue"
                    onClick={() => onRecover(transfer)}
                    disabled={Boolean(recoveringId)}
                  >
                    {recovering
                      ? 'Checking…'
                      : transfer.status === 'awaiting_attestation'
                        ? 'Check again'
                        : 'Rescue'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      <form className="up-bridge-import" onSubmit={onImport}>
        <div>
          <strong>Rescue by burn hash</strong>
          <span>For transfers from another browser or cleared history.</span>
        </div>
        <select
          aria-label="Rescue source network"
          value={importChainId}
          onChange={event => onImportChainChange(Number(event.target.value))}
          disabled={importing || Boolean(recoveringId)}
        >
          {SOURCE_CHAINS.map(chain => (
            <option key={chain.id} value={chain.id}>{chain.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={importHash}
          onChange={event => onImportHashChange(event.target.value.trim())}
          placeholder="0x burn transaction hash"
          aria-label="Burn transaction hash"
          autoComplete="off"
          disabled={importing || Boolean(recoveringId)}
        />
        <button
          type="submit"
          disabled={importing || Boolean(recoveringId) || !wallet}
        >
          {importing ? 'Checking…' : 'Find and rescue'}
        </button>
      </form>

      {recoveryNotice && (
        <div className="up-bridge-state is-success" aria-live="polite">{recoveryNotice}</div>
      )}
      {recoveryError && (
        <div className="up-bridge-state is-error" role="alert">{recoveryError}</div>
      )}
    </div>
  );
}
