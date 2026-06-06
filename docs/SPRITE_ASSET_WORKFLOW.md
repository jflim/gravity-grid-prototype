# Sprite Asset Workflow

Gravity Canyon should let us test sprite variants quickly without breaking the game.

## Runtime Aliases

The game loads stable runtime filenames from `public/assets`.

Examples:

- `public/assets/nova-character-default.png`
- `public/assets/nova-character-ko.png`
- `public/assets/nova-character-intense.png`
- `public/assets/nova-vehicle-sprite.png`
- `public/assets/nova-vehicle-destroyed.png`

When a variant is selected for the live prototype, copy or export it into the matching runtime alias. Code should not need to change just because a sprite variant won.

## Variant Library

Keep experiments in:

```text
public/assets/sprite-variants/<asset-type>/<character-or-vehicle>/<state>/
```

Current example:

```text
public/assets/sprite-variants/characters/nova/ko/
```

Useful target folders:

```text
public/assets/sprite-variants/characters/nova/ko/
public/assets/sprite-variants/characters/vesper/ko/
public/assets/sprite-variants/vehicles/nova/destroyed/
public/assets/sprite-variants/vehicles/vesper/destroyed/
```

Use descriptive filenames that preserve the generation/version note, such as:

```text
nova-character-ko-v16-marker-aligned-left-pupil.png
```

## Selection Rule

- Active game asset: stable runtime alias in `public/assets`.
- Candidate/history asset: versioned file under `public/assets/sprite-variants`.
- If the new sprite has a very different pose or aspect ratio, update the display size in `src/main.ts`.
- Prefer transparent PNGs in the project. If a source image arrives on a green chroma background, remove the green and trim empty padding before using it in the game.

## Current Active Choice

Nova's active KO runtime alias is currently based on:

```text
public/assets/sprite-variants/characters/nova/ko/nova-character-ko-v16-marker-aligned-left-pupil.png
```

Vesper still needs a production-quality KO replacement. Use `public/assets/vesper-character-default.png` as the clean identity reference in a fresh image-generation context, then archive the winner under:

```text
public/assets/sprite-variants/characters/vesper/ko/
```
