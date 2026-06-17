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

const motionTuning = {
  slideSpeedPixelsPerSecond: 60,
  fallGravityPixelsPerSecondSquared: 200,
  maxFallSpeedPixelsPerSecond: 400,
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
    motionTuning,
    visibleVoidTopY: () => 110,
    terrainBreakthroughY: () => 118,
    surfaceAt,
    hitZoneBottom: (vehicle) => vehicle.y + tuning.vehicleHalfHeight,
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

test("vehicle settlement controller starts falling without immediately applying Void Dropped", () => {
  const vehicle = createVehicle({ x: 40, y: 60 });
  const controller = createController(() => 100);

  const events = controller.settleVehicles([vehicle], { forceIds: new Set([vehicle.id]) });

  assert.deepEqual(events, []);
  assert.equal(vehicle.hp, 100);
  assert.equal(vehicle.alive, true);
  assert.equal(vehicle.defeatReason, undefined);
  assert.equal(vehicle.x, 40);
  assert.equal(vehicle.y, 60);
  assert.deepEqual(vehicle.motion, {
    kind: "falling",
    velocityY: 0,
  });
  assert.equal(vehicle.voidDropPresentation, undefined);
});

test("vehicle settlement controller applies Void Dropped only after falling hull touches the visible void", () => {
  const vehicle = createVehicle({
    x: 40,
    y: 60,
    motion: {
      kind: "falling",
      velocityY: 0,
    },
  });
  const controller = createController(() => 100);

  assert.deepEqual(controller.updateVehicleMotion([vehicle], 0.1), []);
  assert.equal(vehicle.alive, true);
  assert.equal(vehicle.defeatReason, undefined);
  assert.equal(vehicle.voidDropPresentation, undefined);

  const events = controller.updateVehicleMotion([vehicle], 0.7);

  assert.deepEqual(events, ["Nova Void Dropped"]);
  assert.equal(vehicle.hp, 0);
  assert.equal(vehicle.alive, false);
  assert.equal(vehicle.defeatReason, "void");
  assert.equal(vehicle.motion, undefined);
  assert.equal(vehicle.x, 43);
  assert.equal(vehicle.y, 130);
  const presentation = vehicle.voidDropPresentation as VoidDropPresentationState | undefined;
  assert.ok(presentation);
  assert.equal(presentation.fromX, 40);
  assert.ok(presentation.fromY > 60);
  assert.equal(presentation.targetX, 43);
  assert.equal(presentation.targetY, 130);
  assert.equal(presentation.duration, 1.5);
});

test("vehicle settlement controller slides vehicles downhill until they find stable ground", () => {
  const vehicle = createVehicle({ x: 40, y: 60 });
  const controller = createController((x) => (x < 70 ? 50 + (x - 40) * 1.8 : 70));

  assert.deepEqual(controller.settleVehicles([vehicle], { forceIds: new Set([vehicle.id]) }), []);
  assert.deepEqual(vehicle.motion, {
    kind: "sliding",
    direction: 1,
  });

  const events = controller.updateVehicleMotion([vehicle], 0.5);

  assert.deepEqual(events, []);
  assert.equal(vehicle.alive, true);
  assert.equal(vehicle.motion, undefined);
  assert.equal(vehicle.x, 82);
  assert.equal(vehicle.y, 65);
});

test("vehicle settlement controller skips vehicles that are already defeated", () => {
  const vehicle = createVehicle({ alive: false, hp: 0, defeatReason: "damage" });
  const controller = createController(() => {
    throw new Error("settlement should not sample terrain for defeated vehicles");
  });

  assert.deepEqual(controller.settleVehicles([vehicle]), []);
});
