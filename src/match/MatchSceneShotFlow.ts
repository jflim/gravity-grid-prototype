import type { TeamId } from "../../shared/model/gameTypes.js";
import { MAX_MOVE_UNITS } from "../../shared/v1/tuning.js";
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
import { updateImpactPreviewState, updateSceneProjectile } from "./MatchSceneProjectileFlow";
import type { MatchSceneShotFlowOptions, MatchSceneShotFlowViewState } from "./MatchSceneShotFlowTypes";
import { updateVehicleMotionsForScene } from "./MatchSceneVehicleMotionFlow";
import type { TurnController } from "./TurnController";

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
      projectile: this.projectileState,
      impactPreview: this.impactPreviewState,
      shotResult: this.resultText,
      roundOver: this.isRoundOver,
      turnCommitted: this.turnController.isCommitted,
      charging: this.turnController.isCharging,
      charge: this.turnController.charge,
      turnTime: this.turnController.turnTime,
      wind: this.turnController.wind,
    };
  }

  startRound(turnOrder: readonly string[], shotResult: string): void {
    this.isRoundOver = false;
    this.waitingForVehicleMotionResolution = false;
    this.projectileState = undefined;
    this.impactPreviewState = undefined;
    this.resultText = shotResult;
    this.turnController.startRound(turnOrder);
  }

  beginTurn(): void {
    const active = this.activeVehicle();
    if (!active) {
      return;
    }

    this.turnController.beginTurn();
    this.soundController.beginTurn(active.id, this.turnController.turnTime);
    this.prepareStartedTurn(active);
  }

  updateImpactPreview(deltaSeconds: number): void {
    this.impactPreviewState = updateImpactPreviewState(this.impactPreviewState, deltaSeconds);
  }

  updateActiveRound(input: MatchInputSnapshot, deltaSeconds: number): void {
    if (this.isRoundOver) {
      return;
    }

    if (this.resolveVehicleMotionState(deltaSeconds)) {
      return;
    }

    this.updateActiveProjectileOrTurn(input, deltaSeconds);
  }

  private resolveVehicleMotionState(deltaSeconds: number): boolean {
    const motionEvents = this.updateVehicleMotions(deltaSeconds);
    if (this.options.vehicleSettlementController.hasActiveVehicleMotion(this.vehicles)) {
      this.options.frameBattlefield(0);
      this.options.drawWorld();
      return true;
    }

    if (this.waitingForVehicleMotionResolution) {
      this.waitingForVehicleMotionResolution = false;
      this.queuePostMotionResolution(900);
      this.options.drawWorld();
      return true;
    }

    if (motionEvents.length > 0) {
      this.queuePostMotionResolution(900);
      this.options.drawWorld();
      return true;
    }

    return false;
  }

  activeVehicle(): VehicleState | undefined {
    return this.matchController.activeVehicle(
      this.vehicles,
      this.turnController.turnOrder,
      this.turnController.activeTurnIndex,
    );
  }

  isMovable(vehicle: VehicleState): boolean {
    return !vehicle.motion && this.matchController.isMovable(vehicle, this.turnController.turnOrder);
  }

  aliveTeams(): Set<TeamId> {
    return this.matchController.aliveTeams(this.vehicles);
  }

  winningTeam(): TeamId | undefined {
    return this.matchController.winningTeam(this.vehicles);
  }

  toggleSoundMuted(): boolean {
    return this.soundController.toggleMuted();
  }

  setShotResult(shotResult: string): void {
    this.resultText = shotResult;
  }

  private get vehicles(): VehicleState[] {
    return this.options.vehicles();
  }

  private updateActiveProjectileOrTurn(input: MatchInputSnapshot, deltaSeconds: number): void {
    if (this.resolveProjectileOrCommittedTurn(deltaSeconds)) {
      return;
    }

    const active = this.activeMovableVehicleOrAdvance();
    if (!active) {
      return;
    }

    if (this.tickActiveTurn(active, deltaSeconds)) {
      return;
    }

    this.handleActiveTurnInput(active, input, deltaSeconds);
  }

  private resolveProjectileOrCommittedTurn(deltaSeconds: number): boolean {
    if (this.projectileState) {
      this.updateProjectile(deltaSeconds);
      this.options.drawWorld();
      return true;
    }

    if (this.turnController.isCommitted) {
      this.options.drawWorld();
      return true;
    }

    return false;
  }

  private activeMovableVehicleOrAdvance(): VehicleState | undefined {
    const active = this.activeVehicle() ?? this.vehicles[0];
    if (!active || !this.isMovable(active)) {
      this.advanceTurn();
      return undefined;
    }

    return active;
  }

  private tickActiveTurn(active: VehicleState, deltaSeconds: number): boolean {
    const tickResult = this.turnController.tick(deltaSeconds);
    this.soundController.updateTurnTick({
      activeVehicleId: active.id,
      turnTime: this.turnController.turnTime,
      canAct: true,
    });
    if (tickResult !== "timed-out") {
      return false;
    }

    this.resultText = `${active.username} timed out.`;
    this.advanceTurn();
    return true;
  }

  private handleActiveTurnInput(active: VehicleState, input: MatchInputSnapshot, deltaSeconds: number): void {
    this.playerActionController.handleChargeInput(active, input, deltaSeconds);
    if (this.turnController.isCommitted || this.projectileState) {
      this.options.drawWorld();
      return;
    }

    this.playerMovedThisFrame = false;
    this.playerActionController.handleVehicleInput(active, input, deltaSeconds);
    this.soundController.updateMovement({
      moving: this.playerMovedThisFrame,
      deltaSeconds,
    });
    this.options.drawWorld();
  }

  private fire(active: VehicleState, power: number): void {
    this.turnController.commitTurn();
    const shot = this.shotFlowController.fire(active, power);
    this.projectileState = shot.projectile;
    this.resultText = shot.shotResult;
    this.soundController.playWeaponFire(active.classId);
  }

  private updateProjectile(deltaSeconds: number): void {
    const result = updateSceneProjectile({
      projectile: this.projectileState,
      vehicles: this.vehicles,
      wind: this.turnController.wind,
      deltaSeconds,
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

  private updateVehicleMotions(deltaSeconds: number): string[] {
    const motionEvents = updateVehicleMotionsForScene({
      vehicles: this.vehicles,
      deltaSeconds,
      vehicleSettlementController: this.options.vehicleSettlementController,
      addVoidDropMarker: (vehicle) => {
        this.options.addCombatMarkerForVehicle(vehicle, "bunged", "VOID DROPPED");
      },
      playVoidDrop: () => this.soundController.playVoidDrop(),
    });

    if (motionEvents.length > 0) {
      this.resultText = motionEvents.join(" / ");
    }
    return motionEvents;
  }

  private queuePostMotionResolution(delayMs: number): void {
    const action = this.winningTeam() ? () => this.endRound() : () => this.advanceTurn();
    this.options.roundEventScheduler.queue(delayMs, action);
  }

}
