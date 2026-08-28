const DEFAULT_ALLOWED_ORIGINS = 'https://uponly.click,http://localhost:36000';
const DEFAULT_RATE_LIMIT = 3;
const DEFAULT_RATE_WINDOW_MS = 60 * 60 * 1000;

export function parseAllowedOrigins(value = DEFAULT_ALLOWED_ORIGINS) {
  const origins = new Set();

  for (const candidate of String(value || '').split(',')) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    try {
      const url = new URL(trimmed);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      if (url.origin !== trimmed.replace(/\/$/, '')) continue;
      origins.add(url.origin);
    } catch {
      // Ignore malformed allowlist entries instead of weakening the check.
    }
  }

  return origins;
}

export function isAllowedFaucetRequest({
  origin,
  host,
  protocol,
  fetchSite,
}, allowedOrigins) {
  if (!origin || !host || !protocol || fetchSite !== 'same-origin') return false;

  let normalizedOrigin;
  try {
    const url = new URL(origin);
    if (url.origin !== origin.replace(/\/$/, '')) return false;
    normalizedOrigin = url.origin;
  } catch {
    return false;
  }

  const requestOrigin = `${protocol}://${host}`;
  return normalizedOrigin === requestOrigin && allowedOrigins.has(normalizedOrigin);
}

export function createSlidingWindowLimiter({
  limit = DEFAULT_RATE_LIMIT,
  windowMs = DEFAULT_RATE_WINDOW_MS,
  now = Date.now,
} = {}) {
  const hitsByKey = new Map();

  return {
    allow(key) {
      const timestamp = now();
      const hits = (hitsByKey.get(key) || []).filter((hit) => timestamp - hit < windowMs);
      if (hits.length >= limit) {
        hitsByKey.set(key, hits);
        return false;
      }
      hits.push(timestamp);
      hitsByKey.set(key, hits);
      return true;
    },
  };
}

const allowedOrigins = parseAllowedOrigins(process.env.FAUCET_ALLOWED_ORIGINS);
const requestLimiter = createSlidingWindowLimiter({
  limit: Number.parseInt(process.env.FAUCET_IP_LIMIT || `${DEFAULT_RATE_LIMIT}`, 10),
  windowMs: Number.parseInt(
    process.env.FAUCET_IP_WINDOW_MS || `${DEFAULT_RATE_WINDOW_MS}`,
    10,
  ),
});

export function requireFaucetAppRequest(req, res, next) {
  res.setHeader('Vary', 'Origin');
  const allowed = isAllowedFaucetRequest({
    origin: req.get('origin') || '',
    host: req.get('host') || '',
    protocol: req.protocol,
    fetchSite: req.get('sec-fetch-site') || '',
  }, allowedOrigins);

  if (!allowed) {
    return res.status(403).json({ error: 'Faucet access denied.' });
  }

  if (!requestLimiter.allow(req.ip || 'unknown')) {
    res.setHeader('Retry-After', '3600');
    return res.status(429).json({ error: 'Faucet request limit reached. Please try again later.' });
  }

  return next();
}
