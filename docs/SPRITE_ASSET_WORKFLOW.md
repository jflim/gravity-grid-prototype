# Sprite Asset Workflow

Gravity Canyon should let us test sprite variants quickly without breaking the game.

## Asset Lifecycle

Use three clear tiers:

1. Gold runtime assets: `public/assets/`
2. Preserved candidates and history: `public/assets/sprite-variants/`
3. Temporary lab work: `work/asset-lab/` or another ignored `work/` subfolder

The root of `public/assets/` is the known-good runtime surface. Treat it as gold.

`work/` is allowed to be messy during an active art pass, but it is not a long-term asset library. Anything important must leave `work/` before cleanup.

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
public/assets/sprite-variants/units/nova/defeated-ko/
public/assets/sprite-variants/units/vesper/default/
public/assets/sprite-variants/units/vesper/defeated-ko/
```

Use descriptive filenames that preserve the generation/version note, such as:

```text
nova-character-ko-v16-marker-aligned-left-pupil.png
```

Promote an asset to `sprite-variants` when:

- it is a serious candidate,
- it preserves a useful pose/style decision,
- the user likes it enough that losing it would hurt,
- it is a retired gold asset worth preserving,
- it is needed to reproduce a future asset decision.

Do not promote every generated image. Rejected prompt drift, chroma-key intermediates, bad crops, and temporary comparison mockups belong in `work/` until they are deleted.

## Lab Workspace

Use ignored lab folders for active exploration:

```text
work/asset-lab/<date>-<topic>/
```

Suggested structure:

```text
work/asset-lab/2026-06-07-mounted-pose-probes/
  README.md
  source/
  processed/
  rejected/
  mockups/
```

Older ad hoc folders such as `work/sprite-probes/` are still valid scratch history, but future passes should prefer the `work/asset-lab/<date>-<topic>/` shape.

## Selection Rule

- Active game asset: stable runtime alias in `public/assets`.
- Candidate/history asset: versioned file under `public/assets/sprite-variants`.
- Lab/scratch asset: ignored file under `work/`.
- If the new sprite has a very different pose or aspect ratio, update the display size in `src/main.ts`.
- Prefer transparent PNGs in the project. If a source image arrives on a green chroma background, remove the green and trim empty padding before using it in the game.

Use **Defeated KO** for the defeated-state asset name when possible. Keep "KO" in prompts and notes when describing the face details: crossed or rolled-up pupils, sleepy compressed white eyes, and tongue blep readability.

## Cleanup Rule

At the end of each coherent art pass, classify every meaningful `work/` output:

- Promote candidate: copy to `public/assets/sprite-variants/...` with a descriptive filename.
- Keep temporarily: leave in `work/asset-lab/...` with a README note explaining why.
- Reject/delete: remove from `work/` after confirming it is not needed.

Delete from `work/` when:

- the asset is clearly rejected,
- the prompt/output no longer teaches anything,
- the promising asset has already been promoted to `sprite-variants`,
- it is an intermediate such as an uncropped chroma-key-removal output,
- the session/checkpoint is complete and the file is not needed for reproduction.

Keep in `work/` temporarily when:

- options are still being compared,
- the output may receive one more iteration,
- it helps explain an active decision,
- the user has not yet approved promotion or deletion.

Before deleting a `work/` image that the user liked, promote it or ask explicitly.

## Current Active Choice

Nova's active Defeated KO runtime alias is currently still based on the earlier standalone KO sprite:

```text
public/assets/sprite-variants/characters/nova/ko/nova-character-ko-v16-marker-aligned-left-pupil.png
```

The current art-direction probe is moving toward adult-anime unit sprites, with pilots mounted on or collapsed over their signature vehicles. Selected committed unit candidates are:

```text
public/assets/sprite-variants/units/nova/defeated-ko/nova-unit-defeated-ko-head-over-heels-v1.png
public/assets/sprite-variants/units/vesper/default/vesper-unit-default-mounted-tech-shorts-v9.png
public/assets/sprite-variants/units/vesper/defeated-ko/vesper-unit-defeated-ko-tech-shorts-v10.png
```

Vesper still needs production cleanup before runtime replacement. Use the committed unit candidates above, `public/assets/vesper-character-default.png`, and the Vesper vehicle identity as references in a fresh image-generation context, then archive character-layer winners under:

```text
public/assets/sprite-variants/characters/vesper/ko/
```
