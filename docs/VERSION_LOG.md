# Gravity Canyon Version Log

Use this as the human-readable checkpoint history. Every meaningful commit should add an entry.

## Unreleased

Highlights:
- Adopted Gravity Canyon as the working product title.
- Added Colyseus, Express, and TypeScript server tooling.
- Added the Colyseus browser SDK as a vendored static browser bundle for stable local Vite development.
- Added Gravity Canyon room state with two player slots, guest display names, ready checks, and placeholder nameplate rewards.
- Added an online alpha panel to create/join private rooms from the browser client.
- Clarified Git workflow with branch strategy, quality gates, commit cadence, and push cadence.
- Updated GitHub management notes now that the private remote and GitHub CLI are configured.
- Added canonical game design spec with 95% confidence direction for the next build milestone.
- Updated build plan so Phase 1 is online 1v1 plus a lightweight cosmetic unlock sandbox.
- Clarified art tone: premium anime arcade with a decent amount of tasteful adult fan service.
- Fixed turn commitment so firing immediately ends the active vehicle's movement window.
- Added swept projectile collision checks, tighter splash radii, and localized post-impact vehicle settling.
- Added temporary impact rings for crater and splash damage readability.
- Added fainted/KO visual feedback for destroyed vehicles.

Verification:
- `npm run build` passed.

## v0.4.0 - Planning, Git, And Readability Checkpoint

Status: local commit checkpoint.

Highlights:
- Added project build plan and iteration cadence.
- Added version log for committed playable checkpoints.
- Added Git workflow and GitHub remote setup notes.
- Added Git ignore rules for generated dependencies and build output.
- Current prototype includes tight gameplay sprites, separated portrait art, round logic, improved command panel, visual aim arrow, movement range meter, launch-power meter, wind, timer, and terrain destruction.

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
