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
      hp: 88,
      maxHp: 100,
      alive: true,
      x: 120,
      y: 420,
      angle: 15,
    },
  ];

  const snapshot = getRoomSnapshot({
    roomCode: "auto-room",
    mode: "1v1",
    phase: "ready",
    hostSessionId: "red-session",
    players,
    slots,
    vehicles,
  });

  assert.equal(snapshot.roomCode, "auto-room");
  assert.equal(snapshot.hostSessionId, "red-session");
  assert.equal(snapshot.mode, "1v1");
  assert.equal(snapshot.phase, "ready");
  assert.equal(snapshot.players[0]?.displayName, "Red");
  assert.deepEqual(snapshot.players[0]?.inventory, ["Canyon Rookie", "Bridge Breaker"]);
  assert.equal(snapshot.slots[0]?.characterId, "kaelii");
  assert.equal(snapshot.slots[0]?.displayName, "Red");
  assert.equal(snapshot.vehicles[0]?.hp, 88);
});
