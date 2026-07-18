import assert from "node:assert/strict";
import test from "node:test";
import {
  aimAngleAfterInput,
  aimAngleForFacingChange,
  movementDirectionFromInput,
  resolveMovementStep,
  updateChargeState,
} from "./movement.js";

test("aim input raises and lowers elevation relative to facing", () => {
  assert.equal(
    aimAngleAfterInput({
      angle: 47,
      facing: 1,
      aimUp: true,
      aimDown: false,
      deltaSeconds: 0.5,
      angleSpeedDegPerSecond: 20,
      minElevationDeg: 5,
      maxElevationDeg: 90,
    }),
    57,
  );

  assert.equal(
    aimAngleAfterInput({
      angle: 133,
      facing: -1,
      aimUp: true,
      aimDown: false,
      deltaSeconds: 0.5,
      angleSpeedDegPerSecond: 20,
      minElevationDeg: 5,
      maxElevationDeg: 90,
    }),
    123,
  );
});

test("changing facing preserves current elevation", () => {
  assert.equal(
    aimAngleForFacingChange({
      currentAngle: 57,
      currentFacing: 1,
      nextFacing: -1,
      minElevationDeg: 5,
      maxElevationDeg: 90,
    }),
    123,
  );

  assert.equal(
    aimAngleForFacingChange({
      currentAngle: 123,
      currentFacing: -1,
      nextFacing: 1,
      minElevationDeg: 5,
      maxElevationDeg: 90,
    }),
    57,
  );
});

test("movement input resolves to one direction only", () => {
  assert.equal(movementDirectionFromInput(true, false), -1);
  assert.equal(movementDirectionFromInput(false, true), 1);
  assert.equal(movementDirectionFromInput(true, true), 0);
  assert.equal(movementDirectionFromInput(false, false), 0);
});

test("movement step allows downhill movement and spends move units", () => {
  const result = resolveMovementStep({
    x: 100,
    moveUnits: 10,
    direction: 1,
    deltaSeconds: 1,
    moveSpeedPixelsPerSecond: 32,
    movePixelsPerUnit: 16,
    minX: 0,
    maxX: 300,
    maxClimbSlope: 0.5,
    surfaceAt: (x) => (x <= 100 ? 200 : 212),
  });

  assert.equal(result.moved, true);
  assert.equal(result.x, 132);
  assert.equal(result.moveUnits, 8);
});

test("movement step blocks steep downhill terrain that is not a void drop", () => {
  const result = resolveMovementStep({
    x: 100,
    moveUnits: 10,
    direction: 1,
    deltaSeconds: 1,
    moveSpeedPixelsPerSecond: 32,
    movePixelsPerUnit: 16,
    minX: 0,
    maxX: 300,
    maxClimbSlope: 0.5,
    fallSurfaceY: 500,
    surfaceAt: (x) => (x <= 100 ? 200 : 260),
  });

  assert.equal(result.moved, false);
  assert.equal(result.x, 100);
  assert.equal(result.moveUnits, 10);
});

test("movement step allows steep downhill traversal into the configured fall surface", () => {
  const result = resolveMovementStep({
    x: 100,
    moveUnits: 10,
    direction: 1,
    deltaSeconds: 1,
    moveSpeedPixelsPerSecond: 32,
    movePixelsPerUnit: 16,
    minX: 0,
    maxX: 300,
    maxClimbSlope: 0.5,
    fallSurfaceY: 500,
    surfaceAt: (x) => (x <= 100 ? 200 : 520),
  });

  assert.equal(result.moved, true);
  assert.equal(result.x, 132);
  assert.equal(result.moveUnits, 8);
});

test("movement step blocks steep uphill movement", () => {
  const result = resolveMovementStep({
    x: 100,
    moveUnits: 10,
    direction: 1,
    deltaSeconds: 1,
    moveSpeedPixelsPerSecond: 32,
    movePixelsPerUnit: 16,
    minX: 0,
    maxX: 300,
    maxClimbSlope: 0.5,
    surfaceAt: (x) => (x <= 100 ? 220 : 180),
  });

  assert.equal(result.moved, false);
  assert.equal(result.x, 100);
  assert.equal(result.moveUnits, 10);
});

test("charge state fires on release with a minimum power", () => {
  const charging = updateChargeState({
    isCharging: false,
    charge: 0,
    chargeHeld: true,
    deltaSeconds: 0.25,
    chargeRatePerSecond: 80,
    maxPower: 100,
    minFirePower: 10,
  });

  assert.deepEqual(charging, { isCharging: true, charge: 20 });

  const released = updateChargeState({
    isCharging: true,
    charge: 4,
    chargeHeld: false,
    deltaSeconds: 0.25,
    chargeRatePerSecond: 80,
    maxPower: 100,
    minFirePower: 10,
  });

  assert.deepEqual(released, { isCharging: false, charge: 0, firePower: 10 });
});
