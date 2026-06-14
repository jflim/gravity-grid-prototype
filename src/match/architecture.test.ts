import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("match scene refactor exposes planned module boundaries", () => {
  const expectedFiles = [
    "src/match/MatchScene.ts",
    "src/match/MatchTypes.ts",
    "src/match/MatchCameraController.ts",
    "src/match/ui/CommandDeck.ts",
    "src/match/rendering/TerrainRenderer.ts",
    "src/match/rendering/VehicleRenderer.ts",
    "src/match/rendering/ProjectileRenderer.ts",
    "src/match/rendering/EffectsRenderer.ts",
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});

test("planned match modules export their concrete boundaries", () => {
  const expectedExports = [
    ["src/match/MatchScene.ts", "export class MatchScene"],
    ["src/match/MatchCameraController.ts", "export class MatchCameraController"],
    ["src/match/ui/CommandDeck.ts", "export class CommandDeck"],
    ["src/match/rendering/TerrainRenderer.ts", "export class TerrainRenderer"],
    ["src/match/rendering/VehicleRenderer.ts", "export class VehicleRenderer"],
    ["src/match/rendering/ProjectileRenderer.ts", "export class ProjectileRenderer"],
    ["src/match/rendering/EffectsRenderer.ts", "export class EffectsRenderer"],
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
