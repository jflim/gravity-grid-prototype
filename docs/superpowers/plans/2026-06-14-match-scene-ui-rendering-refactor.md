# Match Scene UI Rendering Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current monolithic Phaser match prototype into human-readable scene, controller, UI, camera, and renderer modules without changing gameplay behavior.

**Architecture:** Keep deterministic gameplay truth in `shared/`. Move Phaser orchestration into `src/match/MatchScene.ts`, app startup into `src/main.ts`, command deck drawing into `src/match/ui/CommandDeck.ts`, camera framing into `src/match/MatchCameraController.ts`, and battlefield drawing helpers into focused renderer modules. Use small compatibility methods in `MatchScene` while extracting so the prototype remains playable after each slice.

**Tech Stack:** TypeScript, Phaser 3, Vite, Node test runner, existing shared gameplay modules.

---

## Target File Responsibilities

- `src/main.ts`: Browser bootstrap only. Owns Phaser game config, viewport guard, online lobby mount, and CSS import.
- `src/match/MatchScene.ts`: Phaser scene lifecycle and high-level match orchestration. Owns current local browser authority until online server authority replaces it.
- `src/match/MatchTypes.ts`: Scene-local runtime state shapes shared by match UI/rendering modules.
- `src/match/MatchCameraController.ts`: Camera viewport, battlefield framing, and projectile recenter decisions.
- `src/match/ImpactController.ts`: Local impact application for crater callback wiring, vehicle mutation, combat marker requests, settlement callback wiring, and shot-result text.
- `src/match/ProjectileController.ts`: Local projectile launch, flight stepping, trail tracking, swept collision lookup, and out-of-bounds orchestration.
- `src/match/RoundBuilder.ts`: Local round setup for terrain copy, spawn flattening, starting vehicle state, turn order, and round-start text.
- `src/match/VehicleGeometry.ts`: Facing-aware combat hull centers and projectile hit-zone conversion shared by scene collision and vehicle rendering.
- `src/match/VoidZoneController.ts`: Visible void-zone geometry and Void Dropped presentation timing.
- `src/match/ui/CommandDeck.ts`: Fixed HUD command deck drawing, active unit info, launch meter, movement meter, and aim dial.
- `src/match/rendering/TerrainRenderer.ts`: Terrain, void hazard, and map landmark drawing.
- `src/match/rendering/VehicleRenderer.ts`: Vehicle/character sprite synchronization, combat hull overlays, labels, and footing markers.
- `src/match/rendering/ProjectileRenderer.ts`: Projectile trail and projectile body drawing.
- `src/match/rendering/EffectsRenderer.ts`: Aim arrow, movement rail, and impact preview.
- `src/match/rendering/CombatMarkerRenderer.ts`: Floating direct/splash/shove/KO/Void Dropped text markers.

## Task 1: Add Architecture Boundary Tests

**Files:**
- Create: `src/match/architecture.test.ts`

- [x] **Step 1: Write failing tests for the planned module files**

```ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("match scene refactor exposes planned module boundaries", () => {
  const expectedFiles = [
    "src/match/MatchScene.ts",
    "src/match/MatchTypes.ts",
    "src/match/MatchCameraController.ts",
    "src/match/ui/CommandDeck.ts",
    "src/match/rendering/TerrainRenderer.ts",
    "src/match/rendering/VehicleRenderer.ts",
    "src/match/rendering/ProjectileRenderer.ts",
    "src/match/rendering/EffectsRenderer.ts",
    "src/match/rendering/CombatMarkerRenderer.ts",
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `${file} should exist`);
  }
});

test("main.ts stays a bootstrap instead of owning the Phaser scene", () => {
  const main = readFileSync("src/main.ts", "utf8");
  assert.match(main, /new Phaser\.Game/);
  assert.doesNotMatch(main, /class GravityGridScene/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/match/architecture.test.ts`
Expected: FAIL because the new module files do not exist and `src/main.ts` still owns `class GravityGridScene`.

## Task 2: Extract Match Scene And Runtime Types

**Files:**
- Create: `src/match/MatchScene.ts`
- Create: `src/match/MatchTypes.ts`
- Modify: `src/main.ts`

- [x] **Step 1: Move scene-local types into `MatchTypes.ts`**

Move `VehicleState`, `ProjectileState`, `ProjectileCollision`, `VoidDropPresentationState`, `ImpactPreview`, `CombatMarker`, and `SettleOptions` from `src/main.ts`.

- [x] **Step 2: Move `GravityGridScene` into `MatchScene.ts` and export it as `MatchScene`**

Keep method bodies identical except for import paths and class name.

- [x] **Step 3: Replace `src/main.ts` with bootstrap-only code**

