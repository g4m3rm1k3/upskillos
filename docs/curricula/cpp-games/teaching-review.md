# Teaching review and repair log

Reviewed 2026-10-08. Audience: someone who can write basic Python scripts, without software-development experience. Scope: implemented C++ path through A22b. [Return to the path](../../cpp-games-learning-path.md).

## Finding

The path has useful programming and testing foundations. It is not yet a complete education in independent software development. Previous compiler/browser audits establish executable examples, fault detection and presentation. They do not establish novice comprehension, retention or independent design skill. A checklist containing a prediction and a challenge cannot establish their teaching quality.

## Findings to repair before continuing A23

| Finding in the actual lessons | Why a beginner may struggle | Repair and evidence required | Status |
|---|---|---|---|
| A22 introduces remainder inside its final challenge, immediately requiring a three-coordinate inverse and exhaustive checks | New arithmetic and proof obligations compete with independent problem solving | Runnable quotient/remainder experiment, a two-coordinate inverse and traced nested enumeration before independent decoding | Implemented; compiler-verified; browser pending |
| A22b introduces source-local helpers, enum mapping, vector construction and nested access in one source edit | Few lines conceal several mechanisms | Isolate construction, row selection, column selection and helper scope; run each mechanism before integration | Implemented; compiler-verified; browser pending |
| The table representation and class boundary are selected for the learner | Reproduction can pass without understanding alternatives | Compare sequential search with direct addressing, count work and storage, defend the representation against a changed requirement | Implemented; compiler-verified; browser pending |
| Most independent tasks provide the cases and much of the solution approach | A learner may be unable to turn a request into an algorithm or tests | An unfamiliar change brief with learner-derived examples, design choice, tests and a feedback revision | Implemented; compiler-verified; browser pending |
| Git is an optional paragraph at A16; delivery practices do not recur | The learner can finish code without inspecting changes or recovering work | A practical local status/diff/staging/recovery exercise and a repeatable delivery cycle; later branch/conflict/review work explicitly tracked | Implemented; compiler-verified; browser pending |

## Wider strands: neither omitted nor claimed complete

| Strand | Current evidence | Remaining authored work and placement |
|---|---|---|
| Logic and debugging | Value traces, branches, loops and deterministic rules | Revisit algorithm construction from prose and diagnosis of an unfamiliar bug in every chapter gate |
| Data structures and algorithms | Arrays, vectors and encoded addresses | Introduce measured linear search versus direct access now; teach sorting, binary search, maps, stacks/queues and graph traversal through later concrete needs, each with independent selection and complexity reasoning |
| Mathematics | Arithmetic, exact probability and expectation | Repair inverse arithmetic now; before A24, teach a correction numerically and explain tolerance; before A25, separate discount from learning rate; derive rather than present formulas |
| Architecture | Encapsulation, ownership and separate source files | Compare representations now; later require a new feature that exposes a poor boundary, a behavior-preserving refactor, and a short rejected-alternative explanation |
| Testing | Failure-first examples, boundaries and planted faults | Add learner-derived cases now; later cover test isolation, integration boundaries and debugging from a reported failure without naming the responsible file |
| Git and collaboration | Local snapshot vocabulary and staged review in A16 | Add local inspection/recovery now; a dedicated branch/merge/conflict/revert and review workshop is required before a collaborative/release milestone |
| Iterative delivery / agile practice | Mostly implicit tutorial sequencing | Teach a small backlog, observable acceptance criteria, limited work in progress, feedback and a retrospective now; revisit estimation uncertainty and collaborative review on later features |

These are explicit unfinished teaching strands, not claims that listing them constitutes teaching them. Do not add mandatory frameworks or ceremonies before the learner has a concrete collaboration problem.

## How the repaired section will be reviewed

For each finding, record the old learning jump, the explanation/experiment added, what the learner now produces without a solution, the wrong answer it distinguishes, and remaining limits. Keep technical verification in a separate subsection with exact commands and results. Preserve old progress identities; inserted steps use explicit new keys.

Before resuming A23, the immediate repair rows must have implemented exercises, real compiler walkthroughs and browser review. Human evidence remains separate: a novice should explain the arithmetic and storage choice, solve a different small problem with examples hidden, and return after a gap to diagnose a changed requirement. No observed novice study has been conducted; author walkthroughs must not be presented as one.

## Implemented repair evidence

### Arithmetic: from a new operator to an independently constructed inverse

Previously A22 named remainder for the first time inside the final decoding challenge. It now begins the repair sequence with seventeen counters in groups of five and a reconstruction check. A separate two-coordinate address traces the boundary between rows. The learner then writes a locker decoder using a different width without a supplied body. Only after that task does a nested-loop trace demonstrate exhaustive round trips. The game challenge reuses these mechanisms instead of introducing them under assessment pressure.

