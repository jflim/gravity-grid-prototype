# Playable Roster Sprite Design

Date: 2026-06-07
Project: Gravity Canyon

## Goal

Define the first 10 signature pilot plus vehicle units clearly enough to generate playable sprites without losing the character identity work already done for Nova and Vesper.

This is a roster and sprite-production spec, not a balance-final gameplay spec. Weapon names and exact numbers can change after playtesting.

## Core Decision

Gravity Canyon should treat each selectable gameplay pick as a signature unit:

```text
pilot + vehicle family + class kit + special shot
```

The pilot gives the unit its personality, silhouette, voice, mounted pose, KO style, lore hook, and portrait fantasy. The vehicle gives the unit its class role, movement feel, weapon family, cannon behavior, terrain interaction, and combat readability.

This preserves the Gunbound-like feeling of choosing a vehicle class while making each vehicle feel authored around a character rather than generic.

## Naming Rule

Use first names in the match UI and roster picker.

Longer names, surnames, titles, and region tags can exist later for lore cards, profile pages, and collection text, but combat labels should stay short:

- Nova
- Vesper
- Kaelii
- Perlah
- Ari
- Lani
- Rook
- Mako
- Sable
- Talia

## Nova And Vesper Baseline Rule

Nova and Vesper should not be restarted from scratch.

The current Nova and Vesper runtime assets remain the visual baseline for their production identity:

- `public/assets/nova-character-default.png`
- `public/assets/nova-character-intense.png`
- `public/assets/nova-character-ko.png`
- `public/assets/nova-vehicle-sprite.png`
- `public/assets/nova-vehicle-destroyed.png`
- `public/assets/vesper-character-default.png`
- `public/assets/vesper-character-intense.png`
- `public/assets/vesper-character-ko.png`
- `public/assets/vesper-vehicle-sprite.png`
- `public/assets/vesper-vehicle-destroyed.png`

Future Nova or Vesper refreshes should use these as reference images and should be saved as probes or variants first. Do not overwrite their stable runtime aliases unless the user explicitly chooses a replacement.

## Sprite Asset Set

Each signature unit needs these gameplay assets:

- `vehicle-default`: standalone vehicle gameplay sprite with no pilot baked in.
- `vehicle-destroyed`: damaged version of the same vehicle.
- `character-default`: mounted, perched, seated, crouched, or braced character sprite designed to layer with the vehicle.
- `character-intense`: same unit identity with stronger firing energy.
- `character-ko`: Defeated KO sprite that keeps the pilot and damaged vehicle relationship readable.

Portrait, card, gacha, and adult fantasy collection art can come later and can use higher detail, stronger fashion, and more character-forward posing than match sprites.

## Background And Transparency Workflow

The final game asset should be a transparent PNG. Green chroma-key images are source/workshop images only.

Use this rule:

```text
green source = useful for generating and workshopping
transparent PNG = preserved candidate or runtime-ready sprite
```

For brand-new AI sprite concepts, it is acceptable to generate on a flat `#00ff00` background because it gives a predictable cleanup path. After generation, remove the green, validate the alpha channel, and preserve the transparent PNG as the candidate under `public/assets/sprite-variants/...`.

For approved candidates, future iterations should increasingly use the transparent PNG as the visual base or reference. This is closer to a normal game-art workflow: revise the current sprite, keep the pose and silhouette, and export another transparent PNG. If the generator flattens the result onto a background, clean it back to transparency before review or promotion.

Do not promote green-background images to runtime aliases. Runtime aliases in `public/assets` should be transparent PNGs.

## Match Sprite Style Rule

Playable sprites should be:

- original adult anime arcade characters,
- compact and readable at match scale,
- outlined with strong silhouettes,
- chroma-key or transparent-background friendly,
- designed around the vehicle as the gameplay anchor,
- stylish and attractive without relying on body-focused details for readability.

Avoid explicit nudity, sex acts, lingerie-only defaults, underage-coded sexuality, visible injury, blood, drugging framing, or defeat poses that feel non-consensual rather than arcade KO. Defeated KO sprites can be dramatic, silly, dazed, or theatrical, but should read as game-state feedback.

