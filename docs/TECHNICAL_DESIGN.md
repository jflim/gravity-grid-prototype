# Gravity Canyon Technical Design Document

Status: living technical design  
Last updated: 2026-06-14  
Design reference: [GDD.md](GDD.md)  
Current scope authority: [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md)  
Runbook: [../README.md](../README.md)

## 1. Document Purpose

This Technical Design Document (TDD) describes how Gravity Canyon should be implemented for the current v1 playtest alpha. It is written from the implementer's point of view.

The GDD describes the game from the player and product point of view. The Production Plan defines what is allowed in the current milestone. This TDD translates those decisions into architecture, state ownership, module boundaries, message contracts, data models, validation rules, testing strategy, and deployment expectations.

In this repository, TDD means Technical Design Document. It does not mean test-driven development.

## 2. Current Technical Baseline

Gravity Canyon currently has two partially separate systems:

- The local Phaser prototype in [../src/main.ts](../src/main.ts) owns the full playable artillery loop.
- The Colyseus room in [../server/rooms/GravityCanyonRoom.ts](../server/rooms/GravityCanyonRoom.ts) owns a lightweight online room and combat preview.

Current local Phaser features include:

- Four local units in a 2v2-style roster.
- Movement, facing, aim, charge, fire, projectile flight, wind, destructible terrain, HP damage, knockback, and Void Dropped eliminations.
- Vehicle-only hit zones and collision-zone overlays.
- Ringworks Basin as the local default playable map.
- Fixed command deck and desktop viewport contract.

Current Colyseus features include:

- Room create/join.
- Guest display names.
- Two-player placeholder room capacity.
- Ready checks.
- Placeholder nameplate/capsule state.
- Combat preview state with HP, active vehicle, wind, turn number, and winner.

The main technical gap is that online v1 must run the real match through server-owned state and deterministic combat resolution. The existing online preview is not the final combat system.

## 3. V1 Technical Goal

The v1 technical goal is:

> A hosted private-room 1v1/2v2 artillery match where the server owns room state, seats, settings, match setup, turn order, movement legality, aim/fire validation, projectile simulation, terrain deformation, damage, KOs, Void Dropped eliminations, score, and match result.

Client responsibilities:

- Render the game.
- Capture player input.
- Show responsive local feedback where safe.
- Send intent messages to the server.
- Animate server-approved match events.
- Reconcile to server state when local prediction differs.

Server responsibilities:

- Own truth.
- Validate all gameplay inputs.
- Advance turn and match state.
- Resolve combat deterministically.
- Broadcast state and events to every connected client.

## 4. Non-Goals

Not part of v1 technical design:

- Ranked matchmaking.
- Public room list.
- Accounts.
- Persistent inventory.
- Durable rewards.
- Real-money purchases.
- Full anti-cheat.
- Rollback netcode.
- Mobile controls.
- Voice chat.
- Free-text chat.
- Mature/adult-only asset delivery.
- Public CDN/production hosting architecture.

These may be future technical designs, but they should not complicate the v1 implementation.

## 5. Runtime Topology

### Local Development

Local development uses two services:

- Vite client at `http://127.0.0.1:5173`.
- Colyseus server at `ws://127.0.0.1:2567`.

The command is:

```powershell
npm run dev
```

### Public Playtest From This Computer

Playtest mode builds the client and serves both client and Colyseus server from one local port:

```powershell
npm run playtest
```

Expected local origin:

```text
http://127.0.0.1:2567
```

`npm run playtest` starts a Cloudflare quick tunnel and prints a public URL. The game remains bound to localhost unless `HOST=0.0.0.0` is explicitly set.

Security boundary:

- Serve only built `dist` files.
- Serve `/healthz`.
- Serve `/runtime-config.js`.
- Serve Colyseus WebSocket room traffic.
- Do not expose source files, local filesystem, shell access, editor access, or admin machine capabilities.

### Future Hosted Deployment

Later deployment may use a managed host, VPS, container host, object storage/CDN, or separate static/client and Node server infrastructure. This is infrastructure scope, not v1 gameplay scope.

The technical design should not assume Cloudflare Tunnel forever. It should assume the browser can load a static client and connect to a WebSocket endpoint.

