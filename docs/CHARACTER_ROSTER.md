# Character Roster

Living character bible for Gravity Canyon's playable pilot-plus-vehicle units.

Use this document to keep names, silhouettes, personality, lore, vehicle class, sprite prompts, and approved visual probes consistent across generation passes.

## Roster Rules

- The selectable gameplay pick is a signature pilot-plus-vehicle unit.
- Use first names in match UI and roster picker.
- Pilot identity supplies personality, mounted pose, voice, lore, portrait fantasy, and KO style.
- Vehicle family supplies class role, movement feel, weapon kit, cannon behavior, terrain interaction, and combat readability.
- Nova and Vesper use their existing runtime assets as visual baselines. Do not restart them from scratch.
- New units should begin as probes under `work/asset-lab/` before any promotion to `public/assets`.
- Match sprites should be compact, readable, adult anime arcade, thick outlined, and streamable.
- Approved gameplay candidates should be transparent PNGs. Green chroma-key images are raw workshop sources, not game-ready assets.
- Portrait and gacha art can later be more detailed, glamorous, and adult fantasy-forward than match sprites.

## Transparent PNG Workflow

Gravity Canyon's real sprite format is transparent PNG.

Use this production model:

```text
exploration -> flat green source -> remove green -> transparent PNG candidate
refinement -> use transparent PNG as visual base/reference -> save another transparent PNG
runtime integration -> transparent PNG in public/assets
```

Recommendation for now:

- Use green/chroma-key for first concepts of new units, new poses, or big redesigns.
- Use transparent PNG variants as the base/reference once a candidate is liked.
- Use only transparent PNGs for runtime aliases in `public/assets`.

The shared prompts below still mention `#00ff00` because that is useful for brand-new generated concepts. Once a candidate is liked, prefer using its transparent PNG variant as the base/reference for future edits. If an edit returns with a flattened background, clean it back to transparency before preserving it.

## Required Gameplay Assets

Each runtime-complete unit needs:

1. `vehicle-default`
2. `vehicle-destroyed`
3. `character-default`
4. `character-intense`
5. `character-ko`

Current roster generation status:

| Unit | Vehicle Default | Character Default | Character Intense | Vehicle Destroyed | Character KO | Notes |
|---|---|---|---|---|---|---|
| Nova | Runtime baseline | Runtime baseline | Runtime test alias | Runtime baseline | Runtime baseline | Existing layered assets remain the baseline; new full-unit intense alias is active for concept-preview charging. |
| Vesper | Runtime baseline | Runtime baseline | Runtime test alias | Runtime baseline | Runtime baseline | Existing layered assets remain the baseline; new full-unit intense alias is active for concept-preview charging. KO may still receive a future quality pass. |
| Kaelii | Runtime test alias | Runtime test alias | Runtime test alias | Runtime test alias | Runtime test alias | Accepted for v1 runtime testing with real vehicle wheels and animation-linked intense. Artist polish still later; KO right-eye pupil remains an open note. |
| Perlah | Runtime test alias | Runtime test alias | Runtime test alias | Runtime test alias | Runtime test alias | Accepted for v1 runtime testing using the selected v2/v1 gap-fill set. Artist polish still later. |
| Ari | Not started | Not started | Not started | Not started | Not started | First concept pass pending. |
| Lani | Not started | Not started | Not started | Not started | Not started | First concept pass pending. |
| Rook | Not started | Not started | Not started | Not started | Not started | First concept pass pending. |
| Mako | Not started | Not started | Not started | Not started | Not started | First concept pass pending. |
| Sable | Not started | Not started | Not started | Not started | Not started | First concept pass pending. |
| Talia | Not started | Not started | Not started | Not started | Not started | First concept pass pending. |

Do not mark a unit runtime-complete until all five required assets exist as transparent PNGs and have been checked at match scale.

## Shared Sprite Prompt Anchors

Use these short anchors inside each character prompt to improve consistency.

**Gameplay Unit Style**

