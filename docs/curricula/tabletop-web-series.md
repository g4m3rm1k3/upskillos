# Tabletop Workshop — Yahtzee, Pig and learning opponents

Status: the standalone path is implemented in Project Studio; beginner learner trials, editorial review and cross-platform checks remain open. This is a standalone beginner series. No other course, programming language or prior game project is required. Pig is the agreed second game; further games are transfer projects. The learner builds the applications through lessons rather than receiving a finished application to decipher.

## Implemented route and author verification

Choose **Tabletop Workshop — Beautiful Games and a Learning Opponent** in Project Studio. Start with **Your First Page and the Game** and a new empty folder. Chapter navigation retains that folder. This path does not import files, progress or prerequisites from the C++ series.

The discovered `tabletop-*` tracks progress through a first page, JavaScript fundamentals, a single-file playable turn, CSS, modules and tests, complete Yahtzee rules, short-match Pig, SVG and interface design, Three.js, tabular Q-learning, an opponent lab, and release/transfer work. Every lesson contains a prediction and independently checked practice with progressive hints. Full-file snapshots supply the editor's incremental diffs; independent solutions live only in author fixtures.

The finished application includes Yahtzee against an explicitly simple immediate-score opponent and Pig to 30 against a model trained in a Web Worker. It includes SVG dice, an optional 3D table, responsive styling, reduced-motion support, keyboard controls, policy inspection, cancellation, versioned model save/load and frozen evaluation. It uses functions and modules; a class framework is not required to add the next game. The release lesson asks the learner to design that extension boundary.

Author reference: `src/labs/project-studio/tabletopFixtures/reference/`. From that directory run `npm install`, `npm test`, and `npm run dev`; stop the server with Ctrl+C. This is a verification reference, not a prerequisite or starter download. Dependency versions are pinned in its package file. Current verification reused this repository's installed dependencies; a clean install on each supported platform remains a release check.

From the repository root:

```sh
node scripts/check-tabletop-course.mjs
node --test src/labs/project-studio/tabletopFixtures/reference/tests/*.check.mjs
npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
node scripts/audit-project-studio-lessons.mjs --write
npm run facts
```

The walkthrough reconstructs the project in chapter order, runs the actual desktop check protocol, rejects each authored wrong answer and compares the final files with the reference. Early HTML behavior runs with Happy DOM and trusted classic scripts in a VM; Node module checks run real subprocesses. This does not prove visual layout or WebGL behavior. Syntax-only guided checkpoints say explicitly that they do not establish behavior. The acceptance tests separately cover scoring, Joker placement, complete turns/matches, Pig, hand-calculated Q updates, legal action masking, reproducibility, frozen evaluation and imported model validation.

A browser smoke check verified the rendered Project Studio opening, the reference score previews, training completion, Pig selection and 3D rendering. Seed 7 with 40,000 training episodes produced 692 wins and 308 losses on 1,000 separate evaluation games against the hold-at-10 opponent (baseline-versus-baseline: 507 wins). This is a reproducible experiment against a fixed opponent, not an optimal-policy guarantee or a general claim about human opponents. Training always controls seat zero, alternates starting player, and keys state relative to the acting player so the policy can play the other seat in the interface.

Remaining extensions: full-Yahtzee learning, neural approximators, additional finished games, stronger opponent pools and deeper probability/graphics electives. Remaining review: first-time learner pacing, screen-reader and narrow-device testing, fresh dependency installation, Windows/Linux checks and model-file UI round trips. The repository-wide Project Studio suite also retains unrelated Git-detection and child-process cleanup failures; these are not passing checks for this series.

## The promise

Teach the game rules and programming from the beginning, then develop HTML, CSS, JavaScript, SVG, Three.js and learning opponents in that order. All worked examples, rule specifications, exercises and test fixtures are supplied or developed within this series. Begin with one HTML file containing a small script and styles. Extract files when their responsibilities become clear, then introduce JavaScript modules and only those classes that solve a demonstrated problem.

