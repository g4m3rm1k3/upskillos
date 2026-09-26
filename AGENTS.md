# AGENTS.md

Rules for coding agents working in this repository. Humans use the same guides; this file adds the operational detail an agent needs. If anything here disagrees with the code, the code is right: fix this file in the same change.

## What this is

UpSkillOS is a React 18 + Vite 5 single-page app, deployed to GitHub Pages and packaged for desktop with Electron. It uses `HashRouter`, so every in-app route is `#/...`. Counts of courses, lessons, labs and games are in [docs/generated/project-inventory.md](docs/generated/project-inventory.md). Never write a count by hand.

Start with [docs/contributing/repository-tour.md](docs/contributing/repository-tour.md) for where things live.

## Content is discovered, not registered

- **Lessons:** a file at `src/courses/<course>/<N>-<chapter>/<NNN>-<slug>.js` is a lesson. `src/courses/courseLoader.js` finds it. Nothing else needs to be edited. Its route is `#/chapter/<course>-<N>/<slug>`.
- **Courses:** a folder in `src/courses/` with a `meta.json` (label, description, icon, domain, color).
- **Labs:** a folder in `src/labs/` with a `meta.js` and an `index.jsx` or `index.tsx`. See [docs/catalog-discovery.md](docs/catalog-discovery.md).
- **Games:** an entry in `GAMES` in `src/games/registry.js`.

There is no `src/content/` folder and no chapter `index.js` to register lessons in. Guides that say otherwise are out of date.

## Rules

1. **Lesson ids are progress keys.** Each lesson's `id:` must be unique across all courses and must never change once published. Renaming a file changes its route but not its id.
2. **Don't renumber lesson files to reorder them.** The number prefix only sets order within a chapter. Moving a lesson to another chapter or course changes its URL.
3. **Don't edit generated files by hand.** Regenerate them instead (see below).
4. **Put helpers outside chapter folders.** Any `.js` file directly in a chapter folder is treated as a lesson.
5. **Use router navigation for in-app links.** `<Link to="/x">` or `navigate('/x')`. A plain `href="/x"` breaks under `HashRouter`.
6. **Don't commit or push unless asked.**

## Generated files

| File | Regenerate with |
|---|---|
| `src/data/lessonTitles.json` | `node src/scripts/build-lesson-titles.js` |
| `src/data/lessonIds.json` | `npm run lesson-ids` |
| `src/data/projectFacts.json`, `docs/generated/project-inventory.md` | `npm run facts` |
| `src/data/codebaseGraph.js` | `npm run graph` |
| `src/concepts/manifest.ts`, `src/practice/manifest.ts`, `src/posts/manifest.ts` | `npm run manifests` |

`npm run dev` and `npm run build` regenerate all of these first. `npm run facts` runs the lesson title and id steps too.

## If you change X, also do Y

| When you change | Also |
|---|---|
| Add, remove or rename a lesson, course, lab or game | `npm run facts`, and commit the regenerated files |
| A lesson file | `node scripts/validate-lesson-schema.mjs <file>`; for Python cells `node scripts/check_python_cells.mjs --files <file>`; for LaTeX `node scripts/check_latex.mjs --files <file>` |
| A component with tests beside it | `npx vitest run <folder>` |
| `package.json` scripts | [docs/contributing/setup.md](docs/contributing/setup.md) if a documented command changed |
| Any Markdown in `AGENTS.md`, `CONTRIBUTING.md` or `docs/contributing/` | `npm run docs:check` |

## Verification

Run what matches your change, and report exactly what you ran and what it printed:

| Command | Checks |
|---|---|
| `npx vitest run <path>` | Unit and component tests for that area (`npm test` runs everything in watch mode) |
| `npm run catalog:check` | The generated inventory matches the content |
| `npm run docs:check` | Links, repository paths and `npm run` commands in the contributor docs exist |
| `npm run build` | Production build. Needs several GB of memory and a few minutes |
| `npm run typecheck` | TypeScript. It currently reports existing errors in unrelated files, so compare against the errors before your change |

Don't start a dev server and leave it running. If you need one for a browser check, stop it when you're done.

## Documents

- [CONTRIBUTING.md](CONTRIBUTING.md): the contributor entry point.
- [docs/contributing/](docs/contributing/): setup, first change, repository tour.
- [docs/lesson-writing-standard.md](docs/lesson-writing-standard.md): how a good lesson is written.
- [ARCHITECTURE.md](ARCHITECTURE.md): design history. Parts describe systems that have since been replaced; trust the code and the repository tour first.