```text
Original 2D cel-shaded adult anime arcade artillery game sprite, compact match-readable silhouette, thick dark outline, crisp cel shading, saturated but controlled colors, side-view 2D browser artillery composition, vehicle and pilot designed as one signature combat unit on a perfectly flat solid #00ff00 chroma-key background.
```

**Vehicle-Only Style**

```text
Original 2D cel-shaded compact cyber-toy artillery vehicle sprite, side-view silhouette, thick dark outline, crisp clean mechanical shapes, clear cannon direction, readable ground contact, no pilot baked in, perfectly flat solid #00ff00 chroma-key background.
```

**Mounted Character Rule**

```text
The vehicle is the gameplay anchor. The pilot must be visibly mounted on, perched on, crouched on, seated on, braced against, or collapsed on/against the vehicle. The unit must not read as a full-body character standing separately beside a vehicle.
```

**Intense Animation Rule**

```text
The intense sprite should feel like the next animation keyframe from the default pose. Preserve the same main foot, hand, hip, and vehicle contact anchors unless the unit's kit explicitly requires a full-body movement. Add intensity through grip, expression, recoil, hair/cloth motion, and vehicle charge rather than inventing a separate action illustration.
```

**Content Boundary**

```text
Original adult character only, no existing IP, no text, no watermark, no blood, no visible injury, no explicit nudity, no sex act, no lingerie-only default outfit, no underage-coded body or face, no drugging or non-consensual framing.
```

## Current Visual Probe Links

Kaelii and Perlah probes are preserved as selected sprite variants, and the current selected v1 test set has also been promoted to stable runtime aliases under `public/assets`. Default runtime aliases and their existing charge-linked frames are normalized for map-scale testing so holding Space does not change apparent unit size.

