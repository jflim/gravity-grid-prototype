# Gravity Canyon Version Log

Use this as the human-readable checkpoint history. Every meaningful commit should add an entry.

## Unreleased

Highlights:
- Adopted Gravity Canyon as the working product title.
- Added Colyseus, Express, and TypeScript server tooling.
- Added the Colyseus browser SDK as a vendored static browser bundle for stable local Vite development.
- Added Gravity Canyon room state with two player slots, guest display names, ready checks, and placeholder nameplate rewards.
- Added an online alpha panel to create/join private rooms from the browser client.
- Added server-owned online combat preview state for round number, turn number, wind, active vehicle, HP, winner, and validated preview shots.
- Added an online panel combat snapshot with active turn, wind, vehicle HP rows, server-shot action, and next-round action.
- Replaced Nova's active KO runtime sprite with the selected prone v16 KO asset.
- Added a sprite-variant folder convention and workflow doc for frequent sprite iteration.
- Added a session handoff document with current repo state, active branch, sprite status, Vesper KO generation prompt, next steps, and verification notes.
- Added repo-level Codex project guidance in `AGENTS.md` so new local Codex chats inherit setup, commands, docs, and working rules.
- Added adult-playable sprite probe design and implementation planning for deciding whether Nova and Vesper gameplay sprites should move beyond compact/semi-chibi style.
- Added cosmetic set/loadout direction: themed sets can unlock matching character outfits and vehicle skins, while characters remain identity/presentation and vehicles carry gameplay mechanics.
- Added mounted gameplay asset direction: current assets stay as the v0 baseline while future probes explore characters riding, kneeling on, leaning on, or otherwise interacting with vehicles.
- Preserved selected paired-unit concept candidates for Nova's head-over-heels Defeated KO direction and Vesper's tech-shorts default/Defeated KO direction.
- Added playable roster sprite direction for 10 signature pilot-plus-vehicle units, plus Kaelii and Perlah gameplay sprite prompt packs for the first new-unit generation pass.
- Added a living character roster document with selected visual probe links, tight generation anchors, and Kaelii's tri-tone hair reference lock.
- Added Kaelii v2 compact vehicle and mounted default sprite candidates using the tri-tone hair lock.
- Added Perlah v2 compact vehicle and mounted default sprite candidates for comparison against the first Spark-unit probes.
- Added Kaelii v3/v5 selected gap-fill sprite candidates: corrected real-wheel Flashkick Skip-Rig, mounted default pupil fix, animation-linked intense state, destroyed vehicle, and Defeated KO with user-marked pupil placement.
- Recorded an open art-review note that Kaelii Defeated KO v5 still needs a future pupil-placement pass, especially the right eye.
- Added Perlah selected gap-fill sprite candidates for intense, destroyed vehicle, and Defeated KO with user-marked pupil placement.
- Promoted Kaelii and Perlah selected candidates to stable v1 runtime test aliases and integrated them into the local playable roster as red/blue support units.
- Added a runtime-roster verification script to check runtime unit aliases, preload keys, class IDs, and local turn order.
- Generated Nova and Vesper full-unit intense sprite probes, promoted them to `nova-unit-intense.png` and `vesper-unit-intense.png`, and wired concept-preview charging to use them.
- Expanded runtime-roster verification to check Nova and Vesper full-unit intense aliases.
- Replaced Vesper's first full-unit intense alias with a compact v3 power-hold candidate, trimmed transparent padding so it no longer shrinks at runtime, and documented the selected prompt.
- Reduced full-unit concept-preview display sizes, active frames, combat-marker offsets, HP/label offsets, and prototype combat hulls to give the local four-unit roster more playable battlefield space.
- Replaced Vesper and Perlah intense runtime aliases with footprint-locked variants so default and intense states keep identical apparent unit size while showing compact power-hold reactions.
- Iterated Vesper intense to the v6 cool glitch-control candidate, preserving the default visible footprint while adding a stronger joystick/deck-control charge action, cannon reticle, headset glow, and compact glitch UI.
- Superseded Vesper intense v6 with v8 subtle tension scale-stable after visual review showed that same alpha footprint alone was not enough; v8 allows small pilot/rover motion while reducing the apparent power-shot size pop.
- Expanded runtime-roster verification to compare default/intense visible alpha footprints for Vesper and Perlah, preventing future intense sprites from silently growing, shrinking, or widening.
- Clarified that character-intense sprites should usually be animation-linked keyframes from default poses, preserving the main contact anchors instead of becoming unrelated action poses.
- Corrected Kaelii prompt guidance so her sneakers remain character clothing only; the Flashkick Skip-Rig uses real wheels, mechanical rim covers, rails, springs, and bounce pads.
- Clarified the sprite workflow: green chroma-key images are workshop sources, approved candidates and runtime sprites should be transparent PNGs, and the current recommendation is green for exploration plus transparent PNG bases for refinement.
- Added a required unit asset checklist and roster generation status table so missing intense, destroyed, and KO sprites are visible.
- Added a combat readability design and Slice 1 implementation plan for combat hulls, damage markers, wind bands, and lob-focused map prototypes.
- Added a locked v1 playtest-alpha HTML contract for hosted private-room 2v2 scope, with change-control rules, V2 parking lot boundaries, and acceptance gates.
- Added generated HTML reading copies for human-facing markdown docs via `npm run docs:html`, plus an HTML docs index.
- Updated planning docs so `docs/V1_PLAYTEST_ALPHA.html` is the authority for current v1 scope while `docs/GAME_DESIGN_SPEC.md` remains broader product vision.
- Added v1 rule-contract tests and constants for locked roster, modes, seats, room settings, turn timing, reconnect grace, and preset phrase cooldown.
- Added the v1 map pool contract with five map ids, deterministic random selection, spawn layouts, death planes, wind scales, and drawable preview surfaces.
- Added generated v1 map previews at `docs/V1_MAP_PREVIEWS.html`, linked from the HTML docs index.
- Redesigned the v1 map pool around more interesting canyon silhouettes: multi-tier terrain, broken land segments, central gaps, spires, shelves, arches, and stronger tactical identities.
- Added explicit uphill/downhill shot-lane examples to every v1 map preview so multi-tier play reads as "shoot up" and "shoot down" at a glance.
- Replaced Basin Stack and Arch Crossing with Ring Basin and Bridgeworks, adding circular ring forms and many natural bridge spans to the v1 map-preview contract.
- Added a generated v1 map gameplay review page for Ring Basin and Bridgeworks, covering safe spawns, danger zones, movement routes, destructible focus areas, opening reads, fun factors, and risks.
- Made Ring Basin the local playable demo default by converting the fixed v1 map surface into destructible heightmap terrain, using exact four-seat spawns and visual ring landmarks.
- Reworked Ring Basin from one continuous terrain strip with circle overlays into separated playable spans with real air gaps and subtler embedded ring arcs.
- Hid the Online Alpha room panel and prototype combat hull overlays by default for local map-review play, while keeping them available with `?onlinePanel=1`, `?combatHulls=1`, and the `H` toggle.
- Added explicit demo layout rules and tests so the bottom command deck remains visible and battlefield framing stays more consistent across common desktop viewport widths.
- Synchronized Phaser and CSS sizing against the smallest reliable visible browser viewport measurement so fullscreen browser chrome/layout mismatches do not push the command deck below the visible screen.
- Reworked Ring Basin again around a full-unit-readable center chasm and faint background ring landmarks so fall gaps match the large unit sprite/combat-hull scale.
- Changed projectile camera behavior to keep the battlefield stable while shots are readable, recentering only when a projectile leaves the readable frame.
- Converted the default `ring-basin` demo pass into Ringworks Basin: a B+C weapon-readable novelty map with side bowls/high lips, two readable bridge gaps, and a central destructible ring bridge island.
- Added visible prototype combat hulls, toggleable with `H`, so direct-hit collision better matches the larger pilot-plus-vehicle unit concepts.
- Added floating combat markers for direct damage, splash damage, knockback, HP KOs, and terrain/fall bunge defeats.
- Added randomized terrain/spawn archetypes for local rounds to reduce flat direct-fire duels and encourage high-angle lob play.
- Clarified Git workflow with branch strategy, quality gates, commit cadence, and push cadence.
- Updated GitHub management notes now that the private remote and GitHub CLI are configured.
- Added canonical game design spec with 95% confidence direction for the next build milestone.
- Updated build plan so Phase 1 is online 1v1 plus a lightweight cosmetic unlock sandbox.
- Clarified art tone: premium anime arcade with a decent amount of tasteful adult fan service.
- Fixed turn commitment so firing immediately ends the active vehicle's movement window.
- Added swept projectile collision checks, tighter splash radii, and localized post-impact vehicle settling.
- Added temporary impact rings for crater and splash damage readability.
- Added fainted/KO visual feedback for destroyed vehicles.
- Changed terrain movement so downhill/falling is allowed, while steep uphill movement is blocked by a climb-angle rule.
- Allowed vehicles to intentionally drive into holes or off the map and self-KO.
- Allowed deep crater cuts to punch through into a visible void beneath the terrain.
- Replaced the generic KO face with character-specific KO feedback.
- Replaced KO expression overlays with dedicated Nova and Vesper KO sprite variants.
- Removed the global floating turn timer; turn time now only appears above the active vehicle.
- Added terrain-slope tilt to vehicle sprites.
- Raised the command panel with a bottom safe margin for better viewport visibility.
- Updated the void background treatment so exposed holes read as empty air beneath the terrain.
- Reduced crater, splash, and Bunger knockback radii so knock-off KOs require more precise setup.
- Reworked gameplay assets into separate vehicle and playable-character sprite layers.
- Generated standalone Nova and Vesper vehicle sprites.
- Generated standalone Nova and Vesper character sprites for default, KO, and intense shooting states.
- Regenerated Nova and Vesper KO sprites with crossed/rolled-up eyes instead of spiral eyes.
- Added destroyed vehicle sprites for Nova and Vesper and paired them with KO character rendering.
- Lowered character seating offsets so riders sit closer to the vehicle chassis.
- Removed the old combined gameplay sprites and derived KO sprites from the active asset set.

