# Nova And Vesper Full-Unit Intense Sprite Prompt Pack

Purpose: generate full pilot-plus-signature-vehicle intense sprites for Nova and Vesper so the default full-unit preview changes visibly while a shot is charging.

Workflow:

- Generate on flat `#00ff00` chroma key.
- Preserve the approved mounted default unit as the identity and composition baseline.
- Treat intense as the next animation keyframe, not a new unrelated action illustration.
- Remove chroma key into transparent PNG before promoting to `public/assets`.

## Nova Intense Prompt

```text
Use case: stylized-concept
Asset type: 2D gameplay sprite candidate for Gravity Canyon, full pilot-plus-signature-vehicle unit, intense shooting state.
Primary request: Create a new Nova intense firing sprite that matches the provided Nova mounted full-unit reference image as the identity and composition baseline, but is clearly an intense shooting keyframe.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, floor plane, reflections, or lighting variation. Do not use #00ff00 anywhere in the subject.
Subject: Nova, adult anime canyon hotshot pilot with vivid red high ponytail, goggles on head, red-black armored pilot jacket, gloves, heavy boots, confident aggressive expression, crouched low on her red arcade Bunger artillery rig. Keep her riding on top of the vehicle, not standing beside it. Preserve the same main contact anchors from the default mounted reference: one hand braced near the deck, one arm near the cannon, crouched knees, compact silhouette, pilot and vehicle integrated as one readable unit.
Vehicle: red-and-white hover artillery rig with large forward cannon, star motif, orange/yellow glowing hover pads and vents, chunky arcade toy-mecha construction. It should read as the same Nova Bunger rig family from the reference.
Pose/state: intense firing version of the default mounted pose, like the next animation frame. Nova tightens her grip and lowers her shoulders, eyes sharper, smirk turning focused, hair and jacket edges whipping from recoil. The cannon glows brighter with warm orange energy, vents flaring, slight recoil compression in the rig, but do not add a fired projectile or explosion.
Style/medium: premium adult anime arcade game sprite, clean cel shading, crisp face detail, thick dark outline, polished high-detail but gameplay-readable silhouette, consistent with the Kaelii and Perlah full-unit sprite style.
Composition/framing: wide full-unit side-view sprite, centered with generous padding, no cropping, character and full vehicle visible, transparent-ready chroma-key source.
Constraints: no text, no watermark, no UI, no extra characters, no smoke covering the silhouette, no blood, no gore, no nudity, no explicit exposure, no semi-chibi or super-deformed proportions. Keep it streamable and readable for a browser artillery game.
```

Selected output:

- Chroma source: `work/asset-lab/2026-06-07-nova-vesper-intense-unit-prompts/source/nova-unit-intense-bunger-rig-probe-01.png`
- Transparent variant: `public/assets/sprite-variants/units/nova/intense/nova-unit-intense-bunger-rig-probe-01-alpha.png`
- Runtime test alias: `public/assets/nova-unit-intense.png`

## Vesper Intense Prompt

```text
Use case: stylized-concept
Asset type: 2D gameplay sprite candidate for Gravity Canyon, full pilot-plus-signature-vehicle unit, Vesper intense shooting / power-charge state.
Primary request: Create a Vesper intense sprite that reads as a cool hacker-pilot power-hold while keeping the same apparent unit scale as the Vesper default mounted unit. This is an animation keyframe, not a new unrelated action illustration. Minor recoil, compression, and pilot tension are allowed, but the intense art must not make Vesper or the Glitch Rover look noticeably larger, smaller, longer, shorter, or like a different-size unit.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, floor plane, reflections, or lighting variation. Do not use #00ff00 anywhere in the subject.
Subject: Vesper, adult anime glitch engineer pilot with cyan-blue hair, short twin-braid accents, blue headset, blue-black tech outfit with white sleeves, gloves, chunky blue-white sneakers, focused clever expression. Keep her apparent head, torso, and rider mass close to default.
Vehicle: the same blue-white-black Glitch Rover from default. The rover may show a small power-shot recoil/compression read, but keep the same apparent vehicle scale, cannon mass, rear antenna mass, hover-pad line, chassis mass, and overall vehicle identity.
Scale-stable motion rule: subtle movement is allowed. Vesper's front knee may tighten, front sneaker may press or pivot slightly, tucked leg may tense, shoulders may lean a hair forward, and the rover may compress or recoil a little. Avoid dramatic repositioning, major cannon/chassis drift, new vehicle proportions, standing poses, large leg swings, or anything that makes the runtime sprite pop to a different size.
Intense action: make the power-hold visibly active while keeping the same unit scale. One hand clamps harder on the joystick, the other punches or drags across a glowing deck control, her eyes sharpen, the headset lights, small dashboard panels flare, and tiny hair/braid motion suggests the rover is charging.
Effects: compact but exciting. Add an active cyan cannon reticle, angular targeting grid, small square glitch pixels close to the muzzle and control deck, and short electrical arcs wrapped around the cannon housing. No fired projectile, no explosion, no long beam, no large aura, no big effects below the hover pads, no wide side spread.
Style/medium: premium adult anime arcade game sprite, clean cel shading, crisp face detail, thick dark outline, polished high-detail but gameplay-readable silhouette, consistent with the Kaelii and Perlah full-unit sprite style.
Composition/framing: same side-view framing and same apparent unit scale as default Vesper. Full unit visible with useful padding, transparent-ready chroma-key source.
Constraints: no text, no watermark, no UI, no extra characters, no smoke covering the silhouette, no fired projectile, no explosion, no blood, no gore, no nudity, no explicit exposure, no semi-chibi or super-deformed proportions. Keep it streamable and readable for a browser artillery game.
```

Selected output:

- Chroma source: `work/asset-lab/2026-06-07-nova-vesper-intense-unit-prompts/source/vesper-unit-intense-glitch-rover-probe-08-subtle-tension-scale-stable.png`
- Transparent variant: `public/assets/sprite-variants/units/vesper/intense/vesper-unit-intense-glitch-rover-probe-08-subtle-tension-scale-stable-normalized-alpha.png`
- Runtime test alias: `public/assets/vesper-unit-intense.png`
