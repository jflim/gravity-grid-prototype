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

Current shared extraction includes:

- `shared/model/gameTypes.ts` for shared game-language types such as character ids, teams, facing, hit-zone shapes, display sizes, and defeat reasons.
- `shared/content/v1Units.ts` for the current authored local unit definitions: roster ids, class labels, sprite keys, display sizes, colors, portrait keys, and shared combat hull wiring. Its exported content symbols use generic demo-unit names while the file path remains a transitional compatibility name.
- `shared/content/v1CollisionProfiles.ts` for the shared v1 vehicle-only hit zone used by playable unit content and collision-art review.
- `shared/v1/tuning.ts` for v1/local prototype tuning constants such as world size, HP, movement range, shot physics, crater radii, damage radii, wind force, and void thresholds.
- `shared/v1/constants.ts` as a compatibility re-export for shared v1 constants already consumed by server code.
- `shared/gameplay/terrain.ts` as the first Phaser-free gameplay helper module for heightmap building, surface sampling, terrain angle sampling, and crater deformation.
- `shared/gameplay/movement.ts` for Phaser-free aiming, facing, movement-step, and charge/release helpers.
- `shared/gameplay/projectile.ts` for Phaser-free projectile launch, wind/gravity stepping, and miss-boundary checks.
- `shared/gameplay/projectileCollision.ts` for Phaser-free swept projectile-edge collision against terrain and vehicle hit zones.
- `shared/gameplay/vehicleHitZone.ts` for shared vehicle-body hit-zone bounds, point checks, nearest-point checks, and splash-distance geometry.
- `shared/gameplay/impact.ts` for Phaser-free projectile impact damage, friendly-fire filtering, bunger knockback, and crater/damage tuning selection.
- `shared/gameplay/vehicleSettlement.ts` for Phaser-free vehicle terrain placement, localized post-impact slope nudging, and Void Dropped truth resolution.
- `shared/match/rounds.ts` for Phaser-free alive checks, alive-team calculation, winner calculation, and round-over decisions.
- `shared/match/turns.ts` for Phaser-free next-turn selection that skips defeated vehicles while preserving the match turn order.
- `src/main.ts` as browser bootstrap only: Phaser config, viewport guard, online lobby mount, and CSS import.
- `src/match/MatchScene.ts` as the playable Phaser scene and local browser-authority orchestration surface.
- `src/match/MatchTypes.ts` for match-scene runtime state shapes shared by UI/rendering modules.
- `src/match/MatchAssetLoader.ts` for match preload planning, runtime/concept/style-reference asset queueing, and loading/failure status presentation.
- `src/match/MatchController.ts` as the local match-flow bridge for active vehicle, alive/movable checks, alive teams, winners, and next-turn decisions.
- `src/match/MatchCameraController.ts` for camera viewport, battlefield framing, and projectile recentering.
- `src/match/ImpactController.ts` for local impact application: crater callback, vehicle damage mutation, knockback mutation, settlement callback, marker requests, and shot-result text.
- `src/match/ProjectileController.ts` for local projectile launch, flight stepping, trail tracking, swept collision lookup, and out-of-bounds orchestration.
- `src/match/RoundEventScheduler.ts` for delayed local turn/round event scheduling after misses, impacts, and round results.
- `src/match/RoundBuilder.ts` for local round setup: terrain copy, spawn flattening, starting vehicle state, turn order, visible void top, and round-start message.
- `src/match/TerrainController.ts` for local mutable terrain state: current playable map, active heightmap copy, surface sampling, crater application, visible void top, and vehicle sprite slope reads.
- `src/match/TurnController.ts` for local turn order/index, turn timer, wind, charge state, and committed/round-over action state.
- `src/match/VehicleGeometry.ts` for facing-aware combat hull centers and projectile hit-zone geometry shared by scene collision and vehicle rendering.
- `src/match/VehicleSettlementController.ts` for local vehicle placement application: calling shared settlement truth, mutating local vehicle state, assigning Void Dropped presentation state, and reporting fall events.
- `src/match/MatchInputController.ts` for client-side input sampling without embedding keyboard state directly in the Phaser scene.
- `src/match/VoidZoneController.ts` for visible void-zone geometry and Void Dropped presentation state/timing.
- `src/match/ui/CommandDeck.ts` for the fixed command deck, launch meter, movement meter, active unit info, and wind badge.
- `src/match/rendering/TerrainRenderer.ts` for terrain, visible void hazard, and map landmarks.
- `src/match/rendering/VehicleRenderer.ts` for vehicle/character sprites, combat hull overlays, labels, HP bars, and active turn badges.
- `src/match/rendering/ProjectileRenderer.ts` for projectile body and trail drawing.
- `src/match/rendering/EffectsRenderer.ts` for aim arrow, movement rail, and impact preview rings.
- `src/match/rendering/CombatMarkerRenderer.ts` for floating direct/splash/shove/KO/Void Dropped text markers.
- `src/match/rendering/RenderingTypes.ts` for Phaser rendering-object state shapes that should not leak into match runtime types.

