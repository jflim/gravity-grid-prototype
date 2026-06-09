# AGENTS.md

## Project

- Gravity Canyon is a browser-based TypeScript/Phaser artillery game with a Node.js/Colyseus multiplayer foundation.
- Treat this repository as the active project root. The GitHub remote is `https://github.com/jflim/gravity-grid-prototype.git`.
- Current working branch is usually `feature/gravity-canyon-online-foundation`; check `git status --short --branch` before editing.

## Start Here

- Read `README.md` for the current runnable state and controls.
- Read `docs/SESSION_HANDOFF.md` for the latest handoff, next best step, known environment notes, and verification already run.
- Read `docs/V1_PLAYTEST_ALPHA.html` for the locked v1 playtest-alpha scope, acceptance tests, out-of-scope list, and change-control rules.
- Read `docs/GAME_DESIGN_SPEC.md` for product direction and locked decisions.
- Read `docs/BUILD_PLAN.md` before choosing the next milestone.
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
- Serve a built internet-share preview for a trusted tunnel: `npm run build` then `npm run start:public`
- Expose the public preview through a quick tunnel: `cloudflared tunnel --url http://127.0.0.1:2567`

Expected local endpoints:

- Client: `http://127.0.0.1:5173`
- Colyseus server: `ws://127.0.0.1:2567`
- Public preview origin after `npm run start:public`: `http://127.0.0.1:2567`

On Windows inside managed Codex shells, detached watch-mode startup can exit silently. If that happens, run `npm run dev` in the Codex integrated terminal or a normal PowerShell window and keep that terminal open.

## Working Rules

- Keep the prototype playable after each coherent iteration.
- Run `npm run build` before committing gameplay, UI, networking, or asset integration changes.
- Run `npm run docs:html` after editing markdown docs that have generated HTML reading copies.
- Update `docs/VERSION_LOG.md` for meaningful playable checkpoints or project-management changes.
- Update docs when controls, terminology, rules, assets, setup, or planning change.
- Do not commit `node_modules/`, `dist/`, `.vite/`, logs, or throwaway files under `work/`.
- Preserve user or prior-session changes; do not revert unrelated local modifications.

## V1 Scope Lock

- `docs/V1_PLAYTEST_ALPHA.html` is the authority for current v1 scope.
- `docs/GAME_DESIGN_SPEC.md` is broader multi-version product vision and does not override the v1 contract.
- Before accepting new gameplay, roster, asset, UI, economy, social, or polish work as v1, classify it against `docs/V1_PLAYTEST_ALPHA.html`.
- If a request is not required for v1 acceptance, add it to the V2 parking lot or context notes instead of changing v1.
- To change locked v1 scope, the user must explicitly say: "I am requesting a v1 contract change."
- When that phrase is used, push back, identify which v1 acceptance test fails without the change, require a tradeoff or deferral, then update the v1 contract and decision log if the change is accepted.

## Product Constraints

- Combat readability comes before cosmetic spectacle inside the match screen.
- Cosmetics must remain cosmetic only. They must not affect combat stats, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.
- Current v1 target is hosted private-room online 2v2 playtest alpha, with 1v1 supported for easier testing.
- Live matches should move toward server-authoritative combat.
- Gameplay sprites use stable runtime filenames in `public/assets`; variant/history sprites live under `public/assets/sprite-variants`.
