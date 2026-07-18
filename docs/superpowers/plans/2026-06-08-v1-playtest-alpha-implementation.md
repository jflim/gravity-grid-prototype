# V1 Playtest Alpha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the locked hosted private-room V1 playtest alpha defined in `docs/V1_PLAYTEST_ALPHA.html`.

**Architecture:** Replace the current two-player online preview with a server-authoritative room flow, lobby seat model, deterministic match setup, and authoritative combat resolution. Keep Phaser responsible for input, rendering, animation, and feedback while Colyseus owns room state, turn order, settings, validation, and match results.

**Tech Stack:** TypeScript, Phaser 3, Vite, Node.js, Colyseus, `@colyseus/schema`, `tsx`, Node test runner.

---

## Scope Contract

V1 scope is governed by `docs/V1_PLAYTEST_ALPHA.html`. A task that changes the contract requires the explicit phrase `I am requesting a v1 contract change.` before implementation starts. Everything else goes into the V2 ideas or decision sections, not into V1 code.

The current online implementation is a preview scaffold:

- `server/rooms/GravityCanyonRoom.ts` has `maxClients = 2`, auto team assignment, ready checks, preview rewards, and a fake `previewFire` loop.
- `server/schema/GravityCanyonState.ts` stores players and preview vehicles but not seats, room settings, spectators, reconnect state, turn order, map state, or real projectile outcomes.
- `src/onlineLobby.ts` renders create/join, ready, reward capsule, preview fire, and nameplate controls.
- `src/main.ts` contains the local Phaser game, local turn timer, terrain, vehicles, wind, projectile logic, and current character art wiring.

This plan turns that scaffold into V1 in testable slices.

## File Structure

- Create `server/v1/rules.ts`: locked V1 ids, room settings, constants, validation helpers, and scope-safe defaults.
- Create `server/v1/rules.test.ts`: coverage for modes, settings, seats, character ids, and display-name rules.
- Create `server/v1/maps.ts`: map pool, spawn definitions, map selection, death plane defaults, and terrain seed metadata.
- Create `server/v1/maps.test.ts`: coverage for spawn validity and random map selection.
- Create `server/v1/turnOrder.ts`: match turn-order generation and active-turn helpers.
- Create `server/v1/turnOrder.test.ts`: coverage for 1v1, 2v2, same-character seats, KOs, and disconnect skips.
- Create `server/v1/combatTypes.ts`: serializable combat commands and outcomes shared by room and tests.
- Create `server/v1/weapons.ts`: Nova, Vesper, Kaelii, and Perlah primary weapon definitions.
- Create `server/v1/weapons.test.ts`: behavioral tests for weapon identity, damage, terrain effects, and knockback/pull classes.
- Create `server/v1/combat.ts`: deterministic server-side movement, firing validation, projectile simulation, terrain damage, direct/splash hit resolution, and KO checks.
- Create `server/v1/combat.test.ts`: deterministic tests for fire, terrain, friendly-fire, Void Dropped, forced turn skip, and round end.
- Modify `server/schema/GravityCanyonState.ts`: add V1 room settings, lobby members, seats, spectators, match state, turn state, map state, phrase bubbles, and combat events.
- Modify `server/rooms/GravityCanyonRoom.ts`: replace preview messages with V1 room lifecycle messages.
- Create `src/online/persistence.ts`: generated display names, local reconnect token, and room URL helpers.
- Create `src/online/renderRoom.ts`: lobby and room UI render helpers for players, seats, settings, spectators, and ready/start state.
- Create `src/online/messages.ts`: client-side message names and payload types matching the server contract.
- Modify `src/onlineLobby.ts`: swap preview UI for V1 room creation, invite links, name editing, seat claiming, character selection, settings, ready/start, and passive spectator notice.
- Modify `src/main.ts`: add online match adapter hooks while preserving local playability during the migration.
- Modify `package.json`: add a `test` script once the first `.test.ts` file exists.
- Update `README.md`, `docs/SESSION_HANDOFF.md`, and `docs/VERSION_LOG.md` after each playable checkpoint.

## Task 1: Test Harness And V1 Rule Constants

**Files:**
- Modify: `package.json`
- Create: `server/v1/rules.ts`
- Create: `server/v1/rules.test.ts`

- [x] **Step 1: Add the test command**

Add `test` after `docs:html` in `package.json`:

```json
"docs:html": "node scripts/build-docs-html.mjs",
"test": "tsx --test \"server/**/*.test.ts\" \"src/**/*.test.ts\"",
"verify:runtime-roster": "node scripts/verify-runtime-roster.mjs"
```

- [x] **Step 2: Write the failing rule tests**

Create `server/v1/rules.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  CHARACTER_IDS,
  DEFAULT_ROOM_SETTINGS,
  MODE_SEATS,
  PHRASE_COOLDOWN_MS,
  TURN_SECONDS,
  sanitizeDisplayName,
  validateRoomSettings,
} from "./rules.js";

test("v1 exposes exactly the locked roster", () => {
  assert.deepEqual(CHARACTER_IDS, ["nova", "vesper", "kaelii", "perlah"]);
});

test("v1 supports 1v1 and 2v2 seat layouts", () => {
  assert.equal(MODE_SEATS["1v1"].length, 2);
  assert.equal(MODE_SEATS["2v2"].length, 4);
  assert.deepEqual(MODE_SEATS["2v2"].map((seat) => seat.team), ["red", "blue", "red", "blue"]);
});

test("default room settings match the v1 contract", () => {
  assert.equal(DEFAULT_ROOM_SETTINGS.mode, "2v2");
  assert.equal(DEFAULT_ROOM_SETTINGS.matchLength, "best-of-1");
  assert.equal(DEFAULT_ROOM_SETTINGS.mapPick, "random");
  assert.equal(DEFAULT_ROOM_SETTINGS.friendlyFire, false);
});

test("room settings validation clamps to v1 values", () => {
  assert.deepEqual(
    validateRoomSettings({
      mode: "4v4",
      matchLength: "best-of-9",
      mapPick: "unknown-map",
      friendlyFire: true,
    }),
    {
      mode: "2v2",
      matchLength: "best-of-1",
      mapPick: "random",
      friendlyFire: true,
    },
  );
});

test("display names are short, visible, and non-persistent", () => {
  assert.equal(sanitizeDisplayName("  Canyon   Pilot!!!  "), "Canyon Pilot");
  assert.equal(sanitizeDisplayName("<script>"), "script");
  assert.equal(sanitizeDisplayName(""), "Guest");
  assert.equal(sanitizeDisplayName("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnopqr");
});

test("turn and phrase constants are locked for v1 readability", () => {
  assert.equal(TURN_SECONDS, 20);
  assert.equal(PHRASE_COOLDOWN_MS, 3000);
});
```

- [x] **Step 3: Run the failing tests**

Run: `npm run test`

Expected: FAIL because `server/v1/rules.ts` does not exist.

- [x] **Step 4: Implement the rule constants**

Create `server/v1/rules.ts`:

```ts
export type GameMode = "1v1" | "2v2";
export type MatchLength = "best-of-1" | "best-of-3";
export type TeamId = "red" | "blue";
export type CharacterId = "nova" | "vesper" | "kaelii" | "perlah";
export type MapPick = "random" | "mesa-ribs" | "split-arch" | "crater-steps" | "wind-bridge" | "basin-ridge";

export type SeatId = "red-1" | "blue-1" | "red-2" | "blue-2";

export type SeatDefinition = {
  seatId: SeatId;
  team: TeamId;
  slot: 1 | 2;
};

export type RoomSettings = {
  mode: GameMode;
  matchLength: MatchLength;
  mapPick: MapPick;
  friendlyFire: boolean;
};

export const CHARACTER_IDS = ["nova", "vesper", "kaelii", "perlah"] as const satisfies readonly CharacterId[];
export const TURN_SECONDS = 20;
export const DISCONNECTED_SKIP_SECONDS = 5;
export const RECONNECT_GRACE_MS = 180_000;
export const PHRASE_COOLDOWN_MS = 3_000;
export const MAX_DISPLAY_NAME_LENGTH = 18;

export const MODE_SEATS: Record<GameMode, readonly SeatDefinition[]> = {
  "1v1": [
    { seatId: "red-1", team: "red", slot: 1 },
    { seatId: "blue-1", team: "blue", slot: 1 },
  ],
  "2v2": [
    { seatId: "red-1", team: "red", slot: 1 },
    { seatId: "blue-1", team: "blue", slot: 1 },
    { seatId: "red-2", team: "red", slot: 2 },
    { seatId: "blue-2", team: "blue", slot: 2 },
  ],
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: "2v2",
  matchLength: "best-of-1",
  mapPick: "random",
  friendlyFire: false,
};

const MATCH_LENGTHS = new Set<MatchLength>(["best-of-1", "best-of-3"]);
const GAME_MODES = new Set<GameMode>(["1v1", "2v2"]);
const MAP_PICKS = new Set<MapPick>([
  "random",
  "mesa-ribs",
  "split-arch",
  "crater-steps",
  "wind-bridge",
  "basin-ridge",
]);

export function validateRoomSettings(input: Partial<Record<keyof RoomSettings, unknown>>): RoomSettings {
  return {
    mode: GAME_MODES.has(input.mode as GameMode) ? (input.mode as GameMode) : DEFAULT_ROOM_SETTINGS.mode,
    matchLength: MATCH_LENGTHS.has(input.matchLength as MatchLength)
      ? (input.matchLength as MatchLength)
      : DEFAULT_ROOM_SETTINGS.matchLength,
    mapPick: MAP_PICKS.has(input.mapPick as MapPick) ? (input.mapPick as MapPick) : DEFAULT_ROOM_SETTINGS.mapPick,
    friendlyFire: Boolean(input.friendlyFire),
  };
}

export function sanitizeDisplayName(displayName = "Guest") {
  const clean = displayName.replace(/[^\w .-]/g, "").replace(/\s+/g, " ").trim();
  return clean.slice(0, MAX_DISPLAY_NAME_LENGTH) || "Guest";
}
```