The main technical gap is that online v1 must run the real match through server-owned state and deterministic combat resolution. The existing online preview is not the final combat system.

### Known Gameplay Correctness Bugs

- Falling and Void Dropped are currently too tightly coupled in the local prototype. A vehicle that loses stable footing should first enter a gravity-affected falling presentation/state, and it should only become Void Dropped after its gameplay collision zone actually intersects the visible void/death zone. The fall decision should be based on vehicle-footing support, terrain surface normals/perpendicular angle, and whether the settled vehicle orientation is physically stable, not merely on the fact that the vehicle will eventually fall.

## 3. V1 Technical Goal

The v1 technical goal is:

> A hosted private-room 1v1/2v2 artillery match where the server owns room state, seats, settings, match setup, turn order, movement legality, aim/fire validation, projectile path resolution, terrain deformation, damage, KOs, Void Dropped eliminations, score, and match result.

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
| Projectile result | Server combat resolution | Client animates approved path/result. |
| Cosmetics | Player/session state | Cosmetic only, no combat effects. |
| Turn timer | Shared v1 rules constant | Current implementation constant is 20 seconds. |

## 7. Recommended Module Boundaries

The current codebase already has pure logic modules in `src` and contract modules in `server/v1`. For server-authoritative combat, gameplay logic should move into Phaser-free, Node-free shared modules, while match UI and rendering stay in the browser client.

Recommended target shape:

```text
shared/
  content/
    v1Units.ts
    v1CollisionProfiles.ts
    characters.ts
    weapons.ts
    maps.ts
    assets.ts
  model/
    gameTypes.ts
    matchTypes.ts
    vehicleTypes.ts
    terrainTypes.ts
    combatTypes.ts
  gameplay/
    terrain.ts
    movement.ts
    projectile.ts
    projectileCollision.ts
    vehicleHitZone.ts
    vehicleSettlement.ts
    combatResolution.ts
    turnSequence.ts
  match/
    rounds.ts
    turns.ts
  protocol/
    matchCommands.ts
    matchEvents.ts
  v1/
    tuning.ts
    constants.ts
server/
  rooms/
    GravityCanyonRoom.ts
  schema/
    GravityCanyonState.ts
  match/
    ServerMatchAuthority.ts
src/
  match/
    MatchScene.ts
    MatchController.ts
    MatchInputController.ts
    MatchAssetLoader.ts
    MatchCameraController.ts
    ImpactController.ts
    ProjectileController.ts
    RoundEventScheduler.ts
    RoundBuilder.ts
    TerrainController.ts
    TurnController.ts
    VehicleGeometry.ts
    VehicleSettlementController.ts
    VoidZoneController.ts
    authority/
      MatchAuthority.ts
      BrowserMatchAuthority.ts
      ServerMatchAuthority.ts
    ui/
      MatchHud.ts
      CommandDeck.ts
      UnitLabels.ts
    rendering/
      TerrainRenderer.ts
      VehicleRenderer.ts
      ProjectileRenderer.ts
      EffectsRenderer.ts
      CombatMarkerRenderer.ts
      RenderingTypes.ts
  onlineLobby.ts
  net/
    roomClient.ts
```

### Version And Milestone Naming

The codebase should not encode the current milestone as permanent architecture. `v1` is a product milestone label, not a durable gameplay subsystem name.

Rules:

