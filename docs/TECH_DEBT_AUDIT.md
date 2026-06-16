# Gravity Canyon Technical Debt Audit

Generated on 2026-06-16 for the current working tree.

## Tooling Note

The request named Graphify and Fallow. They are not installed in this repository, not exposed as Codex tools, and not available as installable plugins in this session. This report therefore uses a local replacement:

- **Graphify-style pass:** relative import graph, incoming dependencies, outgoing dependencies, and cycle detection.
- **Fallow-style pass:** file size, branch-density proxy, mixed-concern markers, git churn, and missing sibling-test flags.

If Graphify or Fallow become available later, rerun this audit with those tools and compare their findings against this baseline.

## Summary

| Metric | Value |
| --- | --- |
| App | Gravity Canyon |
| Files scanned | 129 |
| Source files | 79 |
| Test files | 50 |
| Nonblank LOC scanned | 13869 |
| Dependency cycles found | 0 |
| Default source-file target | 250 nonblank LOC or less |
| Temporary orchestrator target | 300 nonblank LOC or less |

## Highest Risk Godfile Candidates

Risk score combines nonblank LOC, branch proxy, import fan-in/fan-out, concern mixing, git churn, and lack of a sibling test file. Scores are directional, not a replacement for code review.

| File | LOC | Score | Incoming | Outgoing | Branches | Churn | Concerns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/onlineLobby.ts` | 421 | 1180 | 1 | 2 | 157 | 8 | dom, colyseus |
| `src/match/MatchScene.ts` | 608 | 1107 | 1 | 23 | 58 | 10 | dom, phaser, process |
| `server/rooms/GravityCanyonRoom.ts` | 358 | 793 | 0 | 0 | 84 | 3 | colyseus, schema |
| `scripts/verify-runtime-roster.mjs` | 320 | 667 | 0 | 0 | 59 | 7 | filesystem, process |
| `src/demoLayout.ts` | 349 | 657 | 9 | 0 | 50 | 15 | pure/data |
| `scripts/build-map-previews.ts` | 471 | 573 | 0 | 0 | 0 | 4 | filesystem, process |
| `scripts/build-docs-html.mjs` | 461 | 571 | 0 | 0 | 6 | 7 | filesystem |
| `scripts/build-tech-debt-audit.mjs` | 275 | 433 | 0 | 0 | 17 | 0 | filesystem, process |
| `src/match/rendering/VehicleRenderer.ts` | 114 | 396 | 2 | 6 | 41 | 3 | phaser |
| `src/onlineLobbyView.ts` | 120 | 382 | 2 | 0 | 59 | 4 | pure/data |
| `src/match/MatchViewFactory.ts` | 207 | 377 | 1 | 10 | 5 | 1 | dom, phaser |
| `src/match/rendering/TerrainRenderer.ts` | 163 | 362 | 2 | 1 | 28 | 1 | phaser |

## Largest Files

| File | LOC | Score | Incoming | Outgoing | Branches | Churn | Concerns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/match/MatchScene.ts` | 608 | 1107 | 1 | 23 | 58 | 10 | dom, phaser, process |
| `scripts/build-map-previews.ts` | 471 | 573 | 0 | 0 | 0 | 4 | filesystem, process |
| `scripts/build-docs-html.mjs` | 461 | 571 | 0 | 0 | 6 | 7 | filesystem |
| `src/onlineLobby.ts` | 421 | 1180 | 1 | 2 | 157 | 8 | dom, colyseus |
| `server/rooms/GravityCanyonRoom.ts` | 358 | 793 | 0 | 0 | 84 | 3 | colyseus, schema |
| `src/demoLayout.ts` | 349 | 657 | 9 | 0 | 50 | 15 | pure/data |
| `scripts/verify-runtime-roster.mjs` | 320 | 667 | 0 | 0 | 59 | 7 | filesystem, process |
| `scripts/build-tech-debt-audit.mjs` | 275 | 433 | 0 | 0 | 17 | 0 | filesystem, process |
| `scripts/build-map-gameplay-review.ts` | 273 | 341 | 0 | 0 | 0 | 1 | filesystem |
| `server/v1/maps.ts` | 253 | 321 | 0 | 0 | 4 | 9 | process |
| `shared/content/v1Units.ts` | 219 | 248 | 0 | 0 | 5 | 3 | pure/data |
| `shared/gameplay/vehicleSettlement.ts` | 218 | 332 | 0 | 0 | 27 | 2 | pure/data |

## Graphify-Style Centrality

These files sit on important dependency paths. Some are healthy shared contracts; others are risky orchestrators.

