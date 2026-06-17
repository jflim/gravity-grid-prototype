export type ClientRole = "host" | "player" | "spectator" | string;
export type ClientSlotId = "red-1" | "blue-1" | "red-2" | "blue-2" | string;

export type LobbySlotView = {
  slotId: string;
  team: string;
  ownerSessionId: string;
  characterId: string;
  displayName: string;
  ready: boolean;
  active: boolean;
};

export type LobbySlotOwnerView = {
  sessionId: string;
  displayName: string;
  ready: boolean;
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

export function stageForRoomPhase(phase: string): "lobby" | "gameplay" {
  return phase === "combat-preview" || phase === "round-over" ? "gameplay" : "lobby";
}

export function modeLabel(mode: string): string {
  return mode === "1v1" ? "Duel" : "Doubles";
}

export function modeSubLabel(mode: string): string {
  return mode === "1v1" ? "1 fighter per side" : "2 fighters per side";
}

export function slotLabel(slotId: ClientSlotId): string {
  const [team, slot] = String(slotId).split("-");
  const teamLabel = team === "blue" ? "Blue" : "Red";
  return `${teamLabel} ${slot ?? "1"}`;
}

export function lobbyStatusText(input: {
  status: string;
  hostName: string;
  openSeatCount: number;
  nextReadyName: string;
}): string {
  if (input.status) {
    return input.status;
  }

  if (!input.hostName) {
    return "Waiting for host.";
  }

  if (input.openSeatCount > 0) {
    return `Waiting for ${input.openSeatCount} open seat${input.openSeatCount === 1 ? "" : "s"} to be claimed.`;
  }

  if (input.nextReadyName) {
    return `Waiting for ${input.nextReadyName} to ready.`;
  }

  return "Starting match.";
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
  const snapshots: LobbySlotView[] = [];

  const readSlot = (slot: unknown, key?: unknown) => {
    const source = slot as {
      slotId?: string;
      team?: string;
      ownerSessionId?: string;
      selectedCharacterId?: string;
      characterId?: string;
      active?: boolean;
    };
    const owner = ownerBySessionId.get(source.ownerSessionId ?? "");
    snapshots.push({
      slotId: source.slotId ?? (typeof key === "string" ? key : ""),
      team: source.team ?? (String(source.slotId ?? key).startsWith("blue-") ? "blue" : "red"),
      ownerSessionId: source.ownerSessionId ?? "",
      characterId: source.characterId ?? source.selectedCharacterId ?? "nova",
      displayName: owner?.displayName ?? (source.ownerSessionId ? "Guest" : "Open"),
      ready: owner?.ready ?? false,
      active: source.active ?? false,
    });
  };

  if (Array.isArray(slots)) {
    slots.forEach(readSlot);
  } else if (slots instanceof Map || typeof (slots as { forEach?: unknown } | undefined)?.forEach === "function") {
    (slots as { forEach: (callback: (slot: unknown, key: string) => void) => void }).forEach(readSlot);
  } else if (slots && typeof (slots as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function") {
    for (const slot of slots as Iterable<unknown>) {
      readSlot(slot);
    }
  } else if (slots) {
    Object.entries(slots).forEach(([key, slot]) => readSlot(slot, key));
  }

  return snapshots;
}
