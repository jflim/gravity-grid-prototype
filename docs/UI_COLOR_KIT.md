# Gravity Canyon UI Color Kit

This is the v0 playtest UI palette for Gravity Canyon. It is a working color kit, not a final brand lock.

## Palette Direction

The current lobby direction is called Canyon Dusk. It should feel like a readable mineral control panel in late canyon light: canyon rock, worn metal, muted teal, copper edges, and restrained team markers. It should not lean on the bright orange and cyan pairing that makes the lobby feel too close to GunBound, and it should not collapse into a mostly black night-mode UI.

## Core Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--gc-ui-bg` | `#17222a` | Lobby and modal base |
| `--gc-ui-surface` | `#21313a` | Primary control surfaces |
| `--gc-ui-surface-raised` | `#2b3c45` | Cards, picker rows, seat bodies |
| `--gc-ui-surface-soft` | `#354a52` | Hover and active-but-not-critical states |
| `--gc-ui-text-strong` | `#d6c4a8` | Primary labels on dark surfaces |
| `--gc-ui-text-body` | `#b9aa92` | Normal readable body text |
| `--gc-ui-text-muted` | `#938575` | Secondary text that still needs to be readable |
| `--gc-ui-accent-mineral` | `#427579` | Selected controls, ownership, confirmation |
| `--gc-ui-accent-copper` | `#a66f3f` | Borders, highlights, host-console edge |
| `--gc-team-red` | `#b85f5f` | Red-team borders and spawn markers |
| `--gc-team-blue` | `#5f8fb8` | Blue-team borders and spawn markers |

## Readability Rules

- Put dense labels and player-facing text on dark surfaces.
- Prefer lifted charcoal and mineral surfaces over black panels for the lobby shell.
- Do not place white or gray text directly on light blue, cyan, or busy map art.
- Use muted sand for important labels and softer clay-sand for secondary labels. Avoid pure white for routine lobby text.
- Map-selector cards are buttons, but they must keep dark card styling instead of inheriting the generic pale action-button surface.
- Hover states must preserve the same text contrast as rest states. Do not let generic pale action-button hover styling override dark option cards.
- Small status badges should avoid light text on light yellow or gold fills. Prefer dark badge surfaces with sand text, or dark text on a larger warm surface with tested contrast.
- Use team red and team blue as borders, badges, and spawn markers instead of whole-panel fills.
- Use copper as a restrained accent. It should not become the main console fill.
- Let map thumbnails and preview art carry local color, but keep map names and descriptions on dark overlays.

## Current UI Contract

The lobby CSS contract test in `src/onlineLobbyStyles.test.ts` guards the first version of this kit. When changing lobby colors, update the tokens and the test together so contrast regressions are intentional and reviewable.
