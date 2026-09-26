# ML Lab — implementation status against the beginner-to-mastery assessment

Updated 2026-09-25 (later the same day: Labs 09–19 notebooks done). Read this first when resuming work. The target is the assessment dated 2026-09-24
(“ML beginner-to-mastery assessment and implementation handoff”). This file records what is
done, how it was verified, and what is open. It does not claim that learners have mastered anything.

## Done

**Lessons shown in order.** `LessonFlow.jsx` renders each lesson as paragraph →
interactive figure / runnable cell / prediction, with the whole notebook still available at the end.
Labs 01–19 and all of Lab 37 have ordered blocks (in `blocks.js`, or `lessons.js` for Labs 03 and 37) and figures in `figures.jsx`. Every figure's stated numbers were checked against the lab engine before writing the text (for example Lab 19's baseline crossover at h = 5, and SARSA's safer route in 37.4). Lessons
without blocks render as before. Labs 09–19 have figures and predictions but **no notebooks yet**.

**Lab 03 prediction practice sequence (“ladder” in the code).** At the end of Lesson 03.2. Steps: trace, loop vs `@`
(requires the prescribed `w` edit), fill in, repair plus explanation, implement from a contract, fresh
problems (forward / missing weight / find the wrong row, seeded), and delayed return. Evidence is stored
by kind under `progress[lessonId].ladders.prediction`, versioned. Sidebar “Come back to” lists started ladders.

**Python runtime fixes.**
- `run(..., { timeoutMs })`: ladder checks stop after 20 s. The clock starts when the job starts running.
- A worker crash now increments `generation`, like Stop.
- The Stop button no longer passes its click event as the stop reason.
- `.ipynb` export includes stream output, execute_result, display_data (PNG) and error, each only for
  cells unchanged since they ran. Validated with nbformat 5.10.4 (schema 4.4).

**Labs 09–19 math and runnable cells.** Every lesson has a typeset formula (`formulaTex`), a symbol ↔ code
table (`mathCode`) and runnable cells (`labs/l09-metrics/notebooks.js`), placed beside the paragraphs they
illustrate, built as loops first and then checked against scikit-learn (k-NN probabilities, Naive Bayes
probabilities to 1e-15, the from-scratch tree's root split, boosting to 7e-16, and the subgradient SVM's optimum all match).
Lab 16's notebooks run the whole capstone (locked test set, pipelines inside folds, segment errors, one test
evaluation with a bootstrap interval, a generated report) and end with a scaffolded second problem for the
learner. Lesson 15.4's text wrongly called `(x·x′)²` a six-dimensional feature map; it is three-dimensional (corrected). Every output was read against the
prose; examples that did not isolate the point being taught were replaced.

**Two fixes found along the way.**
- Display math: `$$…$$` written inside a sentence was rendering as small inline math in every lab, because
  remark-math needs the fences on their own lines. `LessonText` now moves them (`displayMathOnOwnLines`,
  tested in `LessonText.test.jsx`). Long formulas were split so none overflow at desktop width. At 390 px,
  seven long equations scroll inside their own box; no page is wider than the screen.
- `tools/verify-notebooks-browser.mjs` only knew the old layout, so it had been silently skipping every
  lesson shown in order (all of Labs 01–08). It now handles both layouts and fails if it finds no notebooks.

**Authoring rules learned (apply to every new cell).**
- Pyodide is 32-bit: NumPy's index type is int32. `np.bincount` on `rng.integers(...)` output (int64) fails
  there and passes in local Python. Count with `rows == i`, or cast with `.astype(np.intp)`.
  Always run the browser check, not only CPython.
- Formulas hold symbols only; the words go in the math ↔ code table. Check with `tools/check-formula-widths.mjs`.
- Give a cell its own seeded generator when its result must not depend on earlier cells.

**Lab 03 gradient practice sequence** (end of Lesson 03.3). Trace ∇J by hand; loop, `Xᵀe` and a one-sided nudge
must agree after the prescribed `eps` edit; fill in the gradient; repair a planted sign bug and explain it; write
`gradient_step` from its contract; fresh problems of three kinds (a gradient entry, one step, diagnose a printed
gradient); and a delayed return. The fresh-problem screen is now generic (`spec.view(problem)` supplies intro, table
and questions), so later labs' sequences need no new UI. 42/42 harness checks (19 new) pass in CPython and Pyodide.

