import {
  onlineLobbyMapOptionFor,
} from "./onlineLobbyMapOptions";

export type ClientRole = "host" | "player" | "spectator" | string;
export type ClientSlotId = "red-1" | "blue-1" | "red-2" | "blue-2" | string;

export type LobbySlotView = {
  slotId: string;
  team: string;
  ownerSessionId: string;
  characterId: string;
  characterSelected: boolean;
  displayName: string;
  ready: boolean;
  active: boolean;
};

export type LobbySlotOwnerView = {
  sessionId: string;
  displayName: string;
  ready: boolean;
};

export type LobbyHostView = {
  sessionId: string;
  displayName: string;
};

type LobbySlotSource = {
  slotId?: string;
  team?: string;
  ownerSessionId?: string;
  selectedCharacterId?: string;
  characterId?: string;
  characterSelected?: boolean;
  active?: boolean;
};

type LobbySlotEntry = {
  slot: unknown;
  key?: unknown;
};

export function localRoleLabel(role: ClientRole): string {
  if (role === "host") {
    return "Host";
  }

  if (role === "player") {
    return "Player";
  }

  if (role === "spectator") {
    return "Spectator";
  }

  return "Waiting";
}

export function canLocalPlayerEditSlot(ownerSessionId: string, localSessionId: string): boolean {
  return ownerSessionId.length > 0 && ownerSessionId === localSessionId;
}

export function canLocalPlayerUseLobbyControls(hasOwnedActiveSeat: boolean, phase: string): boolean {
  return hasOwnedActiveSeat && (phase === "lobby" || phase === "ready");
}

export function canLocalPlayerChangeMode(isHost: boolean, phase: string): boolean {
  return canLocalPlayerChangeRoomSettings(isHost, phase);
}

export function canLocalPlayerChangeRoomSettings(isHost: boolean, phase: string): boolean {
  return isHost && (phase === "lobby" || phase === "ready");
}

export function stageForRoomPhase(phase: string): "lobby" | "gameplay" {
  return phase === "combat-preview" || phase === "round-over" || phase === "match-over" ? "gameplay" : "lobby";
}

export function modeLabel(mode: string): string {
  return mode === "1v1" ? "Duel" : "Doubles";
}

export function modeSubLabel(mode: string): string {
  return mode === "1v1" ? "1 unit per side" : "2 units per side";
}

export function matchLengthLabel(matchLength: string): string {
  return matchLength === "best-of-3" ? "Best of 3" : "Best of 1";
}

export function matchLengthRoundsToWinLabel(matchLength: string): string {
  return matchLength === "best-of-3" ? "2" : "1";
}

export function matchLengthSubLabel(matchLength: string): string {
  return matchLengthLabel(matchLength);
}

export function mapPickLabel(mapPick: string): string {
  return onlineLobbyMapOptionFor(mapPick).name;
}

export function mapPickSummaryLabel(mapPick: string): string {
  return onlineLobbyMapOptionFor(mapPick).summary;
}

export function slotLabel(slotId: ClientSlotId): string {
  const [team, slot] = String(slotId).split("-");
  const teamLabel = team === "blue" ? "Blue" : "Red";
  return `${teamLabel} ${slot ?? "1"}`;
}

export function roomDisplayLabel(roomCode: string, fallbackRoomId = ""): string {
  const roomLabel = roomCode || fallbackRoomId;
  if (roomLabel === "auto-room") {
    return "Shared playtest room";
  }

  return roomLabel || "Room pending";
}

export function lobbyHostLabel(
  players: readonly LobbyHostView[],
  hostSessionId: string,
  localSessionId: string,
): string {
  const host = players.find((player) => player.sessionId === hostSessionId);
  if (!host) {
    return "Assigning host";
  }

  const name = host.displayName || "Host";
  return host.sessionId === localSessionId ? `${name} (You)` : name;
}

export function lobbyStatusText(input: {
  status: string;
  hostName: string;
  openSeatCount: number;
  nextReadyName: string;
}): string {
  return lobbyStatusRules.map((rule) => rule(input)).find(Boolean) ?? "Starting match.";
}

