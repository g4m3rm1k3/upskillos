# Setup

From nothing to the app running on your computer. About 10 minutes, most of it waiting for `npm install`.

## 1. Install the tools

- **Node.js 24.** The project's automated builds use Node 24. Check with `node -v`. Get it from [nodejs.org](https://nodejs.org/) or a version manager such as nvm.
- **npm.** Comes with Node. Check with `npm -v`.
- **Git.** Check with `git --version`. Get it from [git-scm.com](https://git-scm.com/).
- **An editor.** Any will do; VS Code is what most contributors use.

## 2. Get your own copy

On GitHub, open [the repository](https://github.com/g4m3rm1k3/upskillos) and press **Fork**. That makes a copy under your account that you can push to. Then:

```bash
git clone https://github.com/<your-username>/upskillos.git
cd upskillos
git remote add upstream https://github.com/g4m3rm1k3/upskillos.git
git remote -v
```

`git remote -v` should list `origin` (your fork) and `upstream` (the original project). You'll use `upstream` to get new changes.

## 3. Install and run

```bash
npm install
npm run dev
```

`npm run dev` first regenerates a few data files (lesson titles, lesson ids, the project inventory and some manifests), builds Game Studio's game runtime (`npm run game:runtime`) and fetches the Python packages the app serves itself (see below), then starts the development server. Open the address it prints, normally http://localhost:5173.

### Python packages (Pyodide)

Python in the browser is Pyodide. The app serves Pyodide and the packages its lessons import (numpy, pandas, matplotlib, pygame-ce and about 90 more, roughly 70 MB) from its own files, so Python lessons don't depend on a CDN. The first `npm run dev` or `npm run build` downloads them into `.cache/pyodide-packages/`, checking each file against the checksum in Pyodide's lockfile; later runs use the cache without the network. A package outside that set still loads from the CDN when a program imports it. The set, and how to change it, is in `scripts/pyodide-bundle.mjs`.

| Command | What it does |
|---|---|
| `node scripts/fetch-pyodide-packages.mjs` | Downloads the bundled packages into the cache (`dev` and `build` run it) |
| `node scripts/fetch-pyodide-packages.mjs --check` | Checks the cache against the lockfile without downloading |
| `node scripts/fetch-pyodide-packages.mjs --all` | Mirrors every Pyodide package (about 440 MB) |

The server uses port 5173 only and stops with an error if it's already in use, because the browser caches some large downloads per port. If you need a second server, run `npx vite --port 5174`.

## 4. Check that it works

- The home page loads.
- Open any course, then any lesson: the lesson content appears.
- Edit some visible text in `src/pages/AboutPage.jsx`, save, and watch `#/about` update without reloading.

Undo that edit when you're done, or use it as your first change: see [first-change.md](first-change.md).

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/`. Takes a few minutes and several GB of memory |
| `npm run game:runtime` | Builds Game Studio's game runtime (the engine and Phaser, run inside a sandboxed iframe) into `src/labs/game-studio/runtime/dist/`. `dev` and `build` run it for you |
| `npm run game:acceptance` | Game Studio's end-to-end tests in a real browser: each finished phase, the example games, and the API reference. Each starts and stops its own dev server |
| `npm run preview` | Serves the last build, to check it the way the live site runs |
| `npx vitest run <folder>` | Runs the tests in a folder once |
| `npm test` | Runs all tests and re-runs them as you edit |
| `npm run facts` | Regenerates the project inventory after adding or removing content |
| `npm run catalog:check` | Checks the committed inventory is up to date |
| `npm run docs:check` | Checks links and commands in the contributor docs |
| `npm run typecheck` | TypeScript check. It currently reports existing errors in unrelated files |

## Troubleshooting

- **`npm install` fails:** check `node -v` shows 24, then delete `node_modules` and run `npm install` again.
- **"Port 5173 is already in use":** another dev server is running. Stop it, or use a different port as above.
- **The build runs out of memory:** the build script already raises Node's memory limit. Close other memory-heavy programs and try again.
