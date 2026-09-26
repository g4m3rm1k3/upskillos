# Contributing to UpSkillOS

Thanks for helping. This page gets you from zero to a pull request, then points you to the guide for the kind of change you want to make. You don't need to read everything first.

## Quick start

You need [Node.js](https://nodejs.org/) 24 and Git.

```bash
git clone https://github.com/<your-username>/upskillos.git   # your fork
cd upskillos
npm install
npm run dev
```

Open the address it prints (http://localhost:5173). Edit a file under `src/` and the page updates. The full walkthrough, including forking, is [docs/contributing/setup.md](docs/contributing/setup.md).

## What do you want to do?

| I want to… | Start here |
|---|---|
| Make my first small change | [docs/contributing/first-change.md](docs/contributing/first-change.md) |
| Find where something lives in the code | [docs/contributing/repository-tour.md](docs/contributing/repository-tour.md) |
| Fix a mistake in a lesson | Find the lesson file (the tour explains how), edit it, and check it as in [the lesson checks](#checks) below |
| Write a new lesson | Add a file to a course folder, as in [docs/catalog-discovery.md](docs/catalog-discovery.md); write it to [docs/lesson-writing-standard.md](docs/lesson-writing-standard.md) |
| Add a lab or a game | [docs/catalog-discovery.md](docs/catalog-discovery.md) |
| Report a bug or a content error | [Open an issue](https://github.com/g4m3rm1k3/upskillos/issues/new/choose) |
| Ask a question | [Discussions](https://github.com/g4m3rm1k3/upskillos/discussions) |

Lessons, courses, and labs are discovered from their folders and metadata. Games are added to `src/games/registry.js`. How many of each exist is listed in [docs/generated/project-inventory.md](docs/generated/project-inventory.md).

## Checks

Run the checks that match your change before opening a pull request:

| You changed | Run |
|---|---|
| A lesson file | `node scripts/validate-lesson-schema.mjs <file>` |
| Python cells in a lesson | `node scripts/check_python_cells.mjs --files <file>` |
| LaTeX in a lesson | `node scripts/check_latex.mjs --files <file>` |
| Code with tests next to it | `npx vitest run <folder>` |
| Added, removed or renamed content | `npm run facts`, then commit the regenerated files |
| The contributor docs | `npm run docs:check` |
| Anything else | `npm run build` (takes a few minutes) |

Pull requests run the same kinds of checks automatically.

## Pull requests

1. **Fork** the repository on GitHub, clone your fork, and add the original as `upstream`:
   ```bash
   git remote add upstream https://github.com/g4m3rm1k3/upskillos.git
   ```
2. **Sync before you start**, then branch:
   ```bash
   git checkout main
   git fetch upstream
   git merge --ff-only upstream/main
   git checkout -b short-description-of-change
   ```
3. **Keep one concern per pull request.** A fix and an unrelated refactor are easier to review, and to undo, as two pull requests.
4. **Sync again before opening it.** If `upstream/main` has moved, merge it into your branch. Don't rebase or force-push a branch someone may already be reviewing:
   ```bash
   git fetch upstream
   git merge upstream/main
   git push -u origin short-description-of-change
   ```
5. **Open the pull request** on GitHub. Say what changed and why, list the checks you ran, and add a screenshot for anything visible.

For what a branch, fetch and merge actually do, see the Git lessons in [src/docs/UpSkillOS work/git-fundamentals/](src/docs/UpSkillOS%20work/git-fundamentals/01-branch-before-you-change-anything.md).

## Rules worth knowing early

- **Never change a published lesson's `id`.** It's the key learners' progress is saved under.
- **Don't renumber lesson files** to reorder them unless you mean to change their order; moving a lesson to another chapter changes its URL.
- **Don't edit generated files** (`src/data/lessonTitles.json`, `src/data/lessonIds.json`, `src/data/projectFacts.json`, `docs/generated/`). Regenerate them with `npm run facts`.
- **Use router links** (`<Link to="/x">`) for links inside the app, not plain `href="/x"`.

## More

- [AGENTS.md](AGENTS.md): the same rules in more operational detail, written for coding agents.
- [docs/contributor-experience-and-lms-roadmap.md](docs/contributor-experience-and-lms-roadmap.md): the prioritized remaining-work checklist and longer-term LMS plan.
- [ARCHITECTURE.md](ARCHITECTURE.md): design history. Parts describe systems that have since been replaced.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md) (report security problems privately, not in an issue).
- [docs/history/CONTRIBUTING-legacy.md](docs/history/CONTRIBUTING-legacy.md): the previous contributor guide. Its lesson-quality sections are still useful reference; its file layout and registration steps are out of date.
