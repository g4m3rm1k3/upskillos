# Machine Learning Lab — from zero to mastery

Open `/#/lab/ml-lab` through the Labs catalog (the app uses hash routing). The existing metadata and entry loaders discover this folder automatically. The focused development preview at `/scratch/ml-preview.html` renders the same component without loading the rest of the application.

The curriculum has **33 core labs** and **five optional specializations** (Labs 34–38), all implemented. Each lab has:

- **Lessons** (usually four or five), each with sections, a skill statement, prerequisites, a formula, a guided experiment, a numeric checkpoint (optional `tolerance`), an explanation and a reflection prompt.
- **An interactive playground**: a deterministic, seeded JavaScript simulation of the lab's idea, lazy-loaded.
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

## Structure

- `index.jsx`: the generic lab shell (lab switcher, lessons, checkpoints, notebook, playground, Python tab). `LearningPath.jsx` renders the registry-driven roadmap with per-lab progress; `roadmap.js` holds the plan text.
- `labs/index.js`: the ordered registry. Each `labs/lNN-name/` folder has `index.js` (metadata and lazy playground), `lessons.js` (`lessons`, `sources`), `python.js` (the challenge: filename, packages, steps, hints, starter, solution, checks, optional `timeout` and `local` script), `engine.js` (pure, testable logic), `Playground.jsx` and `engine.test.js`. Engines reuse each other where the curriculum builds on earlier labs (for example Lab 13's forests use Lab 12's trees; Labs 30 and 32 serve Lab 29's artifact).
- `kit/`: shared pieces — seeded math helpers and a Jacobi eigen-solver (`math.js`), SVG charts (`Plot.jsx`: plot, paths, class dots, probability fields, contours, heatmaps, bars), controls and callouts (`ui.jsx`), and 2D datasets.
- Lab 01 keeps its original engine, lessons and storage keys at the folder root.

## Presentation and editing

The lab consumes `useGlobalTheme`: heading, emphasis, inline-code and callout colors come from the selected studio theme's Markdown palette. Lesson text honors the shared reading font, size, alignment and line-height preferences. Surface and chart variables remain scoped to the lab. Lesson paragraphs use Markdown through `LessonText`; reference solutions and checks use the shared `StaticCodeBlock`; the editable Python workspace uses Monaco with the studio editor theme.

## Execution and data

Playgrounds run in the browser from seeded generators, so every figure is reproducible. Python challenges execute in a dedicated worker with Pyodide 0.26.4 from the jsDelivr CDN (first use needs network access); each lab declares the packages it loads (numpy, pandas, scikit-learn) and may raise the default 90-second limit. Lab 23 also provides an optional real-PyTorch script to run locally.

Code, checkpoint results, explanations and notebooks are stored per lab under `upskillos.ml-lab.v1` (Lab 01 keeps its original keys). The Lab 33 project workbench and the Lab 38 replication report save separately on the device. Nothing is uploaded; pasted CSV data stays in the browser.

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

# The same in the exact Pyodide release the browser uses (install pyodide@0.26.4 outside the app)
node src/labs/ml-lab/tools/verify-pyodide.mjs /path/to/node_modules/pyodide/pyodide.mjs [lab numbers...]
```

Lesson content is original and linked to its sources. It is a careful self-study curriculum, not a claim of academic accreditation.
