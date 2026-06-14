import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import type { CombatMarkerKind } from "../../shared/model/gameTypes.js";
import { ImpactController, type ImpactControllerOptions } from "./ImpactController";
import type { SettleOptions, VehicleState } from "./MatchTypes";

const baseOptions: ImpactControllerOptions = {
  craterRadius: 52,
  bungerCraterRadius: 82,
  damageRadius: 78,
  bungerDamageRadius: 92,
  bungerKnockback: 82,
  moveMinX: -72,
  moveMaxX: 2472,
  impactPreviewSeconds: 0.75,
};

test("impact controller applies direct damage, craters terrain, settles vehicles, and returns shot text", () => {
  const vehicles = [
    makeVehicle(2, { x: 0, y: 100 }),
    makeVehicle(1, { x: 120, y: 100 }),
  ];
  const recorder = createRecorder();
  const controller = new ImpactController(baseOptions);

  const result = controller.resolve({
    x: 120,
    y: 100,
    directHitId: "blue-1",
    projectile: { shooterId: "red-2" },
    vehicles,
    hitZoneFor: (vehicle) => ({ centerX: vehicle.x, centerY: vehicle.y, width: 20, height: 20 }),
    makeCrater: recorder.makeCrater,
    settleVehicles: recorder.settleVehicles,
    addCombatMarker: recorder.addCombatMarker,
  });

  assert.equal(vehicles[1]!.hp, 66);
  assert.equal(vehicles[1]!.alive, true);
  assert.deepEqual(recorder.craters, [{ x: 120, y: 100, radius: 52, depthFactor: 0.68 }]);
  assert.deepEqual(recorder.settleCalls.map(settleCallSnapshot), [
    { changedX: 120, changedRadius: 78, forceIds: ["blue-1"] },
  ]);
  assert.deepEqual(recorder.markers, [
    { vehicleId: "blue-1", kind: "direct", label: "DIRECT -34", slot: undefined },
  ]);
  assert.deepEqual(result.impactPreview, {
    x: 120,
    y: 100,
    craterRadius: 52,
    damageRadius: 78,
    isBungerShot: false,
    timeLeft: 0.75,
  });
  assert.equal(result.shotResult, "Vesper -34");
});

test("impact controller adds KO markers for damage defeats", () => {
  const vehicles = [
    makeVehicle(2, { x: 0, y: 100 }),
    makeVehicle(1, { x: 120, y: 100, hp: 20 }),
  ];
  const recorder = createRecorder();
  const controller = new ImpactController(baseOptions);

  const result = controller.resolve({
    x: 120,
    y: 100,
    directHitId: "blue-1",
    projectile: { shooterId: "red-2" },
    vehicles,
    hitZoneFor: (vehicle) => ({ centerX: vehicle.x, centerY: vehicle.y, width: 20, height: 20 }),
    makeCrater: recorder.makeCrater,
    settleVehicles: recorder.settleVehicles,
    addCombatMarker: recorder.addCombatMarker,
  });

  assert.equal(vehicles[1]!.hp, 0);
  assert.equal(vehicles[1]!.alive, false);
  assert.equal(vehicles[1]!.defeatReason, "damage");
  assert.deepEqual(recorder.markers, [
    { vehicleId: "blue-1", kind: "direct", label: "DIRECT -34", slot: undefined },
    { vehicleId: "blue-1", kind: "ko", label: "KO", slot: 1 },
  ]);
  assert.equal(result.shotResult, "Vesper -34");
});

test("impact controller adds Void Dropped markers for settlement defeats", () => {
  const vehicles = [
    makeVehicle(2, { x: 100, y: 100 }),
    makeVehicle(1, { x: 400, y: 100 }),
  ];
  const recorder = createRecorder({
    settleVehicles: () => {
      vehicles[1]!.alive = false;
      vehicles[1]!.defeatReason = "void";
      return ["Vesper Void Dropped"];
    },
  });
  const controller = new ImpactController(baseOptions);

  const result = controller.resolve({
    x: 240,
    y: 100,
    projectile: { shooterId: "red-2" },
    vehicles,
    hitZoneFor: (vehicle) => ({ centerX: vehicle.x, centerY: vehicle.y, width: 20, height: 20 }),
    makeCrater: recorder.makeCrater,
    settleVehicles: recorder.settleVehicles,
    addCombatMarker: recorder.addCombatMarker,
  });

  assert.deepEqual(recorder.markers, [
    { vehicleId: "blue-1", kind: "bunged", label: "VOID DROPPED", slot: undefined },
  ]);
  assert.equal(result.shotResult, "Terrain carved. / Vesper Void Dropped");
});

test("impact controller reports bunger knockback markers and text", () => {
  const vehicles = [
    makeVehicle(0, { x: 0, y: 100 }),
    makeVehicle(1, { x: 120, y: 100 }),
  ];
  const recorder = createRecorder();
  const controller = new ImpactController(baseOptions);

  const result = controller.resolve({
    x: 100,
    y: 100,
    directHitId: "blue-1",
    projectile: { shooterId: "red-1" },
    vehicles,
    hitZoneFor: (vehicle) => ({ centerX: vehicle.x, centerY: vehicle.y, width: 20, height: 20 }),
    makeCrater: recorder.makeCrater,
    settleVehicles: recorder.settleVehicles,
    addCombatMarker: recorder.addCombatMarker,
  });

  assert.equal(result.impactPreview.isBungerShot, true);
  assert.equal(result.impactPreview.craterRadius, 82);
  assert.equal(result.impactPreview.damageRadius, 92);
  assert.ok(vehicles[1]!.x > 120);
  assert.deepEqual(
    recorder.markers.map((marker) => ({ kind: marker.kind, label: marker.label })),
    [
      { kind: "direct", label: "DIRECT -22" },
      { kind: "shoved", label: "SHOVED" },
    ],
  );
  assert.equal(result.shotResult, "Vesper -22 / Vesper shoved");
});

function makeVehicle(unitIndex: number, overrides: Partial<VehicleState> = {}): VehicleState {
  const unit = DEMO_UNIT_DEFINITIONS[unitIndex]!;
  return {
    ...unit,
    x: 0,
    y: 0,
    hp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

function createRecorder(overrides: Partial<Recorder> = {}): Recorder {
  const recorder: Recorder = {
    craters: [],
    settleCalls: [],
    markers: [],
    makeCrater: (x, y, radius, depthFactor) => {
      recorder.craters.push({ x, y, radius, depthFactor });
    },
    settleVehicles: (options) => {
      recorder.settleCalls.push(options);
      return [];
    },
    addCombatMarker: (vehicle, kind, label, slot) => {
      recorder.markers.push({ vehicleId: vehicle.id, kind, label, slot });
    },
    ...overrides,
  };
  return recorder;
}

function settleCallSnapshot(options: SettleOptions): { changedX: number; changedRadius: number; forceIds: string[] } {
  return {
    changedX: options.changedX,
    changedRadius: options.changedRadius,
    forceIds: [...(options.forceIds ?? [])],
  };
}

interface Recorder {
  craters: { x: number; y: number; radius: number; depthFactor: number }[];
  settleCalls: SettleOptions[];
  markers: { vehicleId: string; kind: CombatMarkerKind; label: string; slot?: number }[];
  makeCrater: (x: number, y: number, radius: number, depthFactor: number) => void;
  settleVehicles: (options: SettleOptions) => string[];
  addCombatMarker: (vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot?: number) => void;
}
