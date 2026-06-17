# Session Handoff

Use this as the quick restart note if all Codex/browser sessions are closed.

## Repository

- GitHub remote: `https://github.com/jflim/gravity-grid-prototype.git`
- Active branch: `feature/gravity-canyon-online-foundation`
- Project folder: `C:\Users\jflim\Code\gravity-canyon`
- Previous OneDrive project folder: `C:\Users\jflim\OneDrive\Documents\Gravity Canyon Game`
- Older projectless Codex output folder: `C:\Users\jflim\Documents\Codex\2026-06-04\files-mentioned-by-the-user-pasted\outputs\gravity-grid-prototype`
- Treat the `C:\Users\jflim\Code\gravity-canyon` folder above as the canonical local workspace for new Codex chats.

## Current Product Direction

- Product name: Gravity Canyon.
- Browser-based online multiplayer artillery game.
- Current locked v1 scope is the hosted private-room playtest alpha in `docs/PRODUCTION_PLAN.md`.
- `docs/GDD.md` is the broader living game design document and does not override the current Production Plan.
- `docs/TECHNICAL_DESIGN.md` is the implementer-facing blueprint for networking, server-authoritative combat, shared simulation, data models, deployment, and tests.
- `docs/V1_PLAYTEST_ALPHA.html` is the original v1 contract snapshot for historical reference.
- Local Phaser prototype proves movement, aiming, wind, destructible terrain, fall KOs, round reset, and readable HUD.
- Online foundation uses Colyseus with private rooms, ready checks, placeholder rewards, and a server-owned combat preview.
- Cosmetics are fun/collectible only and must not affect combat stats, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.
- Player-facing art direction now treats each pilot and vehicle as a signature combat unit, while keeping sprites layered for customization.

## Current Implementation State

- Phaser local 1v1 combat is playable locally.
- Colyseus room create/join, display names, ready checks, and placeholder capsule/nameplate reward state are implemented.
- Server-owned online combat preview is implemented:
  - round number,
  - turn number,
  - wind,
  - active vehicle,
  - vehicle HP/alive state,
  - winner,
  - validated active-player preview shots,
  - preview token reward on round end.
- The online preview now starts as a centered auto-room host/seat lobby and swaps into a shared server-owned gameplay preview after all active claimed seats are ready. The default local demo hides that flow for map-review clarity unless `?onlinePanel=1` or playtest runtime config enables it.
- The playtest lobby now presents Red Team and Blue Team in two visible columns. Players claim open active seats, the host controls Duel/Doubles mode, each seat owner picks their own character through a visual Pilot/Ride menu, and placeholder cosmetic controls are intentionally hidden from the lobby.
- `npm run playtest` now builds the project, serves the built client plus Colyseus from one localhost-bound port, starts a Cloudflare quick tunnel, and prints the public URL. `npm run playtest:local` starts the same playtest mode without a tunnel. Playtest launch mode, not the public URL hostname, controls the Online Alpha flow. Default and public-preview startup stay bound to `127.0.0.1`; direct all-interface binding requires explicitly setting `HOST=0.0.0.0`.
- Hosted/default playtest mode uses stable runtime gameplay art through optimized WebP delivery files so Cloudflare quick-tunnel loads are lighter while the accepted game art remains part of the normal mode. Art-review concept sprites are opt-in with `?conceptAssets=1`, and the faint Style B backdrop is opt-in with `?styleReference=1`.
- `npm run optimize:assets` regenerates the WebP delivery files from the PNG runtime and selected art-review sources; run it after promoting or editing runtime art, then run `npm run verify:runtime-roster`.
- The Phaser scene shows loading progress before the match appears and leaves a failed asset key visible if image loading fails, so remote playtest blank-screen reports have a concrete next debugging clue.
- Phaser projectile and terrain simulation are not yet synced to the server-owned combat model; online playtest mode uses the shared preview screen instead of dropping into unsynced local Phaser combat.
- Local combat readability now has prototype combat hulls, floating combat markers, and playable v1 map terrain:
  - Direct-hit projectile collision uses one shared rectangular vehicle-only hit zone instead of the old small center-radius check or pilot-plus-vehicle silhouette collision.
  - Splash damage blooms from the impact point, then measures distance to the nearest edge of each vehicle hit zone.
  - Collision art review rules are documented in `docs/COLLISION_ART_RULE.md` and enforced by `src/collisionArtRule.test.ts`.
  - Combat hulls are visible by default while collision and terrain scale are being tuned, can be toggled with `H` or the on-screen `Collision zones` checkbox, and can start hidden with `?collisionZones=0`.
  - Floating markers call out direct damage, splash damage, Bunger shove, HP KO, and Void Dropped eliminations.
  - Round start defaults to Ringworks Basin from the committed v1 map pool under the stable `ring-basin` id, using exact four-seat spawns, deeper side bowls, high-lip staging shelves, widened readable bridge gaps, a central destructible ring cap, and faint ring/bridge landmarks.
  - The void now has a persistent visual danger layer anchored to the round's lowest playable terrain surface, floating terrain presentation, and suspended Void Dropped unit treatment distinct from HP KO. Unsupported units first enter sliding or falling motion; Void Dropped is applied only when the vehicle collision hull reaches the visible void zone, then the defeated unit falls through a dramatic slow-start presentation into a wide nearby void run without snapping farther than needed.
  - The local browser shell now uses a desktop viewport contract: design around 1600 x 900, allow up to 2400 x 1350 presentation size for readability, require 1366 x 768 visible browser pixels, center the fixed game canvas inside larger windows, and show a resize guard below minimum.
  - The command deck now uses explicit viewport layout rules and the browser's smallest reliable visible viewport size so the active player info stays inside the visible browser area on wide/short screens.
  - The command deck is fixed screen-space HUD, not a camera/map-following layer; the playable camera viewport ends at the command deck top so terrain and void visuals cannot intersect it.
  - The command deck has a larger bottom safety gutter, and battlefield framing targets the visible void bottom just above the playfield/deck boundary to remove stray gap bands.
  - The command deck content now derives a responsive scale from the available dock width, and tests cover the actual child-control boxes so the portrait, launch meter, movement meter, and aim dial stay visible instead of only testing the background rectangle.
  - Horizontal camera side bounds now keep the battlefield centered when the visible frame is wider than the world instead of clamping all extra space to one side.
  - Projectile flight keeps the full battlefield framed while the shot is readable, with recentering reserved for shots that leave the readable frame.
  - Wind now lives in a fixed top-safe HUD badge, while active timer badges, team/HP bars, names, and class labels are raised above playable unit art using tested world-overlay spacing.
  - Minimal non-voice SFX are wired into the local match for turn ticks, movement pulses, class-flavored weapon launches, impacts, hits, damage KOs, and Void Dropped results. The sound layer now uses `src/match/audio/MatchSoundAssets.ts` as an asset manifest with procedural fallback, so files under `public/assets/sfx/` can replace cues without changing match flow. `M` toggles prototype sound.
  - The combat readability design is saved at `docs/superpowers/specs/2026-06-07-combat-readability-wind-lobs-design.md`.
  - Slice 1 implementation notes are saved at `docs/superpowers/plans/2026-06-07-combat-readability-slice-1.md`.

