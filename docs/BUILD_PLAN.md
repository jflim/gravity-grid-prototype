# Gravity Canyon Build Plan

This plan is meant to keep the game moving through playable iterations instead of chasing a perfect v1.

## Product North Star

Build a browser-based online multiplayer artillery game with anime character/vehicle identity, terrain destruction, team tactics, collectible cosmetics, and room-based play.

Canonical design reference: [GAME_DESIGN_SPEC.md](GAME_DESIGN_SPEC.md)

Locked current v1 scope: [V1_PLAYTEST_ALPHA.html](V1_PLAYTEST_ALPHA.html)

## Current Definition Of The Prototype

The current build is a local-feel prototype with the first online room foundation. It should prove that turn flow, aiming, movement, readable characters, terrain destruction, knockback, room creation, player presence, ready checks, and the first cosmetic reward loop are fun before multiplayer combat simulation expands.

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
- Four local test units in a 2v2-style roster: Nova, Vesper, Kaelii, and Perlah.
- Facing-aware movement and aim.
- Downhill/fall-friendly movement with an uphill climb-angle limit.
- Vehicle sprites tilt to match terrain slope.
- 5-90 degree elevation aiming.
- Hold/release launch power.
- Wind display and active-vehicle turn timer.
- Destructible heightmap terrain.
- Bunger knockback and Void Dropped KOs.
- Round win condition and automatic reset.
- Gameplay sprites separate from portrait art.
- Layered gameplay rendering with one vehicle sprite and one playable-character sprite.
- Generated Nova and Vesper character state sprites: default, KO, and intense shooting.
- Accepted Nova and Vesper full-unit intense runtime test aliases for concept-preview charging.
- Generated Nova and Vesper destroyed vehicle sprites for KO/dead states.
- Accepted Kaelii and Perlah v1 test runtime aliases for local play: unit default, unit intense, unit Defeated KO, vehicle default, and vehicle destroyed.
- Full-unit concept preview sprites, active frames, labels, and prototype vehicle-only combat hulls are scaled down in the match view so the local 2v2-style roster reads as game pieces instead of covering the terrain.
- Collision art review rules keep pilot poses visually compatible with the shared vehicle-only hit zone without letting cosmetics affect combat.
- Stable runtime sprite aliases plus versioned sprite-variant folders for faster art iteration.
- Command panel with movement range, launch power, aim, active identity, timer, and wind.
- Working title updated to Gravity Canyon.
- Turn commits immediately when a shot is fired, with no post-shot movement window.
- Swept projectile-edge collision and localized post-impact settling make hits and falls more predictable.
- Temporary crater/splash radius rings make impact ranges visible.
- Terrain can be punched through into the visible void beneath the stage, with a persistent void danger layer and floating-platform terrain presentation.
- Crater, splash, and Bunger knockback radii are smaller so ring-outs require more precise setup.
- Ringworks Basin is now the local demo default under the stable `ring-basin` id, using exact four-seat spawns, widened readable bridge gaps, a central ring bridge island, and weapon-readable side bowls/lips for map-feel testing.
- Ringworks Basin now leans B+C: the map shape should make the existing four v1 primary weapons feel useful while still giving the arena a novel canyon-ring structure.
- Projectile flight keeps the current battlefield framing while shots remain readable, only recentering as a fallback if a shot leaves the visible frame.
- HP KOs and Void Dropped eliminations now have distinct visual presentation even though both remove a unit from play.
- Void Dropped eliminations now use a short fall presentation into a larger visible void band so the fall can be read before the unit becomes suspended eye candy.
- Destroyed vehicles now pair destroyed vehicle sprites with character-specific generated KO character sprites instead of overlay effects.
- Command panel is raised with a bottom safe margin so gameplay controls remain visible.
- Local map-review layout hides the online panel by default, shows combat hull overlays by default while collision and map scale are being tuned, keeps both configurable through URL flags, hotkeys, or the on-screen `Collision zones` checkbox, and uses capped command-deck framing for more consistent desktop viewport composition.
- Colyseus server added.
- Online panel can create/join private rooms, show player slots, ready state, placeholder rewards, and equipped nameplates.
- Online room now starts a server-owned combat preview when both players ready.
- Server combat preview tracks round, turn, wind, active vehicle, HP, winner, and validated active-player test shots.
- Colyseus browser SDK is vendored as a static browser bundle for stable Vite dev behavior on Windows.

Next:
- Improve battlefield readability at common viewport sizes.
- Tune vehicle scale, camera framing, and UI spacing.
- Continue tuning hit, damage, KO, and round-end feedback.
- Replace first-pass generated gameplay sprites with production per-character and per-vehicle sprite sets.
- Tune the local 2v2-style test roster now that Kaelii and Perlah are visible in the playable prototype.
- Wire server-authoritative combat state into the Phaser match scene.

Exit criteria:
- A new player can understand whose turn it is, where they are aiming, how much they can move, how much power they are charging, and why a round ended.

## Phase 1: V1 Playtest Alpha - Hosted Private-Room 2v2

Goal: prove reliable hosted private-room online 2v2 combat with the existing four-character roster. 1v1 is supported as a practical testing mode, but 2v2 is the v1 promise.

Scope:
- Private room creation. Started.
- Join by room code. Started with Colyseus room id.
- Invite links and editable guest display names.
- 1v1 and 2v2 room modes.
- Best-of-1 and best-of-3 match length settings.
- Two to four browser clients participate depending on seat ownership.
- Server-authoritative room, round, turn, movement, aim, fire, projectile, terrain, HP, KOs, Void Dropped eliminations, and round/match result.
- Server-owned combat preview round/turn/HP state. Started.
- Guest display names. Started.
- Four existing v1 characters only: Nova, Vesper, Kaelii, and Perlah.
- One primary weapon/action per v1 character.
- Five fixed maps with 1v1 and 2v2 spawn layouts.
- Classic readable HUD with turn order, score, HP, wind, angle, power, movement, timer, and weapon info.
- Preset phrase bubbles for seated players.
- One readable VFX and one non-voice SFX per v1 weapon.

Exit criteria:
- Four remote players can complete a 2v2 match without desync.
- Server owns combat results.
- One 1v1 playtest, one 2v2-format playtest, and a four-human gold network validation complete successfully.

## Phase 2: Post-V1 Combat Expansion

Goal: expand the accepted v1 online combat foundation based on playtest feedback.

Scope:
- Additional maps, mode settings, character/weapon polish, and combat tuning.
- Optional next roster expansion.
- Possible second weapons or special shots.
- Mature class names and role communication.
- Better post-match summary and feedback capture.

Exit criteria:
- V1 feedback has been reviewed and translated into a v2 contract.
- New additions improve replayability without undermining readability or server authority.

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