## 6. Source Of Truth

| Area | Source Of Truth | Notes |
| --- | --- | --- |
| Room membership | Colyseus room | No database in v1. |
| Display name | Colyseus player state | Guest name only. |
| Host | Colyseus room | First connected player, transferred on leave. |
| Room settings | Colyseus room | Locked after match start. |
| Seats | Colyseus room | Seat ownership uses connection/session token. |
| Character selection | Colyseus room | Four v1 characters only. |
| Match score | Colyseus room | Ephemeral, room-scoped. |
| Turn order | Server match state | Generated at match start. |
| Wind | Server round state | Generated per round. |
| Terrain | Server round state | Heightmap plus server-approved diffs. |
| Vehicle position | Server round state | Client may predict active player movement. |
| Vehicle HP/alive state | Server round state | Client renders only. |
| Projectile result | Server simulation | Client animates approved path/result. |
| Cosmetics | Player/session state | Cosmetic only, no combat effects. |
| Turn timer | Shared v1 rules constant | Current implementation constant is 20 seconds. |

## 7. Recommended Module Boundaries

The current codebase already has pure logic modules in `src` and contract modules in `server/v1`. For server-authoritative combat, new logic should be extracted into Phaser-free, Node-free shared modules.

Recommended target shape:

```text
shared/
  v1/
    constants.ts
    roomRules.ts
    maps.ts
    roster.ts
    weapons.ts
  simulation/
    terrain.ts
    movement.ts
    projectile.ts
    collision.ts
    damage.ts
    turnOrder.ts
    round.ts
    match.ts
server/
  rooms/
    GravityCanyonRoom.ts
  schema/
    GravityCanyonState.ts
  services/
    matchController.ts
src/
  main.ts
  onlineLobby.ts
  net/
    roomClient.ts
  presentation/
    matchSceneAdapter.ts
```

Conservative migration rule:

- Do not rewrite `src/main.ts` in one giant pass.
- Extract pure deterministic functions first.
- Keep Phaser rendering code client-side.
- Keep Colyseus schema and network messages server-side.
- Share only pure data types and simulation functions.

Existing pure modules such as `projectileCollision.ts`, `vehicleHitZone.ts`, `combatRules.ts`, `playableMaps.ts`, `server/v1/rules.ts`, and `server/v1/maps.ts` should guide the shape of shared simulation code.

## 8. Colyseus Room Lifecycle

Room phases should become:

| Phase | Meaning | Allowed Client Actions |
| --- | --- | --- |
| `lobby` | Room exists, players can join and choose seats/settings. | Set display name, claim/release seat, select character, set ready, host settings. |
| `starting` | Server is creating match state. | None except leave/reconnect. |
| `round-intro` | Round state is available, client can load/render. | Client ready acknowledgement if needed. |
| `turn-active` | One vehicle can move, aim, charge, and fire. | Active owner sends movement/aim/fire intents. Others may send phrases only. |
| `shot-resolving` | Server has accepted a shot and is resolving/broadcasting result. | No gameplay input. |
| `round-over` | Round result shown, score updated. | None except leave/reconnect. |
| `match-over` | Match result shown, returning to lobby. | Return to lobby acknowledgement. |

The current `combat-preview` phase should be removed when the real online match is implemented.

## 9. Core Data Model

### Room Settings

```ts
type RoomSettings = {
  mode: "1v1" | "2v2";
  matchLength: "best-of-1" | "best-of-3";
  mapPick: "random" | V1MapId;
  friendlyFire: false;
};
```

`friendlyFire` is currently fixed false for v1. If a future playtest setting is added, it requires Product Plan review before becoming v1.

### Player

```ts
type PlayerState = {
  sessionId: string;
  reconnectTokenHash?: string;
  displayName: string;
  joinedAt: number;
  host: boolean;
  ready: boolean;
  seatIds: SeatId[];
  connected: boolean;
  disconnectedAt?: number;
};
```

### Seat

```ts
type SeatState = {
  seatId: "red-1" | "blue-1" | "red-2" | "blue-2";
  team: "red" | "blue";
  slot: 1 | 2;
  ownerSessionId?: string;
  ownerReconnectTokenHash?: string;
  characterId?: "nova" | "vesper" | "kaelii" | "perlah";
};
```

