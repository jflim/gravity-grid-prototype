import type { CombatVehicleSnapshot, PlayerSnapshot, RoomSnapshot } from "./onlineLobbySnapshot";

export function activeVehicleFor(snapshot: RoomSnapshot): CombatVehicleSnapshot | undefined {
  return snapshot.vehicles.find((vehicle) => vehicle.vehicleId === snapshot.activeVehicleId);
}

export function localPlayerFor(snapshot: RoomSnapshot, localSessionId: string): PlayerSnapshot | undefined {
  return snapshot.players.find((player) => player.sessionId === localSessionId);
}

export function canFireActiveVehicle(snapshot: RoomSnapshot, localSessionId: string): boolean {
  const activeVehicle = activeVehicleFor(snapshot);
  return (
    snapshot.phase === "combat-preview" &&
    activeVehicle !== undefined &&
    activeVehicle.ownerSessionId === localSessionId &&
    activeVehicle.alive
  );
}

export function canStartNextPreviewRound(snapshot: RoomSnapshot, localSessionId: string): boolean {
  return snapshot.phase === "round-over" && snapshot.hostSessionId === localSessionId;
}

export function canStartRematch(snapshot: RoomSnapshot, localSessionId: string): boolean {
  return snapshot.phase === "match-over" && snapshot.hostSessionId === localSessionId;
}

export function gameplayPreviewBadge(snapshot: RoomSnapshot): string {
  if (snapshot.phase === "combat-preview") {
    return "Live";
  }

  if (snapshot.phase === "round-over") {
    return "Round Over";
  }

  if (snapshot.phase === "match-over") return "Match Over";

  return "Lobby";
}
