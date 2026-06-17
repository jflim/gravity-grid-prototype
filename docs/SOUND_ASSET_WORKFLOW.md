# Sound Asset Workflow

Status: active workflow  
Scope: v1 non-voice SFX, with future voice folder guidance  
Runtime manifest: `src/match/audio/MatchSoundAssets.ts`

## Purpose

This document explains how to replace Gravity Canyon's prototype match sounds without editing combat, turn, movement, projectile, or UI flow code.

The match emits sound cues such as `turn-tick`, `movement`, `weapon-fire`, `impact`, `hit`, `damage-ko`, and `void-drop`. The audio layer decides whether each cue plays an authored asset or the procedural fallback.

## V1 Boundary

V1 allows:

- One readable non-voice weapon SFX per v1 character or class.
- Minimal non-voice UI, movement, impact, hit, damage KO, and Void Dropped feedback.
- Asset swapping through the manifest.

V1 does not include:

- Character voice barks.
- KO shouts.
- Music identity.
- Mature/adult-only voice or audio packs.

Future voice files can be organized now, but they should not be wired into default v1 gameplay unless the v1 contract is explicitly changed.

## Folder Layout

Runtime SFX should live under:

```text
public/assets/sfx/
```

Recommended subfolders:

```text
public/assets/sfx/ui/
public/assets/sfx/vehicle/
public/assets/sfx/weapons/
public/assets/sfx/combat/
```

Future voice files should live under:

```text
public/assets/voice/<character-id>/
```

Example future-only voice layout:

```text
public/assets/voice/nova/
public/assets/voice/kaelii/
public/assets/voice/perlah/
public/assets/voice/vesper/
```

## Supported File Types

Prefer short `.ogg` or `.mp3` files for browser delivery.

Use `.wav` only for source or very small temporary tests because it is usually larger. If a browser fails to play a manifest asset, the game falls back to the procedural sound for that cue.

## How To Replace The Tick Sound

1. Add a new file:

```text
public/assets/sfx/ui/turn-tick.ogg
```

2. Open:

```text
src/match/audio/MatchSoundAssets.ts
```

3. Set the manifest path:

```ts
export const MATCH_SOUND_MANIFEST: MatchSoundManifest = {
  ui: {
    turnTick: { src: "assets/sfx/ui/turn-tick.ogg", volume: 0.6 },
  },
  weaponFire: {
    byClassId: {},
  },
  combat: {},
};
```

4. Run:

```powershell
npm test -- src/match/audio/MatchSoundAssets.test.ts src/match/audio/MatchSoundController.test.ts
npm run build
```

## Cue Manifest Reference

The current manifest supports:

```ts
ui.turnTick
ui.turnTickUrgent
movement
weaponFire.default
weaponFire.byClassId.bunger
weaponFire.byClassId.flashkick
weaponFire.byClassId.sunspike
weaponFire.byClassId.glitch
combat.impact
combat.hit
combat.damageKo
combat.voidDrop
```

Each entry uses:

```ts
{
  src: "assets/sfx/path/to-file.ogg",
  volume: 0.6,
  playbackRate: 1
}
```

`volume` and `playbackRate` are optional.

## Character And Class Mapping

Current v1 class ids:

| Character | Class id | Recommended weapon file |
| --- | --- | --- |
| Nova | `bunger` | `assets/sfx/weapons/nova-bunger-fire.ogg` |
| Kaelii | `flashkick` | `assets/sfx/weapons/kaelii-flashkick-fire.ogg` |
| Perlah | `sunspike` | `assets/sfx/weapons/perlah-sunspike-fire.ogg` |
| Vesper | `glitch` | `assets/sfx/weapons/vesper-glitch-fire.ogg` |

The manifest resolves `weaponFire.byClassId` first. If a class-specific file is missing, it uses `weaponFire.default`. If no authored asset is defined, it uses the procedural fallback.

## Human Editing Rules

- Do edit `src/match/audio/MatchSoundAssets.ts` when swapping sound files.
- Do keep files under `public/assets/sfx/` for v1 sound effects.
- Do keep future voice files under `public/assets/voice/`.
- Do not add voice barks to default v1 gameplay without a contract change.
- Do not put combat balance, damage, hitbox, or weapon behavior changes in sound files or audio code.
- Do not make cosmetics or voice variants affect gameplay truth.

## Verification

After changing sound files or manifest paths, run:

```powershell
npm test -- src/match/audio/MatchSoundAssets.test.ts src/match/audio/MatchSoundController.test.ts
npm run build
```

After editing this markdown document, run:

```powershell
npm run docs:html
```
