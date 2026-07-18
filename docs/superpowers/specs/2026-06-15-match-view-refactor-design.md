# MatchView Refactor Design

Status: proposed implementation design  
Date: 2026-06-15  
Related plan: [../plans/2026-06-14-match-scene-ui-rendering-refactor.md](../plans/2026-06-14-match-scene-ui-rendering-refactor.md)

## Goal

Reduce `src/match/MatchScene.ts` by extracting Phaser presentation setup and draw coordination into a focused `MatchView` facade, while keeping gameplay orchestration, match state, input flow, and camera control explicit.

The target is to make `MatchScene` read like a scene lifecycle and match-flow coordinator instead of a mixed file containing lifecycle, controller setup, graphics object creation, renderer wiring, DOM UI setup, and draw methods.

## Selected Approach

Use a **View Facade**:

- `MatchScene` owns Phaser scene lifecycle, local match state, gameplay controllers, input handling, projectile/impact flow, turn/round flow, and camera calls.
- `MatchCameraController` remains its own class for viewport, battlefield framing, and projectile recentering.
- `MatchView` creates and owns Phaser presentation objects: background graphics, draw layers, HUD text/images, renderers, command deck, collision-zone toggle, and combat marker renderer.
- Existing renderers stay focused: `TerrainRenderer`, `VehicleRenderer`, `ProjectileRenderer`, `EffectsRenderer`, `CombatMarkerRenderer`, `CommandDeck`, and `CollisionZonesToggle`.

This approach gives a large line-count reduction without turning `MatchView` into a hidden gameplay authority.

## Alternatives Considered

### Object Factory Only

`MatchView` would create Phaser objects and pass them back to `MatchScene`. This is safer but too weak. `MatchScene` would still own draw coordination and too many view fields, so the scene would remain hard to read.

### View Facade

`MatchView` creates the presentation graph and exposes small methods such as `draw`, `update`, `clearCombatMarkers`, `addCombatMarkerForVehicle`, and `setCollisionZonesVisible`.

This is the recommended path because it removes the presentation wall from `MatchScene` while preserving clear gameplay ownership.

### Full Presentation Layer Including Camera

`MatchView` would also own camera behavior. This is too broad for this slice. Camera is presentation-adjacent, but current camera calls are tied to turn starts, movement, projectile updates, and round flow. Keeping `MatchCameraController` separate gives us a real camera class and avoids a new giant view object.

## Responsibilities

### `MatchScene` Keeps

- Phaser lifecycle methods: `preload`, `create`, `update`.
- Local match state: vehicles, projectile, impact preview, shot result, round-over flag, collision-zone visibility flag.
- Gameplay controllers: match, turn, terrain, projectile, impact, round builder, vehicle geometry, settlement, void zone, event scheduler.
- Input sampling through `MatchInputController`.
- Camera orchestration through `MatchCameraController`.
- Turn, round, projectile, impact, movement, and charge flow.
- Query helpers that bridge gameplay controllers: active vehicle, winning team, surface sampling, visible void bounds, terrain breakthrough.

### `MatchView` Owns

- Background creation.
- Phaser graphics layers: terrain, vehicle, collision, projectile, HUD, aim, and impact layers.
- HUD text/image creation.
- Renderer construction.
- Command deck construction.
- Collision-zone toggle construction and checked-state synchronization.
- Combat marker renderer construction, updates, clears, and marker adds.
- Draw coordination for terrain, aim, impact preview, vehicles, projectile, and HUD.

### `MatchCameraController` Keeps

- Camera viewport sizing.
- Playfield height calculation.
- Battlefield framing.
- Camera world bounds.
- Projectile recenter decisions.

The camera class should not be moved into `MatchView` in this slice.

## Proposed API Shape

`MatchView` should be constructed after the camera controller and before the first round starts.

```ts
type MatchViewOptions = {
  scene: Phaser.Scene;
  world: {
    width: number;
    height: number;
    renderHeight: number;
    terrainStep: number;
    projectileRadius: number;
  };
  flags: {
    useUnitConceptPreview: boolean;
    useStyleReferenceBackground: boolean;
    showCombatHulls: boolean;
  };
  tuning: {
    moveMinX: number;
    moveMaxX: number;
    movePixelsPerUnit: number;
    impactPreviewSeconds: number;
    combatMarkerSeconds: number;
  };
  callbacks: {
    surfaceAt: (x: number) => number;
    isMovable: (vehicle: VehicleState) => boolean;
    onCollisionZonesVisibleChange: (visible: boolean) => void;
    worldUiScale: () => number;
  };
};
```

