import assert from "node:assert/strict";
import test from "node:test";
import { TURN_SECONDS } from "../../shared/v1/tuning.js";
import { CombatVehicleState, GravityCanyonState } from "../schema/GravityCanyonState.js";
import {
  acceptTurnIntentForClient,
  activeOwnedVehicleForClient,
  beginServerTurn,
} from "./turnAuthority.js";

test("acceptTurnIntentForClient records only active-owner intent metadata", () => {
  const state = combatState();
  beginServerTurn(state, { nowMs: 1_000 });

  const accepted = acceptTurnIntentForClient(
    state,
    "red-session",
    { intentId: "red-1-aim", action: "aim", inputSeq: 1, turnAuthorityVersion: 1 },
    { nowMs: 3_500 },
  );

  assert.equal(accepted, true);
  assert.equal(state.lastAcceptedTurnIntentId, "red-1-aim");
  assert.equal(state.lastAcceptedTurnIntentType, "aim");
  assert.equal(state.lastAcceptedTurnIntentVehicleId, "red-1");
  assert.equal(state.lastAcceptedTurnIntentSessionId, "red-session");
  assert.equal(state.lastAcceptedTurnInputSeq, 1);
  assert.equal(state.turnSecondsRemaining, 18);
  assert.equal(state.turnAuthorityVersion, 1);
});

test("acceptTurnIntentForClient rejects wrong-owner and invalid actions", () => {
  const state = combatState();
  beginServerTurn(state, { nowMs: 1_000 });

  assert.equal(acceptTurnIntentForClient(state, "blue-session", intent("blue", "aim", 1, 1)), false);
  assert.equal(acceptTurnIntentForClient(state, "red-session", intent("bad", "teleport", 1, 1)), false);

  assert.equal(state.lastAcceptedTurnIntentId, "");
  assert.equal(state.turnAuthorityVersion, 1);
});

test("acceptTurnIntentForClient rejects stale, duplicate, and malformed metadata", () => {
  const state = combatState();
  beginServerTurn(state, { nowMs: 1_000 });

  assert.equal(acceptTurnIntentForClient(state, "red-session", intent("first", "aim", 1, 1)), true);
  assert.equal(acceptTurnIntentForClient(state, "red-session", intent("first", "aim", 1, 1)), false);
  assert.equal(acceptTurnIntentForClient(state, "red-session", intent("older", "aim", 0, 1)), false);
  assert.equal(acceptTurnIntentForClient(state, "red-session", intent("stale", "aim", 2, 0)), false);
  assert.equal(acceptTurnIntentForClient(state, "red-session", intent("", "aim", 2, 1)), false);
  assert.equal(state.lastAcceptedTurnIntentId, "first");
  assert.equal(state.lastAcceptedTurnInputSeq, 1);
});

test("activeOwnedVehicleForClient requires combat preview, active ownership, and alive state", () => {
  const state = combatState();

  assert.equal(activeOwnedVehicleForClient(state, "red-session")?.vehicleId, "red-1");

  state.vehicles[0]!.alive = false;
  assert.equal(activeOwnedVehicleForClient(state, "red-session"), undefined);

  state.vehicles[0]!.alive = true;
  state.phase = "round-over";
  assert.equal(activeOwnedVehicleForClient(state, "red-session"), undefined);
});

function combatState(): GravityCanyonState {
  const state = new GravityCanyonState();
  state.phase = "combat-preview";
  state.activeVehicleId = "red-1";
  state.turnDurationSeconds = TURN_SECONDS;
  state.vehicles.push(vehicleState("red-1", "red-session", "Red / Nova"));
  state.vehicles.push(vehicleState("blue-1", "blue-session", "Blue / Vesper"));
  return state;
}

function vehicleState(vehicleId: string, ownerSessionId: string, displayName: string): CombatVehicleState {
  const vehicle = new CombatVehicleState();
  vehicle.vehicleId = vehicleId;
  vehicle.ownerSessionId = ownerSessionId;
  vehicle.displayName = displayName;
  vehicle.team = vehicleId.startsWith("red-") ? "red" : "blue";
  vehicle.alive = true;
  return vehicle;
}

function intent(intentId: string, action: unknown, inputSeq: number, turnAuthorityVersion: number) {
  return { intentId, action, inputSeq, turnAuthorityVersion };
}
