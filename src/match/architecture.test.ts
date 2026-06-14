import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("match scene refactor exposes planned module boundaries", () => {
  const expectedFiles = [
    "src/match/MatchScene.ts",
    "src/match/MatchTypes.ts",
    "src/match/MatchCameraController.ts",
    "src/match/ImpactController.ts",
    "src/match/ProjectileController.ts",
    "src/match/RoundBuilder.ts",
    "src/match/TerrainController.ts",
    "src/match/TurnController.ts",
    "src/match/VehicleGeometry.ts",
    "src/match/VoidZoneController.ts",
    "src/match/ui/CommandDeck.ts",
    "src/match/rendering/TerrainRenderer.ts",
    "src/match/rendering/VehicleRenderer.ts",
    "src/match/rendering/ProjectileRenderer.ts",
    "src/match/rendering/EffectsRenderer.ts",
    "src/match/rendering/CombatMarkerRenderer.ts",
    "src/match/rendering/RenderingTypes.ts",
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});

test("planned match modules export their concrete boundaries", () => {
  const expectedExports = [
    ["src/match/MatchScene.ts", "export class MatchScene"],
    ["src/match/MatchCameraController.ts", "export class MatchCameraController"],
    ["src/match/ImpactController.ts", "export class ImpactController"],
    ["src/match/ProjectileController.ts", "export class ProjectileController"],
    ["src/match/RoundBuilder.ts", "export class RoundBuilder"],
    ["src/match/TerrainController.ts", "export class TerrainController"],
    ["src/match/TurnController.ts", "export class TurnController"],
    ["src/match/VehicleGeometry.ts", "export class VehicleGeometry"],
    ["src/match/VoidZoneController.ts", "export class VoidZoneController"],
    ["src/match/ui/CommandDeck.ts", "export class CommandDeck"],
    ["src/match/rendering/TerrainRenderer.ts", "export class TerrainRenderer"],
    ["src/match/rendering/VehicleRenderer.ts", "export class VehicleRenderer"],
    ["src/match/rendering/ProjectileRenderer.ts", "export class ProjectileRenderer"],
    ["src/match/rendering/EffectsRenderer.ts", "export class EffectsRenderer"],
    ["src/match/rendering/CombatMarkerRenderer.ts", "export class CombatMarkerRenderer"],
    ["src/match/rendering/RenderingTypes.ts", "export interface CombatMarker"],
  ] as const;

  for (const [file, expectedExport] of expectedExports) {
    assert.match(readFileSync(file, "utf8"), new RegExp(expectedExport));
  }
});

test("main.ts stays a bootstrap instead of owning the Phaser scene", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.match(main, /new Phaser\.Game/);
  assert.match(main, /scene:\s*MatchScene/);
  assert.doesNotMatch(main, /class GravityGridScene/);
});

test("match runtime types stay free of Phaser rendering objects", () => {
  const matchTypes = readFileSync("src/match/MatchTypes.ts", "utf8");

  assert.doesNotMatch(matchTypes, /from "phaser"/);
  assert.doesNotMatch(matchTypes, /Phaser\./);
  assert.doesNotMatch(matchTypes, /CombatMarker/);
});

test("match scene delegates terrain state to TerrainController", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new TerrainController/);
  assert.doesNotMatch(matchScene, /craterTerrain/);
  assert.doesNotMatch(matchScene, /terrainAngleAt as terrainSlopeAngleAt/);
  assert.doesNotMatch(matchScene, /surfaceAt as terrainSurfaceAt/);
});
