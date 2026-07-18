import assert from "node:assert/strict";
import test from "node:test";
import { vehicleOverlayDrawKeysFor } from "./VehicleOverlayDrawPlan";

test("vehicleOverlayDrawKeysFor includes only visible overlay work", () => {
  assert.deepEqual(
    vehicleOverlayDrawKeysFor({
      showCombatHull: true,
      showHpBar: false,
    }),
    ["combatHull"],
  );

  assert.deepEqual(
    vehicleOverlayDrawKeysFor({
      showCombatHull: false,
      showHpBar: true,
    }),
    ["hpBar"],
  );
});
