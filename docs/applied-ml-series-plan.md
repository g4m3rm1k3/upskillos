# Applied Machine Learning — From Zero to Real Tools

A Project Studio series (desktop app). It takes a learner who has never written a line of Python to building, testing and shipping machine-learning tools that a software team would actually use: a CI report, a flaky-test detector, a model that predicts when a test will blow its time budget, a bug-report triager, a risky-change warning, a latency anomaly detector. The mathematics, the code and the reasoning behind both are taught together, and **the learner types all of it**.

This file is the plan, the lesson standard and the status board for the `aml-*` tracks in `src/labs/project-studio/tracks/`. The series is registered in `src/labs/project-studio/series.js` (key `applied-ml`).

## Why this series exists

The Machine Learning Lab (`src/labs/ml-lab/`) and the ML notebooks (`src/tools/notebook-lab/series/ml/`) cover a great deal of material, but they are **passive**: the learner reads, presses Run on code someone else wrote, moves a slider, or types one number into a checkpoint. They never write the code, so they never find out whether they could. Adding more notebooks, or moving cells next to the paragraphs they illustrate, doesn't change that, because the format has no place where the learner produces anything.

Project Studio does: the editor is never filled for you, and **Check my work** runs real checks against the files in the learner's own folder. This series uses that, and uses the ML Lab and the notebooks as **source material** (explanations, worked numbers, figures), not as the place the learning happens.

The older series *Machine Learning — From Mathematics to Production* (`ml-*` tracks, `docs/ml-project-studio-curriculum.md`) stays. It is a faster route for someone who already writes Python. This series starts from nothing and goes deeper per idea.

## Who it is for

Someone who can use a computer and wants to apply machine learning in software development. No Python, no terminal, no statistics, no calculus, no linear algebra assumed. Each is taught at the moment a problem needs it.

By the end they can:

- write intermediate-to-advanced Python: modules, packages, classes, dataclasses, comprehensions, generators, decorators, context managers, type hints, tests, profiling;
- use pandas, NumPy, matplotlib, Streamlit, scikit-learn and PyTorch, **knowing what each computes**, because they built a small version first;
- explain and implement the mathematics behind the models they use: statistics, vectors, derivatives and gradients, probability, linear and logistic regression, trees, clustering, neural networks;
- take a real problem from their own work, decide whether ML helps at all, build the simplest thing that works, measure it honestly, and ship it as a tool other people use.

## The domain: data a software team already has

Every project uses data that software development produces anyway: CI test runs, git history, bug reports, server logs. That choice does two things:

1. The tools are **useful the day they're finished**. A flaky-test report or a "this change looks risky" warning is something a team would run.
2. From Chapter 4 the learner can point every tool at **their own repositories**, so the data stops being a supplied file and becomes theirs.

The supplied starting data is `ci_runs.csv`: 15 nightly CI runs of a small web shop's 6 tests (90 rows). It is made up, but each test tells a story the series uses:

| Test | Story | Used in |
|---|---|---|
| `test_login` | fast and stable | the baseline everything is compared with |
| `test_signup` | broken by a change for two runs, then fixed | a real failure versus a flaky one (0.4) |
| `test_search` | flaky: fails 3 of 15 runs, at random | the flaky-test detector (0.4, Ch 9) |
| `test_upload` | gets 0.35 s slower every run | the first model: when will it exceed its budget? (Ch 7) |
| `test_checkout` | slow but stable | "slow" isn't the same as "getting worse" |
| `test_export` | one 120-second timeout | why the mean lies and the median doesn't (0.3) |

