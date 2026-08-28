import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class FaucetBudgetError extends Error {}

export function evaluateFaucetBudget({
  balanceWei,
  costWei,
  spentWei,
  dailyLimitWei,
  minReserveWei,
}) {
  if (costWei <= 0n) throw new FaucetBudgetError('Invalid faucet spend');
  if (spentWei + costWei > dailyLimitWei) {
    throw new FaucetBudgetError('Faucet daily limit reached');
  }
  if (balanceWei - costWei < minReserveWei) {
    throw new FaucetBudgetError('Faucet protected reserve reached');
  }
}

function utcDate(now) {
  return now().toISOString().slice(0, 10);
}

export class FaucetBudget {
  constructor({ stateFile, dailyLimitWei, minReserveWei, now = () => new Date() }) {
    this.stateFile = stateFile;
    this.dailyLimitWei = dailyLimitWei;
    this.minReserveWei = minReserveWei;
    this.now = now;
    this.tail = Promise.resolve();
  }

  reserve(args) {
    const operation = this.tail.then(() => this.#reserve(args));
    this.tail = operation.catch(() => {});
    return operation;
  }

  async #readState(date) {
    try {
      const parsed = JSON.parse(await readFile(this.stateFile, 'utf8'));
      if (parsed.date !== date) return { date, spentWei: 0n };
      return { date, spentWei: BigInt(parsed.spentWei) };
    } catch (error) {
      if (error?.code === 'ENOENT') return { date, spentWei: 0n };
      throw new FaucetBudgetError('Faucet budget state unavailable');
    }
  }

  async #writeState(state) {
    await mkdir(dirname(this.stateFile), { recursive: true, mode: 0o700 });
    const temporary = `${this.stateFile}.${process.pid}.${Date.now()}.tmp`;
    const body = `${JSON.stringify({
      date: state.date,
      spentWei: state.spentWei.toString(),
      updatedAt: this.now().toISOString(),
    })}\n`;

    try {
      await writeFile(temporary, body, { mode: 0o600 });
      await rename(temporary, this.stateFile);
    } catch {
      throw new FaucetBudgetError('Faucet budget state unavailable');
    }
  }

  async #reserve({ balanceWei, costWei }) {
    const date = utcDate(this.now);
    const state = await this.#readState(date);
    evaluateFaucetBudget({
      balanceWei,
      costWei,
      spentWei: state.spentWei,
      dailyLimitWei: this.dailyLimitWei,
      minReserveWei: this.minReserveWei,
    });

    state.spentWei += costWei;
    await this.#writeState(state);
    return state.spentWei;
  }
}
