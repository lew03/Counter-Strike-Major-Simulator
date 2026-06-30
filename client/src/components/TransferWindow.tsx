import { useMemo, useState } from "react";
import type { Player, Role, DraftSlot, TeamResponse } from "../types";
import { fetchTransferOptions, submitTransfer } from "../api";
import Flag from "./Flag";

const ROLE_LABELS: Record<DraftSlot, string> = {
  entry: "Entry",
  awp: "AWP",
  support: "Support",
  lurker: "Lurker",
  igl: "IGL",
  coach: "Coach",
};

const MAX_CHANGES = 3;

export default function TransferWindow({
  teamId,
  players,
  coach,
  budget,
  wins,
  onComplete,
  onClose,
}: {
  teamId: string;
  players: Player[];
  coach: Player;
  budget: number;
  wins: number;
  onComplete: (updated: TeamResponse) => void;
  onClose: () => void;
}) {
  // Original roster keyed by slot, for diffing how many changes are staged.
  const original = useMemo(() => {
    const map: Record<string, Player> = { coach };
    for (const p of players) map[p.role] = p;
    return map;
  }, [players, coach]);

  const [pending, setPending] = useState<Record<string, Player>>(() => ({ ...original }));
  const [openSlot, setOpenSlot] = useState<DraftSlot | null>(null);
  const [options, setOptions] = useState<Player[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slots: DraftSlot[] = ["entry", "awp", "support", "lurker", "igl", "coach"];
  const pendingSpend = slots.reduce((sum, s) => sum + pending[s].price, 0);
  const changes = slots.filter((s) => pending[s].id !== original[s].id).length;

  // Sell-back: replaced players return 60% of their original face price.
  // Effective remaining budget = base budget + sell proceeds - current roster spend.
  const sellProceeds = slots.reduce(
    (sum, s) => (pending[s].id !== original[s].id ? sum + Math.floor(original[s].price * 0.6) : sum),
    0
  );
  const effectiveRemaining = budget + sellProceeds - pendingSpend;

  const openOptions = async (slot: DraftSlot) => {
    if (openSlot === slot) {
      setOpenSlot(null);
      return;
    }
    setError(null);
    setOpenSlot(slot);
    setLoadingOptions(true);
    // Max price for the new player in this slot, matching the server's budget rule:
    //   new_totalSpend + 0.4 × sellTotal ≤ budget
    // ↔ newPrice ≤ budget + 0.6×sellTotalWithSlot - spendWithoutSlot
    // sellTotalWithSlot always includes original[slot] (we're selling whoever's there).
    const spendWithoutSlot = slots.reduce((sum, s) => (s !== slot ? sum + pending[s].price : sum), 0);
    const sellTotalWithSlot = slots.reduce((sum, s) => {
      if (s === slot) return sum + original[slot].price;
      return pending[s].id !== original[s].id ? sum + original[s].price : sum;
    }, 0);
    const maxPrice = budget + Math.floor(sellTotalWithSlot * 0.6) - spendWithoutSlot;
    const excludeIds = slots.map((s) => pending[s].id);
    try {
      const opts = await fetchTransferOptions(slot, maxPrice, excludeIds, wins);
      setOptions(opts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const choose = (slot: DraftSlot, player: Player) => {
    const wouldChange = slots.filter((s) =>
      s === slot ? player.id !== original[s].id : pending[s].id !== original[s].id
    ).length;
    if (wouldChange > MAX_CHANGES) {
      setError(`You can make at most ${MAX_CHANGES} changes per transfer window.`);
      return;
    }
    setError(null);
    setPending((prev) => ({ ...prev, [slot]: player }));
    setOpenSlot(null);
  };

  const revert = (slot: DraftSlot) => {
    setError(null);
    setPending((prev) => ({ ...prev, [slot]: original[slot] }));
    if (openSlot === slot) setOpenSlot(null);
  };

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const picks = {
        entry: pending.entry.id,
        awp: pending.awp.id,
        support: pending.support.id,
        lurker: pending.lurker.id,
        igl: pending.igl.id,
      } as Record<Role, string>;
      const updated = await submitTransfer(teamId, picks, pending.coach.id);
      onComplete(updated);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="panel fade-in transfer-window">
      <div className="transfer-header">
        <h2>Transfer Window</h2>
        <button className="secondary-btn" onClick={onClose}>
          ← Back
        </button>
      </div>
      <p className="hint">
        Swap up to {MAX_CHANGES} players or your coach. Selling a player returns{" "}
        <strong>60% of their fee</strong> — use it toward a better replacement. Each slot shows a
        random scouting pool; close and re-open to refresh the candidates.
      </p>
      <div className="transfer-meta">
        <span>
          Roster: <strong>${pendingSpend.toLocaleString()}</strong>
        </span>
        {sellProceeds > 0 && (
          <span className="sell-proceeds">
            Sell-back: <strong>+${sellProceeds.toLocaleString()}</strong>
          </span>
        )}
        <span className={effectiveRemaining < 0 ? "over-budget" : ""}>
          Remaining: <strong>${effectiveRemaining.toLocaleString()}</strong>
        </span>
        <span>
          Changes: <strong>{changes}</strong> / {MAX_CHANGES}
        </span>
      </div>

      {error && <div className="transfer-error">{error}</div>}

      <div className="transfer-slots">
        {slots.map((slot) => {
          const p = pending[slot];
          const changed = p.id !== original[slot].id;
          return (
            <div key={slot} className={`transfer-slot rarity-${p.rarity || "common"} ${changed ? "changed" : ""}`}>
              <div className="transfer-slot-main">
                <span className="transfer-slot-role">{ROLE_LABELS[slot]}</span>
                <span className="transfer-slot-name">
                  <Flag country={p.country} size={16} /> {p.name}
                </span>
                <span className="transfer-slot-rating">{p.rating.toFixed(2)}</span>
                <span className="transfer-slot-price">
                  ${p.price.toLocaleString()}
                  {!changed && (
                    <span className="sell-value" title="Sell-back value (60%)">
                      {" "}→ ${Math.floor(original[slot].price * 0.6).toLocaleString()}
                    </span>
                  )}
                </span>
                <span className="transfer-slot-actions">
                  {changed && (
                    <button className="link-btn" onClick={() => revert(slot)}>
                      revert
                    </button>
                  )}
                  <button className="secondary-btn small" onClick={() => openOptions(slot)}>
                    {openSlot === slot ? "Close" : "Swap"}
                  </button>
                </span>
              </div>

              {openSlot === slot && (
                <div className="transfer-options">
                  {loadingOptions ? (
                    <div className="hint">Loading options…</div>
                  ) : options.length === 0 ? (
                    <div className="hint">No affordable replacements for this slot.</div>
                  ) : (
                    options.map((o) => (
                      <button
                        key={o.id}
                        className={`transfer-option rarity-${o.rarity || "common"}`}
                        onClick={() => choose(slot, o)}
                      >
                        <span className="transfer-option-name">
                          <Flag country={o.country} size={14} /> {o.name}
                        </span>
                        <span className="transfer-option-team">{o.team}</span>
                        <span className="transfer-option-rating">{o.rating.toFixed(2)}</span>
                        <span className="transfer-option-price">${o.price.toLocaleString()}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="primary-btn"
        onClick={confirm}
        disabled={submitting || changes === 0 || effectiveRemaining < 0}
      >
        {submitting
          ? "Applying…"
          : changes === 0
          ? "No changes staged"
          : `Confirm ${changes} change${changes > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
