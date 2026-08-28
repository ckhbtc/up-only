/**
 * Account initialization faucet - sends 0.001 INJ via EVM to fresh
 * Injective wallets so they can pay gas for their first AuthZ grant.
 * Requires FAUCET_PRIVATE_KEY in .env (any mainnet INJ wallet works).
 */

import { ethers } from 'ethers';
import { Address } from '@injectivelabs/sdk-ts';
import { join } from 'node:path';
import { FaucetBudget } from './faucetBudget.js';

const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY ?? '';
const INJ_EVM_RPC = 'https://sentry.evm-rpc.injective.network/';
const MIN_BALANCE = ethers.parseEther('0.001');
const GAS_LIMIT = 21_000n;
const GAS_PRICE = ethers.parseUnits('500', 'gwei');
const DAILY_LIMIT = ethers.parseEther(process.env.FAUCET_DAILY_LIMIT_INJ || '0.1');
const MIN_RESERVE = ethers.parseEther(process.env.FAUCET_MIN_RESERVE_INJ || '5');
const STATE_FILE = process.env.FAUCET_STATE_FILE
  || join(process.cwd(), '.data', 'faucet-usage.json');

const _recentInits = new Map();
const INIT_COOLDOWN_MS = 60_000;
const budget = new FaucetBudget({
  stateFile: STATE_FILE,
  dailyLimitWei: DAILY_LIMIT,
  minReserveWei: MIN_RESERVE,
});
let operationTail = Promise.resolve();

export async function initAccount(wallet) {
  const operation = operationTail.then(() => initAccountLocked(wallet));
  operationTail = operation.catch(() => {});
  return operation;
}

async function initAccountLocked(wallet) {
  if (!FAUCET_PRIVATE_KEY) throw new Error('Faucet not configured');
  const lastInit = _recentInits.get(wallet) ?? 0;
  if (Date.now() - lastInit < INIT_COOLDOWN_MS) throw new Error('Please wait before retrying');

  const ethAddress = Address.fromBech32(wallet).toHex();
  const provider = new ethers.JsonRpcProvider(INJ_EVM_RPC);
  const faucetWallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);

  const balance = await provider.getBalance(ethAddress);
  if (balance >= MIN_BALANCE) {
    _recentInits.set(wallet, Date.now());
    return 'already_funded';
  }

  const topUp = MIN_BALANCE - balance;
  const cost = topUp + (GAS_LIMIT * GAS_PRICE);
  const faucetBalance = await provider.getBalance(faucetWallet.address);
  await budget.reserve({ balanceWei: faucetBalance, costWei: cost });

  // Reserve the cooldown before broadcasting. A failed send remains charged
  // against the budget and cannot be hammered into repeated attempts.
  _recentInits.set(wallet, Date.now());
  const tx = await faucetWallet.sendTransaction({
    to: ethAddress,
    value: topUp,
    type: 0,
    gasLimit: GAS_LIMIT,
    gasPrice: GAS_PRICE,
  });

  // Don't wait for receipt - Injective EVM RPC can be flaky on getTransactionReceipt.
  // Client waits ~5s before retrying the AuthZ grant, which is long enough for inclusion.
  return tx.hash;
}
