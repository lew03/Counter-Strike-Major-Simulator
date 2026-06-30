import type { MajorRun, HistoryEntry, MatchResult, Role } from "../types";
import MatchRecap from "./MatchRecap";

const ROLE_LABEL: Record<Role, string> = {
  entry: "Entry",
  awp: "AWP",
  support: "Support",
  lurker: "Lurker",
  igl: "IGL",
};

interface PlayerTotals {
  name: string;
  role: Role;
  kills: number;
  deaths: number;
  kd: number;
}

function aggregateSide(match: MatchResult, side: "A" | "B"): PlayerTotals[] {
  const totals = new Map<string, PlayerTotals>();
  for (const m of match.maps) {
    const board = side === "A" ? m.scoreboardA : m.scoreboardB;
    board?.forEach((r) => {
      const cur = totals.get(r.name) || { name: r.name, role: r.role, kills: 0, deaths: 0, kd: 0 };
      cur.kills += r.kills;
      cur.deaths += r.deaths;
      totals.set(r.name, cur);
    });
  }
  return [...totals.values()].map((p) => ({ ...p, kd: p.deaths > 0 ? p.kills / p.deaths : p.kills }));
}

// Data-driven postmortem: only states things derivable from the match that was actually
// played (no invented stats), so it stays honest even when the loss was close or random.
function buildTips(match: MatchResult): string[] {
  const userSide = match.teamAIsUser ? "A" : "B";
  const userPlayers = aggregateSide(match, userSide);
  const oppPlayers = aggregateSide(match, userSide === "A" ? "B" : "A");
  const tips: string[] = [];

  if (userPlayers.length > 0) {
    const weakest = [...userPlayers].sort((a, b) => a.kd - b.kd)[0];
    tips.push(
      `${weakest.name} (${ROLE_LABEL[weakest.role]}) had the roughest series — ${weakest.kills} kills / ${weakest.deaths} deaths. Worth checking the Transfer Window for an upgrade at that slot.`
    );
  }

  if (oppPlayers.length > 0) {
    const star = [...oppPlayers].sort((a, b) => b.kills - a.kills)[0];
    tips.push(`${star.name} ran riot with ${star.kills} kills against you — that firepower swung the series their way.`);
  }

  const roundDiff = match.maps.reduce((sum, m) => {
    const userScore = userSide === "A" ? m.scoreA : m.scoreB;
    const oppScore = userSide === "A" ? m.scoreB : m.scoreA;
    return sum + (userScore - oppScore);
  }, 0);

  if (roundDiff <= -10) {
    tips.push("That was a clear gap in firepower across the whole series — consider putting more budget into one star player rather than spreading it evenly.");
  } else if (roundDiff < 0) {
    tips.push("It was close — a round or two either way would have flipped it. No need to overhaul the roster, just run it back.");
  }

  return tips.slice(0, 3);
}

export default function GameOverScreen({
  run,
  history,
  lastMatch,
  onRestart,
  onNewDraft,
  onGoHome,
}: {
  run: MajorRun;
  history: HistoryEntry[];
  lastMatch: MatchResult | null;
  onRestart: () => void;
  onNewDraft: () => void;
  onGoHome: () => void;
}) {
  const wins = history.filter((h) => h.userWon).length;
  const won = run.userWon;
  const tips = !won && lastMatch ? buildTips(lastMatch) : [];

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

      {tips.length > 0 && (
        <div className="game-over-tips">
          <h4>What went wrong</h4>
          <ul>
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

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
        <button className="secondary-btn" onClick={onGoHome}>
          🏠 Home
        </button>
        <button className="danger-btn" onClick={onNewDraft}>
          Start New Draft
        </button>
      </div>
    </div>
  );
}