## Class Families

Internal class families remain:

- `bunger`: terrain excavation, pits, bowls, shove setups, fall KOs.
- `glitch`: disruption, temporary fields, shot or movement denial.
- `bouncer`: ricochets, rolling mines, slope exploitation, trick shots.
- `spark`: splash, heat, flare, magma, lingering area denial.

Public class names can be improved later. For now, the class family is more important than final terminology.

## Roster V0.1

### Nova

- Class family: `bunger`
- Signature vehicle: Redline Bunger Rig
- Visual identity: Red-haired adult hotshot with goggles, red-black pilot gear, gloves, heavy boots, and an aggressive mounted silhouette.
- Personality: Daring, impatient, competitive, happiest when the terrain gives way.
- Tiny lore: A canyon circuit ace who made her name blasting rivals off suspended shelves.
- Primary shot: Heavy crater shell.
- Special shot: Fault Pop, a delayed terrain shove that rewards setup shots.
- Active stance: Crouched on top of her Redline Bunger Rig, one boot planted on the chassis, leaning forward like she is about to launch herself with the shot.
- Intense stance: Same crouched anchor, shoulders lower, goggles glinting, both hands braced as the cannon kicks forward.
- Defeated KO stance: Loses balance after impact and falls face-first over the front of the damaged rig, goggles crooked, body flat and spent.
- Sprite note: Reuse existing Nova images as baseline identity and alignment references.

### Vesper

- Class family: `glitch`
- Signature vehicle: Blue Glitch Rover
- Visual identity: Cyan-blue hair, short twin-braid accents, blue headset, blue-black tech outfit, gloves, and chunky blue-white sneakers.
- Personality: Cool, precise, surgical, smug when enemies walk into her fields.
- Tiny lore: A signal engineer who learned to weaponize broken gravity relays.
- Primary shot: Disruption bolt.
- Special shot: Blue Screen Field, a temporary field that weakens enemy movement or shot control.
- Active stance: Low seated or crouched on the side of her Glitch Rover, one hand on a glowing control panel, calm and precise.
- Intense stance: Leaning tighter into the console, headset active, fingers moving fast over flickering blue controls.
- Defeated KO stance: Slumped over the console with her headset askew, blue panels flickering around her like the vehicle crashed mid-signal.
- Sprite note: Reuse existing Vesper images as baseline identity and alignment references.

### Kaelii

- Class family: `bouncer`
- Signature vehicle: Flashkick Skip-Rig
- Visual identity: Bronze-skinned adult stunt pilot with tri-tone black, deep purple, and hot pink high twin buns, golden eyes, pink-black techwear, white sneakers, pink laces, thigh straps, fingerless gloves, and a stage-ready silhouette.
- Hair lock: Use the user-provided hair reference as the anchor: glossy black and deep purple hair, hot pink streaks, high twin buns with braided wrap loops around each bun, long bangs, and loose stray strands.
- Personality: Loud, cocky, flirtatious, expressive, reckless when watched, and theatrically annoyed when outplayed.
- Tiny lore: A former stunt-stream idol who turned ricochet artillery into performance art.
- Primary shot: One-bounce skip shot.
- Special shot: Spotlight Rebound, a shell that gains stronger splash after bouncing off terrain.
- Active stance: Perched showily on the Flashkick Skip-Rig, one foot on a cannon rail, hips angled toward the camera, taunting like the match is a stage.
- Intense stance: Same perch as default, compressed into an animation-linked recoil keyframe: hands grip tighter, shoulders lower, hips and knees tense, hair and jacket react, and both sneakers stay close to their default vehicle anchors.
- Defeated KO stance: Slid sideways off her perch, sprawled across the chassis with one sneaker dangling, the rig's spotlight strip dimmed out.
- Sprite note: Preserve the old Kaelii DNA: tri-tone black/deep-purple/hot-pink twin buns, golden eyes, pink-black fashion, bratty confidence, and attention-seeking energy. Translate the old reckless defeat energy into arcade KO staging. The Flashkick Skip-Rig uses real compact circular wheels, mechanical rim covers, rails, springs, and bounce pads; Kaelii's sneakers are clothing only, not vehicle parts.

