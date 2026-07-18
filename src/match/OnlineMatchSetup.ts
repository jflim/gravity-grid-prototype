import {
  CHARACTER_IDS,
  type CharacterId,
  type TeamId,
  type VehicleId,
} from "../../shared/model/gameTypes.js";
import {
  unitDefinitionForCharacter,
  type DemoUnitDefinition,
} from "../../shared/content/v1Units.js";
import type { CombatVehicleSnapshot, RoomSnapshot } from "../onlineLobbySnapshot";
import { playableMapById } from "../playableMaps";

export type MatchSceneRoundSetup = {
  mapId: string;
  roundStartText: string;
  units: readonly DemoUnitDefinition[];
};

const VEHICLE_IDS = new Set<string>(["red-1", "blue-1", "red-2", "blue-2"]);

export function matchSceneRoundSetupFromSnapshot(snapshot: RoomSnapshot): MatchSceneRoundSetup | undefined {
  if (!snapshot.selectedMapId || snapshot.vehicles.length === 0) {
    return undefined;
  }

  const units = orderedServerVehicles(snapshot)
    .map(unitForServerVehicle)
    .filter((unit): unit is DemoUnitDefinition => unit !== undefined);

  if (units.length === 0) {
    return undefined;
  }

  return {
    mapId: snapshot.selectedMapId,
    roundStartText: onlineRoundStartText(snapshot),
    units,
  };
}

function orderedServerVehicles(snapshot: RoomSnapshot): CombatVehicleSnapshot[] {
  const vehiclesBySeat = new Map(snapshot.vehicles.map((vehicle) => [seatIdForVehicle(vehicle), vehicle]));
  const ordered = vehiclesInTurnSequence(snapshot.turnSequence, vehiclesBySeat);
  return [...ordered, ...vehiclesOutsideTurnSequence(snapshot.vehicles, ordered)];
}

function vehiclesInTurnSequence(
  turnSequence: readonly string[],
  vehiclesBySeat: Map<string, CombatVehicleSnapshot>,
): CombatVehicleSnapshot[] {
  return turnSequence.map((seatId) => vehiclesBySeat.get(seatId)).filter(isCombatVehicleSnapshot);
}

function vehiclesOutsideTurnSequence(
  vehicles: readonly CombatVehicleSnapshot[],
  ordered: readonly CombatVehicleSnapshot[],
): CombatVehicleSnapshot[] {
  const orderedSeatIds = new Set(ordered.map(seatIdForVehicle));
  return vehicles.filter((vehicle) => !orderedSeatIds.has(seatIdForVehicle(vehicle)));
}

function isCombatVehicleSnapshot(vehicle: CombatVehicleSnapshot | undefined): vehicle is CombatVehicleSnapshot {
  return vehicle !== undefined;
}

function unitForServerVehicle(vehicle: CombatVehicleSnapshot): DemoUnitDefinition | undefined {
  const seatId = safeVehicleId(seatIdForVehicle(vehicle));
  const characterId = safeCharacterId(vehicle.characterId);
  if (!seatId || !characterId) {
    return undefined;
  }

  return {
    ...unitDefinitionForCharacter(characterId),
    id: seatId,
    team: teamForSeat(seatId),
  };
}

function onlineRoundStartText(snapshot: RoomSnapshot): string {
  const mapName = snapshot.selectedMapName || playableMapById(snapshot.selectedMapId).name;
  const targetScore = Math.max(1, snapshot.targetScore);
  return `Online round started: ${mapName}. First to ${targetScore}.${activeTurnText(snapshot)}`;
}

function seatIdForVehicle(vehicle: CombatVehicleSnapshot): string {
  return vehicle.seatId || vehicle.vehicleId;
}

function safeVehicleId(value: string): VehicleId | undefined {
  return VEHICLE_IDS.has(value) ? (value as VehicleId) : undefined;
}

function safeCharacterId(value: string): CharacterId | undefined {
  return CHARACTER_IDS.includes(value as CharacterId) ? (value as CharacterId) : undefined;
}

function teamForSeat(seatId: VehicleId): TeamId {
  return seatId.startsWith("red-") ? "red" : "blue";
}

function activeTurnText(snapshot: RoomSnapshot): string {
  const activeVehicle = snapshot.vehicles.find((vehicle) => vehicle.vehicleId === snapshot.activeVehicleId);
  if (!activeVehicle) {
    return "";
  }

  return ` ${activeVehicle.displayName} is up: ${snapshot.turnSecondsRemaining}s.`;
}
