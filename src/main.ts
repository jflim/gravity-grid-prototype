import Phaser from "phaser";
import {
  defeatPresentationFor,
  scaleBattlefieldCombatHull,
  scaleBattlefieldDisplay,
  scaleBattlefieldOffset,
  type DefeatReason,
} from "./combatPresentation";
import { shouldApplyWeaponEffect } from "./combatRules";
import { COLLISION_ZONE_OVERLAY_DEPTH, collisionZoneOverlayStyle } from "./collisionOverlay";
import { firstTerrainContact, firstVehicleContact } from "./projectileCollision";
import { SHARED_V1_VEHICLE_HIT_ZONE } from "./v1CollisionProfiles";
import {
  DRAMATIC_VOID_DROP_FALL_SECONDS,
  chooseVoidDropDisplayX,
  requiredVoidZoneHeight,
  visibleVoidZoneBottomY,
  visibleVoidZoneTopY,
  voidDropRenderPosition,
  voidDropTargetY,
} from "./voidDropPresentation";
import { distanceToVehicleHitZone, type VehicleHitZone } from "./vehicleHitZone";
import {
  computeBattlefieldFrameLayout,
  computeCameraWorldBounds,
  computeGameCanvasSize,
  computeCommandDeckElementLayout,
  computeCommandPanelLayout,
  computeUnitWorldOverlayLayout,
  computeWindHudLayout,
  getGameViewportSize,
  isSupportedGameViewport,
  MIN_SUPPORTED_VIEWPORT,
  readableWorldUiScale,
  shouldMountOnlineLobby,
  shouldRecenterProjectileCamera,
  shouldShowCombatHulls,
} from "./demoLayout";
import { mountOnlineLobby } from "./onlineLobby";
import {
  buildPlayableTerrain,
  DEFAULT_DEMO_MAP_ID,
  playableMapById,
  type PlayableTerrain,
} from "./playableMaps";
import "./styles.css";

type TeamId = "red" | "blue";
type ClassId = "bunger" | "glitch" | "bouncer" | "spark";
type CharacterPose = "default" | "ko" | "intense";
type CombatMarkerKind = "direct" | "splash" | "shoved" | "ko" | "bunged";

interface SpriteDisplaySize {
  width: number;
  height: number;
}

interface CombatHull {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface CharacterSpriteSet {
  default: string;
  ko: string;
  intense: string;
}

interface CharacterDisplaySet {
  default: SpriteDisplaySize;
  ko: SpriteDisplaySize;
  intense: SpriteDisplaySize;
}

interface UnitConceptSpriteSet {
  default: string;
  intense: string;
  ko: string;
}

interface UnitConceptDisplaySet {
  default: SpriteDisplaySize;
  intense: SpriteDisplaySize;
  ko: SpriteDisplaySize;
}

interface VehicleState {
  id: string;
  username: string;
  team: TeamId;
  classId: ClassId;
  className: string;
  x: number;
  y: number;
  hp: number;
  angle: number;
  facing: 1 | -1;
  moveUnits: number;
  alive: boolean;
  defeatReason?: DefeatReason;
  color: number;
  accent: number;
  vehicleSpriteKey: string;
  vehicleDestroyedSpriteKey: string;
  vehicleSpriteFaces: 1 | -1;
  vehicleDisplay: SpriteDisplaySize;
  vehicleDestroyedDisplay: SpriteDisplaySize;
  characterSpriteKeys: CharacterSpriteSet;
  characterSpriteFaces: 1 | -1;
  characterDisplays: CharacterDisplaySet;
  characterOffsetX: number;
  characterOffsetY: number;
  unitConceptSpriteKeys?: UnitConceptSpriteSet;
  unitConceptDisplays?: UnitConceptDisplaySet;
  unitConceptSpriteFaces?: 1 | -1;
  unitConceptOffsetY?: number;
  combatHull: CombatHull;
  voidDropPresentation?: VoidDropPresentationState;
  portraitKey: string;
}

interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shooterId: string;
  team: TeamId;
  trail: Phaser.Math.Vector2[];
}

interface ProjectileCollision {
  x: number;
  y: number;
  directHitId?: string;
}

interface VoidDropPresentationState {
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  age: number;
  duration: number;
}

interface ImpactPreview {
  x: number;
  y: number;
  craterRadius: number;
  damageRadius: number;
  isBungerShot: boolean;
  timeLeft: number;
}

interface CombatMarker {
  kind: CombatMarkerKind;
  label: string;
  x: number;
  y: number;
  age: number;
  duration: number;
  lift: number;
  text: Phaser.GameObjects.Text;
}

interface SettleOptions {
  changedX: number;
  changedRadius: number;
  forceIds?: Set<string>;
}

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 900;
const TERRAIN_STEP = 4;
const VEHICLE_RADIUS = 27;
const VEHICLE_HALF_WIDTH = 34;
const VEHICLE_HALF_HEIGHT = 22;
const MAX_HP = 100;
const MIN_ELEVATION_DEG = 5;
const MAX_ELEVATION_DEG = 90;
const MAX_MOVE_UNITS = 10;
const MOVE_PIXELS_PER_UNIT = 16;
const MOVE_MIN_X = -72;
const MOVE_MAX_X = WORLD_WIDTH + 72;
const CLIMB_MAX_ANGLE_DEG = 34;
const MAX_CLIMB_SLOPE = Math.tan((CLIMB_MAX_ANGLE_DEG * Math.PI) / 180);
const MAX_POWER = 100;
const GRAVITY = 440;
const PROJECTILE_RADIUS = 11;
const SHOT_SPEED_MIN = 240;
const SHOT_SPEED_MAX = 780;
const WIND_FORCE = 34;
const CRATER_RADIUS = 52;
const BUNGER_CRATER_RADIUS = 82;
const DAMAGE_RADIUS = 78;
const BUNGER_DAMAGE_RADIUS = 92;
const BUNGER_KNOCKBACK = 82;
const IMPACT_PREVIEW_SECONDS = 1.25;
const COMBAT_MARKER_SECONDS = 1.15;
const TURN_SECONDS = 30;
const VOID_SURFACE_Y = WORLD_HEIGHT + 260;
const DEATH_SURFACE_Y = WORLD_HEIGHT - 6;
const VOID_DROP_DISPLAY_SIZE = scaleBattlefieldDisplay({ width: 354, height: 212 });
const VISIBLE_VOID_ZONE_HEIGHT = requiredVoidZoneHeight(VOID_DROP_DISPLAY_SIZE);
const FALLBACK_VISIBLE_VOID_TOP_Y = WORLD_HEIGHT - VISIBLE_VOID_ZONE_HEIGHT;
const WORLD_RENDER_HEIGHT = WORLD_HEIGHT + VISIBLE_VOID_ZONE_HEIGHT;
const DEFAULT_TERRAIN_BREAKTHROUGH_Y = WORLD_HEIGHT - 54;
const VOID_DROP_HORIZONTAL_PADDING = 24;
const MAX_TERRAIN_SPRITE_TILT_DEG = 20;
const USE_UNIT_CONCEPT_PREVIEW = !new URLSearchParams(window.location.search).has("runtimeAssets");
let currentViewportSupported = true;

class GravityGridScene extends Phaser.Scene {
  private terrain: number[] = [];
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

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private resetKey?: Phaser.Input.Keyboard.Key;
  private hullToggleKey?: Phaser.Input.Keyboard.Key;

  private terrainGfx!: Phaser.GameObjects.Graphics;
  private vehicleGfx!: Phaser.GameObjects.Graphics;
  private collisionGfx!: Phaser.GameObjects.Graphics;
  private projectileGfx!: Phaser.GameObjects.Graphics;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private impactGfx!: Phaser.GameObjects.Graphics;
  private vehicleLabels: Phaser.GameObjects.Text[] = [];
  private vehicleSprites = new Map<string, Phaser.GameObjects.Image>();
  private characterSprites = new Map<string, Phaser.GameObjects.Image>();
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
  private collisionZonesCheckbox?: HTMLInputElement;

  constructor() {
    super("GravityGridScene");
  }

