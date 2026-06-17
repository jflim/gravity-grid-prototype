import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function readMatchScene(): string {
  return readFileSync("src/match/MatchScene.ts", "utf8");
}

function assertMatchSceneDelegates(required: readonly RegExp[], forbidden: readonly RegExp[]): void {
  const matchScene = readMatchScene();

  for (const pattern of required) {
    assert.match(matchScene, pattern);
  }

  for (const pattern of forbidden) {
    assert.doesNotMatch(matchScene, pattern);
  }
}

test("match scene refactor exposes planned module boundaries", () => {
  const expectedFiles = [
    "src/match/MatchScene.ts",
    "src/match/MatchView.ts",
    "src/match/MatchViewFactory.ts",
    "src/match/MatchViewStateBuilder.ts",
    "src/match/MatchSceneTerrainAdapter.ts",
    "src/match/MatchSceneShotFlow.ts",
    "src/match/MatchSceneShotControllers.ts",
    "src/match/MatchSceneShotFlowTypes.ts",
    "src/match/MatchSceneProjectileFlow.ts",
    "src/match/MatchSceneShotResolution.ts",
    "src/match/MatchSceneVehicleMotionFlow.ts",
    "src/match/PlayerActionController.ts",
    "src/match/ShotFlowController.ts",
    "src/match/MatchTypes.ts",
    "src/match/MatchCameraController.ts",
    "src/match/MatchAssetLoader.ts",
    "src/match/ImpactController.ts",
    "src/match/ProjectileController.ts",
    "src/match/RoundEventScheduler.ts",
    "src/match/RoundBuilder.ts",
    "src/match/TerrainController.ts",
    "src/match/TurnController.ts",
    "src/match/VehicleGeometry.ts",
    "src/match/VehicleSettlementController.ts",
    "src/match/VoidZoneController.ts",
    "src/match/ui/CollisionZonesToggle.ts",
    "src/match/ui/CommandDeck.ts",
    "src/match/ui/CommandDeckAimDial.ts",
    "src/match/ui/CommandDeckMeters.ts",
    "src/match/ui/WindHud.ts",
    "src/match/rendering/TerrainRenderer.ts",
    "src/match/rendering/VehicleRenderer.ts",
    "src/match/rendering/VehicleOverlayRenderer.ts",
    "src/match/rendering/VehicleSpriteLayer.ts",
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
    ["src/match/MatchView.ts", "export class MatchView"],
    ["src/match/MatchViewFactory.ts", "export function createMatchViewCollaborators"],
    ["src/match/MatchViewStateBuilder.ts", "export class MatchViewStateBuilder"],
    ["src/match/MatchSceneTerrainAdapter.ts", "export class MatchSceneTerrainAdapter"],
    ["src/match/MatchSceneShotFlow.ts", "export class MatchSceneShotFlow"],
    ["src/match/MatchSceneShotControllers.ts", "export function createSceneShotFlowController"],
    ["src/match/MatchSceneShotFlowTypes.ts", "export interface MatchSceneShotFlowOptions"],
    ["src/match/MatchSceneProjectileFlow.ts", "export function updateSceneProjectile"],
    ["src/match/MatchSceneShotResolution.ts", "export function vehicleDamageSnapshot"],
    ["src/match/MatchSceneVehicleMotionFlow.ts", "export function updateVehicleMotionsForScene"],
    ["src/match/PlayerActionController.ts", "export class PlayerActionController"],
    ["src/match/ShotFlowController.ts", "export class ShotFlowController"],
    ["src/match/MatchAssetLoader.ts", "export class MatchAssetLoader"],
    ["src/match/MatchCameraController.ts", "export class MatchCameraController"],
    ["src/match/ImpactController.ts", "export class ImpactController"],
    ["src/match/ProjectileController.ts", "export class ProjectileController"],
    ["src/match/RoundEventScheduler.ts", "export class RoundEventScheduler"],
    ["src/match/RoundBuilder.ts", "export class RoundBuilder"],
    ["src/match/TerrainController.ts", "export class TerrainController"],
    ["src/match/TurnController.ts", "export class TurnController"],
    ["src/match/VehicleGeometry.ts", "export class VehicleGeometry"],
    ["src/match/VehicleSettlementController.ts", "export class VehicleSettlementController"],
    ["src/match/VoidZoneController.ts", "export class VoidZoneController"],
    ["src/match/ui/CollisionZonesToggle.ts", "export class CollisionZonesToggle"],
    ["src/match/ui/CommandDeck.ts", "export class CommandDeck"],
    ["src/match/ui/CommandDeckAimDial.ts", "export class CommandDeckAimDial"],
    ["src/match/ui/CommandDeckMeters.ts", "export class CommandDeckMeters"],
    ["src/match/ui/WindHud.ts", "export class WindHud"],
    ["src/match/rendering/TerrainRenderer.ts", "export class TerrainRenderer"],
    ["src/match/rendering/VehicleRenderer.ts", "export class VehicleRenderer"],
    ["src/match/rendering/VehicleOverlayRenderer.ts", "export class VehicleOverlayRenderer"],
    ["src/match/rendering/VehicleSpriteLayer.ts", "export class VehicleSpriteLayer"],
    ["src/match/rendering/ProjectileRenderer.ts", "export class ProjectileRenderer"],
    ["src/match/rendering/EffectsRenderer.ts", "export class EffectsRenderer"],
    ["src/match/rendering/CombatMarkerRenderer.ts", "export class CombatMarkerRenderer"],
    ["src/match/rendering/RenderingTypes.ts", "export interface CombatMarker"],
  ] as const;

  for (const [file, expectedExport] of expectedExports) {
    assert.match(readFileSync(file, "utf8"), new RegExp(expectedExport));
  }
});

