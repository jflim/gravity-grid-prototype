import assert from "node:assert/strict";
import test from "node:test";
import { previewRoomSnapshot } from "../onlineGameplayPreviewTestData";
import { syncOnlineSnapshotForShotFlow, updateOnlineReplayProjectile } from "./MatchSceneOnlineSync";
import type { ProjectileState, VehicleState } from "./MatchTypes";
import type { AdvanceShotInput, ShotFlowController } from "./ShotFlowController";
import { TurnController } from "./TurnController";

test("updateOnlineReplayProjectile advances replay shots with the recorded shot wind", () => {
  let windUsed = Number.NaN;
  let deltaSecondsUsed = Number.NaN;
  const projectile = projectileState({ serverReplayWind: -0.8 });

  const result = updateOnlineReplayProjectile({
    projectile,
    vehicles: [],
    wind: 0.4,
    deltaSeconds: 0.1,
    shotFlowController: {
      advanceVisualProjectile: (input) => {
        windUsed = input.wind;
        deltaSecondsUsed = input.deltaSeconds;
        return {
          kind: "resolved",
          projectile: undefined,
          impactPreview: undefined,
          shotResult: "resolved",
        };
      },
    },
  });

  assert.equal(windUsed, -0.8);
  assertNearlyEqual(deltaSecondsUsed, 0.15);
  assert.equal(result?.resultText, "resolved");
});

test("syncOnlineSnapshotForShotFlow advances new shot replay to the server event age", () => {
  let replayDeltaSeconds = 0;
  const snapshot = previewRoomSnapshot({
    serverTimeMs: 1_150,
    lastShotId: "round-1-turn-1-red-1-2",
    lastShotShooterVehicleId: "red-1",
    lastShotShooterSessionId: "red-session",
    lastShotOriginX: 420,
    lastShotOriginY: 330,
    lastShotAngle: 47,
    lastShotPower: 70,
    lastShotFacing: 1,
    lastShotWind: 0,
    lastShotServerTimeMs: 1_000,
  });
  const shotFlowController = {
    fire: () => ({
      projectile: projectileState(),
      shotResult: "Red fired.",
    }),
    advanceVisualProjectile: (input: AdvanceShotInput) => {
      replayDeltaSeconds = input.deltaSeconds;
      return { kind: "in-flight" };
    },
  } satisfies Pick<ShotFlowController, "fire" | "advanceVisualProjectile">;

  const result = syncOnlineSnapshotForShotFlow({
    snapshot,
    lastReplayedShotId: "",
    turnController: new TurnController({ turnSeconds: 20, windSource: () => 0 }),
    vehicles: [vehicle({ id: "red-1", x: 420, y: 330 })],
    shotFlowController: shotFlowController as unknown as ShotFlowController,
    soundController: {
      playWeaponFire: () => undefined,
    } as never,
    waitingForVehicleMotionResolution: false,
    resultText: "",
  });

  assert.equal(result.changed, true);
  assertNearlyEqual(replayDeltaSeconds, 0.225);
});

function assertNearlyEqual(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 0.000_001, `Expected ${actual} to be near ${expected}.`);
}

function projectileState(overrides: Partial<ProjectileState> = {}): ProjectileState {
  return {
    x: 100,
    y: 200,
    vx: 30,
    vy: -20,
    shooterId: "red-1",
    team: "red",
    trail: [],
    ...overrides,
  };
}

function vehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    id: "red-1",
    username: "Red",
    classId: "bunger",
    className: "Bunger Rig",
    team: "red",
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
