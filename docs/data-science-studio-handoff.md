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

## State (2026-10-16)

**Parts 1 to 4 are built: 34 lessons**, all tested, checked in a browser, not yet committed when this was written (check `git log`). Parts 3 and 4 were built on 2026-10-16; their lesson tables and every number they quote are in the plan.

| Part | Lessons |
|---|---|
| 1 · Tables by hand | 1.1 rows and columns · 1.2 CSV by hand (state machine) · 1.3 floats and pence · 1.4 missing values · 1.5 filtering, De Morgan · 1.6 insertion and merge sort, stability · 1.7 pandas, masks |
| 2 · Summing it up | 2.1 the mean (squared error, running mean) · 2.2 median and quantiles · 2.3 quickselect · 2.4 variance, Bessel derived · 2.5 Welford vs cancellation · 2.6 outliers (z, IQR, MAD) · 2.7 group-by · 2.8 pivot tables |
| 3 · Cleaning and joining | 3.1 cleaning text (NFC, spaces, case) · 3.2 validation rules, the pence typos fixed · 3.3 duplicates · 3.4 edit distance (DP derived) · 3.5 fuzzy matching · 3.6 filling gaps (MCAR, MAR, MNAR with the truth) · 3.7 joins three ways, counted · 3.8 join cardinality, anti-joins · 3.9 tidy data, wide and long · 3.10 project: the clean year |
| 4 · Charts with D3 | 4.1 a chart is a function (scales) · 4.2 the data join · 4.3 ticks and axes · 4.4 histograms and bin rules · 4.5 log and square-root scales · 4.6 densities (KDE) · 4.7 colour scales · 4.8 charts that mislead (lie factor) · 4.9 project: small multiples |

The shop's data now has two more tables, made by the generator with the truth kept: the **catalogue** (`make_catalogue`: item, category, list price; a pump never sold) and the **returns form** (`make_returns`: typed order ids and item names with mistakes; `truth=` receives each return's real order). `make_orders(truth=)` records the real price of every blanked or pence-typed order. Lessons from 3.10 on use the clean orders (`clean_orders`): 400 rows, four towns, prices in whole pence, missing prices left missing.

