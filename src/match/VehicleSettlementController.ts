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
  visibleVoidTopY: () => number;
  terrainBreakthroughY: () => number;
  surfaceAt: (x: number) => number;
  createVoidDropPresentation: (input: CreateVoidDropPresentationInput) => VoidDropPresentationState;
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
    if (settlement.defeatReason) {
      vehicle.defeatReason = settlement.defeatReason;
    }

    if (settlement.voidDropped) {
      const presentation = this.options.createVoidDropPresentation({
        fallStartX: settlement.fallStartX,
        fallStartY: settlement.fallStartY,
        visibleVoidTopY: this.options.visibleVoidTopY(),
        terrainBreakthroughY: this.options.terrainBreakthroughY(),
        surfaceAt: this.options.surfaceAt,
      });
      vehicle.voidDropPresentation = presentation;
      vehicle.x = presentation.targetX;
      vehicle.y = presentation.targetY;
      return true;
    }

    return false;
  }
}
