import type { TeamResponse } from "../types";
import PlayerCard from "./PlayerCard";

export default function InfiniteLobby({
  team,
  onStartRun,
  onRebuild,
  onNewDraft,
}: {
  team: TeamResponse;
  onStartRun: () => void;
  onRebuild: () => void;
  onNewDraft: () => void;
}) {
  return (
    <div className="panel fade-in inf-lobby">
      <div className="inf-lobby-header">
        <div className="inf-lobby-icon">♾️</div>
        <h2 className="inf-lobby-team-name">{team.name}</h2>
        <p className="hint inf-lobby-meta">
          Rating: {team.overall.toFixed(2)} · Budget: ${team.budget.toLocaleString()}
          {team.infiniteBestScore > 0 && (
            <span className="inf-lobby-best"> · 🏆 Best: {team.infiniteBestScore} wins</span>
          )}
        </p>
      </div>

      <div className="card-grid">
        {team.players.map((p, i) => (
          <div key={p.id} className="card-pop" style={{ animationDelay: `${i * 0.05}s` }}>
            <PlayerCard player={p} selected />
          </div>
        ))}
        <div className="card-pop" style={{ animationDelay: `${team.players.length * 0.05}s` }}>
          <PlayerCard player={team.coach} selected />
        </div>
      </div>

      <div className="actions-stack">
        <div className="actions-row">
          <button className="run-again-btn" onClick={onStartRun}>
            ⚔️ Start Run
          </button>
        </div>
        <p className="hint inf-lobby-transfer-note">
          🔁 Transfer windows open automatically every 5 wins during a run.
        </p>
        <div className="actions-row">
          <button className="secondary-btn actions-btn" onClick={onRebuild}>
            🛠️ Rebuild Roster
          </button>
          <button className="danger-btn actions-btn" onClick={onNewDraft}>
            🗑️ Start New Draft
          </button>
        </div>
      </div>
    </div>
  );
}