- [x] **Step 5: Run tests and commit**

Run: `npm run test`

Expected: PASS.

Commit:

```bash
git add package.json server/v1/rules.ts server/v1/rules.test.ts
git commit -m "test: add v1 rule contract"
```

## Task 2: Map Pool And Spawn Contracts

**Files:**
- Create: `server/v1/maps.ts`
- Create: `server/v1/maps.test.ts`
- Create: `scripts/build-map-previews.ts`
- Create: `docs/V1_MAP_PREVIEWS.html`
- Modify: `scripts/build-docs-html.mjs`
- Modify: `package.json`

**Implementation note:** Task 2 also generates an HTML map-preview page from `server/v1/maps.ts`. The preview is documentation/debug visibility, not a new gameplay feature; map gameplay authority remains the map contract.

- [x] **Step 1: Write map tests**

Create `server/v1/maps.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { MAPS, pickMap, spawnForSeat } from "./maps.js";
import { MODE_SEATS } from "./rules.js";

test("v1 map pool has five selectable maps", () => {
  assert.deepEqual(
    MAPS.map((map) => map.id),
    ["mesa-ribs", "split-arch", "crater-steps", "wind-bridge", "basin-ridge"],
  );
});

test("each map has valid spawns for 1v1 and 2v2 seats", () => {
  for (const map of MAPS) {
    for (const mode of ["1v1", "2v2"] as const) {
      for (const seat of MODE_SEATS[mode]) {
        const spawn = spawnForSeat(map, seat.seatId);
        assert.ok(spawn.x > 0 && spawn.x < map.worldWidth);
        assert.ok(spawn.y > map.deathPlaneY - 900 && spawn.y < map.deathPlaneY);
      }
    }
  }
});

test("random map selection is deterministic by seed", () => {
  assert.equal(pickMap("random", 1001).id, pickMap("random", 1001).id);
  assert.equal(pickMap("random", 1002).id, pickMap("random", 1002).id);
});

test("explicit map selection wins over random", () => {
  assert.equal(pickMap("split-arch", 1001).id, "split-arch");
});
```

- [x] **Step 2: Run the failing map tests**

Run: `npm run test -- server/v1/maps.test.ts`

Expected: FAIL because `server/v1/maps.ts` does not exist.

- [x] **Step 3: Implement map definitions**

Create `server/v1/maps.ts`:

```ts
import type { MapPick, SeatId } from "./rules.js";

export type SpawnPoint = {
  x: number;
  y: number;
  facing: 1 | -1;
};

export type V1Map = {
  id: Exclude<MapPick, "random">;
  name: string;
  worldWidth: number;
  deathPlaneY: number;
  windScale: number;
  terrainSeedSalt: number;
  spawns: Record<SeatId, SpawnPoint>;
};

export const MAPS: readonly V1Map[] = [
  map("mesa-ribs", "Mesa Ribs", 11, 0.85, {
    "red-1": spawn(380, 610, 1),
    "blue-1": spawn(2020, 600, -1),
    "red-2": spawn(610, 640, 1),
    "blue-2": spawn(1790, 640, -1),
  }),
  map("split-arch", "Split Arch", 23, 1.0, {
    "red-1": spawn(330, 580, 1),
    "blue-1": spawn(2070, 580, -1),
    "red-2": spawn(720, 650, 1),
    "blue-2": spawn(1680, 650, -1),
  }),
  map("crater-steps", "Crater Steps", 37, 0.9, {
    "red-1": spawn(420, 620, 1),
    "blue-1": spawn(1980, 620, -1),
    "red-2": spawn(780, 700, 1),
    "blue-2": spawn(1620, 700, -1),
  }),
  map("wind-bridge", "Wind Bridge", 51, 1.15, {
    "red-1": spawn(360, 590, 1),
    "blue-1": spawn(2040, 590, -1),
    "red-2": spawn(650, 625, 1),
    "blue-2": spawn(1750, 625, -1),
  }),
  map("basin-ridge", "Basin Ridge", 67, 0.95, {
    "red-1": spawn(430, 680, 1),
    "blue-1": spawn(1970, 680, -1),
    "red-2": spawn(690, 610, 1),
    "blue-2": spawn(1710, 610, -1),
  }),
];

export function pickMap(mapPick: MapPick, seed: number) {
  if (mapPick !== "random") {
    return MAPS.find((map) => map.id === mapPick) ?? MAPS[0];
  }

  return MAPS[Math.abs(seed) % MAPS.length];
}

export function spawnForSeat(map: V1Map, seatId: SeatId) {
  return map.spawns[seatId];
}

function map(id: V1Map["id"], name: string, terrainSeedSalt: number, windScale: number, spawns: V1Map["spawns"]): V1Map {
  return {
    id,
    name,
    worldWidth: 2400,
    deathPlaneY: 900,
    windScale,
    terrainSeedSalt,
    spawns,
  };
}

function spawn(x: number, y: number, facing: 1 | -1): SpawnPoint {
  return { x, y, facing };
}
```

- [x] **Step 4: Run tests and commit**

Run: `npm run test -- server/v1/maps.test.ts`

Expected: PASS.

Commit:

```bash
git add server/v1/maps.ts server/v1/maps.test.ts
git commit -m "feat: define v1 map pool"
```

## Task 3: Schema Upgrade For Lobby, Seats, Spectators, And Match State

**Files:**
- Modify: `server/schema/GravityCanyonState.ts`
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Create: `server/rooms/GravityCanyonRoom.lobby.test.ts`

- [ ] **Step 1: Write schema and lobby tests around room state helpers**

Create `server/rooms/GravityCanyonRoom.lobby.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ROOM_SETTINGS } from "../v1/rules.js";
import {
  createInitialGravityCanyonState,
  createLobbyMember,
  createSeatState,
  isSeatReadyForStart,
} from "./GravityCanyonRoom.js";

test("initial room state starts in lobby with v1 settings", () => {
  const state = createInitialGravityCanyonState("room-abc");
  assert.equal(state.roomCode, "room-abc");
  assert.equal(state.phase, "lobby");
  assert.equal(state.settings.mode, DEFAULT_ROOM_SETTINGS.mode);
  assert.equal(state.settings.matchLength, DEFAULT_ROOM_SETTINGS.matchLength);
  assert.equal(state.settings.mapPick, DEFAULT_ROOM_SETTINGS.mapPick);
  assert.equal(state.settings.friendlyFire, false);
});

test("lobby members carry display name and reconnect identity", () => {
  const member = createLobbyMember("session-a", "token-a", "Pilot One");
  assert.equal(member.sessionId, "session-a");
  assert.equal(member.reconnectToken, "token-a");
  assert.equal(member.displayName, "Pilot One");
  assert.equal(member.spectator, true);
});

test("seats are not ready until occupied, character selected, and marked ready", () => {
  const emptySeat = createSeatState("red-1", "red", 1);
  assert.equal(isSeatReadyForStart(emptySeat), false);

  emptySeat.ownerSessionId = "session-a";
  emptySeat.characterId = "nova";
  emptySeat.ready = false;
  assert.equal(isSeatReadyForStart(emptySeat), false);

  emptySeat.ready = true;
  assert.equal(isSeatReadyForStart(emptySeat), true);
});
```

- [ ] **Step 2: Run the failing lobby tests**

Run: `npm run test -- server/rooms/GravityCanyonRoom.lobby.test.ts`

Expected: FAIL because the exported helper functions and new schema fields do not exist.

- [ ] **Step 3: Add schema classes**

Modify `server/schema/GravityCanyonState.ts` to add these classes and fields while keeping old fields only until the room is migrated:

```ts
export type RoomPhase = "lobby" | "match-starting" | "in-match" | "round-over" | "match-over";
export type TeamId = "red" | "blue";

export class RoomSettingsState extends Schema {
  declare mode: string;
  declare matchLength: string;
  declare mapPick: string;
  declare friendlyFire: boolean;

  constructor() {
    super();
    this.mode = "2v2";
    this.matchLength = "best-of-1";
    this.mapPick = "random";
    this.friendlyFire = false;
  }
}

export class LobbyMemberState extends Schema {
  declare sessionId: string;
  declare reconnectToken: string;
  declare displayName: string;
  declare spectator: boolean;
  declare connected: boolean;
  declare lastSeenMs: number;

  constructor() {
    super();
    this.sessionId = "";
    this.reconnectToken = "";
    this.displayName = "Guest";
    this.spectator = true;
    this.connected = true;
    this.lastSeenMs = 0;
  }
}

export class SeatState extends Schema {
  declare seatId: string;
  declare team: TeamId;
  declare slot: number;
  declare ownerSessionId: string;
  declare displayName: string;
  declare characterId: string;
  declare ready: boolean;
  declare connected: boolean;
  declare lastDisconnectedAtMs: number;

  constructor() {
    super();
    this.seatId = "";
    this.team = "red";
    this.slot = 1;
    this.ownerSessionId = "";
    this.displayName = "";
    this.characterId = "";
    this.ready = false;
    this.connected = false;
    this.lastDisconnectedAtMs = 0;
  }
}

// Update the existing CombatVehicleState with these V1 match fields.
export class CombatVehicleState extends Schema {
  declare vehicleId: string;
  declare seatId: string;
  declare ownerSessionId: string;
  declare displayName: string;
  declare team: TeamId;
  declare characterId: string;
  declare hp: number;
  declare maxHp: number;
  declare alive: boolean;
  declare x: number;
  declare y: number;
  declare facing: number;
  declare angle: number;

  constructor() {
    super();
    this.vehicleId = "";
    this.seatId = "";
    this.ownerSessionId = "";
    this.displayName = "Guest";
    this.team = "red";
    this.characterId = "nova";
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.x = 0;
    this.y = 0;
    this.facing = 1;
    this.angle = 45;
  }
}

export class MapState extends Schema {
  declare mapId: string;
  declare mapName: string;
  declare seed: number;
  declare deathPlaneY: number;

  constructor() {
    super();
    this.mapId = "";
    this.mapName = "";
    this.seed = 0;
    this.deathPlaneY = 900;
  }
}

export class PhraseBubbleState extends Schema {
  declare id: string;
  declare vehicleId: string;
  declare phrase: string;
  declare expiresAtMs: number;

  constructor() {
    super();
    this.id = "";
    this.vehicleId = "";
    this.phrase = "";
    this.expiresAtMs = 0;
  }
}
```

