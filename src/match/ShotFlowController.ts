import type { TeamId } from "../../shared/model/gameTypes.js";
import type {
  AdvanceProjectileInput,
  ProjectileAdvanceResult,
  ProjectileShooter,
} from "./ProjectileController";
import type { ImpactControllerResult, ResolveImpactInput } from "./ImpactController";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import type { ImpactResolutionCallbacks } from "./ImpactResolutionCallbacks";

export interface ShotFlowProjectileController {
  createProjectile: (shooter: ProjectileShooter, power: number) => ProjectileState;
  advance: (input: AdvanceProjectileInput) => ProjectileAdvanceResult;
}

export interface ShotFlowImpactController {
  resolve: (input: ResolveImpactInput) => ImpactControllerResult;
  preview: (input: ResolveImpactInput) => ImpactControllerResult;
}

export interface ShotFlowControllerOptions extends ImpactResolutionCallbacks {
  projectileController: ShotFlowProjectileController;
  impactController: ShotFlowImpactController;
  surfaceAt: (x: number) => number;
  recenterForProjectileIfNeeded: (projectile: ProjectileState) => void;
  winningTeam: () => TeamId | undefined;
}

export interface FireShotResult {
  projectile: ProjectileState;
  shotResult: string;
}

export type ShotFlowNextEvent =
  | { kind: "advance-turn"; delayMs: number }
  | { kind: "end-round"; delayMs: number };

export type ShotFlowAdvanceResult =
  | { kind: "in-flight" }
  | {
      kind: "resolved";
      projectile: undefined;
      impactPreview?: ImpactPreview;
      shotResult: string;
      nextEvent: ShotFlowNextEvent;
    };

export type VisualShotAdvanceResult =
  | { kind: "in-flight" }
  | {
      kind: "resolved";
      projectile: undefined;
      impactPreview?: ImpactPreview;
      shotResult: string;
    };

export interface AdvanceShotInput {
  projectile: ProjectileState;
  vehicles: VehicleState[];
  wind: number;
  deltaSeconds: number;
}

export class ShotFlowController {
  constructor(private readonly options: ShotFlowControllerOptions) {}

  fire(active: VehicleState, power: number): FireShotResult {
    return {
      projectile: this.options.projectileController.createProjectile(active, power),
      shotResult: `${active.username} fired.`,
    };
  }

  advanceProjectile(input: AdvanceShotInput): ShotFlowAdvanceResult {
    const result = this.advanceProjectileMotion(input);

    if (result.kind === "collision") {
      return this.resolveImpact({
        x: result.collision.x,
        y: result.collision.y,
        directHitId: result.collision.directHitId,
        projectile: input.projectile,
        vehicles: input.vehicles,
      });
    }

    if (result.kind === "out-of-bounds") {
      return {
        kind: "resolved",
        projectile: undefined,
        impactPreview: undefined,
        shotResult: "Shot flew out of bounds.",
        nextEvent: { kind: "advance-turn", delayMs: 700 },
      };
    }

    return { kind: "in-flight" };
  }

  advanceVisualProjectile(input: AdvanceShotInput): VisualShotAdvanceResult {
    const result = this.advanceProjectileMotion(input);

    if (result.kind === "in-flight") {
      return { kind: "in-flight" };
    }

    if (result.kind === "collision") {
      const impact = this.options.impactController.preview({
        x: result.collision.x,
        y: result.collision.y,
        directHitId: result.collision.directHitId,
        projectile: input.projectile,
        vehicles: input.vehicles,
        hitZoneFor: this.options.hitZoneFor,
        makeCrater: this.options.makeCrater,
        settleVehicles: this.options.settleVehicles,
        addCombatMarker: this.options.addCombatMarker,
      });

      return {
        kind: "resolved",
        projectile: undefined,
        impactPreview: impact.impactPreview,
        shotResult: impact.shotResult,
      };
    }

    return {
      kind: "resolved",
      projectile: undefined,
      impactPreview: undefined,
      shotResult: "Server shot flew out of bounds.",
    };
  }

  private advanceProjectileMotion(input: AdvanceShotInput): ProjectileAdvanceResult {
    const result = this.options.projectileController.advance({
      projectile: input.projectile,
      deltaSeconds: input.deltaSeconds,
      wind: input.wind,
      targets: input.vehicles.map((vehicle) => ({
        id: vehicle.id,
        team: vehicle.team,
        alive: vehicle.alive,
        hitZone: this.options.hitZoneFor(vehicle),
      })),
      surfaceAt: this.options.surfaceAt,
    });
    this.options.recenterForProjectileIfNeeded(input.projectile);
    return result;
  }

  private resolveImpact(input: {
    x: number;
    y: number;
    directHitId?: string;
    projectile: ProjectileState;
    vehicles: VehicleState[];
  }): ShotFlowAdvanceResult {
    const result = this.options.impactController.resolve({
      x: input.x,
      y: input.y,
      directHitId: input.directHitId,
      projectile: input.projectile,
      vehicles: input.vehicles,
      hitZoneFor: this.options.hitZoneFor,
      makeCrater: this.options.makeCrater,
      settleVehicles: this.options.settleVehicles,
      addCombatMarker: this.options.addCombatMarker,
    });

    return {
      kind: "resolved",
      projectile: undefined,
      impactPreview: result.impactPreview,
      shotResult: result.shotResult,
      nextEvent: this.options.winningTeam()
        ? { kind: "end-round", delayMs: 900 }
        : { kind: "advance-turn", delayMs: 900 },
    };
  }
}
