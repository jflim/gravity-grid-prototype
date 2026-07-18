import { MAPS } from "../server/v1/maps.js";
import idolCanyonSupineDraft from "../shared/content/maps/idol-canyon-supine-draft.tiled.json";
import { tiledMapToPlayableMap, type TiledMapDocument } from "../shared/content/tiledMapImporter.js";
import {
  buildTerrainHeightmap,
  surfaceAt as terrainSurfaceAt,
} from "../shared/gameplay/terrain.js";
import type { PlayableMapDefinition } from "../shared/model/mapTypes.js";

export const DEFAULT_DEMO_MAP_ID = "ring-basin";

export const TILED_DRAFT_MAPS = [
  tiledMapToPlayableMap(idolCanyonSupineDraft as unknown as TiledMapDocument),
] as const;

const PLAYABLE_MAPS: readonly PlayableMapDefinition[] = [...MAPS, ...TILED_DRAFT_MAPS];

export interface PlayableTerrain {
  map: PlayableMapDefinition;
  terrain: number[];
  voidSurfaceY: number;
}

interface PlayableTerrainOptions {
  voidSurfaceY: number;
}

export function playableMapById(mapId: string): PlayableMapDefinition {
  return PLAYABLE_MAPS.find((map) => map.id === mapId) ?? PLAYABLE_MAPS.find((map) => map.id === DEFAULT_DEMO_MAP_ID)!;
}

export function demoMapIdFromSearch(search: string): string {
  const mapId = new URLSearchParams(search).get("map") ?? DEFAULT_DEMO_MAP_ID;
  return PLAYABLE_MAPS.some((map) => map.id === mapId) ? mapId : DEFAULT_DEMO_MAP_ID;
}

export function buildPlayableTerrain(map: PlayableMapDefinition, options: PlayableTerrainOptions): PlayableTerrain {
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
