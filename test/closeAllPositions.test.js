import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closePositionsSequentially } from '../src/services/closeAllPositions.js';

test('close-all processes one position at a time and continues after a failure', async () => {
  const positions = [
    { id: 'btc', asset: 'BTC' },
    { id: 'eth', asset: 'ETH' },
    { id: 'inj', asset: 'INJ' },
  ];
  const events = [];
  let active = 0;
  let maxActive = 0;

  const summary = await closePositionsSequentially({
    positions,
    onProgress: ({ index, total, position }) => {
      events.push(`progress:${index + 1}/${total}:${position.asset}`);
    },
    closePosition: async position => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      events.push(`start:${position.asset}`);
      await Promise.resolve();
      active -= 1;
      if (position.asset === 'ETH') throw new Error('quote failed');
      events.push(`closed:${position.asset}`);
      return { txHash: position.id };
    },
    onClosed: ({ position }) => events.push(`confirmed:${position.asset}`),
    onError: ({ position }) => events.push(`failed:${position.asset}`),
  });

  assert.equal(maxActive, 1);
  assert.deepEqual(summary, { closed: 2, failed: 1 });
  assert.deepEqual(events, [
    'progress:1/3:BTC',
    'start:BTC',
    'closed:BTC',
    'confirmed:BTC',
    'progress:2/3:ETH',
    'start:ETH',
    'failed:ETH',
    'progress:3/3:INJ',
    'start:INJ',
    'closed:INJ',
    'confirmed:INJ',
  ]);
});

test('App reports sequential close progress through the transaction banner', async () => {
  const [appSource, statusSource] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/TransactionStatus.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(appSource, /type: 'loading',[\s\S]*Closing \$\{index \+ 1\} of \$\{total\}/);
  assert.match(statusSource, /lower\.includes\('closing'\)/);
});
