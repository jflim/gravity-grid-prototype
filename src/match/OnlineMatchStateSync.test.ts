import assert from "node:assert/strict";
import test from "node:test";
import { previewRoomSnapshot } from "../onlineGameplayPreviewTestData";
import type { VehicleState } from "./MatchTypes";
import {
  applyOnlineMatchSnapshotToVehicles,
  onlineMatchWindForPhaser,
  onlineShotReplayFromSnapshot,
} from "./OnlineMatchStateSync";

test("applyOnlineMatchSnapshotToVehicles mutates local vehicles from server state", () => {
  const vehicles = [vehicle("red-1"), vehicle("blue-1")];

  const result = applyOnlineMatchSnapshotToVehicles(
    vehicles,
    previewRoomSnapshot({
      vehicles: [
        {
          ...previewRoomSnapshot().vehicles[0]!,
          vehicleId: "red-1",
          seatId: "red-1",
          hp: 72,
          alive: true,
          x: 512,
          y: 344,
          moveUnits: 6,
          facing: -1,
          angle: 61,
        },
        {
          ...previewRoomSnapshot().vehicles[1]!,
          vehicleId: "blue-1",
          seatId: "blue-1",
          hp: 0,
          alive: false,
          x: 1880,
          y: 376,
          moveUnits: 10,
          facing: 1,
          angle: 119,
        },
      ],
    }),
  );

  assert.deepEqual(result.changedVehicleIds, ["red-1", "blue-1"]);
  assert.deepEqual(pickSyncedFields(vehicles[0]!), {
    x: 512,
    y: 344,
    hp: 72,
    alive: true,
    moveUnits: 6,
    facing: -1,
    angle: 61,
  });
  assert.deepEqual(pickSyncedFields(vehicles[1]!), {
    x: 1880,
    y: 376,
    hp: 0,
    alive: false,
    moveUnits: 10,
    facing: 1,
    angle: 119,
  });
});

test("applyOnlineMatchSnapshotToVehicles matches server seat ids when vehicle ids are absent", () => {
  const vehicles = [vehicle("red-1")];

  const result = applyOnlineMatchSnapshotToVehicles(
    vehicles,
    previewRoomSnapshot({
      vehicles: [
        {
          ...previewRoomSnapshot().vehicles[0]!,
          vehicleId: "",
          seatId: "red-1",
          x: 640,
        },
      ],
    }),
  );

  assert.deepEqual(result.changedVehicleIds, ["red-1"]);
  assert.equal(vehicles[0]!.x, 640);
});

test("onlineShotReplayFromSnapshot returns each server shot once", () => {
  const snapshot = previewRoomSnapshot({
    lastShotId: "round-1-turn-1-red-1-4",
    lastShotShooterVehicleId: "red-1",
    lastShotShooterSessionId: "red-session",
    lastShotOriginX: 512,
    lastShotOriginY: 344,
    lastShotAngle: 57,
    lastShotPower: 74,
    lastShotFacing: 1,
    lastShotWind: -8,
    lastShotImpactX: 1220,
    lastShotImpactY: 610,
    lastShotDirectHitVehicleId: "blue-1",
    lastShotTargetVehicleId: "blue-1",
    lastShotDamage: 40,
  });

  assert.deepEqual(onlineShotReplayFromSnapshot(snapshot, ""), {
    id: "round-1-turn-1-red-1-4",
    shooterVehicleId: "red-1",
    shooterSessionId: "red-session",
    originX: 512,
    originY: 344,
    angle: 57,
    power: 74,
    facing: 1,
    wind: -0.8,
    impactX: 1220,
    impactY: 610,
    directHitVehicleId: "blue-1",
    targetVehicleId: "blue-1",
    damage: 40,
    serverTimeMs: 0,
  });
  assert.equal(onlineShotReplayFromSnapshot(snapshot, "round-1-turn-1-red-1-4"), undefined);
});

test("onlineMatchWindForPhaser converts server display wind into local physics wind", () => {
  assert.equal(onlineMatchWindForPhaser(4), 0.4);
  assert.equal(onlineMatchWindForPhaser(-12), -1.2);
});

function vehicle(id: string): VehicleState {
  return {
    id,
    x: 0,
    y: 0,
    hp: 100,
    alive: true,
    moveUnits: 10,
    facing: 1,
    angle: 45,
  } as VehicleState;
}

function pickSyncedFields(vehicle: VehicleState) {
  return {
    x: vehicle.x,
    y: vehicle.y,
    hp: vehicle.hp,
    alive: vehicle.alive,
    moveUnits: vehicle.moveUnits,
    facing: vehicle.facing,
    angle: vehicle.angle,
  };
}
