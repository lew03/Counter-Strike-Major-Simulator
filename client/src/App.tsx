import { useEffect, useReducer, useState } from "react";
import type { Difficulty, Role, TeamResponse } from "./types";
import { createTeam, startMajor, advanceMajor as advanceMajorApi, fetchTeam, startInfinite, advanceInfinite, confirmInfiniteTransfer } from "./api";
import { appReducer, initialState } from "./appState";
import Welcome from "./components/Welcome";
import TeamName from "./components/TeamName";
import Draft from "./components/Draft";
import TeamSummary from "./components/TeamSummary";
import InfiniteLobby from "./components/InfiniteLobby";
import TransferWindow from "./components/TransferWindow";
import MajorView from "./components/MajorView";
import InfiniteMode from "./components/InfiniteMode";
import SettingsPage from "./components/SettingsPage";
import Tooltip from "./components/Tooltip";
import Icon from "./components/Icon";
import { isMuted, setMuted } from "./sound";

const SAVED_TEAM_KEY = "csmajor_teamId";
// The chosen game mode is persisted separately so a reload restores the correct experience
// (Infinite vs Major) even if the server predates the durable `gameMode` field.
const SAVED_MODE_KEY = "csmajor_mode";

function readSavedMode(): "major" | "infinite" {
  return localStorage.getItem(SAVED_MODE_KEY) === "infinite" ? "infinite" : "major";
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [muted, setMutedState] = useState(isMuted());

  // On load, resume a previously-drafted team if one is saved and still on the server.
  useEffect(() => {
    const savedId = localStorage.getItem(SAVED_TEAM_KEY);
    if (!savedId) {
      dispatch({ type: "BOOT_RESOLVED", team: null });
      return;
    }
    fetchTeam(savedId)
      .then((res) => dispatch({ type: "BOOT_RESOLVED", team: res, mode: readSavedMode() }))
      .catch(() => {
        localStorage.removeItem(SAVED_TEAM_KEY);
        dispatch({ type: "BOOT_RESOLVED", team: null });
      });
  }, []);

  const handleWelcomeStart = (chosen: Difficulty, mode: "major" | "infinite") => {
    dispatch({ type: "WELCOME_START", difficulty: chosen, mode });
  };

  const handleNameSubmit = (name: string) => {
    dispatch({ type: "NAME_SUBMIT", name });
  };

  const handleDraftComplete = async (picks: Record<Role, string>, coachId: string) => {
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const res = await createTeam(picks, coachId, state.pendingTeamName, state.difficulty, state.mode);
      localStorage.setItem(SAVED_TEAM_KEY, res.teamId);
      localStorage.setItem(SAVED_MODE_KEY, state.mode);
      // Trust both the server's gameMode and the client's intended mode (defensive fallback
      // in case the server is running stale code without the gameMode field).
      if (res.gameMode === "infinite" || state.mode === "infinite") {
        const infRes = await startInfinite(res.teamId);
        dispatch({ type: "TEAM_READY", team: res, persist: true, infiniteRun: infRes.run });
      } else {
        dispatch({ type: "TEAM_READY", team: res, persist: true });
      }
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
    }
  };

  const handleTransferComplete = (updated: TeamResponse) => {
    dispatch({ type: "TEAM_READY", team: updated, persist: false });
  };

  const handleStartMajor = async () => {
    if (!state.team) return;
    dispatch({ type: "START_MAJOR_REQUEST" });
    try {
      const res = await startMajor(state.team.teamId);
      dispatch({ type: "MAJOR_STARTED", run: res.run });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
    }
  };

  const handleAdvance = async () => {
    if (!state.team) return;
    dispatch({ type: "ADVANCE_REQUEST" });
    try {
      const res = await advanceMajorApi(state.team.teamId);
      // A finished major changes budget (prize money), loss streak, and difficulty escalation
      // server-side — re-fetch the team so the client doesn't have to re-derive those formulas.
      const updatedTeam = res.run.finished ? await fetchTeam(state.team.teamId) : undefined;
      dispatch({ type: "ADVANCE_RESULT", run: res.run, roundResult: res.roundResult, prizeMoney: res.prizeMoney, updatedTeam });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
      dispatch({ type: "ADVANCE_FAILED" });
    }
  };

  const handleRestart = () => {
    if (state.team && !window.confirm("This will permanently clear your roster and career history. Continue?")) {
      return;
    }
    localStorage.removeItem(SAVED_TEAM_KEY);
    localStorage.removeItem(SAVED_MODE_KEY);
    dispatch({ type: "RESTART" });
  };

  const handleGoHome = () => {
    // Leaving an in-progress infinite run discards it (it can't be resumed), so guard against
    // an accidental click throwing away a live win streak.
    const activeInfinite = state.infiniteRun && !state.infiniteRun.eliminated && state.infiniteRun.gamesWon > 0;
    if (
      state.stage === "infinite" &&
      activeInfinite &&
      !window.confirm(
        `End your current run? You're on a ${state.infiniteRun!.gamesWon}-win streak — leaving now ends it and it can't be resumed.`
      )
    ) {
      return;
    }
    dispatch({ type: "GO_HOME" });
  };

  const handleResumeTournament = () => {
    dispatch({ type: "RESUME_TOURNAMENT" });
  };

  const handleStartInfinite = async () => {
    if (!state.team) return;
    try {
      const res = await startInfinite(state.team.teamId);
      dispatch({ type: "INFINITE_STARTED", run: res.run });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
    }
  };

  const handleAdvanceInfinite = async () => {
    if (!state.team) return;
    dispatch({ type: "INFINITE_ADVANCE_REQUEST" });
    try {
      const res = await advanceInfinite(state.team.teamId);
      dispatch({ type: "INFINITE_ADVANCE_RESULT", run: res.run, team: res.team });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
      dispatch({ type: "INFINITE_ADVANCE_FAILED" });
    }
  };

  const handleInfiniteTransferComplete = async (updated: import("./types").TeamResponse) => {
    dispatch({ type: "UPDATE_TEAM", team: updated });
    dispatch({ type: "SET_SHOW_TRANSFER", open: false });
    if (state.team && state.infiniteRun) {
      try {
        const res = await confirmInfiniteTransfer(state.team.teamId);
        dispatch({ type: "INFINITE_TRANSFER_CONFIRMED", run: res.run });
      } catch { /* non-critical — run state will be cleaned up on next advance */ }
    }
  };

  const handleInfiniteSkipTransfer = async () => {
    if (!state.team) return;
    try {
      const res = await confirmInfiniteTransfer(state.team.teamId);
      dispatch({ type: "INFINITE_TRANSFER_CONFIRMED", run: res.run });
    } catch { /* non-critical */ }
  };

  const handleRestartInfinite = async () => {
    if (!state.team) return;
    try {
      const res = await startInfinite(state.team.teamId);
      dispatch({ type: "INFINITE_STARTED", run: res.run });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  if (state.booting) {
    return (
      <div className="hero-screen">
        <div className="hint">Loading…</div>
      </div>
    );
  }

  const {
    stage,
    team,
    difficulty,
    mode,
    run,
    roundLog,
    error,
    advancing,
    runAttempt,
    showTransfer,
    showSettings,
    lastPrizeMoney,
    infiniteRun,
    infiniteAdvancing,
    infiniteAttempt,
  } = state;
  const hasActiveRun = !!run && !run.finished;

  return (
    <>
      {stage === "welcome" ? (
        <Welcome onStart={handleWelcomeStart} />
      ) : stage === "name" ? (
        <TeamName onSubmit={handleNameSubmit} />
      ) : (
        <div className="app">
          <header className="app-header-bar">
            <button
              className="logo-block logo-block-btn"
              onClick={handleGoHome}
              aria-label="Home"
              title="Home"
            >
              <span className="logo-icon"><Icon name="crosshair" size={22} strokeWidth={2} /></span>
              <span className="logo-text">Frag GM</span>
            </button>
            <div className="header-actions">
              {team && (stage === "major" || stage === "infinite") && (
                <button className="secondary-btn" onClick={handleGoHome}>
                  <Icon name="home" size={16} /> Home
                </button>
              )}
              <Tooltip
                placement="bottom"
                content={
                  <span>
                    Baseline difficulty chosen at draft time.
                    {team && team.difficultyLevel > 0 && (
                      <>
                        <br />
                        Increased after {team.difficultyLevel} major win{team.difficultyLevel > 1 ? "s" : ""} — AI
                        is now +{(team.escalationBonus * 100).toFixed(0)}% stronger than baseline.
                      </>
                    )}
                  </span>
                }
              >
                <span className="difficulty-badge">
                  {DIFFICULTY_LABEL[difficulty]}
                  {team && team.difficultyLevel > 0 && (
                    <span className="difficulty-badge-up"><Icon name="arrowUp" size={12} strokeWidth={2.4} /></span>
                  )}
                </span>
              </Tooltip>
              <button
                className="secondary-btn"
                onClick={() => dispatch({ type: "SET_SHOW_SETTINGS", open: !showSettings })}
              >
                <Icon name="settings" size={16} /> Settings
              </button>
              <button className="mute-btn" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
                <Icon name={muted ? "volumeMuted" : "volume"} size={18} />
              </button>
            </div>
          </header>

          {error && (
            <div className="panel error">
              <span>{error}</span>
              <button className="link-btn" onClick={() => dispatch({ type: "SET_ERROR", error: null })}>
                dismiss
              </button>
            </div>
          )}

          {showSettings ? (
            <SettingsPage
              onBack={() => dispatch({ type: "SET_SHOW_SETTINGS", open: false })}
              onWipeData={handleRestart}
              hasTeam={!!team}
            />
          ) : (
            <>
              {stage === "draft" && (
                <Draft
                  difficulty={difficulty}
                  mode={mode}
                  onComplete={handleDraftComplete}
                />
              )}

              {stage === "team" && team && showTransfer && (
                <TransferWindow
                  teamId={team.teamId}
                  players={team.players}
                  coach={team.coach}
                  budget={team.budget}
                  wins={mode === "infinite" ? 0 : team.difficultyLevel}
                  onComplete={mode === "infinite" ? handleInfiniteTransferComplete : handleTransferComplete}
                  onClose={() => dispatch({ type: "SET_SHOW_TRANSFER", open: false })}
                />
              )}

              {stage === "team" && team && !showTransfer && mode === "infinite" && (
                <InfiniteLobby
                  team={team}
                  onStartRun={handleStartInfinite}
                  onNewDraft={handleRestart}
                />
              )}

              {stage === "team" && team && !showTransfer && mode !== "infinite" && (
                <TeamSummary
                  teamName={team.name}
                  players={team.players}
                  coach={team.coach}
                  overall={team.overall}
                  chemistry={team.chemistry}
                  totalSpend={team.totalSpend}
                  budget={team.budget}
                  difficulty={team.difficulty}
                  difficultyLevel={team.difficultyLevel}
                  escalationBonus={team.escalationBonus}
                  lossStreak={team.lossStreak}
                  moraleMultiplier={team.moraleMultiplier}
                  history={team.history}
                  onSimulate={handleStartMajor}
                  onOpenTransfer={() => dispatch({ type: "SET_SHOW_TRANSFER", open: true })}
                  simulating={false}
                  hasActiveRun={hasActiveRun}
                  onResume={handleResumeTournament}
                  onNewDraft={handleRestart}
                />
              )}

              {stage === "infinite" && infiniteRun && team && (
                <InfiniteMode
                  key={infiniteAttempt}
                  run={infiniteRun}
                  team={team}
                  onAdvance={handleAdvanceInfinite}
                  onTransferComplete={handleInfiniteTransferComplete}
                  onSkipTransfer={handleInfiniteSkipTransfer}
                  onRestart={handleRestartInfinite}
                  onGoHome={handleGoHome}
                  advancing={infiniteAdvancing}
                />
              )}

              {stage === "major" && run && team && (
                <MajorView
                  key={runAttempt}
                  run={run}
                  roundLog={roundLog}
                  history={team.history}
                  onAdvance={handleAdvance}
                  onRestart={handleStartMajor}
                  onNewDraft={handleRestart}
                  onGoHome={handleGoHome}
                  prizeMoney={lastPrizeMoney}
                  advancing={advancing}
                />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