**Ladder infrastructure fixes found while building Labs 01–06.** The harness's input-mutation check treated any
array containing NaN as changed (NaN ≠ NaN): now `array_equal(..., equal_nan=True)`. The browser worker only loaded
packages imported by the code it runs, and ladder checks run the learner's code from inside a string, so a
learner's `import sklearn` was never loaded: `runtime.run(..., { importsFrom })` now loads them (verified on a fresh
page in Chromium). Trace fields accept a per-field tolerance; the grader handles 2-D answers; checks can pass integer arguments (`ints: ['k']`); explanation
feedback is per ladder. Shared helpers in `kit/ladder.js`: `scaledMistake`, `needVars`, `nearArr`, `r3`.

## Verification evidence (2026-09-25)

- `vitest run src/labs/ml-lab`: 72 files, 383 tests passing.
- Notebooks: 116/116 lesson notebooks run cleanly in local CPython (`verify-notebooks.mjs`) and in Chromium 149 with
  Pyodide 0.26.4 (`verify-notebooks-browser.mjs`): Labs 01–19 and 37.
- Formulas (`check-formula-widths.mjs`, all labs): none overflow at 1400 px; at 390 px no page is wider than the screen
  and two long Lab 37 equations (MDP dynamics, Bellman) scroll inside their own box.
- `tools/screenshot-lab-figures.mjs 19` and `37`: every inline figure at 1400 px and 390 px, no overflow or page errors.
- `tools/verify-ladders.mjs`: 23/23 in both CPython (anaconda, numpy) and Pyodide 0.26.4.
  - Accepted: 10 correct variants, including a pure-Python loop and `(X * w).sum(axis=1)`.
  - Rejected with the right diagnosis: 13 planted mistakes (no intercept, double intercept, `X * w`, whole-table sum,
    axis 0, `(n, 1)`, hard-coded 3 columns, input mutation, `None`, NameError).
- `tools/verify-ladder-browser.mjs`: Chromium 149 against the dev server.
  - Real Pyodide checks, per-case feedback, saved progress, step 2's prescribed edit.
  - 390 px width with 0 px horizontal overflow.
- The generator test covers 600 seeds × 3 kinds. It checks that answers are recomputed independently,
  exactly one wrong row appears, no denominator is zero, and misconceptions are distinct.

`scratch/ml-preview.jsx` now wraps the lab in `ThemeProvider`. Without it the preview showed dark-mode prose
colors on a light page. That was a preview-only problem, not an app bug.

## Open work, in order

0. *(Done 2026-09-25: clipped figure text.)* `kit/Plot.jsx` sizes its margins to its tick labels and marks axis
   text `ml-axis`; figure text now has a fixed size and a themed colour (it had inherited the prose size, and
   axis ticks had no dark-mode colour); `Bars` leaves room for value labels; Lesson 01.1's shape labels are on
   their own lines; Lab 12's importance chart shows true values on two scales and data that actually shows the
   bias. `tools/check-figure-text.mjs` reports no clipped text in any lab.
1. *(Done: Labs 09–19 now have formulas, symbol ↔ code tables and runnable cells.)* Remaining from the assessment's
   rows for these labs: the second and third capstone projects.
2. *(Done 2026-09-25: one practice sequence per lab for Labs 01–19.)* Each lab has `ladder.js` (the steps,
   fresh-problem generator and diagnoses) and `ladder.verify.js` (correct and wrong answers the harness must
   accept or reject), placed in the lesson that teaches the skill. Labs 12–19 cover: best split by Gini gain
   (12), bagging and out-of-bag predictions (13), boosting with shrinkage and early stopping (14), hinge loss,
   subgradient and RBF kernel (15), out-of-fold errors and a leaky feature in the capstone (16), k-means steps
   and the silhouette (17), PCA reconstruction and explained variance (18), and forecast indices, a peeking
   window and the lag table (19). The harness's `ints` option now also passes integer lists (Lab 19's lags).
   Verified: `tools/verify-ladders.mjs` 250/250 in CPython and in Pyodide 0.26.4; every expected value and
   every number quoted in a prompt cross-checked with NumPy or scikit-learn; `Ladder.test.jsx` checks them.
   Lab 03’s prediction sequence now has a “Review weighted sums in Lab 01” button (opens Lab 01’s first lesson with a way back).
