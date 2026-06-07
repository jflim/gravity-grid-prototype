# Adult Playable Sprite Probes Design

Date: 2026-06-07
Project: Gravity Canyon

## Goal

Run a small visual probe to decide whether Gravity Canyon should move from compact/semi-chibi character gameplay sprites toward adult-anime playable character sprites.

This is an art-direction probe, not a live asset replacement. The output should help choose the long-term character sprite direction before changing runtime aliases in `public/assets`.

## Context

Current runtime character sprites have mixed style and scale:

- Nova default is a compact seated gameplay sprite.
- Nova KO is a wide adult-anime prone KO sprite with a carefully tuned pose and eye expression.
- Vesper default is compact/seated.
- Vesper KO still needs a stronger production-quality replacement.

The risk is that adult-anime master art looks expressive in isolation but becomes too large, too detailed, or too visually noisy in the match screen.

## Probe Scope

Create disposable adult-anime playable sprite probes for:

- Nova default playable pose.
- Nova KO playable pass based on the existing successful KO direction.
- Vesper KO playable pose.

Do not replace runtime files during this probe. Save probe outputs as candidates under `work/` or under versioned `public/assets/sprite-variants/...` only after selection.

## Nova KO Preservation Rules

The existing Nova KO direction is a near-locked reference for pose and expression.

Preserve:

- Full-body sprawled face-down KO pose.
- Head low, arms slack, legs awkwardly collapsed.
- Goofy defeated adult-anime tone.
- Goggles displaced but not covering the eyes.
- Heavy sleepy eyelids.
- Open mouth with small tongue blep.
- Thin slit-shaped white KO eyes.
- Small oval pupils inside both eye whites.
- Pupils rolled upward and crossed inward.

Allowed adjustments:

- Simplify tiny costume details for gameplay readability.
- Tighten crop and transparent bounds.
- Improve edge outline thickness.
- Reduce excess illustration density.
- Adjust export/display size so the sprite fits the active unit frame.

Do not materially change:

- The core pose.
- The eye mechanic.
- The KO expression.
- The adult-anime identity.

## Adult Playable Style Target

Adult-anime playable sprites should not be full collection art pasted into combat.

They should use:

- Adult anime proportions, but compact battlefield silhouette.
- Tasteful adult-anime fan-service cues where they support character appeal.
- Thick dark outline.
- Clean cel shading.
- Face details large enough to read at match scale.
- Simplified clothing/gear detail compared with high-detail master art.
- Transparent or removable chroma-key background.
- Generous source padding before trimming, then tight final transparent bounds.

## Fan-Service Boundary

Tasteful adult fan service is allowed for the adult-playable probe, especially through mature proportions, confident styling, fitted arcade pilot outfits, legs/boots/silhouette, expressive faces, and stylish pose language.

Combat readability still comes first. Gameplay sprites should remain compact, stream-safe, and readable at match scale. KO sprites should feel goofy, defeated, and expressive rather than eroticized, because they represent a vulnerable combat-loss state.

Runtime target:

- Upright poses should roughly fit the current character layer footprint, about 120-155 px display height.
- Wide KO poses may be wider, but should stay visually inside the active-unit frame and avoid covering labels, HP bars, aim cues, or terrain impacts.

## Vesper KO Direction

Use `public/assets/vesper-character-default.png` as the identity/style reference.

Vesper KO should be distinct from Nova:

- Glitch-overloaded collapse.
- Loose limbs.
- Slightly crooked headset.
- Messy cyan-blue hair.
- Small harmless blue pixel-glitch sparks around gear.
- Same readable KO eye rules: compressed white slit eyes with small oval pupils rolled upward and crossed inward.

## Comparison Criteria

After probes are generated, compare them in a battlefield mockup against the current compact sprites.

Judge:

- Does the character read instantly at gameplay scale?
- Does the pose fit beside the vehicle without dominating it?
- Are KO face details readable without oversized art?
- Does adult-anime style improve character fantasy enough to justify the added asset discipline?
- Can Nova and Vesper share one export sizing/anchor rule?

## Non-Goals

- No live runtime alias replacement yet.
- No final sprite-set commitment yet.
- No vehicle sprite changes.
- No combat stat, hitbox, projectile, wind, matchmaking, or reward changes.
- No prompt drift toward explicit injury, blood, nudity, or platform-risky content.

## Proposed Next Step

Generate rough adult-playable probes for the three scoped states, then place them into the visual companion beside current sprites at approximate runtime scale.

The first generated pass should be treated as disposable. The decision after viewing should be either:

- stay compact/semi-chibi,
- commit to adult-anime playable with a formal export pipeline,
- or choose a hybrid rule that keeps adult identity but uses compact/chibi-like simplification for readability.
