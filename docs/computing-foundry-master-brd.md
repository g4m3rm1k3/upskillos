# Computing Foundry: master business requirements document

Status: proposed product and curriculum baseline; implementation has not started.
Owner: UpSkillOS. Prepared: 2026-11-05.

## 1. Product decision

Build a desktop-first computing apprenticeship inside UpSkillOS. Working name: **Computing Foundry**. The learner grows a collection of small, understandable programs into a working local software system, repeatedly looking underneath its abstractions and improving it under new constraints.

The experience is active throughout: read a short explanation, predict, type or modify code, run it, inspect evidence, explain an observation, repair a failure, and use the result. Reading supplies the next action; it never earns completion. Animations require predictions and interventions. Copying a working answer earns exploration evidence, not independent mastery.

Assume advanced computer skills and tutorial-level coding experience: the learner has watched and coded along, can modify examples, and can hack together scripts or small applications. They are comfortable navigating files, installing applications, and experimenting with software. The user's phrase “code monkey skills” describes this starting point: practical familiarity without a dependable, connected model of how and why the code works.

Do not assume formal computer science, engineering discipline, algebra fluency, rigorous debugging, Git competence, or independent ability to build an unfamiliar system. Familiarity with loops and functions does not establish understanding of state, contracts, references, or execution. Diagnose those gaps through meaningful tasks and supply focused explanations where needed. Do not make learners repeat basic computer operation or a compulsory introductory syntax course.

Start with a working but fragile small application. Ask the learner to change a feature, predict behavior, diagnose a failure, and explain a design choice. Use the resulting evidence to select support and depth. Learners can demonstrate capabilities to bypass redundant practice; foundational mechanisms such as binary and memory still receive rigorous treatment when their understanding is missing.

The outcome is a broadly capable developer with foundations in software engineering and computer science, and demonstrated ability to learn unfamiliar technologies. Completion cannot honestly certify mastery of every language, framework, scientific discipline, or production environment. It can certify the specific independent performances defined below.

Desktop execution is recommended for the full experience because real files, processes, toolchains, ports, debuggers, and multi-program systems are teaching material. A browser preview may offer early experiments and inspectable examples. It must clearly distinguish simulated behavior from native execution and must not award native-runtime evidence.

## 2. Business need and success

The problem is fragmented knowledge: learners can reproduce snippets yet cannot explain execution, locate faults, choose representations, interpret measurements, or transfer knowledge between technologies. Another long catalog of topics would reproduce that problem.

The product must connect source code to behavior, behavior to mechanisms, mechanisms to mathematical models, and models to engineering decisions. Its defining asset is the dependency graph of working learner artifacts and assessed capabilities.

Success measures, captured locally unless the learner opts into research:

| Measure | Definition | Proposed release criterion |
|---|---|---|
| First meaningful action | First prediction followed by a changed, executed program | At least 80% of representative first-time pilot learners achieve it within 10 minutes without facilitator intervention |
| Independent transfer | New task, changed context, no solution reveal, documentation allowed | At least 75% of eligible pilot learners pass the published gate rubric; investigate failure by prerequisite |
| Retention | Parallel task after a delay, without replaying the lesson | At least 70% of pilot gate passers pass after 14–28 days |
| Feedback usefulness | Learner takes a justified next action after feedback | At least 80% in observed sampled failures |
| Progress integrity | Draft and evidence survive restart, interruption, and migration | All release recovery fixtures pass |
| Content integrity | Reference solutions pass; starters and known faulty solutions fail appropriately | Every released graded mission passes its authoring checks |

These are proposed acceptance targets, not measured outcomes or claims about educational effectiveness. Pilot results may change pacing, scope, and thresholds before wider release.

## 3. Graduate performance contract

A graduate independently demonstrates all of the following on unfamiliar variants:

