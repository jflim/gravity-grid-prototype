import type { TeamId } from "../../shared/model/gameTypes.js";

export { CHARACTER_IDS } from "../../shared/model/gameTypes.js";
export { TURN_SECONDS } from "../../shared/v1/constants.js";

export type GameMode = "1v1" | "2v2";
export type MatchLength = "best-of-1" | "best-of-3";
export type MapPick =
  | "random"
  | "canyon-terraces"
  | "split-ravine"
  | "needlefield"
  | "ring-basin"
  | "bridgeworks";

export type SeatId = "red-1" | "blue-1" | "red-2" | "blue-2";

export type SeatDefinition = {
  seatId: SeatId;
  team: TeamId;
  slot: 1 | 2;
};

export type RoomSettings = {
  mode: GameMode;
  matchLength: MatchLength;
  mapPick: MapPick;
  friendlyFire: boolean;
};

export const DISCONNECTED_SKIP_SECONDS = 5;
export const RECONNECT_GRACE_MS = 180_000;
export const PHRASE_COOLDOWN_MS = 3_000;
export const MAX_DISPLAY_NAME_LENGTH = 18;

export const MODE_SEATS: Record<GameMode, readonly SeatDefinition[]> = {
  "1v1": [
    { seatId: "red-1", team: "red", slot: 1 },
    { seatId: "blue-1", team: "blue", slot: 1 },
  ],
  "2v2": [
    { seatId: "red-1", team: "red", slot: 1 },
    { seatId: "blue-1", team: "blue", slot: 1 },
    { seatId: "red-2", team: "red", slot: 2 },
    { seatId: "blue-2", team: "blue", slot: 2 },
  ],
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: "2v2",
  matchLength: "best-of-1",
  mapPick: "random",
  friendlyFire: false,
};

const GAME_MODES = new Set<GameMode>(["1v1", "2v2"]);
const MATCH_LENGTHS = new Set<MatchLength>(["best-of-1", "best-of-3"]);
const MAP_PICKS = new Set<MapPick>([
  "random",
  "canyon-terraces",
  "split-ravine",
  "needlefield",
  "ring-basin",
  "bridgeworks",
]);

export function validateRoomSettings(input: Partial<Record<keyof RoomSettings, unknown>>): RoomSettings {
  return {
    mode: gameModeOr(input.mode, DEFAULT_ROOM_SETTINGS.mode),
    matchLength: matchLengthOr(input.matchLength, DEFAULT_ROOM_SETTINGS.matchLength),
    mapPick: mapPickOr(input.mapPick, DEFAULT_ROOM_SETTINGS.mapPick),
    friendlyFire: Boolean(input.friendlyFire),
  };
}

export function mergeRoomSettings(
  current: RoomSettings,
  input: Partial<Record<keyof RoomSettings, unknown>>,
): RoomSettings {
  return {
    mode: gameModeOr(input.mode, current.mode),
    matchLength: matchLengthOr(input.matchLength, current.matchLength),
    mapPick: mapPickOr(input.mapPick, current.mapPick),
    friendlyFire: booleanOr(input.friendlyFire, current.friendlyFire),
  };
}

export function sanitizeDisplayName(displayName = "Guest") {
  const clean = displayName.replace(/[^\w .-]/g, "").replace(/\s+/g, " ").trim();
  return clean.slice(0, MAX_DISPLAY_NAME_LENGTH) || "Guest";
}

function gameModeOr(value: unknown, fallback: GameMode): GameMode {
  return GAME_MODES.has(value as GameMode) ? (value as GameMode) : fallback;
}

function matchLengthOr(value: unknown, fallback: MatchLength): MatchLength {
  return MATCH_LENGTHS.has(value as MatchLength) ? (value as MatchLength) : fallback;
}

function mapPickOr(value: unknown, fallback: MapPick): MapPick {
  return MAP_PICKS.has(value as MapPick) ? (value as MapPick) : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
