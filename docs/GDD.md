# Gravity Canyon Game Design Document

Status: living GDD  
Last updated: 2026-06-14  
Current milestone authority: [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md)  
Runbook: [../README.md](../README.md)

## 1. Document Purpose

This Game Design Document (GDD) describes what Gravity Canyon is intended to become. It is the primary design reference for gameplay, player experience, art direction, audio direction, maps, characters, online play, and future systems.

This GDD is intentionally broader than the current playable build. It is allowed to describe future product direction, but it does not authorize v1 scope by itself. Current milestone scope, acceptance criteria, and change-control rules live in [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md).

The documentation goal is that a new collaborator can read the README, this GDD, and the Production Plan and understand with roughly 95% confidence what we are trying to build, what exists now, what is v1, what is future, and what should not be changed casually.

## 2. Product Overview

Gravity Canyon is a desktop browser, turn-based artillery game about stylish anime pilots and signature combat vehicles fighting across unstable canyon terrain. Players win through angle mastery, wind reads, terrain shaping, movement choices, team positioning, and well-timed weapon effects.

The current v1 target is a hosted private-room online playtest alpha. The long-term product target is a multiplayer artillery game with collectible cosmetic identity, expressive characters, social rooms, repeatable online play, and optional ways to experience the same shooter through more mature abilities, art, adult themes, and sound design.

### High Concept

Players join a private room, choose a seat and character, then take turns moving, aiming, charging power, and firing arcing shots across fractured floating canyon maps. Terrain can be destroyed, vehicles can be knocked into the void, and each pilot/vehicle pair should feel like a distinct authored combat unit.

### Genre And Platform

- Genre: 2D side-view turn-based artillery.
- Primary platform: desktop web browser.
- Control style: keyboard-first combat, mouse-friendly menus.
- Multiplayer model: private-room online play first, public lobby later.
- Engine stack: TypeScript, Phaser, Node.js, Colyseus.

### Player Promise

- Play quickly with friends from a hosted URL.
- Learn through readable turns, visible wind, and consistent projectile behavior.
- Win through skillful aiming, terrain manipulation, and team tactics.
- Enjoy expressive anime pilots, signature vehicles, weapon effects, and cosmetic identity.
- Eventually collect cosmetics without those cosmetics changing combat fairness.

## 3. Target Audience

Gravity Canyon is for players who like artillery games, tactical turn-based play, expressive anime character identity, and old-web multiplayer room culture.

Primary audience:

- Players who enjoyed games like Gunbound-style artillery combat.
- Small friend groups who can coordinate private matches.
- Desktop players who prefer readable keyboard-driven combat over high-APM action.
- Players motivated by character identity, cosmetics, and social room presence.

Secondary audience:

- Viewers and streamers who enjoy watching dramatic skill shots, terrain KOs, and funny match outcomes.
- Casual competitive players who like learning wind, angles, and map strategy over twitch mechanics.

Not the immediate audience:

- Mobile-first players.
- Ranked esports players.
- Players looking for real-time action combat.
- Players expecting full persistence, accounts, matchmaking, public lobbies, or ranked play in v1.

## 4. Design Pillars

### Readable Artillery Skill

Shots should feel learnable. Players should improve by remembering angles, judging wind, understanding terrain, and predicting knockback. The game should not rely on aiming cheats, rulers, or hidden prediction lines for v1.

### Terrain As Tactics

Terrain is not just decoration. Players should dig, crater, bridge, expose void, create danger, deny movement, and set up future turns.

### Character And Vehicle Identity

Each playable unit is a pilot plus a signature vehicle family. The player should remember both the character and the vehicle as one authored combat identity. The pilot sells personality; the vehicle carries the readable combat footprint.

### Stream-Safe Adult Anime Style

The intended art direction is adult anime arcade with strong fanservice appeal, but the default public/playtest asset style must remain stream-safe and platform-safe. The game can be attractive, suggestive, stylish, and deliberately fanservice-forward without becoming explicit pornography in the normal playable build.