1. Turn an ambiguous request into examples, constraints, acceptance checks, and a small delivery plan.
2. Read and trace unfamiliar code, explain values, state, control flow, memory relationships, and external effects.
3. Build, test, debug, package, and document a multi-file program using a terminal, editor, version control, and a debugger.
4. Choose data representations and algorithms from the needs of a real feature; justify correctness, cost, and tradeoffs.
5. Explain a useful path from bits and instructions through processes, files, networks, and user-facing software.
6. Use mathematical models and experiments: logic, counting, rates, uncertainty, growth, vectors, and numerical error where relevant.
7. Design and query persistent data, preserve invariants, migrate schemas, and recover from a failed change.
8. Build and inspect a client/server interaction; handle validation, authentication concepts, authorization, timeouts, and partial failure.
9. Improve an existing system while preserving its behavior, evaluate dependencies, review a change, and document decisions.
10. Learn an unfamiliar language or framework from supplied primary documentation, deliver a small feature, and explain which prior concepts transferred and which did not.

Graduation evidence includes runnable artifacts, tests, diagnostic records, design explanations, delayed reassessments, and a maintenance task. Passing quizzes or accumulating activity does not substitute for these performances.

## 4. Connected curriculum architecture

There are no isolated DSA, maths, syntax, or science completion tracks in the required path. Each mission has a practical need, a computing mechanism, a supporting model, a code artifact, and a later consumer. Optional deep dives extend that same artifact.

The main project family is a **local knowledge and experiment workbench**: capture notes and measurements, search them, store them, plot results, expose an API, add a usable interface, synchronize changes, and maintain releases. Tiny games, image tools, simulations, and device models provide contrasting contexts so the workbench does not become repetitive. These projects eventually exchange data through documented formats and interfaces.

Every major idea recurs in four forms: manipulate it concretely; implement a small version; use an established tool; explain the tool's limits on a new problem. Abstraction is introduced as an answer to observed repetition or complexity.

### Stage progression

Each row specifies required coverage and a gate. Authoring must split it into short missions; a row is never a lecture-sized lesson.

| Stage | System need and hands-on work | Connected concepts and maths | Required gate and artifact |
|---|---|---|---|
| 0. From working to understood | Inspect a small working application; change a feature, predict a hidden behavior, reproduce a bug, and explain a chosen fix | Execution model, state, inputs/outputs, assumptions, evidence versus guesses; diagnostic mapping of existing knowledge | Deliver a small change and a reproducible bug diagnosis; personal capability map and baseline project |
| 1. Represent information | Build a bit lamp, encode a small image and message, compare file sizes, inspect bytes | Place value, binary/hex, Boolean logic, units, text encoding, integers, overflow, floating-point approximation | Decode unfamiliar bytes using a format description and fix a boundary bug; codec and image tile |
| 2. Make behavior dependable | Refactor a hacked-together converter and scorekeeper; uncover shared-state bugs, clarify contracts, and test boundaries | State, contracts, decomposition, references and aliasing, truth tables, dimensional analysis; targeted syntax support as needed | Deliver reusable components that survive changed requirements and edge cases; explain why the original failed |
| 3. Keep and find things | Extend notes with tags, filtering, sorting, undo, and file import | Lists, maps, sets, stacks, search, sorting, invariants, counting operations, growth rates | Select a representation from measured workloads; implement and test a search feature; note index |
| 4. Explain and repair | Diagnose a broken importer, reproduce a crash, minimize an input, add regression checks | Stack frames, scope, references, exceptions, hypotheses, counterexamples, test boundaries | Fix an unseen defect and show evidence that the fix addresses its cause; diagnostic journal |
| 5. Work like a developer | Turn scripts into modules and a CLI; make a local Git history; review a diff; resolve a prepared conflict | Interfaces, cohesion, dependencies, command arguments, exit codes, reproducibility | Deliver a multi-file CLI with tests, help, clean checkout instructions, and meaningful history |
| 6. Look below the language | Build a tiny instruction interpreter and allocator model; inspect real process behavior | Registers, instructions, stack/heap, pointers, ownership, bytes, lifetimes, locality | Explain a traced computation across source and machine model; repair a memory defect in an isolated exercise |
| 7. Persist correctly | Replace a file store with SQLite; add constraints, transactions, migrations, backup and restore | Relations, keys, joins, indexes, algebra of selection, atomicity, consistency, query cost | Survive interruption during an update and restore an older dataset; migrated store |
| 8. Make programs cooperate | Add a local HTTP API and client; inspect requests; inject disconnects, retries, duplicate submissions | Addresses, ports, DNS model, protocol layers, serialization, state machines, latency, idempotency | Implement a validated endpoint and duplicate-safe operation under injected failures |
| 9. Build a usable product | Build the workbench interface; handle keyboard input, focus, loading, empty and error states | HTML/CSS, JavaScript/TypeScript, events, state, rendering, accessibility, separation of concerns | Complete an observed user task with keyboard alone and correct error recovery; usable client |
| 10. Measure rather than guess | Profile search and storage; build a queue; compare data structures and caching | Complexity, distributions, percentiles, experimental control, sampling, amortized cost | Explain a bottleneck using measurements and improve it without breaking correctness |
| 11. Handle overlapping work | Run background indexing, cancel jobs, reproduce a race, control shared state | Processes/threads/tasks, event loops, scheduling, locks, deadlocks, ordering, backpressure | Reproduce and eliminate a concurrency defect; cancellation and bounded queue behavior |
| 12. Build a small language | Tokenize and parse a query language; interpret it; add errors and a type rule | Grammars, trees, recursion, structural induction, types, semantics, computability and undecidability boundaries | Extend the language from a written specification, including malformed-input behavior |
| 13. Model the physical world | Add a motion or heat experiment, plot observations, estimate parameters | Functions, vectors, rate of change, integration by accumulation, linear models, probability, numerical stability | Compare a model with generated or supplied measurements, state uncertainty and identify a model limitation |
| 14. Make failure survivable | Add authorization, audit events, dependency review, recovery and a release pipeline | Trust boundaries, threat models, secrets, least privilege, observability, reliability budgets, dependency provenance | Repair a seeded security flaw and recover a failed release in the local training environment |
| 15. Engineer across change | Gather a changed requirement, compare designs, review a patch, migrate data, maintain compatibility | Architecture, coupling, API evolution, tradeoffs, ethics, privacy, estimation and technical debt | Deliver a change to an unfamiliar repository with an ADR, tests, migration/rollback, and user documentation |
| 16. Learn something new independently | Choose an unfamiliar approved language and framework; read docs; implement an equivalent feature | Paradigm comparison, evaluation strategy, type systems, runtime models, dependency and toolchain discovery | Documentation-based transfer task, then delayed maintenance and explanation of differences |

