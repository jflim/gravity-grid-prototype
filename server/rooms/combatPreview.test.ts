import assert from "node:assert/strict";
import test from "node:test";
import { ArraySchema } from "@colyseus/schema";
import {
  advanceTimedOutPreviewTurn,
  createPreviewVehicle,
  previewAimForClient,
  previewFireForClient,
  previewMoveForClient,
  resetMatchForRematch,
  startCombatPreview,
} from "./combatPreview.js";
import { GravityCanyonState, LobbySlotState, PlayerState } from "../schema/GravityCanyonState.js";
import { MAPS } from "../v1/maps.js";
import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";
import { TURN_SECONDS, VEHICLE_HALF_HEIGHT, VOID_SURFACE_Y } from "../../shared/v1/tuning.js";
import {
  buildTerrainHeightmap,
  surfaceAt as terrainSurfaceAt,
} from "../../shared/gameplay/terrain.js";

test("createPreviewVehicle builds schema vehicle state from a player and selected character", () => {
  const player = playerState("red-session", "Red");
  const vehicle = createPreviewVehicle("red-1", "kaelii", player);

  assert.equal(vehicle.vehicleId, "red-1");
  assert.equal(vehicle.ownerSessionId, "red-session");
  assert.equal(vehicle.displayName, "Red / Kaelii");
  assert.equal(vehicle.team, "red");
  assert.equal(vehicle.className, "Flashkick Skip-Rig");
  assert.equal(vehicle.hp, 100);
  assert.equal(vehicle.alive, true);
  assert.equal(vehicle.moveUnits, 10);
  assert.equal(vehicle.angle, 47);
});

test("startCombatPreview creates active vehicles from room slots", () => {
  const state = readyState();

  startCombatPreview(state);

  assert.equal(state.phase, "combat-preview");
  assert.equal(state.turnNumber, 1);
  assert.equal(state.winnerTeam, "");
  assert.equal(state.vehicles.length, 2);
  assert.equal(state.vehicles[0]?.vehicleId, "red-1");
  assert.equal(state.vehicles[1]?.vehicleId, "blue-1");
  assert.equal(state.activeVehicleId, "red-1");
  assert.equal(state.terrainRevision, 1);
  assert.equal(state.terrainCraters.length, 0);
  assert.match(state.status, /Round 1 started/);
});

test("startCombatPreview exposes server-owned match setup from room settings", () => {
  const state = readyState();
  state.matchLength = "best-of-3";
  state.mapPick = "bridgeworks";

  startCombatPreview(state);

  assert.equal(state.selectedMapId, "bridgeworks");
  assert.equal(state.selectedMapName, "Bridgeworks");
  assert.equal(state.targetScore, 2);
  assert.deepEqual(Array.from(state.turnSequence), ["red-1", "blue-1"]);
});

test("startCombatPreview starts a server-owned turn clock", () => {
  const state = readyState();

  startCombatPreview(state, { nowMs: 1_000 });

  assert.equal(state.turnDurationSeconds, TURN_SECONDS);
  assert.equal(state.turnStartedAtMs, 1_000);
  assert.equal(state.turnEndsAtMs, 21_000);
  assert.equal(state.turnSecondsRemaining, TURN_SECONDS);
  assert.equal(state.turnAuthorityVersion, 1);
  assert.equal(state.lastAcceptedTurnIntentId, "");
});

test("startCombatPreview places preview vehicles on the selected map spawns", () => {
  const state = readyState();
  state.mapPick = "bridgeworks";

  startCombatPreview(state);

  const bridgeworks = MAPS.find((map) => map.id === "bridgeworks");
  assert.ok(bridgeworks, "bridgeworks map exists");
  const redVehicle = state.vehicles[0];
  const blueVehicle = state.vehicles[1];
  assert.ok(redVehicle, "red vehicle exists");
  assert.ok(blueVehicle, "blue vehicle exists");
  assert.equal(redVehicle.x, bridgeworks.spawns["red-1"].x);
  assert.equal(redVehicle.y, bridgeworks.spawns["red-1"].y - VEHICLE_HALF_HEIGHT);
  assert.equal(redVehicle.angle, 47);
  assert.equal(blueVehicle.x, bridgeworks.spawns["blue-1"].x);
  assert.equal(blueVehicle.y, bridgeworks.spawns["blue-1"].y - VEHICLE_HALF_HEIGHT);
  assert.equal(blueVehicle.angle, 133);
});