export function normalizeLobbySlots(
  slots:
    | Map<string, unknown>
    | Record<string, unknown>
    | unknown[]
    | Iterable<unknown>
    | undefined,
  owners: readonly LobbySlotOwnerView[],
): LobbySlotView[] {
  const ownerBySessionId = new Map(owners.map((owner) => [owner.sessionId, owner]));
  return lobbySlotEntries(slots).map((entry) => lobbySlotViewFrom(entry, ownerBySessionId));
}

type LobbyStatusInput = Parameters<typeof lobbyStatusText>[0];
type LobbyStatusRule = (input: LobbyStatusInput) => string;

const lobbyStatusRules: readonly LobbyStatusRule[] = [
  (input) => input.status,
  (input) => (input.hostName ? "" : "Waiting for host."),
  (input) => openSeatStatus(input.openSeatCount),
  (input) => (input.nextReadyName ? `Waiting for ${input.nextReadyName} to ready.` : ""),
];

function openSeatStatus(openSeatCount: number): string {
  return openSeatCount > 0
    ? `Waiting for ${openSeatCount} open seat${openSeatCount === 1 ? "" : "s"} to be claimed.`
    : "";
}

function lobbySlotEntries(slots: Parameters<typeof normalizeLobbySlots>[0]): LobbySlotEntry[] {
  if (!slots) {
    return [];
  }

  if (hasForEach(slots)) {
    return entriesFromForEach(slots);
  }

  if (isIterable(slots)) {
    return Array.from(slots).map((slot) => ({ slot }));
  }

  return Object.entries(slots).map(([key, slot]) => ({ slot, key }));
}

function lobbySlotViewFrom(
  entry: LobbySlotEntry,
  ownerBySessionId: ReadonlyMap<string, LobbySlotOwnerView>,
): LobbySlotView {
  const source = entry.slot as LobbySlotSource;
  const ownerSessionId = ownerSessionIdFor(source);
  const owner = ownerBySessionId.get(ownerSessionId);
  const slotId = slotIdFor(source, entry.key);

  return {
    slotId,
    team: teamForSlotSource(source, slotId, entry.key),
    ownerSessionId,
    characterId: characterIdFor(source),
    characterSelected: source.characterSelected === true,
    displayName: displayNameForSlot(owner, ownerSessionId),
    ready: readyForOwner(owner),
    active: activeForSlot(source),
  };
}

function hasForEach(value: unknown): value is { forEach: (callback: (slot: unknown, key: unknown) => void) => void } {
  return typeof (value as { forEach?: unknown }).forEach === "function";
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
}

function entriesFromForEach(slots: {
  forEach: (callback: (slot: unknown, key: unknown) => void) => void;
}): LobbySlotEntry[] {
  const entries: LobbySlotEntry[] = [];
  slots.forEach((slot, key) => entries.push({ slot, key }));
  return entries;
}

function ownerSessionIdFor(source: LobbySlotSource): string {
  return source.ownerSessionId || "";
}

function slotIdFor(source: LobbySlotSource, key?: unknown): string {
  if (source.slotId) {
    return source.slotId;
  }

  return typeof key === "string" ? key : "";
}

function teamForSlotSource(source: LobbySlotSource, slotId: string, key?: unknown): string {
  return source.team || teamForSlot(slotId, key);
}

function characterIdFor(source: LobbySlotSource): string {
  if (source.characterId) {
    return source.characterId;
  }

  return source.selectedCharacterId || "nova";
}

function teamForSlot(slotId: string, key?: unknown): string {
  return String(slotId || key).startsWith("blue-") ? "blue" : "red";
}

function readyForOwner(owner: LobbySlotOwnerView | undefined): boolean {
  return owner ? owner.ready : false;
}

function activeForSlot(source: LobbySlotSource): boolean {
  return source.active === true;
}

function displayNameForSlot(owner: LobbySlotOwnerView | undefined, ownerSessionId: string): string {
  return owner ? owner.displayName : emptySlotDisplayName(ownerSessionId);
}

function emptySlotDisplayName(ownerSessionId: string): string {
  return ownerSessionId ? "Guest" : "Open";
}
