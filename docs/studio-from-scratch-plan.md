# Build a Game Studio from Scratch: course plan

Status (2026-10-08): **agreed in outline; Sprints 0 to 6 are written** (see Status below). The user chose to do this course **before**
the remaining Game Studio starters: Kart Circuit becomes its final project, built in the user's own studio together
with an agent (below).

## The goal

A course that teaches the user, step by step, to build their own desktop game studio like UpSkillOS's Game Studio:
an editor with a scene tree, an inspector, a viewport, undo, scripts, physics, tilemaps, animation, export, and a
machine-learning trainer. UpSkillOS exists so the user learns software engineering and machine learning; this course
teaches both on a real, large program they have already used.

- **Audience:** knows some JavaScript, little else. TypeScript, React, Node, Git, testing and tooling are taught as
  they are needed.
- **Where it runs:** on the learner's own machine, as a Project Studio track, like the C++, pygame and ML series. Real
  files, a terminal, Git, VS Code. It must work on Windows and macOS (the user works on both).
- **Stack (the user's choice, 2026-10-06):** Electron, React, TypeScript, Vite, Phaser, Vitest, Monaco (the script
  editor), Playwright (end-to-end tests), electron-builder (the installer). The same as the real Game Studio, so the
  reference code maps onto it directly.

## The lesson standard (the user, 2026-10-06)

1. **Every line of the studio is in the lessons.** No file arrives ready-made. No code dumps.
2. **Smallest runnable steps.** A step adds a few lines (usually 5 to 30) and ends with something you run: the app
   starts, a test passes, or something new appears on screen. A step that cannot run yet is too big: split it.
3. **Explanations are bullet lists, not paragraphs** (the user, 2026-10-06), and say exactly what the code does, in
   this order:
   1. what runs, line by line: what each line creates or changes, in which data structure, with its type, and the
      values before and after;
   2. why it is written this way: the alternatives, and what would go wrong with them;
   3. a description or an analogy, only where it helps, never in place of 1 and 2.
4. **Agile for real.** The course runs in sprints. Each sprint starts from user stories in a backlog, has a definition
   of done, ends with a working studio and a short retrospective. Architecture decisions are written as ADRs. Tests
   come first where they help (and the course says when they do not). Every step is a Git commit; CI runs the tests.
5. **Honest history.** The real Game Studio was planned by GPT and built by several agents, with dead ends and
   rewrites. Lessons say where its design came from and what the course does differently, and why.

A sample of the explanation style (Sprint 1):

```ts
export class Vec2 {
  constructor(public x: number, public y: number) {}
  add(o: Vec2): Vec2 { return new Vec2(this.x + o.x, this.y + o.y); }
}
```

- `class Vec2` defines a new type. `new Vec2(3, 4)` allocates an object with two own properties: `x: 3`, `y: 4`.
- `constructor(public x: number, public y: number) {}` is TypeScript shorthand: each `public` parameter declares a
  property of that name and type and assigns the argument to it. The body is empty because nothing else happens.
- `add(o: Vec2): Vec2` is a method: it takes another `Vec2`, `o`, and is declared to return a `Vec2`.
- It reads `this.x` and `o.x`, adds them (and the two `y`s), and returns a **new** `Vec2`. Neither original object
  changes: after `a.add(b)`, `a` is as it was.
- Why a new object: a position can then be shared between nodes without one node moving another by accident. The
  alternative, changing `this.x` in place, is faster but makes that bug possible.
- Run `npx vitest`: `new Vec2(1, 2).add(new Vec2(3, 4))` is `{ x: 4, y: 6 }`.

## Testing is taught, not just used (the user, 2026-10-08)

The learner is becoming a software engineer, starting from a Python script and a little JavaScript. Testing is one
of the skills the course exists to teach, as much as the code, Agile and design patterns. So:

