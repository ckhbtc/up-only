import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { formatUnits, parseUnits } from 'viem';
import {
  executeBridge,
  fetchSourceUsdcBalance,
  fetchRouteFees,
  feeBpsToMaxFee,
  findFeeEntry,
  SOURCE_CHAINS,
  INJECTIVE,
  FAST_FINALITY,
} from '../services/bridge';
import { isPositiveTokenAmount, sanitizeDecimalInput } from '../services/bridgeAmount';
import { txExplorerUrl } from '../services/explorer';
import useWalletStore from '../stores/walletStore';
import { formatUsdcBalance } from '../data/mockData';
import ChainLogo from './ChainLogo';
import CoinLogo from './CoinLogo';

const PHASE_COPY = {
  'approve-sign': 'Approve USDC - confirm in wallet',
  'approve-confirm': 'Approving USDC...',
  'burn-sign': 'Burn USDC - confirm in wallet',
  'burn-confirm': 'Burning on source chain...',
  attest: 'Waiting for Circle attestation (1–13 min)...',
  'mint-submit': 'Minting native USDC on INJECTIVE...',
  'mint-confirm': 'Confirming native USDC balance...',
  success: 'Bridge complete',
};

function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : '';
}

function networkLabel(name) {
  return String(name || '').toUpperCase();
}