| File | LOC | Score | Incoming | Outgoing | Branches | Churn | Concerns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/match/MatchTypes.ts` | 52 | 324 | 29 | 0 | 5 | 3 | pure/data |
| `src/match/MatchScene.ts` | 608 | 1107 | 1 | 23 | 58 | 10 | dom, phaser, process |
| `src/match/MatchView.ts` | 139 | 275 | 4 | 9 | 15 | 1 | pure/data |
| `src/combatPresentation.ts` | 41 | 146 | 12 | 0 | 3 | 3 | pure/data |
| `src/match/MatchViewFactory.ts` | 207 | 377 | 1 | 10 | 5 | 1 | dom, phaser |
| `src/demoLayout.ts` | 349 | 657 | 9 | 0 | 50 | 15 | pure/data |
| `src/playableMaps.ts` | 34 | 111 | 9 | 0 | 2 | 2 | pure/data |
| `src/match/rendering/VehicleRenderer.ts` | 114 | 396 | 2 | 6 | 41 | 3 | phaser |
| `src/match/ui/CommandDeck.ts` | 172 | 310 | 2 | 5 | 7 | 2 | phaser |
| `src/voidDropPresentation.ts` | 104 | 213 | 6 | 1 | 14 | 2 | pure/data |
| `src/match/VehicleGeometry.ts` | 71 | 116 | 4 | 2 | 1 | 1 | pure/data |
| `src/match/MatchViewStateBuilder.ts` | 58 | 126 | 2 | 3 | 9 | 1 | pure/data |

## Fallow-Style Mixed Concerns

These files combine multiple operational concerns in one file. They are candidates for extraction because touching one reason to change can accidentally disturb another.

| File | LOC | Score | Incoming | Outgoing | Branches | Churn | Concerns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `server/index.ts` | 58 | 226 | 0 | 0 | 4 | 4 | colyseus, schema, filesystem, process |
| `src/match/MatchScene.ts` | 608 | 1107 | 1 | 23 | 58 | 10 | dom, phaser, process |
| `scripts/build-map-previews.ts` | 471 | 573 | 0 | 0 | 0 | 4 | filesystem, process |
| `src/onlineLobby.ts` | 421 | 1180 | 1 | 2 | 157 | 8 | dom, colyseus |
| `server/rooms/GravityCanyonRoom.ts` | 358 | 793 | 0 | 0 | 84 | 3 | colyseus, schema |
| `scripts/verify-runtime-roster.mjs` | 320 | 667 | 0 | 0 | 59 | 7 | filesystem, process |
| `scripts/build-tech-debt-audit.mjs` | 275 | 433 | 0 | 0 | 17 | 0 | filesystem, process |
| `src/match/MatchViewFactory.ts` | 207 | 377 | 1 | 10 | 5 | 1 | dom, phaser |
| `server/schema/GravityCanyonState.ts` | 163 | 262 | 0 | 0 | 0 | 3 | colyseus, schema |
| `src/main.ts` | 99 | 334 | 0 | 3 | 10 | 34 | dom, phaser |
| `scripts/serve-dist.mjs` | 36 | 160 | 0 | 0 | 7 | 2 | filesystem, process |

## Cycle Check

No internal import cycles were detected.

## Findings

1. **Primary client godfile:** `src/onlineLobby.ts` combines Colyseus connection, room-state normalization, DOM template ownership, event binding, rendering, and stage transition. This is the most urgent human-handoff issue because lobby behavior is currently changing quickly.
2. **Primary gameplay godfile:** `src/match/MatchScene.ts` remains the largest product source file. It already delegates many systems, but it still owns scene lifecycle, input setup, turn flow, projectile advancement, terrain adapter methods, world drawing, and post-motion scheduling.
3. **Primary server godfile:** `server/rooms/GravityCanyonRoom.ts` mixes Colyseus message handlers, lobby state synchronization, preview combat setup, preview firing, round rewards, and schema mutation details.
4. **Script monoliths:** `scripts/build-docs-html.mjs`, `scripts/build-map-previews.ts`, and `scripts/verify-runtime-roster.mjs` are useful but large. They are less risky than runtime files, but they should be split if they become frequent edit targets.
5. **Healthy shared cores:** `shared/gameplay/*`, `src/match/*Controller.ts`, and `src/*Presentation.ts` files are generally smaller and better tested. They should be protected as stable boundaries.

This audit scans the checked-out working tree, so active uncommitted work can influence metrics. Use `git status --short` beside the report when comparing two runs.

## Remediation Queue

Use the detailed SADD remediation plan at `docs/superpowers/plans/2026-06-16-technical-debt-remediation.md`.

| Priority | Target | Desired Result |
| --- | --- | --- |
| 1 | `src/onlineLobby.ts` | Controller under 180 LOC; snapshot parsing, markup, and DOM rendering in separate tested modules. |
| 2 | `server/rooms/GravityCanyonRoom.ts` | Room under 280 LOC; preview-combat operations extracted behind named functions. |
| 3 | `src/match/MatchScene.ts` | Scene under 300 LOC; terrain adapter, shot/update flow, and round flow further separated. |
| 4 | `scripts/build-docs-html.mjs` | Build entry under 120 LOC; markdown renderer and docs index writer in separate modules. |
| 5 | `scripts/build-map-previews.ts` and `scripts/verify-runtime-roster.mjs` | Split pure rendering/validation from filesystem orchestration if they keep changing. |

## Contribution Guardrails

- A feature contribution should not add new responsibilities to an existing godfile.
- If a changed file exceeds 250 nonblank LOC, the commit should explain why it remains a single unit.
- New extraction files need one clear owner sentence at the top of the plan or commit message.
- Prefer tests at the new boundary before moving behavior.
- Keep generated/data-heavy files separate from orchestrators so large data does not hide large behavior.
