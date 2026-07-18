import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { CombatMarkerKind } from "../../shared/model/gameTypes.js";
import type { SettleOptions, VehicleState } from "./MatchTypes";

export interface ImpactResolutionCallbacks {
  hitZoneFor: (vehicle: VehicleState) => VehicleHitZone;
  makeCrater: (x: number, y: number, radius: number, depthFactor: number) => void;
  settleVehicles: (options: SettleOptions) => string[];
  addCombatMarker: (vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot?: number) => void;
}
