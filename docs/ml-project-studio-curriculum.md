# Machine Learning — From Mathematics to Production

A Project Studio series (desktop app) that takes a learner who knows basic Python to designing, building, securing, testing and operating their own machine-learning application. It is the plan, the lesson standard and the status board for the `ml-*` tracks in `src/labs/project-studio/tracks/`.

The ultimate goal is not "the learner knows machine learning". It is: **the learner can take a real problem, understand the mathematics, choose and implement an appropriate approach, build the software around it, expose it through an API and a UI, store its data, secure it, test it and operate it.**

## The curriculum engine

Every chapter, lesson and step is built from the same loop:

```text
We need to solve X.
    ↓
To solve X we need Y.
    ↓
Y requires concept Z.
    ↓
Understand Z → implement Z (plain Python) → test Z
    ↓
Use the standard library's Z, and check it agrees with yours
    ↓
Use Z to solve X
```

Two rules follow from it, and reviewers should enforce both:

1. **A library appears when a problem needs it.** There is no "NumPy chapter". NumPy arrives in lesson 2.1 because Python lists are too slow (measured in lesson 1.3); pandas arrives in lesson 1.3 because the hand-written explorer became painful (lesson 1.2's last step); scikit-learn arrives in lesson 3.4, after the learner has written linear regression. Each lesson's `requirements.txt` grows only when the text has shown why.
2. **Architecture appears when the old design hurts.** `textstats` starts as one script and becomes a package only when its files clash and its imports depend on the current folder (lesson 0.3). Nobody is told "professionals do it this way".

The learner should repeatedly experience: *"I understand what the library is doing because I built the simpler version first."* Concretely, every library lesson contains a test that compares the library's answer with the learner's (`test_frame.py`, `test_matrices.py::test_numpy_agrees_with_yours`, `test_sklearn.py`), and at least one place where they differ for a reason the lesson explains (pandas' `std` divides by n − 1; `Counter.most_common` breaks ties by insertion order; scikit-learn's `train_test_split` rounds the test size up).

## Where it lives and how it is built

| Piece | Where |
|---|---|
| Lessons | `src/labs/project-studio/tracks/ml-<chapter>/<CC>-<LL>-<slug>.md`, one folder per chapter (Project Studio track) |
| Supplied files (datasets, fixtures) | `tracks/ml-<chapter>/support/` |
| Series and chapter order | `src/labs/project-studio/series.js` (`ml-production`) |
| Concept graph, companions and mastery | `src/labs/project-studio/mlCurriculum.js`, shown by `LessonCompanions.jsx` |
| Walkthrough (what a learner types, and planted wrong answers) | `tracks/ml-<chapter>.walkthrough.js` |
| Walkthrough test | `src/labs/project-studio/mlProduction.desktop.test.js` |
| Structure tests | `src/labs/project-studio/mlCurriculum.test.js`, `series.test.js`, `LessonCompanions.test.jsx` |

### Three ways to learn each idea

The prompt's requirement that every concept exist as **explanation**, **notebook** and **lab** is met by linking to what the app already has, not duplicating it:

- **Explanation and project**: the Project Studio lesson. Real files, a real virtual environment, real checks.
- **Notebook**: a lesson of the Notebook Lab series (`src/tools/notebook-lab/series/`), opened with `#/notebook-lab?lesson=<id>`.
- **Lab**: a lab of the Machine Learning Lab (`src/labs/ml-lab/`), opened with `#/lab/ml-lab?lab=<n>`.

A lesson names its companions in frontmatter (`notebook:`, `lab:`); the lesson panel shows them above the first step. The Notebook Lab is a page and reads `?lesson=` from its address; the ML Lab opens as a window and takes `?lab=` through `useEntryLink` (`src/utils/entryLinks.js`). Either way the link opens the right notebook lesson or lab. `mlCurriculum.test.js` fails if a link names a notebook lesson that isn't written or a lab that doesn't exist.

## The lesson schema

The prompt sketches a YAML schema. In this repository a lesson is a Markdown file the Project Studio already parses (`parseTrack.js`), so the schema is its frontmatter plus step conventions:

```yaml
---
title: 2.1 — A House Is a Vector          # "<chapter>.<lesson> — <title>"
track: Mathematics Through Computation    # chapter name (series.js gives the label shown)
trackOrder: 22                            # first lesson of a chapter only
runtime: none                             # or python + run: <file> for the Run button
support: data/houses.csv                  # files the "Create provided" button also writes
concepts: vectors, dot-product            # what this lesson's checks demonstrate
revisits: tabular-data                    # earlier concepts used again (spaced repetition)
notebook: ml-vectors, ml-numpy-arrays     # Notebook Lab companions
lab: 3                                    # Machine Learning Lab companions
problem: A model has to compare houses…   # the question that motivates the lesson
---
```

| Prompt's field | Here |
|---|---|
| `id` | the file name (`ml-math/02-01-vectors`); a progress key, never renamed |
| `title`, `stage` | `title`; the chapter folder |
| `prerequisites` | the `requires` edges of the lesson's `concepts` in `ML_CONCEPTS` |
| `concepts` | `concepts:`; `revisits:` for the ones that come back |
| `problem` | `problem:` and the intro paragraph |
| `objectives` | the concept list shown above the lesson, and the step titles |
| `explanation`, `examples`, `mathematics` | step prose (LaTeX with `$…$`), worked examples with real numbers |
| `implementation` | each step's ```` ```lang file=… ```` block: the file's full target content |
| `visualization`, `lab` | `lab:` companions; terminal visualisations where useful (`landscape.py` in 2.4) |
| `notebook` | `notebook:` companions |
| `exercises`, `challenges` | prediction checkpoints; a final "Challenge" step with checks and no target code |
| `tests` | the supplied `tests/test_*.py` and each step's ```` ```check ```` fence |
| `project_connection`, `next` | each lesson's last section, and the chapter summary tables |

`mlCurriculum.test.js` enforces the parts that can be checked: every lesson has `concepts:` and `problem:`, every concept exists in the graph, the graph has no cycles, and **every `revisits:` concept was taught by an earlier lesson**.

### How a lesson is written

The prompt's 14-part lesson standard maps onto steps:

1. **The problem**: the `problem:` line and an intro that starts from something the learner wants, never "today we learn X".
2. **Observe**: show real output (the `count.py` report, the `max()` of string prices, the exploding loss).
3. **Ask**: a ```` ```predict ```` checkpoint before the explanation. Number predictions carry a `verify:` command that the walkthrough runs.
4. **Simplest solution**: plain Python first (`vectors.py` before NumPy, a dictionary before `Counter`, `describe.py` before pandas, gradient descent before scikit-learn).
5. **Discover the limitation**: a step that breaks the simple version (the script run from another folder; ASCII-only words; a learning rate that explodes).
6. **Introduce the concept**: terminology, mathematics, implementation, in that order.
7. **Visualise**: the ML Lab companion, or a terminal picture.
8. **Implement**: the step's target file.
9. **Test**: "Read the tests first" opens every lesson; each step's checks run the learner's real code.
10. **Use the library** and 11. **inspect its result**: a comparison test, and an explanation of the difference.
12. **Put it into the application**: the chapter's project grows (`textstats`, `explorer`, `houses`).
13. **Exercise** and 14. **Challenge**: predictions, and a closing challenge step with checks but no code.

### Teaching a learner who can barely write a script

The reader knows variables, loops, `if`, functions, lists and dictionaries, and not much more. The ML is rarely what loses them; the code and the logic around it are. So every lesson also teaches the Python, and the logic, as carefully as the mathematics. The Reinforcement Learning track (`tracks/rl-pygame/`) is the model to match.

**Every new term: definition first, then a picture.** The first time a term appears it gets a precise definition in the field's own vocabulary, then, where it helps, an analogy marked *Picture it as*. The analogy assists the definition and never replaces it: a learner must leave knowing the real word, because documentation and colleagues will use it. Where the picture stops matching the real thing, say so ("**Where the picture stops working:** …"). The format is a blockquote:

```markdown
> **Virtual environment**: a folder containing a Python launcher and an empty `site-packages` of its own, so …
>
> *Picture it as* giving each job its own toolbox … **Where the picture stops working:** the toolboxes still share one workbench …
```

Prefer pictures from workshops and production lines (gauges, fixtures, offsets, bills of materials, inspection sheets, andon cords): concrete, physical, and familiar to many learners. Where a manufacturing idea is the real thing rather than an analogy (σ in statistical process control *is* the standard deviation), say that instead.

**Every new Python construct: name it, say what Python executes, show the longhand.** The first `lambda` comes with the equivalent `def`; the first comprehension with the equivalent loop; the first `with` with its `try`/`finally`; the first `@dataclass` with the methods it writes; the first library function that hides a loop (`argmax`, `sorted(key=…)`) with the loop it replaces.

**Logic gets traced, with real values.** Loops, sorts, recursion and updates get a table showing each step's values (`counts.get` over `"b a b"`, the sort labels for `"b a c b a"`, the first gradient-descent step).

**Explore at the prompt before explaining.** Short `>>>` sessions with "predict each answer before pressing Enter": every line's output in the lesson is measured.

Every important code block answers: what is it, why do we need it, what does each part do, what does Python execute, what goes in and out, and what would break without it. Every number in a lesson is measured by running the code (the walkthrough runs every step and checks the quoted output).

**Break-it exercises** are built in twice: in the text (wrong learning rates, unscaled features, training on the test set, unseen categories, extrapolation, nonsense input) and in the walkthrough, where every check must reject at least one planted wrong answer.

## Concept graph, mastery and spaced repetition

`ML_CONCEPTS` in `mlCurriculum.js` is the concept graph: each concept names its area and the concepts it requires. It covers the whole series, including chapters not yet written, so planned lessons attach to existing nodes.

**Mastery comes from demonstrated work.** A concept's bar is the share of checked steps, across every lesson that teaches it, whose checks have passed in the learner's own project folder (`conceptMastery`). Reading a lesson moves nothing.

**Spaced repetition** is the `revisits:` field, and the series is written so ideas return in new settings:

| Idea | First | Again |
|---|---|---|
| Squared distance from a centre | variance (1.2) | MSE loss (2.3, 3.1); R² (3.4) |
| Dot product | weighted sum of features (2.1) | `X @ w` (2.2); the gradient `Xᵀe` (3.2); planned: similarity, embeddings, neural layers |
| Cosine | angle between vectors (2.1) | correlation (2.1); planned: embedding similarity (Part XXVIII) |
| Mean and standard deviation | describing a column (1.2) | standardisation (3.2); the baseline RMSE (3.1) |
| Boundaries that validate input | `read_text` (0.4), `load_settings` (0.5) | `typed` (1.1); planned: FastAPI request models |
| Passing in what a function depends on | `main(argv)` (0.3) | pytest fixtures (0.3, 0.5); planned: FastAPI dependency injection |
| Hidden dependence on the current folder | `open("data.txt")` (0.1) | the leaking settings file in tests (0.5); `__file__`-relative test data (1.1) |

## Three scales of project

| Scale | Purpose | In this series |
|---|---|---|
| Level 1: mathematical experiments | tiny, flat modules, easy to read in a minute | `math-lab` (Chapter 2): `vectors.py`, `matrices.py`, `calculus.py`, `gradients.py` |
| Level 2: standalone projects | one algorithm or tool, complete | `text-analysis` (`textstats`, Chapter 0), `dataset-explorer` (Chapter 1), `house-prices` (Chapter 3); planned: spam detector, digit classifier, segmentation, document classifier |
| Level 3: the main application | everything integrated | `price-service` (Chapter 4): the house-price model behind an HTTP API and a web page; it grows into **Upskillos ML Studio** (Chapter 15) |

Each chapter is its own Project Studio project folder, so a learner can always run any chapter's project on its own.

## Chapter map and status

Lesson files are numbered `<chapter>-<lesson>-<slug>.md`. A lesson's progress key is its file name: never rename a published lesson. Insert lessons with a new number between existing ones.

### Written

| Chapter (track) | Lesson | Concepts demonstrated | Notebook / ML Lab |
|---|---|---|---|
| **00 · Python Becomes Software** (`ml-software`) — project: Text Analysis CLI | 0.1 A script that works once | virtual environments | py-running-code, py-files-and-text |
| | 0.2 Functions you can test | functions, testing, modules | py-functions, py-testing-your-code, py-modules |
| | 0.3 A package with a command line | packages, command line | py-modules |
| | 0.4 When things go wrong | exceptions, file paths, type hints | py-errors-and-exceptions, py-files-and-text, py-type-hints-and-dataclasses |
| | 0.5 Settings, and tests you write yourself | configuration, testing, classes | py-type-hints-and-dataclasses, py-testing-your-code |
| **01 · Data** (`ml-data`) — project: Dataset Explorer | 1.1 Rows, columns and missing values | tabular data, categorical data, missing values | py-files-and-text, ml-exploring-a-dataset / 2 |
| | 1.2 Asking questions by hand | descriptive statistics, aggregation | ml-expectation-and-variance, ml-exploring-a-dataset / 5 |
| | 1.3 pandas: the same questions, less code | pandas | ml-pandas-dataframes, ml-pandas-reshaping / 2 |
| **02 · Mathematics Through Computation** (`ml-math`) — project: maths workbench | 2.1 A house is a vector | vectors, dot product, distance, correlation, NumPy | ml-vectors, ml-numpy-arrays / 3 |
| | 2.2 A dataset is a matrix | matrices, NumPy | ml-matrices-as-transformations, ml-indexing-and-broadcasting / 3 |
| | 2.3 Which way is downhill? Derivatives | functions, derivatives, loss | ml-rates-of-change, ml-loss-functions / 1 |
| | 2.4 Rolling downhill: gradients | gradients, gradient descent | ml-gradients-and-chain-rule, ml-gradient-descent / 1 |
| **03 · Your First Model** (`ml-first-model`) — project: house-price predictor | 3.1 A line through the points | linear model, loss | ml-what-learning-is, ml-least-squares, ml-loss-functions / 1 |
| | 3.2 Learning: gradient descent on real data | gradient descent, feature scaling | ml-gradient-descent, ml-multiple-regression / 1 |
| | 3.3 Your own LinearRegression | linear regression, classes, generalisation | ml-multiple-regression, ml-overfitting / 6 |
| | 3.4 scikit-learn: the professional version | scikit-learn, regression metrics | ml-sklearn-workflow, ml-least-squares / 6 |
| **04 · Web + ML** (`ml-web`) — project: prediction web service | 4.1 Programs that talk: HTTP by hand | HTTP | / 29 |
| | 4.2 JSON, POST and status codes | web APIs | / 29 |
| | 4.3 FastAPI: declare it, don't write it | web APIs (validation, OpenAPI, dependency injection) | / 29 |
| | 4.4 A page for people: HTML, templates and HTMX | HTML, templates, HTMX | / 29 |
| **05 · Databases** (`ml-database`) — project: experiment database | 5.1 Data that survives: SQLite and SQL | SQL | / 28 |
| | 5.2 Models, predictions and the links between them | SQL (keys, constraints, joins, transactions, indexes) | / 28 |
| | 5.3 A repository, and a service that remembers | data-access layers | / 29 |
| | 5.4 SQLAlchemy: the SQL is still there | data-access layers (ORM, echo, N + 1) | / 28 |
| | 5.5 Changing the schema safely: migrations | data-access layers (migrations; Alembic mapped) | / 32 |

### Planned

Each planned chapter names the problem that introduces its technology. The original map had an "Optimization" chapter before the web app; Chapters 2 and 3 already teach gradient descent and the learning rate, so the web app (the prompt's Parts V–VIII) follows the first model directly, and the remaining optimisation topics (mini-batches, momentum, regularisation) live in Chapter 7, where evaluation makes them necessary. Mathematics for probability and statistics (prompt Parts 3.7–3.8) is taught where classification first needs it, in Chapter 8, so no chapter of mathematics stands without an application.

| # | Chapter | The problem that starts it | Builds | Companions to link |
|---|---|---|---|---|
| 06 | Authentication and Security: Multi-user Platform | "Two people now need separate projects" | password hashing, sessions, cookies, login/logout, protected routes, custom error responses; then SQL injection, XSS, CSRF, path traversal, upload safety, rate limiting, secrets, each shown vulnerable → attacked → fixed | / 31 |
| 07 | Evaluation and Overfitting | "The test score changes every time the split does" | cross-validation, polynomial features and overfitting, regularisation, learning curves, leakage; mini-batches and momentum where training gets slow | ml-overfitting, ml-regularisation, ml-cross-validation, ml-optimisers / 6, 7, 22 |
| 08 | Classification: Spam Detector | "Some predictions are categories, not numbers" | probability and conditional probability by simulation; tokenisation, bag-of-words, TF-IDF; logistic regression and naive Bayes from scratch, then scikit-learn; confusion matrix, precision, recall, ROC | ml-probability-by-simulation, ml-logistic-regression, ml-naive-bayes, ml-classification-metrics / 4, 8, 9, 11 |
| 09 | Trees: Decision Tree and Random Forest | "A model you can explain, rule by rule" | entropy, information gain, recursive splitting, bagging, feature importance; plus k-NN and feature scaling | ml-knn, ml-decision-trees, ml-random-forests / 10, 12, 13 |
| 10 | Unsupervised: Customer Segmentation | "There are no labels" | distance, k-means from scratch, choosing k | ml-k-means / 17 |
| 11 | Dimensionality Reduction: PCA Explorer | "Too many features to see" | covariance, eigenvectors, projection, explained variance | ml-eigenvectors-and-svd, ml-pca / 18 |
| 12 | Neural Network From Scratch | "A line can't separate these points" | neurons, layers, activations, forward pass; backpropagation by the chain rule in NumPy | ml-perceptron-limits, ml-neural-networks, ml-backprop-by-hand / 20, 21 |
| 13 | PyTorch: Image Classifier | "Hand-written gradients don't scale" | tensors, autograd, modules, datasets, dataloaders, optimisers; every line of the training loop explained; handwritten digits | ml-autograd-engine, ml-training-a-network, ml-cnns / 23, 24 |
| 14 | NLP: Document Classifier | "Back to text, where Chapter 0 began" | n-grams, TF-IDF pipelines, embeddings, cosine similarity | ml-embeddings / 25, 34 |
| 15 | Production ML: Upskillos ML Studio | "Everything, for real users" | the full architecture (`api/`, `services/`, `ml/`, `database/`, `templates/`), CRUD for users, projects, datasets, models and experiments; background training jobs; model artifacts and metadata; experiment tracking; data, model and integration tests; reproducibility; Docker and deployment; logging and observability; ML-specific security (unsafe pickle files, untrusted datasets, prediction abuse); consuming external APIs with retries, timeouts and caching | / 28, 29, 30, 32 |
| 16 | Capstone: Build Your Own ML Product | "Your own problem" | problem definition → data analysis → mathematical justification → baseline → model → evaluation → architecture → API → database → UI → tests → security → deployment | ml-capstone / 33 |

Optional advanced tracks after Chapter 15 (prompt Part XLII): classical ML (SVM, boosting), deep learning (CNNs, sequence models, attention, transformers), NLP and retrieval, recommender systems, time series. Each can link the matching ML Lab labs (14, 15, 19, 25, 26, 34, 35).

The ML Studio architecture in Chapter 15 must be **arrived at**: Chapter 4 starts from one file per server and one route; Chapter 5 adds a repository when SQL leaks into routes; Chapter 6 adds services when two routes need the same authorisation logic; Chapter 15 splits `api/`, `services/`, `ml/` and `database/` when the single app file has become hard to change.

## Runtime decisions

Measured on 2026-10-03:

- **Python 3.12 or newer**: `numpy==2.5.3` requires it. Lesson 0.1 checks.
- **Pinned versions**: `pytest==9.1.1`, `pandas==3.0.6`, `numpy==2.5.3`, `scikit-learn==1.9.1`. `pip download --only-binary=:all: --platform win_amd64` found wheels for all four on Python 3.12, 3.13 and 3.14.
- **Each chapter installs only what it has justified.** Chapter 0 installs pytest alone; pandas, NumPy and scikit-learn arrive in the lessons that motivate them.
- **Checks run `.venv/Scripts/python` by path** (as in the Reinforcement Learning track), so they don't depend on an activated environment.
- **pandas 3** reads text columns with the new `str` dtype and stores a numeric column with missing values as `float64`; lesson 1.3 teaches both.

## Source code for each project

The prompt asks for `starter/`, `solution/`, `tests/` and a README per project. In Project Studio:

- **starter**: an empty folder; the first lesson of each chapter builds it from nothing;
- **tests**: supplied by each lesson's "Read the tests first" step (and its `support/` files);
- **solution**: each step's target block is the full file; the walkthrough test produces the complete solution by typing every step.

Not done yet: exporting a chapter's final project as a standalone repository (`starter/`, `solution/`, `tests/`, `README`) a learner can `git clone`. A script that runs the walkthrough into a folder and writes those directories is the natural way to build it.

## Verification

```sh
npx vitest run src/labs/project-studio/mlCurriculum.test.js src/labs/project-studio/series.test.js src/labs/project-studio/LessonCompanions.test.jsx
```

checks the structure: concept graph, companions, revisits, series order.

```sh
npx vitest run src/labs/project-studio/mlProduction.desktop.test.js
```

walks every lesson like a learner: it makes each chapter's `.venv`, installs `requirements.txt` from PyPI, types every step's file, runs every check, tries every planted wrong answer (each must fail the named checks), and runs every prediction's `verify:` command. On Windows it runs as is. On macOS or Linux, name a Python 3.12+ and a shell:

```sh
ML_WALKTHROUGH_PYTHON=python3.13 SHELL=/bin/bash npx vitest run src/labs/project-studio/mlProduction.desktop.test.js
```

(`ML_WALKTHROUGH_TRACK=ml-data` limits it to one chapter.) Any change to a lesson's code, checks or quoted output must keep this test passing.
