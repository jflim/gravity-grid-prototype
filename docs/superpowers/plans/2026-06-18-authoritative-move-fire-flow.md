# Authoritative Move And Fire Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first server-authoritative movement/fire contract for online play: server-owned movement position, server fire origin, and published shot-result metadata.

**Architecture:** Extend the existing Colyseus room state and turn-intent gate instead of creating a parallel networking path. `server/rooms/turnAuthority.ts` continues to validate active-owner turn intents; `server/rooms/combatPreview.ts` applies the first authoritative movement/fire effects until the full Phaser online combat loop consumes the same contract.

**Tech Stack:** TypeScript, Colyseus schema, Node test runner, existing shared gameplay helpers in `shared/gameplay`.

---

### Task 1: Extend Server State Contract

**Files:**
- Modify: `server/schema/GravityCanyonState.ts`
- Test: `server/schema/GravityCanyonState.test.ts` if needed; otherwise existing room tests cover schema fields.

- [ ] **Step 1: Add failing assertions**

Add expectations in `server/rooms/combatPreview.test.ts` that a created preview vehicle has `moveUnits`, and that firing records `lastShotOriginX`, `lastShotOriginY`, `lastShotPower`, and `lastShotTargetVehicleId`.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node_modules\.bin\tsx.cmd --test server\rooms\combatPreview.test.ts`

Expected: failure because `moveUnits` and `lastShot*` fields do not exist or stay at defaults.

- [ ] **Step 3: Add schema fields**

Add `moveUnits` to `CombatVehicleState`.

Add flat `lastShot*` fields to `GravityCanyonState`:

```ts
lastShotId: string;
lastShotShooterVehicleId: string;
lastShotShooterSessionId: string;
lastShotOriginX: number;
lastShotOriginY: number;
lastShotAngle: number;
lastShotPower: number;
lastShotFacing: number;
lastShotTargetVehicleId: string;
lastShotDamage: number;
lastShotTargetHpBefore: number;
lastShotTargetHpAfter: number;
lastShotTurnNumber: number;
lastShotTurnAuthorityVersion: number;
lastShotServerTimeMs: number;
```

- [ ] **Step 4: Run focused tests**

Run: `node_modules\.bin\tsx.cmd --test server\rooms\combatPreview.test.ts`

Expected: tests advance to implementation failures in combat preview logic.

### Task 2: Validate And Apply Move/Fire Intents

**Files:**
- Modify: `server/rooms/turnAuthority.ts`
- Modify: `server/rooms/combatPreview.ts`
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Test: `server/rooms/turnAuthority.test.ts`
- Test: `server/rooms/combatPreview.test.ts`
- Test: `server/rooms/GravityCanyonRoom.integration.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:

- `submitTurnIntent(action="move")` only works for the active owner.
- Movement updates the active vehicle from server-owned `x/y` and reduces `moveUnits`.
- `submitTurnIntent(action="fire")` records last-shot origin from server-owned vehicle coordinates, not any client-predicted coordinate payload.

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```powershell
node_modules\.bin\tsx.cmd --test server\rooms\turnAuthority.test.ts server\rooms\combatPreview.test.ts server\rooms\GravityCanyonRoom.integration.test.ts
```

Expected: failures because movement and fire payloads are not parsed or applied.

- [ ] **Step 3: Implement intent payload parsing**

Extend `SubmitTurnIntentMessage` to accept optional `direction`, `deltaSeconds`, `angle`, `power`, and `facing`. Add an exported result function that returns the accepted action and active vehicle after validation, while preserving the existing boolean wrapper for older tests.

- [ ] **Step 4: Implement movement application**

Use `resolveMovementStep(...)` with server map terrain and v1 tuning constants. Apply:

- `vehicle.x`
- `vehicle.y`
- `vehicle.facing`
- `vehicle.moveUnits`

- [ ] **Step 5: Implement fire result metadata**

Clamp angle/power/facing. Record `lastShot*` fields from server-owned state before preview damage advances the turn.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node_modules\.bin\tsx.cmd --test server\rooms\turnAuthority.test.ts server\rooms\combatPreview.test.ts server\rooms\GravityCanyonRoom.integration.test.ts
```

Expected: all focused tests pass.

### Task 3: Expose Shot Contract To Client Snapshot And Preview Markup

**Files:**
- Modify: `src/onlineLobbySnapshot.ts`
- Modify: `src/onlineLobbySnapshot.test.ts`
- Modify: `src/onlineGameplayPreviewMarkup.ts`
- Modify: `src/onlineGameplayPreviewMarkup.test.ts`
- Modify: `src/onlineGameplayPreviewTestData.ts`

- [ ] **Step 1: Write failing snapshot/markup tests**

Add snapshot assertions for `lastShotOriginX`, `lastShotPower`, and `lastShotTargetVehicleId`.

Add markup assertions that the shared gameplay preview displays the latest server shot origin and target when present.

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```powershell
node_modules\.bin\tsx.cmd --test src\onlineLobbySnapshot.test.ts src\onlineGameplayPreviewMarkup.test.ts
```

Expected: failure because snapshot and markup do not include last-shot metadata.

- [ ] **Step 3: Update snapshot and markup**

Add the last-shot fields to `RoomSnapshot`, defaults, and `RoomStateSource`. Render a compact `Server Shot` panel only when `lastShotId` is present.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node_modules\.bin\tsx.cmd --test src\onlineLobbySnapshot.test.ts src\onlineGameplayPreviewMarkup.test.ts
```

Expected: all focused tests pass.

### Task 4: Verification And Documentation

**Files:**
- Modify: `docs/VERSION_LOG.md`
- Generated: `docs/superpowers/specs/2026-06-18-authoritative-move-fire-flow-design.html`
- Generated: `docs/superpowers/plans/2026-06-18-authoritative-move-fire-flow.html`

- [ ] **Step 1: Update version log**

Add an Unreleased bullet naming the server-owned movement/fire-origin contract and shot-result snapshot metadata.

- [ ] **Step 2: Regenerate docs**

Run: `npm run docs:html`

- [ ] **Step 3: Run required checks**

Run:

```powershell
npm test
npm run build
npm run audit:fallow:changed
npm run graphify:update
```

Expected: all pass. Build may retain the existing Vite large chunk warning.