| Unit | Raw Source | Transparent Probe |
|---|---|---|
| Nova duo-identity combat direction v2 | [lab source](../public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-source.png) | [variant](../public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-alpha.png) |
| Nova normalized default runtime | [selected candidate](../public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-alpha.png) | [normalized runtime variant](../public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-battlefield-normalized.png) |
| Vesper default readability v2 | [lab source](../work/asset-lab/2026-06-16-battlefield-readability-pass/source/vesper-unit-default-readability-v2-source.png) | [variant](../public/assets/sprite-variants/units/vesper/default/vesper-unit-default-readability-v2-alpha.png) |
| Vesper normalized default runtime | [runtime source](../public/assets/vesper-unit-default.png) | [normalized runtime variant](../public/assets/sprite-variants/units/vesper/default/vesper-unit-default-battlefield-normalized.png) |
| Kaelii default readability v1 | [lab source](../work/asset-lab/2026-06-16-battlefield-readability-pass/source/kaelii-unit-default-readability-v1-source.png) | [variant](../public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-readability-v1-alpha.png) |
| Kaelii normalized default runtime | [runtime source](../public/assets/kaelii-unit-default.png) | [normalized runtime variant](../public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-battlefield-normalized.png) |
| Perlah default readability v1 | [lab source](../work/asset-lab/2026-06-16-battlefield-readability-pass/source/perlah-unit-default-readability-v1-source.png) | [variant](../public/assets/sprite-variants/units/perlah/default/perlah-unit-default-readability-v1-alpha.png) |
| Perlah normalized default runtime | [runtime source](../public/assets/perlah-unit-default.png) | [normalized runtime variant](../public/assets/sprite-variants/units/perlah/default/perlah-unit-default-battlefield-normalized.png) |
| Nova full-unit intense v1 | [variant](../public/assets/sprite-variants/units/nova/intense/nova-unit-intense-bunger-rig-probe-01-alpha.png) | [lab source](../work/asset-lab/2026-06-07-nova-vesper-intense-unit-prompts/source/nova-unit-intense-bunger-rig-probe-01.png) |
| Vesper full-unit intense v8 subtle tension scale-stable | [variant](../public/assets/sprite-variants/units/vesper/intense/vesper-unit-intense-glitch-rover-probe-08-subtle-tension-scale-stable-normalized-alpha.png) | [lab source](../work/asset-lab/2026-06-07-nova-vesper-intense-unit-prompts/source/vesper-unit-intense-glitch-rover-probe-08-subtle-tension-scale-stable.png) |
| Kaelii vehicle default | [variant](../public/assets/sprite-variants/units/kaelii/vehicle-default/kaelii-vehicle-default-flashkick-skip-rig-probe-01-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-vehicle-default-flashkick-skip-rig-probe-01.png) |
| Kaelii mounted default | [variant](../public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-flashkick-skip-rig-probe-01-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-mounted-default-flashkick-skip-rig-probe-01.png) |
| Kaelii vehicle default v2 compact | [variant](../public/assets/sprite-variants/units/kaelii/vehicle-default/kaelii-vehicle-default-flashkick-skip-rig-probe-02-compact-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-vehicle-default-flashkick-skip-rig-probe-02-compact.png) |
| Kaelii mounted default v2 compact hair | [variant](../public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-flashkick-skip-rig-probe-02-tritone-hair-compact-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-mounted-default-flashkick-skip-rig-probe-02-tritone-hair-compact.png) |
| Kaelii vehicle default v3 no shoe-wheels | [variant](../public/assets/sprite-variants/units/kaelii/vehicle-default/kaelii-vehicle-default-flashkick-skip-rig-probe-03-no-shoe-wheels-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-vehicle-default-flashkick-skip-rig-probe-03-no-shoe-wheels.png) |
| Kaelii mounted default v3 pupil fixed | [variant](../public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-flashkick-skip-rig-probe-03-no-shoe-wheels-pupil-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-mounted-default-flashkick-skip-rig-probe-03-no-shoe-wheels-pupil.png) |
| Kaelii intense v5 animation-linked | [variant](../public/assets/sprite-variants/units/kaelii/intense/kaelii-unit-intense-flashkick-skip-rig-probe-05-animation-linked-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-character-intense-flashkick-skip-rig-probe-05-animation-linked.png) |
| Kaelii vehicle destroyed v3 no shoe-wheels | [variant](../public/assets/sprite-variants/units/kaelii/vehicle-destroyed/kaelii-vehicle-destroyed-flashkick-skip-rig-probe-03-no-shoe-wheels-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-vehicle-destroyed-flashkick-skip-rig-probe-03-no-shoe-wheels.png) |
| Kaelii Defeated KO v5 user pupil placement | [variant](../public/assets/sprite-variants/units/kaelii/defeated-ko/kaelii-unit-defeated-ko-flashkick-skip-rig-probe-05-user-pupil-placement-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/kaelii-character-ko-flashkick-skip-rig-probe-05-user-pupil-placement.png) |
| Perlah vehicle default | [variant](../public/assets/sprite-variants/units/perlah/vehicle-default/perlah-vehicle-default-sunspike-embercart-probe-01-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-vehicle-default-sunspike-embercart-probe-01.png) |
| Perlah mounted default | [variant](../public/assets/sprite-variants/units/perlah/default/perlah-unit-default-sunspike-embercart-probe-01-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-mounted-default-sunspike-embercart-probe-01.png) |
| Perlah vehicle default v2 compact | [variant](../public/assets/sprite-variants/units/perlah/vehicle-default/perlah-vehicle-default-sunspike-embercart-probe-02-compact-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-vehicle-default-sunspike-embercart-probe-02-compact.png) |
| Perlah mounted default v2 compact | [variant](../public/assets/sprite-variants/units/perlah/default/perlah-unit-default-sunspike-embercart-probe-02-compact-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-mounted-default-sunspike-embercart-probe-02-compact.png) |
| Perlah intense v2 footprint-locked | [variant](../public/assets/sprite-variants/units/perlah/intense/perlah-unit-intense-sunspike-embercart-probe-02-default-anchored-normalized-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-character-intense-sunspike-embercart-probe-02-default-anchored.png) |
| Perlah vehicle destroyed v1 | [variant](../public/assets/sprite-variants/units/perlah/vehicle-destroyed/perlah-vehicle-destroyed-sunspike-embercart-probe-01-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-vehicle-destroyed-sunspike-embercart-probe-01.png) |
| Perlah Defeated KO v2 pupil repaired | [variant](../public/assets/sprite-variants/units/perlah/defeated-ko/perlah-unit-defeated-ko-sunspike-embercart-probe-02-pupil-repaired-alpha.png) | [lab source](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/source/perlah-character-ko-sunspike-embercart-probe-02-pupil-repaired.png) |

