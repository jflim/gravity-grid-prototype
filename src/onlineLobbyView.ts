export type ClientRole = "red-captain" | "blue-captain" | "spectator" | string;
export type ClientSlotId = "red-1" | "blue-1" | "red-2" | "blue-2" | string;

export function localRoleLabel(role: ClientRole): string {
  if (role === "red-captain") {
    return "Red captain";
  }

  if (role === "blue-captain") {
    return "Blue captain";
  }

  if (role === "spectator") {
    return "Spectator";
  }

  return "Waiting";
}

export function canLocalPlayerEditSlot(role: ClientRole, slotId: ClientSlotId): boolean {
  if (role === "red-captain") {
    return slotId.startsWith("red-");
  }

  if (role === "blue-captain") {
    return slotId.startsWith("blue-");
  }

  return false;
}

export function modeLabel(mode: string): string {
  return mode === "1v1" ? "1v1" : "2v2";
}

export function slotLabel(slotId: ClientSlotId): string {
  const [team, slot] = String(slotId).split("-");
  const teamLabel = team === "blue" ? "Blue" : "Red";
  return `${teamLabel} ${slot ?? "1"}`;
}

export function lobbyStatusText(input: {
  status: string;
  redCaptainName: string;
  blueCaptainName: string;
  redReady: boolean;
  blueReady: boolean;
}): string {
  if (input.status) {
    return input.status;
  }

  if (!input.redCaptainName) {
    return "Waiting for red captain.";
  }

  if (!input.blueCaptainName) {
    return "Waiting for blue captain.";
  }

  if (!input.redReady) {
    return `Waiting for ${input.redCaptainName} to ready.`;
  }

  if (!input.blueReady) {
    return `Waiting for ${input.blueCaptainName} to ready.`;
  }

  return "Starting match.";
}
