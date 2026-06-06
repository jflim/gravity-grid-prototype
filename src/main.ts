import Phaser from "phaser";
import { mountOnlineLobby } from "./onlineLobby";
import "./styles.css";

type TeamId = "red" | "blue";
type ClassId = "bunger" | "glitch";

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
  color: number;
  accent: number;
  spriteKey: string;
  portraitKey: string;
  spriteFaces: 1 | -1;
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

interface ImpactPreview {
  x: number;
  y: number;
  craterRadius: number;
  damageRadius: number;
  isBungerShot: boolean;
  timeLeft: number;
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
const SHOT_SPEED_MIN = 240;
const SHOT_SPEED_MAX = 780;
const WIND_FORCE = 34;
const CRATER_RADIUS = 76;
const BUNGER_CRATER_RADIUS = 124;
const DAMAGE_RADIUS = 112;
const BUNGER_DAMAGE_RADIUS = 156;
const BUNGER_KNOCKBACK = 150;
const DIRECT_HIT_RADIUS = VEHICLE_RADIUS + 9;
const IMPACT_PREVIEW_SECONDS = 1.25;
const TURN_SECONDS = 30;
const COMMAND_PANEL_HEIGHT = 184;
const VOID_SURFACE_Y = WORLD_HEIGHT + 260;
const DEATH_SURFACE_Y = WORLD_HEIGHT - 6;

class GravityGridScene extends Phaser.Scene {
  private terrain: number[] = [];
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

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private resetKey?: Phaser.Input.Keyboard.Key;

  private terrainGfx!: Phaser.GameObjects.Graphics;
  private vehicleGfx!: Phaser.GameObjects.Graphics;
  private projectileGfx!: Phaser.GameObjects.Graphics;
  private hudGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private impactGfx!: Phaser.GameObjects.Graphics;
  private koGfx!: Phaser.GameObjects.Graphics;
  private vehicleLabels: Phaser.GameObjects.Text[] = [];
  private vehicleSprites = new Map<string, Phaser.GameObjects.Image>();
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

  constructor() {
    super("GravityGridScene");
  }

  preload(): void {
    this.load.image("style-reference", "assets/style-b-2v2-reference.png");
    this.load.image("nova-vehicle", "assets/nova-vehicle.png");
    this.load.image("nova-gameplay", "assets/nova-gameplay.png");
    this.load.image("vesper-vehicle", "assets/vesper-vehicle.png");
    this.load.image("vesper-gameplay", "assets/vesper-gameplay.png");
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.resetKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.createBackground();
    this.terrainGfx = this.add.graphics();
    this.aimGfx = this.add.graphics();
    this.impactGfx = this.add.graphics().setDepth(9);
    this.vehicleGfx = this.add.graphics();
    this.projectileGfx = this.add.graphics();
    this.koGfx = this.add.graphics().setDepth(14);
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

    this.startRound();
    this.updateCameraViewport();
    this.scale.on("resize", () => {
      this.updateCameraViewport();
      this.frameBattlefield(0);
      this.drawHud();
    });
  }

  update(_: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.033);
    this.updateImpactPreview(dt);

    if (this.resetKey && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.startRound();
      return;
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
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x111827);
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

    const voidLayer = this.add.graphics();
    voidLayer.fillStyle(0x050817, 0.9);
    voidLayer.fillRect(0, 560, WORLD_WIDTH, WORLD_HEIGHT - 560);
    voidLayer.lineStyle(2, 0x42d9ff, 0.12);
    for (let y = 590; y < WORLD_HEIGHT; y += 34) {
      voidLayer.lineBetween(0, y, WORLD_WIDTH, y + Math.sin(y * 0.025) * 10);
    }
    voidLayer.lineStyle(2, 0xff4d5d, 0.08);
    for (let x = 120; x < WORLD_WIDTH; x += 220) {
      voidLayer.lineBetween(x, 620, x + 76, WORLD_HEIGHT);
    }
  }

