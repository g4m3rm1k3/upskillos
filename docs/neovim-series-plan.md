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
| 3 | nvim-operators | Operators and the Dot | `d c y p P`, `dd cc yy D C`, operator + motion, counts, `.`, `J`, `>> <<`, `~ gu gU` | routing |
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

Next: chapter 2 (nvim-motions). Add each new key to `keys/neovim.js` in the lesson that teaches it, and review rounds drawn from chapter 1 (and, later, the lessons about 1, 3 and 7 back).
