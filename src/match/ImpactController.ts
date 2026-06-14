import { resolveProjectileImpact, type ProjectileImpactTuning } from "../../shared/gameplay/impact.js";
import type { VehicleHitZone } from "../../shared/gameplay/vehicleHitZone.js";
import type { CombatMarkerKind } from "../../shared/model/gameTypes.js";
import type { ImpactPreview, ProjectileState, SettleOptions, VehicleState } from "./MatchTypes";

export interface ImpactControllerOptions extends ProjectileImpactTuning {
  impactPreviewSeconds: number;
}

export interface ResolveImpactInput {
  x: number;
  y: number;
  directHitId?: string;
  projectile?: Pick<ProjectileState, "shooterId">;
  vehicles: VehicleState[];
  hitZoneFor: (vehicle: VehicleState) => VehicleHitZone;
  makeCrater: (x: number, y: number, radius: number, depthFactor: number) => void;
  settleVehicles: (options: SettleOptions) => string[];
  addCombatMarker: (vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot?: number) => void;
}

export interface ImpactControllerResult {
  impactPreview: ImpactPreview;
  shotResult: string;
}

export class ImpactController {
  constructor(private readonly options: ImpactControllerOptions) {}

  resolve(input: ResolveImpactInput): ImpactControllerResult {
    const shooter = input.vehicles.find((vehicle) => vehicle.id === input.projectile?.shooterId);
    const impact = resolveProjectileImpact({
      x: input.x,
      y: input.y,
      directHitId: input.directHitId,
      shooter: shooter
        ? {
            id: shooter.id,
            team: shooter.team,
            classId: shooter.classId,
          }
        : undefined,
      vehicles: input.vehicles.map((vehicle) => ({
        id: vehicle.id,
        username: vehicle.username,
        team: vehicle.team,
        alive: vehicle.alive,
        hp: vehicle.hp,
        x: vehicle.x,
        hitZone: input.hitZoneFor(vehicle),
      })),
      tuning: {
        craterRadius: this.options.craterRadius,
        bungerCraterRadius: this.options.bungerCraterRadius,
        damageRadius: this.options.damageRadius,
        bungerDamageRadius: this.options.bungerDamageRadius,
        bungerKnockback: this.options.bungerKnockback,
        moveMinX: this.options.moveMinX,
        moveMaxX: this.options.moveMaxX,
      },
    });

    input.makeCrater(input.x, input.y, impact.craterRadius, impact.craterDepthFactor);

    const damaged: string[] = [];
    const bungeEvents: string[] = [];
    const affectedVehicleIds = new Set(impact.affectedVehicleIds);
    const defeatMarkedIds = new Set(impact.damageDefeatIds);

    for (const event of impact.damageEvents) {
      const vehicle = input.vehicles.find((candidate) => candidate.id === event.vehicleId);
      if (!vehicle) {
        continue;
      }

      vehicle.hp = event.hpAfter;
      damaged.push(`${event.username} -${event.damage}`);
      input.addCombatMarker(
        vehicle,
        event.hitKind,
        `${event.hitKind === "direct" ? "DIRECT" : "SPLASH"} -${event.damage}`,
      );

      if (event.defeated) {
        vehicle.alive = false;
        vehicle.defeatReason = "damage";
        input.addCombatMarker(vehicle, "ko", "KO", 1);
      }
    }

    for (const event of impact.knockbackEvents) {
      const vehicle = input.vehicles.find((candidate) => candidate.id === event.vehicleId);
      if (!vehicle) {
        continue;
      }

      vehicle.x = event.toX;
      bungeEvents.push(`${event.username} shoved`);
      input.addCombatMarker(vehicle, "shoved", "SHOVED", 1);
    }

    for (const update of impact.vehicleUpdates) {
      const vehicle = input.vehicles.find((candidate) => candidate.id === update.vehicleId);
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

    const aliveBeforeSettle = new Set(input.vehicles.filter((vehicle) => vehicle.alive).map((vehicle) => vehicle.id));
    const fallEvents = input.settleVehicles({
      changedX: input.x,
      changedRadius: impact.changedRadius,
      forceIds: affectedVehicleIds,
    });

    for (const vehicle of input.vehicles) {
      if (aliveBeforeSettle.has(vehicle.id) && !vehicle.alive && !defeatMarkedIds.has(vehicle.id)) {
        input.addCombatMarker(vehicle, "bunged", "VOID DROPPED");
      }
    }

    let shotResult = damaged.length > 0 ? damaged.join(" / ") : "Terrain carved.";
    if (bungeEvents.length > 0) {
      shotResult += ` / ${bungeEvents.join(" / ")}`;
    }
    if (fallEvents.length > 0) {
      shotResult += ` / ${fallEvents.join(" / ")}`;
    }

    return {
      impactPreview: {
        x: input.x,
        y: input.y,
        craterRadius: impact.craterRadius,
        damageRadius: impact.damageRadius,
        isBungerShot: impact.isBungerShot,
        timeLeft: this.options.impactPreviewSeconds,
      },
      shotResult,
    };
  }
}
