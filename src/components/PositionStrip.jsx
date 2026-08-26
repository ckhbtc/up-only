import { useEffect, useMemo, useState } from 'react';
import { formatDollar, formatPrice } from '../data/mockData';
import {
  derivePositionLiqPrice,
  isDangerouslyCloseToLiquidation,
  liquidationCushionRatio,
} from '../services/liquidationRisk';
import {
  getPositionDisplay,
  getPositionMargin,
  getPositionStripPage,
  getPositionStripTotals,
  getPositionValue,
  sortPositionsByValue,
} from '../services/positionStrip';
import CoinLogo from './CoinLogo';

const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  winning: { label: 'WINNING', className: 'is-winning' },
  at_risk: { label: 'AT RISK', className: 'is-at-risk' },
  danger: { label: 'DANGER', className: 'is-danger' },
  opening: { label: 'MATCHED', className: 'is-opening' },
};

function plainDollar(value) {
  const number = Number(value) || 0;
  return `${number < 0 ? '-' : ''}$${Math.abs(number).toFixed(2)}`;
}

function PositionCard({ position, now, onCashOut, tradeBusy }) {
  const display = getPositionDisplay(position, now);
  const isPositive = display.inOpenPnlGrace || display.pnl >= 0;
  const dangerClose = !isPositive && isDangerouslyCloseToLiquidation(position);
  const status = position.optimistic
    ? STATUS_CONFIG.opening
    : isPositive
      ? STATUS_CONFIG.winning
      : dangerClose
        ? STATUS_CONFIG.danger
        : STATUS_CONFIG.at_risk;
  const statusLabel = position.optimistic
    ? (position.optimisticConfirmed ? 'CONFIRMED' : 'MATCHED')
    : status.label;
  const priceDecimals = position.market?.priceDecimals;
  const markPrice = Number(position.markPrice || position.currentPrice);
  const entryPrice = Number(position.entryPrice);
  const liqPrice = derivePositionLiqPrice(position);
  const cushionRatio = liquidationCushionRatio({
    entryPrice,
    markPrice,
    liqPrice,
    direction: position.direction,
  });
  const liqDistancePct = markPrice > 0 && liqPrice > 0
    ? (Math.abs(markPrice - liqPrice) / markPrice) * 100
    : null;
  const cashOutDisabled = Boolean(position.optimistic) || tradeBusy;
  const cashOutLabel = position.optimistic
    ? 'Confirming...'
    : tradeBusy
      ? 'Order pending...'
      : `Cash Out ${formatDollar(display.pnl)}`;

  return (
    <article className={`up-position-card ${status.className}`}>
      <div className="up-position-status">
        <span>{statusLabel}</span>
        <span>{plainDollar(getPositionValue(position, now))} value</span>
      </div>
      <div className="up-position-card-body">
        <div className="up-position-main-row">
          <div className="up-position-asset">
            <CoinLogo
              symbol={position.asset}
              logoUrl={position.logo || position.market?.logo}
              size={26}
            />
            <strong>{position.asset}</strong>
          </div>
          <strong className="up-position-pnl">{formatDollar(display.pnl)}</strong>
        </div>

        <div className="up-position-price-row">
          <span>${formatPrice(getPositionMargin(position))} in</span>
          <span>
            {formatPrice(entryPrice, priceDecimals)} → {formatPrice(markPrice, priceDecimals)}
          </span>
        </div>

        {liqPrice && cushionRatio != null ? (
          <div className="up-position-liq">
            <div className="up-position-liq-track" aria-hidden="true">
              <span style={{ width: `${Math.round(cushionRatio * 100)}%` }} />
            </div>
            <div className="up-position-liq-label">
              Liq ${formatPrice(liqPrice, priceDecimals)} · {liqDistancePct.toFixed(1)}% away
            </div>
          </div>
        ) : (
          <div className="up-position-liq up-position-liq-unavailable">
            <div className="up-position-liq-track" aria-hidden="true" />
            <div className="up-position-liq-label">Liquidation syncing</div>
          </div>
        )}

        <button
          type="button"
          className="up-position-cash-out"
          onClick={() => onCashOut(position)}
          disabled={cashOutDisabled}
        >
          {cashOutLabel}
        </button>
      </div>
    </article>
  );
}

export default function PositionStrip({
  positions = [],
  onCashOut,
  onCashOutAll,
  devMode,
  tradeBusy = false,
}) {
  const [now, setNow] = useState(() => Date.now());
  const [pageIndex, setPageIndex] = useState(0);
  const hasOpenPnlGrace = positions.some(
    position => Number(position.pnlGraceExpiresAt || 0) > now,
  );

  useEffect(() => {
    if (!hasOpenPnlGrace) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [hasOpenPnlGrace]);

  const sortedPositions = useMemo(
    () => sortPositionsByValue(positions, now),
    [positions, now],
  );
  const totals = useMemo(
    () => getPositionStripTotals(positions, now),
    [positions, now],
  );
  const pageCount = Math.max(1, Math.ceil(sortedPositions.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visiblePositions = getPositionStripPage(sortedPositions, safePageIndex, PAGE_SIZE);
  const firstVisible = safePageIndex * PAGE_SIZE + 1;
  const lastVisible = Math.min(firstVisible + PAGE_SIZE - 1, sortedPositions.length);

  useEffect(() => {
    setPageIndex(0);
  }, [sortedPositions.length]);

  return (
    <section className="up-positions" aria-labelledby="up-positions-title">
      <div className="up-positions-header">
        <div className="up-section-title-row">
          <h2 id="up-positions-title">Your positions</h2>
          <span>{positions.length} open · biggest first</span>
        </div>

        {positions.length > 0 && (
          <div className="up-positions-tools">
            {devMode && (
              <button
                type="button"
                className="up-position-close-all"
                onClick={onCashOutAll}
                disabled={tradeBusy}
              >
                Cash out all
              </button>
            )}
            <div className={`up-position-total ${totals.openPnl < 0 ? 'is-negative' : 'is-positive'}`}>
              <span>Open PnL</span>
              <strong>{formatDollar(totals.openPnl)}</strong>
            </div>
            <div className="up-position-total">
              <span>Exposure</span>
              <strong>${formatPrice(totals.exposure)}</strong>
            </div>
            <div className="up-position-pager">
              <span>{firstVisible}-{lastVisible} of {sortedPositions.length}</span>
              <button
                type="button"
                onClick={() => setPageIndex(index => Math.max(0, index - 1))}
                disabled={safePageIndex === 0}
                aria-label="Previous positions"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => setPageIndex(index => Math.min(pageCount - 1, index + 1))}
                disabled={safePageIndex >= pageCount - 1}
                aria-label="Next positions"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {positions.length > 0 ? (
        <div className="up-position-viewport">
          <div className="up-position-row">
            {visiblePositions.map(position => (
              <PositionCard
                key={position.id}
                position={position}
                now={now}
                onCashOut={onCashOut}
                tradeBusy={tradeBusy}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-bets-stage" aria-live="polite">
          <div className="empty-bets-banner">
            <span className="empty-bets-word">No positions yet</span>
          </div>
        </div>
      )}
    </section>
  );
}
