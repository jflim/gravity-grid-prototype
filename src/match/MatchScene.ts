import Phaser from "phaser";
import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import type { TeamId } from "../../shared/model/gameTypes.js";
import {
  AIM_SPEED_DEG_PER_SECOND,
  BUNGER_CRATER_RADIUS,
  BUNGER_DAMAGE_RADIUS,
  BUNGER_KNOCKBACK,
  CHARGE_RATE_PER_SECOND,
  COMBAT_MARKER_SECONDS,
  CRATER_RADIUS,
  DAMAGE_RADIUS,
  DEATH_SURFACE_Y,
  DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  GRAVITY,
  IMPACT_PREVIEW_SECONDS,
  MAX_CLIMB_SLOPE,
  MAX_ELEVATION_DEG,
  MAX_HP,
  MAX_MOVE_UNITS,
  MAX_POWER,
  MAX_TERRAIN_SPRITE_TILT_DEG,
  MIN_ELEVATION_DEG,
  MIN_FIRE_POWER,
  MOVE_MAX_X,
  MOVE_MIN_X,
  MOVE_PIXELS_PER_UNIT,
  MOVE_SPEED_PIXELS_PER_SECOND,
  PROJECTILE_RADIUS,
  PROJECTILE_MUZZLE_DISTANCE,
  PROJECTILE_MUZZLE_Y_OFFSET,
  PROJECTILE_OUT_OF_BOUNDS_LOWER_Y_MARGIN,
  PROJECTILE_OUT_OF_BOUNDS_UPPER_Y_MARGIN,
  SETTLEMENT_MAX_SLOPE_ITERATIONS,
  SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  SETTLEMENT_SLOPE_STEP,
  SETTLEMENT_SLOPE_THRESHOLD,
  SHOT_SPEED_MAX,
  SHOT_SPEED_MIN,
  TERRAIN_CHANGE_SETTLE_PADDING,
  TERRAIN_STEP,
  TURN_SECONDS,
  VEHICLE_HALF_HEIGHT,
  VEHICLE_HALF_WIDTH,
  VOID_DROP_HORIZONTAL_PADDING,
  VOID_SURFACE_Y,
  V1_WORLD_HEIGHT as WORLD_HEIGHT,
  V1_WORLD_WIDTH as WORLD_WIDTH,
  WIND_FORCE,
} from "../../shared/v1/tuning.js";
import {
  scaleBattlefieldDisplay,
} from "../combatPresentation";
import {
  DRAMATIC_VOID_DROP_FALL_SECONDS,
  requiredVoidZoneHeight,
} from "../voidDropPresentation";
import {
  getGameViewportSize,
  isSupportedGameViewport,
  shouldShowCombatHulls,
  shouldUseConceptPreviewAssets,
  shouldUseStyleReferenceBackground,
} from "../demoLayout";
import { buildMatchAssetLoadPlan, MatchAssetLoader } from "./MatchAssetLoader";
import { ImpactController } from "./ImpactController";
import { MatchCameraController } from "./MatchCameraController";
import { MatchController } from "./MatchController";
import { ProjectileController } from "./ProjectileController";
import { RoundBuilder } from "./RoundBuilder";
import { RoundEventScheduler } from "./RoundEventScheduler";
import { ShotFlowController } from "./ShotFlowController";
import { TerrainController } from "./TerrainController";
import { TurnController } from "./TurnController";
import { VehicleGeometry } from "./VehicleGeometry";
import { VehicleSettlementController } from "./VehicleSettlementController";
import { VoidZoneController } from "./VoidZoneController";
import { MatchView } from "./MatchView";
import { createMatchViewCollaborators } from "./MatchViewFactory";
import { MatchViewStateBuilder } from "./MatchViewStateBuilder";
import { PlayerActionController } from "./PlayerActionController";
import { MatchInputController, type MatchInputSnapshot } from "./MatchInputController";
import type {
  ImpactPreview,
  ProjectileState,
  VehicleState,
} from "./MatchTypes";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  playableMapById,
  type PlayableTerrain,
} from "../playableMaps";
const VOID_DROP_DISPLAY_SIZE = scaleBattlefieldDisplay({ width: 354, height: 212 });
const VISIBLE_VOID_ZONE_HEIGHT = requiredVoidZoneHeight(VOID_DROP_DISPLAY_SIZE);
const FALLBACK_VISIBLE_VOID_TOP_Y = WORLD_HEIGHT - VISIBLE_VOID_ZONE_HEIGHT;
const WORLD_RENDER_HEIGHT = WORLD_HEIGHT + VISIBLE_VOID_ZONE_HEIGHT;
const VEHICLE_SETTLEMENT_TUNING = {
  vehicleHalfWidth: VEHICLE_HALF_WIDTH,
  vehicleHalfHeight: VEHICLE_HALF_HEIGHT,
  moveMinX: MOVE_MIN_X,
  moveMaxX: MOVE_MAX_X,
  deathSurfaceY: DEATH_SURFACE_Y,
  terrainChangePadding: TERRAIN_CHANGE_SETTLE_PADDING,
  slopeSampleDistance: SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  slopeThreshold: SETTLEMENT_SLOPE_THRESHOLD,
  slopeStep: SETTLEMENT_SLOPE_STEP,
  maxSlopeIterations: SETTLEMENT_MAX_SLOPE_ITERATIONS,
};
const USE_UNIT_CONCEPT_PREVIEW = shouldUseConceptPreviewAssets(window.location.search);
const USE_STYLE_REFERENCE_BACKGROUND = shouldUseStyleReferenceBackground(window.location.search);
const MATCH_ASSET_LOAD_PLAN = buildMatchAssetLoadPlan({
  includeConceptPreviewAssets: USE_UNIT_CONCEPT_PREVIEW,
  includeStyleReferenceBackground: USE_STYLE_REFERENCE_BACKGROUND,
});

