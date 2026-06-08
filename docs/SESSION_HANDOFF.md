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
- Current locked v1 scope is the hosted private-room playtest alpha in `docs/V1_PLAYTEST_ALPHA.html`.
- `docs/V1_PLAYTEST_ALPHA.html` supersedes broader planning docs for current v1 scope.
- Local Phaser prototype proves movement, aiming, wind, destructible terrain, fall KOs, round reset, and readable HUD.
- Online foundation uses Colyseus with private rooms, ready checks, placeholder rewards, and a server-owned combat preview.
- Cosmetics are fun/collectible only and must not affect combat stats, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.
- Player-facing art direction now treats each pilot and vehicle as a signature combat unit, while keeping sprites layered for customization.

## Current Implementation State

- Phaser local 1v1 combat is playable locally.
- Colyseus room create/join, display names, ready checks, placeholder capsule/nameplate rewards are implemented.
- Server-owned online combat preview is implemented:
  - round number,
  - turn number,
  - wind,
  - active vehicle,
  - vehicle HP/alive state,
  - winner,
  - validated active-player preview shots,
  - preview token reward on round end.
- The online preview is available in the floating Online Alpha panel when the local URL includes `?onlinePanel=1`; the default local demo hides that panel for map-review clarity.
- Phaser projectile and terrain simulation are not yet synced to the server-owned combat model.
- Local combat readability now has prototype combat hulls, floating combat markers, and playable v1 map terrain:
  - Direct-hit projectile collision uses one shared rectangular vehicle-only hit zone instead of the old small center-radius check or pilot-plus-vehicle silhouette collision.
  - Splash damage blooms from the impact point, then measures distance to the nearest edge of each vehicle hit zone.
  - Collision art review rules are documented in `docs/COLLISION_ART_RULE.md` and enforced by `src/collisionArtRule.test.ts`.
  - Combat hulls are visible by default while collision and terrain scale are being tuned, can be toggled with `H`, and can start hidden with `?combatHulls=0`.
  - Floating markers call out direct damage, splash damage, Bunger shove, HP KO, and Void Dropped eliminations.
  - Round start defaults to Ringworks Basin from the committed v1 map pool under the stable `ring-basin` id, using exact four-seat spawns, side bowls/high lips, widened readable bridge gaps, a central destructible ring bridge island, and faint ring/bridge landmarks.
  - The void now has a persistent visual danger layer, floating terrain presentation, and suspended Void Dropped unit treatment distinct from HP KO. Void Dropped units fall through a short slow-start presentation into a wide nearby void run without snapping farther than needed.
  - The command deck now uses explicit viewport layout rules and the browser's smallest reliable visible viewport size so the active player info stays inside the visible browser area on wide/short screens.
  - Projectile flight keeps the full battlefield framed while the shot is readable, with recentering reserved for shots that leave the readable frame.
  - The combat readability design is saved at `docs/superpowers/specs/2026-06-07-combat-readability-wind-lobs-design.md`.
  - Slice 1 implementation notes are saved at `docs/superpowers/plans/2026-06-07-combat-readability-slice-1.md`.

## Current Sprite State

- Runtime sprites use stable filenames in `public/assets`.
- Variant/history sprites live under `public/assets/sprite-variants`.
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
- Perlah intense uses the v2 footprint-locked candidate. It keeps the same apparent size and default leg/vehicle anchors while showing a compact heat-charge reaction.
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

For v1 scope discipline, use `docs/V1_PLAYTEST_ALPHA.html` as the authority before accepting any new gameplay, roster, asset, UI, economy, social, or polish work as v1. If the request is not required for v1 acceptance, preserve it in the V2 parking lot/context notes instead of expanding v1.

For combat feel, keep tuning visible combat hulls and playable v1 map terrain only where they support v1 readability. Advanced wind bands and high-angle/plunge reward rules are future ideas unless the v1 contract is explicitly changed.

For online v1, the next best build direction is to move from the current Colyseus combat preview toward real private-room 1v1/2v2 room settings, seat ownership, persistent match turn order, and server-owned combat results wired into the Phaser match scene.

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