`MatchView` should expose a narrow API:

```ts
class MatchView {
  draw(state: MatchViewState): void;
  update(deltaSeconds: number): void;
  clearCombatMarkers(): void;
  addCombatMarkerForVehicle(vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot?: number): void;
  setCollisionZonesVisible(visible: boolean): void;
}
```

The exact type names can be adjusted during implementation, but the shape should remain: `MatchScene` passes state in; `MatchView` draws it; `MatchView` does not mutate gameplay state.

## Draw State

`MatchViewState` should be a plain object assembled by `MatchScene` from existing state and controller values.

It should include:

- `vehicles`
- `activeVehicle`
- `projectile`
- `impactPreview`
- `currentMap`
- `visibleVoidTopY`
- `visibleVoidBottomY`
- `terrainPlatformBottomY`
- `terrainBreakthroughY`
- `showCombatHulls`
- `roundOver`
- `turnCommitted`
- `projectileActive`
- `charging`
- `charge`
- `turnTime`
- `cameraZoom`
- `shotResult`
- `roundComplete`
- `windLabel`

This keeps view rendering explicit and prevents `MatchView` from reaching into gameplay controllers.

## First Implementation Slice

Move these from `MatchScene` into `MatchView`:

- renderer fields
- graphics/text/image fields
- command deck field
- collision toggle field
- `createBackground`
- renderer and command deck construction from `create`
- `drawWorld`
- `drawTerrain`
- `drawAim`
- `drawImpactPreview`
- `drawVehicles`
- `drawProjectile`
- `drawHud`
- combat marker update/clear/add forwarding
- collision toggle construction and checked-state synchronization

Do not move:

- `MatchCameraController`
- `MatchAssetLoader`
- `MatchInputController`
- `RoundEventScheduler`
- gameplay controllers
- turn/round/projectile/impact methods
- `surfaceAt`, `terrainBreakthroughY`, `visibleVoidBottomY`, or other controller bridge helpers

## Testing Strategy

Add architecture tests that assert:

- `src/match/MatchView.ts` exists and exports `MatchView`.
- `MatchScene` constructs `new MatchView`.
- `MatchScene` no longer directly constructs renderer classes.
- `MatchScene` no longer directly creates HUD text/image objects or graphics layers with `this.add.text`, `this.add.image`, or `this.add.graphics`.
- `MatchScene` no longer owns `drawTerrain`, `drawVehicles`, `drawProjectile`, `drawAim`, `drawImpactPreview`, or `drawHud`.

Add focused `MatchView` tests for public delegation behavior without launching a real Phaser game:

- use fake collaborator factories or narrow fakes to confirm `MatchView` wires the collision toggle callback.
- verify `setCollisionZonesVisible` forwards to `CollisionZonesToggle`.
- verify `update` forwards to the combat marker renderer.
- verify `draw` delegates to the focused renderers with the state supplied by `MatchScene`.

If a rendering detail requires real Phaser internals, keep that detail inside the existing renderer classes and cover the boundary through build/type checks plus the architecture tests above. Do not add test-only production methods to `MatchView`.

The implementation should still run:

- `npm test`
- `npm run verify:runtime-roster`
- `npm run build`

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| `MatchView` becomes another large monolith | Keep renderers and UI modules separate; `MatchView` coordinates them but does not absorb their internals. |
| `MatchView` starts owning gameplay decisions | Pass `MatchViewState` in from `MatchScene`; do not let `MatchView` read or mutate gameplay controllers. |
| Camera behavior gets tangled with view setup | Keep `MatchCameraController` separate for this slice. |
| Tests become too tied to implementation details | Architecture tests should guard boundaries, while behavior tests focus on public `MatchView` methods. |
| Refactor breaks visual behavior | Make the first slice behavior-preserving and run the full quality gate before committing. |

## Success Criteria

- `MatchScene` drops meaningfully below 928 lines, ideally below 700 after this slice.
- `MatchScene` reads as lifecycle plus match orchestration, not presentation construction.
- `MatchCameraController` remains an explicit camera class.
- Rendering and UI setup have one obvious home: `MatchView`.
- No gameplay behavior, tuning, assets, v1 scope, or user-facing rules change.
- Full verification passes before commit.
