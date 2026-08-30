import { useId } from 'react';
import useOracleStale from '../hooks/useOracleStale';

export const ORACLE_STALE_TOOLTIP = 'The oracle for this market is currently closed. You may have issues getting filled, but feel free to YOLO it anyway.';

export function OracleStaleBadgeView() {
  const tooltipId = useId();

  return (
    <button
      type="button"
      className="up-market-badge up-market-badge-oracle-stale"
      aria-label="Closed oracle warning"
      aria-describedby={tooltipId}
    >
      CLOSED
      <span id={tooltipId} className="up-oracle-stale-tooltip" role="tooltip">
        {ORACLE_STALE_TOOLTIP}
      </span>
    </button>
  );
}

export default function OracleStaleBadge({ market, cardRef }) {
  const stale = useOracleStale(market, cardRef);
  return stale ? <OracleStaleBadgeView /> : null;
}
