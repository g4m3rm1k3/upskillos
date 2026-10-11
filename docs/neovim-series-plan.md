# Neovim series: plan, practice design and status

Project Studio series key `nvim` (chapter folders `src/labs/project-studio/tracks/nvim-*`). Independent of the Terminal series (docs/terminal-series-plan.md): its own project folder, basic terminal use assumed. Read this file first when resuming.

## Goal

Take someone who has only used VS Code to **fluent** Neovim use: editing by intent (operators, motions, text objects) without the mouse or arrow keys, moving between files and windows, project-wide search and change, a personal configuration with plugins and language-server features. Knowing a key is not the goal; reaching for it without thinking is. So the series **forces repetition**: every key is drilled with a keystroke target when taught, used again in the project, and drilled again in spaced review rounds in later lessons.

The application built along the way is **Shelf**, a bookmark manager (Node `http` backend, plain HTML/CSS/JavaScript frontend, no npm dependencies). Every line of its code is explained at first use, in bullet lists.

## How a lesson works

1. **Learn**: one idea (a motion, an operator, a text object…), with the exact keys.
2. **Drill**: two to four short exercises on practice files, each with a **par**, the keystroke count a fluent user needs. Arrow keys and mouse clicks fail a drill.
3. **Apply**: the same keys on Shelf's real code.
4. **Review**: one or two drills on keys from earlier lessons, picked on a spaced schedule (the previous lesson, about three lessons back, about seven back), so old keys keep coming back.
5. **Your turn**: an independent change to Shelf, with hints, where the learner picks the keys.

Later lessons describe edits by **intent** ("change the word", "delete to the end of the line"), not by keys. A key-hint marker shows the keys on hover once they have been taught (below).

## The practice tool (keystroke drills)

Project Studio starts every Neovim editor session itself (`desktop/app/runtimes/neovim.cjs`), so it loads a small Lua script into each session (`--cmd "lua dofile(…)"`, `desktop/app/runtimes/neovim-practice.lua`, copied out to userData first):

- `vim.on_key` counts the keys **the learner typed** (not mapping expansions), per buffer, from when the file was opened or reloaded.
- Arrow keys and mouse events are counted separately.
- Keys typed for a write command (`:w`, `:wq`, `:x`, `:up`, `:wa`) are not counted, so par measures the edit, not the save.
- On every write it appends a record to `.practice/keystrokes.jsonl` in the project: file, keys, arrows, mouse, seconds, and the key sequence typed (for feedback such as "you used 14: `llllllcwthere<Esc>`; par 4").
- Reopening the file (`:e!`, or clicking **Fresh copy of …**) resets the count and puts the cursor at the start of the file.

A check kind reads it: `keys <file> par=<n>` passes when the latest record for that file used at most `n` keys and no arrows or mouse. Each drill also has a content check (the file must match the target), so a drill passes only when the result is right **and** the keys were efficient.

The walkthrough proves every drill: it runs the model key sequence in headless Neovim with the same Lua script (`nvim --clean --headless`), then runs the drill's checks against the real file and log. So each par has a real solution that produces the target, at exactly that count.

## Key hints instead of repeated key lists

Lesson prose writes `{{key:<id>}}` (for example `{{key:ciw}}`). A glossary (`src/labs/project-studio/keys/neovim.js`, read by `keyHints.jsx`) gives each id its keys, a name ("change inner word") and the lesson that teaches it.

- **In the teaching lesson and before it**: shown in full, keys and name.
- **After it**: only the name, underlined; hovering, focusing or tapping it shows the keys and where they were taught.

So learners are asked to recall the keys, with the answer one hover away.

## Daily practice (later)

