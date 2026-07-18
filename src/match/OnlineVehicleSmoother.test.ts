import assert from "node:assert/strict";
import test from "node:test";
import { previewRoomSnapshot } from "../onlineGameplayPreviewTestData";
import type { VehicleState } from "./MatchTypes";
import { OnlineVehicleSmoother } from "./OnlineVehicleSmoother";

test("online vehicle smoother interpolates remote vehicles between server snapshots", () => {
  const { smoother, vehicles } = smootherWithTwoRemoteSamples(100);

  const result = smoother.update(vehicles, { clientTimeMs: 150, deltaSeconds: 1 / 60 });

  assert.deepEqual(result.changedVehicleIds, ["blue-1"]);
  assert.equal(vehicles[0]!.x, 150);
  assert.equal(vehicles[0]!.y, 320);
});

test("online vehicle smoother holds the latest remote sample when render time passes the newest sample", () => {
  const { smoother, vehicles } = smootherWithTwoRemoteSamples(0);

  const result = smoother.update(vehicles, { clientTimeMs: 250, deltaSeconds: 1 / 60 });

  assert.deepEqual(result.changedVehicleIds, ["blue-1"]);
  assert.equal(vehicles[0]!.x, 200);
  assert.equal(vehicles[0]!.y, 340);
});

test("online vehicle smoother defaults to a shorter interpolation delay for responsive remote movement", () => {
  const { smoother, vehicles } = smootherWithTwoRemoteSamples();

  const result = smoother.update(vehicles, { clientTimeMs: 120, deltaSeconds: 1 / 60 });

  assert.deepEqual(result.changedVehicleIds, ["blue-1"]);
  assert.equal(vehicles[0]!.x, 160);
  assert.equal(vehicles[0]!.y, 324);
});

test("online vehicle smoother keeps small locally predicted movement instead of dragging toward stale server truth", () => {
  const smoother = new OnlineVehicleSmoother({
    localSessionId: "red-session",
    interpolationDelayMs: 100,
    localCorrectionPerSecond: 10,
  });
  const vehicles = [vehicle("red-1", { x: 120, y: 300 })];

  smoother.enqueueSnapshot(snapshotWithVehicle("red-1", "red-session", 1_000, 100, 300), 0);

  const result = smoother.update(vehicles, { clientTimeMs: 16, deltaSeconds: 0.016 });

  assert.deepEqual(result.changedVehicleIds, []);
  assert.equal(vehicles[0]!.x, 120);
  assert.equal(vehicles[0]!.y, 300);
  assert.equal(result.localCorrectionCount, 1);
});

function smootherWithTwoRemoteSamples(interpolationDelayMs?: number): {
  smoother: OnlineVehicleSmoother;
  vehicles: VehicleState[];
} {
  const smoother = new OnlineVehicleSmoother({
    localSessionId: "red-session",
    ...(interpolationDelayMs === undefined ? {} : { interpolationDelayMs }),
  });
  const vehicles = [vehicle("blue-1", { x: 100, y: 300 })];

  smoother.enqueueSnapshot(snapshotWithVehicle("blue-1", "blue-session", 1_000, 100, 300), 0);
  smoother.enqueueSnapshot(snapshotWithVehicle("blue-1", "blue-session", 1_100, 200, 340), 100);
  return { smoother, vehicles };
}

function snapshotWithVehicle(
  vehicleId: string,
  ownerSessionId: string,
  serverTimeMs: number,
  x: number,
  y: number,
) {
  return previewRoomSnapshot({
    serverTimeMs,
    vehicles: [
      {
        ...previewRoomSnapshot().vehicles[0]!,
        vehicleId,
        seatId: vehicleId,
        ownerSessionId,
        x,
        y,
      },
    ],
  });
}

function vehicle(id: string, overrides: Partial<VehicleState>): VehicleState {
  return {
    id,
    username: id,
    classId: "bunger",
    className: "Bunger Rig",
    team: id.startsWith("red") ? "red" : "blue",
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  } as VehicleState;
}