`src/main.ts` should import `MatchScene` and pass it as the Phaser scene.

- [x] **Step 4: Run verification**

Run: `npx tsx --test src/match/architecture.test.ts`
Expected: PASS.

Run: `npm run build:client`
Expected: PASS.

## Task 3: Extract Camera Controller

**Files:**
- Create: `src/match/MatchCameraController.ts`
- Modify: `src/match/MatchScene.ts`
- Test: `src/match/architecture.test.ts`

- [x] **Step 1: Add architecture assertion**

Assert that `MatchCameraController.ts` exports `MatchCameraController`.

- [x] **Step 2: Move camera-only methods**

Move viewport/framing calculations out of the scene where practical:
`updateCameraViewport`, `playfieldHeight`, `frameBattlefield`, and projectile recenter helper logic.

- [x] **Step 3: Run verification**

Run: `npm run build:client`
Expected: PASS.

## Task 4: Extract Command Deck UI

**Files:**
- Create: `src/match/ui/CommandDeck.ts`
- Modify: `src/match/MatchScene.ts`
- Test: `src/match/architecture.test.ts`

- [x] **Step 1: Add architecture assertion**

Assert that `CommandDeck.ts` exports `CommandDeck`.

- [x] **Step 2: Move command deck drawing**

Move `drawControlPanel`, `drawGlobalRoundStatus`, `drawHudBar`, `drawLaunchPowerMeter`, `drawMoveMeter`, `drawPanelAimDial`, and the command-deck text/image object wiring into `CommandDeck`.

- [x] **Step 3: Keep Phaser object ownership explicit**

`CommandDeck` should receive a Phaser scene, graphics object, text objects, and portrait image through its constructor. It should not own combat truth.

- [x] **Step 4: Run verification**

Run: `npm test`
Expected: PASS.

Run: `npm run build:client`
Expected: PASS.

## Task 5: Extract Renderer Modules

**Files:**
- Create: `src/match/rendering/TerrainRenderer.ts`
- Create: `src/match/rendering/VehicleRenderer.ts`
- Create: `src/match/rendering/ProjectileRenderer.ts`
- Create: `src/match/rendering/EffectsRenderer.ts`
- Create: `src/match/rendering/CombatMarkerRenderer.ts`
- Modify: `src/match/MatchScene.ts`
- Test: `src/match/architecture.test.ts`

- [x] **Step 1: Add architecture assertions**

Assert each renderer file exports its renderer class.

- [x] **Step 2: Move terrain rendering**

Move terrain, void hazard, and map landmark drawing into `TerrainRenderer`.

- [x] **Step 3: Move projectile rendering**

Move projectile trail/body drawing into `ProjectileRenderer`.

- [x] **Step 4: Move effects rendering**

Move aim arrow, movement rail, and impact preview drawing into `EffectsRenderer`.

- [x] **Step 4a: Move combat marker rendering**

Move floating direct/splash/shove/KO/Void Dropped marker drawing and lifecycle into `CombatMarkerRenderer`.

- [x] **Step 5: Move vehicle rendering**

Move vehicle sprite synchronization, collision hull drawing, labels, HP bars, and footing marker drawing into `VehicleRenderer`.

- [x] **Step 6: Run verification**

Run: `npm test`
Expected: PASS.

Run: `npm run verify:runtime-roster`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

## Task 6: Update Documentation And Commit

**Files:**
- Modify: `docs/TECHNICAL_DESIGN.md`
- Modify: `docs/VERSION_LOG.md`
- Generated: HTML docs via `npm run docs:html`

- [x] **Step 1: Update TDD current extraction list and human editing map**

Describe the implemented `MatchScene`, `CommandDeck`, camera controller, and renderer files.

- [x] **Step 2: Update version log**

Add one checkpoint line for the scene/UI/rendering refactor.

- [x] **Step 3: Regenerate docs**

Run: `npm run docs:html`
Expected: generated HTML docs complete.

- [x] **Step 4: Final quality gate**

Run: `npm test`
Expected: PASS.

Run: `npm run verify:runtime-roster`
Expected: PASS.

