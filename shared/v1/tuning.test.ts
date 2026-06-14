import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ELEVATION_DEG,
  MAX_HP,
  MAX_POWER,
  MIN_ELEVATION_DEG,
  SETTLEMENT_MAX_SLOPE_ITERATIONS,
  SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  SETTLEMENT_SLOPE_STEP,
  SETTLEMENT_SLOPE_THRESHOLD,
  TERRAIN_CHANGE_SETTLE_PADDING,
  TURN_SECONDS,
  V1_WORLD_HEIGHT,
  V1_WORLD_WIDTH,
} from "./tuning.js";

test("v1 tuning exports the current local match scale and turn constants", () => {
  assert.equal(TURN_SECONDS, 20);
  assert.equal(V1_WORLD_WIDTH, 2400);
  assert.equal(V1_WORLD_HEIGHT, 900);
  assert.equal(MAX_HP, 100);
  assert.equal(MAX_POWER, 100);
});

test("v1 tuning names the current vehicle settlement constants", () => {
  assert.equal(TERRAIN_CHANGE_SETTLE_PADDING, 42);
  assert.equal(SETTLEMENT_SLOPE_SAMPLE_DISTANCE, 18);
  assert.equal(SETTLEMENT_SLOPE_THRESHOLD, 18);
  assert.equal(SETTLEMENT_SLOPE_STEP, 7);
  assert.equal(SETTLEMENT_MAX_SLOPE_ITERATIONS, 14);
});

test("v1 aiming tuning keeps a broad upper artillery arc", () => {
  assert.equal(MIN_ELEVATION_DEG, 5);
  assert.equal(MAX_ELEVATION_DEG, 90);
  assert.ok(MAX_ELEVATION_DEG > MIN_ELEVATION_DEG);
});
