# Data Science Studio: plan

Status (2026-10-16): Parts 1 to 4 are built (`src/labs/data-science-studio/`, 34 lessons): Part 3 (cleaning and joining, 10 lessons) and Part 4 (charts with D3, 9 lessons) on 2026-10-16, with a new block kind for drawing with D3. The Spreadsheet Lab gained what they needed: LEVENSHTEIN, lookups of many values at once, the shop's catalogue and returns sheets, histogram bin rules, and "This chart in D3". Next: Parts 5 and 6. Each session starts from the handoff, `docs/data-science-studio-handoff.md`. The owner's direction: this is the deepest of the labs, because data science feeds so many branches (machine learning, statistics, visualisation, databases, every lab that trains on data). It teaches each idea in a spreadsheet, in Python by hand, in pandas and, for charts, in D3, and it uses and improves the Spreadsheet Lab.

A lab in the format of NLP Studio, QMaze and Math for ML: the intuition and the ins and outs of working with data, for anyone who wants to understand it, and the data skills machine learning rests on. It is open source, so it is written for every learner, not only the owner.

## How it relates to what already exists

| What | Format | Relationship |
|---|---|---|
| Data Science course (`src/courses/data-science/`, 42 pages) | notebook lessons | source material: explanations and worked examples to draw on, not rebuilt |
| Data Science on the Web (`src/labs/web-data-science/`) | JavaScript and D3 | the same field from the charting side |
| Frontier, Applied ML (Project Studio) | the code-based deep dive | where a learner goes to build it all in their own project. Overlap is intended: this lab gives the understanding, Project Studio the full build |

## The bar (the same as NLP Studio's)

- **You write the code.** Every lesson has at least one "Write it yourself" block: a plain-Python function, run in real Python in the page (Pyodide) and checked call by call. Tests prove the lab's own answer passes and the starter fails.
- **You derive the maths.** Every formula (the mean, the variance, the standard error, least squares, the correlation) is worked out one typed step at a time (ML Lab's Derivation).
- **You see it run.** Figures run the same functions in the page on the lab's data and on yours. On the desktop, the Real Python tab steps through the lab's Python one line at a time.
- **By hand first, then the tool.** Each idea is written in plain Python first; then pandas does the same thing, and the lesson shows they agree.
- **Nothing claimed without a measurement.** Numbers quoted in a lesson come from the engine (checked by the tests) or were measured when the lesson was written, and say so.

## Four ways to see each idea

Data science is done in spreadsheets, in Python and in the browser, and a learner should be able to move between them. Where it fits, a lesson shows the same idea four ways, in this order:

| Lens | What the learner does | Checked by |
|---|---|---|
| **Spreadsheet** | types the formula (`=AVERAGE(E2:E403)`, `=COUNTIFS(…)`, a pivot table) | the Spreadsheet Lab's own formula engine, run headless in the lesson; its step-by-step formula explanation (`explainFormula`) shows how the value was reached |
| **Python by hand** | writes the function in plain Python | real Python in the page (Pyodide), call by call |
| **pandas** | writes it again with the library, in a line or two | real Python with pandas, and the result must equal the hand-written one |
| **D3** (charts) | builds the chart in JavaScript: scales, axes, the data join | the chart's elements and positions, checked in the page |

The hand-written version always comes first: the spreadsheet and the libraries are then seen as fast, tested versions of something the learner already understands.

## Using and improving the Spreadsheet Lab

The Spreadsheet Lab (`src/labs/spreadsheet-lab/`) is a working spreadsheet with Excel's formulas, pivot tables, charts, CSV import and Python cells. This lab uses it two ways:

- **Inside a lesson**: a new block kind, `formula`, holds a small sheet of the shop's data; the learner types a formula, the Spreadsheet Lab's engine (`engine/workbook.js`, without its grid) works it out, and the lesson checks the value and shows the engine's explanation of each step.
- **As the full tool**: an "Open in the Spreadsheet Lab" button opens the lab beside the lesson (`useOpenLab`) on the shop's orders, with the lesson's formulas, chart or pivot table already set up as a dataset "try".

What the Spreadsheet Lab needs for that, added as the parts need it, each with its own tests:
1. The shop's orders as one of its datasets (`datasets/index.js`), with tries for each lesson.
2. A deep link (`?dataset=…&try=…`) so a lesson can open it on a dataset and run a try.
3. Whatever functions or features the lessons find missing, fixed in the Spreadsheet Lab itself so every user of it gains.

## D3

The charts are taught in D3 (already a dependency, and the library behind most data graphics on the web): a scale is a function from data to pixels, an axis is drawn from a scale, and the data join matches rows to marks. Data Science on the Web (`src/labs/web-data-science/`) teaches D3 at length in its own format; this lab teaches the parts each chart needs, next to the data idea, and links there for more. Its JavaScript runtime and checker are the model for this lab's D3 write blocks.

## Real Python: following the variables

The owner found the variables hard to follow in other labs' Real Python tabs: the middle panel lists every local as text, in an order that changes from line to line. This lab's tab fixes that, and the fix can then go back to the other labs:
- **What changed is marked**: each variable that changed on the last line is highlighted, with its value before and after.
- **A fixed order**: the variables the lesson is about come first, always in the same place; the rest follow.
- **Pictures for the main ones**: the CSV line with the current character marked and the fields filling in; the sorted list with the row being moved; a column with the current row marked.

## The running dataset: the shop's orders

One year of orders from the bike shop of NLP Studio (`python/data.py`, mirrored by `engine/data.js`, parity-tested). A seeded generator builds it, so the page and Python have exactly the same table, and **we know the truth behind it**: which effects are real, how big they are, and which flaws were put in. That makes the statistics lessons honest: a test's answer can be checked against the truth.

Flaws, each put in for a lesson to find: item names with commas (CSV quoting), missing prices, inconsistent town names, duplicated rows, an outlier typed in pence instead of pounds, customer ids that don't join, and later a confounder (Simpson's paradox) and a column that leaks the answer.