Prerequisite edges are granular. Stage numbers indicate a recommended journey, not permission to advance despite missing foundations. For example: binary → representation → serialization; functions → contracts → APIs; references → ownership → concurrency; search → indexes → query planning; logic → predicates → database constraints → authorization; rates → latency → queues; recursion → trees → parsing; invariants → transactions → distributed duplicate handling.

Loops and algorithms first appear in visible features, return as measurable costs, and return again as engineering choices. Formal definitions follow concrete examples; proofs become short arguments about a program the learner has already run.

### Languages and technologies

Use Python as the initial shared teaching language for brief experiments, with a concise bridge for learners whose existing coding experience is in another language. This is not their assumed first encounter with text programming. Introduce shell commands when a file or process task needs them, checking existing knowledge first. Add SQL for persistent data, HTML/CSS and JavaScript for interfaces, TypeScript when interface mistakes create a need for types, and a small C subset for memory and compilation. A later Rust or Java/C# comparison is a transfer option, not another compulsory syntax course. Teach paradigms through contrasts: imperative state, functional transformations, objects and interfaces, declarative queries, asynchronous events.

Do not translate every mission into every language. Require a few carefully selected cross-language implementations with equivalent behavior and explicit semantic differences. Teach a simple manual implementation before replacing it with a library; measure what the library changes. Framework-specific content is replaceable and must not carry unique foundational prerequisites.

Teach algebra locally when expressions need rearranging; logs when halving search spaces; discrete probability when simulations vary; vectors when motion or images need them; derivatives when rates matter; matrix operations when fitting or transformation requires them. Optional primers provide missing steps inside the task without sending learners away to a disconnected course.

## 5. Session and mission design

Proposed session length is 20–40 minutes with a meaningful stopping point every 5–10 minutes. These are authoring targets to validate with learners, not timers imposed on them. Early programs normally fit on one screen; later multi-file work is built from small, traceable changes.

Every required mission contains:

1. A concrete outcome and a small runnable starting state.
2. The minimum rule or worked nearby example needed for an informed first attempt.
3. A prediction or manipulation that commits the learner to an expectation.
4. A run with observable output and a comparison against that expectation.
5. A short explanation attached to the observed behavior; unfamiliar words and symbols expand in place.
6. A typed or edited implementation, with Run separate from Run & check.
7. A changed constraint, edge case, fault, or new input that prevents rote copying.
8. A brief explanation tied to evidence: annotate a trace, choose a counterexample, or explain a design decision.
9. An exported/reusable artifact, saved evidence, and a scheduled retrieval task.

Reading, watching, typing speed, line counts, and time spent never complete a mission. Text entry must have a purpose: implement, predict, diagnose, or communicate. Avoid forced retyping of boilerplate. Offer accessible alternatives to dragging and precise pointer tasks.

Hints progress from observation to question to small example to partial structure. Solutions remain available, but revealing one records assisted practice. An independent parallel task can later establish competence. The learner can always experiment without risking their previously passing artifact.

### Example connected sequence: notes search

| Mission | Learner action | Mechanism and next connection |
|---|---|---|
| Find a word | Predict which of three notes match; write a loop and print each comparison | Strings and predicates become a reusable search contract |
| Break the search | Try empty text, mixed case, and an accented word; inspect byte and character views | Encoding and normalization explain a real feature failure |
| Measure the work | Double generated note counts; count comparisons before timing | Counting leads to growth models; timing adds measurement noise |
| Build an index | Construct a word-to-note map; compare against a simple scan oracle | Maps and sets arise from a feature requirement |
| Keep it correct | Edit a note and observe a stale result; implement update rules | Invariants motivate tests and transactions |
| Save it | Store notes and tags in SQLite; inspect query plans | Representation becomes relational modeling and index cost |
| Share it locally | Expose a search endpoint; validate input and trace a request | Contracts become protocols and trust boundaries |
| Keep it responsive | Index in the background; cancel; provoke an overlapping update | Scheduling and concurrency arise from user experience |
| Maintain it | Add phrase queries in another implementation | Parsing, API compatibility, and technology transfer connect |

### Example early mission: the overflowing score

The learner changes a score from 6 to 7 in a three-bit model, predicts the next increment, and runs it. They operate bit toggles, explain the wrap, write a tiny bounded-counter function, and test 0, 7, and a full cycle. Then they compare this explicit model with the actual integer behavior of the selected language. The lesson must not imply all languages use three-bit or fixed-width integers. The function returns in image channels, file fields, and sequence numbers, with different contracts.

## 6. Workspace and connected labs

Use a consistent workspace: mission and current question; editor/files; output/trace; experiment controls; evidence/toolbox. Panels resize and can be hidden. The opening task exposes a small real project; panel detail and scaffolding adapt to demonstrated understanding. A persistent breadcrumb says what the learner is building and where the current part is used.

Required actions: Run, Stop, Reset experiment, Compare prediction, Run & check, Debug, Hints, Explain this line, Save checkpoint, and Return to mission. Stop must terminate the run and its descendants. Reset restores an experiment copy without erasing passing work.

Integrations must transfer the learner's artifact, not merely open another lab's homepage:

| Existing piece | Proposed role | Required handoff |
|---|---|---|
| CodeLens | Trace supported learner Python/JavaScript and inspect calls, state, references | Source snapshot, language, input, breakpoint/requested focus, return destination; restore edits on return |
| Logic simulator | Manipulate gates and build adders related to binary exercises | Circuit specification, chosen input and expected observations |
| DP lab | Deepen a recurrence or optimization encountered in a feature | Prerequisite context, problem/input, relevant algorithm; return with local evidence mapping |
| ML Foundations / math labs | Investigate fitted models, uncertainty, vectors, optimization | Dataset/model snapshot and a specific experiment question |
| Project Studio | Larger file-based builds and maintenance tasks | Project snapshot, runtime manifest, checks, mission identity |
| Notebook Lab | Reproducible measurement and scientific investigation | Dataset, cells, parameters, captured run provenance |

These are proposed adapter contracts. Existing tools must be inspected for support before implementation; no claim is made that these handoffs already exist. Unsupported languages use native debugging or a clearly labelled conceptual model. A simulated trace must never masquerade as the learner's actual execution.

