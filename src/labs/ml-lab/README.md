# Machine Learning Lab — module 01

Open `/#/lab/ml-lab` through the Labs catalog (the app uses hash routing). The existing metadata and entry loaders discover this folder automatically. The focused development preview at `/scratch/ml-preview.html` renders the same component without loading the rest of the application.

This release teaches arrays/shapes, dot products, derivatives and chain rule, followed by one-feature ordinary least squares with an intercept. Eight lessons include numeric checkpoints and saved self-explanations. Later ML engineering modules are explicitly marked planned in the learning path.

## Mathematical contract

- Prediction: `w*x+b`; loss: mean squared error, with no extra 1/2 factor.
- Batch gradients: `2 mean(error*x)` and `2 mean(error)`; simultaneous updates.
- Shuffled 80/20 training/validation split. Validation never supplies gradient or baseline parameters. It is not an untouched final test.
- Direct reference: centered one-feature least squares. Effectively constant inputs use a mean prediction and disclose the nonidentifiable slope.
- Gradient checking uses centered finite differences at epsilon 1e-5 and normalized error tolerance 1e-5.
- Loss chart uses log10(1+MSE), explicitly labeled; observations determine scatter axes. Divergence stops at MSE > 1e12 and preserves the last finite state. Training stops at 2,000 updates.

## Execution and data

The playground uses the small inspectable JavaScript math engine. The editable Python exercise executes real NumPy independently in a dedicated, terminable worker using the same pinned Pyodide 0.26.4 runtime as the existing shared runtime. First use requires network access. Execution is limited to 90 seconds. Its checks compare derivatives with an independent loss and verify training behavior. The full reference is revealed separately, never inserted over the learner's work.

Code, checkpoint results, explanations, and the notebook are stored locally under `upskillos.ml-lab.v1`. Dataset and comparison snapshots are session-only. JSON export includes raw train/validation rows, parameters, history, notes, and checkpoint work. Python export reproduces the current dataset split and rate with a fresh 1,000-step run, then compares to `numpy.linalg.lstsq`; optional scikit-learn comparison code is provided. It is not a resume of the exact UI iteration state.

CSV accepts only two numeric columns, with an optional x,y header, 5–2,000 rows. No data is uploaded. Random splitting is unsuitable for time-ordered or grouped observations; the lesson explicitly directs those experiments to an appropriate external split.

## Verification

`node node_modules/vitest/vitest.mjs run src/labs/ml-lab/engine.test.js src/labs/ml-lab/ui.test.jsx`

Manual checks: discover lab; navigate lessons; numeric checks; refresh saved work; step/train/pause/reset; divergence; constant CSV; comparison export; Python starter failure, working solution success, infinite-loop cancellation; responsive layout.

Original lesson content is accompanied by links to ISL with Python (chapters 2–3), scikit-learn ordinary least squares, and its common-pitfalls guide. This is a reviewed implementation milestone, not a claim of independent academic accreditation or a complete ML engineering course.
