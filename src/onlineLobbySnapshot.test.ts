import assert from "node:assert/strict";
import test from "node:test";
import { getRoomSnapshot } from "./onlineLobbySnapshot";

test("getRoomSnapshot converts room state into plain lobby data", () => {
  const players = new Map<string, unknown>([
    [
      "red-session",
      {
        sessionId: "red-session",
        displayName: "Red",
        role: "host",
        ready: true,
        inventory: ["Canyon Rookie", "Bridge Breaker"],
      },
    ],
    [
      "blue-session",
      {
        sessionId: "blue-session",
        displayName: "Blue",
        role: "player",
        ready: false,
      },
    ],
  ]);
  const slots = new Map<string, unknown>([
    [
      "red-1",
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        selectedCharacterId: "kaelii",
        characterSelected: true,
        active: true,
      },
    ],
  ]);
  const vehicles = [
    {
      vehicleId: "red-1",
      ownerSessionId: "red-session",
      displayName: "Red",
      team: "red",
      className: "Bunger",
      seatId: "red-1",
      characterId: "kaelii",
      hp: 88,
      maxHp: 100,
      alive: true,
      x: 120,
      y: 420,
      moveUnits: 6.5,
      facing: 1,
      angle: 15,
    },
  ];

  const snapshot = getRoomSnapshot({
    roomCode: "auto-room",
    mode: "1v1",
    matchLength: "best-of-3",
    mapPick: "bridgeworks",
    selectedMapId: "bridgeworks",
    selectedMapName: "Bridgeworks",
    mapSeed: 67,
    targetScore: 2,
    turnSequence: ["red-1", "blue-1"],
    turnDurationSeconds: 20,
    turnStartedAtMs: 1_000,
    turnEndsAtMs: 21_000,
    turnSecondsRemaining: 18,
    serverTimeMs: 4_250,
    turnAuthorityVersion: 4,
    lastAcceptedTurnIntentId: "aim-red",
    lastAcceptedTurnIntentType: "aim",
    lastAcceptedTurnIntentVehicleId: "red-1",
    lastAcceptedTurnIntentSessionId: "red-session",
    lastShotId: "round-1-turn-1-red-1-4",
    lastShotShooterVehicleId: "red-1",
    lastShotShooterSessionId: "red-session",
    lastShotOriginX: 120,
    lastShotOriginY: 420,
    lastShotAngle: 15,
    lastShotPower: 72,
    lastShotFacing: 1,
    lastShotTargetVehicleId: "blue-1",
    lastShotDamage: 40,
    lastShotTargetHpBefore: 100,
    lastShotTargetHpAfter: 60,
    lastShotTurnNumber: 1,
    lastShotTurnAuthorityVersion: 4,
    lastShotServerTimeMs: 5_000,
    phase: "ready",
    hostSessionId: "red-session",
    players,
    slots,
    vehicles,
  });

  assert.equal(snapshot.roomCode, "auto-room");
  assert.equal(snapshot.hostSessionId, "red-session");
  assert.equal(snapshot.mode, "1v1");
  assert.equal(snapshot.matchLength, "best-of-3");
  assert.equal(snapshot.mapPick, "bridgeworks");
  assert.equal(snapshot.selectedMapId, "bridgeworks");
  assert.equal(snapshot.selectedMapName, "Bridgeworks");
  assert.equal(snapshot.mapSeed, 67);
  assert.equal(snapshot.targetScore, 2);
  assert.deepEqual(snapshot.turnSequence, ["red-1", "blue-1"]);
  assert.equal(snapshot.turnDurationSeconds, 20);
  assert.equal(snapshot.turnStartedAtMs, 1_000);
  assert.equal(snapshot.turnEndsAtMs, 21_000);
  assert.equal(snapshot.turnSecondsRemaining, 18);
  assert.equal(snapshot.serverTimeMs, 4_250);
  assert.equal(snapshot.turnAuthorityVersion, 4);
  assert.equal(snapshot.lastAcceptedTurnIntentId, "aim-red");
  assert.equal(snapshot.lastAcceptedTurnIntentType, "aim");
  assert.equal(snapshot.lastAcceptedTurnIntentVehicleId, "red-1");
  assert.equal(snapshot.lastAcceptedTurnIntentSessionId, "red-session");
  assert.equal(snapshot.lastShotId, "round-1-turn-1-red-1-4");
  assert.equal(snapshot.lastShotOriginX, 120);
  assert.equal(snapshot.lastShotPower, 72);
  assert.equal(snapshot.lastShotTargetVehicleId, "blue-1");
  assert.equal(snapshot.phase, "ready");
  assertFirstPlayer(snapshot);
  assertFirstSlot(snapshot);
  assertFirstVehicle(snapshot);
});

function assertFirstPlayer(snapshot: ReturnType<typeof getRoomSnapshot>): void {
  const firstPlayer = snapshot.players[0];
  assert.ok(firstPlayer);
  assert.equal(firstPlayer.displayName, "Red");
  assert.deepEqual(firstPlayer.inventory, ["Canyon Rookie", "Bridge Breaker"]);
}

function assertFirstSlot(snapshot: ReturnType<typeof getRoomSnapshot>): void {
  const firstSlot = snapshot.slots[0];
  assert.ok(firstSlot);
  assert.equal(firstSlot.characterId, "kaelii");
  assert.equal(firstSlot.characterSelected, true);
  assert.equal(firstSlot.displayName, "Red");
}

function assertFirstVehicle(snapshot: ReturnType<typeof getRoomSnapshot>): void {
  const firstVehicle = snapshot.vehicles[0];
  assert.ok(firstVehicle);
  assert.equal(firstVehicle.seatId, "red-1");
  assert.equal(firstVehicle.characterId, "kaelii");
  assert.equal(firstVehicle.facing, 1);
  assert.equal(firstVehicle.moveUnits, 6.5);
  assert.equal(firstVehicle.hp, 88);
}
