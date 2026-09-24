# A beginner-first, hands-on ML learning platform

Review date: 2026-09-24. Scope: UpSkillOS ML labs, sampled supporting courses, shared notebook execution, math links, and selected tools. This is a comprehensive improvement specification, not a certification that every lesson and tool is correct.

## 1. What is present, and what remains unverified

The current source inventory contains 61 labs, 316 lessons, 57 lessons with notebooks, 56 with math-to-code tables, and 27 with decision checkpoints. Notebook coverage is concentrated in Labs 01–08 and 37. Lab 03 now has eight lessons and lesson-aware visualizations. The new checkpoint and prerequisite-recovery components are present.

The previous agent reports 321 passing tests and 57 notebooks executing in local Python. Those results were not rerun in this review. Local execution does not establish browser execution, correct outputs, sound teaching, accessible interactions, or durable saved work. The notebook verification script concatenates cells in order and checks process success; it does not independently check most printed results or the suggested learner edits.

Keep the implemented breadth. Invest next in a repeatable standard of teaching quality and runtime reliability, then apply it across that breadth. A learner should be able to say what a model does, build it with decreasing help, diagnose its failures, and use it in a different context.

## 2. Immediate findings to resolve

| Priority | Finding and evidence | Recommended change | Acceptance evidence |
|---|---|---|---|
| P0 | `LessonMath.jsx` copies the original `notebook.cells` to Notebook Lab. Edits live inside `PythonNotebook`, with no callback used by this wrapper. | Make edited cells the saved/exported source of truth. Distinguish duplicate-original from export-my-work. | Edit a cell, copy it, open the exported notebook, and verify the edit and cell order. |
| P0 | The wrapper unmounts the notebook when hidden. `PythonNotebook.jsx` resets cells whenever the `initialCells` array identity changes; the wrapper maps a fresh array when it renders. This creates a source-level risk of losing edits on hide/show or parent updates. | Stable lesson IDs, persisted drafts, intentional reset only; preserve edits across parent updates. | Edit, answer a checkpoint, type a reflection, hide/show, change lesson, reload, and recover the same draft. |
| P0 | Inline `PythonNotebook` calls a shared Pyodide singleton directly; the ML challenge tab uses a terminable worker. These are different execution contracts. | Move inline execution behind a worker/session service with Stop, bounded execution, reset, package status, and isolated lesson namespaces. | An infinite loop can be stopped while the page stays responsive. A variable from another lesson cannot accidentally make a cell pass. |
| P0 | Browser notebook execution is explicitly unverified by the previous agent. | Verify real-browser loading, imports, output, plots, cancellation and recovery for each supported package combination; test all notebooks in that runtime. | Recorded browser/runtime versions, exact notebook IDs, pass/fail results and reproducible failures. |
| P1 | `Checkpoint.jsx` rejects equivalent input such as `1/4`; generic diagnostics infer percentage/sign mistakes solely from numeric coincidence. | Accept safe arithmetic where appropriate; declare each answer's type, units and permitted formats. Make inferred hints tentative and topic-specific. | `1/4` and `0.25` agree where fractions are allowed; percentage rules follow the prompt; no arbitrary expression evaluation. |
| P1 | Multiple-choice answers immediately reveal feedback; clicking the correct option records a pass. `JumpIn` likewise describes three correct selections as solid preparation. | Keep low-stakes practice, but distinguish assisted completion from independent evidence. Use an explicit submission and a fresh variant for a readiness check. | Cycling through choices never becomes a claim of independent mastery; prerequisites remain recommendations, not gates. |
| P1 | `mathLinks.test.js` checks file existence and tool routes, not learning objective coverage or tool behavior. | Add a capability-and-content audit for each required dependency. | A link is accepted only after its target teaches the exact prerequisite, opens correctly, and supports the required task. |
| P1 | `applied-statistics/viz/CLTSimulatorViz.jsx` labels a Gaussian sampler as “Right-skewed”; its bimodal population lists sigma 0.25 although the mixture's standard deviation is sqrt(0.25² + 0.08²). It also uses unseeded randomness. | Correct sampler labels/distributions and reference moments; add seeded repeatability. | Analytical moments and seeded numerical checks agree within a justified statistical tolerance. |
| P1 | Shared `kit/Plot.jsx` supplies an image label, but no general data-table/long-description alternative. | Add accessible plot summaries and equivalent tabular inspection, then audit each interactive plot. | A learner can answer the same task without relying on color, hovering or seeing the chart. |