const EMPTY_MATCH_INPUT: MatchInputSnapshot = {
  aimUp: false,
  aimDown: false,
  moveLeft: false,
  moveRight: false,
  chargeHeld: false,
  resetPressed: false,
  collisionZonesTogglePressed: false,
};

export class MatchScene extends Phaser.Scene {
  private readonly matchController = new MatchController();
  private readonly vehicleGeometry = new VehicleGeometry();
  private readonly impactController = new ImpactController({
    craterRadius: CRATER_RADIUS,
    bungerCraterRadius: BUNGER_CRATER_RADIUS,
    damageRadius: DAMAGE_RADIUS,
    bungerDamageRadius: BUNGER_DAMAGE_RADIUS,
    bungerKnockback: BUNGER_KNOCKBACK,
    moveMinX: MOVE_MIN_X,
    moveMaxX: MOVE_MAX_X,
    impactPreviewSeconds: IMPACT_PREVIEW_SECONDS,
  });
  private readonly projectileController = new ProjectileController({
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
  private readonly shotFlowController = new ShotFlowController({
    projectileController: this.projectileController,
    impactController: this.impactController,
    surfaceAt: (x) => this.surfaceAt(x),
    hitZoneFor: (vehicle) => this.vehicleHitZoneFor(vehicle),
    makeCrater: (x, y, radius, depthFactor) => this.makeCrater(x, y, radius, depthFactor),
    settleVehicles: (options) => this.vehicleSettlementController.settleVehicles(this.vehicles, options),
    addCombatMarker: (vehicle, kind, label, slot) => {
      this.matchView?.addCombatMarkerForVehicle(vehicle, kind, label, slot);
    },
    recenterForProjectileIfNeeded: (projectile) => {
      this.cameraController?.recenterForProjectileIfNeeded(projectile);
    },
    winningTeam: () => this.winningTeam(),
  });
  private readonly turnController = new TurnController({
    turnSeconds: TURN_SECONDS,
    windSource: () => Phaser.Math.FloatBetween(-1, 1),
  });
  private readonly roundBuilder = new RoundBuilder({
    maxHp: MAX_HP,
    maxMoveUnits: MAX_MOVE_UNITS,
    worldWidth: WORLD_WIDTH,
    spawnFlattenWidth: 150,
    defaultTerrainBreakthroughY: DEFAULT_TERRAIN_BREAKTHROUGH_Y,
    fallbackVisibleVoidTopY: FALLBACK_VISIBLE_VOID_TOP_Y,
  });
  private readonly terrainController = new TerrainController({
    worldWidth: WORLD_WIDTH,
    voidSurfaceY: VOID_SURFACE_Y,
    vehicleHalfWidth: VEHICLE_HALF_WIDTH,
    deathSurfaceY: DEATH_SURFACE_Y,
    maxTerrainSpriteTiltDeg: MAX_TERRAIN_SPRITE_TILT_DEG,
  });
  private readonly playerActionController = new PlayerActionController({
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
    surfaceAt: (x) => this.surfaceAt(x),
    placeVehicleOnSurface: (vehicle) => this.vehicleSettlementController.placeVehicleOnSurface(vehicle),
    chargeState: () => ({
      isCharging: this.turnController.isCharging,
      charge: this.turnController.charge,
    }),
    setChargeState: (charge) => this.turnController.setChargeState(charge),
    fire: (vehicle, power) => this.fire(vehicle, power),
    resetCharge: () => this.turnController.resetCharge(),
    onVehicleMoved: () => this.frameBattlefield(0),
    onVehicleDroveIntoVoid: (vehicle) => {
      this.shotResult = `${vehicle.username} drove into the void.`;
    },
  });
  private vehicles: VehicleState[] = [];
  private projectile?: ProjectileState;
  private impactPreview?: ImpactPreview;
  private shotResult = "";
  private roundOver = false;
  private showCombatHulls = shouldShowCombatHulls(window.location.search);

  private inputController?: MatchInputController;
  private cameraController?: MatchCameraController;
  private readonly voidZoneController = new VoidZoneController({
    worldWidth: WORLD_WIDTH,
    terrainStep: TERRAIN_STEP,
    displaySize: VOID_DROP_DISPLAY_SIZE,
    visibleVoidZoneHeight: VISIBLE_VOID_ZONE_HEIGHT,
    horizontalPadding: VOID_DROP_HORIZONTAL_PADDING,
    fallDurationSeconds: DRAMATIC_VOID_DROP_FALL_SECONDS,
  });
  private readonly vehicleSettlementController = new VehicleSettlementController({
    tuning: VEHICLE_SETTLEMENT_TUNING,
    visibleVoidTopY: () => this.terrainController.visibleVoidTopY,
    terrainBreakthroughY: () => this.terrainBreakthroughY(),
    surfaceAt: (x) => this.surfaceAt(x),
    createVoidDropPresentation: (input) => this.voidZoneController.createVoidDropPresentation(input),
  });
  private matchView?: MatchView;
  private readonly matchViewStateBuilder = new MatchViewStateBuilder();
  private readonly assetLoader = new MatchAssetLoader({
    scene: this,
    plan: MATCH_ASSET_LOAD_PLAN,
  });
  private readonly roundEventScheduler = new RoundEventScheduler({
    schedule: (delayMs, action) => this.time.delayedCall(delayMs, action),
  });

  constructor() {
    super("GravityGridScene");
  }

  preload(): void {
    this.assetLoader.preload();
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_RENDER_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_RENDER_HEIGHT);
    this.inputController = this.createInputController();
    this.cameraController = new MatchCameraController({
      scene: this,
      worldWidth: WORLD_WIDTH,
      worldRenderHeight: WORLD_RENDER_HEIGHT,
      frameBottomWorldY: () => this.visibleVoidBottomY(),
    });

    this.matchView = new MatchView({
      collaborators: createMatchViewCollaborators({
        scene: this,
        document,
        mountTarget: document.body,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        worldRenderHeight: WORLD_RENDER_HEIGHT,
        projectileRadius: PROJECTILE_RADIUS,
        showCombatHulls: this.showCombatHulls,
        useUnitConceptPreview: USE_UNIT_CONCEPT_PREVIEW,
        useStyleReferenceBackground: USE_STYLE_REFERENCE_BACKGROUND,
        moveMinX: MOVE_MIN_X,
        moveMaxX: MOVE_MAX_X,
        movePixelsPerUnit: MOVE_PIXELS_PER_UNIT,
        impactPreviewSeconds: IMPACT_PREVIEW_SECONDS,
        combatMarkerSeconds: COMBAT_MARKER_SECONDS,
        surfaceAt: (x) => this.surfaceAt(x),
        onCollisionZonesVisibleChange: (visible) => this.setCollisionZonesVisible(visible),
      }),
      worldWidth: WORLD_WIDTH,
      terrainStep: TERRAIN_STEP,
      surfaceAt: (x) => this.surfaceAt(x),
      isMovable: (vehicle) => this.isMovable(vehicle),
    });
    this.matchView.createBackground();
    this.startRound();
    this.cameraController.updateViewport();
    this.scale.on("resize", () => {
      this.cameraController?.updateViewport();
      this.frameBattlefield(0);
      this.drawWorld();
    });
  }

  update(_: number, deltaMs: number): void {
    if (!isSupportedGameViewport(getGameViewportSize(window, document.documentElement))) {
      return;
    }

    const dt = Math.min(deltaMs / 1000, 0.033);
    const input = this.inputController?.sample() ?? EMPTY_MATCH_INPUT;
    this.updateImpactPreview(dt);
    this.matchView?.update(dt);
    this.voidZoneController.updatePresentations(this.vehicles, dt);

    if (input.resetPressed) {
      this.startRound();
      return;
    }

    if (input.collisionZonesTogglePressed) {
      this.setCollisionZonesVisible(!this.showCombatHulls);
    }

    if (this.roundOver) {
      return;
    }

    if (this.projectile) {
      this.updateProjectile(dt);
      this.drawWorld();
      return;
    }

    if (this.turnController.isCommitted) {
      this.drawWorld();
      return;
    }

    const active = this.activeVehicle() ?? this.vehicles[0]!;
    if (!active || !this.isMovable(active)) {
      this.advanceTurn();
      return;
    }

    if (this.turnController.tick(dt) === "timed-out") {
      this.shotResult = `${active.username} timed out.`;
      this.advanceTurn();
      return;
    }

    this.playerActionController.handleChargeInput(active, input, dt);
    if (this.turnController.isCommitted || this.projectile) {
      this.drawWorld();
      return;
    }

    this.playerActionController.handleVehicleInput(active, input, dt);
    this.drawWorld();
  }

  private createInputController(): MatchInputController {
    return new MatchInputController({
      cursors: this.input.keyboard?.createCursorKeys(),
      spaceKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      resetKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      hullToggleKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      justDown: (key) => Phaser.Input.Keyboard.JustDown(key as Phaser.Input.Keyboard.Key),
    });
  }

  private setCollisionZonesVisible(visible: boolean): void {
    this.showCombatHulls = visible;
    this.matchView?.setCollisionZonesVisible(visible);
    this.shotResult = `Collision zones ${visible ? "shown" : "hidden"}.`;
    this.drawWorld();
  }

  private startRound(): void {
    this.roundEventScheduler.clear();
    this.roundOver = false;
    this.matchView?.clearCombatMarkers();
    const round = this.roundBuilder.build({
      playableTerrain: this.buildDefaultDemoMap(),
      units: DEMO_UNIT_DEFINITIONS,
    });
    this.terrainController.startRound({
      playableTerrain: round.playableTerrain,
      terrain: round.terrain,
      visibleVoidTopY: round.visibleVoidTopY,
    });
    this.vehicles = round.vehicles;
    this.turnController.startRound(round.turnOrder);
    this.projectile = undefined;
    this.impactPreview = undefined;
    this.shotResult = round.shotResult;
    this.vehicleSettlementController.settleVehicles(this.vehicles);
    this.beginTurn();
    this.drawWorld();
  }

  private buildDefaultDemoMap(): PlayableTerrain {
    return buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), { voidSurfaceY: VOID_SURFACE_Y });
  }

  private beginTurn(): void {
    const active = this.activeVehicle();
    if (!active) {
      return;
    }

    this.turnController.beginTurn();
    this.prepareStartedTurn(active);
  }

  private prepareStartedTurn(active: VehicleState): void {
    active.moveUnits = MAX_MOVE_UNITS;
    this.impactPreview = undefined;
    this.cameras.main.stopFollow();
    this.frameBattlefield(450);
  }

  private activeVehicle(): VehicleState | undefined {
    return this.matchController.activeVehicle(
      this.vehicles,
      this.turnController.turnOrder,
      this.turnController.activeTurnIndex,
    );
  }

  private fire(active: VehicleState, power: number): void {
    this.turnController.commitTurn();
    const shot = this.shotFlowController.fire(active, power);
    this.projectile = shot.projectile;
    this.shotResult = shot.shotResult;
  }

  private updateProjectile(dt: number): void {
    if (!this.projectile) {
      return;
    }

    const result = this.shotFlowController.advanceProjectile({
      projectile: this.projectile,
      vehicles: this.vehicles,
      wind: this.turnController.wind,
      deltaSeconds: dt,
    });

    if (result.kind === "in-flight") {
      return;
    }

    this.projectile = result.projectile;
    this.impactPreview = result.impactPreview;
    this.shotResult = result.shotResult;
    const action = result.nextEvent.kind === "end-round" ? () => this.endRound() : () => this.advanceTurn();
    this.roundEventScheduler.queue(result.nextEvent.delayMs, action);
  }

  private makeCrater(centerX: number, centerY: number, radius: number, depthFactor = 0.74): void {
    this.terrainController.makeCrater({
      x: centerX,
      y: centerY,
      radius,
      depthFactor,
      breakthroughY: this.terrainBreakthroughY(),
    });
  }

  private advanceTurn(): void {
    if (this.roundOver) {
      return;
    }

    this.projectile = undefined;
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

  private isMovable(vehicle: VehicleState): boolean {
    return this.matchController.isMovable(vehicle, this.turnController.turnOrder);
  }

  private isAlive(vehicle: VehicleState): boolean {
    return this.matchController.isAlive(vehicle);
  }

  private aliveTeams(): Set<TeamId> {
    return this.matchController.aliveTeams(this.vehicles);
  }

  private winningTeam(): TeamId | undefined {
    return this.matchController.winningTeam(this.vehicles);
  }

  private endRound(): void {
    if (this.roundOver) {
      return;
    }

    this.roundEventScheduler.clear();
    this.roundOver = true;
    this.projectile = undefined;
    this.turnController.endRound();

    const winner = this.winningTeam();
    this.shotResult = winner
      ? `${winner.toUpperCase()} team wins the round. Next round starting...`
      : "Draw. New round starting...";
    this.drawWorld();
    this.roundEventScheduler.queue(2400, () => this.startRound());
  }

  private frameBattlefield(duration = 0): void {
    const aliveVehicles = this.vehicles.filter((vehicle) => vehicle.alive);
    this.cameraController?.frameBattlefield(
      aliveVehicles.map((vehicle) => vehicle.x),
      duration,
    );
  }

  private surfaceAt(x: number): number {
    return this.terrainController.surfaceAt(x);
  }

  private terrainBreakthroughY(): number {
    return this.voidZoneController.terrainBreakthroughY(this.terrainController.visibleVoidTopY);
  }

  private terrainPlatformBottomY(): number {
    return this.voidZoneController.terrainPlatformBottomY(this.terrainController.visibleVoidTopY);
  }

  private visibleVoidBottomY(): number {
    return this.voidZoneController.visibleVoidBottomY(this.terrainController.visibleVoidTopY);
  }

  private voidDropTargetY(): number {
    return this.voidZoneController.voidDropTargetY(this.terrainController.visibleVoidTopY);
  }

  private terrainAngleAt(x: number): number {
    return this.terrainController.terrainAngleAt(x);
  }

  private updateImpactPreview(dt: number): void {
    if (!this.impactPreview) {
      return;
    }

    this.impactPreview.timeLeft -= dt;
    if (this.impactPreview.timeLeft <= 0) {
      this.impactPreview = undefined;
    }
  }

  private drawWorld(): void {
    this.matchView?.draw(this.matchViewStateBuilder.build({
      vehicles: this.vehicles,
      activeVehicle: this.activeVehicle(),
      projectile: this.projectile,
      impactPreview: this.impactPreview,
      currentMap: this.terrainController.currentMap,
      visibleVoidTopY: this.terrainController.visibleVoidTopY,
      visibleVoidBottomY: this.visibleVoidBottomY(),
      terrainPlatformBottomY: this.terrainPlatformBottomY(),
      terrainBreakthroughY: this.terrainBreakthroughY(),
      showCombatHulls: this.showCombatHulls,
      roundOver: this.roundOver,
      turnCommitted: this.turnController.isCommitted,
      charging: this.turnController.isCharging,
      charge: this.turnController.charge,
      turnTime: this.turnController.turnTime,
      cameraZoom: this.cameras.main.zoom,
      shotResult: this.shotResult,
      aliveTeamCount: this.aliveTeams().size,
      winningTeam: this.winningTeam(),
      wind: this.turnController.wind,
    }));
  }

  private vehicleHitZoneFor(vehicle: VehicleState): VehicleHitZone {
    return this.vehicleGeometry.hitZoneFor(vehicle);
  }
}