test("match scene stays below the first orchestration extraction target", () => {
  const matchScene = readMatchScene();
  const nonblankLines = matchScene.split(/\r?\n/).filter((line) => line.trim()).length;

  assert.ok(nonblankLines <= 360, `MatchScene.ts has ${nonblankLines} nonblank lines; expected <= 360`);
});

test("match scene adapters stay human-sized", () => {
  const lineCountFor = (path: string) =>
    readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim()).length;

  assert.ok(
    lineCountFor("src/match/MatchSceneTerrainAdapter.ts") <= 160,
    "MatchSceneTerrainAdapter.ts should stay under 160 nonblank lines",
  );
  assert.ok(
    lineCountFor("src/match/MatchSceneShotFlow.ts") <= 300,
    "MatchSceneShotFlow.ts should stay under the temporary 300-line orchestration ceiling",
  );
  assert.ok(
    lineCountFor("src/match/MatchSceneShotControllers.ts") <= 220,
    "MatchSceneShotControllers.ts should stay under 220 nonblank lines",
  );
  assert.ok(
    lineCountFor("src/match/MatchSceneShotFlowTypes.ts") <= 80,
    "MatchSceneShotFlowTypes.ts should stay under 80 nonblank lines",
  );
  assert.ok(
    lineCountFor("src/match/MatchSceneProjectileFlow.ts") <= 120,
    "MatchSceneProjectileFlow.ts should stay under 120 nonblank lines",
  );
  assert.ok(
    lineCountFor("src/match/MatchSceneShotResolution.ts") <= 120,
    "MatchSceneShotResolution.ts should stay under 120 nonblank lines",
  );
  assert.ok(
    lineCountFor("src/match/MatchSceneVehicleMotionFlow.ts") <= 80,
    "MatchSceneVehicleMotionFlow.ts should stay under 80 nonblank lines",
  );
});

test("main.ts stays a bootstrap instead of owning the Phaser scene", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.match(main, /new Phaser\.Game/);
  assert.match(main, /scene:\s*MatchScene/);
  assert.doesNotMatch(main, /class GravityGridScene/);
});

test("online playtest swaps from lobby stage into gameplay bootstrap", () => {
  const main = readFileSync("src/main.ts", "utf8");
  const lobby = readFileSync("src/onlineLobby.ts", "utf8");
  const dom = readFileSync("src/onlineLobbyDom.ts", "utf8");
  const markup = readFileSync("src/onlineLobbyMarkup.ts", "utf8");

  assert.match(main, /mountOnlineLobby\(\{\s*onGameplayStart:\s*mountGameplay\s*\}\)/);
  assert.match(main, /function mountGameplay\(\): void/);
  assert.match(lobby, /createOnlineLobbyDom/);
  assert.match(dom, /renderLobbyShell\(\)/);
  assert.match(markup, /class="online-stage"/);
  assert.match(lobby, /stageForRoomPhase\(snapshot\.phase\) === "gameplay"/);
  assert.match(lobby, /dom\.remove\(\)/);
  assert.doesNotMatch(lobby, /data-combat-block|data-preview-fire|data-next-round/);
});

test("online lobby controller delegates DOM rendering", () => {
  const controller = readFileSync("src/onlineLobby.ts", "utf8");

  assert.match(controller, /createOnlineLobbyDom/);
  assert.doesNotMatch(controller, /innerHTML\s*=|querySelector<|document\.createElement\("section"\)/);
});

