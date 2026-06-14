import assert from "node:assert/strict";
import test from "node:test";
import {
  closestPointOnVehicleHitZone,
  distanceToVehicleHitZone,
  pointInVehicleHitZone,
  vehicleHitZoneBounds,
} from "./vehicleHitZone.js";

test("vehicle hit zone bounds are centered on the authored vehicle body", () => {
  assert.deepEqual(
    vehicleHitZoneBounds({
      centerX: 250,
      centerY: 500,
      width: 100,
      height: 80,
    }),
    {
      left: 200,
      right: 300,
      top: 460,
      bottom: 540,
    },
  );
});

test("vehicle hit zone point and distance checks use the body rectangle", () => {
  const zone = {
    centerX: 250,
    centerY: 500,
    width: 100,
    height: 80,
  };

  assert.equal(pointInVehicleHitZone(240, 500, zone), true);
  assert.equal(pointInVehicleHitZone(180, 500, zone), false);
  assert.deepEqual(closestPointOnVehicleHitZone(180, 570, zone), { x: 200, y: 540 });
  assert.equal(distanceToVehicleHitZone(180, 500, zone), 20);
});
