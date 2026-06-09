import assert from "node:assert/strict";
import test from "node:test";
import {
  DESIGN_VIEWPORT,
  GAMEPLAY_ASPECT_RATIO,
  MIN_SUPPORTED_VIEWPORT,
  MAX_PRESENTATION_VIEWPORT,
  computeBattlefieldFrameLayout,
  computeCameraWorldBounds,
  computeGameCanvasSize,
  computeCommandDeckElementLayout,
  computeCommandPanelLayout,
  computeUnitWorldOverlayLayout,
  computeWindHudLayout,
  getGameViewportSize,
  isSupportedGameViewport,
  readableWorldUiScale,
  shouldRecenterProjectileCamera,
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

test("map-review demo shows collision hull overlays by default", () => {
  assert.equal(shouldShowCombatHulls(""), true);
  assert.equal(shouldShowCombatHulls("?runtimeAssets"), true);
  assert.equal(shouldShowCombatHulls("?combatHulls=1"), true);
  assert.equal(shouldShowCombatHulls("?combatHulls=0"), false);
  assert.equal(shouldShowCombatHulls("?collisionZones=1"), true);
  assert.equal(shouldShowCombatHulls("?collisionZones=0"), false);
  assert.equal(shouldShowCombatHulls("?hulls=false"), false);
});

test("command panel stays fully visible on a wide short viewport", () => {
  const layout = computeCommandPanelLayout({ width: 2048, height: 858 });

  assert.equal(layout.panelY, 622);
  assert.equal(layout.panelBottom, 802);
  assert.equal(layout.safeAreaBottom, 858);
  assert.equal(layout.playfieldHeight, layout.panelY);
  assert.equal(layout.bottomMargin, 56);
  assert.ok(layout.dockX > 0);
  assert.equal(layout.dockWidth, 1720);
});

test("command panel stays fixed in screen space instead of following map anchors", () => {
  const layout = computeCommandPanelLayout({ width: 2048, height: 1152 });

  assert.equal(layout.panelY, 916);
  assert.equal(layout.panelBottom, 1096);
  assert.equal(layout.bottomMargin, 56);
  assert.equal(layout.safeAreaBottom, 1152);
  assert.equal(layout.playfieldHeight, layout.panelY);
  assert.equal(layout.dockX + layout.dockWidth / 2, 1024);
});

test("command panel never clips in supported viewport layouts", () => {
  const viewports = [
    MIN_SUPPORTED_VIEWPORT,
    DESIGN_VIEWPORT,
    { width: 2048, height: 858 },
    { width: 2048, height: 1152 },
    MAX_PRESENTATION_VIEWPORT,
  ];

  for (const viewport of viewports) {
    const layout = computeCommandPanelLayout(viewport);
    const label = `${viewport.width}x${viewport.height}`;

    assert.ok(layout.panelY >= 0, `${label}: panel top must stay inside viewport`);
    assert.ok(layout.panelBottom <= viewport.height, `${label}: panel bottom must stay inside viewport`);
    assert.equal(layout.playfieldHeight, layout.panelY, `${label}: playfield must end at command deck top`);
    assert.ok(layout.bottomMargin >= 0, `${label}: bottom margin must not go negative`);
    assert.ok(layout.safeAreaBottom <= viewport.height, `${label}: safe area must not exceed viewport`);
    assert.ok(layout.dockX >= 0, `${label}: dock left must stay inside viewport`);
    assert.ok(layout.dockX + layout.dockWidth <= viewport.width, `${label}: dock right must stay inside viewport`);
    assert.equal(layout.dockX + layout.dockWidth / 2, viewport.width / 2);
  }
});

test("command deck content scales with available dock width", () => {
  const minimum = computeCommandPanelLayout(MIN_SUPPORTED_VIEWPORT);
  const design = computeCommandPanelLayout(DESIGN_VIEWPORT);
  const wide = computeCommandPanelLayout({ width: 2048, height: 858 });

  assert.ok(minimum.contentScale < design.contentScale);
  assert.ok(design.contentScale < wide.contentScale);
  assert.equal(wide.contentScale, 1);
  assert.ok(minimum.contentScale > 0.7);
});

test("command deck children stay inside the visible panel at supported sizes", () => {
  const viewports = [
    MIN_SUPPORTED_VIEWPORT,
    DESIGN_VIEWPORT,
    { width: 2048, height: 858 },
    { width: 2048, height: 1152 },
    MAX_PRESENTATION_VIEWPORT,
  ];

  for (const viewport of viewports) {
    const panel = computeCommandPanelLayout(viewport);
    const deck = computeCommandDeckElementLayout(panel);
    const label = `${viewport.width}x${viewport.height}`;
    const bottomLimit = panel.panelBottom - deck.safePaddingBottom;
    const elementBottoms = [
      deck.portraitFrame.y + deck.portraitFrame.height,
      deck.moveMeter.y + deck.moveMeter.height,
      deck.launchMeter.y + deck.launchMeter.height,
      deck.aimPanel.y + deck.aimPanel.height,
    ];
    const elementRights = [
      deck.portraitFrame.x + deck.portraitFrame.width,
      deck.moveMeter.x + deck.moveMeter.width,
      deck.launchMeter.x + deck.launchMeter.width,
      deck.aimPanel.x + deck.aimPanel.width,
    ];

    for (const bottom of elementBottoms) {
      assert.ok(bottom <= bottomLimit, `${label}: command deck control must not clip below panel`);
    }

    for (const right of elementRights) {
      assert.ok(right <= panel.dockX + panel.dockWidth, `${label}: command deck control must not clip right`);
    }

    assert.ok(deck.titleFontSize >= 15, `${label}: title text remains readable`);
    assert.ok(deck.detailFontSize >= 10, `${label}: detail text remains readable`);
    assert.ok(deck.commandFontSize >= 12, `${label}: command text remains readable`);
  }
});

test("game viewport uses the smallest reliable visible browser size", () => {
  const viewport = getGameViewportSize(
    {
      innerWidth: 2048,
      innerHeight: 1134,
      visualViewport: { width: 2048, height: 1024 },
    },
    { clientWidth: 2048, clientHeight: 1024 },
  );

  assert.deepEqual(viewport, { width: 2048, height: 1024 });
  assert.equal(computeCommandPanelLayout(viewport).panelY, 788);
});

test("viewport contract defines a fixed desktop game standard", () => {
  assert.deepEqual(DESIGN_VIEWPORT, { width: 1600, height: 900 });
  assert.deepEqual(MIN_SUPPORTED_VIEWPORT, { width: 1366, height: 768 });
  assert.deepEqual(MAX_PRESENTATION_VIEWPORT, { width: 2400, height: 1350 });
  assert.equal(GAMEPLAY_ASPECT_RATIO, 16 / 9);
});

test("minimum supported viewport blocks windows that would fold the UI", () => {
  assert.equal(isSupportedGameViewport({ width: 1366, height: 768 }), true);
  assert.equal(isSupportedGameViewport({ width: 1365, height: 900 }), false);
  assert.equal(isSupportedGameViewport({ width: 1600, height: 767 }), false);
});

test("game canvas can grow beyond the design viewport for readability", () => {
  assert.deepEqual(computeGameCanvasSize({ width: 3440, height: 1440 }), MAX_PRESENTATION_VIEWPORT);
  assert.deepEqual(computeGameCanvasSize({ width: 2048, height: 858 }), { width: 2048, height: 858 });
  assert.deepEqual(computeGameCanvasSize({ width: 1366, height: 768 }), MIN_SUPPORTED_VIEWPORT);
});

test("world-space UI can counter camera zoom so labels stay readable", () => {
  assert.equal(readableWorldUiScale(1), 1);
  assert.equal(readableWorldUiScale(0.5), 2);
  assert.equal(readableWorldUiScale(0.25), 2.4);
});

test("unit world overlays stack above playable unit art", () => {
  const layout = computeUnitWorldOverlayLayout({
    useUnitConceptPreview: true,
    worldUiScale: 2,
  });

  assert.ok(layout.timerOffsetY > layout.teamBarOffsetY);
  assert.ok(layout.teamBarOffsetY > layout.nameOffsetY);
  assert.ok(layout.nameOffsetY > layout.classOffsetY);
  assert.ok(layout.classOffsetY >= 150);
  assert.ok(layout.timerBadgeHeight >= 80);
});

test("wind HUD occupies a top-safe fixed screen region", () => {
  const layout = computeWindHudLayout({ width: 2048, height: 858 });

  assert.equal(layout.x, 1024);
  assert.equal(layout.y, 24);
  assert.equal(layout.width, 244);
  assert.equal(layout.height, 54);
});

test("battlefield framing keeps map scale consistent across common desktop widths", () => {
  const wide = computeBattlefieldFrameLayout({
    viewportWidth: computeGameCanvasSize({ width: 2048, height: 858 }).width,
    playfieldHeight: computeCommandPanelLayout({ width: 2048, height: 858 }).playfieldHeight,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });
  const standard = computeBattlefieldFrameLayout({
    viewportWidth: 1366,
    playfieldHeight: computeCommandPanelLayout({ width: 1366, height: 768 }).playfieldHeight,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });

  assert.ok(Math.abs(wide.visibleWorldWidth - standard.visibleWorldWidth) < 1);
  assert.equal(Math.round(wide.visibleWorldWidth), 2960);
});

test("battlefield framing places the visible void bottom just above the command deck boundary", () => {
  const playfieldHeight = computeCommandPanelLayout({ width: 2048, height: 858 }).playfieldHeight;
  const visibleVoidBottomY = 1055;
  const frame = computeBattlefieldFrameLayout({
    viewportWidth: 2048,
    playfieldHeight,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
    frameBottomWorldY: visibleVoidBottomY,
  });
  const visibleWorldHeight = playfieldHeight / frame.zoom;
  const topWorldY = frame.centerY - visibleWorldHeight / 2;
  const voidBottomScreenY = (visibleVoidBottomY - topWorldY) * frame.zoom;

  assert.equal(Math.round(voidBottomScreenY), playfieldHeight - 12);
});

test("camera world bounds preserve centered battlefield when visible frame is wider than the world", () => {
  const frame = computeBattlefieldFrameLayout({
    viewportWidth: 2048,
    playfieldHeight: computeCommandPanelLayout({ width: 2048, height: 858 }).playfieldHeight,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });
  const bounds = computeCameraWorldBounds({
    worldWidth: 2400,
    visibleWorldWidth: frame.visibleWorldWidth,
  });

  assert.equal(Math.round(frame.visibleWorldWidth), 2960);
  assert.equal(Math.round(bounds.horizontalPadding), 280);
  assert.equal(Math.round(bounds.x), -280);
  assert.equal(Math.round(bounds.width), 2960);
});

test("camera world bounds do not add side margins when the world already fills the frame", () => {
  const bounds = computeCameraWorldBounds({
    worldWidth: 2400,
    visibleWorldWidth: 1800,
  });

  assert.deepEqual(bounds, {
    x: 0,
    width: 2400,
    horizontalPadding: 0,
  });
});

test("ultrawide browser windows do not expand the strategic battlefield view", () => {
  const ultrawideCanvas = computeGameCanvasSize({ width: 3440, height: 900 });
  const design = computeBattlefieldFrameLayout({
    viewportWidth: DESIGN_VIEWPORT.width,
    playfieldHeight: 696,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });
  const ultrawide = computeBattlefieldFrameLayout({
    viewportWidth: ultrawideCanvas.width,
    playfieldHeight: 696,
    worldWidth: 2400,
    aliveVehicleXs: [310, 710, 1690, 2090],
  });

  assert.equal(ultrawideCanvas.width, MAX_PRESENTATION_VIEWPORT.width);
  assert.equal(Math.round(ultrawide.visibleWorldWidth), Math.round(design.visibleWorldWidth));
});

test("projectile camera stays stable while a shot is readable in the battlefield frame", () => {
  const shouldRecenter = shouldRecenterProjectileCamera({
    projectile: { x: 1200, y: 420 },
    cameraCenter: { x: 1200, y: 470 },
    visibleWorldWidth: 2960,
    visibleWorldHeight: 760,
  });

  assert.equal(shouldRecenter, false);
});

test("projectile camera can recenter when a shot leaves the readable battlefield frame", () => {
  const shouldRecenter = shouldRecenterProjectileCamera({
    projectile: { x: 3000, y: 420 },
    cameraCenter: { x: 1200, y: 470 },
    visibleWorldWidth: 2960,
    visibleWorldHeight: 760,
  });

  assert.equal(shouldRecenter, true);
});
