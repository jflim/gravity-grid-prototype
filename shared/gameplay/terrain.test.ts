import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTerrainHeightmap,
  craterTerrain,
  surfaceAt,
  terrainAngleAt,
  type TerrainSegment,
} from "./terrain.js";

const segments: TerrainSegment[] = [
  [
    { x: 10, y: 100 },
    { x: 20, y: 120 },
  ],
  [
    { x: 40, y: 90 },
    { x: 50, y: 90 },
  ],
];

test("buildTerrainHeightmap fills only authored land and leaves gaps as void", () => {
  const terrain = buildTerrainHeightmap({
    worldWidth: 60,
    voidSurfaceY: 300,
    segments,
  });

  const sampleOptions = { worldWidth: 60, voidSurfaceY: 300 };
  assert.equal(terrain.length, 61);
  assert.equal(surfaceAt(terrain, -1, sampleOptions), 300);
  assert.equal(surfaceAt(terrain, 0, sampleOptions), 300);
  assert.equal(surfaceAt(terrain, 15, sampleOptions), 110);
  assert.equal(surfaceAt(terrain, 30, sampleOptions), 300);
  assert.equal(surfaceAt(terrain, 45, sampleOptions), 90);
});

test("craterTerrain lowers terrain inside the blast radius without mutating the original heightmap", () => {
  const original = [100, 100, 100, 100, 100];
  const cratered = craterTerrain({
    terrain: original,
    impactX: 2,
    impactY: 100,
    radius: 2,
    depth: 40,
    voidSurfaceY: 180,
  });

  assert.deepEqual(original, [100, 100, 100, 100, 100]);
  assert.deepEqual(cratered.map(Math.round), [100, 135, 140, 135, 100]);
});

test("terrainAngleAt returns the local surface angle in degrees", () => {
  const terrain = [100, 100, 110, 120, 130, 130];

  assert.ok(Math.abs(terrainAngleAt(terrain, 3, { sampleDistance: 1, voidSurfaceY: 300 }) - 84.3) < 0.3);
});
