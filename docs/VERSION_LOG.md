# Gravity Grid Version Log

Use this as the human-readable checkpoint history. Every meaningful commit should add an entry.

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
