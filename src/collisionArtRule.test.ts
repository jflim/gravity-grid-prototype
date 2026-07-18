import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCollisionArtRule } from "./collisionArtRule";
import { SHARED_V1_VEHICLE_HIT_ZONE, V1_COLLISION_ART_REVIEWS } from "./v1CollisionProfiles";

test("all v1 unit collision art profiles pass the vehicle-only readability rule", () => {
  for (const profile of V1_COLLISION_ART_REVIEWS) {
    const result = evaluateCollisionArtRule(profile);
    assert.equal(result.pass, true, `${profile.unitId}: ${result.reasons.join("; ")}`);
  }
});

test("v1 unit collision profiles use one shared vehicle-only hit zone", () => {
  for (const profile of V1_COLLISION_ART_REVIEWS) {
    assert.deepEqual(profile.hitZone, SHARED_V1_VEHICLE_HIT_ZONE, `${profile.unitId} must not get a custom hitbox`);
  }
});

test("standing pilot art fails without an explicit protection cue", () => {
  const result = evaluateCollisionArtRule({
    unitId: "probe",
    display: { width: 350, height: 233 },
    hitZone: SHARED_V1_VEHICLE_HIT_ZONE,
    pilotPose: "standing",
    notes: "pilot stands above the chassis",
  });

  assert.equal(result.pass, false);
  assert.ok(result.reasons.some((reason) => reason.includes("protection cue")));
});

test("oversized unit art fails collision readability review", () => {
  const result = evaluateCollisionArtRule({
    unitId: "probe",
    display: { width: 520, height: 310 },
    hitZone: SHARED_V1_VEHICLE_HIT_ZONE,
    pilotPose: "seated",
    protectionCue: "cockpit",
    notes: "oversized unit probe",
  });

  assert.equal(result.pass, false);
  assert.ok(result.reasons.some((reason) => reason.includes("too large")));
});
