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
- Active Nova KO sprite is:
  - runtime alias: `public/assets/nova-character-ko.png`
  - selected source: `public/assets/sprite-variants/characters/nova/ko/nova-character-ko-v16-marker-aligned-left-pupil.png`
- Nova KO display size in `src/main.ts` is `250 x 94` because the active pose is wide/prone.
- Destroyed vehicle sprites exist for Nova and Vesper:
  - `public/assets/nova-vehicle-destroyed.png`
  - `public/assets/vesper-vehicle-destroyed.png`
- Vesper still needs a production-quality KO replacement. Use a clean image-generation context, because the prior thread began rejecting even harmless prompts after explicit reference images were attached.

## Next Best Step

Generate Vesper KO in a clean session with only `public/assets/vesper-character-default.png` as the identity/style reference.

Recommended Vesper-safe prompt:

```text
Create a brand-new original 2D cel-shaded game character KO status sprite on a perfectly flat solid #00ff00 chroma-key background.

Use the provided base character as the identity and style reference. Preserve the cyan-blue hair, short twin-braid accents, blue headset, blue-and-black tech hoodie outfit, gloves, chunky blue-white sneakers, compact sci-fi arcade pilot silhouette, thick dark outline, and polished anime game sprite rendering.

Depict her as an adult anime arcade combat pilot in a goofy KO status pose unique to Vesper: a glitch-overloaded collapse with limbs loose, headset slightly crooked, hair messy, and small harmless blue pixel-glitch sparks around her gear. The pose should feel silly, defeated, and readable as a combat loss status sprite.

Face is the most important detail. Heavy sleepy eyelids, open mouth with a small tongue blep. Eyes are thin slit-shaped white KO eyes, vertically compressed on the Y-axis. Add visible small oval pupils inside both white slit eyes. Both pupils are rolled upward toward the forehead and crossed inward, clearly inside the eye whites. The expression should read as knocked out senseless, dazed, and comically defeated.

Style: mainstream adult anime game sprite, clean cel shading, crisp face details, thick dark outline, centered with generous padding, full-body readable silhouette.

Asset constraints: flat uniform #00ff00 background, character only, no vehicle, no text, no watermark, no blood or visible injury, no nudity, no explicit exposure.
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
