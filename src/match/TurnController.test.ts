import assert from "node:assert/strict";
import test from "node:test";
import { TurnController } from "./TurnController";

test("turn controller starts a round and begins the first turn with fresh action state", () => {
  const controller = new TurnController({
    turnSeconds: 20,
    windSource: () => 0.35,
  });

  controller.startRound(["red-1", "blue-1"]);
  controller.setChargeState({ isCharging: true, charge: 42 });
  controller.commitTurn();
  controller.beginTurn();

  assert.deepEqual(controller.turnOrder, ["red-1", "blue-1"]);
  assert.equal(controller.turnIndex, 0);
  assert.equal(controller.activeTurnIndex, 0);
  assert.equal(controller.turnTime, 20);
  assert.equal(controller.wind, 0.35);
  assert.equal(controller.isCharging, false);
  assert.equal(controller.charge, 0);
  assert.equal(controller.isCommitted, false);
});

test("turn controller ticks the active turn timer and reports timeouts", () => {
  const controller = new TurnController({
    turnSeconds: 2,
    windSource: () => 0,
  });

  controller.startRound(["red-1"]);
  controller.beginTurn();

  assert.equal(controller.tick(0.75), "active");
  assert.equal(controller.turnTime, 1.25);
  assert.equal(controller.tick(1.25), "timed-out");
  assert.equal(controller.turnTime, 0);
});

test("turn controller advances to a chosen turn index and resets the turn", () => {
  let wind = -0.2;
  const controller = new TurnController({
    turnSeconds: 20,
    windSource: () => wind,
  });

  controller.startRound(["red-1", "blue-1", "red-2"]);
  controller.beginTurn();
  controller.setChargeState({ isCharging: true, charge: 80 });
  controller.commitTurn();
  wind = 0.8;

  controller.advanceTo(2);

  assert.equal(controller.turnIndex, 2);
  assert.equal(controller.activeTurnIndex, 2);
  assert.equal(controller.turnTime, 20);
  assert.equal(controller.wind, 0.8);
  assert.equal(controller.isCharging, false);
  assert.equal(controller.charge, 0);
  assert.equal(controller.isCommitted, false);
});

test("turn controller can sync active turn state from the server", () => {
  const controller = new TurnController({
    turnSeconds: 20,
    windSource: () => 0,
  });

  controller.startRound(["red-1", "blue-1", "red-2"]);
  controller.beginTurn();
  controller.setChargeState({ isCharging: true, charge: 80 });
  controller.commitTurn();

  const changed = controller.syncFromServer({
    activeVehicleId: "blue-1",
    turnSecondsRemaining: 13,
    wind: -0.4,
  });

  assert.equal(changed, true);
  assert.equal(controller.activeTurnIndex, 1);
  assert.equal(controller.turnTime, 13);
  assert.equal(controller.wind, -0.4);
  assert.equal(controller.isCharging, false);
  assert.equal(controller.charge, 0);
  assert.equal(controller.isCommitted, false);
});

test("turn controller can reset action state and lock the round over", () => {
  const controller = new TurnController({
    turnSeconds: 20,
    windSource: () => 0,
  });

  controller.startRound(["red-1"]);
  controller.beginTurn();
  controller.setChargeState({ isCharging: true, charge: 31 });
  controller.commitTurn();
  controller.resetActionState();

  assert.equal(controller.isCharging, false);
  assert.equal(controller.charge, 0);
  assert.equal(controller.isCommitted, false);

  controller.endRound();

  assert.equal(controller.isCharging, false);
  assert.equal(controller.charge, 0);
  assert.equal(controller.isCommitted, true);
});
