import type { TeamId } from "../../shared/model/gameTypes.js";
import { MAX_MOVE_UNITS, PROJECTILE_REPLAY_TIME_SCALE } from "../../shared/v1/tuning.js";
import type { MatchInputSnapshot } from "./MatchInputController";
import { MatchController } from "./MatchController";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import type { PlayerActionController } from "./PlayerActionController";
import type { ShotFlowController } from "./ShotFlowController";
import {
  createScenePlayerActionController,
  createSceneShotFlowController,
  createSceneSoundController,
  createSceneTurnController,
} from "./MatchSceneShotControllers";
import { syncOnlineSnapshotForShotFlow, updateOnlineReplayProjectile } from "./MatchSceneOnlineSync";
import { updateImpactPreviewState, updateSceneProjectile } from "./MatchSceneProjectileFlow";
import type { MatchSceneShotFlowOptions, MatchSceneShotFlowViewState } from "./MatchSceneShotFlowTypes";
import { vehicleInputPublishFlags } from "./MatchSceneInputPublish";
import { canLocalPlayerControlTurn, inputForTurnAuthority } from "./MatchTurnIntents";
import { resolveVehicleMotionForScene } from "./MatchSceneVehicleMotionResolution";
import type { TurnController } from "./TurnController";
import type { RoomSnapshot } from "../onlineLobbySnapshot";

export class MatchSceneShotFlow {
  private readonly matchController = new MatchController();
  private readonly shotFlowController: ShotFlowController;
  private readonly turnController: TurnController;
  private readonly soundController = createSceneSoundController();
  private readonly playerActionController: PlayerActionController;

  private projectileState?: ProjectileState;
  private impactPreviewState?: ImpactPreview;
  private resultText = "";
  private isRoundOver = false;
  private waitingForVehicleMotionResolution = false;
  private playerMovedThisFrame = false;
  private lastReplayedShotId = "";

  constructor(private readonly options: MatchSceneShotFlowOptions) {
    this.shotFlowController = createSceneShotFlowController({
      terrain: options.terrain,
      vehicleSettlementController: options.vehicleSettlementController,
      vehicles: options.vehicles,
      hitZoneFor: options.hitZoneFor,
      addCombatMarkerForVehicle: options.addCombatMarkerForVehicle,
      recenterForProjectileIfNeeded: options.recenterForProjectileIfNeeded,
      winningTeam: () => this.winningTeam(),
    });
    this.turnController = createSceneTurnController(options.windSource);
    this.playerActionController = createScenePlayerActionController({
      terrain: options.terrain,
      vehicleSettlementController: options.vehicleSettlementController,
      turnController: this.turnController,
      fire: (vehicle, power) => this.fire(vehicle, power),
      onVehicleMoved: (_vehicle) => {
        this.playerMovedThisFrame = true;
        options.frameBattlefield(0);
      },
      onVehicleMotionStarted: (vehicle) => {
        this.resultText =
          vehicle.motion?.kind === "sliding"
            ? `${vehicle.username} started sliding.`
            : `${vehicle.username} started falling.`;
      },
    });
  }

  viewState(): MatchSceneShotFlowViewState {
    return {
      projectile: this.projectileState, impactPreview: this.impactPreviewState,
      shotResult: this.resultText, roundOver: this.isRoundOver,
      turnCommitted: this.turnController.isCommitted, charging: this.turnController.isCharging,
      charge: this.turnController.charge, turnTime: this.turnController.turnTime,
      localActiveTurn: this.localCanControlActiveVehicle(), wind: this.turnController.wind,
    };
  }

  startRound(turnOrder: readonly string[], shotResult: string): void {
    this.isRoundOver = this.waitingForVehicleMotionResolution = false;
    this.projectileState = undefined; this.impactPreviewState = undefined;
    this.resultText = shotResult;
    this.turnController.startRound(turnOrder);
  }

  beginTurn(): void {
    const active = this.activeVehicle();
    if (!active) return;
    this.turnController.beginTurn();
    this.soundController.beginTurn(active.id, this.turnController.turnTime);
    this.prepareStartedTurn(active);
  }

  updateImpactPreview(deltaSeconds: number): void {
    this.impactPreviewState = updateImpactPreviewState(this.impactPreviewState, deltaSeconds);
  }

  updateActiveRound(input: MatchInputSnapshot, deltaSeconds: number): void {
    if (this.isRoundOver || this.resolveVehicleMotionState(deltaSeconds)) return;
    this.updateActiveProjectileOrTurn(input, deltaSeconds);
  }

