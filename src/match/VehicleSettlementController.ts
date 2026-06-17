import {
  settleVehicleOnTerrain,
  type VehicleSettlementResult,
  type VehicleSettlementTuning,
} from "../../shared/gameplay/vehicleSettlement.js";
import type { SettleOptions, VehicleState, VoidDropPresentationState } from "./MatchTypes";

export interface CreateVoidDropPresentationInput {
  fallStartX: number;
  fallStartY: number;
  visibleVoidTopY: number;
  terrainBreakthroughY: number;
  surfaceAt: (x: number) => number;
}

export interface VehicleSettlementControllerOptions {
  tuning: VehicleSettlementTuning;
  motionTuning: VehicleMotionTuning;
  visibleVoidTopY: () => number;
  terrainBreakthroughY: () => number;
  surfaceAt: (x: number) => number;
  hitZoneBottom: (vehicle: VehicleState) => number;
  createVoidDropPresentation: (input: CreateVoidDropPresentationInput) => VoidDropPresentationState;
}

export interface VehicleMotionTuning {
  slideSpeedPixelsPerSecond: number;
  fallGravityPixelsPerSecondSquared: number;
  maxFallSpeedPixelsPerSecond: number;
}

type VehicleSettlementOptions = Partial<SettleOptions>;

export class VehicleSettlementController {
  constructor(private readonly options: VehicleSettlementControllerOptions) {}

  settleVehicles(vehicles: VehicleState[], options?: VehicleSettlementOptions): string[] {
    const fallEvents: string[] = [];

    for (const vehicle of vehicles) {
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

  placeVehicleOnSurface(vehicle: VehicleState): boolean {
    const settlement = this.resolveVehicleSettlement(vehicle, {
      adjustForSlope: false,
    });

    return this.applyVehicleSettlement(vehicle, settlement);
  }

  hasActiveVehicleMotion(vehicles: readonly VehicleState[]): boolean {
    return vehicles.some((vehicle) => vehicle.alive && vehicle.motion !== undefined);
  }

  updateVehicleMotion(vehicles: VehicleState[], deltaSeconds: number): string[] {
    const fallEvents: string[] = [];

    for (const vehicle of vehicles) {
      if (!vehicle.alive || !vehicle.motion) {
        continue;
      }

      if (vehicle.motion.kind === "falling") {
        if (this.updateFallingVehicle(vehicle, deltaSeconds)) {
          fallEvents.push(`${vehicle.username} Void Dropped`);
        }
        continue;
      }

      this.updateSlidingVehicle(vehicle, deltaSeconds);
    }

    return fallEvents;
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
      tuning: this.options.tuning,
      fallbackFallStartY: this.options.visibleVoidTopY() - 40,
      surfaceAt: this.options.surfaceAt,
    });
  }

  private applyVehicleSettlement(vehicle: VehicleState, settlement: VehicleSettlementResult): boolean {
    vehicle.x = settlement.x;
    vehicle.y = settlement.y;
    vehicle.hp = settlement.hp;
    vehicle.alive = settlement.alive;
    if (settlement.motion) {
      vehicle.motion = settlement.motion;
    } else {
      delete vehicle.motion;
    }

    if (settlement.defeatReason) {
      vehicle.defeatReason = settlement.defeatReason;
    }

    if (settlement.voidDropped) {
      this.applyVoidDrop(vehicle, settlement.fallStartX, settlement.fallStartY);
      return true;
    }

    return false;
  }

  private updateFallingVehicle(vehicle: VehicleState, deltaSeconds: number): boolean {
    if (!vehicle.motion || vehicle.motion.kind !== "falling") {
      return false;
    }

    const velocityY = Math.min(
      this.options.motionTuning.maxFallSpeedPixelsPerSecond,
      vehicle.motion.velocityY + this.options.motionTuning.fallGravityPixelsPerSecondSquared * deltaSeconds,
    );
    vehicle.y += velocityY * deltaSeconds;
    vehicle.motion = {
      kind: "falling",
      velocityY,
    };

    if (this.options.hitZoneBottom(vehicle) < this.options.visibleVoidTopY()) {
      return false;
    }

    this.applyVoidDrop(vehicle, vehicle.x, vehicle.y);
    return true;
  }

  private updateSlidingVehicle(vehicle: VehicleState, deltaSeconds: number): void {
    if (!vehicle.motion || vehicle.motion.kind !== "sliding") {
      return;
    }

    const nextX = clamp(
      vehicle.x + vehicle.motion.direction * this.options.motionTuning.slideSpeedPixelsPerSecond * deltaSeconds,
      this.options.tuning.moveMinX,
      this.options.tuning.moveMaxX,
    );
    vehicle.x = nextX;

    const settlement = this.resolveVehicleSettlement(vehicle, {
      adjustForSlope: false,
    });
    this.applyVehicleSettlement(vehicle, settlement);
  }

  private applyVoidDrop(vehicle: VehicleState, fallStartX: number, fallStartY: number): void {
    vehicle.hp = 0;
    vehicle.alive = false;
    vehicle.defeatReason = "void";
    delete vehicle.motion;

    const presentation = this.options.createVoidDropPresentation({
      fallStartX,
      fallStartY,
      visibleVoidTopY: this.options.visibleVoidTopY(),
      terrainBreakthroughY: this.options.terrainBreakthroughY(),
      surfaceAt: this.options.surfaceAt,
    });
    vehicle.voidDropPresentation = presentation;
    vehicle.x = presentation.targetX;
    vehicle.y = presentation.targetY;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