Use the same Project Studio workflow: one shared project folder for the series, small file diffs, predictions, provided test files, independent implementation tasks, progressive hints, and checks against behavior. Start in a new empty tabletop-workshop folder. The learner needs no existing code, assets, test files, installed compiler or saved progress from another series. New chapter and lesson paths become progress keys once published.

### Entry point and prerequisites

Assume only basic computer use and arithmetic: the learner can open an application, type text and add small whole numbers. Teach creating a folder, showing file extensions, saving a plain-text file, opening it in a browser, using Project Studio, finding browser developer tools and reading a first error. Installation and terminal instructions belong here when the tools first become necessary.

Do not assume the learner knows Yahtzee or Pig. Start with a narrated turn using a fixed hand: what a die face means, what holding does, the roll limit, and how Sixes is scored. Introduce the full scorecard and each advanced rule with examples before implementing them. Explain Pig independently when it arrives.

Programming starts with values, names, expressions and execution order. Conditions, loops, functions, arrays, objects and events each get a separate worked example before they are combined. Teach coordinates and angles before 3D transforms, and probability, averages and the necessary algebra before learning updates. Prior experience may make these lessons faster, but must never be needed to fill a gap.

All required prerequisite links point to earlier lessons within this series. External documentation is supplementary reading. Comparisons to another language, if useful, are optional side notes and cannot carry the main explanation. Review the opening with an empty project and no other course files available.

### Explain code at first use

Every new learner-authored construct needs, in the same step or an earlier worked step:

1. The problem it solves and the precise syntax being introduced.
2. What its inputs mean, what it returns, and which state it changes.
3. A trace with actual values or a before/after image of the rendered result.
4. A prediction, a small change the learner can try, and the expected observation.
5. A reference to the earlier explanation when a later step combines the idea with other code.

Explain HTML attributes, CSS declarations, npm commands, library constructor arguments, test helpers and shaders by this rule too. A supplied test harness must have a reading guide and must not hide pointer-like or callback syntax the lesson has not introduced. Do not use “boilerplate” to excuse an unexplained block. Repeated code need not receive the same explanation every time; mark what is unchanged and explain the diff.

Each lesson uses the Forge/Spreadsheet pattern: story so far, observable outcome, a small Build, Understand with a trace, Engineer explaining a design decision, a controlled failure with restoration instructions, and Your turn with acceptance cases. Tests are evidence of behavior; learner explanations and an independently chosen extra case provide separate evidence of understanding. Correct answers and plausible incorrect answers belong in author fixtures, outside learner-visible targets.

## What the learner makes

A tabletop games collection with an inviting, polished interface. Yahtzee comes first: a readable scorecard, tactile dice, clear holds, visible roll budget, player identity, legal scoring previews, complete bonus/Joker rules, results and replay. Pig adds a distinct game loop and opponents. A game library eventually lets the player choose either game without starting a second app.

The initial art direction is a warm ivory score sheet beside a deep teal dice tray, ink-colored text, restrained brass accents, softly rounded dice and generous spacing. Held dice have a visible outline, a written state and a keyboard-accessible button; color alone never carries the meaning. Typography, spacing, hierarchy, alignment and contrast are taught as choices the learner can change, not delivered as a stylesheet to paste.

Build a complete, pleasant 2D game before adding depth. The 3D renderer adds light, material, spatial motion and interaction, while HTML retains the scorecard, controls and accessible game state. A graphics failure or reduced-motion preference must leave a playable game. The renderer presents an authoritative die result chosen by the game; the animation must not roll a second, different result.

## Sequence and independent evidence

Each row below describes lesson-sized units, not a single large lesson containing all the topics. Split further whenever an example needs unexplained syntax. The implemented route below covers the core application. The longer design map that follows also includes future extensions; it is not a claim that every extension is complete.

### A. From an empty folder to a playable turn

