import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { CombatHullShape } from "../../shared/model/gameTypes.js";
import { scaleBattlefieldCombatHull } from "../combatPresentation";
import type { VehicleState } from "./MatchTypes";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldRect {
  left: number;
  top: number;
  width: number;
  height: number;
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

  combatHullBoundsFor(vehicle: Pick<VehicleState, "combatHull" | "facing" | "x" | "y">): WorldRect {
    const hull = this.combatHullFor(vehicle);
    const center = this.combatHullCenter(vehicle);
    return {
      left: center.x - hull.width / 2,
      top: center.y - hull.height / 2,
      width: hull.width,
      height: hull.height,
    };
  }

  combatHullCornersFor(
    vehicle: Pick<VehicleState, "combatHull" | "facing" | "x" | "y">,
    angleDegrees: number,
  ): WorldPoint[] {
    const hull = this.combatHullFor(vehicle);
    const center = this.combatHullCenter(vehicle);
    const radians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const halfWidth = hull.width / 2;
    const halfHeight = hull.height / 2;
    const localCorners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ];

    return localCorners.map((corner) => ({
      x: center.x + corner.x * cos - corner.y * sin,
      y: center.y + corner.x * sin + corner.y * cos,
    }));
  }
}