Add these fields to `GravityCanyonState`:

```ts
declare hostSessionId: string;
declare settings: RoomSettingsState;
declare members: MapSchema<LobbyMemberState>;
declare seats: ArraySchema<SeatState>;
declare spectators: MapSchema<LobbyMemberState>;
declare map: MapState;
declare turnOrder: ArraySchema<string>;
declare activeSeatId: string;
declare turnEndsAtMs: number;
declare redRoundWins: number;
declare blueRoundWins: number;
declare phraseBubbles: ArraySchema<PhraseBubbleState>;
```

Register all new classes in `defineTypes`.

- [ ] **Step 4: Export room state helper constructors**

Modify `server/rooms/GravityCanyonRoom.ts` to export helpers used by tests:

```ts
export function createInitialGravityCanyonState(roomCode: string) {
  const state = new GravityCanyonState();
  state.roomCode = roomCode;
  state.phase = "lobby";
  applySettingsState(state.settings, DEFAULT_ROOM_SETTINGS);
  return state;
}

export function createLobbyMember(sessionId: string, reconnectToken: string, displayName: string) {
  const member = new LobbyMemberState();
  member.sessionId = sessionId;
  member.reconnectToken = reconnectToken;
  member.displayName = sanitizeDisplayName(displayName);
  member.spectator = true;
  member.connected = true;
  member.lastSeenMs = Date.now();
  return member;
}

export function createSeatState(seatId: SeatId, team: TeamId, slot: number) {
  const seat = new SeatState();
  seat.seatId = seatId;
  seat.team = team;
  seat.slot = slot;
  return seat;
}

export function createCombatVehicleState(input: {
  vehicleId: string;
  seatId: SeatId;
  ownerSessionId: string;
  displayName: string;
  team: TeamId;
  characterId: CharacterId;
  x: number;
  y: number;
  facing: 1 | -1;
}) {
  const vehicle = new CombatVehicleState();
  vehicle.vehicleId = input.vehicleId;
  vehicle.seatId = input.seatId;
  vehicle.ownerSessionId = input.ownerSessionId;
  vehicle.displayName = sanitizeDisplayName(input.displayName);
  vehicle.team = input.team;
  vehicle.characterId = input.characterId;
  vehicle.x = input.x;
  vehicle.y = input.y;
  vehicle.facing = input.facing;
  return vehicle;
}

export function isSeatReadyForStart(seat: SeatState) {
  return Boolean(seat.ownerSessionId && seat.characterId && seat.ready);
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- server/rooms/GravityCanyonRoom.lobby.test.ts`

Expected: PASS.

Commit:

```bash
git add server/schema/GravityCanyonState.ts server/rooms/GravityCanyonRoom.ts server/rooms/GravityCanyonRoom.lobby.test.ts
git commit -m "feat: add v1 lobby state schema"
```

## Task 4: Room Lifecycle Messages

**Files:**
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Modify: `server/schema/GravityCanyonState.ts`
- Create: `server/rooms/GravityCanyonRoom.messages.test.ts`

- [ ] **Step 1: Write lifecycle message tests**

Create `server/rooms/GravityCanyonRoom.messages.test.ts` around exported pure helpers:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCharacterPick,
  applyReady,
  applySeatClaim,
  applySeatRelease,
  applySettingsPatch,
  createInitialGravityCanyonState,
} from "./GravityCanyonRoom.js";

test("host can change room settings before match starts", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.hostSessionId = "host";
  applySettingsPatch(state, "host", { mode: "1v1", matchLength: "best-of-3", friendlyFire: true });
  assert.equal(state.settings.mode, "1v1");
  assert.equal(state.settings.matchLength, "best-of-3");
  assert.equal(state.settings.friendlyFire, true);
});

test("non-host cannot change room settings", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.hostSessionId = "host";
  applySettingsPatch(state, "guest", { mode: "1v1" });
  assert.equal(state.settings.mode, "2v2");
});

test("connection can claim one seat and select any v1 character", () => {
  const state = createInitialGravityCanyonState("room-a");
  applySeatClaim(state, "session-a", "Pilot A", "red-1");
  applyCharacterPick(state, "session-a", "nova");
  const seat = state.seats.find((candidate) => candidate.seatId === "red-1");
  assert.equal(seat?.ownerSessionId, "session-a");
  assert.equal(seat?.displayName, "Pilot A");
  assert.equal(seat?.characterId, "nova");
});

test("same character can be picked by multiple seats", () => {
  const state = createInitialGravityCanyonState("room-a");
  applySeatClaim(state, "session-a", "Pilot A", "red-1");
  applySeatClaim(state, "session-b", "Pilot B", "blue-1");
  applyCharacterPick(state, "session-a", "vesper");
  applyCharacterPick(state, "session-b", "vesper");
  assert.equal(state.seats[0].characterId, "vesper");
  assert.equal(state.seats[1].characterId, "vesper");
});

test("unseating moves a member back to passive spectator", () => {
  const state = createInitialGravityCanyonState("room-a");
  applySeatClaim(state, "session-a", "Pilot A", "red-1");
  applySeatRelease(state, "session-a");
  assert.equal(state.seats[0].ownerSessionId, "");
  assert.equal(state.seats[0].characterId, "");
});

test("ready only applies to the owned seat", () => {
  const state = createInitialGravityCanyonState("room-a");
  applySeatClaim(state, "session-a", "Pilot A", "red-1");
  applyCharacterPick(state, "session-a", "kaelii");
  applyReady(state, "session-a", true);
  assert.equal(state.seats[0].ready, true);
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- server/rooms/GravityCanyonRoom.messages.test.ts`

Expected: FAIL because lifecycle helpers are not exported.

- [ ] **Step 3: Implement pure lifecycle helpers**

Modify `server/rooms/GravityCanyonRoom.ts`:

```ts
export function applySettingsPatch(
  state: GravityCanyonState,
  sessionId: string,
  patch: Partial<Record<keyof RoomSettings, unknown>>,
) {
  if (state.phase !== "lobby" || state.hostSessionId !== sessionId) {
    return;
  }

  applySettingsState(state.settings, validateRoomSettings({ ...readSettingsState(state.settings), ...patch }));
  rebuildSeatsForMode(state);
}

export function applySeatClaim(state: GravityCanyonState, sessionId: string, displayName: string, seatId: SeatId) {
  if (state.phase !== "lobby") {
    return;
  }

  applySeatRelease(state, sessionId);
  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat || seat.ownerSessionId) {
    return;
  }

  seat.ownerSessionId = sessionId;
  seat.displayName = sanitizeDisplayName(displayName);
  seat.ready = false;
  seat.connected = true;
}

export function applySeatRelease(state: GravityCanyonState, sessionId: string) {
  const seat = state.seats.find((candidate) => candidate.ownerSessionId === sessionId);
  if (!seat || state.phase !== "lobby") {
    return;
  }

  seat.ownerSessionId = "";
  seat.displayName = "";
  seat.characterId = "";
  seat.ready = false;
  seat.connected = false;
}

export function applyCharacterPick(state: GravityCanyonState, sessionId: string, characterId: string) {
  const seat = state.seats.find((candidate) => candidate.ownerSessionId === sessionId);
  if (!seat || !CHARACTER_IDS.includes(characterId as CharacterId)) {
    return;
  }

  seat.characterId = characterId;
  seat.ready = false;
}

export function applyReady(state: GravityCanyonState, sessionId: string, ready: boolean) {
  const seat = state.seats.find((candidate) => candidate.ownerSessionId === sessionId);
  if (!seat) {
    return;
  }

  seat.ready = Boolean(ready);
}
```

- [ ] **Step 4: Wire Colyseus messages**

Replace preview messages in `onCreate()`:

```ts
this.onMessage("setDisplayName", (client, displayName: string) => {
  this.renameMember(client.sessionId, displayName);
});

this.onMessage("setSettings", (client, patch: Partial<Record<keyof RoomSettings, unknown>>) => {
  applySettingsPatch(this.state, client.sessionId, patch);
  this.refreshLobbyStatus();
});

this.onMessage("claimSeat", (client, message: { seatId?: SeatId }) => {
  const member = this.state.members.get(client.sessionId);
  applySeatClaim(this.state, client.sessionId, member?.displayName ?? "Guest", message.seatId ?? "red-1");
  this.refreshLobbyStatus();
});

this.onMessage("releaseSeat", (client) => {
  applySeatRelease(this.state, client.sessionId);
  this.refreshLobbyStatus();
});

this.onMessage("setCharacter", (client, message: { characterId?: string }) => {
  applyCharacterPick(this.state, client.sessionId, message.characterId ?? "");
  this.refreshLobbyStatus();
});

this.onMessage("setReady", (client, message: { ready?: boolean }) => {
  applyReady(this.state, client.sessionId, Boolean(message.ready));
  this.refreshLobbyStatus();
});
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- server/rooms/GravityCanyonRoom.messages.test.ts`

Expected: PASS.

Commit:

```bash
git add server/schema/GravityCanyonState.ts server/rooms/GravityCanyonRoom.ts server/rooms/GravityCanyonRoom.messages.test.ts
git commit -m "feat: support v1 lobby messages"
```

## Task 5: Host, Reconnect, Passive Spectators, And Invite Links

**Files:**
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Create: `server/rooms/GravityCanyonRoom.presence.test.ts`
- Create: `src/online/persistence.ts`
- Create: `src/online/persistence.test.ts`
- Modify: `src/onlineLobby.ts`

- [ ] **Step 1: Write presence tests**

Create `server/rooms/GravityCanyonRoom.presence.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLeave,
  applyReconnect,
  chooseNextHost,
  createInitialGravityCanyonState,
  createLobbyMember,
} from "./GravityCanyonRoom.js";

