import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseVoidDropDisplayX,
  requiredVoidZoneHeight,
  voidDropRenderPosition,
} from "./voidDropPresentation";
import { scaleBattlefieldDisplay } from "./combatPresentation";

test("void drop display stays near the fall column inside a wide gap", () => {
  const displayX = chooseVoidDropDisplayX({
    startX: 900,
    worldWidth: 2400,
    step: 4,
    displayWidth: 238,
    padding: 24,
    isVoidAt: (x) => x >= 740 && x <= 1100,
  });

  assert.equal(displayX, 900);
});

test("void drop display clamps only enough to keep the sprite inside the gap", () => {
  const displayX = chooseVoidDropDisplayX({
    startX: 750,
    worldWidth: 2400,
    step: 4,
    displayWidth: 238,
    padding: 24,
    isVoidAt: (x) => x >= 740 && x <= 1100,
  });

  assert.equal(displayX, 883);
});

test("visible void zone is at least one and a half unit heights tall", () => {
  const scaledKo = scaleBattlefieldDisplay({ width: 354, height: 212 });
  const height = requiredVoidZoneHeight(scaledKo);

  assert.ok(height >= scaledKo.height * 1.5);
  assert.equal(height, 240);
});

test("void drop render uses a slow-start fall animation", () => {
  const position = voidDropRenderPosition({
    fromX: 760,
    fromY: 584,
    targetX: 883,
    targetY: 828,
    age: 0.425,
    duration: 0.85,
  });

  assert.ok(Math.abs(position.x - 790.75) < 0.01);
  assert.ok(Math.abs(position.y - 645) < 0.01);
});
