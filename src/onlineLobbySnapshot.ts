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
  seatId: string;
  ownerSessionId: string;
  displayName: string;
  team: string;
  characterId: string;
  className: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  defeatReason: string;
  x: number;
  y: number;
  moveUnits: number;
  facing: number;
  angle: number;
};

export type TerrainCraterSnapshot = {
  x: number;
  y: number;
  radius: number;
  depthFactor: number;
};

type LastShotSnapshot = {
  lastShotId: string;
  lastShotShooterVehicleId: string;
  lastShotShooterSessionId: string;
  lastShotOriginX: number;
  lastShotOriginY: number;
  lastShotAngle: number;
  lastShotPower: number;
  lastShotFacing: number;
  lastShotWind: number;
  lastShotImpactX: number;
  lastShotImpactY: number;
  lastShotDirectHitVehicleId: string;
  lastShotTargetVehicleId: string;
  lastShotDamage: number;
  lastShotTargetHpBefore: number;
  lastShotTargetHpAfter: number;
  lastShotTurnNumber: number;
  lastShotTurnAuthorityVersion: number;
  lastShotServerTimeMs: number;
};

export type RoomSnapshot = LastShotSnapshot & {
  roomCode: string;
  mode: string;
  matchLength: string;
  mapPick: string;
  friendlyFire: boolean;
  selectedMapId: string;
  selectedMapName: string;
  mapSeed: number;
  targetScore: number;
  terrainRevision: number;
  terrainCraters: TerrainCraterSnapshot[];
  turnSequence: string[];
  turnDurationSeconds: number;
  turnStartedAtMs: number;
  turnEndsAtMs: number;
  turnSecondsRemaining: number;
  serverTimeMs: number;
  turnAuthorityVersion: number;
  lastAcceptedTurnIntentId: string;
  lastAcceptedTurnIntentType: string;
  lastAcceptedTurnIntentVehicleId: string;
  lastAcceptedTurnIntentSessionId: string;
  hostSessionId: string;
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

type RoomSnapshotScalars = Omit<
  RoomSnapshot,
  "players" | "slots" | "vehicles" | "spectatorSessionIds" | "turnSequence" | "terrainCraters"
>;

type RoomStateSource = Partial<RoomSnapshotScalars> & {
  turnSequence?: string[] | Iterable<string>;
  terrainCraters?: TerrainCraterSnapshot[] | Iterable<TerrainCraterSnapshot>;
  spectatorSessionIds?: string[] | Iterable<string>;
  players?: Map<string, unknown> | Record<string, unknown>;
  slots?: Map<string, unknown> | Record<string, unknown> | unknown[] | Iterable<unknown>;
  vehicles?: unknown[] | Iterable<unknown>;
};

const DEFAULT_ROOM_SCALARS: RoomSnapshotScalars = {
  roomCode: "",
  mode: "2v2",
  matchLength: "best-of-1",
  mapPick: "random",
  friendlyFire: false,
  selectedMapId: "",
  selectedMapName: "",
  mapSeed: 0,
  targetScore: 1,
  terrainRevision: 0,
  turnDurationSeconds: 20,
  turnStartedAtMs: 0,
  turnEndsAtMs: 0,
  turnSecondsRemaining: 20,
  serverTimeMs: 0,
  turnAuthorityVersion: 0,
  lastAcceptedTurnIntentId: "",
  lastAcceptedTurnIntentType: "",
  lastAcceptedTurnIntentVehicleId: "",
  lastAcceptedTurnIntentSessionId: "",
  lastShotId: "",
  lastShotShooterVehicleId: "",
  lastShotShooterSessionId: "",
  lastShotOriginX: 0,
  lastShotOriginY: 0,
  lastShotAngle: 0,
  lastShotPower: 0,
  lastShotFacing: 1,
  lastShotWind: 0,
  lastShotImpactX: 0,
  lastShotImpactY: 0,
  lastShotDirectHitVehicleId: "",
  lastShotTargetVehicleId: "",
  lastShotDamage: 0,
  lastShotTargetHpBefore: 0,
  lastShotTargetHpAfter: 0,
  lastShotTurnNumber: 0,
  lastShotTurnAuthorityVersion: 0,
  lastShotServerTimeMs: 0,
  hostSessionId: "",
  phase: "lobby",
  status: "",
  roundNumber: 1,
  turnNumber: 0,
  wind: 0,
  activeVehicleId: "",
  winnerTeam: "",
  lastRewardLog: "",
};

const DEFAULT_COMBAT_VEHICLE: CombatVehicleSnapshot = {
  vehicleId: "",
  seatId: "",
  ownerSessionId: "",
  displayName: "Guest",
  team: "red",
  characterId: "nova",
  className: "Rig",
  hp: 0,
  maxHp: 100,
  alive: false,
  defeatReason: "",
  x: 0,
  y: 0,
  moveUnits: 10,
  facing: 1,
  angle: 0,
};

export function getRoomSnapshot(state: unknown): RoomSnapshot {
  const source = state as RoomStateSource;
  const players = getPlayers(source.players);
  const scalars = withDefaults(DEFAULT_ROOM_SCALARS, source);

  return {
    ...scalars,
    spectatorSessionIds: Array.from(source.spectatorSessionIds ?? []),
    turnSequence: Array.from(source.turnSequence ?? []),
    terrainCraters: Array.from(source.terrainCraters ?? []).map((crater) => ({
      x: crater.x,
      y: crater.y,
      radius: crater.radius,
      depthFactor: crater.depthFactor,
    })),
    players,
    slots: normalizeLobbySlots(source.slots, players),
    vehicles: getVehicles(source.vehicles),
  };
}

function getPlayers(players: Map<string, unknown> | Record<string, unknown> | undefined): PlayerSnapshot[] {
  return playerEntries(players).map(([key, player]) => playerSnapshotFrom(player, key));
}

function playerEntries(players: Parameters<typeof getPlayers>[0]): [string, unknown][] {
  if (!players) {
    return [];
  }

  if (players instanceof Map) {
    return Array.from(players.entries());
  }

  if (hasPlayerForEach(players)) {
    return entriesFromForEach(players);
  }

  return Object.entries(players);
}

function hasPlayerForEach(value: unknown): value is {
  forEach: (callback: (player: unknown, key: string) => void) => void;
} {
  return typeof (value as { forEach?: unknown }).forEach === "function";
}

function entriesFromForEach(players: {
  forEach: (callback: (player: unknown, key: string) => void) => void;
}): [string, unknown][] {
  const entries: [string, unknown][] = [];
  players.forEach((player, key) => entries.push([key, player]));
  return entries;
}

function playerSnapshotFrom(player: unknown, key: string): PlayerSnapshot {
  const source = player as Partial<PlayerSnapshot> & { inventory?: string[] | Iterable<string> };
  const defaults: PlayerSnapshot = {
    sessionId: key,
    displayName: "Guest",
    team: "red",
    role: "spectator",
    joinOrder: 0,
    ready: false,
    tokens: 0,
    equippedNameplate: "Canyon Rookie",
    inventory: ["Canyon Rookie"],
  };

  return {
    ...withDefaults(defaults, source),
    ready: Boolean(source.ready),
    inventory: Array.from(source.inventory ?? defaults.inventory),
  };
}

function getVehicles(vehicles: unknown[] | Iterable<unknown> | undefined): CombatVehicleSnapshot[] {
  const snapshots: CombatVehicleSnapshot[] = [];

  for (const vehicle of Array.from(vehicles ?? [])) {
    const source = vehicle as Partial<CombatVehicleSnapshot>;
    snapshots.push(withDefaults(DEFAULT_COMBAT_VEHICLE, source));
  }

  return snapshots;
}

function withDefaults<T extends Record<string, unknown>>(defaults: T, source: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    if (source[key] !== undefined) {
      result[key] = source[key] as T[keyof T];
    }
  }

  return result;
}
