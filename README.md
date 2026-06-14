# Gravity Canyon Prototype

First playable local artillery prototype for Gravity Canyon.

## What Is Built

- Browser-based Phaser prototype.
- Working title updated to Gravity Canyon.
- Four local test units in a 2v2-style roster: Nova and Kaelii on red, Vesper and Perlah on blue.
- Ringworks Basin is the local demo default, converted from the fixed v1 map contract into destructible heightmap terrain under the stable `ring-basin` map id.
- Keyboard movement, 5-90 degree elevation aiming, and hold/release shot power.
- Left/Right input turns the vehicle, character, and aim direction before moving.
- Facing-aware aim controls so each side's Up/Down input feels consistent.
- Terrain movement allows downhill travel and falling, while steep uphill climbs are blocked by a climb-angle limit.
- Top-safe wind badge visible to everyone; active turn timing lives above the active vehicle only.
- Fixed screen-space command deck with active vehicle portrait, aim dial, movement range meter, and a prominent launch-power meter.
- The command deck keeps a larger bottom safety gutter so control content is not clipped by the browser edge.
- The playable map renders only above the command deck so terrain and void visuals do not intersect the controls.
- Desktop viewport contract: the game is designed around 1600 x 900, can present up to 2400 x 1350 for readability on larger displays, centers in larger browser windows, and blocks below a 1366 x 768 visible viewport.
- Raised turn timer, team/HP bar, name, and class labels above playable unit art.
- Vehicle sprites tilt with terrain slope for clearer ground contact.
- Battlefield unit art is scaled as readable game pieces, while high-detail art remains available in HUD/presentation surfaces.
- World-space muzzle aim arrow and ground movement range rail for the active player while positioning.
- Projectile physics with gravity and turn-based wind.
- Full-battlefield aiming camera so both teams stay visible before firing.
- Stable full-battlefield projectile view after firing, with camera recentering only if a shot leaves the readable frame.
- Firing commits the turn immediately, so the active vehicle cannot move during projectile flight or impact resolution.
- Swept projectile-edge collision checks so fast shots impact at the first visible terrain or vehicle contact.
- Visible prototype combat hulls define one shared vehicle-only hit zone for all v1 units.
- Runtime gameplay sprites are the default match-view assets for faster hosted playtest loading; full-unit concept preview sprites remain available with `?conceptAssets=1` for art review.
- Collision art review rules keep pilot poses visually compatible with the vehicle-only hit zone.
- Crater deformation on impact.
- Terrain can be blasted through into a visible void beneath the stage, with a persistent danger layer anchored to the current map's lowest playable terrain.
- Temporary impact rings showing crater size and splash damage range.
- Floating combat markers call out direct hits, splash hits, knockback, HP KOs, and Void Dropped eliminations.
- Round starts now use the playable Ringworks Basin v1 map, with exact four-seat spawns, two readable bridge gaps, a central ring bridge island, and weapon-readable side bowls/lips for map-feel testing.
- Prototype Bunger shot behavior: larger/deeper excavation, knockback, slope sliding, and Void Dropped KOs, now tuned toward precise 2-3 shot ring-outs.
- Localized post-impact vehicle settling so distant vehicles are not randomly displaced by unrelated craters.
- Splash/direct damage, HP bars, turn switching, timeout, round win detection, and automatic round reset.
- Layered gameplay sprites: one standalone vehicle sprite plus one standalone playable-character sprite.
- Generated character sprite states for Nova and Vesper: default, KO, and intense shooting.
- Accepted Nova and Vesper full-unit intense runtime test sprites for concept-preview charging.
- Accepted Kaelii and Perlah v1 test runtime unit sprites: default, intense shooting, Defeated KO, vehicle default, and vehicle destroyed.
- Generated destroyed vehicle sprites pair with KO character sprites or full-unit KO sprites when a vehicle is no longer alive.
- Style B 2v2 concept art can be shown as a faint backdrop reference with `?styleReference=1`.
- High-detail anime vehicle/pilot portraits plus standalone generated gameplay sprites for Nova and Vesper.
- First Colyseus online foundation:
  - local multiplayer server,
  - private room create/join by room id,
  - two player slots,
  - ready checks,
  - server-owned room/player state,
  - placeholder capsule reward and nameplate equip state,
  - server-owned combat preview state with round, turn, wind, active vehicle, HP, winner, and validated preview shot actions.
- Browser client uses the vendored Colyseus browser SDK at `public/vendor/colyseus.js` to keep Vite dev mode stable on Windows.
- The local map-review demo hides the Online Alpha room panel by default; playtest launch mode shows it automatically.
- Public preview mode can serve the built client and Colyseus room server from one local port for internet sharing through a trusted tunnel, while staying localhost-only unless `HOST=0.0.0.0` is explicitly set.
- Playtest pages show a visible loading status and report the failed asset key if Phaser cannot load a required image.