Long term, Gravity Canyon may support a more mature presentation layer for art, ability theming, adult themes, and sounds. That direction must preserve the same core shooter fairness unless a future milestone explicitly defines a separate adult-only mode.

### Private-Room Reliability First

The first online proof point is not matchmaking, ranking, or a public lobby. It is real people completing private-room matches without desync or confusing state.

### Cosmetics Stay Cosmetic

Cosmetics can be expressive and collectible. They must not change HP, damage, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.

## 5. Current Playable State

The current local prototype demonstrates:

- Phaser artillery combat.
- Four local test units in a 2v2-style roster.
- Keyboard movement and aiming.
- Hold/release launch power.
- Global wind.
- Turn timer.
- Destructible heightmap terrain.
- Terrain holes exposing a visible void layer.
- HP KOs and Void Dropped eliminations.
- Vehicle-only hit zones shown through optional combat hull overlays.
- Floating combat markers for damage, splash, knockback, KOs, and void drops.
- A fixed command deck for active player info, movement range, aim, and launch power.
- Ringworks Basin as the default playable map-feel test.
- Optimized WebP runtime art delivery for hosted playtest loading.
- A Colyseus room foundation with room create/join, guest names, ready state, placeholder rewards, and a server-owned combat preview.

The current online system does not yet run the full Phaser terrain/projectile combat as a synchronized server-authoritative match.

## 6. Core Gameplay Loop

The core match loop is:

1. Players join a private room.
2. Players choose seats and characters.
3. Host chooses pre-match settings.
4. Players ready up.
5. The round starts with server-owned map, spawns, wind, and turn order.
6. Active player moves within range.
7. Active player aims by angle and facing direction.
8. Active player holds/release power to fire.
9. Projectile interacts with wind, terrain, vehicles, and void danger.
10. Server resolves terrain deformation, damage, knockback, KOs, and turn advance.
11. Round ends when one team has no active vehicles.
12. Match ends when the selected match format is satisfied.
13. Players return to the same room or continue to the next round, depending on match state.

The moment-to-moment appeal is the tension between positioning, angle memory, wind reading, terrain destruction, and social reactions.

## 7. Controls

V1 combat is keyboard-first.

Current/prototype controls:

- Left/Right: face and move the active vehicle.
- Up/Down: raise/lower barrel relative to facing direction.
- Space: hold to charge, release to fire.
- R: restart local round.
- H or checkbox: show/hide collision zones.

Combat should remain playable without precision mouse aiming. Mouse can be used for menus, lobby UI, character selection, room settings, and future cosmetic loadouts.

## 8. Match Rules

### Turn

A turn is one active vehicle's action window. During a turn, the active player can move within movement range, aim, charge, and fire. Firing commits the turn immediately. There is no post-shot movement window.

### Round

A round starts with a fresh battlefield, spawn positions, wind state, and turn order. A round ends when one team has no alive vehicles.

### Match

A match is one or more rounds. V1 supports best-of-1 and best-of-3 as room settings.

### Turn Timer

V1 target turn timer uses the shared v1 rules constant, currently 20 seconds. The timer should be visible above the active unit and should not block character/vehicle readability.

### Turn Order

Turn order is generated at match start and persists across every round in that match. Full turn order should be visible enough for players to understand who acts next.

### HP

V1 target is equal HP per vehicle. Damage values can differ by weapon, but cosmetics and pilot art cannot affect HP.

### Movement

Vehicles have limited movement range per turn. Downhill movement and falling are allowed. Steep uphill movement is blocked by a climb-angle limit. Vehicles can intentionally drive into holes or off the stage, causing self-KO if they fall into the void.

### Wind

Wind is global round information. It should be hard to ignore, easy to read, and positioned in a top-safe HUD region. Wind can be calm/neutral. Wind should matter enough that players cannot always ignore it, but it should not be so extreme that progress becomes impossible.

## 9. Combat Resolution

### Projectile Collision

Projectile collision should resolve at the first visible swept edge contact with terrain or a vehicle hit zone. The projectile should not appear to explode before touching the thing it hit.

