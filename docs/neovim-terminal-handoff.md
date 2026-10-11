# Handoff: Neovim editor option, Terminal series, Neovim series

Written 2026-10-11 at the end of a long session. Read this first, then the plan file for whichever series you're continuing. Nothing below is committed: the user reviews and commits.

## What exists

**Neovim editor option** (done, verified in Electron on macOS)
- Editor: Monaco / Neovim selector in Project Studio's editor tab strip (`EditorPane.jsx`, `NeovimPane.jsx`). Both edit the same files on disk.
- Auto-install: `desktop/app/runtimes/neovim.cjs` uses the learner's Neovim 0.10+ or downloads pinned v0.12.6 into userData; also on the Terminal tab's PATH.
- Sessions start with `--listen`; the app opens files, writes all buffers before Run/Check, and reloads changed files through `editor:nvim` IPC (`main.cjs`, `preload.cjs`).
- Every session loads `desktop/app/runtimes/neovim-practice.lua` (keystroke recorder for drills, below).
- Windows (2026-10-11, Windows 11, headless, not yet in the Electron pane): the download of v0.12.6 installs and starts, `--listen` on a named pipe and the open/write/reload expressions work, and a drill records and passes. A system Neovim older than 0.10 (0.9.1 seen) is skipped as intended. Fixed: the recorder now matches `practice/` with Windows `\` paths. Fixed: sessions start with `-n` (no swap file), because a session the app ended left a swap file and the next one opened on the "ATTENTION" prompt, which also blocked every `--remote-expr`; and `remoteExpr` no longer retries a request that timed out (each retry was another `nvim.exe` stuck on the prompt). The series' other checks (`sed`, `grep`, `wc`) and lesson commands are zsh, so the lessons themselves can't be followed in the Windows PowerShell terminal yet.

**Two separate series** (the user insisted they are unrelated; never combine them)

| Series | Key / prefix | Plan and "Where we stopped" | Written | Walkthrough |
|---|---|---|---|---|
| The Terminal — zsh from Zero | `term` / `term-` | docs/terminal-series-plan.md | ch1 `term-basics` (5 lessons) | `npx vitest run src/labs/project-studio/term.desktop.test.js` |
| Neovim — From First Keystroke to Fluency | `nvim` / `nvim-` | docs/neovim-series-plan.md | ch1 `nvim-start` (4 lessons), ch2 `nvim-motions` (5 lessons), ch3 `nvim-operators` (5 lessons) | `npx vitest run src/labs/project-studio/nvim.desktop.test.js` |

Both walk on macOS/Linux via `walkSeries({ unix: true })` (the Neovim walk is 19 tests, all passing after chapter 3; about 8 minutes).

**Neovim practice system** (the user's core requirement: force repetition, a VS Code user must reach fluency)
- Drills: practice files with a **par** (keystroke target). `keys <file> par=N` check (`checks.js`, `desktop/app/project-checks.cjs`) reads `.practice/keystrokes.jsonl`, written by the Lua recorder on each save; fails over par, or on any arrow key or mouse use. `:w` keys aren't counted. The cursor is reset to the start of a practice file when it's loaded or reloaded.
- **Fresh copy of …** button: provided files under `practice/` are always rewritten (`providedFiles.js isPracticeFile`, `index.jsx`, `walkSeries.js`).
- Key hints: `{{key:<id>}}` in prose; glossary `src/labs/project-studio/keys/neovim.js`; rendered by `keyHints.jsx`. Full keys up to the teaching lesson, then only the name with the keys on hover.
- The walkthrough proves every par: `drill(file, keys)` in `tracks/nvim.walkthrough.js` types the model solution into headless Neovim with the same Lua script.

## Next work, in order

1. **Neovim chapter 4, `nvim-textobjects`** (chapters 1–3 are done; see "Where we stopped" and the "Rules for writing drills" in docs/neovim-series-plan.md). Register it in `series.js`, add its keys to `keys/neovim.js`, include review drills, and prove every par with `drill()`.
2. Continue Neovim chapters 5–14; the "daily practice" generator is planned after chapter 4.
3. Terminal chapter 2, `term-text` (pipes and text tools), when the user asks for it.

## Rules the user has set (also in memory)

- Lessons: smallest runnable steps, every command, key and line of code explained at first use, in bullet lists.
- Every Neovim lesson: learn → drills with par → apply to Shelf → review drills → Your turn with hints.
- Read only these docs, the series guide (`docs/contributing/project-studio-series.md`), the lesson standard (`docs/project-studio-lesson-standard.md`) and the series' own files. Never open other series' lessons for format or content.
- Never commit or push. Don't stop between lessons to ask permission; pace by session length.
- Close any Electron or Playwright processes you start (the machine is low on memory). Leave the user's own `npm run desktop:dev` app alone.

## Checks to run after changes

- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: three failures were already there before this work and are unrelated (`checks.test.js` electron-basics multi-file steps, `projectChecks.test.js` git push, `escape.test.cjs`).
- The two walkthroughs above; `npm run typecheck`; `npm run docs:check`; `npm run facts`; `node scripts/audit-project-studio-lessons.mjs --write` (the new lessons should only show "Human teaching review still required").
- After changing the main process (`neovim.cjs`, `project-checks.cjs`), the desktop app must be restarted.
