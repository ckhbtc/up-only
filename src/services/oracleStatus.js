const TRUECURRENT_UI_API_URL = 'https://api.ui.injective.network/api/v1';

export const ORACLE_STATUS_POLL_MS = 60_000;

function oracleStatusRequestForMarket(market) {
  const provider = String(market?.provider || '');
  const oracleStatusId = String(market?.oracleStatusId || '').trim();

  if (provider === 'pythEquity' && oracleStatusId) {
    return {
      provider,
      oracle: oracleStatusId,
      path: `pyth-pro/${encodeURIComponent(oracleStatusId)}`,
    };
  }

  if (provider === 'seda') {
    const oracle = oracleStatusId.split('/')[0] || String(market?.marketId || '').trim();
    if (!oracle) return null;
    return {
      provider,
      oracle,
      path: `seda/${encodeURIComponent(oracle)}`,
    };
  }

  return null;
}

export function oracleStatusUrlForMarket(market) {
  const request = oracleStatusRequestForMarket(market);
  return request ? `${TRUECURRENT_UI_API_URL}/price_feeds/${request.path}` : null;
}

export function hasOracleStatusFeed(market) {
  return Boolean(oracleStatusRequestForMarket(market));
}

export async function fetchMarketOracleStale(market, fetchImpl = globalThis.fetch) {
  const request = oracleStatusRequestForMarket(market);
  if (!request) return false;

  const response = await fetchImpl(`${TRUECURRENT_UI_API_URL}/price_feeds/${request.path}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Oracle status request failed (${response.status || 'unknown'})`);
  }

  const payload = await response.json();
  const data = payload?.data || payload || {};

  if (request.provider === 'pythEquity') {
    return data?.market_hours?.is_open === false;
  }

  return data?.was_stale === true;
}
