import type { PlayableTerrain } from "../playableMaps";

export interface MatchSceneTerrainController {
  currentMap: PlayableTerrain | undefined;
  visibleVoidTopY: number;
  surfaceAt: (x: number) => number;
  terrainAngleAt: (x: number) => number;
  makeCrater: (input: {
    x: number;
    y: number;
    radius: number;
    depthFactor: number;
    breakthroughY: number;
  }) => void;
}

export interface MatchSceneVoidZoneController {
  terrainBreakthroughY: (visibleVoidTopY: number) => number;
  terrainPlatformBottomY: (visibleVoidTopY: number) => number;
  visibleVoidBottomY: (visibleVoidTopY: number) => number;
  voidDropTargetY: (visibleVoidTopY: number) => number;
}

export interface MatchSceneTerrainAdapterOptions {
  terrainController: MatchSceneTerrainController;
  voidZoneController: MatchSceneVoidZoneController;
}

export class MatchSceneTerrainAdapter {
  constructor(private readonly options: MatchSceneTerrainAdapterOptions) {}

  get currentMap(): PlayableTerrain | undefined {
    return this.options.terrainController.currentMap;
  }

  get visibleVoidTopY(): number {
    return this.options.terrainController.visibleVoidTopY;
  }

  surfaceAt(x: number): number {
    return this.options.terrainController.surfaceAt(x);
  }

  terrainBreakthroughY(): number {
    return this.options.voidZoneController.terrainBreakthroughY(this.visibleVoidTopY);
  }

  terrainPlatformBottomY(): number {
    return this.options.voidZoneController.terrainPlatformBottomY(this.visibleVoidTopY);
  }

  visibleVoidBottomY(): number {
    return this.options.voidZoneController.visibleVoidBottomY(this.visibleVoidTopY);
  }

  voidDropTargetY(): number {
    return this.options.voidZoneController.voidDropTargetY(this.visibleVoidTopY);
  }

  terrainAngleAt(x: number): number {
    return this.options.terrainController.terrainAngleAt(x);
  }

  makeCrater(centerX: number, centerY: number, radius: number, depthFactor = 0.74): void {
    this.options.terrainController.makeCrater({
      x: centerX,
      y: centerY,
      radius,
      depthFactor,
      breakthroughY: this.terrainBreakthroughY(),
    });
  }
}