Comparison sheet:

- [Kaelii/Perlah/Nova/Vesper contact sheet](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/mockups/kaelii-perlah-nova-vesper-probe-contact-sheet.png)
- [Kaelii v1/v2/Nova/Vesper contact sheet](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/mockups/kaelii-v1-v2-nova-vesper-contact-sheet.png)
- [Perlah v1/v2/Nova/Vesper contact sheet](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/mockups/perlah-v1-v2-nova-vesper-contact-sheet.png)
- [Kaelii selected state contact sheet](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/mockups/kaelii-gap-fill-no-shoe-animation-contact-sheet.png)
- [Perlah selected state contact sheet](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/mockups/perlah-gap-fill-contact-sheet.png)
- [Kaelii/Perlah selected gap-fill contact sheet](../work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/mockups/kaelii-perlah-gap-fill-contact-sheet.png)
- [Runtime scale contact sheet](../work/asset-lab/2026-06-07-nova-vesper-intense-unit-prompts/mockups/unit-runtime-scale-contact-sheet.png)

Detailed prompt pack:

- [Nova and Vesper full-unit intense sprite prompt pack](superpowers/specs/2026-06-07-nova-vesper-intense-sprite-prompt-pack.md)
- [Kaelii and Perlah sprite prompt pack](superpowers/specs/2026-06-07-kaelii-perlah-sprite-prompt-pack.md)

## Unit Cards

### Nova

- Class family: `bunger`
- Signature vehicle: Redline Bunger Rig
- Visual identity: Red-haired adult hotshot with goggles, red-black pilot gear, gloves, heavy boots, and an aggressive mounted silhouette.
- Accepted combat direction: duo-identity artillery unit. Nova should read as the warm human pilot through face, arms, goggles, red hair, and light cream/white clothing contrast, while the Redline Bunger Rig remains the chunky red-and-white terrain-contact and collision body.
- Current accepted direction candidate: `public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-alpha.png`. The normalized version is now promoted to the default runtime alias at `public/assets/nova-unit-default.png` for map/scale exploration.
- Personality: Daring, impatient, competitive, happiest when the terrain gives way.
- Tiny lore: A canyon circuit ace who made her name blasting rivals off suspended shelves.
- Active stance: Crouched on top of her Redline Bunger Rig, one boot planted on the chassis, leaning forward like she is about to launch herself with the shot.
- Intense stance: Same crouched anchor, shoulders lower, goggles glinting, both hands braced as the cannon kicks forward.
- Defeated KO stance: Loses balance after impact and falls face-first over the front of the damaged rig, goggles crooked, body flat and spent.
- Tight generation anchor: `Nova, red-haired adult canyon hotshot, goggles, red-black pilot gear, heavy boots, crouched aggressively on a red arcade bunger artillery rig, crater-class terrain-shove identity.`
- Baseline images: `public/assets/nova-character-default.png`, `public/assets/nova-character-intense.png`, `public/assets/nova-character-ko.png`, `public/assets/nova-vehicle-sprite.png`, `public/assets/nova-vehicle-destroyed.png`, `public/assets/nova-unit-intense.png`.

### Vesper

