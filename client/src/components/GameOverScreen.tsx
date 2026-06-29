import type { MajorRun, HistoryEntry, MatchResult } from "../types";
import MatchRecap from "./MatchRecap";

export default function GameOverScreen({
  run,
  history,
  lastMatch,
  onRestart,
  onNewDraft,
}: {
  run: MajorRun;
  history: HistoryEntry[];
  lastMatch: MatchResult | null;
  onRestart: () => void;
  onNewDraft: () => void;
}) {
  const wins = history.filter((h) => h.userWon).length;
  const won = run.userWon;

  return (
    <div className={`game-over-screen ${won ? "win" : "loss"} pop-in`}>
      <div className="game-over-title">{won ? "🏆 MAJOR CHAMPIONS" : "GAME OVER"}</div>
      <div className="game-over-subtitle">
        {won
          ? "Your team ran the gauntlet and lifted the trophy."
          : `Eliminated — ${run.userEliminatedAt}. Champion: ${run.champion}.`}
      </div>

      <div className="game-over-record">
        Majors won: <strong>{wins}</strong> / {history.length} attempts
      </div>

      {lastMatch && (
        <div className="game-over-recap">
          <h4>Your Final Match</h4>
          <MatchRecap match={lastMatch} />
        </div>
      )}

      <div className="game-over-actions">
        <button className="primary-btn" onClick={onRestart}>
          Run Another Major
        </button>
        <button className="secondary-btn" onClick={onNewDraft}>
          Start New Draft
        </button>
      </div>
    </div>
  );
}
