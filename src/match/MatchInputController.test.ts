import assert from "node:assert/strict";
import test from "node:test";
import { readMatchInputSnapshot, type KeyboardKeyLike } from "./MatchInputController.js";

function key(isDown: boolean): KeyboardKeyLike {
  return { isDown };
}

test("match input snapshot reads combat movement, aim, charge, and one-shot commands", () => {
  const resetKey = key(true);
  const hullToggleKey = key(true);

  const snapshot = readMatchInputSnapshot({
    cursors: {
      up: key(true),
      down: key(false),
      left: key(true),
      right: key(false),
    },
    spaceKey: key(true),
    resetKey,
    hullToggleKey,
    justDown: (candidate) => candidate === resetKey,
  });

  assert.deepEqual(snapshot, {
    aimUp: true,
    aimDown: false,
    moveLeft: true,
    moveRight: false,
    chargeHeld: true,
    resetPressed: true,
    collisionZonesTogglePressed: false,
  });
});
