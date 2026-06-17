import type { ShotFlowController, ShotFlowNextEvent } from "./ShotFlowController";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import type { MatchSoundController } from "./audio/MatchSoundController";
import {
  playProjectileResolutionSounds,
  vehicleDamageSnapshot,
} from "./MatchSceneShotResolution";

export interface MatchSceneProjectileFlowInput {
  projectile?: ProjectileState;
  vehicles: VehicleState[];
  wind: number;
  deltaSeconds: number;
  shotFlowController: ShotFlowController;
  soundController: MatchSoundController;
  hasActiveVehicleMotion: (vehicles: VehicleState[]) => boolean;
  queueNextEvent: (nextEvent: ShotFlowNextEvent) => void;
}

export interface MatchSceneProjectileFlowResult {
  projectile?: ProjectileState;
  impactPreview?: ImpactPreview;
  shotResult: string;
  waitingForVehicleMotionResolution: boolean;
}

export function updateImpactPreviewState(
  impactPreview: ImpactPreview | undefined,
  deltaSeconds: number,
): ImpactPreview | undefined {
  if (!impactPreview) {
    return undefined;
  }

  impactPreview.timeLeft -= deltaSeconds;
  return impactPreview.timeLeft <= 0 ? undefined : impactPreview;
}

export function updateSceneProjectile(
  input: MatchSceneProjectileFlowInput,
): MatchSceneProjectileFlowResult | undefined {
  if (!input.projectile) {
    return undefined;
  }

  const damageBefore = vehicleDamageSnapshot(input.vehicles);
  const result = input.shotFlowController.advanceProjectile({
    projectile: input.projectile,
    vehicles: input.vehicles,
    wind: input.wind,
    deltaSeconds: input.deltaSeconds,
  });

  if (result.kind === "in-flight") {
    return undefined;
  }

  playProjectileResolutionSounds({
    hasImpact: result.impactPreview !== undefined,
    vehicles: input.vehicles,
    damageBefore,
    soundController: input.soundController,
  });

  const waitingForVehicleMotionResolution = input.hasActiveVehicleMotion(input.vehicles);
  if (!waitingForVehicleMotionResolution) {
    input.queueNextEvent(result.nextEvent);
  }

  return {
    projectile: result.projectile,
    impactPreview: result.impactPreview,
    shotResult: result.shotResult,
    waitingForVehicleMotionResolution,
  };
}