In-app launching must follow the repository's `useOpenLab()` and hash-route conventions. Closing an overlay restores the mission and draft. Integration evidence is accepted only when its content version, attempt identity, and assessed capability match; opening another lab never grants a pass.

## 7. Assessment and mastery

Track capabilities rather than one completion percentage. States: unseen, explored, assisted practice, independent demonstration, retained, transferred. Retained requires a delayed parallel task; transferred requires a changed context. Failed retrieval schedules support and reassessment without deleting historical achievements.

Every gate combines executable behavior, explanation, and a changed condition. A working answer with a wrong explanation triggers a focused follow-up. Explanations use explicit rubrics and objective trace annotations where possible. Open-ended architecture and maintenance work requires a human reviewer for a verified designation; without one it is labelled self-assessed. AI feedback may coach but cannot silently certify open-ended mastery.

Grading requirements:

- Independent oracles where feasible: enumeration, simple reference models, property checks, protocol conformance, or independently derived fixtures.
- Fixed edge cases and seeded generated cases; reproducible failing inputs that can be sent to Run.
- Known wrong implementations checked by mutation fixtures; starters must fail the intended requirement without hanging.
- Correct alternative implementations accepted; do not grade source-string resemblance or arbitrary variable names.
- Correctness and resource use assessed separately. Timing comparisons use controlled environments and broad tolerances; operation counts are preferred for early complexity tasks.
- Helpful diagnostics distinguish syntax, runtime, contract, conceptual, and environment failures. Environment failures do not count against competence.
- Local hidden tests improve practice integrity but are inspectable by a determined learner; this is not a tamper-proof credential system.

Suggested gate rubric: behavior 0–3, explanation 0–3, diagnostic method 0–3, transfer 0–3. Independent completion requires at least 2 in every dimension and no unmet critical safety/data-integrity requirement named in the task. Publish examples of each level. Reattempts use parallel variants; hints and reveals remain in evidence provenance.

Review scheduling begins with a next-session retrieval, then approximately 1, 3, and 6 weeks, adjusted by performance. Overdue review does not block exploration. Capstone certification requires all foundational capabilities independently demonstrated, required delayed gates retained, and the final transfer task passed.

## 8. Desktop execution requirements

Reuse and extend existing Electron runtime, project-filesystem, process-tree, terminal, and toolchain infrastructure after a capability and isolation audit. Relevant starting points are `desktop/app/preload.cjs`, `project-fs.cjs`, `project-checks.cjs`, `process-tree.cjs`, and `runtimes/`. Their existence does not establish secure execution.

The frontend never receives arbitrary Node or shell access. Use a narrow, validated IPC interface and a runtime broker with explicit workspace roots, executable identities, argument arrays, environment allowlists, cancellation, timeouts, output limits, and structured results. Resolve paths and account for symlinks, junctions, traversal, and platform case behavior. Never build a shell command from learner text.

Each attempt runs in a disposable mission workspace. Checkpoints promote selected artifacts into a versioned toolbox. Resource controls cover elapsed time, output, descendants, disk, and available platform memory/process limits. Process separation and a dedicated directory alone are not an OS security sandbox. Untrusted exercises require an audited OS isolation mechanism or disposable VM before release; otherwise execution limitations must be explicit and those exercises remain unavailable. Learner programs must not inherit app credentials or unrestricted host access.

Network access is disabled for ordinary missions. Networking lessons use loopback-only training services with controlled fixtures. Package retrieval is a separate explicit workflow with pinned manifests, integrity verification, licenses, storage estimates, cancellation, and repair. Do not install global tools or require administrator access for the core journey. User-selected external projects are a separate advanced workflow with clear access scope.

Runtime result schema includes run ID, artifact hash, runtime/version, working directory identity, exit status, stdout/stderr, source-mapped diagnostics, duration, termination reason, and optional trace reference. A grading run also records checker version and seed. Lost or cancelled runs never become successful evidence.

Target a Windows desktop pilot first, matching the current workspace; validate a baseline reference machine before fixing hardware promises. macOS/Linux support requires equivalent runtime, isolation, filesystem, cancellation, and packaging acceptance. Browser preview is tested separately. Downloads may be optional by stage; already installed core stages must function offline.

## 9. Content, progress, and artifact model

