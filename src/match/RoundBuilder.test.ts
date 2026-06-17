import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import { settleVehicleOnTerrain, type VehicleSettlementTuning } from "../../shared/gameplay/vehicleSettlement.js";
import { surfaceAt as terrainSurfaceAt } from "../../shared/gameplay/terrain.js";
import {
  DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  DEATH_SURFACE_Y,
  MAX_HP,
  MAX_MOVE_UNITS,
  MOVE_MAX_X,
  MOVE_MIN_X,
  SETTLEMENT_MAX_SLOPE_ITERATIONS,
  SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  SETTLEMENT_SLOPE_STEP,
  SETTLEMENT_SLOPE_THRESHOLD,
  TERRAIN_CHANGE_SETTLE_PADDING,
  VEHICLE_HALF_HEIGHT,
  VEHICLE_HALF_WIDTH,
  V1_WORLD_WIDTH,
  VOID_SURFACE_Y,
} from "../../shared/v1/tuning.js";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  playableMapById,
} from "../playableMaps";
import { RoundBuilder } from "./RoundBuilder";

const builder = new RoundBuilder({
  maxHp: MAX_HP,
  maxMoveUnits: MAX_MOVE_UNITS,
  worldWidth: V1_WORLD_WIDTH,
  spawnFlattenWidth: 150,
  defaultTerrainBreakthroughY: DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  fallbackVisibleVoidTopY: 660,
});
const settlementTuning: VehicleSettlementTuning = {
  vehicleHalfWidth: VEHICLE_HALF_WIDTH,
  vehicleHalfHeight: VEHICLE_HALF_HEIGHT,
  moveMinX: MOVE_MIN_X,
  moveMaxX: MOVE_MAX_X,
  deathSurfaceY: DEATH_SURFACE_Y,
  terrainChangePadding: TERRAIN_CHANGE_SETTLE_PADDING,
  slopeSampleDistance: SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  slopeThreshold: SETTLEMENT_SLOPE_THRESHOLD,
  slopeStep: SETTLEMENT_SLOPE_STEP,
  maxSlopeIterations: SETTLEMENT_MAX_SLOPE_ITERATIONS,
};

test("round builder creates deterministic vehicles and turn order from map spawns", () => {
  const demoMap = buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), {
    voidSurfaceY: VOID_SURFACE_Y,
  });

  const round = builder.build({
    playableTerrain: demoMap,
    units: DEMO_UNIT_DEFINITIONS,
  });

  assert.deepEqual(round.turnOrder, ["red-1", "blue-1", "red-2", "blue-2"]);
  assert.equal(round.vehicles.length, 4);
  assert.equal(round.vehicles[0]!.id, "red-1");
  assert.equal(round.vehicles[0]!.x, demoMap.map.spawns["red-1"].x);
  assert.equal(round.vehicles[0]!.hp, MAX_HP);
  assert.equal(round.vehicles[0]!.moveUnits, MAX_MOVE_UNITS);
  assert.equal(round.vehicles[0]!.alive, true);
  assert.equal(round.vehicles[0]!.angle, 47);
  assert.equal(round.vehicles[1]!.angle, 133);
  assert.equal(round.shotResult, `Round started: ${demoMap.map.name}.`);
});

test("round builder flattens each spawn zone without mutating the source terrain", () => {
  const demoMap = buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), {
    voidSurfaceY: VOID_SURFACE_Y,
  });
  const sourceTerrain = [...demoMap.terrain];

  const round = builder.build({
    playableTerrain: demoMap,
    units: DEMO_UNIT_DEFINITIONS,
  });

  assert.deepEqual(demoMap.terrain, sourceTerrain);
  for (const spawn of Object.values(demoMap.map.spawns)) {
    const centerSurface = round.terrain[spawn.x]!;
    assert.equal(round.terrain[spawn.x - 8], centerSurface);
    assert.equal(round.terrain[spawn.x + 8], centerSurface);
  }
});

test("round builder throws when a unit has no spawn in the map", () => {
  const demoMap = buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), {
    voidSurfaceY: VOID_SURFACE_Y,
  });
  const malformedSpawns = {
    ...demoMap.map.spawns,
    "red-1": undefined,
  } as unknown as typeof demoMap.map.spawns;

  assert.throws(
    () =>
      builder.build({
        playableTerrain: {
          ...demoMap,
          map: {
            ...demoMap.map,
            spawns: malformedSpawns,
          },
        },
        units: DEMO_UNIT_DEFINITIONS,
      }),
    /Missing spawn for red-1/,
  );
});

test("Ringworks Basin lets Kaelii move left from spawn without false falling through terrain", () => {
  const demoMap = buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), {
    voidSurfaceY: VOID_SURFACE_Y,
  });
  const round = builder.build({
    playableTerrain: demoMap,
    units: DEMO_UNIT_DEFINITIONS,
  });
  const kaelii = round.vehicles.find((vehicle) => vehicle.characterId === "kaelii");
  assert.ok(kaelii, "Kaelii exists in the demo roster");

  const x = 655;
  const surfaceAt = (sampleX: number) =>
    terrainSurfaceAt(round.terrain, sampleX, {
      worldWidth: V1_WORLD_WIDTH,
      voidSurfaceY: VOID_SURFACE_Y,
    });
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: kaelii.id,
      x,
      y: surfaceAt(x) - VEHICLE_HALF_HEIGHT,
      hp: kaelii.hp,
      alive: kaelii.alive,
    },
    adjustForSlope: false,
    tuning: settlementTuning,
    fallbackFallStartY: 760,
    surfaceAt,
  });

  assert.notEqual(result.motion?.kind, "falling");
  assert.equal(result.motion?.kind, "sliding");
});