test("first joined member becomes host", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.members.set("session-a", createLobbyMember("session-a", "token-a", "Pilot A"));
  chooseNextHost(state);
  assert.equal(state.hostSessionId, "session-a");
});

test("host transfers to another connected member when host leaves", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.members.set("session-a", createLobbyMember("session-a", "token-a", "Pilot A"));
  state.members.set("session-b", createLobbyMember("session-b", "token-b", "Pilot B"));
  state.hostSessionId = "session-a";
  applyLeave(state, "session-a", 1000);
  chooseNextHost(state);
  assert.equal(state.hostSessionId, "session-b");
});

test("reconnect token restores the same member identity", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.members.set("old-session", createLobbyMember("old-session", "token-a", "Pilot A"));
  applyLeave(state, "old-session", 1000);
  const restored = applyReconnect(state, "new-session", "token-a", 1100);
  assert.equal(restored, true);
  assert.equal(state.members.has("old-session"), false);
  assert.equal(state.members.get("new-session")?.displayName, "Pilot A");
});
```

- [ ] **Step 2: Write browser persistence tests**

Create `src/online/persistence.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createInviteUrl, generatedDisplayName, roomIdFromUrl } from "./persistence.js";

test("generated display names are readable and bounded", () => {
  assert.match(generatedDisplayName("abc123"), /^Pilot-/);
  assert.ok(generatedDisplayName("abc123").length <= 18);
});

test("room id can be read from invite URL", () => {
  assert.equal(roomIdFromUrl("https://example.test/?room=abc123"), "abc123");
});

test("invite URL writes the room id into query params", () => {
  assert.equal(createInviteUrl("https://example.test/play", "room-7"), "https://example.test/play?room=room-7");
});
```

- [ ] **Step 3: Run failing tests**

Run: `npm run test -- server/rooms/GravityCanyonRoom.presence.test.ts src/online/persistence.test.ts`

Expected: FAIL because presence and persistence helpers do not exist.

- [ ] **Step 4: Implement presence helpers**

Modify `server/rooms/GravityCanyonRoom.ts`:

```ts
export function chooseNextHost(state: GravityCanyonState) {
  if (state.hostSessionId && state.members.get(state.hostSessionId)?.connected) {
    return;
  }

  const nextHost = Array.from(state.members.values()).find((member) => member.connected);
  state.hostSessionId = nextHost?.sessionId ?? "";
}

export function applyLeave(state: GravityCanyonState, sessionId: string, nowMs: number) {
  const member = state.members.get(sessionId);
  if (member) {
    member.connected = false;
    member.lastSeenMs = nowMs;
  }

  const seat = state.seats.find((candidate) => candidate.ownerSessionId === sessionId);
  if (seat) {
    seat.connected = false;
  }
}

export function applyReconnect(state: GravityCanyonState, newSessionId: string, reconnectToken: string, nowMs: number) {
  const oldEntry = Array.from(state.members.entries()).find(([, member]) => member.reconnectToken === reconnectToken);
  if (!oldEntry) {
    return false;
  }

  const [oldSessionId, member] = oldEntry;
  state.members.delete(oldSessionId);
  member.sessionId = newSessionId;
  member.connected = true;
  member.lastSeenMs = nowMs;
  state.members.set(newSessionId, member);

  const seat = state.seats.find((candidate) => candidate.ownerSessionId === oldSessionId);
  if (seat) {
    seat.ownerSessionId = newSessionId;
    seat.connected = true;
  }

  if (state.hostSessionId === oldSessionId) {
    state.hostSessionId = newSessionId;
  }

  return true;
}
```

- [ ] **Step 5: Implement client persistence helpers**

Create `src/online/persistence.ts`:

```ts
export function generatedDisplayName(seed: string) {
  const suffix = seed.replace(/[^\w]/g, "").slice(-5).padStart(5, "0");
  return `Pilot-${suffix}`.slice(0, 18);
}

export function roomIdFromUrl(href: string) {
  return new URL(href).searchParams.get("room") ?? "";
}

export function createInviteUrl(href: string, roomId: string) {
  const url = new URL(href);
  url.searchParams.set("room", roomId);
  return url.toString();
}

export function getOrCreateReconnectToken(storage: Pick<Storage, "getItem" | "setItem">, roomId: string) {
  const key = `gravity-canyon:reconnect:${roomId}`;
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  storage.setItem(key, token);
  return token;
}
```

- [ ] **Step 6: Wire join options and invite URL in `src/onlineLobby.ts`**

Send `displayName` and `reconnectToken` on create/join. On load, if `?room=` exists, show the name input and join action with the room field already filled.

```ts
const initialRoomId = roomIdFromUrl(window.location.href);
if (initialRoomId && roomCodeInput) {
  roomCodeInput.value = initialRoomId;
}

function joinOptions(roomId: string) {
  return {
    displayName: displayNameInput?.value || generatedDisplayName(roomId),
    reconnectToken: getOrCreateReconnectToken(window.localStorage, roomId || "new-room"),
  };
}
```

- [ ] **Step 7: Run tests and commit**

Run: `npm run test -- server/rooms/GravityCanyonRoom.presence.test.ts src/online/persistence.test.ts`

Expected: PASS.

Commit:

```bash
git add server/rooms/GravityCanyonRoom.ts src/online/persistence.ts src/online/persistence.test.ts src/onlineLobby.ts server/rooms/GravityCanyonRoom.presence.test.ts
git commit -m "feat: add v1 room presence"
```

## Task 6: Match Start, Round Flow, And Persistent Turn Order

**Files:**
- Create: `server/v1/turnOrder.ts`
- Create: `server/v1/turnOrder.test.ts`
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Create: `server/rooms/GravityCanyonRoom.match.test.ts`

- [ ] **Step 1: Write turn-order tests**

Create `server/v1/turnOrder.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { nextActiveSeat, seededTurnOrder } from "./turnOrder.js";

test("2v2 turn order includes every occupied seat once", () => {
  const order = seededTurnOrder(["red-1", "blue-1", "red-2", "blue-2"], 123);
  assert.equal(order.length, 4);
  assert.deepEqual(new Set(order), new Set(["red-1", "blue-1", "red-2", "blue-2"]));
});

test("same seed creates the same persistent order", () => {
  assert.deepEqual(
    seededTurnOrder(["red-1", "blue-1", "red-2", "blue-2"], 999),
    seededTurnOrder(["red-1", "blue-1", "red-2", "blue-2"], 999),
  );
});

test("next active seat skips eliminated seats", () => {
  assert.equal(nextActiveSeat(["red-1", "blue-1", "red-2"], "red-1", new Set(["blue-1"])), "red-2");
});

test("next active seat returns empty when one team has no active seats", () => {
  assert.equal(nextActiveSeat(["red-1", "blue-1"], "red-1", new Set(["blue-1"])), "");
});
```

- [ ] **Step 2: Write match-start tests**

Create `server/rooms/GravityCanyonRoom.match.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCharacterPick,
  applyReady,
  applySeatClaim,
  createInitialGravityCanyonState,
  startMatchIfReady,
} from "./GravityCanyonRoom.js";

test("match does not start until every active seat is ready", () => {
  const state = createInitialGravityCanyonState("room-a");
  applySeatClaim(state, "a", "A", "red-1");
  applyCharacterPick(state, "a", "nova");
  assert.equal(startMatchIfReady(state, "a", 1000), false);
  assert.equal(state.phase, "lobby");
});

test("1v1 match starts with selected map, spawned vehicles, and persistent order", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.hostSessionId = "host";
  state.settings.mode = "1v1";
  applySeatClaim(state, "host", "A", "red-1");
  applySeatClaim(state, "b", "B", "blue-1");
  applyCharacterPick(state, "host", "nova");
  applyCharacterPick(state, "b", "vesper");
  applyReady(state, "host", true);
  applyReady(state, "b", true);
  assert.equal(startMatchIfReady(state, "host", 1000), true);
  assert.equal(state.phase, "in-match");
  assert.equal(state.vehicles.length, 2);
  assert.equal(state.turnOrder.length, 2);
  assert.ok(state.activeSeatId);
});
```

- [ ] **Step 3: Run failing tests**

Run: `npm run test -- server/v1/turnOrder.test.ts server/rooms/GravityCanyonRoom.match.test.ts`

Expected: FAIL because turn-order and match-start helpers do not exist.

- [ ] **Step 4: Implement turn-order helpers**

Create `server/v1/turnOrder.ts`:

```ts
import type { SeatId } from "./rules.js";

export function seededTurnOrder(seatIds: readonly SeatId[], seed: number) {
  const remaining = [...seatIds];
  const ordered: SeatId[] = [];
  let cursor = Math.abs(seed) || 1;

  while (remaining.length) {
    cursor = (cursor * 1664525 + 1013904223) >>> 0;
    const index = cursor % remaining.length;
    ordered.push(remaining.splice(index, 1)[0]);
  }

  return ordered;
}

