import { chainLogoSymbol } from '../services/chainLogo';
import CoinLogo from './CoinLogo';

function BaseLogo({ size }) {
  return (
    <svg
      className="up-chain-logo"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Base"
    >
      <circle cx="16" cy="16" r="16" fill="#0052ff" />
      <path
        d="M15.7 25.4c5.2 0 9.4-4.2 9.4-9.4s-4.2-9.4-9.4-9.4c-4.9 0-8.9 3.7-9.4 8.4h12.4v2H6.3c.5 4.7 4.5 8.4 9.4 8.4Z"
        fill="#fff"
      />
    </svg>
  );
}

export default function ChainLogo({ chainId, name, size = 24 }) {
  const symbol = chainLogoSymbol(chainId);
  if (symbol === 'BASE') return <BaseLogo size={size} />;
  return <CoinLogo symbol={symbol || String(name || '?')} size={size} />;
}
