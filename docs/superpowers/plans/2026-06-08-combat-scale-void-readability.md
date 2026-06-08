# Combat Scale And Void Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the playable map readable by shrinking battlefield units, clarifying the void, and separating HP KO from Void Dropped presentation.

**Architecture:** Add a small `src/combatPresentation.ts` helper for tested presentation rules, then wire `src/main.ts` to those rules. Keep this as readability/presentation work, not a new gameplay system or map redesign.

**Tech Stack:** TypeScript, Phaser, Node test runner, generated HTML docs.

---

### Task 1: Presentation Rules

**Files:**
- Create: `src/combatPresentation.ts`
- Create: `src/combatPresentation.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving that battlefield unit art scales down, combat hulls scale with the art, and Void Dropped has a distinct suspended presentation from HP KO.

- [ ] **Step 2: Verify the tests fail**

Run: `npx tsx --test src/combatPresentation.test.ts`

Expected: FAIL because `src/combatPresentation.ts` does not exist yet.

- [ ] **Step 3: Implement presentation helpers**

Implement `scaleBattlefieldDisplay`, `scaleBattlefieldCombatHull`, `scaleBattlefieldOffset`, and `defeatPresentationFor`.

- [ ] **Step 4: Verify focused tests pass**

Run: `npx tsx --test src/combatPresentation.test.ts`

Expected: PASS.

### Task 2: Wire Scene Rendering

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add defeat reason state**

Add `defeatReason?: "damage" | "void"` to `VehicleState`. Set `damage` for HP KOs and `void` for falls through terrain.

- [ ] **Step 2: Scale battlefield sprites and hulls**

Apply presentation helpers to concept display sizes, offsets, active frames, labels, HP bars, and combat hull collision/rendering.

- [ ] **Step 3: Clarify void dropped visuals**

Show Void Dropped units suspended at a consistent void display Y with lower alpha/tint and a `VOID DROPPED` label. Keep HP KOs collapsed on terrain with KO presentation.

- [ ] **Step 4: Add a subtle active contact cue**

Draw a small active-only contact line at the real movement footprint. This is removable if it feels too debug-like after playtesting.

### Task 3: Void Layer And Docs

**Files:**
- Modify: `src/main.ts`
- Modify: `README.md`
- Modify: `docs/BUILD_PLAN.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `docs/VERSION_LOG.md`

- [ ] **Step 1: Make void visually persistent**

Draw an obvious void danger band below terrain and make terrain platforms visually float above it.

- [ ] **Step 2: Update docs**

Record that the local demo now uses smaller battlefield units, distinct KO/Void Dropped presentation, and a clearer void layer.

- [ ] **Step 3: Regenerate docs and verify**

Run:

```powershell
npm run docs:html
npm run test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit**

Commit message:

```text
fix: improve combat scale and void readability
```
