import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { CombatHullShape } from "../../shared/model/gameTypes.js";
import { scaleBattlefieldCombatHull } from "../combatPresentation";
import type { VehicleState } from "./MatchTypes";

export interface WorldPoint {
  x: number;
  y: number;
}

export class VehicleGeometry {
  orientedOffset(vehicle: Pick<VehicleState, "facing">, offset: number, nativeFacing: 1 | -1): number {
    return vehicle.facing === nativeFacing ? offset : -offset;
  }

  combatHullFor(vehicle: Pick<VehicleState, "combatHull">): CombatHullShape {
    return scaleBattlefieldCombatHull(vehicle.combatHull);
  }

  combatHullCenter(vehicle: Pick<VehicleState, "combatHull" | "facing" | "x" | "y">): WorldPoint {
    const hull = this.combatHullFor(vehicle);
    return {
      x: vehicle.x + this.orientedOffset(vehicle, hull.offsetX, 1),
      y: vehicle.y + hull.offsetY,
    };
  }

  hitZoneFor(vehicle: Pick<VehicleState, "combatHull" | "facing" | "x" | "y">): VehicleHitZone {
    const hull = this.combatHullFor(vehicle);
    const center = this.combatHullCenter(vehicle);
    return {
      centerX: center.x,
      centerY: center.y,
      width: hull.width,
      height: hull.height,
    };
  }
}
