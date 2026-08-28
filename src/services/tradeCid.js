export const UP_ONLY_CID_PREFIX = 'up-only-';

function randomTradeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createUpOnlyCid() {
  return `${UP_ONLY_CID_PREFIX}${randomTradeId()}`;
}
