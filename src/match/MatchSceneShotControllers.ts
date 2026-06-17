import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { CombatMarkerKind, TeamId } from "../../shared/model/gameTypes.js";
import {
  AIM_SPEED_DEG_PER_SECOND,
  BUNGER_CRATER_RADIUS,
  BUNGER_DAMAGE_RADIUS,
  BUNGER_KNOCKBACK,
  CHARGE_RATE_PER_SECOND,
  CRATER_RADIUS,
  DAMAGE_RADIUS,
  DEATH_SURFACE_Y,
  GRAVITY,
  IMPACT_PREVIEW_SECONDS,
  MAX_CLIMB_SLOPE,
  MAX_ELEVATION_DEG,
  MAX_POWER,
  MIN_ELEVATION_DEG,
  MIN_FIRE_POWER,
  MOVE_MAX_X,
  MOVE_MIN_X,
  MOVE_PIXELS_PER_UNIT,
  MOVE_SPEED_PIXELS_PER_SECOND,
  PROJECTILE_MUZZLE_DISTANCE,
  PROJECTILE_MUZZLE_Y_OFFSET,
  PROJECTILE_OUT_OF_BOUNDS_LOWER_Y_MARGIN,
  PROJECTILE_OUT_OF_BOUNDS_UPPER_Y_MARGIN,
  PROJECTILE_RADIUS,
  SHOT_SPEED_MAX,
  SHOT_SPEED_MIN,
  TURN_SECONDS,
  V1_WORLD_HEIGHT as WORLD_HEIGHT,
  V1_WORLD_WIDTH as WORLD_WIDTH,
  WIND_FORCE,
} from "../../shared/v1/tuning.js";
import { ImpactController } from "./ImpactController";
import { PlayerActionController } from "./PlayerActionController";
import { ProjectileController } from "./ProjectileController";
import { ShotFlowController } from "./ShotFlowController";
import type { MatchSceneTerrainAdapter } from "./MatchSceneTerrainAdapter";
import { TurnController } from "./TurnController";
import type { VehicleSettlementController } from "./VehicleSettlementController";
import type { ProjectileState, VehicleState } from "./MatchTypes";
import { createBrowserSoundEngine, MatchSoundController } from "./audio/MatchSoundController";

export interface CreateSceneShotFlowControllerOptions {
  terrain: MatchSceneTerrainAdapter;
  vehicleSettlementController: VehicleSettlementController;
  vehicles: () => VehicleState[];
  hitZoneFor: (vehicle: VehicleState) => VehicleHitZone;
  addCombatMarkerForVehicle: (
    vehicle: VehicleState,
    kind: CombatMarkerKind,
    label: string,
    slot?: number,
  ) => void;
  recenterForProjectileIfNeeded: (projectile: ProjectileState) => void;
  winningTeam: () => TeamId | undefined;
}

export interface CreateScenePlayerActionControllerOptions {
  terrain: MatchSceneTerrainAdapter;
  vehicleSettlementController: VehicleSettlementController;
  turnController: TurnController;
  fire: (vehicle: VehicleState, power: number) => void;
  onVehicleMoved: (vehicle: VehicleState) => void;
  onVehicleMotionStarted: (vehicle: VehicleState) => void;
}

export function createSceneShotFlowController(
  input: CreateSceneShotFlowControllerOptions,
): ShotFlowController {
  const projectileController = new ProjectileController({
    projectileRadius: PROJECTILE_RADIUS,
    maxPower: MAX_POWER,
    shotSpeedMin: SHOT_SPEED_MIN,
    shotSpeedMax: SHOT_SPEED_MAX,
    muzzleDistance: PROJECTILE_MUZZLE_DISTANCE,
    muzzleYOffset: PROJECTILE_MUZZLE_Y_OFFSET,
    windForce: WIND_FORCE,
    gravity: GRAVITY,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    lowerYMargin: PROJECTILE_OUT_OF_BOUNDS_LOWER_Y_MARGIN,
    upperYMargin: PROJECTILE_OUT_OF_BOUNDS_UPPER_Y_MARGIN,
    maxTrailPoints: 34,
  });
  const impactController = new ImpactController({
    craterRadius: CRATER_RADIUS,
    bungerCraterRadius: BUNGER_CRATER_RADIUS,
    damageRadius: DAMAGE_RADIUS,
    bungerDamageRadius: BUNGER_DAMAGE_RADIUS,
    bungerKnockback: BUNGER_KNOCKBACK,
    moveMinX: MOVE_MIN_X,
    moveMaxX: MOVE_MAX_X,
    impactPreviewSeconds: IMPACT_PREVIEW_SECONDS,
  });

  return new ShotFlowController({
    projectileController,
    impactController,
    surfaceAt: (x) => input.terrain.surfaceAt(x),
    hitZoneFor: (vehicle) => input.hitZoneFor(vehicle),
    makeCrater: (x, y, radius, depthFactor) => input.terrain.makeCrater(x, y, radius, depthFactor),
    settleVehicles: (options) => input.vehicleSettlementController.settleVehicles(input.vehicles(), options),
    addCombatMarker: input.addCombatMarkerForVehicle,
    recenterForProjectileIfNeeded: input.recenterForProjectileIfNeeded,
    winningTeam: input.winningTeam,
  });
}

export function createSceneTurnController(windSource: () => number): TurnController {
  return new TurnController({
    turnSeconds: TURN_SECONDS,
    windSource,
  });
}

export function createSceneSoundController(): MatchSoundController {
  return new MatchSoundController({
    engine: createBrowserSoundEngine(),
  });
}

export function createScenePlayerActionController(
  input: CreateScenePlayerActionControllerOptions,
): PlayerActionController {
  return new PlayerActionController({
    aimSpeedDegPerSecond: AIM_SPEED_DEG_PER_SECOND,
    minElevationDeg: MIN_ELEVATION_DEG,
    maxElevationDeg: MAX_ELEVATION_DEG,
    moveSpeedPixelsPerSecond: MOVE_SPEED_PIXELS_PER_SECOND,
    movePixelsPerUnit: MOVE_PIXELS_PER_UNIT,
    minX: MOVE_MIN_X,
    maxX: MOVE_MAX_X,
    maxClimbSlope: MAX_CLIMB_SLOPE,
    fallSurfaceY: DEATH_SURFACE_Y,
    chargeRatePerSecond: CHARGE_RATE_PER_SECOND,
    maxPower: MAX_POWER,
    minFirePower: MIN_FIRE_POWER,
    surfaceAt: (x) => input.terrain.surfaceAt(x),
    placeVehicleOnSurface: (vehicle) => input.vehicleSettlementController.placeVehicleOnSurface(vehicle),
    chargeState: () => ({
      isCharging: input.turnController.isCharging,
      charge: input.turnController.charge,
    }),
    setChargeState: (charge) => input.turnController.setChargeState(charge),
    fire: input.fire,
    resetCharge: () => input.turnController.resetCharge(),
    onVehicleMoved: input.onVehicleMoved,
    onVehicleMotionStarted: input.onVehicleMotionStarted,
  });
}
