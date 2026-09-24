# Machine Learning Lab — from zero to mastery

Open `/#/lab/ml-lab` through the Labs catalog (the app uses hash routing). The existing metadata and entry loaders discover this folder automatically. The focused development preview at `/scratch/ml-preview.html` renders the same component without loading the rest of the application.

The curriculum has **33 core labs**, **five optional specializations** (Labs 34–38) and an **advanced track** of 23 labs (Labs 39–61) covering the theory and methods of a university machine-learning sequence and beyond. All 61 are implemented. Each lab has:

- **Lessons** (usually four to six), each with sections, a skill statement, prerequisites, a formula, a guided experiment, a checkpoint, an explanation and a reflection prompt. A checkpoint is either **numeric** (`answer`, optional `tolerance`, optional `misconceptions: [{ answer, tolerance?, feedback }]` naming the likely error behind a specific wrong answer) or a **decision** (`choices: [{ text, why }]`, `answer` = index of the right choice, every `why` explaining that option). Numeric answers that match no listed misconception are still checked for common slips — a flipped sign, a factor of 2, a fraction given as a percentage — before the generic hint (`Checkpoint.jsx`).
- **“Jumping in here from a course?”** (`jumpIn.js`, `JumpIn.jsx`): three prerequisite checks for every lab after Lab 01. A wrong answer explains the misconception and links to the exact earlier lesson that teaches it; the summary orders every miss into a recovery route, and a sticky **Back to Lab NN** banner returns the learner. `jumpIn.test.js` checks that every review link resolves to a lesson in an earlier lab.
- **Step-by-step derivations** (most advanced lessons and some core ones): a chain of small steps, each answered with a symbolic expression or a number. Expressions are checked by numerical equivalence, so any algebraically equal form is accepted. Steps unlock in order, offer a hint and a worked reveal, and save progress per lesson.
- **Math taught in the lesson, tied to code**: lesson text supports LaTeX (`$…$` inline, `$$…$$` display; write a literal dollar as `\\$`). A lesson may add `formulaTex` (typeset in the Math ↔ code block instead of the plain `formula`), `mathCode` (`{ rows: [[math, code, meaning]], code: { language, source, caption } }`: every symbol next to the variable or line that holds it) and `notebook` (`{ title, intro, cells: [{ title, prose, code }] }`: runnable Python cells, opened in the lesson with the app's `PythonNotebook` or copied into Notebook Lab).
- **Links to the app's own math courses and tools**: `math` keys on a lab (shown on every lesson) or a lesson, resolved by `kit/mathLinks.js` to Linear Algebra, Calculus, Applied Statistics, Discrete Math, Dynamic Programming, AI Engineering and Data Science lessons, OpenMAT, Notebook Lab, Matrix Lab and the reference pages. `kit/mathLinks.test.js` checks that every link points to an existing lesson file or lab route and that every key used exists. Links supplement the lesson; they never replace teaching the math in it.
- **A lesson-aware or lab-wide playground**, labelled as such: some labs change the experiment with the lesson (`lessonAware: true`); others run one experiment for the whole lab and say which part of it each lesson uses, and with `viewPerLesson: true` (Labs 04–07) open the view the current lesson’s experiment refers to.
- **An interactive playground**: a deterministic, seeded JavaScript simulation of the lab's idea, lazy-loaded. Advanced labs train real models in the browser (networks, ensembles, GANs, diffusion, GNNs, policy gradients) with the shared `kit/nn.js`.
- **A Python implementation challenge**: the learner implements the core algorithm from a starter; independent checks run in real Python (Pyodide) in a terminable worker. The reference solution is shown separately, never pasted over the learner's work.
- **Sources**: primary papers, textbooks and official documentation.

| # | Lab | # | Lab |
|---|-----|---|-----|
| 01 | Foundations | 20 | Graphs & backpropagation |
| 02 | Data & reproducibility | 21 | Neural network in NumPy |
| 03 | Vectors & matrices | 22 | Optimization & failures |
| 04 | Probability | 23 | PyTorch with understanding |
| 05 | Statistics & estimation | 24 | Convolution & vision |
| 06 | Evaluation without leakage | 25 | Embeddings & sequences |
| 07 | Overfitting & regularization | 26 | Attention & transformers |
| 08 | Logistic regression | 27 | Capstone: DL investigation |
| 09 | Metrics & decisions | 28 | Data contracts & reproducibility |
| 10 | Nearest neighbours | 29 | Serving & integration |
| 11 | Naive Bayes & text | 30 | Testing, monitoring & drift |
| 12 | Decision trees | 31 | Responsible decisions |
| 13 | Bagging & random forests | 32 | Retraining & delivery |
| 14 | Boosting | 33 | Final capstone |
| 15 | Margins & SVMs | 34 | *Retrieval & LLM apps* |
| 16 | Capstone: tabular model | 35 | *Recommender systems* |
| 17 | Clustering & anomalies | 36 | *Causal inference & experiments* |
| 18 | Eigenvectors, SVD & PCA | 37 | *Reinforcement learning* |
| 19 | Time-dependent data | 38 | *Research replication* |

**Advanced track** (after the core; the roadmap groups it into four phases):

| # | Lab | # | Lab |
|---|-----|---|-----|
| 39 | GLMs & Newton’s method | 51 | Nonlinear DR & ICA |
| 40 | Generative classifiers | 52 | DL regularization & normalization |
| 41 | Bayesian inference | 53 | Autoencoders & VAEs |
| 42 | Gaussian processes | 54 | GANs & diffusion |
| 43 | Mixtures & EM | 55 | Language models |
| 44 | Sampling & approximate inference | 56 | Learning from few labels |
| 45 | Graphical models & HMMs | 57 | Graph neural networks |
| 46 | Information theory | 58 | Policy gradients & actor–critic |
| 47 | Learning theory | 59 | Interpretability |
| 48 | Convex optimization & duality | 60 | Uncertainty & conformal prediction |
| 49 | Kernel methods | 61 | Robustness & distribution shift |
| 50 | Online learning & bandits | | |

## Structure

- `index.jsx`: the generic lab shell (lab switcher, lessons, checkpoints, notebook, playground, Python tab). `LearningPath.jsx` renders the registry-driven roadmap with per-lab progress; `roadmap.js` holds the plan text.
- `labs/index.js`: the ordered registry. Each `labs/lNN-name/` folder has `index.js` (metadata and lazy playground), `lessons.js` (`lessons`, `sources`), `python.js` (the challenge: filename, packages, steps, hints, starter, solution, checks, optional `timeout` and `local` script), `engine.js` (pure, testable logic), `Playground.jsx` and `engine.test.js`. Engines reuse each other where the curriculum builds on earlier labs (for example Lab 13's forests use Lab 12's trees; Labs 30 and 32 serve Lab 29's artifact).
- `kit/`: shared pieces — seeded math helpers and a Jacobi eigen-solver (`math.js`), SVG charts (`Plot.jsx`: plot, paths, class dots, probability fields, contours, heatmaps, bars), controls and callouts (`ui.jsx`), and 2D datasets. Also:
  - `nn.js`: a small neural-network library with explicit forward and backward passes: Dense, ReLU/LeakyReLU/Tanh/Sigmoid, Dropout, BatchNorm, LayerNorm, Sequential and Residual; MSE, softmax cross-entropy and BCE-with-logits losses; AdamW with gradient clipping. `nn.test.js` gradient-checks every layer.
  - `linalg.js`: Cholesky factorization with jitter, triangular solves, log-determinants and Gaussian sampling (Labs 41–42).
  - `expr.js`: a safe expression parser for derivation answers (implicit multiplication, Unicode operators and superscripts, Greek letters typed as words, common functions) and `equivalent()`, which compares two expressions at deterministic random points.
- `Derivation.jsx`: renders a lesson's `derivation` (`{ title, steps, result }`); each step is either `{ prompt, answer, vars, show, why?, hint? }` for an expression or `{ prompt, number, tolerance, show }` for a number.
- Lab 01 keeps its original engine, lessons and storage keys at the folder root.

## Presentation and editing

The lab consumes `useGlobalTheme`: heading, emphasis, inline-code and callout colors come from the selected studio theme's Markdown palette. Lesson text honors the shared reading font, size, alignment and line-height preferences. Surface and chart variables remain scoped to the lab. Lesson paragraphs use Markdown through `LessonText`; reference solutions and checks use the shared `StaticCodeBlock`; the editable Python workspace uses Monaco with the studio editor theme.

## Execution and data

Playgrounds run in the browser from seeded generators, so every figure is reproducible. Python challenges execute in a dedicated worker with Pyodide 0.26.4 from the jsDelivr CDN (first use needs network access); each lab declares the packages it loads (numpy, pandas, scikit-learn) and may raise the default 90-second limit. Lab 23 also provides an optional real-PyTorch script to run locally.

Code, checkpoint results, derivation progress, explanations and notebooks are stored per lab under `upskillos.ml-lab.v1` (Lab 01 keeps its original keys). The Lab 33 project workbench and the Lab 38 replication report save separately on the device. Nothing is uploaded; pasted CSV data stays in the browser.

## Beginner support in Labs 01–08

Only basic Python is assumed. Every lesson in Labs 01–08 has runnable notebook cells (predict → run → change one value → explain) and, except the picture-only Lesson 03.4, a math ↔ code table; `jumpIn.test.js` enforces this. Labs keep these in `labs/lNN-*/notebooks.js` (Lab 01: `labs/l01-foundations/notebooks.js`) and merge them into the lessons by id.

Lab 03 builds each idea from one four-row table of builds (the same numbers in the text, the notebooks and the first three playground views: a clickable design matrix, a step-through matrix product and a column-by-column `Xᵀe` with a nudge check). The loss bowl appears only in Lesson 03.4. Eigenvalues and the condition number form an optional second pass (03.8); Lesson 03.7 derives the one-feature step-size limit `α < 1/mean(x²)` first, and the weight-space playground offers a “largest stable rate” computed from the current data.

## Lab 01 mathematical contract

- Prediction: `w*x+b`; loss: mean squared error, with no extra 1/2 factor.
- Batch gradients: `2 mean(error*x)` and `2 mean(error)`; simultaneous updates.
- Shuffled 80/20 training/validation split; validation never supplies gradients. It is not an untouched final test.
- Gradient checking uses centered finite differences at epsilon 1e-5 and normalized error tolerance 1e-5.
- Divergence stops at MSE > 1e12; training stops at 2,000 updates.

## Verification

```sh
# Engines, UI and a smoke test that opens every lab, clicks its controls and steps through every lesson
node node_modules/vitest/vitest.mjs run src/labs/ml-lab

# Every Python challenge with a local Python (needs numpy, pandas, scikit-learn):
# the solution must pass its checks and the untouched starter must fail them
node src/labs/ml-lab/tools/verify-python.mjs /path/to/python [lab numbers...]

# Every lesson notebook, run top to bottom with a local Python (numpy, pandas, scikit-learn, scipy)
node src/labs/ml-lab/tools/verify-notebooks.mjs /path/to/python [lab numbers...]

# The same in the exact Pyodide release the browser uses (install pyodide@0.26.4 outside the app)
node src/labs/ml-lab/tools/verify-pyodide.mjs /path/to/node_modules/pyodide/pyodide.mjs [lab numbers...]
```

Lesson content is original and linked to its sources. It is a careful self-study curriculum, not a claim of academic accreditation.
