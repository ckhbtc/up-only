import { useEffect, useMemo, useRef, useState } from 'react';
import CoinLogo from './CoinLogo';
import OracleStaleBadge from './OracleStaleBadge';
import PriceText from './PriceText';
import { formatPrice, formatUsdcBalance, liquidationPrice } from '../data/mockData';
import { formatSpendableAmountInput, sanitizeAmountInput } from '../services/amountInput';
import { RFQ_OPEN_SLIPPAGE } from '../services/leverageLimits';
import { RFQ_PREQUOTE_INTERVAL_MS } from '../services/rfqConstants';
import { buildRfqOrderInput, sendRfqPrequoteRequest } from '../services/rfq';
import { resetAmountAfterSubmission } from '../services/tradeSubmission';
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
  tradeBusy = false,
  onConnect,
  onAuthorize,
  onConfirm,
}) {
  const marketCardRef = useRef(null);
  const [stake, setStake] = useState('');
  const price = Number(market.price) || 0;
  const priceDecimals = market.priceDecimals;
  const priceLabel = formatPrice(price, priceDecimals);
  const displayedChange = Number((Number(market.change24h) || 0).toFixed(2));
  const changeState = displayedChange > 0 ? 'is-up' : displayedChange < 0 ? 'is-down' : 'is-neutral';
  const balanceNum = Number(balance || 0);
  const stakeNum = Number(stake) || 0;
  const maxConfig = useMemo(() => maxLongConfigForMarket(market), [market]);
  const leverage = maxConfig.leverage;
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

  const handleSubmit = async () => {
    if (!connected) {
      onConnect?.();
      return;
    }
    if (!rfqReady) {
      if (!authorizing) onAuthorize?.();
      return;
    }
    if (!canSubmit) return;

    await resetAmountAfterSubmission(
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
      }),
      () => setStake(''),
    );
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
      ref={(node) => {
        marketCardRef.current = node;
        if (typeof cardRef === 'function') cardRef(node);
        else if (cardRef) cardRef.current = node;
      }}
      className="up-card"
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
              <OracleStaleBadge market={market} cardRef={marketCardRef} />
            </div>
          </div>
        </div>
        <div className={`up-heat ${changeState}`}>
          {displayedChange > 0 ? '+' : displayedChange < 0 ? '-' : ''}{Math.abs(displayedChange).toFixed(2)}%
        </div>
      </div>

      <div className="up-price-row">
        <div className="up-price-panel">
          <span className="up-label">Mark Price</span>
          <strong className="up-price">
            $<span key={priceLabel} className="up-live-mark-price up-card-live-mark-price">
              <PriceText value={priceLabel} />
            </span>
          </strong>
        </div>
        <div className="up-price-panel up-price-panel-liq">
          <span className="up-label">Est Liq</span>
          <strong className="up-liq-price">$<PriceText value={formatPrice(liqPrice, priceDecimals)} /></strong>
        </div>
      </div>

      <div className="up-amount-row">
        <div className="up-amount-control">
          <span>$</span>
          <input
            id={`stake-${market.marketId}`}
            type="text"
            inputMode="decimal"
            data-pair-search-shortcut
            autoComplete="off"
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

      {insufficient && (
        <div className="up-error-stamp" role="alert">
          {`Need more USDC. Balance is $${formatUsdcBalance(balanceNum)}.`}
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
