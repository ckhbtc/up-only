const APP_VERSION_POLL_MS = 30_000;

export function createAppVersionTracker() {
  let baseline = null;
  return {
    observe(version) {
      if (!version) return false;
      if (baseline === null) {
        baseline = version;
        return false;
      }
      return version !== baseline;
    },
  };
}

export async function fetchAppVersion(fetchImpl = fetch) {
  const response = await fetchImpl('/api/version', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Version check failed (${response.status})`);
  const payload = await response.json();
  if (!payload?.version) throw new Error('Version check returned no version');
  return String(payload.version);
}

export function startAppVersionMonitor(onUpdate, {
  fetchVersion = fetchAppVersion,
  intervalMs = APP_VERSION_POLL_MS,
  documentRef = typeof document === 'undefined' ? null : document,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
} = {}) {
  const tracker = createAppVersionTracker();
  let active = true;
  let checking = false;

  const check = async () => {
    if (!active || checking) return;
    checking = true;
    try {
      if (tracker.observe(await fetchVersion())) onUpdate();
    } catch {
      // A version check must never interfere with trading.
    } finally {
      checking = false;
    }
  };

  const onVisibilityChange = () => {
    if (documentRef?.visibilityState === 'visible') void check();
  };
  void check();
  const interval = setIntervalImpl(() => void check(), intervalMs);
  documentRef?.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    active = false;
    clearIntervalImpl(interval);
    documentRef?.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
