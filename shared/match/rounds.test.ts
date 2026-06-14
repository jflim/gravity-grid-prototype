import assert from "node:assert/strict";
import test from "node:test";
import { aliveTeamsForRound, isRoundVehicleAlive, winningTeamForRound } from "./rounds.js";

const vehicles = [
  { id: "red-1", team: "red", hp: 100, alive: true },
  { id: "blue-1", team: "blue", hp: 0, alive: false },
  { id: "red-2", team: "red", hp: 100, alive: true },
  { id: "blue-2", team: "blue", hp: 100, alive: true },
] as const;

test("rounds treat alive flag and HP together", () => {
  assert.equal(isRoundVehicleAlive({ hp: 1, alive: true }), true);
  assert.equal(isRoundVehicleAlive({ hp: 0, alive: true }), false);
  assert.equal(isRoundVehicleAlive({ hp: 1, alive: false }), false);
});

test("rounds report alive teams and winner only when one team remains", () => {
  assert.deepEqual([...aliveTeamsForRound(vehicles)].sort(), ["blue", "red"]);
  assert.equal(winningTeamForRound(vehicles), undefined);
  assert.equal(
    winningTeamForRound([
      { id: "red-1", team: "red", hp: 100, alive: true },
      { id: "blue-1", team: "blue", hp: 0, alive: false },
    ]),
    "red",
  );
  assert.equal(
    winningTeamForRound([
      { id: "red-1", team: "red", hp: 0, alive: false },
      { id: "blue-1", team: "blue", hp: 0, alive: false },
    ]),
    undefined,
  );
});