test("previewFireForClient advances the turn after resolving a projectile impact", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  state.wind = 0;

  previewFireForClient(state, "red-session", { nowMs: 3_000 });

  const farEnemy = state.vehicles.find((vehicle) => vehicle.vehicleId === "blue-1");
  assert.equal(farEnemy?.hp, 100);
  assert.equal(farEnemy?.alive, true);
  assert.ok(state.lastShotImpactX > 0);
  assert.ok(state.lastShotImpactY > 0);
  assert.equal(state.turnNumber, 2);
  assert.equal(state.activeVehicleId, "blue-1");
  assert.ok(state.turnStartedAtMs > 3_000, "next player timer should start after shot replay time");
  assert.equal(state.turnEndsAtMs, state.turnStartedAtMs + TURN_SECONDS * 1_000);
  assert.equal(state.turnSecondsRemaining, TURN_SECONDS);
  assert.equal(state.turnAuthorityVersion, 2);
  assert.match(state.status, /server shot/);
});

test("previewFireForClient persists the authoritative crater in room terrain", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  state.wind = 0;

  previewFireForClient(state, "red-session", { nowMs: 3_000 }, { angle: 60, power: 55, facing: 1 });

  assert.equal(state.terrainRevision, 2);
  assert.equal(state.terrainCraters.length, 1);
  assert.equal(state.terrainCraters[0]?.x, state.lastShotImpactX);
  assert.ok((state.terrainCraters[0]?.radius ?? 0) > 0);
});

test("a complete authoritative 1v1 round ends from server-owned damage", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  const blue = state.vehicles[1];
  assert.ok(blue);
  configureFinishingShot(state);

  previewFireForClient(state, "red-session", { nowMs: 3_000 }, { angle: 5, power: 10, facing: 1 });

  assert.equal(blue.alive, false);
  assert.equal(blue.defeatReason, "damage");
  assert.equal(state.phase, "match-over");
  assert.equal(state.winnerTeam, "red");
  assert.equal(state.roundEndReason, "team-eliminated");
  assert.equal(state.redRoundWins, 1);
  assert.equal(state.matchWinnerTeam, "red");
  assert.equal(state.matchEndReason, "target-score-reached");
  assert.equal(state.activeVehicleId, "");
  assert.equal(state.turnStartedAtMs, 0);
});

test("best-of-3 scoring resets the round and ends when a team reaches two wins", () => {
  const state = readyState();
  state.matchLength = "best-of-3";
  startCombatPreview(state, { nowMs: 1_000 });
  configureFinishingShot(state);

  previewFireForClient(state, "red-session", { nowMs: 3_000 }, { angle: 5, power: 10, facing: 1 });
  assert.equal(state.phase, "round-over");
  assert.equal(state.redRoundWins, 1);
  assert.equal(state.blueRoundWins, 0);
  assert.equal(state.matchWinnerTeam, "");

  state.roundNumber += 1;
  startCombatPreview(state, { nowMs: 5_000 });
  configureFinishingShot(state);
  previewFireForClient(state, "red-session", { nowMs: 7_000 }, { angle: 5, power: 10, facing: 1 });

  assert.equal(state.phase, "match-over");
  assert.equal(state.roundNumber, 2);
  assert.equal(state.redRoundWins, 2);
  assert.equal(state.matchWinnerTeam, "red");
  assert.equal(state.matchEndReason, "target-score-reached");
  assert.match(state.status, /wins the match 2-0/i);
});

test("same-room rematch resets match truth while preserving participants and seats", () => {
  const state = readyState();
  state.phase = "match-over";
  state.roundNumber = 3;
  state.redRoundWins = 2;
  state.blueRoundWins = 1;
  state.matchWinnerTeam = "red";
  state.matchEndReason = "target-score-reached";
  setPlayersReady(state, true);

  resetMatchForRematch(state);

  assert.equal(state.phase, "ready");
  assert.equal(state.roundNumber, 1);
  assert.equal(state.redRoundWins, 0);
  assert.equal(state.blueRoundWins, 0);
  assert.equal(state.players.size, 2);
  assertRematchParticipantsPreserved(state);
});

test("previewFireForClient keeps the next player timer full until the shot replay window ends", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  state.wind = 0;

  previewFireForClient(state, "red-session", { nowMs: 3_000 });

  const beforeReplayEnds = state.turnStartedAtMs - 1;
  assert.equal(state.activeVehicleId, "blue-1");
  advanceTimedOutPreviewTurn(state, { nowMs: beforeReplayEnds });
  assert.equal(state.turnSecondsRemaining, TURN_SECONDS);

  const earlyMove = previewMoveForClient(state, "blue-session", { direction: -1, deltaSeconds: 0.05 }, { nowMs: beforeReplayEnds });
  assert.equal(earlyMove, false);
  assert.notEqual(state.lastAcceptedTurnIntentSessionId, "blue-session");
});

