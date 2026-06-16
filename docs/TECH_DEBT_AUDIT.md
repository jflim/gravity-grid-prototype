# Gravity Canyon Technical Debt Audit

Generated on 2026-06-16 for the current working tree.

## Tooling Note

This report uses the requested tools:

- **Graphify:** installed from `safishamsi/graphify` as the `graphifyy` Python package, then run with `npm run audit:graphify`.
- **Fallow:** installed from `fallow-rs/fallow` as the npm dev dependency `fallow`, then run with `npm run audit:fallow`.
- **Fallow changed-files gate:** `npm run audit:fallow:changed` runs `fallow audit --gate all`, writes `work/audits/fallow-audit.json`, and exits nonzero when the current changes are not human-ready.
- **Audit builder:** `npm run audit:debt` runs Graphify, runs Fallow, builds this markdown report, then regenerates the HTML docs.

The old local size/coupling score remains in the report as supplemental context, but Graphify and Fallow evidence now drive the top findings.

## Summary

| Metric | Value |
| --- | --- |
| App | Gravity Canyon |
| Files scanned by local supplement | 134 |
| Source files | 84 |
| Test files | 50 |
| Nonblank LOC scanned | 13920 |
| Dependency cycles found | 0 |
| Default source-file target | 250 nonblank LOC or less |
| Temporary orchestrator target | 300 nonblank LOC or less |

## Graphify evidence

Graphify builds the project graph and records structural graph health in `work/audits/graphify-diagnose.json`. The generated graph itself stays ignored under `graphify-out/` so commits do not churn on local graph cache output.

| Metric | Value |
| --- | --- |
| Evidence file | `work/audits/graphify-diagnose.json` |
| Graph file | `graphify-out/graph.json` |
| Graphify source command | `graphify update . --force --no-cluster` |
| Diagnose command | `graphify diagnose multigraph --json --graph graphify-out/graph.json` |
| Raw node count | 1610 |
| Post-build node count | 1610 |
| Raw edge count | 2976 |
| Post-build edge count | 2634 |
| Directed unique endpoint pairs | 2636 |
| Undirected unique endpoint pairs | 2632 |
| Collapsed directed endpoint edges | 11 |
| Dangling endpoint edges | 329 |

## Fallow evidence

Fallow reports dependency hygiene, circular-dependency status, duplication, hotspots, and function-level complexity. The report is scoped by `.fallowrc.json` to source, server, shared, and script code while excluding build output, docs, assets, and vendored browser code.

The raw Fallow JSON keeps all findings. The hotspot and remediation tables below filter out this audit infrastructure so the displayed remediation queue stays focused on app and playtest code.

| Metric | Value |
| --- | --- |
| Evidence files | `work/audits/fallow-full.json`, `work/audits/fallow-health.json` |
| Fallow version | 2.97.0 |
| Repo hygiene issues | 1 |
| Circular dependencies | 0 |
| Boundary violations | 0 |
| Unresolved imports | 0 |
| Unused files | 0 |
| Test-only dependencies | 1 |
| Health findings | 79 |
| Remediation targets | 7 |

### Fallow Dependency Findings

| Package | Location | Action |
| --- | --- | --- |
| `@colyseus/sdk` | package.json:30 | Move to devDependencies (only test files import this) |

### Fallow Health Hotspots

