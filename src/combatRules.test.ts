import assert from "node:assert/strict";
import test from "node:test";
import { shouldApplyWeaponEffect } from "./combatRules";

test("weapon effects allow self-damage while blocking allied friendly fire", () => {
  assert.equal(
    shouldApplyWeaponEffect({
      shooterId: "red-1",
      shooterTeam: "red",
      targetId: "red-1",
      targetTeam: "red",
    }),
    true,
  );
  assert.equal(
    shouldApplyWeaponEffect({
      shooterId: "red-1",
      shooterTeam: "red",
      targetId: "red-2",
      targetTeam: "red",
    }),
    false,
  );
  assert.equal(
    shouldApplyWeaponEffect({
      shooterId: "red-1",
      shooterTeam: "red",
      targetId: "blue-1",
      targetTeam: "blue",
    }),
    true,
  );
});
