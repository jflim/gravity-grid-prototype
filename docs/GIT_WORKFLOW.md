# Git Workflow

This repo should be treated as a sequence of playable checkpoints, not a forever-growing uncommitted prototype.

## Commit Rules

- Commit after each coherent iteration.
- Keep commits descriptive and scoped.
- Update `docs/VERSION_LOG.md` for every meaningful playable checkpoint.
- Run `npm run build` before committing gameplay/code changes.
- Keep generated folders out of Git: `node_modules/` and `dist/` are ignored.

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

1. Pick one version goal from `docs/BUILD_PLAN.md`.
2. Implement only that goal.
3. Run `npm run build`.
4. Update `docs/VERSION_LOG.md`.
5. Commit with a descriptive message.
6. Tag meaningful playable checkpoints, for example:

```powershell
git tag v0.5.0
```

7. Push commits and tags:

```powershell
git push
git push --tags
```

## GitHub Remote Setup

The current environment has `git`, but does not have GitHub CLI (`gh`), `winget`, `choco`, or `scoop`, so remote repo creation cannot be completed from here unless GitHub CLI or another authenticated GitHub tool is installed.

Recommended GitHub setup:

1. Create a private empty GitHub repository named `gravity-grid-prototype`.
2. Do not initialize it with a README, license, or gitignore.
3. From this project directory, run:

```powershell
git remote add origin https://github.com/<your-github-username>/gravity-grid-prototype.git
git push -u origin main
git push --tags
```

Alternative if GitHub CLI is installed later:

```powershell
gh repo create gravity-grid-prototype --private --source=. --remote=origin --push
git push --tags
```

## Current Local Repo

- Branch: `main`
- First checkpoint commit: `chore: establish gravity grid prototype checkpoint`
- Current intended tag: `v0.4.0`

