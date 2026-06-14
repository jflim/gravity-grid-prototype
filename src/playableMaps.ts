import { MAPS, type V1Map } from "../server/v1/maps.js";
import {
  buildTerrainHeightmap,
  surfaceAt as terrainSurfaceAt,
} from "../shared/gameplay/terrain.js";

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
  return {
    map,
    terrain: buildTerrainHeightmap({
      worldWidth: map.worldWidth,
      voidSurfaceY: options.voidSurfaceY,
      segments: map.previewSegments,
    }),
    voidSurfaceY: options.voidSurfaceY,
  };
}

export function surfaceAt(playable: PlayableTerrain, x: number): number {
  return terrainSurfaceAt(playable.terrain, x, {
    worldWidth: playable.map.worldWidth,
    voidSurfaceY: playable.voidSurfaceY,
  });
}