### Vehicle Hit Zones

Combat collision uses the vehicle body, not the full pilot silhouette. This keeps combat readable and prevents hair, poses, outfit details, or cosmetics from changing damageable area.

Pilot art must visually support this rule. A pilot can stand, lean, pose, or ride dramatically only if the art communicates that the pilot is protected by, tucked into, shielded by, or otherwise visually tied to the vehicle hit zone.

### Direct Hit And Splash

A direct hit is when the projectile contacts a vehicle hit zone. Splash damage is area damage measured outward from an impact point. Splash should measure against the nearest vehicle hit-zone edge, not the pilot silhouette.

### Terrain Damage

Every weapon can affect terrain. Terrain damage should be readable through craters, exposed void, changed movement paths, and future danger setup.

### Knockback

Weapon effects can shove vehicles. Knockback should be consistent enough to learn and funny enough to create memorable match moments. Knockback can cause a Void Dropped elimination if it sends a vehicle into a void gap.

### Friendly Fire

V1 blocks allied friendly-fire damage by default. Self-damage from weapon effects is allowed. Future settings may allow allied friendly fire for playtesting, but that is not required for v1 acceptance.

## 10. KO And Void Rules

There are two elimination presentations:

- HP KO: vehicle reaches 0 HP through damage.
- Void Dropped: vehicle falls into the void/death zone.

Both remove the unit from active play, but they should read differently. HP KO should feel like combat damage. Void Dropped should feel like a fall through unstable canyon space.

The visible void band begins below the lowest playable terrain area for the current map. There should be visible free-fall space so a falling unit can be seen before becoming suspended visual feedback.

The lore explanation is that Gravity Canyon contains unstable gravity shelves and void fields. Vehicles dropped below the safe terrain do not vanish instantly; they become suspended in a danger layer for readability and match feedback.

## 11. Multiplayer Design

### V1 Multiplayer Target

V1 is hosted private-room online play. The proof point is four real humans on separate connections completing a private-room 2v2 match without desync.

1v1 is supported because it is easier to test and helps validate the same systems with fewer people.

### Room Access

Anyone with the hosted URL can open the game. Anyone with a room invite/link/code can join the room. V1 does not require accounts, persistent identity, whitelists, passwords, public matchmaking, or ranked queues.

### Display Names

Players use editable guest display names. Names are not persistent in v1. Profanity filtering is not required for v1 unless it becomes an easy low-risk addition.

### Seating

Players enter the room, then choose a seat. Seats determine team and control assignment. Character selection happens after sitting. Each connection controls one seat. A single person can play multiple seats only by using multiple browser connections/tabs; the game does not need a special multi-seat single-client UI in v1.

### Host

The first connected player is host. If host leaves, host passes to the next earliest connected player. Host can change settings only before a match starts.

### Spectators

V1 can allow unseated spectators only if they were already in the room before the match began. Spectators cannot affect combat or use phrase bubbles. If this is too much implementation for v1, it can be deferred, but the current design expectation is that locked-room viewers are harmless.

### Reconnect

V1 should support simple reconnect by browser/session continuity where practical. Strong identity/security is future scope. If a player disconnects, their timer continues. If they are disconnected when their turn arrives, the game can skip after the turn timer expires or after a short grace period.

## 12. Room And Lobby Flow

V1 private-room flow:

1. Load hosted game URL.
2. Enter or edit display name.
3. Create or join private room.
4. Pick a seat.
5. Pick a character.
6. Ready up.
7. Host starts match when ready conditions are met.
8. Complete match.
9. Return to same room while at least one player remains.

Players should be able to unseat themselves and become unseated room members. Full drag-and-drop seat swapping is not required for v1.

The lobby should show player display name and selected character. If no account exists, generated guest names are acceptable.

Preset phrase bubbles can provide lightweight social interaction without free-text chat. V1 target phrases include simple acknowledgements and reactions such as Hi, Yes, No, Nice, Oops, Taunt, and Bye. Phrase bubbles are temporary above the selected player's unit or seat identity and do not create a persistent chat feed.

