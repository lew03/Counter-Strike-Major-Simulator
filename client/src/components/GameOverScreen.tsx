import type { MajorRun, HistoryEntry, MatchResult, Role } from "../types";
import Icon from "./Icon";

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

function byRole(players: PlayerTotals[]): Partial<Record<Role, PlayerTotals>> {
  const map: Partial<Record<Role, PlayerTotals>> = {};
  for (const p of players) map[p.role] = p;
  return map;
}

function mapScoreFor(m: MatchResult["maps"][number], userSide: "A" | "B") {
  return userSide === "A" ? { user: m.scoreA, opp: m.scoreB } : { user: m.scoreB, opp: m.scoreA };
}

// Data-driven postmortem: every line is computed from the match that was actually played
// (no invented stats), so it stays honest whether the loss was a stomp or a coin flip.
function buildTips(match: MatchResult): string[] {
  const userSide = match.teamAIsUser ? "A" : "B";
  const userPlayers = aggregateSide(match, userSide);
  const oppPlayers = aggregateSide(match, userSide === "A" ? "B" : "A");
  const tips: string[] = [];

  // 1. Weakest individual performer by K/D — the most directly actionable tip (who to swap).
  if (userPlayers.length > 0) {
    const weakest = [...userPlayers].sort((a, b) => a.kd - b.kd)[0];
    tips.push(
      `${weakest.name} (${ROLE_LABEL[weakest.role]}) had the roughest series — ${weakest.kills} kills / ${weakest.deaths} deaths (${weakest.kd.toFixed(2)} K/D). Worth checking the Transfer Window for an upgrade at that slot.`
    );
  }

  // 2. The single biggest role-vs-role gap — names the exact matchup that lost you the most ground.
  const userByRole = byRole(userPlayers);
  const oppByRole = byRole(oppPlayers);
  let worstGap: { role: Role; userKills: number; oppKills: number; diff: number } | null = null;
  for (const role of Object.keys(userByRole) as Role[]) {
    const u = userByRole[role];
    const o = oppByRole[role];
    if (!u || !o) continue;
    const diff = o.kills - u.kills;
    if (!worstGap || diff > worstGap.diff) worstGap = { role, userKills: u.kills, oppKills: o.kills, diff };
  }
  if (worstGap && worstGap.diff >= 4) {
    tips.push(
      `Your ${ROLE_LABEL[worstGap.role]} was outfragged ${worstGap.userKills}-${worstGap.oppKills} by their ${ROLE_LABEL[worstGap.role]} — the widest role gap in the series, and the slot most worth upgrading first.`
    );
  }

  // 3. Opponent's standout fragger — who specifically beat you.
  if (oppPlayers.length > 0) {
    const star = [...oppPlayers].sort((a, b) => b.kills - a.kills)[0];
    tips.push(`${star.name} ran riot with ${star.kills} kills against you — that firepower swung the series their way.`);
  }

  // 4. Whoever died most on your side — a positioning/trading tip rather than a roster one.
  if (userPlayers.length > 0) {
    const mostDeaths = [...userPlayers].sort((a, b) => b.deaths - a.deaths)[0];
    if (mostDeaths.deaths >= 12) {
      tips.push(
        `${mostDeaths.name} died the most on your side (${mostDeaths.deaths} times) — tighter positioning or better trades could cut that down, independent of who's on the roster.`
      );
    }
  }

  // 5. Worst individual map, if it was a multi-map series — useful for future map vetoes.
  if (match.maps.length > 1) {
    let worstMap: { name: string; user: number; opp: number; diff: number } | null = null;
    for (const m of match.maps) {
      const { user, opp } = mapScoreFor(m, userSide);
      const diff = user - opp;
      if (!worstMap || diff < worstMap.diff) worstMap = { name: m.name, user, opp, diff };
    }
    if (worstMap && worstMap.diff < 0) {
      tips.push(`${worstMap.name} was your worst map (lost ${worstMap.user}-${worstMap.opp}) — worth steering away from it if you get to veto.`);
    }
  }

  // 6. Overall series margin — sets expectations: was this close, or a real mismatch.
  const roundDiff = match.maps.reduce((sum, m) => {
    const { user, opp } = mapScoreFor(m, userSide);
    return sum + (user - opp);
  }, 0);
  if (roundDiff <= -15) {
    tips.push("That was a clear gap in firepower across the whole series — consider putting more budget into one star player rather than spreading it evenly.");
  } else if (roundDiff <= -6) {
    tips.push("A solid defeat rather than a nail-biter — a roster tweak or two before your next run wouldn't hurt.");
  } else if (roundDiff < 0) {
    tips.push("It was close — a round or two either way would have flipped it. No need to overhaul the roster, just run it back.");
  }

  return tips.slice(0, 5);
}

