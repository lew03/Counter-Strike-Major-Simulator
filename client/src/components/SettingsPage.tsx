export default function SettingsPage({
  onBack,
  onWipeData,
  hasTeam,
}: {
  onBack: () => void;
  onWipeData: () => void;
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
        <h3>Data</h3>
        <p className="hint">
          {hasTeam
            ? "Wipes your roster, budget spend, and career history for this team, and returns you to the welcome screen. This can't be undone."
            : "There's no saved team yet — draft a roster to get started."}
        </p>
        <button className="danger-btn" onClick={onWipeData} disabled={!hasTeam}>
          🧹 Wipe All Save Data
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
