export const WALLET_BALANCE_POLL_MS = 15_000;

export function startWalletBalanceRefresh({
  refreshBalances,
  windowTarget = globalThis.window,
  documentTarget = globalThis.document,
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
}) {
  let refreshPending = false;

  const refreshIfVisible = async () => {
    if (documentTarget?.visibilityState === 'hidden' || refreshPending) return false;

    refreshPending = true;
    try {
      await refreshBalances();
      return true;
    } finally {
      refreshPending = false;
    }
  };

  const onFocus = () => { void refreshIfVisible(); };
  const onVisibilityChange = () => {
    if (documentTarget?.visibilityState === 'visible') void refreshIfVisible();
  };
  const interval = setIntervalFn(() => { void refreshIfVisible(); }, WALLET_BALANCE_POLL_MS);

  windowTarget?.addEventListener('focus', onFocus);
  documentTarget?.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    clearIntervalFn(interval);
    windowTarget?.removeEventListener('focus', onFocus);
    documentTarget?.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
