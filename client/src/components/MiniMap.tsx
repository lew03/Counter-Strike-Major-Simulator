import { useEffect, useState } from "react";
import { MAP_LAYOUTS } from "../mapLayouts";

function mapImageSrc(mapName: string) {
  return `/images/maps/${mapName.toLowerCase()}.png`;
}

export default function MiniMap({ mapName }: { mapName: string }) {
  const layout = MAP_LAYOUTS[mapName] || MAP_LAYOUTS.Mirage;
  const [imageOk, setImageOk] = useState(true);

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
      </div>
    </div>
  );
}
