# Data Science Studio: session handoff

Start every Data Science Studio session by reading this file, then the plan (`docs/data-science-studio-plan.md`): its outline lists what each part must teach. At the end of the session, update this file (state, next steps, anything learned) and the plan's status, then stop so the owner can clear the chat.

## The owner's rules

- **Two parts per session**, then update this handoff and stop. Plan a part lesson by lesson (a table in the plan) before building it.
- **The deepest lab.** Data science feeds machine learning, statistics, visualisation and databases. Every part teaches its **maths** (derived step by step), its **algorithms** (written by hand, counted, stepped through) and its **concepts**. The bar is "better than QMaze": more code the learner writes, more maths they derive.
- **Four ways to see each idea**, where it fits: Python by hand first, then a spreadsheet formula (the Spreadsheet Lab's engine), then pandas, and D3 for charts.
- **Labs give the intuition; Project Studio is the deep code dive.** Overlap with Frontier or other series is wanted, never a reason to leave a topic out. It's open source: write for every learner.
- **The Spreadsheet Lab is part of this lab, not a copy of it.** Spreadsheet exercises run inside the real Spreadsheet Lab (`<Spreadsheet>`), never a rebuilt grid, formula bar or step list. Anything a lesson needs that a spreadsheet user could also use (cleaning text, joins, edit distance, chart output for Part 4) is built **in the Spreadsheet Lab first**, with its tests, and the lesson uses it. Lesson-only code is the by-hand Python and its JavaScript copy, which the lessons teach.
- **Nothing claimed without a measurement.** Numbers in a lesson come from the engine (checked by tests) or were measured, and say so.
- One heavy job at a time (the owner's PC once froze); never leave a dev server running; commit and push only when asked; never write the owner's coursework into the repo.

## State (2026-10-14)

**Parts 1 and 2 are built**: 15 lessons, all tested, checked in a browser, not yet committed when this was written (check `git log`).

| Part | Lessons |
|---|---|
| 1 · Tables by hand | 1.1 rows and columns · 1.2 CSV by hand (state machine) · 1.3 floats and pence · 1.4 missing values · 1.5 filtering, De Morgan · 1.6 insertion and merge sort, stability · 1.7 pandas, masks |
| 2 · Summing it up | 2.1 the mean (squared error, running mean) · 2.2 median and quantiles · 2.3 quickselect · 2.4 variance, Bessel derived · 2.5 Welford vs cancellation · 2.6 outliers (z, IQR, MAD) · 2.7 group-by · 2.8 pivot tables |

**2026-10-15: the Spreadsheet Lab joined in** (no new lessons):
- Each `formula` block now embeds the real Spreadsheet Lab. That brings its grid, its formula bar (with function suggestions) and its side panel, which works the formula out step by step. The shop's data is folded to its first rows; the answer goes in B405, under the data.
- New Spreadsheet Lab feature, **folded tables** (`spreadsheet-lab/engine/folds.js`). The button on a table's heading row cycles through all rows, the first 5, and the heading only. Copying a folded table's heading row copies the whole table. Datasets open with a fold button; "Fold this table" is in the right-click menu.
- The lab lists every lesson exercise under "From the lessons" (`lessons/exercises.js`, generated from the formula blocks: write an exercise once, in the lesson). A lesson's button opens its exercise in the lab with the learner's own formula. The lab's function help links to the lessons that ask for that function (`?lesson=<id>` deep link).
- `engine/agree.test.js` holds the lessons' by-hand statistics to the spreadsheet's AVERAGE, MEDIAN, PERCENTILE.INC, VAR.S and the rest.

**Next: Parts 3 (cleaning and joining) and 4 (charts with D3).** Plan each lesson by lesson first. Part 4 needs a **JavaScript write block** for D3 (a new block kind): model it on Data Science on the Web's runtime and checker (`src/labs/web-data-science/runtime.js`, `Practice.jsx`), checking the chart's elements and positions. Part 3 should clean the town names and fix the pence typos, then redo counts from Parts 1–2 (the lessons promise this). Spreadsheet first: TRIM, LOWER, PROPER and XLOOKUP exist; edit distance doesn't, so add it as a Spreadsheet Lab function (with tests) for the lessons to use. Part 4: draw with the Spreadsheet Lab's chart engine (`engine/chart.js`: `niceTicks`, `histogramBins`, `linearFit`) rather than a second chart system; only the "write the chart's JavaScript" exercise is new.

**Also asked for, not done:** the owner found variables hard to follow in other labs' Real Python tabs. This lab's tab fixes it (changed variables marked, with old values; a fixed order with the program's `focus` first; pictures for the main values). Bringing that to the other labs' tabs is still to do.

## How the lab is built

`src/labs/data-science-studio/`, copied from NLP Studio's framework (copies, not shared edits):

| File | What it does |
|---|---|
| `python/data.py`, `engine/data.js` | the shop's orders: a seeded generator, flaws included, the same text in both languages |
| `python/tables.py`, `frames.py`, `summary.py` | what the lessons teach (frames.py needs pandas) |
| `engine/*.js` | the JavaScript copies the figures and checks use, plus traces and counters |
| `engine/sheet.js` | the Spreadsheet Lab's formula engine, run headless; `lessonBook` (a block's workbook) and `checkAnswer` |
| `engine/agree.test.js` | the by-hand statistics and the spreadsheet's functions give the same answers |
| `lessons/exercises.js` | every formula block as a Spreadsheet Lab "thing to try", and which lessons teach each function |
| `engine/parity.json`, `parity.test.js`, `tools/make_parity.py` | the JavaScript held to the Python |
| `lessons/partN.js`, `figures/partN.jsx` | lessons as block lists; figures |
| `Blocks.jsx`, `WriteIt.jsx`, `FormulaIt.jsx` | the blocks; `write` runs Python in the page; `formula` embeds the real Spreadsheet Lab and checks the answer cell |
| `programs.js`, `PythonTab.jsx` | Real Python programs (desktop); `focus` orders the variables, `view` is `csv`, `bars` or `watch` |

Block kinds: `h, md, figure, code, mathCode, predict, choice, derive, write, formula, note, python`. A `write` takes `packages: ['pandas']` and `prelude: 'import pandas as pd'` for pandas. A `formula` takes `table` (`orders` or `small`), `prompt`, `solution`, `must` (functions it has to use), `hint`, `explain`. Its id (`lesson id:block index`) is also its exercise id in the Spreadsheet Lab, so moving blocks around changes it (as it changes progress).

**Spreadsheet Lab additions:**
- `SpreadsheetLab.jsx` exports `<Spreadsheet book lesson start>`, the whole spreadsheet on a given workbook. In `lesson` mode it has no New/Open, Enter stays on the cell, and preferences aren't saved.
- The dataset `shop-orders` (`datasets/index.js`) has hand-made tries 0–4, plus `lessons`, which loads the generated exercises.
- Deep links: `?dataset=<id>&try=<n>`, and `?dataset=shop-orders&exercise=<id>&formula=<f>`.
- `datasets.test.js` checks every try and every lesson exercise. New exercises need no extra registration.

## Checks to run (reuse these; don't write new ones)

| Command | Checks |
|---|---|
| `python src/labs/data-science-studio/tools/make_parity.py` | regenerates `engine/parity.json` after a Python change |
| `npx vitest run src/labs/data-science-studio --exclude "**/*.desktop.test.js"` | parity, every lesson's numbers, write blocks (lab answer passes, starter fails, in real Python), formulas, renders, bundle |
| `npx vitest run src/labs/data-science-studio/stepper.desktop.test.js` | the Real Python programs in the desktop app's Python |
| `npx vitest run src/labs/spreadsheet-lab` | after any Spreadsheet Lab change |
| `npx vite-node src/labs/data-science-studio/tools/browser-check.mjs <out> --write fn1,fn2` | the real browser: every lesson, chosen write blocks in Pyodide (pandas included), a formula typed into the embedded grid, its steps, folding and copying the table, the Spreadsheet Lab button and its lesson list; screenshots; starts and stops its own server |
| `npm run facts`, `npm run catalog:check`, `npm run typecheck`, `npm run build` | before committing |

## Learned the hard way

- **An apostrophe inside parentheses in a docstring** stops the shared Python parser (`a-arcade-python/analysis.js`): every function after it vanishes from the lessons' quotes. Reword: "(the fix named after Bessel)", not "(Bessel's correction)".
- **Python 3.12+ `sum()` of floats is compensated**, so it won't match JavaScript to the last digit. Library code here adds with explicit loops (`total`), which is also what lesson 2.5's cancellation needs.
- **A starter must not loop forever**: the test runs it (now with a 30-second limit). Return `None`/`pass` without `while True`.
- **`forbid` is a substring check**: forbidding `sorted(` also matches `merge_sorted(`. Use `' sorted('`.
- **Constants after functions**: a `write` block's `constants` (like `SUMMARIES`) may name the given functions, so this lab's `programBefore` puts functions first.
- **Derivation answers** accept `log2( )`, `sqrt( )`, `exp( )`, and Greek names such as `sigma` as variables.
- **Spreadsheets compare text ignoring capitals** (`COUNTIFS` counted "leeds" as "Leeds"); Python doesn't. Lesson 1.5 teaches it; keep it in mind for every formula exercise on text.
- **pandas**: the page has pandas 2.x (Pyodide 0.29), this machine 3.0. Checks compare plain values; the browser check runs a pandas write block in the page to prove it.
- **The desktop stepper's Python has no pandas**: Real Python programs use plain-Python functions only.
- **Tool input can turn typed ` ` or `\\` into raw characters** in a file: build such escapes from character codes, and look at the file's bytes.
- **The lessons' button styles reached into the embedded spreadsheet** (`.qm-lab button` outranks Tailwind classes). The shared rules now skip `.ss-root *`; any new lab-wide element rule needs the same `:not(.ss-root *)`.
- **An answer cell beside the data scrolled the data out of view** (the grid keeps the active cell visible, and the side panel takes ~320px). It goes under the data, one row clear.
- **The embedded sheet follows the app's dark mode** (Tailwind `dark:` on `<html>`), while lesson cards are light. It can't be switched for one part of the page; accepted for now.
- **Folds aren't saved to .xlsx yet** (Excel's outline levels would be the match); they are kept in the lab's own saved workbook.
- **The first-visit welcome bubble** covers screenshots unless `localStorage['oc-tour-seen'] = '1'`.
- **`useOpenLab` pulls in the whole app** in a bundle: `bundle.test.js` treats `../../components/*` as external, and render tests wrap blocks in a `MemoryRouter`.
