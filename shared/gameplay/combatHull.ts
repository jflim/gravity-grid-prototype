import type { CombatHullShape, Facing } from "../model/gameTypes.js";
import type { VehicleHitZone } from "./vehicleHitZone.js";

export const BATTLEFIELD_UNIT_SCALE = 0.58;

export function scaleBattlefieldCombatHull(hull: CombatHullShape): CombatHullShape {
  return {
    offsetX: scaleBattlefieldOffset(hull.offsetX),
    offsetY: scaleBattlefieldOffset(hull.offsetY),
    width: scaleBattlefieldOffset(hull.width),
    height: scaleBattlefieldOffset(hull.height),
  };
}

export function scaleBattlefieldOffset(value: number): number {
  return Math.round(value * BATTLEFIELD_UNIT_SCALE);
}

export function vehicleHitZoneForCombatHull(
  vehicle: { x: number; y: number; facing: Facing },
  hull: CombatHullShape,
  nativeFacing: Facing = 1,
): VehicleHitZone {
  const scaledHull = scaleBattlefieldCombatHull(hull);
  return {
    centerX: vehicle.x + orientedOffset(vehicle.facing, scaledHull.offsetX, nativeFacing),
    centerY: vehicle.y + scaledHull.offsetY,
    width: scaledHull.width,
    height: scaledHull.height,
  };
}

function orientedOffset(facing: Facing, offset: number, nativeFacing: Facing): number {
  return facing === nativeFacing ? offset : -offset;
}