## 13. Characters And Vehicles

### Unit Model

Gravity Canyon units are pilot-plus-vehicle identities. Players should talk about both the pilot and the vehicle, but in combat the vehicle is the readable hit-zone anchor.

### V1 Roster

V1 uses exactly four existing characters:

| Character | Team Test Role | Class/Weapon Direction | Current Function |
| --- | --- | --- | --- |
| Nova | Red offense | Bunger / terrain breaker | Big terrain excavation, knockback, bunge setup |
| Vesper | Blue tech/control | Glitch / gravity well | Pull-field or gravity-control fantasy, strong bunge setup |
| Kaelii | Red support/pressure | Bouncer / cluster or bounce pressure | Future class-specific behavior; currently baseline projectile |
| Perlah | Blue spark/pressure | Spark / charged impact identity | Future class-specific behavior; currently baseline projectile |

Class names and exact weapon names are still allowed to mature, but v1 roster count is locked unless the v1 contract is explicitly changed.

### Character Duplication

V1 does not need character restrictions for balance. Multiple players may choose the same character if implementation supports it. The game must still distinguish players through display names, team color, seat indicators, and HUD information.

### Roster Expansion

Adding more playable characters is not v1 scope. Future roster ideas can be preserved in the parking lot.

## 14. Weapon Design

Each v1 character has one primary weapon/action.

Weapon goals:

- One clear use case per character.
- Distinct graphics and effects per character.
- Distinct non-voice SFX per primary action.
- Consistent class fantasy.
- Terrain readability and combat clarity over spectacle.

V1 does not require second weapons, special ultimates, alternate ammo types, passive abilities, or full class balance.

### Nova Weapon Direction

Nova is the terrain-breaker prototype. Her shot should create larger/deeper terrain impact and meaningful knockback. She is the easiest unit to understand as a bunge threat.

### Vesper Weapon Direction

Vesper is the gravity/control unit. The preferred naming direction is Gravity Well. Her shot fantasy is a pull field or gravity distortion that can reposition enemies and set up void drops.

### Kaelii Weapon Direction

Kaelii should eventually express bounce, rolling, ricochet, or cluster pressure. The current player interest is in cluster/bounce behavior that can punish enemies stuck in craters without copying a known Gunbound vehicle one-to-one.

### Perlah Weapon Direction

Perlah should eventually express spark, charged impact, or energetic pressure. The exact primary behavior still needs more design work.

## 15. Maps And Level Design

Gravity Canyon maps should be more interesting than rolling hills. Maps should include multi-tier terrain, occasional gaps, canyon towers, suspended shelves, arches, ring forms, bridge spans, and terrain shapes that make high-angle shots, downward shots, and bunge setup matter.

V1 uses a fixed map pool with known spawn points for 1v1 and 2v2. The host can select a map or select random. Random means the server chooses from the fixed v1 pool.

### Map Readability Requirements

- Valid platform terrain lives above the visible void band.
- Gaps must be wide enough that playable unit scale makes sense.
- Spawn points must be safe from immediate unfair one-shot void drops.
- Terrain should support both direct pressure and high-angle artillery.
- Map features should encourage movement.
- Novel shapes should improve gameplay, not obscure collision truth.

### Current Key Map

Ringworks Basin is the current local demo default. Its design direction is B+C: weapon-readable terrain with enough novelty to motivate continued play. It uses side bowls/high lips, bridge gaps, a central destructible ring bridge island, and faint ring landmarks.

## 16. User Interface And UX

The match UI should be classic, readable, and work-focused.

V1 HUD needs:

- Active player identity.
- Turn timer.
- Team/HP bars.
- Wind.
- Aim angle.
- Launch power.
- Movement range.
- Turn order.
- Weapon info.
- Round/match score.
- Result feedback.

The current command deck is fixed screen-space UI. It should not move with the camera and should not intersect playable terrain or void visuals.

World-space labels must not block the playable unit. Names, class labels, team color, HP bars, and timers should sit above the unit with enough vertical spacing.