## Run

This project uses npm scripts as the primary task runner because Gravity Canyon is a Node/TypeScript app and npm is already required for dependencies. On Windows, `make` is not installed by default, while `npm run ...` works anywhere Node is available. A Makefile could be added later as a convenience wrapper, but npm scripts remain the source of truth.

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

Generate HTML reading copies for the human-facing markdown docs:

```powershell
npm run docs:html
```

Runtime roster asset check:

```powershell
npm run verify:runtime-roster
```

Regenerate optimized WebP delivery assets from the PNG runtime sources:

```powershell
npm run optimize:assets
```

Public internet playtest from this computer:

```powershell
npm run playtest
```

This builds the project, serves the built game and Colyseus server locally, starts a Cloudflare quick tunnel, and prints the public URL to share. The local game is also available at:

```text
http://127.0.0.1:2567
```

For a playtest server without a tunnel, run:

```powershell
npm run playtest:local
```

This keeps the game server bound to `127.0.0.1` on your machine; the tunnel is the public entry point when `npm run playtest` is used.

Security boundary for public preview:

- Only the built `dist` game files, `/healthz`, and the Colyseus room endpoint are served.
- Directory listing is not enabled.
- The server does not expose your source tree, shell, editor, local files outside `dist`, or machine admin access.
- Stop the terminal running `npm run playtest` when the playtest is over.
- Do not run the command from an elevated/admin terminal.
- Prefer a tunnel over router port forwarding. If you intentionally need direct network binding, set `HOST=0.0.0.0` yourself and only forward the single chosen game port.

Open the built file:

```text
dist/index.html
```

## Command Reference

| Command | Use When | What It Does |
| --- | --- | --- |
| `npm install` | First setup or dependency changes | Installs project dependencies into `node_modules`. |
| `npm run dev` | Normal local development | Runs the Colyseus server and Vite client together. Client: `http://127.0.0.1:5173`; server: `ws://127.0.0.1:2567`. |
| `npm run dev:client -- --port 5173` | Client-only UI work | Runs only the Vite client on the chosen port. The Colyseus server must be started separately for online panel checks. |
| `npm run dev:server` | Server-only room work | Runs only the Colyseus server in watch mode. |
| `npm run build` | Before commits and public preview | Type-checks and builds both client and server targets. |
| `npm run build:client` | Client build debugging | Type-checks the Phaser/Vite client and writes the built static app to `dist`. |
| `npm run build:server` | Server type-check debugging | Type-checks the Node/Colyseus server. |
| `npm test` | Before commits or after behavior changes | Runs all server and client unit tests. |
| `npm run docs:html` | After markdown doc edits | Regenerates HTML reading copies and map review pages. |
| `npm run verify:runtime-roster` | After runtime asset or roster edits | Checks stable runtime sprite aliases and roster wiring. |
| `npm run optimize:assets` | After promoting or editing runtime art | Regenerates compressed WebP delivery files from the PNG art sources. |
| `npm run playtest` | Trusted internet playtest from this computer | Builds the project, serves the built client and Colyseus server from `http://127.0.0.1:2567`, starts a Cloudflare quick tunnel, and prints the share URL. |
| `npm run playtest:local` | Local playtest server without a tunnel | Builds the project and serves playtest mode locally at `http://127.0.0.1:2567`. |
| `npm run start:public` | Lower-level preview server only | Serves the built client and Colyseus server from `http://127.0.0.1:2567`; `npm run playtest` is preferred for normal sharing. |
| `npm run preview` | Local static build preview | Runs Vite's local preview server for the built client only; it is not the multiplayer preview server. |

## Planning

- HTML docs index: [docs/index.html](docs/index.html)
- Game Design Document: [docs/GDD.md](docs/GDD.md)
- Production Plan and current v1 scope authority: [docs/PRODUCTION_PLAN.md](docs/PRODUCTION_PLAN.md)
- Original v1 contract snapshot: [docs/V1_PLAYTEST_ALPHA.html](docs/V1_PLAYTEST_ALPHA.html)
- Version log: [docs/VERSION_LOG.md](docs/VERSION_LOG.md)
- Git workflow: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)
- Sprite asset workflow: [docs/SPRITE_ASSET_WORKFLOW.md](docs/SPRITE_ASSET_WORKFLOW.md)
- Session handoff: [docs/SESSION_HANDOFF.md](docs/SESSION_HANDOFF.md)