Verification:
- `npm run build` passed.
- Two-client Colyseus smoke test reached `round-over`, set the losing vehicle to 0 HP, and granted the preview token reward.

## v0.4.0 - Planning, Git, And Readability Checkpoint

Status: local commit checkpoint.

Highlights:
- Added project build plan and iteration cadence.
- Added version log for committed playable checkpoints.
- Added Git workflow and GitHub remote setup notes.
- Added Git ignore rules for generated dependencies and build output.
- Current prototype includes layered vehicle/character gameplay sprites, separated portrait art, round logic, improved command panel, visual aim arrow, movement range meter, launch-power meter, wind, timer, and terrain destruction.

Verification:
- `npm run build` should pass before this version is committed.

## v0.3.0 - Gameplay Sprite And HUD Readability Pass

Highlights:
- Added tight-cropped `nova-gameplay.png` and `vesper-gameplay.png`.
- Battlefield uses gameplay sprites.
- Command panel portraits keep the high-detail art.
- Replaced movement pips with a move range meter.
- Kept launch power as a prominent command panel meter.

Verification:
- `npm run build` passed.

## v0.2.0 - Round Logic And Combat UI Pass

Highlights:
- Defined turn, round, and match terminology.
- Round ends when one team has no alive vehicles.
- Fallen/bunged-out vehicles are set to 0 HP and not alive.
- Rounds auto-reset after a short result message.
- Added 5-90 degree aiming.
- Added active vehicle timer badge, visual aim arrow, and movement range rail.

Verification:
- `npm run build` passed.

## v0.1.0 - First Playable Local Prototype

Highlights:
- Phaser browser prototype.
- Two local vehicles.
- Terrain generation and crater deformation.
- Turn-based movement, aim, wind, launch power, projectile flight, damage, and HP.
- First-pass generated anime vehicle/pilot art.

Verification:
- `npm run build` passed.
