# From Python Scripts to C++ Games and Vulkan

Status: **implemented through A22b; teaching repairs and A22c consolidation are compiler-verified but await browser review; the full path is not complete**. Drafted 2026-10-05 and extended 2026-10-08 at the learner's request. C++ foundations, objects/files, shared builds, deterministic rules, command parsing, seeded dice and the terminal match are implemented in Project Studio. The opponent currently follows a fixed rule. Action selection, Q-learning updates and training, graphical sequels and the full-stack application branch remain planned in this beginner path. The existing faster Dice Duel track stays separate. The [teaching review and repair log](curricula/cpp-games/teaching-review.md) records conceptual gaps separately from technical verification. Do not continue A23 until the repaired section passes its pending visual review.

## The learner and the destination

The learner can run a Python script, assign variables, use a list, write a loop and make an `if` decision. A learner who has copied a Python function can enter too: parameters and return values are taught again. We assume no classes, testing, terminal expertise, project organization, C++, graphics, probability or machine learning. Reading a compiler error is a learning outcome, not an entrance requirement.

The destination is a learner-owned C++ project: a terminal dice game, a trained opponent, an SDL3 graphical game, a small GPU renderer and finally a Vulkan renderer. Each executable remains useful when the next one arrives. The game rules and the learned policy can run without a graphics card or a window.

The curriculum teaches software development through those projects: designing interfaces, protecting state, locating bugs, testing behavior, using libraries, documenting a build and explaining tradeoffs. It does not promise mastery of every C++ feature or production engine development.

The expanded destination also includes a complete application with a C++ backend, a database and a browser interface. HTML, CSS, JavaScript, networking, authentication and deployment must be taught explicitly. This is a separate branch after the terminal/learning foundations; Vulkan is not a web-development prerequisite. Independent game and application capstones establish transfer beyond guided examples.

## Read the draft in this order

| Part | Detailed lesson map | Project and prerequisite |
|---|---|---|
| A | [Terminal C++ and a learning opponent](curricula/cpp-games/01-terminal.md) | Starts from Python scripts. Builds Dice Duel, its tests, trainer and saved model. |
| B | [SDL3 and a graphical game](curricula/cpp-games/02-sdl3.md) | Uses the tested terminal game. Builds windows, input, presentation, animation, audio and a packaged application. |
| C | [Graphics foundations and SDL GPU](curricula/cpp-games/03-gpu.md) | Uses B's resource ownership and event loop. Builds pixels and transformations on the CPU before programming shaders. |
| D | [Vulkan and an explicit renderer](curricula/cpp-games/04-vulkan.md) | Uses C's graphics model. Makes resource allocation, command execution and synchronization explicit. |
| E | [Full-stack application and independent capstones](curricula/cpp-games/05-full-stack.md) | Branches after A. Teaches the browser, C++ service, database, accounts, deployment and recovery. |

[The worked lesson specification](curricula/cpp-games/lesson-specimen.md) demonstrates the required depth for teaching a first class. A10 now implements that sequence with an independent bounded-counter challenge to require transfer to a different problem.

The [vocabulary introduction map](curricula/cpp-games/vocabulary.md) gives plain definitions and the first lesson responsible for teaching each major term. It is an authoring check, not prerequisite reading for the learner.

[The opening lessons](curricula/cpp-games/course-openings.md) specify how A00, B00, C00 and D00 show the finished project before tools or syntax. Each includes a concrete demonstration storyboard, game context, learner motivation, a first decision and a personal finish line. Every later chapter opens with the specific feature it will add. Actual captured demonstrations are release requirements; the draft's conceptual layouts are not claims of finished graphics applications.

Lesson codes such as A07 and D14 are draft curriculum references, not application progress IDs. They do not change any existing lesson IDs or URLs. A row describes a lesson-sized objective; split it during authoring if the actual explanations and practice expose more than one new abstraction at once. Do not compress lessons to fit this draft's numbering.

## The teaching contract

Use the [authoring gates](curricula/cpp-games/authoring-gates.md) before writing each section. Published lessons have executable authoring contracts for outcomes, prerequisite order, recall and transfer; human review still judges conceptual load and comprehension.