The locker wrong answers use the demonstration width instead of the new requirement and accept the first out-of-range address. The round-trip fault uses addition instead of a row stride. These are specific misunderstandings, not merely invalid syntax. Remaining limit: the inverse explanation and independence of the learner's solution still require review.

### Storage: one mechanism observed before it is combined

Previously the production source introduced a constructor, unnamed namespace, action mapping and nested lookup together. A22b now runs a three-row vector experiment, a standalone action translation, and a source-local helper experiment separately. The production constructor is one edit; the checked query is another. Both original progress identities and all other original A22/A22b step identities are retained; additions have explicit new keys.

The learner also compares a counted linear search with direct addressing. The prose distinguishes lookup cost from construction cost and shows why doubling three coordinate ranges multiplies storage by eight. A design prompt contrasts a small complete range with a few IDs spread across a huge range, then asks which responsibility changes when the UI or observation changes. This gives reasons to select a representation rather than treating the chosen container as inevitable. It does not constitute coverage of all DSA or architecture topics.

### Development practice: a different problem and a real change in the brief

A22c asks for a locker selector without prescribing functions, classes or storage. The learner first derives cases and compares retaining all inputs with a streaming solution. They must validate the complete request before reporting a candidate; a free early slot must not conceal later bad input. Feedback then introduces a preferred locker while preserving the old fallback rule. That change makes the original representation choice matter and requires revised acceptance and regression cases.

The learner maintains a small backlog, defers display polish, limits work in progress, and records a retrospective. These terms describe actions they perform, rather than labels attached to the tutorial. The closing review separates behavior checks, independently chosen cases and design explanations; it also asks for delayed recall after a break.

### Git: observe the index, then recover a known mistake

The A22c sandbox stages a tiny demonstration file, changes the working version, and compares ordinary and cached diffs. It restores only the deliberate unstaged mistake from the index and recompiles the result. This is a runnable distinction between staging and working files, not a paragraph that assumes recovery knowledge. The compiler walkthrough initializes and stages only inside its temporary learner folder. It creates no commit and performs no push. Branching, merge conflicts, revert and collaborative review remain unfinished requirements for a dedicated later workshop.

Authoring sources: [prerequisite repairs](../../../scripts/dice-teaching-repairs.mjs), [observation/storage integration](../../../scripts/dice-observation-lessons.mjs), and [delivery consolidation](../../../scripts/dice-delivery-lesson.mjs). Regenerate with `node scripts/author-dice-learning.mjs`.

## Technical verification and remaining gate

`node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceLearning.desktop.test.js src/labs/project-studio/diceState.test.js src/labs/project-studio/diceLearningContract.test.js src/labs/project-studio/diceLearningRepair.test.js` printed **Test Files 4 passed (4)** and **Tests 16 passed (16)**. No compiler checks were skipped. This includes the new C++ exercises, reference implementations, planted faults, disposable Git recovery, small-diff limits and regression checks for every original A22/A22b progress identity.

`node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude "**/*.desktop.test.js"` printed **Test Files 36 passed (36)** and **Tests 176 passed | 1 skipped (177)**. The skip remains the Python-dependent process-stop test. Vite/esbuild deprecation and Browserslist-age warnings remain. No production build or non-Windows compiler execution is claimed.

Catalog regeneration ran `node src/scripts/build-lesson-titles.js`, `node scripts/build-lesson-ids.mjs` and `node scripts/generate-project-facts.mjs`. Each passed its `--check` invocation; the existing 14 catalog problems remain. `node scripts/check-docs.mjs` printed **Contributor docs checked: 9 file(s), links, paths and commands all exist.** The focused command `node scripts/check-docs.mjs docs/cpp-games-learning-path.md docs/curricula/cpp-games/teaching-review.md docs/curricula/cpp-games/01-terminal.md docs/curricula/cpp-games/vocabulary.md docs/curricula/cpp-games/authoring-gates.md` passed for five files. `git diff --check` reported no whitespace errors, with the usual LF-to-CRLF warnings. Unrelated Q-Arcade work was preserved. No repository commit or push was made.

**Browser review remains pending.** The browser-control tool failed with `Transport closed`, including its reset attempt. The Computer Use fallback then stopped because it could not determine the current browser URL with enough confidence to enforce policy. No further browser interaction was attempted. The earlier A22/A22b screenshots do not verify these repairs or A22c. Do not mark this gate complete or resume A23 on the strength of compiler results alone.
