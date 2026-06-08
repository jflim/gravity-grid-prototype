# Gravity Canyon Game Design Spec

Canonical source of truth for the current product direction.

Last updated: 2026-06-06
Confidence: 95% for the next build milestone, with later milestone details intentionally left flexible.

Working title: Gravity Canyon.

## 1. Product North Star

Gravity Canyon is a desktop browser, turn-based artillery game with anime arcade style, readable vehicle combat, destructible terrain, team tactics, and cosmetic collection.

The player promise:

- Play comfortably with keyboard-first, low-APM controls.
- Win through angle mastery, terrain shaping, wind reads, and team synergy.
- Collect expressive pilots, vehicle skins, nameplates, trails, effects, cards, and shelf items.
- Jump in quickly as a guest, then register to preserve progress.
- Hang out in nostalgic room/lobby spaces once the combat loop is stable.

Current lore seed:

- Gravity Canyon is the first named battle region and working product title.
- The world is made of fractured canyon chains, gravity shelves, arch fields, and suspended terrain.
- Gravity anomalies are part of the core fantasy: shots arc through unstable fields, terrain shelves hang in the air, and knockback/falls feel tied to the world instead of only to arcade rules.
- "Sparks" can be used as the early energy/reward term without requiring final lore yet.

## 2. Build Philosophy

The game should be built as a sequence of playable checkpoints, not as one giant v1.

Rules:

- Each milestone has one main goal.
- Main branch should stay playable.
- Feature branches are preferred for nontrivial work.
- Code changes need a build check before pushing.
- New systems should be thin but real before they become polished.
- Combat readability comes before cosmetic spectacle inside the match screen.

## 3. Locked Product Decisions

- Platform: desktop web browser first.
- Combat view: 2D side-view artillery.
- Combat controls: keyboard-first; mouse can be used for menus.
- First engine: TypeScript + Phaser.
- Multiplayer: Node.js + TypeScript + Colyseus.
- Durable backend: Supabase.
- Live matches: server authoritative.
- First real online mode: private-room 1v1.
- True MVP team mode: online 2v2.
- Economy: cosmetic-only, soft currency first, no real-money MVP.
- Guests: can play quickly; permanent rewards require registration.
- Login target: Guest, Google, Email Magic Link.
- Art direction: premium anime arcade for collection surfaces, compact readable vehicle sprites for gameplay.
- Tone: stylish adult anime arcade with a decent amount of fan service, but not explicit or platform-risky.
- Character/vehicle unit model: each pilot has a signature vehicle family so the player experiences one authored combat unit, while sprites remain layered for customization and production.

## 4. Build Milestones

### Milestone 0: Local Combat Feel

Status: current prototype.

Goal:

- Prove movement, aim, launch power, wind, destructible terrain, bunge KOs, round reset, and readable HUD.

Current result:

- Local 1v1 prototype exists.
- Local play now uses a 2v2-style test roster with Nova, Vesper, Kaelii, and Perlah so the first four unit identities can be checked in match context.
- Gameplay sprites and high-detail portraits are separated.
- Gameplay rendering layers a standalone vehicle sprite under a standalone playable-character sprite.
- Nova and Vesper now have generated character gameplay states for default, Defeated KO, and intense shooting.
- Nova and Vesper now have full-unit intense runtime test aliases so concept-preview charging can show a distinct state.
- Full-unit concept preview sprites and prototype combat hulls are intentionally smaller than the first large pass to preserve playable battlefield space.
- Nova and Vesper now have destroyed vehicle gameplay sprites for defeated/KO states.
- Kaelii and Perlah now have accepted v1 test runtime aliases for default, intense, Defeated KO, vehicle default, and vehicle destroyed states.
- Command deck, launch power, movement range, timer, wind, aim arrow, and terrain effects are playable.
- A shot commits the turn immediately; the shooter cannot move during projectile flight or impact resolution.
- Projectile collision now checks along the shot path, and post-impact settling is localized to nearby or affected vehicles.
- Prototype direct-hit collision now uses visible combat hulls around the larger pilot-plus-vehicle unit concepts, so shots that visually strike the unit read more fairly.
- Impact readability includes temporary crater/splash radius rings and character-specific KO/faint feedback for destroyed vehicles.
- Round terrain now moves toward varied map/spawn archetypes that reduce flat direct-fire duels and encourage artillery lobs over cover.
- Movement allows downhill travel and falling, while steep uphill movement is limited by a climb-angle rule.
- Vehicle sprites tilt to match the local terrain slope while combat labels remain readable.
- Terrain can now be punched through into a visible void below the stage.
- Crater, splash, and Bunger knockback radii are tuned smaller so ring-outs reward precision over one-shot blast size.
- Colyseus online foundation exists for room creation, player presence, ready checks, and placeholder cosmetic rewards.
- Colyseus room now owns a lightweight combat preview with round, turn, wind, active vehicle, HP, winner, and validated active-player preview shots.
- Browser client loads a vendored Colyseus browser SDK bundle while the server uses the installed Colyseus packages.

