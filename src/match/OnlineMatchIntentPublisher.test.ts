import assert from "node:assert/strict";
import test from "node:test";
import { previewRoomSnapshot } from "../onlineGameplayPreviewTestData";
import type { MatchInputSnapshot } from "./MatchInputController";
import { createOnlineMatchIntentPublisher } from "./OnlineMatchIntentPublisher";
import type { VehicleState } from "./MatchTypes";

const baseInput: MatchInputSnapshot = {
  aimUp: false,
  aimDown: false,
  moveLeft: false,
  moveRight: true,
  chargeHeld: false,
  resetPressed: false,
  collisionZonesTogglePressed: false,
  soundMuteTogglePressed: false,
};

test("online match intent publisher sends movement as pushed submitTurnIntent messages", () => {
  const { publisher, sent } = publisherHarness({ turnAuthorityVersion: 7 });

  publisher.submitMove({
    vehicle: vehicle({ id: "red-1", x: 412.5, y: 338.25, facing: 1, angle: 52 }),
    input: baseInput,
    deltaSeconds: 0.05,
  });

  assert.deepEqual(sent, [
    {
      type: "submitTurnIntent",
      message: {
        intentId: "red-session-1-move",
        action: "move",
        direction: 1,
        deltaSeconds: 0.05,
        clientPredictedX: 412.5,
        clientPredictedY: 338.25,
        inputSeq: 1,
        turnAuthorityVersion: 7,
      },
    },
  ]);
});

test("online match intent publisher batches rapid movement frames into elapsed server time", () => {
  const { publisher, sent } = publisherHarness({ turnAuthorityVersion: 7 });
  const activeVehicle = vehicle({ id: "red-1", x: 412.5, y: 338.25, facing: 1, angle: 52 });

  submitTinyMove(publisher, activeVehicle, 0.01);
  assert.deepEqual(sent, []);

  activeVehicle.x = 414.5;
  submitTinyMove(publisher, activeVehicle, 0.01);

  assert.deepEqual(sent, [
    {
      type: "submitTurnIntent",
      message: {
        intentId: "red-session-1-move",
        action: "move",
        direction: 1,
        deltaSeconds: 0.02,
        clientPredictedX: 414.5,
        clientPredictedY: 338.25,
        inputSeq: 1,
        turnAuthorityVersion: 7,
      },
    },
  ]);
});

test("online match intent publisher flushes pending movement before firing", () => {
  const { publisher, sent } = publisherHarness({ turnAuthorityVersion: 8 });
  const activeVehicle = vehicle({ id: "red-1", x: 412.5, y: 338.25, facing: 1, angle: 52 });

  submitTinyMove(publisher, activeVehicle, 0.01);
  activeVehicle.x = 414.5;
  activeVehicle.angle = 61;
  publisher.submitFire({
    vehicle: activeVehicle,
    power: 73,
  });

  assert.deepEqual(sent, [
    {
      type: "submitTurnIntent",
      message: {
        intentId: "red-session-1-move",
        action: "move",
        direction: 1,
        deltaSeconds: 0.01,
        clientPredictedX: 414.5,
        clientPredictedY: 338.25,
        inputSeq: 1,
        turnAuthorityVersion: 8,
      },
    },
    {
      type: "submitTurnIntent",
      message: {
        intentId: "red-session-2-fire",
        action: "fire",
        angle: 61,
        power: 73,
        facing: 1,
        clientPredictedX: 414.5,
        clientPredictedY: 338.25,
        inputSeq: 2,
        turnAuthorityVersion: 8,
      },
    },
  ]);
});

test("online match intent publisher sends fire with final local angle, power, facing, and origin hint", () => {
  const { publisher, sent } = publisherHarness({ turnAuthorityVersion: 8 });

  publisher.submitFire({
    vehicle: vehicle({ id: "red-1", x: 420, y: 331, facing: 1, angle: 61 }),
    power: 73,
  });

  assert.deepEqual(sent, [
    {
      type: "submitTurnIntent",
      message: {
        intentId: "red-session-1-fire",
        action: "fire",
        angle: 61,
        power: 73,
        facing: 1,
        clientPredictedX: 420,
        clientPredictedY: 331,
        inputSeq: 1,
        turnAuthorityVersion: 8,
      },
    },
  ]);
});

test("online match intent publisher sends aim updates with the current angle and facing", () => {
  const { publisher, sent } = publisherHarness({ turnAuthorityVersion: 9 });

  publisher.submitAim({
    vehicle: vehicle({ id: "red-1", x: 420, y: 331, facing: 1, angle: 64 }),
  });

  assert.deepEqual(sent, [
    {
      type: "submitTurnIntent",
      message: {
        intentId: "red-session-1-aim",
        action: "aim",
        angle: 64,
        facing: 1,
        clientPredictedX: 420,
        clientPredictedY: 331,
        inputSeq: 1,
        turnAuthorityVersion: 9,
      },
    },
  ]);
});

test("online match intent publisher ignores local inputs for vehicles owned by another session", () => {
  const { publisher, sent } = publisherHarness({ sessionId: "blue-session" });

  assert.equal(publisher.canControlVehicle("red-1"), false);
  submitBlockedRedMove(publisher);
  publisher.submitAim({
    vehicle: vehicle({ id: "red-1", x: 420, y: 331, facing: 1, angle: 61 }),
  });
  publisher.submitFire({
    vehicle: vehicle({ id: "red-1", x: 420, y: 331, facing: 1, angle: 61 }),
    power: 73,
  });

  assert.deepEqual(sent, []);
});

test("online match intent publisher waits for delayed server turn start before sending active-owner input", () => {
  const { publisher, sent } = publisherHarness({
    serverTimeMs: 3_000,
    turnStartedAtMs: 4_000,
  });

  assert.equal(publisher.canControlVehicle("red-1"), false);
  submitBlockedRedMove(publisher);

  assert.deepEqual(sent, []);
});

type SentMessage = {
  type: string;
  message?: unknown;
};

type PublisherHarnessOptions = {
  sessionId?: string;
  turnAuthorityVersion?: number;
  serverTimeMs?: number;
  turnStartedAtMs?: number;
};

function publisherHarness(options: PublisherHarnessOptions = {}) {
  const sent: SentMessage[] = [];
  const publisher = createOnlineMatchIntentPublisher({
    sessionId: options.sessionId ?? "red-session",
    state: previewRoomSnapshot({
      turnAuthorityVersion: options.turnAuthorityVersion ?? 7,
      serverTimeMs: options.serverTimeMs,
      turnStartedAtMs: options.turnStartedAtMs,
    }),
    send: (type, message) => sent.push({ type, message }),
  });

  return { publisher, sent };
}

function submitTinyMove(
  publisher: ReturnType<typeof createOnlineMatchIntentPublisher>,
  activeVehicle: VehicleState,
  deltaSeconds = 0.02,
): void {
  publisher.submitMove({
    vehicle: activeVehicle,
    input: baseInput,
    deltaSeconds,
  });
}

function submitBlockedRedMove(publisher: ReturnType<typeof createOnlineMatchIntentPublisher>): void {
  publisher.submitMove({
    vehicle: vehicle({ id: "red-1", x: 412.5, y: 338.25, facing: 1, angle: 52 }),
    input: baseInput,
    deltaSeconds: 0.05,
  });
}

function vehicle(overrides: Partial<VehicleState>): VehicleState {
  return {
    id: "red-1",
    x: 0,
    y: 0,
    facing: 1,
    angle: 47,
    ...overrides,
  } as VehicleState;
}
