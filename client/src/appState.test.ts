import { describe, it, expect } from "vitest";
import { appReducer, initialState, type AppState } from "./appState";
import type { InfiniteRunView, TeamResponse } from "./types";

// Minimal fixtures — the reducer only reads a handful of fields, so cast the rest away.
function makeRun(overrides: Partial<InfiniteRunView> = {}): InfiniteRunView {
  return {
    gamesPlayed: 3,
    gamesWon: 3,
    pendingPrize: 0,
    totalEarned: 90000,
    eliminated: false,
    pendingTransfer: false,
    nextTransferAt: 5,
    currentMatch: null,
    history: [],
    opponentBoost: 0.74,
    insured: false,
    insuranceCost: 105000,
    ...overrides,
  };
}

function makeTeam(overrides: Partial<TeamResponse> = {}): TeamResponse {
  return {
    difficulty: "normal",
    gameMode: "major",
    activeRun: null,
    activeInfiniteRun: null,
    ...overrides,
  } as TeamResponse;
}

describe("appReducer", () => {
  it("WELCOME_START records difficulty + mode and advances to naming", () => {
    const s = appReducer(initialState, { type: "WELCOME_START", difficulty: "hard", mode: "infinite" });
    expect(s.stage).toBe("name");
    expect(s.difficulty).toBe("hard");
    expect(s.mode).toBe("infinite");
  });

  it("NAME_SUBMIT stores the name and moves to the draft", () => {
    const s = appReducer(initialState, { type: "NAME_SUBMIT", name: "Aurora" });
    expect(s.stage).toBe("draft");
    expect(s.pendingTeamName).toBe("Aurora");
  });

  it("INFINITE_STARTED enters the run and bumps the remount key", () => {
    const run = makeRun({ gamesPlayed: 0, gamesWon: 0 });
    const s = appReducer(initialState, { type: "INFINITE_STARTED", run });
    expect(s.stage).toBe("infinite");
    expect(s.infiniteRun).toBe(run);
    expect(s.infiniteAttempt).toBe(initialState.infiniteAttempt + 1);
  });

  it("INFINITE_RESUMED re-enters the run only when one exists", () => {
    const base: AppState = { ...initialState, infiniteRun: makeRun(), stage: "team" };
    expect(appReducer(base, { type: "INFINITE_RESUMED" }).stage).toBe("infinite");
    // No run → no-op.
    const noRun: AppState = { ...initialState, infiniteRun: null, stage: "team" };
    expect(appReducer(noRun, { type: "INFINITE_RESUMED" }).stage).toBe("team");
  });

  it("GO_HOME is non-destructive — the infinite run is kept", () => {
    const run = makeRun();
    const base: AppState = { ...initialState, team: makeTeam(), infiniteRun: run, stage: "infinite" };
    const s = appReducer(base, { type: "GO_HOME" });
    expect(s.stage).toBe("team");
    expect(s.infiniteRun).toBe(run); // not cleared
  });

  it("BOOT_RESOLVED restores a live infinite run and derives the mode", () => {
    const run = makeRun();
    const team = makeTeam({ gameMode: "infinite", activeInfiniteRun: run });
    const s = appReducer(initialState, { type: "BOOT_RESOLVED", team });
    expect(s.stage).toBe("team");
    expect(s.mode).toBe("infinite");
    expect(s.infiniteRun).toBe(run);
  });

  it("TEAM_READY routes to the infinite run when one is supplied, else the team screen", () => {
    const team = makeTeam({ gameMode: "infinite" });
    const withRun = appReducer(initialState, { type: "TEAM_READY", team, persist: true, infiniteRun: makeRun() });
    expect(withRun.stage).toBe("infinite");
    const major = appReducer(initialState, { type: "TEAM_READY", team: makeTeam(), persist: true });
    expect(major.stage).toBe("team");
  });

  it("RESTART returns to the initial state (done booting)", () => {
    const dirty: AppState = { ...initialState, stage: "major", team: makeTeam(), infiniteAttempt: 5 };
    const s = appReducer(dirty, { type: "RESTART" });
    expect(s.stage).toBe("welcome");
    expect(s.team).toBeNull();
    expect(s.booting).toBe(false);
  });
});
