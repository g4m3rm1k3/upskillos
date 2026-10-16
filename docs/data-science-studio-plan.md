# Data Science Studio: plan

Status (2026-10-15): Parts 1 and 2 are built (`src/labs/data-science-studio/`, 15 lessons), and the lessons' spreadsheet exercises now run inside the real Spreadsheet Lab (see the handoff). Next: Parts 3 and 4, building in the Spreadsheet Lab first anything a spreadsheet user could use. Each session starts from the handoff, `docs/data-science-studio-handoff.md`. The owner's direction: this is the deepest of the labs, because data science feeds so many branches (machine learning, statistics, visualisation, databases, every lab that trains on data). It teaches each idea in a spreadsheet, in Python by hand, in pandas and, for charts, in D3, and it uses and improves the Spreadsheet Lab.

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

## How it is built: two parts per session

The owner's working rule: build two parts per session, then update the handoff (`docs/data-science-studio-handoff.md`) and clear the chat. The checking scripts live in the lab's `tools/` folder, so each session reuses them instead of writing them again.

## Constraints

- **pandas versions.** The page's Python (Pyodide 0.29) bundles pandas 2.x; the authoring machine has pandas 3.0. Lessons use only behaviour that is the same in both, and the checks compare plain values, not printed tables.
- **The desktop stepper's environment** (A-Arcade Python's) has NumPy and PyTorch but not pandas, so Real Python programs step through plain-Python functions only.
- **One heavy job at a time**, with small sizes: the owner's PC must never freeze.
- Lesson ids are progress keys: never change one.
