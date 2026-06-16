import { normalizeLobbySlots, type LobbySlotView } from "./onlineLobbyView";

export type PlayerSnapshot = {
  sessionId: string;
  displayName: string;
  team: string;
  role: string;
  joinOrder: number;
  ready: boolean;
  tokens: number;
  equippedNameplate: string;
  inventory: string[];
};

export type CombatVehicleSnapshot = {
  vehicleId: string;
  ownerSessionId: string;
  displayName: string;
  team: string;
  className: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  x: number;
  y: number;
  angle: number;
};

export type RoomSnapshot = {
  roomCode: string;
  mode: string;
  redCaptainSessionId: string;
  blueCaptainSessionId: string;
  spectatorSessionIds: string[];
  phase: string;
  status: string;
  roundNumber: number;
  turnNumber: number;
  wind: number;
  activeVehicleId: string;
  winnerTeam: string;
  lastRewardLog: string;
  players: PlayerSnapshot[];
  slots: LobbySlotView[];
  vehicles: CombatVehicleSnapshot[];
};

type RoomStateSource = {
  roomCode?: string;
  mode?: string;
  redCaptainSessionId?: string;
  blueCaptainSessionId?: string;
  spectatorSessionIds?: string[] | Iterable<string>;
  phase?: string;
  status?: string;
  lastRewardLog?: string;
  roundNumber?: number;
  turnNumber?: number;
  wind?: number;
  activeVehicleId?: string;
  winnerTeam?: string;
  players?: Map<string, unknown> | Record<string, unknown>;
  slots?: Map<string, unknown> | Record<string, unknown> | unknown[] | Iterable<unknown>;
  vehicles?: unknown[] | Iterable<unknown>;
};

export function getRoomSnapshot(state: unknown): RoomSnapshot {
  const source = state as RoomStateSource;
  const players = getPlayers(source.players);

  return {
    roomCode: source.roomCode ?? "",
    mode: source.mode ?? "2v2",
    redCaptainSessionId: source.redCaptainSessionId ?? "",
    blueCaptainSessionId: source.blueCaptainSessionId ?? "",
    spectatorSessionIds: Array.from(source.spectatorSessionIds ?? []),
    phase: source.phase ?? "lobby",
    status: source.status ?? "",
    roundNumber: source.roundNumber ?? 1,
    turnNumber: source.turnNumber ?? 0,
    wind: source.wind ?? 0,
    activeVehicleId: source.activeVehicleId ?? "",
    winnerTeam: source.winnerTeam ?? "",
    lastRewardLog: source.lastRewardLog ?? "",
    players,
    slots: normalizeLobbySlots(source.slots, players),
    vehicles: getVehicles(source.vehicles),
  };
}

function getPlayers(players: Map<string, unknown> | Record<string, unknown> | undefined): PlayerSnapshot[] {
  const snapshots: PlayerSnapshot[] = [];
  const readPlayer = (player: unknown, key: string) => {
    const source = player as {
      sessionId?: string;
      displayName?: string;
      team?: string;
      role?: string;
      joinOrder?: number;
      ready?: boolean;
      tokens?: number;
      equippedNameplate?: string;
      inventory?: string[] | Iterable<string>;
    };

    snapshots.push({
      sessionId: source.sessionId ?? key,
      displayName: source.displayName ?? "Guest",
      team: source.team ?? "red",
      role: source.role ?? "spectator",
      joinOrder: source.joinOrder ?? 0,
      ready: Boolean(source.ready),
      tokens: source.tokens ?? 0,
      equippedNameplate: source.equippedNameplate ?? "Canyon Rookie",
      inventory: Array.from(source.inventory ?? ["Canyon Rookie"]),
    });
  };

  if (players instanceof Map || typeof players?.forEach === "function") {
    const iterablePlayers = players as { forEach: (callback: (player: unknown, key: string) => void) => void };
    iterablePlayers.forEach(readPlayer);
  } else if (players) {
    Object.entries(players).forEach(([key, player]) => readPlayer(player, key));
  }

  return snapshots;
}

function getVehicles(vehicles: unknown[] | Iterable<unknown> | undefined): CombatVehicleSnapshot[] {
  const snapshots: CombatVehicleSnapshot[] = [];

  for (const vehicle of Array.from(vehicles ?? [])) {
    const source = vehicle as Partial<CombatVehicleSnapshot>;
    snapshots.push({
      vehicleId: source.vehicleId ?? "",
      ownerSessionId: source.ownerSessionId ?? "",
      displayName: source.displayName ?? "Guest",
      team: source.team ?? "red",
      className: source.className ?? "Rig",
      hp: source.hp ?? 0,
      maxHp: source.maxHp ?? 100,
      alive: source.alive ?? false,
      x: source.x ?? 0,
      y: source.y ?? 0,
      angle: source.angle ?? 0,
    });
  }

  return snapshots;
}