  private startRound(): void {
    this.pendingRoundEvent?.remove(false);
    this.pendingRoundEvent = undefined;
    this.roundOver = false;
    this.generateTerrain();
    this.vehicles = [
      {
        id: "red-1",
        username: "Nova",
        team: "red",
        classId: "bunger",
        className: "Bunger Rig",
        x: 385,
        y: 0,
        hp: MAX_HP,
        angle: 47,
        facing: 1,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
        color: 0xff4d5d,
        accent: 0xffd166,
        spriteKey: "nova-gameplay",
        portraitKey: "nova-vehicle",
        spriteFaces: 1,
      },
      {
        id: "blue-1",
        username: "Vesper",
        team: "blue",
        classId: "glitch",
        className: "Glitch Rover",
        x: 1995,
        y: 0,
        hp: MAX_HP,
        angle: 133,
        facing: -1,
        moveUnits: MAX_MOVE_UNITS,
        alive: true,
        color: 0x4cc9f0,
        accent: 0xb8f7ff,
        spriteKey: "vesper-gameplay",
        portraitKey: "vesper-vehicle",
        spriteFaces: -1,
      },
    ];
    this.turnOrder = ["red-1", "blue-1"];
    this.turnIndex = 0;
    this.projectile = undefined;
    this.impactPreview = undefined;
    this.turnCommitted = false;
    this.charge = 0;
    this.charging = false;
    this.shotResult = "Round started.";
    this.settleVehicles();
    this.beginTurn();
    this.drawWorld();
  }

  private generateTerrain(): void {
    this.terrain = new Array(WORLD_WIDTH + 1);
    for (let x = 0; x <= WORLD_WIDTH; x += TERRAIN_STEP) {
      const nx = x / WORLD_WIDTH;
      const base =
        612 +
        Math.sin(nx * Math.PI * 2.1 + 0.4) * 72 +
        Math.sin(nx * Math.PI * 5.8 + 1.2) * 34 +
        Math.sin(nx * Math.PI * 12.5) * 12;
      const valley = 110 * Math.exp(-Math.pow((x - WORLD_WIDTH / 2) / 380, 2));
      const y = Phaser.Math.Clamp(base + valley, 420, 760);
      for (let i = 0; i < TERRAIN_STEP && x + i <= WORLD_WIDTH; i += 1) {
        this.terrain[x + i] = y;
      }
    }

    this.flattenSpawnZone(385, 150);
    this.flattenSpawnZone(1995, 150);
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
      this.cameras.main.centerOn(p.x, p.y);
      this.resolveImpact(collision.x, collision.y, collision.directHitId);
      return;
    }

    p.x = nextX;
    p.y = nextY;

    this.cameras.main.centerOn(p.x, p.y);

