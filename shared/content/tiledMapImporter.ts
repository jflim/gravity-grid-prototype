import type { VehicleId } from "../model/gameTypes.js";
import type {
  PlayableMapDefinition,
  SurfacePoint,
  TerrainLandmark,
  TerrainLandmarkType,
} from "../model/mapTypes.js";

type TiledPropertyValue = string | number | boolean;

type TiledProperty = {
  name: string;
  type?: string;
  value: TiledPropertyValue;
};

type TiledPoint = {
  x: number;
  y: number;
};

type TiledObject = {
  id: number;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  point?: boolean;
  ellipse?: boolean;
  polyline?: TiledPoint[];
  properties?: TiledProperty[];
};

type TiledObjectLayer = {
  name: string;
  type: "objectgroup";
  objects: TiledObject[];
};

export type TiledMapDocument = {
  type: "map";
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Array<TiledObjectLayer | { name: string; type: string }>;
  properties?: TiledProperty[];
};

const VEHICLE_IDS = new Set<VehicleId>(["red-1", "blue-1", "red-2", "blue-2"]);
const MIN_SPAWN_SEPARATION = 260;

export function tiledMapToPlayableMap(tiledMap: TiledMapDocument): PlayableMapDefinition {
  const worldWidth = numberProperty(tiledMap, "gravityCanyon.worldWidth", tiledMap.width * tiledMap.tilewidth);
  const deathPlaneY = numberProperty(tiledMap, "gravityCanyon.deathPlaneY", tiledMap.height * tiledMap.tileheight);
  const windScale = numberProperty(tiledMap, "gravityCanyon.windScale", 1);

  return {
    id: stringProperty(tiledMap, "gravityCanyon.mapId", "tiled-draft-map"),
    name: stringProperty(tiledMap, "gravityCanyon.name", "Tiled Draft Map"),
    summary: stringProperty(tiledMap, "gravityCanyon.summary", "Tiled-authored draft map"),
    tacticalRole: stringProperty(tiledMap, "gravityCanyon.tacticalRole", "map authoring draft"),
    worldWidth,
    deathPlaneY,
    windScale,
    terrainSeedSalt: numberProperty(tiledMap, "gravityCanyon.terrainSeedSalt", 101),
    spawns: readSpawns(tiledMap),
    previewSegments: readSurfaceSegments(tiledMap),
    landmarks: readLandmarks(tiledMap),
  };
}

function readSurfaceSegments(tiledMap: TiledMapDocument): readonly (readonly SurfacePoint[])[] {
  const layer = objectLayer(tiledMap, "terrain.surface");
  if (!layer) {
    return [];
  }

  return layer.objects
    .filter((object) => object.polyline && object.polyline.length >= 2)
    .map((object) =>
      object.polyline!.map((point) => ({
        x: Math.round((object.x ?? 0) + point.x),
        y: Math.round((object.y ?? 0) + point.y),
      })),
    );
}

function readSpawns(tiledMap: TiledMapDocument): PlayableMapDefinition["spawns"] {
  const layer = objectLayer(tiledMap, "spawn.points");
  const spawns: Partial<PlayableMapDefinition["spawns"]> = {};
  if (!layer) {
    throw new Error("Tiled map is missing spawn.points object layer");
  }

  for (const object of layer.objects) {
    const seatId = stringObjectProperty(object, "seatId", object.name ?? "");
    if (!VEHICLE_IDS.has(seatId as VehicleId)) {
      continue;
    }

    const facing = numberObjectProperty(object, "facing", seatId.startsWith("red") ? 1 : -1);
    spawns[seatId as VehicleId] = {
      x: Math.round(object.x ?? 0),
      y: Math.round(object.y ?? 0),
      facing: facing === -1 ? -1 : 1,
    };
  }

  for (const vehicleId of VEHICLE_IDS) {
    if (!spawns[vehicleId]) {
      throw new Error(`Tiled map is missing spawn point ${vehicleId}`);
    }
  }

  assertSpawnSeparation(spawns as PlayableMapDefinition["spawns"]);

  return spawns as PlayableMapDefinition["spawns"];
}

function assertSpawnSeparation(spawns: PlayableMapDefinition["spawns"]): void {
  const spawnEntries = Object.entries(spawns) as Array<[VehicleId, PlayableMapDefinition["spawns"][VehicleId]]>;

  for (let index = 0; index < spawnEntries.length; index += 1) {
    const [firstId, firstSpawn] = spawnEntries[index];
    for (let otherIndex = index + 1; otherIndex < spawnEntries.length; otherIndex += 1) {
      const [secondId, secondSpawn] = spawnEntries[otherIndex];
      const distance = Math.hypot(firstSpawn.x - secondSpawn.x, firstSpawn.y - secondSpawn.y);
      if (distance < MIN_SPAWN_SEPARATION) {
        throw new Error(
          `Tiled map spawn points ${firstId} and ${secondId} are too close: ${Math.round(distance)}px. ` +
            `Keep spawns at least ${MIN_SPAWN_SEPARATION}px apart.`,
        );
      }
    }
  }
}

function readLandmarks(tiledMap: TiledMapDocument): TerrainLandmark[] {
  const calloutLayer = objectLayer(tiledMap, "callouts");
  const callouts =
    calloutLayer?.objects.map((object) =>
      landmarkFromObject(object, "shelf", object.name || "Unnamed callout"),
    ) ?? [];

  const landmarkLayer = objectLayer(tiledMap, "landmarks");
  const landmarks =
    landmarkLayer?.objects.map((object) =>
      landmarkFromObject(
        object,
        landmarkTypeFromString(stringObjectProperty(object, "landmarkType", object.type ?? "")),
        object.name || "Unnamed landmark",
      ),
    ) ?? [];

  return [...callouts, ...landmarks];
}

function landmarkFromObject(object: TiledObject, type: TerrainLandmarkType, label: string): TerrainLandmark {
  const width = Math.round(object.width ?? 80);
  const height = Math.round(object.height ?? 40);
  return {
    type,
    x: Math.round((object.x ?? 0) + width / 2),
    y: Math.round((object.y ?? 0) + height / 2),
    width,
    height,
    label,
  };
}

function landmarkTypeFromString(value: string): TerrainLandmarkType {
  switch (value) {
    case "arch":
    case "bridge":
    case "ring":
    case "shelf":
    case "spire":
      return value;
    case "tower":
      return "spire";
    default:
      return "shelf";
  }
}

function objectLayer(tiledMap: TiledMapDocument, name: string): TiledObjectLayer | undefined {
  return tiledMap.layers.find((layer): layer is TiledObjectLayer => layer.type === "objectgroup" && layer.name === name);
}

function stringProperty(tiledMap: TiledMapDocument, name: string, fallback: string): string {
  const value = propertyValue(tiledMap.properties, name);
  return typeof value === "string" ? value : fallback;
}

function numberProperty(tiledMap: TiledMapDocument, name: string, fallback: number): number {
  const value = propertyValue(tiledMap.properties, name);
  return typeof value === "number" ? value : fallback;
}

function stringObjectProperty(object: TiledObject, name: string, fallback: string): string {
  const value = propertyValue(object.properties, name);
  return typeof value === "string" ? value : fallback;
}

function numberObjectProperty(object: TiledObject, name: string, fallback: number): number {
  const value = propertyValue(object.properties, name);
  return typeof value === "number" ? value : fallback;
}

function propertyValue(properties: readonly TiledProperty[] | undefined, name: string): TiledPropertyValue | undefined {
  return properties?.find((property) => property.name === name)?.value;
}
