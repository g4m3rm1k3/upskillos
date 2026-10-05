# From Python Scripts to C++ Games and Vulkan

Status: **complete-path curriculum draft, not a published or verified lesson series**. Drafted 2026-10-05 at the learner's request. The existing Dice Duel track is implemented; it is source material for the terminal part, not evidence that this expanded path has been authored. No new lessons are registered by this document.

## The learner and the destination

The learner can run a Python script, assign variables, use a list, write a loop and make an `if` decision. A learner who has copied a Python function can enter too: parameters and return values are taught again. We assume no classes, testing, terminal expertise, project organization, C++, graphics, probability or machine learning. Reading a compiler error is a learning outcome, not an entrance requirement.

The destination is a learner-owned C++ project: a terminal dice game, a trained opponent, an SDL3 graphical game, a small GPU renderer and finally a Vulkan renderer. Each executable remains useful when the next one arrives. The game rules and the learned policy can run without a graphics card or a window.

The curriculum teaches software development through those projects: designing interfaces, protecting state, locating bugs, testing behavior, using libraries, documenting a build and explaining tradeoffs. It does not promise mastery of every C++ feature or production engine development.

## Read the draft in this order

| Part | Detailed lesson map | Project and prerequisite |
|---|---|---|
| A | [Terminal C++ and a learning opponent](curricula/cpp-games/01-terminal.md) | Starts from Python scripts. Builds Dice Duel, its tests, trainer and saved model. |
| B | [SDL3 and a graphical game](curricula/cpp-games/02-sdl3.md) | Uses the tested terminal game. Builds windows, input, presentation, animation, audio and a packaged application. |
| C | [Graphics foundations and SDL GPU](curricula/cpp-games/03-gpu.md) | Uses B's resource ownership and event loop. Builds pixels and transformations on the CPU before programming shaders. |
| D | [Vulkan and an explicit renderer](curricula/cpp-games/04-vulkan.md) | Uses C's graphics model. Makes resource allocation, command execution and synchronization explicit. |

[The worked lesson specification](curricula/cpp-games/lesson-specimen.md) demonstrates the required depth for teaching a first class. It is an authoring specimen, not a finished Project Studio lesson.

The [vocabulary introduction map](curricula/cpp-games/vocabulary.md) gives plain definitions and the first lesson responsible for teaching each major term. It is an authoring check, not prerequisite reading for the learner.

[The opening lessons](curricula/cpp-games/course-openings.md) specify how A00, B00, C00 and D00 show the finished project before tools or syntax. Each includes a concrete demonstration storyboard, game context, learner motivation, a first decision and a personal finish line. Every later chapter opens with the specific feature it will add. Actual captured demonstrations are release requirements; the draft's conceptual layouts are not claims of finished graphics applications.

Lesson codes such as A07 and D14 are draft curriculum references, not application progress IDs. They do not change any existing lesson IDs or URLs. A row describes a lesson-sized objective; split it during authoring if the actual explanations and practice expose more than one new abstraction at once. Do not compress lessons to fit this draft's numbering.

## The teaching contract

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
| Project showcases before the first code lesson | Storyboards drafted; actual media not produced | Verified project capture, captions, rules, first decision and learner goal |
| Existing Dice Duel implementation | Implemented previously; needs baseline expansion | Existing compiler walkthrough, not a substitute for curriculum audit |
| Part A foundations and migration | Not authored | Small-step lessons, independent tasks and real compiler walkthrough |
| Part B SDL3 | Not authored | Pinned dependency setup, game tests, bounded smoke runs and visual checks |
| Part C SDL GPU | Not authored | Shader compilation, CPU references, GPU observations and backend reporting |
| Part D Vulkan | Not authored | Feature checks, validation runs, lifetime/resize checks and presentation review |

Implement in prerequisite order, one chapter at a time, after review of this complete draft. For each chapter, author the independent task and reviewer tests first, then derive the small explanations needed to solve it. Try plausible wrong implementations. Walk the whole chapter in a fresh folder and inspect the actual lesson in Project Studio. Follow [repository verification guidance](../AGENTS.md) and regenerate catalog facts if discovered content is added. Do not mark a chapter complete while compiler or hardware checks are skipped.

Curriculum review must ask: could a Python script writer explain every new token in the first guided edit? Could they solve the final task with the example hidden? Does the next chapter rely on anything not yet taught? These questions take precedence over publishing speed.

## Draft verification

On 2026-10-05, ran:

```text
node scripts/check-docs.mjs docs/cpp-games-learning-path.md docs/curricula/cpp-games/01-terminal.md docs/curricula/cpp-games/02-sdl3.md docs/curricula/cpp-games/03-gpu.md docs/curricula/cpp-games/04-vulkan.md docs/curricula/cpp-games/course-openings.md docs/curricula/cpp-games/lesson-specimen.md docs/curricula/cpp-games/vocabulary.md docs/dice-cpp-project-studio.md
node scripts/check-docs.mjs
git diff --check
```

Each documentation command printed `Contributor docs checked: 9 file(s), links, paths and commands all exist.` The whitespace check reported no errors; Git emitted an LF-to-CRLF working-copy warning for the roadmap. These checks validate documentation references, not learner code, teaching effectiveness or GPU behavior. No application build, compiler walkthrough or graphics execution was needed or claimed for this documentation-only draft. Existing unrelated workspace changes were left intact.
