import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listBridgeTransfers,
  newestRecoverableBridge,
  saveBridgeTransfer,
  updateBridgeTransfer,
} from '../src/services/bridgeHistory.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const walletA = '0x1111111111111111111111111111111111111111';
const walletB = '0x2222222222222222222222222222222222222222';
const burnA = `0x${'aa'.repeat(32)}`;
const burnB = `0x${'bb'.repeat(32)}`;

test('bridge history persists, scopes by wallet, and deduplicates burns', () => {
  const storage = memoryStorage();

  const first = saveBridgeTransfer({
    wallet: walletA,
    sourceChainId: 42161,
    sourceDomain: 3,
    sourceName: 'Arbitrum One',
    amount: '10',
    transferMode: 'fast',
    burnHash: burnA,
    status: 'awaiting_attestation',
    createdAt: 100,
  }, storage);
  saveBridgeTransfer({
    wallet: walletB,
    sourceChainId: 8453,
    sourceDomain: 6,
    sourceName: 'Base',
    amount: '5',
    transferMode: 'standard',
    burnHash: burnB,
    status: 'awaiting_attestation',
    createdAt: 200,
  }, storage);
  saveBridgeTransfer({
    ...first,
    status: 'minting',
    updatedAt: 300,
  }, storage);

  assert.equal(listBridgeTransfers(walletA, storage).length, 1);
  assert.equal(listBridgeTransfers(walletA, storage)[0].status, 'minting');
  assert.equal(listBridgeTransfers(walletB, storage)[0].burnHash, burnB);
});

test('bridge history updates records and chooses the newest recoverable transfer', () => {
  const storage = memoryStorage();
  const older = saveBridgeTransfer({
    wallet: walletA,
    sourceChainId: 42161,
    sourceDomain: 3,
    sourceName: 'Arbitrum One',
    amount: '2',
    transferMode: 'standard',
    burnHash: burnA,
    status: 'awaiting_attestation',
    createdAt: 100,
  }, storage);
  const newer = saveBridgeTransfer({
    wallet: walletA,
    sourceChainId: 8453,
    sourceDomain: 6,
    sourceName: 'Base',
    amount: '3',
    transferMode: 'fast',
    burnHash: burnB,
    status: 'needs_attention',
    createdAt: 200,
  }, storage);

  assert.equal(newestRecoverableBridge(listBridgeTransfers(walletA, storage)).id, newer.id);

  updateBridgeTransfer(older.id, { status: 'complete', mintHash: `0x${'cc'.repeat(32)}` }, storage);
  assert.equal(listBridgeTransfers(walletA, storage).find(row => row.id === older.id).status, 'complete');
});