Use stable namespaced identifiers for capabilities, missions, projects, assessments, and artifacts. Never derive progress identity from order or title. Version content separately from the ID. Evidence includes content/checker/runtime versions, attempt snapshot hash, assistance, seed, verdict dimensions, and timestamp. Migrations preserve prior evidence and mark reassessment when semantics change.

Mission schema must include: ID/version, prerequisites, outcomes, scenario, minimal knowledge, steps and required actions, starter files, runtime manifest, editable regions, experiments, prediction prompts, diagnostic misconceptions, hints, solution with reasoning, checker/oracle, known wrong variants, transfer variant, rubric, artifact exports/imports, review items, accessibility equivalents, and integration return contract.

Persist drafts after edits with visible save state; checkpoint on run and exit; handle interruption and disk-full errors. Export a portable project and progress bundle; import validates schema, paths, sizes, and hashes before extraction. Offer per-experiment reset, per-project restore, and explicit whole-lab reset. A later mission consumes an identified passing artifact version; new experiments cannot silently overwrite it. If a prerequisite artifact is missing or broken, provide a clearly labelled reference implementation while keeping the capability gap visible.

Account synchronization is optional and must not be a prerequisite for local use. Sync needs explicit conflict resolution for code, rather than last-write-wins data loss. Telemetry must never upload source code, local paths, terminal contents, or datasets by default.

## 10. Accessibility and motivation

Every interactive control supports keyboard use and visible focus. Trace changes have a readable text equivalent and screen-reader announcements that can be paused. Color is supplemented by labels. Reduced motion preserves the task. Font size, contrast, line wrapping, panel arrangement, and session stopping points are adjustable.

Motivation comes from visible capability: an earlier function powers a later feature; a repaired bug makes a real scenario work; a measured optimization changes responsiveness. Use optional playful scenarios and artifact milestones. Avoid speed rankings, daily penalties, forced streaks, and points for passive activity. Provide a glossary, searchable personal notebook, dependency map, and “why am I learning this?” link on every mission.

## 11. Capstones

Capstones are assembled from earlier work but include unseen requirements. Reference artifacts can fill gaps for practice; independent graduation must identify which parts the learner demonstrated.

| Capstone | Deliverable | Required surprise |
|---|---|---|
| Personal data tool | CLI, parser, storage, search, tests, documentation | Malformed data and a changed format |
| Interactive experiment | Model, editable parameters, plotted results, uncertainty statement | A timestep or measurement change that exposes a model limitation |
| Local multi-process product | API, database, accessible UI, background work, logs | Restart, duplicate request, and interrupted update |
| Maintenance and transfer | Feature in an unfamiliar repository using an unfamiliar technology | New compatibility requirement and a delayed bug report |

Final review asks the learner to reproduce a clean build, explain an end-to-end request, diagnose an injected fault, justify an architectural tradeoff, restore data, and use primary documentation to implement a small unfamiliar feature. The portfolio records remaining gaps alongside demonstrated strengths.

## 12. Delivery plan and release gates

Do not build a large navigation shell and call it a complete curriculum. Release narrow, fully taught slices. No delivery date or total lesson count is credible until the first authoring and learner pilots establish throughput.

| Increment | Work and deliverable | Exit gate |
|---|---|---|
| A. Design validation | Capability graph, mission schema, paper prototypes, interviews with tutorial-experienced coders, runtime/isolation audit | Agree graduation rubric; identify required platform capabilities and unresolved execution blockers |
| B. Vertical slice | Stages 0–2 sample chain: fragile app → representation failure → dependable component; editable execution, tracing, hints, independent check, persistence and review | Target learners diagnose and explain unfamiliar variants; focused support closes gaps without compulsory syntax repetition; solutions pass; mutations fail; stop/recovery and accessibility verified |
| C. Connected build | Notes chain through files, tests, Git, debugging, and search | Learner artifact survives cross-mission reuse; unseen defect and transfer gate pass pilot criteria |
| D. Native systems | Memory model, SQLite, loopback services, native diagnostics, controlled failure injection | Isolation and interruption tests pass; no host leakage; data recovery demonstrated |
| E. Integrated product | UI, performance, concurrency, security, release and maintenance work | End-to-end capstone and keyboard workflow pass; independent technical/content review |
| F. Scientific and language depth | Models, numerics, parsing, language comparison and documentation-based transfer | Model limitations and semantic differences assessed; delayed transfer pilot completed |
| G. Complete apprenticeship | Gap audit across all graduate capabilities, reviewer workflow, portfolio and export | Every required capability has taught practice, independent evidence, retention and transfer coverage |

