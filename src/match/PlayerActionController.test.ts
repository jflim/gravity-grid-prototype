import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import { PlayerActionController, type PlayerActionControllerOptions } from "./PlayerActionController";
import type { MatchInputSnapshot } from "./MatchInputController";
import type { VehicleState } from "./MatchTypes";

const baseInput: MatchInputSnapshot = {
  aimUp: false,
  aimDown: false,
  moveLeft: false,
  moveRight: false,
  chargeHeld: false,
  resetPressed: false,
  collisionZonesTogglePressed: false,
};

function vehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0]!,
    x: 100,
    y: 500,
    hp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

function createHarness(overrides: Partial<PlayerActionControllerOptions> = {}) {
  const events: string[] = [];
  let chargeState = { isCharging: false, charge: 0 };
  const controller = new PlayerActionController({
    aimSpeedDegPerSecond: 10,
    minElevationDeg: 0,
    maxElevationDeg: 120,
    moveSpeedPixelsPerSecond: 100,
    movePixelsPerUnit: 10,
    minX: 0,
    maxX: 1000,
    maxClimbSlope: 1,
    fallSurfaceY: 900,
    chargeRatePerSecond: 50,
    maxPower: 100,
    minFirePower: 20,
    surfaceAt: () => 500,
    placeVehicleOnSurface: (target) => {
      target.y = 500;
      events.push("placed");
    },
    chargeState: () => chargeState,
    setChargeState: (next) => {
      chargeState = next;
      events.push(`charge:${next.isCharging}:${next.charge}`);
    },
    fire: (_target, power) => events.push(`fire:${power}`),
    resetCharge: () => events.push("reset-charge"),
    onVehicleMoved: () => events.push("moved"),
    onVehicleDroveIntoVoid: (target) => events.push(`${target.username}:void`),
    ...overrides,
  });

  return {
    controller,
    events,
    chargeState: () => chargeState,
  };
}

test("player action controller updates aim and moves active vehicles across traversable terrain", () => {
  const active = vehicle();
  const { controller, events } = createHarness();

  controller.handleVehicleInput(active, { ...baseInput, aimUp: true, moveRight: true }, 0.5);

  assert.equal(active.angle, 52);
  assert.equal(active.facing, 1);
  assert.equal(active.x, 150);
  assert.equal(active.y, 500);
  assert.equal(active.moveUnits, 5);
  assert.deepEqual(events, ["placed", "moved"]);
});

test("player action controller preserves elevation when changing facing", () => {
  const active = vehicle({ angle: 35, facing: 1 });
  const { controller } = createHarness();

  controller.handleVehicleInput(active, { ...baseInput, moveLeft: true }, 0);

  assert.equal(active.facing, -1);
  assert.equal(active.angle, 145);
});

test("player action controller turns a charge release into a fire request", () => {
  const active = vehicle();
  const { controller, events } = createHarness({
    chargeState: () => ({ isCharging: true, charge: 12 }),
  });

  controller.handleChargeInput(active, { ...baseInput, chargeHeld: false }, 0.1);

  assert.deepEqual(events, ["charge:false:0", "fire:20"]);
});

test("player action controller reports when movement settlement void drops the active vehicle", () => {
  const active = vehicle();
  const { controller, events } = createHarness({
    placeVehicleOnSurface: (target) => {
      target.alive = false;
      target.defeatReason = "void";
      events.push("placed");
    },
  });

  controller.handleVehicleInput(active, { ...baseInput, moveRight: true }, 0.5);

  assert.deepEqual(events, ["placed", "Nova:void", "reset-charge", "moved"]);
});