## Current Sprite State

- Runtime sprites use stable PNG source filenames and optimized WebP delivery filenames in `public/assets`.
- Variant/history sprites live under `public/assets/sprite-variants`.
- The battlefield unit runtime aliases are normalized for map-scale testing with consistent transparent bounds and bottom anchors:
  - `public/assets/nova-unit-default.png`
  - `public/assets/vesper-unit-default.png`
  - `public/assets/kaelii-unit-default.png`
  - `public/assets/perlah-unit-default.png`
- `npm run assets:normalize-battlefield` rebuilds default aliases and their existing charge-linked frames from the selected candidates, then `npm run optimize:assets` refreshes the WebP delivery files.
- Nova's default runtime alias now uses the normalized duo-identity Bunger Rig candidate with warmer human contrast.
- Vesper, Kaelii, and Perlah now use face-first v2 default battlefield candidates:
  - Vesper face-first v2: darker/less neon Glitch Rover, slimmer tech-pilot body read, more visible skin, and pale face/cyan hair contrast.
  - Kaelii face-first v2: flirtier stunt-idol pose/expression, more visible warm skin, cream clothing contrast, and darker magenta Flashkick Skip-Rig backing.
  - Perlah face-first v2: darker charcoal Sunspike Embercart with controlled orange accents so her warm face, curls, and cream/gold outfit contrast read first.
- Kaelii's default/intense display aspect is now the shorter `356 x 208` match frame instead of the older taller `350 x 233` probe frame.
- Active Nova Defeated KO runtime sprite is:
  - runtime alias: `public/assets/nova-character-ko.png`
  - selected source: `public/assets/sprite-variants/characters/nova/ko/nova-character-ko-v16-marker-aligned-left-pupil.png`
- Nova KO display size in `src/main.ts` is `250 x 94` because the active pose is wide/prone.
- New Nova Defeated KO concept direction is adult-anime Nova tumbling head-over-heels from her mounted crouch and collapsed over her damaged red signature vehicle:
  - `public/assets/sprite-variants/units/nova/defeated-ko/nova-unit-defeated-ko-head-over-heels-v1.png`
- Selected Vesper paired-unit concept candidates:
  - default mounted tech-shorts look: `public/assets/sprite-variants/units/vesper/default/vesper-unit-default-mounted-tech-shorts-v9.png`
  - Defeated KO tech-shorts look: `public/assets/sprite-variants/units/vesper/defeated-ko/vesper-unit-defeated-ko-tech-shorts-v10.png`
- Nova and Vesper now have full-unit intense runtime test aliases used by the default concept-preview charging state:
  - `public/assets/nova-unit-intense.png`
  - `public/assets/vesper-unit-intense.png`