1. **One behaviour per cycle.** A test step adds one test, which fails for the reason the lesson names; the next step
   writes the least code that makes it pass; the next test makes the code more general. Several tests in one step only
   when they check one behaviour from several sides, or pin down code that already works, and the lesson says which.
2. **Red, green, refactor, all three.** After green, the lesson looks at the code and the tests and tidies what needs
   it, with the tests run again to show nothing changed. When there's nothing to tidy, it says so in a line.
3. **A red test fails on an assertion that names the missing behaviour.** "Cannot find module" is a fair first red for
   a new file, once, and is named as such. A timeout is never a red: the test is changed to fail fast and say why.
4. **Every testing idea is named and explained at its first use**, like a language feature: what it is, why it
   exists, what goes wrong without it. The thread below says where each one starts.
5. **A test written after the code says so, and why** (a characterisation test, a learning test, or an end-to-end
   test that can only run once the app does).
6. **Outside in, from Sprint 4.** A user story's acceptance criteria become an end-to-end test written first; it fails;
   unit test cycles build the parts; the acceptance test passes last. The two loops are named.

### The testing thread

Where each idea is named and explained (after the 2026-10-08 rework):

| Idea | Starts in |
|---|---|
| What a test is, why (regressions, a description you can run), assertions, a test name as a sentence about behaviour | 0.4 |
| Red, green, refactor, all three done; edge cases; a test written after the code, and why | 0.4 |
| Unit and end-to-end tests, the test pyramid; breaking code on purpose to see a test written after it fail | 0.7 |
| How big a step should be | 1.1 |
| Tolerances for floating point (`toBeCloseTo`) | 1.1 |
| Arrange, act, assert; testing what must be refused (`toThrow`) | 1.2 |
| A test that passes at once, and why keep it | 1.4 |
| Test doubles: stubs, fakes and spies | 1.8 |
| Flaky tests, and testing with ranges | 1.9 |
| Learning tests | 2.1 |
| Happy path and unhappy path; a weak red ("Cannot find module") and a real one; the type checker forcing an error path | 2.2 |
| Fixtures, test isolation; table-driven tests (`test.each`) | 2.3 |
| Integration tests | 2.5 |
| A test that couldn't fail, and how to fix it | 3.7 |
| Refactoring under tests | 3.4, 3.5 |
| What to test in a user interface; brittle tests | 4.1 |
| Regression tests; "make the change easy, then make the easy change" | 4.2 |
| Acceptance tests from user stories; outside in, the double loop | 4.4 |
| A red that fails fast instead of timing out | 4.5 |
| Triangulation | 4.7 |
| Organising a growing test file (`describe`); refactoring tests | 5.8 |
| The safety net; characterisation tests (guess, run, pin what it does); seams; extract class; humble object; two hats (don't fix while refactoring) | 6.1 |
| A port (an interface for the outside world); fakes; `.resolves` | 6.3 |
| Failure injection (a fake made to fail); contract tests (`describe.each` over the real thing and the fake); test hooks (`afterAll`) | 6.5 |
| A spy and a stub passed as parameters; round-trip tests; validation at the border between processes | 6.6 |
| Stubbing part of the running app in an end-to-end test, and what that leaves untested | 6.7 |
| Test oracles (`tar` judges the zip); a second example for a file format (triangulation) | 6.8 |
| A contract test catching a real difference between the fake and the disk | 6.9 |

### The audit (2026-10-08) that led to this, and what changed

- Sprint 1 already works in small cycles: one or two tests, then the code. Sprints 2 to 5 drift into batches: three to
  five tests in one step, then the whole implementation (`store.test.ts` 5 at once in 4.2, `transform.test.ts` 5 in
  5.2, `viewport.test.ts` 4 in 5.4).
- The refactor beat is named in 0.4 and practised once, as a whole lesson (3.4). No lesson tidies up after a green.
- Named well: test-driven development (0.4), unit and end-to-end tests (0.7), test doubles and spies (1.8), a range
  instead of an exact value (1.9), refactoring under tests (3.4), stand-ins (4.2).
- Used but never named: fixtures (`scene()`, `store()`, `level()`), arrange-act-assert, edge cases, test isolation,
  regression tests (4.2's test for 3.7's bug is one), integration tests (the store's tests run real commands),
  acceptance tests (every end-to-end test is one story's criteria).
- End-to-end tests written after the code, without saying why: 3.7, 4.4, 4.5, 4.7.
- Weak reds: 5.6, 5.7 and 5.8's end-to-end tests fail by timing out, not on an assertion.
- **Reworked the same day:** 0.4 (a refactor step, named ideas), 0.7, 1.1, 1.2, 1.8 (named ideas); 2.2–2.5, 3.1–3.3,
  3.5, 3.6, 4.2, 4.6, 4.7, 5.2, 5.4–5.8 split into one-behaviour cycles; refactor steps in 0.4, 3.5, 4.2, 5.8; table
  tests in 2.3 and 2.4; acceptance tests moved first in 4.4, 4.5 and 4.7; fail-fast reds in 4.5, 4.7, 5.6–5.8; 3.7's
  console test was found unable to fail for a real bug, and the lesson now shows that and fixes it; tests added for
  behaviour the prose described but nothing checked (3.2 renaming to its own name, 4.6 a black box's colour 0).
  `scripts/studio-build/stepcheck.mjs` checks one lesson's steps in seconds (see How to resume).

## Who it's for (the user, 2026-10-07)

The learner is neither a software developer nor a game developer, and the course teaches both. No term from either
field is assumed: *test*, *process* and *type* are explained from zero, and so are *frame*, *delta time*, *sprite*
and *collision*. Every sprint teaches at least one idea from each side, named and explained (the table below).

## How the lessons are kept right

- **The track is the reference build.** The lessons are a Project Studio track,
  `src/labs/project-studio/tracks/studio-build/`. Every step's file block is the whole file as it stands after that
  step, so the studio exists only as the sum of the steps: no line of it can be anywhere but in a lesson.
- **The walkthrough test replays it.** `studioBuild.desktop.test.js` (with `tracks/studio-build.walkthrough.js`)
  starts from an empty folder and does every step as a learner would: it types each file, runs the step's commands
  (`npm install`, `git commit`, …), and requires every check to pass. Wrong answers listed per step must make named
  checks fail. Lesson 0.7's end-to-end test starts the real Electron app with Playwright, so the replay also proves the
  app opens and shows the right thing. Run it with `npx vitest run src/labs/project-studio/studioBuild.desktop.test.js`
  (it needs `ELECTRON_RUN_AS_NODE` unset or empty; the test sets it empty).
- **Not yet checked by a test:** that every line has a bullet explaining it. That is reviewed by hand for now.
- **Platforms.** Commands are written to work in PowerShell and zsh. The replay has run on macOS; Windows is still to
  be run. Line endings are fixed with `.gitattributes` from the first commit (a lesson learned on Windows).

## What it covers

The real Game Studio's product code is about 12,000 lines (editor 4,500, core 3,700, engine 2,000, ML 1,300, runtime
600). The course's studio will be smaller, perhaps 7,000 to 9,000 lines, because it leaves out the in-browser and
course-specific parts. Everything it does have is taught in full.

| Sprint | What you build | Software engineering | Game development | Lessons |
|---|---|---|---|---|
| 0 | Tooling: Node, npm, Git, VS Code, TypeScript, Vite, Vitest, an Electron window | Version control, a first test, CI, the backlog | What a game engine and an editor are; why a studio is a desktop program | ~6 |
| 1 | An engine: vectors, a tree of nodes, the game loop, input, Phaser drawing it | Types and classes, trees, fixed time steps | Positions and velocity as vectors, the scene tree, frames and delta time, the game loop, keyboard state | ~6 |
| 2 | The project as data: types, scenes, nodes, saving to and loading from JSON | Data modelling, serialisation, validation | Scenes as data; what a level file holds | ~5 |
| 3 | Commands, undo and redo, and GUI → code (the Scene API) | The command pattern, immutability, one way to change data | Why editors need undo; the editor as a program that writes game code | ~6 |
| 4 | The editor: a React layout, the store, the scene tree, an inspector made from a registry | Components and state, observers, data-driven UI | An editor's panels: scene tree, inspector, properties | ~7 |
| 5 | The viewport: drawing the scene, selecting, moving, rotating, scaling, snapping | Coordinate transforms, hit testing, input handling | Screen vs world coordinates, cameras, picking objects with the mouse | ~5 |
| 6 | Real files: projects as folders on disk, Electron's main and preload processes, IPC, zip export | Processes, security boundaries, file formats | Game projects as folders of assets | ~4 |
| 7 | Scripts: Monaco, scripts as modules, a sandboxed game frame, messages between frames, errors in Output | Sandboxing, protocols, module loading | Scripts that give objects behaviour; the lifecycle (ready, update) | ~7 |
| 8 | Physics: bodies, areas, collision layers | Broad and narrow phase, bit masks | Collision shapes, overlap vs solid bodies, gravity and jumping | ~5 |
| 9 | Tilemaps, tilesets, and A* pathfinding | Grids, graphs, priority queues | Tile-based levels, enemies that find their way | ~5 |
| 10 | Animation: sprite frames and a timeline | Interpolation, time | Sprite sheets, frame rates, easing | ~4 |
| 11 | Widgets, game state and saves, made sounds, tweens, particles, a debug panel | Layout algorithms, persistence, digital audio | HUDs and menus, saving progress, sound effects, juice (tweens, particles) | ~7 |
| 12 | Scene instances, and switching scenes | Composition, references | Prefabs: one enemy design, many enemies; levels and menus as scenes | ~3 |
| 13 | Exporting a game; packaging the studio as an installer | Builds, releases | Shipping a game people can play | ~3 |
| 14 | Machine learning: an agent API, tabular Q-learning, linear Q, a trainer in a worker thread, the Train dialog, brains | MDPs, the Q update, function approximation, threads | Game AI that learns: states, actions, rewards | ~9 |
| 15 | Tool scripts, and an API reference generated from the registry | Extensibility, documentation from code | Extending your own tools | ~2 |
| 16 *(proposed)* | Studio Online, part 1: a server with an HTTP API for leaderboards, a database (SQL), tests against a real server | HTTP, REST APIs, SQL and schema migrations, validation on the server, integration tests | Leaderboards and replays shared between players | ~6 |
| 17 *(proposed)* | Studio Online, part 2: accounts and sign-in, publishing a game to a web gallery, deploying the server to the cloud | Authentication (password hashing, sessions or tokens), security, deployment, CI that deploys, monitoring | Sharing finished games; cheating and trust | ~6 |
| — | Final project: Kart Circuit (a top-down racer with Q-learning drivers as competitors), built in your own studio, working with a coding agent | Directing an agent: briefs, backlogs, reviewing its code, tests as the contract | Designing a racer: laps, ghosts, difficulty | ~6 |

**Full stack (the user asked, 2026-10-07: "will this teach me full stack engineering?").** Sprints 0 to 15 teach the
front end, application design and desktop engineering, but no back end: no server, database, API, accounts or
deployment. Sprints 16 and 17 are proposed to add them through a real need: Kart Circuit's leaderboards and ghost
replays shared online, and a gallery to publish games to. They come before the final project, so Kart Circuit can use
them. Not yet agreed.

About **85 to 100 lessons, each 5 to 10 runnable steps: 600 to 900 steps.**

**Left out, or optional,** because they belong to UpSkillOS, not to a game studio:
- the course and task system (the Try it panel, task links, step pictures);
- the links to Sprite Forge and Tile Mapper;
- the written text of every API reference entry (the course builds how the reference is made, not every entry);
- optional extras: Tiled map import, and cross-entropy training.

**Added,** because the browser version does not need them: Electron's processes and IPC, projects as real folders,
the installer.

## The final project: Kart Circuit, with an agent

By the end of the course the learner has built every part of a game studio, and the game chapters have shown how
games are built in one. The final project puts both together: Kart Circuit, a top-down racer with laps, a ghost of your
best lap, and Q-learning drivers as competitors (whiskers as raycasts, progress as the reward, drivers saved at 200,
1,000 and 5,000 laps as easy, medium and hard), built in the learner's own studio, **working with a coding agent**.
The engine features it needs (raycasts, recording and replaying input, analog steering) are added to the learner's
studio first, the same way as every other feature.

What it teaches is directing an agent on a real project: writing a brief and a backlog it can work from, splitting
work into steps it can finish, reviewing its code line by line (which the course has trained), and using tests as the
contract it must meet. This is why UpSkillOS exists.

## How much work

- **For me:** about 25 to 35 agent sessions. The bottleneck is not writing: it is checking each step builds and passes,
  and each lesson in a real Electron app on two systems.
- **For the learner:** at 2 to 4 hours a lesson, roughly 250 to 400 hours. This is the real cost.

## Open decisions (the user's)

1. ~~Its place in the order of work~~: decided, this course first, Kart Circuit as its final project.
2. ~~Where the reference build lives~~: settled by the work itself, the track is the reference build (above).
3. **Name** of the course and track. "Build Your Own Game Studio" is the working name.

## Status

- **Sprint 0, lessons 0.1 to 0.8: written; the user approved them on a skim (2026-10-07).**
  - 0.1 the plan, the backlog and a repository (now also: what an engine, an editor and a game are); 0.2 Node,
    package.json and modules; 0.3 TypeScript; 0.4 tests first, with Vitest; 0.5 a page, with Vite; 0.6 a window, with
    Electron; 0.7 an end-to-end test with Playwright; 0.8 sprint review, retrospective, an ADR and the v0.1.0 tag.
  - CI is a Sprint 0 challenge, not a step: it needs a GitHub account, and the replay can't check it.
  - Changed after that approval, in the 2026-10-08 testing rework: 0.4 (a real refactor step; regressions, assertions,
    edge cases named) and 0.7 (the test pyramid; breaking code on purpose).
- **Sprint 1, lessons 1.1 to 1.10: written and replayed on macOS (2026-10-07), not yet reviewed by the user.**
  - 1.1 Vec2; 1.2 the scene tree (Node); 1.3 local and global positions (Node2D); 1.4 update and delta time;
    1.5 the fixed-step game loop; 1.6 input actions; 1.7 Game, one frame; 1.8 drawTree through a Painter, and a Player;
    1.9 Phaser paints it, keys move it, end-to-end tested; 1.10 review, v0.2.0, ADR 2 (Phaser only paints).
  - The engine's shape follows the app's own Game Studio engine (`src/labs/game-studio/engine/`), simplified:
    actions and "just pressed" per step as there, no rotation or scale yet (Sprint 5), no physicsUpdate split yet.
- **Sprint 2, lessons 2.1 to 2.6: written and replayed on macOS (2026-10-07), not yet reviewed by the user.**
  - 2.1 JSON and the data model (SceneData, NodeData; why the live tree can't be JSON); 2.2 buildNode with a Map of
    makers a game extends (closures, open–closed); 2.3 props onto nodes, an allow list of own number/Vec2 fields,
    errors with paths; 2.4 parseScene: `unknown`, type guards, validation at the border; 2.5 the game starts from
    `scenes/main.json` (Vite `?raw`, `vite-env.d.ts`), a broken file shows its problem; 2.6 review, v0.3.0, ADR 3.
  - Sprint 1's Sprint 2 stories were reworded to match the plan's order (saving from the app waits for Sprints 4 and 6).
- **Sprint 3, lessons 3.1 to 3.8: written and replayed on macOS (2026-10-07), not yet reviewed by the user.**
  - 3.1 the Scene API (findNode, setProp) on data; 3.2 addNode (structuredClone, aliasing), deleteNode, renameNode,
    sibling-name invariant; 3.3 History with two stacks and classic commands (the delete-order bug); 3.4 the same tests,
    switched to snapshot commands (memento, atomic rollback); 3.5 each command's line of code (`lit`, log derived from
    the done stack); 3.6 the `scene` facade, `runCode` with `new Function`, a replay test; 3.7 the console in the app,
    the first CSS, rebuild-from-data, rollback of changes the engine refuses, two new e2e tests; 3.8 review, v0.4.0, ADR 4.
- **Sprint 4, lessons 4.1 to 4.8: written and replayed on macOS (2026-10-07), not yet reviewed by the user.**
  - 4.1 React and JSX, a `Title` component tested with `renderToStaticMarkup` (no jsdom or Testing Library: clicks are
    tested end to end), `main.ts` renamed to `main.tsx`; 4.2 `EditorStore` (change, undo, redo, problem, selection,
    listeners), which also closes a gap in 3.7's `change` (a line that fails part way left its earlier change unbuilt);
    4.3 `useStore` (`useSyncExternalStore` with a version number), the console as a component with `useState`;
    4.4 `GameView` (`useRef`, `useEffect` and its cleanup), `App`, a CSS grid layout, one React root, window 1400×900;
    4.5 the scene tree (a recursive component, `data-path`, keys by name); 4.6 a registry of node types (`propsOf`
    with overrides, `??`, `registryProblems` holding the registry to the engine, `PLAYER_TYPE`); 4.7 the inspector
    (drafts committed on Enter or blur, `key={value}` resets a draft, hex colours, `store.setProp`); 4.8 review,
    v0.5.0, ADR 5 (one store; React draws it).
  - Exact versions added: React and React DOM 19.3.0, `@types/react` and `@types/react-dom` 19.3.0,
    `@vitejs/plugin-react` 6.1.2.
- **Sprint 5, lessons 5.1 to 5.9: written and replayed on macOS (2026-10-07), not yet reviewed by the user.**
  - 5.1 edit and play (the game runs only while playing; Stop builds it again from the scene; a toolbar);
    5.2 `Transform` (x step, y step, origin; `then`, `toLocal` by cross products), `Node2D` gets `rotation` (degrees)
    and `scale`, and the registry's test makes the registry follow; 5.3 boxes drawn from four corners
    (`Painter.fillPoints`, a `Point` interface Phaser's `Graphics` fits); 5.4 click to select (`pick`, top first;
    `pathOf`; a selection outline); 5.5 drag to move (the engine node is the draft, one command on pointer up;
    `dragPosition` in the parent's coordinates; pointer capture); 5.6 the editor's camera (a view transform, `panBy`,
    `zoomAt` about the pointer, wheel and right-drag; everything about the scene in world positions); 5.7 move, rotate
    and scale tools (`atan2`, distance ratios); 5.8 snapping (16 pixel grid, 15°, scale in quarters because 0.1 isn't
    exact in binary; the grid drawn while snap is on); 5.9 review, v0.6.0, ADR 6, Sprint 6 stories (real files).
  - Every mouse interaction's end-to-end test is written first, as Sprint 4's retrospective asked. Sprint 5's
    retrospective asks for the game view's pointer handling (152 lines, only tested end to end) to move into a
    unit-tested class before the game view grows again.
  - No new packages.
- **Sprint 6, lessons 6.1 to 6.10: written and step-checked on macOS (2026-10-08), not yet reviewed by the user.**
  - 6.1 the pointer code moved into `ViewportInput` under characterisation tests (the retrospective's change); a pinned
    oddity (a drag back to its start made an empty command) fixed after the move; 6.2 two processes, Git branches (one
    per story, `git branch -m main` first), `example/` project, `e2e/project.ts` temp folders, `@types/node` 24.19.1,
    `main.js` → `main.ts` run by Electron's Node with types stripped (`electron/tsconfig.json`: `erasableSyntaxOnly`,
    `allowImportingTsExtensions`); 6.3 the `Files` port, `MemoryFiles` fake, `loadProject` (problem, not error);
    6.4 preload (`preload.cjs`, CommonJS, sandbox), `contextBridge`, `ipcMain.handle`, `window.studio`, top-level await,
    first merge; 6.5 `saveScene` write-then-rename, `DiskFillsUp` failure injection, contract tests for `Files`;
    6.6 `formatScene`, `store.save(write)`, `'scene:save'` validated with `unknown`, Save button, Ctrl+S, merge;
    6.7 Open: dialog stubbed with `app.evaluate`, `store.report`, the main process reloads the page; 6.8 the zip format by
    hand (`DataView`, little-endian, `zlib.crc32`, DOS date), `tar` as the test oracle; 6.9 `Files` grows mkdir, bytes and
    `list`, `exportProject` (hidden files out, returns the names), Export button; 6.10 review, v0.7.0, ADR 7.
  - Unit tests 128 → 166, end-to-end 12 → 16. New package: `@types/node` only.
  - `stepcheck.mjs` has a `MOVED` list for files a lesson moves with `git mv` (6.2 moves `scenes/` and `main.js`), and
    doesn't run `npm install`, so 6.2's `@types/node` check fails there by design; the full replay runs it.
- **Testing rework (user, 2026-10-08: "testing is really important to learn… this is to become a software engineer").**
  All 49 lessons audited against the new testing standard (section "Testing is taught, not just used" above, with the
  audit and the list of changes). Batched tests split into one-behaviour cycles from 2.2 to 5.8; refactor steps; every
  testing idea named at first use (table there); acceptance tests first from 4.4; reds fail fast on named checks.
  Replayed 52/52 on macOS after the rework. Unit-test counts in lessons after 2.3 shifted (+6 in all: new table rows
  and tests); a lesson's counts are best checked with `stepcheck.mjs`, not edited by hand.
- **Explanation audit (user, 2026-10-07: "no unexplained code… even the css"; level: basic coding skills).** Every
  construct is explained at first use. A script lists keywords, operators, built-ins and `.method()` calls used before
  the prose names them; HTML, JSON and CSS are checked by hand. Fixed 16 gaps in Sprints 0–2.
- Exact tool versions: TypeScript 7.0.2, Vitest 5.0.3, Vite 8.3.3, Electron 44.6.0, Playwright 1.63.0, Phaser 4.2.1;
  Node 22+. Phaser's `.d.ts` has two errors under TypeScript 7, so lesson 1.9 teaches `skipLibCheck`.
- The replay (`studioBuild.desktop.test.js`) passes 52/52 on macOS (3 structure tests and 49 lessons). Windows still to be run.
- Next: Sprint 7, scripts (stories in 6.10's backlog): a node gets a script, scripts are edited in the studio
  (Monaco), errors say where they are, and a game's scripts run sandboxed away from the studio and the files (a frame,
  messages between frames). Sprint 6's retrospective asks: when a main-process handler needs a decision, it goes into
  a unit-tested function in `electron/` first. Keep the branch-per-story habit from 6.2.

## How to resume (read this first in a new session)

The user's order (2026-10-07): write **every** lesson of this course, through the Kart Circuit final project, before
going back to the Game Studio starter demos and then MeshLab. The user isn't taking the lessons yet; they want them
ready. Keep writing sprint after sprint without stopping to ask.

**Making one lesson** (`src/labs/project-studio/tracks/studio-build/NN-NN-slug.md`):

1. Prototype first when a lesson uses something new (a library, the running app). Assemble the project as it stands
   after a lesson with `python3 scripts/studio-build/materialize.py <empty folder> <NN-NN>` (it writes the last file
   block of every file up to that lesson; delete `src/oops.ts`, `hello.js` and `src/greet.js`, which later lessons
   remove), then `npm install` there. Work it out in that folder, in the session's scratchpad.
   Sprints 4 and 5 did this as a git repository with one commit per lesson, tagged `l41`, `l42`, …, then wrote each
   lesson as a draft whose file blocks are tokens on a line of their own (`@@l42:src/editor/store.ts@@`; `fill.py`
   adds the ```` ```lang file=… ```` fence round a bare token), filled in with
   `python3 scripts/studio-build/fill.py <prototype> <draft> <lesson>`. Every file block is then code that ran.
   For a red step's quoted output, make a `git worktree` of the previous lesson's tag, copy in the files the lesson
   has changed so far (`git show lNN:path`), symlink the prototype's `node_modules`, and run the check's command.
2. Write the lesson to the testing standard ("Testing is taught, not just used", above): frontmatter (title, track,
   runtime: none, concepts, problem); `## ` steps; each step changes one
   file through a ```` ```lang file=path ```` block holding the **whole** file; exactly one ```` ```check ```` fence;
   `predict` and `hints` fences where useful; `###` (never `## `) inside file contents. Tests first: a red step
   (check `exit=1 stderr="…"`), then a green step.
3. Explanations are bullet lists, at the level of basic coding skills: every keyword, operator, built-in, HTML tag,
   JSON key and CSS rule is explained at its first use, what it does to which data first, analogies last. Quote
   output (```` ```text ````) only after seeing it in a real run.
4. Add the lesson id to `lessonIds` in `src/labs/project-studio/studioBuild.desktop.test.js`, and its commands
   (`run`, `editFiles` for backlog ticks, `wrong` answers) to `tracks/studio-build.walkthrough.js`. A wrong answer
   runs on a copy from *before* the step, without the step's file; to test a new test file against broken code, put
   both in the wrong answer's `files`. `tsc` prints its errors on stdout, Vitest's failures go to stderr.
5. While writing, check one lesson in seconds: `node scripts/studio-build/stepcheck.mjs <NN-NN> <node_modules folder>`
   assembles the project from the earlier lessons, writes each step's files, applies the walkthrough's hand edits,
   runs the `run` and `contains` checks and tries each wrong answer. `--e2e` adds the end-to-end checks, `--show`
   prints each command's key output lines (to quote a red exactly), and `--upto N --keep DIR` leaves the project as
   it stands after step N, to run commands in it by hand. The node_modules folder is any project's that has every
   package the course installs (a prototype's, after `npm install`).
6. Run the replay: `npx vitest run src/labs/project-studio/studioBuild.desktop.test.js` (unset `ELECTRON_RUN_AS_NODE`
   in a VS Code shell). Every lesson so far must still pass. The machine has little memory: run end-to-end checks
   sparingly (the replay once per sprint), and after each, check `ps` for Electron processes left behind and stop them.
   Electron can't start inside Claude Code's command sandbox, so e2e commands need it turned off.
7. At the end of each sprint: `python3 scripts/studio-build/audit.py` (lists constructs used before the prose
   explains them; methods a test calls one step before they're written are expected), check HTML, JSON and CSS by
   hand, then `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"` (two failures,
   `projectChecks` and `projectIsolation`, were there before this course), and update the Status section above.

Each sprint ends with a review lesson: version bump, an ADR, `docs/sprints/sprint-N.md`, the next sprint's stories
in `BACKLOG.md` (shown whole), and a tag. The app's own Game Studio (`src/labs/game-studio/`) is the model for the
studio's design; simplify, don't copy.
