import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import {
  DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  MAX_HP,
  MAX_MOVE_UNITS,
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
