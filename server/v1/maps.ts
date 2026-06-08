import type { MapPick, SeatId } from "./rules.js";

export type SpawnPoint = {
  x: number;
  y: number;
  facing: 1 | -1;
};

export type SurfacePoint = {
  x: number;
  y: number;
};

export type TerrainLandmarkType = "spire" | "arch" | "shelf" | "ring" | "bridge";

export type TerrainLandmark = {
  type: TerrainLandmarkType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type TierShotLane = {
  from: SeatId;
  to: SeatId;
  direction: "uphill" | "downhill";
  label: string;
};

export type V1Map = {
  id: Exclude<MapPick, "random">;
  name: string;
  summary: string;
  tacticalRole: string;
  worldWidth: number;
  deathPlaneY: number;
  windScale: number;
  terrainSeedSalt: number;
  spawns: Record<SeatId, SpawnPoint>;
  previewSegments: readonly (readonly SurfacePoint[])[];
  landmarks: readonly TerrainLandmark[];
  tierShots: readonly TierShotLane[];
};

const WORLD_WIDTH = 2400;
const DEATH_PLANE_Y = 900;

export const MAPS: readonly V1Map[] = [
  map("canyon-terraces", "Canyon Terraces", "tiered ledges with a safe starter rhythm", "starter multi-tier duel", 11, 0.9, {
    spawns: {
      "red-1": spawn(360, 632, 1),
      "blue-1": spawn(2040, 632, -1),
      "red-2": spawn(620, 724, 1),
      "blue-2": spawn(1780, 724, -1),
    },
    previewSegments: [
      segment(
        point(0, 750),
        point(170, 710),
        point(330, 636),
        point(520, 626),
        point(690, 732),
        point(870, 770),
        point(1040, 686),
        point(1200, 578),
        point(1360, 686),
        point(1530, 770),
        point(1710, 732),
        point(1880, 626),
        point(2070, 636),
        point(2230, 710),
        point(2400, 750),
      ),
    ],
    landmarks: [
      landmark("shelf", 1200, 578, 280, 42, "center high shelf"),
      landmark("spire", 970, 654, 82, 150, "left watch spire"),
      landmark("spire", 1430, 654, 82, 150, "right watch spire"),
    ],
    tierShots: [tierShot("red-2", "blue-1", "uphill"), tierShot("red-1", "blue-2", "downhill")],
  }),
  map("split-ravine", "Split Ravine", "broken shelves around a central drop", "bunge pressure with recovery ledges", 23, 1, {
    spawns: {
      "red-1": spawn(340, 610, 1),
      "blue-1": spawn(2060, 610, -1),
      "red-2": spawn(675, 726, 1),
      "blue-2": spawn(1725, 726, -1),
    },
    previewSegments: [
      segment(point(0, 748), point(180, 676), point(340, 610), point(520, 620), point(700, 726), point(850, 770)),
      segment(point(1010, 762), point(1110, 648), point(1200, 560), point(1290, 648), point(1390, 762)),
      segment(point(1550, 770), point(1700, 726), point(1880, 620), point(2060, 610), point(2220, 676), point(2400, 748)),
    ],
    landmarks: [
      landmark("arch", 1200, 650, 340, 170, "fractured center arch"),
      landmark("shelf", 560, 705, 240, 38, "red lower shelf"),
      landmark("shelf", 1840, 705, 240, 38, "blue lower shelf"),
    ],
    tierShots: [tierShot("red-2", "blue-1", "uphill"), tierShot("red-1", "blue-2", "downhill")],
  }),
  map("needlefield", "Needlefield", "thin stone towers split the battlefield into trick-shot lanes", "tower cover and gap reads", 37, 0.95, {
    spawns: {
      "red-1": spawn(360, 642, 1),
      "blue-1": spawn(2040, 642, -1),
      "red-2": spawn(780, 718, 1),
      "blue-2": spawn(1620, 718, -1),
    },
    previewSegments: [
      segment(point(0, 760), point(180, 702), point(360, 642), point(520, 650), point(650, 736)),
      segment(point(740, 724), point(840, 620), point(920, 548), point(1010, 624), point(1080, 742)),
      segment(point(1180, 770), point(1270, 676), point(1360, 572), point(1460, 676), point(1530, 770)),
      segment(point(1640, 736), point(1880, 650), point(2040, 642), point(2220, 702), point(2400, 760)),
    ],
    landmarks: [
      landmark("spire", 890, 548, 96, 216, "left needle"),
      landmark("spire", 1360, 572, 112, 200, "center needle"),
      landmark("spire", 1710, 632, 84, 170, "right needle"),
    ],
    tierShots: [tierShot("red-2", "blue-1", "uphill"), tierShot("red-1", "blue-2", "downhill")],
  }),
  map("ring-basin", "Ring Basin", "round canyon bowls and stone hoops reward crater control", "circular terrain reads for clusters and rollers", 51, 0.9, {
    spawns: {
      "red-1": spawn(430, 666, 1),
      "blue-1": spawn(1970, 666, -1),
      "red-2": spawn(705, 584, 1),
      "blue-2": spawn(1695, 584, -1),
    },
    previewSegments: [
      segment(
        point(0, 780),
        point(190, 742),
        point(430, 666),
        point(620, 604),
        point(760, 584),
        point(910, 672),
        point(1040, 754),
        point(1200, 802),
        point(1360, 754),
        point(1490, 672),
        point(1640, 584),
        point(1780, 604),
        point(1970, 666),
        point(2210, 742),
        point(2400, 780),
      ),
    ],
    landmarks: [
      landmark("ring", 760, 628, 250, 150, "red stone ring"),
      landmark("ring", 1680, 628, 250, 150, "blue stone ring"),
      landmark("ring", 1200, 744, 390, 170, "basin ring"),
      landmark("shelf", 720, 584, 300, 40, "red high balcony"),
      landmark("shelf", 1680, 584, 300, 40, "blue high balcony"),
    ],
    tierShots: [tierShot("red-1", "blue-2", "uphill"), tierShot("red-2", "blue-1", "downhill")],
  }),
  map("bridgeworks", "Bridgeworks", "stacked natural bridges and broken spans over open canyon air", "many bridge lanes with bunge pressure", 67, 1.18, {
    spawns: {
      "red-1": spawn(370, 586, 1),
      "blue-1": spawn(2030, 586, -1),
      "red-2": spawn(640, 738, 1),
      "blue-2": spawn(1760, 738, -1),
    },
    previewSegments: [
      segment(point(0, 780), point(170, 686), point(370, 586), point(520, 600)),
      segment(point(600, 742), point(760, 724), point(930, 704)),
      segment(point(990, 610), point(1120, 574), point(1240, 574), point(1370, 610)),
      segment(point(1450, 704), point(1620, 724), point(1780, 742)),
      segment(point(1880, 600), point(2030, 586), point(2230, 686), point(2400, 780)),
    ],
    landmarks: [
      landmark("bridge", 760, 704, 330, 58, "low red bridge"),
      landmark("bridge", 1200, 574, 440, 62, "high center bridge"),
      landmark("bridge", 1620, 704, 330, 58, "low blue bridge"),
      landmark("bridge", 1200, 736, 640, 46, "broken lower span"),
      landmark("spire", 540, 650, 76, 170, "red bridge tooth"),
      landmark("spire", 1860, 650, 76, 170, "blue bridge tooth"),
    ],
    tierShots: [tierShot("red-2", "blue-1", "uphill"), tierShot("red-1", "blue-2", "downhill")],
  }),
];

export function pickMap(mapPick: MapPick, seed: number) {
  if (mapPick !== "random") {
    return MAPS.find((map) => map.id === mapPick) ?? MAPS[0];
  }

  return MAPS[Math.abs(seed) % MAPS.length];
}

export function spawnForSeat(map: V1Map, seatId: SeatId) {
  return map.spawns[seatId];
}

function map(
  id: V1Map["id"],
  name: string,
  summary: string,
  tacticalRole: string,
  terrainSeedSalt: number,
  windScale: number,
  shape: Pick<V1Map, "spawns" | "previewSegments" | "landmarks" | "tierShots">,
): V1Map {
  return {
    id,
    name,
    summary,
    tacticalRole,
    worldWidth: WORLD_WIDTH,
    deathPlaneY: DEATH_PLANE_Y,
    windScale,
    terrainSeedSalt,
    spawns: shape.spawns,
    previewSegments: shape.previewSegments,
    landmarks: shape.landmarks,
    tierShots: shape.tierShots,
  };
}

function spawn(x: number, y: number, facing: 1 | -1): SpawnPoint {
  return { x, y, facing };
}

function segment(...points: SurfacePoint[]) {
  return points;
}

function point(x: number, y: number): SurfacePoint {
  return { x, y };
}

function landmark(
  type: TerrainLandmarkType,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
): TerrainLandmark {
  return { type, x, y, width, height, label };
}

function tierShot(from: SeatId, to: SeatId, direction: TierShotLane["direction"]): TierShotLane {
  return {
    from,
    to,
    direction,
    label: direction === "uphill" ? "shoot up" : "shoot down",
  };
}
