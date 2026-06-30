import type { HistoryEntry } from "../types";

const FINISH_RANK = ["Champion", "Grand Final", "Semifinal", "Quarterfinal", "Swiss Stage"];

function finishOf(h: HistoryEntry): string {
  return h.userWon ? "Champion" : h.eliminatedAt || "Swiss Stage";
}

function reachedPlayoffs(h: HistoryEntry): boolean {
  return h.userWon || (!!h.eliminatedAt && h.eliminatedAt !== "Swiss Stage");
}

interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
  check: (history: HistoryEntry[]) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    icon: "🏆",
    label: "Major Champion",
    desc: "Win your first major",
    check: (h) => h.some((e) => e.userWon),
  },
  {
    id: "back_to_back",
    icon: "🔥",
    label: "Back-to-Back",
    desc: "Win two majors in a row",
    check: (h) => {
      for (let i = 1; i < h.length; i++) {
        if (h[i].userWon && h[i - 1].userWon) return true;
      }
      return false;
    },
  },
  {
    id: "three_wins",
    icon: "👑",
    label: "Dynasty",
    desc: "Win 3 majors",
    check: (h) => h.filter((e) => e.userWon).length >= 3,
  },
  {
    id: "five_wins",
    icon: "💎",
    label: "Legendary",
    desc: "Win 5 majors",
    check: (h) => h.filter((e) => e.userWon).length >= 5,
  },
  {
    id: "grand_final",
    icon: "🥈",
    label: "Grand Finalist",
    desc: "Reach the Grand Final",
    check: (h) =>
      h.some((e) => e.userWon || e.eliminatedAt === "Grand Final"),
  },
  {
    id: "semifinal",
    icon: "🎯",
    label: "Top 4",
    desc: "Reach the Semifinal",
    check: (h) =>
      h.some(
        (e) =>
          e.userWon ||
          e.eliminatedAt === "Grand Final" ||
          e.eliminatedAt === "Semifinal"
      ),
  },
  {
    id: "five_playoffs",
    icon: "⚡",
    label: "Consistent",
    desc: "Reach the playoffs 5 times",
    check: (h) => h.filter(reachedPlayoffs).length >= 5,
  },
  {
    id: "ten_attempts",
    icon: "💪",
    label: "Grinder",
    desc: "Run 10 majors",
    check: (h) => h.length >= 10,
  },
  {
    id: "comeback",
    icon: "😤",
    label: "Comeback Kid",
    desc: "Win after 3+ consecutive losses",
    check: (h) => {
      let streak = 0;
      for (const e of h) {
        if (!e.userWon) {
          streak++;
        } else if (streak >= 3) {
          return true;
        } else {
          streak = 0;
        }
      }
      return false;
    },
  },
];

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

  const earned = ACHIEVEMENTS.filter((a) => a.check(history));
  const locked = ACHIEVEMENTS.filter((a) => !a.check(history));

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

      {attempts > 0 && (
        <div className="trophy-cabinet">
          <div className="trophy-cabinet-title">🎖️ Achievements</div>
          <div className="trophy-grid">
            {earned.map((a) => (
              <div key={a.id} className="trophy earned" title={a.desc}>
                <span className="trophy-icon">{a.icon}</span>
                <span className="trophy-label">{a.label}</span>
              </div>
            ))}
            {locked.map((a) => (
              <div key={a.id} className="trophy locked" title={a.desc}>
                <span className="trophy-icon">🔒</span>
                <span className="trophy-label">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