### Perlah

- Class family: `spark`
- Signature vehicle: Sunspike Embercart
- Visual identity: Shorter Filipina-inspired adult pilot with golden-brown skin, slim athletic build, long legs, curly black hair with orange highlights, orange-black island salvage racer styling, heatproof gloves, compact boots, and wrap-tech details.
- Personality: Warm, teasing, scrappy, underestimated, and very happy to make the canyon too hot to stand on.
- Tiny lore: She salvaged old Spark engines from canyon wrecks and rebuilt them into a festival-bright artillery cart.
- Primary shot: Ember shell with splash damage.
- Special shot: Sunspike Bloom, a lingering heat zone that softens terrain.
- Active stance: Kneeling low against the Sunspike Embercart's heat shield, one hand braced on the cannon housing, compact and ready.
- Intense stance: Braced behind the heat shield as orange vents flare, hair and wrap details kicked by furnace wind.
- Defeated KO stance: Draped belly-down across the warm engine cover, hair messy, vehicle vents puffing smoke as if the heat finally overwhelmed the cart.
- Sprite note: Preserve the old Perlah DNA: golden-brown skin, curly black hair with orange highlights, orange-black styling, tropical heat identity, and attractive adult portrait potential. Keep match outfit streamable and vehicle-connected.

### Ari

- Class family: `glitch`
- Signature vehicle: Moonlace Relay
- Visual identity: Adult white-haired twin with cool silver-blue styling, elegant tech-fabric outfit, soft glamorous silhouette, and calm gravity-ribbon effects.
- Personality: Quiet, precise, protective, difficult to read.
- Tiny lore: One half of the Solenne twins, Ari studies gravity fields like music.
- Primary shot: Thread shot that places a small gravity ribbon.
- Special shot: Moon Veil, a soft drag field that blunts incoming pressure.
- Active stance: Elegantly seated on the Moonlace Relay's side ring, hands guiding thin gravity ribbons, posture calm and almost dancer-like.
- Intense stance: Same side-ring seat, hair sweeping forward, both hands pulling a bright ribbon taut before firing.
- Defeated KO stance: Folded forward against the relay ring, long white hair spilling over the controls, gravity ribbons collapsed around her.
- Sprite note: Preserve the twin hook and long white hair. Give Ari the cooler, quieter, field-control identity.

### Lani

- Class family: `spark`
- Signature vehicle: Sunlace Flarepod
- Visual identity: Adult white-haired twin with warmer sun-gold accents, brighter styling, athletic stage energy, and a more impulsive silhouette than Ari.
- Personality: Loud, impulsive, competitive, affectionate with Ari, and allergic to being treated as the lesser twin.
- Tiny lore: Ari maps the field; Lani lights it up. Their rivalry is affectionate but very real.
- Primary shot: Fast flare shot.
- Special shot: Solar Split, a shell that bursts into smaller spark impacts near landing.
- Active stance: Half-standing, half-braced on the Sunlace Flarepod with one knee on the vehicle and one hand thrown back for flair.
- Intense stance: Leaning hard into the shot, one knee locked on the flarepod, sun panels open around her.
- Defeated KO stance: Tumbled backward into the flarepod's seat well, limbs loose, hair fanned out, burst panels popped open around her.
- Sprite note: Preserve the twin hook and long white hair. Give Lani the brighter, louder, burst-damage identity.

### Rook

- Class family: `bunger`
- Signature vehicle: Quarryback Mortar
- Visual identity: Broad adult male pilot with dust-coated armor jacket, heavy boots, miner-mechanic gear, practical gloves, and a grounded silhouette.
- Personality: Patient, dry, stubborn, terrifyingly calm under fire.
- Tiny lore: A canyon quarry veteran who joined the circuit after the mines started floating away.
- Primary shot: Deep drill crater.
- Special shot: Anchor Slam, a low-arc shot that caves ledges downward.
- Active stance: Seated heavily behind the Quarryback Mortar, shoulders squared, both boots planted, one hand gripping a stabilizer handle.
- Intense stance: Braced hard with both hands on the mortar handles, vehicle suspension compressed into the dirt.
- Defeated KO stance: Slumped forward over the mortar shield, helmet or goggles lowered, the rig nose-down in broken dirt.
- Sprite note: Use him to make the roster feel less like only flashy idols. He should read as dependable heavy terrain control.

