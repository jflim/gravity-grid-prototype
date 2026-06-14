# Git Workflow

This repo should be treated as a sequence of playable checkpoints, not a forever-growing uncommitted prototype.

## Commit Rules

- Commit after each coherent iteration or reviewable documentation update.
- Keep commits descriptive and scoped.
- Run `npm run build` before committing gameplay/code changes.
- Keep generated folders out of Git: `node_modules/` and `dist/` are ignored.
- Prefer one focused purpose per commit.
- Do not commit exploratory throwaway changes unless they have become the chosen direction.

## Branch And Push Strategy

Use `main` as the stable playable branch. Work should usually happen in a short-lived feature branch, then merge back into `main` after the quality gate passes.

Recommended branch names:

```text
feature/local-2v2
tune/bunger-terrain
fix/round-reset
docs/iteration-workflow
```

Default flow:

```powershell
git switch -c feature/example-change
# work, test, update docs if needed
git add .
git commit -m "feat: describe the focused change"
git switch main
git merge feature/example-change
git push
```

For tiny docs-only changes, committing directly to `main` is acceptable.

## Quality Gate Before Pushing

Before pushing code changes:

- Run `npm run build`.
- Refresh/play the local prototype when the change is visual or gameplay-facing.
- Update docs when terminology, controls, rules, assets, or planning changed.
- Update `docs/VERSION_LOG.md` for playable checkpoints or meaningful project-management changes.
- Check `git status --short` so only intended files are included.

Docs-only commits do not require `npm run build`, but should still be reviewed for accuracy.
If markdown docs changed, run `npm run docs:html` so generated HTML reading copies stay current.

## How Often To Commit

Commit when the work reaches a stable checkpoint:

- A feature works end to end.
- A bug is fixed and verified.
- A tuning pass is coherent enough to compare against the previous state.
- A planning/doc update changes how we will manage the project.

Avoid committing every tiny experiment. If an experiment is messy but useful, keep it local until it is either cleaned up into a checkpoint or deliberately discarded.

## How Often To Push

Push after a commit passes the quality gate. Good default cadence:

- Push at the end of each working session.
- Push after each playable checkpoint.
- Push before switching to a new major task.
- Push immediately after tags.

Do not push broken code to `main` unless the commit explicitly documents a known blocked state and we have agreed that preserving it is more important than playability.

## Commit Message Style

Use short conventional prefixes:

- `feat:` for new player-facing behavior.
- `fix:` for bug fixes.
- `docs:` for planning/version/log changes.
- `chore:` for setup, versioning, repo hygiene, or tooling.
- `tune:` for gameplay balance/readability tweaks.

Examples:

```text
feat: add local 2v2 turn order
tune: improve bunger crater knockback
fix: end round when blue team is eliminated
docs: update v0.5 planning notes
chore: tag v0.5.0 checkpoint
```

## Version Checkpoint Loop

1. Pick one version goal from `docs/PRODUCTION_PLAN.md`.
2. Implement only that goal.
3. Run `npm run build`.
4. Update `docs/VERSION_LOG.md`.
5. Commit with a descriptive message.
6. Merge to `main` if the work happened on a feature branch.
7. Tag meaningful playable checkpoints, for example:

```powershell
git tag v0.5.0
```

8. Push commits and tags:

```powershell
git push
git push --tags
```

## GitHub Management

GitHub CLI is installed locally at `C:\Users\jflim\Documents\Codex\tools\gh.cmd`, and the remote repo is `https://github.com/jflim/gravity-grid-prototype`.

Use GitHub CLI for repo checks when helpful:

```powershell
gh repo view jflim/gravity-grid-prototype
gh pr status
```

## Current Local Repo

- Branch: `main`
- Remote: `origin`
- First checkpoint commit: `chore: establish gravity grid prototype checkpoint`
- Current checkpoint tag: `v0.4.0`