P0 means protect learners' work and make the promised execution dependable. P1 means improve the correctness and learning experience before multiplying content.

## 3. The learning contract for every concept

Use a short cycle rather than a fixed number of paragraphs:

1. **A concrete question.** What decision or calculation are we trying to improve?
2. **A tiny example.** Two to six observations with meaningful labels and units; keep these numbers consistent across text, diagram and code.
3. **A prediction.** Ask what will happen before displaying the result. Permit “I am not sure.”
4. **A manipulation.** Change one input, weight, sample, threshold or assumption.
5. **An explanation.** Connect the observed change to the mechanism; include a counterexample.
6. **The notation.** Name, pronounce and define each symbol; show its units and shape where applicable.
7. **Runnable code.** First explicit scalar operations or a loop, then the compact array/library equivalent.
8. **Decreasing support.** Worked example, complete a small gap, repair a bug, implement independently.
9. **Transfer.** New numbers or a different context, with the same underlying idea.
10. **Retrieval later.** Revisit the concept after another topic or a break.

Do not make all ten steps a wall of mandatory content. Show a short main route, with expandable support and an optional deeper derivation. Let learners switch between an example, a graph, a formula and code without losing their place. These are multiple representations of the same idea, not fixed categories of learner.

Teach Python demands explicitly: imports, array construction, indexing, mutation, functions, return values, assertions, exceptions, classes before framework modules, and reading tracebacks. Provide optional bridges exactly where needed. A beginner should not need to debug a Python convention and a new mathematical idea simultaneously without help.

Introduce logarithms before log loss, expectation before expected cost, vectors before matrix gradients, partial derivatives before backpropagation, and train/validation/test roles before tuning. A link to a complete math course is supplementary; the ML lesson must contain the minimum explanation required to proceed.

Worked examples interleaved with problem solving, retrieval practice, and connections between concrete and abstract representations have support in the [IES practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/1). Treat this design as a hypothesis to validate with learners, not a guarantee that every lesson will work.

## 4. A practice system for the whole curriculum

Build a reusable exercise system that supports more than numeric answers:

| Exercise | Beginner action | Evidence |
|---|---|---|
| Predict | Choose which points move or what a cell prints | Prediction before execution, with reasoning |
| Trace | Step through one prediction or gradient update | Correct intermediate quantities |
| Construct | Build a vector, matrix, split or computation graph | Structure, units and dimensions |
| Complete | Fill one missing expression | Independent checks on multiple cases |
| Debug | Repair a deliberate sign, shape, leakage or state error | Failing case becomes correct; explanation names the cause |
| Experiment | Change one factor, compare runs | Saved configuration, result and interpretation |
| Decide | Choose a metric, baseline, threshold or deployment action | Justification against stated constraints |
| Transfer | Solve a similar task with different surface details | Success without copying the worked example |
| Project | Produce a reproducible artifact | Code, evidence, limitations and maintenance notes |

Hints should progress from a conceptual cue, to a smaller example, to a partial step, then a complete explanation. Record assistance without punishing learners. Give solution comparison and a fresh retry rather than a permanent green check after revealing an answer.

Track separate states: encountered, practiced with help, independently demonstrated, transferred, and due for review. Do not convert all of these to one mastery percentage. Store exercise version, attempt, seed, assistance and evidence. Introduce a small review queue across earlier topics; let learners postpone it. Avoid streak penalties, forced timers and competitive leaderboards as defaults.

