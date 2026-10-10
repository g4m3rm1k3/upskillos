# Bootcamp audit: the existing spreadsheet lessons (Sprints 0–7)

Started 2026-10-09. An audit of the 42 lessons in `src/labs/project-studio/tracks/spreadsheet-build/` against today's standard, so they can become Module 1 of the bootcamp ([bootcamp-series-plan.md](bootcamp-series-plan.md)). Findings are written here as each sprint is read, then the upgrade work is tracked at the end.

## What "best" means now

Collected from `docs/project-studio-lesson-standard.md`, `docs/contributing/project-studio-series.md`, the newest series (Frontier, Forge, Q-Arcade) and the owner's bootcamp decisions:

1. **Learn → experiment → apply.** Each subject is learned on its own, played with in a **playground** (`playground/` in the learner's repository, apart from the app), then applied to the spreadsheet "as it's done in the real world". *(Owner, 2026-10-09.)*
2. **Predictions** before runs, in a ```` ```predict ```` fence with a `verify:` script, on deterministic results.
3. **A diagnostic experiment** in each lesson: break something on purpose, observe, find the cause, restore.
4. **A Your turn** in each lesson: the learner makes at least one decision without a complete implementation shown, with checks and a ```` ```hints ```` ladder (nudge, concept, shape).
5. **Check limits stated:** what the checks prove and what they don't, with a manual observation for the rest.
6. **A sprint-ending challenge and solution pair** (the challenge has no answer rung; the next lesson walks the reference solution).
7. **Small steps, explained before and traced after** (already the house style here).
8. **Walkthrough wrong answers** for every check, so each check is shown to catch something.
9. **Progress keys preserved:** lesson file names never change; a step inserted into a published lesson gets its own key, `## Title {#key}`; steps appended at the end need none.

## The track as a whole

- **The writing is good.** Clear, concrete, line-by-line, macOS notes where they differ, real output shown. The teaching itself rarely needs rewriting.
- **The newer machinery is missing.** The audit script (`docs/generated/project-studio-lesson-review.md`) flags all 42 lessons: no predictions (only 1.2 and 5.2 mention one), no Your turn heading except 0.4 and 7.7, no hint ladders, no stated check limits.
- **The framing is the old one.** 0.1 sells "build a spreadsheet … a server, and a desktop app". It should introduce the bootcamp, with the spreadsheet as the practice project.

## Sprint 0 — the terminal and Node (0.1–0.4)

| Lesson | Good | Missing |
|---|---|---|
| 0.1 Folder and terminal | absolute vs relative paths tied to Python's `open()` mystery; the misspelt command as a first error | bootcamp framing; a prediction (e.g. what `cd ..` from `scratch` prints); a Your turn (make a nested folder and navigate to it with a relative path) |
| 0.2 How the shell finds programs | PATH and environment variables explained from need; `greet.py` | a prediction (output after Restart); a Your turn (a second variable with a default) |
| 0.3 Install Node | why Node, LTS explained | a prediction in the REPL (`7 / 2`, `0.1 + 0.2`); a tiny Your turn (an expression evaluated in the REPL) |
| 0.4 Running programs | the strongest: two tracebacks read side by side, exit codes, Ctrl+C, a challenge | predictions (exit code of `broken.py`); hints on the challenge; check limits |

**Playground:** 0.1's `scratch` folder is the natural place to introduce `playground/`, kept for the whole bootcamp, instead of deleting it. That needs a new keyed step, because the existing step *Delete the scratch folder* is a progress key and must stay.

## Sprint 1 — git (1.1–1.8)

| Lesson | Good | Missing |
|---|---|---|
| 1.1 Install Git | the two installer traps (Vim, branch name); the email privacy note | nothing major; a short lesson is right here |
| 1.2 A repository | `.git` explained, with the two rules that follow | a prediction (`git status` before and after `init`) |
| 1.3 First commit | the staging area as a box; good-message rule | a Your turn (stage and commit a second file with a good message) |
| 1.4 Seeing changes | three versions of a file; `git diff` vs `--staged` | **an ideal prediction:** what does `git diff` print after `git add`? (Currently it's told, not asked.) |
| 1.5 Ignore and line endings | secrets first, `check-ignore -v`, `.gitattributes` | a Your turn: ignore a pattern (`*.log`) and prove it with `check-ignore` |
| 1.6 Undoing | a diagnostic experiment already (break, diff, restore) | a prediction (is the change still in the file after `restore --staged`?) |
| 1.7 Branches | fast-forward explained | **a broken promise:** "sprint 8 does [merge conflicts]". The bootcamp's Sprint 8 is dependencies. Either teach a conflict here (the playground is the safe place) or change the promise. A Your turn: a branch of your own, merged. |
| 1.8 GitHub | why not to initialise on GitHub; `origin/main` as memory | a sprint-ending challenge |

**Playground:** a throwaway repository in `playground/git/` is the right place to experiment: conflicts, `reset`, a deleted branch, all without risk to the real history. It's also where a merge conflict should be taught, which fixes the broken promise.

**Sprint 1 challenge (new):** in the playground repository, two branches change the same line; merge them, resolve the conflict, and leave a clean history. The solution lesson walks through it.

## Sprint 2 — HTML and CSS (2.1–2.4)

| Lesson | Good | Missing |
|---|---|---|
| 2.1 A page | elements, tags, attributes, nesting; refreshing as a felt annoyance that Vite later removes | a prediction (does the page change before F5?) |
| 2.2 A table | the repetition is felt on purpose ("count the cost") | a Your turn (a fifth row of your own, checked by `page`) |
| 2.3 CSS | rules, selectors, the cascade's "later wins", the box model | **styling is thin for a bootcamp:** no experiment with specificity, the box model or layout; a prediction (which of two rules wins?) |
| 2.4 DevTools | live editing as experimentation; a challenge with three good checks | hints as a ladder; check limits |

**Playground (the styling section the owner asked for):** `playground/css/` pages for the box model (predict an element's rendered width from padding and border, then switch `box-sizing`), specificity battles (which colour wins?) and flexbox basics. The full styling sprint is Sprint 12; this is the first taste, learned and experimented with before it's applied to the grid.

**Sprint 2 challenge:** 2.4's challenge stays. Its solution is short, so it can be a final step in 2.4 rather than a new lesson.

## Sprint 3 — JavaScript and the DOM (3.1–3.6)

| Lesson | Good | Missing |
|---|---|---|
| 3.1 JavaScript from Python | the "where Python errors, JS answers" pattern; a deliberate error read in the Console | the REPL tour is *told*; it should be *predicted* (`"1" + 1`, `"3" * 2`, `1 == "1"`) |
| 3.2 Functions and loops | a "Predict, then check" section already, in plain text | make it a real ```` ```predict ```` box (`columnName(26)` is `[`) |
| 3.3 The DOM | the DOM vs the page source, clearly | a Your turn (a different grid size or an extra row, checked by `page`) |
| 3.4 Events | closures, with the Python lambda trap; **a diagnostic experiment** (swapped arguments) | a prediction on the closure |
| 3.5 The formula bar | event objects; the last-row bug guarded | a Your turn: Escape puts the cell's text back (a decision about where the code goes) |
| 3.6 Challenge: columns past Z | a real challenge with a table of cases | the hints are a numbered list, not a ```` ```hints ```` ladder, and the last two are nearly the answer; **no solution lesson** (4.1 hands over a solution without explaining it) |

**Playground:** `playground/js/` for JavaScript's surprises, run with `node`: coercion, `==` vs `===`, `undefined`, closures in loops. Predict each, run it, explain it.

**New lesson:** `03-07-solution-columns-past-z.md`: the bijective base-26 idea, traced on paper and in the debugger, compared with the learner's own version.

## Sprint 4 — modules, npm, Vite (4.1–4.4)

| Lesson | Good | Missing |
|---|---|---|
| 4.1 Modules | **"the wall"** (modules blocked on `file://`) is a great felt problem; globals vs modules | a prediction: what happens when the page is opened as a file now? |
| 4.2 npm | semver, the lockfile, `node_modules` kept out of Git, every field of `package.json` justified | a prediction on `^` ranges (does `^8.3.2` accept 8.9.0? 9.0.0?); a Your turn: a script of your own |
| 4.3 The dev server | localhost and ports; HMR felt | a prediction (what happens to the page when the server stops?) |
| 4.4 Build | bundling, minifying and hashed names, each explained | a Your turn measured from the build output |

**Sprint 4 challenge (new):** a module of the learner's own, imported in two places, built and previewed; the solution after.

## Sprint 5 — TypeScript (5.1–5.3)

| Lesson | Good | Missing |
|---|---|---|
| 5.1 TypeScript | every `tsconfig` line justified; 24 errors treated calmly | a prediction: does Vite refuse to serve code with type errors? (It doesn't.) |
| 5.2 Fixing type errors | each error kind answered with a reason; narrowing; `find<T>` | a Your turn: type a small function the learner writes |
| 5.3 Types in the workflow | **what types catch and what they don't**, shown both ways | make "it passes" a prediction: does `tsc` catch `select(r, c)`? |

**Playground:** `playground/ts/` for unions, narrowing and discriminated unions (which come back in Sprint 7), and `any` vs `unknown`.

**Sprint 5 challenge (new):** make a swapped-argument mistake impossible for a small function (an object parameter); the solution after. It prepares 6.3's `Address`.

## Sprint 6 — tests and the model (6.1–6.6)

| Lesson | Good | Missing |
|---|---|---|
| 6.1 First test | **a test is shown to fail** before it's trusted | a prediction (which tests fail when the `- 1` is dropped?) |
| 6.2 Test first | red-green-refactor for real; a round-trip test over 20,000 columns | a Your turn: the learner writes the red test for one more case |
| 6.3 Addresses | interfaces, regular expressions, destructuring; a check that exists only for TypeScript | a prediction: `toBe` vs `toEqual` on two equal objects |
| 6.4 The Sheet | classes from Python; why a `Map` (sparse storage) | a Your turn: a small `Sheet` method, test first |
| 6.5 Wire the sheet; the debugger | the debugger taught step by step | the debugger part has no evidence; a prediction about a paused variable would add some |
| 6.6 Tidy into `src` | "now, because the problem is real" | fine; `git show HEAD:hello.py` could be a prediction |

**Sprint 6 challenge (new):** a feature built test first from a spec alone (for example `Sheet.used()`, the smallest rectangle holding every non-empty cell); the solution after.

## Sprint 7 — the formula language (7.1–7.7)

The strongest sprint: grammar before code, recursion explained through base cases and a trace, errors as values, catching only our own errors, a careless-fix test for cycles, and a challenge that relies on an exhaustive `switch`.

| Lesson | Missing |
|---|---|
| 7.1 Tokens | a prediction: the tokens of `12.5*A1` and their positions |
| 7.2 Trees and evaluation | a prediction: the value of a hand-built tree, and the order of calls |
| 7.3 The parser | a prediction: is `10-2-3` 5 or 11? |
| 7.4 Cell values | a prediction: `Number("")` is 0 (why the `trim()` check exists) |
| 7.5 Formulas on the page | has a diagnostic experiment (a formula that uses itself); predict what happens before typing it |
| 7.6 Cycles | invites removing the `delete` to watch a test fail; make that a prediction |
| 7.7 Challenge | hints as a ladder, with no answer rung; then **7.8, the solution lesson** |

**Playground:** a tiny calculator for `+` and `*` only, *before* 7.1, where "just split the text" is tried and breaks. The lesson already argues this in words; the playground lets the learner feel it.

## The test runner

The spreadsheet track still uses its own walkthrough runner, `spreadsheetBuild.desktop.test.js`, written before the shared `walkSeries.js`. The shared one does things the old one doesn't:

- it runs every prediction's `verify:` command and checks the stated answer;
- it requires a Your turn in every lesson, with checks, hints, wrong answers and an answer;
- it checks that every wrong answer names real checks;
- it can stop after a lesson (`_UNTIL`), keep the project (`_KEEP`) and resume (`_START` with `_FROM`).

The old runner has three things the shared one lacks, which the spreadsheet needs:

1. **`page` checks** in a real browser (Playwright's Chromium, standing in for the app's hidden window);
2. **an isolated Git identity:** `git config --global` writes to a temporary file, never the owner's real settings, because Sprint 1 teaches `git config --global`;
3. **a fake GitHub:** a bare repository on disk, written `{BARE}` in commands.

**Decision:** add those three to `walkSeries.js` as options, so no other series changes; move the spreadsheet track onto it; retire the old runner. Walkthrough keys change from `<lesson>#<step>` to `<track>/<lesson>#<step>`, a mechanical rename.

## Upgrade plan

Sprint by sprint. Each sprint is upgraded, walked and recorded before the next starts.

In every lesson:

1. **Framing:** text only, which never changes a progress key.
2. **Predictions** inside existing steps, with `verify:` commands (`node -e …` or a PowerShell one-liner). A fence inside a step changes no step's id.
3. **A Your turn** appended as the last step (appending needs no key): checks, a hint ladder, an answer in `answers/`, wrong answers in the walkthrough.
4. **Experiments** in `playground/`, introduced in 0.1 and kept for the whole bootcamp.
5. **Check limits** stated where a check proves less than it seems.

Then each sprint's **challenge and solution pair**, as new lesson files that sort after the existing ones (`03-07-…`, `07-08-…`), so no published file name changes.

## Progress

| Part | Upgraded | Walked |
|---|---|---|
| Runner moved to `walkSeries.js` | 2026-10-09: options `pages`, `isolatedGit` (with `{BARE}`) and a `before:` key added; the old runner's file now hands the track to `walkSeries`; keys renamed to `spreadsheet-build/<lesson>#<step>` | Sprints 0–2 pass on it unchanged; the non-desktop Project Studio tests pass (193) |
| Sprint 0 | 2026-10-09: bootcamp framing in 0.1 (and the track title *Bootcamp 1 · Professional Foundations*); `playground/` introduced in 0.1; a prediction and a Your turn in every lesson; 0.4's challenge became its Your turn, with hints | passes (`SHEET_UNTIL=spreadsheet-build/01-09`, 2026-10-09) |
| Sprint 1 | 2026-10-09: a Your turn in every lesson, practising each Git skill on playground files; **new lesson 1.9, merge conflicts** (fixes 1.7's broken promise and serves as the sprint's challenge); 1.4 commits the playground; 1.4's weak `git-commits 2` check replaced | passes, same run (18 tests, about 80 s) |
| Sprint 2 | 2026-10-10: **a styling section of seven new lessons** in the playground, on a one-page portfolio: Styling 1 semantic HTML (kept short), 2 the cascade and specificity (a lab), 3 the box model and a spacing scale, 4 type, colour, contrast, buttons and focus (dark theme as Your turn), 5 flexbox (a lab), 6 grid (a lab), 7 responsive design. Then 2.1–2.4 upgraded as the "apply" half (2.3 rewritten around what an app interface needs; tokens as its Your turn); **2.5, a challenge: a pricing page from a designer's brief, with twelve acceptance tests**; **2.6, its solution**, built in its own folder, with a transfer Your turn. 3.1, 3.4 and 3.5 updated for the new rows and tokens | the whole of Sprints 0–2 passes from an empty folder (`SHEET_UNTIL=spreadsheet-build/02-06`, 31 tests, 496 s) |
| Sprints 3–7 | | |

## How to continue (for the next session)

Read this file's sprint section for the sprint you're upgrading, then its lessons. Walk with:

```powershell
$env:SHEET_UNTIL = "spreadsheet-build/<last lesson of the sprint>"
npx vitest run src/labs/project-studio/spreadsheetBuild.desktop.test.js
```

`SHEET_KEEP=<folder>` keeps the finished project (with `<folder>.gitconfig` and `<folder>.github.git` beside it), and `SHEET_START=<folder>` with `SHEET_FROM=<lesson id>` walks only the lessons from there on. Sprints 0–1 take about 80 seconds, so walking from the start is fine until the npm sprints make it slow.

Traps found so far:

- **Your turn commits change later counts.** A check like `git-commits 2` stops proving anything once an earlier Your turn adds a commit. Check the content of a commit instead (`run "git show HEAD:<file>" stdout=...`).
- **Wrong answers share the fake GitHub.** A wrong answer that pushes changes the bare repository, and the real walkthrough's next push is rejected. Wrong answers never push.
- **A command that's meant to fail** (a merge that stops with a conflict) is written `git merge x; exit 0` in the walkthrough, so the walk carries on.
- **Later lessons type whole files.** When a Your turn changes a file that a later lesson shows in full, the later lesson must keep the change: 1.5's `*.log` line is now in 4.2's and 4.4's `.gitignore`.
- **The playground is committed** (since 1.4), so anything a later playground experiment creates must be committed or ignored before a `git-clean` check.
- **`git-message` searches the whole history.** A later lesson's commit can contain the same word (the styling commits say "grid"), so a lazy message passes. Check the last commit instead: `run "git log -1 --format=%s" stdout="…"`.
- **CSS predictions are verified in the browser:** `verify: page <file> "<expression>" [server=static]` (added to `walkSeries.js` for series with `pages: true`). The expression must return the answer's exact text.
- **Responsive checks load the page in an iframe** of a given width, with `server=static` so the frame is same-origin. Reading a stylesheet's rules (CSSOM) also needs `server=static`: Chromium blocks it for `file://` pages.
- **Lessons that repeat a whole growing file** (the portfolio's stylesheet in Styling 5–7) were generated from one source of snapshots, so every step's file is exactly the last one plus the change. If those lessons change again, edit all the later snapshots too.
- **Lettered lesson files** (`02-01a-…` to `02-01g-…`) sort between 2.1 and 2.2 without renaming anything published.
- **Step ids are positions.** Append new steps at the end of a lesson, or give an inserted one a `{#key}`. 1.8 keeps a closing step where *Sprint 1 is done* was, with the Your turn after it.