| Unit | New idea, introduced in order | Visible result / independent evidence |
|---|---|---|
| A0 — Your folder and the game | Editor versus browser, files and extensions, save/open/refresh, Project Studio controls; dice, holding, rolls and Sixes | Create and reopen a plain-text file; explain a fixed-hand practice turn without code |
| A1 — One page, one die | HTML document, doctype, element, attribute, text, heading, button | Open index.html and identify document structure; add a second meaningful control without copying a full page |
| A2 — A page with meaning | main, section, heading order, table/caption/row/header/cell, accessible names | Static practice score sheet; explain why scores form a table |
| A3 — First style rule | Selector, declaration, property/value, cascade, inherited text styles; opening DevTools | Style one button and diagnose one overridden declaration |
| A4 — First JavaScript statement | Script element, console output, execution order, literals, arithmetic | Print points for one known face; explain what executes and what is only text |
| A5 — Give a value a name | let, const, initialization, assignment, number/string/Boolean | Change a stored value; predict addition versus text concatenation |
| A6 — Make a decision | Strict equality, comparisons, if/else, Boolean conditions | Award six points for a six and zero otherwise; independently score another face |
| A7 — Name a calculation | Function definition, parameters, arguments, return, local scope, call site | Write and trace a scoring function using specified examples |
| A8 — Keep several values | Arrays, zero-based index, length, reading/writing, out-of-range undefined | Represent a fixed hand; explain which element an index selects |
| A9 — Repeat a calculation | for loop, initialization/condition/increment, accumulator | Score a hand with a loop trace; diagnose an off-by-one error |
| A10 — Read an object | Properties, dot access, methods, object identity | Represent one die's face and held state before using browser objects |
| A11 — Change the document | DOM as objects, querySelector, null, textContent | Display a calculated score; diagnose a selector that finds nothing |
| A12 — Respond to a player | Named event handler, function passed versus called, event timing | Clicking a real button changes a displayed die; keyboard activation works too |
| A13 — Hold and roll | Boolean state, toggle, controlled roll source before randomness, random range mapping | Hold one die and show that a controlled reroll leaves it unchanged |
| A14 — A playable Sixes turn | Combine taught ideas: state, render from state, legal transition, roll budget and reset | Hold dice, roll at most three times, score once and reset; independently test a boundary |

Do not introduce npm, a framework, a class hierarchy or a build tool before this first runnable win. A small local static server is introduced when browser module loading requires HTTP; explain its command, localhost, port and shutdown. A file URL is sufficient only for the earliest self-contained page.

### B. Make the interface beautiful on purpose

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| B1 — Boxes and breathing room | Content/padding/border/margin, box-sizing, units, intrinsic sizing | Annotate the dice button's measured box; correct a width overflow |
| B2 — Type and color | Font family/fallback, scale, line height, contrast, CSS custom properties | Build a coherent type and color system; create a second theme using the same roles |
| B3 — Two layout problems | Flexbox for one-dimensional controls, Grid for page regions, gap, minmax | Scorecard beside dice tray on a wide screen; explain why each layout is used |
| B4 — Small screens and input states | Media queries, wrapping, focus-visible, hover/active/disabled, aria-pressed | Play at a narrow viewport and keyboard-only; keep action labels and focus visible |
| B5 — Motion with a purpose | Transition property/duration/easing, transform, reduced-motion query | Held-state feedback without layout jumping; equivalent state feedback without motion |
| B6 — Design from a brief | Visual hierarchy, spacing rhythm, state inventory | Independently style a results panel; compare normal, empty, error, winner and tie states |

Every property is introduced with a visual change and a one-property experiment. Avoid importing a utility framework or component library that hides the CSS being learned.

### C. Draw dice with SVG

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| C1 — Draw one face | SVG element, viewBox coordinates, rect/circle, fill/stroke, border radius | Draw a single face on paper and reproduce it with coordinates |
| C2 — Draw every face | Coordinate data, loops building SVG, DOM namespaces | Generate faces 1–6 from pip positions; verify pip counts and symmetry |
| C3 — Reuse a drawing | Groups, transform, symbol/use, currentColor | Shared dice and icon artwork; independently draw a Pig badge |
| C4 — Make drawing and interaction agree | Decorative versus meaningful SVG, title, button label, hit area | A die can be selected by mouse or keyboard; its accessible name states face and held status |

