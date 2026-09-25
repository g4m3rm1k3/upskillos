# ML beginner-to-mastery assessment and implementation handoff

Date: 2026-09-24. Audience: the implementing agent and the UpSkillOS maintainer.

## Status and scope

This document supersedes the implementation priorities in `ml-learning-platform-recommendations.md`. Keep that document as background; do not treat its original persistence, checkpoint and CLT findings as still unaddressed. The newer implementations are present in this checkout.

This assessment inventories all 61 ML labs and their lesson metadata, examines the current notebook integration/runtime, and samples teaching content and Python challenges. It does not certify every mathematical claim or every interaction. The previous agent reports 345 tests and 57 notebooks passing in local Python and Chromium 149/Pyodide 0.26.4. Those execution results were not independently rerun in this assessment. No development server was started.

**Verdict:** the platform has substantial subject coverage and a usable foundation for interactive learning. It is not yet a consistently supported beginner-to-independent-practitioner journey. The main unfinished work is teaching sequence, in-context execution, guided-to-independent practice, transfer, verified supporting resources, and evidence of retained understanding. More topic titles alone will not close those gaps.

“Mastery” here is a continuing ability to explain, implement, diagnose, evaluate and transfer ideas. Completing a fixed list of lessons cannot guarantee mastery of all ML or professional readiness.

## 1. What actually runs in the app

Current source inventory:

| Capability | Observed coverage | Interpretation |
|---|---:|---|
| Labs | 61 | Broad core, specialization and advanced coverage |
| Lessons | 316 | Content count, not a quality score |
| Lesson notebooks | 57 | 52 across Labs 01–08; 5 in Lab 37 |
| Lessons without a notebook | 259 | Labs 09–36 and 38–61 |
| Math-to-code tables | 56 | Early lessons and Lab 37; one early visual lesson intentionally omits one |
| Structured derivations | 120 | Concentrated in advanced material; not a substitute for executable examples |

There are three different experiences that must not be conflated:

1. **Lesson notebook:** editable Python cells running in the app through `notebook/LessonNotebook.jsx` and a Pyodide worker. Cells within a notebook share a namespace. Drafts and edited-code export are implemented.
2. **Implementation challenge:** a separate Python tab with starter functions and checks. This is useful practice, but it does not show the learner a small executable example at the moment a concept is introduced.
3. **Playground:** JavaScript calculations and visualizations. These are real interactive computations, but changing a slider does not establish that the learner can implement the corresponding Python.

The current shell renders all explanation paragraphs, then the formula/derivation and optional collapsed notebook. This may explain why runnable Python does not feel integrated into the lesson. The notebook exists, but it is separated from the paragraph it illustrates and requires an additional discovery action.

**Required change:** support ordered lesson blocks so an explanation can be immediately followed by its runnable cell, result interpretation and small task. Keep lazy Python loading: displaying code must not download the runtime until the learner runs it. Retain a “notebook view” for learners who want all cells together.

Do not replace the new worker notebook with the older shared `PythonNotebook`. The latter has a different runtime and lifecycle. Reuse capabilities through deliberate adapters rather than creating a third execution system.

## 2. Target learners and exit capabilities

Assume basic Python lists, loops and functions. Do not silently assume NumPy, pandas, probability, calculus, matrix notation, classes, virtual environments or model evaluation. Supply optional bridges at the point of use.

| Stage | Learner should be able to do | Exit evidence |
|---|---|---|
| Orientation | Run/edit/restart cells; read simple errors; interpret rows, columns and units | Modify a tiny example and recover from a deliberate NameError |
| First principles | Explain features, targets, weights, bias, loss and learning | Hand-calculate a prediction and one update, then implement both |
| Data and evidence | Clean data, avoid leakage, quantify variation and compare baselines | Reproducible experiment with justified splits and uncertainty |
| Classical modeling | Choose and diagnose useful models | Compare alternatives on the same evaluation design and explain failures |
| Neural networks | Trace forward/backward computations and use a real framework | Gradient-checked small model, framework comparison and error analysis |
| ML engineering | Package, test, serve, monitor and update a model | Reproducible application with parity tests, monitoring and rollback |
| Specialization | Learn a new method from its assumptions and evidence | Independent investigation with a simpler baseline and documented limitations |

Keep all labs accessible. Provide routes for “start from basics,” “review a university topic,” “build a project” and “deepen the mathematics.” A route recommends prerequisites and evidence; it must not lock users into completing all advanced topics.

## 3. Teaching standard

