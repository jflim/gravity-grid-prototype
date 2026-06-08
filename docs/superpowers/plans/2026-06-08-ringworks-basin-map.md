# Ringworks Basin Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the default `ring-basin` demo map into Ringworks Basin, a B+C hybrid map with weapon-readable terrain and novel ring/bridge structure.

**Architecture:** Keep the existing v1 map contract and heightmap conversion pipeline. Update `server/v1/maps.ts` as the source of truth, use tests in `server/v1/maps.test.ts` and `src/playableMaps.test.ts` to lock the shape, then regenerate generated HTML docs.

**Tech Stack:** TypeScript, Node test runner, Phaser heightmap terrain, generated static HTML docs.

---

### Task 1: Lock The New Map Shape In Tests

**Files:**
- Modify: `server/v1/maps.test.ts`
- Modify: `src/playableMaps.test.ts`

- [ ] **Step 1: Update map-pool name expectations**

Change the ring map display name expectation from `Ring Basin` to `Ringworks Basin` while keeping the id `ring-basin`.

- [ ] **Step 2: Replace the old center-chasm assertions**

In `src/playableMaps.test.ts`, assert that `surfaceAt(playable, 960)` and `surfaceAt(playable, 1500)` are void, while `surfaceAt(playable, 1200)` is playable land above the death plane.

- [ ] **Step 3: Add weapon-readable side terrain assertions**

In `src/playableMaps.test.ts`, assert that the red and blue high lips are at least 90 px above their lower bowls:

```ts
assert.ok(surfaceAt(playable, 520) - surfaceAt(playable, 705) >= 90);
assert.ok(surfaceAt(playable, 1880) - surfaceAt(playable, 1750) >= 90);
```

- [ ] **Step 4: Run focused tests to verify failure**

Run: `npx tsx --test server/v1/maps.test.ts src/playableMaps.test.ts`

Expected: FAIL because the current map still names Ring Basin and has empty air at `x=1200`.

### Task 2: Update Ringworks Basin Geometry

**Files:**
- Modify: `server/v1/maps.ts`
- Modify: `server/v1/mapGameplayReview.ts`
- Modify: `server/v1/mapGameplayReview.test.ts`

- [ ] **Step 1: Update `ring-basin` display metadata**

Set the map name to `Ringworks Basin`, summary to `broken ring bridge over canyon bowls`, and tactical role to `weapon-readable ring bridge playground`.

- [ ] **Step 2: Replace `ring-basin` preview segments**

Use three spans: left side, center ring bridge/island, and right side. Keep side gaps around the center at least 300 px wide.

- [ ] **Step 3: Update spawns**

Place `red-1` and `blue-1` in lower side bowls and `red-2` and `blue-2` on higher side lips, close to their corresponding terrain surfaces.

- [ ] **Step 4: Update landmarks**

Use ring, bridge, and shelf landmarks to communicate the central ring bridge, side bowls, high lips, and weapon-relevant destructible points.

- [ ] **Step 5: Update gameplay review notes**

Rename the ring review to `Ringworks Basin Gameplay Review` and describe the bridge/island, side void gaps, high lips, and weapon reads.

- [ ] **Step 6: Run focused tests**

Run: `npx tsx --test server/v1/maps.test.ts src/playableMaps.test.ts server/v1/mapGameplayReview.test.ts`

Expected: PASS.

### Task 3: Regenerate Docs And Verify

**Files:**
- Generated: `docs/V1_MAP_PREVIEWS.html`
- Generated: `docs/V1_MAP_GAMEPLAY_REVIEW.html`
- Generated: markdown reading copies affected by `npm run docs:html`
- Modify: `README.md`
- Modify: `docs/BUILD_PLAN.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `docs/VERSION_LOG.md`

- [ ] **Step 1: Update human docs**

Replace default-demo references to Ring Basin with Ringworks Basin where they describe the current playable default.

- [ ] **Step 2: Regenerate HTML docs**

Run: `npm run docs:html`

Expected: generated docs complete without errors.

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm run test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit**

Stage the design spec, implementation plan, source changes, tests, markdown docs, and generated HTML docs.

Commit message:

```text
tune: build Ringworks Basin map pass
```
