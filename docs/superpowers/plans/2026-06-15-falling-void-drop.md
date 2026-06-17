# Falling And Void Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make vehicle falling, sliding, and Void Dropped status match the visible gameplay rule: a vehicle becomes Void Dropped only after its vehicle collision hull touches the visible void zone.

**Architecture:** Keep terrain contact rules in shared gameplay code, and keep Phaser-specific presentation in match controllers/renderers. Vehicles can be grounded, sliding, or falling; sliding/falling vehicles are not controllable, but only a void contact changes HP/alive/defeat state.

**Tech Stack:** TypeScript, Node test runner, Phaser scene collaborators.

---

### Task 1: Shared Terrain Contact State

**Files:**
- Modify: `shared/gameplay/vehicleSettlement.ts`
- Modify: `shared/gameplay/vehicleSettlement.test.ts`

- [x] **Step 1: Write failing tests**

Add tests proving unsupported terrain returns `motion.kind === "falling"` without setting `voidDropped`, and steep supported terrain returns `motion.kind === "sliding"` with a downhill direction.

- [x] **Step 2: Run focused test**

Run: `npm test -- shared/gameplay/vehicleSettlement.test.ts`

Expected before implementation: tests fail because `motion` is missing and unsupported terrain immediately void-drops.

- [x] **Step 3: Implement contact classification**

Extend `VehicleSettlementResult` with an optional `motion` state. Return falling for unsupported/no-terrain footing, sliding for too-steep supported terrain, and grounded for stable terrain.

- [x] **Step 4: Run focused test**

Run: `npm test -- shared/gameplay/vehicleSettlement.test.ts`

Expected after implementation: all settlement tests pass.

### Task 2: Match Motion Resolution

**Files:**
- Modify: `src/match/MatchTypes.ts`
- Modify: `src/match/VehicleSettlementController.ts`
- Modify: `src/match/VehicleSettlementController.test.ts`
- Modify: `src/match/MatchScene.ts`

- [x] **Step 1: Write failing controller tests**

Add tests proving settlement starts falling without killing the vehicle, falling only void-drops after the visible void top is touched, and sliding can continue until stable ground is found.

- [x] **Step 2: Run focused test**

Run: `npm test -- src/match/VehicleSettlementController.test.ts`

Expected before implementation: tests fail because motion update does not exist.

- [x] **Step 3: Implement motion state and update loop**

Add `VehicleMotionState` to `VehicleState`. Add `updateVehicleMotion`/`hasActiveVehicleMotion` behavior to `VehicleSettlementController`. In `MatchScene`, update vehicle motion before turn input and wait for motion to resolve before advancing after a shot.

- [x] **Step 4: Run focused test**

Run: `npm test -- src/match/VehicleSettlementController.test.ts`

Expected after implementation: all controller tests pass.

### Task 3: Rendering And Documentation Polish

**Files:**
- Modify: `src/match/rendering/VehicleRenderer.ts`
- Modify: `src/match/rendering/VehicleOverlayRenderer.ts`
- Modify: `docs/VERSION_LOG.md`

- [x] **Step 1: Write/update tests if renderer contracts require it**

If existing render tests assert labels or vehicle state assumptions, update them to include falling/sliding labels.

- [x] **Step 2: Render falling/sliding readably**

Keep falling vehicles upright enough to understand, show `FALLING` or `SLIDING` as the state label, and continue drawing visible collision hulls while they are still alive.

- [x] **Step 3: Update version log**

Record the gameplay behavior change in `docs/VERSION_LOG.md`.

- [x] **Step 4: Verify**

Run:

```powershell
npm test
npm run docs:html
npm run build
```

Expected: test suite passes, docs regenerate, and the production build succeeds.
