import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";
import { CHARACTER_IDS } from "../../shared/model/gameTypes.js";
import type { GameMode } from "../v1/rules.js";
import { MODE_SEATS } from "../v1/rules.js";

export type LobbyRole = "host" | "player" | "spectator";

export type LobbyPlayerInput = {
  sessionId: string;
  joinOrder: number;
  ready: boolean;
};

export type LobbySlotInput = {
  slotId: string;
  ownerSessionId: string;
  selectedCharacterId?: string;
  characterSelected?: boolean;
  active?: boolean;
};

export type ReadyToStartInput = {
  mode: GameMode;
  players: readonly LobbyPlayerInput[];
  slots: readonly LobbySlotInput[];
};

export type PreviewSlot = {
  slotId: VehicleId;
  ownerSessionId: string;
  selectedCharacterId: CharacterId;
};

export type BuildPreviewSlotsInput = {
  mode: GameMode;
  slots: readonly LobbySlotInput[];
};

const CHARACTER_ID_SET = new Set<string>(CHARACTER_IDS);

const DEFAULT_CHARACTERS: Record<VehicleId, CharacterId> = {
  "red-1": "nova",
  "blue-1": "vesper",
  "red-2": "kaelii",
  "blue-2": "perlah",
};

export function assignLobbyRoles(players: readonly LobbyPlayerInput[]): Map<string, LobbyRole> {
  const sorted = [...players].sort((a, b) => a.joinOrder - b.joinOrder);
  const roles = new Map<string, LobbyRole>();

  sorted.forEach((player, index) => {
    roles.set(player.sessionId, index === 0 ? "host" : "player");
  });

  return roles;
}

export function activeSlotIdsForMode(mode: GameMode): VehicleId[] {
  return MODE_SEATS[mode].map((seat) => seat.seatId as VehicleId);
}

export function canEditSlot(ownerSessionId: string, sessionId: string): boolean {
  return ownerSessionId.length > 0 && ownerSessionId === sessionId;
}

export function defaultCharacterForSlot(slotId: VehicleId): CharacterId {
  return DEFAULT_CHARACTERS[slotId];
}

export function sanitizeCharacterPick(value: unknown, slotId: VehicleId): CharacterId {
  return typeof value === "string" && CHARACTER_ID_SET.has(value)
    ? (value as CharacterId)
    : defaultCharacterForSlot(slotId);
}

export function isReadyToAutoStart(input: ReadyToStartInput): boolean {
  const playersBySessionId = new Map(input.players.map((player) => [player.sessionId, player]));
  const slotsById = new Map(input.slots.map((slot) => [slot.slotId, slot]));
  const seenOwners = new Set<string>();
  const context = { playersBySessionId, slotsById, seenOwners };

  return activeSlotIdsForMode(input.mode).every((slotId) => activeSlotReadyToStart(slotId, context));
}

type ReadyToStartContext = {
  playersBySessionId: ReadonlyMap<string, LobbyPlayerInput>;
  slotsById: ReadonlyMap<string, LobbySlotInput>;
  seenOwners: Set<string>;
};

function activeSlotReadyToStart(slotId: VehicleId, context: ReadyToStartContext): boolean {
  const slot = context.slotsById.get(slotId);
  const ownerSessionId = claimedActiveOwnerSessionId(slot);
  if (!ownerSessionId || context.seenOwners.has(ownerSessionId)) {
    return false;
  }

  context.seenOwners.add(ownerSessionId);
  return ownerReady(ownerSessionId, context.playersBySessionId) && slotHasSelectedRosterCharacter(slot);
}

function claimedActiveOwnerSessionId(slot: LobbySlotInput | undefined): string {
  if (!slot) {
    return "";
  }

  return activeSlotOwnerSessionId(slot);
}

function activeSlotOwnerSessionId(slot: LobbySlotInput): string {
  return slot.active === false ? "" : slot.ownerSessionId;
}

function ownerReady(ownerSessionId: string, playersBySessionId: ReadonlyMap<string, LobbyPlayerInput>): boolean {
  return playersBySessionId.get(ownerSessionId)?.ready === true;
}

function slotHasSelectedRosterCharacter(slot: LobbySlotInput | undefined): boolean {
  return slot?.characterSelected === true && CHARACTER_ID_SET.has(slot.selectedCharacterId ?? "");
}

export function buildPreviewSlots(input: BuildPreviewSlotsInput): PreviewSlot[] {
  const slotsById = new Map(input.slots.map((slot) => [slot.slotId, slot]));

  return activeSlotIdsForMode(input.mode)
    .map((slotId) => {
      const slot = slotsById.get(slotId);
      return slot?.ownerSessionId && slot.characterSelected === true
        ? {
            slotId,
            ownerSessionId: slot.ownerSessionId,
            selectedCharacterId: sanitizeCharacterPick(slot.selectedCharacterId, slotId),
          }
        : undefined;
    })
    .filter((slot): slot is PreviewSlot => Boolean(slot));
}