Use one concrete example consistently across prose, equations, diagrams and code. Define every new term before relying on it. Give symbols names, meanings, shapes and units where relevant; explain indexing conventions and distinguish data space from parameter space.

For each new concept, provide a small example, a prediction, an observable manipulation, an explanation and executable code where computation helps. Follow with appropriate practice. These are editorial requirements, not ten mandatory page sections. Transfer exercises and later retrieval can live at module/course level.

Start with explicit arithmetic or a loop before the compact array form. When introducing a library, show what it performs automatically and compare a tiny case with the earlier implementation. Do not require hand-writing every production algorithm, but do require understanding the essential operation and failure modes.

Expose optional “why this works” derivations without making learners leave the main path. Required prerequisite explanations must be available locally; further-reading links cannot replace them. Avoid unexplained shortcuts such as “clearly,” “simply differentiate” or “as is obvious.”

Use neutral, useful feedback. The learner's confusion is evidence about the teaching, not a character flaw. Let them flag the exact sentence, symbol, cell or interaction where they lost the thread.

## 4. Notebook authoring requirements

For every lesson, make an explicit decision: runnable example, interactive non-code task, or reflective/design task. Absence of a notebook must have an instructional or runtime reason. Do not add meaningless Python arithmetic merely to reach a coverage percentage.

Each algorithmic/computational lesson should contain a small example that runs in the app when the supported runtime can handle it. Split large demonstrations into named cells, each answering one question. Mark state dependencies, provide “run prerequisites” or a clear instruction, and support restart-and-run-all.

Every authored cell needs:

- What it demonstrates and which concept it depends on.
- A prediction prompt where useful, followed by the result explanation.
- Editable code with descriptive variables and purposeful comments.
- One meaningful suggested change and what to compare afterward.
- Runtime/packages and expected resource use.
- An expected property or value for verification, with justified tolerance.
- A saved-work policy and the difference between code, output and live Python variables.

Add expectation metadata rather than relying on clean execution alone. Use independent numerical assertions for numerical claims; exact stdout checks mainly for formatting. Test the prescribed learner changes, not only the original cell. Tests must not mutate the learner's variables or silently reveal assessment answers.

Fresh tests should catch plausible mistakes: sign, factor, axis, missing intercept, shape broadcasting, train/test contamination and stale state. A supplied solution passing its own copied computation is weak evidence; use a hand-calculated case, independent formulation or trusted library appropriately.

Matplotlib output is currently a static PNG. Label it as such and keep interactive JS visualizations for manipulation. Provide plot descriptions and tables where needed. A generic “Figure 1 produced by cell 2” alt text does not explain the figure.

## 5. Coding ladder and assessment

Implement the first full ladder using Lab 03's four-row table:

1. Trace one prediction with explicit contributions and bias.
2. Run the same computation as a loop and as a matrix product; verify agreement.
3. Fill one missing expression in otherwise complete code.
4. Repair one planted bug and explain why the original output was wrong.
5. Implement prediction from a function contract and examples.
6. Solve a new table/context without opening the worked solution.
7. Return later for a new prediction/debugging task.

Build a separate ladder for gradients after prediction is secure. Accept mathematically correct implementations rather than one expected source string. Provide per-case feedback that identifies inputs and discrepancy without immediately giving the fix.

Use fresh question templates with bounded, seeded values. Generate the solution and targeted misconceptions from the same problem specification, but verify the generator independently. Guard against ambiguous choices, duplicate options, zero denominators and accidental trivial cases. Vary reasoning, not only numbers: forward prediction, missing quantity, explanation and debugging.

Keep the new attempt/assistance history. Distinguish practice completion, unassisted answer, fresh-task success, transfer and delayed retrieval. Do not turn these into a single unsupported mastery percentage. Persist implementation evidence as well as quiz passes, tied to exercise version. Written explanations need transparent rubrics and examples; optional AI feedback is not authoritative grading.

Use a small review queue across earlier topics, with learner control over timing. Avoid mandatory streaks, speed scores and permanently blocking progression.

## 6. Every-lab implementation backlog

Counts below are current lesson notebooks / lessons. Tasks are recommendations, not claims that each named supporting tool is already verified. Every row should become a bounded implementation/review ticket with a fresh transfer task and acceptance evidence.