### Milestone 1: Online 1v1 Plus Cosmetic Unlock Sandbox

Goal:

- Prove the real online combat foundation while adding a small reward/unlock taste early.

Scope:

- Private room creation. Started.
- Join by room code. Started with Colyseus room id.
- Two browser clients connect. Started.
- Server-authoritative room, round, turn, movement, aim, fire, projectile, terrain, HP, and win result. Combat sync still next.
- Guest display names. Started.
- Basic post-round reward grant. Started as test capsule state.
- Tiny cosmetic unlock sandbox:
  - award test tokens or a test capsule after match completion. Started manually in room alpha.
  - reveal one cosmetic from a small placeholder pool. Started.
  - show inventory. Started for nameplates.
  - equip vehicle skin, pilot skin, or nameplate if available. Started for nameplates.
- Rewards may be session-only at first, but the data model should be compatible with later Supabase persistence.

Out of scope:

- Full shop.
- Full gacha odds UI.
- Real-money purchases.
- Public room list.
- Global lobby chat.
- Full collection shelf.
- Ranked matchmaking.

Exit criteria:

- Two remote players can complete a 1v1 round without desync.
- Server, not client, decides movement legality, projectile result, terrain changes, damage, KOs, rewards, and round result.
- Current online preview already demonstrates server-owned turn, wind, HP, winner, and reward state before Phaser terrain/projectiles are synced.
- After a completed round, players receive a small cosmetic/reward moment.
- At least one equipped cosmetic is visible somewhere meaningful.

### Milestone 2: Online 2v2 And Four Classes

Goal:

- Prove the actual MVP team fantasy.

Scope:

- Four player slots.
- Team selection.
- Interleaved team turn order.
- Four classes with one primary weapon and one class weapon each.
- Better spawn logic.
- Team win when one team has no alive vehicles.
- Round summary.

Exit criteria:

- Four remote players can finish a 2v2 match.
- Each class role is understandable from play.
- 2v2 feels more fun than 1v1 without becoming unreadable.

### Milestone 3: Durable Accounts And Progression

Goal:

- Preserve player identity, rewards, and equipped cosmetics.

Scope:

- Supabase auth.
- Guest, Google, Email Magic Link.
- Anonymous/session player id where useful.
- Registered profile.
- Currency ledger.
- Inventory.
- Equipped cosmetics.
- Profile points and rank titles.
- Guest session rewards can be claimed by registering before leaving.

Exit criteria:

- Registered users keep progress across sessions.
- Guests can play immediately.
- The game clearly encourages registration without making guest play feel fake.

### Milestone 4: Social Lobby

Goal:

- Capture the old web-game lobby feeling after core matches are stable.

Scope:

- Public room list.
- Room lobby chat.
- Public Arcade Lobby chat.
- Guest chat with stricter limits.
- Registered chat with normal limits.
- No DMs in MVP.
- Rate limits, filtering, mute/block-ready architecture, and report-ready data model.

Exit criteria:

- Players can find games without Discord.
- Chat feels social but not unmanageable.

### Milestone 5: Collection MVP