Run: `npm run build`
Expected: PASS with only the existing Vite large-chunk warning.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "refactor: split match scene ui and renderers"
```

## Task 7: Extract Void Zone Controller

**Files:**
- Create: `src/match/VoidZoneController.ts`
- Create: `src/match/VoidZoneController.test.ts`
- Modify: `src/match/MatchScene.ts`
- Modify: `src/match/architecture.test.ts`

- [x] **Step 1: Add failing tests for the controller boundary**

Assert that the controller creates readable Void Dropped presentation targets, exposes visible void-zone bounds, and advances presentation age without overshooting.

- [x] **Step 2: Move void-zone presentation coordination out of `MatchScene`**

Move visible void bottom, terrain breakthrough padding, Void Dropped target position, nearest readable void-run selection, and Void Dropped presentation ticking into `VoidZoneController`.

- [x] **Step 3: Run focused verification**

Run: `npm test -- src/match/VoidZoneController.test.ts src/match/architecture.test.ts`
Expected: PASS.

## Task 8: Extract Round Builder

**Files:**
- Create: `src/match/RoundBuilder.ts`
- Create: `src/match/RoundBuilder.test.ts`
- Modify: `src/match/MatchScene.ts`
- Modify: `src/match/architecture.test.ts`

- [x] **Step 1: Add failing tests for the round setup boundary**

Assert that the builder creates deterministic starting vehicles and turn order from map spawns, flattens spawn terrain without mutating source terrain, and reports a useful missing-spawn error.

- [x] **Step 2: Move local round setup out of `MatchScene`**

Move terrain copying, spawn flattening, starting vehicle state creation, visible void top calculation, starting turn order, and round-start text into `RoundBuilder`.

- [x] **Step 3: Run focused verification**

Run: `npm test -- src/match/RoundBuilder.test.ts src/match/architecture.test.ts`
Expected: PASS.

## Task 9: Extract Vehicle Geometry

**Files:**
- Create: `src/match/VehicleGeometry.ts`
- Create: `src/match/VehicleGeometry.test.ts`
- Modify: `src/match/MatchScene.ts`
- Modify: `src/match/rendering/VehicleRenderer.ts`
- Modify: `src/match/architecture.test.ts`

- [x] **Step 1: Add failing tests for shared vehicle geometry**

Assert that facing-aware combat hull centers mirror offsets correctly and that combat hulls convert into projectile hit zones.

- [x] **Step 2: Move duplicated hull math into `VehicleGeometry`**

Move oriented offsets, scaled combat hull lookup, combat hull center, and projectile hit-zone conversion into `VehicleGeometry`. Use it from both `MatchScene` collision checks and `VehicleRenderer` combat hull overlays.

- [x] **Step 3: Run focused verification**

Run: `npm test -- src/match/VehicleGeometry.test.ts src/match/architecture.test.ts`
Expected: PASS.

## Task 10: Extract Projectile Controller

**Files:**
- Create: `src/match/ProjectileController.ts`
- Create: `src/match/ProjectileController.test.ts`
- Modify: `src/match/MatchScene.ts`
- Modify: `src/match/MatchTypes.ts`
- Modify: `src/match/architecture.test.ts`

- [x] **Step 1: Add failing tests for projectile orchestration**

Assert that the controller creates launched projectiles with shooter context, advances in-flight shots while recording trail points, reports enemy vehicle collisions before terrain, reports terrain collisions, and reports out-of-bounds shots.

- [x] **Step 2: Move projectile orchestration out of `MatchScene`**

Move launch creation, trail bookkeeping, wind/gravity stepping, swept collision lookup, and out-of-bounds checks into `ProjectileController`. Keep impact application in `MatchScene` for the next extraction because it still mutates terrain, vehicles, combat markers, and round flow.

- [x] **Step 3: Run focused verification**

Run: `npm test -- src/match/ProjectileController.test.ts src/match/architecture.test.ts`
Expected: PASS.

## Task 11: Extract Impact Controller

**Files:**
- Create: `src/match/ImpactController.ts`
- Create: `src/match/ImpactController.test.ts`
- Modify: `src/match/MatchScene.ts`
- Modify: `src/match/architecture.test.ts`

- [x] **Step 1: Add failing tests for impact orchestration**

Assert that the controller applies direct damage, craters terrain, requests combat markers, calls settlement, emits KO and Void Dropped markers, reports bunger knockback, and returns shot-result text.

- [x] **Step 2: Move impact application out of `MatchScene`**

Move crater callback wiring, vehicle damage/knockback mutation, combat marker requests, settlement callback wiring, impact preview creation, and shot-result text construction into `ImpactController`. Keep round flow, drawing, and winner/turn scheduling in `MatchScene`.

- [x] **Step 3: Run focused verification**

Run: `npm test -- src/match/ImpactController.test.ts src/match/architecture.test.ts`
Expected: PASS.

## Self-Review

- Spec coverage: Covers the documented target files for scene, controller, UI, and rendering boundaries. It does not implement server-authoritative online combat; that remains a separate v1 milestone.
- Placeholder scan: No TBD/TODO placeholders. Each task names files, commands, and expected outcomes.
- Type consistency: Runtime types are centralized in `MatchTypes.ts`; renderers and UI consume scene state/data but do not own gameplay truth.
