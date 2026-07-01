import type { HistoryEntry } from "../types";

const FINISH_RANK = ["Champion", "Grand Final", "Semifinal", "Quarterfinal", "Swiss Stage"];

function finishOf(h: HistoryEntry): string {
  return h.userWon ? "Champion" : h.eliminatedAt || "Swiss Stage";
}

function reachedPlayoffs(h: HistoryEntry): boolean {
  return h.userWon || (!!h.eliminatedAt && h.eliminatedAt !== "Swiss Stage");
}

export default function CareerStats({ history }: { history: HistoryEntry[] }) {
  const attempts = history.length;
  const wins = history.filter((h) => h.userWon).length;
  const winRate = attempts > 0 ? Math.round((wins / attempts) * 100) : 0;

  const bestFinish =
    attempts === 0
      ? "—"
      : FINISH_RANK.find((rank) => history.some((h) => finishOf(h) === rank)) ||
        "Swiss Stage";

  const playoffRuns = history.filter(reachedPlayoffs).length;

  return (
    <div className="career-stats">
      <div className="career-stats-title">🏆 Career</div>
      <div className="career-stats-grid">
        <div className="career-stat">
          <div className="career-stat-value">{wins}</div>
          <div className="career-stat-label">Majors won</div>
        </div>
        <div className="career-stat">
          <div className="career-stat-value">{attempts}</div>
          <div className="career-stat-label">Attempts</div>
        </div>
        <div className="career-stat">
          <div className="career-stat-value">{winRate}%</div>
          <div className="career-stat-label">Win rate</div>
        </div>
        <div className="career-stat">
          <div className="career-stat-value">{playoffRuns}</div>
          <div className="career-stat-label">Playoff runs</div>
        </div>
        <div className="career-stat">
          <div className="career-stat-value small">{bestFinish}</div>
          <div className="career-stat-label">Best finish</div>
        </div>
      </div>
    </div>
  );
}
