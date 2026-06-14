import Phaser from "phaser";
import {
  aimAngleAfterInput,
  aimAngleForFacingChange,
  movementDirectionFromInput,
  resolveMovementStep,
  updateChargeState,
} from "../../shared/gameplay/movement.js";
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
import { COLLISION_ZONE_OVERLAY_DEPTH } from "../collisionOverlay";
import {
  DRAMATIC_VOID_DROP_FALL_SECONDS,
  requiredVoidZoneHeight,
} from "../voidDropPresentation";
import {
  getGameViewportSize,
  isSupportedGameViewport,
  readableWorldUiScale,
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
import { TerrainController } from "./TerrainController";
import { TurnController } from "./TurnController";
import { VehicleGeometry } from "./VehicleGeometry";
import { VehicleSettlementController } from "./VehicleSettlementController";
import { VoidZoneController } from "./VoidZoneController";
import { CommandDeck } from "./ui/CommandDeck";
import { EffectsRenderer } from "./rendering/EffectsRenderer";
import { CombatMarkerRenderer } from "./rendering/CombatMarkerRenderer";
import { ProjectileRenderer } from "./rendering/ProjectileRenderer";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { VehicleRenderer } from "./rendering/VehicleRenderer";
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
  private vehicles: VehicleState[] = [];
  private projectile?: ProjectileState;
  private impactPreview?: ImpactPreview;
  private shotResult = "";
  private roundOver = false;
  private pendingRoundEvent?: Phaser.Time.TimerEvent;
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
  private combatMarkerRenderer?: CombatMarkerRenderer;
  private effectsRenderer?: EffectsRenderer;
  private terrainRenderer?: TerrainRenderer;
  private projectileRenderer?: ProjectileRenderer;
  private vehicleRenderer?: VehicleRenderer;

  private terrainGfx!: Phaser.GameObjects.Graphics;
  private vehicleGfx!: Phaser.GameObjects.Graphics;
  private collisionGfx!: Phaser.GameObjects.Graphics;
  private projectileGfx!: Phaser.GameObjects.Graphics;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private impactGfx!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private rosterText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private windText!: Phaser.GameObjects.Text;
  private powerLabelText!: Phaser.GameObjects.Text;
  private powerHintText!: Phaser.GameObjects.Text;
  private aimDialText!: Phaser.GameObjects.Text;
  private movementLabelText!: Phaser.GameObjects.Text;
  private hudPortrait!: Phaser.GameObjects.Image;
  private commandDeck!: CommandDeck;
  private collisionZonesCheckbox?: HTMLInputElement;
  private readonly assetLoader = new MatchAssetLoader({
    scene: this,
    plan: MATCH_ASSET_LOAD_PLAN,
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

    this.createBackground();
    this.terrainGfx = this.add.graphics();
    this.aimGfx = this.add.graphics();
    this.impactGfx = this.add.graphics().setDepth(9);
    this.vehicleGfx = this.add.graphics();
    this.collisionGfx = this.add.graphics().setDepth(COLLISION_ZONE_OVERLAY_DEPTH);
    this.projectileGfx = this.add.graphics();
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.effectsRenderer = new EffectsRenderer(this.aimGfx, this.impactGfx, {
      worldHeight: WORLD_HEIGHT,
      moveMinX: MOVE_MIN_X,
      moveMaxX: MOVE_MAX_X,
      movePixelsPerUnit: MOVE_PIXELS_PER_UNIT,
      impactPreviewSeconds: IMPACT_PREVIEW_SECONDS,
      surfaceAt: (x) => this.surfaceAt(x),
    });
    this.terrainRenderer = new TerrainRenderer(this.terrainGfx);
    this.projectileRenderer = new ProjectileRenderer(this.projectileGfx, PROJECTILE_RADIUS);
    this.vehicleRenderer = new VehicleRenderer({
      scene: this,
      gfx: this.vehicleGfx,
      collisionGfx: this.collisionGfx,
      useUnitConceptPreview: USE_UNIT_CONCEPT_PREVIEW,
      surfaceAt: (x) => this.surfaceAt(x),
    });

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      color: "#f8fbff",
      stroke: "#10131b",
      strokeThickness: 4,
    };

    this.hudText = this.add.text(18, 16, "", textStyle).setScrollFactor(0).setDepth(51);
    this.rosterText = this.add.text(18, 70, "", textStyle).setScrollFactor(0).setDepth(51);
    this.eventText = this.add
      .text(18, 118, "", {
        ...textStyle,
        fontSize: "15px",
        color: "#ffd166",
      })
      .setScrollFactor(0)
      .setDepth(51);
    this.timerText = this.add
      .text(this.scale.width / 2, 12, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "42px",
        color: "#ffffff",
        stroke: "#0b1020",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(52);
    this.windText = this.add
      .text(24, 16, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "30px",
        fontStyle: "700",
        color: "#8be9ff",
        stroke: "#0b1020",
        strokeThickness: 7,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(52);
    this.powerLabelText = this.add
      .text(this.scale.width / 2, this.scale.height - 88, "SHOT POWER", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(52);
    this.powerHintText = this.add
      .text(this.scale.width / 2, this.scale.height - 44, "", {
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: "13px",
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(52);
    this.aimDialText = this.add
      .text(this.scale.width - 142, 24, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "700",
        color: "#f8fbff",
        stroke: "#0b1020",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(52);
    this.movementLabelText = this.add
      .text(this.scale.width / 2, this.scale.height - 88, "MOVE UNITS", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
        color: "#b9ffd0",
        stroke: "#0b1020",
        strokeThickness: 4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(52);
    this.hudPortrait = this.add
      .image(0, 0, "nova-vehicle")
      .setScrollFactor(0)
      .setDepth(52)
      .setOrigin(0.5);
    this.commandDeck = new CommandDeck({
      scene: this,
      hudGfx: this.hudGfx,
      hudText: this.hudText,
      rosterText: this.rosterText,
      eventText: this.eventText,
      timerText: this.timerText,
      windText: this.windText,
      powerLabelText: this.powerLabelText,
      powerHintText: this.powerHintText,
      aimDialText: this.aimDialText,
      movementLabelText: this.movementLabelText,
      hudPortrait: this.hudPortrait,
    });
    this.combatMarkerRenderer = new CombatMarkerRenderer({
      scene: this,
      durationSeconds: COMBAT_MARKER_SECONDS,
      unitConceptPreview: USE_UNIT_CONCEPT_PREVIEW,
      worldUiScale: () => readableWorldUiScale(this.cameras.main.zoom),
    });

    this.mountCollisionZonesToggle();
    this.startRound();
    this.cameraController.updateViewport();
    this.scale.on("resize", () => {
      this.cameraController?.updateViewport();
      this.frameBattlefield(0);
      this.drawHud();
    });
  }

  update(_: number, deltaMs: number): void {
    if (!isSupportedGameViewport(getGameViewportSize(window, document.documentElement))) {
      return;
    }

    const dt = Math.min(deltaMs / 1000, 0.033);
    const input = this.inputController?.sample() ?? EMPTY_MATCH_INPUT;
    this.updateImpactPreview(dt);
    this.combatMarkerRenderer?.update(dt);
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

    this.handleChargeInput(active, input, dt);
    if (this.turnController.isCommitted || this.projectile) {
      this.drawWorld();
      return;
    }

    this.handleVehicleInput(active, input, dt);
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

  private createBackground(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_RENDER_HEIGHT / 2, WORLD_WIDTH, WORLD_RENDER_HEIGHT, 0x111827);
    if (USE_STYLE_REFERENCE_BACKGROUND && this.textures.exists("style-reference")) {
      const reference = this.add
        .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "style-reference")
        .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
        .setAlpha(0.08);
      reference.setTint(0x8bd7ff);
    }

    const horizon = this.add.graphics();
    horizon.fillStyle(0x171f32, 0.45);
    horizon.fillRect(0, 390, WORLD_WIDTH, WORLD_HEIGHT - 390);
    horizon.lineStyle(3, 0x42d9ff, 0.2);
    horizon.lineBetween(0, 390, WORLD_WIDTH, 390);

    const lowerLayer = this.add.graphics();
    lowerLayer.lineStyle(2, 0x27506f, 0.14);
    for (let y = 548; y < WORLD_RENDER_HEIGHT; y += 46) {
      lowerLayer.lineBetween(0, y, WORLD_WIDTH, y + Math.sin(y * 0.023) * 18);
    }
    lowerLayer.lineStyle(2, 0xffd166, 0.08);
    for (let x = 80; x < WORLD_WIDTH; x += 170) {
      lowerLayer.lineBetween(x, 540, x - 90, WORLD_RENDER_HEIGHT);
    }
    lowerLayer.fillStyle(0xdff9ff, 0.18);
    for (let x = 52; x < WORLD_WIDTH; x += 137) {
      const y = 575 + ((x * 37) % 260);
      lowerLayer.fillRect(x, y, 4, 18);
    }
  }

  private mountCollisionZonesToggle(): void {
    document.querySelector("[data-collision-zones-toggle]")?.remove();

    const label = document.createElement("label");
    label.className = "collision-zones-toggle";
    label.dataset.collisionZonesToggle = "true";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.showCombatHulls;
    input.setAttribute("aria-label", "Show collision zones");

    const text = document.createElement("span");
    text.textContent = "Collision zones";

    input.addEventListener("change", () => {
      this.setCollisionZonesVisible(input.checked);
    });

    label.append(input, text);
    document.body.append(label);
    this.collisionZonesCheckbox = input;
  }

  private setCollisionZonesVisible(visible: boolean): void {
    this.showCombatHulls = visible;
    if (this.collisionZonesCheckbox) {
      this.collisionZonesCheckbox.checked = visible;
    }
    this.shotResult = `Collision zones ${visible ? "shown" : "hidden"}.`;
    this.drawWorld();
  }

  private startRound(): void {
    this.pendingRoundEvent?.remove(false);
    this.pendingRoundEvent = undefined;
    this.roundOver = false;
    this.combatMarkerRenderer?.clear();
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

  private handleVehicleInput(active: VehicleState, input: MatchInputSnapshot, dt: number): void {
    active.angle = aimAngleAfterInput({
      angle: active.angle,
      facing: active.facing,
      aimUp: input.aimUp,
      aimDown: input.aimDown,
      deltaSeconds: dt,
      angleSpeedDegPerSecond: AIM_SPEED_DEG_PER_SECOND,
      minElevationDeg: MIN_ELEVATION_DEG,
      maxElevationDeg: MAX_ELEVATION_DEG,
    });

    const moveDirection = movementDirectionFromInput(input.moveLeft, input.moveRight);
    if (moveDirection !== 0) {
      this.setVehicleFacing(active, moveDirection);
    }

    if (active.moveUnits <= 0 || moveDirection === 0) {
      return;
    }

    const step = resolveMovementStep({
      x: active.x,
      moveUnits: active.moveUnits,
      direction: moveDirection,
      deltaSeconds: dt,
      moveSpeedPixelsPerSecond: MOVE_SPEED_PIXELS_PER_SECOND,
      movePixelsPerUnit: MOVE_PIXELS_PER_UNIT,
      minX: MOVE_MIN_X,
      maxX: MOVE_MAX_X,
      maxClimbSlope: MAX_CLIMB_SLOPE,
      fallSurfaceY: DEATH_SURFACE_Y,
      surfaceAt: (x) => this.surfaceAt(x),
    });

    if (step.moved) {
      active.x = step.x;
      this.vehicleSettlementController.placeVehicleOnSurface(active);
      active.moveUnits = step.moveUnits;
      if (!active.alive) {
        this.shotResult = `${active.username} drove into the void.`;
        this.turnController.resetCharge();
      }
      this.frameBattlefield(0);
    }
  }

  private setVehicleFacing(vehicle: VehicleState, facing: 1 | -1): void {
    if (vehicle.facing === facing) {
      return;
    }

    const nextAngle = aimAngleForFacingChange({
      currentAngle: vehicle.angle,
      currentFacing: vehicle.facing,
      nextFacing: facing,
      minElevationDeg: MIN_ELEVATION_DEG,
      maxElevationDeg: MAX_ELEVATION_DEG,
    });
    vehicle.facing = facing;
    vehicle.angle = nextAngle;
  }

  private handleChargeInput(active: VehicleState, input: MatchInputSnapshot, dt: number): void {
    const charge = updateChargeState({
      isCharging: this.turnController.isCharging,
      charge: this.turnController.charge,
      chargeHeld: input.chargeHeld,
      deltaSeconds: dt,
      chargeRatePerSecond: CHARGE_RATE_PER_SECOND,
      maxPower: MAX_POWER,
      minFirePower: MIN_FIRE_POWER,
    });

    this.turnController.setChargeState({
      isCharging: charge.isCharging,
      charge: charge.charge,
    });

    if (charge.firePower !== undefined) {
      this.fire(active, charge.firePower);
    }
  }

  private fire(active: VehicleState, power: number): void {
    this.turnController.commitTurn();
    this.projectile = this.projectileController.createProjectile(active, power);
    this.shotResult = `${active.username} fired.`;
  }

  private updateProjectile(dt: number): void {
    if (!this.projectile) {
      return;
    }

    const result = this.projectileController.advance({
      projectile: this.projectile,
      deltaSeconds: dt,
      wind: this.turnController.wind,
      targets: this.vehicles.map((vehicle) => ({
        id: vehicle.id,
        team: vehicle.team,
        alive: vehicle.alive,
        hitZone: this.vehicleHitZoneFor(vehicle),
      })),
      surfaceAt: (x) => this.surfaceAt(x),
    });

    this.cameraController?.recenterForProjectileIfNeeded(this.projectile);

    if (result.kind === "collision") {
      this.resolveImpact(result.collision.x, result.collision.y, result.collision.directHitId);
      return;
    }

    if (result.kind === "out-of-bounds") {
      this.shotResult = "Shot flew out of bounds.";
      this.projectile = undefined;
      this.queueRoundEvent(700, () => this.advanceTurn());
      return;
    }
  }

  private resolveImpact(x: number, y: number, directHitId?: string): void {
    const result = this.impactController.resolve({
      x,
      y,
      directHitId,
      projectile: this.projectile,
      vehicles: this.vehicles,
      hitZoneFor: (vehicle) => this.vehicleHitZoneFor(vehicle),
      makeCrater: (impactX, impactY, radius, depthFactor) => {
        this.makeCrater(impactX, impactY, radius, depthFactor);
      },
      settleVehicles: (options) => this.vehicleSettlementController.settleVehicles(this.vehicles, options),
      addCombatMarker: (vehicle, kind, label, slot) => {
        this.combatMarkerRenderer?.addForVehicle(vehicle, kind, label, slot);
      },
    });

    this.impactPreview = result.impactPreview;
    this.projectile = undefined;
    this.shotResult = result.shotResult;
    this.drawWorld();

    if (this.winningTeam()) {
      this.queueRoundEvent(900, () => this.endRound());
      return;
    }

    this.queueRoundEvent(900, () => this.advanceTurn());
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

    this.pendingRoundEvent?.remove(false);
    this.pendingRoundEvent = undefined;
    this.roundOver = true;
    this.projectile = undefined;
    this.turnController.endRound();

    const winner = this.winningTeam();
    this.shotResult = winner
      ? `${winner.toUpperCase()} team wins the round. Next round starting...`
      : "Draw. New round starting...";
    this.drawWorld();
    this.queueRoundEvent(2400, () => this.startRound());
  }

  private queueRoundEvent(delayMs: number, action: () => void): void {
    this.pendingRoundEvent?.remove(false);
    this.pendingRoundEvent = this.time.delayedCall(delayMs, () => {
      this.pendingRoundEvent = undefined;
      action();
    });
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
    this.drawTerrain();
    this.drawAim();
    this.drawImpactPreview();
    this.drawVehicles();
    this.drawProjectile();
    this.drawHud();
  }

  private drawTerrain(): void {
    this.terrainRenderer?.draw({
      currentDemoMap: this.terrainController.currentMap,
      worldWidth: WORLD_WIDTH,
      terrainStep: TERRAIN_STEP,
      visibleVoidTopY: this.terrainController.visibleVoidTopY,
      visibleVoidBottomY: this.visibleVoidBottomY(),
      terrainPlatformBottomY: this.terrainPlatformBottomY(),
      terrainBreakthroughY: this.terrainBreakthroughY(),
      surfaceAt: (x) => this.surfaceAt(x),
    });
  }
  private drawAim(): void {
    const active = this.activeVehicle();
    this.effectsRenderer?.drawAim({
      active,
      canAct: Boolean(
        active &&
          this.isMovable(active) &&
          !this.projectile &&
          !this.roundOver &&
          !this.turnController.isCommitted,
      ),
    });
  }

  private drawImpactPreview(): void {
    this.effectsRenderer?.drawImpactPreview(this.impactPreview);
  }
  private vehicleHitZoneFor(vehicle: VehicleState): VehicleHitZone {
    return this.vehicleGeometry.hitZoneFor(vehicle);
  }

  private drawVehicles(): void {
    this.vehicleRenderer?.draw({
      vehicles: this.vehicles,
      activeVehicle: this.activeVehicle(),
      projectileActive: Boolean(this.projectile),
      roundOver: this.roundOver,
      turnCommitted: this.turnController.isCommitted,
      showCombatHulls: this.showCombatHulls,
      charging: this.turnController.isCharging,
      turnTime: this.turnController.turnTime,
      cameraZoom: this.cameras.main.zoom,
      isMovable: (vehicle) => this.isMovable(vehicle),
    });
  }
  private drawProjectile(): void {
    this.projectileRenderer?.draw(this.projectile);
  }

  private drawHud(): void {
    const active = this.activeVehicle() ?? this.vehicles[0]!;
    const winner = this.winningTeam();
    const roundComplete = this.roundOver || this.aliveTeams().size <= 1;

    this.commandDeck.draw({
      active: active && !roundComplete && !this.turnController.isCommitted ? active : undefined,
      roundComplete: roundComplete || Boolean(winner),
      shotResult: this.shotResult,
      projectileInFlight: Boolean(this.projectile),
      charging: this.turnController.isCharging,
      charge: this.turnController.charge,
      windLabel: this.windLabel(),
    });
  }
  private windLabel(): string {
    if (Math.abs(this.turnController.wind) < 0.12) {
      return "calm";
    }
    const direction = this.turnController.wind > 0 ? ">>" : "<<";
    return `${direction} ${Math.round(Math.abs(this.turnController.wind) * 10)}`;
  }
}

