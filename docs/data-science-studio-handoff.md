# Data Science Studio: session handoff

Start every Data Science Studio session by reading this file, then the plan (`docs/data-science-studio-plan.md`): its outline lists what each part must teach. At the end of the session, update this file (state, next steps, anything learned) and the plan's status, then stop so the owner can clear the chat.

## The owner's rules

- **Keep building part after part** until clearing the chat is cheaper than carrying on (the owner, 2026-10-20; it was two parts per session), then update this handoff and stop. Plan a part lesson by lesson (a table in the plan) before building it.
- **The deepest lab.** Data science feeds machine learning, statistics, visualisation and databases. Every part teaches its **maths** (derived step by step), its **algorithms** (written by hand, counted, stepped through) and its **concepts**. The bar is "better than QMaze": more code the learner writes, more maths they derive.
- **Four ways to see each idea**, where it fits: Python by hand first, then a spreadsheet formula (the Spreadsheet Lab's engine), then pandas, and D3 for charts.
- **Labs give the intuition; Project Studio is the deep code dive.** Overlap with Frontier or other series is wanted, never a reason to leave a topic out. It's open source: write for every learner.
- **The Spreadsheet Lab is part of this lab, not a copy of it.** Spreadsheet exercises run inside the real Spreadsheet Lab (`<Spreadsheet>`), never a rebuilt grid, formula bar or step list. Anything a lesson needs that a spreadsheet user could also use (cleaning text, joins, edit distance, chart output for Part 4) is built **in the Spreadsheet Lab first**, with its tests, and the lesson uses it. Lesson-only code is the by-hand Python and its JavaScript copy, which the lessons teach.
- **Nothing claimed without a measurement.** Numbers in a lesson come from the engine (checked by tests) or were measured, and say so.
- One heavy job at a time (the owner's PC once froze); never leave a dev server running; commit and push only when asked; never write the owner's coursework into the repo.

## State (2026-10-20, later): all twelve parts built

**Parts 1 to 12 are built: 110 lessons.** Parts 9–12 were built on 2026-10-20 and were **not committed** when this was written (the owner commits when asked). Every Part 9–12 lesson table, with the numbers it quotes, is in the plan.

| Part | Lessons |
|---|---|
| 11 · Data for machine learning | 11.1 features from dates, the seasons on a circle · 11.2 target encoding and its leak (96.3% leaky against 79.0% honest) · 11.3 text as counts, TF-IDF on NLP Studio’s messages · 11.4 feature hashing, FNV-1a, collisions · 11.5 scaling for nearest neighbours · 11.6 confusion matrix, precision, recall, F1, the threshold · 11.7 stratified folds for a rare class · 11.8 a pipeline fitted on training rows · 11.9 project: the late-parcel model, and a datasheet |
| 12 · Telling the story | 12.1 error bars (D3), overlapping intervals and a clear difference · 12.2 fan charts from past errors, and how often they held · 12.3 absolute against relative, the number needed · 12.4 a dashboard with linked views · 12.5 reproducible work, fingerprints · 12.6 capstone: the shop’s year, from raw CSV to a recommendation |

**New code:** `python/ml_data.py` + `engine/mlData.js` (Part 11; JS-only helpers `deliveryTable`, `returnedFlags`), `python/story.py` + `engine/story.js` (Part 12), `figures/part11.jsx`, `figures/part12.jsx`, `lessons/part11.js`, `lessons/part12.js`. NLP Studio’s `MESSAGES` are imported from `../../nlp-studio/engine/data.js` (read only), and `make_parity.py` loads its `data.py` by path (both labs have a `data.py`). Real Python program: `fnv1a`.

**Checks at the end:** the lab’s suite 1,444 passed, 1 skipped; the stepper 11 (with `DS_PYTHON`); the browser check, every lesson of Parts 1–12, all D3 and SQL blocks and write blocks `tf_idf`, `stratified_folds`, `linked_counts` in the page: “no problems”; `npm run build` passed (sql.js’s WebAssembly is in `dist`); `npm run typecheck` passed with no diagnostics.

**What is left for this lab:** nothing in the plan. Possible extras, only if the owner asks: bring the Real Python tab’s variable view to the other labs (asked for in Part 1’s time, not done); a learner-facing note on SQL in the page needing the WebAssembly file (offline desktop builds include it, since it is imported with `?url`).

### Earlier state: Parts 9 and 10 (2026-10-20)

**Parts 9 and 10** (95 lessons with Parts 1–8).

| Part | Lessons |
|---|---|
| 9 · Time and forecasting | 9.1 time order, weeks and resampling · 9.2 moving averages and the running sum · 9.3 trend + season + rest, differencing · 9.4 autocorrelation and its band · 9.5 the naive forecasts; MAE, RMSE, MAPE · 9.6 exponential smoothing · 9.7 Holt’s trend · 9.8 Holt–Winters, tuned on January to March · 9.9 walk-forward validation and three leaks · 9.10 project: next week’s riders, and orders with nothing to forecast |
| 10 · Databases and SQL | 10.1 tables, types, NULL, keys · 10.2 SELECT, WHERE, three-valued logic · 10.3 GROUP BY, HAVING, the order clauses run in · 10.4 joins as a filtered cross product, the anti-join · 10.5 indexes, binary search, B-trees, EXPLAIN QUERY PLAN · 10.6 subqueries, NOT IN with a NULL, WITH · 10.7 window functions · 10.8 functional dependencies and normal forms · 10.9 transactions and ACID · 10.10 project: one question four ways |

**New code:** `python/forecasting.py` + `engine/forecasting.js` (Part 9), `python/database.py` + `engine/database.js` (Part 10), `figures/part9.jsx`, `figures/part10.jsx`, `lessons/part9.js`, `lessons/part10.js`, `frames.py`’s `monthly_revenue_frame`. JS-only lesson helpers: `maeFrom`, `tuneHoltWinters`, `holtWintersAhead` (forecasting.js). Real Python programs: `moving_average`, `exponential_smoothing`, `holt_winters` (28 days: the stepper shows at most 32 items of a list), `binary_search`.

**A new block kind, "Query it in SQL" (`sql`, `SqlIt.jsx`, `engine/sqlRun.js`).** The six sheets in real SQLite in the page (sql.js, already an npm dependency, its WebAssembly imported with `?url`, loaded on the first Run), typed by `column_type`, blanks as NULL. **Every run gets a fresh database** (a few ms), so a learner’s `CREATE INDEX`, `UPDATE` or `DROP` can’t break the next query. Right = the same rows as the lab’s query (in order only when the lab’s query has an ORDER BY outside a window) and the `must` words used. Spec: `{ prompt, solution, must, starter, hint, explain, answer }`; `answer` is the by-hand engine’s rows, which `lessons.test.js` holds SQLite to; a `starter` must not pass. Write blocks can use `sqlite3` (`packages: ['sqlite3']`). The parity file also stores what Python’s `sqlite3` returns, so the JavaScript is held to SQLite too. `bundle.test.js` treats `*?url` and `sql.js` as external.

**The Spreadsheet Lab gained:** **SCAN** and **MAKEARRAY** (Microsoft’s examples as tests); and a fix for every spreadsheet user: **a single cell is a reference** for OFFSET, ROW and COLUMN (`refs: [0]` in a function’s definition; `evaluate.js` reads a one-cell argument there as a one-cell range). `=OFFSET(A1, 1, 0)`, `=OFFSET(days!D2, …)`, `=ROW(C7)` all failed before.

**Checks run at the end of the session:** the lab’s suite (1,275 passed, 1 skipped), the stepper with `DS_PYTHON=C:/Python314/python.exe` (10; the app’s own environment isn’t installed on this machine, so it skips without that), the Spreadsheet Lab (456 passed; the one failure, “handles 5,000 cumulative SUM ranges quickly”, takes 3.5 s against a 3 s limit and fails the same on the committed engine: this machine, not this work), and the browser check (every lesson of Parts 1–10, both Part 9 D3 blocks, every SQL block’s starter and query in the page, write blocks `resample`, `best_alpha`, `holt_winters`, `binary_search`, `place_orders` with `sqlite3`, `monthly_revenue` in Pyodide). `npm run typecheck` and `npm run build` were not run this session.

**Machine setup done this session:** pandas 3.0.6 installed for Python 3.14 (`py -3.14 -m pip install --user pandas`; the write-block tests skip silently without it), and Playwright’s Chromium downloaded (`npx playwright install chromium`).

(Then: Parts 11 and 12, built the same day.)

### Earlier state: Parts 7 and 8 (2026-10-16, night)

**Parts 1 to 8: 75 lessons**, committed in `09282f48`. Every Part 7–8 lesson table and every number they quote are in the plan.

| Part | Lessons |
|---|---|
| 7 · Is the difference real? | 7.1 the permutation test (lights web against shop: the null is true) · 7.2 the normal's area by Simpson's rule, the z test for two proportions · 7.3 what a p-value is and isn't (A/A tests; rain and visits: small p, no cause) · 7.4 Welch's t · 7.5 the t distribution by the substitution t = √ν tan u · 7.6 errors, effect size, power, the sample size (6.10's near-town couriers) · 7.7 chi-squared, its tail by a recurrence (6.3's dispersion: a fluke) · 7.8 Bonferroni and Benjamini–Hochberg · 7.9 peeking · 7.10 project: the website's A/B test |
| 8 · Models from data | 8.1 least squares from the calculus, extrapolation · 8.2 the design matrix, the normal equations, matrices by hand · 8.3 Gaussian elimination (the generator's 300, 22, −12, 90 recovered) · 8.4 R², residuals, omitted-variable bias (5.4's 24.34 rebuilt exactly) · 8.5 one-hot and the dummy trap · 8.6 gradient descent, the rate that diverges, standardising · 8.7 overfitting, bias and variance · 8.8 ridge · 8.9 cross-validation, folds by month · 8.10 logistic regression and log loss · 8.11 project: the leak (deliveries' `days`) |

**A new generated table**, `make_trial(days, seed=17)` in `python/data.py` (mirrored in `engine/data.js`, parity-tested byte for byte): the website's A/B test of a new home page, on the days table's real visits from Monday 2 June for 28 days (`TRIAL_START`, `TRIAL_DAYS`). A coin flip per visitor; clicks with `CLICK_RATE` 200 in 1000 on A, 220 on B. 56 rows `date, page, visitors, clicks`. Every earlier table is untouched.

**The leak was already there:** `make_deliveries` draws `days` from `on_time` (1–2 if on time, 3–5 if late), so `days` decides the outcome. Lesson 8.11 finds it; nothing was changed.

**New code:** `python/significance.py` + `engine/significance.js` (Part 7), `python/models.py` + `engine/models.js` (Part 8), `figures/part7.jsx`, `figures/part8.jsx`, `lessons/part7.js`, `lessons/part8.js`. Every p-value is an area found by hand with `simpson` (no gamma function, no library): `normal_cdf`; `t_two_sided` through cos^(ν−1); `chi2_tail` by a recurrence from e^(−x/2) or the normal. They agree with scipy to about 1e-13 and with the Spreadsheet Lab to 1e-9. JS-only lesson helpers (not in the Python): `runningZ`, `intervalCoverage`, `tDensity` (significance.js); `scaledPowers` (each power column in standard units; a degree-9 curve's normal equations can't be solved without it), `stepsToConverge`, and `solve(A, b, steps)` collecting each elimination step for the figure (models.js). Real Python programs: `permutation_diffs`, `benjamini_hochberg`, `solve`, `gradient_descent` (stepper test extended: each stops once per step and returns the engine's answer).

**The Spreadsheet Lab gained:** **MMULT, MINVERSE, MDETERM** (Math; Microsoft's examples as tests, and the normal equations typed in a sheet equal LINEST); the **IF family with arrays of criteria**: COUNTIF, COUNTIFS, SUMIF, SUMIFS, AVERAGEIF, AVERAGEIFS, MAXIFS and MINIFS gave only the first criterion's answer for `{"Northern";"Swift"}` and now give one per criterion as Excel does (`scalar` positions; a column of criteria against a row makes a table); the **trial sheet** in the shop dataset and every lesson's workbook, and two things to try (the A/B test; riders from temperature, rain and the weekend with LINEST and with MMULT/MINVERSE), with their values checked in `datasets.test.js`. `engine/agree.test.js` now holds NORM.S.DIST, NORM.S.INV, T.DIST.2T, T.INV.2T, T.TEST, CHISQ.TEST (from COUNTIFS arrays and MMULT), CHISQ.DIST.RT, SLOPE, LINEST with HSTACK, the normal equations and R² to the by-hand code.

**Checks run at the end of the session:** the lab's suite (962 passed, 1 skipped), the stepper (8), the Spreadsheet Lab (all), and the browser check (every lesson of Parts 1–8 drawn, every D3 block matched, write blocks `t_two_sided`, `solve`, `logistic_fit`, `benjamini_hochberg` and `chi2_tail` passed in Pyodide, lessons 7.7 and 8.3’s formulas solved in their grids: “no problems”). `npm run typecheck` and `npm run build` failed only on another session’s unfinished `src/labs/discrete-math-lab/` (parse errors there); nothing in this lab or the Spreadsheet Lab. `npm run catalog:check` is out of date for the same reason (that session’s new lab); this work added no labs or courses.

(Planned then: Parts 9 and 10, built 2026-10-20.) Part 9 has its data: the days table's temperature (and so riders and visits) follows the seasons, the orders have dates, and the trial runs day by day; lesson 8.9 already showed a curve in the date failing on held-out months, and 7.9 showed a running statistic. Part 10: the shop's tables (orders, catalogue, returns, days, deliveries, trial) into SQLite (Pyodide's standard library), each query next to the spreadsheet, plain Python and pandas.

### Earlier state: Parts 5 and 6 (2026-10-16, evening)

Parts 5 and 6 were built in the evening session (committed as `d5855f54`); their lesson tables and every number they quote are in the plan.

| Part | Lessons |
|---|---|
| 5 · Looking for patterns | 5.1 scatter and covariance · 5.2 correlation as a cosine · 5.3 ranks and Spearman (the news day) · 5.4 the line from r, regression to the mean · 5.5 Anscombe's quartet · 5.6 logs straighten curves (the 5.13% recovered) · 5.7 overplotting, jitter · 5.8 the correlation matrix · 5.9 Simpson's paradox (the couriers) · 5.10 project: confounders, colliders, selection |
| 6 · Samples and uncertainty | 6.1 population and sample, Fisher–Yates · 6.2 binomial · 6.3 Poisson (orders per day) · 6.4 the standard error · 6.5 the CLT, the generator's noise, heavy tails · 6.6 confidence intervals and coverage · 6.7 the bootstrap · 6.8 reservoir sampling · 6.9 strata and bias (law of total variance) · 6.10 project: every number has an error |

**Two new generated tables** (`python/data.py`, mirrored in `engine/data.js`, parity-tested byte for byte), the orders untouched:
- `make_days(seed=5, truth=)`: 365 rows `date, high_c, rain_mm, riders, visits`. Riders = 300 + 22/°C − 12/mm + 90 at weekends + noise; visits × e^0.05 per °C and nothing else; the news day (11 Feb, 9,412 visits; `truth` keeps the usual 378). Temperature is the confounder of riders and visits, on purpose. **Seasonality is in the temperature (and so the visits): Part 9 can use it.**
- `make_deliveries(orders, seed=13)`: 162 rows `order_id, courier, days, on_time`, one per web order posted (no services). The town is only in the orders. `ON_TIME` and the 80/20 courier split are the truth behind Simpson's paradox.
- `noise(rng)`: 12 uniforms − 6 (additions only, so both languages agree exactly). `tenths(x)`: one decimal as text, halves up.

**New code:** `python/patterns.py` + `engine/patterns.js` (Part 5), `python/samples.py` + `engine/samples.js` (Part 6), `figures/part5.jsx`, `figures/part6.jsx`, `lessons/part5.js`, `lessons/part6.js`, and `lessons/given.js`: the code put before a write block that draws random numbers (`WITH_RNG`: the `Rng` class from the real `data.py`; `WITH_NOISE`; `WITH_MONTHS`). Random functions take a **seed**, not a generator, so write-block checks can call them with JSON, and each runs **one** generator through all its repeats. JS-only lesson helpers (not in the Python, like `kdeArea`): `spreadOfMeans`, `bootstrapPairs`, `reservoirShare`, `combBig` (BigInt, for COMBIN past 2^53). Real Python programs: `rank`, `bootstrap`, `reservoir` (stepper test extended).

**The Spreadsheet Lab gained:** the `days` and `deliveries` sheets in the shop dataset (and in every lesson's embedded workbook, `engine/sheet.js`'s `OTHER_SHEETS`), two new things to try, and **RANK.EQ / RANK.AVG ranking a whole range** (`scalar: [0]`), so Spearman's `=CORREL(RANK.AVG(r, r, 1), RANK.AVG(s, s, 1))` works as in Excel; tests in `functions.test.js` and `datasets.test.js`. `engine/agree.test.js` now holds CORREL, COVARIANCE.S, RANK.AVG, SLOPE, INTERCEPT, RSQ, the FILTER/LN log slope, COMBIN, BINOM.DIST, POISSON.DIST, SKEW and the standard error to the Python.

### Earlier state: Parts 1 to 4 (2026-10-16)

Parts 3 and 4 were built on 2026-10-16; their lesson tables and every number they quote are in the plan.

| Part | Lessons |
|---|---|
| 1 · Tables by hand | 1.1 rows and columns · 1.2 CSV by hand (state machine) · 1.3 floats and pence · 1.4 missing values · 1.5 filtering, De Morgan · 1.6 insertion and merge sort, stability · 1.7 pandas, masks |
| 2 · Summing it up | 2.1 the mean (squared error, running mean) · 2.2 median and quantiles · 2.3 quickselect · 2.4 variance, Bessel derived · 2.5 Welford vs cancellation · 2.6 outliers (z, IQR, MAD) · 2.7 group-by · 2.8 pivot tables |
| 3 · Cleaning and joining | 3.1 cleaning text (NFC, spaces, case) · 3.2 validation rules, the pence typos fixed · 3.3 duplicates · 3.4 edit distance (DP derived) · 3.5 fuzzy matching · 3.6 filling gaps (MCAR, MAR, MNAR with the truth) · 3.7 joins three ways, counted · 3.8 join cardinality, anti-joins · 3.9 tidy data, wide and long · 3.10 project: the clean year |
| 4 · Charts with D3 | 4.1 a chart is a function (scales) · 4.2 the data join · 4.3 ticks and axes · 4.4 histograms and bin rules · 4.5 log and square-root scales · 4.6 densities (KDE) · 4.7 colour scales · 4.8 charts that mislead (lie factor) · 4.9 project: small multiples |

The shop's data now has two more tables, made by the generator with the truth kept: the **catalogue** (`make_catalogue`: item, category, list price; a pump never sold) and the **returns form** (`make_returns`: typed order ids and item names with mistakes; `truth=` receives each return's real order). `make_orders(truth=)` records the real price of every blanked or pence-typed order. Lessons from 3.10 on use the clean orders (`clean_orders`): 400 rows, four towns, prices in whole pence, missing prices left missing.

**The Spreadsheet Lab gained** (each with tests): `LEVENSHTEIN` (not an Excel function; its help says so); XLOOKUP, XMATCH and MATCH looking up a range of values at once, as Excel does (they returned #N/A before); the shop dataset opening `catalogue` and `returns` sheets (`otherSheets` and `sheets()` in `datasets/index.js`, listed in the dataset panel); histogram **bin rules** (Scott, Freedman–Diaconis, Sturges; `ruleWidth`, `BIN_RULES`, at most 200 bins) chosen in the chart panel; and **This chart in D3** (`engine/chartCode.js`, in the chart panel), whose output the tests run with d3.

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
| `python/patterns.py`, `samples.py`, `engine/patterns.js`, `samples.js` | Parts 5 and 6 by hand, and their JavaScript copies (parity-tested) |
| `python/significance.py`, `models.py`, `engine/significance.js`, `models.js` | Parts 7 and 8 by hand, and their JavaScript copies (parity-tested) |
| `lessons/given.js` | code put before a write block's: the generator `Rng` (and `noise`, `MONTH_DAYS`) taken from the real `data.py` |
| `python/forecasting.py`, `database.py`, `engine/forecasting.js`, `database.js` | Parts 9 and 10 by hand, and their JavaScript copies (parity-tested; database.js also against `sqlite3`) |
| `python/ml_data.py`, `story.py`, `engine/mlData.js`, `story.js` | Parts 11 and 12 by hand, and their JavaScript copies (parity-tested) |
| `SqlIt.jsx`, `engine/sqlRun.js` | the `sql` block: the six sheets in SQLite (sql.js) in the page, a fresh copy per run; `typedRows` gives the by-hand engine the same typed rows |

Block kinds: `h, md, figure, code, mathCode, predict, choice, derive, write, formula, chart, sql, note, python`. A `chart` ("Draw it with D3") takes `prompt`, `starter`, `solution` (JavaScript run with `d3`, `svg`, `data`, `width` 480, `height` 300), `data` (or `runs`: several data sets drawn in turn, with `keep`: the field whose marks must stay the same elements), `checks` (`[{ select, attrs }]`: positions to within 0.5 px, `#text` for text, paths and transforms as lists of numbers), `verify` (the tests' check of the solution's marks against the Python maths), `hint`, `explain`. The answer key is the solution, run the same way. A formula may name the other sheets: `catalogue!A2:C8`, `returns!B2:B26`. A `write` takes `packages: ['pandas']` and `prelude: 'import pandas as pd'` for pandas. A `formula` takes `table` (`orders` or `small`), `prompt`, `solution`, `must` (functions it has to use), `hint`, `explain`. Its id (`lesson id:block index`) is also its exercise id in the Spreadsheet Lab, so moving blocks around changes it (as it changes progress).

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
| `npx vitest run src/labs/data-science-studio/stepper.desktop.test.js` | the Real Python programs in the desktop app's Python (set `DS_PYTHON` to a Python 3 when the app’s environment isn’t installed) |
| `npx vitest run src/labs/spreadsheet-lab` | after any Spreadsheet Lab change |
| `npx vite-node src/labs/data-science-studio/tools/browser-check.mjs <out> --write fn1,fn2` | the real browser (Part 5 on: the days and deliveries sheets, and Spearman typed into lesson 5.3's grid; Part 7 on: the trial sheet, lesson 7.7's CHISQ.TEST from COUNTIFS arrays and lesson 8.3's normal equations with MINVERSE typed into their grids): every lesson, chosen write blocks in Pyodide (pandas included), every D3 block (the solution pasted, drawn, checked), a formula typed into the embedded grid, its steps, folding and copying the table, the Spreadsheet Lab button and its lesson list, the catalogue and returns sheets and a cross-sheet formula, a histogram's bin rule and its D3 code in the Spreadsheet Lab; a screenshot of every lesson, figure and D3 block; starts and stops its own server (over 10 minutes since Part 10, with every SQL block run in the page: run it in the background, not under a 10-minute tool limit); Part 10 on: every SQL block’s starter (must not pass) and query (must) |
| `npm run facts`, `npm run catalog:check`, `npm run typecheck`, `npm run build` | before committing |

## Learned the hard way

- **Heredoc and inline-Python edits turn a typed backslash-n into a real line break** (again, in `make_parity.py`’s fingerprint test): build such strings with `chr(10)` or `String.fromCharCode(10)`, or use the Edit tool.
- **Lesson ids are unique across all parts**: Part 10’s first draft reused `group-by` (Part 2’s lesson 2.8), and the only symptom was a “links only to earlier lessons” failure. Grep the ids before naming a lesson.
- **The Real Python stepper shows at most 32 items of a list** (`aarcade_stepper.py`’s `summarise`): a program whose answer is longer comes back cut short. Keep program inputs under 32 results.
- **A single cell was not a reference in the Spreadsheet Lab** (OFFSET, ROW, COLUMN): fixed with `refs`. Any new function that needs a reference rather than a value should list its position in `refs`.
- **SQL answers from a by-hand engine must follow SQLite’s rules exactly**: AVG and SUM skip NULL, SUM of nothing is NULL, GROUP BY sorts NULL first, text compares by code unit, and a window AVG near the start averages the rows it has (Part 9’s moving average waits for a full window). `parity.test.js` checks these against Python’s `sqlite3`.
- **The orders in Part 7’s and later lessons are the cleaned ones** (400 rows, not the raw 402): a number measured on the raw table can differ (orders per day’s MAE moved from 0.704 to 0.697). Measure with the same table the lesson uses.
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
- **`str(float)` in Python writes `14.0`; `String(14)` in JavaScript writes `14`.** Generated text must come from one formatting function (`tenths`), never from printing a float.
- **Dates on a sheet are dates, not text**: `days!A2:A366<>"2025-02-11"` compares a date serial with text and matches nothing. Filter by a number instead (`days!E2:E366<9000` leaves out the news day).
- **A new table for a new part**: putting the confounder in a new table (days, deliveries) kept every earlier number. Tune a generator's **probabilities**, never hunt for a lucky seed, and write the truth down (`ON_TIME`, the docstring rules).
- **A write block's starter must fail on its cases**: with the news day in, `spearman`'s starter (Pearson) gives 0.187 against 0.924, so including `[H, V]` in the cases guarantees it.
- **Check every causal sentence by measurement before writing it.** Two plausible explanations in drafts were wrong when measured: the partial r of −0.10 is chance (bootstrap −0.21 to 0.00), not rain; and the between-items share of the price variance is 99.6%, not the 93% first written. The slope of 24.3 against the true 22 *is* the rain: adding its riders back gives 22.23. The lesson now shows that measurement.
- **A raw degree-9 polynomial's normal equations can't be solved in floats** (`solve` returns None: a pivot under 1e-12 of the scale). Put each power column in standard units first (`scaledPowers`, with the training rows' means and sds).
- **Python's `max(range, key=)` and a JavaScript loop can break ties differently.** Code that must match writes the loop out (`solve`'s pivot: the first largest).
- **Excel's T.DIST.2T cuts the degrees of freedom to a whole number; the Spreadsheet Lab's doesn't.** Lesson formulas use whole degrees of freedom; Welch's fractional ones go to `t_two_sided`.
- **A chi-squared of 64 has a tail of 10⁻¹⁵, and 1 − normal_cdf rounds it to 0.** The lesson says so rather than printing "p = 0".
- **MDETERM of the dummy trap's XᵀX is 0.022, not 0** (rounding, against entries in the hundreds): don't use a determinant to test for the trap; `solve`'s pivot check does it.
- **A probe that never ends may be the shell, not the code:** a stray `cat > file` with no input waits on stdin for ever. Probe formulas one at a time with `vite-node` (it prints as it goes; vitest holds console output until a test ends).
- **`datasets.test.js` opens a fresh workbook for every lesson exercise**, all sheets included: with Parts 7–8 it passed 5 seconds, vitest's default limit, so it now has 60 (like the tries test beside it). Each new part adds exercises and sheets: expect it to grow.
- **One test can't make a claim about chance**: lesson 7.7's "this year is a fluke" is backed by the dispersion of 300 other generated years, counted in the lesson (`lowYears`), each seed drawn from one generator.
- **The browser check's D3 screenshots** run past the lab window into the app behind it; that is the screenshot, not the page.
