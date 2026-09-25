# Data Science course: beginner teaching audit and repair plan

Date: 2026-09-25. Implementing-agent handoff.

## Scope and verdict

The course has 35 pages across four chapters. I inspected every page's core explanation and prerequisite metadata, inventoried every page's notebook cells, and inspected selected notebook implementations and quizzes in more depth. This is a whole-course instructional audit with sampled executable-content review, not a claim that every cell or mathematical statement has been tested.

The public URL could not be fetched through the web reader. Findings refer to the local source backing `/#/chapter/data-science-4/gradient-descent`; deployed/local parity and rendered browser behavior remain to be checked. No server was started.

Before this change, all 35 pages used three intuition paragraphs followed by notebook demonstrations/challenges. Notebook availability is not the main gap: every page already references the shared `PythonNotebook`. The gap is that too much explanation is compressed into definitions and instructions such as “Run and observe,” leaving the learner to infer the mechanism from code. Some examples do not demonstrate the behavior their instructions promise.

**Recommendation:** repair correctness first, then rewrite in dependency order beginning at page A01. Use gradient descent as an immediate improved example, not proof that the rest of the course is repaired. Keep existing lesson IDs and URLs stable because other courses and ML labs link to them.

## Changes made in this assessment

`4-modeling-inference/005-gradient-descent.js` was rewritten with:

- A concrete file-size/duration example that names input, target, weight, bias, prediction, error and loss.
- A small-change explanation of derivatives and a derivation for `(t-3)^2` before a gradient formula.
- A hand-calculated one-parameter update and a two-parameter update.
- A three-row dataset shared by the explanation, loop, NumPy code and direct-solver comparison.
- Mean squared error consistently used in prose, gradients and code.
- Simultaneous gradients, post-update loss, learning-rate conditions and generalization limitations.
- Seven demonstration cells, a one-expression exercise and a batch-step implementation exercise with new-data checks.
- A visual path with a printed table, explicit learning-rate experiments, and revised quizzes without the old universal convergence claims.

Verification: the seven demonstration cells ran independently in local Python using the app's actual `opencalc` library source; both challenge reference implementations passed and untouched starters failed; independent hand calculations and the specified learning-rate cases passed. The JavaScript lesson module imports successfully. No browser render/execution verification or deployment was performed.

Remaining for this page: verify desktop/mobile display, math links, the Figure renderer, challenge feedback and notebook persistence in the course's actual shared runtime. Its current schema still groups prose before the notebook; the rewrite improves teaching content but does not implement true interleaving.

## Correctness pass completed (2026-09-25)

Every row in the table below has been addressed in the lesson source (rollout step 1). Lesson IDs, slugs and existing cell IDs are unchanged; new demonstration cells use previously unused IDs.

- **Shared renderer bug found and fixed:** `FigureRenderer.jsx` drew `transformed_grid([[a,b],[c,d]])` as the transpose (î → `[a,b]`), and `quick_transform` in `opencalcLibSource.js` drew basis vectors and `Tv` from rows. Both now match NumPy `A @ v` (î → column `[a,c]`). This also corrects the linear-algebra and python courses, whose prose already described the column convention.
- **Demonstrations that did not show their claim were replaced:** D02's CLT cell plotted fitted normal curves, so it looked normal at every N; it now measures skewness of draws versus means, with a Cauchy counterexample. D04 Stage 1 promised a histogram and red line it never drew. D06 compared candidates on the test set, and its unscaled high-degree polynomials made training error rise with degree. It now uses train/validation/test with a baseline, scaled features, and a sample size where the validation U-shape really appears.
- **New cells:** A05 2b (misspelling/scope NameErrors), A08 2b (rebinding vs mutation), A14 4b (hashability), B01 6 (right-aligned broadcasting and the `(n,)`/`(n,1)` bug), C04 4b (train-only fit, zero spread, unseen category), C06 1b (what the checklist catches and misses), D02 4b (Cauchy), D03 4b (funnel vs curve), D04 1b (paired sign-flip vs invalid unpaired shuffle).
- **Verification:** all 35 modules import under Node with no duplicate cell IDs. Every changed or new non-challenge cell ran from a clean namespace in local CPython 3.13 (numpy 2.4, pandas 3.0, scipy 1.18, sklearn 1.9) against the app's `opencalc` source, and its printed output matched the prose. Intended errors (A01 5–6, A05 2/2b) raise as described. The D03 challenge reference solution passes its test. **Not done:** browser/Pyodide rendering (including the renderer fix and histogram overlays) and a check that Pyodide's package versions produce the same outputs.

