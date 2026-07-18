import Phaser from "phaser";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import {
  COMBAT_MARKER_SECONDS,
  DEATH_SURFACE_Y,
  DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  IMPACT_PREVIEW_SECONDS,
  MAX_HP,
  MAX_MOVE_UNITS,
  MAX_TERRAIN_SPRITE_TILT_DEG,
  MOVE_MAX_X,
  MOVE_MIN_X,
  MOVE_PIXELS_PER_UNIT,
  PROJECTILE_RADIUS,
  SETTLEMENT_MAX_SLOPE_ITERATIONS,
  SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  SETTLEMENT_SLOPE_STEP,
  SETTLEMENT_SLOPE_THRESHOLD,
  TERRAIN_CHANGE_SETTLE_PADDING,
  TERRAIN_STEP,
  VEHICLE_FALL_GRAVITY_PIXELS_PER_SECOND_SQUARED,
  VEHICLE_HALF_HEIGHT,
  VEHICLE_HALF_WIDTH,
  VEHICLE_MAX_FALL_SPEED_PIXELS_PER_SECOND,
  VEHICLE_SLIDE_SPEED_PIXELS_PER_SECOND,
  VOID_DROP_HORIZONTAL_PADDING,
  VOID_SURFACE_Y,
  V1_WORLD_HEIGHT as WORLD_HEIGHT,
  V1_WORLD_WIDTH as WORLD_WIDTH,
} from "../../shared/v1/tuning.js";
import { scaleBattlefieldDisplay } from "../combatPresentation";
import { DRAMATIC_VOID_DROP_FALL_SECONDS, requiredVoidZoneHeight } from "../voidDropPresentation";
import {
  getGameViewportSize,
  isSupportedGameViewport,
  shouldShowCombatHulls,
  shouldUseConceptPreviewAssets,
  shouldUseStyleReferenceBackground,
} from "../demoLayout";
import { buildMatchAssetLoadPlan, MatchAssetLoader } from "./MatchAssetLoader";
import { MatchCameraController } from "./MatchCameraController";
import { MatchSceneOnlineVehicleSync } from "./MatchSceneOnlineVehicleSync";
import type { MatchSceneRoundSetup } from "./OnlineMatchSetup";
import { RoundBuilder } from "./RoundBuilder";
import { RoundEventScheduler } from "./RoundEventScheduler";
import { MatchSceneShotFlow } from "./MatchSceneShotFlow";
import { MatchSceneTerrainAdapter } from "./MatchSceneTerrainAdapter";
import { TerrainController } from "./TerrainController";
import { VehicleGeometry } from "./VehicleGeometry";
import { VehicleSettlementController } from "./VehicleSettlementController";
import { VoidZoneController } from "./VoidZoneController";
import { MatchView } from "./MatchView";
import { createMatchViewCollaborators } from "./MatchViewFactory";
import { MatchViewStateBuilder } from "./MatchViewStateBuilder";
import { EMPTY_MATCH_INPUT, MatchInputController, type MatchInputSnapshot } from "./MatchInputController";
import type { MatchTurnIntentPublisher } from "./MatchTurnIntents";
import type { RoomSnapshot } from "../onlineLobbySnapshot";
import type { VehicleState } from "./MatchTypes";
import {
  buildPlayableTerrain,
  demoMapIdFromSearch,
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
const VEHICLE_MOTION_TUNING = {
  slideSpeedPixelsPerSecond: VEHICLE_SLIDE_SPEED_PIXELS_PER_SECOND,
  fallGravityPixelsPerSecondSquared: VEHICLE_FALL_GRAVITY_PIXELS_PER_SECOND_SQUARED,
  maxFallSpeedPixelsPerSecond: VEHICLE_MAX_FALL_SPEED_PIXELS_PER_SECOND,
};
const USE_UNIT_CONCEPT_PREVIEW = shouldUseConceptPreviewAssets(window.location.search);
const USE_STYLE_REFERENCE_BACKGROUND = shouldUseStyleReferenceBackground(window.location.search);
const MATCH_ASSET_LOAD_PLAN = buildMatchAssetLoadPlan({
  includeConceptPreviewAssets: USE_UNIT_CONCEPT_PREVIEW,
  includeStyleReferenceBackground: USE_STYLE_REFERENCE_BACKGROUND,
});

export type MatchSceneOptions = {
  initialRoundSetup?: MatchSceneRoundSetup;
  turnIntentPublisher?: MatchTurnIntentPublisher;
  onlineLocalSessionId?: string;
  onlineStateSubscriber?: (applySnapshot: (snapshot: RoomSnapshot) => void) => void;
};

export class MatchScene extends Phaser.Scene {
  private readonly vehicleGeometry = new VehicleGeometry();
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
  private readonly voidZoneController = new VoidZoneController({
    worldWidth: WORLD_WIDTH,
    terrainStep: TERRAIN_STEP,
    displaySize: VOID_DROP_DISPLAY_SIZE,
    visibleVoidZoneHeight: VISIBLE_VOID_ZONE_HEIGHT,
    horizontalPadding: VOID_DROP_HORIZONTAL_PADDING,
    fallDurationSeconds: DRAMATIC_VOID_DROP_FALL_SECONDS,
  });
  private readonly terrainAdapter = new MatchSceneTerrainAdapter({
    terrainController: this.terrainController,
    voidZoneController: this.voidZoneController,
  });
  private readonly vehicleSettlementController = new VehicleSettlementController({
    tuning: VEHICLE_SETTLEMENT_TUNING,
    motionTuning: VEHICLE_MOTION_TUNING,
    visibleVoidTopY: () => this.terrainAdapter.visibleVoidTopY,
    terrainBreakthroughY: () => this.terrainAdapter.terrainBreakthroughY(),
    surfaceAt: (x) => this.terrainAdapter.surfaceAt(x),
    hitZoneBottom: (vehicle) => {
      const hitZone = this.vehicleGeometry.hitZoneFor(vehicle);
      return hitZone.centerY + hitZone.height / 2;
    },
    createVoidDropPresentation: (input) => this.voidZoneController.createVoidDropPresentation(input),
  });
  private readonly roundEventScheduler = new RoundEventScheduler({
    schedule: (delayMs, action) => this.time.delayedCall(delayMs, action),
  });
  private vehicles: VehicleState[] = [];
  private showCombatHulls = shouldShowCombatHulls(window.location.search);

  private inputController?: MatchInputController;
  private cameraController?: MatchCameraController;
  private matchView?: MatchView;
  private readonly shotFlow: MatchSceneShotFlow;
  private readonly matchViewStateBuilder = new MatchViewStateBuilder();
  private readonly assetLoader = new MatchAssetLoader({
    scene: this,
    plan: MATCH_ASSET_LOAD_PLAN,
  });
  private readonly initialRoundSetup?: MatchSceneRoundSetup;
  private readonly onlineVehicleSync: MatchSceneOnlineVehicleSync;
  private readonly onlineStateSubscriber?: (applySnapshot: (snapshot: RoomSnapshot) => void) => void;

  constructor(options: MatchSceneOptions = {}) {
    super("GravityGridScene");
    this.initialRoundSetup = options.initialRoundSetup;
    this.onlineVehicleSync = new MatchSceneOnlineVehicleSync({
      localSessionId: options.onlineLocalSessionId,
      clientTimeMs: () => (Number.isFinite(this.time.now) ? this.time.now : performance.now()),
    });
    this.onlineStateSubscriber = options.onlineStateSubscriber;
    this.shotFlow = new MatchSceneShotFlow({
      terrain: this.terrainAdapter,
      vehicleSettlementController: this.vehicleSettlementController,
      roundEventScheduler: this.roundEventScheduler,
      windSource: () => Phaser.Math.FloatBetween(-1, 1),
      vehicles: () => this.vehicles,
      hitZoneFor: (vehicle) => this.vehicleGeometry.hitZoneFor(vehicle),
      addCombatMarkerForVehicle: (vehicle, kind, label, slot) => {
        this.matchView?.addCombatMarkerForVehicle(vehicle, kind, label, slot);
      },
      recenterForProjectileIfNeeded: (projectile) => {
        this.cameraController?.recenterForProjectileIfNeeded(projectile);
      },
      frameBattlefield: (duration = 0) => this.frameBattlefield(duration),
      stopCameraFollow: () => this.cameras.main.stopFollow(),
      drawWorld: () => this.drawWorld(),
      restartRound: () => this.startRound(),
      turnIntentPublisher: options.turnIntentPublisher,
    });
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
      frameBottomWorldY: () => this.terrainAdapter.visibleVoidBottomY(),
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
        surfaceAt: (x) => this.terrainAdapter.surfaceAt(x),
        onCollisionZonesVisibleChange: (visible) => this.setCollisionZonesVisible(visible),
      }),
      worldWidth: WORLD_WIDTH,
      terrainStep: TERRAIN_STEP,
      surfaceAt: (x) => this.terrainAdapter.surfaceAt(x),
      isMovable: (vehicle) => this.shotFlow.isMovable(vehicle),
    });
    this.matchView.createBackground();
    this.startRound();
    this.onlineStateSubscriber?.((snapshot) => this.applyOnlineSnapshot(snapshot));
    this.cameraController.updateViewport();
    this.scale.on("resize", () => {
      this.cameraController?.updateViewport();
      this.frameBattlefield(0);
      this.drawWorld();
    });
  }

  update(_: number, deltaMs: number): void {
    if (!this.canUpdateFrame()) return;

    const dt = Math.min(deltaMs / 1000, 0.033);
    this.updateSupportedFrame(dt);
  }

  private canUpdateFrame(): boolean { return isSupportedGameViewport(getGameViewportSize(window, document.documentElement)); }

  private updateSupportedFrame(dt: number): void {
    const input = this.inputController?.sample() ?? EMPTY_MATCH_INPUT;
    this.shotFlow.updateImpactPreview(dt);
    this.matchView?.update(dt);
    this.voidZoneController.updatePresentations(this.vehicles, dt);
    if (this.onlineVehicleSync.update(this.vehicles, dt)) {
      this.drawWorld();
    }

    if (this.handleSceneCommandInput(input)) {
      return;
    }

    this.shotFlow.updateActiveRound(input, dt);
  }

  private createInputController(): MatchInputController {
    return new MatchInputController({
      cursors: this.input.keyboard?.createCursorKeys(),
      spaceKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      resetKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      hullToggleKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      soundMuteKey: this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      justDown: (key) => Phaser.Input.Keyboard.JustDown(key as Phaser.Input.Keyboard.Key),
    });
  }

  private handleSceneCommandInput(input: MatchInputSnapshot): boolean {
    if (input.resetPressed) {
      this.startRound();
      return true;
    }

    if (input.collisionZonesTogglePressed) {
      this.setCollisionZonesVisible(!this.showCombatHulls);
    }

    if (input.soundMuteTogglePressed) {
      this.setSoundMuted(this.shotFlow.toggleSoundMuted());
    }

    return false;
  }

  private setCollisionZonesVisible(visible: boolean): void {
    this.showCombatHulls = visible;
    this.matchView?.setCollisionZonesVisible(visible);
    this.shotFlow.setShotResult(`Collision zones ${visible ? "shown" : "hidden"}.`);
    this.drawWorld();
  }

  private setSoundMuted(muted: boolean): void {
    this.shotFlow.setShotResult(`Sound ${muted ? "muted" : "on"}.`);
    this.drawWorld();
  }

  private applyOnlineSnapshot(snapshot: RoomSnapshot): void {
    const vehicleChanged = this.onlineVehicleSync.applySnapshot(this.vehicles, snapshot);
    const shotChanged = this.shotFlow.syncOnlineSnapshot(snapshot);
    if (vehicleChanged || shotChanged) this.drawWorld();
  }

  private startRound(): void {
    this.roundEventScheduler.clear();
    this.matchView?.clearCombatMarkers();
    const round = this.buildInitialRound();
    this.terrainController.startRound({
      playableTerrain: round.playableTerrain,
      terrain: round.terrain,
      visibleVoidTopY: round.visibleVoidTopY,
    });
    this.vehicles = round.vehicles;
    this.shotFlow.startRound(round.turnOrder, this.roundStartText(round.shotResult));
    this.vehicleSettlementController.settleVehicles(this.vehicles);
    this.shotFlow.beginTurn();
    this.drawWorld();
  }

  private buildInitialRound() {
    return this.roundBuilder.build({
      playableTerrain: this.buildInitialPlayableTerrain(),
      units: this.initialUnits(),
    });
  }

  private initialUnits() {
    return this.initialRoundSetup ? this.initialRoundSetup.units : DEMO_UNIT_DEFINITIONS;
  }

  private roundStartText(fallbackText: string): string {
    return this.initialRoundSetup ? this.initialRoundSetup.roundStartText : fallbackText;
  }

  private buildInitialPlayableTerrain(): PlayableTerrain {
    if (this.initialRoundSetup) {
      return buildPlayableTerrain(playableMapById(this.initialRoundSetup.mapId), { voidSurfaceY: VOID_SURFACE_Y });
    }

    return this.buildDefaultDemoMap();
  }

  private buildDefaultDemoMap(): PlayableTerrain {
    const demoMapId = demoMapIdFromSearch(window.location.search);
    return buildPlayableTerrain(playableMapById(demoMapId), { voidSurfaceY: VOID_SURFACE_Y });
  }

  private frameBattlefield(duration = 0): void {
    const aliveVehicles = this.vehicles.filter((vehicle) => vehicle.alive);
    this.cameraController?.frameBattlefield(
      aliveVehicles.map((vehicle) => vehicle.x),
      duration,
    );
  }

  private drawWorld(): void {
    const shot = this.shotFlow.viewState();
    this.matchView?.draw(this.matchViewStateBuilder.build({
      vehicles: this.vehicles,
      activeVehicle: this.shotFlow.activeVehicle(),
      projectile: shot.projectile,
      impactPreview: shot.impactPreview,
      currentMap: this.terrainAdapter.currentMap,
      visibleVoidTopY: this.terrainAdapter.visibleVoidTopY,
      visibleVoidBottomY: this.terrainAdapter.visibleVoidBottomY(),
      terrainPlatformBottomY: this.terrainAdapter.terrainPlatformBottomY(),
      terrainBreakthroughY: this.terrainAdapter.terrainBreakthroughY(),
      showCombatHulls: this.showCombatHulls,
      roundOver: shot.roundOver,
      turnCommitted: shot.turnCommitted,
      charging: shot.charging,
      charge: shot.charge,
      turnTime: shot.turnTime,
      localActiveTurn: shot.localActiveTurn,
      cameraZoom: this.cameras.main.zoom,
      shotResult: shot.shotResult,
      aliveTeamCount: this.shotFlow.aliveTeams().size,
      winningTeam: this.shotFlow.winningTeam(),
      wind: shot.wind,
    }));
  }
}

