import { getRoomSnapshot } from "../onlineLobbySnapshot";
import type { OnlineRoom } from "../onlineRoomTypes";
import {
  movementDirectionForIntent,
  type MatchAimIntent,
  type MatchFireIntent,
  type MatchMoveIntent,
  type MatchTurnIntentPublisher,
} from "./MatchTurnIntents";

type OnlineMatchIntentRoom = Pick<OnlineRoom, "send" | "sessionId" | "state">;

type SubmitTurnIntentPayload = {
  intentId: string;
  action: "aim" | "move" | "fire";
  direction?: -1 | 1;
  deltaSeconds?: number;
  angle?: number;
  power?: number;
  facing?: 1 | -1;
  clientPredictedX: number;
  clientPredictedY: number;
  inputSeq: number;
  turnAuthorityVersion: number;
};

type PendingMove = {
  direction: PendingMoveDirection;
  deltaSeconds: number;
  intent: MatchMoveIntent;
};

type PendingMoveDirection = NonNullable<SubmitTurnIntentPayload["direction"]>;

const MOVEMENT_INTENT_MIN_SECONDS = 1 / 60;

export function createOnlineMatchIntentPublisher(room: OnlineMatchIntentRoom): MatchTurnIntentPublisher {
  let inputSeq = 0;
  let pendingMove: PendingMove | undefined;

  const flushPendingMove = () => {
    if (!pendingMove) {
      return;
    }

    const move = pendingMove;
    pendingMove = undefined;
    if (!canControlVehicle(room, move.intent.vehicle.id)) {
      return;
    }

    room.send("submitTurnIntent", {
      ...basePayload(room, "move", ++inputSeq, move.intent),
      direction: move.direction,
      deltaSeconds: move.deltaSeconds,
    });
  };

  return {
    canControlVehicle: (vehicleId) => canControlVehicle(room, vehicleId),
    submitAim: (intent) => {
      if (!canControlVehicle(room, intent.vehicle.id)) {
        return;
      }

      flushPendingMove();
      room.send("submitTurnIntent", {
        ...basePayload(room, "aim", ++inputSeq, intent),
        angle: intent.vehicle.angle,
        facing: intent.vehicle.facing,
      });
    },
    submitMove: (intent) => {
      const direction = controllableMovementDirection(room, intent);
      if (direction === undefined) {
        return;
      }

      if (shouldFlushBeforeQueue(pendingMove, direction)) {
        flushPendingMove();
      }

      pendingMove = queuedPendingMove(pendingMove, intent, direction);
      if (shouldFlushPendingMove(pendingMove)) {
        flushPendingMove();
      }
    },
    submitFire: (intent) => {
      if (!canControlVehicle(room, intent.vehicle.id)) {
        return;
      }

      flushPendingMove();
      room.send("submitTurnIntent", {
        ...basePayload(room, "fire", ++inputSeq, intent),
        angle: intent.vehicle.angle,
        power: intent.power,
        facing: intent.vehicle.facing,
      });
    },
  };
}

function controllableMovementDirection(
  room: OnlineMatchIntentRoom,
  intent: MatchMoveIntent,
): PendingMoveDirection | undefined {
  if (!canControlVehicle(room, intent.vehicle.id)) {
    return undefined;
  }

  const direction = movementDirectionForIntent(intent.input);
  return direction === 0 ? undefined : direction;
}

function queuedPendingMove(
  pendingMove: PendingMove | undefined,
  intent: MatchMoveIntent,
  direction: PendingMoveDirection,
): PendingMove {
  return {
    direction,
    deltaSeconds: (pendingMove?.deltaSeconds ?? 0) + Math.max(0, intent.deltaSeconds),
    intent,
  };
}

function shouldFlushBeforeQueue(
  pendingMove: PendingMove | undefined,
  direction: PendingMoveDirection,
): boolean {
  return Boolean(pendingMove && pendingMove.direction !== direction);
}

function shouldFlushPendingMove(pendingMove: PendingMove): boolean {
  return pendingMove.deltaSeconds >= MOVEMENT_INTENT_MIN_SECONDS;
}

function canControlVehicle(room: OnlineMatchIntentRoom, vehicleId: string): boolean {
  const snapshot = getRoomSnapshot(room.state);
  if (snapshot.phase !== "combat-preview") {
    return false;
  }

  if (!turnHasStarted(snapshot) || snapshot.activeVehicleId !== vehicleId) {
    return false;
  }

  return vehicleOwnerSessionId(snapshot, vehicleId) === room.sessionId;
}

function turnHasStarted(snapshot: ReturnType<typeof getRoomSnapshot>): boolean {
  return snapshot.turnStartedAtMs <= 0 || snapshot.serverTimeMs >= snapshot.turnStartedAtMs;
}

function vehicleOwnerSessionId(snapshot: ReturnType<typeof getRoomSnapshot>, vehicleId: string): string | undefined {
  return snapshot.vehicles.find((vehicle) => vehicle.vehicleId === vehicleId)?.ownerSessionId;
}

function basePayload(
  room: OnlineMatchIntentRoom,
  action: SubmitTurnIntentPayload["action"],
  inputSeq: number,
  intent: MatchAimIntent | MatchMoveIntent | MatchFireIntent,
): Omit<SubmitTurnIntentPayload, "direction" | "deltaSeconds" | "angle" | "power" | "facing"> {
  return {
    intentId: `${room.sessionId}-${inputSeq}-${action}`,
    action,
    clientPredictedX: intent.vehicle.x,
    clientPredictedY: intent.vehicle.y,
    inputSeq,
    turnAuthorityVersion: getRoomSnapshot(room.state).turnAuthorityVersion,
  };
}
