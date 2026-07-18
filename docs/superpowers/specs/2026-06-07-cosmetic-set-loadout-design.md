# Cosmetic Set And Loadout Design

Date: 2026-06-07
Project: Gravity Canyon

## Goal

Preserve the original fantasy of dressing pilots and changing vehicles while keeping match visuals coherent and readable.

The core decision: cosmetics may be unlocked as themed sets, but they should equip through separate loadout slots.

## Design Decision

Gravity Canyon cosmetics should use a hybrid bundle/slot model:

- A themed set can unlock multiple matching cosmetics at once.
- The loadout UI still treats character outfits and vehicle skins as distinct rewards.
- Players should feel like they can dress a pilot and customize a vehicle, even when those items were earned from the same set.

Example:

- `Nova Redline Set` unlocks `Nova Redline Outfit`, `Redline Vehicle Skin`, and optional matching effects or collection art.
- The player can equip the outfit and vehicle skin separately, unless a future art rule marks a specific item as set-locked.

## Character And Vehicle Roles

Character selection should define identity and presentation. Vehicle selection should define gameplay kit.

Characters control:

- visible pilot identity,
- character-specific outfit inventory,
- mounted pose style,
- KO, victory, defeat, and expression variants,
- voice barks, text quips, and profile/card art,
- character affinity and collection progression.

Characters should not affect combat stats in MVP. A favorite character should never feel mechanically wrong because of a stat table.

Vehicles control:

- movement profile,
- weapon/class kit,
- cannon behavior,
- terrain interaction,
- durability or other combat attributes if those become vehicle-class rules.

This keeps loadout readable: pick the character because you like them, and pick the vehicle because you want its gameplay.

## First Loadout Slots

MVP-facing slots:

- Character Outfit: character-specific visual outfit or mounted-pose variant.
- Vehicle Skin: paint, cannon look, decals, glow accents, or destroyed-state skin.
- Nameplate/Banner: already compatible with the current online reward sandbox.

Later slots:

- Projectile Trail.
- Muzzle Flash or Impact Effect.
- KO Variant.
- Victory/Defeat Flourish.
- Profile/Card Art.
- Collection Shelf Item.

## Match-Screen Art Rule

Combat readability remains the limit.

Playable units should be composed as:

- a vehicle gameplay sprite, plus
- a character gameplay sprite layered in front of or mounted on the vehicle.

Default/active poses may vary by outfit or set:

- seated in or on the vehicle,
- kneeling or crouching on the chassis,
- leaning on the large cannon,
- bracing behind the weapon,
- otherwise riding/using the vehicle in a compact pose.

The vehicle remains the gameplay anchor. The character may show legs if the pose is compact and clearly mounted on the vehicle, but full standing characters beside the vehicle are not the default-state target.

KO poses may break the mounted rule when useful, such as a pilot collapsed beside or in front of a damaged vehicle, as long as the KO state is readable and does not change hitboxes.

## Collection Art Rule

Collection, reward, profile, shop, and gacha surfaces can show larger and more detailed character art than the match screen.

This is where stronger outfit fashion, fan-service-forward variants, full-body poses, and premium illustration detail should live. Match sprites should be stricter, cleaner, and readable.

## Cosmetic Fairness Rule

Cosmetics must not affect:

- HP,
- damage,
- projectile behavior,
- wind,
- movement,
- hitboxes,
- terrain interaction,
- matchmaking,
- reward rates,
- visibility advantage.

If a cosmetic pose changes the apparent silhouette, the gameplay hitbox still follows the same vehicle/unit rules.

## Production Guidance

For MVP, favor complete themed set drops for art direction and readability:

- one outfit,
- one vehicle skin,
- optional nameplate/effect,
- optional larger collection art.

Allow mix-and-match at the loadout slot level where it remains readable. If a specific outfit and vehicle skin only work together visually, mark that pairing as a set-specific exception later rather than making the entire cosmetic system inseparable by default.

## Open Follow-Up

The sprite pipeline still needs a separate production plan for mounted character poses:

- define default active pose rules,
- define character/vehicle layering order,
- define KO-with-damaged-vehicle rules,
- generate purpose-built mounted probes instead of cropping full-body art.