### Match

```ts
type MatchState = {
  matchId: string;
  settings: RoomSettings;
  phase: RoomPhase;
  roundNumber: number;
  redScore: number;
  blueScore: number;
  turnOrder: VehicleId[];
  activeTurnIndex: number;
  winnerTeam?: TeamId;
};
```

### Round

```ts
type RoundState = {
  roundId: string;
  mapId: V1MapId;
  mapSeed: number;
  wind: number;
  terrain: TerrainState;
  vehicles: VehicleState[];
  activeVehicleId?: string;
  turnStartedAt?: number;
  turnEndsAt?: number;
  lastShot?: ShotResult;
};
```

### Vehicle

```ts
type VehicleState = {
  vehicleId: string;
  seatId: SeatId;
  ownerSessionId: string;
  team: TeamId;
  characterId: CharacterId;
  displayName: string;
  x: number;
  y: number;
  facing: 1 | -1;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  defeatReason?: "damage" | "void";
  movementUsed: number;
};
```

### Terrain

```ts
type TerrainState = {
  worldWidth: number;
  deathPlaneY: number;
  visibleVoidTopY: number;
  voidSurfaceY: number;
  heightmap: number[];
  revision: number;
};
```

Heightmap convention:

- `heightmap[x]` is the terrain surface Y at integer X.
- Higher Y means lower on screen.
- A value at or beyond the void threshold means no safe terrain at that X.
- The server increments `revision` after every terrain change.

### Shot Result

```ts
type ShotResult = {
  shotId: string;
  shooterVehicleId: string;
  angle: number;
  power: number;
  wind: number;
  path: readonly Point[];
  impact?: ImpactEvent;
  terrainDiffs: readonly TerrainDiff[];
  vehicleDiffs: readonly VehicleDiff[];
  combatEvents: readonly CombatEvent[];
  nextActiveVehicleId?: string;
  roundWinnerTeam?: TeamId;
};
```

The server can store only the latest shot result in room state and broadcast larger path/diff data as a message event if Colyseus schema patch size becomes too large.

## 10. Client Message Protocol

All client messages must be ignored unless they are valid for the current phase and sender.

### Lobby Messages

| Message | Sender | Payload | Server Validation |
| --- | --- | --- | --- |
| `setDisplayName` | Any joined client | `{ displayName }` | Sanitize, length-limit, safe render. |
| `updateRoomSettings` | Host only | `{ mode, matchLength, mapPick }` | Only in lobby, validate values. |
| `claimSeat` | Any joined client | `{ seatId }` | Seat exists, not taken, mode allows seat. |
| `releaseSeat` | Seat owner | `{ seatId }` | Owner only, lobby only. |
| `selectCharacter` | Seat owner | `{ seatId, characterId }` | Character in v1 roster, lobby only. |
| `setReady` | Any joined client | `{ ready }` | Seated player only for match start readiness. |
| `startMatch` | Host only | none | Required seats filled, seated players ready, settings valid. |

### Turn Messages

| Message | Sender | Payload | Server Validation |
| --- | --- | --- | --- |
| `setMoveDirection` | Active vehicle owner | `{ direction: -1 | 0 | 1, inputSeq }` | Active turn, alive, owner, movement remains legal. |
| `setAimAngle` | Active vehicle owner | `{ angle, facing, inputSeq }` | Active turn, owner, angle/facing within allowed range. |
| `fire` | Active vehicle owner | `{ angle, power, facing, inputSeq }` | Active turn, owner, power/angle/facing valid, no shot already resolving. |
| `presetPhrase` | Seated player | `{ seatId, phraseId }` | Phrase allowed, cooldown, player owns seat, no spectators in v1. |

### Reconnect Messages

Reconnect should use join options, not public URL parameters:

```ts
type JoinOptions = {
  displayName?: string;
  reconnectToken?: string;
  roomId?: string;
};
```

The reconnect token is a temporary room-scoped secret stored in browser local storage. It is not an account credential and is not secure against a compromised browser. It is sufficient for v1 friend playtests.

