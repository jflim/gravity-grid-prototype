# Gravity Canyon Production Plan

Status: current milestone authority  
Last updated: 2026-06-14  
Design reference: [GDD.md](GDD.md)  
Runbook: [../README.md](../README.md)

## 1. Document Purpose

This Production Plan defines the current milestone, accepted scope, next build order, acceptance criteria, out-of-scope boundaries, and change-control rules for Gravity Canyon.

Use this document when asking:

- What are we building next?
- Is this v1 scope?
- What is accepted, deferred, or blocked?
- What tests and checks prove a milestone is ready?

The GDD can describe the broader product vision. This Production Plan controls current milestone scope.

## 2. Current Milestone

Current milestone: V1 Playtest Alpha - Hosted Private-Room 2v2.

Goal: prove reliable hosted private-room online 2v2 artillery combat with the existing four-character roster. 1v1 is supported as a practical testing mode, but 2v2 is the v1 promise.

The immediate technical bottleneck is online parity: the local Phaser match is playable, and the Colyseus room foundation exists, but the full Phaser combat loop is not yet server-authoritative online play.

## 3. V1 Scope Authority

This Production Plan is the current v1 scope authority.

Supporting reference:

- [V1_PLAYTEST_ALPHA.html](V1_PLAYTEST_ALPHA.html) remains a readable contract snapshot from the original v1 scoping pass.
- If this Production Plan and the older v1 HTML snapshot disagree, this Production Plan wins after this restructuring.

## 4. V1 Promise

Gravity Canyon v1 is a hosted private-room playtest alpha. The core promise is reliable online 2v2 artillery combat with real people.

V1 must support:

- Hosted URL play without local installation.
- Private room creation.
- Join by invite link or room code.
- Editable guest display names.
- Seat selection.
- Character selection for the four existing v1 characters.
- 1v1 and 2v2 room modes.
- Best-of-1 and best-of-3 match length settings.
- Server-owned room, round, turn, movement, aim, firing, projectile, terrain, HP, KOs, Void Dropped eliminations, and round/match result.
- Four-human 2v2 validation on separate connections.

V1 is not a public launch. It is a playable alpha for invited friends and feedback.

## 5. V1 Roster

V1 uses exactly four existing characters:

- Nova.
- Vesper.
- Kaelii.
- Perlah.

Each v1 character has one primary weapon/action.

No additional playable characters are v1 unless the v1 contract is explicitly changed.

## 6. V1 Room Flow

Required room flow:

1. Player opens hosted URL.
2. Player enters or edits display name.
3. Player creates or joins a private room.
4. Player picks a seat.
5. Player picks a character.
6. Player readies.
7. Host starts match when ready conditions are met.
8. Match completes.
9. Players return to the same room while at least one player remains.

Room rules:

- Anyone with the room invite/link/code can join.
- No account required.
- No database persistence required.
- First connected player is host.
- If host leaves, host passes to the next earliest connected player.
- Host can change settings before the match starts.
- Settings cannot change mid-match.
- Unseated room members may observe only if this is implemented safely without expanding scope.

## 7. V1 Match Rules

Required match rules:

- Team elimination win condition.
- 1v1 and 2v2 modes.
- Best-of-1 and best-of-3 match settings.
- One shot per active turn.
- Firing commits the turn immediately.
- Equal baseline HP per vehicle.
- Limited movement range per turn.
- Downhill movement and falling are allowed.
- Steep uphill movement is blocked by climb-angle rule.
- Wind is visible and meaningful.
- Full turn order is visible enough to understand upcoming turns.
- HP KO and Void Dropped both remove a unit from play.
- HP KO and Void Dropped should have distinct visual presentation.

## 8. V1 Combat Requirements

Required combat systems:

- Server-authoritative movement validation.
- Server-authoritative aim/fire input.
- Server-authoritative projectile simulation.
- Server-authoritative terrain deformation.
- Server-authoritative damage, knockback, KOs, and Void Dropped eliminations.
- Vehicle-only hit zones.
- Splash measured from impact point to vehicle hit-zone edge.
- Terrain destruction from all weapons.
- Larger terrain impact/knockback behavior for Nova's terrain-breaker weapon.
- Self-damage allowed.
- Allied friendly-fire damage blocked by default.

The client can render and present feedback, but the server must own combat results.

## 9. V1 Maps

V1 uses a fixed map pool with known spawn points for 1v1 and 2v2.

Required map behavior:

- Host can select a map.
- Host can select random map.
- Random means the server chooses from the fixed v1 map list.
- Maps include multi-tier terrain, gaps, and canyon landmarks.
- Valid platform terrain lives above the visible void area.
- Spawn layouts avoid unfair immediate one-shot void drops.

Map art polish can improve readability, but new map count or major map scope expansion is not v1 unless explicitly traded against other work.

## 10. V1 UI And UX Requirements

V1 match UI must show:

- Active player.
- Turn timer.
- Team/HP bars.
- Wind.
- Aim angle.
- Launch power.
- Movement range.
- Turn order.
- Weapon info.
- Round/match score.
- Round/match result.

V1 room UI must show:

- Room code/link.
- Display names.
- Seats.
- Teams.
- Selected characters.
- Ready state.
- Host controls.
- Mode, match length, and map settings before match start.

Preset phrase bubbles are v1 scope. Free-text chat is not v1.

## 11. V1 Art And Audio Requirements

V1 art requirements:

- Four existing characters only.
- Runtime gameplay sprites for each v1 unit.
- Vehicle-only collision art must read correctly.
- Combat readability comes before cosmetic spectacle inside the match screen.
- Default playtest art should be stream-safe, platform-safe, and fanservice-forward without becoming explicit.

V1 audio requirements:

- One readable non-voice weapon SFX per v1 character.
- Minimal impact/UI sounds if low-risk.
- Character voice, KO shouts, and broader music identity are future scope.

## 12. V1 Deployment Requirements

V1 must be hostable so friends can play without installing the project.

Current accepted playtest path:

- `npm run playtest` builds the project.
- It serves the built client and Colyseus server from one local port.
- It starts a Cloudflare quick tunnel.
- It prints the share URL.

Reliability requirement:

- Cloudflare Tunnel should use the more reliable HTTP/2 protocol if QUIC errors appear.
- Runtime art should use optimized WebP delivery assets.
- The app should show loading/failure status instead of a blank screen if required art fails.

Longer-term deployment options such as AWS, Lightsail, S3, CloudFront, Fly.io, Render, or DigitalOcean are not v1 gameplay scope. They are production/infrastructure decisions.

## 13. V1 Acceptance Criteria

V1 is accepted when:

- Four remote humans can join the same private room from separate connections.
- Players can occupy two teams in a 2v2 match.
- Players can complete a full match without desync.
- Server owns combat results.
- One 1v1 playtest completes successfully.
- One 2v2-format playtest completes successfully.
- One four-human gold network validation completes successfully.
- A tester can understand whose turn it is, what they can do, why damage happened, and why the round/match ended.

## 14. Explicitly Out Of Scope For V1

Not v1:

- Additional playable characters.
- Second weapons.
- Special shots or ultimates.
- Full public room list.
- Public matchmaking.
- Ranked matchmaking.
- Public lobby chat.
- Free-text room chat.
- Accounts.
- Persistent profiles.
- Persistent match history.
- Persistent inventory.
- Full gacha/capsule system.
- Real-money purchases.
- Full collection shelf.
- Mobile support.
- Full voice/KO shout set.
- Mature/adult-only asset pack.
- Public launch polish.

These may stay in the GDD as future direction, but they do not enter v1 without change control.

## 15. Change Control

To change locked v1 scope, the user must explicitly say:

```text
I am requesting a v1 contract change.
```

When that phrase is used, the assistant must:

1. Push back.
2. Identify which v1 acceptance criterion fails without the change.
3. Identify what work must be traded out, deferred, or narrowed.
4. Update this Production Plan if the change is accepted.
5. Update the decision log or version log.

If the phrase is not used, new ideas should be classified as V1, Future, Context, or Open Question. Future ideas go in the GDD parking lot or a supporting reference, not into v1 work.

## 16. Current Implementation State

Done:

- Local Phaser artillery prototype.
- Local four-unit 2v2-style test roster.
- Destructible terrain and void drop presentation.
- Vehicle-only hit zone prototype.
- Command deck and readable match HUD direction.
- Optimized WebP runtime art delivery.
- Colyseus room create/join.
- Guest display names.
- Ready checks.
- Placeholder reward/nameplate state.
- Server-owned combat preview state.
- One-terminal public playtest launcher.

Not done:

- Full online seat ownership.
- Full online 1v1/2v2 room settings.
- Online character selection wired to match start.
- Phaser match driven by Colyseus room state.
- Server-authoritative movement/projectile/terrain/damage.
- Full round/match scoring online.
- Four-human 2v2 validation.

## 17. Next Build Order

Recommended next sequence:

1. Fix playtest tunnel reliability by forcing Cloudflare Tunnel HTTP/2.
2. Build real room settings for 1v1/2v2, best-of-1/best-of-3, and map select/random.
3. Build seat ownership and character selection.
4. Build ready/start flow using selected seats and settings.
5. Wire Phaser match start from room state.
6. Move turn order, movement, aim, fire, projectile, terrain, damage, KO, and round result to server authority.
7. Validate 1v1 online.
8. Validate 2v2 format online.
9. Run four-human 2v2 gold validation.

## 18. Quality Gates

Before committing gameplay, UI, networking, asset integration, or deployment changes:

```powershell
npm test
npm run build
npm run verify:runtime-roster
```

After markdown doc edits:

```powershell
npm run docs:html
```

After runtime art changes:

```powershell
npm run optimize:assets
npm run verify:runtime-roster
```

For public playtest validation:

```powershell
npm run playtest
```

Then verify that the printed URL loads the app, runtime config, and WebP art.

## 19. Production Cadence

Recommended loop:

1. Pick one version goal.
2. Confirm whether it is v1 or future scope.
3. Implement only that goal.
4. Run the relevant quality gates.
5. Update docs if rules, setup, controls, terminology, assets, or scope changed.
6. Update [VERSION_LOG.md](VERSION_LOG.md) for meaningful checkpoints.
7. Commit with a descriptive message.
8. Decide the next goal.

## 20. Supporting References

- [GDD.md](GDD.md): living game design reference.
- [V1_PLAYTEST_ALPHA.html](V1_PLAYTEST_ALPHA.html): original v1 contract snapshot.
- [CHARACTER_ROSTER.md](CHARACTER_ROSTER.md): roster/art notes.
- [COLLISION_ART_RULE.md](COLLISION_ART_RULE.md): vehicle-only hit-zone art rule.
- [SPRITE_ASSET_WORKFLOW.md](SPRITE_ASSET_WORKFLOW.md): art source/delivery workflow.
- [VERSION_LOG.md](VERSION_LOG.md): checkpoint history.
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md): repo process.
