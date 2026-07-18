import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import { scaleBattlefieldCombatHull } from "../combatPresentation";
import { VehicleGeometry } from "./VehicleGeometry";
import type { VehicleState } from "./MatchTypes";

function vehicleState(facing: 1 | -1): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0],
    x: 500,
    y: 300,
    hp: 100,
    angle: facing === 1 ? 47 : 133,
    facing,
    moveUnits: 10,
    alive: true,
  };
}

test("vehicle geometry returns facing-aware combat hull centers", () => {
  const geometry = new VehicleGeometry();
  const facingRight = vehicleState(1);
  const facingLeft = vehicleState(-1);
  const hull = scaleBattlefieldCombatHull(facingRight.combatHull);

  assert.deepEqual(geometry.combatHullCenter(facingRight), {
    x: facingRight.x + hull.offsetX,
    y: facingRight.y + hull.offsetY,
  });
  assert.deepEqual(geometry.combatHullCenter(facingLeft), {
    x: facingLeft.x - hull.offsetX,
    y: facingLeft.y + hull.offsetY,
  });
});

test("vehicle geometry converts combat hull into projectile hit zone", () => {
  const geometry = new VehicleGeometry();
  const vehicle = vehicleState(1);
  const hull = scaleBattlefieldCombatHull(vehicle.combatHull);

  assert.deepEqual(geometry.hitZoneFor(vehicle), {
    centerX: vehicle.x + hull.offsetX,
    centerY: vehicle.y + hull.offsetY,
    width: hull.width,
    height: hull.height,
  });
});

test("vehicle geometry exposes the same scaled rectangle for visible collision zones", () => {
  const geometry = new VehicleGeometry();
  const vehicle = vehicleState(1);
  const hull = scaleBattlefieldCombatHull(vehicle.combatHull);

  assert.deepEqual(geometry.combatHullBoundsFor(vehicle), {
    left: vehicle.x + hull.offsetX - hull.width / 2,
    top: vehicle.y + hull.offsetY - hull.height / 2,
    width: hull.width,
    height: hull.height,
  });
});

test("vehicle geometry rotates visible collision-zone corners around the scaled hull center", () => {
  const geometry = new VehicleGeometry();
  const vehicle = vehicleState(1);
  const center = geometry.combatHullCenter(vehicle);
  const hull = scaleBattlefieldCombatHull(vehicle.combatHull);

  assert.deepEqual(geometry.combatHullCornersFor(vehicle, 0), [
    { x: center.x - hull.width / 2, y: center.y - hull.height / 2 },
    { x: center.x + hull.width / 2, y: center.y - hull.height / 2 },
    { x: center.x + hull.width / 2, y: center.y + hull.height / 2 },
    { x: center.x - hull.width / 2, y: center.y + hull.height / 2 },
  ]);

  const rotated = geometry.combatHullCornersFor(vehicle, 90);
  assert.ok(Math.abs(rotated[0]!.x - (center.x + hull.height / 2)) < 0.001);
  assert.ok(Math.abs(rotated[0]!.y - (center.y - hull.width / 2)) < 0.001);
  assert.ok(Math.abs(rotated[2]!.x - (center.x - hull.height / 2)) < 0.001);
  assert.ok(Math.abs(rotated[2]!.y - (center.y + hull.width / 2)) < 0.001);
});
