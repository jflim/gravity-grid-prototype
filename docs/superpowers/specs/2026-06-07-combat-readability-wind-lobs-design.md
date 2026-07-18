# Combat Readability, Wind, And Lob Play Design

## Goal

Make Gravity Canyon read like a skillful artillery game: shots that visually hit a unit should count, high-angle lobs should be the normal path to winning through terrain, and wind should matter without stalling matches.

## Current Problem

The prototype currently tests direct projectile hits against a small circular anchor around each vehicle. The new unit concept sprites are much larger, so a shot can appear to hit the pilot or vehicle art without dealing direct damage. Wind is present but mild enough that it rarely changes decisions. The current terrain shape can still allow too many simple direct-fire exchanges.

## Slice 1: Combat Hull

Each unit gets a gameplay combat hull that covers the vehicle body plus mounted pilot mass. The hull is not pixel-perfect and does not include every decorative hair, strap, or silhouette edge. It should be visible by default during prototype tuning and toggleable with `H`.

The hull becomes the direct-hit collision shape. Splash remains distance-based from the unit anchor for now so the current damage model stays stable.

## Slice 2: Damage Markers

Impacts should produce short-lived world-space markers that explain what happened:

- `DIRECT -N` for hull hits.
- `SPLASH -N` for blast damage without a direct hull hit.
- `SHOVED` for Bunger knockback.
- `KO` for HP defeat.
- `BUNGED` for fall or void defeat.

The markers are gameplay-readable debug feedback, not final VFX.

## Slice 3: Wind Bands

Wind should be stronger and more meaningful at higher altitude while staying capped and readable. Low direct shots get mild wind influence. High lobs pass through upper-air current and require wind reads.

The UI should distinguish low wind from high current so misses feel learnable rather than random.

## Slice 4: Map And Spawn Prototypes

Round start should choose from a small pool of terrain and spawn archetypes that reduce flat direct-fire duels and create natural cover. Good archetypes include twin ridges, center walls, shelves, basins, and broken canyon gaps.

Every archetype must keep both players able to make progress. High-angle shots should be useful because of terrain shape, not because direct shots are artificially banned.

## Slice 5: Pacing Tuning

After hulls, markers, wind, and terrain prototypes are visible, tune combat around these goals:

- A precise hull hit is meaningful.
- Bunker or ring-out wins usually require setup or at least two good shots.
- Wind bends decisions but does not make turns feel hopeless.
- Terrain encourages lobs while preserving progress.

## Implementation Strategy

Implement Slice 1 first because it defines damage truth. Work on map/spawn and damage-marker prototypes can proceed in parallel as sidecar tasks, but high-angle reward rules should wait until combat hull collision reports enough projectile metadata to classify plunge hits.
