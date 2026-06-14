import Phaser from "phaser";
import {
  aimAngleAfterInput,
  aimAngleForFacingChange,
  movementDirectionFromInput,
  resolveMovementStep,
  updateChargeState,
} from "../../shared/gameplay/movement.js";
import {
  isProjectileOutOfBounds,
  launchProjectile,
  stepProjectile,
  type ProjectileStepResult,
} from "../../shared/gameplay/projectile.js";
import { resolveProjectileImpact } from "../../shared/gameplay/impact.js";
import { firstTerrainContact, firstVehicleContact } from "../../shared/gameplay/projectileCollision.js";
import {
  craterTerrain,
  surfaceAt as terrainSurfaceAt,
  terrainAngleAt as terrainSlopeAngleAt,
} from "../../shared/gameplay/terrain.js";
import { settleVehicleOnTerrain, type VehicleSettlementResult } from "../../shared/gameplay/vehicleSettlement.js";
import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import { V1_DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import type {
  CombatHullShape,
  CombatMarkerKind,
  TeamId,
} from "../../shared/model/gameTypes.js";
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
  scaleBattlefieldCombatHull,
  scaleBattlefieldDisplay,
} from "../combatPresentation";
import { COLLISION_ZONE_OVERLAY_DEPTH } from "../collisionOverlay";
import {
  DRAMATIC_VOID_DROP_FALL_SECONDS,
  chooseVoidDropDisplayX,
  requiredVoidZoneHeight,
  visibleVoidZoneBottomY,
  visibleVoidZoneTopY,
  voidDropTargetY,
} from "../voidDropPresentation";
import {
  getGameViewportSize,
  isSupportedGameViewport,
  readableWorldUiScale,
  shouldShowCombatHulls,
  shouldUseConceptPreviewAssets,
  shouldUseStyleReferenceBackground,
} from "../demoLayout";
import { MatchCameraController } from "./MatchCameraController";
import { MatchController } from "./MatchController";
import { CommandDeck } from "./ui/CommandDeck";
import { EffectsRenderer } from "./rendering/EffectsRenderer";
import { ProjectileRenderer } from "./rendering/ProjectileRenderer";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { VehicleRenderer } from "./rendering/VehicleRenderer";
import { MatchInputController, type MatchInputSnapshot } from "./MatchInputController";
import type {
  CombatMarker,
  ImpactPreview,
  ProjectileCollision,
  ProjectileState,
  SettleOptions,
  VehicleState,
} from "./MatchTypes";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  playableMapById,
  type PlayableTerrain,
} from "../playableMaps";
import {
  CONCEPT_IMAGE_ASSETS,
  RUNTIME_IMAGE_ASSETS,
  STYLE_REFERENCE_ASSET,
} from "../runtimeAssets";
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
  private terrain: number[] = [];
  private readonly matchController = new MatchController();
  private currentDemoMap?: PlayableTerrain;
  private vehicles: VehicleState[] = [];
  private turnOrder: string[] = [];
  private turnIndex = 0;
  private wind = 0;
  private turnTime = TURN_SECONDS;
  private projectile?: ProjectileState;
  private impactPreview?: ImpactPreview;
  private turnCommitted = false;
  private charging = false;
  private charge = 0;
  private shotResult = "";
  private roundOver = false;
  private pendingRoundEvent?: Phaser.Time.TimerEvent;
  private showCombatHulls = shouldShowCombatHulls(window.location.search);
  private combatMarkers: CombatMarker[] = [];
  private visibleVoidTopY = FALLBACK_VISIBLE_VOID_TOP_Y;

  private inputController?: MatchInputController;
  private cameraController?: MatchCameraController;
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
  private preloadStatusText?: Phaser.GameObjects.Text;
  private preloadFailed = false;

  constructor() {
    super("GravityGridScene");
  }

  preload(): void {
    this.mountPreloadStatus();

    if (USE_STYLE_REFERENCE_BACKGROUND) {
      this.load.image("style-reference", STYLE_REFERENCE_ASSET);
    }

    for (const [key, path] of Object.entries(RUNTIME_IMAGE_ASSETS)) {
      this.load.image(key, path);
    }

    if (USE_UNIT_CONCEPT_PREVIEW) {
      for (const [key, path] of Object.entries(CONCEPT_IMAGE_ASSETS)) {
        this.load.image(key, path);
      }
    }
  }

  private mountPreloadStatus(): void {
    this.preloadFailed = false;
    this.preloadStatusText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Loading Gravity Canyon 0%", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "24px",
        fontStyle: "700",
        color: "#9ee8ff",
        align: "center",
        stroke: "#07111f",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10000);

    this.load.on("progress", (progress: number) => {
      if (!this.preloadStatusText || this.preloadFailed) {
        return;
      }

      this.preloadStatusText.setText(`Loading Gravity Canyon ${Math.round(progress * 100)}%`);
    });

    this.load.on("loaderror", (file: { key: string }) => {
      this.preloadFailed = true;
      this.preloadStatusText?.setText(`Could not load ${file.key}`);
    });

    this.load.once("complete", () => {
      if (!this.preloadFailed) {
        this.preloadStatusText?.destroy();
        this.preloadStatusText = undefined;
      }
    });
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
    this.updateCombatMarkers(dt);
    this.updateVoidDropPresentations(dt);

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

    if (this.turnCommitted) {
      this.drawWorld();
      return;
    }

    const active = this.activeVehicle() ?? this.vehicles[0]!;
    if (!active || !this.isMovable(active)) {
      this.advanceTurn();
      return;
    }

    this.turnTime -= dt;
    if (this.turnTime <= 0) {
      this.shotResult = `${active.username} timed out.`;
      this.advanceTurn();
      return;
    }

    this.handleChargeInput(active, input, dt);
    if (this.turnCommitted || this.projectile) {
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
    this.clearCombatMarkers();
    const demoMap = this.buildDefaultDemoMap();
    this.currentDemoMap = demoMap;
    this.terrain = [...demoMap.terrain];
    this.flattenDemoSpawnZones(demoMap);
    this.visibleVoidTopY = visibleVoidZoneTopY({
      terrain: this.terrain,
      terrainBreakthroughY: DEFAULT_TERRAIN_BREAKTHROUGH_Y,
      fallbackTopY: FALLBACK_VISIBLE_VOID_TOP_Y,
    });
    const redOneSpawn = demoMap.map.spawns["red-1"];
    const blueOneSpawn = demoMap.map.spawns["blue-1"];
    const redTwoSpawn = demoMap.map.spawns["red-2"];
    const blueTwoSpawn = demoMap.map.spawns["blue-2"];
    const spawnByUnitId = new Map([
      ["red-1", redOneSpawn],
      ["blue-1", blueOneSpawn],
      ["red-2", redTwoSpawn],
      ["blue-2", blueTwoSpawn],
    ] as const);
    this.vehicles = V1_DEMO_UNIT_DEFINITIONS.map((unit) => {
      const spawn = spawnByUnitId.get(unit.id);
      if (!spawn) {
        throw new Error(`Missing spawn for ${unit.id}`);
      }

      return {
        ...unit,
        x: spawn.x,
        y: 0,
        hp: MAX_HP,
        angle: this.initialAngleForFacing(spawn.facing),
        facing: spawn.facing,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
      };
    });
    this.turnOrder = V1_DEMO_UNIT_DEFINITIONS.map((unit) => unit.id);
    this.turnIndex = 0;
    this.projectile = undefined;
    this.impactPreview = undefined;
    this.turnCommitted = false;
    this.charge = 0;
    this.charging = false;
    this.shotResult = `Round started: ${demoMap.map.name}.`;
    this.settleVehicles();
    this.beginTurn();
    this.drawWorld();
  }

  private buildDefaultDemoMap(): PlayableTerrain {
    return buildPlayableTerrain(playableMapById(DEFAULT_DEMO_MAP_ID), { voidSurfaceY: VOID_SURFACE_Y });
  }

  private flattenDemoSpawnZones(demoMap: PlayableTerrain): void {
    for (const spawn of Object.values(demoMap.map.spawns)) {
      this.flattenSpawnZone(spawn.x, 150);
    }
  }

  private initialAngleForFacing(facing: 1 | -1): number {
    return facing === 1 ? 47 : 133;
  }

  private flattenSpawnZone(centerX: number, width: number): void {
    const start = Math.max(0, Math.floor(centerX - width / 2));
    const end = Math.min(WORLD_WIDTH, Math.floor(centerX + width / 2));
    const target = this.surfaceAt(centerX);
    for (let x = start; x <= end; x += 1) {
      const edgeT = Math.min((x - start) / 26, (end - x) / 26, 1);
      this.terrain[x] = Phaser.Math.Linear(this.terrain[x] ?? target, target, edgeT);
    }
  }

  private beginTurn(): void {
    const active = this.activeVehicle();
    if (!active) {
      return;
    }

    active.moveUnits = MAX_MOVE_UNITS;
    this.turnTime = TURN_SECONDS;
    this.charge = 0;
    this.charging = false;
    this.turnCommitted = false;
    this.impactPreview = undefined;
    this.wind = Phaser.Math.FloatBetween(-1, 1);
    this.cameras.main.stopFollow();
    this.frameBattlefield(450);
  }

  private activeVehicle(): VehicleState | undefined {
    return this.matchController.activeVehicle(this.vehicles, this.turnOrder, this.turnIndex % this.turnOrder.length);
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
      surfaceAt: (x) => this.surfaceAt(x),
    });

    if (step.moved) {
      active.x = step.x;
      this.placeVehicleOnSurface(active);
      active.moveUnits = step.moveUnits;
      if (!active.alive) {
        this.shotResult = `${active.username} drove into the void.`;
        this.charging = false;
        this.charge = 0;
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
      isCharging: this.charging,
      charge: this.charge,
      chargeHeld: input.chargeHeld,
      deltaSeconds: dt,
      chargeRatePerSecond: CHARGE_RATE_PER_SECOND,
      maxPower: MAX_POWER,
      minFirePower: MIN_FIRE_POWER,
    });

    this.charging = charge.isCharging;
    this.charge = charge.charge;

    if (charge.firePower !== undefined) {
      this.fire(active, charge.firePower);
    }
  }

  private fire(active: VehicleState, power: number): void {
    this.charging = false;
    this.charge = 0;
    this.turnCommitted = true;
    const projectile = launchProjectile({
      shooterX: active.x,
      shooterY: active.y,
      angleDeg: active.angle,
      power,
      maxPower: MAX_POWER,
      shotSpeedMin: SHOT_SPEED_MIN,
      shotSpeedMax: SHOT_SPEED_MAX,
      muzzleDistance: PROJECTILE_MUZZLE_DISTANCE,
      muzzleYOffset: PROJECTILE_MUZZLE_Y_OFFSET,
    });

    this.projectile = {
      ...projectile,
      shooterId: active.id,
      team: active.team,
      trail: [],
    };
    this.shotResult = `${active.username} fired.`;
  }

  private updateProjectile(dt: number): void {
    if (!this.projectile) {
      return;
    }

    const p = this.projectile;
    p.trail.push(new Phaser.Math.Vector2(p.x, p.y));
    if (p.trail.length > 34) {
      p.trail.shift();
    }

    const step = stepProjectile({
      projectile: p,
      deltaSeconds: dt,
      wind: this.wind,
      windForce: WIND_FORCE,
      gravity: GRAVITY,
    });

    const collision = this.findProjectileCollision(p, step.startX, step.startY, step.endX, step.endY);
    if (collision) {
      p.x = collision.x;
      p.y = collision.y;
      this.cameraController?.recenterForProjectileIfNeeded(p);
      this.resolveImpact(collision.x, collision.y, collision.directHitId);
      return;
    }

    this.applyProjectileStep(p, step);

    this.cameraController?.recenterForProjectileIfNeeded(p);

    if (
      isProjectileOutOfBounds(p, {
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        lowerYMargin: PROJECTILE_OUT_OF_BOUNDS_LOWER_Y_MARGIN,
        upperYMargin: PROJECTILE_OUT_OF_BOUNDS_UPPER_Y_MARGIN,
      })
    ) {
      this.shotResult = "Shot flew out of bounds.";
      this.projectile = undefined;
      this.queueRoundEvent(700, () => this.advanceTurn());
      return;
    }
  }

  private applyProjectileStep(projectile: ProjectileState, step: ProjectileStepResult): void {
    projectile.x = step.projectile.x;
    projectile.y = step.projectile.y;
    projectile.vx = step.projectile.vx;
    projectile.vy = step.projectile.vy;
  }

  private findProjectileCollision(
    projectile: ProjectileState,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): ProjectileCollision | undefined {
    const vehicleContact = firstVehicleContact({
      startX,
      startY,
      endX,
      endY,
      projectileRadius: PROJECTILE_RADIUS,
      zones: this.vehicles
        .filter((vehicle) => vehicle.alive && vehicle.id !== projectile.shooterId && vehicle.team !== projectile.team)
        .map((vehicle) => ({
          id: vehicle.id,
          ...this.vehicleHitZoneFor(vehicle),
        })),
    });
    const terrainContact = firstTerrainContact({
      startX,
      startY,
      endX,
      endY,
      projectileRadius: PROJECTILE_RADIUS,
      worldWidth: WORLD_WIDTH,
      surfaceAt: (x) => this.surfaceAt(x),
    });

    if (vehicleContact && (!terrainContact || vehicleContact.time <= terrainContact.time)) {
      return { x: vehicleContact.x, y: vehicleContact.y, directHitId: vehicleContact.id };
    }

    return terrainContact ? { x: terrainContact.x, y: terrainContact.y } : undefined;
  }

  private resolveImpact(x: number, y: number, directHitId?: string): void {
    const shooter = this.vehicles.find((vehicle) => vehicle.id === this.projectile?.shooterId);
    const impact = resolveProjectileImpact({
      x,
      y,
      directHitId,
      shooter: shooter
        ? {
            id: shooter.id,
            team: shooter.team,
            classId: shooter.classId,
          }
        : undefined,
      vehicles: this.vehicles.map((vehicle) => ({
        id: vehicle.id,
        username: vehicle.username,
        team: vehicle.team,
        alive: vehicle.alive,
        hp: vehicle.hp,
        x: vehicle.x,
        hitZone: this.vehicleHitZoneFor(vehicle),
      })),
      tuning: {
        craterRadius: CRATER_RADIUS,
        bungerCraterRadius: BUNGER_CRATER_RADIUS,
        damageRadius: DAMAGE_RADIUS,
        bungerDamageRadius: BUNGER_DAMAGE_RADIUS,
        bungerKnockback: BUNGER_KNOCKBACK,
        moveMinX: MOVE_MIN_X,
        moveMaxX: MOVE_MAX_X,
      },
    });
    this.impactPreview = {
      x,
      y,
      craterRadius: impact.craterRadius,
      damageRadius: impact.damageRadius,
      isBungerShot: impact.isBungerShot,
      timeLeft: IMPACT_PREVIEW_SECONDS,
    };
    this.makeCrater(x, y, impact.craterRadius, impact.craterDepthFactor);
    const damaged: string[] = [];
    const bungeEvents: string[] = [];
    const affectedVehicleIds = new Set(impact.affectedVehicleIds);
    const defeatMarkedIds = new Set(impact.damageDefeatIds);

    for (const event of impact.damageEvents) {
      const vehicle = this.vehicles.find((candidate) => candidate.id === event.vehicleId);
      if (!vehicle) {
        continue;
      }

      vehicle.hp = event.hpAfter;
      damaged.push(`${event.username} -${event.damage}`);
      this.addVehicleCombatMarker(
        vehicle,
        event.hitKind,
        `${event.hitKind === "direct" ? "DIRECT" : "SPLASH"} -${event.damage}`,
      );

      if (event.defeated) {
        vehicle.alive = false;
        vehicle.defeatReason = "damage";
        this.addVehicleCombatMarker(vehicle, "ko", "KO", 1);
      }
    }

    for (const event of impact.knockbackEvents) {
      const vehicle = this.vehicles.find((candidate) => candidate.id === event.vehicleId);
      if (!vehicle) {
        continue;
      }

      vehicle.x = event.toX;
      bungeEvents.push(`${event.username} shoved`);
      this.addVehicleCombatMarker(vehicle, "shoved", "SHOVED", 1);
    }

    for (const update of impact.vehicleUpdates) {
      const vehicle = this.vehicles.find((candidate) => candidate.id === update.vehicleId);
      if (!vehicle) {
        continue;
      }

      vehicle.x = update.x;
      vehicle.hp = update.hp;
      vehicle.alive = update.alive;
      if (update.defeatReason) {
        vehicle.defeatReason = update.defeatReason;
      }
    }

    this.projectile = undefined;
    const aliveBeforeSettle = new Set(this.vehicles.filter((vehicle) => vehicle.alive).map((vehicle) => vehicle.id));
    const fallEvents = this.settleVehicles({
      changedX: x,
      changedRadius: impact.changedRadius,
      forceIds: affectedVehicleIds,
    });
    for (const vehicle of this.vehicles) {
      if (aliveBeforeSettle.has(vehicle.id) && !vehicle.alive && !defeatMarkedIds.has(vehicle.id)) {
        this.addVehicleCombatMarker(vehicle, "bunged", "VOID DROPPED");
      }
    }
    this.shotResult = damaged.length > 0 ? damaged.join(" / ") : "Terrain carved.";
    if (bungeEvents.length > 0) {
      this.shotResult += ` / ${bungeEvents.join(" / ")}`;
    }
    if (fallEvents.length > 0) {
      this.shotResult += ` / ${fallEvents.join(" / ")}`;
    }
    this.drawWorld();

    if (this.winningTeam()) {
      this.queueRoundEvent(900, () => this.endRound());
      return;
    }

    this.queueRoundEvent(900, () => this.advanceTurn());
  }

  private makeCrater(centerX: number, centerY: number, radius: number, depthFactor = 0.74): void {
    this.terrain = craterTerrain({
      terrain: this.terrain,
      impactX: centerX,
      impactY: centerY,
      radius,
      depth: radius * depthFactor,
      voidSurfaceY: VOID_SURFACE_Y,
      breakthroughY: this.terrainBreakthroughY(),
    });
  }

  private settleVehicles(options?: SettleOptions): string[] {
    const fallEvents: string[] = [];
    for (const vehicle of this.vehicles) {
      if (!vehicle.alive) {
        continue;
      }
      const forceSettle = options?.forceIds?.has(vehicle.id) ?? false;
      const settlement = this.resolveVehicleSettlement(vehicle, {
        adjustForSlope: true,
        changedX: options?.changedX,
        changedRadius: options?.changedRadius,
        forceSettle,
      });

      if (this.applyVehicleSettlement(vehicle, settlement)) {
        fallEvents.push(`${vehicle.username} Void Dropped`);
      }
    }
    return fallEvents;
  }

  private advanceTurn(): void {
    if (this.roundOver) {
      return;
    }

    this.projectile = undefined;
    this.charging = false;
    this.charge = 0;
    this.turnCommitted = false;

    const decision = this.matchController.resolveNextTurn({
      turnOrder: this.turnOrder,
      currentTurnIndex: this.turnIndex,
      vehicles: this.vehicles,
    });

    if (decision.kind === "round-over") {
      this.endRound();
      return;
    }

    this.turnIndex = decision.nextTurnIndex;
    this.beginTurn();
  }

  private isMovable(vehicle: VehicleState): boolean {
    return this.matchController.isMovable(vehicle, this.turnOrder);
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
    this.charging = false;
    this.charge = 0;
    this.turnCommitted = true;

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
    return terrainSurfaceAt(this.terrain, x, {
      worldWidth: WORLD_WIDTH,
      voidSurfaceY: VOID_SURFACE_Y,
    });
  }

  private placeVehicleOnSurface(vehicle: VehicleState): boolean {
    const settlement = this.resolveVehicleSettlement(vehicle, {
      adjustForSlope: false,
    });

    return this.applyVehicleSettlement(vehicle, settlement);
  }

  private resolveVehicleSettlement(
    vehicle: VehicleState,
    options: {
      adjustForSlope: boolean;
      changedX?: number;
      changedRadius?: number;
      forceSettle?: boolean;
    },
  ): VehicleSettlementResult {
    return settleVehicleOnTerrain({
      vehicle: {
        id: vehicle.id,
        x: vehicle.x,
        y: vehicle.y,
        hp: vehicle.hp,
        alive: vehicle.alive,
      },
      adjustForSlope: options.adjustForSlope,
      changedX: options.changedX,
      changedRadius: options.changedRadius,
      forceSettle: options.forceSettle,
      tuning: VEHICLE_SETTLEMENT_TUNING,
      fallbackFallStartY: this.visibleVoidTopY - 40,
      surfaceAt: (x) => this.surfaceAt(x),
    });
  }

  private applyVehicleSettlement(vehicle: VehicleState, settlement: VehicleSettlementResult): boolean {
    vehicle.x = settlement.x;
    vehicle.y = settlement.y;
    vehicle.hp = settlement.hp;
    vehicle.alive = settlement.alive;
    if (settlement.defeatReason) {
      vehicle.defeatReason = settlement.defeatReason;
    }

    if (settlement.voidDropped) {
      const targetX = this.nearestVoidDisplayX(settlement.fallStartX);
      const targetY = this.voidDropTargetY();
      vehicle.voidDropPresentation = {
        fromX: settlement.fallStartX,
        fromY: settlement.fallStartY,
        targetX,
        targetY,
        age: 0,
        duration: DRAMATIC_VOID_DROP_FALL_SECONDS,
      };
      vehicle.x = targetX;
      vehicle.y = targetY;
      return true;
    }

    return false;
  }

  private nearestVoidDisplayX(startX: number): number {
    return chooseVoidDropDisplayX({
      startX,
      worldWidth: WORLD_WIDTH,
      step: TERRAIN_STEP,
      displayWidth: VOID_DROP_DISPLAY_SIZE.width,
      padding: VOID_DROP_HORIZONTAL_PADDING,
      isVoidAt: (x) => this.surfaceAt(x) >= this.terrainBreakthroughY(),
    });
  }

  private terrainBreakthroughY(): number {
    return this.visibleVoidTopY + 8;
  }

  private terrainPlatformBottomY(): number {
    return this.visibleVoidTopY;
  }

  private visibleVoidBottomY(): number {
    return visibleVoidZoneBottomY(this.visibleVoidTopY, VISIBLE_VOID_ZONE_HEIGHT);
  }

  private voidDropTargetY(): number {
    return voidDropTargetY({
      visibleVoidTopY: this.visibleVoidTopY,
      visibleVoidZoneHeight: VISIBLE_VOID_ZONE_HEIGHT,
      displayHeight: VOID_DROP_DISPLAY_SIZE.height,
    });
  }

  private terrainAngleAt(x: number): number {
    const left = this.surfaceAt(x - VEHICLE_HALF_WIDTH);
    const right = this.surfaceAt(x + VEHICLE_HALF_WIDTH);
    if (left >= DEATH_SURFACE_Y || right >= DEATH_SURFACE_Y) {
      return 0;
    }

    const angle = terrainSlopeAngleAt(this.terrain, x, {
      worldWidth: WORLD_WIDTH,
      voidSurfaceY: VOID_SURFACE_Y,
      sampleDistance: VEHICLE_HALF_WIDTH,
    });
    return Phaser.Math.Clamp(angle, -MAX_TERRAIN_SPRITE_TILT_DEG, MAX_TERRAIN_SPRITE_TILT_DEG);
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

  private addCombatMarker(kind: CombatMarkerKind, label: string, x: number, y: number): void {
    const style = this.combatMarkerStyle(kind);
    const worldUiScale = readableWorldUiScale(this.cameras.main.zoom);
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: kind === "ko" || kind === "bunged" ? "24px" : "21px",
        fontStyle: "800",
        color: style.color,
        stroke: "#10131b",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setScale(worldUiScale)
      .setDepth(35);

    this.combatMarkers.push({
      kind,
      label,
      x,
      y,
      age: 0,
      duration: COMBAT_MARKER_SECONDS,
      lift: style.lift,
      text,
    });
  }

  private addVehicleCombatMarker(vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot = 0): void {
    const yOffset = USE_UNIT_CONCEPT_PREVIEW ? 176 : 104;
    this.addCombatMarker(kind, label, vehicle.x, vehicle.y - yOffset - slot * 26);
  }

  private combatMarkerStyle(kind: CombatMarkerKind): { color: string; lift: number } {
    switch (kind) {
      case "direct":
        return { color: "#ff6b6b", lift: 54 };
      case "splash":
        return { color: "#ffd166", lift: 46 };
      case "shoved":
        return { color: "#8be9ff", lift: 40 };
      case "ko":
        return { color: "#ff8bd1", lift: 58 };
      case "bunged":
        return { color: "#ff8bd1", lift: 58 };
    }
  }

  private updateCombatMarkers(dt: number): void {
    for (const marker of this.combatMarkers) {
      marker.age += dt;
      const progress = Phaser.Math.Clamp(marker.age / marker.duration, 0, 1);
      marker.text
        .setPosition(marker.x, marker.y - marker.lift * Phaser.Math.Easing.Sine.Out(progress))
        .setScale(readableWorldUiScale(this.cameras.main.zoom))
        .setAlpha(Phaser.Math.Clamp(1 - progress, 0, 1));
    }

    const expired = this.combatMarkers.filter((marker) => marker.age >= marker.duration);
    for (const marker of expired) {
      marker.text.destroy();
    }
    this.combatMarkers = this.combatMarkers.filter((marker) => marker.age < marker.duration);
  }

  private clearCombatMarkers(): void {
    for (const marker of this.combatMarkers) {
      marker.text.destroy();
    }
    this.combatMarkers = [];
  }

  private updateVoidDropPresentations(dt: number): void {
    for (const vehicle of this.vehicles) {
      if (vehicle.voidDropPresentation) {
        vehicle.voidDropPresentation.age = Math.min(
          vehicle.voidDropPresentation.duration,
          vehicle.voidDropPresentation.age + dt,
        );
      }
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
      currentDemoMap: this.currentDemoMap,
      worldWidth: WORLD_WIDTH,
      terrainStep: TERRAIN_STEP,
      visibleVoidTopY: this.visibleVoidTopY,
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
      canAct: Boolean(active && this.isMovable(active) && !this.projectile && !this.roundOver && !this.turnCommitted),
    });
  }

  private drawImpactPreview(): void {
    this.effectsRenderer?.drawImpactPreview(this.impactPreview);
  }
  private orientedOffset(vehicle: VehicleState, offset: number, nativeFacing: 1 | -1): number {
    return vehicle.facing === nativeFacing ? offset : -offset;
  }

  private combatHullCenter(vehicle: VehicleState): Phaser.Math.Vector2 {
    const hull = this.combatHullFor(vehicle);
    return new Phaser.Math.Vector2(
      vehicle.x + this.orientedOffset(vehicle, hull.offsetX, 1),
      vehicle.y + hull.offsetY,
    );
  }

  private combatHullFor(vehicle: VehicleState): CombatHullShape {
    return scaleBattlefieldCombatHull(vehicle.combatHull);
  }

  private vehicleHitZoneFor(vehicle: VehicleState): VehicleHitZone {
    const hull = this.combatHullFor(vehicle);
    const center = this.combatHullCenter(vehicle);
    return {
      centerX: center.x,
      centerY: center.y,
      width: hull.width,
      height: hull.height,
    };
  }

  private drawVehicles(): void {
    this.vehicleRenderer?.draw({
      vehicles: this.vehicles,
      activeVehicle: this.activeVehicle(),
      projectileActive: Boolean(this.projectile),
      roundOver: this.roundOver,
      turnCommitted: this.turnCommitted,
      showCombatHulls: this.showCombatHulls,
      charging: this.charging,
      turnTime: this.turnTime,
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
      active: active && !roundComplete && !this.turnCommitted ? active : undefined,
      roundComplete: roundComplete || Boolean(winner),
      shotResult: this.shotResult,
      projectileInFlight: Boolean(this.projectile),
      charging: this.charging,
      charge: this.charge,
      windLabel: this.windLabel(),
    });
  }
  private windLabel(): string {
    if (Math.abs(this.wind) < 0.12) {
      return "calm";
    }
    const direction = this.wind > 0 ? ">>" : "<<";
    return `${direction} ${Math.round(Math.abs(this.wind) * 10)}`;
  }
}