SVG coordinates and CSS layout are distinct systems. Explain the four viewBox numbers before scaling or transforms. SVG is used for crisp dice, interface icons and later learning charts; Three.js does not replace those roles.

### D. Full Yahtzee in JavaScript

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| D1 — Two names can share one object | Shared object identity, const binding, copying arrays, nested copies | Reproduce and repair a preview that accidentally changes the scorecard |
| D2 — Separate existing responsibilities | External CSS/script files first, then export/import, module scope, relative paths and HTTP | Same working game after extraction; explain which file owns rules, state and DOM rendering |
| D3 — Testing rules | Node/runtime versus browser, package metadata only when needed, test function, assertion, expected/actual | Translate this series' written input/output examples into executable checks |
| D4 — Counts and score categories | Explicit loops before array callback shorthand, objects as records, named category data | All ordinary categories; distinguish empty category from a recorded zero |
| D5 — One accepted action | Validation before mutation, legal actions, rejected input | Third roll, duplicate score and invalid category do not alter state |
| D6 — Bonus and Joker boundaries | Explain bonus/Joker rules with fresh worked cases, read-only previews, bonus ledger | Complete rules agree with shared fixtures; independently add an edge case |
| D7 — Players and replay | Separate player records, active player, match completion, reset | Complete multiplayer match, winner/tie and replay without leaked state |
| D8 — Saved progress | JSON, parse/stringify, localStorage, schema version, failure recovery | Restore a game after reload; malformed saves produce a recoverable message |

First teach ordinary named functions. Arrow functions, destructuring, spread and map/filter/reduce each need their own equivalence trace before appearing in application code. Do not convert every loop to a dense expression. Every explanation stands on concepts already taught in this series; no translation from another language is required.

### E. Three.js from a visible square to a tactile table

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| E1 — A package and a build tool | npm, dependencies, lockfile, scripts, installed versus source files, local dev server | Reproduce the existing 2D game through the build tool before adding Three.js |
| E2 — A scene you can name | ES module import, constructor/new, scene, geometry, material, mesh, camera, renderer | One visible cube; explain the role and units of every constructor argument |
| E3 — Position and projection | x/y/z, local/world coordinates, radians, perspective, aspect ratio, clipping planes | Move the camera and predict which face becomes visible |
| E4 — Light and material | Ambient/environment versus directional light, normals, roughness, metalness, shadows | Ivory dice on a teal tray; compare changes one parameter at a time |
| E5 — Numbers on faces | Face orientation, texture coordinates, material assignment, texture color handling | Each logical face 1–6 is shown upward by a known orientation |
| E6 — Animation over time | Render loop, elapsed time, interpolation, easing, quaternion rotation with a separate worked example | Roll ends at the already chosen result at different frame rates |
| E7 — Pick a die | Pointer coordinates relative to canvas, normalized coordinates, raycasting, hit selection | Clicking a mesh dispatches the same hold action as its HTML button |
| E8 — Resize and release resources | CSS size versus drawing-buffer size, pixel ratio budget, camera update, disposal, event/listener lifetime | Resize without distortion and switch views repeatedly without accumulating scene resources |
| E9 — Finish the table | Composition, restrained effects, quality settings, reduced motion, graphics fallback | Deliver a polished scene with a fully usable HTML scorecard and 2D fallback |

Keep the early die geometry simple. Teach bevels, custom geometry, texture generation and post-processing only after the learner can explain the basic scene. Physics is an optional later extension; it must not introduce a mismatch between the scored face and the visible face.

### F. Opponents before machine learning

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| F1 — A legal random player | Policy as a function, observation versus internal state, legal action list | Opponent completes games without privileged knowledge of future random values |
| F2 — A readable heuristic | Explicit priorities, deterministic tie-breaking, scoring versus keeping decision | Opponent explains a chosen action in terms of its rule |
| F3 — Expected value | Outcomes, probability, weighted sum, enumeration of a small reroll | Calculate one-die expectations by hand and compare with code |
| F4 — Simulate candidate actions | Repeated trials, seeded experiments, mean/variance, equal computation budget | Compare random, heuristic and sampled-lookahead players on held-out seeds |
| F5 — Keep the UI responsive | Event loop, promise/async/await, cancellation, Web Worker messages | Background opponent thinking; a reset invalidates stale worker replies |