export function nextActiveSeat(order: readonly string[], currentSeatId: string, eliminatedSeatIds: Set<string>) {
  if (!order.length) {
    return "";
  }

  const startIndex = Math.max(0, order.indexOf(currentSeatId));
  for (let offset = 1; offset <= order.length; offset += 1) {
    const seatId = order[(startIndex + offset) % order.length];
    if (!eliminatedSeatIds.has(seatId)) {
      return seatId;
    }
  }

  return "";
}
```

- [ ] **Step 5: Implement match start**

Modify `server/rooms/GravityCanyonRoom.ts`:

```ts
export function startMatchIfReady(state: GravityCanyonState, sessionId: string, nowMs: number) {
  if (state.phase !== "lobby" || state.hostSessionId !== sessionId) {
    return false;
  }

  const activeSeats = state.seats.filter((seat) => seat.ownerSessionId);
  const requiredSeatCount = state.settings.mode === "1v1" ? 2 : 4;
  if (activeSeats.length !== requiredSeatCount || activeSeats.some((seat) => !isSeatReadyForStart(seat))) {
    state.status = "Waiting for every player to pick a character and ready up.";
    return false;
  }

  const seed = nowMs % 1_000_000;
  const selectedMap = pickMap(state.settings.mapPick as MapPick, seed);
  state.map.mapId = selectedMap.id;
  state.map.mapName = selectedMap.name;
  state.map.seed = seed + selectedMap.terrainSeedSalt;
  state.map.deathPlaneY = selectedMap.deathPlaneY;
  state.phase = "in-match";
  state.roundNumber = 1;
  state.redRoundWins = 0;
  state.blueRoundWins = 0;
  state.turnOrder.splice(0, state.turnOrder.length, ...seededTurnOrder(activeSeats.map((seat) => seat.seatId as SeatId), seed));
  state.activeSeatId = state.turnOrder[0] ?? "";
  state.turnEndsAtMs = nowMs + TURN_SECONDS * 1000;
  spawnVehiclesFromSeats(state, selectedMap);
  return true;
}
```

Wire `startMatch`:

```ts
this.onMessage("startMatch", (client) => {
  startMatchIfReady(this.state, client.sessionId, Date.now());
});
```

- [ ] **Step 6: Run tests and commit**

Run: `npm run test -- server/v1/turnOrder.test.ts server/rooms/GravityCanyonRoom.match.test.ts`

Expected: PASS.

Commit:

```bash
git add server/v1/turnOrder.ts server/v1/turnOrder.test.ts server/rooms/GravityCanyonRoom.ts server/rooms/GravityCanyonRoom.match.test.ts
git commit -m "feat: start v1 matches"
```

## Task 7: Authoritative Combat Types And Primary Weapons

**Files:**
- Create: `server/v1/combatTypes.ts`
- Create: `server/v1/weapons.ts`
- Create: `server/v1/weapons.test.ts`

- [ ] **Step 1: Write weapon tests**

Create `server/v1/weapons.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { weaponForCharacter } from "./weapons.js";

test("each v1 character has exactly one primary weapon", () => {
  assert.equal(weaponForCharacter("nova").name, "Canyon Breaker");
  assert.equal(weaponForCharacter("vesper").name, "Gravity Well");
  assert.equal(weaponForCharacter("kaelii").name, "Skip Roller");
  assert.equal(weaponForCharacter("perlah").name, "Sunspike Cluster");
});

test("weapon classes express distinct combat jobs", () => {
  assert.equal(weaponForCharacter("nova").terrainRadius, 92);
  assert.equal(weaponForCharacter("vesper").pullRadius, 150);
  assert.equal(weaponForCharacter("kaelii").rolling, true);
  assert.equal(weaponForCharacter("perlah").clusterCount, 5);
});

