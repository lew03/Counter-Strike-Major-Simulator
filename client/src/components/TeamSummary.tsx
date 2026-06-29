import type { Player } from "../types";
import PlayerCard from "./PlayerCard";

export default function TeamSummary({
  teamName,
  players,
  coach,
  overall,
  totalSpend,
  budget,
  attempts,
  onSimulate,
  simulating,
}: {
  teamName: string;
  players: Player[];
  coach: Player;
  overall: number;
  totalSpend: number;
  budget: number;
  attempts: number;
  onSimulate: () => void;
  simulating: boolean;
}) {
  return (
    <div className="panel fade-in">
      <h2>{teamName}</h2>
      <p className="hint">Overall team rating: {overall.toFixed(2)}</p>
      <p className="hint">
        Budget spent: <strong>${totalSpend.toLocaleString()}</strong> / ${budget.toLocaleString()} (
        ${(budget - totalSpend).toLocaleString()} unspent)
      </p>
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
      <button className="primary-btn" onClick={onSimulate} disabled={simulating}>
        {simulating ? "Simulating..." : attempts === 0 ? "Run the Major" : "Run Another Major"}
      </button>
      {attempts > 0 && <p className="hint">Attempts so far: {attempts}</p>}
    </div>
  );
}
