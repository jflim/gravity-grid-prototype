import type { VehicleState } from "./MatchTypes";
import type { VehicleSettlementController } from "./VehicleSettlementController";

export function updateVehicleMotionsForScene(input: {
  vehicles: VehicleState[];
  deltaSeconds: number;
  vehicleSettlementController: VehicleSettlementController;
  addVoidDropMarker: (vehicle: VehicleState) => void;
  playVoidDrop: () => void;
}): string[] {
  const aliveBeforeMotion = new Set(
    input.vehicles.filter((vehicle) => vehicle.alive).map((vehicle) => vehicle.id),
  );
  const motionEvents = input.vehicleSettlementController.updateVehicleMotion(
    input.vehicles,
    input.deltaSeconds,
  );
  if (motionEvents.length <= 0) {
    return motionEvents;
  }

  for (const vehicle of newlyVoidDroppedVehicles(input.vehicles, aliveBeforeMotion)) {
    input.addVoidDropMarker(vehicle);
    input.playVoidDrop();
  }

  return motionEvents;
}

function newlyVoidDroppedVehicles(
  vehicles: readonly VehicleState[],
  aliveBeforeMotion: Set<string>,
): VehicleState[] {
  return vehicles.filter((vehicle) => isNewVoidDrop(vehicle, aliveBeforeMotion));
}

function isNewVoidDrop(vehicle: VehicleState, aliveBeforeMotion: Set<string>): boolean {
  return aliveBeforeMotion.has(vehicle.id) && !vehicle.alive && vehicle.defeatReason === "void";
}
