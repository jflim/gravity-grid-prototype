# Collision Art Rule

Gravity Canyon v1 uses vehicle-only combat collision.

The playable damage object is the rig, rover, cart, or vehicle chassis. Pilot art is identity and animation, not a custom damage shape. This keeps cosmetics, pose changes, hair, outfits, and future art revisions from changing combat fairness.

## V1 Rule

- Direct-hit collision uses one shared vehicle hit zone for all v1 units.
- Splash damage blooms from the projectile impact point, then measures distance to the nearest edge of each vehicle hit zone.
- Pilot art and cosmetic detail do not define damageable pixels.
- A projectile that visually hits exposed pilot art but misses the vehicle hit zone is treated as an art-readability problem, not a hitbox change.

## Art Acceptance

A v1 match sprite is acceptable only when the vehicle-only hit zone feels believable on top of the art.

Standing, crouched, leaning, or high-riding pilot poses need an obvious protection cue:

- cockpit,
- guard rail,
- roll cage,
- armored platform,
- harness.

If the pilot visually reads as an exposed separate target, the sprite is not match-ready until the pose, crop, scale, vehicle frame, or protective structure is adjusted.

## Enforcement

The code keeps this from becoming subjective drift:

- `src/v1CollisionProfiles.ts` stores the shared vehicle hit zone and v1 art-review notes.
- `src/collisionArtRule.ts` evaluates whether each sprite profile has reasonable size ratios and required pilot-protection cues.
- `src/collisionArtRule.test.ts` fails if a v1 unit gets a custom hit zone, lacks required review metadata, or becomes too visually large for the shared vehicle hit zone.

The automated rule is a guardrail, not a replacement for visual review. If the debug hit zone looks dishonest on a sprite, the next action is to revise the art or presentation profile.
