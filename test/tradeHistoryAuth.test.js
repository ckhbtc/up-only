import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { Address } from '@injectivelabs/sdk-ts';
import { createHistoryAuth } from '../src/server/tradeHistoryAuth.js';

test('history auth verifies wallet ownership and issues a scoped session', async () => {
  const wallet = Wallet.createRandom();
  const injAddress = Address.fromHex(wallet.address).toBech32();
  const auth = createHistoryAuth({
    secret: Buffer.alloc(32, 7),
    now: () => 1_800_000_000_000,
    nonce: () => 'fixed-nonce',
  });

  const challenge = auth.createChallenge({ ethAddress: wallet.address, injAddress });
  const signature = await wallet.signMessage(challenge.message);
  const verified = auth.verifyChallenge({ challengeId: challenge.challengeId, signature });
  const session = auth.verifyToken(verified.token);

  assert.equal(session.ethAddress, wallet.address.toLowerCase());
  assert.equal(session.injAddress, injAddress);
  assert.equal(session.expiresAt, 1_802_592_000_000);
});

test('history auth rejects challenge replay and token tampering', async () => {
  const wallet = Wallet.createRandom();
  const injAddress = Address.fromHex(wallet.address).toBech32();
  const auth = createHistoryAuth({
    secret: Buffer.alloc(32, 9),
    now: () => 1_800_000_000_000,
    nonce: () => 'replay-nonce',
  });

  const challenge = auth.createChallenge({ ethAddress: wallet.address, injAddress });
  const signature = await wallet.signMessage(challenge.message);
  const verified = auth.verifyChallenge({ challengeId: challenge.challengeId, signature });

  assert.throws(
    () => auth.verifyChallenge({ challengeId: challenge.challengeId, signature }),
    /expired or already used/i,
  );
  assert.throws(() => auth.verifyToken(`${verified.token}x`), /invalid history session/i);
});

test('history auth rejects an Injective address that does not match the EVM wallet', () => {
  const wallet = Wallet.createRandom();
  const other = Wallet.createRandom();
  const auth = createHistoryAuth({ secret: Buffer.alloc(32, 4) });

  assert.throws(() => auth.createChallenge({
    ethAddress: wallet.address,
    injAddress: Address.fromHex(other.address).toBech32(),
  }), /wallet addresses do not match/i);
});

test('history auth prunes expired unused challenges', async () => {
  const wallet = Wallet.createRandom();
  const injAddress = Address.fromHex(wallet.address).toBech32();
  let currentTime = 1_800_000_000_000;
  let nonceNumber = 0;
  const auth = createHistoryAuth({
    secret: Buffer.alloc(32, 5),
    now: () => currentTime,
    nonce: () => `nonce-${++nonceNumber}`,
  });

  const expired = auth.createChallenge({ ethAddress: wallet.address, injAddress });
  currentTime += 5 * 60 * 1000 + 1;
  auth.createChallenge({ ethAddress: wallet.address, injAddress });
  const signature = await wallet.signMessage(expired.message);

  assert.throws(
    () => auth.verifyChallenge({ challengeId: expired.challengeId, signature }),
    /expired or already used/i,
  );
});
