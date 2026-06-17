import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { CombatMarkerKind } from "../../shared/model/gameTypes.js";
import type { MatchSceneTerrainAdapter } from "./MatchSceneTerrainAdapter";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import type { RoundEventScheduler } from "./RoundEventScheduler";
import type { VehicleSettlementController } from "./VehicleSettlementController";

export interface MatchSceneShotFlowOptions {
  terrain: MatchSceneTerrainAdapter;
  vehicleSettlementController: VehicleSettlementController;
  roundEventScheduler: RoundEventScheduler;
  windSource: () => number;
  vehicles: () => VehicleState[];
  hitZoneFor: (vehicle: VehicleState) => VehicleHitZone;
  addCombatMarkerForVehicle: (
    vehicle: VehicleState,
    kind: CombatMarkerKind,
    label: string,
    slot?: number,
  ) => void;
  recenterForProjectileIfNeeded: (projectile: ProjectileState) => void;
  frameBattlefield: (duration?: number) => void;
  stopCameraFollow: () => void;
  drawWorld: () => void;
  restartRound: () => void;
}

export interface MatchSceneShotFlowViewState {
  projectile?: ProjectileState;
  impactPreview?: ImpactPreview;
  shotResult: string;
  roundOver: boolean;
  turnCommitted: boolean;
  charging: boolean;
  charge: number;
  turnTime: number;
  wind: number;
}
