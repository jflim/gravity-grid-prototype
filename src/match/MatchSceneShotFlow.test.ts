import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units";
import { EMPTY_MATCH_INPUT } from "./MatchInputController";
import { MatchSceneShotFlow } from "./MatchSceneShotFlow";
import type { MatchSceneShotFlowOptions } from "./MatchSceneShotFlowTypes";
import type { MatchTurnIntentPublisher } from "./MatchTurnIntents";
import type { VehicleState } from "./MatchTypes";

test("online shot flow does not locally tick or advance the server-owned turn timer", () => {
  const { flow } = createShotFlow({
    canControlVehicle: () => true,
    submitAim: () => undefined,
    submitMove: () => undefined,
    submitFire: () => undefined,
  });

  flow.startRound(["red-1", "blue-1"], "");
  flow.beginTurn();
  flow.updateActiveRound(EMPTY_MATCH_INPUT, 21);

  assert.equal(flow.activeVehicle()?.id, "red-1");
  assert.equal(flow.viewState().turnTime, 20);
});

test("online shot flow publishes facing-only movement intents", () => {
  const submittedMoves: unknown[] = [];
  const { flow, vehicles } = createShotFlow({
    canControlVehicle: () => true,
    submitAim: () => undefined,
    submitMove: (intent) => submittedMoves.push(intent),
    submitFire: () => undefined,
  });
  const active = vehicles[0];
  assert.ok(active, "active vehicle exists");

  flow.startRound(["red-1", "blue-1"], "");
  flow.beginTurn();
  active.moveUnits = 0;
  flow.updateActiveRound({ ...EMPTY_MATCH_INPUT, moveLeft: true }, 0.05);

  assert.equal(active.facing, -1);
  assert.equal(submittedMoves.length, 1);
});

test("online shot flow publishes aim-only intents", () => {
  const submittedAims: unknown[] = [];
  const { flow, vehicles } = createShotFlow({
    canControlVehicle: () => true,
    submitAim: (intent) => submittedAims.push(intent),
    submitMove: () => undefined,
    submitFire: () => undefined,
  });
  const active = vehicles[0];
  assert.ok(active, "active vehicle exists");

  flow.startRound(["red-1", "blue-1"], "");
  flow.beginTurn();
  flow.updateActiveRound({ ...EMPTY_MATCH_INPUT, aimUp: true }, 0.1);

  assert.ok(active.angle > 47);
  assert.equal(submittedAims.length, 1);
});

function createShotFlow(turnIntentPublisher?: MatchTurnIntentPublisher): { flow: MatchSceneShotFlow; vehicles: VehicleState[] } {
  const vehicles = [vehicle("red-1"), vehicle("blue-1")];
  const flow = new MatchSceneShotFlow({
    terrain: {
      surfaceAt: () => 600,
      makeCrater: () => undefined,
    },
    vehicleSettlementController: {
      settleVehicles: () => [],
      placeVehicleOnSurface: () => true,
      hasActiveVehicleMotion: () => false,
      updateVehicleMotion: () => [],
    },
    roundEventScheduler: {
      queue: () => undefined,
      clear: () => undefined,
    },
    windSource: () => 0,
    vehicles: () => vehicles,
    hitZoneFor: (unit: VehicleState) => ({ centerX: unit.x, centerY: unit.y, width: 40, height: 40 }),
    addCombatMarkerForVehicle: () => undefined,
    recenterForProjectileIfNeeded: () => undefined,
    frameBattlefield: () => undefined,
    stopCameraFollow: () => undefined,
    drawWorld: () => undefined,
    restartRound: () => undefined,
    turnIntentPublisher,
  } as unknown as MatchSceneShotFlowOptions);
  return { flow, vehicles };
}

function vehicle(id: VehicleState["id"]): VehicleState {
  const unit = DEMO_UNIT_DEFINITIONS.find((candidate) => candidate.id === id);
  assert.ok(unit, `${id} unit exists`);
  return {
    ...unit,
    x: id.startsWith("red") ? 100 : 500,
    y: 300,
    hp: 100,
    angle: id.startsWith("red") ? 47 : 133,
    facing: (id.startsWith("red") ? 1 : -1) as VehicleState["facing"],
    moveUnits: 10,
    alive: true,
  };
}