export default function BridgeModal({ onClose }) {
  const {
    ethAddress,
    injAddress,
    usdcBalance,
    refreshBalances,
    pollBalancesUntilChange,
    applyUsdcBalanceFloor,
  } = useWalletStore();

  const [sourceChainId, setSourceChainId] = useState(SOURCE_CHAINS[0].id);
  const [amount, setAmount] = useState('');
  const [transferMode, setTransferMode] = useState('standard');
  const [bridging, setBridging] = useState(false);
  const [phase, setPhase] = useState(null);
  const [phaseData, setPhaseData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [srcBalance, setSrcBalance] = useState(null);
  const [balanceErr, setBalanceErr] = useState(null);
  const [fastFee, setFastFee] = useState(null);
  const [fastFeeErr, setFastFeeErr] = useState(null);
  const [chainMenuOpen, setChainMenuOpen] = useState(false);
  const chainMenuRef = useRef(null);

  const sourceChain = useMemo(
    () => SOURCE_CHAINS.find(chain => chain.id === sourceChainId) || SOURCE_CHAINS[0],
    [sourceChainId],
  );

  useEffect(() => {
    let cancelled = false;
    setSrcBalance(null);
    setBalanceErr(null);
    if (!ethAddress) return;
    fetchSourceUsdcBalance(sourceChainId, ethAddress)
      .then((balance) => { if (!cancelled) setSrcBalance(balance); })
      .catch((err) => { if (!cancelled) setBalanceErr(err.shortMessage || err.message); });
    return () => { cancelled = true; };
  }, [sourceChainId, ethAddress]);

  useEffect(() => {
    if (!chainMenuOpen) return;
    const onDocClick = (event) => {
      if (chainMenuRef.current && !chainMenuRef.current.contains(event.target)) {
        setChainMenuOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setChainMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [chainMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    setFastFee(null);
    setFastFeeErr(null);
    const source = SOURCE_CHAINS.find(chain => chain.id === sourceChainId);
    if (!source) return;
    fetchRouteFees(source.domain, INJECTIVE.domain)
      .then((entries) => {
        if (cancelled) return;
        setFastFee(findFeeEntry(entries, FAST_FINALITY) || null);
      })
      .catch((err) => { if (!cancelled) setFastFeeErr(err.shortMessage || err.message); });
    return () => { cancelled = true; };
  }, [sourceChainId]);

  const handleBridge = useCallback(async () => {
    if (!isPositiveTokenAmount(amount)) return;
    const usdcBalanceBefore = usdcBalance || 0;
    setError(null);
    setSuccess(null);
    setBridging(true);
    setPhase(null);
    setPhaseData(null);
    try {
      const result = await executeBridge({
        sourceChainId,
        amountHuman: amount,
        senderEvm: ethAddress,
        recipientEvm: ethAddress,
        transferMode,
        onPhase: (nextPhase, data) => {
          setPhase(nextPhase);
          setPhaseData(data || null);
        },
      });
      setSuccess(result);
      const expectedDelta = Number(amount) || 0;
      const expectedBalance = usdcBalanceBefore + expectedDelta;

      if (result.evmBalanceConfirmed) {
        applyUsdcBalanceFloor(expectedBalance);
      }

      refreshBalances();
      pollBalancesUntilChange({
        expectedDelta,
        startBalance: usdcBalanceBefore,
      }).catch(() => {});
    } catch (err) {
      const message = err.shortMessage || err.message || String(err);
      setError(
        message.includes('User denied') || message.includes('user rejected')
          ? 'Transaction cancelled'
          : message,
      );
    } finally {
      setBridging(false);
    }
  }, [
    amount,
    sourceChainId,
    ethAddress,
    injAddress,
    usdcBalance,
    transferMode,
    refreshBalances,
    pollBalancesUntilChange,
    applyUsdcBalanceFloor,
  ]);

  const handleMax = () => {
    if (srcBalance && srcBalance > 0n) {
      setAmount(sanitizeDecimalInput(formatUnits(srcBalance, 6)));
      setError(null);
      setSuccess(null);
    }
  };

  const balanceLabel = srcBalance != null
    ? `${formatUsdcBalance(formatUnits(srcBalance, 6))} USDC`
    : balanceErr
      ? 'unavailable'
      : '…';
  const phaseLabel = phase ? (PHASE_COPY[phase] || phase) : null;
  const sourceNetworkLabel = networkLabel(sourceChain.name);
  const injectiveNetworkLabel = networkLabel(INJECTIVE.name);

  let fastFeeLabel = 'quote…';
  if (fastFeeErr) {
    fastFeeLabel = 'Unavailable';
  } else if (fastFee) {
    if (fastFee.minimumFee === 0) {
      fastFeeLabel = 'free';
    } else {
      let amountUnits = 0n;
      try { amountUnits = parseUnits(amount || '0', 6); } catch { /* ignore */ }
      if (amountUnits > 0n) {
        const maxFee = feeBpsToMaxFee(amountUnits, fastFee.minimumFee);
        const usdc = Number(formatUnits(maxFee, 6)).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        });
        fastFeeLabel = `≤ ${usdc} USDC`;
      } else {
        fastFeeLabel = `${fastFee.minimumFee} bps`;
      }
    }
  }

  return (
    <div
      className="up-bridge-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !bridging) onClose();
      }}
    >
      <section
        className="up-bridge-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="up-bridge-title"
      >
        <header className="up-bridge-header">
          <div>
            <div className="up-bridge-kicker">Add funds · CCTP V2</div>
            <h2 id="up-bridge-title">Bridge USDC to {injectiveNetworkLabel}</h2>
          </div>
          <button
            type="button"
            className="up-bridge-close"
            onClick={onClose}
            disabled={bridging}
            aria-label="Close bridge"
          >
            ×
          </button>
        </header>

        <div className="up-bridge-body">
          <div className="up-bridge-panel">
            <div className="up-bridge-label-row">
              <span>From</span>
              <span>
                Balance: {balanceLabel}{' '}
                {srcBalance && srcBalance > 0n && (
                  <button type="button" onClick={handleMax} disabled={bridging}>MAX</button>
                )}
              </span>
            </div>

            <div className="up-bridge-panel-main">
              <div ref={chainMenuRef} className="up-chain-picker">
                <button
                  type="button"
                  className="up-chain-trigger"
                  onClick={() => !bridging && setChainMenuOpen(open => !open)}
                  disabled={bridging}
                  aria-haspopup="listbox"
                  aria-expanded={chainMenuOpen}
                >
                  <ChainLogo chainId={sourceChain.id} name={sourceChain.name} size={22} />
                  <span>{sourceNetworkLabel}</span>
                  <span className="up-chain-caret">{chainMenuOpen ? '▲' : '▼'}</span>
                </button>

                {chainMenuOpen && (
                  <div className="up-chain-menu" role="listbox" aria-label="Bridge source chain">
                    <div className="up-chain-menu-head">Bridge from</div>
                    {SOURCE_CHAINS.map((chain) => {
                      const active = chain.id === sourceChainId;
                      return (
                        <button
                          key={chain.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`up-chain-option ${active ? 'is-active' : ''}`}
                          onClick={() => {
                            setSourceChainId(chain.id);
                            setChainMenuOpen(false);
                          }}
                        >
                          <ChainLogo chainId={chain.id} name={chain.name} size={24} />
                          <span>{networkLabel(chain.name)}</span>
                          {active && <span className="up-chain-selected">●</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="up-bridge-value-block up-bridge-amount-block">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => {
                    setAmount(sanitizeDecimalInput(event.target.value));
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={bridging}
                  autoComplete="off"
                  aria-label="USDC bridge amount"
                />
                <div className="up-bridge-token-line">
                  <CoinLogo symbol="USDC" size={14} />
                  <span>USDC</span>
                </div>
              </div>
            </div>
          </div>

          <div className="up-bridge-direction" aria-hidden="true">
            <svg className="up-bridge-direction-icon" viewBox="0 0 24 24">
              <path d="M12 4v14" />
              <path d="m7.5 13.5 4.5 4.5 4.5-4.5" />
            </svg>
          </div>

          <div className="up-bridge-panel">
            <div className="up-bridge-label-row"><span>To</span></div>
            <div className="up-bridge-panel-main">
              <div className="up-bridge-chain-name">
                <ChainLogo chainId={INJECTIVE.id} name={INJECTIVE.name} size={22} />
                <strong>{injectiveNetworkLabel}</strong>
              </div>
              <div className="up-bridge-value-block up-bridge-received-block">
                <div className={`up-bridge-received ${amount ? 'has-amount' : ''}`}>
                  {amount || '-'}
                </div>
                <div className="up-bridge-token-line is-end">
                  <CoinLogo symbol="USDC" size={14} />
                  <span>USDC</span>
                </div>
              </div>
            </div>
          </div>

          <div className="up-bridge-speed" role="group" aria-label="Bridge speed">
            {[
              { id: 'standard', label: 'Standard', sub: 'free' },
              { id: 'fast', label: 'Fast', sub: fastFeeLabel },
            ].map((option) => {
              const active = transferMode === option.id;
              const disabled = bridging || (option.id === 'fast' && fastFeeErr);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={active ? 'is-active' : ''}
                  onClick={() => !disabled && setTransferMode(option.id)}
                  disabled={disabled}
                  aria-pressed={active}
                >
                  <strong>{option.label}</strong>
                  <span>{option.sub}</span>
                </button>
              );
            })}
          </div>

          {bridging && phaseLabel && (
            <div className="up-bridge-state is-phase" aria-live="polite">
              {phaseLabel}
              {phaseData?.txHash && <span>{shortHash(phaseData.txHash)}</span>}
            </div>
          )}

          {error && (
            <div className="up-bridge-state is-error" role="alert">{error}</div>
          )}

          {success && (
            <div className="up-bridge-state is-success" aria-live="polite">
              Native USDC arrived on {injectiveNetworkLabel}.
              <span>
                burn: <a
                  href={`${success.srcExplorer}/tx/${success.burnHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortHash(success.burnHash)}
                </a>
              </span>
              <span>
                mint: <a
                  href={txExplorerUrl(success.mintHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortHash(success.mintHash)}
                </a>
              </span>
            </div>
          )}

          {!success ? (
            <button
              type="button"
              className="up-bridge-submit"
              onClick={handleBridge}
              disabled={bridging || !isPositiveTokenAmount(amount) || !ethAddress}
            >
              {bridging ? 'Bridging…' : (
                <>
                  <span>Bridge from {sourceNetworkLabel}</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          ) : (
            <button type="button" className="up-bridge-done" onClick={onClose}>Done</button>
          )}
        </div>
      </section>
    </div>
  );
}
