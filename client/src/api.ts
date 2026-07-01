import type {
  Role,
  Player,
  DraftSlot,
  Difficulty,
  DraftConfig,
  TeamResponse,
  StartMajorResponse,
  AdvanceMajorResponse,
  StartInfiniteResponse,
  AdvanceInfiniteResponse,
  InfiniteRunView,
} from "./types";

const BASE = "/api";

export async function fetchConfig(difficulty: Difficulty, mode?: "major" | "infinite"): Promise<DraftConfig> {
  const modeParam = mode ? `&mode=${mode}` : "";
  const res = await fetch(`${BASE}/config?difficulty=${difficulty}${modeParam}`);
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
  difficulty: Difficulty,
  mode?: "major" | "infinite"
): Promise<TeamResponse> {
  const res = await fetch(`${BASE}/team`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picks, coachId, teamName, difficulty, mode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create team" }));
    throw new Error(err.error || "Failed to create team");
  }
  return res.json();
}

export async function fetchTransferOptions(
  role: DraftSlot,
  maxPrice: number,
  excludeIds: string[],
  wins: number
): Promise<Player[]> {
  const res = await fetch(
    `${BASE}/transfer-options?role=${role}&maxPrice=${Math.floor(maxPrice)}&exclude=${excludeIds.join(",")}&wins=${wins}`
  );
  if (!res.ok) throw new Error("Failed to fetch transfer options");
  const data = await res.json();
  return data.options;
}

export async function submitTransfer(
  teamId: string,
  picks: Record<Role, string>,
  coachId: string
): Promise<TeamResponse> {
  const res = await fetch(`${BASE}/team/${teamId}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picks, coachId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to apply transfers" }));
    throw new Error(err.error || "Failed to apply transfers");
  }
  return res.json();
}

export async function startInfinite(teamId: string): Promise<StartInfiniteResponse> {
  const res = await fetch(`${BASE}/infinite/${teamId}/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start infinite run");
  return res.json();
}

export async function advanceInfinite(teamId: string): Promise<AdvanceInfiniteResponse> {
  const res = await fetch(`${BASE}/infinite/${teamId}/advance`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to advance" }));
    throw new Error(err.error || "Failed to advance");
  }
  return res.json();
}

export async function confirmInfiniteTransfer(teamId: string): Promise<{ run: InfiniteRunView }> {
  const res = await fetch(`${BASE}/infinite/${teamId}/confirm-transfer`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to confirm transfer");
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