    if (p.x < 0 || p.x > WORLD_WIDTH || p.y > WORLD_HEIGHT + 120 || p.y < -220) {
      this.shotResult = "Shot flew out of bounds.";
      this.projectile = undefined;
      this.queueRoundEvent(700, () => this.advanceTurn());
      return;
    }
  }

  private findProjectileCollision(
    projectile: ProjectileState,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): ProjectileCollision | undefined {
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const steps = Math.max(4, Math.ceil(distance / 22));

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = Phaser.Math.Linear(startX, endX, t);
      const y = Phaser.Math.Linear(startY, endY, t);

      const hitVehicle = this.vehicles.find((vehicle) => {
        if (!vehicle.alive || vehicle.id === projectile.shooterId) {
          return false;
        }
        return Phaser.Math.Distance.Between(x, y, vehicle.x, vehicle.y) < DIRECT_HIT_RADIUS;
      });

      if (hitVehicle) {
        return { x, y, directHitId: hitVehicle.id };
      }

      if (x >= 0 && x <= WORLD_WIDTH) {
        const surface = this.surfaceAt(x);
        if (y >= surface) {
          return { x, y: surface };
        }
      }
    }

    return undefined;
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
    this.makeCrater(x, y, craterRadius, isBungerShot ? 2.35 : 0.9);
    const damaged: string[] = [];
    const bungeEvents: string[] = [];
    const affectedVehicleIds = new Set<string>();
    if (directHitId) {
      affectedVehicleIds.add(directHitId);
    }

    for (const vehicle of this.vehicles) {
      if (!vehicle.alive || vehicle.id === shooter?.id) {
        continue;
      }
      const d = Phaser.Math.Distance.Between(x, y, vehicle.x, vehicle.y);
      const directHit = vehicle.id === directHitId;
      const splashFactor = Phaser.Math.Clamp(1 - d / damageRadius, 0, 1);
      if (splashFactor > 0 || directHit) {
        const splash = Math.round((isBungerShot ? 30 : 46) * splashFactor);
        const damage = vehicle.id === directHitId ? Math.max(isBungerShot ? 24 : 38, splash) : splash;
        if (damage <= 0) {
          continue;
        }
        affectedVehicleIds.add(vehicle.id);
        vehicle.hp = Math.max(0, vehicle.hp - damage);
        damaged.push(`${vehicle.username} -${damage}`);
        if (vehicle.hp <= 0) {
          vehicle.alive = false;
        }
        if (isBungerShot && vehicle.alive) {
          const beforeX = vehicle.x;
          const knockStrength = splashFactor;
          const direction = vehicle.x >= x ? 1 : -1;
          vehicle.x = Phaser.Math.Clamp(vehicle.x + direction * BUNGER_KNOCKBACK * knockStrength, MOVE_MIN_X, MOVE_MAX_X);
          if (Math.abs(vehicle.x - beforeX) > 12) {
            affectedVehicleIds.add(vehicle.id);
            bungeEvents.push(`${vehicle.username} shoved`);
          }
        }
      }
    }

    this.projectile = undefined;
    const fallEvents = this.settleVehicles({
      changedX: x,
      changedRadius: Math.max(craterRadius, damageRadius),
      forceIds: affectedVehicleIds,
    });
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
      const breaksThrough = carvedSurface >= WORLD_HEIGHT - 36;
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
        fallEvents.push(`${vehicle.username} bunged out`);
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
    return Math.max(420, this.scale.height - COMMAND_PANEL_HEIGHT);
  }

  private frameBattlefield(duration = 0): void {
    const aliveVehicles = this.vehicles.filter((vehicle) => vehicle.alive);
    if (aliveVehicles.length === 0) {
      return;
    }

    const minX = Math.min(...aliveVehicles.map((vehicle) => vehicle.x), 0);
    const maxX = Math.max(...aliveVehicles.map((vehicle) => vehicle.x), WORLD_WIDTH);
    const centerX = (minX + maxX) / 2;
    const targetWidth = Math.max(maxX - minX + 560, WORLD_WIDTH * 0.78);
    const targetHeight = 760;
    const zoomX = this.scale.width / targetWidth;
    const zoomY = this.playfieldHeight() / targetHeight;
    const zoom = Phaser.Math.Clamp(Math.min(zoomX, zoomY), 0.52, 0.9);
    const centerY = 470;

    if (duration > 0) {
      this.cameras.main.pan(centerX, centerY, duration, "Sine.easeInOut");
      this.cameras.main.zoomTo(zoom, duration);
      return;
    }

    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(centerX, centerY);
  }

  private surfaceAt(x: number): number {
    if (x < 0 || x > WORLD_WIDTH) {
      return VOID_SURFACE_Y;
    }

    const index = Phaser.Math.Clamp(Math.round(x), 0, WORLD_WIDTH);
    return this.terrain[index] ?? VOID_SURFACE_Y;
  }

  private placeVehicleOnSurface(vehicle: VehicleState): boolean {
    const surface = this.surfaceAt(vehicle.x);
    vehicle.y = surface - VEHICLE_HALF_HEIGHT;

    if (surface >= DEATH_SURFACE_Y) {
      vehicle.alive = false;
      vehicle.hp = 0;
      return true;
    }

    return false;
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
    const gfx = this.terrainGfx;
    gfx.clear();

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
      gfx.moveTo(first.x, WORLD_HEIGHT);
      for (const point of segment) {
        gfx.lineTo(point.x, point.y);
      }
      gfx.lineTo(last.x, WORLD_HEIGHT);
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
      if (surface >= WORLD_HEIGHT) {
        flushSegment();
        continue;
      }
      segment.push({ x, y: surface });
    }
    flushSegment();
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

  private drawVehicles(): void {
    const gfx = this.vehicleGfx;
    gfx.clear();
    this.koGfx.clear();

    for (const label of this.vehicleLabels) {
      label.destroy();
    }
    this.vehicleLabels = [];

    for (const vehicle of this.vehicles) {
      const alpha = vehicle.alive ? 1 : 0.72;
      const active =
        this.activeVehicle()?.id === vehicle.id &&
        !this.projectile &&
        !this.roundOver &&
        !this.turnCommitted &&
        this.isMovable(vehicle);
      const sprite = this.vehicleSprites.get(vehicle.id) ?? this.add.image(vehicle.x, vehicle.y, vehicle.spriteKey);
      if (!this.vehicleSprites.has(vehicle.id)) {
        sprite.setDepth(11);
        this.vehicleSprites.set(vehicle.id, sprite);
      }
      sprite
        .setTexture(vehicle.spriteKey)
        .setOrigin(0.5, 0.86)
        .setPosition(vehicle.x, vehicle.y + 18)
        .setDisplaySize(238, 178)
        .setFlipX(vehicle.facing !== vehicle.spriteFaces)
        .setAlpha(alpha)
        .setAngle(vehicle.alive ? 0 : vehicle.team === "red" ? -7 : 7);

      if (vehicle.alive) {
        sprite.clearTint();
      } else {
        sprite.setTint(0xb7bed3);
      }

      gfx.lineStyle(active ? 4 : 2, active ? 0xffffff : vehicle.accent, active ? 0.95 : 0.5);
      gfx.strokeRoundedRect(vehicle.x - 108, vehicle.y - 98, 216, 130, 18);

      gfx.fillStyle(0x0f172a, 0.88);
      gfx.fillRoundedRect(vehicle.x - 44, vehicle.y - 76, 88, 14, 5);
      gfx.fillStyle(vehicle.team === "red" ? 0xff4d5d : 0x4cc9f0, 0.92);
      gfx.fillRoundedRect(vehicle.x - 42, vehicle.y - 74, 84 * (vehicle.hp / MAX_HP), 10, 4);

      const label = this.add
        .text(vehicle.x, vehicle.y - 118, vehicle.username, {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "16px",
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#10131b",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(16);
      this.vehicleLabels.push(label);

      const classLabel = this.add
        .text(vehicle.x, vehicle.y - 97, vehicle.className, {
          fontFamily: "Consolas, 'SFMono-Regular', monospace",
          fontSize: "12px",
          color: vehicle.team === "red" ? "#ffd166" : "#8be9ff",
          stroke: "#10131b",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(16);
      this.vehicleLabels.push(classLabel);

      if (!vehicle.alive) {
        this.drawCharacterKoExpression(vehicle);
      }

      if (active) {
        const timerY = vehicle.y - 178;
        gfx.fillStyle(0x0b1020, 0.88);
        gfx.fillRoundedRect(vehicle.x - 52, timerY - 18, 104, 40, 10);
        gfx.lineStyle(2, vehicle.accent, 0.72);
        gfx.strokeRoundedRect(vehicle.x - 52, timerY - 18, 104, 40, 10);

        const timerTag = this.add
          .text(vehicle.x, timerY, `${Math.ceil(this.turnTime)}s`, {
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: "24px",
            fontStyle: "700",
            color: "#ffffff",
            stroke: "#10131b",
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(16);
        this.vehicleLabels.push(timerTag);

        const turnTag = this.add
          .text(vehicle.x, timerY + 30, "TURN", {
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: "11px",
            fontStyle: "700",
            color: "#ffd166",
            stroke: "#10131b",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(16);
        this.vehicleLabels.push(turnTag);
      }
    }
  }

  private drawCharacterKoExpression(vehicle: VehicleState): void {
    const gfx = this.koGfx;
    const headX = vehicle.x + this.facingOffset(vehicle, vehicle.id === "red-1" ? -40 : -4);
    const headY = vehicle.y - 86;

    if (vehicle.id === "red-1") {
      this.drawNovaKoExpression(headX, headY);
      return;
    }

    this.drawVesperKoExpression(headX, headY);
  }

  private facingOffset(vehicle: VehicleState, defaultFacingOffset: number): number {
    return vehicle.facing === vehicle.spriteFaces ? defaultFacingOffset : -defaultFacingOffset;
  }

  private drawNovaKoExpression(x: number, y: number): void {
    const gfx = this.koGfx;
    gfx.fillStyle(0xfff4c2, 0.96);
    gfx.fillEllipse(x - 8, y, 13, 11);
    gfx.fillEllipse(x + 9, y, 13, 11);
    gfx.lineStyle(2, 0x10131b, 1);
    gfx.strokeEllipse(x - 8, y, 13, 11);
    gfx.strokeEllipse(x + 9, y, 13, 11);
    gfx.fillStyle(0xff4d5d, 1);
    gfx.fillCircle(x - 8, y - 4, 3);
    gfx.fillCircle(x + 9, y - 4, 3);
    gfx.lineStyle(2, 0xffd166, 0.95);
    gfx.strokeCircle(x - 8, y, 6);
    gfx.strokeCircle(x + 9, y, 6);
    gfx.lineStyle(3, 0x10131b, 1);
    gfx.beginPath();
    gfx.arc(x + 1, y + 12, 8, Math.PI * 1.08, Math.PI * 1.9, false);
    gfx.strokePath();
    this.drawDizzySpark(x - 19, y - 24, 0xffd166);
    this.drawDizzySpark(x + 19, y - 23, 0xff4d5d);
  }

  private drawVesperKoExpression(x: number, y: number): void {
    const gfx = this.koGfx;
    gfx.fillStyle(0xe8fbff, 0.96);
    gfx.fillRoundedRect(x - 20, y - 6, 15, 12, 3);
    gfx.fillRoundedRect(x + 5, y - 6, 15, 12, 3);
    gfx.lineStyle(2, 0x10131b, 1);
    gfx.strokeRoundedRect(x - 20, y - 6, 15, 12, 3);
    gfx.strokeRoundedRect(x + 5, y - 6, 15, 12, 3);
    gfx.fillStyle(0x10131b, 1);
    gfx.fillCircle(x - 13, y - 3, 2);
    gfx.fillCircle(x + 12, y - 3, 2);
    gfx.lineStyle(3, 0x4cc9f0, 0.95);
    gfx.lineBetween(x - 24, y - 12, x - 5, y - 9);
    gfx.lineBetween(x + 3, y + 9, x + 24, y + 6);
    gfx.lineStyle(2, 0xff4dba, 0.78);
    gfx.lineBetween(x - 18, y + 15, x + 16, y + 13);
    gfx.lineStyle(3, 0x10131b, 1);
    gfx.beginPath();
    gfx.arc(x, y + 12, 7, Math.PI * 1.1, Math.PI * 1.9, false);
    gfx.strokePath();
  }

  private drawDizzySpark(x: number, y: number, color: number): void {
    const gfx = this.koGfx;
    gfx.lineStyle(3, color, 0.96);
    gfx.lineBetween(x - 7, y, x + 7, y);
    gfx.lineBetween(x, y - 7, x, y + 7);
    gfx.lineStyle(2, 0xffffff, 0.8);
    gfx.lineBetween(x - 4, y - 4, x + 4, y + 4);
    gfx.lineBetween(x + 4, y - 4, x - 4, y + 4);
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
    gfx.fillCircle(p.x, p.y, 11);
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
    const panelWidth = width;
    const panelHeight = COMMAND_PANEL_HEIGHT;
    const panelX = 0;
    const panelY = height - panelHeight;

    this.hudGfx.clear();
    this.hudGfx.fillStyle(0x0b1020, 0.92);
    this.hudGfx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.hudGfx.lineStyle(4, 0x8be9ff, 0.36);
    this.hudGfx.lineBetween(0, panelY, width, panelY);
    this.hudGfx.lineStyle(1, 0xffffff, 0.08);
    this.hudGfx.lineBetween(0, panelY + 5, width, panelY + 5);

    if (!active) {
      this.hudPortrait.setAlpha(0);
      this.hudText
        .setPosition(panelX + 24, panelY + 28)
        .setText(roundComplete ? "Round complete" : "Waiting")
        .setStyle({
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "22px",
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.rosterText
        .setPosition(panelX + 24, panelY + 68)
        .setText(roundComplete ? "Next round starts automatically. Press R to restart now." : "Waiting for turn.");
      this.eventText.setPosition(panelX + 24, panelY + 104).setText(this.shotResult);
      this.powerLabelText.setText("");
      this.powerHintText.setText("");
      this.movementLabelText.setText("");
      this.aimDialText.setText("");
      this.drawGlobalRoundStatus(undefined, roundComplete);
      return;
    }

    const accentColor = active.team === "red" ? "#ffd166" : "#8be9ff";
    const portraitX = panelX + 70;
    const portraitY = panelY + 86;
    this.hudGfx.fillStyle(0x111827, 1);
    this.hudGfx.fillRoundedRect(panelX + 18, panelY + 18, 104, 126, 8);
    this.hudGfx.lineStyle(2, active.accent, 0.72);
    this.hudGfx.strokeRoundedRect(panelX + 18, panelY + 18, 104, 126, 8);
    this.hudPortrait
      .setTexture(active.portraitKey)
      .setPosition(portraitX, portraitY)
      .setDisplaySize(118, 88)
      .setAlpha(1);

    this.hudText
      .setPosition(panelX + 140, panelY + 24)
      .setText(active.username)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#10131b",
        strokeThickness: 4,
      });
    this.rosterText
      .setPosition(panelX + 140, panelY + 54)
      .setText(`${active.className}     HP ${active.hp}/${MAX_HP}`)
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: "13px",
        color: accentColor,
        stroke: "#10131b",
        strokeThickness: 4,
      });
    this.eventText
      .setPosition(panelX + 140, panelY + 92)
      .setText(this.projectile ? "Shot in flight..." : this.shotResult)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "14px",
        color: "#ffd166",
        stroke: "#10131b",
        strokeThickness: 4,
      });

    this.drawMoveMeter(panelX + 140, panelY + 126, 218, active.moveUnits);

    const aimPanelX = panelX + panelWidth - 324;
    const launchX = panelX + Math.min(390, Math.max(286, panelWidth * 0.31));
    const launchWidth = Math.max(320, aimPanelX - launchX - 28);
    const power = this.charging ? this.charge / MAX_POWER : 0;
    this.drawLaunchPowerMeter(launchX, panelY + 42, launchWidth, power);

    this.drawPanelAimDial(active, aimPanelX, panelY + 24, 198, 128);
    this.drawGlobalRoundStatus(active, false);
  }

  private drawGlobalRoundStatus(active?: VehicleState, roundComplete = false): void {
    const width = this.scale.width;
    const timerLabel = roundComplete ? "END" : active ? `${Math.ceil(this.turnTime)}s` : "--";
    const windLabel = `WIND ${this.windLabel()}`;

    this.hudGfx.fillStyle(0x0b1020, 0.84);
    this.hudGfx.fillRoundedRect(width / 2 - 92, 12, 184, 76, 8);
    this.hudGfx.lineStyle(2, 0xffffff, 0.22);
    this.hudGfx.strokeRoundedRect(width / 2 - 92, 12, 184, 76, 8);
    this.timerText
      .setPosition(width / 2, 17)
      .setText(timerLabel)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "42px",
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#0b1020",
        strokeThickness: 8,
        align: "center",
      });

    this.hudGfx.fillStyle(0x0b1020, 0.78);
    this.hudGfx.fillRoundedRect(18, 16, 224, 58, 8);
    this.hudGfx.lineStyle(2, 0x8be9ff, 0.28);
    this.hudGfx.strokeRoundedRect(18, 16, 224, 58, 8);
    this.windText
      .setPosition(32, 24)
      .setText(windLabel)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "28px",
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

  private drawLaunchPowerMeter(x: number, y: number, width: number, value: number): void {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    const percent = Math.round(clamped * 100);
    const compact = width < 320;
    const meterX = x + 14;
    const meterY = y + 34;
    const meterWidth = width - 28;
    const meterHeight = 28;

    this.hudGfx.fillStyle(0x111827, 1);
    this.hudGfx.fillRoundedRect(x, y, width, 76, 8);
    this.hudGfx.lineStyle(2, this.charging ? 0xffd166 : 0xffffff, this.charging ? 0.72 : 0.22);
    this.hudGfx.strokeRoundedRect(x, y, width, 76, 8);

    this.powerLabelText
      .setPosition(x + 14, y + 10)
      .setOrigin(0, 0)
      .setText(`${compact ? "POWER" : "LAUNCH POWER"} ${percent}%`)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    this.powerHintText
      .setPosition(x + width - 14, y + 13)
      .setOrigin(1, 0)
      .setText(this.charging ? (compact ? "FIRE" : "RELEASE TO FIRE") : compact ? "SPACE" : "HOLD SPACE")
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: "12px",
        fontStyle: "700",
        color: this.charging ? "#ffffff" : "#aeb7c8",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    this.hudGfx.fillStyle(0x182033, 1);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, 7);
    this.hudGfx.fillStyle(0xffd166, 1);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth * clamped, meterHeight, 7);
    this.hudGfx.fillStyle(0xffffff, this.charging ? 0.18 : 0.08);
    this.hudGfx.fillRoundedRect(meterX, meterY + 4, meterWidth * clamped, 7, 4);

    for (let i = 1; i < 4; i += 1) {
      const tickX = meterX + (meterWidth * i) / 4;
      this.hudGfx.lineStyle(2, 0x0b1020, 0.42);
      this.hudGfx.lineBetween(tickX, meterY + 4, tickX, meterY + meterHeight - 4);
      this.hudGfx.lineStyle(1, 0xffffff, 0.2);
      this.hudGfx.lineBetween(tickX + 1, meterY + 5, tickX + 1, meterY + meterHeight - 5);
    }

    this.hudGfx.lineStyle(2, 0xfff4c2, 0.72);
    this.hudGfx.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, 7);
  }

  private drawMoveMeter(x: number, y: number, width: number, remainingUnits: number): void {
    const clamped = Phaser.Math.Clamp(remainingUnits / MAX_MOVE_UNITS, 0, 1);
    const label = `${remainingUnits.toFixed(1)}u`;

    this.hudGfx.fillStyle(0x111827, 0.96);
    this.hudGfx.fillRoundedRect(x, y, width, 42, 8);
    this.hudGfx.lineStyle(2, 0x57f287, 0.42);
    this.hudGfx.strokeRoundedRect(x, y, width, 42, 8);

    this.movementLabelText
      .setPosition(x + 12, y + 7)
      .setOrigin(0, 0)
      .setText(`MOVE RANGE  ${label}`)
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: "13px",
        fontStyle: "700",
        color: "#b9ffd0",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    const meterX = x + 12;
    const meterY = y + 27;
    const meterWidth = width - 24;
    this.hudGfx.fillStyle(0x182033, 1);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth, 8, 4);
    this.hudGfx.fillStyle(0x57f287, 0.95);
    this.hudGfx.fillRoundedRect(meterX, meterY, meterWidth * clamped, 8, 4);
    this.hudGfx.lineStyle(1, 0xffffff, 0.22);
    this.hudGfx.strokeRoundedRect(meterX, meterY, meterWidth, 8, 4);
  }

  private drawPanelAimDial(active: VehicleState, panelX: number, panelY: number, panelWidth: number, panelHeight: number): void {
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + panelHeight - 24;
    const radius = 52;
    const elevation = active.facing === 1 ? active.angle : 180 - active.angle;
    const radians = Phaser.Math.DegToRad(180 + elevation);
    const needleX = centerX - Math.cos(radians) * radius;
    const needleY = centerY + Math.sin(radians) * radius;

    this.hudGfx.fillStyle(0x111827, 1);
    this.hudGfx.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.hudGfx.lineStyle(2, active.accent, 0.55);
    this.hudGfx.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.hudGfx.lineStyle(3, 0x30405f, 1);
    this.hudGfx.beginPath();
    this.hudGfx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2, false);
    this.hudGfx.strokePath();
    this.hudGfx.lineStyle(6, active.accent, 1);
    this.hudGfx.lineBetween(centerX, centerY, needleX, needleY);
    this.hudGfx.fillStyle(0xffffff, 1);
    this.hudGfx.fillCircle(centerX, centerY, 5);
    this.hudGfx.fillStyle(active.accent, 1);
    this.hudGfx.fillCircle(needleX, needleY, 7);

    this.aimDialText
      .setPosition(centerX, panelY + 14)
      .setText(`AIM ${Math.round(elevation)} deg\n${active.facing === 1 ? "right" : "left"}`);
  }

  private windLabel(): string {
    if (Math.abs(this.wind) < 0.12) {
      return "calm";
    }
    const direction = this.wind > 0 ? ">>" : "<<";
    return `${direction} ${Math.round(Math.abs(this.wind) * 10)}`;
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10131b",
  width: window.innerWidth,
  height: window.innerHeight,
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

new Phaser.Game(config);
mountOnlineLobby();