test("direct damage stays bounded for short playtest rounds", () => {
  for (const characterId of ["nova", "vesper", "kaelii", "perlah"] as const) {
    assert.ok(weaponForCharacter(characterId).directDamage <= 42);
    assert.ok(weaponForCharacter(characterId).splashDamage <= 30);
  }
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- server/v1/weapons.test.ts`

Expected: FAIL because `server/v1/weapons.ts` does not exist.

- [ ] **Step 3: Add combat types**

Create `server/v1/combatTypes.ts`:

```ts
import type { CharacterId, SeatId, TeamId } from "./rules.js";

export type FireCommand = {
  seatId: SeatId;
  angleDeg: number;
  power: number;
};

export type MoveCommand = {
  seatId: SeatId;
  direction: -1 | 1;
  units: number;
};

export type VehicleModel = {
  vehicleId: string;
  seatId: SeatId;
  ownerSessionId: string;
  displayName: string;
  team: TeamId;
  characterId: CharacterId;
  hp: number;
  maxHp: number;
  alive: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
};

export type ImpactEvent = {
  kind: "direct" | "splash" | "terrain" | "pull" | "knockback" | "void-dropped";
  vehicleId?: string;
  damage?: number;
  x: number;
  y: number;
};

export type CombatOutcome = {
  accepted: boolean;
  reason: string;
  events: ImpactEvent[];
  nextSeatId: string;
  roundWinnerTeam: TeamId | "";
};
```

- [ ] **Step 4: Add weapon definitions**

Create `server/v1/weapons.ts`:

```ts
import type { CharacterId } from "./rules.js";

export type PrimaryWeapon = {
  characterId: CharacterId;
  name: string;
  directDamage: number;
  splashDamage: number;
  splashRadius: number;
  terrainRadius: number;
  knockback: number;
  pullRadius: number;
  pullStrength: number;
  rolling: boolean;
  clusterCount: number;
  sfxKey: string;
  vfxKey: string;
};

const WEAPONS: Record<CharacterId, PrimaryWeapon> = {
  nova: {
    characterId: "nova",
    name: "Canyon Breaker",
    directDamage: 40,
    splashDamage: 24,
    splashRadius: 120,
    terrainRadius: 92,
    knockback: 76,
    pullRadius: 0,
    pullStrength: 0,
    rolling: false,
    clusterCount: 1,
    sfxKey: "nova-primary",
    vfxKey: "nova-canyon-breaker",
  },
  vesper: {
    characterId: "vesper",
    name: "Gravity Well",
    directDamage: 28,
    splashDamage: 18,
    splashRadius: 110,
    terrainRadius: 44,
    knockback: 0,
    pullRadius: 150,
    pullStrength: 84,
    rolling: false,
    clusterCount: 1,
    sfxKey: "vesper-primary",
    vfxKey: "vesper-gravity-well",
  },
  kaelii: {
    characterId: "kaelii",
    name: "Skip Roller",
    directDamage: 34,
    splashDamage: 20,
    splashRadius: 96,
    terrainRadius: 36,
    knockback: 48,
    pullRadius: 0,
    pullStrength: 0,
    rolling: true,
    clusterCount: 1,
    sfxKey: "kaelii-primary",
    vfxKey: "kaelii-skip-roller",
  },
  perlah: {
    characterId: "perlah",
    name: "Sunspike Cluster",
    directDamage: 30,
    splashDamage: 16,
    splashRadius: 82,
    terrainRadius: 38,
    knockback: 24,
    pullRadius: 0,
    pullStrength: 0,
    rolling: false,
    clusterCount: 5,
    sfxKey: "perlah-primary",
    vfxKey: "perlah-sunspike-cluster",
  },
};

export function weaponForCharacter(characterId: CharacterId) {
  return WEAPONS[characterId];
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- server/v1/weapons.test.ts`

Expected: PASS.

Commit:

```bash
git add server/v1/combatTypes.ts server/v1/weapons.ts server/v1/weapons.test.ts
git commit -m "feat: define v1 primary weapons"
```

## Task 8: Server-Authoritative Movement, Wind, Fire, Hits, And KOs

**Files:**
- Create: `server/v1/combat.ts`
- Create: `server/v1/combat.test.ts`
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Modify: `server/schema/GravityCanyonState.ts`

- [ ] **Step 1: Write combat tests**

Create `server/v1/combat.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveFire, resolveMove, rollWindForRound } from "./combat.js";
import type { VehicleModel } from "./combatTypes.js";

const redNova: VehicleModel = {
  vehicleId: "red-1",
  seatId: "red-1",
  ownerSessionId: "a",
  displayName: "A",
  team: "red",
  characterId: "nova",
  hp: 100,
  maxHp: 100,
  alive: true,
  x: 500,
  y: 600,
  facing: 1,
};

const blueVesper: VehicleModel = {
  vehicleId: "blue-1",
  seatId: "blue-1",
  ownerSessionId: "b",
  displayName: "B",
  team: "blue",
  characterId: "vesper",
  hp: 100,
  maxHp: 100,
  alive: true,
  x: 700,
  y: 600,
  facing: -1,
};

test("movement is capped and only active seat can move", () => {
  const result = resolveMove({
    activeSeatId: "red-1",
    vehicles: [redNova],
    command: { seatId: "red-1", direction: 1, units: 99 },
    terrain: flatTerrain(),
  });
  assert.equal(result.accepted, true);
  assert.equal(result.vehicles[0].x, 600);
});

test("firing is rejected when power is outside capped range", () => {
  const result = resolveFire({
    activeSeatId: "red-1",
    vehicles: [redNova, blueVesper],
    command: { seatId: "red-1", angleDeg: 45, power: 150 },
    terrain: flatTerrain(),
    wind: 0,
    friendlyFire: false,
    turnOrder: ["red-1", "blue-1"],
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "Power must be between 0 and 100.");
});

test("direct hit damages enemy vehicle and advances turn", () => {
  const result = resolveFire({
    activeSeatId: "red-1",
    vehicles: [redNova, blueVesper],
    command: { seatId: "red-1", angleDeg: 0, power: 50 },
    terrain: flatTerrain(),
    wind: 0,
    friendlyFire: false,
    turnOrder: ["red-1", "blue-1"],
  });
  assert.equal(result.accepted, true);
  assert.ok(result.events.some((event) => event.kind === "direct" && event.vehicleId === "blue-1"));
  assert.equal(result.nextSeatId, "blue-1");
});

test("friendly fire off prevents ally damage but keeps terrain effects", () => {
  const ally = { ...blueVesper, vehicleId: "red-2", seatId: "red-2", team: "red" as const };
  const result = resolveFire({
    activeSeatId: "red-1",
    vehicles: [redNova, ally],
    command: { seatId: "red-1", angleDeg: 0, power: 50 },
    terrain: flatTerrain(),
    wind: 0,
    friendlyFire: false,
    turnOrder: ["red-1", "red-2"],
  });
  assert.equal(result.events.some((event) => event.kind === "terrain"), true);
  assert.equal(result.events.some((event) => event.kind === "direct" && event.vehicleId === "red-2"), false);
});

test("fall below death plane creates Void Dropped event", () => {
  const result = resolveFire({
    activeSeatId: "red-1",
    vehicles: [redNova, { ...blueVesper, y: 940 }],
    command: { seatId: "red-1", angleDeg: 0, power: 50 },
    terrain: flatTerrain(),
    wind: 0,
    friendlyFire: false,
    turnOrder: ["red-1", "blue-1"],
  });
  assert.ok(result.events.some((event) => event.kind === "void-dropped"));
});

test("wind rerolls every round and can be neutral", () => {
  assert.equal(rollWindForRound(1, 0), 0);
  assert.equal(rollWindForRound(1, 1234), rollWindForRound(1, 1234));
});

function flatTerrain() {
  return {
    width: 2400,
    deathPlaneY: 900,
    surfaceY: 650,
  };
}
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- server/v1/combat.test.ts`

Expected: FAIL because `server/v1/combat.ts` does not exist.

- [ ] **Step 3: Implement deterministic combat core**

Create `server/v1/combat.ts` with:

```ts
import { TURN_SECONDS } from "./rules.js";
import { nextActiveSeat } from "./turnOrder.js";
import type { CombatOutcome, FireCommand, MoveCommand, VehicleModel } from "./combatTypes.js";
import { weaponForCharacter } from "./weapons.js";

const MAX_MOVE_PIXELS = 100;
const MAX_POWER = 100;
const MAX_AIM_DEG = 140;

export type TerrainModel = {
  width: number;
  deathPlaneY: number;
  surfaceY: number;
};

export function resolveMove(input: {
  activeSeatId: string;
  vehicles: readonly VehicleModel[];
  command: MoveCommand;
  terrain: TerrainModel;
}) {
  const vehicles = input.vehicles.map((vehicle) => ({ ...vehicle }));
  const active = vehicles.find((vehicle) => vehicle.seatId === input.activeSeatId);
  if (!active || active.seatId !== input.command.seatId) {
    return { accepted: false, reason: "Only the active seat can move.", vehicles };
  }

  const distance = Math.max(0, Math.min(MAX_MOVE_PIXELS, input.command.units * 10));
  active.x = clamp(active.x + distance * input.command.direction, 0, input.terrain.width);
  active.facing = input.command.direction;
  return { accepted: true, reason: "Moved.", vehicles };
}

export function resolveFire(input: {
  activeSeatId: string;
  vehicles: readonly VehicleModel[];
  command: FireCommand;
  terrain: TerrainModel;
  wind: number;
  friendlyFire: boolean;
  turnOrder: readonly string[];
}): CombatOutcome {
  const shooter = input.vehicles.find((vehicle) => vehicle.seatId === input.activeSeatId);
  if (!shooter || shooter.seatId !== input.command.seatId || !shooter.alive) {
    return rejected("Only the active living seat can fire.");
  }

  if (input.command.power < 0 || input.command.power > MAX_POWER) {
    return rejected("Power must be between 0 and 100.");
  }

  if (Math.abs(input.command.angleDeg) > MAX_AIM_DEG) {
    return rejected("Aim angle is outside the v1 tuning band.");
  }

  const weapon = weaponForCharacter(shooter.characterId);
  const events: CombatOutcome["events"] = [{ kind: "terrain", x: shooter.x + 180, y: input.terrain.surfaceY }];
  const target = input.vehicles.find((vehicle) => vehicle.alive && vehicle.seatId !== shooter.seatId);
  if (target && (input.friendlyFire || target.team !== shooter.team)) {
    events.push({ kind: "direct", vehicleId: target.vehicleId, damage: weapon.directDamage, x: target.x, y: target.y });
  }

  for (const vehicle of input.vehicles) {
    if (vehicle.alive && vehicle.y >= input.terrain.deathPlaneY) {
      events.push({ kind: "void-dropped", vehicleId: vehicle.vehicleId, x: vehicle.x, y: vehicle.y });
    }
  }

  const eliminatedSeatIds = new Set(
    events
      .filter((event) => event.kind === "void-dropped")
      .map((event) => input.vehicles.find((vehicle) => vehicle.vehicleId === event.vehicleId)?.seatId)
      .filter((seatId): seatId is string => Boolean(seatId)),
  );

  return {
    accepted: true,
    reason: "Resolved.",
    events,
    nextSeatId: nextActiveSeat(input.turnOrder, input.activeSeatId, eliminatedSeatIds),
    roundWinnerTeam: "",
  };
}

export function rollWindForRound(roundNumber: number, seed: number) {
  if (seed === 0) {
    return 0;
  }

  const raw = ((seed + roundNumber * 48271) % 25) - 12;
  return raw / 10;
}

export function turnDeadline(nowMs: number) {
  return nowMs + TURN_SECONDS * 1000;
}

function rejected(reason: string): CombatOutcome {
  return { accepted: false, reason, events: [], nextSeatId: "", roundWinnerTeam: "" };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
```

This first server core is intentionally deterministic and bounded. After tests pass, port the richer local projectile math from `src/main.ts` into `server/v1/combat.ts` behind the same public function signatures, then update tests with concrete expected events.

- [ ] **Step 4: Wire room messages**

In `server/rooms/GravityCanyonRoom.ts`, add:

```ts
this.onMessage("move", (client, command: MoveCommand) => {
  this.applyMove(client.sessionId, command);
});

this.onMessage("fire", (client, command: FireCommand) => {
  this.applyFire(client.sessionId, command);
});
```

`applyMove` validates that the session owns `activeSeatId`; `applyFire` resolves combat, stores events, advances the active seat, starts the 20 second timer, and moves to `round-over` when one team has no living vehicles.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- server/v1/combat.test.ts`

Expected: PASS.

Commit:

```bash
git add server/v1/combat.ts server/v1/combat.test.ts server/rooms/GravityCanyonRoom.ts server/schema/GravityCanyonState.ts
git commit -m "feat: resolve v1 combat on server"
```

## Task 9: Client Lobby UI For V1 Room Flow

**Files:**
- Create: `src/online/messages.ts`
- Create: `src/online/renderRoom.ts`
- Modify: `src/onlineLobby.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Add client message and snapshot types**

Create `src/online/messages.ts`:

```ts
export type ClientMessage =
  | "setDisplayName"
  | "setSettings"
  | "claimSeat"
  | "releaseSeat"
  | "setCharacter"
  | "setReady"
  | "startMatch"
  | "move"
  | "fire"
  | "sendPhrase";

export type RoomSeatSnapshot = {
  seatId: string;
  team: "red" | "blue";
  slot: number;
  ownerSessionId: string;
  displayName: string;
  characterId: string;
  ready: boolean;
  connected: boolean;
};

export type RoomSettingsSnapshot = {
  mode: "1v1" | "2v2";
  matchLength: "best-of-1" | "best-of-3";
  mapPick: string;
  friendlyFire: boolean;
};
```

- [ ] **Step 2: Add render helper tests**

Create `src/online/renderRoom.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { canStartLabel, seatLabel } from "./renderRoom.js";

test("seat labels show player and character", () => {
  assert.equal(
    seatLabel({ displayName: "Pilot A", characterId: "nova", seatId: "red-1", team: "red", slot: 1, ownerSessionId: "a", ready: true, connected: true }),
    "Pilot A - Nova",
  );
});

test("empty seat labels invite player choice", () => {
  assert.equal(
    seatLabel({ displayName: "", characterId: "", seatId: "blue-1", team: "blue", slot: 1, ownerSessionId: "", ready: false, connected: false }),
    "Blue Seat 1",
  );
});

test("start label nudges players to ready when blocked", () => {
  assert.equal(canStartLabel(false), "Ask players to ready");
  assert.equal(canStartLabel(true), "Start match");
});
```

- [ ] **Step 3: Implement render helpers**

Create `src/online/renderRoom.ts`:

```ts
import type { RoomSeatSnapshot } from "./messages.js";

const CHARACTER_NAMES: Record<string, string> = {
  nova: "Nova",
  vesper: "Vesper",
  kaelii: "Kaelii",
  perlah: "Perlah",
};

export function seatLabel(seat: RoomSeatSnapshot) {
  if (!seat.ownerSessionId) {
    return `${capitalize(seat.team)} Seat ${seat.slot}`;
  }

  return `${seat.displayName} - ${CHARACTER_NAMES[seat.characterId] ?? "No Character"}`;
}

export function canStartLabel(canStart: boolean) {
  return canStart ? "Start match" : "Ask players to ready";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

- [ ] **Step 4: Replace preview UI in `src/onlineLobby.ts`**

Remove preview-specific controls:

```ts
// Remove these data actions from the HTML template:
// data-test-capsule
// data-preview-fire
// data-next-round
// data-nameplate-select
```

Add V1 controls:

```html
<div class="online-panel__settings" data-settings-block>
  <select data-mode-select aria-label="Game mode">
    <option value="2v2">2v2</option>
    <option value="1v1">1v1</option>
  </select>
  <select data-length-select aria-label="Match length">
    <option value="best-of-1">Best of 1</option>
    <option value="best-of-3">Best of 3</option>
  </select>
  <select data-map-select aria-label="Map">
    <option value="random">Random map</option>
    <option value="mesa-ribs">Mesa Ribs</option>
    <option value="split-arch">Split Arch</option>
    <option value="crater-steps">Crater Steps</option>
    <option value="wind-bridge">Wind Bridge</option>
    <option value="basin-ridge">Basin Ridge</option>
  </select>
  <label><input type="checkbox" data-friendly-fire /> Friendly fire</label>
</div>
<div class="online-panel__seats" data-seat-list></div>
<div class="online-panel__characters" data-character-list></div>
<button type="button" data-release-seat>Unseat</button>
<button type="button" data-start-match>Start</button>
```

Wire controls to the server messages in `src/online/messages.ts`.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/online/renderRoom.test.ts`

Expected: PASS.

Run: `npm run build:client`

Expected: PASS.

Commit:

```bash
git add src/online/messages.ts src/online/renderRoom.ts src/online/renderRoom.test.ts src/onlineLobby.ts src/style.css
git commit -m "feat: build v1 online lobby"
```

## Task 10: Online Match Rendering And Input Adapter

**Files:**
- Modify: `src/main.ts`
- Create: `src/online/matchAdapter.ts`
- Create: `src/online/matchAdapter.test.ts`
- Modify: `src/onlineLobby.ts`

- [ ] **Step 1: Write adapter tests**

Create `src/online/matchAdapter.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { canLocalPlayerAct, powerToServerValue } from "./matchAdapter.js";

test("only active owner can act", () => {
  assert.equal(canLocalPlayerAct("session-a", "session-a", true, false), true);
  assert.equal(canLocalPlayerAct("session-a", "session-b", true, false), false);
  assert.equal(canLocalPlayerAct("session-a", "session-a", false, false), false);
  assert.equal(canLocalPlayerAct("session-a", "session-a", true, true), false);
});

test("power bar sends capped server values", () => {
  assert.equal(powerToServerValue(-10), 0);
  assert.equal(powerToServerValue(42), 42);
  assert.equal(powerToServerValue(150), 100);
});
```

- [ ] **Step 2: Implement adapter helpers**

Create `src/online/matchAdapter.ts`:

```ts
export function canLocalPlayerAct(
  localSessionId: string,
  activeOwnerSessionId: string,
  alive: boolean,
  projectileInFlight: boolean,
) {
  return localSessionId === activeOwnerSessionId && alive && !projectileInFlight;
}

export function powerToServerValue(power: number) {
  return Math.max(0, Math.min(100, Math.round(power)));
}
```

- [ ] **Step 3: Add online snapshot ingestion to `src/main.ts`**

Expose one narrow entrypoint from the Phaser scene:

```ts
type OnlineMatchSnapshot = {
  phase: string;
  vehicles: VehicleState[];
  activeSeatId: string;
  turnOrder: string[];
  wind: number;
  map: { mapId: string; seed: number; deathPlaneY: number };
};

window.dispatchEvent(new CustomEvent("gravity-canyon:scene-ready", { detail: this }));
```

Add a scene method:

```ts
applyOnlineSnapshot(snapshot: OnlineMatchSnapshot) {
  if (snapshot.phase !== "in-match" && snapshot.phase !== "round-over" && snapshot.phase !== "match-over") {
    return;
  }

  this.wind = snapshot.wind;
  this.turnOrder = snapshot.turnOrder;
  this.activeVehicleId = snapshot.activeSeatId;
  this.vehicles = snapshot.vehicles;
  this.shotResult = snapshot.phase === "round-over" ? "Round over" : "Online match";
}
```

Keep local mode working by only using this method when the online room is connected.

- [ ] **Step 4: Send move/fire commands from the active local seat**

In `src/main.ts`, when online mode is active:

```ts
onlineRoom.send("move", {
  seatId: active.seatId,
  direction,
  units: Math.round(moveUnits),
});

onlineRoom.send("fire", {
  seatId: active.seatId,
  angleDeg: Math.round(active.angle),
  power: powerToServerValue(this.power),
});
```

- [ ] **Step 5: Run tests, build, and commit**

Run: `npm run test -- src/online/matchAdapter.test.ts`

Expected: PASS.

Run: `npm run build:client`

Expected: PASS.

Commit:

```bash
git add src/main.ts src/online/matchAdapter.ts src/online/matchAdapter.test.ts src/onlineLobby.ts
git commit -m "feat: connect online match input"
```

## Task 11: Preset Phrases And Passive Spectator Notices

**Files:**
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Create: `server/rooms/GravityCanyonRoom.phrases.test.ts`
- Modify: `src/onlineLobby.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`

- [ ] **Step 1: Write phrase tests**

Create `server/rooms/GravityCanyonRoom.phrases.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPhrase,
  applySeatClaim,
  createCombatVehicleState,
  createInitialGravityCanyonState,
} from "./GravityCanyonRoom.js";

test("seated player can send a locked preset phrase", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.phase = "in-match";
  state.activeSeatId = "red-1";
  applySeatClaim(state, "session-a", "Pilot A", "red-1");
  state.vehicles.push(
    createCombatVehicleState({
      vehicleId: "red-1",
      seatId: "red-1",
      ownerSessionId: "session-a",
      displayName: "Pilot A",
      team: "red",
      characterId: "nova",
      x: 500,
      y: 600,
      facing: 1,
    }),
  );
  const accepted = applyPhrase(state, "session-a", "Hi", 1000);
  assert.equal(accepted, true);
  assert.equal(state.phraseBubbles.length, 1);
});

test("unknown phrase is rejected", () => {
  const state = createInitialGravityCanyonState("room-a");
  assert.equal(applyPhrase(state, "session-a", "custom text", 1000), false);
});
```

- [ ] **Step 2: Implement phrase allowlist**

In `server/rooms/GravityCanyonRoom.ts`:

```ts
const PRESET_PHRASES = new Set(["Hi", "Yes", "No", "Nice", "Oops", "Taunt", "Bye"]);

export function applyPhrase(state: GravityCanyonState, sessionId: string, phrase: string, nowMs: number) {
  if (!PRESET_PHRASES.has(phrase)) {
    return false;
  }

  const seat = state.seats.find((candidate) => candidate.ownerSessionId === sessionId);
  const vehicle = state.vehicles.find((candidate) => candidate.seatId === seat?.seatId);
  if (!seat || !vehicle) {
    return false;
  }

  const bubble = new PhraseBubbleState();
  bubble.id = `${vehicle.vehicleId}-${nowMs}`;
  bubble.vehicleId = vehicle.vehicleId;
  bubble.phrase = phrase;
  bubble.expiresAtMs = nowMs + 2500;
  state.phraseBubbles.push(bubble);
  return true;
}
```

- [ ] **Step 3: Add click-character phrase popup**

In `src/main.ts`, character click opens a compact popup with the allowed phrases. It sends `sendPhrase` and closes without affecting combat actions.

```ts
onlineRoom.send("sendPhrase", {
  vehicleId: clickedVehicle.id,
  phrase,
});
```

- [ ] **Step 4: Add passive spectator notices**

In `src/onlineLobby.ts`, show:

```html
<p class="online-panel__spectator" data-spectator-notice hidden>
  Match is in progress. You can watch this room until it returns to the lobby.
</p>
```

Only users present before the match started can receive match snapshots. New visitors to an in-match URL see the waiting notice and can auto-update when the room returns to lobby.

- [ ] **Step 5: Run tests, build, and commit**

Run: `npm run test -- server/rooms/GravityCanyonRoom.phrases.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Commit:

```bash
git add server/rooms/GravityCanyonRoom.ts server/rooms/GravityCanyonRoom.phrases.test.ts src/onlineLobby.ts src/main.ts src/style.css
git commit -m "feat: add v1 preset phrases"
```

## Task 12: Disconnection Rules And Turn Timeout

**Files:**
- Modify: `server/rooms/GravityCanyonRoom.ts`
- Create: `server/rooms/GravityCanyonRoom.timeout.test.ts`

- [ ] **Step 1: Write timeout tests**

Create `server/rooms/GravityCanyonRoom.timeout.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { applyTurnTimeout, createInitialGravityCanyonState } from "./GravityCanyonRoom.js";

test("connected player timeout skips after the normal turn clock", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.phase = "in-match";
  state.turnOrder.push("red-1", "blue-1");
  state.activeSeatId = "red-1";
  state.turnEndsAtMs = 2000;
  applyTurnTimeout(state, 2001);
  assert.equal(state.activeSeatId, "blue-1");
});

test("disconnected active player uses shorter skip window", () => {
  const state = createInitialGravityCanyonState("room-a");
  state.phase = "in-match";
  state.turnOrder.push("red-1", "blue-1");
  state.activeSeatId = "red-1";
  state.turnEndsAtMs = 100_000;
  const seat = state.seats.find((candidate) => candidate.seatId === "red-1");
  if (seat) {
    seat.connected = false;
    seat.lastDisconnectedAtMs = 0;
  }
  applyTurnTimeout(state, 5001);
  assert.equal(state.activeSeatId, "blue-1");
});
```

- [ ] **Step 2: Implement timeout handling**

In `server/rooms/GravityCanyonRoom.ts`, add a simulation interval:

```ts
this.setSimulationInterval(() => {
  applyTurnTimeout(this.state, Date.now());
}, 250);
```

Add the helper:

```ts
export function applyTurnTimeout(state: GravityCanyonState, nowMs: number) {
  if (state.phase !== "in-match" || !state.activeSeatId) {
    return;
  }

  const seat = state.seats.find((candidate) => candidate.seatId === state.activeSeatId);
  const disconnectedDeadline = (seat?.lastDisconnectedAtMs ?? 0) + DISCONNECTED_SKIP_SECONDS * 1000;
  const deadline = seat?.connected === false ? Math.min(state.turnEndsAtMs, disconnectedDeadline) : state.turnEndsAtMs;
  if (nowMs < deadline) {
    return;
  }

  state.activeSeatId = nextActiveSeat(Array.from(state.turnOrder), state.activeSeatId, eliminatedSeats(state));
  state.turnEndsAtMs = nowMs + TURN_SECONDS * 1000;
}
```

- [ ] **Step 3: Run tests and commit**

Run: `npm run test -- server/rooms/GravityCanyonRoom.timeout.test.ts`

Expected: PASS.

Run: `npm run build:server`

Expected: PASS.

Commit:

```bash
git add server/rooms/GravityCanyonRoom.ts server/schema/GravityCanyonState.ts server/rooms/GravityCanyonRoom.timeout.test.ts
git commit -m "feat: enforce v1 turn timeouts"
```

## Task 13: Art, VFX, And Primary Weapon SFX Integration

**Files:**
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Add assets under: `public/assets/`
- Update: `docs/SPRITE_ASSET_WORKFLOW.md`
- Update: `docs/VERSION_LOG.md`

- [ ] **Step 1: Verify runtime asset filenames**

Run:

```bash
npm run verify:runtime-roster
```

Expected: PASS.

- [ ] **Step 2: Add one unique primary action sound per character**

Add these files under `public/assets/`:

```text
public/assets/sfx-nova-primary.mp3
public/assets/sfx-vesper-primary.mp3
public/assets/sfx-kaelii-primary.mp3
public/assets/sfx-perlah-primary.mp3
```

Load them in `src/main.ts`:

```ts
this.load.audio("nova-primary", "assets/sfx-nova-primary.mp3");
this.load.audio("vesper-primary", "assets/sfx-vesper-primary.mp3");
this.load.audio("kaelii-primary", "assets/sfx-kaelii-primary.mp3");
this.load.audio("perlah-primary", "assets/sfx-perlah-primary.mp3");
```

Play the key named by the authoritative weapon result. No KO voices or shout packs are part of V1.

- [ ] **Step 3: Add readable weapon VFX**

Use the `vfxKey` from the server weapon definition to choose client effects:

```ts
const VFX_COLORS: Record<string, number> = {
  "nova-canyon-breaker": 0xf25f5c,
  "vesper-gravity-well": 0x7f7cff,
  "kaelii-skip-roller": 0x36d399,
  "perlah-sunspike-cluster": 0xffc857,
};
```

Effects must show impact class without hiding terrain, player labels, HP bars, or hit markers.

- [ ] **Step 4: Add team readability treatment for duplicate characters**

In `src/main.ts`, keep base character art unchanged and tint only the vehicle rim, nameplate, HP bar, and active ring by team. Four Novas must remain identifiable by display name, seat/team color, and turn-order UI.

- [ ] **Step 5: Build and commit**

Run: `npm run build`

Expected: PASS.

Commit:

```bash
git add src/main.ts src/style.css public/assets docs/SPRITE_ASSET_WORKFLOW.md docs/VERSION_LOG.md
git commit -m "feat: add v1 weapon feedback"
```

## Task 14: Hosted Deployment Configuration

**Files:**
- Modify: `README.md`
- Modify: `server/index.ts`
- Modify: `src/onlineLobby.ts`
- Create: `docs/DEPLOYMENT_PLAYTEST_ALPHA.md`

- [ ] **Step 1: Add deployment doc**

Create `docs/DEPLOYMENT_PLAYTEST_ALPHA.md`:

```md
# V1 Playtest Alpha Deployment

Gravity Canyon V1 is a private-room playtest alpha. Anyone with a room URL can attempt to join the room. There are no accounts, ranking, public room list, persistence, or moderation tools in V1.

## Required Environment

- `VITE_COLYSEUS_URL`: websocket URL used by the browser client.
- `PORT`: HTTP port for the Colyseus server.

## Smoke Test

1. Open the hosted client.
2. Create a room.
3. Copy the URL with `?room=<roomId>`.
4. Join from three more browser contexts or devices.
5. Claim four seats, pick characters, ready, and start.
6. Confirm movement, wind, fire, hit feedback, turn order, round result, and room return.
```

- [ ] **Step 2: Make server host/port deployment-friendly**

In `server/index.ts`, read `HOST` and `PORT` with local defaults:

```ts
const port = Number(process.env.PORT ?? 2567);
const host = process.env.HOST ?? "127.0.0.1";
```

- [ ] **Step 3: Confirm client websocket config**

Keep `VITE_COLYSEUS_URL` support in `src/onlineLobby.ts`. For HTTPS-hosted client pages, the default URL must use `wss`.

- [ ] **Step 4: Run build and commit**

Run: `npm run build`

Expected: PASS.

Commit:

```bash
git add README.md server/index.ts src/onlineLobby.ts docs/DEPLOYMENT_PLAYTEST_ALPHA.md
git commit -m "docs: add v1 deployment smoke test"
```

## Task 15: Final V1 Acceptance Pass

**Files:**
- Modify: `README.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `docs/VERSION_LOG.md`
- Run: `npm run docs:html`

- [ ] **Step 1: Run automated verification**

Run:

```bash
npm run test
npm run build
npm run docs:html
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run four-client local smoke test**

Start:

```bash
npm run dev
```

Open four browser contexts at `http://127.0.0.1:5173`.

Verify:

- Room creator receives a shareable URL with `?room=`.
- Four connections can claim seats in a 2v2 room.
- One person can use a second browser context to control a second same-team seat.
- Four of the same character can be selected.
- Lobby shows display name and character for every occupied seat.
- Host can change settings before match start.
- Start button is enabled only when required seats are ready; blocked start nudges players to ready.
- Match starts with a server-selected random map or selected map.
- Turn order is visible and persists through the match.
- Wind is visible and changes by round.
- Active player can move, aim, charge power, and fire once.
- Server resolves damage, terrain effects, knockback or pull, and Void Dropped KOs.
- Friendly fire setting affects vehicle damage and does not remove terrain impact.
- Disconnected active player is skipped after the short skip window.
- Preset phrase bubbles appear over the selected character and fade.
- Round result appears briefly, then the same room continues or returns according to match result.
- Room remains alive while at least one player remains.

- [ ] **Step 3: Run real playtest acceptance**

Schedule one session with four real connections. The V1 pass condition is not balance perfection; it is reliable playable feedback:

- People can join without developer help.
- They understand whose turn it is.
- They can tell wind, damage, terrain impact, and KOs happened.
- The room does not break when someone disconnects.
- At least one full 2v2 match completes.
- Feedback produces a concrete V2 list without changing the V1 contract.

- [ ] **Step 4: Update docs and generated HTML**

Update:

```text
README.md
docs/SESSION_HANDOFF.md
docs/VERSION_LOG.md
```

Run:

```bash
npm run docs:html
```

Expected: generated HTML docs include the latest acceptance status.

- [ ] **Step 5: Commit the acceptance checkpoint**

Commit:

```bash
git add README.md README.html docs/SESSION_HANDOFF.md docs/SESSION_HANDOFF.html docs/VERSION_LOG.md docs/VERSION_LOG.html docs/index.html
git commit -m "docs: record v1 playtest acceptance"
```

## Acceptance Mapping

- Hosted private room: Tasks 5, 9, 14, 15.
- 1v1 and 2v2 modes: Tasks 1, 3, 4, 6, 15.
- Seat ownership, unseating, one connection per seat: Tasks 3, 4, 5, 9.
- Four real players and one player using a second connection: Tasks 4, 5, 15.
- Display names plus character labels: Tasks 5, 9, 13, 15.
- Same-character picks allowed: Tasks 4, 13, 15.
- Best-of-1 and best-of-3 room setting: Tasks 1, 4, 6, 15.
- Server-selected or selected map: Tasks 2, 6, 15.
- Persistent generated turn order per game: Task 6.
- 20 second committed turn and disconnected skip: Tasks 1, 12.
- Continuous power charge with max cap: Tasks 8, 10.
- Wind every round with neutral possible: Tasks 2, 8, 15.
- One primary weapon per character: Tasks 7, 8, 13.
- Terrain damage, direct/splash hits, knockback/pull, Void Dropped: Task 8.
- Friendly fire as room setting: Tasks 1, 4, 8, 15.
- Preset phrase bubbles without match chat: Task 11.
- Passive spectators only for already-present room members: Tasks 5, 11.
- Automated tests for AI-development confidence: Tasks 1 through 15.

## Out-Of-Scope Guardrails

Reject these during V1 unless the user explicitly says `I am requesting a v1 contract change.`:

- Public room list, matchmaking, ranking, accounts, friend invites, or persistent profiles.
- More than four characters.
- Extra weapons, specials, items, or class passives.
- KO voice packs, shouts, announcers, music, or cosmetic sound packs.
- Mobile-first controls, touch accessibility pass, or full responsive redesign.
- Chat feed, custom text chat, kick/ban/moderation tools, profanity system, or reporting.
- Progression, rewards, currency, unlocks, or post-match persistent records.
- Balance restrictions on duplicate characters.
- Mid-match setting changes.
- Public security model beyond private room URL access.

## Self-Review

- Spec coverage: every section of `docs/V1_PLAYTEST_ALPHA.html` maps to at least one task in Acceptance Mapping.
- Scope pressure: sound, art, duplicate characters, and room settings are included only at the V1 level the contract allows.
- Type consistency: server types use `SeatId`, `TeamId`, `CharacterId`, `RoomSettings`, `VehicleModel`, and `CombatOutcome` across rules, room state, turn order, weapons, and combat tasks.
- Execution shape: each task has a test command, expected result, implementation target, and commit checkpoint.
