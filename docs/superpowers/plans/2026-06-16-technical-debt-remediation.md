# Technical Debt Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deconstruct Gravity Canyon's highest-risk godfiles so future human and AI contributors can change one responsibility without breaking another.

**Architecture:** Use SADD as one bounded extraction per task: add a characterization test, move one responsibility behind a named module boundary, run focused tests, then run the full gate before committing. Runtime files target 250 nonblank LOC or less; temporary orchestration files may stay up to 300 nonblank LOC while active migration is in progress.

**Tech Stack:** TypeScript, Phaser, Colyseus, Node test runner, Vite, local docs HTML generator.

---

## File Structure

Create or modify these ownership boundaries:

| File | Responsibility |
| --- | --- |
| `src/onlineLobby.ts` | Thin online lobby controller: connect to room, route state to renderer, start gameplay. Target: under 180 nonblank LOC. |
| `src/onlineLobbySnapshot.ts` | Convert Colyseus room state into plain `RoomSnapshot` data. No DOM, no Colyseus client construction. Target: under 180 LOC. |
| `src/onlineLobbyMarkup.ts` | Pure HTML string helpers for lobby shell, player rows, slot rows, and option rows. Target: under 220 LOC. |
| `src/onlineLobbyDom.ts` | DOM ownership for the lobby stage: create elements, wire browser events, update visible text/markup. Target: under 220 LOC. |
| `server/rooms/combatPreview.ts` | Preview combat setup, preview fire resolution, turn selection, winner rewards. Target: under 220 LOC. |
| `server/rooms/GravityCanyonRoom.ts` | Colyseus room lifecycle and message routing only. Target: under 280 LOC. |
| `src/match/MatchSceneTerrainAdapter.ts` | Terrain surface, angle, platform, and void-position adapter methods currently inside `MatchScene`. Target: under 160 LOC. |
| `src/match/MatchSceneShotFlow.ts` | Scene-specific projectile/shot update orchestration that coordinates existing controllers. Target: under 220 LOC. |
| `src/match/MatchScene.ts` | Phaser scene lifecycle and collaborator wiring only. Target: under 300 LOC. |
| `scripts/docsHtmlMarkdown.mjs` | Markdown parsing/rendering helpers from `build-docs-html.mjs`. Target: under 220 LOC. |
| `scripts/docsHtmlIndex.mjs` | Docs index page writer from `build-docs-html.mjs`. Target: under 220 LOC. |
| `scripts/build-docs-html.mjs` | Thin docs generation entry point. Target: under 120 LOC. |

## Global Verification

Run after every task:

```powershell
npm run build
npm test
npm run audit:debt
```

Expected result: build exits 0, all tests pass, and `docs/TECH_DEBT_AUDIT.html` regenerates.

## Task 1: Extract Online Lobby Snapshots

**Files:**
- Create: `src/onlineLobbySnapshot.ts`
- Create: `src/onlineLobbySnapshot.test.ts`
- Modify: `src/onlineLobby.ts`
- Modify: `src/onlineLobbyView.ts` only if shared types need to move

- [ ] **Step 1: Write the failing snapshot test**

Create `src/onlineLobbySnapshot.test.ts` with a Colyseus-like Map state and assert that `getRoomSnapshot()` returns plain data:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getRoomSnapshot } from "./onlineLobbySnapshot";