## Backlog pass completed (2026-09-25)

The course now has 42 pages. Every original page was rewritten, and seven were added. Existing lesson IDs and slugs are unchanged. File-number prefixes changed only where a new page was inserted; routes use the slug, so no URL or progress key changed.

**Page format.** Every page uses the `intuition.blocks` format, built with the helpers in `src/courses/data-science/lessonKit.js`. Explanation, prediction checks and runnable notebooks are interleaved in reading order. Each page follows the required format:

- the goal;
- the smallest example, with worked numbers;
- a prediction check;
- stages that each make one meaningful change;
- guided practice, then a fresh problem.

Every practice challenge carries a reference `solution` and `misconceptions`: wrong answers that fail with targeted feedback.

**Bridges added.** Existing IDs are kept, and the new IDs continue each chapter's sequence:

| Page | ID | Covers |
|---|---|---|
| A00 Using the notebook | `a-00` | Execution order, shared state, restart, errors, package loading |
| C "Reading and joining data" | `c-07`, ordered before EDA | CSV parsing, data dictionary, join cardinality, duplicate keys, unmatched rows |
| D "Sampling and populations" | `d-07`, ordered before regression | Population, unit, sampling bias, dependence, first held-out split |

Reproducibility is split across pages. A00 teaches restart and run-all. The chapter projects use explicit seeded generators and record library versions.

**Chapter projects.** Each has worked, scaffolded and independent parts:

- A16 data-summary program (`a-16`);
- B09 growth investigation (`b-09`);
- C08 cleaning and EDA (`c-08`);
- D08 baseline and model comparison with held-out evaluation (`d-08`).

**ML prerequisite contracts.** Each target now teaches its contract, and each `ds.*` link lands on a named section rather than the top of the page:

| Link | Anchor | Link | Anchor |
|---|---|---|---|
| `ds.vectorize` | `shapes-and-broadcasting` | `ds.evaluation` | `leakage` |
| `ds.explog` | `products-to-sums` | `ds.eda` | `report` |
| `ds.linreg` | `least-squares` | `ds.cleaning` | `missing-values` |
| `ds.gd` | `gradient` | `ds.features` | `fit-and-apply` |

- **Anchors in lessons:** any block can take an `anchor`. Both lesson renderers wrap an anchored block in `id="section-<anchor>"`.
- **Scrolling:** `LessonPage` scrolls to `?section=<anchor>` after the lesson loads.
- **Return path:** ML-lab links open in a new tab, so the lab tab stays where it was.
- **Test:** `mathLinks.test.js` asserts that each anchor exists in its target file.

**Runtime and rendering changes.** These are in the shared components, so they apply to every course:

- **Expected errors:** cells marked `expectError` show an "Expected error" note, and "Report this" is hidden for them.
- **Failed challenges:** feedback shows only the assertion message.
- **Run all:** skips challenge cells.
- **Reset variables:** a new button clears names defined after startup, along with outputs and counters.
- **Inline code:** `parseProse` renders backtick code.
- **Callouts:** block callouts accept `kind`.
- **Lists:** a paragraph holding a multi-line markdown list renders as a list, instead of one run-on bullet.
- **Figures:** `Figure.show()` serialises NumPy scalars and arrays.

**Verification.**

- **Course verifier:** `scripts/check-data-science-course.mjs` runs every cell in Pyodide 0.26.4, the version the app loads (Python 3.12, numpy 1.26, pandas 2.2, 32-bit ints). It checks that:
  - demonstrations run from a fresh namespace, and their expected output and expected errors match;
  - every challenge starter fails, every reference solution passes, and every misconception fails with its feedback;
  - check answers, quiz indexes, prerequisite and unlock IDs, and math-link targets are valid;
  - prose contains no bare `$` and no stray `*`.

  Result: 42 pages, 361 cells, 122 challenges, 0 failures.
- **Vitest:** `src/labs/ml-lab/kit` and `src/data` pass (5 files, 16 tests).
- **Browser:** a bounded Playwright run against the Vite dev server passed 22/22 checks on desktop. The server was shut down afterwards. It confirmed:
  - blocks, tables and inline checks render;
  - a cell runs in Pyodide from the CDN;
  - the expected-error note appears, and Reset clears its notebook;
  - `?section=leakage` scrolls to the section;
  - multi-line lists and inline code render;
  - all six new routes load, with no page errors.

  A phone-width (390 px) run confirmed the anchor, scrolling, lists and no horizontal overflow.
