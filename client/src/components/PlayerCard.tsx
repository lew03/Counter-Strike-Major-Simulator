import type { Player, DraftSlot, Rarity } from "../types";
import Flag from "./Flag";

const ROLE_ICONS: Record<DraftSlot, string> = {
  entry: "🎯",
  awp: "🔭",
  support: "🛡️",
  lurker: "🕵️",
  igl: "🧠",
  coach: "📋",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

function initials(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
}

export default function PlayerCard({
  player,
  selected,
  showValue,
  onClick,
}: {
  player: Player;
  selected?: boolean;
  showValue?: boolean;
  onClick?: () => void;
}) {
  // Rating delivered per $100k spent — higher = better value for money.
  const valuePer100k = player.price > 0 ? (player.rating / (player.price / 100000)) : 0;
  const rarity = player.rarity || "common";
  return (
    <button className={`player-card rarity-${rarity} ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className="rarity-badge">{RARITY_LABEL[rarity]}</span>
      <div className="player-avatar">
        <span className="player-initials">{initials(player.name)}</span>
        <span className="player-role-icon" aria-label={player.role} title={player.role}>
          {ROLE_ICONS[player.role]}
        </span>
      </div>
      <div className="player-name">{player.name}</div>
      <div className="player-meta">
        <Flag country={player.country} size={20} /> {player.team}
      </div>
      <div className="player-era">
        {player.role === "coach"
          ? player.era
          : player.maps != null
          ? `${player.maps.toLocaleString()} maps tracked`
          : ""}
      </div>
      <div className="player-stats">
        <span>Rating {player.rating.toFixed(2)}</span>
        {player.role === "coach" ? (
          <span>Titles {player.kd}</span>
        ) : (
          <span>K/D {player.kd.toFixed(2)}</span>
        )}
      </div>
      <div className="player-price">
        ${player.price.toLocaleString()}
        {showValue && player.role !== "coach" && (
          <span
            className="player-value"
            title="Rating delivered per $100k spent — higher is better value"
          >
            {valuePer100k.toFixed(2)} val
          </span>
        )}
      </div>
    </button>
  );
}