Later chapters add larger files (thousands of runs, with crashes recorded as missing values), git history (the learner's own, via `git log --numstat`), bug-report text, and request-latency logs.

## The lesson standard

These rules apply to every lesson. Reviewers enforce them. They extend the rules the owner set for the spreadsheet series (`docs/spreadsheet-build-curriculum-improved.md`, Rules 1–13).

1. **The learner types everything.** No code is pasted or generated. Supplied files are only data, tests and fixtures, and the lesson says why each one is supplied.
2. **The smallest runnable example.** Each new idea gets its own small file (usually 3–15 lines) that runs on its own and prints something. The learner runs it in the terminal before reading about it. Larger programs are assembled from pieces already understood.
3. **Explanation between the code, not after it.** A step is: a problem, a small file, run it, then what happened and **how** (the mechanism, traced with real values), then **why** it's right and why the obvious alternative fails. A lesson never shows a large block and explains it afterwards.
4. **Complex logic is pulled out.** When a piece of logic is the hard part (the accumulator pattern, the running maximum, grouping with a dictionary, the chain rule, backpropagation), it gets its own section: a trace table of every variable at every step, and an invitation to step through it in **CodeLens** (🔬 Trace in CodeLens).
5. **Analogies come last.** First the code, then its logic in its own terms; then, only if it helps, *Picture it as…*, saying where the picture stops working.
6. **Predict before running.** Before a result that might surprise, a `predict` block asks the learner to commit. Wrong predictions point to the exact gap.
7. **Room to experiment.** Every lesson has a **Try it** section: specific changes to make, what to watch for, and why it happens. This is the part the ML Lab never offered. The learner breaks things on purpose and sees the real error.
8. **Your turn in every lesson.** At least one step shows no code, only what the program must do. It has checks that run the learner's program, a hint ladder, and wrong answers the walkthrough test proves the checks reject.
9. **Maths you explore, then maths you build.** An idea is first met in an interactive figure in the lesson panel (`figure` blocks, below), then implemented by the learner, and from Chapter 3 often turned into the learner's own interactive explorer in Streamlit or pygame. Notation comes **after** the code, as a compact way of writing what the learner has already computed.
10. **A library arrives when a problem needs it.** Nothing is "a pandas chapter". pandas arrives when the hand-written grouping code has become painful; NumPy when a loop is measured to be slow; scikit-learn after the learner has written the model. Every library lesson has a test proving the library agrees with the learner's own code, and finds at least one place it differs for a reason worth knowing.
11. **Real errors.** Where the real tool produces an error, the lesson uses it, shows the traceback, and teaches how to read it.
12. **Define before use, with the term people search for.** Every new term gets its precise definition first.
13. **Python grows with the problems.** Intermediate and advanced Python is introduced when it makes the code better, never as a topic on its own (see *Python along the way*).

## Interactive mathematics

Two complementary kinds.

**Figures in the lesson panel.** A `figure` fence places an interactive figure between paragraphs:

````text
```figure
name: aml/MeanMedianOutlier
caption: Drag the slowest run. The mean follows it; the median doesn't.
props: {"values": [4.1, 4.1, 3.8, 4.0, 4.3]}
```
````

`name` is `<module>/<export>`. `aml/...` names this series' own figures (`src/labs/project-studio/figures/aml.jsx`), built from the ML Lab's figure kit (`src/labs/ml-lab/kit/fig.jsx`) and drawn with the lesson's own numbers. `ml-lab/<lab folder>/<export>` reuses any figure from the ML Lab (`src/labs/ml-lab/labs/<lab folder>/figures.jsx`). The figure modules load only when a step that shows one is opened. A test checks that every figure named in every lesson exists.

**Explorers the learner builds.** From Chapter 3 the learner writes their own small Streamlit apps (and, where motion helps, pygame programs) that make a piece of mathematics interactive: a percentile slider over their CI data, a histogram whose bin width they control, a line they drag to minimise a loss, gradient descent stepping down a surface. Typing the explorer is itself practice, and it stays in their project.

## CodeLens

The Python lessons' hard parts are stepped through in CodeLens with the **🔬 Trace in CodeLens** button, which traces the file open in the editor. Lessons say when to use it and what to watch (for example, "watch `total` in the variables pane: it changes once per pass of the loop"). CodeLens runs its own Python environment, not the project's `.venv` (see `codeLensHandoff.js`), so traces are used for pure-Python logic. Tracing code that imports pandas or NumPy needs those packages installed in CodeLens's environment through its Packages menu, and the lesson says so where it matters.

## Python along the way

| Python | First needed in | Because |
|---|---|---|
| values, names, `print`, arithmetic, f-strings | 0.2 | one test's timing |
| lists, `for`, `len`, indexing, `sorted` | 0.3 | fifteen timings |
| booleans, `if`/`elif`/`else`, `and`/`or` | 0.4 | pass or fail, slow or not |
| functions, `return`, `assert` | 0.5 | the same calculation for every test |
| dictionaries, files, `csv`, `str` → `float` | 0.6 | ninety rows from a file |
| `sys.argv`, a program other people run | 0.7 | the CI report tool |
| venv, pip, `sys.path`, modules, `if __name__ == "__main__"`, packages, `pyproject.toml`, editable installs, pytest (fixtures, `approx`, `raises`), `try`/`except`, custom exceptions, `enumerate`, stderr, exit codes | Ch 1 | the report grows past one file, needs tests, and must fail well |
| comprehensions, `lambda`, `key=` functions, tuples | Ch 2 | grouping and sorting by hand gets long |
| functions as values, decorators | Ch 3 | Streamlit's caching, and your own `@timed` |
| `subprocess`, generators, context managers, regex | Ch 4 | streaming your own git history |
| classes, `@dataclass`, `__repr__` | Ch 7 | your own `LinearModel` |
| abstract base classes, protocols | Ch 9 | every model shares `fit`/`predict` |
| operator overloading, `__add__`, `__mul__` | Ch 13 | a tiny autograd engine |
| type checking, packaging, logging, profiling | Ch 14 | shipping the toolkit |
| `async`, concurrency | Ch 15 | a model service that answers many requests |

## Chapter map

Folder names are the track keys (`aml-<name>`); lesson files are `<CC>-<LL>-<slug>.md`. File names are progress keys and are never renamed once published.

### Part I — Python and data from zero

| Ch | Track | Title and project | Maths | Sources to draw on |
|---|---|---|---|---|
| 0 | `aml-python` | **Python from Zero: a CI report.** `ci_report.py` reads the CI history and reports each test's runs, failures, mean, median and slowest run, flagging flaky and slow tests. | mean, median, outliers, rates, a threshold as the simplest decision rule | notebooks `python/numbers-and-variables`, `lists`, `for-loops`, `decisions`, `functions`, `dictionaries`, `files-and-text`, `debugging`; `ml/expectation-and-variance` |
| 1 | `aml-project` | **A project of its own.** The report becomes a package with modules, a venv, a requirements file, pytest tests and git. | — | Forge Ch 0 (`forge-tools`) for the tooling explanations; notebooks `python/modules`, `testing-your-code` |
| 2 | `aml-pandas` | **pandas, rebuilt by hand.** A 3,000-run history with crashes (missing values). Every pandas operation is first written by hand in a few lines, then done with pandas, and a test proves they agree. Ends with a percentile report (p50, p95). | distributions, percentiles, variance and standard deviation | ML Lab 02 (data), 05 (statistics); notebooks `ml/pandas-dataframes`, `pandas-reshaping`, `exploring-a-dataset` |
| 3 | `aml-seeing` | **Seeing data: your first Streamlit app.** matplotlib by hand, then a Streamlit CI dashboard, plus the learner's first maths explorers (histogram bins, percentile slider). | histograms, density, the effect of bin width | notebook `ml/plotting`; ML Lab 02 figures |
| 4 | `aml-git` | **Your own data: git history.** Stream `git log --numstat` from any repository into a DataFrame; commits per author, churn, files that change together. | counting, rates over time, rolling averages | notebook `python/iterators-and-generators`, `files-and-text` |

### Part II — Mathematics through code

| Ch | Track | Title and project | Maths | Sources |
|---|---|---|---|---|
| 5 | `aml-vectors` | **Vectors and similarity: duplicate bug reports.** Reports as word-count vectors; dot product, length, cosine; NumPy arrives when the loop is measured too slow. | vectors, dot product, norms, cosine similarity, matrices | ML Lab 01, 03; notebooks `ml/vectors`, `numpy-arrays`, `indexing-and-broadcasting`, `matrices-as-transformations`; `math/vectors` |
| 6 | `aml-change` | **Change and slopes.** Derivatives computed numerically, then by rule; a loss function; a pygame program the learner writes in which a ball rolls downhill on a loss curve. | rates of change, derivatives, the chain rule, partial derivatives, the gradient | ML Lab 01 figures (secant to tangent, chain tracer); notebooks `ml/rates-of-change`, `gradients-and-chain-rule`, `loss-functions`; `math/the-derivative-appears`, `walking-downhill` |

### Part III — Models

| Ch | Track | Title and project | Maths | Sources |
|---|---|---|---|---|
| 7 | `aml-first-model` | **When will `test_upload` blow its budget?** A line through the timings: by eye, by least squares, by gradient descent, as the learner's own `LinearModel` class, then scikit-learn. A Streamlit explorer where the learner drags the line and watches the loss. | least squares, gradient descent, feature scaling | ML Lab 01, 06; notebooks `ml/what-learning-is`, `least-squares`, `gradient-descent`, `multiple-regression`, `sklearn-workflow` |
| 8 | `aml-evaluation` | **Is it any good?** Splits that respect time (no training on the future), baselines, MAE and RMSE, leakage, cross-validation. | error metrics, variance of an estimate | ML Lab 06, 09; notebooks `ml/overfitting`, `cross-validation`, `leakage-and-imbalance` |
| 9 | `aml-flaky` | **Will this run fail? A flaky-test detector.** Probability by counting and simulation, logistic regression from scratch, thresholds, precision and recall, the cost of a false alarm. | probability, odds and log-odds, the sigmoid, log loss | ML Lab 04, 08, 09; notebooks `ml/probability-by-simulation`, `logistic-regression`, `classification-metrics` |
| 10 | `aml-text` | **Triaging bug reports.** Tokenising, bag of words, naive Bayes, TF-IDF; duplicate detection with cosine similarity from Ch 5. | conditional probability, Bayes' rule, logarithms | ML Lab 11; notebooks `ml/naive-bayes`, `embeddings` |
| 11 | `aml-trees` | **A risky-change warning.** Features from git history (Ch 4); decision trees by hand, overfitting, random forests, gradient boosting, feature importance and its traps. | impurity and information, the bias–variance trade-off | ML Lab 12, 13, 14, 59; notebooks `ml/decision-trees`, `random-forests`, `boosting`, `interpreting-models` |
| 12 | `aml-anomaly` | **Latency anomalies and clustering failure logs.** z-scores, rolling windows, seasonality, isolation forests; k-means, animated in pygame by the learner. | standardisation, distance, time series basics | ML Lab 17, 19; notebooks `ml/k-means`, `anomaly-detection`, `time-series` |
| 13 | `aml-neural` | **Neural networks from scratch, then PyTorch.** A tiny autograd engine with operator overloading; a network that learns; then the same in PyTorch, checked against yours. | the chain rule as backpropagation, activation functions, optimisers | ML Lab 20, 21, 22, 23; notebooks `ml/autograd-engine`, `backprop-by-hand`, `neural-networks`, `training-a-network` |

### Part IV — Tools people use

| Ch | Track | Title and project | Topics |
|---|---|---|---|
| 14 | `aml-shipping` | **Shipping the toolkit.** A package with a command-line interface, configuration, logging, type checking and profiling. | ML Lab 28, 32 |
| 15 | `aml-service` | **A model service.** FastAPI, a Streamlit front end, SQLite for predictions, model versions. | ML Lab 29 |
| 16 | `aml-workflow` | **ML in the team's workflow.** A pre-commit hook and a CI job that run the flaky-test report and the risky-change warning on every change; monitoring drift; retraining. | ML Lab 30, 31 |
| 17 | `aml-capstone` | **Your own tool on your own data.** Choose a problem from your own work, decide whether ML helps, build the simplest thing that works, measure it honestly, ship it. | ML Lab 33 |

## Tooling

| Item | Status |
|---|---|
| `figure` fences in Project Studio lessons (`figures.js`, `FigureBlock.jsx`, `figures/`) | **Done** with Chapter 0 |
| Series registration (`series.js`, key `applied-ml`, prefix `aml-`) | **Done** |
| Walkthrough test `appliedMl.desktop.test.js` and `tracks/applied-ml.walkthrough.js` | **Done** for Chapter 0 |
| A **▶ Run this file** button for the open file, for lessons with many small files | Planned. Until then lessons run each small file from the terminal, which is also practice |
| CodeLens using the project's `.venv` | Planned in CodeLens itself; until then traces stay on pure-Python code |

## Pitfalls found while writing

- **The step parser splits on `## ` anywhere, even inside a code block.** A Markdown example with `## Setup` in a hint would become a new step. Use `###` headings inside examples.
- **Git's `folder/` patterns only match directories**, so `git-ignored __pycache__` fails while no `__pycache__` exists yet. Check a path inside it (`__pycache__/x.pyc`).
- **A file named like a standard-library module shadows it.** Running `python explore/x.py` puts `explore/` first on Python's module search path, so an `explore/types.py` replaced the standard `types` module and broke `import csv` (which imports `re`, then `enum`, then `types`). The walkthrough test caught it in lesson 0.6. Chapter 0 names files to avoid it (`value_types.py`) and shows it on purpose in lesson 0.6's Try it (`explore/csv.py`); lessons 1.1 and 1.3 explain it through `sys.path`.

## Testing

- `npx vitest run src/labs/project-studio` runs the parsing, figure and structure tests on any machine.
- `npx vitest run src/labs/project-studio/appliedMl.desktop.test.js` walks the series as a learner on Windows: types every step's file, runs every command, runs every check, tries every planted wrong answer, and runs every prediction's `verify:` command. `AML_UNTIL=<lesson id prefix>` stops after one lesson.

## Status board

| Chapter | Status |
|---|---|
| 0 · Python from Zero | **Written** (7 lessons) |
| 1 · A Project of Its Own | **Written** (6 lessons): venv, Git, modules, an installable package, pytest with a supplied mutation checker (`tools/mutants.py`), failing well |
| 2–17 | Planned |
