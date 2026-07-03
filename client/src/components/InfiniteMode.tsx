import { useEffect, useRef, useState } from "react";
import type { InfiniteRunView, TeamResponse } from "../types";
import LiveMatch from "./LiveMatch";
import TransferWindow from "./TransferWindow";
import Icon from "./Icon";

type Phase = "menu" | "watching" | "transfer" | "eliminated";

// Maps the server-side opponentBoost value to a human-readable tier.
function difficultyTier(boost: number): { label: string; pct: number; color: string } {
  if (boost < 0.78) return { label: "Starter",      pct: 10,  color: "#5fd475" };
  if (boost < 0.85) return { label: "Amateur",       pct: 25,  color: "#9ee55f" };
  if (boost < 0.92) return { label: "Competitive",   pct: 46,  color: "#f0c040" };
  if (boost < 0.98) return { label: "Professional",  pct: 65,  color: "#f08040" };
  if (boost < 1.05) return { label: "Elite",         pct: 82,  color: "#e05050" };
  return                   { label: "World Class",   pct: 100, color: "#c040e0" };
}

function DifficultyBar({ boost, gamesWon }: { boost: number; gamesWon: number }) {
  const tier = difficultyTier(boost);
  const segments = 10;
  const filled = Math.round((tier.pct / 100) * segments);
  return (
    <div className="inf-difficulty">
      <span className="inf-difficulty-label">Difficulty — {tier.label}</span>
      <div className="inf-difficulty-bar">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className="inf-difficulty-seg"
            style={{ background: i < filled ? tier.color : undefined }}
          />
        ))}
      </div>
      {gamesWon > 0 && (
        <span className="inf-difficulty-game">Next game: vs {tier.label}-tier opponent</span>
      )}
    </div>
  );
}

