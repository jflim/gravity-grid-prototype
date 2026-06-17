import type { VehicleState } from "./MatchTypes";
import type { MatchSoundController } from "./audio/MatchSoundController";

export type VehicleDamageSnapshot = {
  hp: number;
  alive: boolean;
  defeatReason?: VehicleState["defeatReason"];
};

export function vehicleDamageSnapshot(vehicles: readonly VehicleState[]): Map<string, VehicleDamageSnapshot> {
  return new Map(
    vehicles.map((vehicle) => [
      vehicle.id,
      {
        hp: vehicle.hp,
        alive: vehicle.alive,
        defeatReason: vehicle.defeatReason,
      },
    ]),
  );
}

export function playProjectileResolutionSounds(input: {
  hasImpact: boolean;
  vehicles: readonly VehicleState[];
  damageBefore: Map<string, VehicleDamageSnapshot>;
  soundController: MatchSoundController;
}): void {
  if (input.hasImpact) {
    input.soundController.playImpact();
  }

  const result = damageResultSinceSnapshot(input.vehicles, input.damageBefore);
  if (result.hit) {
    input.soundController.playHit();
  }

  if (result.damageKo) {
    input.soundController.playDamageKo();
  }
}

function damageResultSinceSnapshot(
  vehicles: readonly VehicleState[],
  damageBefore: Map<string, VehicleDamageSnapshot>,
): { hit: boolean; damageKo: boolean } {
  const damagedVehicles = vehicles.filter((vehicle) => didVehicleTakeDamage(vehicle, damageBefore));

  return {
    hit: damagedVehicles.some((vehicle) => !isNewDamageKo(vehicle, damageBefore)),
    damageKo: damagedVehicles.some((vehicle) => isNewDamageKo(vehicle, damageBefore)),
  };
}

function didVehicleTakeDamage(
  vehicle: VehicleState,
  damageBefore: Map<string, VehicleDamageSnapshot>,
): boolean {
  const previous = damageBefore.get(vehicle.id);
  if (!previous) {
    return false;
  }

  return vehicle.hp < previous.hp;
}

function isNewDamageKo(
  vehicle: VehicleState,
  damageBefore: Map<string, VehicleDamageSnapshot>,
): boolean {
  const previous = damageBefore.get(vehicle.id);
  return previous !== undefined && previous.alive && !vehicle.alive && vehicle.defeatReason === "damage";
}
