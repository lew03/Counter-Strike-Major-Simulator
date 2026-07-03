import Icon from "./Icon";

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
          <Icon name="chevronLeft" size={16} /> Back
        </button>
      </div>

      <div className="settings-section">
        <h3>Data</h3>
        <p className="hint">
          {hasTeam
            ? "Deletes this team — roster, budget, and career history — from your browser and the server, and returns you to the welcome screen. This can't be undone."
            : "There's no saved team yet — draft a roster to get started."}
        </p>
        <button className="danger-btn" onClick={onWipeData} disabled={!hasTeam}>
          <Icon name="trash" size={16} /> Wipe All Save Data
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