A generated round drawn from every drill the learner has passed, weighted toward the ones that took longest or went over par. Needs a drill bank (already implied by the lessons' drills) and a small UI; planned after chapter 4.

## Chapter map

| # | Folder | Title | Keys and topics | Shelf work |
|---|---|---|---|---|
| 1 | nvim-start | Modes, Saving and a First Server | modes, `i a I A o O`, Esc, `:w :q :wq :q! ZZ`, `:e`, `h j k l`, `x r`, `u` Ctrl+R, `:N`, `:e!`, `:help` | starter, .editorconfig, package.json, http server |
| 2 | nvim-motions | Motions | `w b e ge W B E`, `0 ^ $`, `f t F T ; ,`, `gg G`, `{ }`, `%`, counts, Ctrl+D Ctrl+U, `H M L`, `zz zt zb` | server/routes.js |
| 3 | nvim-operators | Operators and the Dot | `d c y p P`, `dd cc yy D C`, operator + motion, counts, `.`, `J`, `>> <<`, `~ gu gU` | `sendJson`, routes table, 404, method keys, 500 |
| 4 | nvim-textobjects | Text Objects | `iw aw iW aW is ip`, `i" a" i' i\``, `i( a( i[ i{ it at` | server/store.js, POST, DELETE |
| 5 | nvim-search | Search and Substitute | `/ ? n N * #`, `gn cgn` (VS Code's multi-cursor done Vim's way), `:s :%s` flags, `&`, ranges | public/index.html |
| 6 | nvim-visual | Visual Mode | `v V` Ctrl+V, `o gv`, block insert/append, `:'<,'>` | public/style.css |
| 7 | nvim-files | Buffers, Windows and Tabs | `:ls :b` Ctrl+^, `:sp :vs` Ctrl+W family, `:tabnew gt`, netrw, `gf`, `:find` | public/app.js |
| 8 | nvim-registers | Registers and Macros | `"a "0 "_ "+ :reg`, Ctrl+R in Insert, `q @ @@`, macros over many lines | tests |
| 9 | nvim-navigation | Marks, Jumps and the Quickfix List | `m ' \``, Ctrl+O Ctrl+I, `g;`, `:vimgrep :grep :copen :cnext :cdo`, `:make` | test runs, project-wide change |
| 10 | nvim-config | Your Configuration | `init.lua`, options, `vim.keymap.set`, leader, autocommands, Caps Lock as Esc/Ctrl (OS setting), `jk` to leave Insert | editor set up |
| 11 | nvim-plugins | Plugins | a plugin manager, fuzzy finding (Cmd+P / Cmd+Shift+F equivalents), Treesitter and its text objects, Git signs, which-key | |
| 12 | nvim-lsp | Language Servers | built-in LSP: go to definition, references, rename, code actions, diagnostics, completion, formatting; VS Code habit equivalents | |
| 13 | nvim-advanced | Advanced Editing | `:g :v :normal`, ex ranges, folds, sessions, `:terminal`, spell | |
| 14 | nvim-capstone | Capstone | a new Shelf feature (tags, search) designed and built under par | |

`trackOrder`: 71 for chapter 1, 71.01, 71.02 … for later chapters.

## Conventions

- `runtime: none`, no `run:`; shell commands fenced ```` ```zsh ````.
- Learners type code **without leading spaces**; `.editorconfig` (1.2) makes Neovim's auto-indent produce the lessons' 2-space style exactly (verified with `nvim --clean` for JavaScript, JSON and HTML; HTML indents `<head>` and `<body>` inside `<html>`, so targets must too).
- Server checks start the learner's server themselves: `out=$(PORT=3917 node server/server.js & sleep 1; curl -s http://localhost:3917/...; kill $!); echo "$out"`.
- macOS file names are case-insensitive: never test a case mistake with `missing Foo`.
- After each Your turn, say what the checks establish and what they do not prove.

## Where we stopped

2026-10-11: split from the earlier combined Terminal-and-Neovim plan. Built and verified:

- **Practice tool**: `desktop/app/runtimes/neovim-practice.lua` (loaded into every editor session by `neovim.cjs`; counts typed keys, flags arrows and mouse, leaves write commands out, puts the cursor at the start of a practice file when it's loaded or reloaded, logs each save to `.practice/keystrokes.jsonl`). `keys <file> par=<n>` check in `checks.js` / `project-checks.cjs` (`keysCheck.test.js`). Verified in the Electron app: a typed drill logged 8 keys; an arrow key typed through xterm.js was detected.
- **Fresh copies**: a provided file under `practice/` is rewritten every time its button is clicked, labelled **Fresh copy of …** (`providedFiles.js isPracticeFile`); that's how a learner retries a drill.
- **Key hints**: `{{key:<id>}}` in lesson prose, glossary in `src/labs/project-studio/keys/neovim.js`, rendering in `keyHints.jsx` (`keyHints.test.jsx` also fails on an unknown id).
- **Chapter 1** (nvim-start, 4 lessons) has 10 drills and review rounds, each with a par; `nvim.desktop.test.js` types every model solution into headless Neovim with the same script and runs the checks (9 tests), plus wrong attempts (over par, arrow keys, wrong result) that must fail.

Rules for writing drills:
- A drill step is a `text file=practice/… provided` fence (the starting text) with checks: one `run "sed -n Np file | grep -qx '…'"` per target line (or only the changed line, for long files), a `wc -l` line count, then `keys file par=N`.
- The par assumes the cursor starts at line 1, column 1, and counts Insert-mode typing and Esc; it excludes `:w` and Enter.
- Work out the par with the keys taught so far, then prove it in the walkthrough with `drill(file, keys)`; give wrong attempts for over par, arrows and a wrong result. Look for a shorter solution than the one you first thought of (the 1.3 review drill's par dropped from 18 to 17 that way).
- Review drills describe the action with `{{key:…}}` hints only, never the bare keys.

- A line jump (`:12`, `12G`, `gg`, `G`, `j`) **keeps the cursor's column** (Neovim's default `nostartofline`). A step that jumps to a line and then uses `f`, `t`, `W` or `r` must start from a known column (`0` or `^` first), or say where the cursor is. Drill pars depend on this too (the 2.3 review needs `^` after `:12`).
- Keys whose amount depends on the window height (Ctrl+D, Ctrl+U, `H`, `M`, `L`, `zz`, `zt`, `zb`) can't have an exact par. 2.5 gives its exercise a generous par (80) instead, which still fails arrows, Page Up/Down and the mouse; the walkthrough's model solution uses line numbers.
- A non-practice file (such as `data/sample-bookmarks.json`) doesn't get its cursor reset on load, and its count runs from when it was opened or reloaded: tell the learner to `:e!` and `gg` before the counted attempt.
- In lesson prose, never write a bare `$` outside backticks (remark-math pairs two of them into LaTeX). Key-hint ids for punctuation keys are words (`line-end`, `first-char`, `repeat-find`, `match`, `paragraph-down`).
- The same goes for `predict` questions and explanations and every `hints` rung: they're rendered as Markdown too, so keys and code in them go in backticks. (Check hints after ` -- ` are plain text.)
- `u` leaves the cursor where the undone text was, not where the change started, so `u` then `.` needs a known column first (`^.`); 3.4's diagnostic is built on that.
- A `d` or `c` replaces what `p` puts (one unnamed register until chapter 8). A step that yanks and then edits copies must put every copy first (3.3).
- Operator ids are words (`delete`, `change`, `yank`, `put`, `put-before`, `dot`, `indent`, `outdent`, `tilde`); doubled forms and capitals keep their keys (`dd`, `cc`, `yy`, `D`, `C`, `Y`, `J`, `gu`, `gU`).
- A wrong answer must really be wrong: twice a "wrong" sequence turned out to produce the right file at par (`kk` tying `3G`; changing the original line after `yyP`). Try each wrong sequence in Neovim before adding it.

2026-10-11 (second session): **chapter 2 (nvim-motions, 5 lessons) written and walked.** 2.1 words (`w b e ge`), 2.2 WORDs and line ends (`W B E 0 ^ $`), 2.3 find in a line (`f t F T ; ,`), 2.4 through a file (`gg G`, counts, `{ }`, `%`), 2.5 screens (Ctrl+D/U, `H M L`, `zz zt zb`). 13 drills and 5 review rounds, every par proved in `nvim.walkthrough.js` (and a deliberately wrong par confirmed to fail the walk). Shelf now has `server/routes.js` with `listBookmarks`, `health` and `countBookmarks`, routes `/api/bookmarks`, `/api/health`, `/health` and `/api/bookmarks/count` as a chain of `if` blocks in `server.js`, timestamped logs, and 31 bookmarks in `data/bookmarks.json` (30 from the 2.5 sample plus the learner's own).

Next: chapter 3 (nvim-operators). 2.5's closing text promises `dw`, `c$`, `.`, and that Shelf's chain of `if` blocks becomes a proper router (a table of path → handler, a 404 for unknown paths; 1.4 also promises "not found"). Review rounds from chapter 3 on draw from the lesson before, about three back and about seven back (3.1 → 2.5, 2.3, 1.4).

2026-10-11 (third session): **chapter 3 (nvim-operators, 5 lessons) written and walked.** 3.1 delete (`d` + motions, `dd`, `D`, counts), 3.2 change (`c`, `cc`, `C`; `cw` acts like `ce`), 3.3 yank and put (`y`, `yy`, `Y`, `p`, `P`, `ddp`, `xp`), 3.4 dot (`.`, counts with `.`, the dot formula), 3.5 join, indent and case (`J`, `>>`, `<<`, `~`, `gu`, `gU`). 19 drills and 5 review rounds (drill files 21–39, review/03-01 to 03-05), every par proved with `drill()`. Shelf now has `sendJson` in `routes.js`, `home` (lists the routes), `notFound` (404 JSON with method and path), an exported `routes` table keyed `'GET /path'`, a two-line lookup in `server.js`, and a `try`/`catch` that answers 500 and keeps the server up (the 3.5 Your turn adds a JSON `serverError` handler).

**Practice tool fix**: a `:` typed as the target of `f`, `t`, `F`, `T` or `r` (as in `f:`) was held back as a possible write command and never counted, so `f:` cost one key instead of two. `neovim-practice.lua` now counts a held-back `:` as soon as the next key arrives outside the command line. No chapter 1–2 drill used such a key; the 3.5 review exposed it. The desktop app must be restarted to load the new script.

Next: chapter 4 (nvim-textobjects). 3.2's diagnostic and 3.5's closing text promise a change that takes the whole word wherever the cursor is (`ciw`) and `ci'`. Shelf gets `server/store.js` (the starter's empty file) and the first `POST` and `DELETE` entries in the routes table, which 3.4's method keys and predictions set up. Review rounds: 4.1 → 3.5, 3.3, 2.4.
