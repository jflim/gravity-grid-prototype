import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";
import { CHARACTER_IDS } from "../../shared/model/gameTypes.js";
import type { GameMode } from "../v1/rules.js";
import { MODE_SEATS } from "../v1/rules.js";

export type CaptainRole = "red-captain" | "blue-captain" | "spectator";

export type LobbyPlayerInput = {
  sessionId: string;
  joinOrder: number;
  ready: boolean;
};

export type ReadyToStartInput = {
  mode: GameMode;
  redCaptainSessionId: string;
  blueCaptainSessionId: string;
  redReady: boolean;
  blueReady: boolean;
  selectedCharacters: Partial<Record<VehicleId, string>>;
};

export type PreviewSlot = {
  slotId: VehicleId;
  ownerSessionId: string;
  selectedCharacterId: CharacterId;
};

export type BuildPreviewSlotsInput = {
  mode: GameMode;
  redCaptainSessionId: string;
  blueCaptainSessionId: string;
  selectedCharacters: Partial<Record<VehicleId, string>>;
};

const CHARACTER_ID_SET = new Set<string>(CHARACTER_IDS);

const DEFAULT_CHARACTERS: Record<VehicleId, CharacterId> = {
  "red-1": "nova",
  "blue-1": "vesper",
  "red-2": "kaelii",
  "blue-2": "perlah",
};

export function assignCaptainRoles(players: readonly LobbyPlayerInput[]): Map<string, CaptainRole> {
  const sorted = [...players].sort((a, b) => a.joinOrder - b.joinOrder);
  const roles = new Map<string, CaptainRole>();

  sorted.forEach((player, index) => {
    if (index === 0) {
      roles.set(player.sessionId, "red-captain");
    } else if (index === 1) {
      roles.set(player.sessionId, "blue-captain");
    } else {
      roles.set(player.sessionId, "spectator");
    }
  });

  return roles;
}

export function activeSlotIdsForMode(mode: GameMode): VehicleId[] {
  return MODE_SEATS[mode].map((seat) => seat.seatId as VehicleId);
}

export function canEditSlot(role: CaptainRole, slotId: VehicleId): boolean {
  if (role === "red-captain") {
    return slotId.startsWith("red-");
  }

  if (role === "blue-captain") {
    return slotId.startsWith("blue-");
  }

  return false;
}

export function ownerSessionIdForSlot(
  slotId: VehicleId,
  redCaptainSessionId: string,
  blueCaptainSessionId: string,
): string {
  return slotId.startsWith("red-") ? redCaptainSessionId : blueCaptainSessionId;
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
  if (!input.redCaptainSessionId || !input.blueCaptainSessionId || !input.redReady || !input.blueReady) {
    return false;
  }

  return activeSlotIdsForMode(input.mode).every((slotId) => CHARACTER_ID_SET.has(input.selectedCharacters[slotId] ?? ""));
}

export function buildPreviewSlots(input: BuildPreviewSlotsInput): PreviewSlot[] {
  return activeSlotIdsForMode(input.mode).map((slotId) => ({
    slotId,
    ownerSessionId: ownerSessionIdForSlot(slotId, input.redCaptainSessionId, input.blueCaptainSessionId),
    selectedCharacterId: sanitizeCharacterPick(input.selectedCharacters[slotId], slotId),
  }));
}
