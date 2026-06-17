import { useEffect, useMemo, useState } from 'react';
import Sparkline from './Sparkline';
import { formatPrice, formatUsdcBalance, liquidationPrice } from '../data/mockData';
import { RFQ_OPEN_SLIPPAGE } from '../services/leverageLimits';
import { RFQ_PREQUOTE_INTERVAL_MS } from '../services/rfqConstants';
import { buildRfqOrderInput, sendRfqPrequoteRequest } from '../services/rfq';
import {
  UP_ONLY_DIRECTION,
  UP_ONLY_LEVERAGE_KEY,
  UP_ONLY_SIDE,
  UP_ONLY_TARGET_MODE,
  maxLongConfigForMarket,
} from '../services/upOnly';

const QUICK_STAKES = [10, 25, 50, 100, 250];

export default function BetPanel({
  market,
  balance,
  requestAddress,
  rfqReady = true,
  authorizing = false,
  onAuthorize,
  onConfirm,
  onClose,
}) {
  const [stake, setStake] = useState('50');

  const priceDecimals = market.priceDecimals;
  const stakeNum = Number(stake) || 0;
  const maxConfig = useMemo(() => maxLongConfigForMarket(market), [market]);
  const leverage = maxConfig.leverage;
  const liqPrice = useMemo(() => liquidationPrice({
    entryPrice: market.price,
    leverage,
    direction: UP_ONLY_DIRECTION,
    mmr: Number(market.maintenanceMarginRatio) || 0.025,
  }), [market.price, market.maintenanceMarginRatio, leverage]);

  const sanitizeIntInput = (raw) => raw.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');

  const handleStakeInput = (raw) => {
    setStake(sanitizeIntInput(raw));
  };

  const handleStakeButton = (val) => {
    setStake(String(Math.max(0, Math.floor(val))));
  };

  const inputsReady = stakeNum >= 1 && stakeNum <= balance && maxConfig.allowed;
  const needsAuthorization = !rfqReady;
  const canPlaceOrder = inputsReady && rfqReady;
  const ctaEnabled = needsAuthorization ? Boolean(onAuthorize) && !authorizing : canPlaceOrder;

  const handleCtaClick = () => {
    if (needsAuthorization) {
      if (!authorizing) onAuthorize?.();
      return;
    }
    if (!canPlaceOrder) return;
    onConfirm({
      market,
      direction: UP_ONLY_DIRECTION,
      side: UP_ONLY_SIDE,
      stake: stakeNum,
      winTarget: 0,
      aggr: UP_ONLY_LEVERAGE_KEY,
      aggrLabel: maxConfig.label,
      aggrColor: maxConfig.color,
      leverage,
      targetMode: UP_ONLY_TARGET_MODE,
      targetPrice: null,
      liqPrice,
    });
  };

  useEffect(() => {
    if (!requestAddress || !rfqReady || !maxConfig.allowed || stakeNum < 1) return;

    let cancelled = false;
    const sendPrequotes = async () => {
      if (cancelled) return;
      const price = market.price;
      if (!price || price <= 0) return;

      try {
        const input = buildRfqOrderInput({
          market,
          oraclePrice: price,
          side: UP_ONLY_SIDE,
          stakeUsdt: stakeNum,
          leverage,
          slippage: RFQ_OPEN_SLIPPAGE,
        });
        await sendRfqPrequoteRequest({
          requestAddress,
          marketId: market.marketId,
          ...input,
        });
      } catch {
        // Prequotes are a warmup path only. The final submit still validates.
      }
    };

    void sendPrequotes();
    const interval = setInterval(() => {
      void sendPrequotes();
    }, RFQ_PREQUOTE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    requestAddress,
    rfqReady,
    maxConfig.allowed,
    stakeNum,
    leverage,
    market,
  ]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 24,
      width: '100%',
      maxWidth: 420,
      animation: 'slide-up 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
          }}>Max long</div>
          <div style={{
            fontSize: 22, fontWeight: 700,
            fontFamily: 'var(--font-heading)', lineHeight: 1.1,
          }}>{market.symbol}</div>
          <div style={{
            fontSize: 22, fontWeight: 700,
            fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums', marginTop: 4,
          }}>${formatPrice(market.price, priceDecimals)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <Sparkline data={market.sparkline} width={100} height={40} color={market.change24h >= 0 ? 'var(--green)' : 'var(--red)'} />
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-muted)', fontSize: 11, padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
          }}>Back</button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 18,
      }}>
        <div style={{
          background: 'var(--green-dim)',
          border: '1px solid var(--green)',
          borderRadius: 8,
          padding: '12px 14px',
        }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)',
            textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3,
          }}>Direction</div>
          <div style={{
            fontSize: 17, fontWeight: 700,
            color: 'var(--green)', fontFamily: 'var(--font-heading)',
          }}>Long only</div>
        </div>
        <div style={{
          background: `${maxConfig.color}15`,
          border: `1px solid ${maxConfig.color}`,
          borderRadius: 8,
          padding: '12px 14px',
        }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3,
          }}>Leverage</div>
          <div style={{
            fontSize: 17, fontWeight: 700,
            color: maxConfig.color, fontFamily: 'var(--font-heading)',
          }}>{maxConfig.label}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6,
        }}>Amount</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 20, fontWeight: 600, color: 'var(--text-muted)',
          }}>$</span>
          <input
            type="text"
            inputMode="numeric"
            value={stake}
            onChange={e => handleStakeInput(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '14px 14px 14px 32px', color: 'var(--text-primary)',
              fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-heading)',
              fontVariantNumeric: 'tabular-nums', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {QUICK_STAKES.map(amt => (
            <button
              key={amt}
              onClick={() => handleStakeButton(amt)}
              style={{
                flex: 1, background: stakeNum === amt ? 'var(--accent-dim)' : 'var(--bg-primary)',
                border: `1px solid ${stakeNum === amt ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6, padding: '6px 0', color: stakeNum === amt ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-heading)',
              }}
            >${amt}</button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '12px 16px', marginBottom: 12, textAlign: 'center',
      }}>
        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4,
        }}>
          Liquidation estimate
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)',
          color: 'var(--red)', fontVariantNumeric: 'tabular-nums',
        }}>
          ${formatPrice(liqPrice, priceDecimals)}
        </div>
      </div>

      {stakeNum > balance && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: 12, color: 'var(--red)', textAlign: 'center',
        }}>
          Insufficient balance. You have ${formatUsdcBalance(balance)}.
        </div>
      )}

      {!maxConfig.allowed && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: 12, color: 'var(--red)', textAlign: 'center', lineHeight: 1.5,
        }}>
          Max leverage is not available for {market.symbol}.
        </div>
      )}

      {!rfqReady && (
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: 12, color: 'var(--accent)', textAlign: 'center', lineHeight: 1.5,
        }}>
          Authorize your wallet before opening a long.
        </div>
      )}

      <div style={{
        fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
        marginBottom: 16, lineHeight: 1.6,
      }}>
        If {market.symbol} reaches{' '}
        <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          ${formatPrice(liqPrice, priceDecimals)}
        </span>, you may lose your ${stakeNum} position.
      </div>

      <button
        onClick={handleCtaClick}
        disabled={!ctaEnabled}
        style={{
          width: '100%',
          background: ctaEnabled ? 'var(--accent-grad)' : 'var(--bg-primary)',
          color: ctaEnabled ? 'var(--on-accent)' : 'var(--text-muted)',
          border: ctaEnabled ? 'none' : '1px solid var(--border)',
          borderRadius: 8, padding: '16px 0',
          fontSize: 16, fontWeight: 700,
          cursor: ctaEnabled ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--font-heading)',
          letterSpacing: 0.5,
          opacity: ctaEnabled ? 1 : 0.5,
        }}
      >
        {needsAuthorization
          ? (authorizing ? 'Authorizing...' : 'Authorize Wallet')
          : 'Open Max Long'}
      </button>
    </div>
  );
}