  preload(): void {
    this.load.image("style-reference", "assets/style-b-2v2-reference.png");
    this.load.image("nova-vehicle", "assets/nova-vehicle.png");
    this.load.image("nova-vehicle-sprite", "assets/nova-vehicle-sprite.png");
    this.load.image("nova-vehicle-destroyed", "assets/nova-vehicle-destroyed.png");
    this.load.image("nova-character-default", "assets/nova-character-default.png");
    this.load.image("nova-character-ko", "assets/nova-character-ko.png");
    this.load.image("nova-character-intense", "assets/nova-character-intense.png");
    this.load.image("nova-unit-intense", "assets/nova-unit-intense.png");
    this.load.image("vesper-vehicle", "assets/vesper-vehicle.png");
    this.load.image("vesper-vehicle-sprite", "assets/vesper-vehicle-sprite.png");
    this.load.image("vesper-vehicle-destroyed", "assets/vesper-vehicle-destroyed.png");
    this.load.image("vesper-character-default", "assets/vesper-character-default.png");
    this.load.image("vesper-character-ko", "assets/vesper-character-ko.png");
    this.load.image("vesper-character-intense", "assets/vesper-character-intense.png");
    this.load.image("vesper-unit-intense", "assets/vesper-unit-intense.png");
    this.load.image("kaelii-vehicle-sprite", "assets/kaelii-vehicle-sprite.png");
    this.load.image("kaelii-vehicle-destroyed", "assets/kaelii-vehicle-destroyed.png");
    this.load.image("kaelii-unit-default", "assets/kaelii-unit-default.png");
    this.load.image("kaelii-unit-intense", "assets/kaelii-unit-intense.png");
    this.load.image("kaelii-unit-ko", "assets/kaelii-unit-ko.png");
    this.load.image("perlah-vehicle-sprite", "assets/perlah-vehicle-sprite.png");
    this.load.image("perlah-vehicle-destroyed", "assets/perlah-vehicle-destroyed.png");
    this.load.image("perlah-unit-default", "assets/perlah-unit-default.png");
    this.load.image("perlah-unit-intense", "assets/perlah-unit-intense.png");
    this.load.image("perlah-unit-ko", "assets/perlah-unit-ko.png");
    this.load.image(
      "nova-unit-default-concept",
      "assets/sprite-variants/units/nova/default/nova-unit-default-mounted-v1-alpha.png",
    );
    this.load.image(
      "nova-unit-ko-concept",
      "assets/sprite-variants/units/nova/defeated-ko/nova-unit-defeated-ko-head-over-heels-v1-alpha.png",
    );
    this.load.image(
      "vesper-unit-default-concept",
      "assets/sprite-variants/units/vesper/default/vesper-unit-default-mounted-tech-shorts-v9-alpha.png",
    );
    this.load.image(
      "vesper-unit-ko-concept",
      "assets/sprite-variants/units/vesper/defeated-ko/vesper-unit-defeated-ko-tech-shorts-v10-alpha.png",
    );
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_RENDER_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_RENDER_HEIGHT);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.resetKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.hullToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this.createBackground();
    this.terrainGfx = this.add.graphics();
    this.aimGfx = this.add.graphics();
    this.impactGfx = this.add.graphics().setDepth(9);
    this.vehicleGfx = this.add.graphics();
    this.collisionGfx = this.add.graphics().setDepth(COLLISION_ZONE_OVERLAY_DEPTH);
    this.projectileGfx = this.add.graphics();
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(50);

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

