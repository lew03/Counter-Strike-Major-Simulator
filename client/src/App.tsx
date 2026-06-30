import { useEffect, useReducer, useState } from "react";
import type { Difficulty, Role, TeamResponse } from "./types";
import { createTeam, startMajor, advanceMajor as advanceMajorApi, fetchTeam } from "./api";
import { appReducer, initialState } from "./appState";
import Welcome from "./components/Welcome";
import TeamName from "./components/TeamName";
import Draft from "./components/Draft";
import TeamSummary from "./components/TeamSummary";
import TransferWindow from "./components/TransferWindow";
import MajorView from "./components/MajorView";
import { isMuted, setMuted } from "./sound";

const SAVED_TEAM_KEY = "csmajor_teamId";

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
      .then((res) => dispatch({ type: "BOOT_RESOLVED", team: res }))
      .catch(() => {
        localStorage.removeItem(SAVED_TEAM_KEY);
        dispatch({ type: "BOOT_RESOLVED", team: null });
      });
  }, []);

  const handleWelcomeStart = (chosen: Difficulty) => {
    dispatch({ type: "WELCOME_START", difficulty: chosen });
  };

  const handleNameSubmit = (name: string) => {
    dispatch({ type: "NAME_SUBMIT", name });
  };

  const handleDraftComplete = async (picks: Record<Role, string>, coachId: string) => {
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const res = await createTeam(picks, coachId, state.pendingTeamName, state.difficulty);
      localStorage.setItem(SAVED_TEAM_KEY, res.teamId);
      dispatch({ type: "TEAM_READY", team: res, persist: true });
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
      dispatch({ type: "ADVANCE_RESULT", run: res.run, roundResult: res.roundResult });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
      dispatch({ type: "ADVANCE_FAILED" });
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(SAVED_TEAM_KEY);
    dispatch({ type: "RESTART" });
  };

  const handleGoHome = () => {
    dispatch({ type: "GO_HOME" });
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

  const { stage, team, difficulty, run, roundLog, error, advancing, runAttempt, showTransfer } = state;

  return (
    <>
      {stage === "welcome" ? (
        <Welcome onStart={handleWelcomeStart} />
      ) : stage === "name" ? (
        <TeamName onSubmit={handleNameSubmit} />
      ) : (
        <div className="app">
          <header className="app-header-bar">
            <div className="logo-block">
              <span className="logo-icon">🏆</span>
              <span className="logo-text">Major Simulator</span>
            </div>
            <div className="header-actions">
              {team && stage === "major" && (
                <button className="secondary-btn" onClick={handleGoHome}>
                  🏠 Home
                </button>
              )}
              <button className="secondary-btn" onClick={handleRestart}>
                Start New Draft
              </button>
              <button className="mute-btn" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
                {muted ? "🔇" : "🔊"}
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

          {stage === "draft" && <Draft difficulty={difficulty} onComplete={handleDraftComplete} />}

          {stage === "team" && team && showTransfer && (
            <TransferWindow
              teamId={team.teamId}
              players={team.players}
              coach={team.coach}
              budget={team.budget}
              onComplete={handleTransferComplete}
              onClose={() => dispatch({ type: "SET_SHOW_TRANSFER", open: false })}
            />
          )}

          {stage === "team" && team && !showTransfer && (
            <TeamSummary
              teamName={team.name}
              players={team.players}
              coach={team.coach}
              overall={team.overall}
              totalSpend={team.totalSpend}
              budget={team.budget}
              difficulty={team.difficulty}
              history={team.history}
              onSimulate={handleStartMajor}
              onOpenTransfer={() => dispatch({ type: "SET_SHOW_TRANSFER", open: true })}
              simulating={false}
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
              advancing={advancing}
            />
          )}
        </div>
      )}
    </>
  );
}
