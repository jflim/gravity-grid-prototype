import { TURN_SECONDS } from "../../shared/v1/tuning.js";
import type { CombatVehicleState, GravityCanyonState } from "../schema/GravityCanyonState.js";

export const TURN_INTENT_TYPES = ["aim", "move", "charge", "fire"] as const;

export type TurnIntentType = (typeof TURN_INTENT_TYPES)[number];

export type TurnAuthorityOptions = {
  nowMs?: number;
  startsAtMs?: number;
};

export type SubmitTurnIntentMessage = {
  intentId?: unknown;
  action?: unknown;
  direction?: unknown;
  deltaSeconds?: unknown;
  angle?: unknown;
  power?: unknown;
  facing?: unknown;
  clientPredictedX?: unknown;
  clientPredictedY?: unknown;
  inputSeq?: unknown;
  turnAuthorityVersion?: unknown;
};

type AcceptedTurnIntent = {
  intentId: string;
  action: TurnIntentType;
};

const TURN_INTENT_TYPE_SET = new Set<string>(TURN_INTENT_TYPES);
const MAX_INTENT_ID_LENGTH = 64;

export function beginServerTurn(state: GravityCanyonState, options: TurnAuthorityOptions = {}): void {
  const nowMs = options.nowMs ?? Date.now();
  const startsAtMs = options.startsAtMs ?? nowMs;
  state.serverTimeMs = nowMs;
  state.turnDurationSeconds = TURN_SECONDS;
  state.turnStartedAtMs = startsAtMs;
  state.turnEndsAtMs = startsAtMs + TURN_SECONDS * 1_000;
  state.turnSecondsRemaining = TURN_SECONDS;
  state.turnAuthorityVersion += 1;
  clearAcceptedTurnIntent(state);
}

export function clearServerTurnAuthority(state: GravityCanyonState): void {
  state.turnStartedAtMs = 0;
  state.turnEndsAtMs = 0;
  state.turnSecondsRemaining = TURN_SECONDS;
  clearAcceptedTurnIntent(state);
}

export function refreshServerTurnClock(state: GravityCanyonState, options: TurnAuthorityOptions = {}): void {
  const nowMs = options.nowMs ?? Date.now();
  state.serverTimeMs = nowMs;

  if (state.turnEndsAtMs <= 0) {
    state.turnSecondsRemaining = state.turnDurationSeconds;
    return;
  }

  const remainingMs = Math.max(0, state.turnEndsAtMs - nowMs);
  const remainingSeconds = Math.ceil(remainingMs / 1_000);
  state.turnSecondsRemaining = Math.min(state.turnDurationSeconds, remainingSeconds);
}

export function acceptTurnIntentForClient(
  state: GravityCanyonState,
  sessionId: string,
  message: SubmitTurnIntentMessage | null | undefined,
  options: TurnAuthorityOptions = {},
): boolean {
  refreshServerTurnClock(state, options);

  const intent = acceptedTurnIntentFrom(message);
  const activeVehicle = activeOwnedVehicleForClient(state, sessionId);
  if (!intent || !activeVehicle || !serverTurnHasStarted(state)) {
    return false;
  }

  recordAcceptedTurnIntent(state, sessionId, activeVehicle, intent);
  return true;
}

export function activeOwnedVehicleForClient(
  state: GravityCanyonState,
  sessionId: string,
): CombatVehicleState | undefined {
  if (state.phase !== "combat-preview") {
    return undefined;
  }

  return ownedLivingVehicleForSession(activeVehicleForState(state), sessionId);
}

export function serverTurnHasStarted(state: GravityCanyonState): boolean {
  return state.turnStartedAtMs <= 0 || state.serverTimeMs >= state.turnStartedAtMs;
}

function activeVehicleForState(state: GravityCanyonState): CombatVehicleState | undefined {
  return state.vehicles.find((vehicle) => vehicle.vehicleId === state.activeVehicleId);
}

function ownedLivingVehicleForSession(
  activeVehicle: CombatVehicleState | undefined,
  sessionId: string,
): CombatVehicleState | undefined {
  if (!activeVehicle) {
    return undefined;
  }

  if (!activeVehicle.alive || activeVehicle.ownerSessionId !== sessionId) {
    return undefined;
  }

  return activeVehicle;
}

function acceptedTurnIntentFrom(
  message: SubmitTurnIntentMessage | null | undefined,
): AcceptedTurnIntent | undefined {
  if (!message) {
    return undefined;
  }

  const action = turnIntentTypeFrom(message.action);
  return action ? { action, intentId: safeIntentId(message.intentId) } : undefined;
}

function recordAcceptedTurnIntent(
  state: GravityCanyonState,
  sessionId: string,
  activeVehicle: CombatVehicleState,
  intent: AcceptedTurnIntent,
): void {
  state.lastAcceptedTurnIntentId = intent.intentId;
  state.lastAcceptedTurnIntentType = intent.action;
  state.lastAcceptedTurnIntentVehicleId = activeVehicle.vehicleId;
  state.lastAcceptedTurnIntentSessionId = sessionId;
  state.turnAuthorityVersion += 1;
  state.status = `${activeVehicle.displayName}'s ${intent.action} intent accepted by the server.`;
}

function turnIntentTypeFrom(action: unknown): TurnIntentType | undefined {
  return typeof action === "string" && TURN_INTENT_TYPE_SET.has(action) ? (action as TurnIntentType) : undefined;
}

function safeIntentId(intentId: unknown): string {
  return typeof intentId === "string" ? intentId.slice(0, MAX_INTENT_ID_LENGTH) : "";
}

function clearAcceptedTurnIntent(state: GravityCanyonState): void {
  state.lastAcceptedTurnIntentId = "";
  state.lastAcceptedTurnIntentType = "";
  state.lastAcceptedTurnIntentVehicleId = "";
  state.lastAcceptedTurnIntentSessionId = "";
}
