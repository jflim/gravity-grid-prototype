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
import { scaleBattlefieldDisplay } from "./combatPresentation";

const VOID_SURFACE_Y = 1160;

test("local demo defaults to Ringworks Basin for playable map feel testing", () => {
  const map = playableMapById(DEFAULT_DEMO_MAP_ID);

  assert.equal(DEFAULT_DEMO_MAP_ID, "ring-basin");
  assert.equal(map.name, "Ringworks Basin");
});

test("playable terrain follows v1 map surfaces and keeps all 2v2 spawns safe", () => {
  const map = playableMapById("ring-basin");
  const playable = buildPlayableTerrain(map, { voidSurfaceY: VOID_SURFACE_Y });

  assert.equal(playable.map.id, "ring-basin");
  assert.equal(playable.terrain.length, map.worldWidth + 1);
  assert.ok(surfaceAt(playable, 1200) < map.deathPlaneY, "center ring bridge is playable/destructible land");

  for (const seat of MODE_SEATS["2v2"]) {
    const spawn = map.spawns[seat.seatId];
    const surface = surfaceAt(playable, spawn.x);
    assert.ok(surface < map.deathPlaneY, `${seat.seatId} spawn is above the death plane`);
    assert.ok(Math.abs(surface - spawn.y) <= 28, `${seat.seatId} spawn is close to the reviewed map surface`);
  }
});

test("Ringworks Basin playable terrain uses readable bridge gaps and weapon terrain", () => {
  const map = playableMapById("ring-basin");
  const playable = buildPlayableTerrain(map, { voidSurfaceY: VOID_SURFACE_Y });

  assert.ok(surfaceAt(playable, 705) < map.deathPlaneY, "left high lip remains playable land");
  assert.equal(surfaceAt(playable, 960), VOID_SURFACE_Y, "left bridge gap is empty air");
  assert.ok(surfaceAt(playable, 1200) < map.deathPlaneY, "center ring bridge is playable/destructible land");
  assert.equal(surfaceAt(playable, 1500), VOID_SURFACE_Y, "right bridge gap is empty air");
  assert.ok(surfaceAt(playable, 1750) < map.deathPlaneY, "right high lip remains playable land");
  assert.ok(surfaceAt(playable, 520) - surfaceAt(playable, 705) >= 90, "left bowl and lip create a visible rolling/crater setup");
  assert.ok(surfaceAt(playable, 1880) - surfaceAt(playable, 1750) >= 90, "right bowl and lip create a visible rolling/crater setup");
});

test("Ringworks Basin gaps are wider than the scaled match sprite footprint", () => {
  const novaMatchSprite = scaleBattlefieldDisplay({ width: 354, height: 212 });
  const minimumReadableGap = novaMatchSprite.width + 112;
  const gaps = [
    { name: "left bridge gap", width: 1100 - 740 },
    { name: "right bridge gap", width: 1660 - 1300 },
  ];

  for (const gap of gaps) {
    assert.ok(
      gap.width >= minimumReadableGap,
      `${gap.name} should read wider than a full scaled unit with buffer`,
    );
  }
});

test("playable terrain preserves separated land as void gaps", () => {
  const bridgeworks = MAPS.find((map) => map.id === "bridgeworks");
  assert.ok(bridgeworks, "Bridgeworks exists");

  const playable = buildPlayableTerrain(bridgeworks, { voidSurfaceY: VOID_SURFACE_Y });

  assert.equal(surfaceAt(playable, 560), VOID_SURFACE_Y, "gap between cliff and first bridge is empty air");
  assert.ok(surfaceAt(playable, 640) < bridgeworks.deathPlaneY, "bridge span remains playable land");
});