## 11. Server Simulation Loop

### Movement

Movement is the only part of the turn that benefits from real-time server ticking.

Recommended v1 behavior:

- Server ticks active movement at a fixed rate, for example 20 Hz.
- Client sends `setMoveDirection` on keydown/keyup.
- Server updates active vehicle X/Y if movement remains legal.
- Server tracks movement used during the turn.
- Client may predict active movement locally but must snap/reconcile to server state.

Movement validation:

- Active vehicle only.
- Alive vehicle only.
- Movement range not exceeded.
- X remains in world bounds.
- Downhill and falling are allowed.
- Steep uphill is blocked by climb-angle rule.
- If vehicle falls below the death/void threshold, mark Void Dropped.

### Aim

Aim does not require high-frequency simulation.

Recommended v1 behavior:

- Client sends `setAimAngle` when the displayed aim changes meaningfully.
- Server clamps angle to the allowed tuning range.
- Server stores facing and angle on the active vehicle.
- Client renders the server-approved angle.

### Firing

Recommended v1 behavior:

- Client renders local charging UI immediately.
- Client sends `fire` with angle, facing, and power on release.
- Server validates active ownership and clamps power/angle.
- Server immediately changes phase to `shot-resolving`.
- Server resolves the full projectile result.
- Server broadcasts the shot path, impact, terrain diffs, damage diffs, combat markers, KO/Void Dropped events, and next turn or round result.

V1 does not need full charge anti-cheat. Server validation should reject impossible values and invalid turn ownership.

### Projectile

Projectile simulation should be pure deterministic TypeScript.

Inputs:

- Shooter position.
- Muzzle offset.
- Angle.
- Facing.
- Power.
- Wind.
- Gravity constant.
- Projectile radius.
- Active terrain heightmap.
- Active vehicle hit zones.

Outputs:

- Path sample points.
- First impact event.
- Terrain diff.
- Vehicle damage/knockback diff.
- Defeat events.
- Next turn or round winner.

Simulation should not depend on Phaser physics.

### Collision Priority

For each projectile step:

1. Compute swept path from previous point to current point.
2. Find first vehicle contact against enemy/self vehicle zones.
3. Find first terrain contact against the terrain heightmap.
4. Resolve whichever contact has the earliest time along the swept segment.
5. If no contact and projectile leaves world bounds or max lifetime, resolve as miss.

Friendly-fire rule:

- Self damage is allowed.
- Allied HP damage and allied knockback are blocked by default.
- Terrain deformation affects everyone.

### Terrain Deformation

Terrain is server-owned heightmap data.

Each impact produces one or more terrain diffs:

```ts
type TerrainDiff = {
  revisionBefore: number;
  revisionAfter: number;
  startX: number;
  values: number[];
};
```

Clients apply diffs only if `revisionBefore` matches their local terrain revision. If not, the client requests or waits for a full terrain snapshot.

### Damage And Knockback

Damage resolution order:

1. Apply direct hit damage if a vehicle hit zone was contacted.
2. Apply splash damage based on distance from impact to vehicle-zone edge.
3. Apply weapon-specific terrain deformation.
4. Apply weapon-specific knockback.
5. Re-settle affected vehicles onto terrain.
6. Mark HP KOs.
7. Mark Void Dropped eliminations.
8. Check round winner.

Vehicle combat uses vehicle hit zones only. Pilot art and cosmetic variants must not alter hitboxes.

## 12. Weapon Implementation

V1 has one primary action per character.

Recommended data model:

```ts
type WeaponDefinition = {
  weaponId: string;
  characterId: CharacterId;
  displayName: string;
  projectileRadius: number;
  baseDamage: number;
  splashRadius: number;
  craterRadius: number;
  craterDepth: number;
  knockback: number;
  effectKind: "breaker" | "gravity-well" | "roller" | "cluster";
  sfxKey: string;
  vfxKey: string;
};
```

V1 behavior targets:

- Nova: heavy terrain breaker with strongest crater and knockback.
- Vesper: gravity/control impact that pulls enemies toward impact.
- Kaelii: rolling, bouncing, or crater-punishing behavior. Exact v1 behavior still needs final design lock before implementation.
- Perlah: spark/cluster pressure. Exact v1 behavior still needs final design lock before implementation.