- Class family: `glitch`
- Signature vehicle: Blue Glitch Rover
- Visual identity: Cyan-blue hair, short twin-braid accents, blue headset, blue-black tech outfit, gloves, and chunky blue-white sneakers.
- Personality: Cool, precise, surgical, smug when enemies walk into her fields.
- Tiny lore: A signal engineer who learned to weaponize broken gravity relays.
- Active stance: Low seated or crouched on the side of her Glitch Rover, one hand on a glowing control panel, calm and precise.
- Current default runtime direction: readability v2, with a larger face/head, simplified blue-white rover mass, and warmer face contrast so Vesper remains identifiable at match scale.
- Intense stance: Same apparent unit size as default, but with believable power-shot tension: joystick grip tight, deck-control hand active, front leg pressing down slightly, the rover allowed a small recoil/compression read, headset lit, cannon reticle active, and compact glitch UI wrapped tightly around the rover.
- Defeated KO stance: Slumped over the console with her headset askew, blue panels flickering around her like the vehicle crashed mid-signal.
- Tight generation anchor: `Vesper, cyan-blue adult glitch engineer, short twin-braid accents, blue headset, blue-black tech outfit, chunky blue-white sneakers, crouched at a blue glitch rover console, disruption-field identity.`
- Baseline images: `public/assets/vesper-character-default.png`, `public/assets/vesper-character-intense.png`, `public/assets/vesper-character-ko.png`, `public/assets/vesper-vehicle-sprite.png`, `public/assets/vesper-vehicle-destroyed.png`, `public/assets/vesper-unit-intense.png`.

### Kaelii

- Class family: `bouncer`
- Signature vehicle: Flashkick Skip-Rig
- Visual identity: Bronze-skinned adult stunt pilot with golden eyes, playful smirk, pink-black techwear, white sneakers with pink laces, thigh straps, fingerless gloves, and a stage-ready silhouette.
- Vehicle visual lock: The Flashkick Skip-Rig uses real compact circular wheels, mechanical rim covers, spring suspension, rails, and bounce pads. Kaelii wears sneakers; the vehicle must not have shoe-shaped wheels, sneaker wheel guards, toe-box armor, sole-like plates, or lace-like vehicle parts.
- Hair lock: Tri-tone black, deep purple, and hot pink hair. Use high twin buns with braided wrap loops around each bun, hot pink streaks, long black-purple bangs, loose stray strands, and glossy anime highlights. This is based on the user-provided hair reference.
- Personality: Loud, cocky, flirtatious, expressive, reckless when watched, and theatrically annoyed when outplayed.
- Tiny lore: A former stunt-stream idol who turned ricochet artillery into performance art.
- Active stance: Perched showily on the Flashkick Skip-Rig, one foot on a cannon rail, hips angled toward the camera, taunting like the match is a stage.
- Current default runtime direction: readability v1, with a lower perch, clear golden-eyed face, strong bronze-skin contrast, and real wheel/rail vehicle cues.
- Intense stance: Same perch as default, compressed into an animation-linked recoil keyframe: hands grip tighter, shoulders lower, hips and knees tense, hair and jacket react, and both sneakers stay close to their default vehicle anchors.
- Defeated KO stance: Slid sideways off her perch, sprawled across the chassis with one sneaker dangling, the rig's spotlight strip dimmed out.
- Tight generation anchor: `Kaelii, bronze-skinned adult stunt idol, golden eyes, tri-tone black/deep-purple/hot-pink high twin buns with braided wrap loops and pink streaks, pink-black techwear, white sneakers with pink laces, perched on a pink-black springy bouncer skip-rig, ricochet trick-shot identity.`
- Current probe images: see Current Visual Probe Links above. The readability v1 default is the current runtime default candidate; v5 animation-linked intense/KO probes remain useful state references.
- Open art note: Kaelii Defeated KO v5 is useful as a candidate, but the KO pupil placement still needs a future artist or refinement pass. The right-eye pupil placement in particular does not feel quite right yet.
- Runtime test aliases: `public/assets/kaelii-vehicle-sprite.png`, `public/assets/kaelii-vehicle-destroyed.png`, `public/assets/kaelii-unit-default.png`, `public/assets/kaelii-unit-intense.png`, `public/assets/kaelii-unit-ko.png`.

