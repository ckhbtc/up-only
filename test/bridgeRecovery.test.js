import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cctpMintRecipientFromMessage,
  fetchAttestationOnce,
  relayCctpMint,
  recoverBridgeTransfer,
} from '../src/services/bridge.js';

const recipient = '0x1234567890AbcdEF1234567890aBcdef12345678';
const otherRecipient = '0x9999999999999999999999999999999999999999';
const burnHash = `0x${'ab'.repeat(32)}`;
const attestation = `0x${'cd'.repeat(65)}`;

function cctpMessage(mintRecipient = recipient) {
  const bytes = Buffer.alloc(240);
  bytes.writeUInt32BE(29, 8);
  Buffer.from(mintRecipient.slice(2), 'hex').copy(bytes, 196);
  return `0x${bytes.toString('hex')}`;
}

function circleFetch(message, status = 'complete') {
  return async () => new Response(JSON.stringify({
    messages: [{ status, message, attestation: status === 'complete' ? attestation : 'PENDING' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('CCTP recovery derives the mint recipient from the canonical message', () => {
  assert.equal(cctpMintRecipientFromMessage(cctpMessage()), recipient);
});

test('one-shot attestation checks distinguish pending and ready transfers', async () => {
  const pending = await fetchAttestationOnce(3, burnHash, {
    fetchFn: circleFetch(cctpMessage(), 'pending_confirmations'),
  });
  const ready = await fetchAttestationOnce(3, burnHash, {
    fetchFn: circleFetch(cctpMessage()),
  });

  assert.equal(pending.status, 'pending');
  assert.equal(pending.mintRecipient, recipient);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.attestation, attestation);
});

test('recovery validates the connected recipient before relaying', async () => {
  await assert.rejects(
    recoverBridgeTransfer({
      sourceDomain: 3,
      burnHash,
      recipientEvm: otherRecipient,
      fetchFn: circleFetch(cctpMessage()),
      isMessageUsedFn: async () => false,
      relayMintFn: async () => `0x${'ef'.repeat(32)}`,
    }),
    /different wallet/i,
  );
});

test('recovery relays ready messages and accepts already minted transfers', async () => {
  const mintHash = `0x${'ef'.repeat(32)}`;
  const relayed = await recoverBridgeTransfer({
    sourceDomain: 3,
    burnHash,
    recipientEvm: recipient,
    fetchFn: circleFetch(cctpMessage()),
    isMessageUsedFn: async () => false,
    relayMintFn: async () => mintHash,
  });
  const alreadyMinted = await recoverBridgeTransfer({
    sourceDomain: 3,
    burnHash,
    recipientEvm: recipient,
    fetchFn: circleFetch(cctpMessage()),
    isMessageUsedFn: async () => true,
    relayMintFn: async () => { throw new Error('should not relay'); },
  });

  assert.deepEqual(relayed, { status: 'complete', mintHash, alreadyMinted: false });
  assert.deepEqual(alreadyMinted, { status: 'complete', mintHash: null, alreadyMinted: true });
});

test('automatic mint treats a lost relay response as complete once used on-chain', async () => {
  const result = await relayCctpMint({
    message: cctpMessage(),
    attestation,
    relayMintFn: async () => { throw new Error('Request failed (502)'); },
    isMessageUsedFn: async () => true,
  });

  assert.deepEqual(result, { mintHash: null, alreadyMinted: true });
});