- **Pyodide findings:** differences between local CPython and Pyodide changed some content:
  - int32 overflow is now taught explicitly in B01;
  - `np.linalg.solve` returns nan for singular systems instead of raising, so B08 and D04 check rank and condition number instead.

**Still open.**

- **No learner testing:** the rewrite has not been tried with a basic-Python learner.
- **Figures in the browser:** the `transformed_grid` and `quick_transform` renderer fix was verified by running the affected cells, not by visual inspection in a browser.
- **Worker notebook migration:** not done. The course still uses the main-thread `PythonNotebook`. It has no Stop button or draft persistence, and all notebooks on a page share one kernel. That is why Reset clears every notebook's variables.
- **Deployed site:** parity with the deployed site was not checked.
- **Pre-existing tooling issue:** `scripts/check_python_cells.mjs` still cannot import lessons that import `.svg` files (linear algebra).

The sections below are the original plan, kept for reference.

## Correctness fixes to prioritize before broader rewriting

| Location | Current issue | Required correction |
|---|---|---|
| A01 What is a program | “Literally” line-by-line interpretation and every line falling into three categories are overgeneralizations. | Teach the sequential execution model for these examples, distinguish parsing from execution, and introduce control flow as an extension. |
| A02 Types | “Python has four primitive types” sounds exhaustive. | Say these are four common built-in types used first; distinguish exact type from `isinstance`, noting bool/int relationship when useful. |
| A03 Expressions | Same-precedence operators are said to associate left to right universally. | Show `2**3**2 == 2**(3**2)`; separate precedence, associativity and evaluation order. |
| A05 State | NameError “always” means assignment order or missing assignment. | Include spelling and scope; frame variable tables as a useful simplified model of state. |
| A08 Functions | Local variables are said to prevent functions from affecting outside objects. | Demonstrate mutation of a passed list and explain local bindings versus shared objects. |
| A12 While | No modified “termination variable” is said to imply an infinite loop. | Explain `break`, return, exceptions and changing external conditions; teach a bounded beginner pattern without claiming all loops fit it. |
| A14 Dictionaries | Lookup described as instant regardless of size; keys described as immutable. | Explain average-case constant-time lookup as an approximation, and require hashability; tuples containing lists are a useful counterexample. |
| B01 Arrays | Arrays universally described as contiguous and containing no object pointers; broadcasting as expanding the smaller array. | Use numeric arrays as the starting case, acknowledge views/object arrays later, and teach the actual right-aligned shape compatibility rule. |
| B03 Linear functions | Least-squares line claimed unique without qualification. | Explain the need for varying input values and distinguish a model's mean relationship from its error distribution. |
| B07 Matrices | For `[[a,b],[c,d]]`, prose maps basis vectors to rows; it also contains a malformed matrix-vector formula. | With column vectors, basis vectors map to `[a,c]` and `[b,d]`; use `v[0]*A[:,0] + v[1]*A[:,1]`. |
| B07 Composition | Rotation and uniform scaling are used to demonstrate order changing the result. They commute. | Use non-uniform scaling or shear, calculate both products and verify they differ on a specified vector. Explain commuting as a special case. |
| B07 Determinant | Area scaling omits sign meaning. | Area scales by the absolute determinant; its sign indicates orientation reversal. |
| C03 Cleaning | Repeated rows are treated as automatically removable; string arithmetic claims are too broad. | Define observation identity and inspect duplicates before removal. Show specific conversion errors rather than “every operation silently fails.” |
| C04 Transformation | Logs “fix” skew; one-hot encoding is “required before any numeric ML algorithm.” | Explain domain restrictions and diagnostic comparison; encoding is model/task dependent. Fit learned preprocessing on training data only. |
| C06 EDA | Unsupported “catches 80% of problems” claim. | Remove the percentage; demonstrate specific errors caught and limitations. |
| D02 Distributions | CLT stated for independent draws from ANY distribution, always normal for large N. | Start with iid finite-variance conditions and the distribution of standardized sample means. Include a limitation/counterexample; samples themselves do not become normal. |
| D03 Regression | Explicit inverse presented as the normal computational solution. | Derive the normal equations separately; use `lstsq` for calculation and discuss rank/conditioning. A residual funnel need not mean the fitted mean is wrong. |
| D04 Testing | Permutation tests called completely general and assumption-free. | Explain exchangeability under the null, paired/grouped/time designs and how to choose a valid permutation scheme. |
| D05 Optimization | Summed prose loss versus mean gradients; universal monotonicity/convergence; unexplained derivatives. | Addressed by the local rewrite; verify rendering and guided tasks. |
| D06 Evaluation | “Always visible” overfitting claim and guaranteed “just right” degree; test scores compared across candidate models despite the warning against tuning on test. | Distinguish suggestive evidence from guarantees. Compare candidates using validation/CV, choose once, then evaluate on an untouched final test set. |

