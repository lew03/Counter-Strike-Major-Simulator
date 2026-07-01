import type { Player, HistoryEntry, Difficulty, ChemistryBreakdown } from "../types";
import PlayerCard from "./PlayerCard";
import CareerStats from "./CareerStats";
import ChemistryPanel from "./ChemistryPanel";
import Icon from "./Icon";

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
  chemistry,
  totalSpend,
  budget,
  difficulty,
  difficultyLevel,
  escalationBonus,
  lossStreak,
  moraleMultiplier,
  history,
  onSimulate,
  onOpenTransfer,
  simulating,
  hasActiveRun,
  onResume,
  onNewDraft,
}: {
  teamName: string;
  players: Player[];
  coach: Player;
  overall: number;
  chemistry: ChemistryBreakdown;
  totalSpend: number;
  budget: number;
  difficulty: Difficulty;
  difficultyLevel: number;
  escalationBonus: number;
  lossStreak: number;
  moraleMultiplier: number;
  history: HistoryEntry[];
  onSimulate: () => void;
  onOpenTransfer: () => void;
  simulating: boolean;
  hasActiveRun: boolean;
  onResume: () => void;
  onNewDraft: () => void;
}) {
  const attempts = history.length;
  const moralePenaltyPct = Math.round((1 - moraleMultiplier) * 100);
  return (
    <div className="panel fade-in">
      <h2>{teamName}</h2>
      <p className="hint">
        Overall team rating: {overall.toFixed(2)} · Difficulty: {DIFFICULTY_LABEL[difficulty]}
        {difficultyLevel > 0 && (
          <span className="escalation-note">
            {" "}
            · {difficultyLevel} major win{difficultyLevel > 1 ? "s" : ""} — AI is +
            {(escalationBonus * 100).toFixed(0)}% stronger than baseline
          </span>
        )}
      </p>
      <p className="hint">
        Budget spent: <strong>${totalSpend.toLocaleString()}</strong> / ${budget.toLocaleString()} (
        ${(budget - totalSpend).toLocaleString()} unspent)
      </p>
      {moralePenaltyPct > 0 && (
        <p className="hint loss-streak-note">
          <Icon name="alert" size={14} /> {lossStreak}-major losing streak — team confidence is down {moralePenaltyPct}%. A transfer
          resets it.
        </p>
      )}

      <CareerStats history={history} />
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
      <ChemistryPanel chemistry={chemistry} players={players} />
      <div className="actions-stack">
        {hasActiveRun ? (
          <button className="run-again-btn action-lg" onClick={onResume}>
            <Icon name="play" size={18} /> Resume Tournament
          </button>
        ) : (
          <button className="run-again-btn action-lg" onClick={onSimulate} disabled={simulating}>
            <Icon name="refresh" size={18} />
            {simulating ? "Simulating..." : attempts === 0 ? "Run the Major" : "Run Another Major"}
          </button>
        )}
        <button className="transfer-btn action-md" onClick={onOpenTransfer}>
          <Icon name="swap" size={16} /> Transfer Window
        </button>
        <button className="danger-btn action-sm" onClick={onNewDraft}>
          <Icon name="trash" size={14} /> Start New Draft
        </button>
      </div>
    </div>
  );
}