| Lab | Notebook coverage | Required next hands-on experience / independent evidence |
|---|---|---|
| 01 Foundations | 8/8 | Interleave existing cells; trace units and one weight; implement prediction then one gradient update; transfer to new numbers. |
| 02 Data | 6/6 | Build a dirty-table repair ladder; show before/after rows and learned fill values; prove inputs are unchanged and validation did not set statistics. |
| 03 Matrices | 8/8 | Deliver the full prediction ladder above; then gradient ladder; preserve optional conditioning depth. |
| 04 Probability | 6/6 | Compare predicted/exact frequencies with repeated samples; distinguish outcomes, probability, density and expectation using tiny cases. |
| 05 Statistics | 6/6 | Resample repeatedly, inspect interval coverage and likelihood; explain what an interval does not establish. |
| 06 Evaluation | 6/6 | Repair a deliberately leaking split/pipeline; compare grouped, chronological and random splits for a stated deployment use. |
| 07 Regularization | 6/6 | Fit under/over-complex models, vary penalty and data size; justify a choice using validation without touching test data. |
| 08 Logistic | 6/6 | Trace score, sigmoid, loss and one update; compare hand result with code; investigate separation and decision costs. |
| 09 Metrics | 0/6 | Editable labels/probabilities, confusion counts, precision/recall, calibration and threshold cost; explain a chosen decision. |
| 10 Neighbours | 0/5 | Compute a few distances, select neighbours, vote; expose scale and tie effects; implement and test a small classifier. |
| 11 Naive Bayes | 0/6 | Token counts to likelihoods to log scores; show smoothing on an unseen word; diagnose the independence assumption. |
| 12 Trees | 0/6 | Enumerate candidate splits by hand/code; display impurity before/after; implement one split and explain overfitting. |
| 13 Forests | 0/5 | Inspect bootstrap rows and feature subsets; compare individual trees with averaged predictions and appropriate out-of-bag estimates. |
| 14 Boosting | 0/5 | Fit one learner to residuals, update predictions, repeat; identify what each learner sees and how shrinkage changes progress. |
| 15 SVM | 0/5 | Move points, compute margins and hinge loss; distinguish margin violations from wrong classifications. |
| 16 Tabular capstone | 0/6 | Complete one worked project, scaffold a second, then use new data; provide an evaluation report and reject weak improvements. |
| 17 Clustering | 0/5 | Perform one assignment/update, compare seeds and distance scales; explain why a cluster is not a true label. |
| 18 PCA | 0/5 | Center a tiny cloud, project/reconstruct, inspect variance/error; compare SVD up to valid sign changes. |
| 19 Time series | 0/5 | Build lag features on a visible timeline; detect future information; compare persistence/seasonal baselines with walk-forward evaluation. |
| 20 Backprop | 0/5 | Step through one graph's values and local derivatives; accumulate gradients at shared nodes; verify finite differences. |
| 21 NumPy network | 0/5 | One neuron, one layer, then two layers; inspect cached shapes and gradients; repair a broken backward pass before full implementation. |
| 22 Optimization | 0/5 | Compare optimizer states on one objective; control seeds, budget and initialization; distinguish optimization from generalization failure. |
| 23 PyTorch | 0/5 | Browser NumPy convention exercises plus a verified local PyTorch notebook; compare tensors, gradients, modes and checkpoint resume. |
| 24 Vision | 0/5 | Slide a small kernel over explicit pixels; compute stride/padding shapes; progress to a small real image task with honest splits. |
| 25 Sequences | 0/5 | Inspect tokenization, embedding lookup, padding and recurrent state; trace a short sequence and identify order effects. |
| 26 Attention | 0/5 | Compute Q/K/V, score matrix, softmax and weighted values on tiny arrays; test masking and positional information. |
| 27 DL capstone | 0/5 | CPU-feasible real task with simpler baseline and controlled ablations; explain errors and computational cost. |
| 28 Contracts | 0/5 | Validate intentionally damaged data; record versions/configuration; reproduce a training artifact from a fresh environment. |
| 29 Serving | 0/5 | Run an in-app predictor/parity exercise; then a real local batch or HTTP integration. A status-code dictionary is not a deployed service. |
| 30 Monitoring | 0/5 | Replay quiet/shifted periods, delayed outcomes and false alarms; separate detected drift from measured performance loss. |
| 31 Responsible ML | 0/5 | Inspect relevant subgroup errors, intended use and data permissions; write a grounded model card. Use design tasks where code adds little. |
| 32 Delivery | 0/5 | Compare candidate releases against gates; simulate promotion and rollback, then provide a runnable local release exercise. |
| 33 Final project | 0/4 | Project workbench plus notebook/repository starter, milestones, rubric and worked exemplar; deliver reproducible end-to-end evidence. |
| 34 Retrieval | 0/4 | Small local corpus, token/embedding retrieval and ranking evaluation; separate retrieval from generation; paid APIs optional. |
| 35 Recommenders | 0/4 | Tiny user-item matrix, baseline and ranking task; handle cold start and user/time leakage. |
| 36 Causal | 0/4 | Generate confounded data, compare observation with intervention under explicit assumptions, design a randomized experiment. |
| 37 RL | 5/5 | Retain existing returns/Bellman/Q-learning work; add manual play, inspectable baseline statistics and a genuine Gymnasium export. |
| 38 Replication | 0/4 | Reproduce a modest result with versioned configuration and uncertainty; document deviations and failed replications. |
| 39 GLMs | 0/5 | Inspect likelihood/gradient/Hessian on tiny data; compare gradient descent and Newton steps, including failure cases. |
| 40 Generative classifiers | 0/5 | Estimate class distributions and classify a few points; compare shared/separate covariance assumptions. |
| 41 Bayes | 0/5 | Prior, likelihood and posterior on a finite grid before continuous models; inspect sensitivity and predictive uncertainty. |
| 42 Gaussian processes | 0/5 | Build a small covariance matrix; condition on observations; inspect posterior mean/variance and kernel choices. |
| 43 EM | 0/5 | Responsibilities and one parameter update shown numerically; compare initialization and likelihood without assuming global optimality. |
| 44 Sampling | 0/5 | Trace proposals/acceptance, compare multiple chains and autocorrelation; explain why draw count is not effective sample size. |
| 45 Graphical models | 0/5 | Enumerate a tiny model, then message passing/HMM recursion; compare with brute force and explain conditional independence. |
| 46 Information theory | 0/5 | Compute entropy, cross-entropy and KL for small distributions; relate quantities to prediction and coding without conflating them. |
| 47 Learning theory | 0/5 | Explore small hypothesis classes and numerical bounds; distinguish empirical behavior, assumptions and proof. |
| 48 Convex optimization | 0/5 | Inspect feasible sets, constraint effects and primal/dual quantities on tiny problems; state conditions for claims. |
| 49 Kernels | 0/5 | Explicit feature map versus Gram matrix, PSD examples/counterexamples; implement a small kernel predictor. |
| 50 Online/bandits | 0/5 | Inspect sequential updates and reward/regret; compare policies across seeds and changing conditions. |
| 51 Manifolds/ICA | 0/5 | Compare neighbourhood structure and projection distortion; unmix a small signal; explain misleading visual clusters. |
| 52 DL regularization | 0/5 | Inspect dropout and normalization in train/eval modes; trace statistics and compare controlled runs. |
| 53 Autoencoders/VAEs | 0/5 | Reconstruction first, then latent mean/variance and sampling; inspect each loss term and one gradient path. |
| 54 GANs/diffusion | 0/5 | Small 1D/2D distributions; trace alternating updates or noise/denoising steps; distinguish toy intuition from large-scale training. |
| 55 Language models | 0/5 | Tiny character corpus, next-token loss and generation; split correctly and compare a simple baseline. |
| 56 Few labels | 0/5 | Simulate a label budget, compare selection/pseudo-label strategies and contamination risks; report learning curves. |
| 57 Graph networks | 0/5 | Explicit adjacency and node features; one message/aggregation update; test permutation behavior and node/graph splits. |
| 58 Policy gradients | 0/5 | Trace log-probability, return/advantage and one update; compare variance and separate termination from time limits. |
| 59 Interpretation | 0/5 | Compare attribution under correlated features and perturbations; explain association versus causal claims. |
| 60 Uncertainty | 0/5 | Construct small prediction intervals/conformal scores and check repeated coverage; state exchangeability and coverage limitations. |
| 61 Robustness | 0/5 | Controlled distribution changes and perturbations; compare detection, adaptation and unchanged baselines without leaking evaluation data. |

