export default function AppUpdateToast() {
  return (
    <div className="app-update-toast" role="status" aria-live="polite">
      <span>Reload to keep using the app.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
