import type { Difficulty, MajorRun, RoundResult, TeamResponse } from "./types";

export type Stage = "welcome" | "name" | "draft" | "team" | "major";

export interface AppState {
  booting: boolean;
  stage: Stage;
  difficulty: Difficulty;
  pendingTeamName: string;
  team: TeamResponse | null;
  run: MajorRun | null;
  roundLog: RoundResult[];
  advancing: boolean;
  error: string | null;
  runAttempt: number;
  showTransfer: boolean;
  showSettings: boolean;
  // True while drafting as a Rebuild (full re-draft of an existing team) rather than a brand
  // new team — changes which API handleDraftComplete calls and skips the team-naming screen.
  rebuilding: boolean;
  lastPrizeMoney: number;
}

export const initialState: AppState = {
  booting: true,
  stage: "welcome",
  difficulty: "normal",
  pendingTeamName: "Your Team",
  team: null,
  run: null,
  roundLog: [],
  advancing: false,
  error: null,
  runAttempt: 0,
  showTransfer: false,
  showSettings: false,
  rebuilding: false,
  lastPrizeMoney: 0,
};

// Pulls the resumable run + round log (if any) off a freshly-fetched team payload.
function activeRunFields(team: TeamResponse) {
  return team.activeRun ? { run: team.activeRun.run, roundLog: team.activeRun.roundLog } : { run: null, roundLog: [] };
}

export type AppAction =
  | { type: "BOOT_RESOLVED"; team: TeamResponse | null }
  | { type: "WELCOME_START"; difficulty: Difficulty }
  | { type: "NAME_SUBMIT"; name: string }
  | { type: "TEAM_READY"; team: TeamResponse; persist: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "START_MAJOR_REQUEST" }
  | { type: "MAJOR_STARTED"; run: MajorRun }
  | { type: "ADVANCE_REQUEST" }
  | { type: "ADVANCE_RESULT"; run: MajorRun; roundResult: RoundResult | null; prizeMoney: number; updatedTeam?: TeamResponse }
  | { type: "ADVANCE_FAILED" }
  | { type: "RESTART" }
  | { type: "GO_HOME" }
  | { type: "RESUME_TOURNAMENT" }
  | { type: "START_REBUILD" }
  | { type: "SET_SHOW_TRANSFER"; open: boolean }
  | { type: "SET_SHOW_SETTINGS"; open: boolean };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "BOOT_RESOLVED":
      return action.team
        ? {
            ...state,
            booting: false,
            team: action.team,
            difficulty: action.team.difficulty,
            stage: "team",
            ...activeRunFields(action.team),
          }
        : { ...state, booting: false };

    case "WELCOME_START":
      return { ...state, difficulty: action.difficulty, stage: "name" };

    case "NAME_SUBMIT":
      return { ...state, pendingTeamName: action.name, stage: "draft" };

    case "TEAM_READY":
      return {
        ...state,
        team: action.team,
        difficulty: action.team.difficulty,
        showTransfer: false,
        showSettings: false,
        rebuilding: false,
        error: null,
        stage: "team",
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
      return state.team ? { ...state, stage: "team", showTransfer: false, showSettings: false } : state;

    case "RESUME_TOURNAMENT":
      return state.run && !state.run.finished ? { ...state, stage: "major", showSettings: false } : state;

    case "START_REBUILD":
      return state.team
        ? { ...state, stage: "draft", rebuilding: true, showTransfer: false, showSettings: false, error: null }
        : state;

    case "SET_SHOW_TRANSFER":
      return { ...state, showTransfer: action.open };

    case "SET_SHOW_SETTINGS":
      return { ...state, showSettings: action.open };

    default:
      return state;
  }
}
