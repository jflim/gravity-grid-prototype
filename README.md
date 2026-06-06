# Gravity Canyon Prototype

First playable local artillery prototype for Gravity Canyon.

## What Is Built

- Browser-based Phaser prototype.
- Working title updated to Gravity Canyon.
- Two local vehicles, one red and one blue.
- Procedural heightmap terrain.
- Keyboard movement, 5-90 degree elevation aiming, and hold/release shot power.
- Left/Right input turns the vehicle, character, and aim direction before moving.
- Facing-aware aim controls so each side's Up/Down input feels consistent.
- Global round-status strip with large timer and wind visible to everyone.
- Docked bottom command deck with active vehicle portrait, aim dial, movement range meter, and a prominent launch-power meter.
- Turn timer badge above the active vehicle.
- World-space muzzle aim arrow and ground movement range rail for the active player while positioning.
- Projectile physics with gravity and turn-based wind.
- Full-battlefield aiming camera so both players are visible before firing.
- Projectile camera follow after firing.
- Firing commits the turn immediately, so the active vehicle cannot move during projectile flight or impact resolution.
- Swept projectile collision checks to make fast shots hit terrain/vehicles more predictably.
- Crater deformation on impact.
- Temporary impact rings showing crater size and splash damage range.
- Prototype Bunger shot behavior: larger/deeper excavation, knockback, slope sliding, and fall/bunge KOs.
- Localized post-impact vehicle settling so distant vehicles are not randomly displaced by unrelated craters.
- Splash/direct damage, HP bars, turn switching, timeout, round win detection, and automatic round reset.
- Fainted/KO overlay for destroyed vehicles instead of only graying out the model.
- Style B 2v2 concept art used as a faint backdrop reference.
- High-detail anime vehicle/pilot portraits plus tight-cropped gameplay sprites for Nova and Vesper.
- First Colyseus online foundation:
  - local multiplayer server,
  - private room create/join by room id,
  - two player slots,
  - ready checks,
  - server-owned room/player state,
  - placeholder capsule reward and nameplate equip state.
- Browser client uses the vendored Colyseus browser SDK at `public/vendor/colyseus.js` to keep Vite dev mode stable on Windows.

## Run

Development server:

```powershell
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5173
```

If another Vite server is already using `5173`, Vite will print the next available port, usually:

```text
http://127.0.0.1:5174
```

The multiplayer server runs at:

```text
ws://127.0.0.1:2567
```

Client-only development:

```powershell
npm run dev:client -- --port 5173
```

Production build:

```powershell
npm run build
```

Open the built file:

```text
dist/index.html
```

## Planning

- Canonical game design spec: [docs/GAME_DESIGN_SPEC.md](docs/GAME_DESIGN_SPEC.md)
- Build/iteration plan: [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)
- Version log: [docs/VERSION_LOG.md](docs/VERSION_LOG.md)
- Git workflow: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)

## Controls

- Left/Right arrows: face and move active vehicle.
- Up/Down arrows: raise/lower barrel relative to the vehicle's facing direction, up to vertical 90-degree aim.
- Hold/release Spacebar: charge and fire.
- R: restart round.

## Terms

- Turn: one active vehicle's action window. The turn ends when that vehicle fires, times out, or can no longer act.
- Round: one fresh battlefield from spawn until one team has no alive vehicles left. Falling or being bunged off the map sets that vehicle to 0 HP and not alive.
- Match: a future multiplayer room/session made of one or more rounds. The local prototype does not track match score yet, so it currently loops into the next round automatically.

## Notes

- This is the local feel prototype, not the multiplayer architecture yet.
- The multiplayer architecture is now scaffolded, but live combat is still local-only until server-authoritative simulation is wired into the match scene.
- Terrain uses a heightmap for speed. Pixel-mask terrain can replace it later if needed.
- There is no predicted trajectory line. The muzzle arrow shows current direction, but shot landing is still based on angle, power, wind, and memory.
- Every weapon affects terrain. Bunger weapons are tuned to affect terrain the most.
- Nova is currently set up as the prototype Bunger class so terrain knock-off play can be tested.
- Impact rings are temporary debugging/readability feedback: inner ring is crater/terrain effect, outer ring is splash damage range.
- After a shot, the turn is committed immediately. There is intentionally no post-shot movement window.
- A round ends when one team has no alive vehicles left. In this prototype, alive means `alive = true` and HP above 0.
- Finished rounds show the result briefly, then start a fresh round automatically. R still restarts immediately.
- Timer and wind are global round information, shown outside the active-player panel.
- Launch power, movement range, active vehicle identity, and aim angle live in a docked bottom command deck.
- Active player also gets a world-space aim arrow, turn timer badge, and ground movement range rail so movement decisions can be read without covering the character art.
- The game camera reserves space above the command deck so the playable battlefield does not sit underneath detached UI.
- Current sprites are first-pass generated assets, not final production sprites.
- Gameplay sprites are separate from portrait art so battlefield readability can be tuned without losing high-detail character art.
