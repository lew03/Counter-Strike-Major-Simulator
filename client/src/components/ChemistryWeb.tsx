import type { Player } from "../types";

const TEAM_COLOR = "#f0b429";
const COUNTRY_COLOR = "#4a7fd6";

function initials(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
}

function nodePosition(i: number, total: number, radius: number, cx: number, cy: number) {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

interface Edge {
  a: number;
  b: number;
  type: "team" | "country";
  label: string;
}

// A node-link diagram of the 5 drafted players: a gold line means they share a real-world
// team, a blue dashed line means they share a country. Hovering an edge or node shows the
// exact pairing and its rating contribution via native SVG <title> tooltips.
export default function ChemistryWeb({ players }: { players: Player[] }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2 - 6;
  const radius = 88;
  const positions = players.map((_, i) => nodePosition(i, players.length, radius, cx, cy));

  const edges: Edge[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      if (players[i].team && players[i].team === players[j].team) {
        edges.push({
          a: i,
          b: j,
          type: "team",
          label: `${players[i].name} & ${players[j].name} — both played for ${players[i].team} (+1.5%)`,
        });
      }
      if (players[i].country && players[i].country === players[j].country) {
        edges.push({
          a: i,
          b: j,
          type: "country",
          label: `${players[i].name} & ${players[j].name} — both ${players[i].country} (+0.6%)`,
        });
      }
    }
  }
  const hasAnyEdge = edges.length > 0;

  return (
    <div className="chemistry-web">
      <svg viewBox={`0 0 ${size} ${size - 10}`} className="chemistry-web-svg">
        {edges.map((e, i) => {
          const p1 = positions[e.a];
          const p2 = positions[e.b];
          // Nudge the country line perpendicular to the pair so it doesn't sit exactly on
          // top of a team line between the same two players.
          const dx = p2.y - p1.y;
          const dy = p1.x - p2.x;
          const len = Math.hypot(dx, dy) || 1;
          const off = e.type === "country" ? 4 : 0;
          const ox = (dx / len) * off;
          const oy = (dy / len) * off;
          return (
            <line
              key={i}
              x1={p1.x + ox}
              y1={p1.y + oy}
              x2={p2.x + ox}
              y2={p2.y + oy}
              stroke={e.type === "team" ? TEAM_COLOR : COUNTRY_COLOR}
              strokeWidth={e.type === "team" ? 3 : 1.6}
              strokeDasharray={e.type === "country" ? "4 3" : undefined}
              opacity={0.85}
              strokeLinecap="round"
            >
              <title>{e.label}</title>
            </line>
          );
        })}
        {positions.map((p, i) => (
          <g key={players[i].id}>
            <circle cx={p.x} cy={p.y} r={22} className="chemistry-node-circle">
              <title>
                {players[i].name} — {players[i].team} ({players[i].country})
              </title>
            </circle>
            <text x={p.x} y={p.y + 5} textAnchor="middle" className="chemistry-node-initials">
              {initials(players[i].name)}
            </text>
            <text x={p.x} y={p.y + 38} textAnchor="middle" className="chemistry-node-name">
              {players[i].name}
            </text>
          </g>
        ))}
      </svg>

      {hasAnyEdge ? (
        <div className="chemistry-web-legend">
          <span className="chemistry-web-legend-item">
            <span className="chemistry-web-swatch team" /> Same real team (+1.5% each pair)
          </span>
          <span className="chemistry-web-legend-item">
            <span className="chemistry-web-swatch country" /> Same country (+0.6% each pair)
          </span>
        </div>
      ) : (
        <p className="chemistry-detail muted">No connections yet — hover a player to see their team and country.</p>
      )}
    </div>
  );
}
