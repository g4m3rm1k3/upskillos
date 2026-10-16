# Desktop app (Electron)

This is the Electron shell for OpenCalc/UpSkillOS. It wraps the same
frontend as the web build, plus capabilities a browser tab can't have:
a local backend process, a "contributor mode" that clones the repo for
in-app editing, and — new — real local language runtimes (starting with
Python + PySide6) that can open actual native windows.

If you're just working on lesson content or ordinary UI, `npm run dev`
(the plain Vite dev server) is faster and is what you want. Reach for
the desktop app when you're working on anything in this `desktop/`
folder, on the contributor-mode flow, or on a feature that needs a real
OS-level capability the browser build can't provide.

## Running it

```bash
npm run desktop:dev
```

This starts Vite on `:5173` and waits for it to come up, then launches
Electron pointed at that dev server (`scripts/run-desktop-dev.mjs`).
Edits to frontend code hot-reload exactly like the browser build. Edits
to `desktop/app/main.cjs`, `preload.cjs`, or `desktop/app/runtimes/*`
require restarting `desktop:dev` — Electron's main process isn't
watched.

## Building a distributable

```bash
npm run desktop:build         # current platform
npm run desktop:build:win     # Windows portable .exe
npm run desktop:build:mac     # macOS .dmg
```

This generates the build inputs (`npm run build:inputs`: the gitignored
graph, manifests and Game Studio runtime, plus the Pyodide wheels), builds the
frontend (`vite build`), assembles `desktop/staging/`
(`scripts/prepare-desktop-build.mjs` — copies every `.cjs` file in
`desktop/app/`, `runtimes/` and node-pty, and writes the electron-builder
config with the installed Electron version), then runs
electron-builder against that staging directory. The staged `package.json`
declares node-pty as its one dependency, because electron-builder packs only
the modules it collects, and an empty `workspaces` field, so it collects them
from staging rather than from the whole repository. To check a build, look for
`resources/app.asar.unpacked/node_modules/node-pty` in `desktop/dist/win-unpacked`:
without it the app opens, but its terminal can't start. Output lands in
`desktop/dist/`. See `PORTABLE_RELEASES.md` for the distribution model
(portable exe, not an installer; user data lives outside the app
folder so updates don't clobber it).

## Architecture

```
desktop/app/
  main.cjs        # Electron main process — windows, IPC handlers, app lifecycle
  preload.cjs      # contextBridge — exposes window.openCalcDesktop to the renderer
  runtimes/
    python.cjs     # Python + PySide6: detect, autonomously install, run scripts
```

- **`window.openCalcDesktop`** is how the frontend knows it's running in
  Electron at all (`!!window.openCalcDesktop` — see
  `src/hooks/useContributorMode.js`). It's undefined in a plain browser
  tab, which is what lets the same lesson content degrade gracefully
  (read-only code + an explanation) on the web build.
- **The backend** (`backend/server.mjs`) is auto-spawned on app start in
  packaged builds (`spawnBackend()` in `main.cjs`) so `/api/dev-fs` and
  the CodeLens WebSocket bridge work without a separate terminal. In
  dev mode, run it yourself with `npm run backend` if you need it.
- **Contributor mode** clones the actual repo into `userData` (via a
  GitHub zip download, not git) so the in-app Lesson Builder can edit
  real source files. See the `desktop:*` IPC handlers in `main.cjs`.

## Real language runtimes

Some things — a native GUI window, a real compiler — simply cannot run
in a browser tab or in Pyodide's WASM sandbox. The desktop app is where
these run for real, via a private, sandboxed install that never touches
anything already on your machine.

**Python + PySide6** (`desktop/app/runtimes/python.cjs`): a lesson using
the `PySideNotebook` component shows an "Install Python + PySide6"
button the first time. Clicking it:

1. Downloads the official Windows embeddable Python zip into
   `<userData>/runtimes/python/` (no admin rights, no installer).
2. Patches its `._pth` file to enable `site-packages` (embeddable Python
   ships with this disabled — pip silently can't install anything until
   it's turned on).
3. Bootstraps pip, then `pip install PySide6`.

This can take a few minutes the first time (PySide6's wheels alone are
100MB+) — the lesson shows real download/install progress throughout.
After that, `Run` spawns the private `python.exe` against the lesson's
code and a real native window opens outside the Electron app; any
`print()` output streams back into the lesson's console panel.

**Project Studio and virtual environments:** when a Project Studio
project folder contains its own `.venv` (made by the learner with
`python -m venv .venv`, as the *Reinforcement Learning in pygame* track
teaches), **Run** uses that environment's Python instead of the private
one, so it sees the packages the learner installed from the project's
`requirements.txt` (`projectCommand` in `runtimes/python.cjs`). Projects
without a `.venv` are unchanged.

Windows-only for now — the embeddable-zip trick is a Windows-specific
mechanism. macOS/Linux would need a different approach (system
`python3` + a venv) and isn't implemented yet.

## Troubleshooting

- **A packaged build's Run button does nothing / environment never
  becomes "ready":** the install writes into `app.getPath('userData')`
  (`%APPDATA%/<productName>/runtimes/python` on Windows) — check that
  path exists and isn't blocked by disk permissions or antivirus.
- **Electron won't launch at all from an automated/CI shell:** if
  `ELECTRON_RUN_AS_NODE` is set in the environment, Electron runs as a
  plain Node script instead of the real app (`app`/`BrowserWindow` come
  back `undefined`). Unset it before spawning `electron.exe`.
