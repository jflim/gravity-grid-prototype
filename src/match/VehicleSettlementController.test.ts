import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import type { VehicleSettlementTuning } from "../../shared/gameplay/vehicleSettlement.js";
import type { VoidDropPresentationState, VehicleState } from "./MatchTypes";
import { VehicleSettlementController } from "./VehicleSettlementController";

const tuning: VehicleSettlementTuning = {
  vehicleHalfWidth: 10,
  vehicleHalfHeight: 5,
  moveMinX: 0,
  moveMaxX: 100,
  deathSurfaceY: 90,
  terrainChangePadding: 0,
  slopeSampleDistance: 6,
  slopeThreshold: 20,
  slopeStep: 4,
  maxSlopeIterations: 3,
};

function createVehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0],
    x: 50,
    y: 0,
    hp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

function createController(surfaceAt: (x: number) => number): VehicleSettlementController {
  return new VehicleSettlementController({
    tuning,
    visibleVoidTopY: () => 110,
    terrainBreakthroughY: () => 118,
    surfaceAt,
    createVoidDropPresentation: (input): VoidDropPresentationState => ({
      fromX: input.fallStartX,
      fromY: input.fallStartY,
      targetX: input.fallStartX + 3,
      targetY: input.visibleVoidTopY + 20,
      age: 0,
      duration: 1.5,
    }),
  });
}

test("vehicle settlement controller places alive vehicles on the terrain surface", () => {
  const vehicle = createVehicle({ x: 44 });
  const controller = createController(() => 70);

  const voidDropped = controller.placeVehicleOnSurface(vehicle);

  assert.equal(voidDropped, false);
  assert.equal(vehicle.x, 44);
  assert.equal(vehicle.y, 65);
  assert.equal(vehicle.hp, 100);
  assert.equal(vehicle.alive, true);
});

test("vehicle settlement controller applies void drop presentation and event text", () => {
  const vehicle = createVehicle({ x: 40, y: 60 });
  const controller = createController(() => 100);

  const events = controller.settleVehicles([vehicle], { forceIds: new Set([vehicle.id]) });

  assert.deepEqual(events, ["Nova Void Dropped"]);
  assert.equal(vehicle.hp, 0);
  assert.equal(vehicle.alive, false);
  assert.equal(vehicle.defeatReason, "void");
  assert.equal(vehicle.x, 43);
  assert.equal(vehicle.y, 130);
  assert.deepEqual(vehicle.voidDropPresentation, {
    fromX: 40,
    fromY: 60,
    targetX: 43,
    targetY: 130,
    age: 0,
    duration: 1.5,
  });
});

test("vehicle settlement controller skips vehicles that are already defeated", () => {
  const vehicle = createVehicle({ alive: false, hp: 0, defeatReason: "damage" });
  const controller = createController(() => {
    throw new Error("settlement should not sample terrain for defeated vehicles");
  });

  assert.deepEqual(controller.settleVehicles([vehicle]), []);
});