  private resolveVehicleMotionState(deltaSeconds: number): boolean {
    const result = resolveVehicleMotionForScene({
      vehicles: this.vehicles,
      deltaSeconds,
      waitingForVehicleMotionResolution: this.waitingForVehicleMotionResolution,
      vehicleSettlementController: this.options.vehicleSettlementController,
      soundController: this.soundController,
      addVoidDropMarker: (vehicle) => this.options.addCombatMarkerForVehicle(vehicle, "bunged", "VOID DROPPED"),
      frameBattlefield: this.options.frameBattlefield,
      drawWorld: this.options.drawWorld,
      winningTeam: () => this.winningTeam(),
      endRound: () => this.endRound(),
      advanceTurn: () => this.advanceTurnIfBrowserAuthority(),
      queueRoundEvent: (delayMs, action) => this.options.roundEventScheduler.queue(delayMs, action),
    });
    this.waitingForVehicleMotionResolution = result.waitingForVehicleMotionResolution;
    this.resultText = result.resultText ?? this.resultText;
    return result.handled;
  }

  activeVehicle(): VehicleState | undefined {
    return this.matchController.activeVehicle(this.vehicles, this.turnController.turnOrder, this.turnController.activeTurnIndex);
  }

  isMovable(vehicle: VehicleState): boolean {
    return !vehicle.motion && this.matchController.isMovable(vehicle, this.turnController.turnOrder);
  }

  aliveTeams(): Set<TeamId> { return this.matchController.aliveTeams(this.vehicles); }

  winningTeam(): TeamId | undefined { return this.matchController.winningTeam(this.vehicles); }

  toggleSoundMuted(): boolean { return this.soundController.toggleMuted(); }

  setShotResult(shotResult: string): void { this.resultText = shotResult; }

  syncOnlineSnapshot(snapshot: RoomSnapshot): boolean {
    const result = syncOnlineSnapshotForShotFlow({
      snapshot,
      lastReplayedShotId: this.lastReplayedShotId,
      turnController: this.turnController,
      vehicles: this.vehicles,
      shotFlowController: this.shotFlowController,
      soundController: this.soundController,
      projectile: this.projectileState,
      impactPreview: this.impactPreviewState,
      waitingForVehicleMotionResolution: this.waitingForVehicleMotionResolution,
      resultText: this.resultText,
    });
    this.lastReplayedShotId = result.lastReplayedShotId;
    this.projectileState = result.projectile;
    this.impactPreviewState = result.impactPreview;
    this.waitingForVehicleMotionResolution = result.waitingForVehicleMotionResolution;
    this.resultText = result.resultText;
    return result.changed;
  }

  private get vehicles(): VehicleState[] { return this.options.vehicles(); }

  private updateActiveProjectileOrTurn(input: MatchInputSnapshot, deltaSeconds: number): void {
    if (this.resolveProjectileOrCommittedTurn(deltaSeconds)) return;

    const active = this.activeMovableVehicleOrAdvance();
    if (!active || this.tickActiveTurn(active, deltaSeconds)) return;

    this.handleActiveTurnInput(active, inputForTurnAuthority(input, active, this.options.turnIntentPublisher), deltaSeconds);
  }

  private resolveProjectileOrCommittedTurn(deltaSeconds: number): boolean {
    if (!this.projectileState && !this.turnController.isCommitted) return false;
    if (this.projectileState) {
      this.updateProjectile(deltaSeconds);
    }
    this.options.drawWorld();
    return true;
  }

  private activeMovableVehicleOrAdvance(): VehicleState | undefined {
    const active = this.activeVehicle() ?? this.vehicles[0];
    if (active && this.isMovable(active)) return active;
    this.advanceTurnIfBrowserAuthority();
    return undefined;
  }

  private tickActiveTurn(active: VehicleState, deltaSeconds: number): boolean {
    const tickResult = this.options.turnIntentPublisher ? "active" : this.turnController.tick(deltaSeconds);
    this.soundController.updateTurnTick({
      activeVehicleId: active.id,
      turnTime: this.turnController.turnTime,
      canAct: this.localCanControlVehicle(active),
    });
    if (tickResult !== "timed-out") {
      return false;
    }

    this.resultText = `${active.username} timed out.`;
    this.advanceTurnIfBrowserAuthority();
    return true;
  }

  private handleActiveTurnInput(active: VehicleState, input: MatchInputSnapshot, deltaSeconds: number): void {
    this.playerActionController.handleChargeInput(active, input, deltaSeconds);
    if (this.turnController.isCommitted || this.projectileState) {
      this.options.drawWorld();
      return;
    }

    this.publishVehicleInput(active, input, deltaSeconds);
    this.soundController.updateMovement({ moving: this.playerMovedThisFrame, deltaSeconds });
    this.options.drawWorld();
  }