export default function GameOverScreen({
  run,
  history,
  lastMatch,
  onRestart,
  onNewDraft,
  onGoHome,
  prizeMoney,
}: {
  run: MajorRun;
  history: HistoryEntry[];
  lastMatch: MatchResult | null;
  onRestart: () => void;
  onNewDraft: () => void;
  onGoHome: () => void;
  prizeMoney: number;
}) {
  const wins = history.filter((h) => h.userWon).length;
  const won = run.userWon;
  const tips = !won && lastMatch ? buildTips(lastMatch) : [];
  const userSide = lastMatch?.teamAIsUser ? "A" : "B";
  const prizeReason = won ? "winning the Major" : `reaching the ${run.userEliminatedAt}`;

  return (
    <div className={`game-over-screen ${won ? "win" : "loss"} pop-in`}>
      <div className="game-over-title">
        {won ? (
          <><Icon name="trophy" size={30} strokeWidth={2} /> MAJOR CHAMPIONS</>
        ) : (
          "GAME OVER"
        )}
      </div>
      <div className="game-over-subtitle">
        {won
          ? "Your team ran the gauntlet and lifted the trophy."
          : `Eliminated — ${run.userEliminatedAt}. Champion: ${run.champion}.`}
      </div>

      <div className="game-over-record">
        Majors won: <strong>{wins}</strong> / {history.length} attempts
      </div>

      {prizeMoney > 0 && (
        <div className="prize-banner">
          <Icon name="dollar" size={15} /> Earned ${prizeMoney.toLocaleString()} for {prizeReason} — added to your budget.
        </div>
      )}

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
          <div className="live-scoreline">
            <div className={`live-team ${lastMatch.teamAIsUser ? "is-user" : ""}`}>
              {lastMatch.teamAIsUser && <span className="user-star"><Icon name="star" size={13} /> </span>}
              {lastMatch.teamA}
            </div>
            <div className="live-map-score">
              <span className="big-score">{lastMatch.score.split("-")[0]}</span>
              <span className="series-format">{lastMatch.format}</span>
              <span className="big-score">{lastMatch.score.split("-")[1]}</span>
            </div>
            <div className={`live-team ${lastMatch.teamBIsUser ? "is-user" : ""}`}>
              {lastMatch.teamBIsUser && <span className="user-star"><Icon name="star" size={13} /> </span>}
              {lastMatch.teamB}
            </div>
          </div>

          <div className="game-over-maps">
            {lastMatch.maps.map((m, i) => {
              const { user, opp } = mapScoreFor(m, userSide);
              const wonMap = user > opp;
              return (
                <div key={i} className={`game-over-map-line ${wonMap ? "won" : "lost"}`}>
                  <span>
                    Map {i + 1}: <strong>{m.name}</strong>
                  </span>
                  <span>
                    {m.scoreA}-{m.scoreB}
                  </span>
                  <span className="map-result-ico">
                    <Icon name={wonMap ? "check" : "x"} size={14} strokeWidth={2.4} />
                  </span>
                </div>
              );
            })}
          </div>

          <div className={`live-final-banner ${lastMatch.winnerIsUser ? "win" : "loss"} pop-in`}>
            {lastMatch.winnerIsUser ? (
              <><Icon name="check" size={15} strokeWidth={2.4} /> You won this match!</>
            ) : (
              <><Icon name="x" size={15} strokeWidth={2.4} /> You lost this match.</>
            )}{" "}
            Final: {lastMatch.score} ({lastMatch.winner})
          </div>
        </div>
      )}

      <div className="actions-stack">
        <button className="run-again-btn action-lg" onClick={onRestart}>
          <Icon name="refresh" size={18} /> Run Another Major
        </button>
        <div className="actions-row">
          <button className="secondary-btn actions-btn" onClick={onGoHome}>
            <Icon name="home" size={16} /> Home
          </button>
          <button className="danger-btn action-sm" onClick={onNewDraft}>
            <Icon name="trash" size={14} /> Start New Draft
          </button>
        </div>
      </div>
    </div>
  );
}
