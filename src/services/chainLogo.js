const CHAIN_LOGO_SYMBOLS = {
  1: 'ETH',
  10: 'OP',
  137: 'MATIC',
  1776: 'INJ',
  8453: 'BASE',
  42161: 'ARB',
  43114: 'AVAX',
};

export function chainLogoSymbol(chainId) {
  return CHAIN_LOGO_SYMBOLS[Number(chainId)] || '';
}
