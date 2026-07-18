import {
  MAX_ELEVATION_DEG,
  MAX_POWER,
  MIN_ELEVATION_DEG,
  MIN_FIRE_POWER,
  TURN_SECONDS,
} from "../../shared/v1/tuning.js";
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
  inputSeq: number;
};

type ValidTurnIntentMessage = Omit<SubmitTurnIntentMessage, keyof AcceptedTurnIntent> & AcceptedTurnIntent;

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

  const intent = acceptedTurnIntentFrom(state, message);
  const activeVehicle = activeOwnedVehicleForClient(state, sessionId);
  if (!intent || !activeVehicle || !serverTurnHasStarted(state)) {
    return false;
  }

  recordAcceptedTurnIntent(state, sessionId, activeVehicle, intent);
  return true;
}

export function isValidFireIntentPayload(message: SubmitTurnIntentMessage | null | undefined): boolean {
  return hasFireTrajectory(message) && fireTrajectoryIsWithinBounds(message);
}

function fireTrajectoryIsWithinBounds(message: { angle: number; power: number; facing: 1 | -1 }): boolean {
  const minAngle = message.facing === 1 ? MIN_ELEVATION_DEG : 180 - MAX_ELEVATION_DEG;
  const maxAngle = message.facing === 1 ? MAX_ELEVATION_DEG : 180 - MIN_ELEVATION_DEG;
  return isBetween(message.angle, minAngle, maxAngle) && isBetween(message.power, MIN_FIRE_POWER, MAX_POWER);
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
  state: GravityCanyonState,
  message: SubmitTurnIntentMessage | null | undefined,
): AcceptedTurnIntent | undefined {
  if (!message) {
    return undefined;
  }

  if (!hasCurrentIntentMetadata(state, message)) {
    return undefined;
  }

  return {
    action: message.action,
    intentId: message.intentId,
    inputSeq: message.inputSeq,
  };
}

function hasCurrentIntentMetadata(
  state: GravityCanyonState,
  message: SubmitTurnIntentMessage,
): message is ValidTurnIntentMessage {
  const inputSeq = validInputSeq(message.inputSeq);
  return hasValidIntentIdentity(message, inputSeq) && hasCurrentIntentSequence(state, message, inputSeq);
}

function hasValidIntentIdentity(
  message: SubmitTurnIntentMessage,
  inputSeq: number | undefined,
): message is ValidTurnIntentMessage {
  return (
    turnIntentTypeFrom(message.action) !== undefined &&
    validIntentId(message.intentId) !== undefined &&
    inputSeq !== undefined
  );
}

function hasCurrentIntentSequence(
  state: GravityCanyonState,
  message: SubmitTurnIntentMessage,
  inputSeq: number | undefined,
): boolean {
  return inputSeq !== undefined && message.turnAuthorityVersion === state.turnAuthorityVersion && inputSeq > state.lastAcceptedTurnInputSeq;
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
  state.lastAcceptedTurnInputSeq = intent.inputSeq;
  state.status = `${activeVehicle.displayName}'s ${intent.action} intent accepted by the server.`;
}

function turnIntentTypeFrom(action: unknown): TurnIntentType | undefined {
  return typeof action === "string" && TURN_INTENT_TYPE_SET.has(action) ? (action as TurnIntentType) : undefined;
}

function validIntentId(intentId: unknown): string | undefined {
  return typeof intentId === "string" && intentId.length > 0 && intentId.length <= MAX_INTENT_ID_LENGTH
    ? intentId
    : undefined;
}

function validInputSeq(inputSeq: unknown): number | undefined {
  return typeof inputSeq === "number" && Number.isSafeInteger(inputSeq) && inputSeq > 0 ? inputSeq : undefined;
}

function isFacing(facing: unknown): facing is 1 | -1 {
  return facing === 1 || facing === -1;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasFireTrajectory(
  message: SubmitTurnIntentMessage | null | undefined,
): message is SubmitTurnIntentMessage & { angle: number; power: number; facing: 1 | -1 } {
  return Boolean(message && isFacing(message.facing) && isFiniteNumber(message.angle) && isFiniteNumber(message.power));
}

function isBetween(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}

function clearAcceptedTurnIntent(state: GravityCanyonState): void {
  state.lastAcceptedTurnIntentId = "";
  state.lastAcceptedTurnIntentType = "";
  state.lastAcceptedTurnIntentVehicleId = "";
  state.lastAcceptedTurnIntentSessionId = "";
  state.lastAcceptedTurnInputSeq = 0;
}