test("match runtime types stay free of Phaser rendering objects", () => {
  const matchTypes = readFileSync("src/match/MatchTypes.ts", "utf8");

  assert.doesNotMatch(matchTypes, /from "phaser"/);
  assert.doesNotMatch(matchTypes, /Phaser\./);
  assert.doesNotMatch(matchTypes, /CombatMarker/);
});

test("match scene delegates terrain state to TerrainController", () => {
  assertMatchSceneDelegates(
    [/new TerrainController/],
    [/craterTerrain/, /terrainAngleAt as terrainSlopeAngleAt/, /surfaceAt as terrainSurfaceAt/],
  );
});

test("match scene delegates vehicle settlement to VehicleSettlementController", () => {
  assertMatchSceneDelegates(
    [/new VehicleSettlementController/],
    [/settleVehicleOnTerrain/, /VehicleSettlementResult/],
  );
});

test("match scene delegates asset preload status and image queueing to MatchAssetLoader", () => {
  assertMatchSceneDelegates(
    [/new MatchAssetLoader/],
    [
      /RUNTIME_IMAGE_ASSETS/,
      /CONCEPT_IMAGE_ASSETS/,
      /STYLE_REFERENCE_ASSET/,
      /load\.on\("progress"/,
      /load\.on\("loaderror"/,
    ],
  );
});

test("match scene delegates delayed round events to RoundEventScheduler", () => {
  assertMatchSceneDelegates(
    [/new RoundEventScheduler/],
    [/pendingRoundEvent/, /private queueRoundEvent/],
  );
});

test("match scene delegates collision-zone UI through MatchView", () => {
  assertMatchSceneDelegates(
    [/new MatchView/],
    [
      /document\.createElement/,
      /querySelector\("\[data-collision-zones-toggle\]"\)/,
      /collisionZonesCheckbox/,
    ],
  );
});

test("match scene delegates presentation object setup and drawing to MatchView", () => {
  assertMatchSceneDelegates(
    [/new MatchView/],
    [
      /new TerrainRenderer/,
      /new VehicleRenderer/,
      /new ProjectileRenderer/,
      /new EffectsRenderer/,
      /new CombatMarkerRenderer/,
      /new CommandDeck/,
      /new CollisionZonesToggle/,
      /this\.add\.graphics\(/,
      /this\.add\.text\(/,
      /this\.add\.image\(/,
      /private drawTerrain/,
      /private drawAim/,
      /private drawImpactPreview/,
      /private drawVehicles/,
      /private drawProjectile/,
      /private drawHud/,
    ],
  );
});

test("command deck delegates specialized HUD drawing to component helpers", () => {
  const commandDeck = readFileSync("src/match/ui/CommandDeck.ts", "utf8");

  assert.match(commandDeck, /new CommandDeckMeters/);
  assert.match(commandDeck, /new CommandDeckAimDial/);
  assert.match(commandDeck, /new WindHud/);
  assert.doesNotMatch(commandDeck, /private drawLaunchPowerMeter/);
  assert.doesNotMatch(commandDeck, /private drawMoveMeter/);
  assert.doesNotMatch(commandDeck, /private drawPanelAimDial/);
  assert.doesNotMatch(commandDeck, /private drawGlobalRoundStatus/);
});

test("vehicle renderer delegates sprite and overlay drawing to focused helpers", () => {
  const vehicleRenderer = readFileSync("src/match/rendering/VehicleRenderer.ts", "utf8");

  assert.match(vehicleRenderer, /new VehicleOverlayRenderer/);
  assert.match(vehicleRenderer, /new VehicleSpriteLayer/);
  assert.doesNotMatch(vehicleRenderer, /private drawCombatHull/);
  assert.doesNotMatch(vehicleRenderer, /private drawHpBar/);
  assert.doesNotMatch(vehicleRenderer, /private drawLabels/);
  assert.doesNotMatch(vehicleRenderer, /private drawFootingMarker/);
  assert.doesNotMatch(vehicleRenderer, /private characterPoseFor/);
  assert.doesNotMatch(vehicleRenderer, /private orientedOffset/);
});

test("terrain renderer does not draw shelf landmarks as fake gameplay rails", () => {
  const terrainRenderer = readFileSync("src/match/rendering/TerrainRenderer.ts", "utf8");

  assert.doesNotMatch(
    terrainRenderer,
    /case "shelf":[\s\S]*?lineBetween/,
    "shelf and callout landmarks should not render as horizontal yellow lines in the live match view",
  );
});
