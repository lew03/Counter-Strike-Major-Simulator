import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchResult, Role, ScoreboardRow } from "../types";
import Flag from "./Flag";
import MiniMap from "./MiniMap";
import MatchRecap from "./MatchRecap";
import { playWinSound, playLossSound } from "../sound";

const ROUND_DELAY_MS = 650;

const ROLE_ICONS: Record<string, string> = {
  entry: "🎯",
  awp: "🔭",
  support: "🛡️",
  lurker: "🕵️",
  igl: "🧠",
};

const WEAPON_POOL: Record<Role, string[]> = {
  awp: ["AWP"],
  entry: ["AK-47", "M4A4", "M4A1-S"],
  lurker: ["AK-47", "Galil AR", "FAMAS"],
  support: ["M4A4", "AK-47", "MP9"],
  igl: ["Desert Eagle", "USP-S", "Glock-18"],
};

function randomWeapon(role: Role) {
  const pool = WEAPON_POOL[role] || ["AK-47"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Spreads each player's final kill count across the rounds of the map so the
// scoreboard can be ticked up live in sync with the round-by-round reveal.
function buildKillSchedule(rows: ScoreboardRow[], totalRounds: number) {
  return rows.map((row) => {
    const points = new Set<number>();
    for (let k = 0; k < row.kills; k++) {
      const base = Math.floor(((k + 1) * totalRounds) / Math.max(1, row.kills));
      const jitter = Math.floor(Math.random() * 3) - 1;
      points.add(Math.max(0, Math.min(totalRounds - 1, base + jitter)));
    }
    return { ...row, killRounds: points };
  });
}

type KillSchedule = ReturnType<typeof buildKillSchedule>;

function killsAtRound(schedule: KillSchedule, roundIndex: number) {
  return schedule.map((row) => ({
    ...row,
    liveKills: Array.from(row.killRounds).filter((r) => r <= roundIndex).length,
  }));
}

// Builds HLTV-style feed lines (kills, plant/defuse/save, round-win) for one round.
function buildRoundFeed(
  roundIdx: number,
  winnerLetter: "A" | "B",
  teamAName: string,
  teamBName: string,
  scoreboardA: ScoreboardRow[],
  scoreboardB: ScoreboardRow[],
  scheduleA: KillSchedule,
  scheduleB: KillSchedule
): { text: string; kind: "kill" | "bomb" | "win" }[] {
  const lines: { text: string; kind: "kill" | "bomb" | "win" }[] = [];

  for (const k of scheduleA.filter((p) => p.killRounds.has(roundIdx))) {
    const victim = scoreboardB[Math.floor(Math.random() * scoreboardB.length)];
    lines.push({ text: `${k.name} killed ${victim.name} (${randomWeapon(k.role)})`, kind: "kill" });
  }
  for (const k of scheduleB.filter((p) => p.killRounds.has(roundIdx))) {
    const victim = scoreboardA[Math.floor(Math.random() * scoreboardA.length)];
    lines.push({ text: `${k.name} killed ${victim.name} (${randomWeapon(k.role)})`, kind: "kill" });
  }

  const winnerName = winnerLetter === "A" ? teamAName : teamBName;
  const loserName = winnerLetter === "A" ? teamBName : teamAName;
  const roll = Math.random();
  if (roll < 0.18) {
    lines.push({ text: "💣 Bomb planted", kind: "bomb" });
    lines.push({ text: `💥 Bomb detonates — ${winnerName} win the round`, kind: "win" });
  } else if (roll < 0.32) {
    lines.push({ text: "💣 Bomb planted", kind: "bomb" });
    lines.push({ text: `🛡️ Bomb defused — ${winnerName} win the round`, kind: "win" });
  } else if (roll < 0.45) {
    lines.push({ text: `🏃 ${loserName} save their weapons`, kind: "bomb" });
    lines.push({ text: `${winnerName} win the round`, kind: "win" });
  } else {
    lines.push({ text: `${winnerName} win the round — Elimination`, kind: "win" });
  }
  return lines;
}

function Scoreboard({ title, rows }: { title: string; rows: ReturnType<typeof killsAtRound> }) {
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
            <tr key={r.name}>
              <td>
                <Flag country={r.country} size={16} /> {r.name}{" "}
                <span className="sb-role-icon">{ROLE_ICONS[r.role]}</span>
              </td>
              <td className="sb-kills">
                <span key={r.liveKills} className="score-tick">
                  {r.liveKills}
                </span>
              </td>
              <td>{r.deaths}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface FeedLine {
  text: string;
  kind: "kill" | "bomb" | "win";
  round: number;
}

function KillFeed({ lines }: { lines: FeedLine[] }) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [lines.length]);

  return (
    <div className="kill-feed">
      <div className="kill-feed-title">Live Feed</div>
      <div className="kill-feed-list" ref={listRef}>
        {lines.map((l, i) => (
          <div key={i} className={`kill-feed-line ${l.kind} feed-line-in`}>
            <span className="kill-feed-round">R{l.round}</span> {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LiveMatch({
  match,
  onContinue,
  advancing,
  isLastRound,
}: {
  match: MatchResult;
  onContinue: () => void;
  advancing: boolean;
  isLastRound: boolean;
}) {
  const [mapIndex, setMapIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(-1); // -1 = not started
  const [finished, setFinished] = useState(false);
  const [feed, setFeed] = useState<FeedLine[]>([]);

  const map = match.maps[mapIndex];
  const timeline = map?.roundTimeline || [];

  const scheduleA = useMemo(
    () => (map?.scoreboardA ? buildKillSchedule(map.scoreboardA, timeline.length || 1) : []),
    [map]
  );
  const scheduleB = useMemo(
    () => (map?.scoreboardB ? buildKillSchedule(map.scoreboardB, timeline.length || 1) : []),
    [map]
  );

  useEffect(() => {
    if (!map || finished) return;
    if (roundIndex >= timeline.length - 1) {
      const userWonMap = (match.teamAIsUser && map.winner === match.teamA) || (match.teamBIsUser && map.winner === match.teamB);
      if (mapIndex === match.maps.length - 1) {
        setTimeout(() => {
          setFinished(true);
          if (match.winnerIsUser) playWinSound();
          else playLossSound();
        }, 500);
      } else {
        setTimeout(() => {
          userWonMap ? playWinSound() : playLossSound();
          setMapIndex((m) => m + 1);
          setRoundIndex(-1);
          setFeed([]);
        }, 900);
      }
      return;
    }
    const delay = roundIndex === -1 ? 500 : ROUND_DELAY_MS;
    const t = setTimeout(() => {
      setRoundIndex((r) => r + 1);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, mapIndex, finished]);

  useEffect(() => {
    if (roundIndex < 0 || !map?.scoreboardA || !map?.scoreboardB) return;
    const winnerLetter = timeline[roundIndex];
    if (!winnerLetter) return;
    const events = buildRoundFeed(
      roundIndex,
      winnerLetter,
      match.teamA,
      match.teamB,
      map.scoreboardA,
      map.scoreboardB,
      scheduleA,
      scheduleB
    );
    setFeed((prev) => [...prev, ...events.map((e) => ({ ...e, round: roundIndex + 1 }))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, mapIndex]);

  const liveScoreA = timeline.slice(0, roundIndex + 1).filter((r) => r === "A").length;
  const liveScoreB = timeline.slice(0, roundIndex + 1).filter((r) => r === "B").length;

  const prevMapWins = (team: "A" | "B") =>
    match.maps.slice(0, mapIndex).filter((m) => m.winner === (team === "A" ? match.teamA : match.teamB)).length;

  const handleSkip = () => {
    setFinished(true);
    if (match.winnerIsUser) playWinSound();
    else playLossSound();
  };

  // The action button (Skip / Play Next Round) always lives in this same top-right header
  // slot in both states, so the user's mouse barely has to move between clicking "Skip to
  // result" and the "Play Next Round" that follows it.
  if (finished) {
    return (
      <div className="live-match fade-in">
        <div className="live-match-header">
          <span className={`match-status-dot ${match.winnerIsUser ? "win" : "loss"}`} aria-hidden="true" />
          <span>Match complete</span>
          <button className="continue-btn" onClick={onContinue} disabled={advancing}>
            {advancing ? "Simulating round..." : isLastRound ? "See Result" : "Play Next Round"}
          </button>
        </div>
        <MatchRecap match={match} />
      </div>
    );
  }

  return (
    <div className="live-match fade-in">
      <div className="live-match-header is-live">
        <span className="live-dot" aria-hidden="true" />
        <span>LIVE — Your Match</span>
        <button className="skip-btn" onClick={handleSkip}>
          Skip to result
        </button>
      </div>

      <div className="live-scoreline">
        <div className={`live-team ${match.teamAIsUser ? "is-user" : ""}`}>
          {match.teamAIsUser && <span className="user-star">★ </span>}
          {match.teamA}
        </div>
        <div className="live-map-score">
          <span className="big-score">{prevMapWins("A")}</span>
          <span className="series-format">{match.format}</span>
          <span className="big-score">{prevMapWins("B")}</span>
        </div>
        <div className={`live-team ${match.teamBIsUser ? "is-user" : ""}`}>
          {match.teamBIsUser && <span className="user-star">★ </span>}
          {match.teamB}
        </div>
      </div>

      {map && (
        <>
          <div className="live-map-label">
            Map {mapIndex + 1} of {match.maps.length} — <strong>{map.name}</strong>
          </div>
          <div className="live-round-score">
            <span key={`a${liveScoreA}`} className="round-score-num score-tick">
              {liveScoreA}
            </span>
            <span className="round-score-sep">:</span>
            <span key={`b${liveScoreB}`} className="round-score-num score-tick">
              {liveScoreB}
            </span>
          </div>

          <div className="live-match-main">
            <MiniMap mapName={map.name} />

            {scheduleA.length > 0 && scheduleB.length > 0 && (
              <>
                <Scoreboard title={match.teamA} rows={killsAtRound(scheduleA, roundIndex)} />
                <Scoreboard title={match.teamB} rows={killsAtRound(scheduleB, roundIndex)} />
              </>
            )}
          </div>

          <KillFeed lines={feed} />
        </>
      )}
    </div>
  );
}
