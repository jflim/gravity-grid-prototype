import assert from "node:assert/strict";
import test from "node:test";
import {
  computeBattlefieldFrameLayout,
  computeCommandPanelLayout,
  shouldMountOnlineLobby,
  shouldShowCombatHulls,
} from "./demoLayout";

test("map-review demo hides the online room panel by default", () => {
  assert.equal(shouldMountOnlineLobby(""), false);
  assert.equal(shouldMountOnlineLobby("?runtimeAssets"), false);
});

test("online room panel can be enabled explicitly for multiplayer checks", () => {
  assert.equal(shouldMountOnlineLobby("?onlinePanel=1"), true);
  assert.equal(shouldMountOnlineLobby("?onlinePanel=true"), true);
});

test("map-review demo hides prototype combat hull overlays by default", () => {
  assert.equal(shouldShowCombatHulls(""), false);
  assert.equal(shouldShowCombatHulls("?runtimeAssets"), false);
  assert.equal(shouldShowCombatHulls("?combatHulls=1"), true);
});

test("command panel stays fully visible on a wide short viewport", () => {
  const layout = computeCommandPanelLayout({ width: 2048, height: 858 });

  assert.equal(layout.panelY, 654);
  assert.equal(layout.panelBottom, 818);
  assert.equal(layout.safeAreaBottom, 858);
  assert.ok(layout.playfieldHeight <= layout.panelY);
  assert.ok(layout.dockX > 0);
  assert.equal(layout.dockWidth, 1720);
});

test("battlefield framing keeps map scale consistent across common desktop widths", () => {
  const wide = computeBattlefieldFrameLayout({
    viewportWidth: 2048,
    playfieldHeight: 654,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });
  const standard = computeBattlefieldFrameLayout({
    viewportWidth: 1366,
    playfieldHeight: 604,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });

  assert.ok(Math.abs(wide.visibleWorldWidth - standard.visibleWorldWidth) < 1);
  assert.equal(Math.round(wide.visibleWorldWidth), 2960);
});