Sources for implementation checks: [Python expression rules](https://docs.python.org/3/reference/expressions.html#operator-precedence), [NumPy least squares](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html), and [scikit-learn leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html). Read and verify the relevant official documentation when making the corresponding changes; links are not substitutes for a worked explanation.

## Required page format

Do not solve the problem by replacing three paragraphs with an equally unstructured wall of text. Organize each page into a few learning steps:

1. State what the learner will be able to do and show the smallest meaningful example.
2. Explain each quantity and operation in plain language; work through actual numbers.
3. Ask for a prediction before showing the result.
4. Put a short runnable cell beside the explanation where the renderer supports it.
5. Explain the output, then ask for one meaningful change.
6. Supply guided practice and a fresh independent problem, with misconception feedback.

Place longer implementations after the ideas they combine. Each notebook needs enough explanation to stand alone if opened separately. Distinguish demonstrations, intentionally failing debugging tasks and unfinished challenges so Run All and verification do not confuse them.

Add real traces, before/after tables, small diagrams and numeric alternatives to plots. Every visualization must answer a stated question; every claimed output must be checked. Avoid using an advanced symbol in the paragraph that is supposed to introduce the concept.

## Page-by-page backlog, starting at the first page

Priorities: P0 = incorrect or misleading foundation/evidence; P1 = learning support; P2 = extension after the core is dependable. Every page needs the common standard above in addition to its specific work.

| Page | Priority | Teaching work and acceptance task |
|---|---|---|
| A01 What is a program | P0/P1 | Trace a three-line price calculation with visible values/output; show a parse error versus a runtime error. Learner predicts which lines execute and explains why. |
| A02 Values and types | P1 | Use the same quantity as `3`, `3.0`, and `"3"`; show operation results and conversion failures. Learner chooses a useful type and repairs a mismatch. |
| A03 Expressions | P0 | Evaluate a small expression tree one operation at a time, including exponent associativity and negative floor division. Learner predicts a new expression without guessing from PEMDAS. |
| A04 Bindings | P1 | Draw names pointing to values; contrast rebinding with equality; introduce aliasing carefully. Learner traces `x=x+1` and explains what changed. |
| A05 State | P0/P1 | State table after each executed line; notebook out-of-order example; restart/run-all recovery. Learner diagnoses a misspelled or out-of-scope name. |
| A06 Built-ins | P1 | Trace argument → return value and contrast print output with None. Learner selects a built-in and uses its result in a new calculation. |
| A07 Composition | P1 | Expand nested calls into named intermediate values and recombine them; demonstrate a None-producing inner call. Learner predicts a novel composition. |
| A08 Defining functions | P0 | Explain parameter/argument/return/scope with two calls; contrast returning a new list and mutating the input. Learner writes and tests a small pure function. |
| A09 Boolean logic | P1 | Truth tables plus short-circuit traces; explain operand-return behavior separately from boolean-only examples. Learner writes a range check and explains its boundary cases. |
| A10 Conditionals | P1 | Trace exactly one branch, include equality boundaries and indentation; delay ternary shorthand. Learner tests all branches of a small decision. |
| A11 For loops | P1 | Introduce literal lists before relying on A13; table of iteration/item/accumulator; loop before comprehension. Learner builds a sum and count with correct initialization. |
| A12 While loops | P0 | Trace a stopping condition, off-by-one failure and maximum-iteration guard; explain break. Learner repairs a bounded convergence loop. |
| A13 Lists | P1 | Index/slice diagrams including negative steps; alias/copy and mutation examples. Move essential indexing earlier or provide a bridge for A11. Learner explains a slice and an aliasing surprise. |
| A14 Dictionaries/sets | P0 | Use a tiny inventory and distinct-category task; hashable-key examples; explicit missing-key handling. Learner aggregates repeated items and explains uniqueness. |
| A15 Debugging | P1 | Guided traceback, minimal reproduction, expected-versus-actual table and assertions. Learner fixes an unfamiliar small bug and explains its cause. |
| B01 Arrays | P0 | List versus numeric array, axis/shape table, loop-to-vector mapping, broadcasting counterexample. Learner predicts shapes before running and catches an `(n,1)`/`(n,)` error. |
| B02 Plotting | P1 | Explain axes, units, marks, binning and scale using one small dataset; show tabular equivalents. Learner chooses a plot and states a justified observation. |
| B03 Slope | P0/P1 | Two concrete measurements, change in y/change in x, units, intercept and residual sign. Defer least-squares derivation to D03. Learner interprets a new fitted line. |
| B04 Exponentials/logs | P1 | Repeated multiplication and inverse questions before `e`, differential equations or log identities; distinguish semilog/log-log axes. Learner computes and interprets a transformation, including zero/negative restrictions. |
| B05 Vectors | P1 | Numeric components and geometric arrows with one shared example; magnitude, addition and zero-vector normalization. Learner explains when coordinates are features rather than physical directions. |
| B06 Dot product | P1 | Matching products → sum → weighted prediction before angle identity, then similarity/projection; zero-norm guard. Learner distinguishes inputs, weights and the resulting scalar. |
| B07 Matrices | P0 | Correct basis images, trace row-by-column and column-combination views, use a noncommuting pair and signed determinant example. Learner verifies both views agree. |
| B08 Systems | P1 | Solve two equations by hand then with code; unique/no/infinite solution examples, residual check and conditioning. Learner explains what `solve` and `lstsq` answer. |
| C01 pandas | P1 | Provide a six-row table, explain Series/DataFrame/index/column, `loc` versus `iloc`, types and alignment. Learner selects rows/columns and verifies exact output. |
| C02 Descriptive statistics | P1 | Compute mean/median/spread by hand on one small set; show an outlier change; explain population/sample denominator choices and quartile conventions. Learner chooses a useful summary without universal skew claims. |
| C03 Cleaning | P0 | Provide dirty rows and an explicit quality contract, track affected rows and preserve raw data; explain missingness and valid duplicates. Learner justifies each repair and fits fill values on training rows only. |
| C04 Transformations | P0 | Compare raw/log/scaled data; handle zero spread and unseen categories; train-only fit/apply split. Learner reproduces preprocessing on new rows without leakage. |
| C05 GroupBy | P1 | Unequal-size groups with unequal means; show split/apply/combine tables and aggregate versus transform shapes. Learner explains why average group means can differ from overall mean. |
| C06 EDA | P0/P1 | A worked investigation with a question, data dictionary, findings and limitations; plots after summary surprises. Learner writes an evidence-based short report rather than ticking commands. |
| D01 Probability | P1 | Count a small sample space, then simulate; intersection/union/conditional denominator and natural-frequency Bayes example. Learner explains independence instead of only plugging formulas. |
| D02 Distributions | P0 | Mass versus density versus area; mean/SD; individual observations versus means across repeated samples; correct CLT conditions. Learner explains what converges and what does not. |
| D03 Regression | P0 | Tiny labeled dataset, prediction/residual/loss table, scalar slope derivation before matrix form, stable solver and evaluation bridge. Learner fits and diagnoses a model, with constant-input and heteroscedastic cases. |
| D04 Hypothesis testing | P0 | Specify null, statistic, tail and valid shuffle; one permutation by hand, then repeated simulation; effect size/uncertainty and multiplicity warnings. Learner explains assumptions and a non-significant result without claiming equivalence. |
| D05 Gradient descent | Local first pass done | Verify the rewritten page in the course UI; interleave where feasible; add a targeted debugging stage and fresh retry after the existing scaffold. Learner calculates, implements and diagnoses an update. |
| D06 Evaluation | P0 | Train/validation/test diagram, baseline, appropriate grouped/time/random splits, pipelines inside CV and final untouched evaluation. Learner repairs the example's candidate comparison and reports uncertainty. |

## Missing bridges and project milestones

- **Notebook orientation:** running cells, restart, saved edits, execution order, package loading and common errors. Do not assume knowing basic Python means knowing notebook state.
- **Derivative bridge before D05:** now included locally; create a reusable short slope/partial-derivative bridge rather than requiring an entire calculus course.
- **Sampling before inference:** population, observation unit, sampling bias and dependence before confidence claims, tests or train/test splits.
- **Validation before modeling decisions:** D03 needs a short held-out-data introduction rather than waiting until the final page to mention generalization.
- **Data acquisition and joins:** add explicit CSV parsing/data dictionary and a small join-cardinality lesson before a realistic EDA project; teach duplicate keys and unmatched rows.
- **Reproducibility:** seed, input data, configuration, code/library versions, output interpretation and restart-and-run-all. Use explicit random generators for new examples.
- **Chapter projects:** A—small data-summary program; B—numeric/visual investigation; C—documented cleaning and EDA; D—baseline/model comparison with a held-out evaluation. Each needs a worked, scaffolded and independent version.

Do not silently renumber routes to improve ordering. Add bridges or change navigation metadata while maintaining existing links and progress identities.

## ML prerequisite contracts

| Link key | Page must actually support | Acceptance evidence |
|---|---|---|
| `ds.vectorize` | Numeric arrays, shapes, axes, broadcasting and loop equivalence | Fresh shape task and matching scalar/vectorized computation |
| `ds.explog` | Exponents, natural logs, inverse meaning, domains and product-to-sum identity | Concrete probability/product example with interpreted output |
| `ds.linreg` | Prediction, residuals, MSE/SSR convention, least squares and numerical solve | Small hand fit plus stable solver and residual interpretation |
| `ds.gd` | Derivative/gradient meaning, simultaneous update, learning-rate limitations | One hand update, executable batch step and failure diagnosis |
| `ds.evaluation` | Baselines, split purpose, leakage, CV and final-test distinction | Corrected pipeline/evaluation task on a new scenario |
| `ds.eda` | Ask a question, inspect data, summarize/plot and state limitations | A short reproducible investigation report |
| `ds.cleaning` | Justified repair rules, missingness, duplicates and training-only imputation | Before/after rows, preserved raw input and independent new-row application |
| `ds.features` | Valid transformations, scaling and categorical handling | Fit-on-training/apply-to-new-data task, including edge cases |

Audit exact target sections, not only file existence. When linking to a long page, provide a stable section/cell anchor and a return path. A target missing its contract needs teaching added before the link is counted as complete.

## Runtime and rendering work

Data Science currently uses the shared `src/components/notebooks/PythonNotebook.jsx`. The ML lab's newer worker notebook is a separate component; fixes there do not automatically protect these course pages. Verify Stop, main-thread responsiveness, draft persistence, plot export, fresh namespaces and challenge behavior here before promising the same guarantees.

A migration must preserve the existing `opencalc.Figure` JSON protocol, challenge fields, intentional error demonstrations, theme/editor settings, saved code and desktop/mobile rendering. Do not redirect these cells to a worker that cannot import `opencalc` or display its figures. Test one representative course page before broad migration.

Check whether the active course renderer supports interleaved explanation/code blocks. Prefer an adapter that preserves legacy pages over a course-wide schema rewrite. Long derivations should be optional, but the minimum explanation necessary to run and understand a cell must be visible beside it.

## Verification and rollout

1. **Correctness hotfixes:** repair B07, D02–D04, D06 and the misleading foundational claims; preserve URLs. Record the exact expected output for each repaired demonstration.
2. **First-page teaching pass:** rewrite A01 onward using small traces and decreasing support. Test with a basic-Python learner; record where the explanation still assumes too much.
3. **Mathematical bridge pass:** B01–B08, including genuine examples for operation order, zero vectors, singularity and different scales.
4. **Data workflow pass:** C01–C06 with one shared small dataset, verified dirty-data decisions and a reproducible EDA project.
5. **Modeling pass:** D01–D06 with correct assumptions, the derivative bridge, and a consistent evaluation story.
6. **Link certification:** verify all eight ML prerequisite contracts and the actual destination/return workflow.

For every page, verify demonstrations from a clean namespace, the instructed edits, expected numerical output/figure data, intended error cases, reference solutions and failing starters. Test notebook state/navigation separately from numerical correctness. Use real browser checks for rendering/imports/plots and retain complete failure logs. Code executing successfully is not evidence that its explanation is correct.

Done means a beginner can explain and perform the stated task on a fresh example, recover from a common mistake, and identify the method's limits. Keep the no-server-left-running rule: bounded verification, clean shutdown, and an explicit record of unresolved browser or runtime issues.
