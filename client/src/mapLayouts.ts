// Original, simplified schematic layouts for each map — generic two-site topology
// with standard callout names. These are abstract diagrams for the simulation's
// visuals, not reproductions of Valve's official in-game radar art.

export interface Zone {
  x: number; // percent
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface MapLayout {
  siteA: Zone;
  siteB: Zone;
  mid: Zone;
  tSpawn: Zone;
  ctSpawn: Zone;
  paths: { x1: number; y1: number; x2: number; y2: number }[];
}

function zone(x: number, y: number, w: number, h: number, label: string): Zone {
  return { x, y, w, h, label };
}

export const MAP_LAYOUTS: Record<string, MapLayout> = {
  Mirage: {
    siteA: zone(62, 8, 28, 20, "A Site"),
    siteB: zone(8, 60, 26, 22, "B Site"),
    mid: zone(38, 36, 24, 22, "Mid"),
    tSpawn: zone(40, 78, 22, 14, "T Spawn"),
    ctSpawn: zone(40, 4, 22, 12, "CT Spawn"),
    paths: [
      { x1: 50, y1: 85, x2: 50, y2: 47 },
      { x1: 50, y1: 47, x2: 76, y2: 28 },
      { x1: 50, y1: 47, x2: 21, y2: 65 },
      { x1: 51, y1: 10, x2: 76, y2: 18 },
    ],
  },
  Anubis: {
    siteA: zone(64, 12, 26, 20, "A Site"),
    siteB: zone(10, 14, 26, 20, "B Site"),
    mid: zone(38, 44, 24, 22, "Mid Canal"),
    tSpawn: zone(40, 80, 22, 14, "T Spawn"),
    ctSpawn: zone(40, 4, 22, 10, "CT Spawn"),
    paths: [
      { x1: 50, y1: 85, x2: 50, y2: 55 },
      { x1: 50, y1: 55, x2: 77, y2: 25 },
      { x1: 50, y1: 55, x2: 23, y2: 25 },
      { x1: 50, y1: 14, x2: 77, y2: 22 },
      { x1: 50, y1: 14, x2: 23, y2: 22 },
    ],
  },
  Dust2: {
    siteA: zone(66, 6, 28, 22, "A Site"),
    siteB: zone(6, 64, 26, 22, "B Site"),
    mid: zone(36, 38, 28, 18, "Mid"),
    tSpawn: zone(6, 8, 20, 16, "T Spawn"),
    ctSpawn: zone(70, 70, 22, 16, "CT Spawn"),
    paths: [
      { x1: 16, y1: 24, x2: 50, y2: 46 },
      { x1: 50, y1: 46, x2: 78, y2: 22 },
      { x1: 50, y1: 46, x2: 19, y2: 70 },
      { x1: 78, y1: 78, x2: 50, y2: 58 },
    ],
  },
  Overpass: {
    siteA: zone(8, 8, 26, 20, "A Site"),
    siteB: zone(66, 66, 28, 22, "B Site"),
    mid: zone(38, 38, 24, 22, "Mid Connector"),
    tSpawn: zone(8, 70, 22, 16, "T Spawn"),
    ctSpawn: zone(66, 6, 24, 14, "CT Spawn"),
    paths: [
      { x1: 19, y1: 73, x2: 19, y2: 28 },
      { x1: 19, y1: 28, x2: 50, y2: 47 },
      { x1: 50, y1: 47, x2: 78, y2: 70 },
      { x1: 78, y1: 18, x2: 78, y2: 64 },
    ],
  },
  Ancient: {
    siteA: zone(64, 10, 28, 20, "A Site"),
    siteB: zone(8, 66, 26, 22, "B Site"),
    mid: zone(38, 40, 24, 20, "Mid Jungle"),
    tSpawn: zone(40, 80, 22, 14, "T Spawn"),
    ctSpawn: zone(40, 4, 22, 12, "CT Spawn"),
    paths: [
      { x1: 50, y1: 85, x2: 50, y2: 50 },
      { x1: 50, y1: 50, x2: 76, y2: 26 },
      { x1: 50, y1: 50, x2: 22, y2: 70 },
      { x1: 51, y1: 10, x2: 76, y2: 20 },
    ],
  },
  Nuke: {
    siteA: zone(58, 6, 30, 18, "A Site (Upper)"),
    siteB: zone(12, 70, 28, 20, "B Site (Lower)"),
    mid: zone(38, 38, 22, 22, "Ramp"),
    tSpawn: zone(40, 82, 20, 12, "T Spawn"),
    ctSpawn: zone(58, 30, 20, 10, "CT Spawn"),
    paths: [
      { x1: 49, y1: 84, x2: 49, y2: 49 },
      { x1: 49, y1: 49, x2: 70, y2: 26 },
      { x1: 49, y1: 49, x2: 25, y2: 72 },
    ],
  },
  Inferno: {
    siteA: zone(64, 8, 28, 22, "A Site"),
    siteB: zone(8, 64, 26, 22, "B Site"),
    mid: zone(38, 38, 24, 22, "Banana/Mid"),
    tSpawn: zone(40, 80, 22, 14, "T Spawn"),
    ctSpawn: zone(40, 4, 22, 12, "CT Spawn"),
    paths: [
      { x1: 50, y1: 84, x2: 50, y2: 50 },
      { x1: 50, y1: 50, x2: 76, y2: 24 },
      { x1: 50, y1: 50, x2: 21, y2: 70 },
      { x1: 51, y1: 10, x2: 76, y2: 19 },
      { x1: 21, y1: 70, x2: 14, y2: 80 },
    ],
  },
};
