import assert from "node:assert/strict";
import test from "node:test";
import { settleVehicleOnTerrain, type VehicleSettlementTuning } from "./vehicleSettlement.js";

const slopeSampleDistance = 18;

const tuning: VehicleSettlementTuning = {
  vehicleHalfWidth: 34,
  vehicleHalfHeight: 22,
  moveMinX: -72,
  moveMaxX: 2472,
  deathSurfaceY: 894,
  terrainChangePadding: 42,
  slopeSampleDistance,
  slopeThreshold: slopeSampleDistance * 2,
  slopeStep: 7,
  maxSlopeIterations: 14,
};

test("settlement places an alive vehicle on the terrain surface", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: () => 500,
  });

  assert.deepEqual(result, {
    vehicleId: "red-1",
    x: 100,
    y: 478,
    hp: 100,
    alive: true,
    adjustedForSlope: false,
    voidDropped: false,
    fallStartX: 100,
    fallStartY: 420,
  });
});

test("settlement starts falling when no playable surface exists without marking Void Dropped yet", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 0,
      hp: 100,
      alive: true,
    },
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: () => 960,
  });

  assert.equal(result.voidDropped, false);
  assert.equal(result.alive, true);
  assert.equal(result.hp, 100);
  assert.equal(result.defeatReason, undefined);
  assert.equal(result.y, 760);
  assert.equal(result.fallStartX, 100);
  assert.equal(result.fallStartY, 760);
  assert.deepEqual(result.motion, {
    kind: "falling",
    velocityY: 0,
  });
});

test("settlement starts falling when too little of its footing is supported", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    adjustForSlope: false,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => (x <= 105 ? 500 : 960),
  });

  assert.equal(result.voidDropped, false);
  assert.equal(result.alive, true);
  assert.equal(result.hp, 100);
  assert.equal(result.defeatReason, undefined);
  assert.equal(result.fallStartX, 100);
  assert.equal(result.fallStartY, 420);
  assert.deepEqual(result.motion, {
    kind: "falling",
    velocityY: 0,
  });
});

test("settlement rests on terrain up to a 45 degree slope", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    adjustForSlope: false,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => 500 + (x - 100),
  });

  assert.equal(result.voidDropped, false);
  assert.equal(result.alive, true);
  assert.equal(result.hp, 100);
  assert.equal(result.y, 478);
  assert.equal(result.motion, undefined);
});

test("settlement slides instead of falling when the full footprint has steep playable terrain under it", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    adjustForSlope: false,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => (x < 100 ? 500 + (100 - x) * 2.2 : 500),
  });

  assert.equal(result.voidDropped, false);
  assert.equal(result.alive, true);
  assert.equal(result.hp, 100);
  assert.equal(result.y, 478);
  assert.deepEqual(result.motion, {
    kind: "sliding",
    direction: -1,
  });
});

test("settlement starts sliding downhill when terrain is supported but too steep to rest on", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    adjustForSlope: false,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => 500 + (x - 100) * 1.1,
  });

  assert.equal(result.voidDropped, false);
  assert.equal(result.alive, true);
  assert.equal(result.hp, 100);
  assert.equal(result.y, 478);
  assert.deepEqual(result.motion, {
    kind: "sliding",
    direction: 1,
  });
});

test("settlement nudges vehicles off steep local slopes only when terrain changed nearby", () => {
  const unchangedFarAway = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    changedX: 600,
    changedRadius: 50,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => (x < 100 ? 480 : 530),
  });
  const nearbyChange = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    changedX: 120,
    changedRadius: 50,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => (x < 100 ? 480 : 530),
  });

  assert.equal(unchangedFarAway.x, 100);
  assert.equal(unchangedFarAway.adjustedForSlope, false);
  assert.equal(nearbyChange.x, 121);
  assert.equal(nearbyChange.adjustedForSlope, true);
});

test("settlement can place a vehicle without applying slope correction", () => {
  const result = settleVehicleOnTerrain({
    vehicle: {
      id: "red-1",
      x: 100,
      y: 420,
      hp: 100,
      alive: true,
    },
    adjustForSlope: false,
    tuning,
    fallbackFallStartY: 760,
    surfaceAt: (x) => (x < 100 ? 480 : 530),
  });

  assert.equal(result.x, 100);
  assert.equal(result.y, 508);
  assert.equal(result.adjustedForSlope, false);
});