Prices are whole pence, written out as pounds by integer arithmetic, so the two languages print the same text.

## Outline: everything taught, part by part

Each part lists the **maths** derived (step by step, in a Derivation block), the **algorithms** written by hand (and stepped through in Real Python), and the **concepts** explained. A part is planned lesson by lesson before it is built; Parts 1 and 2 are below. Every part ends with a short project on the shop's data.

### 1 · Tables by hand
- **Maths:** counting (cells = rows × columns); how a computer stores a number (binary, why 0.1 + 0.2 ≠ 0.3, why money is kept in whole pence); boolean logic (and, or, not; De Morgan's laws); the cost of an algorithm in steps (big-O, counted, then measured).
- **Algorithms:** a CSV reader as a state machine (quotes, doubled quotes); filtering with a predicate; insertion sort and merge sort, written and timed; stable sorting and sorting by several keys.
- **Concepts:** rows, columns, records, fields, schema; text vs numbers vs missing; row storage vs column storage; vectorised operations; the spreadsheet, plain Python and pandas as three views of one table.

### 2 · Summing it up
- **Maths:** sigma notation; the mean derived as the number that minimises squared error, the median as the one that minimises absolute error; variance and standard deviation; why the sample variance divides by n − 1 (Bessel's correction, simulated, then derived); quantiles and the interpolation rule spreadsheets and pandas use; z-scores; the IQR and MAD.
- **Algorithms:** the running mean and Welford's running variance (one pass, numerically stable, compared with the shortcut formula on large numbers); quickselect for the median (about 2n steps on average, not n log n); counting with a dictionary (hashing); group-by as split–apply–combine; a pivot table from two keys.
- **Concepts:** location, spread and shape; robust vs sensitive statistics; outliers found (the price typed in pence) and what to do with them; aggregation loses information.

### 3 · Cleaning and joining
- **Maths:** how filling missing values changes the mean and shrinks the variance (derived); missing completely at random, at random, not at random, each simulated; edit distance derived by dynamic programming.
- **Algorithms:** normalising text (case, spaces, Unicode); Levenshtein distance; deduplication by key and by fuzzy match; joins three ways (nested loop, hash join, sort-merge join), each counted; reshaping between wide and long.
- **Concepts:** tidy data; primary and foreign keys; join cardinality and the join that multiplies rows; anti-joins to find what doesn't match; validation rules.

### 4 · Charts with D3
- **Maths:** linear, log and square-root scales as functions (domain to range) and their inverses; why area must be proportional to the value; bin-width rules (Sturges, Freedman–Diaconis); kernel density estimates; colour as a scale.
- **Algorithms:** the data join (enter, update, exit); "nice" tick generation; binning; drawing an axis from a scale.
- **Concepts:** marks and channels (position, length, area, colour); choosing a chart for a question; charts that mislead (truncated axes, area, dual axes), each reproduced; small multiples.

### 5 · Looking for patterns
- **Maths:** covariance and Pearson correlation derived, and their link to the cosine of two centred columns; Spearman rank correlation; the regression line from the correlation; what a log transform does to a relationship.
- **Algorithms:** ranking with ties; a correlation matrix; jitter and transparency for overplotting.
- **Concepts:** Anscombe's quartet; Simpson's paradox in the shop's data (a confounder put in on purpose); correlation is not causation; confounders, colliders and selection bias, each simulated.

### 6 · Samples and uncertainty
- **Maths:** probability and distributions (Bernoulli, binomial, normal, Poisson); the expectation and variance of a sum; the standard error of the mean derived (σ/√n); the central limit theorem shown, and where it fails (heavy tails); confidence intervals and what "95%" means (coverage, simulated).
- **Algorithms:** sampling with and without replacement; reservoir sampling; stratified sampling; the bootstrap by hand.
- **Concepts:** population, sample, statistic, parameter; sampling bias; the sampling distribution; the uncertainty in every number computed so far.

### 7 · Is the difference real?
- **Maths:** the null hypothesis; the permutation test's p-value; the two-sample t statistic derived; the t distribution vs the normal; effect size; type I and II errors; power and sample size derived; many tests at once (Bonferroni, Benjamini–Hochberg); chi-squared for counts.
- **Algorithms:** the permutation test; a power calculator by simulation; Benjamini–Hochberg.
- **Concepts:** an A/B test on the shop's website, designed, run and read; what a p-value is and isn't; peeking and stopping early; practical vs statistical significance.

### 8 · Models from data
- **Maths:** least squares derived (the normal equations, one feature, then in matrix form); R² and residuals; gradient descent on the same loss; one-hot encoding and the dummy-variable trap; standardising; ridge regularisation derived; logistic regression and log loss; the bias–variance trade-off.
- **Algorithms:** Gaussian elimination for the normal equations; gradient descent; k-fold cross-validation; a split that respects groups.
- **Concepts:** a model as a function fitted to data; interpreting coefficients; extrapolation; data leakage found in the shop's data; overfitting measured.

### 9 · Time and forecasting
- **Maths:** moving averages and exponential smoothing; trend and seasonality; autocorrelation; MAE, RMSE and MAPE and their trade-offs.
- **Algorithms:** date arithmetic and resampling; a moving average with a running sum; Holt's method; walk-forward validation.
- **Concepts:** time order is information; never shuffle time; the naive forecast every model must beat; the shop's seasonality (put in on purpose).

### 10 · Databases and SQL
- **Maths:** relational algebra (selection, projection, join) as set operations; why a B-tree keeps search at log n.
- **Algorithms:** a tiny query engine (scan, filter, group, join) by hand; a sorted index and binary search; the plan for a join.
- **Concepts:** the shop's tables in SQLite (Pyodide's standard library); SELECT, WHERE, GROUP BY, HAVING, JOIN, subqueries and window functions, each next to the spreadsheet, plain Python and pandas; normalisation; transactions.

### 11 · Data for machine learning
- **Maths:** class imbalance and what accuracy hides (precision, recall, F1); target encoding and its leak; scaling's effect on distances and gradients; text as counts (TF-IDF, from NLP Studio).
- **Algorithms:** a preprocessing pipeline fitted on the training data only; stratified k-fold; feature hashing.
- **Concepts:** features from dates, text and categories; the other labs' datasets (NLP Studio, QMaze, Math for ML) as tables; datasheets for datasets.

### 12 · Telling the story
- **Maths:** showing uncertainty (error bars, intervals, fan charts); absolute vs relative risk.
- **Algorithms:** a D3 dashboard with linked views and filters.
- **Concepts:** the analysis workflow; reproducibility; the capstone: a full analysis of the shop's year, from raw CSV to a recommendation.

Parts 4, 10 and 11 may each grow into two parts when planned in detail.

## Part 1 as built: Tables by hand

| Lesson | Teaches | You write | You derive | Figure, spreadsheet, Real Python |
|---|---|---|---|---|
| 1.1 A table is a list of rows | rows, columns, fields, schema; a row as a dictionary, a column as a list | `column`, `count_values` | cells = rows × columns | TableView (rows, columns, sheet); `=COUNTIF` |
| 1.2 Reading a CSV by hand | the CSV format; why splitting on commas fails; a state machine | `split_csv_line` | fields in a line with quoted commas | CsvScanner; Real Python `split_csv_line` |
| 1.3 Numbers inside a computer | text vs numbers; binary fractions; 0.1 + 0.2; money in whole pence | `to_pence` | 0.1 in binary; the error from summing prices in floats | FloatExplorer |
| 1.4 Missing values | empty vs zero vs unknown; None; what skipping does to a mean | `to_number`, `mean_of` | the mean with blanks skipped vs counted as 0 | MissingDemo; `=AVERAGE` vs `=SUM/COUNTA`; Real Python `mean_of` |
| 1.5 Filtering | predicates; and, or, not; De Morgan; case and spaces in text | `rows_where`, `where_all` | De Morgan's laws by truth table | QueryBuilder; `=COUNTIFS` ignores case, Python doesn't |
| 1.6 Sorting | insertion sort; merge sort; stability; text vs numbers; n² vs n log n | `sort_by`, `merge_sorted` | comparisons for insertion sort and merge sort | SortRace; Real Python `sort_by`, `merge_sort` |
| 1.7 Columns, not rows: pandas | column storage; vectorisation; boolean masks; one answer three ways | `big_orders` (pandas) | a mask's sum is a count, its mean a fraction | RowsVsColumns (measured speeds) |

## Part 2 as built: Summing it up

| Lesson | Teaches | You write | You derive | Figure, spreadsheet, Real Python |
|---|---|---|---|---|
| 2.1 The mean | sigma notation; the balance point; the minimiser of squared error | `mean`, `running_mean` | d/dc Σ(xᵢ − c)² = 0 gives c = the mean | BalancePoint; `=AVERAGE` |
| 2.2 The median and quantiles | the minimiser of absolute error; quantiles; the interpolation rule | `median`, `quantile` | why the median ignores how far out the outliers are | QuantileExplorer; `=MEDIAN`, `=PERCENTILE.INC` |
| 2.3 Quickselect | the k-th smallest without sorting | `quickselect` | average steps n + n/2 + n/4 + … ≈ 2n | Real Python `quickselect` |
| 2.4 Spread | variance and standard deviation; why squares; n − 1 | `variance` | the expected sample variance with n and with n − 1 | SpreadExplorer, BesselSimulator; `=VAR.S` vs `=VAR.P` |
| 2.5 One pass: Welford | running variance; cancellation in the shortcut formula | `welford` | Welford's update from the definitions | CancellationDemo; Real Python `welford` |
| 2.6 Outliers and robust statistics | z-scores, the IQR rule, MAD; the price typed in pence found | `iqr_outliers` | the IQR fences; the largest z-score possible in n values | OutlierFinder |
| 2.7 Group-by | split–apply–combine; a dictionary of lists (hashing) | `group_by`, `aggregate` | – | GroupBy; `=SUMIFS`, `=AVERAGEIFS`; Real Python `group_by` |
| 2.8 Pivot tables | two keys; totals; what aggregation hides | `pivot` | row and column totals add up to the grand total | PivotBuilder; the Spreadsheet Lab's pivot table |

Measured or found while building Parts 1 and 2, and taught in the lessons:
- Adding the 384 prices as floats gives £28,023.729999999985; in whole pence, exactly £28,023.73 (1.3).
- `=COUNTIFS` counts 51 orders from Leeds on the web where Python's exact match counts 49: spreadsheets ignore capitals (1.5).
- On 100,000 orders, counting with a pandas mask took 0.23 ms against 5.2 ms for a Python loop; listing the matching ids, 4.2 ms against 5.1 ms (1.7).
- The shortcut variance formula returns −170.7 for values near a billion whose variance is 30; Welford returns 30 (2.5).
- The IQR rule over all prices flags 30 values (bikes); within lights alone it flags exactly the two prices typed in pence (2.6).
- Every spreadsheet function the lessons use (AVERAGE, MEDIAN, PERCENTILE.INC, VAR.S, SUMIFS, GROUPBY, PIVOTBY and more) agrees with the lab's Python.

## Part 3 as built: Cleaning and joining

Part 1 and 2 found the flaws; Part 3 fixes them, and then redoes the counts the earlier lessons promised to redo (the 49 Leeds web orders of 1.5, the lights' mean of 2.2, the outliers of 2.6, the 402 rows). Two small tables join the orders, both made by the generator so the truth behind them is known:
- **catalogue** (`item, category, list_price`): the six items sold, plus a pump the shop stocks and never sold. One row per item: `item` is its primary key.
- **returns** (`return_id, order_id, item, reason`): the shop's returns form, typed by customers. Order ids come in lower case or with spaces, a few name orders that don't exist, one order is returned twice, and the item names have typing mistakes. The generator keeps which order each return really belongs to.

Spreadsheet Lab first: a `LEVENSHTEIN(text1, text2, [ignore_case])` function (Text category, with tests; it isn't an Excel function, and its help says so), and the shop's dataset opening its `catalogue` and `returns` sheets beside the orders, so the lessons' XLOOKUP and FILTER formulas work the same in the lesson and in the lab. Building the joins found a real gap: XLOOKUP, XMATCH and MATCH gave #N/A for a range of lookup values, where Excel gives one result per value; fixed in the Spreadsheet Lab, with tests.

| Lesson | Teaches | You write | You derive | Figure, spreadsheet, Real Python |
|---|---|---|---|---|
| 3.1 Cleaning text | case, spaces, Unicode (é two ways, NFC); a cleaning rule as a function; the 1.5 count redone | `normalise`, `clean_town` | how many spellings each fix removes | TextCleaner (each fix switched on and off, the town counts); `=PROPER(TRIM(C2))` then COUNTIFS |
| 3.2 Rules for valid rows | a validation rule as a predicate; every row against every rule; the pence typos found by the catalogue's price and fixed | `check_rows`, `fix_pence` | on a log scale a price typed in pence is 2 away from its list price | RuleChecker; `=XLOOKUP` the list price, flag the ratio |
| 3.3 Duplicates | a key; seen-set deduplication (hashing again); same key with different data; pairwise vs one pass | `dedupe` | comparisons for checking every pair: n(n − 1)/2 | DuplicateFinder; `=COUNTIF(A$2:A$403,A2)>1`, `=ROWS(UNIQUE(…))`; Real Python `dedupe` |
| 3.4 Edit distance | insert, delete, substitute; the recurrence; dynamic programming as a filled table; cost (m + 1)(n + 1) cells | `edit_distance` | the recurrence from the three last moves; the distance of a swap (2, not 1) | EditTable (fill it cell by cell, follow the path back); `=LEVENSHTEIN`; Real Python `edit_distance` |
| 3.5 Fuzzy matching | nearest match in a list; a threshold relative to length; matches that are wrong (lock and look) | `closest` | why a fixed threshold fails for short words | FuzzyMatcher (threshold slider, right and wrong matches against the truth); `=LEVENSHTEIN` over a range with XMATCH and MIN |
| 3.6 Filling the gaps | drop or fill; filling with the mean keeps the mean and shrinks the variance; MCAR, MAR, MNAR simulated with the truth known; filling within groups | `fill_missing`, `fill_by_group` | the variance after filling with the mean: s²(nₒ − 1)/(n − 1) | MissingnessLab (three mechanisms, each method's error against the truth); `=IF(E2="",AVERAGEIF(…),E2)` |
| 3.7 Joins three ways | keys, primary and foreign; nested loop, hash join, sort-merge join, each counted | `hash_join` | comparisons: n·m, n + m, n log n + m log m + n + m | JoinRace (the three counted on the same tables); `=XLOOKUP` the category; pandas `merge` |
| 3.8 What a join does to rows | one-to-one, one-to-many, many-to-many; the join that counts an order twice; left joins and anti-joins; normalised keys before joining | `left_join`, `anti_join` | rows out of a join: Σ over keys of (left count × right count) | Cardinality (pick tables, see rows multiply); `=FILTER` with `ISNA(XMATCH(…))`; pandas `validate=` and `indicator=` |
| 3.9 Tidy data, wide and long | one row per observation; wide to long (melt) and back (pivot, 2.8) | `to_long` | a wide table of r rows × c value columns is r·c long rows | WideLong (switch the shape, the same numbers); pandas `melt` |
| 3.10 Project: the clean year | the cleaning steps in order, and why the order matters; every earlier count redone | `clean_orders` | – | CleanReport (each count before and after); pandas pipeline |

## Part 4 as built: Charts with D3

Every chart is drawn from the clean orders of Part 3. The maths (scales, ticks, bins, densities, colour) is written by hand in Python first (`python/charts.py`, held to `engine/charts.js` by parity), and held to the Spreadsheet Lab's chart engine where it has the same thing (`niceTicks`, `histogramBins`). Then the learner draws the chart with D3.

**The new block kind, `chart`** (modelled on Data Science on the Web's runtime and checker): the learner writes JavaScript that draws into an SVG with `d3`, `svg`, `data`, `width` and `height` given. The answer key is the lab's own solution, run the same way (nothing written twice). The check compares the marks: for each selector the block names (`rect`, `circle`, `.tick text`…), the number of elements and the chosen attributes (positions to within half a pixel, text exactly). A block can run the code more than once on new data (`runs`) and check that marks for kept keys are the same elements (the data join). Tests prove the solution passes, the starter fails, and the solution's marks agree with the maths in `engine/charts.js`.

Spreadsheet Lab first:
- **Bin rules** for its histograms: Scott (Excel's default, as now), Sturges and Freedman–Diaconis, chosen in the chart panel; `histogramBins` takes the rule; tests.
- **This chart in D3**: the chart panel shows the D3 code that draws the selected chart (column, bar, line, scatter, histogram), ready to copy, like "This formula in code" does for formulas; tests run the generated code and count its marks. The lessons point to it: build a chart in the spreadsheet, read its D3.

| Lesson | Teaches | You write | You derive | Figure, spreadsheet, D3 |
|---|---|---|---|---|
| 4.1 A chart is a function | marks and channels; a scale maps a domain to a range; position is read best, area and colour worst (Cleveland and McGill) | `linear_scale`, D3: bars of orders per town | the scale's formula, and its inverse | ScaleExplorer; `=COUNTIF` for each bar; D3 `scaleLinear`, `scaleBand` |
| 4.2 The data join | enter, update, exit; keys keep each mark with its datum | D3: a join keyed by town, drawn twice | – | JoinStepper (data changes, marks enter, move, leave) |
| 4.3 Ticks and axes | a nice step is 1, 2 or 5 × 10ᵏ (the spreadsheet adds 2.5); an axis is drawn from a scale | `nice_step`, `nice_ticks`; D3: an axis | the step for a span and a tick count | TickExplorer (D3’s ticks against the spreadsheet’s) |
| 4.4 Histograms and bin widths | binning; Sturges, Scott, Freedman–Diaconis; a bin's count against its width | `histogram`, `sturges`, `freedman_diaconis`; D3: a histogram | Sturges’ rule from the binomial; why the widths shrink like n^(−1/3) | BinExplorer; `=FREQUENCY`; the Spreadsheet Lab’s bin rules |
| 4.5 Log and square-root scales | multiplying as adding; a circle’s value is its area | `log_scale`, `radius_for`; D3: price bubbles | why the radius goes with √value; the inverse of a log scale | AreaLie (radius vs area) |
| 4.6 Densities | a kernel density estimate; the bandwidth (Silverman’s rule) | `kde`; D3: a density line | the KDE integrates to 1 | KdeExplorer (bandwidth slider) |
| 4.7 Colour as a scale | categorical, sequential, diverging; mixing colours; lightness | `mix`; D3: a heat map of orders by town and month | linear interpolation between two colours | ColourScales |
| 4.8 Charts that mislead | the truncated axis, the area trick, the dual axis, each reproduced; Tufte’s lie factor | `lie_factor`; D3: the honest axis | the lie factor of a truncated bar chart | Misleading (three charts and their fixes) |
| 4.9 Project: small multiples | one panel per town on shared scales; why shared | D3: small multiples | – | the shop’s months per town |

Measured or found while building Parts 3 and 4, and taught in the lessons:
- The town column has 11 spellings: trimming leaves 8, lower case 4 (3.1). Cleaned, Python counts 51 Leeds web orders, as COUNTIFS did; the spreadsheet ignores capitals but not spaces (COUNTIF "Leeds" 111, cleaned 114).
- `check_rows` reports 27 problems: 25 towns and the 2 prices typed in pence, found by their shape alone (3.2). Read as pounds, "2375" is 95 times its list price: log₁₀ 1.98, against at most 0.04 for a real price, so "more than ten times" is the halfway line.
- 402 rows, 400 orders: A1018 and A1234 were entered twice, identically (3.3).
- `closest` reads every one of the 25 items typed on the returns form as the item really returned (checked against the generator's truth); "Look" matches Lock at distance 1, "Pmup" matches nothing (3.5).
- Hiding 20% of the true prices, averaged over the lesson's 400 repeats: MCAR leaves the mean unbiased (+£0.08); MAR (bikes lost 3×) makes it £14.60 too low, and filling within each item brings that to £0.00; MNAR stays too low (−£2.00, and −£0.76 filled by item). Filling with the mean keeps 80% of the variance, the derived (m − 1)/(n − 1) (3.6). The generator's first draws for seeds 1, 2, 3… are nearly the same, so the experiment runs one generator through every repeat.
- Joining 400 orders to 7 catalogue rows: 2,800 comparisons nested, 407 steps hashed, 3,618 sort-merge (2,802 of them sorting) (3.7). Kit took £19,248.20 on the raw sheet and £14,273.45 clean.
- 3 returns name no order (8 if the keys aren't cleaned; 5 in the spreadsheet without TRIM). A left join of the orders to the returns gives 402 rows: A1086 and A1208 were returned twice. Of the two swapped order ids, a check after the join catches R01 (a helmet against a lock order); R22 lands on another service order and nothing in the data can find it (3.8).
- Clean: the lights' mean £25.17 (raw £82.15), the IQR rule flags 0 lights (raw 2), takings £32,778.19 (raw £37,790.54) (3.10).
- `nice_ticks` gives exactly `d3.ticks` on 1,000 random ranges; for 0 to 114 in about 5, D3 steps by 20 and the Spreadsheet Lab by 25 (4.3).
- Over all 382 prices, Scott's bins are £53.83 wide and Freedman–Diaconis' £4.96: the bikes inflate the standard deviation, not the IQR (4.4).
- The density of the lights' prices (Silverman's h = 0.60) has area 1.000000 by 2,000 strips (4.6). A bar chart of Harrogate against Leeds with its axis from 80 has a lie factor of 12.4 (4.8).

## Part 5 as built: Looking for patterns

Two columns at a time needs columns that move together, so the generator makes two new tables, with the truth behind them known and the orders untouched (`make_days`, `make_deliveries` in `python/data.py`):
- **days** (`date, high_c, rain_mm, riders, visits`), one row per day of 2025. The temperature follows the seasons; rain falls on more days in winter, skewed, with many dry days (ties for ranking). Riders on the cycle path: 300 + 22 per degree − 12 per mm of rain + 90 at weekends. Website visits are multiplied by e^0.05 per degree (5.13%) and by nothing else. So riders and visits move together **only** because the temperature drives both: a confounder, put in on purpose. On 11 February a news site linked to the shop: 9,412 visits, against 378 usual (`truth=` keeps it).
- **deliveries** (`order_id, courier, days, on_time`), one row per web order posted (services are booked, not posted). Northern has vans and takes 80% of far parcels (York, Harrogate) and 20% of near ones; far parcels are late more often (`ON_TIME`). The town is not in the table: the paradox appears only once the orders are joined (Part 3).

The random noise is twelve uniform draws added, minus 6 (`noise`): only additions, so both languages draw the same numbers, and lesson 6.5 shows why it is bell-shaped.

Spreadsheet Lab first: the shop dataset opens `days` and `deliveries` sheets beside the catalogue and returns, lists them, and has two new things to try (temperature, riders and visits; which courier is on time). Building lesson 5.3 found a gap: RANK.EQ and RANK.AVG ranked one value at a time and gave an error for a whole range, so Spearman's `=CORREL(RANK.AVG(B2:B366, B2:B366, 1), …)` failed; they now rank a range as Excel does, with tests. Every function the lessons use (CORREL, COVARIANCE.S, RANK.AVG, SLOPE, INTERCEPT, RSQ, the log slope with FILTER) is held to the Python by `engine/agree.test.js`.

| Lesson | Teaches | You write | You derive | Figure, spreadsheet, D3 |
|---|---|---|---|---|
| 5.1 Two columns at once | the scatter plot; covariance as the mean product of distances from the means; its sign by quadrants | `covariance`; D3: a scatter plot of riders by temperature | cov(x, x) = var(x); why the sign follows the quadrants | Quadrants (the rectangles of each point from the means); `=COVARIANCE.S` |
| 5.2 Correlation | r = cov / (sₓ s_y); units cancel; r as the cosine of the angle between the centred columns; −1 ≤ r ≤ 1 | `correlation`, `cosine` | r of standardised columns; why |r| ≤ 1 (cosine) | CorrelationShapes (clouds with r from −1 to 1); `=CORREL` |
| 5.3 Ranks and Spearman | ranking with ties (average ranks); Spearman as Pearson on ranks; the news day | `rank`, `spearman` | the shared rank of a run of ties: (i + j)/2 + 1 | RankTies; `=CORREL(RANK.AVG(…),RANK.AVG(…))`; Real Python `rank` |
| 5.4 The line from the correlation | the slope r·s_y/sₓ through the means; regression to the mean; R² = r² | `fit_line`, `residuals` | the line in standard units: ẑ_y = r·zₓ | LineFit (the line, its residuals); `=SLOPE`, `=INTERCEPT`, `=RSQ`; D3: the line on the scatter |
| 5.5 Anscombe's quartet | four sets, one summary; always plot | `describe_pair`; D3: the quartet as small multiples | – | Anscombe |
| 5.6 Logs straighten curves | a multiplying effect is a straight line on a log scale; the slope as a percentage per unit; the 5.13% recovered | `growth_per_unit` | log y = a + b x ⇒ y × e^b per step | LogStraightens; `=EXP(SLOPE(LN(…),…))-1` |
| 5.7 Too many dots | overplotting; transparency; jitter (seeded) | `jitter`; D3: jittered, transparent dots | the most jitter before levels mix: half the gap | Overplotting |
| 5.8 The correlation matrix | every pair at once; symmetric, 1 on the diagonal; a diverging heat map | `correlation_matrix`; D3: the heat map | k columns give k(k − 1)/2 pairs | `=CORREL` for one cell |
| 5.9 Simpson's paradox | a rate overall vs within groups; the overall rate is a weighted average; the confounder joined from the orders | `rate_by` | overall rate = Σ share_g × rate_g | Simpson (the weights moved); `=COUNTIFS` on the deliveries |
| 5.10 Project: not causation | confounders, colliders and selection bias, each simulated with the truth known; the partial correlation; riders and visits | `partial_correlation` | – | CausalSims (three worlds, three correlations) |

## Part 6 as built: Samples and uncertainty

The 400 clean orders (382 priced) are treated as the **population**: every parameter is known, so every interval can be checked. All sampling uses the generator of `data.py`, one generator per experiment (`python/samples.py`, held to `engine/samples.js` by parity).

Spreadsheet Lab first: no new functions are needed (COMBIN, BINOM.DIST, POISSON.DIST, NORM.S.INV, CONFIDENCE.NORM, STDEV.S, SKEW exist); every one the lessons use is held to the Python.

| Lesson | Teaches | You write | You derive | Figure, spreadsheet, D3 |
|---|---|---|---|---|
| 6.1 Population and sample | parameter vs statistic; sampling with and without replacement; a partial shuffle | `sample_without`, `sample_with` | P(a row is in a sample of k): k/n without, 1 − (1 − 1/n)^k with | SampleDrawer; `=COMBIN(400, 20)` |
| 6.2 Counting successes | Bernoulli and binomial; choosing k of n | `comb`, `binomial_pmf` | E = np and Var = np(1 − p) from n Bernoullis | BinomialExplorer (theory vs samples); `=BINOM.DIST` |
| 6.3 Counting events | the Poisson distribution as a binomial with many tries; orders per day | `poisson_pmf`, `orders_per_day`, `tally` | the binomial’s limit as n grows and p = λ/n | D3: observed days with the Poisson’s expected; `=POISSON.DIST` |
| 6.4 The standard error | the expectation and variance of a sum; the mean of n values varies as σ/√n, measured | `sample_means`, `standard_error` | Var(x̄) = σ²/n | SamplingDistribution; `=STDEV.S(…)/SQRT(COUNT(…))` |
| 6.5 The bell curve and its limits | the central limit theorem shown; the generator's noise as twelve uniforms; skewness; heavy tails, where it fails | `normal_pdf`, `skewness` | the variance of a uniform draw, 1/12 | CltExplorer; HeavyTail; `=SKEW`; D3: sample means with the bell curve |
| 6.6 Confidence intervals | mean ± 1.96 SE; what "95%" means: coverage, simulated against the known truth | `mean_interval`, `coverage` | 1.96 from the normal’s 97.5% point | CoverageRuns (100 intervals, the misses in red); `=CONFIDENCE.NORM`, `=NORM.S.INV` |
| 6.7 The bootstrap | resampling the sample; the percentile interval; an interval for the median, which has no formula | `bootstrap`, `percentile_interval` | – | BootstrapView; Real Python `bootstrap` |
| 6.8 Reservoir sampling | a fair sample of a stream of unknown length | `reservoir` | P(an item survives) = k/n, by induction | ReservoirRun; Real Python `reservoir` |
| 6.9 Strata and bias | stratified samples; why stratifying by item steadies the mean price; samples that are biased by how they were drawn | `stratified_sample` | the stratified mean as a weighted average | StrataLab (spread of means, simple vs stratified; the web-only sample) |
| 6.10 Project: every number has an error | bootstrap intervals for numbers from Parts 1–5; the deliveries paradox: which differences could be chance | `bootstrap_difference` | – | ErrorBars (each number with its interval) |

Measured or found while building Parts 5 and 6, and taught in the lessons:
- Temperature and riders: covariance 802.55, r = 0.870 (an angle of 29.6° between the centred columns, in 365 dimensions). In Fahrenheit the covariance is 1,444.60, r unchanged (5.1, 5.2).
- The news day: Pearson's r of temperature and visits falls from 0.915 to 0.187 with it; Spearman's from 0.933 to 0.924. The 196 dry days share rank 98.5 (5.3).
- The line: 24.34 riders per degree, though the generator adds 22: cold days are also wet, and the line can't tell the two apart; give each day back the riders its rain cost and the slope is 22.23. R² = r² = 0.756 (5.4).
- Anscombe's four sets all give r = 0.816 and y = 3 + 0.5x; Spearman's tells them apart (0.818, 0.691, 0.991, 0.5) (5.5).
- Visits per degree, from a line through log visits: 5.26% (the truth, e^0.05 − 1, is 5.13%; bootstrap 95% interval 5.03% to 5.49%). On an ordinary axis the residuals spread by 66.5 visits on days above 18 °C against 34.4 below 10 °C; on the log axis the two are alike (5.6, 6.10).
- 400 orders land on 16 spots of the quantity × item chart (5.7). Rain and visits correlate at −0.187 though rain never touches visits in the generator: winter is wetter (5.8).
- Simpson: Swift is on time 80.2% to Northern's 75.3%; Northern wins far towns (71.6% vs 37.5%) and near ones (92.9% vs 90.8%), because 83% of its parcels are far against Swift's 20% (5.9). The near-town edge has a bootstrap interval of −15.3 to +15.4 points; the far-town one, 7.9 to 57.7 (6.10).
- Riders and visits: r = 0.777, partial r given temperature −0.100, whose bootstrap interval (1,000 resamples of the days) runs from −0.21 to 0.00: chance. It isn't the curve of the visits: on log visits it is −0.1005. Selecting z > 1 in the collider world turns r = 0.04 into −0.50 (5.10).
- 400 draws with replacement gave 246 different orders (253 expected, 1 − 1/e of them) (6.1). The chance of 12 or more web orders in 20 is 0.168 (6.2). Orders per day: 108, 152, 75, 23, 6, 1 days with 0 to 5 orders, Poisson 122.0, 133.7, 73.3, 26.8, 7.3, 1.6 (6.3).
- The mean of 30 prices varies by £20.40 over 2,000 samples, against σ/√30 = £20.35 (6.4). The prices' skewness is 3.23; means of 30 still have 0.56 (0.59 predicted) (6.5).
- Coverage of the "95%" interval, all prices: 32.2% with samples of 5, 92.0% with 100; the lights: 90% with 10 (6.6).
- The bootstrap's standard error of the lights' mean is 0.1506 against the formula's 0.1505; the median's interval is £24.75 to £25.75 (6.7). A reservoir of 5 from 20 kept the first item 24.5% and the last 25.8% of 4,000 runs (6.8).
- Stratifying 40 orders by item cuts the spread of the mean price from £16.44 to £1.09: 99.6% of the prices' variance (12,419.7 £²) is between items, only 53.9 £² within them (6.9).

## How it is built: two parts per session

The owner's working rule: build two parts per session, then update the handoff (`docs/data-science-studio-handoff.md`) and clear the chat. The checking scripts live in the lab's `tools/` folder, so each session reuses them instead of writing them again.

## Constraints

- **pandas versions.** The page's Python (Pyodide 0.29) bundles pandas 2.x; the authoring machine has pandas 3.0. Lessons use only behaviour that is the same in both, and the checks compare plain values, not printed tables.
- **The desktop stepper's environment** (A-Arcade Python's) has NumPy and PyTorch but not pandas, so Real Python programs step through plain-Python functions only.
- **One heavy job at a time**, with small sizes: the owner's PC must never freeze.
- Lesson ids are progress keys: never change one.
