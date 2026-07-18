import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../../shared/content/v1Units.js";
import type { VehicleState } from "../MatchTypes";
import { vehicleRenderModelFor } from "./VehicleRenderModel";

function makeVehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0]!,
    x: 100,
    y: 200,
    hp: 100,
    angle: 0,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

test("vehicleRenderModelFor marks an active movable vehicle", () => {
  const model = vehicleRenderModelFor({
    vehicle: makeVehicle(),
    activeVehicleId: "red-1",
    projectileActive: false,
    roundOver: false,
    turnCommitted: false,
    localActiveTurn: true,
    charging: true,
    turnTime: 18,
    showCombatHulls: true,
    surfaceAt: (x) => (x < 100 ? 190 : 210),
    isMovable: () => true,
  });

  assert.equal(model.active, true);
  assert.equal(model.localActiveTurn, true);
  assert.equal(model.renderX, 100);
  assert.equal(model.renderY, 200);
  assert.equal(model.showHpBar, true);
  assert.equal(model.showCombatHull, true);
  assert.equal(model.charging, true);
  assert.equal(model.turnTime, 18);
  assert.equal(model.slopeAngle, (Math.atan2(20, 44) * 180) / Math.PI);
});

test("vehicleRenderModelFor keeps falling void drops level", () => {
  const vehicle: VehicleState = {
    ...makeVehicle(),
    alive: false,
    defeatReason: "void",
    motion: { kind: "falling", velocityY: 40 },
    voidDropPresentation: {
      fromX: 100,
      fromY: 200,
      targetX: 100,
      targetY: 500,
      age: 250,
      duration: 900,
    },
  };

  const model = vehicleRenderModelFor({
    vehicle,
    activeVehicleId: "red-1",
    projectileActive: false,
    roundOver: false,
    turnCommitted: false,
    localActiveTurn: false,
    charging: false,
    turnTime: 0,
    showCombatHulls: true,
    surfaceAt: () => 300,
    isMovable: () => false,
  });

  assert.equal(model.active, false);
  assert.equal(model.slopeAngle, 0);
  assert.equal(model.motionOrDefeatLabel, "FALLING");
  assert.equal(model.showCombatHull, false);
  assert.equal(model.showHpBar, false);
});
