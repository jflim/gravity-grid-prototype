# Mounted Gameplay Asset Design

Date: 2026-06-07
Project: Gravity Canyon

## Goal

Define the next gameplay sprite direction without replacing the current runtime assets by accident.

The current assets remain the `v0` runtime baseline. Future mounted character and vehicle probes should be generated separately, reviewed, and promoted only after explicit approval.

## Non-Destructive Migration Rule

Do not overwrite stable runtime aliases in `public/assets` during art-direction exploration.

Use this flow:

1. Keep current Nova/Vesper character and vehicle sprites as the playable baseline.
2. Save new probes under `work/` or versioned `public/assets/sprite-variants/...`.
3. Compare probes against the current baseline.
4. Promote a winner to `public/assets` only after the user explicitly chooses it.
5. Preserve replaced assets in `sprite-variants`, git history, or both.

Existing assets can continue to serve as:

- runtime fallback,
- style reference,
- source identity reference,
- Defeated KO pose/expression reference,
- collection-art reference,
- comparison baseline.

## Signature Unit Model

The playable unit should read as a signature character-plus-vehicle pair.

Each pilot has a vehicle family that feels authored for them. Nova rides her red arcade artillery rig, Vesper rides her blue tech/glitch rig, and future pilots should have similarly coherent pair identities. This prevents the roster from feeling like separate characters and unrelated vehicles loosely composited together.

Render order:

1. Vehicle gameplay sprite.
2. Character gameplay sprite layered in front of, on top of, or partly overlapping the vehicle.
3. Combat labels, HP, aim UI, and turn indicators above both as needed.

The vehicle remains the gameplay anchor. Hitboxes, movement, cannon behavior, and combat stats belong to the vehicle/unit rules, not the character art silhouette.

Do not bake the pilot into the vehicle sprite for the default pipeline. Keeping vehicle and character art separate preserves outfit and vehicle-skin customization, even when the art direction treats the pair as one authored unit.

## Active-State Pose Direction

Default and intense shooting sprites should be purpose-built mounted poses, not full-body collection art scaled down.

Allowed pose families:

- seated in or on the vehicle,
- kneeling or crouching on the chassis,
- leaning on the large cannon,
- bracing behind the weapon,
- perched on the vehicle with legs compactly visible,
- otherwise riding or using the vehicle in a clear combat pose.

Pose constraints:

- The character should feel attached to the vehicle, not standing separately beside it.
- Legs may be visible when they are compact and clearly mounted on the vehicle.
- Full standing poses beside the vehicle are not the default-state target.
- Face, hair, and upper body must remain readable at match scale.
- Adult anime proportions are the target for Nova and Vesper production probes. Avoid semi-chibi or super-deformed face/body proportions unless a later cosmetic set explicitly asks for that style.
- The pose must not obscure aim feedback, HP labels, the cannon direction, or important terrain contact.
- The character art may be attractive and stylish, but match readability comes first.

## Character And Vehicle Cosmetics

Cosmetic sets may define compatible mounted poses, outfits, and vehicle skins inside a pilot's signature vehicle family.

Example:

- A racer set might use a confident kneeling-on-vehicle pose.
- A tech set might use a crouched side-panel or cannon-brace pose.
- A heavy/tactical set might use a seated braced pose.

Loadout slots remain separate:

- character outfit,
- vehicle skin,
- nameplate/banner,
- optional later effects.

Mix-and-match is allowed when readable inside the signature family. If a specific pose only works with a specific vehicle skin, mark that pairing as a set-specific exception later.

## Defeated KO-State Direction

Defeated KO is the preferred asset/state term. "KO" remains the facial readability language: crossed or rolled-up pupils, sleepy compressed white eyes, and tongue blep details where appropriate.

Defeated KO states can break the active mounted pose when it improves readability, but the signature unit relationship should remain visible whenever possible.

Allowed Defeated KO staging:

- pilot collapsed over the damaged vehicle,
- pilot slumped in front of the vehicle,
- pilot partly draped on or against the vehicle,
- pilot collapsed near the damaged vehicle when over/on staging does not read at gameplay scale,
- destroyed vehicle sprite behind or under the Defeated KO character.

Defeated KO constraints:

- Nova's current prone KO sample remains an important face/eye reference and should not be discarded casually.
- Nova's next Defeated KO direction should explore her collapsed over her damaged red signature vehicle.
- Vesper's Defeated KO should avoid the rejected goofy/dumb glitch-collapse direction and should fit her blue tech/glitch rig.
- Defeated KO faces should preserve readable crossed or rolled-up pupils, sleepy compressed white eyes, and a small tongue blep where appropriate.
- Defeated KO art must not change hitboxes or combat outcomes.

## First Production Probe Recommendation

The next art probe should be purpose-built around mounted compositions, not around cropping existing full-body art.

Create disposable probes for:

- Nova default mounted pose: confident, readable, vehicle-interaction pose.
- Nova intense mounted pose: same mounted anchor, more aiming/firing energy.
- Vesper default mounted pose: cooler tech-pilot vehicle interaction, not goofy.
- Nova Defeated KO over-vehicle pose: adult anime proportions, defeated face readability, collapsed over her damaged red rig.
- Vesper Defeated KO v2: adult anime defeated pose closer in quality to Nova's sample, staged with or near/on her blue tech rig.

Review should happen through direct image inspection or simple static mockups, not the Superpowers visual companion, because the browser companion proved too hard to read and click in the Codex app.
