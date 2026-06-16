import assert from "node:assert/strict";
import test from "node:test";
import { ArraySchema } from "@colyseus/schema";
import { createPreviewVehicle, previewFireForClient, startCombatPreview } from "./combatPreview.js";
import { GravityCanyonState, LobbySlotState, PlayerState } from "../schema/GravityCanyonState.js";
import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";

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
  assert.match(state.status, /Round 1 started/);
});

test("previewFireForClient advances the turn after damaging the first living enemy", () => {
  const state = readyState();
  startCombatPreview(state);

  previewFireForClient(state, "red-session");

  const target = state.vehicles.find((vehicle) => vehicle.vehicleId === "blue-1");
  assert.equal(target?.hp, 60);
  assert.equal(target?.alive, true);
  assert.equal(state.turnNumber, 2);
  assert.equal(state.activeVehicleId, "blue-1");
  assert.match(state.status, /server test shot hit/);
});

function readyState(): GravityCanyonState {
  const state = new GravityCanyonState();
  state.mode = "1v1";
  state.redCaptainSessionId = "red-session";
  state.blueCaptainSessionId = "blue-session";
  state.players.set("red-session", playerState("red-session", "Red"));
  state.players.set("blue-session", playerState("blue-session", "Blue"));
  state.slots.set("red-1", slotState("red-1", "red-session", "kaelii"));
  state.slots.set("blue-1", slotState("blue-1", "blue-session", "perlah"));
  return state;
}

function playerState(sessionId: string, displayName: string): PlayerState {
  const player = new PlayerState();
  player.sessionId = sessionId;
  player.displayName = displayName;
  player.inventory = new ArraySchema<string>("Canyon Rookie");
  player.equippedNameplate = "Canyon Rookie";
  return player;
}

function slotState(slotId: VehicleId, ownerSessionId: string, selectedCharacterId: CharacterId): LobbySlotState {
  const slot = new LobbySlotState();
  slot.slotId = slotId;
  slot.team = slotId.startsWith("red-") ? "red" : "blue";
  slot.ownerSessionId = ownerSessionId;
  slot.selectedCharacterId = selectedCharacterId;
  slot.active = true;
  return slot;
}
