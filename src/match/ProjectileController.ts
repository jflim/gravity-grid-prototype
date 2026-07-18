import {
  isProjectileOutOfBounds,
  launchProjectile,
  stepProjectile,
} from "../../shared/gameplay/projectile.js";
import {
  firstProjectileCollisionContact,
  firstTerrainContact,
  firstVehicleContact,
} from "../../shared/gameplay/projectileCollision.js";
import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { TeamId } from "../../shared/model/gameTypes.js";
import type { ProjectileCollision, ProjectileState } from "./MatchTypes";

export interface ProjectileControllerOptions {
  projectileRadius: number;
  maxPower: number;
  shotSpeedMin: number;
  shotSpeedMax: number;
  muzzleDistance: number;
  muzzleYOffset: number;
  windForce: number;
  gravity: number;
  worldWidth: number;
  worldHeight: number;
  lowerYMargin: number;
  upperYMargin: number;
  maxTrailPoints: number;
}

export interface ProjectileShooter {
  id: string;
  team: TeamId;
  x: number;
  y: number;
  angle: number;
}

export interface ProjectileTarget {
  id: string;
  team: TeamId;
  alive: boolean;
  hitZone: VehicleHitZone;
}

export type ProjectileAdvanceResult =
  | { kind: "in-flight" }
  | { kind: "collision"; collision: ProjectileCollision }
  | { kind: "out-of-bounds" };

export interface AdvanceProjectileInput {
  projectile: ProjectileState;
  deltaSeconds: number;
  wind: number;
  targets: ProjectileTarget[];
  surfaceAt: (x: number) => number;
}

export class ProjectileController {
  constructor(private readonly options: ProjectileControllerOptions) {}

  createProjectile(shooter: ProjectileShooter, power: number): ProjectileState {
    const projectile = launchProjectile({
      shooterX: shooter.x,
      shooterY: shooter.y,
      angleDeg: shooter.angle,
      power,
      maxPower: this.options.maxPower,
      shotSpeedMin: this.options.shotSpeedMin,
      shotSpeedMax: this.options.shotSpeedMax,
      muzzleDistance: this.options.muzzleDistance,
      muzzleYOffset: this.options.muzzleYOffset,
    });

    return {
      ...projectile,
      shooterId: shooter.id,
      team: shooter.team,
      trail: [],
    };
  }

  advance(input: AdvanceProjectileInput): ProjectileAdvanceResult {
    const projectile = input.projectile;
    projectile.trail.push({ x: projectile.x, y: projectile.y });
    if (projectile.trail.length > this.options.maxTrailPoints) {
      projectile.trail.shift();
    }

    const step = stepProjectile({
      projectile,
      deltaSeconds: input.deltaSeconds,
      wind: input.wind,
      windForce: this.options.windForce,
      gravity: this.options.gravity,
    });

    const collision = this.findProjectileCollision(input, step.startX, step.startY, step.endX, step.endY);
    if (collision) {
      projectile.x = collision.x;
      projectile.y = collision.y;
      return { kind: "collision", collision };
    }

    projectile.x = step.projectile.x;
    projectile.y = step.projectile.y;
    projectile.vx = step.projectile.vx;
    projectile.vy = step.projectile.vy;

    if (
      isProjectileOutOfBounds(projectile, {
        worldWidth: this.options.worldWidth,
        worldHeight: this.options.worldHeight,
        lowerYMargin: this.options.lowerYMargin,
        upperYMargin: this.options.upperYMargin,
      })
    ) {
      return { kind: "out-of-bounds" };
    }

    return { kind: "in-flight" };
  }

  private findProjectileCollision(
    input: AdvanceProjectileInput,
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
      projectileRadius: this.options.projectileRadius,
      zones: input.targets
        .filter(
          (target) =>
            this.targetCanCollideWithProjectile(target, input.projectile) &&
            target.id !== input.projectile.shooterId &&
            target.team !== input.projectile.team,
        )
        .map((target) => ({
          id: target.id,
          ...target.hitZone,
        })),
    });
    const terrainContact = firstTerrainContact({
      startX,
      startY,
      endX,
      endY,
      projectileRadius: this.options.projectileRadius,
      worldWidth: this.options.worldWidth,
      surfaceAt: input.surfaceAt,
    });

    return firstProjectileCollisionContact(vehicleContact, terrainContact);
  }

  private targetCanCollideWithProjectile(target: ProjectileTarget, projectile: ProjectileState): boolean {
    return target.alive || target.id === projectile.serverReplayDirectHitId;
  }
}