test("advanceTimedOutPreviewTurn advances the server-owned turn when the clock expires", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });

  const advanced = advanceTimedOutPreviewTurn(state, { nowMs: 21_001 });

  assert.equal(advanced, true);
  assert.equal(state.turnNumber, 2);
  assert.equal(state.activeVehicleId, "blue-1");
  assert.equal(state.turnStartedAtMs, 21_001);
  assert.equal(state.turnEndsAtMs, 41_001);
  assert.equal(state.turnSecondsRemaining, TURN_SECONDS);
  assert.match(state.status, /timed out/i);
  assert.match(state.status, /Blue \/ Perlah is up/);
});

test("server turn advancement skips defeated units in synchronized 2v2 order", () => {
  const state = ready2v2State();
  startCombatPreview(state, { nowMs: 1_000 });
  const defeated = state.vehicles.find((vehicle) => vehicle.vehicleId === "blue-1");
  assert.ok(defeated);
  defeated.hp = 0;
  defeated.alive = false;
  defeated.defeatReason = "damage";

  const advanced = advanceTimedOutPreviewTurn(state, { nowMs: 21_001 });

  assert.equal(advanced, true);
  assert.deepEqual(Array.from(state.turnSequence), ["red-1", "blue-1", "red-2", "blue-2"]);
  assert.equal(state.activeVehicleId, "red-2");
  assert.equal(state.turnNumber, 2);
});

test("previewFireForClient does not damage far enemies when the projectile lands away from them", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  const active = state.vehicles[0];
  const farEnemy = state.vehicles[1];
  assert.ok(active, "active vehicle exists");
  assert.ok(farEnemy, "far enemy exists");
  state.wind = 0;

  previewFireForClient(state, "red-session", { nowMs: 3_000 }, { angle: 90, power: 10, facing: 1 });

  assert.equal(farEnemy.hp, 100);
  assert.equal(farEnemy.alive, true);
  assert.ok(state.lastShotImpactX > 0, "server should publish the impact x for visual replay");
  assert.ok(state.lastShotImpactY > 0, "server should publish the impact y for visual replay");
  assert.equal(state.lastShotWind, 0);
  assert.equal(state.turnNumber, 2);
  assert.equal(state.activeVehicleId, "blue-1");
  assert.match(state.status, /server shot/i);
});

test("previewMoveForClient applies movement from the server-owned vehicle position", () => {
  const state = readyState();
  state.mapPick = "bridgeworks";
  startCombatPreview(state, { nowMs: 1_000 });
  const active = state.vehicles[0];
  assert.ok(active, "active vehicle exists");
  const startX = active.x;

  const moved = previewMoveForClient(
    state,
    "red-session",
    { ...intentMeta(state, 1), direction: 1, deltaSeconds: 0.5 },
    { nowMs: 1_500 },
  );

  assert.equal(moved, true);
  assert.equal(active.facing, 1);
  assert.ok(active.x > startX, "server x should move right");
  assert.equal(active.y, surfaceYForMap("bridgeworks", active.x) - VEHICLE_HALF_HEIGHT);
  assert.ok(active.moveUnits < 10, "server move units should be spent");
  assert.equal(state.lastAcceptedTurnIntentType, "move");
  assert.equal(state.lastAcceptedTurnIntentVehicleId, "red-1");
  assert.match(state.status, /server moved/);
});

test("previewMoveForClient publishes facing changes even when x movement is unavailable", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  const active = state.vehicles[0];
  assert.ok(active, "active vehicle exists");
  active.moveUnits = 0;
  const startX = active.x;

  const moved = previewMoveForClient(
    state,
    "red-session",
    { ...intentMeta(state, 1), direction: -1, deltaSeconds: 0.05 },
    { nowMs: 1_500 },
  );

  assert.equal(moved, true);
  assert.equal(active.x, startX);
  assert.equal(active.moveUnits, 0);
  assert.equal(active.facing, -1);
  assert.equal(active.angle, 133);
  assert.equal(state.lastAcceptedTurnIntentType, "move");
  assert.equal(state.lastAcceptedTurnIntentVehicleId, "red-1");
  assert.match(state.status, /server turned/);
});

test("previewAimForClient publishes active-owner aim changes", () => {
  const state = readyState();
  startCombatPreview(state, { nowMs: 1_000 });
  const active = state.vehicles[0];
  assert.ok(active, "active vehicle exists");

  const aimed = previewAimForClient(
    state,
    "red-session",
    { ...intentMeta(state, 1), angle: 64, facing: 1 },
    { nowMs: 1_500 },
  );

  assert.equal(aimed, true);
  assert.equal(active.angle, 64);
  assert.equal(active.facing, 1);
  assert.equal(state.lastAcceptedTurnIntentType, "aim");
  assert.equal(state.lastAcceptedTurnIntentVehicleId, "red-1");
  assert.match(state.status, /server aimed/);
});

