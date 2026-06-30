import { useEffect, useMemo, useState } from "react";
import { MAP_LAYOUTS, type Zone } from "../mapLayouts";

function mapImageSrc(mapName: string) {
  return `/images/maps/${mapName.toLowerCase()}.png`;
}

function center(z: Zone) {
  return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
}

function jitter(spread: number) {
  return (Math.random() - 0.5) * spread;
}

interface Dot {
  id: string;
  x: number;
  y: number;
}

// Builds this round's defender holds (mostly static, site-anchored) and attacker spawn/mid/site
// waypoints, following the map's actual named areas (T spawn -> mid -> a contested bombsite,
// CT spawn -> the sites they're holding) rather than random movement.
function useRoundDots(mapName: string, roundIndex: number, totalRounds: number) {
  const layout = MAP_LAYOUTS[mapName] || MAP_LAYOUTS.Mirage;
  const clampedRound = Math.max(0, roundIndex);

  const waypoints = useMemo(() => {
    const activeSite: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    const siteCenter = center(activeSite === "A" ? layout.siteA : layout.siteB);
    const otherSiteCenter = center(activeSite === "A" ? layout.siteB : layout.siteA);
    const midCenter = center(layout.mid);
    const tSpawnCenter = center(layout.tSpawn);
    const ctSpawnCenter = center(layout.ctSpawn);

    // 5 attackers: 3 execute on the round's contested site, 2 split off to the other.
    const attackers = Array.from({ length: 5 }, (_, i) => {
      const goesMain = i < 3;
      const target = goesMain ? siteCenter : otherSiteCenter;
      return {
        id: `t${i}`,
        spawn: { x: tSpawnCenter.x + jitter(10), y: tSpawnCenter.y + jitter(8) },
        mid: { x: midCenter.x + jitter(14), y: midCenter.y + jitter(12) },
        site: { x: target.x + jitter(12), y: target.y + jitter(10) },
      };
    });

    // 5 defenders: 3 hold the site under attack, 2 hold/rotate toward the other.
    const defenders = Array.from({ length: 5 }, (_, i) => {
      const holdsMain = i < 3;
      const target = holdsMain ? siteCenter : otherSiteCenter;
      const anchor = holdsMain ? target : ctSpawnCenter;
      return {
        id: `ct${i}`,
        pos: { x: target.x * 0.7 + anchor.x * 0.3 + jitter(10), y: target.y * 0.7 + anchor.y * 0.3 + jitter(8) },
      };
    });

    return { attackers, defenders };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapName, clampedRound, totalRounds]);

  // Attackers run spawn -> mid -> site over the round's live window, mirroring a default execute.
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    setPhase(0);
    const toMid = setTimeout(() => setPhase(1), 120);
    const toSite = setTimeout(() => setPhase(2), 380);
    return () => {
      clearTimeout(toMid);
      clearTimeout(toSite);
    };
  }, [clampedRound, mapName]);

  const attackerDots: Dot[] = waypoints.attackers.map((a) => {
    const p = phase === 0 ? a.spawn : phase === 1 ? a.mid : a.site;
    return { id: a.id, x: p.x, y: p.y };
  });
  const defenderDots: Dot[] = waypoints.defenders.map((d) => ({ id: d.id, x: d.pos.x, y: d.pos.y }));

  return { attackerDots, defenderDots };
}

export default function MiniMap({
  mapName,
  roundIndex = -1,
  totalRounds = 1,
}: {
  mapName: string;
  roundIndex?: number;
  totalRounds?: number;
}) {
  const layout = MAP_LAYOUTS[mapName] || MAP_LAYOUTS.Mirage;
  const [imageOk, setImageOk] = useState(true);
  const { attackerDots, defenderDots } = useRoundDots(mapName, roundIndex, totalRounds);

  useEffect(() => {
    setImageOk(true);
  }, [mapName]);

  return (
    <div className="minimap">
      <div className="minimap-title">{mapName}</div>
      <div className="minimap-canvas">
        {imageOk ? (
          <img
            className="minimap-bg-image"
            src={mapImageSrc(mapName)}
            alt={`${mapName} minimap`}
            onError={() => setImageOk(false)}
          />
        ) : (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="minimap-svg">
              {layout.paths.map((p, i) => (
                <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} className="minimap-path" />
              ))}
              {[layout.siteA, layout.siteB, layout.mid, layout.tSpawn, layout.ctSpawn].map((z, i) => (
                <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} className="minimap-zone" />
              ))}
            </svg>
            {[layout.siteA, layout.siteB, layout.mid, layout.tSpawn, layout.ctSpawn].map((z, i) => (
              <span key={i} className="minimap-zone-label" style={{ left: `${z.x + z.w / 2}%`, top: `${z.y + z.h / 2}%` }}>
                {z.label}
              </span>
            ))}
          </>
        )}

        {roundIndex >= 0 && (
          <>
            {defenderDots.map((d) => (
              <span key={d.id} className="minimap-dot ct" style={{ left: `${d.x}%`, top: `${d.y}%` }} title="CT" />
            ))}
            {attackerDots.map((d) => (
              <span key={d.id} className="minimap-dot t" style={{ left: `${d.x}%`, top: `${d.y}%` }} title="T" />
            ))}
          </>
        )}
      </div>
      <div className="minimap-legend">
        <span className="minimap-legend-item">
          <span className="minimap-dot-sample ct" /> CT
        </span>
        <span className="minimap-legend-item">
          <span className="minimap-dot-sample t" /> T
        </span>
      </div>
    </div>
  );
}
