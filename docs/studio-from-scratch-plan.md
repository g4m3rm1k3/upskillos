# Build a Game Studio from Scratch: course plan

Status (2026-10-06): **agreed in outline; no lessons are written yet.** The user chose to do this course **before**
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
- **Explanation audit (user, 2026-10-07: "no unexplained code… even the css"; level: basic coding skills).** Every
  construct is explained at first use. A script lists keywords, operators, built-ins and `.method()` calls used before
  the prose names them; HTML, JSON and CSS are checked by hand. Fixed 16 gaps in Sprints 0–2.
- Exact tool versions: TypeScript 7.0.2, Vitest 5.0.3, Vite 8.3.3, Electron 44.6.0, Playwright 1.63.0, Phaser 4.2.1;
  Node 22+. Phaser's `.d.ts` has two errors under TypeScript 7, so lesson 1.9 teaches `skipLibCheck`.
- The replay (`studioBuild.desktop.test.js`) passes 35/35 on macOS. Windows still to be run.
- Next: Sprint 4, the editor: React, panels around the game view, a scene tree, an inspector (stories in 3.8's backlog).