Call these rule-based or search opponents, not trained machine learning. A beautiful thinking animation is not evidence of intelligence. Probability lessons precede training vocabulary.

### G. Pig makes reuse concrete

Use standard two-player Pig as a precisely documented course variant: rolling 1 loses the current unbanked turn total and passes play; rolling 2–6 adds to it; holding banks it and passes play; first to reach a target of 100 banked points wins immediately. No exact-target requirement. The policy observes its own banked score, the other banked score, its turn total and legal actions.

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| G1 — Build Pig plainly | A small new state machine, roll/hold/bust/win | Implement and test the Pig rules in an isolated module |
| G2 — Reuse one visible component | Dice renderer and control styling reused with game-specific labels | Pig uses the existing dice visuals without importing Yahtzee scoring |
| G3 — Compare the two games | Identify actual duplicate setup, input wiring, results, saves and cleanup | List what is truly shared and what must stay game-specific |
| G4 — Extract a small host | Game selection, lifecycle, rendering adapter, game-specific actions | Switch games without stray listeners, timers, workers or saved-state collisions |
| G5 — Functions or classes? | Composition, closure lifetime, instance state, cleanup method | Justify one renderer class or closure with a resource-lifetime problem |
| G6 — A new game's acceptance contract | Rule fixtures, visual states, interaction, complete match | Independently add a Pig rule variant without changing Yahtzee behavior |

Do not begin the series with BaseGame, an entity-component system, an event bus or dependency injection. After both games work, define the smallest shared operations their actual call sites need: create a session, obtain legal actions, apply one action, obtain a display snapshot and dispose resources. The host need not pretend that Yahtzee's category selection and Pig's bank decision are the same action.

### H. Train a Pig opponent from understandable numbers

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| H1 — What is learned? | State, action, transition, reward, episode, policy, baseline | Trace a short scripted Pig match; distinguish reward from points banked |
| H2 — One table entry | Action value, update target, learning rate | Hand-calculate and implement one update without any ML library |
| H3 — Learn against a fixed opponent | Agent decision boundaries, opponent simulation, terminal reward, bootstrapping | Complete training episodes; wins/losses update the right player's values |
| H4 — Explore while training | Epsilon-greedy action choice, legal action masking, seeded randomness | Compare exploration with greedy evaluation without changing rules |
| H5 — Measure honestly | Training/evaluation split, frozen policy, paired starting positions, uncertainty | Report win rate with sample count and uncertainty against random and hold-at-threshold baselines |
| H6 — Put learning in the app | Worker progress, cancel, model/table format version, loading validation | Train/save/load a table and play it; stop training without freezing the interface |
| H7 — Inspect a strategy | SVG axes, scales, heatmap legend, conditional slice | Show roll-versus-hold choices for fixed banked scores; explain what the chart leaves out |

Use a terminal reward of +1 for a win and -1 for a loss, with zero intermediate reward for the introductory win-probability objective. Model one transition from the learner's decision to its next decision: if it holds or busts, simulate the fixed opponent's turn before returning the successor state. This avoids accidentally maximizing the other player's action values. Truncate unusually long episodes explicitly and report them separately rather than silently treating them as wins.

Teach the tabular update as a correction toward a target: new estimate = old estimate + learning rate × (target − old estimate). For a terminal win, old estimate 0.2 and learning rate 0.1 give 0.2 + 0.1 × (1 − 0.2) = 0.28. Only later introduce the nonterminal target, reward + discount × best legal successor estimate. Terminal transitions do not bootstrap. Explain the discount and episodic termination assumptions rather than copying a formula without its timing model.

No claim that a learned opponent is stronger until evaluation supports it. A fixed opponent environment comes before changing opponents or self-play; self-play makes the training problem less stationary and deserves its own later lesson.

