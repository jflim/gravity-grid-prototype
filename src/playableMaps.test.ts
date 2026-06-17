import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../server/v1/maps.js";
import { MODE_SEATS } from "../server/v1/rules.js";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  demoMapIdFromSearch,
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

test("local demo can load the Tiled Idol Canyon draft without adding it to the v1 map pool", () => {
  const map = playableMapById("idol-canyon-supine-draft");
  const playable = buildPlayableTerrain(map, { voidSurfaceY: VOID_SURFACE_Y });

  assert.equal(map.name, "Idol Canyon: Supine Skeleton");
  assert.equal(MAPS.some((v1Map) => v1Map.id === map.id), false, "draft map is not a v1 selectable map");
  assert.ok(surfaceAt(playable, 1035) < map.deathPlaneY, "raised torso plateau becomes playable terrain");
  assert.ok(surfaceAt(playable, 725) >= VOID_SURFACE_Y, "left gap stays wide enough to read as empty air");
  assert.ok(surfaceAt(playable, 1450) < map.deathPlaneY, "waist basin becomes a risky playable island");
  assert.ok(surfaceAt(playable, 1630) >= VOID_SURFACE_Y, "right gap stays wide enough to read as empty air");
});

test("map query parameter selects a local demo map when it exists", () => {
  assert.equal(demoMapIdFromSearch("?map=idol-canyon-supine-draft"), "idol-canyon-supine-draft");
  assert.equal(demoMapIdFromSearch("?map=not-real"), DEFAULT_DEMO_MAP_ID);
  assert.equal(demoMapIdFromSearch(""), DEFAULT_DEMO_MAP_ID);
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

test("Ringworks Basin side bowls have readable troughs and high-lip staging shelves", () => {
  const map = playableMapById("ring-basin");
  const playable = buildPlayableTerrain(map, { voidSurfaceY: VOID_SURFACE_Y });

  assert.ok(surfaceAt(playable, 600) - surfaceAt(playable, 430) >= 36, "red side has a lower bowl trough after the lower spawn");
  assert.ok(surfaceAt(playable, 600) - surfaceAt(playable, 730) >= 130, "red high lip towers over the side bowl");
  assert.ok(Math.abs(surfaceAt(playable, 700) - surfaceAt(playable, 765)) <= 34, "red high lip has enough readable staging shelf");

  assert.ok(surfaceAt(playable, 1840) - surfaceAt(playable, 1970) >= 36, "blue side has a lower bowl trough before the lower spawn");
  assert.ok(surfaceAt(playable, 1840) - surfaceAt(playable, 1715) >= 130, "blue high lip towers over the side bowl");
  assert.ok(Math.abs(surfaceAt(playable, 1685) - surfaceAt(playable, 1750)) <= 34, "blue high lip has enough readable staging shelf");
});

test("Ringworks Basin gaps are wider than the scaled match sprite footprint", () => {
  const novaMatchSprite = scaleBattlefieldDisplay({ width: 354, height: 212 });
  const minimumReadableGap = novaMatchSprite.width + 112;
  const gaps = [
    { name: "left bridge gap", width: 1135 - 805 },
    { name: "right bridge gap", width: 1595 - 1265 },
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
