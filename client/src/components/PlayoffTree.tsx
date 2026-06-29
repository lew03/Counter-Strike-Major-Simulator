import type { RoundResult, MatchResult } from "../types";

function MapPills({ match }: { match: MatchResult }) {
  return (
    <div className="map-pills">
      {match.maps.map((m, i) => (
        <span key={i} className="map-pill" title={`Map ${i + 1}: ${m.name} — ${m.winner} won ${m.scoreA}-${m.scoreB}`}>
          {m.scoreA}-{m.scoreB}
        </span>
      ))}
    </div>
  );
}

function TeamRow({ name, isUser, isWinner }: { name: string; isUser: boolean; isWinner: boolean }) {
  return (
    <div className={`bracket-team-row ${isWinner ? "winner" : "loser"} ${isUser ? "is-user" : ""}`}>
      <span className="bracket-team-name">
        {isUser && <span className="user-star" aria-hidden="true">★ </span>}
        {name}
      </span>
      <span className="result-icon" aria-label={isWinner ? "won" : "lost"}>
        {isWinner ? "✓" : "✗"}
      </span>
    </div>
  );
}

export default function PlayoffTree({
  rounds,
  onSelect,
}: {
  rounds: RoundResult[];
  onSelect: (round: RoundResult) => void;
}) {
  return (
    <div className="bracket-tree">
      {rounds.map((round, ri) => (
        <div className="bracket-tree-col" key={round.roundName}>
          <button className="bracket-round-title bracket-round-title-btn" onClick={() => onSelect(round)}>
            {round.roundName} <span className="format-tag">{round.matches[0]?.format}</span>
          </button>
          <div className="bracket-matches">
            {round.matches.map((m, mi) => (
              <div
                className={`bracket-match-box ${m.teamAIsUser || m.teamBIsUser ? "match-user" : ""} pop-in`}
                key={mi}
                style={{ animationDelay: `${mi * 0.1}s` }}
              >
                <TeamRow name={m.teamA} isUser={m.teamAIsUser} isWinner={m.winner === m.teamA} />
                <TeamRow name={m.teamB} isUser={m.teamBIsUser} isWinner={m.winner === m.teamB} />
                <div
                  className="bracket-score"
                  title={m.maps.map((mp) => `${mp.name}: ${mp.scoreA}-${mp.scoreB}`).join("\n")}
                >
                  {m.score}
                </div>
                <MapPills match={m} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
