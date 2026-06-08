import assert from "node:assert/strict";
import test from "node:test";
import { GAMEPLAY_REVIEWS, reviewForMapId } from "./mapGameplayReview.js";
import { MAPS } from "./maps.js";
import type { SeatId } from "./rules.js";

test("gameplay review covers Ringworks Basin and Bridgeworks only", () => {
  assert.deepEqual(
    GAMEPLAY_REVIEWS.map((review) => review.mapId),
    ["ring-basin", "bridgeworks"],
  );
});

test("gameplay review references real map seats and zones", () => {
  for (const review of GAMEPLAY_REVIEWS) {
    const map = MAPS.find((candidate) => candidate.id === review.mapId);
    assert.ok(map, `${review.mapId} exists in the map pool`);

    const seatIds = new Set(Object.keys(map.spawns) as SeatId[]);
    assert.equal(review.safeSpawnSeatIds.length, 4, `${review.mapId} marks every spawn as safe`);
    for (const seatId of review.safeSpawnSeatIds) {
      assert.ok(seatIds.has(seatId), `${review.mapId} safe spawn ${seatId} exists`);
    }

    assert.ok(review.dangerZones.length >= 2, `${review.mapId} has danger zones`);
    assert.ok(review.movementRoutes.length >= 2, `${review.mapId} has movement routes`);
    assert.ok(review.destructibleFocus.length >= 2, `${review.mapId} has destructible focus areas`);
    assert.ok(review.openingReads.length >= 2, `${review.mapId} has opening reads`);
    assert.ok(review.funFactors.length >= 2, `${review.mapId} explains why it could be fun`);
    assert.ok(review.riskNotes.length >= 2, `${review.mapId} records gameplay risks`);
  }
});

test("gameplay review lookup returns specific map reviews", () => {
  assert.equal(reviewForMapId("ring-basin")?.title, "Ringworks Basin Gameplay Review");
  assert.equal(reviewForMapId("bridgeworks")?.title, "Bridgeworks Gameplay Review");
  assert.equal(reviewForMapId("needlefield"), undefined);
});
