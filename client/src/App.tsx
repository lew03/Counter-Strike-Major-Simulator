import { useEffect, useState } from "react";
import type { Player, Role, MajorRun, RoundResult, HistoryEntry, Difficulty } from "./types";
import { createTeam, startMajor, advanceMajor as advanceMajorApi, fetchTeam } from "./api";
import Welcome from "./components/Welcome";
import TeamName from "./components/TeamName";
import Draft from "./components/Draft";
import TeamSummary from "./components/TeamSummary";
import MajorView from "./components/MajorView";
import { isMuted, setMuted } from "./sound";

type Stage = "welcome" | "name" | "draft" | "team" | "major";

const SAVED_TEAM_KEY = "csmajor_teamId";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [stage, setStage] = useState<Stage>("welcome");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [pendingTeamName, setPendingTeamName] = useState("Your Team");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("Your Team");
  const [players, setPlayers] = useState<Player[]>([]);
  const [coach, setCoach] = useState<Player | null>(null);
  const [overall, setOverall] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [budget, setBudget] = useState(0);
  const [run, setRun] = useState<MajorRun | null>(null);
  const [roundLog, setRoundLog] = useState<RoundResult[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [runAttempt, setRunAttempt] = useState(0);

  // On load, resume a previously-drafted team if one is saved and still on the server.
  useEffect(() => {
    const savedId = localStorage.getItem(SAVED_TEAM_KEY);
    if (!savedId) {
      setBooting(false);
      return;
    }
    fetchTeam(savedId)
      .then((res) => {
        setTeamId(res.teamId);
        setTeamName(res.name);
        setPlayers(res.players);
        setCoach(res.coach);
        setOverall(res.overall);
        setTotalSpend(res.totalSpend);
        setBudget(res.budget);
        setDifficulty(res.difficulty);
        setHistory(res.history);
        setStage("team");
      })
      .catch(() => localStorage.removeItem(SAVED_TEAM_KEY))
      .finally(() => setBooting(false));
  }, []);

  const handleWelcomeStart = (chosen: Difficulty) => {
    setDifficulty(chosen);
    setStage("name");
  };

  const handleNameSubmit = (name: string) => {
    setPendingTeamName(name);
    setStage("draft");
  };

  const handleDraftComplete = async (picks: Record<Role, string>, coachId: string) => {
    setError(null);
    try {
      const res = await createTeam(picks, coachId, pendingTeamName, difficulty);
      setTeamId(res.teamId);
      setTeamName(res.name);
      setPlayers(res.players);
      setCoach(res.coach);
      setOverall(res.overall);
      setTotalSpend(res.totalSpend);
      setBudget(res.budget);
      setDifficulty(res.difficulty);
      setHistory(res.history);
      localStorage.setItem(SAVED_TEAM_KEY, res.teamId);
      setStage("team");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleStartMajor = async () => {
    if (!teamId) return;
    setError(null);
    try {
      const res = await startMajor(teamId);
      setRun(res.run);
      setRoundLog([]);
      setRunAttempt((n) => n + 1);
      setStage("major");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAdvance = async () => {
    if (!teamId) return;
    setAdvancing(true);
    setError(null);
    try {
      const res = await advanceMajorApi(teamId);
      setRun(res.run);
      if (res.roundResult) setRoundLog((prev) => [...prev, res.roundResult as RoundResult]);
      if (res.run.finished) {
        setHistory((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            userWon: res.run.userWon,
            eliminatedAt: res.run.userEliminatedAt,
            champion: res.run.champion || "",
          },
        ]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdvancing(false);
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(SAVED_TEAM_KEY);
    setStage("welcome");
    setTeamId(null);
    setTeamName("Your Team");
    setPlayers([]);
    setCoach(null);
    setOverall(0);
    setTotalSpend(0);
    setBudget(0);
    setRun(null);
    setRoundLog([]);
    setHistory([]);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  if (booting) {
    return (
      <div className="hero-screen">
        <div className="hint">Loading…</div>
      </div>
    );
  }

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
              <button className="secondary-btn" onClick={handleRestart}>
                Start New Draft
              </button>
              <button className="mute-btn" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
          </header>

          {error && <div className="panel error">{error}</div>}

          {stage === "draft" && <Draft difficulty={difficulty} onComplete={handleDraftComplete} />}

          {stage === "team" && coach && (
            <TeamSummary
              teamName={teamName}
              players={players}
              coach={coach}
              overall={overall}
              totalSpend={totalSpend}
              budget={budget}
              difficulty={difficulty}
              history={history}
              onSimulate={handleStartMajor}
              simulating={false}
            />
          )}

          {stage === "major" && run && (
            <MajorView
              key={runAttempt}
              run={run}
              roundLog={roundLog}
              history={history}
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