- Prefer generic module names such as `rules`, `content`, `rosters`, `maps`, `tuning`, `projectile`, `impact`, and `match`.
- Track milestone-specific selections through data ids such as `playtest-alpha`, `activeRulesetId`, `rosterId`, `mapPoolId`, or release metadata.
- Keep functions and classes reusable: `resolveProjectileImpact`, `buildMatchState`, `selectRoster`, and `applyRoomSettings` are better than names with `v1`.
- `v1` is acceptable in docs, release notes, tests describing milestone acceptance, historical compatibility shims, and explicit migration notes.
- `v1` should not be introduced into new permanent folder names, function names, class names, or exported constants.
- Current content exports should use generic names such as `DemoUnitDefinition` and `DEMO_UNIT_DEFINITIONS`; milestone selection belongs in ruleset/profile data, not exported type names.

Current `v1` file and symbol names are transitional. After the server-authoritative gameplay extraction is stable, add a focused cleanup pass that moves milestone-specific code from `shared/v1` and `server/v1` into generic rules/content modules backed by an explicit `playtest-alpha` ruleset/profile id.

Conservative migration rule:

- Do not rewrite `src/main.ts` in one giant pass.
- Extract pure deterministic functions first.
- Keep Phaser rendering code client-side.
- Keep Colyseus schema and network messages server-side.
- Share only content data, model types, protocol contracts, and deterministic gameplay functions.
- Use game-engineering terms in the glossary below when naming new architecture.

Existing pure modules such as `combatRules.ts`, `playableMaps.ts`, `server/v1/rules.ts`, and `server/v1/maps.ts` should guide the shape of shared gameplay code.

Current human editing map:

| Change You Want To Make | Start Here | Why |
| --- | --- | --- |
| Rename a v1 unit class label, swap a sprite key, adjust a HUD portrait, or tune a unit display size | `shared/content/v1Units.ts` | Authored unit content should be data-first and reviewable without reading the Phaser scene. |
| Adjust world size, HP, aim bounds, movement range, shot speed, gravity, wind force, crater size, damage radius, knockback, or void thresholds | `shared/v1/tuning.ts` | Numeric tuning should live in one shared rules/tuning file with tests. |
| Add or rename a shared game concept such as character id, team id, facing, hit-zone shape, or defeat reason | `shared/model/gameTypes.ts` | Model language should be shared across content, client, server, and tests. |
| Change deterministic heightmap construction, surface sampling, terrain angle, or crater deformation math | `shared/gameplay/terrain.ts` | Deterministic gameplay helpers should stay Phaser-free so the future server can run them. |
| Change aim input math, facing-preserving angle flips, movement traversal legality, or charge/release behavior | `shared/gameplay/movement.ts` and `shared/v1/tuning.ts` | Player-input outcomes should be gameplay logic, not hidden inside the Phaser scene. |
| Change projectile launch position, shot speed interpolation, wind/gravity stepping, or miss boundaries | `shared/gameplay/projectile.ts` and `shared/v1/tuning.ts` | Projectile outcome math must be reusable by the future server authority. |
| Change local projectile launch orchestration, trail history, swept collision priority, or out-of-bounds response | `src/match/ProjectileController.ts`, `shared/gameplay/projectile.ts`, and `shared/gameplay/projectileCollision.ts` | The browser scene should delegate projectile flow through a focused controller while deterministic math remains shared. |
| Change swept terrain collision, vehicle collision priority, projectile-edge contact timing, or vehicle hit-zone geometry | `shared/gameplay/projectileCollision.ts`, `shared/gameplay/vehicleHitZone.ts`, and `shared/v1/tuning.ts` | Collision truth should be shared by browser presentation and future server authority. |
| Change client-side facing-aware combat hull center or conversion from authored combat hull to projectile hit zone | `src/match/VehicleGeometry.ts` | Scene collision and vehicle overlay rendering should use the same geometry interpretation. |
| Change direct/splash damage, allied friendly-fire filtering, self-damage, bunger knockback, or impact radius selection | `shared/gameplay/impact.ts` and `shared/v1/tuning.ts` | Impact outcome math must be reusable by the future server authority while Phaser stays responsible for markers and animation. |
| Change local impact application, crater callback wiring, combat-marker requests, settlement callback wiring, or shot-result text | `src/match/ImpactController.ts`, `shared/gameplay/impact.ts`, and `shared/gameplay/vehicleSettlement.ts` | The scene should delegate impact application through a focused controller while deterministic damage and settlement truth stay shared. |
| Change vehicle terrain placement, post-impact slope nudging, or Void Dropped truth thresholds | `shared/gameplay/vehicleSettlement.ts` and `shared/v1/tuning.ts` | Settlement and elimination truth should be shared by the browser demo and future server authority; visual fall/suspension remains client presentation. |
| Change local vehicle placement application, Void Dropped presentation assignment, or fall event text after settlement | `src/match/VehicleSettlementController.ts`, `shared/gameplay/vehicleSettlement.ts`, and `src/match/VoidZoneController.ts` | The controller bridges shared settlement truth to mutable local vehicle state and visual Void Dropped presentation without putting that workflow back into `MatchScene`. |
| Change alive checks, alive-team/winner calculation, or round-over decisions | `shared/match/rounds.ts` | Round outcome truth should be reusable by local browser authority and future server authority. |
| Change next-turn selection, defeated-vehicle turn skipping, or turn-order wrapping | `shared/match/turns.ts` | Turn sequencing truth should be reusable by local browser authority and future server authority. |
| Change delayed local turn/round transitions after misses, impacts, or round results | `src/match/RoundEventScheduler.ts` and `src/match/MatchScene.ts` call sites | Delayed Phaser timer ownership should stay testable and separate from match orchestration. |
| Change browser bootstrap, game config, viewport guard, or online lobby mount | `src/main.ts` | Startup belongs outside the Phaser scene so the playable scene remains game-focused. |
| Change match preload status, normal runtime asset queueing, concept-preview asset opt-in, or style-reference asset opt-in | `src/match/MatchAssetLoader.ts` and `src/runtimeAssets.ts` | Asset loading is Phaser lifecycle work, but it should remain separate from match orchestration and combat truth. |
| Change local active-vehicle, movable/alive, alive-team, winner, or next-turn bridge logic | `src/match/MatchController.ts` | The scene uses a controller boundary before those decisions move to server authority. |
| Change local round setup, spawn flattening width, starting HP/move units, initial facing angle, initial turn order, or round-start message | `src/match/RoundBuilder.ts` and `shared/v1/tuning.ts` | Round initialization should be testable without opening Phaser scene rendering code. |
| Change local browser terrain ownership, current map handoff, crater callback application, visible void top storage, or scene-facing terrain/slope reads | `src/match/TerrainController.ts` and `shared/gameplay/terrain.ts` | Local terrain state should be readable without opening Phaser lifecycle code, while deterministic terrain math stays shared for future server authority. |
| Change local turn index, turn timer, charge state, committed state, or wind-per-turn ownership | `src/match/TurnController.ts`, `shared/match/turns.ts`, and `shared/v1/tuning.ts` | Turn state should be testable without Phaser lifecycle code; pure next-turn decisions remain in shared turn helpers. |
| Change camera viewport, battlefield framing, or projectile recentering | `src/match/MatchCameraController.ts` | Camera behavior is presentation orchestration, separate from combat truth and drawing. |
| Change visible void-zone bounds, terrain breakthrough padding, Void Dropped target position, or Void Dropped fall-presentation timing | `src/match/VoidZoneController.ts` and `src/voidDropPresentation.ts` | Void-zone presentation should be isolated before the future falling-state fix separates falling from final Void Dropped truth. |
| Change which keyboard keys mean move, aim, charge, restart, or collision overlay toggle | `src/match/MatchInputController.ts` and `src/match/MatchScene.ts` key setup | Input sampling is client-side controller work; gameplay helpers consume the sampled intent. |
| Change fixed HUD command deck, launch-power meter, movement meter, aim dial, active unit info, or wind badge | `src/match/ui/CommandDeck.ts` | Command UI should not be mixed into scene lifecycle or combat logic. |
| Change terrain, void-hazard, or map-landmark drawing | `src/match/rendering/TerrainRenderer.ts` | Terrain rendering is visual presentation over shared terrain state. |
| Change vehicle sprites, labels, HP bars, combat hull overlays, active turn badge, or footing marker | `src/match/rendering/VehicleRenderer.ts` | Vehicle drawing should own Phaser sprite/text objects but not combat truth. |
| Change projectile trail/body drawing | `src/match/rendering/ProjectileRenderer.ts` | Projectile rendering is separate from projectile simulation and collision truth. |
| Change aim arrow, movement rail, or impact preview rings | `src/match/rendering/EffectsRenderer.ts` | Tactical visual aids stay out of gameplay resolution logic. |
| Change floating direct/splash/shove/KO/Void Dropped marker styling, offsets, duration, or fade movement | `src/match/rendering/CombatMarkerRenderer.ts` | Combat-result feedback is visual presentation; impact truth should remain in shared gameplay modules. |
| Change Phaser rendering-object state shapes such as text-backed combat markers | `src/match/rendering/RenderingTypes.ts` | Renderer-only state can depend on Phaser; `src/match/MatchTypes.ts` should remain Phaser-free runtime state. |
| Change private-room networking, server state, or online preview behavior | `server/rooms/GravityCanyonRoom.ts` and `server/schema/GravityCanyonState.ts` | Server authority and Colyseus schema belong on the Node side. |