3. *(Done 2026-09-25: Python runtime.)*
   - **Idle and leaving.** `runtime.release()`: lesson Python shuts down after 10 minutes with nothing running
     (never mid-run), and when the learner leaves the ML Lab (anything running is cancelled). Notebooks then
     say Python was shut down to free memory; code is kept and the next run restarts it.
   - **Caps** (in `notebook.worker.js`, per run): 100,000 characters of printed output (then one notice; the cell
     keeps running), a final value's text cut at 20,000 characters, at most 6 figures per cell (a note says how
     many were left out), and no figure longer than 1,400 px on a side. Verified in Chromium with real Pyodide:
     a 200,000-line print, 9 figures, a 60-inch figure (came out 1097 px) and a 50,000-character value.
   - **Status bar.** `notebook/PythonStatus.jsx`: anywhere in the lab, once Python has been busy for a second,
     a bar says what is running (which lesson's notebook, or a practice check), how many runs wait, and has
     Stop Python.
   - **The intermittent browser-check failure, explained and fixed.** A practice check's 20-second limit started
     when the worker said “running”, which it said *before* downloading the packages the check imports.
     scikit-learn brings SciPy (tens of MB); the browser checks use a fresh browser with nothing cached, so the
     Lab 06 check passed or failed depending on download speed, and the learner was told to look for an
     infinite loop. Reproduced on a fresh browser at 8 Mbit/s: stopped at 20 s. The worker now reports package
     downloads as “loading” and says “running” only when the code starts; same conditions: passes (28 s), with
     the bar saying “Loading the packages this code imports…”. Unit-tested in `notebook.test.jsx`.
     `tools/verify-ladder-browser.mjs` now saves a screenshot, the ladder text and the page and worker console
     when any step fails.
4. *(Done 2026-09-25: figure descriptions.)* No lesson notebook draws with matplotlib (every figure in the
   lessons is an interactive chart with its own caption), so matplotlib images are ones the learner makes and no
   author can pre-write their text. The worker now describes each figure from the figure itself: overall and
   panel titles, axis labels, legend entries, and how many lines, points, bars and images each panel has. That
   text is the image's alt text, is shown under it after “Static image from matplotlib (it cannot be zoomed or
   hovered).”, and goes into the `.ipynb` export. `tools/verify-notebook-runtime-browser.mjs` checks it in
   Chromium (11/11); that tool had also only known the old lesson layout and used Control+A, which does not
   select all on a Mac, so it silently failed every edit — both fixed.
