import { useEffect, useMemo, useState } from 'react';
import CoinLogo from './CoinLogo';
import { formatPrice, formatUsdcBalance, liquidationPrice } from '../data/mockData';
import { formatSpendableAmountInput, sanitizeAmountInput } from '../services/amountInput';
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

export default function MarketCard({
  cardRef = null,
  market,
  balance,
  requestAddress,
  connected,
  connecting,
  rfqReady = false,
  authorizing = false,
  opened = false,
  opening = false,
  searchHighlighted = false,
  tradeBusy = false,
  error = '',
  onConnect,
  onAuthorize,
  onConfirm,
}) {
  const [stake, setStake] = useState('');
  const price = Number(market.price) || 0;
  const priceDecimals = market.priceDecimals;
  const isUp = Number(market.change24h || 0) >= 0;
  const balanceNum = Number(balance || 0);
  const stakeNum = Number(stake) || 0;
  const maxConfig = useMemo(() => maxLongConfigForMarket(market), [market]);
  const leverage = maxConfig.leverage;
  const positionSize = stakeNum * leverage;
  const insufficient = connected && stakeNum > balanceNum;
  const emptyStake = stakeNum < 1;
  const liqPrice = useMemo(() => liquidationPrice({
    entryPrice: price,
    leverage,
    direction: UP_ONLY_DIRECTION,
    mmr: Number(market.maintenanceMarginRatio) || 0.025,
  }), [price, market.maintenanceMarginRatio, leverage]);

  const canSubmit = connected
    && rfqReady
    && !opening
    && !tradeBusy
    && !emptyStake
    && !insufficient
    && maxConfig.allowed;

  const ctaLabel = (() => {
    if (!connected) return connecting ? 'CONNECTING...' : 'CONNECT WALLET';
    if (!rfqReady) return authorizing ? 'AUTHORIZING...' : 'AUTHORIZE WALLET';
    if (opening) return 'OPENING...';
    if (tradeBusy) return 'ORDER PENDING...';
    if (!maxConfig.allowed) return 'MAX UNAVAILABLE';
    if (emptyStake) return 'ENTER CASH';
    if (insufficient) return 'NEED CASH';
    return 'UPONLY >';
  })();

  const handleAmount = (raw) => setStake(sanitizeAmountInput(raw));
  const handleHalf = () => setStake(formatSpendableAmountInput(balanceNum / 2));
  const handleAll = () => setStake(formatSpendableAmountInput(balanceNum));

  const handleSubmit = () => {
    if (!connected) {
      onConnect?.();
      return;
    }
    if (!rfqReady) {
      if (!authorizing) onAuthorize?.();
      return;
    }
    if (!canSubmit) return;

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
    if (!price || price <= 0) return;

    let cancelled = false;
    const sendPrequotes = async () => {
      if (cancelled) return;
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
        // Warmup only. The final click still validates RFQ input.
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
    price,
  ]);

  return (
    <article
      ref={cardRef}
      className={`up-card ${searchHighlighted ? 'is-search-match' : ''}`}
    >
      <div className="up-hot-ribbon">NO SHORTS - NO SLIDERS - MAX ONLY</div>

      <div className="up-card-top">
        <div className="up-token">
          <CoinLogo symbol={market.symbol} logoUrl={market.logo} size={42} />
          <div className="up-token-main">
            <h2>{market.symbol}</h2>
            <div className="up-market-badges" aria-label={`${market.symbol} trading constraints`}>
              <span className="up-market-badge up-market-badge-direction">Up</span>
              <span className="up-market-badge up-market-badge-leverage">{maxConfig.label}</span>
            </div>
          </div>
        </div>
        <div className={`up-heat ${isUp ? 'is-up' : 'is-down'}`}>
          {isUp ? '+' : '-'}{Math.abs(Number(market.change24h || 0)).toFixed(2)}%
        </div>
      </div>

      <div className="up-price-row">
        <div className="up-price-panel">
          <span className="up-label">Mark Price</span>
          <strong className="up-price">${formatPrice(price, priceDecimals)}</strong>
        </div>
        <div className="up-price-panel up-price-panel-liq">
          <span className="up-label">Est Liq</span>
          <strong className="up-liq-price">${formatPrice(liqPrice, priceDecimals)}</strong>
        </div>
      </div>

      <div className="up-amount-row">
        <label htmlFor={`stake-${market.marketId}`}>
          Cash down
          <span>${formatUsdcBalance(balanceNum)} ready</span>
        </label>
        <div className="up-amount-control">
          <span>$</span>
          <input
            id={`stake-${market.marketId}`}
            type="text"
            inputMode="decimal"
            value={stake}
            onChange={event => handleAmount(event.target.value)}
            placeholder="0"
            aria-label={`${market.symbol} UpOnly amount`}
          />
        </div>
        <div className="up-chip-row" aria-label="Quick amount">
          <button type="button" className="up-chip" onClick={handleHalf} disabled={!connected || balanceNum <= 0}>
            HALF
          </button>
          <button type="button" className="up-chip" onClick={handleAll} disabled={!connected || balanceNum <= 0}>
            ALL-IN
          </button>
        </div>
      </div>

      <div className="up-position-strip">
        <span>Position size</span>
        <strong>${formatPrice(positionSize)}</strong>
      </div>

      {(insufficient || error) && (
        <div className="up-error-stamp" role="alert">
          {error || `Need more USDC. Balance is $${formatUsdcBalance(balanceNum)}.`}
        </div>
      )}

      <button
        type="button"
        className="up-cta"
        onClick={handleSubmit}
        disabled={connecting || (connected && rfqReady && !canSubmit)}
      >
        {ctaLabel}
      </button>

      {opened && (
        <div className="up-stamp-overlay" aria-live="polite">
          <div className="up-stamp">UPONLY OPENED!</div>
        </div>
      )}
    </article>
  );
}