- Vesper intense uses the v8 subtle tension scale-stable footprint-locked candidate. Earlier intense candidates either had a too-wide/low alpha box, read as visually shrunken, or made Vesper/rover feel like a different-size unit during the power-shot swap. The v8 normalized alias matches the default visible alpha footprint while allowing small pilot/rover recoil, leg tension, joystick/deck-control charge action, cannon reticle, headset glow, and compact glitch UI.
- Perlah intense now uses the face-first v4 footprint-matched candidate. It keeps the same apparent runtime footprint as the face-first v2 default while preserving the darker cart and stronger pilot contrast during charge.
- Default concept-preview unit display boxes and prototype combat hulls are scaled down for match readability so local 2v2-style play has more open battlefield space while full-detail art can remain valuable in HUD/presentation surfaces.
- Destroyed vehicle sprites exist for Nova and Vesper:
  - `public/assets/nova-vehicle-destroyed.png`
  - `public/assets/vesper-vehicle-destroyed.png`
- Kaelii and Perlah are now accepted as v1 local runtime test units, with stable aliases:
  - `public/assets/kaelii-vehicle-sprite.png`
  - `public/assets/kaelii-vehicle-destroyed.png`
  - `public/assets/kaelii-unit-default.png`
  - `public/assets/kaelii-unit-intense.png`
  - `public/assets/kaelii-unit-ko.png`
  - `public/assets/perlah-vehicle-sprite.png`
  - `public/assets/perlah-vehicle-destroyed.png`
  - `public/assets/perlah-unit-default.png`
  - `public/assets/perlah-unit-intense.png`
  - `public/assets/perlah-unit-ko.png`
- Local play now spawns Nova, Vesper, Kaelii, and Perlah as a 2v2-style test roster. Online alpha remains private-room 1v1 preview.
- Kaelii Defeated KO v5 remains acceptable for v1 testing, but its right-eye pupil placement is an open future artist/refinement note.
- Vesper default/KO unit candidates still need production cleanup before replacing the older layered baseline set. Vesper full-unit intense v8 subtle tension scale-stable is active as a runtime test alias.

## Next Best Step

For v1 scope discipline, use `docs/PRODUCTION_PLAN.md` as the authority before accepting any new gameplay, roster, asset, UI, economy, social, or polish work as v1. If the request is not required for v1 acceptance, preserve it in the GDD parking lot/context notes instead of expanding v1.

For combat feel, keep tuning visible combat hulls and playable v1 map terrain only where they support v1 readability. Advanced wind bands and high-angle/plunge reward rules are future ideas unless the v1 contract is explicitly changed.

For online v1, the next best build direction is to follow `docs/TECHNICAL_DESIGN.md`: extend the current host/seat lobby with the remaining real room settings, persistent match turn order, and server-owned combat results wired into the Phaser match scene.

For sprites, use the committed Vesper v9/v10 unit candidates as references for the next production pass. The next pass should simplify detail, preserve the light full gloves/tech shorts/chunky sneaker identity, remove the chroma key, split or size layers as needed, and only then promote runtime aliases.

Recommended Vesper direction:

```text
Create a brand-new original 2D cel-shaded adult anime arcade game sprite concept on a perfectly flat solid #00ff00 chroma-key background.

Depict Vesper as a cohesive character-plus-signature-vehicle unit in a Defeated KO state. Preserve the cyan-blue hair, short twin-braid accents, blue headset, blue-and-black tech outfit, gloves, chunky blue-white sneakers, thick dark outline, and polished anime game sprite rendering. Use adult anime proportions, not semi-chibi or super-deformed proportions.

Vesper should be collapsed over, draped on, or slumped against her damaged blue tech/glitch hover artillery rig. Keep the character in front of/on top of the vehicle so the unit relationship is visible. The pose should feel defeated, dazed, and readable without looking dumb or like a generic goofy collapse.

Face is the most important detail. Heavy sleepy eyelids, open mouth with a small tongue blep. Eyes are thin slit-shaped white KO eyes, vertically compressed on the Y-axis. Add visible small oval pupils inside both white slit eyes. Both pupils are rolled upward toward the forehead and crossed inward, clearly inside the eye whites. The expression should read knocked out senseless, dazed, and comically defeated.

Style: mainstream adult anime game sprite, clean cel shading, crisp face details, thick dark outline, wide full-unit silhouette with generous padding.

Asset constraints: flat uniform #00ff00 background, character and vehicle only, no text, no watermark, no blood or visible injury, no nudity, no explicit exposure.
```

After generation:

1. Save the chosen candidate under `public/assets/sprite-variants/characters/vesper/ko/`.
2. Remove the green chroma background and trim padding.
3. Copy the winner into `public/assets/vesper-character-ko.png`.
4. Update Vesper KO display size in `src/main.ts` if the aspect ratio changes.
5. Run `npm run build`.

## Verification Already Run

- `npm run build` passed after the online preview and Nova KO sprite changes.
- `npm run verify:runtime-roster` checks Kaelii/Perlah runtime aliases, preload keys, class IDs, and local turn order.
- A two-client Colyseus smoke test reached `round-over`, set the losing vehicle to 0 HP, and granted the preview token reward.

## Known Environment Note

Detached dev-server startup from Codex PowerShell hit a Windows `Path`/`PATH` `Start-Process` issue. Running `npm run dev` directly in a normal terminal is the reliable local path.
