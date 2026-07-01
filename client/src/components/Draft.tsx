import { useEffect, useState } from "react";
import type { DraftSlot, Player, Role, Difficulty } from "../types";
import { fetchConfig, fetchRoleOptions } from "../api";
import PlayerCard from "./PlayerCard";
import Tooltip from "./Tooltip";
import Flag from "./Flag";
import { playPickSound } from "../sound";

const ROLE_LABELS: Record<DraftSlot, string> = {
  entry: "Entry Fragger",
  awp: "AWPer",
  support: "Support",
  lurker: "Lurker",
  igl: "In-Game Leader",
  coach: "Coach",
};

const POOL_SIZE = 6;
const REROLL_COST = 50000;

export default function Draft({
  difficulty,
  onComplete,
  mode,
}: {
  difficulty: Difficulty;
  onComplete: (picks: Record<Role, string>, coachId: string) => void;
  mode?: "major" | "infinite";
}) {
  const [draftOrder, setDraftOrder] = useState<DraftSlot[] | null>(null);
  const [minPrices, setMinPrices] = useState<Record<DraftSlot, number> | null>(null);
  const [budget, setBudget] = useState(0);
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [candidates, setCandidates] = useState<Player[]>([]);
  const [picks, setPicks] = useState<Partial<Record<DraftSlot, string>>>({});
  // Full player objects for already-picked slots, kept alongside `picks` (which only holds
  // ids) purely so the progress steps can show who you picked on hover without a re-fetch.
  const [pickedPlayers, setPickedPlayers] = useState<Partial<Record<DraftSlot, Player>>>({});
  const [loading, setLoading] = useState(true);
  const [rerolling, setRerolling] = useState(false);
  const [rerolledRoles, setRerolledRoles] = useState<Set<DraftSlot>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setError(null);
    fetchConfig(difficulty, mode)
      .then((cfg) => {
        setDraftOrder(cfg.draftOrder);
        setMinPrices(cfg.minPrices);
        setBudget(cfg.budget);
        setRemainingBudget(cfg.budget);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, mode, retryNonce]);

  useEffect(() => {
    if (!draftOrder) return;
    const role = draftOrder[stepIndex];
    setLoading(true);
    setError(null);
    fetchRoleOptions(role, remainingBudget, POOL_SIZE)
      .then(setCandidates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftOrder, stepIndex, retryNonce]);

  if (error) {
    return (
      <div className="panel error retry-error">
        <span>Couldn't reach the server: {error}</span>
        <button className="secondary-btn small" onClick={() => setRetryNonce((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  }
  if (!draftOrder || !minPrices || loading) return <div className="panel">Loading draft pool...</div>;

  const role = draftOrder[stepIndex];

  // A re-roll must leave enough behind to still afford the cheapest option for this role
  // AND every role after it — otherwise re-rolling could itself put the user in the same
  // "can't afford anything" hole the budget system is supposed to prevent. Capped at one
  // re-roll per role so it stays a meaningful choice rather than a budget-draining loop.
  const reserveFromHere = draftOrder.slice(stepIndex).reduce((sum, r) => sum + minPrices[r], 0);
  const alreadyRerolled = rerolledRoles.has(role);
  const canReroll = !alreadyRerolled && remainingBudget - REROLL_COST >= reserveFromHere;

  const handlePick = (player: Player) => {
    playPickSound();
    const next = { ...picks, [role]: player.id };
    const nextRemaining = Math.max(0, remainingBudget - player.price);
    setPicks(next);
    setPickedPlayers((prev) => ({ ...prev, [role]: player }));
    setRemainingBudget(nextRemaining);
    if (stepIndex < draftOrder.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      const roleOnlyPicks = { ...next } as Record<DraftSlot, string>;
      const coachId = roleOnlyPicks.coach;
      delete (roleOnlyPicks as Partial<Record<DraftSlot, string>>).coach;
      onComplete(roleOnlyPicks as Record<Role, string>, coachId);
    }
  };

  const handleReroll = () => {
    if (!canReroll || rerolling) return;
    const nextRemaining = remainingBudget - REROLL_COST;
    setRerolling(true);
    fetchRoleOptions(role, nextRemaining, POOL_SIZE)
      .then((opts) => {
        setRemainingBudget(nextRemaining);
        setCandidates(opts);
        setRerolledRoles((prev) => new Set(prev).add(role));
      })
      .catch((e) => setError(e.message))
      .finally(() => setRerolling(false));
  };

  return (
    <div className="panel fade-in tall-panel">
      <div className="draft-progress">
        {draftOrder.map((r, i) => {
          const picked = pickedPlayers[r];
          const pill = (
            <div className={`progress-step ${i === stepIndex ? "active" : ""} ${picks[r] ? "done" : ""}`}>
              {ROLE_LABELS[r]}
            </div>
          );
          if (!picked) return <span key={r}>{pill}</span>;
          return (
            <Tooltip
              key={r}
              placement="bottom"
              content={
                <span className="progress-step-tooltip">
                  <Flag country={picked.country} size={14} /> <strong>{picked.name}</strong>
                  <br />
                  {picked.team} · Rating {picked.rating.toFixed(2)}
                </span>
              }
            >
              {pill}
            </Tooltip>
          );
        })}
      </div>

      <div className="budget-bar">
        <span>Budget remaining:</span>
        <span className="budget-amount">${remainingBudget.toLocaleString()}</span>
        <span className="budget-total">/ ${budget.toLocaleString()}</span>
      </div>

      <h2>
        Pick your {ROLE_LABELS[role]} ({stepIndex + 1} / {draftOrder.length})
      </h2>
      <p className="hint">
        You're given {POOL_SIZE} random candidates you can afford for this slot — every one shown is
        within budget, but pricier picks mean leaner choices later.
      </p>
      <div className="rarity-legend">
        <span className="rarity-legend-item">
          <span className="rarity-legend-dot rarity-common" /> Common
        </span>
        <span className="rarity-legend-item">
          <span className="rarity-legend-dot rarity-rare" /> Rare
        </span>
        <span className="rarity-legend-item">
          <span className="rarity-legend-dot rarity-epic" /> Epic
        </span>
        <span className="rarity-legend-item">
          <span className="rarity-legend-dot rarity-legendary" /> Legendary
        </span>
      </div>
      <div className="card-grid" key={`${role}-${remainingBudget}`}>
        {candidates.map((p, i) => (
          <div key={p.id} className="card-pop" style={{ animationDelay: `${i * 0.05}s` }}>
            <PlayerCard player={p} showValue onClick={() => handlePick(p)} />
          </div>
        ))}
      </div>

      <button
        className={`secondary-btn reroll-btn ${!canReroll ? "reroll-btn-disabled" : ""}`}
        onClick={handleReroll}
        disabled={!canReroll || rerolling}
        title={
          alreadyRerolled
            ? "Already used your re-roll for this role"
            : !canReroll
            ? "Not enough budget left to re-roll safely"
            : undefined
        }
      >
        {rerolling
          ? "Re-rolling..."
          : alreadyRerolled
          ? "Re-roll used for this role"
          : `Re-roll candidates ($${REROLL_COST.toLocaleString()})`}
      </button>
    </div>
  );
}