### I. Return to Yahtzee, then learn a neural model

| Unit | New idea | Visible result / independent evidence |
|---|---|---|
| I1 — Why the table grows | State counts, repeated faces versus ordered dice, remaining categories, upper subtotal and bonus eligibility | Explain why Pig's compact representation cannot simply be reused |
| I2 — Encode sufficient information | Feature scaling, category masks, rolls remaining, legal holds/scores, observable state | Encode two situations with different legal futures differently; never leak random generator state |
| I3 — Learn from a baseline | Supervised examples from a search teacher, target definition, train/validation/test split by game/seed | Evaluate imitation against the teacher on unseen games; call it imitation, not reinforcement learning |
| I4 — A small network by hand | Weighted sum, bias, activation, loss, gradient intuition | Predict and update a tiny model with numbers before importing a framework |
| I5 — TensorFlow.js earns its place | Tensor/shape/batch, model, optimizer, training versus inference, tensor disposal | Train a small model; compare to a linear baseline and inspect failure cases |
| I6 — A legal, replaceable opponent | Mask invalid actions, load failure fallback, inference budget, model version | Model cannot select an unavailable category; valid heuristic fallback always works |
| I7 — Advanced reinforcement learning | Replay data, value targets, delayed targets, unstable training, reward design | Optional measured experiment; compare sample efficiency and strength with the existing search opponent |

Do not promise a strong full-Yahtzee neural opponent from a short browser training run. The required outcome is an understood, evaluated learning pipeline; strength is a measured result. Small Yahtzee subproblems can be required exercises before a full-game advanced project.

### J. A collection that can grow

Create a game library screen, consistent settings, per-game saves and a results history only after both games justify them. Teach progressive enhancement, asset budgets, performance measurement, keyboard/screen-reader review, build output, hosting paths and deployment as distinct lessons. Publishing is the learner's explicit release action.

The final independent project adds another game, such as Farkle, with a written rule specification and without rewriting the host. Learner evidence includes rule tests, a new visual component, an explanation of the shared boundary, resource cleanup when switching games, and an evaluated baseline opponent. New mechanics may demand a new adapter; preserving a bad abstraction is not the goal.

## Verification and authoring order

Author A first and walk it with a fresh project before drafting its successors. Keep the phase map in documentation until actual lessons exist; do not publish placeholder lessons that suggest content has been completed.

For each authored unit, retain a concept ledger: construct → first teaching step → later reuse. Review each target diff against that ledger, including library calls and provided harnesses. A scanner can flag syntax but cannot certify an explanation. A human or explicit editorial pass must read the dependency chain.

Each release milestone needs:

- Parsed lesson checks: unique stable IDs, one target per step, readable intro, predictions and progressive hints, no visible independent-task answer.
- Cumulative runtime walkthrough: apply targets in order, complete independent exercises from author fixtures, run the same checks the learner receives, and prove plausible wrong implementations are rejected.
- Rule correctness: self-contained language-neutral input/output fixtures derived from the rule explanations in this series, covering scoring, empty/zero distinction, duplicate recording, Joker placement and bonus accounting. Test whole matches and resets too. Author-side comparison with another implementation may provide extra evidence, but neither running tests nor following lessons may depend on that implementation.
- Browser review: actual lesson rendering, actual learner game at wide and narrow sizes, keyboard play, focus and reduced motion. DOM/unit tests alone do not establish visual quality.
- Graphics review: outcome agrees with displayed face, canvas resize, fallback, switching-game cleanup. Tests should assert orientation/state rather than random screenshots.
- Learning review: hand-calculated updates, terminal behavior, legal actions, reproducible seeds, held-out evaluation, frozen inference, cancellation and sensible resource use.

The learner's application should use plain JavaScript first. React, TypeScript, custom shaders, physics and online multiplayer remain later extensions with their own prerequisite lessons. The author must pin and verify the actual toolchain when those lessons are implemented; do not give a permanently moving `latest` install command or invent untested package versions.

## Documentation anchors checked during planning

