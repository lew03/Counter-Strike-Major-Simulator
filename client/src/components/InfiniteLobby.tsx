import type { TeamResponse } from "../types";
import PlayerCard from "./PlayerCard";
import Icon from "./Icon";

export default function InfiniteLobby({
  team,
  onStartRun,
  onNewDraft,
}: {
  team: TeamResponse;
  onStartRun: () => void;
  onNewDraft: () => void;
}) {
  const pastRuns = (team.infiniteHistory || []).slice(0, 5);

  return (
    <div className="panel fade-in inf-lobby">
      <div className="inf-lobby-header">
        <div className="inf-lobby-icon"><Icon name="infinity" size={34} strokeWidth={2} /></div>
        <h2 className="inf-lobby-team-name">{team.name}</h2>
        <p className="hint inf-lobby-meta">
          Rating {team.overall.toFixed(2)} · Budget ${team.budget.toLocaleString()}
          {team.infiniteBestScore > 0 && (
            <span className="inf-lobby-best"> · Best {team.infiniteBestScore} wins</span>
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

      {pastRuns.length > 0 && (
        <div className="inf-lobby-runs">
          <div className="inf-lobby-runs-title">Recent runs</div>
          <div className="inf-lobby-runs-list">
            {pastRuns.map((r, i) => (
              <div key={r.timestamp} className={`inf-run-row ${i === 0 ? "inf-run-top" : ""}`}>
                <span className="inf-run-rank">{i === 0 ? <Icon name="trophy" size={14} /> : `#${i + 1}`}</span>
                <span className="inf-run-wins">
                  <strong>{r.gamesWon}</strong> win{r.gamesWon !== 1 ? "s" : ""}
                </span>
                <span className="inf-run-earned">${r.totalEarned.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="hint inf-lobby-transfer-note">
        <Icon name="swap" size={14} /> Transfer windows open automatically every 5 wins during a run.
      </p>

      <div className="actions-stack">
        <button className="run-again-btn action-lg" onClick={onStartRun}>
          <Icon name="play" size={18} /> Start Run
        </button>
        <button className="danger-btn action-sm" onClick={onNewDraft}>
          <Icon name="trash" size={14} /> Start New Draft
        </button>
      </div>
    </div>
  );
}
