import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  playableMapById,
  type PlayableTerrain,
} from "../playableMaps";
import { TerrainController } from "./TerrainController";

const playableTerrain = buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), {
  voidSurfaceY: 300,
});

function createController(): TerrainController {
  return new TerrainController({
    worldWidth: 4,
    voidSurfaceY: 300,
    vehicleHalfWidth: 1,
    deathSurfaceY: 300,
    maxTerrainSpriteTiltDeg: 18,
  });
}

function startRound(
  controller: TerrainController,
  terrain: readonly number[],
  playable: PlayableTerrain = playableTerrain,
): void {
  controller.startRound({
    playableTerrain: playable,
    terrain,
    visibleVoidTopY: 260,
  });
}

test("terrain controller owns the current map, mutable terrain copy, and void top", () => {
  const controller = createController();
  const sourceTerrain = [100, 110, 120, 130, 140];

  startRound(controller, sourceTerrain);
  sourceTerrain[2] = 260;

  assert.equal(controller.currentMap, playableTerrain);
  assert.equal(controller.visibleVoidTopY, 260);
  assert.equal(controller.surfaceAt(2), 120);
  assert.equal(controller.surfaceAt(-1), 300);
  assert.equal(controller.surfaceAt(20), 300);
});

test("terrain controller craters its internal heightmap without mutating the round source", () => {
  const controller = createController();
  const sourceTerrain = [100, 100, 100, 100, 100];

  startRound(controller, sourceTerrain);
  const before = controller.heightmap;
  controller.makeCrater({
    x: 2,
    y: 100,
    radius: 2,
    depthFactor: 10,
    breakthroughY: 105,
  });

  assert.equal(sourceTerrain[2], 100);
  assert.notEqual(controller.heightmap, before);
  assert.equal(controller.surfaceAt(2), 300);
});

test("terrain controller reports clamped vehicle-facing slope and ignores void footing", () => {
  const controller = createController();

  startRound(controller, [100, 100, 140, 180, 220]);
  assert.equal(controller.terrainAngleAt(2), 18);

  startRound(controller, [100, 100, 300, 300, 300]);
  assert.equal(controller.terrainAngleAt(3), 0);
});