### Perlah

- Class family: `spark`
- Signature vehicle: Sunspike Embercart
- Visual identity: Shorter Filipina-inspired adult pilot with golden-brown skin, slim athletic build, long legs, curly black hair with orange highlights, orange-black island salvage racer styling, heatproof gloves, compact boots, and wrap-tech details.
- Personality: Warm, teasing, scrappy, underestimated, and very happy to make the canyon too hot to stand on.
- Tiny lore: She salvaged old Spark engines from canyon wrecks and rebuilt them into a festival-bright artillery cart.
- Active stance: Kneeling low against the Sunspike Embercart's heat shield, one hand braced on the cannon housing, compact and ready.
- Current default runtime direction: readability v1, with her face and curls raised above the embercart mass, stronger warm skin contrast, and simplified orange-black vehicle shapes.
- Intense stance: Braced behind the heat shield as orange vents flare, hair and wrap details kicked by furnace wind.
- Defeated KO stance: Draped belly-down across the warm engine cover, hair messy, vehicle vents puffing smoke as if the heat finally overwhelmed the cart.
- Tight generation anchor: `Perlah, shorter Filipina-inspired adult spark pilot, golden-brown skin, curly black hair with orange highlights, orange-black island salvage racer outfit, kneeling behind an orange-black volcanic embercart heat shield, warm teasing heat-zone identity.`
- Current probe images: see Current Visual Probe Links above. The readability v1 default is the current runtime default candidate; v1/v2 gap-fill state probes remain useful state references.
- Runtime test aliases: `public/assets/perlah-vehicle-sprite.png`, `public/assets/perlah-vehicle-destroyed.png`, `public/assets/perlah-unit-default.png`, `public/assets/perlah-unit-intense.png`, `public/assets/perlah-unit-ko.png`.

### Ari

- Class family: `glitch`
- Signature vehicle: Moonlace Relay
- Visual identity: Adult white-haired twin with cool silver-blue styling, elegant tech-fabric outfit, soft glamorous silhouette, and calm gravity-ribbon effects.
- Personality: Quiet, precise, protective, difficult to read.
- Tiny lore: One half of the Solenne twins, Ari studies gravity fields like music.
- Active stance: Elegantly seated on the Moonlace Relay's side ring, hands guiding thin gravity ribbons, posture calm and almost dancer-like.
- Intense stance: Same side-ring seat, hair sweeping forward, both hands pulling a bright ribbon taut before firing.
- Defeated KO stance: Folded forward against the relay ring, long white hair spilling over the controls, gravity ribbons collapsed around her.
- Tight generation anchor: `Ari, elegant adult white-haired twin, cool silver-blue tech-fabric outfit, calm moonlit gravity-ribbon effects, seated on a Moonlace Relay side ring, precise glitch field-control identity.`

### Lani

- Class family: `spark`
- Signature vehicle: Sunlace Flarepod
- Visual identity: Adult white-haired twin with warmer sun-gold accents, brighter styling, athletic stage energy, and a more impulsive silhouette than Ari.
- Personality: Loud, impulsive, competitive, affectionate with Ari, and allergic to being treated as the lesser twin.
- Tiny lore: Ari maps the field; Lani lights it up. Their rivalry is affectionate but very real.
- Active stance: Half-standing, half-braced on the Sunlace Flarepod with one knee on the vehicle and one hand thrown back for flair.
- Intense stance: Leaning hard into the shot, one knee locked on the flarepod, sun panels open around her.
- Defeated KO stance: Tumbled backward into the flarepod's seat well, limbs loose, hair fanned out, burst panels popped open around her.
- Tight generation anchor: `Lani, bright adult white-haired twin, sun-gold accents, athletic stage-energy pose, half-braced on a Sunlace Flarepod, impulsive spark flare-burst identity.`

