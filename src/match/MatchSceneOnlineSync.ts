import type { RoomSnapshot } from "../onlineLobbySnapshot";
import { PROJECTILE_REPLAY_TIME_SCALE } from "../../shared/v1/tuning.js";
import type { MatchSoundController } from "./audio/MatchSoundController";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import {
  onlineMatchWindForPhaser,
  onlineShotReplayFromSnapshot,
  type OnlineShotReplay,
} from "./OnlineMatchStateSync";
import type { ShotFlowController } from "./ShotFlowController";
import type { TurnController } from "./TurnController";

export interface OnlineSnapshotSyncInput {
  snapshot: RoomSnapshot;
  lastReplayedShotId: string;
  turnController: TurnController;
  vehicles: VehicleState[];
  shotFlowController: ShotFlowController;
  soundController: MatchSoundController;
  projectile?: ProjectileState;
  impactPreview?: ImpactPreview;
  waitingForVehicleMotionResolution: boolean;
  resultText: string;
}

export interface OnlineSnapshotSyncResult {
  changed: boolean;
  lastReplayedShotId: string;
  projectile?: ProjectileState;
  impactPreview?: ImpactPreview;
  waitingForVehicleMotionResolution: boolean;
  resultText: string;
}

export function syncOnlineSnapshotForShotFlow(input: OnlineSnapshotSyncInput): OnlineSnapshotSyncResult {
  const turnChanged = input.turnController.syncFromServer({
    activeVehicleId: input.snapshot.activeVehicleId,
    turnSecondsRemaining: input.snapshot.turnSecondsRemaining,
    wind: onlineMatchWindForPhaser(input.snapshot.wind),
  });
  const replay = onlineShotReplayFromSnapshot(input.snapshot, input.lastReplayedShotId);
  const unchangedResult = unchangedOnlineSnapshotSyncResult(input, turnChanged);

  if (!replay) {
    return unchangedResult;
  }

  const shooter = input.vehicles.find((vehicle) => vehicle.id === replay.shooterVehicleId);
  if (!shooter) {
    return unchangedResult;
  }

  return replayOnlineShot(input, replay, shooter);
}

function unchangedOnlineSnapshotSyncResult(
  input: OnlineSnapshotSyncInput,
  changed: boolean,
): OnlineSnapshotSyncResult {
  return {
    changed,
    lastReplayedShotId: input.lastReplayedShotId,
    projectile: input.projectile,
    impactPreview: input.impactPreview,
    waitingForVehicleMotionResolution: input.waitingForVehicleMotionResolution,
    resultText: input.resultText,
  };
}

function replayOnlineShot(
  input: OnlineSnapshotSyncInput,
  replay: OnlineShotReplay,
  shooter: VehicleState,
): OnlineSnapshotSyncResult {
  const replayShooter = {
    ...shooter,
    x: replay.originX,
    y: replay.originY,
    angle: replay.angle,
    facing: replay.facing,
  };
  const shot = input.shotFlowController.fire(replayShooter, replay.power);
  input.soundController.playWeaponFire(shooter.classId);
  const replayProjectile = {
    ...shot.projectile,
    serverReplay: true,
    serverReplayDirectHitId: replay.directHitVehicleId || undefined,
    serverReplayWind: replay.wind,
  };
  const advancedReplay = advanceNewReplayProjectileToServerTime(input, replayProjectile, replay);
  if (advancedReplay) {
    return {
      changed: true,
      lastReplayedShotId: replay.id,
      projectile: advancedReplay.projectile,
      impactPreview: advancedReplay.impactPreview,
      waitingForVehicleMotionResolution: false,
      resultText: advancedReplay.resultText ?? shot.shotResult,
    };
  }

  return {
    changed: true,
    lastReplayedShotId: replay.id,
    projectile: replayProjectile,
    impactPreview: undefined,
    waitingForVehicleMotionResolution: false,
    resultText: shot.shotResult,
  };
}

function advanceNewReplayProjectileToServerTime(
  input: OnlineSnapshotSyncInput,
  projectile: ProjectileState,
  replay: OnlineShotReplay,
): Pick<OnlineSnapshotSyncResult, "projectile" | "impactPreview" | "resultText"> | undefined {
  const elapsedSeconds = replayElapsedSeconds(input.snapshot.serverTimeMs, replay.serverTimeMs);
  if (elapsedSeconds <= 0) {
    return undefined;
  }

  return updateOnlineReplayProjectile({
    projectile,
    vehicles: input.vehicles,
    wind: input.turnController.wind,
    deltaSeconds: elapsedSeconds,
    shotFlowController: input.shotFlowController,
  });
}

function replayElapsedSeconds(serverTimeMs: number, replayServerTimeMs: number): number {
  const deltaMs = serverTimeMs - replayServerTimeMs;
  return Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0) / 1_000;
}

export function updateOnlineReplayProjectile(input: {
  projectile: ProjectileState;
  vehicles: VehicleState[];
  wind: number;
  deltaSeconds: number;
  shotFlowController: Pick<ShotFlowController, "advanceVisualProjectile">;
}): Pick<OnlineSnapshotSyncResult, "projectile" | "impactPreview" | "resultText"> | undefined {
  const result = input.shotFlowController.advanceVisualProjectile({
    projectile: input.projectile,
    vehicles: input.vehicles,
    wind: input.projectile.serverReplayWind ?? input.wind,
    deltaSeconds: input.deltaSeconds * PROJECTILE_REPLAY_TIME_SCALE,
  });

  return result.kind === "resolved"
    ? { projectile: result.projectile, impactPreview: result.impactPreview, resultText: result.shotResult }
    : undefined;
}
