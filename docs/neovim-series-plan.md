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

A generated round drawn from every drill the learner has passed, weighted toward the ones that took longest or went over par. Needs a drill bank (already implied by the lessons' drills) and a small UI; planned after chapter 8.

## Chapter map

| # | Folder | Title | Keys and topics | Shelf work |
|---|---|---|---|---|
| 1 | nvim-start | Modes, Saving and a First Server | modes, `i a I A o O`, Esc, `:w :q :wq :q! ZZ`, `:e`, `h j k l`, `x r`, `u` Ctrl+R, `:N`, `:e!`, `:help` | starter, .editorconfig, package.json, http server |
| 2 | nvim-motions | Motions | `w b e ge W B E`, `0 ^ $`, `f t F T ; ,`, `gg G`, `{ }`, `%`, counts, Ctrl+D Ctrl+U, `H M L`, `zz zt zb` | server/routes.js |
| 3 | nvim-operators | Operators and the Dot | `d c y p P`, `dd cc yy D C`, operator + motion, counts, `.`, `J`, `>> <<`, `~ gu gU` | `sendJson`, routes table, 404, method keys, 500 |
| 4 | nvim-textobjects | Text Objects | `iw aw iW aW is ip`, `i" a" i' i\``, `i( a( i[ i{ it at` | server/store.js, POST, DELETE |
| 5 | nvim-search | Search and Substitute | `/ ? n N * #`, `gn cgn` (VS Code's multi-cursor done Vim's way), `:s :%s` with the `g` and `c` flags | public/index.html |
| 6 | nvim-visual | Visual Mode | `v V` Ctrl+V, block insert/append, operators on a selection | public/style.css |
| 7 | nvim-files | Files, Windows and Jumps | `:ls :b` Ctrl+^, `:sp :vs` and the Ctrl+W keys, `gf`, Ctrl+O Ctrl+I, `"+` (the system clipboard) | public/app.js |
| 8 | nvim-setup | Configuration, Finder and Language Server | `init.lua`, options, leader and `vim.keymap.set`, Caps Lock as Esc (OS setting), a fuzzy finder (the Cmd+P and Cmd+Shift+F equivalents), built-in LSP: go to definition, references, rename, diagnostics | editor set up, a last Shelf feature |

**Scope (2026-10-12).** The user cut the series from 14 chapters to 8: it exists so a VS Code user can edit fluently in Neovim, not to cover all of Vim. Cut: registers and macros (maybe one lesson on `q` and `@` later, only if the user asks), marks and the quickfix list (jumps moved to chapter 7; the finder covers project-wide search), plugin tours beyond the finder, advanced editing (`:g`, folds, sessions), and a separate capstone (each lesson's Your turn already does that). Chapters 5–8 aim for about 3 lessons each.

**After the chapters:**
- **Neovim key reference** (built 2026-10-12): a **Keys** button on the Neovim editor pane opens a searchable list of every key the series teaches, grouped by chapter, with VS Code equivalents. Learners use it in any Project Studio lesson where they picked Neovim. Its source is the key glossary (`keys/neovim.js`), so each chapter's new keys appear there automatically.
- **Daily practice**: generated drill rounds (below).
- **A Neovim game lab** in `src/labs/`, for practice that teaches Neovim (in the spirit of Vim Adventures). Not designed yet; it needs a design pass with the user once the series is written.

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

2026-10-12: **scope cut to 8 chapters, Keys reference built, chapter 4 (nvim-textobjects, 4 lessons) written and walked.**

- **Keys reference**: `NeovimKeyReference.jsx` (tests in `NeovimKeyReference.test.jsx`), opened by the **Keys** button that `EditorPane.jsx` shows when the editor is Neovim. It lists `keys/neovim.js` grouped by chapter, searchable by keys, name or VS Code key; glossary entries may carry an optional `vscode` field (the nearest VS Code key on macOS). Not yet looked at in the Electron app.
- **Chapter 4**: 4.1 words and paragraphs (`iw aw iW aW ip ap`), 4.2 quotes (`i' i" i\``), 4.3 brackets (`i( i[ i{`), 4.4 tags (`it at`). 12 drills (40–51) and review rounds 04-01 to 04-04, every par proved with `drill()`. Shelf now has `server/store.js` (`readBookmarks`, `writeBookmarks`, the only code that knows where the data file is), `readJson` and `POST /api/bookmarks` (400 without title or url), `DELETE /api/bookmarks` by url (404 when none matched), `server.js` awaiting async handlers inside its `try`, `server/pages.js` with `homePage` at `GET /`, `public/index.html` (two links), and the learner's `/about` page. `new-bookmark.json` at the project root is the request file 4.2 edits with `ci"`.
- From 4.2 on, checks never assume the bookmark count: learners add and delete bookmarks for real. Any check that writes data backs up `data/bookmarks.json` first and puts it back.

More rules for writing drills, found while writing chapter 4:
- **For words, a text object rarely saves keys over `b` and a motion** (`ciw` and `bcw` are both three). Its gains are that it works from any letter of the word and that `.` repeats it from any letter. Drill 40 gets a strict win from `j` landing mid-word on lines with different indents. Pars may tie with a motion solution; that's fine.
- **A paragraph includes a comment written directly above code**: `dap` on line 2 of `routes.js` also takes line 1. And `ap` on the last paragraph of a file takes the blank line **before** it.
- **Quote objects**: with no quote before the cursor on the line, `ci'` uses the first string after it. Between two strings (on the `:` of `"title": "Vim"`) it selects the gap between them, `: `, and after the last string it isn't a string either. Lessons say "inside, or before the first quote".
- **Bracket objects**: Neovim 0.12 also looks ahead on the line for `(`, `[` and `{` when the cursor is before them (only `i(` is documented); classic Vim doesn't, and the release notes don't say when it arrived. Every lesson step and par puts the cursor inside first; 0.12 users can come in under par.
- `>>` leaves the cursor in column 0 when it started there, so a `l` after it lands on a space (the 4.1 review does the case change first).
- `dit` on a multi-line element joins it: `<ul>…</ul>` over five lines becomes `<ul></ul>`. `cit` on an element's opening tag takes everything inside it, nested elements included (4.4's diagnostic).
- `ciw` on `listBookmarks,` leaves the comma: punctuation is its own word.
- A check that pipes a server's answer into another program must send the server's own output to `/dev/null`, or its log lines end up in the answer.
- A `stdout=` check is a substring match; to check an exact value, print `true`/`false` from a comparison instead.

Next: chapter 5 (nvim-search, about 3 lessons): `/ ? n N * #`, `cgn` and `.`, `:s` and `:%s` with `g` and `c`. Shelf's `public/index.html` is the file to work on (4.4's closing text promises `/`, `*`, `cgn` and `:s`). Review rounds: 5.1 → 4.4, 4.2, 3.4.

