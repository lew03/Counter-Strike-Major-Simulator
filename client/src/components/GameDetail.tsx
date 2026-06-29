import type { RoundResult } from "../types";
import MatchRecap from "./MatchRecap";

export default function GameDetail({ round, onBack }: { round: RoundResult; onBack: () => void }) {
  const userMatch = round.matches.find((m) => m.isUserMatch);
  const otherMatches = round.matches.filter((m) => !m.isUserMatch);

  return (
    <div className="game-detail panel fade-in">
      <div className="game-detail-header">
        <button className="secondary-btn" onClick={onBack}>
          ← Back to Live
        </button>
        <h3>{round.roundName} (saved result)</h3>
      </div>

      {userMatch && <MatchRecap match={userMatch} />}

      {otherMatches.length > 0 && (
        <div className="other-results">
          <h4>Rest of the bracket this round</h4>
          <div className="other-results-grid">
            {otherMatches.map((m, i) => (
              <div className="other-result-row" key={i}>
                <span className={m.winner === m.teamA ? "winner-name" : "loser-name"}>{m.teamA}</span>
                <span className="other-score">{m.score}</span>
                <span className={m.winner === m.teamB ? "winner-name" : "loser-name"}>{m.teamB}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
