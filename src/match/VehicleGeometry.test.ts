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