function HistoryList({ history }: { history: InfiniteRunView["history"] }) {
  if (history.length === 0) return null;
  const recent = [...history].reverse().slice(0, 8);
  return (
    <div className="inf-history">
      <div className="inf-history-title">Recent games</div>
      {recent.map((h) => (
        <div
          key={h.gameNum}
          className={`inf-hist-row ${h.won ? "inf-won" : h.survived ? "inf-survived" : "inf-lost"}`}
        >
          <span className="inf-hist-num">#{h.gameNum}</span>
          <span className="inf-hist-opp">{h.opponentName}</span>
          <span className="inf-hist-result">
            {h.won ? (
              <><Icon name="check" size={13} strokeWidth={2.4} /> +${h.prize.toLocaleString()}</>
            ) : h.survived ? (
              <><Icon name="shield" size={13} /> Survived</>
            ) : (
              <><Icon name="x" size={13} strokeWidth={2.4} /> Eliminated</>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function GameOver({
  run,
  onRestart,
  onGoHome,
}: {
  run: InfiniteRunView;
  onRestart: () => void;
  onGoHome: () => void;
}) {
  // Run recap, derived entirely from the game log: the last win is by construction the
  // hardest opponent beaten (difficulty only ramps up), and survived = losses absorbed
  // by Second Life along the way.
  const wins = run.history.filter((h) => h.won);
  const toughestScalp = wins.length > 0 ? wins[wins.length - 1].opponentName : null;
  const survived = run.history.filter((h) => !h.won && h.survived).length;
  const tier = difficultyTier(run.opponentBoost);

  return (
    <div className="panel fade-in inf-gameover">
      <div className="inf-gameover-icon"><Icon name="x" size={40} strokeWidth={2.4} /></div>
      <h2>Eliminated</h2>
      <div className="inf-gameover-score">{run.gamesWon}</div>
      <div className="inf-gameover-score-label">wins this run</div>
      <div className="inf-stats-row inf-gameover-stats">
        <div className="inf-stat">
          <div className="inf-stat-val">{run.gamesPlayed}</div>
          <div className="inf-stat-label">Games</div>
        </div>
        <div className="inf-stat">
          <div className="inf-stat-val">${run.totalEarned.toLocaleString()}</div>
          <div className="inf-stat-label">Earned</div>
        </div>
        <div className="inf-stat">
          <div className="inf-stat-val">{survived}</div>
          <div className="inf-stat-label">Losses survived</div>
        </div>
        <div className="inf-stat">
          <div className="inf-stat-val">{tier.label}</div>
          <div className="inf-stat-label">Tier reached</div>
        </div>
      </div>
      {toughestScalp && (
        <div className="inf-gameover-sub">
          Toughest scalp: <strong>{toughestScalp}</strong>
        </div>
      )}
      <HistoryList history={run.history} />
      <div className="inf-gameover-actions">
        <button className="primary-btn" onClick={onRestart}>
          <Icon name="refresh" size={16} /> Try Again
        </button>
        <button className="secondary-btn" onClick={onGoHome}>
          <Icon name="chevronLeft" size={16} /> Home
        </button>
      </div>
    </div>
  );
}

export default function InfiniteMode({
  run,
  team,
  onAdvance,
  onBuyInsurance,
  onBuyBoost,
  onTransferComplete,
  onSkipTransfer,
  onRestart,
  onGoHome,
  advancing,
}: {
  run: InfiniteRunView;
  team: TeamResponse;
  onAdvance: () => void;
  onBuyInsurance: () => void;
  onBuyBoost: () => void;
  onTransferComplete: (updated: TeamResponse) => void;
  onSkipTransfer: () => void;
  onRestart: () => void;
  onGoHome: () => void;
  advancing: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (run.eliminated) return "eliminated";
    if (run.pendingTransfer) return "transfer";
    // Start at the menu on mount even if a currentMatch exists (e.g. resuming a run): the
    // last match was already watched. Fresh matches are picked up by the effect below.
    return "menu";
  });

  // Transition to "watching" whenever a new match lands from the server.
  const prevGamesPlayed = useRef(run.gamesPlayed);
  useEffect(() => {
    if (run.currentMatch && run.gamesPlayed !== prevGamesPlayed.current) {
      prevGamesPlayed.current = run.gamesPlayed;
      setPhase("watching");
    }
  }, [run.gamesPlayed, run.currentMatch]);

  // After watching a match, decide what comes next.
  const handleMatchContinue = () => {
    if (run.eliminated) setPhase("eliminated");
    else if (run.pendingTransfer) setPhase("transfer");
    else setPhase("menu");
  };

  const handleTransferComplete = (updated: TeamResponse) => {
    onTransferComplete(updated);
    setPhase("menu");
  };

  const handleSkipTransfer = () => {
    onSkipTransfer();
    setPhase("menu");
  };

  if (phase === "watching" && run.currentMatch) {
    // Wrapped in the same .panel used by Major mode's MajorView so the live-match window is
    // the same size and framing across both game modes.
    return (
      <div className="panel fade-in major-view">
        <LiveMatch
          key={run.gamesPlayed}
          match={run.currentMatch}
          onContinue={handleMatchContinue}
          advancing={false}
          isLastRound={run.eliminated}
          roundName={`Game ${run.gamesPlayed} · ${run.gamesWon} win${run.gamesWon !== 1 ? "s" : ""} in a row`}
        />
      </div>
    );
  }

  if (phase === "transfer") {
    return (
      <TransferWindow
        teamId={team.teamId}
        players={team.players}
        coach={team.coach}
        budget={team.budget}
        wins={run.gamesWon}
        onComplete={handleTransferComplete}
        onClose={handleSkipTransfer}
      />
    );
  }

  if (phase === "eliminated") {
    return <GameOver run={run} onRestart={onRestart} onGoHome={onGoHome} />;
  }

  // Main menu / between-games screen.
  const winsUntilTransfer = run.nextTransferAt - run.gamesWon;
  const isFirstGame = run.gamesPlayed === 0;

  return (
    <div className="panel fade-in inf-menu">
      <div className="inf-title"><Icon name="infinity" size={26} strokeWidth={2} /> Infinite Mode</div>
      <p className="hint inf-subtitle">
        Survive as long as possible. Every 5 wins earns prize money and unlocks a transfer window.
        One loss ends the run.
      </p>

      {run.gamesWon > 0 && (
        <div className="inf-stats-row">
          <div className="inf-stat">
            <div className="inf-stat-val">{run.gamesWon}</div>
            <div className="inf-stat-label">Win streak</div>
          </div>
          <div className="inf-stat">
            <div className="inf-stat-val">{run.gamesPlayed}</div>
            <div className="inf-stat-label">Played</div>
          </div>
          <div className="inf-stat">
            <div className="inf-stat-val">${run.totalEarned.toLocaleString()}</div>
            <div className="inf-stat-label">Earned</div>
          </div>
          <div className="inf-stat">
            <div className="inf-stat-val">${team.budget.toLocaleString()}</div>
            <div className="inf-stat-label">Budget</div>
          </div>
        </div>
      )}

      <DifficultyBar boost={run.opponentBoost} gamesWon={run.gamesWon} />

      {run.gamesWon > 0 && (
        <div className="inf-transfer-countdown">
          <Icon name="swap" size={14} /> Transfer window in{" "}
          <strong>{winsUntilTransfer}</strong> more win{winsUntilTransfer !== 1 ? "s" : ""}
        </div>
      )}

      <div className="inf-perks">
        {run.insured ? (
          <div className="inf-perk-active">
            <Icon name="shield" size={16} /> Second Life active — your next loss is survived
          </div>
        ) : (
          <button
            className="transfer-btn inf-perk-btn"
            onClick={onBuyInsurance}
            disabled={team.budget < run.insuranceCost}
            title={team.budget < run.insuranceCost ? "Not enough budget" : "Survive one loss this run"}
          >
            <Icon name="shield" size={16} /> Second Life · ${run.insuranceCost.toLocaleString()}
          </button>
        )}
        {run.boostNext ? (
          <div className="inf-perk-active">
            <Icon name="flame" size={16} /> Momentum active — +5% rating next game
          </div>
        ) : (
          <button
            className="transfer-btn inf-perk-btn"
            onClick={onBuyBoost}
            disabled={team.budget < run.boostCost}
            title={team.budget < run.boostCost ? "Not enough budget" : "+5% team rating for the next game only"}
          >
            <Icon name="flame" size={16} /> Momentum · ${run.boostCost.toLocaleString()}
          </button>
        )}
      </div>

      <HistoryList history={run.history} />

      <div className="inf-actions">
        <button className="primary-btn inf-start-btn" onClick={onAdvance} disabled={advancing}>
          {advancing ? (
            "Matchmaking…"
          ) : (
            <><Icon name="play" size={16} /> {isFirstGame ? "Start" : "Next Game"}</>
          )}
        </button>
        <button className="secondary-btn" onClick={onGoHome}>
          <Icon name="chevronLeft" size={16} /> Home
        </button>
      </div>
    </div>
  );
}
