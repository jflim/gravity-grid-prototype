# MatchView Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract match presentation coordination from `src/match/MatchScene.ts` while preserving the current playable behavior.

**Architecture:** `MatchScene` remains the Phaser lifecycle and match-flow coordinator. `MatchView` is a pure presentation facade that receives match state and delegates to renderers/UI collaborators. `MatchViewFactory` owns Phaser-specific object construction so the facade can be unit tested in Node without loading Phaser.

**Tech Stack:** TypeScript, Phaser 3, Vite, Node test runner, existing match renderer/UI modules.

---

## Target File Responsibilities

- `src/match/MatchScene.ts`: Phaser lifecycle, input sampling, local match state, gameplay controller orchestration, turn/round/projectile/impact flow, and camera calls.
- `src/match/MatchView.ts`: Pure facade for background creation delegation, world/HUD draw coordination, combat-marker lifecycle forwarding, and collision-zone checked-state synchronization.
- `src/match/MatchViewFactory.ts`: Phaser construction boundary for graphics layers, text/image HUD targets, renderers, command deck, combat marker renderer, collision-zone toggle, and background collaborator.
- `src/match/MatchView.test.ts`: Node-safe public API tests using fake collaborators.
- `src/match/architecture.test.ts`: Boundary tests preventing renderer/UI construction and draw helper ownership from drifting back into `MatchScene`.
- `docs/TECHNICAL_DESIGN.md`: TDD module map and human editing map.
- `docs/VERSION_LOG.md`: Human-readable checkpoint entry.

## Task 1: Add Boundary Tests

**Files:**
- Modify: `src/match/architecture.test.ts`

- [x] **Step 1: Add expected files and exports**

```ts
"src/match/MatchView.ts",
"src/match/MatchViewFactory.ts",
```

```ts
["src/match/MatchView.ts", "export class MatchView"],
["src/match/MatchViewFactory.ts", "export function createMatchViewCollaborators"],
```

- [x] **Step 2: Guard the `MatchScene` boundary**

```ts
test("match scene delegates presentation object setup and drawing to MatchView", () => {
  const matchScene = readFileSync("src/match/MatchScene.ts", "utf8");

  assert.match(matchScene, /new MatchView/);
  assert.doesNotMatch(matchScene, /new TerrainRenderer/);
  assert.doesNotMatch(matchScene, /new VehicleRenderer/);
  assert.doesNotMatch(matchScene, /new ProjectileRenderer/);
  assert.doesNotMatch(matchScene, /new EffectsRenderer/);
  assert.doesNotMatch(matchScene, /new CombatMarkerRenderer/);
  assert.doesNotMatch(matchScene, /new CommandDeck/);
  assert.doesNotMatch(matchScene, /new CollisionZonesToggle/);
  assert.doesNotMatch(matchScene, /this\.add\.graphics\(/);
  assert.doesNotMatch(matchScene, /this\.add\.text\(/);
  assert.doesNotMatch(matchScene, /this\.add\.image\(/);
  assert.doesNotMatch(matchScene, /private drawTerrain/);
  assert.doesNotMatch(matchScene, /private drawAim/);
  assert.doesNotMatch(matchScene, /private drawImpactPreview/);
  assert.doesNotMatch(matchScene, /private drawVehicles/);
  assert.doesNotMatch(matchScene, /private drawProjectile/);
  assert.doesNotMatch(matchScene, /private drawHud/);
});
```

- [x] **Step 3: Verify the test failed before implementation**

Run: `npm test -- src/match/architecture.test.ts`

Expected initial result: FAIL because `MatchView` did not exist and `MatchScene` still owned renderer/UI construction.

## Task 2: Add Pure MatchView Facade

**Files:**
- Create: `src/match/MatchView.ts`
- Create: `src/match/MatchView.test.ts`

- [x] **Step 1: Add the facade API**

```ts
export interface MatchViewOptions {
  collaborators: MatchViewCollaborators;
  worldWidth: number;
  terrainStep: number;
  surfaceAt: (x: number) => number;
  isMovable: (vehicle: VehicleState) => boolean;
}

export class MatchView {
  createBackground(): void;
  update(deltaSeconds: number): void;
  clearCombatMarkers(): void;
  addCombatMarkerForVehicle(vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot?: number): void;
  setCollisionZonesVisible(visible: boolean): void;
  draw(state: MatchViewState): void;
}
```

- [x] **Step 2: Add Node-safe collaborator tests**

Use fake collaborators to assert draw order, terrain inputs, aim eligibility, command-deck active state, marker forwarding, collision-zone checked-state forwarding, and background delegation.

- [x] **Step 3: Run facade tests**

Run: `npm test -- src/match/MatchView.test.ts`

Expected final result: PASS.

## Task 3: Add Phaser MatchView Factory

**Files:**
- Create: `src/match/MatchViewFactory.ts`

- [x] **Step 1: Move Phaser construction into the factory**

The factory exports:

```ts
export interface MatchViewFactoryOptions {
  scene: Phaser.Scene;
  document: Document;
  mountTarget: HTMLElement;
  worldWidth: number;
  worldHeight: number;
  worldRenderHeight: number;
  projectileRadius: number;
  showCombatHulls: boolean;
  useUnitConceptPreview: boolean;
  useStyleReferenceBackground: boolean;
  moveMinX: number;
  moveMaxX: number;
  movePixelsPerUnit: number;
  impactPreviewSeconds: number;
  combatMarkerSeconds: number;
  surfaceAt: (x: number) => number;
  onCollisionZonesVisibleChange: (visible: boolean) => void;
}

export function createMatchViewCollaborators(options: MatchViewFactoryOptions): MatchViewCollaborators;
```

- [x] **Step 2: Preserve background layering**

Set background objects to explicit negative depths so the extraction does not depend on Phaser add order:

```ts
.setDepth(-100)
.setDepth(-99)
.setDepth(-98)
.setDepth(-97)
```

## Task 4: Wire MatchScene To MatchView

**Files:**
- Modify: `src/match/MatchScene.ts`

- [x] **Step 1: Replace renderer/UI imports and fields**

`MatchScene` imports only:

```ts
import { MatchView } from "./MatchView";
import { createMatchViewCollaborators } from "./MatchViewFactory";
```

The scene owns:

```ts
private matchView?: MatchView;
```

- [x] **Step 2: Replace presentation setup in `create()`**

```ts
this.matchView = new MatchView({
  collaborators: createMatchViewCollaborators({
    scene: this,
    document,
    mountTarget: document.body,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    worldRenderHeight: WORLD_RENDER_HEIGHT,
    projectileRadius: PROJECTILE_RADIUS,
    showCombatHulls: this.showCombatHulls,
    useUnitConceptPreview: USE_UNIT_CONCEPT_PREVIEW,
    useStyleReferenceBackground: USE_STYLE_REFERENCE_BACKGROUND,
    moveMinX: MOVE_MIN_X,
    moveMaxX: MOVE_MAX_X,
    movePixelsPerUnit: MOVE_PIXELS_PER_UNIT,
    impactPreviewSeconds: IMPACT_PREVIEW_SECONDS,
    combatMarkerSeconds: COMBAT_MARKER_SECONDS,
    surfaceAt: (x) => this.surfaceAt(x),
    onCollisionZonesVisibleChange: (visible) => this.setCollisionZonesVisible(visible),
  }),
  worldWidth: WORLD_WIDTH,
  terrainStep: TERRAIN_STEP,
  surfaceAt: (x) => this.surfaceAt(x),
  isMovable: (vehicle) => this.isMovable(vehicle),
});
this.matchView.createBackground();
```

- [x] **Step 3: Replace old draw helpers with one state handoff**

```ts
private drawWorld(): void {
  this.matchView?.draw({
    vehicles: this.vehicles,
    activeVehicle: this.activeVehicle(),
    projectile: this.projectile,
    impactPreview: this.impactPreview,
    currentMap: this.terrainController.currentMap,
    visibleVoidTopY: this.terrainController.visibleVoidTopY,
    visibleVoidBottomY: this.visibleVoidBottomY(),
    terrainPlatformBottomY: this.terrainPlatformBottomY(),
    terrainBreakthroughY: this.terrainBreakthroughY(),
    showCombatHulls: this.showCombatHulls,
    roundOver: this.roundOver,
    turnCommitted: this.turnController.isCommitted,
    charging: this.turnController.isCharging,
    charge: this.turnController.charge,
    turnTime: this.turnController.turnTime,
    cameraZoom: this.cameras.main.zoom,
    shotResult: this.shotResult,
    roundComplete: this.roundOver || this.aliveTeams().size <= 1 || Boolean(this.winningTeam()),
    windLabel: this.windLabel(),
  });
}
```

- [x] **Step 4: Verify line-count reduction**

Run: `(Get-Content src\match\MatchScene.ts).Count`

Expected final result: below 700 lines.

## Task 5: Update Documentation And Verify

**Files:**
- Modify: `docs/TECHNICAL_DESIGN.md`
- Modify: `docs/VERSION_LOG.md`
- Generated: HTML docs via `npm run docs:html`

- [x] **Step 1: Update TDD and version log**

Document `MatchView` as the pure facade and `MatchViewFactory` as the Phaser construction boundary.

- [ ] **Step 2: Regenerate HTML docs**

Run: `npm run docs:html`

Expected: generated HTML docs complete without errors.

- [ ] **Step 3: Run final verification**

Run:

```powershell
npm test
npm run verify:runtime-roster
npm run build
```

Expected: all pass.

## Self-Review

- Spec coverage: The plan implements the approved view-facade direction while keeping `MatchCameraController` separate and preserving gameplay ownership in `MatchScene`.
- Testability correction: The final implementation uses a separate `MatchViewFactory` because importing Phaser directly in a Node unit test pulls browser/WebGL assumptions into the test runner.
- Placeholder scan: No unresolved placeholder language. The plan includes exact files, API shape, verification commands, and expected results.
