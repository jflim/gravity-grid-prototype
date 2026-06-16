import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("match scene refactor exposes planned module boundaries", () => {
  const expectedFiles = [
    "src/match/MatchScene.ts",
    "src/match/MatchView.ts",
    "src/match/MatchViewFactory.ts",
    "src/match/MatchViewStateBuilder.ts",
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

test("main.ts stays a bootstrap instead of owning the Phaser scene", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.match(main, /new Phaser\.Game/);
  assert.match(main, /scene:\s*MatchScene/);
  assert.doesNotMatch(main, /class GravityGridScene/);
});

test("online playtest swaps from lobby stage into gameplay bootstrap", () => {
  const main = readFileSync("src/main.ts", "utf8");
  const lobby = readFileSync("src/onlineLobby.ts", "utf8");
  const markup = readFileSync("src/onlineLobbyMarkup.ts", "utf8");

  assert.match(main, /mountOnlineLobby\(\{\s*onGameplayStart:\s*mountGameplay\s*\}\)/);
  assert.match(main, /function mountGameplay\(\): void/);
  assert.match(lobby, /renderLobbyShell\(\)/);
  assert.match(markup, /class="online-stage"/);
  assert.match(lobby, /stageForRoomPhase\(snapshot\.phase\) === "gameplay"/);
  assert.match(lobby, /stage\.remove\(\)/);
  assert.doesNotMatch(lobby, /data-combat-block|data-preview-fire|data-next-round/);
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

test("match scene delegates vehicle settlement to VehicleSettlementController", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new VehicleSettlementController/);
  assert.doesNotMatch(matchScene, /settleVehicleOnTerrain/);
  assert.doesNotMatch(matchScene, /VehicleSettlementResult/);
});

test("match scene delegates asset preload status and image queueing to MatchAssetLoader", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new MatchAssetLoader/);
  assert.doesNotMatch(matchScene, /RUNTIME_IMAGE_ASSETS/);
  assert.doesNotMatch(matchScene, /CONCEPT_IMAGE_ASSETS/);
  assert.doesNotMatch(matchScene, /STYLE_REFERENCE_ASSET/);
  assert.doesNotMatch(matchScene, /load\.on\("progress"/);
  assert.doesNotMatch(matchScene, /load\.on\("loaderror"/);
});

test("match scene delegates delayed round events to RoundEventScheduler", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new RoundEventScheduler/);
  assert.doesNotMatch(matchScene, /pendingRoundEvent/);
  assert.doesNotMatch(matchScene, /private queueRoundEvent/);
});

test("match scene delegates collision-zone UI through MatchView", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new MatchView/);
  assert.doesNotMatch(matchScene, /document\.createElement/);
  assert.doesNotMatch(matchScene, /querySelector\("\[data-collision-zones-toggle\]"\)/);
  assert.doesNotMatch(matchScene, /collisionZonesCheckbox/);
});

test("match scene delegates presentation object setup and drawing to MatchView", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new MatchView/);
  assert.doesNotMatch(matchScene, /new TerrainRenderer/);
  assert.doesNotMatch(matchScene, /new VehicleRenderer/);
  assert.doesNotMatch(matchScene, /new ProjectileRenderer/);
  assert.doesNotMatch(matchScene, /new EffectsRenderer/);
  assert.doesNotMatch(matchScene, /new CombatMarkerRenderer/);
  assert.doesNotMatch(matchScene, /new CommandDeck/);
  assert.doesNotMatch(matchScene, /new CollisionZonesToggle/);
  assert.doesNotMatch(matchScene, /this\.add\.graphics\(/);
  assert.doesNotMatch(matchScene, /this\.add\.text\(/);
  assert.doesNotMatch(matchScene, /this\.add\.image\(/);
  assert.doesNotMatch(matchScene, /private drawTerrain/);
  assert.doesNotMatch(matchScene, /private drawAim/);
  assert.doesNotMatch(matchScene, /private drawImpactPreview/);
  assert.doesNotMatch(matchScene, /private drawVehicles/);
  assert.doesNotMatch(matchScene, /private drawProjectile/);
  assert.doesNotMatch(matchScene, /private drawHud/);
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
