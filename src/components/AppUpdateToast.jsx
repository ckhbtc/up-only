export default function AppUpdateToast() {
  return (
    <div className="app-update-toast" role="status" aria-live="polite">
      <span>A new version of UpOnly is available. Please reload to keep using the app.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
