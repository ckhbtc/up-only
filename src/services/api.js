/**
 * Server API surface - kept small. The only thing the server still owns
 * is the faucet (FAUCET_PRIVATE_KEY can't safely live in the browser).
 * AuthZ session keys, trade signing, and broadcast all happen in-browser
 * now via services/grantee.js + services/trade.js.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(path, { method = 'GET', body } = {}, fetchFn = fetch) {
  const res = await fetchFn(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

function isTransientApiError(error) {
  if ([502, 503, 504].includes(Number(error?.status))) return true;
  if (error instanceof TypeError) return true;
  return /Request failed \((502|503|504)\)|failed to fetch|network error/i.test(error?.message || '');
}

export async function callApiWithRetry(path, options, {
  attempts = 4,
  retryDelayMs = 1200,
  sleepFn = sleep,
  fetchFn = fetch,
} = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await call(path, options, fetchFn);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientApiError(error)) throw error;
      await sleepFn(retryDelayMs * (2 ** (attempt - 1)));
    }
  }

  throw lastError;
}

export const api = {
  initAccount: (wallet) => call('/init-account', { method: 'POST', body: { wallet } }),
  relayMint: (message, attestation) =>
    callApiWithRetry('/relay-mint', { method: 'POST', body: { message, attestation } }),
};
