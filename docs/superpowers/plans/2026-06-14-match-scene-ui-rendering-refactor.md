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
- `src/match/ui/CommandDeck.ts`: Fixed HUD command deck drawing, active unit info, launch meter, movement meter, and aim dial.
- `src/match/rendering/TerrainRenderer.ts`: Terrain, void hazard, and map landmark drawing.
- `src/match/rendering/VehicleRenderer.ts`: Vehicle/character sprite synchronization, combat hull overlays, labels, and footing markers.
- `src/match/rendering/ProjectileRenderer.ts`: Projectile trail and projectile body drawing.
- `src/match/rendering/EffectsRenderer.ts`: Aim arrow, movement rail, impact preview, and combat markers.

## Task 1: Add Architecture Boundary Tests

**Files:**
- Create: `src/match/architecture.test.ts`

- [ ] **Step 1: Write failing tests for the planned module files**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/match/architecture.test.ts`
Expected: FAIL because the new module files do not exist and `src/main.ts` still owns `class GravityGridScene`.

## Task 2: Extract Match Scene And Runtime Types

**Files:**
- Create: `src/match/MatchScene.ts`
- Create: `src/match/MatchTypes.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Move scene-local types into `MatchTypes.ts`**

Move `VehicleState`, `ProjectileState`, `ProjectileCollision`, `VoidDropPresentationState`, `ImpactPreview`, `CombatMarker`, and `SettleOptions` from `src/main.ts`.

- [ ] **Step 2: Move `GravityGridScene` into `MatchScene.ts` and export it as `MatchScene`**

Keep method bodies identical except for import paths and class name.

- [ ] **Step 3: Replace `src/main.ts` with bootstrap-only code**

`src/main.ts` should import `MatchScene` and pass it as the Phaser scene.

- [ ] **Step 4: Run verification**

Run: `npx tsx --test src/match/architecture.test.ts`
Expected: PASS.

Run: `npm run build:client`
Expected: PASS.

## Task 3: Extract Camera Controller

**Files:**
- Create: `src/match/MatchCameraController.ts`
- Modify: `src/match/MatchScene.ts`
- Test: `src/match/architecture.test.ts`

- [ ] **Step 1: Add architecture assertion**

Assert that `MatchCameraController.ts` exports `MatchCameraController`.

- [ ] **Step 2: Move camera-only methods**

Move viewport/framing calculations out of the scene where practical:
`updateCameraViewport`, `playfieldHeight`, `frameBattlefield`, and projectile recenter helper logic.

- [ ] **Step 3: Run verification**

Run: `npm run build:client`
Expected: PASS.

## Task 4: Extract Command Deck UI

**Files:**
- Create: `src/match/ui/CommandDeck.ts`
- Modify: `src/match/MatchScene.ts`
- Test: `src/match/architecture.test.ts`

- [ ] **Step 1: Add architecture assertion**

Assert that `CommandDeck.ts` exports `CommandDeck`.

- [ ] **Step 2: Move command deck drawing**

Move `drawControlPanel`, `drawGlobalRoundStatus`, `drawHudBar`, `drawLaunchPowerMeter`, `drawMoveMeter`, `drawPanelAimDial`, and the command-deck text/image object wiring into `CommandDeck`.

- [ ] **Step 3: Keep Phaser object ownership explicit**

`CommandDeck` should receive a Phaser scene, graphics object, text objects, and portrait image through its constructor. It should not own combat truth.

- [ ] **Step 4: Run verification**

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
- Modify: `src/match/MatchScene.ts`
- Test: `src/match/architecture.test.ts`

- [ ] **Step 1: Add architecture assertions**

Assert each renderer file exports its renderer class.

- [ ] **Step 2: Move terrain rendering**

Move terrain, void hazard, and map landmark drawing into `TerrainRenderer`.

- [ ] **Step 3: Move projectile rendering**

Move projectile trail/body drawing into `ProjectileRenderer`.

- [ ] **Step 4: Move effects rendering**

Move aim arrow, movement rail, impact preview, and combat marker drawing into `EffectsRenderer`.

- [ ] **Step 5: Move vehicle rendering**

Move vehicle sprite synchronization, collision hull drawing, labels, HP bars, and footing marker drawing into `VehicleRenderer`.

- [ ] **Step 6: Run verification**

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

- [ ] **Step 1: Update TDD current extraction list and human editing map**

Describe the implemented `MatchScene`, `CommandDeck`, camera controller, and renderer files.

- [ ] **Step 2: Update version log**

Add one checkpoint line for the scene/UI/rendering refactor.

- [ ] **Step 3: Regenerate docs**

Run: `npm run docs:html`
Expected: generated HTML docs complete.

- [ ] **Step 4: Final quality gate**

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

## Self-Review

- Spec coverage: Covers the documented target files for scene, controller, UI, and rendering boundaries. It does not implement server-authoritative online combat; that remains a separate v1 milestone.
- Placeholder scan: No TBD/TODO placeholders. Each task names files, commands, and expected outcomes.
- Type consistency: Runtime types are centralized in `MatchTypes.ts`; renderers and UI consume scene state/data but do not own gameplay truth.