- [JavaScript const — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const): prevents binding reassignment; it does not make an object's properties immutable. Teach this through assignment and mutation examples within the series.
- [SVG viewBox — MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox): the internal coordinate rectangle is separate from the displayed size.
- [Three.js installation](https://threejs.org/manual/pages/installation.html) and [responsive design](https://threejs.org/manual/pages/responsive.html): use the official toolchain and sizing model when authoring executable examples.
- [TensorFlow.js model training](https://www.tensorflow.org/js/guide/train_models): introduce tensors, model inputs and training explicitly before using the framework.

These links support technical choices, not a claim that the proposed lessons or opponents have been implemented or verified.

## Verification record — 2026-10-14

- `node scripts/check-tabletop-course.mjs`: printed `PASS 51 lessons, 146 checks, 51 independent exercises, 51 rejected wrong answers; final app matches reference.`
- `node --test src/labs/project-studio/tabletopFixtures/reference/tests/*.check.mjs`: printed `tests 8`, `pass 8`, `fail 0`.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: printed `Test Files 2 failed | 51 passed (53)` and `Tests 2 failed | 241 passed (243)`. Failures were `projectChecks.test.js` Git repository detection and `projectIsolation.test.js` child-process cleanup. The new Tabletop tests passed.
- `npm run build` in the reference folder: succeeded, transforming 13 modules. Warnings: the optional Three.js chunk exceeds 500 kB, installed Browserslist data is old, and the parent Tailwind configuration has no content setting for this standalone app (the app uses its own CSS).
- `npm run facts` and `npm run catalog:check`: generation/currentness checks succeeded; the catalog reports 14 existing content problems in its generated inventory.
- `node scripts/audit-project-studio-lessons.mjs --write` and `--check`: generated report is current. Tabletop rows have no structural errors; the broader report retains four existing exposed-target errors in other tracks. Structural signals do not certify teaching quality.
- `npm run docs:check`: printed `Contributor docs checked: 10 file(s), links, paths and commands all exist.`
- `git diff --check`: no output.

No full UpSkillOS production build or fresh platform installation was performed for this content addition. Temporary preview servers were stopped after the browser checks.

## Teaching-depth follow-up — 2026-10-14

At this earlier checkpoint, the implementation was an end-to-end working path but the teaching-depth review covered only the lessons below. The subsequent whole-path pass is recorded at the end of this document.

This follow-up expands two specific lessons:

- **10.1 — What the model learns:** concrete win/loss arithmetic before the formula; rewards versus banked score; terminal and continuing transitions; learning rate and discount; bootstrapping and the limits of probability interpretations; state lookup, array identity, fallback behavior, defaults and every operator in the update. A real imported-function check covers arithmetic, terminal non-bootstrap, alpha boundaries and read-only unseen-state lookup. The independent task adds boundary cases and a learner-chosen hand calculation.
- **11.1 — Train without freezing the table:** main-thread blocking, worker ownership, message/event flow and copying, validation, seeded state, loop indexing, message shorthand, evaluation and cancellation. The new explained test harness exercises the real worker handler with invalid requests and a complete small training run. It deliberately does not claim to test browser scheduling. Fixed progress reporting to use completed episodes (`i + 1`) and safely reject absent message data.

Verification after these edits:

- `node scripts/check-tabletop-course.mjs`: `PASS 51 lessons, 148 checks, 51 independent exercises, 51 rejected wrong answers; final app matches reference.`
- `node --test src/labs/project-studio/tabletopFixtures/reference/tests/*.check.mjs`: `tests 9`, `pass 9`, `fail 0`.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: `Test Files 2 failed | 51 passed (53)`; `Tests 2 failed | 241 passed (243)`. Same existing Git-detection and child-process cleanup failures.
- `node scripts/audit-project-studio-lessons.mjs --write`: regenerated the inventory; exit 1 remains because the broader report has four exposed-target errors outside Tabletop. No new Tabletop structural errors.
- `git diff --check`: no output.

At this checkpoint, the next teaching-depth priorities were the first Three.js scene/rotation lessons and frozen evaluation statistics. Browser responsiveness, real cancellation and imported-model round trips remain separate manual verification tasks. This follow-up did not rerun browser or production-build checks.

### Exploration refinement

The worker lesson now builds the receiver, request guard, training loop and evaluated result in separate steps. A small scratch page makes the intermediate stages observable before the final controller exists. Each stage asks for a prediction, a controlled change, an expected result, restoration and an explanation. The editor retains full-file snapshots for accurate diffs; those snapshots must not be treated as permission to introduce a whole subsystem in one unexplained step.

Browser verification of the scratch page observed `progress: 0` with the first receiver and `progress: 1000`, `progress: 2000`, `done: ready` with the finished worker. The temporary server was stopped afterward. The cumulative walkthrough now prints `PASS 51 lessons, 151 checks, 51 independent exercises, 51 rejected wrong answers; final app matches reference.` The required Project Studio test run still prints `Tests 2 failed | 241 passed (243)` with the same two infrastructure failures. The audit inventory was regenerated; its four pre-existing exposed-target errors still produce exit 1.

The standard carried into the subsequent whole-path pass was: introduce one meaningful change, explain new syntax before use, let learners observe it, vary an input, diagnose a deliberate fault and then solve a transfer task. A longer explanation placed after a large block is not a substitute for this sequence.


## Whole-path teaching pass — 2026-10-15

The remaining core lessons have now received the teaching-depth pass. The standalone entrance starts with page structure and values; later lessons introduce syntax, state ownership, geometry, event lifecycles and learning arithmetic beside the code that uses them. Larger changes have intermediate working stages, scratch experiments, concrete traces, predictions, expected observations and independent transfer tasks. Full-file editor snapshots remain for reliable diffs; learners are directed through the meaningful changes rather than asked to decipher those snapshots unaided.

Specific additions include callable-input and callback experiments; scoring and turn boundary probes; lit-tray, cube-body and static-picking stages before animation; numerical face-orientation checks; a read-only scorecard before interactive scoring; complete learner/opponent transition traces; Wilson interval arithmetic before the evaluator; and progress-only worker wiring before model installation. Repeated exercises were replaced with distinct transfer problems. CSS checks now reject incorrect computed styles even when the expected controls exist. Published progress keys have a regression fixture and remain in order.

Verification also found and fixed three concrete defects: the scratch canvas needed CSS dimensions independent of its high-density drawing buffer; evaluation with no completed games needed an explicit unconstrained interval; and model validation needed to reject noncanonical coordinate keys. Every affected learning-module snapshot matches the reference implementation.

Verification for this pass:

- `node scripts/check-tabletop-course.mjs`: `PASS 51 lessons, 200 checks, 51 independent exercises, 60 rejected wrong answers; final app matches reference.`
- `node --test src/labs/project-studio/tabletopFixtures/reference/tests/*.check.mjs`: `tests 9`, `pass 9`, `fail 0`.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: `Test Files 2 failed | 51 passed (53)`; `Tests 2 failed | 242 passed (244)`. The failures remain Git repository detection and child-process cleanup, outside the Tabletop lesson changes.
- `npm run build` in `src/labs/project-studio/tabletopFixtures/reference`: `13 modules transformed`, successful build. Warnings: stale Browserslist data, inherited Tailwind content configuration and the optional Three.js chunk exceeding 500 kB (522.24 kB).
- `node scripts/audit-project-studio-lessons.mjs --write`: reports regenerated; exit 1 from four existing exposed-target errors outside Tabletop.
- Browser check of the new 3D scratch page: the requested face sequence rendered inside the host, and clicking the middle die displayed `Picked die index 2`. The temporary browser tab and server were closed.

This completes the authored core teaching pass, not a certification that every beginner will understand every line. Beginner learner trials, independent editorial review, full keyboard/screen-reader and cross-platform verification remain open. The current pass did not repeat browser model import/export or cancellation tests, run a fresh dependency installation, or build the full UpSkillOS application. Later games and the advanced learning extensions in this design remain future work.