### Rook

- Class family: `bunger`
- Signature vehicle: Quarryback Mortar
- Visual identity: Broad adult male pilot with dust-coated armor jacket, heavy boots, miner-mechanic gear, practical gloves, and a grounded silhouette.
- Personality: Patient, dry, stubborn, terrifyingly calm under fire.
- Tiny lore: A canyon quarry veteran who joined the circuit after the mines started floating away.
- Active stance: Seated heavily behind the Quarryback Mortar, shoulders squared, both boots planted, one hand gripping a stabilizer handle.
- Intense stance: Braced hard with both hands on the mortar handles, vehicle suspension compressed into the dirt.
- Defeated KO stance: Slumped forward over the mortar shield, helmet or goggles lowered, the rig nose-down in broken dirt.
- Tight generation anchor: `Rook, broad adult quarry veteran, dust-coated armor jacket, heavy boots, miner-mechanic gear, seated behind a rugged Quarryback Mortar, heavy bunger crater-control identity.`

### Mako

- Class family: `bouncer`
- Signature vehicle: Railfin Roller
- Visual identity: Lean adult male pilot with sea-racer and canyon-boarder gear, teal accents, wind-tossed hair, and a long trick-shot silhouette.
- Personality: Charming, slippery, evasive, impossible to pin down.
- Tiny lore: He grew up riding gravity rails between canyon islands and treats artillery like surfing.
- Active stance: Surf-like crouch on the Railfin Roller, one foot forward and one back, riding the vehicle as if it is a gravity board.
- Intense stance: Lower surf crouch with one hand cutting through the air and the roller fins glowing during the shot.
- Defeated KO stance: Knocked off rhythm and collapsed sideways along the roller track, one arm over the wheel housing, rail fins bent.
- Tight generation anchor: `Mako, lean adult gravity-rail surfer, teal canyon-boarder gear, wind-tossed hair, surf-crouched on a Railfin Roller, slope-riding bouncer trick-shot identity.`

### Sable

- Class family: `glitch`
- Signature vehicle: Null-Kite Crawler
- Visual identity: Androgynous adult pilot with black-white asymmetrical coat, sharp eyes, floating scarf or cable shapes, and a compact crouched silhouette.
- Personality: Detached, poetic, quietly menacing.
- Tiny lore: A banned cartographer who charts places where gravity forgets the rules.
- Active stance: Compact crouch atop the Null-Kite Crawler, coat and scarf shapes floating slightly, one hand hovering over a dark gravity marker.
- Intense stance: Crouched lower with cables pulled taut around the marker, vehicle legs spread like a survey instrument.
- Defeated KO stance: Folded beside the crawler like gravity switched off, scarf and cables limp, vehicle legs tucked in and inert.
- Tight generation anchor: `Sable, androgynous adult banned cartographer, black-white asymmetrical coat, sharp eyes, floating scarf cables, compact crouch on a Null-Kite Crawler, dark glitch dead-zone identity.`

### Talia

- Class family: `spark`
- Signature vehicle: Kilnback Howitzer
- Visual identity: Adult forge-tech pilot with dark hair, amber goggles, soot-black and brass outfit, gloves, and a confident cannon-brace silhouette.
- Personality: Blunt, warm, big-sister energy, dangerous when cornered.
- Tiny lore: She builds tournament rigs from cracked furnace cores and sells repairs to rivals after beating them.
- Active stance: Seated sideways against the Kilnback Howitzer, one boot braced on the furnace plate, hand on the firing lever, relaxed but dominant.
- Intense stance: Leaning into the lever as the kiln glow rises, goggles lit amber, furnace panels open.
- Defeated KO stance: Slumped back against the cracked kiln cannon, goggles tilted, forge glow reduced to dull embers.
- Tight generation anchor: `Talia, adult forge-tech pilot, dark hair, amber goggles, soot-black brass outfit, seated against a Kilnback Howitzer furnace cannon, molten spark-forge identity.`
