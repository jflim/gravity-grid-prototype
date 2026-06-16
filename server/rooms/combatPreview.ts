import { unitDefinitionForCharacter } from "../../shared/content/v1Units.js";
import type { CharacterId, TeamId, VehicleId } from "../../shared/model/gameTypes.js";
import { buildPreviewSlots } from "./autoRoomLobby.js";
import {
  CombatVehicleState,
  GravityCanyonState,
  PlayerState,
} from "../schema/GravityCanyonState.js";

const PREVIEW_DAMAGE = 40;
const VEHICLE_MAX_HP = 100;

export function startCombatPreview(state: GravityCanyonState): void {
  state.phase = "combat-preview";
  state.winnerTeam = "";
  state.turnNumber = 1;
  state.wind = rollWind();
  state.vehicles.splice(0, state.vehicles.length);

  const previewSlots = buildPreviewSlots({
    mode: state.mode,
    redCaptainSessionId: state.redCaptainSessionId,
    blueCaptainSessionId: state.blueCaptainSessionId,
    selectedCharacters: selectedCharactersFor(state),
  });

  for (const slot of previewSlots) {
    const owner = state.players.get(slot.ownerSessionId);
    if (owner) {
      state.vehicles.push(createPreviewVehicle(slot.slotId, slot.selectedCharacterId, owner));
    }
  }

  const activeVehicle = state.vehicles[0];
  state.activeVehicleId = activeVehicle?.vehicleId ?? "";
  state.status = activeVehicle
    ? `Round ${state.roundNumber} started. ${activeVehicle.displayName} has the first shot.`
    : "Round started.";
}

export function clearCombatPreview(state: GravityCanyonState): void {
  state.turnNumber = 0;
  state.wind = 0;
  state.activeVehicleId = "";
  state.winnerTeam = "";
  state.vehicles.splice(0, state.vehicles.length);
}

export function previewFireForClient(state: GravityCanyonState, sessionId: string): void {
  if (state.phase !== "combat-preview") {
    return;
  }

  const activeVehicle = state.vehicles.find((vehicle) => vehicle.vehicleId === state.activeVehicleId);
  if (!activeVehicle || activeVehicle.ownerSessionId !== sessionId || !activeVehicle.alive) {
    return;
  }

  const target = state.vehicles.find((vehicle) => vehicle.team !== activeVehicle.team && vehicle.alive);
  if (!target) {
    finishRound(state, activeVehicle.team);
    return;
  }

  target.hp = Math.max(0, target.hp - PREVIEW_DAMAGE);
  target.alive = target.hp > 0;

  if (!hasAliveTeam(state, target.team)) {
    finishRound(state, activeVehicle.team);
    return;
  }

  const nextVehicle = nextAliveVehicle(state, activeVehicle.vehicleId);
  state.turnNumber += 1;
  state.wind = rollWind();
  state.activeVehicleId = nextVehicle?.vehicleId ?? "";
  state.status = nextVehicle
    ? `${activeVehicle.displayName}'s server test shot hit ${target.displayName}. ${nextVehicle.displayName} is up.`
    : `${activeVehicle.displayName}'s server test shot resolved.`;
}

export function createPreviewVehicle(
  slotId: VehicleId,
  characterId: CharacterId,
  player: PlayerState,
): CombatVehicleState {
  const unit = unitDefinitionForCharacter(characterId);
  const team = teamForSlot(slotId);
  const vehicle = new CombatVehicleState();
  vehicle.vehicleId = slotId;
  vehicle.ownerSessionId = player.sessionId;
  vehicle.displayName = `${player.displayName} / ${unit.username}`;
  vehicle.team = team;
  vehicle.className = unit.className;
  vehicle.hp = VEHICLE_MAX_HP;
  vehicle.maxHp = VEHICLE_MAX_HP;
  vehicle.alive = true;
  vehicle.x = team === "red" ? (slotId === "red-1" ? 385 : 710) : slotId === "blue-1" ? 1995 : 1690;
  vehicle.y = 0;
  vehicle.angle = team === "red" ? 47 : 133;
  return vehicle;
}

export function teamForSlot(slotId: VehicleId): TeamId {
  return slotId.startsWith("red-") ? "red" : "blue";
}

function selectedCharactersFor(state: GravityCanyonState): Partial<Record<VehicleId, string>> {
  return Object.fromEntries(
    Array.from(state.slots.entries()).map(([slotId, slot]) => [slotId, slot.selectedCharacterId]),
  ) as Partial<Record<VehicleId, string>>;
}

function nextAliveVehicle(state: GravityCanyonState, currentVehicleId: string): CombatVehicleState | undefined {
  const vehicles = Array.from(state.vehicles);
  const currentIndex = vehicles.findIndex((vehicle) => vehicle.vehicleId === currentVehicleId);

  for (let offset = 1; offset <= vehicles.length; offset += 1) {
    const candidate = vehicles[(currentIndex + offset + vehicles.length) % vehicles.length];
    if (candidate?.alive) {
      return candidate;
    }
  }

  return undefined;
}

function hasAliveTeam(state: GravityCanyonState, team: TeamId): boolean {
  return state.vehicles.some((vehicle) => vehicle.team === team && vehicle.alive);
}

function finishRound(state: GravityCanyonState, winnerTeam: TeamId): void {
  state.phase = "round-over";
  state.winnerTeam = winnerTeam;
  state.activeVehicleId = "";

  const rewardedSessionIds = new Set<string>();
  const winners = state.vehicles.filter((vehicle) => vehicle.team === winnerTeam);
  for (const vehicle of winners) {
    const player = state.players.get(vehicle.ownerSessionId);
    if (player && !rewardedSessionIds.has(player.sessionId)) {
      player.tokens += 1;
      rewardedSessionIds.add(player.sessionId);
    }
  }

  state.status = `${capitalize(winnerTeam)} team wins round ${state.roundNumber}.`;
  state.lastRewardLog = `${capitalize(winnerTeam)} team earned 1 preview token.`;
}

function rollWind(): number {
  return Math.floor(Math.random() * 25) - 12;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