Each increment includes content design, runtime/platform engineering where needed, interaction/accessibility work, independent technical review, and learner observation. Estimate effort only after recording vertical-slice authoring, review, correction, and pilot time. Content QA is a first-class cost, not leftover polish.

## 13. Verification and definition of done

A mission ships only when its solution and alternative valid approach pass; starter and known misconceptions fail meaningfully; numbers and traces agree with real execution; each required action reaches the UI; help and reset work; drafts recover; and a learner can transfer the result into its next consumer. Observe a representative tutorial-experienced coder, not only the author.

Frontend verification covers browser rendering, native integration where applicable, actual edited code running, overlay handoff/return, keyboard use, reduced motion, and narrow desktop windows. Desktop tests cover process cancellation including descendants, resource exhaustion, path escape attempts, invalid IPC, missing runtimes, offline start, package interruption, full disk, restart during grading, and restore. Grade determinism is checked across supported runtime versions.

Follow the repository's lab discovery conventions for future implementation: a new folder under `src/labs/` with metadata and entry component; regenerate catalog facts when content is added. Use existing lab quality requirements as the minimum, with this document adding integrated artifacts, system execution, and demonstrated transfer. Do not infer a complete lab from a complete menu.

## 14. Risks and explicit decisions

| Risk | Required response |
|---|---|
| Scope overwhelms learners or authors | Pilot thin connected chains; release only finished stages; maintain a capability coverage ledger |
| Novelty replaces understanding | Require predictions, explanations, delayed tasks and changed contexts |
| Language switching adds overload | Establish concepts in one language first; switch only to reveal useful differences |
| Framework/tool churn | Separate concept outcomes from replaceable tool adapters; pin and review runtime manifests |
| Faulty grading teaches falsehoods | Independent oracles, mutation fixtures, alternative solutions and review |
| Platform failures look like learner failure | Environment diagnosis, resumable setup and distinct error classification |
| Native execution escapes workspace | Audit isolation before shipping affected stages; do not describe process launch as sandboxing |
| Existing lab integration loses work | Versioned handoff contracts, return tests and snapshot recovery |
| Certification overclaims expertise | Publish exact performance evidence and limits; reserve verified open-ended work for human review |

Decisions proposed for implementation approval: desktop-first full path; Windows initial pilot; Python initial shared language; one connected project family with contrasting mini-projects; no passive completion; advanced computer skills and tutorial-level coding entry profile; diagnostic entry with targeted foundational support; capability-based gates; native execution only with validated isolation; optional account sync; human review for verified open-ended graduation. These choices can be revised before build without changing the learning contract.

## 15. Immediate implementation backlog

1. Inspect existing native runtime and CodeLens APIs; document reuse, gaps, isolation, and handoff support.
2. Produce the capability DAG and a coverage ledger linking every graduate performance to introduction, practice, independent gate, review and transfer.
3. Author the first connected fragile-app/representation/dependable-component chain with complete starter, solutions, misconceptions, independent checks, and accessible interactions.
4. Implement the smallest workspace with real Run/Stop, output, draft persistence, artifact checkpoint and trace handoff.
5. Pilot with advanced computer users who have coded along with tutorials and assembled small projects; record gaps between familiar syntax and independent reasoning, and validate targeted support.
6. Revise the chain before estimating the complete curriculum or expanding navigation.

## Repository sources

- [Repository tour](contributing/repository-tour.md)
- [Lab quality standard](lab-quality-standard.md)
- [Lesson writing standard](lesson-writing-standard.md)
- [Dynamic Programming audit and plan](dp-course-plan.md)
- [Desktop architecture and runtime guide](../desktop/README.md)
- [Contributor experience and LMS roadmap](contributor-experience-and-lms-roadmap.md)

This BRD is grounded in local repository material and the user's requirements. Proposed curriculum, metrics, integrations, and release gates are design decisions requiring implementation and validation, not statements that those capabilities already exist.
