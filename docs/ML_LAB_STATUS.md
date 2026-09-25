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

1. *(Done: Labs 09–19 now have formulas, symbol ↔ code tables and runnable cells.)* Remaining from the assessment's
   rows for these labs: practice sequences (ladders) and the second and third capstone projects.
2. *(Done: Lab 03 gradient practice sequence.)* Next: practice sequences for Labs 01–19, one skill per lab, as the assessment's rows describe.
   Also link Lab 01's weighted-sum lesson into the prediction sequence.
3. **Python runtime:**
   - Shut Python down when idle, and when the learner leaves the lab.
   - Cap output and figure size.
   - Show that Python is running even outside the notebook toolbar.
   - Explain the intermittent browser-check failure the previous agent reported.
4. **Figure descriptions:** matplotlib images still say only “Figure k produced by cell n”. Each lesson needs a
   real description or table.
5. **Labs 01–08:** practice sequences and short refreshers on Python, NumPy and math. Also check the three
   links to the app's math courses and tools (Matrix Lab, OpenMAT least squares, statistics sampling) task
   by task.
6. **Labs 09–19:** runnable Python and practice sequences, following each lab's row in the assessment's
   table. Then a tabular project in three stages: worked example, scaffolded version, independent version.
7. **Labs 20–36 and 38–61:** nothing done: no ordered lessons, runnable cells or practice sequences.

(The assessment calls items 1–2 “Slice A”, 5 “Slice B”, 6 “Slice C” and 7 “Slices D–F”.)

No beginner review has been done. Nothing here is beginner-reviewed.
