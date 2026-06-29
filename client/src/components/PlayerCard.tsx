import type { Player, DraftSlot } from "../types";
import Flag from "./Flag";

const ROLE_ICONS: Record<DraftSlot, string> = {
  entry: "🎯",
  awp: "🔭",
  support: "🛡️",
  lurker: "🕵️",
  igl: "🧠",
  coach: "📋",
};

function initials(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
}

export default function PlayerCard({
  player,
  selected,
  onClick,
}: {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`player-card ${selected ? "selected" : ""}`} onClick={onClick}>
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
      <div className="player-price">${player.price.toLocaleString()}</div>
    </button>
  );
}