Goal:

- Make cosmetics motivating without affecting gameplay fairness.

Scope:

- Soft currency.
- Cosmetic-only blind boxes.
- Rarity odds shown by capsule.
- Duplicate shards.
- Fixed starter shop.
- Rotating featured shop.
- Basic profile shelf.
- Weekly and all-time casual leaderboards for registered users.

Exit criteria:

- Players can earn, open, equip, and display cosmetics.
- No cosmetic changes HP, damage, projectile behavior, wind, movement, hitbox, visibility advantage, matchmaking, or rewards.

## 5. Core Gameplay Rules

Terms:

- Turn: one active vehicle's action window.
- Round: one fresh battlefield from spawn until one team has no alive vehicles left.
- Match: in MVP, one round. Best-of match formats can come later.

Default round rules:

- Team Elimination.
- 1v1 first, 2v2 MVP.
- 30 second turn timer.
- 100 HP per vehicle.
- Limited movement range per turn.
- Downhill and falling movement is allowed within movement range.
- Uphill movement is blocked when the terrain is steeper than the climb limit.
- One shot per turn.
- Releasing a shot commits the turn immediately.
- Wind changes each turn.
- KO by HP reaching 0 or falling below the death plane.
- Fallen vehicles are set to 0 HP and not alive.
- Players can intentionally drive into holes or off the stage; this is a valid self-KO.

Stalemate protection target:

- Add a soft turn limit once online 2v2 exists.
- After the limit, use sudden-death pressure such as stronger wind, shrinking terrain safety, or HP tiebreak.

## 6. Controls And Match UX

Combat controls:

- Left/Right: face and move.
- Up/Down: adjust barrel elevation.
- Space hold/release: charge and fire.
- Enter: chat once chat exists.
- Tab: scoreboard once scoreboard exists.
- Esc: settings/pause menu.

Combat UX requirements:

- Whose turn it is must be obvious.
- Wind is shared round information.
- Turn timer should appear above the active vehicle, not as a separate floating global timer.
- Active player needs clear angle, movement range, launch power, HP, and weapon info.
- Command panel content must fit inside the visible browser viewport, with safe margin above the bottom edge.
- Aim should show direction without giving a full landing prediction.
- Direct-hit collision should be readable against the visible unit. Prototype combat hulls may be shown during tuning, but final combat hitboxes must remain cosmetic-fair and not change with cosmetic detail.
- Impact feedback should briefly show crater/terrain range and splash damage range.
- Disabled vehicles should read as fainted/knocked out, not only desaturated.
- Defeated KO and intense shooting expressions should be character-specific generated art, not universal generic faces or code-drawn overlays.
- Defeated KO character expressions should use literal crossed or rolled-up eyes, not spiral/hypnotic eyes.
- Dead vehicles should pair the Defeated KO character sprite with a destroyed vehicle sprite.
- Opened terrain should expose a readable void/background beneath the stage.
- Projectile camera should follow shots and preserve impact context.
- Large character banners do not belong in the live match screen.

## 7. Classes

Current internal ids:

- `excavator`: terrain carving, pits, bowls, bunge setups.
- `glitch`: disruption, movement denial, temporary fields/barriers.
- `bouncer`: ricochet, rolling mines, slope exploitation.
- `spark`: splash, fire/magma, area denial.

Public class names are not final.

Naming goals:

- Easy to pronounce.
- Easy to understand from the name and icon.
- Expandable into lore.
- Less awkward than "Bungers" if that word keeps feeling risky.

MVP class rule:

- Classes should differ by weapon behavior, not by gacha stats.
- If base stat differences are added later, they must be class-readable and non-cosmetic.

## 8. Art Direction And Content Boundary

Primary visual target:

- Premium anime arcade gacha.
- Compact cyber-toy artillery vehicles in gameplay.
- Full or half-body anime pilots in collection, gacha, profile, shop, and banner surfaces.
- Gameplay sprites prioritize readable silhouettes over illustration detail.

Roster direction:

