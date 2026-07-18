# Bug Feedback Template

Use this file when reporting playtest bugs, confusing UI, or design feedback. The quick report is enough for simple issues. Use the full report when the bug involves multiplayer, lobby state, turn ownership, shots, movement, or anything hard to reproduce.

## Quick Report

```md
## Bug / Feedback

Type: Bug / Confusing UI / Balance feel / Visual polish / Question
Severity: Blocker / Major / Minor / Nice-to-have

Setup:
- Command:
- URL:
- Browser/device:

Steps:
1.
2.
3.

Expected:

Actual:

Evidence:
- Screenshot/video:
- Approx time:

Repro rate: Always / Sometimes / Once / Could not reproduce again
Notes:
```

## Multiplayer Report

```md
## Bug / Feedback Title

Type: Bug / Confusing UI / Balance feel / Visual polish / Question
Severity: Blocker / Major / Minor / Nice-to-have

## Test Setup

Command used: npm run playtest / npm run playtest:local / npm run dev
URL:
Browsers/devices:

Room settings:
- Match mode: Duel / Doubles
- Rounds to win:
- Map setting: Random / selected map name
- Room access: Private Link / Public

Players:
- Player A:
  - Display name:
  - Browser/device:
  - Role: Host / Player / Unsure
  - Team/seat:
  - Unit:
- Player B:
  - Display name:
  - Browser/device:
  - Role: Host / Player / Unsure
  - Team/seat:
  - Unit:

Active turn when the issue happened:
Problem was visible on: Player A screen / Player B screen / both / unsure

## Steps To Reproduce

1.
2.
3.

## Expected


## Actual


## Evidence

- Screenshot/video:
- Approx time it happened:
- Browser console message, if visible:
- Server terminal message, if visible:

## Repro Rate

Always / Sometimes / Once / Could not reproduce again

## Notes

Anything that felt weird, even if you are not sure it is a bug.
```

## Feel Feedback

```md
## Feel Feedback

Screen/feature:
What I was trying to do:
What confused me:
What I expected as a player:
How strongly I care: 1-5
Screenshot/video:
Notes:
```

## Good Evidence To Include

- A screenshot or short recording from the screen where the problem is visible.
- Which player was host, which player owned the active turn, and which screen showed the issue.
- Whether both browsers were in the same room and same match phase.
- The exact command used to launch the test.
- Whether the issue happened once or repeats reliably.
