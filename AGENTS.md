# AGENTS.md

## Project

- Gravity Canyon is a browser-based TypeScript/Phaser artillery game with a Node.js/Colyseus multiplayer foundation.
- Treat this repository as the active project root. The GitHub remote is `https://github.com/jflim/gravity-grid-prototype.git`.
- Current working branch is usually `feature/gravity-canyon-online-foundation`; check `git status --short --branch` before editing.

## Start Here

- Read `README.md` for the current runnable state and controls.
- Read `docs/SESSION_HANDOFF.md` for the latest handoff, next best step, known environment notes, and verification already run.
- Read `docs/PRODUCTION_PLAN.md` for current v1 scope, acceptance tests, out-of-scope list, build order, and change-control rules.
- Read `docs/GDD.md` for broader product direction and design context.
- Read `docs/TECHNICAL_DESIGN.md` before changing networking, server-authoritative combat, shared simulation, deployment, or data-model boundaries.
- Read `docs/V1_PLAYTEST_ALPHA.html` as the original v1 contract snapshot if historical context is needed.
- Follow `docs/GIT_WORKFLOW.md` for commit cadence, branch strategy, and quality gates.

## Commands

- Install dependencies: `npm install`
- Run both local services: `npm run dev`
- Run only the client: `npm run dev:client -- --port 5173`
- Run only the Colyseus server: `npm run dev:server`
- Production build and type check: `npm run build`
- Run all tests: `npm test`
- Regenerate HTML docs: `npm run docs:html`
- Verify runtime roster assets: `npm run verify:runtime-roster`
- Start one-terminal internet playtest through a Cloudflare quick tunnel: `npm run playtest`
- Start playtest mode locally without a tunnel: `npm run playtest:local`

Expected local endpoints:

- Client: `http://127.0.0.1:5173`
- Colyseus server: `ws://127.0.0.1:2567`
- Playtest origin after `npm run playtest` or `npm run playtest:local`: `http://127.0.0.1:2567`

On Windows inside managed Codex shells, detached watch-mode startup can exit silently. If that happens, run `npm run dev` in the Codex integrated terminal or a normal PowerShell window and keep that terminal open.

## Working Rules

- Keep the prototype playable after each coherent iteration.
- Keep every code change organized for human contribution: prefer clear ownership boundaries, focused modules, readable names, and small commits that a human developer can review, extend, or replace without untangling agent-specific shortcuts.
- Run `npm run build` before committing gameplay, UI, networking, or asset integration changes.
- Run `npm run docs:html` after editing markdown docs that have generated HTML reading copies.
- Update `docs/VERSION_LOG.md` for meaningful playable checkpoints or project-management changes.
- Update docs when controls, terminology, rules, assets, setup, or planning change.
- Do not commit `node_modules/`, `dist/`, `.vite/`, logs, or throwaway files under `work/`.
- Preserve user or prior-session changes; do not revert unrelated local modifications.

## V1 Scope Lock

- `docs/PRODUCTION_PLAN.md` is the authority for current v1 scope.
- `docs/GDD.md` is broader multi-version product vision and does not override the current Production Plan.
- `docs/V1_PLAYTEST_ALPHA.html` is the original v1 contract snapshot and should not override newer Production Plan decisions.
- Before accepting new gameplay, roster, asset, UI, economy, social, or polish work as v1, classify it against `docs/PRODUCTION_PLAN.md`.
- If a request is not required for v1 acceptance, add it to the V2 parking lot or context notes instead of changing v1.
- To change locked v1 scope, the user must explicitly say: "I am requesting a v1 contract change."
- When that phrase is used, push back, identify which v1 acceptance test fails without the change, require a tradeoff or deferral, then update the v1 contract and decision log if the change is accepted.

## Product Constraints

- Combat readability comes before cosmetic spectacle inside the match screen.
- Cosmetics must remain cosmetic only. They must not affect combat stats, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.
- Default public/playtest assets stay streamer-safe; mature/adult-only variants are future opt-in presentation scope and must not affect combat truth.
- Current v1 target is hosted private-room online 2v2 playtest alpha, with 1v1 supported for easier testing.
- Live matches should move toward server-authoritative combat.
- Gameplay sprites use stable runtime filenames in `public/assets`; variant/history sprites live under `public/assets/sprite-variants`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