- Mixed gender roster, mostly women.
- First production-ish roster planning target: 10 signature pilot-plus-vehicle units, roughly 7 women, 2 men, and 1 androgynous/customizable character.
- All characters should be original, adult, and clearly separated from existing IP.

Fan-service boundary:

- A decent amount of fan service is allowed.
- Characters may be attractive, stylish, flirty, confident, and fashion-forward.
- Swimsuit, nightlife, sci-fi bodysuit, idol, racer, tactical, and showpiece outfits are acceptable when tasteful.
- Avoid explicit nudity, sex acts, lingerie-only defaults, underage-coded sexuality, or poses that make the game hard to stream or market.
- Keep combat sprites readable and not dependent on body-focused detail.

Signature unit asset model:

- Each pilot has a signature vehicle family: Nova with her red arcade artillery rig, Vesper with her blue tech/glitch rig, and future pilots with similarly authored pair identities.
- The player-facing fantasy is a character-plus-vehicle combat unit, not two unrelated choices.
- Runtime implementation still uses separate sprite layers so outfits, vehicle skins, and state art can be customized without baking every pair into one image.
- Vehicle gameplay sprite: one standalone vehicle sprite per vehicle look, with no pilot baked in by default.
- Vehicle damage state: each vehicle look needs at least default and destroyed gameplay sprites.
- Character gameplay sprite set: one standalone playable-character sprite per state, usually designed as a mounted or vehicle-interaction pose layered in front of/on the vehicle.
- Required first character states: default, Defeated KO, and intense shooting.
- Active prototype sprites use stable runtime aliases in `public/assets`; generation experiments live under `public/assets/sprite-variants`.
- Current runtime assets are the v0 baseline; do not overwrite them during art-direction probes.
- Gameplay sprites should be compact, tight-cropped, outlined, and readable.
- Character states must be generated/painted as integrated artwork rather than drawn on top of the default sprite in code.
- Active/default character poses may be seated, kneeling, crouched, leaning on the cannon, bracing behind the weapon, or otherwise clearly riding/using the vehicle.
- The vehicle remains the gameplay anchor. Character art can show legs when compact and mounted, but full standing characters beside the vehicle are not the default-state target.
- Gameplay character concepts should use adult anime proportions, not semi-chibi or super-deformed face/body proportions, unless a separate cosmetic line explicitly calls for it.
- Defeated KO sprites should prioritize instant facial readability at gameplay scale: rolled-up/crossed pupils, sleepy compressed white eyes, and a small tongue blep where allowed.
- Defeated KO staging should usually keep the unit relationship visible, such as the pilot collapsed over, draped on, or slumped against their signature vehicle.
- The active Nova Defeated KO direction is shifting from a standalone prone sprite toward Nova collapsed over her damaged red vehicle. Vesper should get a distinct Defeated KO pose that fits her blue tech/glitch rig instead of copying Nova's exact pose.
- Portrait/card art: higher detail and more character-forward.
- Gacha reveal art: most expressive and premium.
- Equipment screen: show both pilot and vehicle.

## 9. Cosmetics And Economy

Strict rule:

- Cosmetics never affect combat stats or hitboxes.

Early cosmetic unlock sandbox:

- Exists in Milestone 1 so the game has reward flavor early.
- Can use placeholder cosmetics.
- Can be session-only before Supabase persistence.
- Should prove the reveal/equip feeling without building full economy complexity.

Durable economy:

- Game Tokens: spendable soft currency.
- Profile Points: visible non-spendable progression.
- Rank Titles: derived from profile points.
- Shards: duplicate compensation.

First visible cosmetic slots:

- Vehicle skin.
- Pilot skin/outfit.
- Nameplate/banner.

Cosmetic set rule:

- Themed sets may unlock matching character outfits and vehicle skins together.
- Loadout still exposes character outfit and vehicle skin as separate equip slots within a pilot's signature vehicle family.
- Characters and vehicles are authored as signature combat units, even though their outfit and vehicle-skin sprites remain separate implementation layers.
- The selectable gameplay pick is the authored pilot-plus-vehicle unit. The unit may define movement, weapon kit, cannon behavior, terrain interaction, durability, or other class-readable combat attributes.
- Pilot identity should not be separately statted apart from that authored unit, and cosmetics must remain cosmetic-only.