Planned naming cleanup after shared gameplay extraction:

| Current Transitional Name | Target Direction | Reason |
| --- | --- | --- |
| `shared/v1/tuning.ts` | `shared/rules/matchTuning.ts` or `shared/rules/rulesets.ts` | Tuning should be selected by ruleset/profile data, not a milestone folder. |
| `shared/content/v1Units.ts` | `shared/content/units.ts` plus a `playtest-alpha` roster/profile | Unit definitions are durable content; roster membership is milestone/profile data. |
| `shared/content/v1CollisionProfiles.ts` | `shared/content/collisionProfiles.ts` | Collision profile names should describe gameplay truth, not release scope. |
| `server/v1/rules.ts` and `server/v1/maps.ts` | `server/rules/roomRules.ts`, `server/content/maps.ts`, or shared content-backed modules | Server rules should consume active profiles rather than hard-code milestone names. |

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
  turnSequence: VehicleId[];
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

## 11. Server Gameplay Loop

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
- Vehicle settlement samples footing support across the gameplay hull so under-supported cliff-edge positions become Void Dropped instead of stable perches.
- If vehicle falls below the death/void threshold, mark Void Dropped.
- Future refinement should separate unstable-footing fall state from Void Dropped truth so falling has readable gravity-driven presentation before final void collision.

### Aim

Aim does not require high-frequency server ticking.

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

Projectile gameplay should be pure deterministic TypeScript.

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

Projectile and combat gameplay should not depend on Phaser physics.

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

### Pure Gameplay Tests

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
| Large `src/main.ts` owns too much behavior | Hard to move online safely | Extract pure gameplay functions in small slices. |
| Phaser-specific logic leaks into server | Server cannot run deterministic gameplay | Shared modules must not import Phaser. |
| Terrain arrays become large network payloads | Quick tunnel and remote players may lag | Send terrain diffs and revision numbers. |
| Charge/power feels delayed online | Turn-based shooting depends on timing feel | Let client render power locally; server validates/clamps submitted power for v1. |
| Kaelii/Perlah mechanics are not locked | Weapon implementation could wander | Lock exact primary mechanics before coding them. |
| Reconnect tokens are not true accounts | Anyone with browser token can reclaim | Accept for v1 friend tests; accounts later. |
| Mature content direction affects platform safety | Could block sharing/streaming | Default build remains stream-safe; mature variants are future opt-in. |
| Falling and Void Dropped are visually conflated | Players read a fall as a physical event, but the prototype can resolve the final status as soon as a vehicle is unsupported | Add a distinct falling state driven by gravity; apply Void Dropped only when the vehicle collision zone intersects the visible void/death zone. |

## 23. Implementation Order

Recommended technical sequence:

1. Force Cloudflare Tunnel HTTP/2 in `npm run playtest` if needed for reliability.
2. Add room settings to Colyseus state and UI.
3. Add seat state and character selection.
4. Add ready/start validation using selected seats.
5. Extract pure map/terrain/vehicle state builders.
6. Extract pure movement validation from `src/main.ts`.
7. Extract pure projectile collision and combat-resolution gameplay.
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
- A deterministic gameplay module is added or moved.
- Terrain representation changes.
- Deployment/playtest topology changes.
- Test requirements change.

Do not update this TDD to accept new v1 product scope. Product scope changes go through [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md) change control first.

