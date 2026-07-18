import type { ClassId, TeamId } from "../model/gameTypes.js";
import { distanceToVehicleHitZone, type VehicleHitZone } from "./vehicleHitZone.js";

export interface ProjectileImpactTuning {
  craterRadius: number;
  bungerCraterRadius: number;
  damageRadius: number;
  bungerDamageRadius: number;
  bungerKnockback: number;
  moveMinX: number;
  moveMaxX: number;
}

export interface ProjectileImpactShooter {
  id?: string;
  team?: TeamId;
  classId?: ClassId;
}

export type ProjectileImpactHitZone = VehicleHitZone;

export interface ProjectileImpactVehicle {
  id: string;
  username: string;
  team: TeamId;
  alive: boolean;
  hp: number;
  x: number;
  hitZone: ProjectileImpactHitZone;
}

export interface ResolveProjectileImpactInput {
  x: number;
  y: number;
  directHitId?: string;
  shooter?: ProjectileImpactShooter;
  vehicles: readonly ProjectileImpactVehicle[];
  tuning: ProjectileImpactTuning;
}

export interface ProjectileDamageEvent {
  vehicleId: string;
  username: string;
  hitKind: "direct" | "splash";
  damage: number;
  hpBefore: number;
  hpAfter: number;
  defeated: boolean;
}

export interface ProjectileKnockbackEvent {
  vehicleId: string;
  username: string;
  fromX: number;
  toX: number;
  distance: number;
}

export interface ProjectileImpactVehicleUpdate {
  vehicleId: string;
  hp: number;
  alive: boolean;
  x: number;
  defeatReason?: "damage";
}

export interface ProjectileImpactResolution {
  isBungerShot: boolean;
  craterRadius: number;
  craterDepthFactor: number;
  damageRadius: number;
  changedRadius: number;
  affectedVehicleIds: string[];
  damageDefeatIds: string[];
  damageEvents: ProjectileDamageEvent[];
  knockbackEvents: ProjectileKnockbackEvent[];
  vehicleUpdates: ProjectileImpactVehicleUpdate[];
}

export function resolveProjectileImpact(input: ResolveProjectileImpactInput): ProjectileImpactResolution {
  const isBungerShot = input.shooter?.classId === "bunger";
  const craterRadius = isBungerShot ? input.tuning.bungerCraterRadius : input.tuning.craterRadius;
  const damageRadius = isBungerShot ? input.tuning.bungerDamageRadius : input.tuning.damageRadius;
  const affectedVehicleIds = new Set<string>();
  const damageDefeatIds = new Set<string>();
  const damageEvents: ProjectileDamageEvent[] = [];
  const knockbackEvents: ProjectileKnockbackEvent[] = [];
  const vehicleUpdates: ProjectileImpactVehicleUpdate[] = [];

  if (input.directHitId) {
    affectedVehicleIds.add(input.directHitId);
  }

  for (const vehicle of input.vehicles) {
    if (!vehicle.alive || !shouldApplyWeaponEffect(input.shooter, vehicle)) {
      continue;
    }

    const distance = distanceToVehicleHitZone(input.x, input.y, vehicle.hitZone);
    const directHit = vehicle.id === input.directHitId;
    const splashFactor = clamp(1 - distance / damageRadius, 0, 1);

    if (splashFactor <= 0 && !directHit) {
      continue;
    }

    const splash = Math.round((isBungerShot ? 18 : 34) * splashFactor);
    const damage = directHit ? Math.max(isBungerShot ? 22 : 34, splash) : splash;

    if (damage <= 0) {
      continue;
    }

    affectedVehicleIds.add(vehicle.id);
    const hpAfter = Math.max(0, vehicle.hp - damage);
    const defeated = hpAfter <= 0;
    let xAfter = vehicle.x;

    damageEvents.push({
      vehicleId: vehicle.id,
      username: vehicle.username,
      hitKind: directHit ? "direct" : "splash",
      damage,
      hpBefore: vehicle.hp,
      hpAfter,
      defeated,
    });

    if (defeated) {
      damageDefeatIds.add(vehicle.id);
    }

    if (isBungerShot && !defeated) {
      const direction = vehicle.x >= input.x ? 1 : -1;
      const toX = clamp(
        vehicle.x + direction * input.tuning.bungerKnockback * splashFactor,
        input.tuning.moveMinX,
        input.tuning.moveMaxX,
      );
      const distanceMoved = Math.abs(toX - vehicle.x);
      xAfter = toX;

      if (distanceMoved > 12) {
        affectedVehicleIds.add(vehicle.id);
        knockbackEvents.push({
          vehicleId: vehicle.id,
          username: vehicle.username,
          fromX: vehicle.x,
          toX,
          distance: distanceMoved,
        });
      }
    }

    vehicleUpdates.push({
      vehicleId: vehicle.id,
      hp: hpAfter,
      alive: !defeated,
      x: xAfter,
      ...(defeated ? { defeatReason: "damage" as const } : {}),
    });
  }

  return {
    isBungerShot,
    craterRadius,
    craterDepthFactor: isBungerShot ? 1.3 : 0.68,
    damageRadius,
    changedRadius: Math.max(craterRadius, damageRadius),
    affectedVehicleIds: [...affectedVehicleIds],
    damageDefeatIds: [...damageDefeatIds],
    damageEvents,
    knockbackEvents,
    vehicleUpdates,
  };
}

export function shouldApplyWeaponEffect(
  shooter: ProjectileImpactShooter | undefined,
  target: Pick<ProjectileImpactVehicle, "id" | "team">,
): boolean {
  if (!shooter?.id || !shooter.team) {
    return true;
  }

  if (target.id === shooter.id) {
    return true;
  }

  return target.team !== shooter.team;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
