# MathOS: a programmable scientific workspace

## Direction

MathOS should support an engineer or scientist's full working loop: bring in data,
check units and assumptions, calculate, visualize, write code, fit models, compare
results and export reproducible work. It must remain usable in a browser without
an account. Existing specialist labs should connect to this workflow instead of
being duplicated under another name.

## Implemented — 2026-10-10

- Opens across the browser viewport, with restore/maximize controls and a movable
  restored window. Window bounds stay visible after viewport resizing. Titlebar
  buttons do not initiate dragging.
- Starts with room for calculations rather than two open sidebars. Narrow screens
  switch between workspace, variables and tools; a compact tool selector and
  collapsible examples preserve vertical space.
- Calculation history is visible and can restore an input and its recorded result
  without silently recomputing it. Compute explicitly reruns with current variables.
  The retained calculation history is bounded in memory as well as storage.
- Project export/import and clipboard copy/paste use a validated versioned JSON
  format. It includes current JavaScript/Python/OpenMAT drafts, saved scripts,
  variables, formulas, named matrices, matrices A/B, statistics input, graph
  functions/bounds, current expression and angle mode. Import asks before replacing
  work and never runs programs. Persistent collections are saved before changing
  the live workspace, with rollback on write failure.
- Export is a project-input exchange format, **not a complete session backup**:
  calculation history, outputs, auxiliary solver inputs, animation and inspector
  objects are not included. Drafts restored from a file remain live session state;
  export them again or save scripts before a page reload. Clipboard permissions
  depend on the browser; file transfer remains an alternative.
- Programming controls lead into the existing JavaScript, Python/NumPy/Matplotlib
  and OpenMAT runners. An editable linear regression example trains on one dataset
  and reports held-out error and a prediction. It runs locally as JavaScript.
- Machine Learning Lab and Python Notebook Lab are available through the project
  controls using the shared lab-opening API. These are separate existing tools;
  automatic dataset transfer between them is not implemented yet.
- Graphs reject invalid axis ranges visibly. Grid work is bounded even when
  floating-point rounding would prevent a tick loop from advancing.

## Next work, in order

1. Extend the shared dataset workflow with richer type previews, multiple tables
   and explicit missing-value transformations.
2. Units and dimensional checks, constants with provenance, uncertainty and
   significant figures. Show assumptions and numerical limitations alongside results.
3. Reproducible programs: isolated workers with cancellation, explicit dependencies,
   reliable Python-state reset, named experiments, recorded inputs and script export.
4. ML workflows: split train/validation/test data, preprocessing fitted only on
   training data, baseline models, appropriate metrics, repeatable random seeds,
   prediction tables and model/result export. The regression example is only a start.
5. Full project persistence for all solver settings and platform objects, versioned
   migrations, storage failure recovery and cross-tab conflict handling.
6. Plot interaction and publication export; then domain-specific engineering and
   scientific workflows, built on the common units/data/programming foundation.

## Verification

### Shared dataset increment

- Data & models accepts CSV/TSV/semicolon tables with preview, header selection,
  quoted fields and clear malformed-input errors. Tables are limited to 10,000
  rows, 32 columns and 2 MB source text; editing is paginated.
- Numeric columns share descriptive statistics, selectable scatter plots and
  ordinary-least-squares regression. Missing/nonnumeric values are counted,
  never coerced to zero. The first 80% of complete rows train, the remaining rows
  test; held-out RMSE is compared with a training-mean baseline. This ordered
  holdout does not replace cross-validation or a representative test set.
- CSV copy/download, prediction CSV and model JSON exports are available.
  Spreadsheet exports protect formula-like text; project JSON retains exact text.
  Dataset tables persist locally and are included in project files. Models are
  transient and must be refitted after editing, switching tools or reloading.
- JavaScript/Python handoff creates an editable program containing a snapshot of
  the table, after confirmation to replace the draft. It does not execute code.
- `node node_modules/vitest/vitest.mjs run src/tools/math-os`: **3 files, 13 tests
  passed**. Covers quoted CSV, missing values, malformed input, held-out isolation,
  constant-feature rejection, CSV escaping and dataset project persistence.
- Extended browser checks cover editing, scatter plots, fitting, invalidation,
  prediction downloads and dataset preservation in project files and phone views.

### Earlier workspace foundation

- `node node_modules/vitest/vitest.mjs run src/tools/math-os`: **2 files, 7 tests
  passed**, covering graph bounds, JSON round-trip and rejection, import-write
  rollback and actual regression training with held-out evaluation.
- `node node_modules/typescript/bin/tsc --noEmit`: **exit 0, no diagnostics**.
- `node scripts/check-mathos-browser.cjs`: **passed** against development port 5187.
  Exercises real calculations, fullscreen/restore, titlebar controls, history and
  reload, JSON file exchange, browser clipboard exchange, real ML program output,
  phone panels and controls, invalid graph ranges and recovery, and closing.
  Rejects uncaught page errors. Start a server first; stop it after checking.
- Desktop and phone screenshots were inspected. Files and screenshots stay in the
  ignored `.cache/mathos-verification` folder.
- `node --max-old-space-size=8192 node_modules/vite/bin/vite.js build`: **passed in
  4m 23s**. Existing dependency, eval and chunk-size warnings remain visible.
- `node scripts/check-mathos-browser.cjs http://127.0.0.1:5188`: **passed against
  production preview**, including the Machine Learning Lab launcher. Both local
  verification servers were stopped afterwards.
- `npm.cmd run docs:check`: **10 contributor files checked; links, paths and commands
  all exist**. `git diff --check` passed (only Windows line-ending notices).
