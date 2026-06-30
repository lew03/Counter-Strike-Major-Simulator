import { useEffect, useState } from "react";
import type { MajorRun, RoundResult, HistoryEntry } from "../types";
import LiveMatch from "./LiveMatch";
import SwissLadder from "./SwissLadder";
import PlayoffTree from "./PlayoffTree";
import GameDetail from "./GameDetail";
import GameOverScreen from "./GameOverScreen";
import { playChampionSound, playEliminatedSound } from "../sound";

export default function MajorView({
  run,
  roundLog,
  history,
  onAdvance,
  onRestart,
  onNewDraft,
  advancing,
}: {
  run: MajorRun;
  roundLog: RoundResult[];
  history: HistoryEntry[];
  onAdvance: () => void;
  onRestart: () => void;
  onNewDraft: () => void;
  advancing: boolean;
}) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [viewingRound, setViewingRound] = useState<RoundResult | null>(null);
  const wins = history.filter((h) => h.userWon).length;

  const activeRound = roundLog.length > revealedCount ? roundLog[roundLog.length - 1] : null;
  const revealedRounds = roundLog.slice(0, revealedCount);

  useEffect(() => {
    if (roundLog.length > revealedCount) {
      setViewingRound(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundLog.length]);

  const userMatch = activeRound?.matches.find((m) => m.isUserMatch) || null;

  // No personal match this round (shouldn't normally happen now that the engine
  // fast-forwards dead rounds) — just reveal it immediately, nothing to watch.
  useEffect(() => {
    if (activeRound && !userMatch) {
      setRevealedCount(roundLog.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRound, userMatch]);

  // Fired by the "Play Next Round" button living inside the just-finished LiveMatch view.
  // Normally fetches the next round immediately (if any) before revealing this one, so the
  // live match stays on screen the whole time instead of bouncing through an empty
  // "between rounds" panel. EXCEPTION: the round that clinches Playoff qualification pauses
  // here instead — the user should see the seeded bracket before the Quarterfinal auto-plays,
  // rather than being swept straight into a Bo3 and landing in the Semifinal with no warning.
  const handleContinueFromMatch = async () => {
    const justWatchedCount = roundLog.length;
    const justWatched = roundLog[justWatchedCount - 1];
    const isStageTransition = !!justWatched?.advancedToPlayoffs;
    if (!run.finished && !isStageTransition) {
      await onAdvance();
    }
    setRevealedCount(justWatchedCount);
  };

  useEffect(() => {
    if (revealedCount === roundLog.length && roundLog.length > 0 && run.finished) {
      if (run.userWon) playChampionSound();
      else playEliminatedSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCount, run.finished]);

  const swissRounds = revealedRounds.filter((r) => r.type === "swiss_round");
  const playoffRounds = revealedRounds.filter((r) => r.type === "playoff_round");
  // Only ever show standings as of the last fully-revealed round — run.standings reflects
  // the backend's already-resolved current round, which would spoil a match still playing live.
  const displayStandings = swissRounds.length > 0 ? swissRounds[swissRounds.length - 1].standings || [] : [];

  const canAdvance = !activeRound && !run.finished && !viewingRound;
  const fullyRevealedAndFinished = run.finished && revealedCount === roundLog.length && roundLog.length > 0;
  const isFirstRound = canAdvance && roundLog.length === 0;
  const lastMatch = fullyRevealedAndFinished
    ? roundLog[roundLog.length - 1].matches.find((m) => m.isUserMatch) || null
    : null;

  // Header reflects what's actually on screen right now, not the backend's already-resolved
  // run.stage — otherwise it can flip to "Playoffs" while a Swiss match is still live.
  const headerStage = activeRound ? activeRound.type : run.stage === "playoffs" ? "playoff_round" : run.stage;

  if (isFirstRound) {
    const FORM_ICON = { hot: "🔥", cold: "❄️", steady: "➖" } as const;
    return (
      <div className="panel fade-in major-view tall-panel major-start-screen">
        <div className="major-start-title">🏆 The Major Begins</div>
        <p className="hint major-start-text">
          Your roster is locked in. First stop: the Swiss Stage — five rounds standing between you and
          the Playoffs.
        </p>
        {run.userForm && run.userForm.length > 0 && (
          <div className="form-strip">
            <div className="form-strip-label">Roster form this major</div>
            <div className="form-strip-players">
              {run.userForm.map((f) => (
                <div key={f.name} className={`form-chip form-${f.form}`}>
                  <span className="form-chip-icon">{FORM_ICON[f.form]}</span>
                  <span className="form-chip-name">{f.name}</span>
                  <span className="form-chip-state">{f.form}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="start-btn" onClick={onAdvance} disabled={advancing}>
          {advancing ? "Starting..." : "Start"}
        </button>
      </div>
    );
  }

  const bracketVisible = swissRounds.length > 0 || playoffRounds.length > 0;
  // Once the backend has flipped to playoffs but no Quarterfinal has been played/revealed
  // yet, show the seeded bracket so the user sees who they're about to face before clicking in.
  // Gated on !activeRound: the backend resolves the deciding Swiss round (and flips run.playoff)
  // in the same call that returns it, so without this check the bracket — and the fact the user
  // just advanced — would spoil the still-playing live replay of that final Swiss match.
  const showPendingBracket = !activeRound && playoffRounds.length === 0 && !!run.playoff;
  const pendingPairs: { name: string; isUser: boolean }[][] = [];
  if (showPendingBracket && run.playoff) {
    for (let i = 0; i < run.playoff.remaining.length; i += 2) {
      pendingPairs.push([run.playoff.remaining[i], run.playoff.remaining[i + 1]]);
    }
  }

  // Single bordered "window" for the whole round: bracket/standings recap up top, the
  // live match (or game-over / saved-round detail) below — all inside one scroll region,
  // so re-running a major doesn't stack a second box above the live simulation.
  return (
    <div className="panel fade-in major-view tall-panel">
      {bracketVisible && (
        <div className="major-bracket-summary">
          <p className="hint">
            Majors won: {wins} / {history.length} attempts
            {revealedRounds.length > 0 && " — click any round below to revisit its saved result"}
          </p>

          {swissRounds.length > 0 && playoffRounds.length === 0 && (
            <SwissLadder rounds={swissRounds} onSelect={setViewingRound} />
          )}

          {swissRounds.length > 0 && playoffRounds.length > 0 && (
            <details className="standings-details">
              <summary>Swiss Stage results ({swissRounds.length}/5) — click to review</summary>
              <SwissLadder rounds={swissRounds} onSelect={setViewingRound} />
            </details>
          )}

          {playoffRounds.length > 0 && <PlayoffTree rounds={playoffRounds} onSelect={setViewingRound} />}

          {showPendingBracket && pendingPairs.length > 0 && (
            <div className="pending-bracket">
              <div className="bracket-round-title">Quarterfinal Matchups</div>
              <div className="bracket-matches">
                {pendingPairs.map((pair, i) => (
                  <div
                    key={i}
                    className={`bracket-match-box pending ${pair.some((p) => p.isUser) ? "match-user" : ""}`}
                  >
                    {pair.map((t) => (
                      <div key={t.name} className={`bracket-team-row ${t.isUser ? "is-user" : ""}`}>
                        <span className="bracket-team-name">
                          {t.isUser && (
                            <span className="user-star" aria-hidden="true">
                              ★{" "}
                            </span>
                          )}
                          {t.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayStandings.length > 0 && (
            <details className="standings-details">
              <summary>Full Swiss Standings (spoiler)</summary>
              <div className="standing-group full-width">
                <table>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>W-L</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStandings.map((t) => (
                      <tr key={t.name} className={t.isUser ? "is-user-row" : ""}>
                        <td>
                          {t.isUser && (
                            <span className="user-star" aria-hidden="true">
                              ★{" "}
                            </span>
                          )}
                          {t.name}
                        </td>
                        <td>
                          {t.wins}-{t.losses}
                        </td>
                        <td>
                          {t.resolved === "advanced" && <span className="status-pill advanced">✓ Advanced</span>}
                          {t.resolved === "eliminated" && <span className="status-pill eliminated">✗ Eliminated</span>}
                          {t.resolved === "playing" && <span className="status-pill playing">Playing</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      {viewingRound ? (
        <GameDetail round={viewingRound} onBack={() => setViewingRound(null)} />
      ) : fullyRevealedAndFinished ? (
        <GameOverScreen run={run} history={history} lastMatch={lastMatch} onRestart={onRestart} onNewDraft={onNewDraft} />
      ) : (
        <>
          <h2>
            {headerStage === "swiss_round" && `Swiss Stage — Round ${swissRounds.length + 1} / 5`}
            {headerStage === "playoff_round" && "Playoffs"}
          </h2>

          {activeRound && userMatch && (
            <LiveMatch
              key={roundLog.length}
              match={userMatch}
              onContinue={handleContinueFromMatch}
              advancing={advancing}
              isLastRound={run.finished}
            />
          )}

          {canAdvance && (
            <button className="primary-btn" onClick={onAdvance} disabled={advancing}>
              {advancing ? "Simulating round..." : "Play Next Round"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