### Mako

- Class family: `bouncer`
- Signature vehicle: Railfin Roller
- Visual identity: Lean adult male pilot with sea-racer and canyon-boarder gear, teal accents, wind-tossed hair, and a long trick-shot silhouette.
- Personality: Charming, slippery, evasive, impossible to pin down.
- Tiny lore: He grew up riding gravity rails between canyon islands and treats artillery like surfing.
- Primary shot: Rolling mine that follows slopes.
- Special shot: Rail Skip, a shot that accelerates after banking off terrain.
- Active stance: Surf-like crouch on the Railfin Roller, one foot forward and one back, riding the vehicle as if it is a gravity board.
- Intense stance: Lower surf crouch with one hand cutting through the air and the roller fins glowing during the shot.
- Defeated KO stance: Knocked off rhythm and collapsed sideways along the roller track, one arm over the wheel housing, rail fins bent.
- Sprite note: Give bouncer players a cooler trick-shot archetype next to Kaelii's attention-seeking performance style.

### Sable

- Class family: `glitch`
- Signature vehicle: Null-Kite Crawler
- Visual identity: Androgynous adult pilot with black-white asymmetrical coat, sharp eyes, floating scarf or cable shapes, and a compact crouched silhouette.
- Personality: Detached, poetic, quietly menacing.
- Tiny lore: A banned cartographer who charts places where gravity forgets the rules.
- Primary shot: Null marker shot.
- Special shot: Dead Zone, a temporary strip that denies climbing or clean footing.
- Active stance: Compact crouch atop the Null-Kite Crawler, coat and scarf shapes floating slightly, one hand hovering over a dark gravity marker.
- Intense stance: Crouched lower with cables pulled taut around the marker, vehicle legs spread like a survey instrument.
- Defeated KO stance: Folded beside the crawler like gravity switched off, scarf and cables limp, vehicle legs tucked in and inert.
- Sprite note: Use Sable to add mystery and an androgynous/customizable-feeling roster slot.

### Talia

- Class family: `spark`
- Signature vehicle: Kilnback Howitzer
- Visual identity: Adult forge-tech pilot with dark hair, amber goggles, soot-black and brass outfit, gloves, and a confident cannon-brace silhouette.
- Personality: Blunt, warm, big-sister energy, dangerous when cornered.
- Tiny lore: She builds tournament rigs from cracked furnace cores and sells repairs to rivals after beating them.
- Primary shot: Molten shell with medium crater.
- Special shot: Glassfall, a delayed heat fracture that opens fragile shelves.
- Active stance: Seated sideways against the Kilnback Howitzer, one boot braced on the furnace plate, hand on the firing lever, relaxed but dominant.
- Intense stance: Leaning into the lever as the kiln glow rises, goggles lit amber, furnace panels open.
- Defeated KO stance: Slumped back against the cracked kiln cannon, goggles tilted, forge glow reduced to dull embers.
- Sprite note: Give spark players a heavier forge archetype next to Perlah's salvage-heat agility and Lani's flare burst.

## First Generation Recommendation

Generate Kaelii and Perlah first before scaling to all 10 units.

Reason:

- They adapt the user's older character concepts directly into the new Gravity Canyon unit model.
- They test two distinct class families: `bouncer` and `spark`.
- They test two distinct stance problems: a perched stunt-pilot composition and a low kneeling heat-shield composition.
- They let the team validate adult anime readability, streamable outfit boundaries, vehicle attachment, and match-scale silhouette before producing a full roster batch.

Do not generate final runtime aliases immediately. Save first outputs under `work/asset-lab/2026-06-07-kaelii-perlah-sprite-prompts/` or versioned `public/assets/sprite-variants/...` after review.
