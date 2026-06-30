import type { Player, HistoryEntry, Difficulty } from "../types";
import PlayerCard from "./PlayerCard";
import CareerStats from "./CareerStats";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export default function TeamSummary({
  teamName,
  players,
  coach,
  overall,
  totalSpend,
  budget,
  difficulty,
  history,
  onSimulate,
  onOpenTransfer,
  simulating,
}: {
  teamName: string;
  players: Player[];
  coach: Player;
  overall: number;
  totalSpend: number;
  budget: number;
  difficulty: Difficulty;
  history: HistoryEntry[];
  onSimulate: () => void;
  onOpenTransfer: () => void;
  simulating: boolean;
}) {
  const attempts = history.length;
  return (
    <div className="panel fade-in">
      <h2>{teamName}</h2>
      <p className="hint">
        Overall team rating: {overall.toFixed(2)} · Difficulty: {DIFFICULTY_LABEL[difficulty]}
      </p>
      <p className="hint">
        Budget spent: <strong>${totalSpend.toLocaleString()}</strong> / ${budget.toLocaleString()} (
        ${(budget - totalSpend).toLocaleString()} unspent)
      </p>

      {attempts > 0 && <CareerStats history={history} />}
      <div className="card-grid">
        {players.map((p, i) => (
          <div key={p.id} className="card-pop" style={{ animationDelay: `${i * 0.05}s` }}>
            <PlayerCard player={p} selected />
          </div>
        ))}
        <div className="card-pop" style={{ animationDelay: `${players.length * 0.05}s` }}>
          <PlayerCard player={coach} selected />
        </div>
      </div>
      <div className="team-summary-actions">
        <button className="primary-btn" onClick={onSimulate} disabled={simulating}>
          {simulating ? "Simulating..." : attempts === 0 ? "Run the Major" : "Run Another Major"}
        </button>
        <button className="secondary-btn" onClick={onOpenTransfer}>
          🔁 Transfer Window
        </button>
      </div>
    </div>
  );
}