test("previewFireForClient records a server-owned fire origin instead of trusting predicted client coordinates", () => {
  const state = readyState();
  state.mapPick = "bridgeworks";
  startCombatPreview(state, { nowMs: 1_000 });
  const active = state.vehicles[0];
  assert.ok(active, "active vehicle exists");
  active.x = 444;
  active.y = 555;
  active.angle = 40;
  state.wind = -7;

  previewFireForClient(
    state,
    "red-session",
    { nowMs: 3_000 },
    { angle: 41, power: 73, facing: 1, clientPredictedX: 999, clientPredictedY: 111 },
  );

  assert.equal(state.lastShotShooterVehicleId, "red-1");
  assert.equal(state.lastShotShooterSessionId, "red-session");
  assert.equal(state.lastShotOriginX, 444);
  assert.equal(state.lastShotOriginY, 555);
  assert.equal(state.lastShotAngle, 41);
  assert.equal(state.lastShotPower, 73);
  assert.equal(state.lastShotFacing, 1);
  assert.equal(state.lastShotWind, -7);
  assert.ok(state.lastShotImpactX > 0);
  assert.ok(state.lastShotImpactY > 0);
  assert.equal(state.lastShotTurnNumber, 1);
  assert.equal(state.lastShotTurnAuthorityVersion, 1);
  assert.equal(state.lastShotServerTimeMs, 3_000);
  assert.match(state.lastShotId, /^round-1-turn-1-red-1-/);
});

function readyState(): GravityCanyonState {
  const state = new GravityCanyonState();
  state.mode = "1v1";
  state.hostSessionId = "red-session";
  state.players.set("red-session", playerState("red-session", "Red"));
  state.players.set("blue-session", playerState("blue-session", "Blue"));
  state.slots.set("red-1", slotState("red-1", "red-session", "kaelii"));
  state.slots.set("blue-1", slotState("blue-1", "blue-session", "perlah"));
  return state;
}

function ready2v2State(): GravityCanyonState {
  const state = readyState();
  state.mode = "2v2";
  state.players.set("red-two", playerState("red-two", "Red Two"));
  state.players.set("blue-two", playerState("blue-two", "Blue Two"));
  state.slots.set("red-2", slotState("red-2", "red-two", "nova"));
  state.slots.set("blue-2", slotState("blue-2", "blue-two", "vesper"));
  return state;
}

function configureFinishingShot(state: GravityCanyonState): void {
  const red = state.vehicles[0];
  const blue = state.vehicles[1];
  assert.ok(red && blue);
  red.x = 500;
  red.y = 500;
  blue.x = 565;
  blue.y = 500;
  blue.hp = 1;
  state.wind = 0;
}

function setPlayersReady(state: GravityCanyonState, ready: boolean): void {
  for (const player of state.players.values()) player.ready = ready;
}

function assertRematchParticipantsPreserved(state: GravityCanyonState): void {
  const redSlot = state.slots.get("red-1");
  const blueSlot = state.slots.get("blue-1");
  const redPlayer = state.players.get("red-session");
  const bluePlayer = state.players.get("blue-session");
  assert.ok(redSlot && blueSlot && redPlayer && bluePlayer);
  assert.equal(redSlot.ownerSessionId, "red-session");
  assert.equal(blueSlot.ownerSessionId, "blue-session");
  assert.equal(redPlayer.ready, false);
  assert.equal(bluePlayer.ready, false);
}

function playerState(sessionId: string, displayName: string): PlayerState {
  const player = new PlayerState();
  player.sessionId = sessionId;
  player.displayName = displayName;
  player.inventory = new ArraySchema<string>("Canyon Rookie");
  player.equippedNameplate = "Canyon Rookie";
  return player;
}

function intentMeta(state: GravityCanyonState, inputSeq: number) {
  return {
    intentId: `test-${inputSeq}`,
    inputSeq,
    turnAuthorityVersion: state.turnAuthorityVersion,
  };
}

function slotState(slotId: VehicleId, ownerSessionId: string, selectedCharacterId: CharacterId): LobbySlotState {
  const slot = new LobbySlotState();
  slot.slotId = slotId;
  slot.team = slotId.startsWith("red-") ? "red" : "blue";
  slot.ownerSessionId = ownerSessionId;
  slot.selectedCharacterId = selectedCharacterId;
  slot.characterSelected = true;
  slot.active = true;
  return slot;
}

function surfaceYForMap(mapId: string, x: number): number {
  const map = MAPS.find((candidate) => candidate.id === mapId);
  assert.ok(map, `${mapId} map exists`);
  return terrainSurfaceAt(
    buildTerrainHeightmap({
      worldWidth: map.worldWidth,
      voidSurfaceY: VOID_SURFACE_Y,
      segments: map.previewSegments,
    }),
    x,
    { worldWidth: map.worldWidth, voidSurfaceY: VOID_SURFACE_Y },
  );
}
