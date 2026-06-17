import {
  RFQ_OPEN_SLIPPAGE,
  formatLeverage,
  isOpenLeverageAllowed,
  steppedMaxOpenLeverage,
} from './leverageLimits.js';

export const UP_ONLY_DIRECTION = 'up';
export const UP_ONLY_SIDE = 'long';
export const UP_ONLY_TARGET_MODE = 'yolo';
export const UP_ONLY_LEVERAGE_KEY = 'MAX';
export const UP_ONLY_LEVERAGE_COLOR = '#19a974';

export function maxLongLeverageForMarket(market) {
  return steppedMaxOpenLeverage(market?.initialMarginRatio);
}

export function maxLongConfigForMarket(market) {
  const leverage = maxLongLeverageForMarket(market);
  return {
    key: UP_ONLY_LEVERAGE_KEY,
    leverage,
    label: `${formatLeverage(leverage)}x Max`,
    desc: 'Maximum long exposure for this market',
    color: UP_ONLY_LEVERAGE_COLOR,
    allowed: isOpenLeverageAllowed({
      initialMarginRatio: market?.initialMarginRatio,
      leverage,
      slippage: RFQ_OPEN_SLIPPAGE,
    }),
  };
}

export function isUpOnlyPosition(position) {
  return position?.side === UP_ONLY_SIDE || position?.direction === UP_ONLY_DIRECTION;
}
