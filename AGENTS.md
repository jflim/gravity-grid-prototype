# AGENTS.md

## Project

- Gravity Canyon is a browser-based TypeScript/Phaser artillery game with a Node.js/Colyseus multiplayer foundation.
- Treat this repository as the active project root. The GitHub remote is `https://github.com/jflim/gravity-grid-prototype.git`.
- Current working branch is usually `feature/gravity-canyon-online-foundation`; check `git status --short --branch` before editing.

## Start Here

- Read `README.md` for the current runnable state and controls.
- Read `docs/SESSION_HANDOFF.md` for the latest handoff, next best step, known environment notes, and verification already run.
- Read `docs/GAME_DESIGN_SPEC.md` for product direction and locked decisions.
- Read `docs/BUILD_PLAN.md` before choosing the next milestone.
- Follow `docs/GIT_WORKFLOW.md` for commit cadence, branch strategy, and quality gates.

## Commands

- Install dependencies: `npm install`
- Run both local services: `npm run dev`
- Run only the client: `npm run dev:client -- --port 5173`
- Production build and type check: `npm run build`

Expected local endpoints:

- Client: `http://127.0.0.1:5173`
- Colyseus server: `ws://127.0.0.1:2567`

On Windows inside managed Codex shells, detached watch-mode startup can exit silently. If that happens, run `npm run dev` in the Codex integrated terminal or a normal PowerShell window and keep that terminal open.

## Working Rules

- Keep the prototype playable after each coherent iteration.
- Run `npm run build` before committing gameplay, UI, networking, or asset integration changes.
- Update `docs/VERSION_LOG.md` for meaningful playable checkpoints or project-management changes.
- Update docs when controls, terminology, rules, assets, setup, or planning change.
- Do not commit `node_modules/`, `dist/`, `.vite/`, logs, or throwaway files under `work/`.
- Preserve user or prior-session changes; do not revert unrelated local modifications.

## Product Constraints

- Combat readability comes before cosmetic spectacle inside the match screen.
- Cosmetics must remain cosmetic only. They must not affect combat stats, hitboxes, projectile behavior, wind, movement, matchmaking, or rewards.
- The first real online mode is private-room 1v1. True MVP team mode is online 2v2.
- Live matches should move toward server-authoritative combat.
- Gameplay sprites use stable runtime filenames in `public/assets`; variant/history sprites live under `public/assets/sprite-variants`.
