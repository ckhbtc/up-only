import { useEffect, useState } from 'react';
import {
  getEvmWallets,
  refreshEvmWallets,
  subscribeEvmWallets,
} from '../services/evmWalletProvider.js';

export default function WalletSelector({
  wallets,
  connectingId = null,
  error = '',
  onSelect,
  onClose,
}) {
  const [discoveredWallets, setDiscoveredWallets] = useState(() => wallets || getEvmWallets());
  const options = wallets || discoveredWallets;
  const connecting = Boolean(connectingId);

  useEffect(() => {
    if (wallets) return undefined;
    refreshEvmWallets();
    setDiscoveredWallets(getEvmWallets());
    return subscribeEvmWallets(setDiscoveredWallets);
  }, [wallets]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !connecting) onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connecting, onClose]);

  return (
    <div
      className="wallet-selector-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !connecting) onClose?.();
      }}
    >
      <section
        className="wallet-selector-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-selector-title"
      >
        <div className="wallet-selector-head">
          <h2 id="wallet-selector-title">Connect wallet</h2>
          <button
            type="button"
            className="wallet-selector-close"
            onClick={onClose}
            disabled={connecting}
            aria-label="Close wallet selector"
          >
            ×
          </button>
        </div>

        <div className="wallet-selector-options">
          {options.map(wallet => {
            const icon = wallet.icon ? (
              <img src={wallet.icon} alt="" />
            ) : (
              <span>{wallet.monogram}</span>
            );

            if (!wallet.installed) {
              return (
                <a
                  key={wallet.id}
                  className={`wallet-selector-option wallet-${wallet.id} is-unavailable`}
                  href={wallet.installUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="wallet-selector-icon">{icon}</span>
                  <strong>{wallet.label}</strong>
                  <span className="wallet-selector-state">Install</span>
                </a>
              );
            }

            return (
              <button
                key={wallet.id}
                type="button"
                className={`wallet-selector-option wallet-${wallet.id}`}
                onClick={() => onSelect?.(wallet)}
                disabled={connecting}
              >
                <span className="wallet-selector-icon">{icon}</span>
                <strong>{wallet.label}</strong>
                <span className="wallet-selector-state">
                  {connectingId === wallet.id ? 'Connecting...' : 'Detected'}
                </span>
              </button>
            );
          })}
        </div>

        {error && <div className="wallet-selector-error" role="alert">{error}</div>}
      </section>
    </div>
  );
}