For later algorithm labs, add a small browser NumPy example even when the full framework/project requires local Python. Never label a NumPy recreation as actual PyTorch, Gymnasium or a deployed service. Supply genuine runnable local artifacts for skills whose outcome requires those tools.

## 7. Math courses and tool integration

Do not assume a course title proves prerequisite coverage. For every required concept, inspect the exact target lesson and exercise. Record: what it teaches, assumed prerequisites, notation, runnable/visual capability, one expected result, accessibility alternative and return path. File-existence tests remain useful but insufficient.

Start with three verified connections:

| Integration | Required behavior | Acceptance |
|---|---|---|
| ML weighted sum/matrix product ↔ Matrix Lab / linear algebra | Same inputs and weights; highlight contributions; explain row/column meaning | Hand, Python and tool agree; task works with keyboard/table alternative |
| ML least squares ↔ OpenMAT | Prepared shared dataset; explain Python/OpenMAT syntax, matrix multiplication and indexing conventions | Residuals/predictions agree within tolerance; original work preserved; return to exact exercise |
| ML sampling ↔ statistics visualizations | Correct, seeded distributions; distinguish samples from sample means | Reference moments, repeatability and task explanation verified |

Then add calculus/gradient, PCA/SVD, and Bellman/linear-system connections as needed. Prefer a small embedded view when it teaches the concept with less navigation. Use a full tool when the learner benefits from independent exploration. Do not build integration machinery merely to open another tab.