test("getRoomSnapshot converts room state into plain lobby data", () => {
  const players = new Map<string, unknown>([
    ["red-session", { sessionId: "red-session", displayName: "Red", role: "red-captain", ready: true }],
    ["blue-session", { sessionId: "blue-session", displayName: "Blue", role: "blue-captain", ready: false }],
  ]);
  const slots = new Map<string, unknown>([
    ["red-1", { slotId: "red-1", team: "red", ownerSessionId: "red-session", selectedCharacterId: "kaelii", active: true }],
  ]);

  const snapshot = getRoomSnapshot({
    roomCode: "auto-room",
    mode: "1v1",
    phase: "ready",
    players,
    slots,
  });

  assert.equal(snapshot.roomCode, "auto-room");
  assert.equal(snapshot.players[0].displayName, "Red");
  assert.equal(snapshot.slots[0].characterId, "kaelii");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/onlineLobbySnapshot.test.ts
```

Expected: fail because `src/onlineLobbySnapshot.ts` does not exist.

- [ ] **Step 3: Move snapshot code out of `src/onlineLobby.ts`**

Create `src/onlineLobbySnapshot.ts` exporting:

```ts
export type PlayerSnapshot = { sessionId: string; displayName: string; team: string; role: string; joinOrder: number; ready: boolean; tokens: number; equippedNameplate: string; inventory: string[] };
export type CombatVehicleSnapshot = { vehicleId: string; ownerSessionId: string; displayName: string; team: string; className: string; hp: number; maxHp: number; alive: boolean; x: number; y: number; angle: number };
export type RoomSnapshot = { roomCode: string; mode: string; redCaptainSessionId: string; blueCaptainSessionId: string; spectatorSessionIds: string[]; phase: string; status: string; roundNumber: number; turnNumber: number; wind: number; activeVehicleId: string; winnerTeam: string; lastRewardLog: string; players: PlayerSnapshot[]; slots: LobbySlotView[]; vehicles: CombatVehicleSnapshot[] };
export function getRoomSnapshot(state: unknown): RoomSnapshot;
```

Move the existing `getSnapshot`, `getPlayers`, and `getVehicles` implementations from `src/onlineLobby.ts` into that file. Keep `normalizeLobbySlots` in `src/onlineLobbyView.ts`.

- [ ] **Step 4: Update imports**

In `src/onlineLobby.ts`, import `getRoomSnapshot` and `type RoomSnapshot` from `src/onlineLobbySnapshot.ts`. Replace the old `getSnapshot(state)` call with `getRoomSnapshot(state)`.

- [ ] **Step 5: Verify and commit**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/onlineLobbySnapshot.test.ts src/onlineLobbyView.test.ts
npm run build
npm test
git add -- src/onlineLobby.ts src/onlineLobbySnapshot.ts src/onlineLobbySnapshot.test.ts
git commit -m "refactor: extract online lobby snapshots"
```

## Task 2: Extract Pure Online Lobby Markup

**Files:**
- Create: `src/onlineLobbyMarkup.ts`
- Create: `src/onlineLobbyMarkup.test.ts`
- Modify: `src/onlineLobby.ts`
- Modify: `src/onlineLobbyView.ts`

- [ ] **Step 1: Write markup helper tests**

Create tests that assert escaped player names, slot labels, and selected character options are rendered without needing a browser DOM.

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";

test("renderLobbyShell owns the centered online stage shell", () => {
  assert.match(renderLobbyShell(), /class="online-stage"/);
  assert.match(renderLobbyShell(), /data-ready-toggle/);
});

test("renderPlayerRows escapes display names", () => {
  const html = renderPlayerRows([{ sessionId: "a", displayName: "<Red>", team: "red", role: "red-captain", joinOrder: 1, ready: true, tokens: 0, equippedNameplate: "Canyon Rookie", inventory: [] }], "a");
  assert.match(html, /&lt;Red&gt;/);
  assert.doesNotMatch(html, /<Red>/);
});

test("renderSlotRows disables uneditable slots", () => {
  const html = renderSlotRows([{ slotId: "blue-1", team: "blue", ownerSessionId: "b", characterId: "vesper", displayName: "Blue", ready: false, active: true }], "red-captain", true);
  assert.match(html, /disabled/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/onlineLobbyMarkup.test.ts
```

Expected: fail because the module does not exist.

- [ ] **Step 3: Move markup-only functions**

Create `src/onlineLobbyMarkup.ts` with these exports:

```ts
export function renderLobbyShell(): string;
export function renderPlayerRows(players: readonly PlayerSnapshot[], localSessionId: string): string;
export function renderSlotRows(slots: readonly LobbySlotView[], localRole: string, canUseLobbyControls: boolean): string;
export function escapeHtml(value: string): string;
```

Move the lobby shell template, `renderPlayers` row HTML, `renderSlots` row HTML, `capitalize`, `slotSortValue`, and `escapeHtml` out of `src/onlineLobby.ts`. Keep lobby decision rules in `src/onlineLobbyView.ts`.

- [ ] **Step 4: Replace inline template usage**

In `src/onlineLobby.ts`, set `stage.outerHTML` by creating a wrapper from `renderLobbyShell()` or assign `container.innerHTML = renderLobbyShell()` and select the returned stage. Keep event wiring in the controller for this task.

- [ ] **Step 5: Verify and commit**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/onlineLobbyMarkup.test.ts src/onlineLobbySnapshot.test.ts src/onlineLobbyView.test.ts
npm run build
npm test
git add -- src/onlineLobby.ts src/onlineLobbyMarkup.ts src/onlineLobbyMarkup.test.ts src/onlineLobbyView.ts
git commit -m "refactor: extract online lobby markup"
```

## Task 3: Extract Online Lobby DOM Ownership

**Files:**
- Create: `src/onlineLobbyDom.ts`
- Modify: `src/onlineLobby.ts`
- Modify: `src/match/architecture.test.ts`

- [ ] **Step 1: Add architecture guard**

Extend `src/match/architecture.test.ts` with:

```ts
test("online lobby controller delegates DOM rendering", () => {
  const controller = readFileSync("src/onlineLobby.ts", "utf8");
  assert.match(controller, /createOnlineLobbyDom/);
  assert.doesNotMatch(controller, /innerHTML\\s*=|querySelector<|document\\.createElement\\("section"\\)/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/match/architecture.test.ts
```

Expected: fail because `src/onlineLobby.ts` still owns DOM details.

- [ ] **Step 3: Create DOM boundary**

Create `src/onlineLobbyDom.ts` exporting:

```ts
export type OnlineLobbyDomHandlers = {
  reconnect: () => void;
  displayNameChanged: (value: string) => void;
  modeChanged: (mode: string) => void;
  slotChanged: (slotId: string, characterId: string) => void;
  readyClicked: () => void;
  capsuleClicked: () => void;
  nameplateChanged: (nameplate: string) => void;
};

export type OnlineLobbyDom = {
  stage: HTMLElement;
  displayName: () => string;
  setBadge: (text: string, tone: "neutral" | "ok" | "warn" | "error") => void;
  renderLobby: (snapshot: RoomSnapshot, localSessionId: string, localReady: boolean) => void;
  remove: () => void;
};

export function createOnlineLobbyDom(documentRef: Document, handlers: OnlineLobbyDomHandlers): OnlineLobbyDom;
```

Move all `querySelector`, event listener, button text, select update, player list, slot list, and reward log DOM work into this module.

- [ ] **Step 4: Shrink controller**

In `src/onlineLobby.ts`, keep only `createOnlineClient`, `connectAutoRoom`, room callbacks, ready state tracking, `stageForRoomPhase`, and `onGameplayStart`.

- [ ] **Step 5: Verify line target**

```powershell
(Get-Content src\onlineLobby.ts | Where-Object { $_.Trim() }).Count
```

Expected: 180 or less.

- [ ] **Step 6: Verify and commit**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/match/architecture.test.ts src/onlineLobbyMarkup.test.ts src/onlineLobbySnapshot.test.ts src/onlineLobbyView.test.ts
npm run build
npm test
git add -- src/onlineLobby.ts src/onlineLobbyDom.ts src/match/architecture.test.ts
git commit -m "refactor: isolate online lobby dom"
```

## Task 4: Extract Server Preview Combat

**Files:**
- Create: `server/rooms/combatPreview.ts`
- Create: `server/rooms/combatPreview.test.ts`
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Modify: `server/rooms/GravityCanyonRoom.integration.test.ts` only if message timing changes

- [ ] **Step 1: Add pure preview-combat tests**

Create `server/rooms/combatPreview.test.ts` with tests for preview vehicle creation and preview fire turn advancement. Use `GravityCanyonState`, `PlayerState`, and `LobbySlotState` so the test matches runtime schema types.

- [ ] **Step 2: Run the focused test and confirm it fails**

```powershell
node node_modules/tsx/dist/cli.mjs --test server/rooms/combatPreview.test.ts
```

Expected: fail because `server/rooms/combatPreview.ts` does not exist.

- [ ] **Step 3: Move preview combat operations**

Create exports:

```ts
export function startCombatPreview(state: GravityCanyonState): void;
export function clearCombatPreview(state: GravityCanyonState): void;
export function previewFireForClient(state: GravityCanyonState, sessionId: string): void;
export function createPreviewVehicle(slotId: VehicleId, characterId: CharacterId, player: PlayerState): CombatVehicleState;
```

Move `startCombatPreview`, `clearCombatPreview`, `previewFire`, `nextAliveVehicle`, `hasAliveTeam`, `finishRound`, `createPreviewVehicle`, `teamForSlot`, `rollWind`, and `capitalize` out of `GravityCanyonRoom.ts`.

- [ ] **Step 4: Keep room as message router**

`GravityCanyonRoom.ts` should call `startCombatPreview(this.state)`, `clearCombatPreview(this.state)`, and `previewFireForClient(this.state, client.sessionId)`.

- [ ] **Step 5: Verify line target**

```powershell
(Get-Content server\rooms\GravityCanyonRoom.ts | Where-Object { $_.Trim() }).Count
```

Expected: 280 or less.

- [ ] **Step 6: Verify and commit**

```powershell
node node_modules/tsx/dist/cli.mjs --test server/rooms/combatPreview.test.ts server/rooms/GravityCanyonRoom.integration.test.ts server/rooms/autoRoomLobby.test.ts
npm run build
npm test
git add -- server/rooms/GravityCanyonRoom.ts server/rooms/combatPreview.ts server/rooms/combatPreview.test.ts
git commit -m "refactor: extract room preview combat"
```

## Task 5: Reduce MatchScene Without Changing Gameplay

**Files:**
- Create: `src/match/MatchSceneTerrainAdapter.ts`
- Create: `src/match/MatchSceneShotFlow.ts`
- Create tests beside each new file if pure behavior can be tested without Phaser
- Modify: `src/match/MatchScene.ts`
- Modify: `src/match/architecture.test.ts`

- [ ] **Step 1: Add architecture guard**

In `src/match/architecture.test.ts`, add a test that counts nonblank `MatchScene.ts` lines and asserts `<= 360` for the first pass.

- [ ] **Step 2: Extract terrain adapter**

Move `surfaceAt`, `terrainBreakthroughY`, `terrainPlatformBottomY`, `visibleVoidBottomY`, `voidDropTargetY`, and `terrainAngleAt` into `MatchSceneTerrainAdapter`. The new class should depend on `TerrainController` and expose the same method names.

- [ ] **Step 3: Extract shot flow adapter**

Move `fire`, `updateProjectile`, `makeCrater`, `advanceTurn`, and `queuePostMotionResolution` into `MatchSceneShotFlow` only after adding tests around `ShotFlowController` or characterization assertions in `architecture.test.ts`.

- [ ] **Step 4: Verify first line target**

```powershell
(Get-Content src\match\MatchScene.ts | Where-Object { $_.Trim() }).Count
```

Expected: 360 or less for this pass. A later pass should lower the target to 300.

- [ ] **Step 5: Verify and commit**

```powershell
node node_modules/tsx/dist/cli.mjs --test src/match/architecture.test.ts src/match/ShotFlowController.test.ts src/match/TerrainController.test.ts
npm run build
npm test
git add -- src/match/MatchScene.ts src/match/MatchSceneTerrainAdapter.ts src/match/MatchSceneShotFlow.ts src/match/architecture.test.ts
git commit -m "refactor: reduce match scene orchestration"
```

## Task 6: Split Docs HTML Generator

**Files:**
- Create: `scripts/docsHtmlMarkdown.mjs`
- Create: `scripts/docsHtmlIndex.mjs`
- Modify: `scripts/build-docs-html.mjs`
- Modify: `scripts/build-docs-html.test.ts`

- [ ] **Step 1: Add script boundary assertions**

Update `scripts/build-docs-html.test.ts` to require `scripts/docsHtmlMarkdown.mjs` and `scripts/docsHtmlIndex.mjs`.

- [ ] **Step 2: Extract markdown rendering**

Move `escapeHtml`, `linkHref`, `inlineMarkdown`, `isTableDelimiter`, `splitTableRow`, `closeOpenBlocks`, `renderMarkdown`, `titleFromMarkdown`, and `pageTemplate` into `scripts/docsHtmlMarkdown.mjs`.

- [ ] **Step 3: Extract index writing**

Move `standaloneHtmlFiles`, `indexPathFor`, and `writeDocsIndex` into `scripts/docsHtmlIndex.mjs`.

- [ ] **Step 4: Keep generator entry thin**

`scripts/build-docs-html.mjs` should own root path setup, markdown discovery, calls to write pages, calls to write the index, and the final console message.

- [ ] **Step 5: Verify line targets**

```powershell
(Get-Content scripts\build-docs-html.mjs | Where-Object { $_.Trim() }).Count
(Get-Content scripts\docsHtmlMarkdown.mjs | Where-Object { $_.Trim() }).Count
(Get-Content scripts\docsHtmlIndex.mjs | Where-Object { $_.Trim() }).Count
```

Expected: entry under 120, helper files under 220.

- [ ] **Step 6: Verify and commit**

```powershell
node node_modules/tsx/dist/cli.mjs --test scripts/build-docs-html.test.ts
npm run docs:html
npm test
git add -- scripts/build-docs-html.mjs scripts/docsHtmlMarkdown.mjs scripts/docsHtmlIndex.mjs scripts/build-docs-html.test.ts docs/index.html
git commit -m "refactor: split docs html generator"
```

## Task 7: Re-run Debt Audit and Lower Targets

**Files:**
- Modify: `docs/TECH_DEBT_AUDIT.md`
- Modify: `docs/TECH_DEBT_AUDIT.html`
- Modify: `docs/index.html`

- [ ] **Step 1: Regenerate audit**

```powershell
npm run audit:debt
```

Expected: `docs/TECH_DEBT_AUDIT.md`, `docs/TECH_DEBT_AUDIT.html`, and `docs/index.html` update.

- [ ] **Step 2: Confirm priority files moved down the list**

Open `docs/TECH_DEBT_AUDIT.md` and confirm `src/onlineLobby.ts`, `server/rooms/GravityCanyonRoom.ts`, `src/match/MatchScene.ts`, and `scripts/build-docs-html.mjs` are below their task targets.

- [ ] **Step 3: Commit the refreshed audit**

```powershell
git add -- docs/TECH_DEBT_AUDIT.md docs/TECH_DEBT_AUDIT.html docs/index.html
git commit -m "docs: refresh technical debt audit"
```

## Self-Review

- This plan targets the measured godfiles from `docs/TECH_DEBT_AUDIT.md`.
- Each task has a bounded file set and a verification command.
- Runtime godfiles are split before script monoliths because playtest work is the active product surface.
- Line targets are explicit: 250 LOC default, 300 LOC temporary orchestrator ceiling, with stricter per-file targets where practical.
