# Ringworks Basin Map Design

## Goal

Make the default local demo map more motivating to play and build by combining weapon-readable terrain with more novel ring/bridge structure.

This is not a v1 scope expansion. The map still uses the existing fixed v1 map pool, existing destructible heightmap terrain, existing constant gravity/wind rules, and the four existing v1 primary weapon identities.

## Approved Direction

The approved direction is **B plus C: weapon-readable novelty**.

- B means the terrain should make the four existing primary weapons feel necessary and distinct.
- C means the arena should have enough unusual structure that it feels like Gravity Canyon, not a plain slope duel.
- A is borrowed only where it improves fair Void Drop pressure. The map should not become a pure instant-death hazard map.

## Design Rule

Novel terrain is allowed in v1 only when it makes the existing four primary weapons more interesting. Pure spectacle goes to v2.

## Map Shape

Keep the stable map id `ring-basin` for compatibility, but change the displayed map direction to **Ringworks Basin**.

Ringworks Basin should use three playable land spans:

- Left canyon bowl and high lip for the red seats.
- Central broken ring bridge/island as a destructible shot-lane obstacle.
- Right canyon bowl and high lip for the blue seats.

The central ring bridge creates two large readable air gaps instead of one tiny slot or one empty middle. These gaps should be wide enough to visually fit the current large pilot-plus-vehicle unit scale.

## Weapon Reads

- Nova / Canyon Breaker: exposed high lips and bridge edges can be carved into Void Drop pressure, but should require setup rather than one free shot.
- Vesper / Gravity Well: pull impact points near bridge lips and chasm edges should threaten positioning without adding map-specific gravity rules.
- Kaelii / Skip Roller: side bowls, crater lips, and curved approaches should create obvious rolling routes into trapped or cratered enemies.
- Perlah / Sunspike Cluster: compact side pockets and the central bridge/island should give cluster shots meaningful area targets.

## Constraints

- No new weapons, second shots, passives, ultimates, map-specific physics, gravity wells as hazards, moving platforms, or procedural map sliders.
- No tiny lethal gaps that look too small for the current sprites.
- No player spawns on the central bridge/island.
- Spawns must stay close to safe terrain surfaces.
- The map should keep uphill and downhill shot reads for first-time players.
- The local demo should remain playable after every map iteration.

## Acceptance

- Tests prove Ringworks Basin still belongs to the five-map v1 pool under the existing `ring-basin` id.
- Tests prove the default demo uses Ringworks Basin.
- Tests prove the center has a playable/destructible bridge/island at the middle and readable void gaps on both sides.
- Tests prove the side terrain has lower bowls and high lips that support weapon-readable play.
- Generated HTML map docs reflect the new shape and review notes.
