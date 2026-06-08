# Combat Readability Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tiny anchor-only direct hits with visible unit combat hulls that match the larger pilot-plus-vehicle concept sprites.

**Architecture:** Add a small hull data model to `VehicleState`, compute oriented hull centers from each vehicle anchor, use ellipse collision for direct projectile hits, and draw hulls through the existing vehicle graphics layer. Keep splash damage unchanged for this slice.

**Tech Stack:** TypeScript, Phaser 3, Vite, current monolithic `src/main.ts` prototype.

---

### Task 1: Add Combat Hull Data And Debug Toggle

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add the hull types**

Add a `CombatHull` interface with `offsetX`, `offsetY`, `radiusX`, and `radiusY`. Add `combatHull: CombatHull` to `VehicleState`.

- [ ] **Step 2: Add default-on visibility state**

Add `private showCombatHulls = true;` to the scene and bind keyboard key `H` in `create()` to toggle it.

- [ ] **Step 3: Give Nova and Vesper hulls**

Set larger concept-preview-friendly hulls on both vehicles. Start around `radiusX: 150-170`, `radiusY: 86-98`, and tune by visual inspection.

### Task 2: Use Hulls For Direct Collision

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add a hull-center helper**

Add `combatHullCenter(vehicle)` so hull offsets mirror with facing using the existing `orientedOffset()` helper.

- [ ] **Step 2: Add ellipse hit test**

Add `projectileHitsCombatHull(x, y, vehicle)` that normalizes projectile point distance against hull radii and returns true when inside the ellipse.

- [ ] **Step 3: Replace direct-hit radius**

Change `findProjectileCollision()` so it uses the hull hit test instead of `Distance.Between(...) < DIRECT_HIT_RADIUS`.

### Task 3: Draw Hulls For Prototype Tuning

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Draw visible hulls**

In `drawVehicles()`, after sprite positioning, draw each alive vehicle hull when `showCombatHulls` is true. Use a faint fill and brighter outline. Active hull can be white; inactive hull can use the vehicle accent color.

- [ ] **Step 2: Keep hulls honest with slope**

For this prototype, draw hulls axis-aligned in screen/world space. Do not rotate them with terrain yet; readability is more important than perfect slope matching.

### Task 4: Verify

**Files:**
- Test: `src/main.ts`

- [ ] **Step 1: Run the build**

Run: `npm run build`

Expected: client and server TypeScript builds pass.

- [ ] **Step 2: Smoke-test endpoint**

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/ -TimeoutSec 5`

Expected: status `200` if the dev server is running.
