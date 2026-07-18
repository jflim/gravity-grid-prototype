import type { CombatVehicleSnapshot } from "../onlineLobbySnapshot";

export function serverVehicleId(vehicle: CombatVehicleSnapshot): string {
  return vehicle.seatId || vehicle.vehicleId;
}

export function serverFacing(facing: number): 1 | -1 {
  return facing < 0 ? -1 : 1;
}

export function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
