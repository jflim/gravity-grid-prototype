import assert from "node:assert/strict";
import test from "node:test";
import { resolveProjectileImpact, type ProjectileImpactTuning } from "./impact.js";

const tuning: ProjectileImpactTuning = {
  craterRadius: 52,
  bungerCraterRadius: 82,
  damageRadius: 78,
  bungerDamageRadius: 92,
  bungerKnockback: 82,
  moveMinX: -72,
  moveMaxX: 2472,
};

test("impact resolver applies direct damage to enemies and blocks allied friendly fire", () => {
  const result = resolveProjectileImpact({
    x: 100,
    y: 100,
    directHitId: "blue-1",
    shooter: { id: "red-1", team: "red", classId: "spark" },
    vehicles: [
      {
        id: "blue-1",
        username: "Vesper",
        team: "blue",
        alive: true,
        hp: 100,
        x: 120,
        hitZone: { centerX: 120, centerY: 100, width: 20, height: 20 },
      },
      {
        id: "red-2",
        username: "Kaelii",
        team: "red",
        alive: true,
        hp: 100,
        x: 108,
        hitZone: { centerX: 108, centerY: 100, width: 20, height: 20 },
      },
    ],
    tuning,
  });

  assert.equal(result.isBungerShot, false);
  assert.equal(result.craterRadius, 52);
  assert.equal(result.damageRadius, 78);
  assert.equal(result.craterDepthFactor, 0.68);
  assert.deepEqual(result.damageEvents, [
    {
      vehicleId: "blue-1",
      username: "Vesper",
      hitKind: "direct",
      damage: 34,
      hpBefore: 100,
      hpAfter: 66,
      defeated: false,
    },
  ]);
  assert.deepEqual(result.vehicleUpdates, [{ vehicleId: "blue-1", hp: 66, alive: true, x: 120 }]);
  assert.deepEqual(result.affectedVehicleIds, ["blue-1"]);
});

test("impact resolver allows self-damage from splash while blocking teammates", () => {
  const result = resolveProjectileImpact({
    x: 100,
    y: 100,
    shooter: { id: "red-1", team: "red", classId: "spark" },
    vehicles: [
      {
        id: "red-1",
        username: "Nova",
        team: "red",
        alive: true,
        hp: 100,
        x: 100,
        hitZone: { centerX: 100, centerY: 100, width: 20, height: 20 },
      },
      {
        id: "red-2",
        username: "Kaelii",
        team: "red",
        alive: true,
        hp: 100,
        x: 104,
        hitZone: { centerX: 104, centerY: 100, width: 20, height: 20 },
      },
    ],
    tuning,
  });

  assert.deepEqual(
    result.damageEvents.map((event) => event.vehicleId),
    ["red-1"],
  );
  assert.equal(result.damageEvents[0]?.damage, 34);
  assert.deepEqual(result.vehicleUpdates, [{ vehicleId: "red-1", hp: 66, alive: true, x: 100 }]);
});

test("bunger impact uses larger terrain tuning and knocks alive targets away", () => {
  const result = resolveProjectileImpact({
    x: 100,
    y: 100,
    directHitId: "blue-1",
    shooter: { id: "red-1", team: "red", classId: "bunger" },
    vehicles: [
      {
        id: "blue-1",
        username: "Vesper",
        team: "blue",
        alive: true,
        hp: 100,
        x: 120,
        hitZone: { centerX: 120, centerY: 100, width: 20, height: 20 },
      },
    ],
    tuning,
  });

  assert.equal(result.isBungerShot, true);
  assert.equal(result.craterRadius, 82);
  assert.equal(result.damageRadius, 92);
  assert.equal(result.craterDepthFactor, 1.3);
  assert.equal(result.changedRadius, 92);
  assert.equal(result.damageEvents[0]?.damage, 22);
  assert.equal(result.damageEvents[0]?.hitKind, "direct");
  assert.equal(Math.round(result.knockbackEvents[0]?.toX ?? 0), 193);
  assert.deepEqual(result.vehicleUpdates, [{ vehicleId: "blue-1", hp: 78, alive: true, x: result.knockbackEvents[0]?.toX }]);
  assert.deepEqual(result.affectedVehicleIds, ["blue-1"]);
});