| File | Function | Line | Cyclomatic | Cognitive | CRAP | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| `src/match/rendering/VehicleRenderer.ts` | `draw` | 50 | 36 | 32 | 1332 | Refactor `draw` to reduce complexity (extract helper functions, simplify branching) |
| `scripts/verify-runtime-roster.mjs` | `readPngAlphaBounds` | 191 | 26 | 38 | 702 | Add test coverage for `readPngAlphaBounds` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/onlineLobby.ts` | `render` | 227 | 26 | 19 | 702 | Add test coverage for `render` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `scripts/build-docs-html.mjs` | `renderMarkdown` | 124 | 24 | 50 | 600 | Add test coverage for `renderMarkdown` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `shared/gameplay/impact.ts` | `resolveProjectileImpact` | 80 | 22 | 35 | 506 | Add test coverage for `resolveProjectileImpact` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/match/ImpactController.ts` | `resolve` | 30 | 18 | 23 | 342 | Add test coverage for `resolve` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/match/MatchScene.ts` | `update` | 322 | 17 | 16 | 306 | Add test coverage for `update` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/match/rendering/TerrainRenderer.ts` | `drawMapLandmarks` | 81 | 16 | 30 | 272 | Add test coverage for `drawMapLandmarks` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/onlineLobbyView.ts` | `readSlot` | 109 | 16 | 11 | 272 | Add test coverage for `readSlot` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/onlineLobby.ts` | `getSnapshot` | 360 | 14 | 13 | 210 | Add test coverage for `getSnapshot` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/onlineLobby.ts` | `getVehicles` | 439 | 14 | 13 | 210 | Add test coverage for `getVehicles` to lower its CRAP score (coverage reduces risk even without refactoring) |
| `src/match/MatchInputController.ts` | `readMatchInputSnapshot` | 38 | 14 | 8 | 210 | Add test coverage for `readMatchInputSnapshot` to lower its CRAP score (coverage reduces risk even without refactoring) |

### Fallow Remediation Targets

| File | Priority | Category | Recommendation |
| --- | --- | --- | --- |
| `src/match/rendering/VehicleRenderer.ts` | 23.4 | extract_complex_functions | Extract draw (cognitive: 32) in 126-LOC file into smaller functions |
| `src/onlineLobbyView.ts` | 18.9 | add_test_coverage | 3 complex functions lack test coverage path, add tests before modifying |
| `shared/gameplay/impact.ts` | 11.7 | extract_complex_functions | Extract resolveProjectileImpact (cognitive: 35) in 196-LOC file into smaller functions |
| `src/match/rendering/TerrainRenderer.ts` | 11.4 | extract_complex_functions | Extract drawMapLandmarks (cognitive: 30) in 174-LOC file into smaller functions |
| `scripts/verify-runtime-roster.mjs` | 4.9 | extract_complex_functions | Extract readPngAlphaBounds (cognitive: 38) in 356-LOC file into smaller functions |
| `scripts/build-docs-html.mjs` | 5.8 | extract_complex_functions | Extract renderMarkdown (cognitive: 50) in 509-LOC file into smaller functions |

## Highest Risk Godfile Candidates

This supplemental score combines nonblank LOC, branch proxy, import fan-in/fan-out, concern mixing, git churn, and lack of a sibling test file. It is useful for finding large ownership problems, while Fallow is better for function-level complexity.

| File | LOC | Score | Incoming | Outgoing | Branches | Churn | Concerns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/onlineLobby.ts` | 421 | 1180 | 1 | 2 | 157 | 8 | dom, colyseus |
| `src/match/MatchScene.ts` | 608 | 1107 | 1 | 23 | 58 | 10 | dom, phaser, process |
| `server/rooms/GravityCanyonRoom.ts` | 358 | 793 | 0 | 0 | 84 | 3 | colyseus, schema |
| `scripts/verify-runtime-roster.mjs` | 320 | 667 | 0 | 0 | 59 | 7 | filesystem, process |
| `src/demoLayout.ts` | 349 | 657 | 9 | 0 | 50 | 15 | pure/data |
| `scripts/build-map-previews.ts` | 471 | 573 | 0 | 0 | 0 | 4 | filesystem, process |
| `scripts/build-docs-html.mjs` | 461 | 571 | 0 | 0 | 6 | 7 | filesystem |
| `src/match/rendering/VehicleRenderer.ts` | 114 | 396 | 2 | 6 | 41 | 3 | phaser |
| `src/onlineLobbyView.ts` | 120 | 382 | 2 | 0 | 59 | 4 | pure/data |
| `src/match/MatchViewFactory.ts` | 207 | 377 | 1 | 10 | 5 | 1 | dom, phaser |
| `src/match/rendering/TerrainRenderer.ts` | 163 | 362 | 2 | 1 | 28 | 1 | phaser |
| `scripts/build-map-gameplay-review.ts` | 273 | 341 | 0 | 0 | 0 | 1 | filesystem |

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
| `scripts/build-map-gameplay-review.ts` | 273 | 341 | 0 | 0 | 0 | 1 | filesystem |
| `server/v1/maps.ts` | 253 | 321 | 0 | 0 | 4 | 9 | process |
| `shared/content/v1Units.ts` | 219 | 248 | 0 | 0 | 5 | 3 | pure/data |
| `shared/gameplay/vehicleSettlement.ts` | 218 | 332 | 0 | 0 | 27 | 2 | pure/data |
| `server/v1/mapGameplayReview.ts` | 207 | 216 | 0 | 0 | 0 | 3 | pure/data |

## Graphify-Style Centrality