If a resource is missing or too advanced, implement a short bridge or improve the target lesson/tool before labeling it prerequisite support. Keep Python the default language; alternative languages are optional and explained.

## 8. Gymnasium and project learning

Extend existing Lab 37 rather than duplicating it. First manual play and observation, then hand-written/random policies and statistics, then existing value/Q-learning material, then a real local Gymnasium environment. Teach `reset`, spaces, actions, observations, rewards, `terminated` and `truncated` explicitly. Use the official [Gymnasium interface](https://gymnasium.farama.org/introduction/basic_usage/) and [custom environment checker](https://gymnasium.farama.org/introduction/create_custom_env/).

Inspect time-limit semantics before changing updates. A loop cap is not automatically a terminal state. If finite horizon is part of the modeled task, state representation and return definitions must reflect it. Compare multiple evaluation seeds and changed maps, not only one successful animation.

Provide an inspectable transition log, step/pause/replay, reward decomposition, Q/value table and baseline comparison. Browser simulation is useful even when actual Gymnasium rendering requires a tested local environment. Do not promise native package compatibility from local CPython success; [WebAssembly runtimes have package limitations](https://jupyterlite.readthedocs.io/en/stable/troubleshooting.html).

Use three practical project milestones: useful tabular model, small image/text investigation, and end-to-end application. Each needs a worked exemplar, a scaffolded alternate, then an independent choice. Provide licensed bundled data and a data-collection guide; learners must not stall because they lack their own dataset. Teach when a rule or lookup table is better than ML.

## 9. Runtime quality and remaining limitations

Preserve the new worker/draft implementation and its regression tests. Do not restart work on already-fixed bugs without a failing reproduction.

The following current source behaviors need explicit decisions or verification:

- Stop clears all lesson-notebook namespaces because they share a worker. Keep the warning; per-notebook workers are optional and have memory costs.
- Different globals dictionaries do not fully isolate imported module state, legacy RNGs or the shared virtual filesystem. Use explicit seeded generators and test the isolation guarantees actually advertised.
- `runtime.js` has manual Stop but no visible automatic execution deadline or idle disposal. A hidden notebook's run is deliberately allowed to finish. Add a clearly bounded lifecycle, a visible global running indicator, cancellation/cleanup on leaving the lab, and output/figure limits. Do not leave indefinite work without a reachable Stop.
- The worker-error path terminates the worker without incrementing the generation used to mark old namespaces stale. Review this alongside Stop/restart so an unexpected runtime crash cannot leave other notebooks claiming their variables still exist.
- `.ipynb` export currently serializes text output, but omits displayed final-expression values, figure images and structured error outputs. Either support those outputs or label exports explicitly as code/prose plus text, with rerun required. Test against a notebook reader/schema.
- The reported intermittent browser-check failure remains unexplained. Keep full per-scenario logs and artifacts. Repeat success is useful evidence, not a diagnosis.
- A clean Run All does not establish correctness of prose claims, instructed edits, independent exercises or accessible interaction. Add checks for those separately.

These are source findings and review tasks, not claims that all failure scenarios were reproduced in this assessment. Use bounded tests and preserve logs. Shut down any development servers or local training processes started for verification.

## 10. Accessibility and learner control

Target WCAG 2.2 AA and verify actual tasks with keyboard, screen reader, zoom and narrow layouts. Automated checks alone cannot establish compliance. W3C documents [drag alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) and [WCAG 2.2 additions](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

Require chart summaries and meaningful tables, not only image labels. A shared chart component can render alternatives, but each author must provide the correct data and explanation. Provide non-color cues, labeled controls, visible focus, reduced motion, pause/replay, accessible mathematical output and a simple editor fallback if Monaco is unusable for the learner.

Keep reading preferences, untimed practice, optional hints and direct prerequisite recovery. Explain unfamiliar application-domain terms as well as math terms. Core learning must work without paid AI, GPU access or an account. Support low-bandwidth use with visible runtime downloads and downloadable materials; call something offline-ready only after package/runtime caching is tested.

Offer full progress/draft export and import, including lesson versions and experiment settings. Avoid translating local progress into a credential. Any analytics or report submission should be opt-in and allow preview of data/code being shared.

## 11. Author and reviewer checklist

For each lesson, record:

- Entry skills, new terms and one observable learning objective.
- Required prerequisite coverage and exact recovery links.
- Worked example with consistent data/notation/units.
- Runnable or interactive task with an accessibility alternative.
- Expected result and independent mathematical/software verification.
- Guided practice, misconception feedback and an independent/transfer opportunity.
- Runtime, package and resource requirements; save/reset behavior.
- Sources, dataset/code permissions, content version and review status.

Use a short issue template and exemplar lessons first; do not burden a solo maintainer with elaborate governance. Separate subject correctness, software behavior and beginner usability. A subject expert can overlook an unexplained step, while a beginner can miss a false claim. Both kinds of review matter.

Do not claim a lab is beginner-reviewed merely because it renders, its code executes, or an agent wrote it. A beginner review should capture actual confusion and demonstrate improvement on a fresh problem.

## 12. Implementation order and definition of done

### Slice A — in-context learning and one complete ladder

Add ordered explanation/code/task blocks with a compatibility adapter for existing lesson arrays. Migrate Lab 03's prediction journey and the relevant Lab 01 weighted-sum explanation. Do not rewrite all 316 lessons at once. Add fresh transfer variants, expected cell outcomes and saved stage attempts. Preserve the notebook runtime and existing progress.

Exit: the learner can find Run without searching a separate tab, trace a prediction, complete/debug/implement it, and solve a fresh case. All suggested edits and error recoveries are checked.

### Slice B — complete first-principles support

Bring Labs 01–08 to the same practice standard. Add brief orientation and optional NumPy/math/Python bridges; make hidden assumptions visible. Confirm the three math/tool connections. Address bounded runtime lifecycle and export truthfulness before scaling.

Exit: a learner with basic Python can finish a small, honest modeling experiment, recover from common mistakes and explain its evaluation.

### Slice C — classical models and first real project

Add in-context computational notebooks and coding ladders across Labs 09–19. Use each lab's row in the backlog as the required task, not a generic notebook copied across algorithms. Complete the worked/scaffolded/independent tabular project.

Exit: compare useful models against baselines on appropriate splits, explain why results differ, and reproduce the chosen experiment.

### Slice D — neural computation and actual frameworks

Extend Labs 20–27 with tensor/gradient traces, progressively incomplete implementations and genuine local PyTorch artifacts. Keep CPU-sized browser examples. Verify framework parity without claiming toy models establish large-scale expertise.

Exit: build, check and diagnose a small network and justify using it over a simpler model.

### Slice E — engineering and independent application

Complete Labs 28–33 with runnable artifacts and an actual serving/integration path. Follow simulated monitoring/release exercises with a small local application and rollback demonstration.

Exit: someone else can reproduce, run, test and maintain the learner's project from its documentation.

### Slice F — specializations and advanced depth

Expand Labs 34–61 with the same computational/assessment standard, starting with the user's immediate interests. Add Gymnasium without duplicating Lab 37. Keep advanced mathematical claims, assumptions and limitations explicit.

Exit: a learner can investigate a new method, compare it fairly and report what their evidence does and does not support.

For every slice: list changed lessons, verified expectations, runtime/browser coverage, beginner feedback, accessibility evidence and unresolved issues. Preserve complete failure logs, leave unrelated work untouched, and stop temporary processes.

## Copyable instruction to the implementing agent

Treat this document as the overall target, not a request to mark every lab complete by adding boilerplate notebooks. Preserve the existing working notebook/draft/checkpoint fixes. Start with Slice A and bounded runtime follow-ups, then proceed through the slices with explicit acceptance evidence. For every lesson, teach the missing prerequisites locally, put runnable Python beside the explanation when practical, and provide a route from worked example to independent transfer. Verify linked courses/tools for the exact task rather than only checking their paths. Keep source coverage, execution correctness and observed learning outcomes distinct. Report limitations honestly; do not call passing tests mastery. The user should be able to learn by doing inside the app, then carry those skills into real projects.
