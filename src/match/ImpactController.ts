import { resolveProjectileImpact, type ProjectileImpactTuning } from "../../shared/gameplay/impact.js";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import type { ImpactResolutionCallbacks } from "./ImpactResolutionCallbacks";

export interface ImpactControllerOptions extends ProjectileImpactTuning {
  impactPreviewSeconds: number;
}

export interface ResolveImpactInput extends ImpactResolutionCallbacks {
  x: number;
  y: number;
  directHitId?: string;
  projectile?: Pick<ProjectileState, "shooterId">;
  vehicles: VehicleState[];
}

export interface ImpactControllerResult {
  impactPreview: ImpactPreview;
  shotResult: string;
}

type ProjectileImpactResult = ReturnType<typeof resolveProjectileImpact>;

export class ImpactController {
  constructor(private readonly options: ImpactControllerOptions) {}

  preview(input: ResolveImpactInput): ImpactControllerResult {
    const impact = this.prepareImpact(input);

    return {
      impactPreview: this.impactPreviewFor(input, impact),
      shotResult: input.directHitId ? "Server shot replay hit." : "Server shot replay impacted terrain.",
    };
  }

  resolve(input: ResolveImpactInput): ImpactControllerResult {
    const impact = this.prepareImpact(input);

    const damageResult = applyDamageEvents(input, impact);
    const bungeEvents = applyKnockbackEvents(input, impact);
    applyVehicleUpdates(input.vehicles, impact);
    const fallEvents = settleImpactVehicles(input, impact, damageResult.defeatMarkedIds);

    return {
      impactPreview: this.impactPreviewFor(input, impact),
      shotResult: shotResultFor(damageResult.labels, bungeEvents, fallEvents),
    };
  }

  private prepareImpact(input: ResolveImpactInput): ProjectileImpactResult {
    const shooter = input.vehicles.find((vehicle) => vehicle.id === input.projectile?.shooterId);
    const impact = this.previewImpactFor(input, shooter);
    input.makeCrater(input.x, input.y, impact.craterRadius, impact.craterDepthFactor);
    return impact;
  }

  private impactPreviewFor(input: ResolveImpactInput, impact: ProjectileImpactResult): ImpactPreview {
    return {
      x: input.x,
      y: input.y,
      craterRadius: impact.craterRadius,
      damageRadius: impact.damageRadius,
      isBungerShot: impact.isBungerShot,
      timeLeft: this.options.impactPreviewSeconds,
    };
  }

  private previewImpactFor(
    input: ResolveImpactInput,
    shooter: VehicleState | undefined,
  ): ProjectileImpactResult {
    return resolveProjectileImpact({
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
  }
}

function applyDamageEvents(
  input: ResolveImpactInput,
  impact: ProjectileImpactResult,
): { labels: string[]; defeatMarkedIds: Set<string> } {
  const labels: string[] = [];
  const defeatMarkedIds = new Set(impact.damageDefeatIds);

  for (const event of impact.damageEvents) {
    const vehicle = input.vehicles.find((candidate) => candidate.id === event.vehicleId);
    if (!vehicle) {
      continue;
    }

    vehicle.hp = event.hpAfter;
    labels.push(`${event.username} -${event.damage}`);
    input.addCombatMarker(
      vehicle,
      event.hitKind,
      damageMarkerLabel(event.hitKind, event.damage),
    );

    if (event.defeated) {
      vehicle.alive = false;
      vehicle.defeatReason = "damage";
      input.addCombatMarker(vehicle, "ko", "KO", 1);
    }
  }

  return { labels, defeatMarkedIds };
}

function damageMarkerLabel(hitKind: "direct" | "splash", damage: number): string {
  return `${hitKind === "direct" ? "DIRECT" : "SPLASH"} -${damage}`;
}

function applyKnockbackEvents(input: ResolveImpactInput, impact: ProjectileImpactResult): string[] {
  const bungeEvents: string[] = [];

  for (const event of impact.knockbackEvents) {
    const vehicle = input.vehicles.find((candidate) => candidate.id === event.vehicleId);
    if (!vehicle) {
      continue;
    }

    vehicle.x = event.toX;
    bungeEvents.push(`${event.username} shoved`);
    input.addCombatMarker(vehicle, "shoved", "SHOVED", 1);
  }

  return bungeEvents;
}

function applyVehicleUpdates(vehicles: VehicleState[], impact: ProjectileImpactResult): void {
  for (const update of impact.vehicleUpdates) {
    const vehicle = vehicles.find((candidate) => candidate.id === update.vehicleId);
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
}

function settleImpactVehicles(
  input: ResolveImpactInput,
  impact: ProjectileImpactResult,
  defeatMarkedIds: Set<string>,
): string[] {
  const aliveBeforeSettle = new Set(input.vehicles.filter((vehicle) => vehicle.alive).map((vehicle) => vehicle.id));
  const fallEvents = input.settleVehicles({
    changedX: input.x,
    changedRadius: impact.changedRadius,
    forceIds: new Set(impact.affectedVehicleIds),
  });

  for (const vehicle of input.vehicles) {
    if (shouldMarkVoidDrop(vehicle, aliveBeforeSettle, defeatMarkedIds)) {
      input.addCombatMarker(vehicle, "bunged", "VOID DROPPED");
    }
  }

  return fallEvents;
}

function shouldMarkVoidDrop(
  vehicle: VehicleState,
  aliveBeforeSettle: Set<string>,
  defeatMarkedIds: Set<string>,
): boolean {
  return aliveBeforeSettle.has(vehicle.id) && !vehicle.alive && !defeatMarkedIds.has(vehicle.id);
}

function shotResultFor(damaged: readonly string[], bungeEvents: readonly string[], fallEvents: readonly string[]): string {
  const segments = [damaged.length > 0 ? damaged.join(" / ") : "Terrain carved."];
  if (bungeEvents.length > 0) {
    segments.push(bungeEvents.join(" / "));
  }
  if (fallEvents.length > 0) {
    segments.push(fallEvents.join(" / "));
  }
  return segments.join(" / ");
}
