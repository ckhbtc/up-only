export default function AppUpdateToast() {
  return (
    <div className="app-update-toast" role="status" aria-live="polite">
      <span>New version available.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