## 17. Camera And View

The player should retain global battlefield context. The game should not chase every projectile if the whole shot is already visible.

Current direction:

- Use full-battlefield framing where possible.
- Recenter only when a projectile leaves the readable frame.
- Keep map strategy consistent across browser sizes.
- Maintain a desktop viewport contract so resizing the browser does not change map layout or tactical reach.

The camera should support skill without encouraging ruler-like cheating. Future camera techniques can reduce perfect measurement abuse, but v1 should prioritize readable play.

## 18. Art Direction

### Style Target

Gravity Canyon targets a premium adult anime arcade look. Characters should be attractive, expressive, and memorable. Vehicles should be chunky, readable, toyetic combat machines with strong silhouette identity.

The game can be fanservice-forward. The intended fantasy can include stylish outfits, suggestive attitude, pin-up energy in non-combat presentation, and collectible cosmetic appeal.

### Stream-Safe Default

The default playable build should remain streamer-safe and platform-safe:

- Characters are adult-coded.
- No explicit sex acts.
- No exposed genitals.
- No exposed nipples.
- No pornographic UI.
- No underage-coded sexualization.
- Combat screen readability takes priority over sexualized posing.
- Fanservice should not change hitboxes, visibility, or combat fairness.

This does not mean the game must be sterile. It means the normal playtest/public-facing asset set should be safe enough to share, stream, and playtest without forcing the project into adult-only distribution.

### Mature Presentation Direction

Long term, the player fantasy can include experiencing the same artillery game with more mature ability presentation, adult-themed art variants, and adult sound design. This is a future product direction, not v1 scope.

Mature presentation rules:

- Stream-safe assets remain the default public/playtest set.
- Mature variants require explicit opt-in and platform/distribution decisions.
- Mature variants do not change hitboxes, HP, damage, movement, projectile behavior, wind, matchmaking, or rewards.
- Mature ability presentation may change visuals, audio, naming, and tone, but it should not secretly change gameplay mechanics.
- The project should keep a clean streamer-safe path so the game can still be shared, demoed, and playtested publicly.

### Presentation Layers

Different surfaces can carry different detail levels:

- Match view: compact, readable gameplay pieces.
- HUD portraits: more detail and personality.
- Character select: stronger pose, outfit, and vehicle identity.
- Collection surfaces: highest fanservice and cosmetic expression, still stream-safe by default.
- Future mature variants: possible later discussion, not v1.

### Gameplay Asset Rule

Gameplay sprites must support the vehicle-only hit-zone rule. Pilot poses must visually read as protected by, tucked into, or mounted on the vehicle. Cosmetics cannot affect combat collision.

Source art should remain PNG. Browser delivery should use optimized WebP where practical.

## 19. Audio Direction

V1 needs minimal, readable, non-voice SFX:

- One weapon action sound per character.
- Impact/explosion feedback.
- UI-ready/start feedback if easy.
- No character KO shouts or voice barks required for v1.

Future audio can include:

- Character KO/shout identity.
- More expressive weapon layers.
- Vehicle engine/hover loops.
- Music per lobby/combat state.
- Audience-friendly stingers for round results.

Audio should improve clarity first, then personality.

## 20. Progression And Cosmetics

Progression is future scope beyond v1.

Long-term goals:

- Guest play first.
- Account registration later.
- Save cosmetics and rewards after registering.
- Soft currency.
- Cosmetic-only capsule rewards.
- Nameplates, trails, pilot outfits, vehicle skins, cards, shelf items.
- Duplicate conversion into shards or similar currency.

Hard rule: cosmetics never affect combat stats, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.

## 21. Social And Lobby Direction

V1 social is private-room plus preset phrase bubbles.

Future social direction:

- Public room list.
- Public lobby.
- Room chat.
- Registered-user identity.
- Mute/block/report-ready safety tooling.
- Leaderboards and visible rank.

Free-text chat is not v1.

## 22. Monetization Direction

No real-money MVP is planned.

