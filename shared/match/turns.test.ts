import assert from "node:assert/strict";
import test from "node:test";
import { resolveNextTurn } from "./turns.js";

const vehicles = [
  { id: "red-1", team: "red", hp: 100, alive: true },
  { id: "blue-1", team: "blue", hp: 0, alive: false },
  { id: "red-2", team: "red", hp: 100, alive: true },
  { id: "blue-2", team: "blue", hp: 100, alive: true },
] as const;

test("turns skip defeated vehicles and wrap through the turn order", () => {
  const decision = resolveNextTurn({
    turnOrder: ["red-1", "blue-1", "red-2", "blue-2"],
    currentTurnIndex: 0,
    vehicles,
  });

  assert.deepEqual(decision, {
    kind: "next-turn",
    nextTurnIndex: 2,
    activeVehicleId: "red-2",
  });
});

test("turns end the round when one or zero teams remain", () => {
  assert.deepEqual(
    resolveNextTurn({
      turnOrder: ["red-1", "blue-1"],
      currentTurnIndex: 0,
      vehicles: [
        { id: "red-1", team: "red", hp: 100, alive: true },
        { id: "blue-1", team: "blue", hp: 0, alive: false },
      ],
    }),
    {
      kind: "round-over",
      winnerTeam: "red",
    },
  );

  assert.deepEqual(
    resolveNextTurn({
      turnOrder: ["red-1", "blue-1"],
      currentTurnIndex: 0,
      vehicles: [
        { id: "red-1", team: "red", hp: 0, alive: false },
        { id: "blue-1", team: "blue", hp: 0, alive: false },
      ],
    }),
    {
      kind: "round-over",
      winnerTeam: undefined,
    },
  );
});