**The Spreadsheet Lab gained** (each with tests): `LEVENSHTEIN` (not an Excel function; its help says so); XLOOKUP, XMATCH and MATCH looking up a range of values at once, as Excel does (they returned #N/A before); the shop dataset opening `catalogue` and `returns` sheets (`otherSheets` and `sheets()` in `datasets/index.js`, listed in the dataset panel); histogram **bin rules** (Scott, Freedman–Diaconis, Sturges; `ruleWidth`, `BIN_RULES`, at most 200 bins) chosen in the chart panel; and **This chart in D3** (`engine/chartCode.js`, in the chart panel), whose output the tests run with d3.

**Next: Parts 5 (looking for patterns) and 6 (samples and uncertainty).** Plan each lesson by lesson in the plan first. Part 5 needs the confounder put in on purpose for Simpson's paradox; the generator has none yet. Add it without changing the existing orders' text, or every earlier number moves: a new column or a new table is safer. The spreadsheet lens has CORREL, SLOPE, RSQ, LINEST and RANK. Charts in Parts 5 and 6 can use the `chart` block.

**Also asked for, not done:** the owner found variables hard to follow in other labs' Real Python tabs. This lab's tab fixes it (changed variables marked, with old values; a fixed order with the program's `focus` first; pictures for the main values, now including a `table` view for a list of lists). Bringing that to the other labs' tabs is still to do.

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
| `Blocks.jsx`, `WriteIt.jsx`, `FormulaIt.jsx`, `ChartIt.jsx` | the blocks; `write` runs Python in the page; `formula` embeds the real Spreadsheet Lab and checks the answer cell; `chart` runs D3 code and compares its marks |
| `python/cleaning.py`, `joins.py`, `charts.py`, `engine/cleaning.js`, `charts.js` | Parts 3 and 4 by hand, and their JavaScript copies (parity-tested) |
| `engine/chartRun.js` | the `chart` block's runtime and checker; `engine/charts.test.js` holds the chart maths to D3 and to the Spreadsheet Lab |
| `programs.js`, `PythonTab.jsx` | Real Python programs (desktop); `focus` orders the variables, `view` is `csv`, `bars` or `watch` |

Block kinds: `h, md, figure, code, mathCode, predict, choice, derive, write, formula, chart, note, python`. A `chart` ("Draw it with D3") takes `prompt`, `starter`, `solution` (JavaScript run with `d3`, `svg`, `data`, `width` 480, `height` 300), `data` (or `runs`: several data sets drawn in turn, with `keep`: the field whose marks must stay the same elements), `checks` (`[{ select, attrs }]`: positions to within 0.5 px, `#text` for text, paths and transforms as lists of numbers), `verify` (the tests' check of the solution's marks against the Python maths), `hint`, `explain`. The answer key is the solution, run the same way. A formula may name the other sheets: `catalogue!A2:C8`, `returns!B2:B26`. A `write` takes `packages: ['pandas']` and `prelude: 'import pandas as pd'` for pandas. A `formula` takes `table` (`orders` or `small`), `prompt`, `solution`, `must` (functions it has to use), `hint`, `explain`. Its id (`lesson id:block index`) is also its exercise id in the Spreadsheet Lab, so moving blocks around changes it (as it changes progress).

**Spreadsheet Lab additions:**
- `SpreadsheetLab.jsx` exports `<Spreadsheet book lesson start>`, the whole spreadsheet on a given workbook. In `lesson` mode it has no New/Open, Enter stays on the cell, and preferences aren't saved.
- The dataset `shop-orders` (`datasets/index.js`) has hand-made tries 0–4, plus `lessons`, which loads the generated exercises.
- Deep links: `?dataset=<id>&try=<n>`, and `?dataset=shop-orders&exercise=<id>&formula=<f>`.
- `datasets.test.js` checks every try and every lesson exercise. New exercises need no extra registration.

## Checks to run (reuse these; don't write new ones)

| Command | Checks |
|---|---|
| `python src/labs/data-science-studio/tools/make_parity.py` | regenerates `engine/parity.json` after a Python change |
| `npx vitest run src/labs/data-science-studio --exclude "**/*.desktop.test.js"` | parity, every lesson's numbers, write blocks (lab answer passes, starter fails, in real Python), D3 blocks (solution passes, starter fails, marks agree with the Python), the chart maths against D3 and the Spreadsheet Lab, formulas, renders, bundle |
| `npx vitest run src/labs/data-science-studio/stepper.desktop.test.js` | the Real Python programs in the desktop app's Python |
| `npx vitest run src/labs/spreadsheet-lab` | after any Spreadsheet Lab change |
| `npx vite-node src/labs/data-science-studio/tools/browser-check.mjs <out> --write fn1,fn2` | the real browser: every lesson, chosen write blocks in Pyodide (pandas included), every D3 block (the solution pasted, drawn, checked), a formula typed into the embedded grid, its steps, folding and copying the table, the Spreadsheet Lab button and its lesson list, the catalogue and returns sheets and a cross-sheet formula, a histogram's bin rule and its D3 code in the Spreadsheet Lab; a screenshot of every lesson, figure and D3 block; starts and stops its own server (about 3 minutes) |
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
- **Nearby seeds give nearly the same first draws** with this generator (an LCG): seeds 1, 2, 3… made 200 "independent" repeats almost identical, and MCAR looked biased. Repeated experiments run one generator through every repeat (`missingnessExperiment`).
- **pandas' melt turns a missing number into NaN** (JSON can't hold it), and a pandas column of whole numbers comes back as numpy ints, which the checker can't read: use `.astype(object).where(…notna(), None)` and `.tolist()`.
- **Python's `round` rounds halves to even; JavaScript's rounds them up.** Code that must give D3's answers uses `js_round` (`floor(x + 0.5)`).
- **JavaScript makes −0** (`Math.round(-0.13)`); D3 avoids it by building ticks as `(first + i) * step`. Copy D3's arithmetic exactly when a test compares with `toEqual`.
- **d3.line writes 3 decimals** (`line.digits`): compare paths to within 5e-4, not 1e-6.
- **d3's axis groups have `fill="none"`** too: select a chart's own lines by something else (`g[stroke-width="2"]`).
- **Code notes must follow the order of the source lines**, and `lineOf` finds the first line in the file holding the text: for a line two functions share, use `lineIn(file, fn, text)`.
- **A write block's huge argument filled the results table** (402 rows printed as the call): `checks.js` now shows long arguments as `[402 rows]`.
- **Freedman–Diaconis with one far-off value** gave a width of 21 over a range of a million: 47,000 bars. Bins are capped at 200.
- **In the Spreadsheet Lab, a chart made by a "thing to try" isn't selected for its panel**: the browser check clicks `.ss-chart-box` first.
- **Escapes typed through tool input became raw characters again** (a backslash-b in a regex, a backslash-n in a string): build them from character codes (`String.fromCharCode(10)`, `chr(9)`), or use patterns that need none (`(?![0-9])`).
