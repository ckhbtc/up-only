export function shortenError(message, maxLength = 140) {
  const text = message || 'Unknown error';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export function userFacingTradeError(message) {
  const text = message || 'Unknown error';
  if (/no quotes received within wait time/i.test(text)) {
    return 'Order failed, please try again.';
  }
  if (/account sequence mismatch|incorrect account sequence/i.test(text)) {
    return 'Order unsuccessful, please try again.';
  }
  if (/failed to allocate RFQ ID|indexer-rfq-mongodb|context deadline exceeded/i.test(text)) {
    return 'Order unsuccessful, please try again.';
  }
  return text;
}

export function getOpenTradeStatus(result) {
  const tpRequested = Boolean(result?.takeProfit?.requested);
  const tpFailed = tpRequested && !result.takeProfit?.placed;
  if (tpFailed) {
    return {
      type: 'warning',
      message: `Open order confirmed. Take-profit failed: ${shortenError(result.takeProfit.error)}`,
      txHash: result.txHash,
    };
  }

  if (tpRequested) {
    return {
      type: 'success',
      message: result.takeProfit?.verified
        ? 'Open order confirmed. Take-profit order active.'
        : 'Open order confirmed. Take-profit order accepted.',
      txHash: result.txHash,
    };
  }

  return {
    type: 'success',
    message: 'Order confirmed.',
    txHash: result.txHash,
  };
}
