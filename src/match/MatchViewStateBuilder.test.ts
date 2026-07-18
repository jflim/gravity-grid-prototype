import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import { MatchViewStateBuilder } from "./MatchViewStateBuilder";
import type { VehicleState } from "./MatchTypes";

function vehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0]!,
    x: 100,
    y: 200,
    hp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

test("match view state builder derives wind label and round completion", () => {
  const active = vehicle();
  const builder = new MatchViewStateBuilder();

  const state = builder.build({
    vehicles: [active],
    activeVehicle: active,
    projectile: undefined,
    impactPreview: undefined,
    currentMap: undefined,
    visibleVoidTopY: 700,
    visibleVoidBottomY: 910,
    terrainPlatformBottomY: 690,
    terrainBreakthroughY: 680,
    showCombatHulls: true,
    roundOver: false,
    turnCommitted: false,
    charging: true,
    charge: 42,
    turnTime: 12,
    localActiveTurn: true,
    cameraZoom: 1.2,
    shotResult: "Nova fired.",
    aliveTeamCount: 1,
    winningTeam: "red",
    wind: -0.74,
  });

  assert.equal(state.activeVehicle, active);
  assert.equal(state.roundComplete, true);
  assert.equal(state.windLabel, "<< 7");
  assert.equal(state.charge, 42);
  assert.equal(state.cameraZoom, 1.2);
});

test("match view state builder labels calm wind and active rounds", () => {
  const active = vehicle();
  const builder = new MatchViewStateBuilder();

  const state = builder.build({
    vehicles: [active],
    activeVehicle: active,
    projectile: undefined,
    impactPreview: undefined,
    currentMap: undefined,
    visibleVoidTopY: 700,
    visibleVoidBottomY: 910,
    terrainPlatformBottomY: 690,
    terrainBreakthroughY: 680,
    showCombatHulls: false,
    roundOver: false,
    turnCommitted: false,
    charging: false,
    charge: 0,
    turnTime: 20,
    localActiveTurn: false,
    cameraZoom: 1,
    shotResult: "Ready.",
    aliveTeamCount: 2,
    winningTeam: undefined,
    wind: 0.08,
  });

  assert.equal(state.roundComplete, false);
  assert.equal(state.windLabel, "calm");
  assert.equal(state.showCombatHulls, false);
});
