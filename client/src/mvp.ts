import type { ScoreboardRow } from "./types";

export function computeMvp(
  scoreboardA?: ScoreboardRow[],
  scoreboardB?: ScoreboardRow[]
): string | null {
  const all = [...(scoreboardA || []), ...(scoreboardB || [])];
  if (all.length === 0) return null;
  const best = [...all].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)[0];
  return best.name;
}