An optional AI tutor should explain a specific step and ask the learner to do the next one. Core teaching, hints and assessment must work without a paid model. AI feedback is fallible; deterministic checks and explicit rubrics remain the basis of automated correctness claims.

## 5. Gymnasium and an environment-based learning track

Gymnasium is a good fit for reinforcement learning, while the exercise system above serves supervised learning and the rest of the curriculum. Its API separates reset, action, observation, reward, termination and truncation; teach those distinctions explicitly. See [basic usage](https://gymnasium.farama.org/introduction/basic_usage/).

Start from the existing Lab 37 gridworld rather than creating a disconnected second introduction:

| Stage | Task | What the learner inspects |
|---|---|---|
| 1 | Play the gridworld manually | State, action, transition, reward and episode ending |
| 2 | Write a rule-based policy | A baseline policy and its failure cases |
| 3 | Inspect a random policy over many episodes | Variability, success rate, return and episode length |
| 4 | Compute one discounted return by hand | Immediate reward versus cumulative return |
| 5 | Evaluate a fixed policy with known transitions | Bellman updates and convergence |
| 6 | Implement one Q-learning update, then a loop | Q values, exploration and temporal-difference error |
| 7 | Change slip, reward and map | Generalization and reward misspecification |
| 8 | Port to a real Gymnasium environment | API contract, spaces, seeds and wrappers |
| 9 | Try FrozenLake, then CartPole | Discrete-state tables versus continuous observations |
| 10 | Build a small project environment | Modeling assumptions, baseline, evaluation and limitations |

Show observation values, selected action, reward decomposition, total return, policy and value estimates next to the animation. Include pause, single-step, speed, replay, seed, reset and a text trace. A learner should be able to find the exact transition responsible for a surprising result.

Use fixed training configurations and separate evaluation seeds/maps. Show multiple runs and uncertainty, not one successful replay. Explain that a random seed is not a held-out dataset, and separate evaluation randomness from genuinely changed environments. Handle time-limit truncation separately from terminal states when computing targets. Include an intentionally exploitable reward and compare optimized reward with actual task success.

**Runtime choices:**

- Browser-first teaching: existing small JavaScript environments and verified NumPy exercises. Label the implementation honestly; similar behavior is not automatically Gymnasium compatibility.
- Genuine Gymnasium: a downloadable local Python project with a pinned, tested dependency set, clear setup checks and expected outputs. Native/rendering dependencies must be tested per environment.
- Browser Gymnasium support: an optional compatibility experiment, not a prerequisite or promise. A CPython package working locally does not imply WebAssembly support; [JupyterLite documents these limitations](https://jupyterlite.readthedocs.io/en/stable/troubleshooting.html).
- Later, optional remote execution: only if useful enough to justify hosting, isolation, quotas and maintenance. Do not require cloud accounts, GPUs or paid APIs for the core route.

For custom environments use Gymnasium's [environment checker](https://gymnasium.farama.org/introduction/create_custom_env/), plus semantic tests of rewards, legal actions and endings. For a JS/local-Python pair, compare deterministic traces first; seeded generators in different languages need not produce identical random sequences. Statistical agreement is a different test.

The project sequence should start with gridworlds and simple scheduling/resource simulations. Robot, drone and CNC tools may become simulated applications later; their existence does not establish a valid RL environment or justify hardware control. [CartPole](https://gymnasium.farama.org/environments/classic_control/cart_pole/) is a useful intermediate task, not the first exposure to ML.

## 6. Connect courses and tools through verified tasks

Existing evidence: OpenMAT has presets for least squares, eigenvectors, QR, orthogonality and SVD; linear-algebra lessons include vector diagrams and transformation explanations; statistics includes distribution and CLT visualizations. These are candidates for reuse, not blanket endorsements.

| Concept | Candidate asset | Required learning task | Addition or verification needed |
|---|---|---|---|
| Weighted sum | ML 01 + vector course + Matrix Lab | Match each input to a weight and explain units | Shared numbers, annotated contributions, return link |
| Matrix product | ML 03 + matrix course/visualizer | Highlight one row and column; compute one output | Beginner preset, dimensions and accessible table |
| Least squares | OpenMAT least-squares preset | Fit the same small dataset and inspect residuals | Lesson preset handoff; compare Python/OpenMAT conventions and results |
| Slopes and gradients | Calculus + ML 01/03 | Move a point, compare a finite difference and derivative | Confirm exact visualization supports the task; add one if absent |
| Probability and sampling | Odds Lab + statistics tools + ML 04/05 | Predict and observe frequencies and sampling variation | Correct distributions, seed, sample-size control, expected-reference values |
| PCA | Linear algebra + OpenMAT SVD + ML 18 | Center a cloud, project, reconstruct and measure error | Small shared dataset, documented SVD convention, sign-invariant comparison |
| Bellman equations | Dynamic programming + OpenMAT + ML 37 | Solve a fixed-policy value system and compare iteration | Shared transition/reward data, terminal-state rules, gamma < 1 example |
| Optimization | Calculus + ML 22 | Compare paths on one fixed objective | Consistent loss scaling, coordinate labels and stopping rules |
| Practical engineering | Python/CLI/Git courses + ML 28–33 | Run, package, test and reproduce a small model | Exact prerequisite lessons and an end-to-end starter repository |

A tool link needs a learning contract: objective, required capability, prepared dataset/preset, action instructions, expected observation, evidence to save, and a return destination. If it cannot satisfy that contract, repair the tool, write a short bridge, or keep the exercise in the ML lab.

Introduce stable concept and capability IDs. Record dimensions, input formats, runtime requirements, tested examples, limitations, supported interactions and accessibility alternatives. Check dependencies for cycles. Distinguish “required prerequisite,” “alternate explanation,” “practice tool” and “advanced extension.”

For OpenMAT, show a small translation card before switching languages: Python's zero-based indexing versus MATLAB-like indexing, `@` versus matrix `*`, elementwise multiplication, transpose and output conventions. Verify actual OpenMAT behavior rather than promising complete MATLAB compatibility. Compare eigenvectors/PCA bases up to sign and valid basis changes, not raw element equality.

Link to exact sections when possible. Open the right example without overwriting a user's existing tool session. Save the user's draft and return to the same exercise. Provide a copyable fallback if automatic handoff fails. Route/file checks are only the first level of validation.

## 7. Curriculum-wide coverage checklist

Apply the same quality gate to every lesson, while using different tasks for different subjects. This table covers all current lab ranges; each group still needs a lesson-by-lesson editorial pass.

| Labs | Hands-on additions | Independent demonstration |
|---|---|---|
| 01–03 foundations/data/matrices | Scalar-to-loop-to-array ladder; shape tracing; intentionally dirty four-row tables | Implement and debug a prediction/gradient and leak-free preprocessing |
| 04–07 probability/statistics/evaluation/regularization | Repeated sampling, interval coverage, leakage detective, train/validation curves | Explain variability and choose an appropriate evaluation design |
| 08–09 classification/metrics | Score-to-probability trace, editable confusion table, threshold cost explorer | Choose a threshold from a stated decision and assess calibration |
| 10–15 classical algorithms | Neighbour voting, text counts, one tree split, bootstrap samples, one boosting residual, support vectors | Implement one step, diagnose failure, compare with a baseline |
| 16 tabular capstone | Prepared real dataset plus optional personal data, explicit collection/splitting guide | Reproducible comparison and honest error analysis |
| 17–19 clustering/PCA/time | Centroid updates, projection/reconstruction, time-availability timeline | Explain unstable clusters, lost information and temporal leakage |
| 20–23 neural foundations/frameworks | Node-by-node backpropagation, visible tensors, damaged training loops | Check gradients and reproduce a tiny model in actual PyTorch |
| 24–26 vision/sequences/attention | Pixel kernel tracing, embedding lookup, mask/attention score trace | Derive one output and identify forbidden future information |
| 27 deep-learning capstone | Small CPU-feasible dataset, simple baseline, controlled ablations | Defend model complexity with evidence |
| 28–32 engineering | Broken data contracts, preprocessing mismatch, drift replay, release/rollback exercise | Reproduce a model and diagnose an operational failure |
| 33 final capstone | One fully worked project, one scaffolded alternative, open project rubric | Deliver tested software, evidence, limitations and operation plan |
| 34–36 retrieval/recommendation/causal | Local retrieval corpus, cold-start scenario, confounding simulation | Separate retrieval from answer quality; prediction from intervention |
| 37–38 RL/replication | Environment sequence above; small reproducible paper result | Compare policies honestly; report replication deviations |
| 39–43 GLMs/generative classifiers/Bayes/GP/EM | Likelihood surfaces, prior-to-posterior update, GP uncertainty, one EM iteration | Trace an update and state its assumptions |
| 44–48 sampling/graphical/info/theory/convexity | Sampling diagnostics, message passing, code-length examples, bound examples, constraints | Distinguish numerical evidence from a mathematical guarantee |
| 49–53 kernels/online/manifolds/regularization/VAEs | Kernel similarity, online regret trace, neighbourhood distortion, mode changes, latent sampling | Explain what an attractive visualization does not prove |
| 54–58 generative/LM/few-label/GNN/policy gradients | Small inspectable generators, next-token trace, label budget, graph messages, policy update | Compare against controlled baselines within a compute budget |
| 59–61 interpretation/uncertainty/robustness | Correlated-feature explanations, interval coverage, controlled shift | State where an explanation or guarantee stops applying |

Do not require advanced generative modeling to use a linear model in a project. Offer routes for first principles, university-topic review, project building, and deeper mathematics. Each route uses the same maintained concepts and exercises rather than duplicate incompatible courses.

## 8. Accessibility, inclusion and practical access

Treat beginner accessibility and disability accessibility as complementary requirements. Target WCAG 2.2 AA, then test actual learning tasks rather than declaring compliance from automated scans.

- Keyboard access and visible focus for every action; no keyboard traps in editors or dialogs.
- Alternatives to dragging: numeric entry, buttons and selection controls. Keyboard operation alone does not satisfy every pointer alternative requirement; see [W3C dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements).
- Text summaries and data tables for plots; color plus shape/line style; meaningful axis labels and units.
- Screen-reader-readable mathematics, logical reading order, labeled inputs and restrained status announcements. Verify the rendered math, not only its source.
- Reduced motion, pause, single-step and replay; no animation required to understand the only explanation.
- Zoom/reflow, narrow layouts, touch controls, editable font/spacing and theme contrast checks. WCAG 2.2 adds target-size and focus requirements; see [W3C's summary](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).
- Plain language; expandable terminology; consistent notation and pronunciation; examples with familiar contexts and explained domain vocabulary.
- Untimed practice, no shame for hints, clear recovery after mistakes, and no assumption that a learner remembers an earlier lesson perfectly.
- Lightweight default datasets; visible download size and runtime loading state; optional offline lesson/runtime bundles with explicit package coverage.
- Core lessons, deterministic feedback and CPU exercises without accounts or paid APIs. Provide downloadable notebooks and readable static alternatives.
- Local-first progress plus full export/import. Optional sync later; preserve privacy, avoid uploading project data silently, and make any learning analytics opt-in.
- Translation-ready strings and glossary; units and decimal-format awareness; diagrams with translatable labels rather than embedded English-only text.

## 9. Runtime and persistence quality gates

Use one execution interface with backend-specific adapters, not one ambiguous promise that every Python cell can run everywhere. Each exercise declares runtime, packages, expected duration, resource limits and whether cells share state.

Give learners a visible “restart and run all” action, execution order, stale-output indicators, ordinary Python errors plus plain-language guidance, package loading/retry, Stop, and saved drafts. Keep mathematical code visible; do not silently repair arbitrary learner code in ways that hide syntax mistakes.

Bound tasks and clean up owned workers/processes. Local servers or training helpers should have explicit stop controls and an idle/maximum lifetime; document cleanup on navigation, errors and interrupted sessions. Do not leave background work dependent on an agent staying available.

Test fresh and warm runtimes, offline/failed downloads, package imports, restart, out-of-order cells, repeated runs, cancellation, excessive output, save quota failure and reload. Verify plotted data and expected values, not just process exit codes. Test each instructed edit and a few realistic beginner errors. Use small independent oracles for numerical routines, and randomized cases where appropriate.

Persist editable notebooks, Python challenges, notes, experiment settings and evidence under versioned IDs. Add migration tests, draft recovery, clear reset scope, and export/import round trips. A green checkpoint must not disappear on a course update; changed exercises should explain why rechecking is suggested.

## 10. Open-source contribution and quality system

Create one public lesson template, a concise author guide, reusable exercise components, a notation/glossary guide, and a contributor preview requiring minimal setup. Record source attribution, code licenses and dataset permissions. Preserve original teaching prose; a source link does not license copying its text or figures.

For every contribution require: explicit learner starting point, objectives, prerequisite checks, worked example, guided practice, independent task, misconception feedback, accessible alternative, sources, runtime contract and verification evidence. Scale requirements to the size of the change.

Separate content correctness, software correctness and beginner usability review. A subject expert may miss an unexplained step; a beginner may not recognize a false formula. Both perspectives matter. Attach review status and last-verified versions without presenting review badges as accreditation.

Add “I got lost here,” “my result differs,” and “report an error” at the exact step. Let the learner preview what context will be shared. Capture lesson/version and relevant runtime settings; never include private data or code without consent. Convert repeated confusion into a reproducible improvement task.

Use an issue template with objective, reproduction, expected understanding, proposed change and acceptance check. Maintain a small set of fully reviewed exemplar lessons before mass-producing new material. Do not reward contributors solely for lesson count.

## 11. Delivery order and success criteria

1. **Protect and verify existing learning.** Resolve notebook persistence/export, real-browser execution and the known supporting-tool inaccuracies. Exit: edits survive the full navigation/export cycle; first Python exercise works on supported browsers and can be stopped.
2. **Complete one exemplary beginner journey.** Take weighted sums through prediction, runnable scalar/array code, guided implementation, debugging, independent transfer and later retrieval. Exit: a basic-Python learner completes it and explains a new example without the solution.
3. **Finish Labs 01–08 to that standard.** Add the coding ladder, narrower visual states, targeted feedback, and exact math/tool tasks. Exit: representative beginners can recover from planned mistakes and recognize when they need a prerequisite.
4. **Prove cross-tool learning with three integrations.** Weighted sum/Matrix Lab; least squares/OpenMAT; sampling/statistics after correction. Exit: same data, correct outputs, clear syntax bridge, preserved work and a working return path.
5. **Deliver the environment track.** Extend Lab 37 with manual play, policy inspection and genuine local Gymnasium export. Exit: baseline and learned policy evaluated reproducibly; endings handled correctly; no browser compatibility claims without tests.
6. **Extend across Labs 09–33, then specializations and advanced labs.** Use the coverage matrix and per-lesson gates. Keep advanced material available while clearly recording its review status.
7. **Sustain the platform.** Contributor workflow, content audits, dependency updates, accessibility testing, migration checks and optional feedback analytics.

Measure learning with fresh transfer tasks and delayed retrieval, not page views or pass counts. Measure usability with successful first runs, recovery from errors, preserved work and completion of keyboard/screen-reader tasks. Begin with your own detailed confusion reports, then include other basic-Python learners and people using assistive technology. Establish a baseline before choosing improvement targets; do not invent a mastery score.

The definition of success is practical: a learner can start with basic Python, discover missing prerequisites without embarrassment, understand each step, try it safely, preserve their experiments, solve a new problem, and explain where their model will fail.