These files sit on important dependency paths according to the local import graph supplement. Some are healthy shared contracts; others are risky orchestrators.

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
| `src/match/MatchViewFactory.ts` | 207 | 377 | 1 | 10 | 5 | 1 | dom, phaser |
| `server/schema/GravityCanyonState.ts` | 163 | 262 | 0 | 0 | 0 | 3 | colyseus, schema |
| `src/main.ts` | 99 | 334 | 0 | 3 | 10 | 34 | dom, phaser |
| `scripts/run-graphify-audit.mjs` | 49 | 186 | 0 | 0 | 11 | 1 | filesystem, process |
| `scripts/serve-dist.mjs` | 36 | 160 | 0 | 0 | 7 | 2 | filesystem, process |
| `scripts/run-graphify-hook-check.mjs` | 25 | 150 | 0 | 0 | 8 | 1 | filesystem, process |

## Cycle Check

No internal import cycles were detected by the local supplement. Fallow also reports zero circular dependencies in the configured source set.

## Findings

1. **Primary client godfile:** `src/onlineLobby.ts` combines Colyseus connection, room-state normalization, DOM template ownership, event binding, rendering, and stage transition. Fallow also flags `render`, `getSnapshot`, and `getVehicles`, so extraction should start here before playtest lobby behavior grows again.
2. **Primary rendering hotspot:** `src/match/rendering/VehicleRenderer.ts` is not the largest file, but Fallow identifies `draw` as the highest CRAP-risk function. It should be split into named rendering helpers before more sprite and collision-readability work lands.
3. **Primary gameplay godfile:** `src/match/MatchScene.ts` remains the largest runtime source file and Fallow flags its `update` loop. It already delegates many systems, but it still owns scene lifecycle, input setup, turn flow, projectile advancement, terrain adapter methods, world drawing, and post-motion scheduling.
4. **Primary server godfile:** `server/rooms/GravityCanyonRoom.ts` mixes Colyseus message handlers, lobby state synchronization, preview combat setup, preview firing, round rewards, and schema mutation details. Fallow specifically flags `refreshStatus`.
5. **Script monoliths:** `scripts/build-docs-html.mjs` and `scripts/verify-runtime-roster.mjs` are confirmed by Fallow as complexity risks. They are less risky than runtime files, but they should be split because both support repeated agent/human workflows.
6. **Shared combat complexity:** `shared/gameplay/impact.ts` and `shared/gameplay/vehicleSettlement.ts` are not first-pass godfiles, but Fallow flags core gameplay decision functions. Treat them with characterization tests before changing combat truth.
7. **Dependency hygiene:** Fallow reports `@colyseus/sdk` as test-only from package imports. Review whether the production browser SDK path is intentionally served from `public/vendor/colyseus.js`; if yes, move the npm package to `devDependencies` or add an explicit Fallow ignore with a note.

This audit scans the checked-out working tree, so active uncommitted work can influence metrics. Use `git status --short` beside the report when comparing two runs.

## Remediation Queue

Use the detailed SADD remediation plan at `docs/superpowers/plans/2026-06-16-technical-debt-remediation.md`.

| Priority | Target | Desired Result |
| --- | --- | --- |
| 1 | `src/onlineLobby.ts` | Controller under 180 LOC; snapshot parsing, markup, and DOM rendering in separate tested modules. |
| 2 | `src/match/rendering/VehicleRenderer.ts` | `draw` split into named helpers with focused tests around sprite/body/collision-zone decisions. |
| 3 | `src/match/MatchScene.ts` | Scene under 300 LOC; terrain adapter, shot/update flow, and round flow further separated. |
| 4 | `server/rooms/GravityCanyonRoom.ts` | Room under 280 LOC; preview-combat operations and status refresh extracted behind named functions. |
| 5 | `scripts/build-docs-html.mjs` and `scripts/verify-runtime-roster.mjs` | Split pure parsing/validation from filesystem orchestration. |
| 6 | `shared/gameplay/impact.ts` and `shared/gameplay/vehicleSettlement.ts` | Add characterization coverage before reducing complex combat decision functions. |

## Contribution Guardrails

- A feature contribution should not add new responsibilities to an existing godfile.
- If a changed file exceeds 250 nonblank LOC, the commit should explain why it remains a single unit.
- New extraction files need one clear owner sentence at the top of the plan or commit message.
- Prefer tests at the new boundary before moving behavior.
- Keep generated/data-heavy files separate from orchestrators so large data does not hide large behavior.