Future monetization, if any, should be cosmetic-only and transparent enough to avoid harming trust. The game should be fun without spending money. Cosmetic systems should support collection motivation, not gameplay advantage.

## 23. Technical Design Summary

Technical implementation details belong in technical docs and code, but the GDD needs enough context to guide design decisions.

Current stack:

- TypeScript.
- Phaser client.
- Node.js server.
- Colyseus multiplayer.
- Express public preview server.
- Static WebP delivery assets generated from PNG sources.

Technical direction:

- Live matches should become server authoritative.
- Client should render and predict only where safe.
- Server owns room state, turn order, legal movement, projectile result, terrain changes, damage, KOs, void drops, and round/match result.
- Static assets should be optimized for remote playtest delivery.

## 24. Accessibility And Readability

V1 accessibility target is practical readability:

- Large enough labels and HUD text at supported desktop sizes.
- Clear team colors plus text identity.
- No critical information conveyed by color alone where avoidable.
- Readable wind, timer, HP, aim, and launch power.
- Stable command deck that does not clip.
- Collision/debug overlays available during tuning.

Future accessibility:

- Colorblind-safe team palettes.
- More remappable controls.
- Text size options.
- Reduced motion options.

## 25. Open Design Questions

These are intentionally not v1 scope changes until resolved and moved into the Production Plan.

- What is the exact adult-tone ceiling for the default streamer-safe asset set?
- What mature presentation features are desirable later: art variants, ability names/VFX, audio/SFX, UI theme, or separate adult-only mode?
- Should any mature-only asset pack ever ship, or should mature content remain local/optional/private?
- What are Kaelii and Perlah's exact primary weapon mechanics?
- Should friendly fire become an optional room setting after v1?
- How much camera restriction is needed to discourage ruler-style cheating without hurting global context?
- What is the best long-term name for the void/death zone beyond Void Dropped?
- What is the first public-lobby safety model when free-text chat arrives?
- What is the first persistent reward players care about enough to register?

## 26. Future Parking Lot

Future ideas that are not v1:

- Additional playable characters.
- Second weapons.
- Special shots or ultimates.
- Full public room list.
- Public lobby chat.
- Room free-text chat.
- Ranked matchmaking.
- Accounts and persistent profiles.
- Cosmetic inventory.
- Gacha/capsule economy.
- Streamer mode toggle.
- Optional mature art, audio, and ability-presentation variants.
- Expanded lore campaign.
- Mobile controls.
- Full audio identity with voices.

## 27. Documentation Model

Gravity Canyon uses standard game-development document roles:

- README: runbook and current runnable state.
- GDD: living game design document.
- Production Plan: milestone scope, schedule, acceptance criteria, and change control.
- Technical Design Document: implementer-facing architecture, state ownership, networking, gameplay, deployment, and verification plan.
- Technical/reference docs: supporting implementation, art, roster, workflow, and historical notes.

Gravity Canyon also uses an HTML-first reading workflow:

- HTML is the preferred reading, review, and sharing format for human-facing project docs.
- Markdown remains the canonical editable source for stable text documents because it is easier to diff, maintain, and review in Git.
- Generated HTML reading copies live next to their markdown sources and are regenerated with `npm run docs:html`.
- Markdown-to-HTML conversion must be reproducible locally through committed scripts. It should never rely on an AI assistant manually rewriting markdown into HTML.
- Custom hand-authored or generated HTML is preferred when the document benefits from visual structure, navigation, diagrams, annotations, module maps, code walkthroughs, PR explanations, or gameplay/map review layouts.
- If a document needs HTML features that the local markdown converter cannot produce, either extend the converter or make that document an intentional HTML source artifact.
- Do not manually edit generated HTML reading copies. Edit the markdown source, then regenerate HTML.

References:

- [Game design document overview](https://en.wikipedia.org/wiki/Game_design_document)
- [The Anatomy of a Design Document, Part 1](https://www.gamedeveloper.com/design/the-anatomy-of-a-design-document-part-1-documentation-guidelines-for-the-game-concept-and-proposal)
