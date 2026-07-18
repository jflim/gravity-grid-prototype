# Lobby Seat Card Unit Summary Design

## Context

The current playtest lobby seat card shows the combined playable unit art on the left, then repeats the same choice as separate Pilot and Vehicle panels on the right. This makes claimed seats feel tall and redundant, especially in the Red Team and Blue Team columns where players mainly need to scan who is seated, what unit they picked, and whether they are ready.

The approved direction is Option B from the seat-card comparison mockup: a compact unit summary.

## Goal

Make claimed and claimable lobby seats easier to scan while keeping the character-plus-vehicle fantasy visible. The card should treat the combined playable unit as the primary identity, then show Pilot and Vehicle names as compact metadata instead of large repeated panels.

## UI Design

- Each active seat keeps one main combined unit image.
- The seat card uses a shorter two-column layout: unit image on the left, player/seat state and unit metadata on the right.
- The right side shows display name, seat label, current state, and host badge if applicable.
- Pilot and Vehicle names become compact chips, for example `Nova` and `Bunger Rig`.
- This implementation uses only the existing Pilot and Vehicle names as chips. Role or fantasy chips are future content work because they could imply gameplay stats that are not implemented.
- The main action remains visible at the bottom of the right column: `Claim Seat`, `Change Unit`, `Ready`, or the existing locked-state label.
- Empty or inactive seats use the same compact structure where possible so team columns do not jump in height.

## Component Boundaries

- `src/onlineLobbyMarkup.ts` owns the seat markup shape.
- `src/styles.css` owns the compact seat layout and responsive behavior.
- `src/onlineLobbyCharacters.ts` remains the source for Pilot, Vehicle, and Unit assets.
- No server state changes are required. This is a presentation change over existing lobby slot and character data.

## Data Flow

The room snapshot still normalizes slots through `src/onlineLobbyView.ts`. Each slot chooses a `LobbyCharacterCard` from its selected character id. Rendering then uses:

- `card.unitImage` for the primary visual.
- `card.name` for the pilot chip.
- `card.vehicleName` for the Vehicle chip.
- existing slot ownership, local player, ready, host, and phase fields for actions and badges.

## Edge Cases

- Long display names, Pilot names, and Vehicle names must truncate without resizing the card.
- Host badge and state text must fit on narrow lobby columns.
- 2v2 mode should show four seats without the team area feeling dominated by repeated loadout panels.
- Mobile or narrow viewport behavior remains a single-column stack, with text and buttons constrained so they do not overlap.

## Testing

- Update lobby markup tests to assert that seat cards render compact unit metadata instead of two large Pilot/Vehicle panels.
- Keep host-badge, claim, ready, and locked action tests passing.
- Run focused lobby tests, then the normal build/test gates before calling the implementation complete.

## Out Of Scope

- Changing actual character selection rules.
- Splitting Pilot and Vehicle into independent gameplay choices.
- Adding new character stats, abilities, or balance labels.
- Changing server-owned lobby or combat setup data.