Follow [Applied Machine Learning's standard](applied-ml-series-plan.md#the-lesson-standard), with the following concrete application to C++.

1. **A problem before a feature.** First show two scores accidentally changing together, then teach objects and copying. First miss a cleanup path, then teach ownership. Do not start with a tour of keywords.
2. **Define before use.** A new technical term gets a plain definition, a concrete example and a counterexample. Introduce the searchable name: say *constructor*, then explain when it runs. Do not substitute an analogy for its mechanism.
3. **Predict, type, observe, explain, change.** A learner predicts a value or outcome, types a small example, runs it, traces it and makes a purposeful variation. The prediction's explanation must not reveal the answer above the question.
4. **Type with a reason.** Before a guided edit, state what is changing and why each new operation is needed. Use the normal visible live file diff. Normally add 3–12 meaningful lines; 18 nonblank additions is an authoring ceiling, not a target. A long API structure becomes several meaningful edits, not arbitrary slices of a code dump.
5. **One file per step.** Name the exact learner path, the insertion point and whether it is a new file. Explain any temporary compile failure. A syntax-only check proves syntax, not behavior. Every completed slice has a runnable observation or a clearly specified graphics observation.
6. **Every lesson requires independent work.** Its final task shows requirements, input/output examples and a hint ladder, but no implementation. Later tasks specify behavior without dictating the class or function design. Automated checks exercise the learner's actual files. A matching diff is assistance, not proof of understanding.
7. **Fading support.** Use a complete tiny example for a new concept, a partly guided integration, then an independent variation. Chapter gates require transfer, debugging and explanation. Never grade typing speed or line-for-line similarity.
8. **Real project, gradual structure.** Begin with one source file. Extract another when there is a second caller. Introduce a class when it protects a rule or owns a resource. Every folder and class has a stated responsibility; there is no empty architecture to fill in.
9. **Tests are taught.** The first test is a comparison and a failing exit code. Assertions and test runners follow. The learner writes tests and explains what bug each detects. Author-side review cases and wrong-answer trials are additional protection against inadequate tests.
10. **Mistakes are experiments.** Include compiler, linker, input, logic and lifetime failures. Ask for the observation and cause before the repair. Never require executing undefined behavior to obtain a predictable result. Sanitizers are taught where supported, with explicit setup limits.
11. **Math has a path from numbers to notation.** Work a tiny state table, coordinate transform or reward update with real values before writing its formula. Use a trace table and a manipulable figure when it exposes a misconception; then the learner implements the calculation. A slider alone is not an exercise.
12. **No hidden first-party implementation.** Learners type game code, adapters, resource owners, build files and shaders. Libraries and compilers are dependencies, not things they must reimplement. Small supplied image/audio assets and author-side fixtures are labelled as data. Learners can inspect their format and origin.
13. **Use documentation as a skill.** Teach how to read an API signature, parameter ownership, return/failure convention and version requirement. A later challenge asks the learner to find a documented operation and justify its use.
14. **Completion needs evidence.** A successful compile, a green comparison, a visible triangle and a good win rate answer different questions. Lessons state exactly what each check proves and what remains untested.

## A repeatable lesson structure

| Beat | What the learner does | What the author must supply |
|---|---|---|
| Recall | Solve one short problem using the previous lesson | Named prerequisite and recovery link |
| Need | Observe a concrete limitation in the current project | A reproducible input or failing scenario |
| Predict | Commit to an outcome before running | A misconception-based alternative |
| Explore | Type and run the smallest new mechanism | Small diff, output and execution trace |
| Explain | Account for values, control flow or ownership | Exact vocabulary, lifetime/flow diagram where useful |
| Integrate | Apply the mechanism to the growing project | One file at a time; real compile/run commands |
| Break and repair | Diagnose a deliberately introduced fault | Observable symptom and a recovery route |
| Your turn | Implement a related behavior without solution code | Increasing hints and behavioral checks |
| Exit evidence | Explain a design choice and transfer the idea | Rubric; never claim prose has been machine-graded |

The [specimen](curricula/cpp-games/lesson-specimen.md) includes an actual step sequence and assessment contract. All drafted lesson rows below inherit these beats; they are not permission to turn a row into one large code block.

## Boundaries that stay true throughout the path

The rules own legality. The UI asks which actions are legal and translates clicks into requests. Drawing cannot change scores or train an agent. Training and evaluation use the same rule implementation as human play. Saving/loading is separate from deciding an action. A renderer receives a read-only description of what to draw.

Start with ordinary functions and values. Add `Game` to protect valid state, `QAgent` to own learned values and `TrainingSession` to coordinate repeated episodes. A `GameSnapshot` is a read-only copy of public state, not a back door to mutate internals. Files do not automatically require classes; pure calculations remain functions.

Composition means one object has another object as a member. It is taught before inheritance. Runtime polymorphism, a shared interface with selectable implementations, arrives only when two renderer implementations need the same application code. Templates and lambdas are introduced in small experiments before any library signature or test helper requires them.

An ownership diagram accompanies every new resource type. It names who releases the resource, which objects borrow it, whether copying is allowed and when it can be destroyed. In Vulkan, leaving C++ scope alone does not prove the GPU has stopped using an object. [C++ resource-management guidance](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii) informs the design; the GPU lifetime rule is explicitly taught in D.

## Project evolution

These are **proposed learner files**, not paths in this repository. The tree is a destination, introduced over time. `build/` contains generated compiler output; `assets/` and `models/` contain data; `explore/` contains small experiments that are not compiled into the game.

```text
dice-lab/
  CMakeLists.txt
  README.md
  .gitignore
  include/dice/       Game.hpp, GameSnapshot.hpp, Action.hpp, Rules.hpp
  include/learning/   QAgent.hpp, Environment.hpp, ModelStore.hpp
  src/dice/          Game.cpp, Rules.cpp
  src/learning/      QAgent.cpp, Environment.cpp, ModelStore.cpp
  apps/              terminal.cpp, train.cpp, evaluate.cpp
  tests/             rules_tests.cpp, agent_tests.cpp, storage_tests.cpp
  explore/
  models/
  assets/
  build/
```

Part B adds platform resource owners, presentation data, input translation and `apps/sdl_game.cpp`. Part C adds CPU math, image output, shaders and an SDL GPU executable. Part D adds a Vulkan backend. The detailed maps show those additions; no lesson begins by typing the entire destination tree.

The same learner repository carries forward between parts. Record a working milestone before structural changes, with Git introduced explicitly in A. A learner arriving with the existing flat Dice Duel folder gets a migration bridge: inventory files, keep a backup, move one responsibility at a time, build and run unchanged behavior tests after each move. Do not replace their files with a finished archive. Project Studio chapters must explain how to reselect that same folder because chapter project assignments are separate.

## Mastery gates and recovery

| Gate | Independent evidence | If the learner cannot yet do it |
|---|---|---|
| Script to program | Compile a new file, distinguish compile/run, repair a missing declaration, trace a return value | Repeat A's source/type/function experiments with different numbers |
| State to software | Design a small class with a defended invariant, split declaration/definition, add a test that fails on a planted bug | Revisit the class specimen, then the linker and test lessons |
| Game to learning | Trace a complete agent transition, compute a Q update, freeze evaluation, explain a baseline | Revisit deterministic game rules before changing training parameters |
| Terminal to SDL | Handle input without blocking the loop; prove drawing leaves game state unchanged | Test the input adapter and update loop without a window |
| SDL to GPU | Trace one vertex to a pixel; account for shader input layout and resource lifetime | Use the CPU image and transformation experiments |
| GPU to Vulkan | Explain device/queue/command roles; distinguish CPU completion, GPU dependency and presentation | Work the command timeline and image-state trace before a Vulkan submission |
| Final renderer | Resize, minimize, recover, shut down and compare equivalent game/replay behavior | Reduce to the first failed invariant; no API retyping as a recovery task |

A completed challenge has three independent marks: **works**, **explained**, **transferred**. The runner can assess behavior; explanation uses a learner checklist or human review. A failed explanation does not erase work but identifies a recovery lesson. No mastery claim comes from pressing Next.

## Technical choices and validation limits

- Use a documented C++20 subset. Teach headers and ordinary translation units before advanced language mechanisms. Pin actual tool versions when an executable chapter is authored; this draft is not a tested installation recipe.
- Part B uses SDL3's 2D Render API. Part C explicitly switches to SDL GPU, which requires learner-authored shaders and a chosen shader compilation path. Those APIs have different responsibilities. [SDL Render](https://wiki.libsdl.org/SDL3/CategoryRender), [SDL GPU](https://wiki.libsdl.org/SDL3/CategoryGPU).
- Part D targets a checked Vulkan 1.3 feature baseline with dynamic rendering and synchronization2, plus the explicitly documented presentation-lifetime requirements in [the Vulkan map](curricula/cpp-games/04-vulkan.md#scope-and-decisions-to-validate-during-implementation). Feature availability must be queried and enabled. This is a curriculum target, not a claim that every learner's computer supports it. [Vulkan overview](https://docs.vulkan.org/tutorial/latest/01_Overview.html).
- Windows and Linux form the initial executable validation target. macOS needs a separately validated Metal/shader path for C and a portability implementation for D; no untested promise of identical Vulkan setup. GPU lessons require real hardware runs as well as headless logic tests.
- A low-spec or unsupported machine can complete A and pure CPU work in C. Simulation exercises teach the model but do not earn a real GPU execution pass. Record unavailable hardware as blocked/skipped, never passed.
- Existing Project Studio console checks compile and run local programs. Interactive graphics need a dedicated bounded smoke-run mode plus observation checklists. Plan that test infrastructure before advertising automated graphical verification. No permanent polling process or game window should be left by a check.

## Existing Dice Duel audit and migration

The [implemented track guide](dice-cpp-project-studio.md) documents the current game. Its compiler walkthrough validates code behavior, not readiness for the newly clarified learner baseline.

| Existing material | Why a script writer needs more | Draft destination |
|---|---|---|
| First compiler lesson | Entry point, types, input and build flags arrive together; basic tests are assumed | A01–A05 plus A09 |
| State and rules | Arrays, structs, enums, references, headers and exceptions arrive in one lesson | A06–A14, taught separately before rule integration |
| Flat header-based implementation | Does not teach declarations versus definitions, linking or purposeful source folders | A15–A17 |
| Functions operating on public `Game` data | Useful initial representation, but insufficient for learning invariant-preserving classes | A10–A14 followed by the migration in A17 |
| Table, selection and update | Sound project goals, but probability, indexing and references require slower prerequisites | A20–A25 |
| Training, evaluation and model storage | Needs separate tests, failure reasoning and uncertainty exercises | A26–A30 |
| Graphical sequel backlog | Names outcomes without a prerequisite or verification ladder | Parts B–D |

Preserve existing progress identities. Add foundational tracks or new bridge lessons rather than renumbering published files. Audit step identities if existing lessons are expanded: the parser uses step order in IDs, so inserting steps can affect saved progress. Prefer new lessons for substantial additions. Decide navigation labels and migration behavior during implementation; this draft changes neither.

## Authoring order and release gates

| Work | Status | Completion evidence |
|---|---|---|
| Entire-path goals, lesson maps, vocabulary, classes and mastery gates | Drafted here | Editorial review and internal links |
| Project showcases before the first code lesson | A00 has an interactive rule preview; later showcases remain storyboards | A00's browser rules are checked against the completed C++ game; it explicitly uses a fixed opponent, not a trained model |
| Existing Dice Duel implementation | Implemented previously; needs baseline expansion | Existing compiler walkthrough, not a substitute for curriculum audit |
| Part A foundations and terminal game | A00–A22b implemented, including the terminal match, probability, reward perspective, deterministic agent transitions, observations and Q-value storage; action selection, Q-learning updates and training remain unauthored | Small-step lessons, independent tasks, wrong-answer trials and real compiler walkthrough |
| Part B SDL3 | Not authored | Pinned dependency setup, game tests, bounded smoke runs and visual checks |
| Part C SDL GPU | Not authored | Shader compilation, CPU references, GPU observations and backend reporting |
| Part D Vulkan | Not authored | Feature checks, validation runs, lifetime/resize checks and presentation review |
| Part E full-stack application | Drafted, not authored | Browser and C++ service integration, persistent data, authorization checks, deployment and restore, independent capstone |

Implement in prerequisite order, one chapter at a time, after review of this complete draft. For each chapter, author the independent task and reviewer tests first, then derive the small explanations needed to solve it. Try plausible wrong implementations. Walk the whole chapter in a fresh folder and inspect the actual lesson in Project Studio. Follow [repository verification guidance](../AGENTS.md) and regenerate catalog facts if discovered content is added. Do not mark a chapter complete while compiler or hardware checks are skipped.

Curriculum review must ask: could a Python script writer explain every new token in the first guided edit? Could they solve the final task with the example hidden? Does the next chapter rely on anything not yet taught? These questions take precedence over publishing speed.

## Implemented entry chapter — 2026-10-06

### Continuation audit — state/tests and objects/files

The next implemented sections are **State and tests · References, collections and classes** (A06–A10) and **Objects and files · Construction, ownership and interfaces** (A11–A15). Both are C++ lessons. Basic Python scripting describes entry experience, not the language being taught. Use the same learner project folder across chapters. Repository navigation ordering and the newer prerequisite profiles were preserved.

Authoring sources: [state/tests](../scripts/author-dice-state.mjs), [objects/files](../scripts/author-dice-objects.mjs), and [shared authoring helpers](../scripts/dice-path-authoring.mjs). Run the two authoring sources with Node to regenerate their Markdown and author-side walkthrough answers. No answer files are supplied to the learner.

| Section | Audit finding | Adjustment and evidence |
|---|---|---|
| A06–A10 | Copies, aliases and post-bust iteration are easy to confuse; an output-only test can accept printing all examples. | Separate runnable experiments and trace tables; wrong-answer trials reject copy-only transfer, aliased player snapshots, continue-after-bust, missing reset, replacement banking, always-passing tests, counter boundary mistakes and printing all examples. |
| A06–A10 | Assertions can disappear in a release build; a rejected mutation can still corrupt state. | Teach the failing exit-status test before assert, include an NDEBUG experiment, use explicit comparisons in independent test work, and check state after rejection. A10 transfers the design to a different bounded-counter task. |
| A11–A15 | The draft required rejected construction before teaching exception handling. | Move the minimum throw/try/catch explanation into A11; A13 compares result codes, internal exceptions and legal busts. Update the vocabulary map rather than leaving an undeclared prerequisite. |
| A11–A15 | Resource cleanup and snapshots can become unexplained terms; header-only work cannot yet run. | Trace nested destruction, show a live borrowed pointer, forbid owner copying, inspect snapshot independence, and explicitly label the header/source compilation milestones before linking the caller. No dangling pointer is executed. |
| A11–A15 | Echoing input can masquerade as saving; a test that does nothing exits successfully. | Add a real saved-file check and an echo-only mutant. The shared-class task checks both executables and rejects a test with no shared API calls. Its replacement mutant must fail the learner-written test. Behavioral checks remain explicitly distinct from explanation/design review. |

Verification: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceState.desktop.test.js src/labs/project-studio/diceObjects.desktop.test.js src/labs/project-studio/diceState.test.js src/labs/project-studio/diceStart.test.js src/labs/project-studio/series.test.js` printed **Test Files 5 passed (5)** and **Tests 27 passed (27)**. Both new walkthroughs compiled and ran in fresh temporary learner folders with g++; none were skipped. Structural checks enforce at most 18 nonblank additions per guided diff, predictions, experiments, independent tasks, hint ladders and wrong-answer cases.

Browser inspection confirmed both chapters appear in the series, A06 displays a normal file comparison, its independent challenge contains requirements and staged hints without a solution, and A15 renders the shared header with explanations and a live comparison. The browser has no learner filesystem, so it compares against an empty file; incremental edits against saved files are covered by the target-diff tests and desktop walkthrough. No production build or non-Windows execution is claimed. The runs emitted existing Vite/esbuild deprecation warnings. Catalog regeneration still reports the existing 14 content problems.

The subsequent learning-quality pass split A14 into focused lessons and added A16–A19c. A20 opens the learning chapter with probability and expectation. A21 and A21b teach reward perspective and agent-decision boundaries. A22 and A22b now teach observations, reversible addressing and action-value storage. The A22c development-cycle consolidation now precedes action selection at A23; its repaired sequence still needs browser verification. This playable fixed-opponent milestone does not mark the full terminal/Q-learning series or any graphical sequel complete.

### Playable terminal milestone — 2026-10-07

A18 now teaches deterministic transitions; A19, A19b and A19c separately teach whole-line parsing, seeded generation and application integration. Each introduces its terms, uses normal live file comparisons, includes a prediction and an experiment, and ends with independent work and progressive hints. The learner keeps the same project and builds `dice_terminal` with CMake. The opponent banks at four; it is explicitly not trained.

The authoring entry is [author-dice-project.mjs](../scripts/author-dice-project.mjs), with focused [rules](../scripts/dice-game-lessons.mjs), [commands](../scripts/dice-command-lessons.mjs), [randomness](../scripts/dice-random-lessons.mjs) and [terminal integration](../scripts/dice-terminal-lessons.mjs) modules. Run it after the objects generator. Fixtures reconstruct earlier learner work only in author tests; the app never supplies those answers.

Audit adjustments: observe the pot immediately after banking so a later bust cannot mask a missing reset; distinguish a blank input line from EOF in the Windows checker; keep random distribution names visible in Markdown; keep long integration-input descriptions readable. The parser rejects trailing text and case differences, generation tests reject a constant die, and terminal tasks reject counting quit or forgetting illegal banking. Reproducibility is limited to the same build/library and sequence of calls. Statistical fairness is not claimed from a short sample.

Verification before final editorial changes: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceProject.desktop.test.js src/labs/project-studio/diceLearningContract.test.js src/labs/project-studio/diceState.test.js src/labs/project-studio/projectChecks.test.js` printed **Test Files 4 passed (4)** and **Tests 29 passed (29)**. This compiled and ran the growing project, independent answers, wrong variants and blank-line regression on Windows. Browser inspection confirmed the new lesson navigation, visible header/template names and the terminal task's requirement table and hint ladder without a solution. Browser preview cannot execute learner files; the desktop walkthrough supplies that evidence.

### Original entry-section verification

Open Project Studio and select **C++ Games — From Python Scripts to Vulkan**, then **Start here · Meet the game and write C++**. A00 opens on a playable rule preview before installation. A01–A05 teach compilation, output, values/types, extraction failure, decisions and functions. They include visible file comparisons, predictions, purposeful mistakes and independent practice. The chapter now continues into state/tests and objects/files; it does not silently continue into the faster legacy track.

The showcase uses repeatable teaching dice and a fixed bank-at-four opponent. Its bank/bust/win branches and legal state transitions are tested against the actual completed C++ rules. It does not claim to demonstrate a trained policy or a completed graphical sequel.

Author [the entry chapter source](../scripts/author-dice-start.mjs), then run `node scripts/author-dice-start.mjs` to regenerate Markdown and author-side walkthrough fixtures. Hidden reference answers are test fixtures, not files supplied to learners. Existing published lesson identities are unchanged.

Verification commands and results:

- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceStart.desktop.test.js src/labs/project-studio/series.test.js` printed `Test Files 2 passed (2)` and `Tests 14 passed (14)`. The real C++ walkthrough ran without skips, including wrong-answer trials.
- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceStart.test.js src/labs/project-studio/dicePreview.test.jsx src/labs/project-studio/dicePreviewParity.desktop.test.js src/labs/project-studio/figures.test.jsx src/labs/project-studio/diceCppPanel.test.jsx` printed `Test Files 5 passed (5)` and `Tests 18 passed (18)`. This includes compiled C++/browser rule parity, game controls, lesson discovery, small edits and the existing live-diff regression.
- The runs printed existing Vite/esbuild deprecation and outdated Browserslist warnings. No production build or non-Windows compiler verification is claimed.
- After a prose-only refinement to the practice instructions, `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceStart.test.js src/labs/project-studio/series.test.js` printed `Test Files 2 passed (2)` and `Tests 9 passed (9)`.
- Browser verification opened the new series, played the opener's bank comparison (score 9, pot 0, opponent next), inspected the visible first-file diff, revealed a progressive hint without a solution, and checked the remaining lesson entry steps. The temporary development server was stopped after verification.
- Regenerated lesson titles, IDs and project facts using their Node scripts, then ran each with `--check`; all reported current data. The inventory continues to report its pre-existing content problems. `node scripts/check-docs.mjs` passed for the contributor documents; the path and terminal-map documents also passed an explicit check.

## Draft verification

On 2026-10-05, ran:

```text
node scripts/check-docs.mjs docs/cpp-games-learning-path.md docs/curricula/cpp-games/01-terminal.md docs/curricula/cpp-games/02-sdl3.md docs/curricula/cpp-games/03-gpu.md docs/curricula/cpp-games/04-vulkan.md docs/curricula/cpp-games/course-openings.md docs/curricula/cpp-games/lesson-specimen.md docs/curricula/cpp-games/vocabulary.md docs/dice-cpp-project-studio.md
node scripts/check-docs.mjs
git diff --check
```

Each documentation command printed `Contributor docs checked: 9 file(s), links, paths and commands all exist.` The whitespace check reported no errors; Git emitted an LF-to-CRLF working-copy warning for the roadmap. These checks validate documentation references, not learner code, teaching effectiveness or GPU behavior. No application build, compiler walkthrough or graphics execution was needed or claimed for this documentation-only draft. Existing unrelated workspace changes were left intact.

### First probability lesson — 2026-10-07

A20 begins **Learn from decisions · Probability and action values** with an interactive enumeration of six alternative rolls. The learner predicts and reveals an expected pot, changes the initial pot, then writes the same enumeration in C++. Independent practice counts immediate winning faces and rejects completed positions. The lesson explicitly separates an immediate quantity from a long-term action value. [The authoring source](../scripts/author-dice-learning.mjs) generates the lesson and author-only answers.

`node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceLearning.desktop.test.js src/labs/project-studio/diceState.test.js src/labs/project-studio/diceLearningContract.test.js src/labs/project-studio/diceStart.test.js` printed **Test Files 4 passed (4)** and **Tests 14 passed (14)**. The required full non-desktop run, `node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude "**/*.desktop.test.js"`, printed **Test Files 35 passed (35)** and **Tests 170 passed | 1 skipped (171)**. The skip is the existing Python-dependent process-stop test; the C++ walkthrough ran. The figure test verifies that changing the pot recalculates independent alternatives and hides the prior answer until revealed again.

Catalog regeneration completed and still reports the existing 14 content problems. `node scripts/check-docs.mjs` printed **Contributor docs checked: 9 file(s), links, paths and commands all exist.** No production build or non-Windows verification is claimed.

Browser verification opened A20, revealed expected pot 7.5 and expected change 2.5, then changed the starting pot with the keyboard and confirmed the answer hid while all alternatives updated. The first screenshot exposed cramped table headings; scoped figure styling repaired them, and a second screenshot confirmed separated columns. `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceCppPanel.test.jsx src/labs/project-studio/figures.test.jsx` then printed **Test Files 2 passed (2)** and **Tests 13 passed (13)**. Catalog currentness checks passed; the focused curriculum-doc check passed for six files; `git diff --check` reported no whitespace errors. The temporary browser tab was closed and the development server stopped.

During catalog regeneration, development hot reload produced transient Auth/Tour context errors outside the lesson components before the page recovered; this audit does not claim those app-wide development reload errors are fixed. Existing Vite deprecation, Browserslist-age and broad Tailwind-glob warnings also remain.

### Reward and decision-boundary section — 2026-10-07

A21 introduces agent, environment, episode and reward with a separately tested reward function. A21b advances one seat-zero action through the fixed bank-at-four opponent’s response, ending at the next agent decision or a terminal result. It uses supplied die faces for deterministic checks, copies the input game, and rejects incomplete scripts without fabricating a loss or changing the original. Random environment integration and Q-value learning remain later work.

The broad A21 draft was split to avoid introducing feedback and transition timing together. [The environment authoring module](../scripts/dice-environment-lessons.mjs) teaches each mechanism through small file comparisons, runnable probes, trace tables, predictions and experiments. Independent challenges write tests without a supplied body. Wrong-answer trials reject perspective reversal, rewarding unfinished games, returning before the opponent responds, accepting incomplete replies, and empty success tests. All compiler walkthrough prerequisites are reconstructed from earlier taught targets and author answers; no implementation is supplied to learner files.

`node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceLearning.desktop.test.js src/labs/project-studio/diceLearningContract.test.js src/labs/project-studio/diceState.test.js` printed **Test Files 3 passed (3)** and **Tests 12 passed (12)**. The first run caught a missing newline where the new CMake library followed the old project target; the generator was repaired before the successful rerun. No C++ checks were skipped.

The graphics route retains SDL GPU as the bridge rather than adding mandatory OpenGL. The [Part C handoff](curricula/cpp-games/03-gpu.md#api-and-toolchain-decisions) now requires independent C++ graphics work, shader/binding debugging, a clean build and an ownership explanation before Vulkan. The learner’s basic Python entry background is not silently treated as Vulkan readiness.

The required non-desktop check, `node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude "**/*.desktop.test.js"`, printed **Test Files 35 passed (35)** and **Tests 170 passed | 1 skipped (171)**. The skip remains the Python-dependent process-stop test. Contributor docs passed for nine files, and the focused path/terminal/GPU/Vulkan document check passed for four files after learner paths were explicitly prefixed with dice-lab. Catalog regeneration and currentness checks passed with the existing 14 catalog content problems. No production build or non-Windows execution is claimed.

Browser review confirmed A21’s reward table and ordinary visible file comparison, and A21b’s transition trace, independent case table and incremental hint reveal without a supplied solution. A screenshot confirmed the independent exercise layout. The audit moved the explicit transition-result explanation after its prediction. The browser preview cannot run learner code; the compiled desktop walkthrough above provides that evidence.

After the prediction edit, the full non-desktop suite again printed Test Files 35 passed (35) and Tests 170 passed | 1 skipped (171). Final contributor-doc and focused curriculum checks passed, as did the whitespace check. The temporary browser tab was closed and the development server stopped.

### Observations and Q-value storage — 2026-10-08

A22 separates observation/addressing from A22b's table ownership. [The authoring module](../scripts/dice-observation-lessons.mjs), invoked by `node scripts/author-dice-learning.mjs`, generates both lessons and author-only answers. Existing lessons and step identities are unchanged. The learner continues the same project from A21b; the terminal opponent remains fixed. Next is A23 action selection, followed by updates and training.

| Section | Teaching and audit evidence |
|---|---|
| A22 observations | Extract only unfinished seat-zero decisions; explain omitted turn/winner fields and the fixed rules/opponent assumptions. Trace row 328 from 2,3,4 before introducing the general encoding. Validate coordinates before arithmetic and distinguish reserved rows from admitted positions. |
| A22 independent work | Decode different addresses, reject already-winning coordinates, and exhaustively invert every admitted triple. Wrong-answer trials reject swapped scores, accepting unused rows, colliding encodings and printing example strings. The learner must explain why an inverse excludes collisions; output checks alone do not grade that explanation. |
| A22b storage | Begin with a runnable array-copy/reference experiment. Explain type aliases, concrete template arguments, vector initialization, ownership and checked row/column access. Store demonstration estimates explicitly; zero initialization is not evidence and Q-values are not win probabilities. |
| A22b independent work | Test initialization, separate columns, unchanged neighbors, independent agent copies, invalid coordinates and decision boundaries. Negative-value cases reject copied-row writes, an illegal Bank maximum and an invented zero candidate. Fault fixtures include the complete independent test answer, so these defects are exercised against compiled tests. |

Compiler verification:

```text
node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceLearning.desktop.test.js src/labs/project-studio/diceLearningContract.test.js src/labs/project-studio/diceState.test.js
```

Printed **Test Files 3 passed (3)** and **Tests 14 passed (14)**. After strengthening the wrong-answer fixtures, `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceLearning.desktop.test.js` printed **Test Files 1 passed (1)** and **Tests 8 passed (8)**. The real compiler walked all guided commands and independent answers in a fresh temporary learner folder with earlier taught prerequisites reconstructed. No C++ checks were skipped. The final CMake build and CTest include the existing project tests and the new storage test.

`node node_modules/vitest/vitest.mjs run src/labs/project-studio --exclude "**/*.desktop.test.js"` printed **Test Files 35 passed (35)** and **Tests 175 passed | 1 skipped (176)**. The skip is the existing Python-dependent process-stop test. Structural checks enforce the small-diff ceiling, ordered prerequisites, predictions, experiments, independent tasks and three-stage hints. Existing Vite/esbuild deprecation and Browserslist-age warnings remain; the browser server also reported the broad Tailwind content-pattern warning. No production build or non-Windows execution is claimed.

Browser review traversed both lessons in Project Studio. It confirmed the new navigation entries, A22's visible header comparison and address trace table, A22b's rendered template names and C++ comparisons, both independent requirement tables, and one-at-a-time hint reveals without supplied solutions. Continuation from A22 reaches A22b, whose final step states that selection and training remain later work. Screenshots confirmed readable comparison and hint layouts. The browser has no learner filesystem and compares targets with an empty file; incremental sizes are checked against preceding targets by the structural test, and actual source execution is covered by the compiler walkthrough. Regeneration refreshed the app and closed its preview window; reopening Project Studio recovered it.

`npm run facts` could not run because `npm` was not on the shell PATH. Its exact constituent commands succeeded: `node src/scripts/build-lesson-titles.js`, `node scripts/build-lesson-ids.mjs`, and `node scripts/generate-project-facts.mjs`. All three also passed with `--check`; the inventory still reports the existing 14 content problems. `node scripts/check-docs.mjs` passed for nine contributor documents. The final focused command, `node scripts/check-docs.mjs docs/cpp-games-learning-path.md docs/curricula/cpp-games/01-terminal.md docs/curricula/cpp-games/vocabulary.md docs/contributor-experience-and-lms-roadmap.md`, printed **Contributor docs checked: 4 file(s), links, paths and commands all exist.** `git diff --check` reported no whitespace errors, with Git's LF-to-CRLF warnings. A diff against the original A20, A21 and A21b files was empty. Unrelated CartPole edits and concurrently added Q-Maze files were preserved. The temporary lesson tab was closed and development server stopped. Nothing was committed or pushed.
