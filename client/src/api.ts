import type {
  Role,
  Player,
  DraftSlot,
  Difficulty,
  DraftConfig,
  TeamResponse,
  StartMajorResponse,
  AdvanceMajorResponse,
} from "./types";

const BASE = "/api";

export async function fetchConfig(difficulty: Difficulty): Promise<DraftConfig> {
  const res = await fetch(`${BASE}/config?difficulty=${difficulty}`);
  if (!res.ok) throw new Error("Failed to fetch draft config");
  return res.json();
}

export async function fetchTeam(teamId: string): Promise<TeamResponse> {
  const res = await fetch(`${BASE}/team/${teamId}`);
  if (!res.ok) throw new Error("Team not found");
  return res.json();
}

export async function fetchRoleOptions(
  role: DraftSlot,
  remainingBudget: number,
  count: number
): Promise<Player[]> {
  const res = await fetch(
    `${BASE}/draft/options?role=${role}&remainingBudget=${Math.floor(remainingBudget)}&count=${count}`
  );
  if (!res.ok) throw new Error("Failed to fetch draft options");
  const data = await res.json();
  return data.options;
}

export async function createTeam(
  picks: Record<Role, string>,
  coachId: string,
  teamName: string,
  difficulty: Difficulty
): Promise<TeamResponse> {
  const res = await fetch(`${BASE}/team`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picks, coachId, teamName, difficulty }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create team" }));
    throw new Error(err.error || "Failed to create team");
  }
  return res.json();
}

export async function startMajor(teamId: string): Promise<StartMajorResponse> {
  const res = await fetch(`${BASE}/major/${teamId}/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start major");
  return res.json();
}

export async function advanceMajor(teamId: string): Promise<AdvanceMajorResponse> {
  const res = await fetch(`${BASE}/major/${teamId}/advance`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to advance major");
  return res.json();
}