Documentation format rule:

- Human-facing markdown docs are canonical editable sources, but their generated HTML copies are the preferred reading and sharing surface.
- After editing markdown docs, run `npm run docs:html`.
- Markdown-to-HTML conversion must be reproducible through committed local scripts. It must not depend on AI/manual conversion.
- Use custom HTML directly for docs that need richer review surfaces: module maps, architecture walkthroughs, code annotations, rendered diffs, flow diagrams, map previews, gameplay reviews, and PR explanations.
- If the local converter cannot express a doc well enough, improve the converter or make that document an intentional HTML source artifact.
- Do not manually edit generated HTML reading copies.

## 25. Game Engineering Glossary

Use these terms in code and docs where they fit. The goal is to keep Gravity Canyon readable while also learning vocabulary that transfers to Unity, Godot, and multiplayer game development.

| Term | Meaning In Gravity Canyon | Notes |
| --- | --- | --- |
| Authority | The system trusted to decide the real match state. | Unity Netcode documents this as `Authority`. Godot exposes similar vocabulary through `set_multiplayer_authority()`. |
| Server-authoritative | The server owns truth for combat, state transitions, and results. | V1 online matches should become server-authoritative. The browser sends player intent; the server validates and resolves. |
| Browser authority | The local browser owns truth for the current local demo. | This is useful for fast iteration, but online v1 should not trust browser-computed combat results. |
| MatchAuthority | Gravity Canyon code interface for whichever system owns match truth. | `BrowserMatchAuthority` can run local demo truth. `ServerMatchAuthority` can bridge to Colyseus/server truth. |
| Client | The player's browser game. | The client renders, captures input, shows UI, and sends commands. It should not own online combat results. |
| Server | The Node/Colyseus process. | The server owns online rooms, seats, match state, combat resolution, score, and match result. |
| Scene | A Phaser screen or mode. | `MatchScene` should become the playable combat scene, similar in spirit to a Unity scene or Godot scene, but implemented through Phaser. |
| Controller | A stateful object coordinating a flow or input surface. | Use controllers for match orchestration, input, and camera behavior. Avoid turning pure math into classes just to look organized. |
| Renderer | A frontend object responsible for drawing one part of the match. | Terrain, vehicles, projectiles, HUD, and effects can have focused renderers. Renderers should not decide combat truth. |
| Content | Authored game data: characters, weapons, maps, assets, labels, SFX keys. | Content answers "what exists in the game?" It should be easy to tune without rewriting gameplay code. |
| Model | Runtime state shape: match, round, vehicle, terrain, combat event, command. | Model answers "what does the game remember right now?" This is not visual art or character lore. |
| Gameplay | Deterministic game-outcome logic. | Projectile collision, terrain deformation, movement legality, combat resolution, and turn sequencing belong here. |
| Protocol | Commands and events exchanged between client and server. | Examples: `fire`, `setAimAngle`, `terrainDiff`, `shotResolved`, `roundOver`. |
| Command | A player or client request to do something. | Commands are intent, not truth. Example: "fire at angle 47, power 82." |
| Event | A fact produced by match resolution. | Events are results. Example: "Nova hit Vesper", "terrain changed", "blue wins round." |
| Prediction | Client-side guess shown before server confirmation. | Useful for responsive movement/aim UI. Damage, terrain, KO, and winners should not be predicted as truth in v1 online. |
| Reconciliation | Correcting the client after authoritative state arrives. | If local prediction differs from server truth, the client updates to match the server. |
| Snapshot | A complete state payload at a point in time. | Useful when joining/rejoining or recovering from terrain revision mismatch. |
| Diff | A smaller state change from one revision to the next. | Terrain should use diffs when practical so online payloads stay lighter. |
| Schema | Colyseus synchronized state class. | Durable online state lives in Colyseus Schema. Heavy one-off data can be sent as messages/events. |
| Hit zone | The damageable vehicle body used for combat collision. | Gravity Canyon uses vehicle-only hit zones. Pilot art and cosmetics do not change combat collision. |
| Spawn point | A predefined safe start position on a map. | V1 maps need known 1v1 and 2v2 spawns. |
| Viewport | The visible browser/game area. | The game has a desktop viewport contract so resizing the browser does not change tactical layout. |
