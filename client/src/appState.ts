import type { Difficulty, MajorRun, RoundResult, TeamResponse, InfiniteRunView } from "./types";

export type Stage = "welcome" | "name" | "draft" | "team" | "major" | "infinite";

export interface AppState {
  booting: boolean;
  stage: Stage;
  difficulty: Difficulty;
  mode: "major" | "infinite";
  pendingTeamName: string;
  team: TeamResponse | null;
  run: MajorRun | null;
  roundLog: RoundResult[];
  advancing: boolean;
  error: string | null;
  runAttempt: number;
  showTransfer: boolean;
  showSettings: boolean;
  lastPrizeMoney: number;
  infiniteRun: InfiniteRunView | null;
  infiniteAdvancing: boolean;
  // Bumped every time an infinite run (re)starts, used as a React key to force the
  // InfiniteMode component to remount with fresh internal phase state on Try Again.
  infiniteAttempt: number;
}

export const initialState: AppState = {
  booting: true,
  stage: "welcome",
  difficulty: "normal",
  mode: "major",
  pendingTeamName: "Your Team",
  team: null,
  run: null,
  roundLog: [],
  advancing: false,
  error: null,
  runAttempt: 0,
  showTransfer: false,
  showSettings: false,
  lastPrizeMoney: 0,
  infiniteRun: null,
  infiniteAdvancing: false,
  infiniteAttempt: 0,
};

// Pulls the resumable run + round log (if any) off a freshly-fetched team payload.
function activeRunFields(team: TeamResponse) {
  return team.activeRun ? { run: team.activeRun.run, roundLog: team.activeRun.roundLog } : { run: null, roundLog: [] };
}

export type AppAction =
  | { type: "BOOT_RESOLVED"; team: TeamResponse | null; mode?: "major" | "infinite" }
  | { type: "WELCOME_START"; difficulty: Difficulty; mode: "major" | "infinite" }
  | { type: "NAME_SUBMIT"; name: string }
  | { type: "TEAM_READY"; team: TeamResponse; persist: boolean; infiniteRun?: InfiniteRunView }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "START_MAJOR_REQUEST" }
  | { type: "MAJOR_STARTED"; run: MajorRun }
  | { type: "ADVANCE_REQUEST" }
  | { type: "ADVANCE_RESULT"; run: MajorRun; roundResult: RoundResult | null; prizeMoney: number; updatedTeam?: TeamResponse }
  | { type: "ADVANCE_FAILED" }
  | { type: "RESTART" }
  | { type: "GO_HOME" }
  | { type: "RESUME_TOURNAMENT" }
  | { type: "SET_SHOW_TRANSFER"; open: boolean }
  | { type: "SET_SHOW_SETTINGS"; open: boolean }
  | { type: "INFINITE_STARTED"; run: InfiniteRunView }
  | { type: "INFINITE_ADVANCE_REQUEST" }
  | { type: "INFINITE_ADVANCE_RESULT"; run: InfiniteRunView; team: TeamResponse }
  | { type: "INFINITE_ADVANCE_FAILED" }
  | { type: "INFINITE_TRANSFER_CONFIRMED"; run: InfiniteRunView }
  | { type: "UPDATE_TEAM"; team: TeamResponse };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "BOOT_RESOLVED":
      return action.team
        ? {
            ...state,
            booting: false,
            team: action.team,
            difficulty: action.team.difficulty,
            // Prefer the server's durable gameMode; fall back to the locally-persisted mode
            // for teams created before the server tracked it.
            mode: action.team.gameMode || action.mode || "major",
            stage: "team",
            ...activeRunFields(action.team),
          }
        : { ...state, booting: false };

    case "WELCOME_START":
      return { ...state, difficulty: action.difficulty, mode: action.mode, stage: "name" };

    case "NAME_SUBMIT":
      return { ...state, pendingTeamName: action.name, stage: "draft" };

    case "TEAM_READY":
      return {
        ...state,
        team: action.team,
        difficulty: action.team.difficulty,
        mode: action.team.gameMode || state.mode,
        showTransfer: false,
        showSettings: false,
        error: null,
        stage: action.infiniteRun ? "infinite" : "team",
        infiniteRun: action.infiniteRun ?? null,
        ...activeRunFields(action.team),
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "START_MAJOR_REQUEST":
      return { ...state, error: null, showTransfer: false };

    case "MAJOR_STARTED":
      return {
        ...state,
        run: action.run,
        roundLog: [],
        runAttempt: state.runAttempt + 1,
        lastPrizeMoney: 0,
        stage: "major",
      };

    case "ADVANCE_REQUEST":
      return { ...state, advancing: true, error: null };

    case "ADVANCE_RESULT": {
      const roundLog = action.roundResult ? [...state.roundLog, action.roundResult] : state.roundLog;
      // On a finished major, prefer a fresh team fetch (updatedTeam) over hand-patching —
      // budget (prize money), loss streak, difficulty escalation, and morale all change
      // server-side on completion, and re-deriving every one of those formulas client-side
      // would just be a second place for them to drift out of sync.
      const team = action.updatedTeam ?? state.team;
      return {
        ...state,
        advancing: false,
        run: action.run,
        roundLog,
        team,
        lastPrizeMoney: action.prizeMoney || 0,
      };
    }

    case "ADVANCE_FAILED":
      return { ...state, advancing: false };

    case "RESTART":
      return { ...initialState, booting: false };

    case "GO_HOME":
      return state.team
        ? { ...state, stage: "team", showTransfer: false, showSettings: false, infiniteRun: null, run: state.run }
        : state;

    case "UPDATE_TEAM":
      return { ...state, team: action.team };

    case "INFINITE_STARTED":
      return {
        ...state,
        infiniteRun: action.run,
        infiniteAdvancing: false,
        infiniteAttempt: state.infiniteAttempt + 1,
        stage: "infinite",
        error: null,
      };

    case "INFINITE_ADVANCE_REQUEST":
      return { ...state, infiniteAdvancing: true, error: null };

    case "INFINITE_ADVANCE_RESULT":
      return { ...state, infiniteAdvancing: false, infiniteRun: action.run, team: action.team };

    case "INFINITE_ADVANCE_FAILED":
      return { ...state, infiniteAdvancing: false };

    case "INFINITE_TRANSFER_CONFIRMED":
      return { ...state, infiniteRun: action.run };

    case "RESUME_TOURNAMENT":
      return state.run && !state.run.finished ? { ...state, stage: "major", showSettings: false } : state;

    case "SET_SHOW_TRANSFER":
      return { ...state, showTransfer: action.open };

    case "SET_SHOW_SETTINGS":
      return { ...state, showSettings: action.open };

    default:
      return state;
  }
}
