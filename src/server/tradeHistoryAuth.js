import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Address } from '@injectivelabs/sdk-ts';
import { getAddress, verifyMessage } from 'ethers';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signatureFor(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function normalizeWallets({ ethAddress, injAddress }) {
  let normalizedEth;
  let derivedInj;
  try {
    normalizedEth = getAddress(String(ethAddress || '')).toLowerCase();
    derivedInj = Address.fromHex(normalizedEth).toBech32();
  } catch {
    throw new Error('Valid wallet address required');
  }
  if (derivedInj !== injAddress) throw new Error('Wallet addresses do not match');
  return { ethAddress: normalizedEth, injAddress: derivedInj };
}

export function createHistoryAuth({
  secret,
  now = Date.now,
  nonce = () => randomBytes(24).toString('base64url'),
} = {}) {
  const signingSecret = Buffer.isBuffer(secret) ? secret : Buffer.from(secret || '');
  if (signingSecret.length < 32) throw new Error('History session secret must be at least 32 bytes');
  const challenges = new Map();

  function createChallenge(wallets) {
    const createdAt = now();
    for (const [id, challenge] of challenges) {
      if (challenge.expiresAt < createdAt) challenges.delete(id);
    }
    const normalized = normalizeWallets(wallets);
    const challengeId = nonce();
    const issuedAt = createdAt;
    const expiresAt = issuedAt + CHALLENGE_TTL_MS;
    const message = [
      'UpOnly Trade History',
      '',
      'Sign in to view and sync history for:',
      normalized.injAddress,
      '',
      `Nonce: ${challengeId}`,
      `Issued: ${new Date(issuedAt).toISOString()}`,
      '',
      'This signature cannot move funds or place trades.',
    ].join('\n');

    challenges.set(challengeId, { ...normalized, message, expiresAt });
    return { challengeId, message, expiresAt };
  }

  function issueToken(session) {
    const payload = encode(JSON.stringify({
      eth: session.ethAddress,
      inj: session.injAddress,
      exp: session.expiresAt,
    }));
    return `${payload}.${signatureFor(signingSecret, payload)}`;
  }

  function verifyChallenge({ challengeId, signature }) {
    const challenge = challenges.get(challengeId);
    challenges.delete(challengeId);
    if (!challenge || challenge.expiresAt < now()) {
      throw new Error('History challenge expired or already used');
    }

    let recovered;
    try {
      recovered = verifyMessage(challenge.message, signature).toLowerCase();
    } catch {
      throw new Error('Invalid wallet signature');
    }
    if (recovered !== challenge.ethAddress) throw new Error('Wallet signature does not match');

    const session = {
      ethAddress: challenge.ethAddress,
      injAddress: challenge.injAddress,
      expiresAt: now() + SESSION_TTL_MS,
    };
    return { ...session, token: issueToken(session) };
  }

  function verifyToken(token) {
    const [payload, providedSignature, ...extra] = String(token || '').split('.');
    if (!payload || !providedSignature || extra.length) throw new Error('Invalid history session');
    const expectedSignature = signatureFor(signingSecret, payload);
    const provided = Buffer.from(providedSignature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new Error('Invalid history session');
    }

    let parsed;
    try {
      parsed = JSON.parse(decode(payload));
    } catch {
      throw new Error('Invalid history session');
    }
    const normalized = normalizeWallets({ ethAddress: parsed.eth, injAddress: parsed.inj });
    const expiresAt = Number(parsed.exp || 0);
    if (!expiresAt || expiresAt < now()) throw new Error('History session expired');
    return { ...normalized, expiresAt };
  }

  return { createChallenge, verifyChallenge, verifyToken };
}
