# C++ for Python Developers — Dice Duel and Q-Learning

**Scope update (2026-10-05):** the learner baseline has been clarified to someone who can write a Python script, without software-development experience. The [expanded C++ games learning-path draft](cpp-games-learning-path.md) specifies the missing foundations and the full SDL3 → SDL GPU → Vulkan progression, including a finished-project showcase at the start of each series. The existing track described below remains implemented material to expand and migrate; the draft does not claim those new lessons or graphical demos are already built.

Open `#/lab/project-studio` and select **C++ for Python Developers — Dice Duel and Q-Learning**. Use a new empty project folder throughout. The desktop app compiles real C++ and runs checks; browser users can read the lessons and follow along in their own editor and terminal.

The learner knows intermediate Python, but does not need C++, game development or reinforcement learning. The first project is a terminal dice duel with a saved tabular Q-learning opponent. SDL3 is the planned next project, not a dependency or an implemented sequel.

## Teaching contract

- Follow [Applied Machine Learning's lesson standard](applied-ml-series-plan.md#the-lesson-standard): a small runnable experiment, a concrete explanation of its mechanism, incremental integration, deliberate experiments, and an independent checked task. Retain the reinforcement-learning pygame track's behavioral checks and wrong-answer walkthroughs.
- All source is typed by the learner, including tests. No supplied implementation, dependency download, game engine or prebuilt model is required.
- Assume **no C++ knowledge**. Use Python as a comparison when introducing types, references, functions, containers and scope; explain the C++ behavior itself before relying on that comparison.
- Use the standard **visible live file diff**, with complete `file=` targets and no `reference: optional` metadata. Do not duplicate a full program in prose. The diff compares against the learner's actual file, folds unchanged lines, and shows when the file matches.
- Start new ideas in small `explore_*.cpp` executables with commands, predictions and verified output. Then assemble them into the game with small, explained changes. A structural check caps each incremental addition at eighteen nonblank lines, including test scenarios.
- Every lesson includes a **Try it** experiment and a **Your turn** with no target solution, progressively revealed hints, multiple input checks and wrong answers. Correct challenge solutions exist only in the author walkthrough fixture.
- Deterministic rules take explicit die faces. Randomness, terminal input, learning and rendering remain outside those rules.
- Explorations and completed implementations compile and run. Intermediate header steps explicitly check syntax only; the completed behavior is tested at the final integration step. Test-writing steps check that the scenario was typed and say that the implementation is not ready to run yet. Wrong-answer fixtures exercise the corresponding checks.
- Prediction questions precede explanations. State-address and update traces show concrete variable values. Interactive figures let the learner explore epsilon, terminal masking and evaluation uncertainty before writing those calculations in C++.
- Compiler diagnostics, invalid terminal input, end-of-input, both starting seats, illegal-action masking, terminal losses, frozen evaluation and corrupt model files are taught explicitly.

## Curriculum

| Lesson | C++ and software concept | Project outcome |
|---|---|---|
| From Python to a binary | compilation, types, streams, integer division | executable and probability output |
| State and rules | structs, enums, arrays, references, headers, exceptions | deterministic game transitions and tests |
| Randomness and input | engines, distributions, strings, output parameters | seeded dice and safe action parsing |
| Play the terminal game | loops, branches, line input, EOF | human versus fixed opponent |
| Agent/environment boundary | copies, return values, state ownership | transitions between agent decisions |
| Address the Q-table | vectors, aliases, checked indexing, borrowed rows | collision-free state encoding and legal maxima |
| Exploration and expectation | random selection and expected frequencies | epsilon-greedy policy with fair ties |
| Q-learning update | mutable references, floating-point tolerances | numeric update and terminal masking |
| Training episodes | iteration, casts, independent random streams | reproducible training with alternating starters |
| Evaluate without learning | const interfaces, sampling uncertainty | held-out comparison across training seeds |
| Save and validate | stream extraction, RAII, precision, versioning | validated persistent model |
| Play a learned opponent | integration, error reporting, live randomness | human versus frozen learned opponent |

## Game and learning contract

Players race to 12. A roll of 1 loses the unbanked pot and passes the turn; 2–6 adds to it. Banking requires a positive pot. Reaching the target with score plus pot wins immediately. Player 0 is the learning agent; player 1 uses a fixed bank-at-4 policy during training. A transition includes the opponent's whole intervening turn, so a nonterminal successor always belongs to the agent.

Rewards are +1 for a win, -1 for a loss and 0 otherwise. Gamma is 1. Terminal transitions never index or bootstrap from a successor table row. Both exploration and the Q-learning target exclude illegal banking. A simulation guard aborts a run; it does not invent a terminal loss. Training uses a constant learning rate and a simple exploration schedule, without claiming convergence or optimal play.

Evaluation freezes the table, removes exploration, alternates starters and uses new seeds. The experiment reports a fixed-policy baseline, separate training seeds, approximate game-sampling standard errors and a bank-at-7 opponent shift. No win-rate threshold is an automated learning criterion. Human play is another opponent shift, not a claim of universal strategy strength.

## Authoring and verification

Edit [the project source](../scripts/author-dice-course.mjs), [incremental teaching stages](../scripts/dice-course-teaching.mjs), or [explorations and practice](../scripts/dice-course-practice.mjs), then regenerate:

```text
node scripts/author-dice-course.mjs
npx vitest run src/labs/project-studio/diceCpp.desktop.test.js src/labs/project-studio/diceCpp.test.js src/labs/project-studio/diceCppPanel.test.jsx
npm run facts
npm run catalog:check
```

The generated Markdown lives under `src/labs/project-studio/tracks/dice-cpp/`. The existing glob discovers the track; it intentionally has its own selector entry instead of being buried in the beginner C++ mastery series. No published lesson IDs or existing track files are changed.

The compiler walkthrough uses the same desktop checks as the learner, creates a fresh temporary project and exercises deliberately wrong answers before each correct implementation. It requires `g++` on PATH, or `CPP_TOOLCHAIN_BIN` set to the compiler folder. Missing compilers cause the existing shared harness to skip executable tests; always inspect the reported pass/skip counts.

### Initial verification on 2026-10-05

The shell did not expose `npx` or `npm`, so their local Node entry points were used:

- `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceCpp.desktop.test.js src/labs/project-studio/diceCpp.test.js src/labs/project-studio/series.test.js src/labs/project-studio/LessonPanel.test.jsx` printed `Test Files 4 passed (4)` and `Tests 30 passed (30)`. The compiler walkthrough ran without skips, including every deliberately wrong implementation. The tooling also printed existing Vite/esbuild deprecation and outdated Browserslist-data warnings.
- Ran `node src/scripts/build-lesson-titles.js`, `node scripts/build-lesson-ids.mjs` and `node scripts/generate-project-facts.mjs`, then each with `--check`. All reported current generated data. The existing integrity findings remain listed in the generated inventory; this Project Studio track does not alter catalog course counts.
- `node scripts/check-docs.mjs` printed `Contributor docs checked: 9 file(s), links, paths and commands all exist.`
- Opened the initial version in a browser and navigated through its lessons. This verified rendering, but did not identify that the optional-reference setting hid the normal diff. The learner reported that format issue; the revision below corrects it. Browser mode cannot execute desktop checks; those were exercised through the compiler walkthrough.
- `git diff --check` reported no whitespace errors. No production build or macOS/Linux compiler walkthrough was run.

### Format revision

Removed the hidden-reference format and duplicate code blocks. Reworked the track around Applied Machine Learning's small-experiment and independent-practice pattern. Kept the existing lesson file names, IDs, final game rules and learned-opponent behavior.

The panel regression test renders the actual DiffBlock with a preceding file, an incorrect edit and the completed file. It requires visible additions and deletions, no enclosing optional-reference disclosure, and the matching-file message after correction. Figure tests exercise sliders and terminal masking; the compiler walkthrough also runs all new explorations and independent exercises.

## SDL3 sequel backlog

Revision verification on 2026-10-05: `node node_modules/vitest/vitest.mjs run src/labs/project-studio/diceCpp.desktop.test.js src/labs/project-studio/diceCpp.test.js src/labs/project-studio/diceCppPanel.test.jsx src/labs/project-studio/figures.test.jsx src/labs/project-studio/LessonPanel.test.jsx src/labs/project-studio/lineDiff.test.js src/labs/project-studio/series.test.js` printed `Test Files 7 passed (7)` and `Tests 49 passed (49)`. After tightening exercise output checks, rerunning the three dice test files printed `Test Files 3 passed (3)` and `Tests 20 passed (20)`, without skips. Browser verification confirmed the visible file diff, prediction prompt, worked trace table and loaded interactive Q-update figure. Selecting terminal loss changed the displayed estimate from 0.46 to -0.4. An initial app-level tutor context error cleared on reload. The temporary preview server was stopped afterward.

- [ ] Build a window and own SDL resources with RAII.
- [ ] Draw dice, scores and available actions from existing game state.
- [ ] Replace blocking terminal input with an event/update/render loop.
- [ ] Animate a roll without changing rule transitions or random outcomes.
- [ ] Load the frozen policy and explain its choices in the UI.
- [ ] Build a second card game and examine hidden information before adapting learning.

Use the [official SDL3 documentation](https://wiki.libsdl.org/SDL3/FrontPage). The Q-learning reference is Sutton and Barto, *Reinforcement Learning: An Introduction*, section 6.5, available through [the authors' book site](http://incompleteideas.net/book/the-book-2nd.html).
