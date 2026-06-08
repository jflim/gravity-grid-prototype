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

export type V1Map = {
  id: Exclude<MapPick, "random">;
  name: string;
  summary: string;
  worldWidth: number;
  deathPlaneY: number;
  windScale: number;
  terrainSeedSalt: number;
  spawns: Record<SeatId, SpawnPoint>;
  previewSurface: readonly SurfacePoint[];
};

const WORLD_WIDTH = 2400;
const DEATH_PLANE_Y = 900;

export const MAPS: readonly V1Map[] = [
  map("mesa-ribs", "Mesa Ribs", "wide ridges with shallow center pockets", 11, 0.85, {
    spawns: {
      "red-1": spawn(380, 610, 1),
      "blue-1": spawn(2020, 600, -1),
      "red-2": spawn(610, 640, 1),
      "blue-2": spawn(1790, 640, -1),
    },
    previewSurface: [
      point(0, 690),
      point(180, 640),
      point(360, 605),
      point(560, 635),
      point(780, 690),
      point(1020, 665),
      point(1220, 710),
      point(1450, 660),
      point(1680, 640),
      point(1880, 610),
      point(2080, 625),
      point(2280, 675),
      point(2400, 690),
    ],
  }),
  map("split-arch", "Split Arch", "two high shelves divided by a visible central saddle", 23, 1, {
    spawns: {
      "red-1": spawn(330, 580, 1),
      "blue-1": spawn(2070, 580, -1),
      "red-2": spawn(720, 650, 1),
      "blue-2": spawn(1680, 650, -1),
    },
    previewSurface: [
      point(0, 675),
      point(190, 610),
      point(360, 585),
      point(610, 625),
      point(820, 690),
      point(1010, 735),
      point(1200, 705),
      point(1390, 735),
      point(1580, 690),
      point(1790, 625),
      point(2040, 585),
      point(2210, 610),
      point(2400, 675),
    ],
  }),
  map("crater-steps", "Crater Steps", "stepped shelves with several safe crater bowls", 37, 0.9, {
    spawns: {
      "red-1": spawn(420, 620, 1),
      "blue-1": spawn(1980, 620, -1),
      "red-2": spawn(780, 700, 1),
      "blue-2": spawn(1620, 700, -1),
    },
    previewSurface: [
      point(0, 710),
      point(210, 665),
      point(420, 620),
      point(610, 675),
      point(790, 705),
      point(980, 650),
      point(1200, 705),
      point(1420, 650),
      point(1610, 705),
      point(1790, 675),
      point(1980, 620),
      point(2190, 665),
      point(2400, 710),
    ],
  }),
  map("wind-bridge", "Wind Bridge", "long central bridge that makes wind reads matter", 51, 1.15, {
    spawns: {
      "red-1": spawn(360, 590, 1),
      "blue-1": spawn(2040, 590, -1),
      "red-2": spawn(650, 625, 1),
      "blue-2": spawn(1750, 625, -1),
    },
    previewSurface: [
      point(0, 700),
      point(180, 640),
      point(360, 590),
      point(620, 625),
      point(860, 660),
      point(1040, 640),
      point(1200, 630),
      point(1360, 640),
      point(1540, 660),
      point(1780, 625),
      point(2040, 590),
      point(2220, 640),
      point(2400, 700),
    ],
  }),
  map("basin-ridge", "Basin Ridge", "outer ridges around a broad readable basin", 67, 0.95, {
    spawns: {
      "red-1": spawn(430, 680, 1),
      "blue-1": spawn(1970, 680, -1),
      "red-2": spawn(690, 610, 1),
      "blue-2": spawn(1710, 610, -1),
    },
    previewSurface: [
      point(0, 720),
      point(220, 700),
      point(430, 680),
      point(690, 610),
      point(900, 665),
      point(1090, 735),
      point(1200, 760),
      point(1310, 735),
      point(1500, 665),
      point(1710, 610),
      point(1970, 680),
      point(2180, 700),
      point(2400, 720),
    ],
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
  terrainSeedSalt: number,
  windScale: number,
  shape: Pick<V1Map, "spawns" | "previewSurface">,
): V1Map {
  return {
    id,
    name,
    summary,
    worldWidth: WORLD_WIDTH,
    deathPlaneY: DEATH_PLANE_Y,
    windScale,
    terrainSeedSalt,
    spawns: shape.spawns,
    previewSurface: shape.previewSurface,
  };
}

function spawn(x: number, y: number, facing: 1 | -1): SpawnPoint {
  return { x, y, facing };
}

function point(x: number, y: number): SurfacePoint {
  return { x, y };
}
