import type { DemoUnitDefinition } from "../../shared/content/v1Units.js";
import { surfaceAt as terrainSurfaceAt } from "../../shared/gameplay/terrain.js";
import type { Facing, VehicleId } from "../../shared/model/gameTypes.js";
import { visibleVoidZoneTopY } from "../voidDropPresentation";
import type { PlayableTerrain } from "../playableMaps";
import type { VehicleState } from "./MatchTypes";

export interface RoundBuilderOptions {
  maxHp: number;
  maxMoveUnits: number;
  worldWidth: number;
  spawnFlattenWidth: number;
  defaultTerrainBreakthroughY: number;
  fallbackVisibleVoidTopY: number;
}

export interface BuildRoundInput {
  playableTerrain: PlayableTerrain;
  units: readonly DemoUnitDefinition[];
}

export interface BuiltRound {
  playableTerrain: PlayableTerrain;
  terrain: number[];
  visibleVoidTopY: number;
  vehicles: VehicleState[];
  turnOrder: VehicleId[];
  shotResult: string;
}

export class RoundBuilder {
  constructor(private readonly options: RoundBuilderOptions) {}

  build(input: BuildRoundInput): BuiltRound {
    const unitSpawns = input.units.map((unit) => this.spawnForUnit(input.playableTerrain, unit));
    const terrain = [...input.playableTerrain.terrain];
    this.flattenSpawnZones(terrain, input.playableTerrain);

    const vehicles = input.units.map((unit, index) => {
      const spawn = unitSpawns[index]!;
      return {
        ...unit,
        x: spawn.x,
        y: 0,
        hp: this.options.maxHp,
        angle: this.initialAngleForFacing(spawn.facing),
        facing: spawn.facing,
        moveUnits: this.options.maxMoveUnits,
        alive: true,
      };
    });

    return {
      playableTerrain: input.playableTerrain,
      terrain,
      visibleVoidTopY: visibleVoidZoneTopY({
        terrain,
        terrainBreakthroughY: this.options.defaultTerrainBreakthroughY,
        fallbackTopY: this.options.fallbackVisibleVoidTopY,
      }),
      vehicles,
      turnOrder: input.units.map((unit) => unit.id),
      shotResult: `Round started: ${input.playableTerrain.map.name}.`,
    };
  }

  private spawnForUnit(playableTerrain: PlayableTerrain, unit: DemoUnitDefinition): { x: number; facing: Facing } {
    const spawn = playableTerrain.map.spawns[unit.id];
    if (!spawn) {
      throw new Error(`Missing spawn for ${unit.id}`);
    }
    return spawn;
  }

  private flattenSpawnZones(terrain: number[], playableTerrain: PlayableTerrain): void {
    for (const spawn of Object.values(playableTerrain.map.spawns)) {
      if (!spawn) {
        continue;
      }
      this.flattenSpawnZone(terrain, playableTerrain, spawn.x, this.options.spawnFlattenWidth);
    }
  }

  private flattenSpawnZone(
    terrain: number[],
    playableTerrain: PlayableTerrain,
    centerX: number,
    width: number,
  ): void {
    const start = Math.max(0, Math.floor(centerX - width / 2));
    const end = Math.min(this.options.worldWidth, Math.floor(centerX + width / 2));
    const target = this.surfaceAt(terrain, playableTerrain, centerX);
    for (let x = start; x <= end; x += 1) {
      const edgeT = Math.min((x - start) / 26, (end - x) / 26, 1);
      terrain[x] = linear(terrain[x] ?? target, target, edgeT);
    }
  }

  private surfaceAt(terrain: number[], playableTerrain: PlayableTerrain, x: number): number {
    return terrainSurfaceAt(terrain, x, {
      worldWidth: playableTerrain.map.worldWidth,
      voidSurfaceY: playableTerrain.voidSurfaceY,
    });
  }

  private initialAngleForFacing(facing: Facing): number {
    return facing === 1 ? 47 : 133;
  }
}

function linear(start: number, end: number, time: number): number {
  return start + (end - start) * time;
}
