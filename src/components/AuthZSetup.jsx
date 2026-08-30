import useSessionStore from '../stores/sessionStore';

export default function AuthZSetup({ onAuthorize, onClose }) {
  const { granting } = useSessionStore();

  return (
    <div
      className="up-authz-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="up-authz-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="authorize-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="up-authz-close"
          type="button"
          onClick={onClose}
          aria-label="Dismiss authorization"
        >
          x
        </button>

        <div id="authorize-title" className="up-authz-title">
          Authorize Wallet
        </div>

        <div className="up-authz-copy">
          Sign once to open and close positions without having to sign each transaction.
        </div>

        <button
          className="up-authz-action"
          type="button"
          onClick={onAuthorize}
          disabled={granting}
        >
          {granting ? 'Authorizing...' : 'Authorize'}
        </button>
      </div>
    </div>
  );
}
