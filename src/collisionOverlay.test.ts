import assert from "node:assert/strict";
import test from "node:test";
import { COLLISION_ZONE_OVERLAY_DEPTH, collisionZoneOverlayStyle } from "./collisionOverlay";

test("collision zone overlay renders in front of playable sprites but under labels", () => {
  assert.equal(COLLISION_ZONE_OVERLAY_DEPTH, 15);
});

test("collision zone overlay uses translucent hue so unit art remains visible", () => {
  const inactive = collisionZoneOverlayStyle(false, 0xffd166);
  const active = collisionZoneOverlayStyle(true, 0xffffff);

  assert.equal(inactive.fillColor, 0xffd166);
  assert.equal(active.fillColor, 0xffffff);
  assert.ok(inactive.fillAlpha > 0.08 && inactive.fillAlpha < 0.3);
  assert.ok(active.fillAlpha > inactive.fillAlpha && active.fillAlpha < 0.35);
  assert.ok(inactive.crossAlpha < inactive.lineAlpha);
});
