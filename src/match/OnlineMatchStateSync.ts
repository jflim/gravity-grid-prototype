import type { CombatVehicleSnapshot, RoomSnapshot } from "../onlineLobbySnapshot";
import type { VehicleState } from "./MatchTypes";
import { finiteNumber, serverFacing, serverVehicleId } from "./OnlineSnapshotFields";

export type OnlineMatchStateSyncResult = {
  changedVehicleIds: string[];
};

export type OnlineShotReplay = {
  id: string;
  shooterVehicleId: string;
  shooterSessionId: string;
  originX: number;
  originY: number;
  angle: number;
  power: number;
  facing: 1 | -1;
  wind: number;
  impactX: number;
  impactY: number;
  directHitVehicleId: string;
  targetVehicleId: string;
  damage: number;
  serverTimeMs: number;
};

type SyncedVehicleFields = Pick<VehicleState, "x" | "y" | "hp" | "alive" | "moveUnits" | "facing" | "angle" | "defeatReason">;

const SYNCED_VEHICLE_FIELD_KEYS = [
  "x",
  "y",
  "hp",
  "alive",
  "moveUnits",
  "facing",
  "angle",
  "defeatReason",
] as const;

export function applyOnlineMatchSnapshotToVehicles(
  vehicles: VehicleState[],
  snapshot: RoomSnapshot,
): OnlineMatchStateSyncResult {
  const vehiclesById = new Map<string, VehicleState>(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const changedVehicleIds: string[] = [];

  for (const serverVehicle of snapshot.vehicles) {
    const vehicle = vehiclesById.get(serverVehicleId(serverVehicle));
    if (!vehicle) {
      continue;
    }

    if (applyServerVehicle(vehicle, serverVehicle)) {
      changedVehicleIds.push(vehicle.id);
    }
  }

  return { changedVehicleIds };
}

export function onlineShotReplayFromSnapshot(
  snapshot: RoomSnapshot,
  lastReplayedShotId: string,
): OnlineShotReplay | undefined {
  if (!snapshot.lastShotId || snapshot.lastShotId === lastReplayedShotId) {
    return undefined;
  }

  return {
    id: snapshot.lastShotId,
    shooterVehicleId: snapshot.lastShotShooterVehicleId,
    shooterSessionId: snapshot.lastShotShooterSessionId,
    originX: snapshot.lastShotOriginX,
    originY: snapshot.lastShotOriginY,
    angle: snapshot.lastShotAngle,
    power: snapshot.lastShotPower,
    facing: serverFacing(snapshot.lastShotFacing),
    wind: onlineMatchWindForPhaser(snapshot.lastShotWind),
    impactX: snapshot.lastShotImpactX,
    impactY: snapshot.lastShotImpactY,
    directHitVehicleId: snapshot.lastShotDirectHitVehicleId,
    targetVehicleId: snapshot.lastShotTargetVehicleId,
    damage: snapshot.lastShotDamage,
    serverTimeMs: snapshot.lastShotServerTimeMs,
  };
}

export function onlineMatchWindForPhaser(wind: number): number {
  return finiteNumber(wind, 0) / 10;
}

function applyServerVehicle(vehicle: VehicleState, serverVehicle: CombatVehicleSnapshot): boolean {
  const next = syncedFieldsFromServer(vehicle, serverVehicle);
  const changed = hasSyncedFieldChange(vehicle, next) || hasTransientMotion(vehicle);

  Object.assign(vehicle, next);
  vehicle.motion = undefined;
  vehicle.voidDropPresentation = undefined;

  return changed;
}

function syncedFieldsFromServer(
  vehicle: VehicleState,
  serverVehicle: CombatVehicleSnapshot,
): SyncedVehicleFields {
  return {
    x: finiteNumber(serverVehicle.x, vehicle.x),
    y: finiteNumber(serverVehicle.y, vehicle.y),
    hp: finiteNumber(serverVehicle.hp, vehicle.hp),
    alive: Boolean(serverVehicle.alive),
    moveUnits: finiteNumber(serverVehicle.moveUnits, vehicle.moveUnits),
    facing: serverFacing(serverVehicle.facing),
    angle: finiteNumber(serverVehicle.angle, vehicle.angle),
    defeatReason: serverVehicle.defeatReason === "damage" || serverVehicle.defeatReason === "void"
      ? serverVehicle.defeatReason
      : undefined,
  };
}

function hasSyncedFieldChange(vehicle: VehicleState, next: SyncedVehicleFields): boolean {
  return SYNCED_VEHICLE_FIELD_KEYS.some((field) => vehicle[field] !== next[field]);
}

function hasTransientMotion(vehicle: VehicleState): boolean {
  return vehicle.motion !== undefined || vehicle.voidDropPresentation !== undefined;
}
