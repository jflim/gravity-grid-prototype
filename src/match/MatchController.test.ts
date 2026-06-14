import assert from "node:assert/strict";
import test from "node:test";
import { MatchController } from "./MatchController.js";

const vehicles = [
  { id: "red-1", team: "red", hp: 100, alive: true },
  { id: "blue-1", team: "blue", hp: 0, alive: false },
  { id: "red-2", team: "red", hp: 100, alive: true },
  { id: "blue-2", team: "blue", hp: 100, alive: true },
] as const;

test("match controller finds active and movable turn vehicles", () => {
  const controller = new MatchController();

  assert.equal(controller.activeVehicle(vehicles, ["red-1", "blue-1"], 0)?.id, "red-1");
  assert.equal(controller.isMovable(vehicles[0], ["red-1", "blue-1"]), true);
  assert.equal(controller.isMovable(vehicles[1], ["red-1", "blue-1"]), false);
  assert.equal(controller.isMovable(vehicles[2], ["red-1", "blue-1"]), false);
});

test("match controller delegates alive-team and turn-advance decisions", () => {
  const controller = new MatchController();

  assert.deepEqual([...controller.aliveTeams(vehicles)].sort(), ["blue", "red"]);
  assert.equal(controller.winningTeam(vehicles), undefined);
  assert.deepEqual(
    controller.resolveNextTurn({
      turnOrder: ["red-1", "blue-1", "red-2", "blue-2"],
      currentTurnIndex: 0,
      vehicles,
    }),
    {
      kind: "next-turn",
      nextTurnIndex: 2,
      activeVehicleId: "red-2",
    },
  );
});