5. *(Done 2026-09-25: Labs 01–08 orientation, bridges and the three tool connections.)*
   - **Orientation** (Lesson 01.00a, first): a paragraph on what the Python cells are, what is saved (code on this
     device; outputs for the visit; variables until restart, Stop, leaving, or 10 idle minutes) and how to read an
     error; a first cell whose “Try this” walks through a stale variable, **Restart Python for this notebook**
     (now also on that cell) and a deliberate NameError; and a prediction about the stale variable. Walked through
     in Chromium: 43, 43 (stale), NameError after restart, 43 after the fix.
   - **Bridges.** Checked every Lab 02–08 lesson for untaught prerequisites. Python/NumPy (00a) and slopes (00b)
     already exist; pandas is taught where first used (02.3). Logarithms and e were used without explanation:
     new optional refreshers (`{ bridge }` blocks, closed until opened) in 05.5 (natural log, products → sums,
     underflow, order kept, slope 1/p) and 08.1 (e, eᶻ, the sigmoid's values, the two slopes). Every number
     checked with Python; an underflow claim was wrong in the first draft and corrected.
   - **Three connections** (`{ tool }` blocks, `ToolTask.jsx`; tasks in each lab's `tools.js`). Each gives
     steps and settings, opens the tool in a new tab (the lesson stays where it is), and has a table where the hand
     value, this lesson's Python and the tool must agree:
     - 03.2 → **OpenMAT**: contributions `X * diag(w)`, their row sums and `X * w` for the four builds; the
       button saves the script as a new OpenMAT tab without replacing the learner's scripts (`kit/openmat.js`,
       tested). Matrix Lab, the named target, does not do matrix–vector products (it is row operations,
       inverses and Gram–Schmidt), so the task uses OpenMAT and the Linear Algebra course lesson instead.
     - 03.5 → **OpenMAT**: `X \ y`, predictions, residuals and `X' * r` ≈ 1e-14.
     - 05.2 → the **Applied Statistics CLT Simulator**: seed 1, Gamma(2, 0.25), n = 20, +1000 gives mean of
       means 0.497 and SD 0.077 (theory 0.079; NumPy 0.0783); a new Python cell runs the same experiment.
     - Fixes made to the tools on the way: OpenMAT's `sum`/`prod`/`mean` ignored MATLAB's dimension argument
       (`sum(C, 2)` returned 44, the grand total) — now supported and tested in `packages/openmat`, with the old
       one-argument behaviour kept. The CLT Simulator's main button was white text on a near-white background,
       its button and counters said “samples” for what are sample means; it now says “Draw 200 samples of
       n = 20”, counts “Sample means”, and shows the last sample's n values beside its one mean.
     - `tools/verify-connections-browser.mjs` does all three in the real app (Chromium): 10/10.
6. *(Done 2026-09-25: the tabular project in three stages, Lab 16.)* Stage 1, the worked example, is Lessons
   16.1–16.6. New **Lesson 16.7** holds the other two:
   - **Stage 2, scaffolded** (test-suite durations, moved out of 16.6): data and locked test set; a TODO cell
     with its target (raw columns 40.55 s, right columns ≈ 2.6 s, the noise level) and a worked answer behind a
     fold-out; the recipe written as a **rule** scores the same 2.6 s with no training (when a rule or lookup
     table beats a model); and a written rule for **rejecting weak improvements** — paired fold gains, accept
     only if mean − 2·SE > 0 and the gain ≥ δ set while framing (raw → engineered: +37.9 s, accept;
     engineered → engineered + raw: +0.015 s, reject).
   - **Stage 3, independent**: real data bundled with scikit-learn (the diabetes data, Efron et al. 2004, BSD
     licence; stated as practice only, not medical), a locked test set and baseline, and a report cell with
     `check_report` (complete, consistent, chosen model among those scored, configurations counted, beats the
     baseline or says so). Reference results sit behind a fold-out to open after the decision; they are the same
     in scikit-learn 1.4.2 (Pyodide) and 1.5.1 (local): mean 67.8, linear 43.9, forest 47.8, boosting 48.0.
   - A guide to using your own data (one row per event, inputs known before the outcome, a few hundred rows,
     permission recorded, test set locked first).
   - Verified: all cells in CPython and in Chromium/Pyodide (Lab 16: 7/7); formula widths at 1400 and 390 px.
   - Found on the way: a block list for a lesson id that does not exist was silently dropped (16.7's blocks
     were, until its lesson was placed in the right array). `withBlocks` now throws on that, with a test.
7. **Labs 20–36 and 38–61**, one lab at a time, to the Labs 09–19 standard (ordered blocks, runnable cells
   with formulas and symbol ↔ code tables, figures, predictions, one practice sequence).
   *(Done: Lab 20.)* Lab 20 (backpropagation): 10 cells (the forward pass, the backward pass by hand, the
   `=`/`+=` bug, a forgotten reset, the playground's neuron, saturation, three training steps, the ε sweep, and a
   ~50-line scalar autodiff engine); figures `ForwardGraph`, `BackwardSteps` (also for the shared-input graph),
   `Saturation`, `EpsilonSweep` built on the lab's engine; five predictions; the `backprop` sequence. Verified: cells
   in CPython and Chromium (5/5); ladder 263/263 in both runtimes; formula widths and figure text at 1400/390 px.
   Cells for later labs are generated from the exact files that were run (a small generator writes notebooks.js).
   Found on the way: a figure used an undefined colour (`--chart-test`) and drew nothing; a test now checks every
   chart colour a figure uses is defined.
   *(Done: Lab 21.)* 11 cells (a dense layer on the XOR corners with every shape printed, parameter counts, linear
   layers collapsing, activation slopes through depth, softmax overflow and its fix, a finite-difference check of
   p − 1[y], a checked two-layer backward pass, all-zero weights stuck at log 2, activation spread through ten
   layers for three scales, training XOR, capacity on a spiral); figures `LayerShapes`, `ActivationSlopes`,
   `SoftmaxBars`, `InitSpread`; five predictions; the `mlp` sequence (its probe: zero init leaves 1 distinct
   hidden unit and loss 0.693, scale 1.0 solves XOR). Corrected on the way: 21.4 and the playground called
   N(0, 1/fan_in) “Xavier”; that is LeCun’s rule (Glorot’s variance is 2/(fan_in + fan_out)) — the text now
   says so and the playground option is labelled LeCun. Verified as for Lab 20 (ladder 277/277 in both runtimes).
   *(Done: Lab 22.)* 10 cells (mini-batch gradients unbiased with spread ∝ 1/√B, batch size over 20 epochs, momentum’s
   velocity, gradient descent against momentum on the valley, Adam’s first step with and without each correction,
   momentum against Adam over five seeds with the same budget, warm-up plus cosine, clipping, the first-loss check,
   and three runs to diagnose); figures `BatchSpread`, `ValleyPaths`, `AdamScale`, `ScheduleCurves`; five
   predictions; the `optim` sequence (probe: one seed against eight). Checked and kept: 22.3’s claim that without m’s
   correction the first step is ten times too small is right when v is corrected (0.10×; only-m 31.6×; neither 3.16×).
   Ladder 290/290 in both runtimes.
   *(Done: Lab 23.)* PyTorch does not run in the browser, so the 8 cells are NumPy and plain Python that follow
   PyTorch’s conventions and say so (accumulating .grad, a Linear/Sequential stand-in with (out, in) weights, the loop
   with momentum and without zero_grad — diverges to 2e13 by step 100, dropout’s train/eval modes, the transpose when
   copying weights, float32 against float64 tolerances, resuming with and without the optimizer’s state, seeds).
   Each lesson also has a fold-out with the real PyTorch code and its output from a local run (PyTorch 2.14.0, CPU,
   in a throwaway environment), generated from the files that were run. The Implement tab’s `verify_pytorch.py`
   was run for the first time and passes (loss and every gradient match NumPy; a checkpoint with optimizer state
   resumes exactly). Figures `ZeroGradCurves`, `ResumeDrift` (from the lab’s simulation); five predictions; the
   `torch` sequence. Corrected: 23.4’s tolerance advice (a purely relative test fails near zero — shown in a cell).
   Ladder 302/302 in both runtimes. The attach step for notebooks had checked for the word “extras”, which 23.1’s
   text contains; it now checks for the import line.
   *(Done: Lab 24.)* 10 cells (dense against convolution parameter counts, the shifted-digit experiment with the
   playground’s glyphs and scikit-learn, Sobel on an edge by two loops, output sizes checked against the loop,
   equivariance, max-pooling, convolution features that survive the shift, receptive fields by poking one pixel,
   shift augmentation, a patient-level split); figures `ConvSlide` (patch and nine products for any output cell,
   stride, padding), `ShiftFeatures`, `RFGrowth`; five predictions; the `conv` sequence (probe: pixels 0.12 against
   convolution features 0.99 on moved digits). Checked: the playground’s 21% / 99% / 85% claims in 24.3 and 24.5.
   Ladder 314/314 in both runtimes.
   *(Done: Lab 25.)* 10 cells (lookup = one-hot × E and its shapes, embedding gradients only on used rows, the mean
   forgetting order, a pooled baseline at the majority rate against an order-reading rule at 100%, three RNN steps,
   vanishing/exploding through 50 steps, masked and unmasked means and RNN states under extra padding, overlapping
   windows across a random split (79 of 79 contaminated) against a time split (3), the “[bot]” shortcut); figures
   `OrderMean`, `GradThroughTime`, `PadDilution`; five predictions; the `rnn` sequence (probe: padding to 16 moves an
   unmasked state). Corrected: 25.2 and 25.5 said the base rate was about 57% and the shortcut model beat it by 3
   points; the playground’s own numbers are 59.7% and 0 points. Ladder 325/325 in both runtimes.
   Next: Lab 26.

(The assessment calls items 1–2 “Slice A”, 5 “Slice B”, 6 “Slice C” and 7 “Slices D–F”.)

No beginner review has been done. Nothing here is beginner-reviewed.
