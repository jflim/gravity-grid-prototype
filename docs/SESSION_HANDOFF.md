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
- The online preview is visible in the floating Online Alpha panel.
- Phaser projectile and terrain simulation are not yet synced to the server-owned combat model.

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
- Destroyed vehicle sprites exist for Nova and Vesper:
  - `public/assets/nova-vehicle-destroyed.png`
  - `public/assets/vesper-vehicle-destroyed.png`
- Vesper still needs production cleanup before runtime replacement. Use adult anime compact game-sprite proportions, not semi-chibi and not tall fashion-anime proportions.

## Next Best Step

Use the committed Vesper v9/v10 unit candidates as references for the next production pass. The next pass should simplify detail, preserve the light full gloves/tech shorts/chunky sneaker identity, remove the chroma key, split or size layers as needed, and only then promote runtime aliases.

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
- A two-client Colyseus smoke test reached `round-over`, set the losing vehicle to 0 HP, and granted the preview token reward.

## Known Environment Note

Detached dev-server startup from Codex PowerShell hit a Windows `Path`/`PATH` `Start-Process` issue. Running `npm run dev` directly in a normal terminal is the reliable local path.