The TDD intentionally calls out Kaelii and Perlah as open technical risk because their exact primary mechanics are not yet locked in the GDD.

## 13. Map And Spawn Implementation

V1 maps are fixed contracts with known spawn points.

Map implementation responsibilities:

- Server chooses the map.
- Server builds the initial heightmap.
- Server owns terrain revision.
- Server places vehicles at map spawn positions by seat.
- Server validates all spawn points are safe.
- Server selects wind using the map wind scale.

Random map selection:

- If host picks `random`, server chooses from the v1 map list.
- The chosen map is stored in round state.
- If best-of-3 uses random, the server may choose a fresh map each round.
- If host picks a specific map, the same map repeats each round with fresh terrain.

## 14. Turn Order

Turn order should be generated once at match start.

Requirements:

- Include one vehicle for every filled required seat.
- Alternate teams where possible.
- Be deterministic from match seed and seats.
- Persist across rounds in the match.
- Skip dead or forfeited vehicles.
- Resume at the appropriate next living vehicle after shot resolution.

For v1, a simple deterministic shuffle that enforces team alternation is sufficient. Full draft-order fairness rules are future scope.

## 15. Disconnect And Reconnect

V1 reconnect is practical, not account-secure.

Requirements:

- Player receives a room-scoped reconnect token when joining.
- Browser stores token in local storage keyed by room id.
- If the socket drops, the room marks player disconnected and preserves seats during grace.
- If the same browser reconnects with the token before grace expires, seats are restored.
- If grace expires, seats forfeit/KO if match is active.
- If disconnected player's turn begins, the timer continues.
- Server skips disconnected turn after the configured skip behavior.

Do not put reconnect secrets in invite URLs.

## 16. Client Rendering Contract

The Phaser client should become a renderer and input surface for server state.

Client responsibilities:

- Render room/lobby state.
- Render match state.
- Render terrain from server snapshot/diffs.
- Render vehicles from server state.
- Render local input UI.
- Animate server-approved projectile paths.
- Show combat markers from server events.
- Show loading/failure states for assets.

Client prediction allowed:

- Active player's movement can predict between server ticks.
- Aim/power UI can update immediately.
- Shot path should not be locally authoritative.

Client prediction not allowed:

- Damage.
- Terrain deformation.
- Round winner.
- Turn advancement.
- Vehicle KO/Void Dropped state.
- Match score.

## 17. Schema And Event Strategy

Use Colyseus Schema for durable room state:

- Room phase.
- Settings.
- Players.
- Seats.
- Match score.
- Round metadata.
- Vehicles.
- Active vehicle.
- Wind.
- Terrain revision.

Use Colyseus messages for heavier transient events:

- Full terrain snapshot.
- Terrain diff batches.
- Shot path samples.
- Impact event.
- Combat marker events.
- Round result summary.
- Error/invalid-action feedback.

Reason: large projectile paths and terrain arrays can be expensive as constantly patched schema state.

## 18. Error Handling

Invalid client inputs should fail closed.

Server behavior:

- Ignore clearly invalid messages.
- Send a small `actionRejected` message for user-correctable cases.
- Never throw uncaught exceptions from malformed client payloads.
- Log invalid action categories in development.

Examples:

- Non-host changes settings: reject.
- Unseated player readies for match: reject.
- Spectator sends phrase: reject.
- Non-active player fires: ignore or reject.
- Active player sends impossible power: clamp or reject based on severity.
- Client terrain revision mismatch: send full terrain snapshot.

## 19. Testing Strategy

### Pure Simulation Tests

Required:

- Map selection and spawn safety.
- Turn-order generation.
- Movement range and climb-angle legality.
- Falling and Void Dropped detection.
- Projectile terrain collision.
- Projectile vehicle hit-zone collision.
- Splash distance to vehicle-zone edge.
- Terrain deformation diffs.
- HP KO.
- Void Dropped KO.
- Friendly-fire blocked, self-damage allowed.
- Weapon-specific behavior.

### Room Tests

Required:

- Create/join room.
- Display name sanitation.
- Host assignment and host transfer.
- Room settings validation.
- Seat claim/release.
- Character selection.
- Ready/start validation.
- 1v1 setup.
- 2v2 setup.
- Best-of-1 scoring.
- Best-of-3 scoring.
- Disconnect grace.
- Reconnect token restore.
- Disconnected turn skip/forfeit.

### Integration Tests

Required before v1 acceptance:

- Two-client 1v1 online match completes.
- Four-seat 2v2-format online match completes.
- Four-human 2v2 manual validation completes.
- Public playtest URL loads runtime config and WebP art.

### Visual/Manual Checks

Manual checks remain necessary for:

- Combat readability.
- Projectile animation feel.
- HUD placement.
- Wind visibility.
- Map readability.
- SFX clarity.
- Remote playtest loading.

## 20. Deployment And Asset Delivery

V1 playtest deployment should continue to favor low-risk sharing:

- Build static client to `dist`.
- Serve static client and Colyseus server from one local preview server.
- Use Cloudflare quick tunnel for public internet testing.
- Keep host bound to `127.0.0.1` by default.
- Use optimized WebP assets for normal playtest loading.
- Keep PNG source assets in repo.

Future mature/adult content should not be bundled into the default v1 public playtest build. If mature variants are added later, they should be gated by explicit product, platform, and technical decisions:

- Separate asset manifest.
- Explicit opt-in mode.
- No effect on hitboxes or combat stats.
- No automatic loading in streamer-safe mode.
- Clear fallback to stream-safe assets.

## 21. Performance Targets

V1 does not need high-scale infrastructure, but it should feel stable for friend playtests.

Targets:

- One room supports up to required v1 capacity without noticeable server delay.
- 2v2 turn inputs feel responsive.
- Projectile resolution completes quickly enough that animation can start immediately after fire.
- Terrain diff payloads stay small enough for quick tunnel testing.
- Runtime assets load over the playtest tunnel without blank-screen failure.

Optimization priority:

1. Correct deterministic results.
2. Readable client presentation.
3. Small asset payloads.
4. Compact terrain/shot event payloads.
5. Higher room concurrency later.

## 22. Technical Risks

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Large `src/main.ts` owns too much behavior | Hard to move online safely | Extract pure simulation functions in small slices. |
| Phaser-specific logic leaks into server | Server cannot run deterministic simulation | Shared modules must not import Phaser. |
| Terrain arrays become large network payloads | Quick tunnel and remote players may lag | Send terrain diffs and revision numbers. |
| Charge/power feels delayed online | Turn-based shooting depends on timing feel | Let client render power locally; server validates/clamps submitted power for v1. |
| Kaelii/Perlah mechanics are not locked | Weapon implementation could wander | Lock exact primary mechanics before coding them. |
| Reconnect tokens are not true accounts | Anyone with browser token can reclaim | Accept for v1 friend tests; accounts later. |
| Mature content direction affects platform safety | Could block sharing/streaming | Default build remains stream-safe; mature variants are future opt-in. |

## 23. Implementation Order

Recommended technical sequence:

1. Force Cloudflare Tunnel HTTP/2 in `npm run playtest` if needed for reliability.
2. Add room settings to Colyseus state and UI.
3. Add seat state and character selection.
4. Add ready/start validation using selected seats.
5. Extract pure map/terrain/vehicle state builders.
6. Extract pure movement validation from `src/main.ts`.
7. Extract pure projectile/collision/damage simulation.
8. Add server round creation from room settings.
9. Add server turn loop and movement input messages.
10. Add server fire resolution and shot result events.
11. Make Phaser scene render from server state.
12. Add 1v1 online match scoring.
13. Add 2v2 online match scoring.
14. Add reconnect grace.
15. Run four-human v1 validation.

Each step should be small enough to keep the prototype playable after the commit.

## 24. Documentation Update Rules

Update this TDD when:

- A server/client ownership boundary changes.
- A Colyseus message changes.
- A Schema field changes.
- A deterministic simulation module is added or moved.
- Terrain representation changes.
- Deployment/playtest topology changes.
- Test requirements change.

Do not update this TDD to accept new v1 product scope. Product scope changes go through [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md) change control first.
