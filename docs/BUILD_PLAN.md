# Gravity Grid Build Plan

This plan is meant to keep the game moving through playable iterations instead of chasing a perfect v1.

## Product North Star

Build a browser-based online multiplayer artillery game with anime character/vehicle identity, terrain destruction, team tactics, collectible cosmetics, and room-based play.

Canonical design reference: [GAME_DESIGN_SPEC.md](GAME_DESIGN_SPEC.md)

## Current Definition Of The Prototype

The current build is a local-feel prototype. It should prove that turn flow, aiming, movement, readable characters, terrain destruction, knockback, and round resets are fun before multiplayer architecture expands.

## Iteration Rules

- Ship in small versions.
- Each version needs one clear gameplay or planning goal.
- Each code version should end with a build check.
- Each version should be committed with a descriptive message.
- Add reward/cosmetic flavor early, but do not build full economy, gacha, matchmaking, or production art pipelines until the online combat loop works.

## Terms

- Turn: one active vehicle's action window.
- Round: one fresh battlefield from spawn until one team has no alive vehicles left.
- Match: a future multiplayer room/session made of one or more rounds.
- Prototype version: a committed, playable checkpoint.

## Phase 0: Local Combat Feel

Goal: make the core artillery loop readable and fun with two local players on one browser.

Done:
- Browser-based Phaser prototype.
- Two local vehicles.
- Facing-aware movement and aim.
- 5-90 degree elevation aiming.
- Hold/release launch power.
- Wind and turn timer.
- Destructible heightmap terrain.
- Bunger knockback and fall/bunge KOs.
- Round win condition and automatic reset.
- Tight gameplay sprites separate from portrait art.
- Command panel with movement range, launch power, aim, active identity, timer, and wind.

Next:
- Improve battlefield readability at common viewport sizes.
- Tune vehicle scale, camera framing, and UI spacing.
- Add clear hit, damage, KO, and round-end feedback.
- Decide whether 1v1 local prototype should expand to 2v2 local before online multiplayer.

Exit criteria:
- A new player can understand whose turn it is, where they are aiming, how much they can move, how much power they are charging, and why a round ended.

## Phase 1: Online 1v1 Plus Cosmetic Unlock Sandbox

Goal: prove the real online foundation while adding a small reward/unlock taste early.

Scope:
- Private room creation.
- Join by room code.
- Two browser clients connect.
- Server-authoritative room, round, turn, movement, aim, fire, projectile, terrain, HP, KOs, and round result.
- Guest display names.
- Post-round placeholder reward grant.
- Tiny cosmetic unlock sandbox: test token/capsule, reveal one placeholder cosmetic, inventory view, and equip one visible cosmetic.

Exit criteria:
- Two remote players can complete a 1v1 round without desync.
- Server owns combat results and reward grants.
- A completed round gives a small cosmetic/reward moment.

## Phase 2: Online 2v2 And Four Classes

Goal: validate team chaos, strategy, and class synergy.

Scope:
- Four player slots.
- Team selection.
- Four classes with one primary weapon and one class weapon each.
- Interleaved team turn order.
- Better spawn placement.
- Round summary screen.

Exit criteria:
- Four remote players can complete a 2v2 match.
- Each class has a recognizable role.
- 2v2 feels more fun than 1v1 without making turns confusing.

## Phase 3: Accounts And Progression

Goal: support persistent identity without overbuilding.

Scope:
- Supabase auth.
- Guest play.
- Google login.
- Email Magic Link.
- Username/profile.
- Soft currency ledger.
- Profile points and rank titles.
- Collection shelf.
- Equipped cosmetics visible in-game.
- Claim current-session guest rewards after registering.

Exit criteria:
- Players can play quickly, then register to save progress.

## Phase 4: Economy, Gacha, And Cosmetics

Goal: add collection motivation without touching gameplay fairness.

Scope:
- Soft currency rewards.
- Transparent-enough drop tables.
- Cosmetic-only gacha.
- Shop rotation.
- Collection/equipment UI.
- Visible rarity odds.
- Duplicate shards.

Exit criteria:
- Cosmetics are desirable and visible, but combat stays fair.

## Phase 5: Public Lobby And Social Layer

Goal: bring back the old web-game lobby feeling after rooms are stable.

Scope:
- Public lobby list.
- Create/join room flow.
- Public lobby chat with stricter guest filtering.
- Room chat.
- Mute/block/report-ready safety scaffolding.
- Leaderboard and visible rank.

Exit criteria:
- Players can find games without Discord, while Discord remains optional.

## Working Cadence

Recommended loop:

1. Pick one version goal.
2. Implement only that goal.
3. Run `npm run build`.
4. Update `docs/VERSION_LOG.md`.
5. Commit with a descriptive message.
6. Push to GitHub.
7. Decide the next version goal.
