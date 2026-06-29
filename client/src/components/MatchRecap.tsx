import type { MatchResult, ScoreboardRow } from "../types";
import Flag from "./Flag";
import Tooltip from "./Tooltip";
import { computeMvp } from "../mvp";

const ROLE_ICONS: Record<string, string> = {
  entry: "🎯",
  awp: "🔭",
  support: "🛡️",
  lurker: "🕵️",
  igl: "🧠",
};

function ScoreboardTable({
  title,
  rows,
  mvpName,
}: {
  title: string;
  rows: ScoreboardRow[];
  mvpName: string | null;
}) {
  return (
    <div className="scoreboard">
      <div className="scoreboard-title">{title}</div>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>K</th>
            <th>D</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className={r.name === mvpName ? "mvp-row" : ""}>
              <td>
                <Flag country={r.country} size={16} /> {r.name}{" "}
                <span className="sb-role-icon">{ROLE_ICONS[r.role]}</span>
                {r.name === mvpName && <span className="mvp-badge">★ MVP</span>}
              </td>
              <td className="sb-kills">{r.kills}</td>
              <td>{r.deaths}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchRecap({ match }: { match: MatchResult }) {
  const mapScoreLines = match.maps.map((m) => `${m.name}: ${m.scoreA}-${m.scoreB}`);

  return (
    <div className="match-recap">
      <div className="live-scoreline">
        <div className={`live-team ${match.teamAIsUser ? "is-user" : ""}`}>
          {match.teamAIsUser && <span className="user-star">★ </span>}
          {match.teamA}
        </div>
        <div className="live-map-score">
          <span className="big-score">{match.score.split("-")[0]}</span>
          <Tooltip
            content={
              <>
                {mapScoreLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </>
            }
          >
            <span className="series-format">{match.format}</span>
          </Tooltip>
          <span className="big-score">{match.score.split("-")[1]}</span>
        </div>
        <div className={`live-team ${match.teamBIsUser ? "is-user" : ""}`}>
          {match.teamBIsUser && <span className="user-star">★ </span>}
          {match.teamB}
        </div>
      </div>

      {match.maps.map((m, i) => {
        const mvpName = computeMvp(m.scoreboardA, m.scoreboardB);
        return (
          <div className="game-detail-map" key={i}>
            <div className="game-detail-map-header">
              Map {i + 1}: <strong>{m.name}</strong> — {m.scoreA}-{m.scoreB} ({m.winner})
            </div>
            {m.scoreboardA && m.scoreboardB && (
              <div className="scoreboard-pair">
                <ScoreboardTable title={match.teamA} rows={m.scoreboardA} mvpName={mvpName} />
                <ScoreboardTable title={match.teamB} rows={m.scoreboardB} mvpName={mvpName} />
              </div>
            )}
          </div>
        );
      })}

      <div className={`live-final-banner ${match.winnerIsUser ? "win" : "loss"} pop-in`}>
        {match.winnerIsUser ? "✓ You won this match!" : "✗ You lost this match."} Final: {match.score} (
        {match.winner})
      </div>
    </div>
  );
}
