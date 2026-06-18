import useSessionStore from '../stores/sessionStore';

export default function AuthZSetup({ onAuthorize, onClose }) {
  const { granting } = useSessionStore();

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: 'var(--overlay)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        animation: 'modal-fade-in 0.18s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="authorize-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '3px solid var(--border)',
          borderRadius: 0,
          padding: '26px 30px 30px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '10px 10px 0 var(--border)',
          animation: 'modal-pop-in 0.2s ease',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss authorization"
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 30,
            lineHeight: 1,
            fontFamily: 'var(--font-heading)',
          }}
        >
          x
        </button>

        <div
          id="authorize-title"
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 10,
            fontFamily: 'var(--font-heading)',
            lineHeight: 1.05,
          }}
        >
          Authorize Wallet
        </div>

        <div style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.35,
          marginBottom: 22,
        }}>
          Sign once to open and close positions without having to sign each transaction.
        </div>

        <button
          type="button"
          onClick={onAuthorize}
          disabled={granting}
          style={{
            width: '100%',
            background: granting ? 'var(--bg-primary)' : 'var(--accent-grad)',
            color: granting ? 'var(--text-muted)' : 'var(--on-accent)',
            border: granting ? '2px solid var(--border)' : '2px solid var(--accent)',
            borderRadius: 0,
            padding: '14px 0',
            fontSize: 16,
            fontWeight: 700,
            cursor: granting ? 'wait' : 'pointer',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {granting ? 'Authorizing...' : 'Authorize'}
        </button>
      </div>
    </div>
  );
}
