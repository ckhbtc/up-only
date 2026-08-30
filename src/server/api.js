/**
 * Server API surface - minimal. Trade keys stay in-browser. The server only
 * handles operations that do not require custody: faucet, CCTP relay, and
 * RFQ signed-tx broadcast relay.
 */

import express from 'express';
import { initAccount } from './faucet.js';
import { createSlidingWindowLimiter, requireFaucetAppRequest } from './faucetSecurity.js';
import { relayMint } from './relayMint.js';
import { relayRfqBroadcast } from './rfqBroadcast.js';
import {
  clearHistoryCookie,
  historyCookie,
  requireHistorySession,
  tradeHistoryAuth,
  tradeHistoryService,
} from './tradeHistoryRuntime.js';

const router = express.Router();
router.use(express.json({ limit: '64kb' }));

const INIT_ACCOUNT_UNAVAILABLE = 'New wallet setup is temporarily unavailable. Please try again.';
const historyChallengeLimiter = createSlidingWindowLimiter({
  limit: 30,
  windowMs: 15 * 60 * 1000,
});

export function healthResponse() {
  return {
    ok: true,
    service: 'up-only',
  };
}

export function initAccountFailureResponse(err) {
  const message = err?.message || '';
  const lower = message.toLowerCase();

  if (lower.includes('faucet not configured')) {
    return { status: 503, body: { error: INIT_ACCOUNT_UNAVAILABLE } };
  }
  if (lower.includes('please wait before retrying')) {
    return { status: 429, body: { error: 'Please wait before retrying.' } };
  }
  return {
    status: 502,
    body: { error: 'New wallet setup failed. Please try again.' },
  };
}

router.get('/health', (_req, res) => {
  res.json(healthResponse());
});

router.post('/trade-history/challenge', (req, res) => {
  if (!historyChallengeLimiter.allow(req.ip || 'unknown')) {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({ error: 'Too many history sign-in attempts.' });
  }
  try {
    const challenge = tradeHistoryAuth.createChallenge(req.body || {});
    res.json({ ok: true, ...challenge });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/trade-history/verify', (req, res) => {
  try {
    const session = tradeHistoryAuth.verifyChallenge(req.body || {});
    res.setHeader('Set-Cookie', historyCookie(session.token, req));
    res.json({
      ok: true,
      wallet: session.injAddress,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/trade-history/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearHistoryCookie(req));
  res.json({ ok: true });
});

router.post('/trade-history/sync', requireHistorySession, (req, res) => {
  try {
    const records = tradeHistoryService.sync(req.historySession.injAddress, req.body?.events);
    res.json({ ok: true, synced: records.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/trade-history', requireHistorySession, async (req, res) => {
  try {
    const records = await tradeHistoryService.list(req.historySession.injAddress);
    res.json({ ok: true, wallet: req.historySession.injAddress, records });
  } catch (err) {
    console.error('trade-history reconciliation failed:', err);
    res.status(502).json({ error: 'Trade history is temporarily unavailable.' });
  }
});

router.post('/init-account', requireFaucetAppRequest, async (req, res) => {
  try {
    const { wallet } = req.body || {};
    if (!wallet || !/^inj1[a-z0-9]{38}$/.test(wallet)) {
      return res.status(400).json({ error: 'Valid inj1... wallet required' });
    }
    const txHash = await initAccount(wallet);
    res.json({ ok: true, txHash });
  } catch (err) {
    console.error('init-account failed:', err);
    const response = initAccountFailureResponse(err);
    res.status(response.status).json(response.body);
  }
});

router.post('/relay-mint', async (req, res) => {
  try {
    const { message, attestation } = req.body || {};
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const txHash = await relayMint({ message, attestation }, ip);
    res.json({ ok: true, txHash });
  } catch (err) {
    console.error('[CCTP-MINT] relay.failed', JSON.stringify({
      at: new Date().toISOString(),
      message: err.message,
    }));
    const code = /Rate limit|Invalid|Message dst/.test(err.message) ? 400 : 500;
    res.status(code).json({ error: err.message });
  }
});

router.post('/rfq-broadcast', async (req, res) => {
  try {
    const { txBytes } = req.body || {};
    console.info('[RFQ-TIMING] relay.received', JSON.stringify({
      at: new Date().toISOString(),
      txBytes: typeof txBytes === 'string' ? txBytes.length : 0,
    }));
    const result = await relayRfqBroadcast({ txBytes });
    res.json({
      ok: true,
      txHash: result.txHash,
      relayMs: result.relayMs,
      duplicate: Boolean(result.duplicate),
    });
  } catch (err) {
    const code = /Invalid/.test(err.message) ? 400 : 502;
    res.status(code).json({ error: err.message });
  }
});

router.post('/rfq-timing', (req, res) => {
  const body = req.body || {};
  const safe = {
    receivedAt: new Date().toISOString(),
    id: String(body.id || '').slice(0, 80),
    flow: String(body.flow || '').slice(0, 40),
    status: String(body.status || '').slice(0, 40),
    marketId: String(body.marketId || '').slice(0, 90),
    side: String(body.side || '').slice(0, 12),
    direction: String(body.direction || '').slice(0, 12),
    totalMs: Number.isFinite(Number(body.totalMs)) ? Number(body.totalMs) : null,
    details: body.details || null,
    marks: Array.isArray(body.marks) ? body.marks.slice(0, 40) : [],
  };
  console.info('[RFQ-TIMING] client', JSON.stringify(safe));
  res.json({ ok: true });
});

export default router;
