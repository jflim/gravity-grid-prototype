import type { Facing, VehicleId } from "./gameTypes.js";

export type SpawnPoint = {
  x: number;
  y: number;
  facing: Facing;
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

export type PlayableMapDefinition = {
  id: string;
  name: string;
  summary: string;
  tacticalRole: string;
  worldWidth: number;
  deathPlaneY: number;
  windScale: number;
  terrainSeedSalt: number;
  spawns: Record<VehicleId, SpawnPoint>;
  previewSegments: readonly (readonly SurfacePoint[])[];
  landmarks: readonly TerrainLandmark[];
};
