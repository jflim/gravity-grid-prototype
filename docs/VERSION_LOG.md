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