Second wave:

- Projectile trail.
- Explosion/KO effect.
- Profile shelf item.
- Card frame.

Gacha:

- Cosmetic-only.
- Soft currency first.
- Rarity odds visible by capsule type.
- Every capsule grants a cosmetic or duplicate shards.
- Real-money blind boxes are out of MVP and require separate legal/compliance review.

## 10. Social And Auth

Guest play:

- Guests can play immediately.
- Guests can chat with stricter limits once chat exists.
- Guests earn small/session-limited rewards.
- Guests can claim current-session rewards if they register before leaving.
- Guests do not appear permanently on public leaderboards.

Registered users:

- Keep durable currency, inventory, cosmetics, equipped items, rank, leaderboard placement, and profile shelf.

Login methods:

- Guest.
- Google.
- Email Magic Link.

Later optional:

- Discord login.
- Apple login.

Chat:

- Room chat first.
- Public lobby chat after accounts and safety scaffolding.
- Guests can type with stricter rate limits and no links.
- Registered users get normal limits.
- No DMs in MVP.

## 11. Technical Architecture

Client:

- TypeScript.
- Vite.
- Phaser for match rendering, input, camera, sprites, and effects.
- DOM/React-style overlay can be introduced for lobby, auth, inventory, shop, and shelf if useful.

Multiplayer:

- Node.js + TypeScript.
- Colyseus rooms.
- Server owns authoritative match state.
- Client sends intent only.

Durable backend:

- Supabase Auth.
- Supabase Postgres for profiles, inventory, currency, rewards, leaderboards, cosmetics, moderation, and room/match history.
- Supabase storage can hold uploaded/managed assets later if needed.

Server authority:

- Server validates room membership, turn ownership, movement, angle, power, weapon choice, timing, terrain changes, damage, KOs, rewards, and match results.
- Client never grants rewards or decides final combat results.

Terrain:

- Current prototype uses a heightmap for speed.
- Online MVP should begin with deterministic, serializable terrain.
- Every weapon should affect terrain; Bunger-class weapons affect terrain the most.
- Explosion, crater, and knockback tuning should generally require precise setup and 2-3 good shots for map KOs.
- Terrain should be fully destroyable vertically; deep enough craters open into the void rather than stopping at a safe floor.
- Void/fall-through areas should be visually readable under the battlefield.
- Post-impact vehicle settling should be driven by the changed terrain area and directly affected vehicles, not by unrelated distant slopes.
- Pixel-mask terrain can replace heightmap when performance and sync complexity are justified.

## 12. Immediate Next Build Recommendation

Next milestone should be:

```text
Milestone 1: Online 1v1 Plus Cosmetic Unlock Sandbox
```

Recommended first implementation slices:

1. Split project into client/server packages or a simple monorepo layout. Started.
2. Add Colyseus server with health check and room creation. Started.
3. Connect Phaser client to a private room. Started.
4. Sync two players in room lobby. Started.
5. Server-authoritative turn start/end.
6. Server-authoritative fire event and projectile simulation.
7. Server-broadcast terrain/damage/round result.
8. Add post-round placeholder reward. Started as test capsule state.
9. Add tiny inventory/equip state. Started with nameplates.
10. Push a playable checkpoint.

## 13. Open Decisions That Do Not Block Milestone 1

- Final public class names.
- Exact final gacha odds.
- Exact shop rotation cadence.
- Whether global lobby chat is MVP or beta.
- Final character roster names and lore.
- Whether match formats later become best-of-3.
- Whether terrain should become pixel-mask after the online heightmap proves out.

## 14. Build-Ready Status

The project is ready to start the next real build milestone.

The current confidence is 95% for:

- what the game is,
- what the next milestone should prove,
- what tech stack to use,
- what to avoid overbuilding,
- how cosmetics should enter early without derailing combat,
- and what content/art boundary to target.
