export default function SettingsPage({
  onBack,
  onStartNewDraft,
  hasTeam,
}: {
  onBack: () => void;
  onStartNewDraft: () => void;
  hasTeam: boolean;
}) {
  return (
    <div className="panel fade-in settings-page">
      <div className="transfer-header">
        <h2>Settings</h2>
        <button className="secondary-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="settings-section">
        <h3>Draft</h3>
        <p className="hint">
          {hasTeam
            ? "Starting a new draft clears your current roster and career history for this team. This can't be undone."
            : "Begin drafting a fresh roster."}
        </p>
        <button className="danger-btn" onClick={onStartNewDraft}>
          🗑️ Start New Draft
        </button>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <p className="hint">
          CS Major Team Picker — draft a roster under a salary cap and run it through a Swiss-stage
          Major. Your team and career history are saved automatically.
        </p>
      </div>
    </div>
  );
}
