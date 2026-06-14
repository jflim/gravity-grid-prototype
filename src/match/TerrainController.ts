import {
  craterTerrain,
  surfaceAt as terrainSurfaceAt,
  terrainAngleAt as terrainSlopeAngleAt,
} from "../../shared/gameplay/terrain.js";
import type { PlayableTerrain } from "../playableMaps";

export interface TerrainControllerOptions {
  worldWidth: number;
  voidSurfaceY: number;
  vehicleHalfWidth: number;
  deathSurfaceY: number;
  maxTerrainSpriteTiltDeg: number;
}

export interface StartTerrainRoundInput {
  playableTerrain: PlayableTerrain;
  terrain: readonly number[];
  visibleVoidTopY: number;
}

export interface MakeCraterInput {
  x: number;
  y: number;
  radius: number;
  depthFactor: number;
  breakthroughY: number;
}

export class TerrainController {
  private map?: PlayableTerrain;
  private terrain: number[] = [];
  private voidTopY = 0;

  constructor(private readonly options: TerrainControllerOptions) {}

  get currentMap(): PlayableTerrain | undefined {
    return this.map;
  }

  get heightmap(): readonly number[] {
    return this.terrain;
  }

  get visibleVoidTopY(): number {
    return this.voidTopY;
  }

  startRound(input: StartTerrainRoundInput): void {
    this.map = input.playableTerrain;
    this.terrain = [...input.terrain];
    this.voidTopY = input.visibleVoidTopY;
  }

  surfaceAt(x: number): number {
    return terrainSurfaceAt(this.terrain, x, {
      worldWidth: this.options.worldWidth,
      voidSurfaceY: this.options.voidSurfaceY,
    });
  }

  makeCrater(input: MakeCraterInput): void {
    this.terrain = craterTerrain({
      terrain: this.terrain,
      impactX: input.x,
      impactY: input.y,
      radius: input.radius,
      depth: input.radius * input.depthFactor,
      voidSurfaceY: this.options.voidSurfaceY,
      breakthroughY: input.breakthroughY,
    });
  }

  terrainAngleAt(x: number): number {
    const left = this.surfaceAt(x - this.options.vehicleHalfWidth);
    const right = this.surfaceAt(x + this.options.vehicleHalfWidth);
    if (left >= this.options.deathSurfaceY || right >= this.options.deathSurfaceY) {
      return 0;
    }

    return clamp(
      terrainSlopeAngleAt(this.terrain, x, {
        worldWidth: this.options.worldWidth,
        voidSurfaceY: this.options.voidSurfaceY,
        sampleDistance: this.options.vehicleHalfWidth,
      }),
      -this.options.maxTerrainSpriteTiltDeg,
      this.options.maxTerrainSpriteTiltDeg,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
