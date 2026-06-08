import assert from "node:assert/strict";
import test from "node:test";
import {
  BATTLEFIELD_UNIT_SCALE,
  VOID_DROP_DISPLAY_Y,
  defeatPresentationFor,
  scaleBattlefieldCombatHull,
  scaleBattlefieldDisplay,
  scaleBattlefieldOffset,
} from "./combatPresentation";

test("battlefield unit display scale keeps large concept art map-readable", () => {
  const scaled = scaleBattlefieldDisplay({ width: 350, height: 233 });

  assert.equal(BATTLEFIELD_UNIT_SCALE, 0.68);
  assert.deepEqual(scaled, { width: 238, height: 158 });
  assert.ok(scaled.width <= 245, "concept unit should not cover a full terrain shelf");
});

test("battlefield combat hull scales with the visible gameplay unit", () => {
  const hull = scaleBattlefieldCombatHull({ offsetX: 0, offsetY: -65, radiusX: 150, radiusY: 91 });

  assert.deepEqual(hull, { offsetX: 0, offsetY: -44, radiusX: 102, radiusY: 62 });
});

test("battlefield offsets scale so smaller units stay grounded", () => {
  assert.equal(scaleBattlefieldOffset(28), 19);
  assert.equal(scaleBattlefieldOffset(-65), -44);
});

test("void dropped presentation is distinct from HP KO presentation", () => {
  const voidDropped = defeatPresentationFor("void");
  const ko = defeatPresentationFor("damage");

  assert.equal(voidDropped.label, "VOID DROPPED");
  assert.equal(voidDropped.y, VOID_DROP_DISPLAY_Y);
  assert.ok(voidDropped.alpha < ko.alpha, "void dropped units should read as non-active eye candy");
  assert.equal(ko.label, "KO");
  assert.equal(ko.y, undefined);
});
