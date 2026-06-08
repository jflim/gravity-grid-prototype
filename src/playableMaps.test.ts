import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../server/v1/maps.js";
import { MODE_SEATS } from "../server/v1/rules.js";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  playableMapById,
  surfaceAt,
} from "./playableMaps";

const VOID_SURFACE_Y = 1160;

test("local demo defaults to Ring Basin for playable map feel testing", () => {
  const map = playableMapById(DEFAULT_DEMO_MAP_ID);

  assert.equal(DEFAULT_DEMO_MAP_ID, "ring-basin");
  assert.equal(map.name, "Ring Basin");
});

test("playable terrain follows v1 map surfaces and keeps all 2v2 spawns safe", () => {
  const map = playableMapById("ring-basin");
  const playable = buildPlayableTerrain(map, { voidSurfaceY: VOID_SURFACE_Y });

  assert.equal(playable.map.id, "ring-basin");
  assert.equal(playable.terrain.length, map.worldWidth + 1);
  assert.equal(surfaceAt(playable, 1200), VOID_SURFACE_Y, "center chasm is empty air");

  for (const seat of MODE_SEATS["2v2"]) {
    const spawn = map.spawns[seat.seatId];
    const surface = surfaceAt(playable, spawn.x);
    assert.ok(surface < map.deathPlaneY, `${seat.seatId} spawn is above the death plane`);
    assert.ok(Math.abs(surface - spawn.y) <= 28, `${seat.seatId} spawn is close to the reviewed map surface`);
  }
});

test("Ring Basin playable terrain uses full-unit-readable chasms", () => {
  const map = playableMapById("ring-basin");
  const playable = buildPlayableTerrain(map, { voidSurfaceY: VOID_SURFACE_Y });

  assert.ok(surfaceAt(playable, 840) < map.deathPlaneY, "left basin shelf remains playable land");
  assert.equal(surfaceAt(playable, 980), VOID_SURFACE_Y, "left edge of center chasm is empty air");
  assert.equal(surfaceAt(playable, 1200), VOID_SURFACE_Y, "middle of center chasm is empty air");
  assert.equal(surfaceAt(playable, 1420), VOID_SURFACE_Y, "right edge of center chasm is empty air");
  assert.ok(surfaceAt(playable, 1560) < map.deathPlaneY, "right basin shelf remains playable land");
});

test("playable terrain preserves separated land as void gaps", () => {
  const bridgeworks = MAPS.find((map) => map.id === "bridgeworks");
  assert.ok(bridgeworks, "Bridgeworks exists");

  const playable = buildPlayableTerrain(bridgeworks, { voidSurfaceY: VOID_SURFACE_Y });

  assert.equal(surfaceAt(playable, 560), VOID_SURFACE_Y, "gap between cliff and first bridge is empty air");
  assert.ok(surfaceAt(playable, 640) < bridgeworks.deathPlaneY, "bridge span remains playable land");
});