## Controls

- Left/Right arrows: face and move active vehicle.
- Up/Down arrows: raise/lower barrel relative to the vehicle's facing direction, up to vertical 90-degree aim.
- Hold/release Spacebar: charge and fire.
- R: restart round.
- H or the `Collision zones` checkbox: show/hide prototype vehicle collision zones. Zones are visible by default while collision and map scale are being tuned; add `?collisionZones=0` to start hidden.

## Terms

- Turn: one active vehicle's action window. The turn ends when that vehicle fires, times out, or can no longer act.
- Round: one fresh battlefield from spawn until one team has no alive vehicles left. Falling into the void creates a Void Dropped elimination and sets that vehicle to 0 HP and not alive.
- Match: a future multiplayer room/session made of one or more rounds. The local prototype does not track match score yet, so it currently loops into the next round automatically.

## Notes

- This is the local feel prototype, not the multiplayer architecture yet.
- The multiplayer architecture is now scaffolded, but live combat is still local-only until server-authoritative simulation is wired into the match scene.
- The online room now owns a lightweight combat preview model, but Phaser projectile/terrain simulation is not synced to that model yet.
- Terrain uses a heightmap for speed. Pixel-mask terrain can replace it later if needed.
- There is no predicted trajectory line. The muzzle arrow shows current direction, but shot landing is still based on angle, power, wind, and memory.
- Movement treats downhill and falling as allowed traversal; only steep uphill movement is blocked.
- Vehicle sprites rotate to match the local terrain slope while labels and meters stay horizontal.
- Players can intentionally drive into holes or off the map, which sets that vehicle to 0 HP.
- Every weapon affects terrain. Bunger weapons are tuned to affect terrain the most.
- Nova is currently set up as the prototype Bunger class so terrain knock-off play can be tested.
- Kaelii and Perlah are accepted as v1 runtime test units for local play; their Bouncer and Spark class-specific shot behavior is still future work, so they currently use the baseline non-Bunger projectile behavior.
- Deep enough craters expose the void under the terrain instead of stopping at a safe floor; the visible void band starts below the lowest playable terrain shelf so land does not appear inside the danger zone.
- The current crater, splash, and Bunger knockback radii are intentionally smaller so map KOs require more precision.
- Impact rings are temporary debugging/readability feedback: inner ring is crater/terrain effect, outer ring is splash damage range.
- Direct-hit and splash damage use the vehicle hit zone, not pilot hair, pose, outfit, or cosmetic silhouette.
- After a shot, the turn is committed immediately. There is intentionally no post-shot movement window.
- A round ends when one team has no alive vehicles left. In this prototype, alive means `alive = true` and HP above 0.
- Finished rounds show the result briefly, then start a fresh round automatically. R still restarts immediately.
- Wind is global round information shown in a fixed top HUD badge; turn time is shown above the active vehicle.
- Launch power, movement range, active vehicle identity, and aim angle live in a fixed centered command deck.
- Active player also gets a world-space aim arrow, raised turn timer badge, and ground movement range rail so movement decisions can be read without covering the character art.
- Prototype vehicle collision zones are visible by default while collision and terrain scale are being tuned, and can be toggled off with `H`, the on-screen checkbox, or `?collisionZones=0`.
- The game camera reserves the playfield above a fixed centered command deck, frames the visible void bottom just above that boundary, and keeps the battlefield centered when the camera view is wider than the map.
- The browser shell is presentation-capped and centered so larger or ultrawide windows improve readability without changing terrain, spawns, collision, void placement, projectile behavior, or the strategic battlefield view.
- Current sprites are first-pass generated assets, not final production sprites.
- Gameplay rendering uses separate layers for vehicle and playable character sprites.
- Active runtime sprites use stable PNG source filenames and optimized WebP delivery filenames in `public/assets`; versioned experiments live under `public/assets/sprite-variants`.
- When runtime art changes, run `npm run optimize:assets` before `npm run verify:runtime-roster` so hosted playtest links serve the compressed art.
- Each vehicle look currently needs a default gameplay sprite and a destroyed gameplay sprite.
- Each playable character currently needs three generated gameplay states: default, KO, and intense shooting.
- Character states should be integrated artwork, not code-drawn facial overlays on top of default art.
- Match sprites must pass the collision art rule in [docs/COLLISION_ART_RULE.md](docs/COLLISION_ART_RULE.md): pilot poses need to read as protected by or tucked into the vehicle hit zone.
- KO character art should use literal crossed or rolled-up eyes, not spiral/hypnotic eyes.
- Gameplay sprites are separate from portrait art so battlefield readability can be tuned without losing high-detail character art.
