# Repository tour

Where things live, and how the app finds them. How many courses, lessons, labs and games exist is in [docs/generated/project-inventory.md](../generated/project-inventory.md).

## How a page gets on screen

1. `index.html` loads `src/main.jsx`, which renders `src/App.jsx`.
2. `src/App.jsx` sets up `HashRouter` and wraps every page in `src/components/layout/AppShell.jsx` (the top bar, window layer and mobile navigation).
3. `App.jsx`'s routes choose the page. Addresses start with `#/` because of the hash router, so the site works as plain static files.

| Address | Page |
|---|---|
| `#/` | `DesktopPage`: the home screen |
| `#/course/<course>` | A course's chapter list |
| `#/chapter/<course>-<N>/<slug>` | A lesson, rendered by `src/pages/LessonPage.jsx` |
| `#/lab/<lab>` | A lab, via `src/labs/labLoader.js` (some labs also declare their own addresses in `meta.js`) |
| `#/game/<game>` | A game from `src/games/registry.js` |
| `#/about`, `#/studio`, `#/blog`, … | Other pages in `src/pages/` |

## Content

| Folder | What's in it | How it's found |
|---|---|---|
| `src/courses/` | Every course: `<course>/meta.json` plus lessons at `<N>-<chapter>/<NNN>-<slug>.js` | `src/courses/courseLoader.js` discovers the folders; nothing to register |
| `src/labs/` | Interactive labs, one folder each with `meta.js` and `index.jsx`/`index.tsx` | `src/labs/labRegistryLoader.js` |
| `src/games/` | Games, listed in `src/games/registry.js` | The `GAMES` list |
| `src/docs/` | Markdown documents and tutorials shown in the Studio (`#/studio`) | Every `.md` file under it |
| `src/posts/` | Blog posts (`#/blog`) | Every `.md` file under it |
| `src/concepts/`, `src/practice/` | Concept explainers and practice files | Generated manifests in each folder |

A lesson file exports one object: title, prose, checks, notebooks and so on. [docs/lesson-writing-standard.md](../lesson-writing-standard.md) covers how to write one well; the in-app Lesson Builder (`#/lesson-builder`) can open, edit and export them.

## Code

| Folder | What's in it |
|---|---|
| `src/components/` | Shared React components. `layout/` is the app shell; `lesson/` renders lessons; `notebooks/` holds the in-browser Python notebook; `viz/` holds visualizations; `ui/` holds general UI, including the Help modal |
| `src/pages/` | One component per top-level page |
| `src/engines/`, `src/engine/` | Non-UI logic, such as the CNC simulator engine and the lesson engine |
| `src/features/` | Larger self-contained features: brain, calendar, compass, rpg |
| `src/tools/` | Tools: calculator, graphers, JavaScript playground |
| `src/context/`, `src/hooks/` | React context providers (auth, progress, theme) and shared hooks |
| `src/data/` | Data files, several of them generated (see below) |
| `src/styles/` | Global CSS and the course colour palette |
| `src/utils/` | Small shared helpers |

Tests sit next to the code they test, as `*.test.js` or `*.test.jsx`. Run a folder's tests with `npx vitest run <folder>`.

## Outside `src/`

| Path | What it is |
|---|---|
| `scripts/` | Build and check scripts: manifests, validators, the project-facts generator |
| `public/` | Files served as-is |
| `desktop/` | The Electron desktop app |
| `backend/` | An optional local server (`npm run backend`); the website doesn't need it |
| `.github/workflows/` | `deploy-pages.yml` builds and deploys `main`; `pr-checks.yml` checks pull requests |
| `docs/` | Documentation for contributors (this folder) |

## Generated files

Don't edit these by hand; `npm run dev` and `npm run build` regenerate them.

| File | Made by |
|---|---|
| `src/data/lessonTitles.json` | `src/scripts/build-lesson-titles.js` |
| `src/data/lessonIds.json` | `scripts/build-lesson-ids.mjs` |
| `src/data/projectFacts.json`, `docs/generated/project-inventory.md` | `scripts/generate-project-facts.mjs` |
| `src/data/codebaseGraph.js` | `scripts/generate-graph.mjs` |
| `src/concepts/manifest.ts`, `src/practice/manifest.ts`, `src/posts/manifest.ts` | `scripts/build-concept-manifest.mjs`, `scripts/build-practice-manifest.mjs`, `scripts/build-blog-manifest.mjs` |

The project inventory also lists content problems it finds, such as two lessons sharing an id.