    this.mountCollisionZonesToggle();
    this.startRound();
    this.updateCameraViewport();
    this.scale.on("resize", () => {
      this.updateCameraViewport();
      this.frameBattlefield(0);
      this.drawHud();
    });
  }

  update(_: number, deltaMs: number): void {
    if (!currentViewportSupported) {
      return;
    }

    const dt = Math.min(deltaMs / 1000, 0.033);
    this.updateImpactPreview(dt);
    this.updateCombatMarkers(dt);
    this.updateVoidDropPresentations(dt);

    if (this.resetKey && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.startRound();
      return;
    }

    if (this.hullToggleKey && Phaser.Input.Keyboard.JustDown(this.hullToggleKey)) {
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

    this.handleChargeInput(active, dt);
    if (this.turnCommitted || this.projectile) {
      this.drawWorld();
      return;
    }

    this.handleVehicleInput(active, dt);
    this.drawWorld();
  }

  private createBackground(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_RENDER_HEIGHT / 2, WORLD_WIDTH, WORLD_RENDER_HEIGHT, 0x111827);
    const reference = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "style-reference")
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
      .setAlpha(0.08);
    reference.setTint(0x8bd7ff);

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
    this.vehicles = [
      {
        id: "red-1",
        username: "Nova",
        team: "red",
        classId: "bunger",
        className: "Bunger Rig",
        x: redOneSpawn.x,
        y: 0,
        hp: MAX_HP,
        angle: this.initialAngleForFacing(redOneSpawn.facing),
        facing: redOneSpawn.facing,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
        color: 0xff4d5d,
        accent: 0xffd166,
        vehicleSpriteKey: "nova-vehicle-sprite",
        vehicleDestroyedSpriteKey: "nova-vehicle-destroyed",
        vehicleSpriteFaces: 1,
        vehicleDisplay: { width: 254, height: 155 },
        vehicleDestroyedDisplay: { width: 260, height: 211 },
        characterSpriteKeys: {
          default: "nova-character-default",
          ko: "nova-character-ko",
          intense: "nova-character-intense",
        },
        characterSpriteFaces: 1,
        characterDisplays: {
          default: { width: 112, height: 150 },
          ko: { width: 250, height: 94 },
          intense: { width: 166, height: 148 },
        },
        characterOffsetX: -36,
        characterOffsetY: -34,
        unitConceptSpriteKeys: {
          default: "nova-unit-default-concept",
          intense: "nova-unit-intense",
          ko: "nova-unit-ko-concept",
        },
        unitConceptDisplays: {
          default: { width: 350, height: 233 },
          intense: { width: 350, height: 233 },
          ko: { width: 354, height: 212 },
        },
        unitConceptSpriteFaces: 1,
        unitConceptOffsetY: 28,
        combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
        portraitKey: "nova-vehicle",
      },
      {
        id: "blue-1",
        username: "Vesper",
        team: "blue",
        classId: "glitch",
        className: "Glitch Rover",
        x: blueOneSpawn.x,
        y: 0,
        hp: MAX_HP,
        angle: this.initialAngleForFacing(blueOneSpawn.facing),
        facing: blueOneSpawn.facing,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
        color: 0x4cc9f0,
        accent: 0xb8f7ff,
        vehicleSpriteKey: "vesper-vehicle-sprite",
        vehicleDestroyedSpriteKey: "vesper-vehicle-destroyed",
        vehicleSpriteFaces: -1,
        vehicleDisplay: { width: 250, height: 160 },
        vehicleDestroyedDisplay: { width: 260, height: 169 },
        characterSpriteKeys: {
          default: "vesper-character-default",
          ko: "vesper-character-ko",
          intense: "vesper-character-intense",
        },
        characterSpriteFaces: -1,
        characterDisplays: {
          default: { width: 108, height: 151 },
          ko: { width: 154, height: 149 },
          intense: { width: 139, height: 150 },
        },
        characterOffsetX: 54,
        characterOffsetY: -34,
        unitConceptSpriteKeys: {
          default: "vesper-unit-default-concept",
          intense: "vesper-unit-intense",
          ko: "vesper-unit-ko-concept",
        },
        unitConceptDisplays: {
          default: { width: 356, height: 208 },
          intense: { width: 356, height: 208 },
          ko: { width: 356, height: 208 },
        },
        unitConceptSpriteFaces: -1,
        unitConceptOffsetY: 25,
        combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
        portraitKey: "vesper-vehicle",
      },
      {
        id: "red-2",
        username: "Kaelii",
        team: "red",
        classId: "bouncer",
        className: "Flashkick Skip-Rig",
        x: redTwoSpawn.x,
        y: 0,
        hp: MAX_HP,
        angle: this.initialAngleForFacing(redTwoSpawn.facing),
        facing: redTwoSpawn.facing,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
        color: 0xff4fb4,
        accent: 0xffd1f0,
        vehicleSpriteKey: "kaelii-vehicle-sprite",
        vehicleDestroyedSpriteKey: "kaelii-vehicle-destroyed",
        vehicleSpriteFaces: 1,
        vehicleDisplay: { width: 1, height: 1 },
        vehicleDestroyedDisplay: { width: 1, height: 1 },
        characterSpriteKeys: {
          default: "kaelii-unit-default",
          ko: "kaelii-unit-ko",
          intense: "kaelii-unit-intense",
        },
        characterSpriteFaces: 1,
        characterDisplays: {
          default: { width: 350, height: 233 },
          ko: { width: 354, height: 212 },
          intense: { width: 350, height: 233 },
        },
        characterOffsetX: 0,
        characterOffsetY: 24,
        unitConceptSpriteKeys: {
          default: "kaelii-unit-default",
          intense: "kaelii-unit-intense",
          ko: "kaelii-unit-ko",
        },
        unitConceptDisplays: {
          default: { width: 350, height: 233 },
          intense: { width: 350, height: 233 },
          ko: { width: 354, height: 212 },
        },
        unitConceptSpriteFaces: 1,
        unitConceptOffsetY: 28,
        combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
        portraitKey: "kaelii-unit-default",
      },
      {
        id: "blue-2",
        username: "Perlah",
        team: "blue",
        classId: "spark",
        className: "Sunspike Embercart",
        x: blueTwoSpawn.x,
        y: 0,
        hp: MAX_HP,
        angle: this.initialAngleForFacing(blueTwoSpawn.facing),
        facing: blueTwoSpawn.facing,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
        color: 0xff8a24,
        accent: 0xffd166,
        vehicleSpriteKey: "perlah-vehicle-sprite",
        vehicleDestroyedSpriteKey: "perlah-vehicle-destroyed",
        vehicleSpriteFaces: 1,
        vehicleDisplay: { width: 1, height: 1 },
        vehicleDestroyedDisplay: { width: 1, height: 1 },
        characterSpriteKeys: {
          default: "perlah-unit-default",
          ko: "perlah-unit-ko",
          intense: "perlah-unit-intense",
        },
        characterSpriteFaces: 1,
        characterDisplays: {
          default: { width: 356, height: 208 },
          ko: { width: 354, height: 212 },
          intense: { width: 356, height: 208 },
        },
        characterOffsetX: 0,
        characterOffsetY: 25,
        unitConceptSpriteKeys: {
          default: "perlah-unit-default",
          intense: "perlah-unit-intense",
          ko: "perlah-unit-ko",
        },
        unitConceptDisplays: {
          default: { width: 356, height: 208 },
          intense: { width: 356, height: 208 },
          ko: { width: 354, height: 212 },
        },
        unitConceptSpriteFaces: 1,
        unitConceptOffsetY: 25,
        combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
        portraitKey: "perlah-unit-default",
      },
    ];
    this.turnOrder = ["red-1", "blue-1", "red-2", "blue-2"];
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
    const activeId = this.turnOrder[this.turnIndex % this.turnOrder.length];
    return this.vehicles.find((vehicle) => vehicle.id === activeId);
  }

  private handleVehicleInput(active: VehicleState, dt: number): void {
    const cursors = this.cursors;
    if (!cursors) {
      return;
    }

    const angleSpeed = 78;
    if (cursors.up.isDown) {
      active.angle += active.facing === 1 ? angleSpeed * dt : -angleSpeed * dt;
    }
    if (cursors.down.isDown) {
      active.angle += active.facing === 1 ? -angleSpeed * dt : angleSpeed * dt;
    }
    active.angle =
      active.facing === 1
        ? Phaser.Math.Clamp(active.angle, MIN_ELEVATION_DEG, MAX_ELEVATION_DEG)
        : Phaser.Math.Clamp(active.angle, 180 - MAX_ELEVATION_DEG, 180 - MIN_ELEVATION_DEG);

    const movingLeft = cursors.left.isDown;
    const movingRight = cursors.right.isDown;
    if (movingLeft !== movingRight) {
      this.setVehicleFacing(active, movingLeft ? -1 : 1);
    }

    if (active.moveUnits <= 0 || movingLeft === movingRight) {
      return;
    }

    const moveSpeed = 98;
    const direction = movingLeft ? -1 : 1;
    const maxStepDistance = active.moveUnits * MOVE_PIXELS_PER_UNIT;
    const stepDistance = Math.min(moveSpeed * dt, maxStepDistance);
    const proposedX = Phaser.Math.Clamp(active.x + direction * stepDistance, MOVE_MIN_X, MOVE_MAX_X);
    const oldSurface = this.surfaceAt(active.x);
    const newSurface = this.surfaceAt(proposedX);
    const distanceMoved = Math.abs(proposedX - active.x);
    const surfaceDelta = newSurface - oldSurface;
    const uphillSlope = Math.max(0, -surfaceDelta) / Math.max(distanceMoved, 1);
    const canTraverse = surfaceDelta >= 0 || uphillSlope <= MAX_CLIMB_SLOPE;

    if (canTraverse) {
      active.x = proposedX;
      this.placeVehicleOnSurface(active);
      active.moveUnits = Math.max(0, active.moveUnits - distanceMoved / MOVE_PIXELS_PER_UNIT);
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

    const currentElevation = vehicle.facing === 1 ? vehicle.angle : 180 - vehicle.angle;
    const clampedElevation = Phaser.Math.Clamp(currentElevation, MIN_ELEVATION_DEG, MAX_ELEVATION_DEG);
    vehicle.facing = facing;
    vehicle.angle = facing === 1 ? clampedElevation : 180 - clampedElevation;
  }

  private handleChargeInput(active: VehicleState, dt: number): void {
    const space = this.spaceKey;
    if (!space) {
      return;
    }

    if (space.isDown) {
      this.charging = true;
      this.charge = Math.min(MAX_POWER, this.charge + dt * 78);
      return;
    }

    if (this.charging) {
      const releasedPower = Math.max(10, this.charge);
      this.fire(active, releasedPower);
    }
  }

  private fire(active: VehicleState, power: number): void {
    this.charging = false;
    this.charge = 0;
    this.turnCommitted = true;
    const radians = Phaser.Math.DegToRad(active.angle);
    const speed = Phaser.Math.Linear(SHOT_SPEED_MIN, SHOT_SPEED_MAX, power / MAX_POWER);
    const muzzleX = active.x + Math.cos(radians) * 48;
    const muzzleY = active.y - 13 - Math.sin(radians) * 48;

    this.projectile = {
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(radians) * speed,
      vy: -Math.sin(radians) * speed,
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

    const startX = p.x;
    const startY = p.y;
    p.vx += this.wind * WIND_FORCE * dt;
    p.vy += GRAVITY * dt;
    const nextX = p.x + p.vx * dt;
    const nextY = p.y + p.vy * dt;

    const collision = this.findProjectileCollision(p, startX, startY, nextX, nextY);
    if (collision) {
      p.x = collision.x;
      p.y = collision.y;
      this.recenterCameraForProjectileIfNeeded(p);
      this.resolveImpact(collision.x, collision.y, collision.directHitId);
      return;
    }

    p.x = nextX;
    p.y = nextY;

    this.recenterCameraForProjectileIfNeeded(p);

    if (p.x < 0 || p.x > WORLD_WIDTH || p.y > WORLD_HEIGHT + 120 || p.y < -220) {
      this.shotResult = "Shot flew out of bounds.";
      this.projectile = undefined;
      this.queueRoundEvent(700, () => this.advanceTurn());
      return;
    }
  }

  private recenterCameraForProjectileIfNeeded(projectile: ProjectileState): void {
    const camera = this.cameras.main;
    const visibleWorldWidth = camera.width / camera.zoom;
    const visibleWorldHeight = camera.height / camera.zoom;
    const shouldRecenter = shouldRecenterProjectileCamera({
      projectile,
      cameraCenter: {
        x: camera.scrollX + visibleWorldWidth / 2,
        y: camera.scrollY + visibleWorldHeight / 2,
      },
      visibleWorldWidth,
      visibleWorldHeight,
    });

    if (shouldRecenter) {
      camera.centerOn(projectile.x, projectile.y);
    }
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
    const isBungerShot = shooter?.classId === "bunger";
    const craterRadius = isBungerShot ? BUNGER_CRATER_RADIUS : CRATER_RADIUS;
    const damageRadius = isBungerShot ? BUNGER_DAMAGE_RADIUS : DAMAGE_RADIUS;
    this.impactPreview = {
      x,
      y,
      craterRadius,
      damageRadius,
      isBungerShot,
      timeLeft: IMPACT_PREVIEW_SECONDS,
    };
    this.makeCrater(x, y, craterRadius, isBungerShot ? 1.3 : 0.68);
    const damaged: string[] = [];
    const bungeEvents: string[] = [];
    const affectedVehicleIds = new Set<string>();
    const defeatMarkedIds = new Set<string>();
    if (directHitId) {
      affectedVehicleIds.add(directHitId);
    }

    for (const vehicle of this.vehicles) {
      if (
        !vehicle.alive ||
        !shouldApplyWeaponEffect({
          shooterId: shooter?.id,
          shooterTeam: shooter?.team,
          targetId: vehicle.id,
          targetTeam: vehicle.team,
        })
      ) {
        continue;
      }
      const d = distanceToVehicleHitZone(x, y, this.vehicleHitZoneFor(vehicle));
      const directHit = vehicle.id === directHitId;
      const splashFactor = Phaser.Math.Clamp(1 - d / damageRadius, 0, 1);
      if (splashFactor > 0 || directHit) {
        const splash = Math.round((isBungerShot ? 18 : 34) * splashFactor);
        const damage = vehicle.id === directHitId ? Math.max(isBungerShot ? 22 : 34, splash) : splash;
        if (damage <= 0) {
          continue;
        }
        affectedVehicleIds.add(vehicle.id);
        vehicle.hp = Math.max(0, vehicle.hp - damage);
        damaged.push(`${vehicle.username} -${damage}`);
        this.addVehicleCombatMarker(vehicle, directHit ? "direct" : "splash", `${directHit ? "DIRECT" : "SPLASH"} -${damage}`);
        if (vehicle.hp <= 0) {
          vehicle.alive = false;
          vehicle.defeatReason = "damage";
          defeatMarkedIds.add(vehicle.id);
          this.addVehicleCombatMarker(vehicle, "ko", "KO", 1);
        }
        if (isBungerShot && vehicle.alive) {
          const beforeX = vehicle.x;
          const knockStrength = splashFactor;
          const direction = vehicle.x >= x ? 1 : -1;
          vehicle.x = Phaser.Math.Clamp(vehicle.x + direction * BUNGER_KNOCKBACK * knockStrength, MOVE_MIN_X, MOVE_MAX_X);
          if (Math.abs(vehicle.x - beforeX) > 12) {
            affectedVehicleIds.add(vehicle.id);
            bungeEvents.push(`${vehicle.username} shoved`);
            this.addVehicleCombatMarker(vehicle, "shoved", "SHOVED", 1);
          }
        }
      }
    }

    this.projectile = undefined;
    const aliveBeforeSettle = new Set(this.vehicles.filter((vehicle) => vehicle.alive).map((vehicle) => vehicle.id));
    const fallEvents = this.settleVehicles({
      changedX: x,
      changedRadius: Math.max(craterRadius, damageRadius),
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
    const start = Math.max(0, Math.floor(centerX - radius));
    const end = Math.min(WORLD_WIDTH, Math.ceil(centerX + radius));
    for (let x = start; x <= end; x += 1) {
      const dx = x - centerX;
      const inside = radius * radius - dx * dx;
      if (inside <= 0) {
        continue;
      }
      const carvedSurface = centerY + Math.sqrt(inside) * depthFactor;
      const breaksThrough = carvedSurface >= this.terrainBreakthroughY();
      this.terrain[x] = breaksThrough
        ? VOID_SURFACE_Y
        : Math.min(VOID_SURFACE_Y, Math.max(this.terrain[x], carvedSurface));
    }
  }

  private settleVehicles(options?: SettleOptions): string[] {
    const fallEvents: string[] = [];
    for (const vehicle of this.vehicles) {
      if (!vehicle.alive) {
        continue;
      }
      const forceSettle = options?.forceIds?.has(vehicle.id) ?? false;
      const terrainMayHaveChanged =
        !options || Math.abs(vehicle.x - options.changedX) <= options.changedRadius + VEHICLE_HALF_WIDTH + 42;

      if (terrainMayHaveChanged || forceSettle) {
        for (let i = 0; i < 14; i += 1) {
          const left = this.surfaceAt(vehicle.x - 18);
          const right = this.surfaceAt(vehicle.x + 18);
          const slope = right - left;
          if (Math.abs(slope) < 18) {
            break;
          }
          vehicle.x = Phaser.Math.Clamp(vehicle.x + Math.sign(slope) * 7, MOVE_MIN_X, MOVE_MAX_X);
        }
      }

      if (this.placeVehicleOnSurface(vehicle)) {
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

    if (this.aliveTeams().size <= 1) {
      this.endRound();
      return;
    }

    for (let i = 0; i < this.turnOrder.length; i += 1) {
      this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
      const next = this.activeVehicle();
      if (next && this.isMovable(next)) {
        this.beginTurn();
        return;
      }
    }

    this.endRound();
  }

  private isMovable(vehicle: VehicleState): boolean {
    return this.isAlive(vehicle) && this.turnOrder.includes(vehicle.id);
  }

  private isAlive(vehicle: VehicleState): boolean {
    return vehicle.alive && vehicle.hp > 0;
  }

  private aliveTeams(): Set<TeamId> {
    return new Set(this.vehicles.filter((vehicle) => this.isAlive(vehicle)).map((vehicle) => vehicle.team));
  }

  private winningTeam(): TeamId | undefined {
    const aliveTeams = this.aliveTeams();
    return aliveTeams.size === 1 ? [...aliveTeams][0] : undefined;
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

  private updateCameraViewport(): void {
    const playfieldHeight = this.playfieldHeight();
    this.cameras.main.setViewport(0, 0, this.scale.width, playfieldHeight);
  }

  private playfieldHeight(): number {
    return computeCommandPanelLayout({ width: this.scale.width, height: this.scale.height }).playfieldHeight;
  }

  private frameBattlefield(duration = 0): void {
    const aliveVehicles = this.vehicles.filter((vehicle) => vehicle.alive);
    if (aliveVehicles.length === 0) {
      return;
    }

    const frame = computeBattlefieldFrameLayout({
      viewportWidth: this.scale.width,
      playfieldHeight: this.playfieldHeight(),
      worldWidth: WORLD_WIDTH,
      aliveVehicleXs: aliveVehicles.map((vehicle) => vehicle.x),
      frameBottomWorldY: this.visibleVoidBottomY(),
    });
    const bounds = computeCameraWorldBounds({
      worldWidth: WORLD_WIDTH,
      visibleWorldWidth: frame.visibleWorldWidth,
    });
    this.cameras.main.setBounds(bounds.x, 0, bounds.width, WORLD_RENDER_HEIGHT);

    if (duration > 0) {
      this.cameras.main.pan(frame.centerX, frame.centerY, duration, "Sine.easeInOut");
      this.cameras.main.zoomTo(frame.zoom, duration);
      return;
    }

    this.cameras.main.setZoom(frame.zoom);
    this.cameras.main.centerOn(frame.centerX, frame.centerY);
  }

  private surfaceAt(x: number): number {
    if (x < 0 || x > WORLD_WIDTH) {
      return VOID_SURFACE_Y;
    }

    const index = Phaser.Math.Clamp(Math.round(x), 0, WORLD_WIDTH);
    return this.terrain[index] ?? VOID_SURFACE_Y;
  }

  private placeVehicleOnSurface(vehicle: VehicleState): boolean {
    const fallStartX = vehicle.x;
    const fallStartY = vehicle.y > 0 ? vehicle.y : this.visibleVoidTopY - 40;
    const surface = this.surfaceAt(vehicle.x);
    vehicle.y = surface - VEHICLE_HALF_HEIGHT;

    if (surface >= DEATH_SURFACE_Y) {
      const targetX = this.nearestVoidDisplayX(fallStartX);
      const targetY = this.voidDropTargetY();
      vehicle.alive = false;
      vehicle.hp = 0;
      vehicle.defeatReason = "void";
      vehicle.voidDropPresentation = {
        fromX: fallStartX,
        fromY: fallStartY,
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

    const angle = Phaser.Math.RadToDeg(Math.atan2(right - left, VEHICLE_HALF_WIDTH * 2));
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
    const gfx = this.terrainGfx;
    gfx.clear();
    this.drawVoidHazard(gfx);
    this.drawMapLandmarks(gfx, "backdrop");

    let segment: Array<{ x: number; y: number }> = [];
    const flushSegment = () => {
      if (segment.length < 2) {
        segment = [];
        return;
      }

      const first = segment[0];
      const last = segment[segment.length - 1];
      gfx.fillStyle(0x3c2f2f, 1);
      gfx.beginPath();
      gfx.moveTo(first.x, this.terrainPlatformBottomY());
      for (const point of segment) {
        gfx.lineTo(point.x, point.y);
      }
      gfx.lineTo(last.x, this.terrainPlatformBottomY());
      gfx.closePath();
      gfx.fillPath();

      gfx.lineStyle(12, 0x92e676, 1);
      gfx.beginPath();
      gfx.moveTo(first.x, first.y);
      for (const point of segment.slice(1)) {
        gfx.lineTo(point.x, point.y);
      }
      gfx.strokePath();
      segment = [];
    };

    for (let x = 0; x <= WORLD_WIDTH; x += TERRAIN_STEP) {
      const surface = this.surfaceAt(x);
      if (surface >= this.terrainBreakthroughY()) {
        flushSegment();
        continue;
      }
      segment.push({ x, y: surface });
    }
    flushSegment();
    this.drawMapLandmarks(gfx, "highlight");
  }

  private drawVoidHazard(gfx: Phaser.GameObjects.Graphics): void {
    const top = this.visibleVoidTopY;
    const bottom = this.visibleVoidBottomY();
    gfx.fillStyle(0x020613, 0.74);
    gfx.fillRect(0, top, WORLD_WIDTH, bottom - top);
    gfx.lineStyle(5, 0x8be9ff, 0.38);
    gfx.lineBetween(0, top, WORLD_WIDTH, top);
    gfx.lineStyle(2, 0xff5c7a, 0.22);
    for (let y = top + 18; y < bottom; y += 28) {
      gfx.lineBetween(0, y, WORLD_WIDTH, y + Math.sin(y * 0.033) * 14);
    }
    gfx.fillStyle(0x8be9ff, 0.2);
    for (let x = 46; x < WORLD_WIDTH; x += 118) {
      gfx.fillRect(x, top + 14 + ((x * 19) % 78), 4, 28);
    }
  }

  private drawMapLandmarks(gfx: Phaser.GameObjects.Graphics, pass: "backdrop" | "highlight"): void {
    const landmarks = this.currentDemoMap?.map.landmarks ?? [];
    for (const landmark of landmarks) {
      switch (landmark.type) {
        case "ring": {
          if (pass === "backdrop") {
            gfx.lineStyle(18, 0x7d8fa8, 0.08);
            this.strokeEllipseArc(gfx, landmark.x, landmark.y, landmark.width / 2, landmark.height / 2, 0, Math.PI * 2);
            gfx.lineStyle(5, 0xb7c8da, 0.055);
            this.strokeEllipseArc(
              gfx,
              landmark.x,
              landmark.y,
              landmark.width * 0.37,
              landmark.height * 0.32,
              0,
              Math.PI * 2,
            );
          }
          break;
        }
        case "bridge":
        case "arch": {
          const y = landmark.y + landmark.height * 0.26;
          const left = landmark.x - landmark.width / 2;
          const right = landmark.x + landmark.width / 2;
          gfx.lineStyle(
            pass === "backdrop" ? 18 : 4,
            pass === "backdrop" ? 0x9b7650 : 0xffd166,
            pass === "backdrop" ? 0.2 : 0.3,
          );
          gfx.beginPath();
          for (let step = 0; step <= 12; step += 1) {
            const t = step / 12;
            const x = Phaser.Math.Linear(left, right, t);
            const archY = y - Math.sin(t * Math.PI) * landmark.height * 0.74;
            if (step === 0) {
              gfx.moveTo(x, archY);
            } else {
              gfx.lineTo(x, archY);
            }
          }
          gfx.strokePath();
          break;
        }
        case "shelf": {
          if (pass === "highlight") {
            gfx.lineStyle(5, 0xffd166, 0.22);
            gfx.lineBetween(landmark.x - landmark.width / 2, landmark.y, landmark.x + landmark.width / 2, landmark.y);
          }
          break;
        }
        case "spire": {
          if (pass === "backdrop") {
            gfx.fillStyle(0x7a5b3f, 0.16);
            gfx.fillTriangle(
              landmark.x,
              landmark.y - landmark.height / 2,
              landmark.x - landmark.width / 2,
              landmark.y + landmark.height / 2,
              landmark.x + landmark.width / 2,
              landmark.y + landmark.height / 2,
            );
          }
          break;
        }
      }
    }
  }

  private strokeEllipseArc(
    gfx: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    startAngle: number,
    endAngle: number,
    steps = 28,
  ): void {
    gfx.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const angle = Phaser.Math.Linear(startAngle, endAngle, t);
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      if (step === 0) {
        gfx.moveTo(x, y);
      } else {
        gfx.lineTo(x, y);
      }
    }
    gfx.strokePath();
  }

  private drawAim(): void {
    this.aimGfx.clear();
    const active = this.activeVehicle();
    if (!active || !this.isMovable(active) || this.projectile || this.roundOver || this.turnCommitted) {
      return;
    }

    this.drawMoveRange(active);

    const radians = Phaser.Math.DegToRad(active.angle);
    const dirX = Math.cos(radians);
    const dirY = -Math.sin(radians);
    const muzzleX = active.x + dirX * 48;
    const muzzleY = active.y - 13 + dirY * 48;
    const lineLength = 172;
    const tipX = muzzleX + dirX * lineLength;
    const tipY = muzzleY + dirY * lineLength;
    const baseX = tipX - dirX * 20;
    const baseY = tipY - dirY * 20;
    const perpX = -dirY;
    const perpY = dirX;

    this.aimGfx.lineStyle(7, 0x0b1020, 0.68);
    this.aimGfx.lineBetween(muzzleX, muzzleY, tipX, tipY);
    this.aimGfx.lineStyle(3, active.accent, 0.95);
    this.aimGfx.lineBetween(muzzleX, muzzleY, tipX, tipY);
    this.aimGfx.fillStyle(active.accent, 0.96);
    this.aimGfx.fillTriangle(
      tipX,
      tipY,
      baseX + perpX * 10,
      baseY + perpY * 10,
      baseX - perpX * 10,
      baseY - perpY * 10,
    );
    this.aimGfx.fillStyle(0xffffff, 0.92);
    this.aimGfx.fillCircle(muzzleX, muzzleY, 4);
  }

  private drawMoveRange(active: VehicleState): void {
    const maxDistance = active.moveUnits * MOVE_PIXELS_PER_UNIT;
    if (maxDistance <= 1) {
      return;
    }

    const leftX = Phaser.Math.Clamp(active.x - maxDistance, MOVE_MIN_X, MOVE_MAX_X);
    const rightX = Phaser.Math.Clamp(active.x + maxDistance, MOVE_MIN_X, MOVE_MAX_X);

    this.aimGfx.lineStyle(7, 0x0b1020, 0.5);
    this.drawTerrainRangeLine(leftX, rightX, 10);
    this.aimGfx.lineStyle(4, 0x57f287, 0.58);
    this.drawTerrainRangeLine(leftX, rightX, 10);

    const tickCount = Math.floor((rightX - leftX) / MOVE_PIXELS_PER_UNIT);
    this.aimGfx.lineStyle(2, 0xb9ffd0, 0.72);
    for (let i = 0; i <= tickCount; i += 1) {
      const x = leftX + i * MOVE_PIXELS_PER_UNIT;
      const y = this.surfaceAt(x) - 10;
      if (y >= WORLD_HEIGHT) {
        continue;
      }
      this.aimGfx.lineBetween(x, y - 6, x, y + 6);
    }
  }

  private drawTerrainRangeLine(startX: number, endX: number, yOffset: number): void {
    let drawing = false;
    this.aimGfx.beginPath();
    for (let x = startX + 8; x <= endX; x += 8) {
      const y = this.surfaceAt(x) - yOffset;
      if (y >= WORLD_HEIGHT) {
        drawing = false;
        continue;
      }
      if (!drawing) {
        this.aimGfx.moveTo(x, y);
        drawing = true;
      } else {
        this.aimGfx.lineTo(x, y);
      }
    }
    this.aimGfx.strokePath();
  }

  private drawImpactPreview(): void {
    const gfx = this.impactGfx;
    gfx.clear();
    const preview = this.impactPreview;
    if (!preview) {
      return;
    }

    const alpha = Phaser.Math.Clamp(preview.timeLeft / IMPACT_PREVIEW_SECONDS, 0, 1);
    gfx.fillStyle(0xfff4c2, 0.08 * alpha);
    gfx.fillCircle(preview.x, preview.y, preview.damageRadius);
    gfx.lineStyle(4, 0xfff4c2, 0.62 * alpha);
    gfx.strokeCircle(preview.x, preview.y, preview.damageRadius);

    const craterColor = preview.isBungerShot ? 0xff7a5c : 0x8be9ff;
    gfx.fillStyle(craterColor, 0.1 * alpha);
    gfx.fillCircle(preview.x, preview.y, preview.craterRadius);
    gfx.lineStyle(3, craterColor, 0.86 * alpha);
    gfx.strokeCircle(preview.x, preview.y, preview.craterRadius);
  }

  private characterPoseFor(vehicle: VehicleState, active: boolean): CharacterPose {
    if (!vehicle.alive) {
      return "ko";
    }

    return active && this.charging ? "intense" : "default";
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

  private combatHullFor(vehicle: VehicleState): CombatHull {
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

  private drawFootingMarker(gfx: Phaser.GameObjects.Graphics, vehicle: VehicleState, active: boolean): void {
    if (!active || !vehicle.alive) {
      return;
    }

    const surface = this.surfaceAt(vehicle.x);
    const leftX = vehicle.x - VEHICLE_HALF_WIDTH;
    const rightX = vehicle.x + VEHICLE_HALF_WIDTH;
    gfx.lineStyle(8, 0x020613, 0.62);
    gfx.lineBetween(leftX, surface - 2, rightX, surface - 2);
    gfx.lineStyle(3, vehicle.accent, 0.86);
    gfx.lineBetween(leftX, surface - 4, rightX, surface - 4);
  }

  private drawVehicles(): void {
    const gfx = this.vehicleGfx;
    const collisionGfx = this.collisionGfx;
    const worldUiScale = readableWorldUiScale(this.cameras.main.zoom);
    const overlayLayout = computeUnitWorldOverlayLayout({
      useUnitConceptPreview: USE_UNIT_CONCEPT_PREVIEW,
      worldUiScale,
    });
    gfx.clear();
    collisionGfx.clear();

    for (const label of this.vehicleLabels) {
      label.destroy();
    }
    this.vehicleLabels = [];

    for (const vehicle of this.vehicles) {
      const defeatPresentation = vehicle.alive ? undefined : defeatPresentationFor(vehicle.defeatReason);
      const alpha = vehicle.alive ? 1 : defeatPresentation?.alpha ?? 0.9;
      const voidDropPosition =
        vehicle.voidDropPresentation && defeatPresentation?.label === "VOID DROPPED"
          ? voidDropRenderPosition(vehicle.voidDropPresentation)
          : undefined;
      const renderX = voidDropPosition?.x ?? vehicle.x;
      const renderY = voidDropPosition?.y ?? defeatPresentation?.y ?? vehicle.y;
      const active =
        this.activeVehicle()?.id === vehicle.id &&
        !this.projectile &&
        !this.roundOver &&
        !this.turnCommitted &&
        this.isMovable(vehicle);
      const vehicleKey = vehicle.alive ? vehicle.vehicleSpriteKey : vehicle.vehicleDestroyedSpriteKey;
      const vehicleDisplay = vehicle.alive ? vehicle.vehicleDisplay : vehicle.vehicleDestroyedDisplay;
      const slopeAngle = vehicle.defeatReason === "void" ? 0 : this.terrainAngleAt(vehicle.x);
      const koTilt = vehicle.alive ? 0 : vehicle.team === "red" ? -8 : 8;
      const vehicleSprite = this.vehicleSprites.get(vehicle.id) ?? this.add.image(renderX, renderY, vehicleKey);
      if (!this.vehicleSprites.has(vehicle.id)) {
        vehicleSprite.setDepth(11);
        this.vehicleSprites.set(vehicle.id, vehicleSprite);
      }

      this.drawFootingMarker(gfx, vehicle, active);

      if (
        USE_UNIT_CONCEPT_PREVIEW &&
        vehicle.unitConceptSpriteKeys &&
        vehicle.unitConceptDisplays &&
        vehicle.unitConceptSpriteFaces
      ) {
        const conceptPose = this.characterPoseFor(vehicle, active);
        const conceptKey = vehicle.unitConceptSpriteKeys[conceptPose];
        const conceptDisplay = scaleBattlefieldDisplay(vehicle.unitConceptDisplays[conceptPose]);
        vehicleSprite
          .setTexture(conceptKey)
          .setOrigin(0.5, 0.86)
          .setPosition(renderX, renderY + scaleBattlefieldOffset(vehicle.unitConceptOffsetY ?? 24))
          .setDisplaySize(conceptDisplay.width, conceptDisplay.height)
          .setFlipX(vehicle.facing !== vehicle.unitConceptSpriteFaces)
          .setAlpha(alpha)
          .setAngle(slopeAngle + koTilt);
        if (defeatPresentation?.tint) {
          vehicleSprite.setTint(defeatPresentation.tint);
        } else {
          vehicleSprite.clearTint();
        }
        this.characterSprites.get(vehicle.id)?.setAlpha(0);
      } else {
        vehicleSprite
          .setTexture(vehicleKey)
          .setOrigin(0.5, 0.86)
          .setPosition(renderX, renderY + 20)
          .setDisplaySize(vehicleDisplay.width, vehicleDisplay.height)
          .setFlipX(vehicle.facing !== vehicle.vehicleSpriteFaces)
          .setAlpha(alpha)
          .setAngle(slopeAngle + koTilt);

        if (defeatPresentation?.tint) {
          vehicleSprite.setTint(defeatPresentation.tint);
        } else {
          vehicleSprite.clearTint();
        }

        const characterPose = this.characterPoseFor(vehicle, active);
        const characterKey = vehicle.characterSpriteKeys[characterPose];
        const characterDisplay = vehicle.characterDisplays[characterPose];
        const characterX =
          renderX + this.orientedOffset(vehicle, vehicle.characterOffsetX, vehicle.characterSpriteFaces);
        const characterSprite =
          this.characterSprites.get(vehicle.id) ?? this.add.image(characterX, renderY, characterKey);
        if (!this.characterSprites.has(vehicle.id)) {
          characterSprite.setDepth(12);
          this.characterSprites.set(vehicle.id, characterSprite);
        }
        characterSprite
          .setTexture(characterKey)
          .setOrigin(0.5, 0.88)
          .setPosition(characterX, renderY + vehicle.characterOffsetY)
          .setDisplaySize(characterDisplay.width, characterDisplay.height)
          .setFlipX(vehicle.facing !== vehicle.characterSpriteFaces)
          .setAlpha(alpha)
          .setAngle(slopeAngle + koTilt);
        if (defeatPresentation?.tint) {
          characterSprite.setTint(defeatPresentation.tint);
        } else {
          characterSprite.clearTint();
        }
      }

      if (this.showCombatHulls && vehicle.alive) {
        const hull = this.combatHullFor(vehicle);
        const hullCenter = this.combatHullCenter(vehicle);
        const hullColor = active ? 0xffffff : vehicle.accent;
        const overlay = collisionZoneOverlayStyle(active, hullColor);
        const left = hullCenter.x - hull.width / 2;
        const top = hullCenter.y - hull.height / 2;
        collisionGfx.fillStyle(overlay.fillColor, overlay.fillAlpha);
        collisionGfx.fillRoundedRect(left, top, hull.width, hull.height, 8);
        collisionGfx.lineStyle(overlay.lineWidth, overlay.lineColor, overlay.lineAlpha);
        collisionGfx.strokeRoundedRect(
          left,
          top,
          hull.width,
          hull.height,
          8,
        );
        collisionGfx.lineStyle(overlay.crossWidth, overlay.crossColor, overlay.crossAlpha);
        collisionGfx.lineBetween(left + 8, hullCenter.y, left + hull.width - 8, hullCenter.y);
        collisionGfx.lineBetween(hullCenter.x, top + 8, hullCenter.x, top + hull.height - 8);
      }

      if (vehicle.alive || vehicle.defeatReason === "damage") {
        gfx.fillStyle(0x0f172a, 0.88);
        const hpY = renderY - overlayLayout.teamBarOffsetY;
        const hpWidth = overlayLayout.teamBarWidth;
        const hpHeight = overlayLayout.teamBarHeight;
        const hpRadius = Math.max(4, hpHeight / 2);
        gfx.fillRoundedRect(renderX - hpWidth / 2, hpY, hpWidth, hpHeight, hpRadius);
        gfx.fillStyle(vehicle.team === "red" ? 0xff4d5d : 0x4cc9f0, 0.92);
        gfx.fillRoundedRect(
          renderX - hpWidth / 2 + 2 * worldUiScale,
          hpY + 2 * worldUiScale,
          Math.max(0, (hpWidth - 4 * worldUiScale) * (vehicle.hp / MAX_HP)),
          Math.max(3, hpHeight - 4 * worldUiScale),
          hpRadius,
        );
      }

      const labelY = renderY - overlayLayout.nameOffsetY;
      const label = this.add
        .text(renderX, labelY, vehicle.username, {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "16px",
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#10131b",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setScale(worldUiScale)
        .setDepth(16);
      this.vehicleLabels.push(label);

      const stateLabel = defeatPresentation?.label ?? vehicle.className;
      const classLabel = this.add
        .text(renderX, renderY - overlayLayout.classOffsetY, stateLabel, {
          fontFamily: "Consolas, 'SFMono-Regular', monospace",
          fontSize: "12px",
          color: vehicle.defeatReason === "void" ? "#8be9ff" : vehicle.team === "red" ? "#ffd166" : "#8be9ff",
          stroke: "#10131b",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setScale(worldUiScale)
        .setDepth(16);
      this.vehicleLabels.push(classLabel);

      if (active) {
        const timerY = renderY - overlayLayout.timerOffsetY;
        const timerWidth = overlayLayout.timerBadgeWidth;
        const timerHeight = overlayLayout.timerBadgeHeight;
        const timerRadius = overlayLayout.timerBadgeRadius;
        gfx.fillStyle(0x0b1020, 0.88);
        gfx.fillRoundedRect(
          renderX - timerWidth / 2,
          timerY - timerHeight * 0.45,
          timerWidth,
          timerHeight,
          timerRadius,
        );
        gfx.lineStyle(2, vehicle.accent, 0.72);
        gfx.strokeRoundedRect(
          renderX - timerWidth / 2,
          timerY - timerHeight * 0.45,
          timerWidth,
          timerHeight,
          timerRadius,
        );

        const timerTag = this.add
          .text(renderX, timerY, `${Math.ceil(this.turnTime)}s`, {
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: "24px",
            fontStyle: "700",
            color: "#ffffff",
            stroke: "#10131b",
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setScale(worldUiScale)
          .setDepth(16);
        this.vehicleLabels.push(timerTag);

        const turnTag = this.add
          .text(renderX, timerY + overlayLayout.turnTagGapY, "TURN", {
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: "11px",
            fontStyle: "700",
            color: "#ffd166",
            stroke: "#10131b",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setScale(worldUiScale)
          .setDepth(16);
        this.vehicleLabels.push(turnTag);
      }
    }
  }

  private drawProjectile(): void {
    const gfx = this.projectileGfx;
    gfx.clear();
    const p = this.projectile;
    if (!p) {
      return;
    }

    for (let i = 0; i < p.trail.length; i += 1) {
      const point = p.trail[i];
      const t = i / Math.max(p.trail.length - 1, 1);
      gfx.fillStyle(0xffd166, 0.08 + t * 0.46);
      gfx.fillCircle(point.x, point.y, 3 + t * 5);
    }

    gfx.fillStyle(p.team === "red" ? 0xff4d5d : 0x4cc9f0, 1);
    gfx.fillCircle(p.x, p.y, PROJECTILE_RADIUS);
    gfx.fillStyle(0xffffff, 0.85);
    gfx.fillCircle(p.x - 3, p.y - 3, 4);
  }

  private drawHud(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const active = this.activeVehicle() ?? this.vehicles[0]!;
    const winner = this.winningTeam();
    const roundComplete = this.roundOver || this.aliveTeams().size <= 1;

    this.drawControlPanel(
      active && !roundComplete && !this.turnCommitted ? active : undefined,
      roundComplete || Boolean(winner),
    );
    return;

    this.hudGfx.clear();
    this.hudGfx.fillStyle(0x0b1020, 0.82);
    this.hudGfx.fillRoundedRect(12, 10, Math.min(620, width - 24), 128, 8);
    this.hudGfx.fillRoundedRect(width / 2 - 88, 10, 176, 76, 8);
    this.timerText.setPosition(width / 2, 14);

    if (active && !winner) {
      this.hudText.setText(
        `${active.username} / ${active.className}     Angle ${Math.round(active.angle)}°     Wind ${this.windLabel()}     ${Math.ceil(
          this.turnTime,
        )}s`,
      );
    } else {
      this.hudText.setText("Round complete");
    }

    if (active && !winner) {
      const elevation = active.facing === 1 ? active.angle : 180 - active.angle;
      this.hudText.setText(
        `${active.username} / ${active.className}     Aim ${Math.round(elevation)} deg     Wind ${this.windLabel()}     Move ${Math.round(
          active.moveUnits,
        )}%`,
      );
      this.timerText.setText(`${Math.ceil(this.turnTime)}s`);
    } else {
      this.timerText.setText("END");
    }

    this.rosterText.setText(
      this.vehicles
        .map((vehicle) => `${vehicle.team.toUpperCase()} ${vehicle.username}: ${vehicle.hp} HP`)
        .join("     "),
    );
    this.eventText.setText(this.shotResult);

    const powerWidth = Math.min(520, width - 64);
    const powerX = (width - powerWidth) / 2;
    const powerY = height - 58;
    const power = this.charging ? this.charge / MAX_POWER : 0;

    this.powerLabelText.setPosition(width / 2, powerY - 28);
    this.hudGfx.fillStyle(0x0b1020, 0.82);
    this.hudGfx.fillRoundedRect(powerX - 16, powerY - 34, powerWidth + 32, 72, 8);
    this.hudGfx.fillStyle(0x182033, 1);
    this.hudGfx.fillRoundedRect(powerX, powerY, powerWidth, 24, 6);
    this.hudGfx.fillStyle(0xffd166, 1);
    this.hudGfx.fillRoundedRect(powerX, powerY, powerWidth * power, 24, 6);
    this.hudGfx.lineStyle(2, 0xfff4c2, 0.95);
    this.hudGfx.strokeRoundedRect(powerX, powerY, powerWidth, 24, 6);

    this.drawAimDial(active && !winner && !this.projectile ? active : undefined);
    this.drawControlPanel(active && !winner ? active : undefined, Boolean(winner));
  }

  private drawAimDial(active?: VehicleState): void {
    const width = this.scale.width;
    const panelWidth = 236;
    const panelHeight = 132;
    const panelX = width - panelWidth - 16;
    const panelY = 10;
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + 92;
    const radius = 54;

    this.hudGfx.fillStyle(0x0b1020, 0.82);
    this.hudGfx.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.hudGfx.lineStyle(2, 0x8be9ff, 0.42);
    this.hudGfx.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

    this.hudGfx.lineStyle(3, 0x30405f, 1);
    this.hudGfx.beginPath();
    this.hudGfx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2, false);
    this.hudGfx.strokePath();

    if (!active) {
      this.aimDialText.setPosition(centerX, panelY + 18);
      this.aimDialText.setText("AIM\nwaiting");
      return;
    }

    const elevation = active.facing === 1 ? active.angle : 180 - active.angle;
    const needleAngle = active.facing === 1 ? active.angle : 180 - active.angle;
    const radians = Phaser.Math.DegToRad(180 + needleAngle);
    const needleX = centerX - Math.cos(radians) * radius;
    const needleY = centerY + Math.sin(radians) * radius;

    this.hudGfx.lineStyle(6, active.accent, 1);
    this.hudGfx.lineBetween(centerX, centerY, needleX, needleY);
    this.hudGfx.fillStyle(0xffffff, 1);
    this.hudGfx.fillCircle(centerX, centerY, 5);
    this.hudGfx.fillStyle(active.accent, 1);
    this.hudGfx.fillCircle(needleX, needleY, 7);

    this.aimDialText.setPosition(centerX, panelY + 16);
    this.aimDialText.setText(`AIM ${Math.round(elevation)} deg\n${active.facing === 1 ? "facing right" : "facing left"}`);
  }

  private drawControlPanel(active?: VehicleState, roundComplete = false): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const layout = computeCommandPanelLayout({ width, height });
    const panelWidth = layout.dockWidth;
    const panelHeight = layout.panelHeight;
    const panelX = layout.dockX;
    const panelY = layout.panelY;
    const deck = computeCommandDeckElementLayout(layout);
    const deckScale = layout.contentScale;
    const scaled = (value: number): number => Math.round(value * deckScale);
    const rounded = (value: number): number => Math.max(4, scaled(value));

    this.hudGfx.clear();
    this.timerText.setText("");
    this.hudGfx.fillStyle(0x0b1020, 0.92);
    this.hudGfx.fillRect(0, panelY, width, panelHeight);
    this.hudGfx.fillStyle(0x050817, 0.96);
    this.hudGfx.fillRect(0, panelY + panelHeight, width, layout.bottomMargin);
    this.hudGfx.lineStyle(4, 0x8be9ff, 0.36);
    this.hudGfx.lineBetween(0, panelY, width, panelY);
    this.hudGfx.lineStyle(1, 0xffffff, 0.08);
    this.hudGfx.lineBetween(0, panelY + 5, width, panelY + 5);

    if (!active) {
      this.hudPortrait.setAlpha(0);
      this.hudText
        .setPosition(panelX + scaled(24), panelY + scaled(28))
        .setText(roundComplete ? "Round complete" : "Waiting")
        .setStyle({
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${deck.titleFontSize}px`,
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.rosterText
        .setPosition(panelX + scaled(24), panelY + scaled(68))
        .setText(roundComplete ? "Next round starts automatically. Press R to restart now." : "Waiting for turn.")
        .setStyle({
          fontFamily: "Consolas, 'SFMono-Regular', monospace",
          fontSize: `${deck.detailFontSize}px`,
          color: "#ffd166",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.eventText
        .setPosition(panelX + scaled(24), panelY + scaled(104))
        .setText(this.shotResult)
        .setStyle({
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${Math.max(11, scaled(14))}px`,
          color: "#ffd166",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.powerLabelText.setText("");
      this.powerHintText.setText("");
      this.movementLabelText.setText("");
      this.aimDialText.setText("");
      this.drawGlobalRoundStatus(undefined, roundComplete);
      return;
    }

    const accentColor = active.team === "red" ? "#ffd166" : "#8be9ff";
    this.hudGfx.fillStyle(0x111827, 1);
    this.hudGfx.fillRoundedRect(
      deck.portraitFrame.x,
      deck.portraitFrame.y,
      deck.portraitFrame.width,
      deck.portraitFrame.height,
      rounded(8),
    );
    this.hudGfx.lineStyle(2, active.accent, 0.72);
    this.hudGfx.strokeRoundedRect(
      deck.portraitFrame.x,
      deck.portraitFrame.y,
      deck.portraitFrame.width,
      deck.portraitFrame.height,
      rounded(8),
    );
    this.hudPortrait
      .setTexture(active.portraitKey)
      .setPosition(deck.portrait.x, deck.portrait.y)
      .setDisplaySize(deck.portrait.width, deck.portrait.height)
      .setAlpha(1);

    this.hudText
      .setPosition(deck.title.x, deck.title.y)
      .setText(active.username)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${deck.titleFontSize}px`,
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#10131b",
        strokeThickness: 4,
      });
    this.rosterText
      .setPosition(deck.detail.x, deck.detail.y)
      .setText(`${active.className}     HP ${active.hp}/${MAX_HP}`)
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: `${deck.detailFontSize}px`,
        color: accentColor,
        stroke: "#10131b",
        strokeThickness: 4,
      });
    this.eventText
      .setPosition(deck.event.x, deck.event.y)
      .setText(this.projectile ? "Shot in flight..." : this.shotResult)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${Math.max(11, scaled(14))}px`,
        color: "#ffd166",
        stroke: "#10131b",
        strokeThickness: 4,
      });

    this.drawMoveMeter(deck.moveMeter.x, deck.moveMeter.y, deck.moveMeter.width, active.moveUnits, deckScale);

    const power = this.charging ? this.charge / MAX_POWER : 0;
    this.drawLaunchPowerMeter(deck.launchMeter.x, deck.launchMeter.y, deck.launchMeter.width, power, deckScale);

    this.drawPanelAimDial(active, deck.aimPanel.x, deck.aimPanel.y, deck.aimPanel.width, deck.aimPanel.height, deckScale);
    this.drawGlobalRoundStatus(active, false);
  }

  private drawGlobalRoundStatus(active?: VehicleState, roundComplete = false): void {
    void active;
    void roundComplete;
    const layout = computeWindHudLayout({ width: this.scale.width, height: this.scale.height });
    const windLabel = `WIND ${this.windLabel()}`;
    this.timerText.setText("");

    this.hudGfx.fillStyle(0x06111f, 0.9);
    this.hudGfx.fillRoundedRect(layout.x - layout.width / 2, layout.y, layout.width, layout.height, 8);
    this.hudGfx.fillStyle(0x8be9ff, 0.09);
    this.hudGfx.fillRoundedRect(layout.x - layout.width / 2 + 5, layout.y + 5, layout.width - 10, 12, 6);
    this.hudGfx.lineStyle(2, 0x8be9ff, 0.5);
    this.hudGfx.strokeRoundedRect(layout.x - layout.width / 2, layout.y, layout.width, layout.height, 8);
    this.windText
      .setOrigin(0.5)
      .setPosition(layout.x, layout.y + layout.height / 2)
      .setText(windLabel)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "26px",
        fontStyle: "700",
        color: "#8be9ff",
        stroke: "#0b1020",
        strokeThickness: 7,
      });
  }

  private drawHudBar(x: number, y: number, width: number, height: number, value: number, color: number): void {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    this.hudGfx.fillStyle(0x182033, 1);
    this.hudGfx.fillRoundedRect(x, y, width, height, 6);
    this.hudGfx.fillStyle(color, 1);
    this.hudGfx.fillRoundedRect(x, y, width * clamped, height, 6);
    this.hudGfx.lineStyle(2, 0xffffff, 0.36);
    this.hudGfx.strokeRoundedRect(x, y, width, height, 6);
  }

  private drawLaunchPowerMeter(x: number, y: number, width: number, value: number, scale = 1): void {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    const percent = Math.round(clamped * 100);
    const scaled = (pixels: number): number => Math.round(pixels * scale);
    const compact = width < 320 * scale;
    const height = scaled(76);
    const meterX = x + scaled(14);
    const meterY = y + scaled(34);
    const meterWidth = width - scaled(28);
    const meterHeight = scaled(28);
    const radius = Math.max(4, scaled(8));
    const meterRadius = Math.max(4, scaled(7));

    this.hudGfx.fillStyle(0x111827, 1);
    this.hudGfx.fillRoundedRect(x, y, width, height, radius);
    this.hudGfx.lineStyle(2, this.charging ? 0xffd166 : 0xffffff, this.charging ? 0.72 : 0.22);
    this.hudGfx.strokeRoundedRect(x, y, width, height, radius);

    this.powerLabelText
      .setPosition(x + scaled(14), y + scaled(10))
      .setOrigin(0, 0)
      .setText(`${compact ? "POWER" : "LAUNCH POWER"} ${percent}%`)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${Math.max(12, scaled(17))}px`,
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    this.powerHintText
      .setPosition(x + width - scaled(14), y + scaled(13))
      .setOrigin(1, 0)
      .setText(this.charging ? (compact ? "FIRE" : "RELEASE TO FIRE") : compact ? "SPACE" : "HOLD SPACE")
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: `${Math.max(10, scaled(12))}px`,
        fontStyle: "700",
        color: this.charging ? "#ffffff" : "#aeb7c8",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    this.hudGfx.fillStyle(0x182033, 1);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, meterRadius);
    this.hudGfx.fillStyle(0xffd166, 1);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth * clamped, meterHeight, meterRadius);
    this.hudGfx.fillStyle(0xffffff, this.charging ? 0.18 : 0.08);
    this.hudGfx.fillRoundedRect(meterX, meterY + scaled(4), meterWidth * clamped, Math.max(3, scaled(7)), Math.max(2, scaled(4)));

    for (let i = 1; i < 4; i += 1) {
      const tickX = meterX + (meterWidth * i) / 4;
      this.hudGfx.lineStyle(2, 0x0b1020, 0.42);
      this.hudGfx.lineBetween(tickX, meterY + scaled(4), tickX, meterY + meterHeight - scaled(4));
      this.hudGfx.lineStyle(1, 0xffffff, 0.2);
      this.hudGfx.lineBetween(tickX + 1, meterY + scaled(5), tickX + 1, meterY + meterHeight - scaled(5));
    }

    this.hudGfx.lineStyle(2, 0xfff4c2, 0.72);
    this.hudGfx.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, meterRadius);
  }

  private drawMoveMeter(x: number, y: number, width: number, remainingUnits: number, scale = 1): void {
    const clamped = Phaser.Math.Clamp(remainingUnits / MAX_MOVE_UNITS, 0, 1);
    const label = `${remainingUnits.toFixed(1)}u`;
    const scaled = (pixels: number): number => Math.round(pixels * scale);
    const height = scaled(42);
    const radius = Math.max(4, scaled(8));

    this.hudGfx.fillStyle(0x111827, 0.96);
    this.hudGfx.fillRoundedRect(x, y, width, height, radius);
    this.hudGfx.lineStyle(2, 0x57f287, 0.42);
    this.hudGfx.strokeRoundedRect(x, y, width, height, radius);

    this.movementLabelText
      .setPosition(x + scaled(12), y + scaled(7))
      .setOrigin(0, 0)
      .setText(`MOVE RANGE  ${label}`)
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: `${Math.max(10, scaled(13))}px`,
        fontStyle: "700",
        color: "#b9ffd0",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    const meterX = x + scaled(12);
    const meterY = y + scaled(27);
    const meterWidth = width - scaled(24);
    const meterHeight = Math.max(5, scaled(8));
    this.hudGfx.fillStyle(0x182033, 1);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, Math.max(3, scaled(4)));
    this.hudGfx.fillStyle(0x57f287, 0.95);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth * clamped, meterHeight, Math.max(3, scaled(4)));
    this.hudGfx.lineStyle(1, 0xffffff, 0.22);
    this.hudGfx.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, Math.max(3, scaled(4)));
  }

  private drawPanelAimDial(
    active: VehicleState,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number,
    scale = 1,
  ): void {
    const scaled = (pixels: number): number => Math.round(pixels * scale);
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + panelHeight - scaled(24);
    const radius = scaled(52);
    const elevation = active.facing === 1 ? active.angle : 180 - active.angle;
    const radians = Phaser.Math.DegToRad(180 + elevation);
    const needleX = centerX - Math.cos(radians) * radius;
    const needleY = centerY + Math.sin(radians) * radius;

    this.hudGfx.fillStyle(0x111827, 1);
    this.hudGfx.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, Math.max(4, scaled(8)));
    this.hudGfx.lineStyle(2, active.accent, 0.55);
    this.hudGfx.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, Math.max(4, scaled(8)));
    this.hudGfx.lineStyle(3, 0x30405f, 1);
    this.hudGfx.beginPath();
    this.hudGfx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2, false);
    this.hudGfx.strokePath();
    this.hudGfx.lineStyle(Math.max(3, scaled(6)), active.accent, 1);
    this.hudGfx.lineBetween(centerX, centerY, needleX, needleY);
    this.hudGfx.fillStyle(0xffffff, 1);
    this.hudGfx.fillCircle(centerX, centerY, Math.max(3, scaled(5)));
    this.hudGfx.fillStyle(active.accent, 1);
    this.hudGfx.fillCircle(needleX, needleY, Math.max(4, scaled(7)));

    this.aimDialText
      .setPosition(centerX, panelY + scaled(14))
      .setText(`AIM ${Math.round(elevation)} deg\n${active.facing === 1 ? "right" : "left"}`)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${Math.max(11, scaled(15))}px`,
        fontStyle: "700",
        color: "#ffffff",
        align: "center",
        stroke: "#0b1020",
        strokeThickness: 4,
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

const initialBrowserViewport = getGameViewportSize(window, document.documentElement);
const initialViewport = computeGameCanvasSize(initialBrowserViewport);
currentViewportSupported = isSupportedGameViewport(initialBrowserViewport);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10131b",
  width: initialViewport.width,
  height: initialViewport.height,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: GravityGridScene,
};

const game = new Phaser.Game(config);
const viewportGuard = mountViewportGuard();
syncGameViewportSize();
window.addEventListener("resize", syncGameViewportSize);
window.visualViewport?.addEventListener("resize", syncGameViewportSize);
window.visualViewport?.addEventListener("scroll", syncGameViewportSize);

if (shouldMountOnlineLobby(window.location.search)) {
  mountOnlineLobby();
}

function syncGameViewportSize(): void {
  const browserViewport = getGameViewportSize(window, document.documentElement);
  const gameViewport = computeGameCanvasSize(browserViewport);
  currentViewportSupported = isSupportedGameViewport(browserViewport);
  document.documentElement.style.setProperty("--game-viewport-width", `${gameViewport.width}px`);
  document.documentElement.style.setProperty("--game-viewport-height", `${gameViewport.height}px`);
  game.scale.resize(gameViewport.width, gameViewport.height);
  updateViewportGuard(browserViewport);
}

function mountViewportGuard(): HTMLDivElement {
  const guard = document.createElement("div");
  guard.className = "viewport-guard";
  guard.hidden = true;

  const panel = document.createElement("div");
  panel.className = "viewport-guard__panel";

  const title = document.createElement("strong");
  title.textContent = "Resize window to play";

  const body = document.createElement("span");
  body.textContent = `Gravity Canyon v1 needs at least ${MIN_SUPPORTED_VIEWPORT.width} x ${MIN_SUPPORTED_VIEWPORT.height} visible browser pixels.`;

  const current = document.createElement("small");
  current.dataset.viewportGuardCurrent = "true";

  panel.append(title, body, current);
  guard.append(panel);
  document.body.append(guard);

  return guard;
}

function updateViewportGuard(viewport: { width: number; height: number }): void {
  viewportGuard.hidden = currentViewportSupported;
  const current = viewportGuard.querySelector<HTMLElement>("[data-viewport-guard-current]");
  if (current) {
    current.textContent = `Current: ${viewport.width} x ${viewport.height}`;
  }
}