  private publishVehicleInput(active: VehicleState, input: MatchInputSnapshot, deltaSeconds: number): void {
    this.playerMovedThisFrame = false;
    const previousFacing = active.facing, previousAngle = active.angle;
    this.playerActionController.handleVehicleInput(active, input, deltaSeconds);
    const publish = vehicleInputPublishFlags(input, active, previousAngle, previousFacing, this.playerMovedThisFrame);
    if (publish.move) {
      this.options.turnIntentPublisher?.submitMove({ vehicle: active, input, deltaSeconds });
    }
    if (publish.aim) {
      this.options.turnIntentPublisher?.submitAim({ vehicle: active });
    }
  }

  private fire(active: VehicleState, power: number): void {
    this.options.turnIntentPublisher?.submitFire({ vehicle: active, power });
    if (this.options.turnIntentPublisher) {
      this.turnController.commitTurn();
      this.resultText = `${active.username} fired.`;
      return;
    }

    this.turnController.commitTurn();
    const shot = this.shotFlowController.fire(active, power);
    this.projectileState = shot.projectile;
    this.resultText = shot.shotResult;
    this.soundController.playWeaponFire(active.classId);
  }

  private updateProjectile(deltaSeconds: number): void {
    if (this.projectileState?.serverReplay) {
      this.updateServerReplayProjectile(deltaSeconds);
      return;
    }

    const result = updateSceneProjectile({
      projectile: this.projectileState,
      vehicles: this.vehicles,
      wind: this.turnController.wind,
      deltaSeconds: deltaSeconds * PROJECTILE_REPLAY_TIME_SCALE,
      shotFlowController: this.shotFlowController,
      soundController: this.soundController,
      hasActiveVehicleMotion: (vehicles) =>
        this.options.vehicleSettlementController.hasActiveVehicleMotion(vehicles),
      queueNextEvent: (nextEvent) => {
        const action = nextEvent.kind === "end-round" ? () => this.endRound() : () => this.advanceTurn();
        this.options.roundEventScheduler.queue(nextEvent.delayMs, action);
      },
    });

    if (!result) {
      return;
    }

    this.projectileState = result.projectile;
    this.impactPreviewState = result.impactPreview;
    this.resultText = result.shotResult;
    this.waitingForVehicleMotionResolution = result.waitingForVehicleMotionResolution;
  }

  private updateServerReplayProjectile(deltaSeconds: number): void {
    const result = updateOnlineReplayProjectile({
      projectile: this.projectileState!,
      vehicles: this.vehicles,
      wind: this.turnController.wind,
      deltaSeconds,
      shotFlowController: this.shotFlowController,
    });
    if (!result) return;
    this.projectileState = result.projectile;
    this.impactPreviewState = result.impactPreview;
    this.resultText = result.resultText ?? this.resultText;
  }

  private advanceTurn(): void {
    if (this.isRoundOver) {
      return;
    }

    this.projectileState = undefined;
    this.waitingForVehicleMotionResolution = false;
    this.turnController.resetActionState();

    const decision = this.matchController.resolveNextTurn({
      turnOrder: this.turnController.turnOrder,
      currentTurnIndex: this.turnController.turnIndex,
      vehicles: this.vehicles,
    });

    if (decision.kind === "round-over") {
      this.endRound();
      return;
    }

    this.turnController.advanceTo(decision.nextTurnIndex);
    const active = this.activeVehicle();
    if (active) {
      this.prepareStartedTurn(active);
    }
  }

  private advanceTurnIfBrowserAuthority(): void { if (!this.options.turnIntentPublisher) this.advanceTurn(); }

  private prepareStartedTurn(active: VehicleState): void {
    active.moveUnits = MAX_MOVE_UNITS;
    this.impactPreviewState = undefined;
    this.options.stopCameraFollow();
    this.options.frameBattlefield(450);
  }

  private endRound(): void {
    if (this.isRoundOver) {
      return;
    }

    this.options.roundEventScheduler.clear();
    this.isRoundOver = true;
    this.waitingForVehicleMotionResolution = false;
    this.projectileState = undefined;
    this.turnController.endRound();

    const winner = this.winningTeam();
    this.resultText = winner
      ? `${winner.toUpperCase()} team wins the round. Next round starting...`
      : "Draw. New round starting...";
    this.options.drawWorld();
    this.options.roundEventScheduler.queue(2400, () => this.options.restartRound());
  }

  private localCanControlActiveVehicle(): boolean {
    const active = this.activeVehicle(); return active ? this.localCanControlVehicle(active) : false;
  }

  private localCanControlVehicle(vehicle: VehicleState): boolean { return canLocalPlayerControlTurn(vehicle.id, this.options.turnIntentPublisher); }

}
