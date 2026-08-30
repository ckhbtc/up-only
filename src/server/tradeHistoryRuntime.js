import { randomBytes } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createHistoryAuth } from './tradeHistoryAuth.js';
import { createTradeHistoryService } from './tradeHistoryService.js';
import { createTradeHistoryStore } from './tradeHistoryStore.js';

export const HISTORY_COOKIE = 'up_history_session';

function historySecret() {
  const configured = process.env.HISTORY_SESSION_SECRET;
  if (configured && Buffer.byteLength(configured) >= 32) return Buffer.from(configured);

  const path = process.env.HISTORY_SESSION_SECRET_FILE
    || join(process.cwd(), '.data', 'history-session-secret');
  mkdirSync(dirname(path), { recursive: true });
  try {
    return readFileSync(path);
  } catch {
    const generated = randomBytes(48);
    try {
      writeFileSync(path, generated, { mode: 0o600, flag: 'wx' });
      return generated;
    } catch {
      return readFileSync(path);
    }
  }
}

function cookieValue(req, name) {
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

export function historyCookie(token, req) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  return [
    `${HISTORY_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=2592000',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearHistoryCookie(req) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  return [
    `${HISTORY_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export const tradeHistoryAuth = createHistoryAuth({ secret: historySecret() });
export const tradeHistoryStore = createTradeHistoryStore();
export const tradeHistoryService = createTradeHistoryService({ store: tradeHistoryStore });

export function requireHistorySession(req, res, next) {
  try {
    req.historySession = tradeHistoryAuth.verifyToken(cookieValue(req, HISTORY_COOKIE));
    next();
  } catch {
    res.status(401).json({ error: 'Trade history is locked.' });
  }
}
