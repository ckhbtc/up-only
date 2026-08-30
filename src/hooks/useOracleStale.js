import { useEffect, useState } from 'react';
import {
  ORACLE_STATUS_POLL_MS,
  fetchMarketOracleStale,
  hasOracleStatusFeed,
} from '../services/oracleStatus';

export default function useOracleStale(market, cardRef) {
  const [stale, setStale] = useState(false);
  const provider = String(market?.provider || '');
  const oracleStatusId = String(market?.oracleStatusId || '');
  const marketId = String(market?.marketId || '');

  useEffect(() => {
    setStale(false);
    if (!hasOracleStatusFeed({ provider, oracleStatusId, marketId })) return undefined;

    let active = true;
    let interval = null;

    const refresh = async () => {
      try {
        const nextStale = await fetchMarketOracleStale({ provider, oracleStatusId, marketId });
        if (active) setStale(nextStale);
      } catch (error) {
        console.warn('Oracle status refresh failed:', error);
      }
    };

    const start = () => {
      if (interval) return;
      void refresh();
      interval = setInterval(() => void refresh(), ORACLE_STATUS_POLL_MS);
    };

    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    const card = cardRef?.current;
    if (!card || typeof IntersectionObserver === 'undefined') {
      start();
      return () => {
        active = false;
        stop();
      };
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    }, { rootMargin: '240px 0px' });
    observer.observe(card);

    return () => {
      active = false;
      stop();
      observer.disconnect();
    };
  }, [provider, oracleStatusId, marketId, cardRef]);

  return stale;
}
