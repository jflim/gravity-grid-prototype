import { MAPS, type V1Map } from "../server/v1/maps.js";

export const DEFAULT_DEMO_MAP_ID = "ring-basin" satisfies V1Map["id"];

export interface PlayableTerrain {
  map: V1Map;
  terrain: number[];
  voidSurfaceY: number;
}

interface PlayableTerrainOptions {
  voidSurfaceY: number;
}

export function playableMapById(mapId: V1Map["id"]): V1Map {
  return MAPS.find((map) => map.id === mapId) ?? MAPS[0];
}

export function buildPlayableTerrain(map: V1Map, options: PlayableTerrainOptions): PlayableTerrain {
  const terrain = new Array<number>(map.worldWidth + 1).fill(options.voidSurfaceY);

  for (const segment of map.previewSegments) {
    for (let pointIndex = 1; pointIndex < segment.length; pointIndex += 1) {
      const start = segment[pointIndex - 1];
      const end = segment[pointIndex];
      const startX = Math.max(0, Math.round(start.x));
      const endX = Math.min(map.worldWidth, Math.round(end.x));
      const span = Math.max(1, end.x - start.x);

      for (let x = startX; x <= endX; x += 1) {
        const t = (x - start.x) / span;
        terrain[x] = start.y + (end.y - start.y) * t;
      }
    }
  }

  return {
    map,
    terrain,
    voidSurfaceY: options.voidSurfaceY,
  };
}

export function surfaceAt(playable: PlayableTerrain, x: number): number {
  if (x < 0 || x > playable.map.worldWidth) {
    return playable.voidSurfaceY;
  }

  return playable.terrain[Math.round(x)] ?? playable.voidSurfaceY;
}
