# Course plan: Making Games with Game Studio

Status (2026-10-01): **The user reviewed lessons 1.1–1.4: "good", with one change: the pictures must be high
definition** (now 2× WebP). Decided at that review:
- **Name:** "Building Games with Game Studio". The course id stays `making-games`, because progress is keyed by it.
- **Scope:** concept lessons, not whole games. Teach how to do each thing a game needs (changing scenes, and so on)
  on top of chapter 1, then Tetris as the one complete game, which is "enough to get the full picture". The old
  chapter 8 (rebuilding Coin Run, Breakout and Zombie Arena) is dropped.
- **Machine learning:** a bonus lesson at the end of the course, linked from the ML Lab. A bridge from the ML
  Lab's Python to the engine remains possible later.

The outline below is updated to match. Lessons 1.1–1.4 were the trial (see "Lessons as built").

**All lessons written (2026-10-01): 33 lessons in 8 chapters.** Chapter 7 (game logic) was folded in: game states
are lesson 6.5, and chasing is in the Maze Chase example. Tetris is now chapter 7, and the bonus is chapter 8.

| Chapter | Lessons (each with its Try it task) |
|---|---|
| 1 First steps | scenes, nodes and positions; run and stop; your first script; steering with input actions |
| 2 Physics | bodies and walls; gravity and jumping; areas and pickups; rigid bodies and bouncing; layers and masks |
| 3 Camera and HUD | a camera that follows; camera limits; a HUD on a CanvasLayer |
| 4 Animation | sprite animation; keyframes on a timeline; animation from scripts |
| 5 Tilemaps | tilesets and painting; solid walls; maps from Tiled and Tile Mapper |
| 6 Scenes | scenes inside scenes; making things while the game runs; groups; signals; changing scenes |
| 7 Tetris | one lesson per Tetris task, 1 to 9 |
| 8 Bonus | a game that learns to play itself: Q-learning (Run › Train an agent…, task `q-agent`) |

Every number in the optional maths was checked against the engine's code:
- physics: the minimum translation vector, sliding v − (v·n)n, bounce v − (1+e)(v·n)n, a fixed 1/60 s step and
  gravity 980;
- camera: smoothing 1 − e^(−k·dt) and the limits clamp;
- animation: frame timing, play() not restarting a playing animation, linear keys;
- tilemaps: tile numbering, the solid-rectangle merge, Tiled's flip bits;
- scenes: instance cycles refused, signal error isolation;
- Tetris: every constant in `tasks/tetris.ts`.

Two claims were wrong in the first draft and corrected before generating:
- what play() does when called every frame;
- what Tiled import makes solid. "Try it" is built and tested. Decided with the user (2026-10-01):
- **Full, deep maths in every lesson, labelled optional:** "Under the hood (optional)". A learner can skip it
  and still finish the course.
- **Both forms: the course, and learning inside Game Studio.** The same tasks serve the course's "Try it"
  links and Game Studio's own Help › Tutorials, beside a manual (see "Inside Game Studio too").
- **Each task starts from a known state** (the previous task's solution). The course name stays the working
  title until the user picks another.

The user asked for it once Phase 7 was finished: "a course that opens the game to try hands on, and goes back to
the course to learn the next piece, repeat this way". Game Studio's progress is in [game-studio-status.md](game-studio-status.md); its design is in
[game-studio-architecture.md](game-studio-architecture.md).

## The idea: learn, try, come back

Each lesson is one idea, taught in the course, then practised in Game Studio:

```text
 Lesson (in the course)              Game Studio                          Lesson again
 ┌──────────────────────────┐        ┌──────────────────────────────┐     ┌──────────────────────┐
 │ the idea, with pictures, │ Try it │ the task, already set up     │Back │ what just happened,  │
 │ worked examples, and     │ ─────▶ │ checks tick off as you work  │───▶ │ why it works, quiz,  │
 │ what to expect           │        │ hints if you are stuck       │     │ then the next idea   │
 └──────────────────────────┘        └──────────────────────────────┘     └──────────────────────┘
```

- **"Try it"** opens Game Studio with the lesson's task: a starting project, a goal, and checks.
- **In Game Studio,** a task panel beside the viewport says what to do, in steps. Each step ticks off when Game
  Studio sees it done. Hints appear if a check keeps failing.
- **"Back to the lesson"** appears when every check passes. It returns to the exact lesson, which records the
  lab checkpoint as done, then explains what happened and why.

A lesson can send you to Game Studio more than once, for example a small task in the middle and a bigger one at
the end.

## What the course teaches

**Two layers in every lesson.**
- **How to do it in Game Studio:** the editor, the nodes, and the script API, with Godot's name for each,
  so the knowledge carries over. Everyone does this part.
- **Under the hood (optional):** the full maths and algorithms that make it work, with derivations, worked
  numbers checked against the engine, and the code that implements them. It is clearly labelled optional:
  skipping it never blocks a task or a quiz in the main path. It has its own optional checkpoint and questions.

For example, the lesson on walls teaches adding a StaticBody2D and its shapes, and also how `moveAndSlide` finds
the shortest push out of a wall (the minimum translation vector) and keeps the sliding part of the velocity.

**By the end**, a learner can build a complete game from an empty project:
- scenes and instances;
- physics, animation and tilemaps;
- a HUD, and game states over several scenes.

They will also be able to explain the main techniques: kinematics, collision resolution, interpolation,
pathfinding, and signals.

## How "Try it" works (built 2026-10-01)

Built in `src/labs/game-studio/tasks/` and `editor/TaskPanel.tsx`. The first four tasks (chapter 1) exist. They are
tested in `tasks/tasks.test.ts` and in the browser in `e2e/tasks.acceptance.mjs`. What was built, and what differs
from the first plan:
- **Play checks run in a worker** (`tasks/checker.worker.ts`). A game's scripts expect globals such as `Node`,
  `scene` and `input`; on the editor's page `Node` is the browser's own.
- **Checks read scripts as typed, saved or not,** and run again as the learner types. Run saves first anyway,
  and a step should not wait on remembering Ctrl+S.
- **The link reaches Game Studio through the app's entry links** (`src/utils/entryLinks.js`). The app opens a lab
  as a window and leaves the address, so the query is handed over (MeshLab does the same).
- **Finishing marks the checkpoint at once,** through `useProgress().markCheckpoint`.

The design as planned:

1. **Links.** `gameStudioLink(taskId, { from, lesson, checkpoint })` gives
   `#/lab/game-studio?task=<id>&from=<lesson route>&lesson=<id>&checkpoint=<id>`.
   - Lessons build their links with it, so a task id that does not exist fails a test instead of opening an
     empty editor (MeshLab's rule).
   - `from` is where "Back to the lesson" goes.

2. **Tasks.** A task, in `src/labs/game-studio/tasks/`, is plain data and code, like an example:
   - **title and goal:** what you are making, in a sentence;
   - **start:** Scene API code for the starting project (often the previous task's solution), plus its images
     from the starter art;
   - **steps:** what to do, in order, each with a check and hints;
   - **solution:** Scene API code that completes it, used by the tests and offered after several failed tries
     ("Show me").

3. **Checks** come in two kinds, both using what Game Studio already has:
   - **Project checks** look at the project itself. Example: "a CharacterBody2D named Player with a
     CollisionShape2D under it", or "the Walls layer uses a tileset with solid tiles".
   - **Play checks** run the learner's own game, headless and faster than real time, on the real engine (the
     example tests already do this), with input pressed for them. Example: "holding → for 2 s moves the
     Player at least 100 px", "it stops at the wall", or "a jump lands on the platform".
   - Checks run as the learner works, and tick off in the task panel.

4. **The task panel** sits beside the viewport, like the example guide: the goal, the steps with ticks, a hint
   when a step keeps failing, "Show me" (applies the solution, one undo step), and "Back to the lesson".

5. **Progress.** The link also carries the lesson's id and checkpoint id; finishing the task calls the app's
   `markCheckpoint(lessonId, checkpointId)` (`src/context/ProgressContext.jsx`), so the checkpoint is ticked even
   before the learner goes back.

6. **Tests, so a task cannot quietly break:**
   - For every task, a unit test builds the start and checks that the checks fail (so they test something).
     It then applies the solution and checks that they all pass.
   - A browser test follows one lesson round the loop: the link, the task panel, finishing, and back to the
     lesson with its checkpoint done.

## Inside Game Studio too

The same tasks work without the course, for someone who opens Game Studio first:
- **Help › Tutorials** lists the tasks in chains (the course's chapters). Starting one opens its task panel, with
  **Next task** instead of "Back to the lesson".
- **Help › Manual** has one short page per part of the editor and engine. Each page links to its reference
  entries, its tutorial tasks, its course lesson, and the example that shows it.

The course remains where the full explanations and the optional maths live; the manual is the quick "how do I…".

## The course outline (draft)

Lesson ids follow the course standard; titles are working titles. Each lesson has at least one task. **Under the
hood** is the maths or algorithm the lesson explains.

**1. First steps**
- 1.1 The editor: scenes, nodes, the Inspector. *Task:* add a sprite and place it. *Under the hood:*
  positions, and +y pointing down.
- 1.2 Run and stop; what is saved and what is not. *Task:* run, change a value live, see it reset.
- 1.3 Your first script: `ready` and `update(dt)`. *Task:* make a sprite move across the screen. *Under the
  hood:* speed × time, and why `dt` makes it the same on every screen.
- 1.4 Input actions. *Task:* move with the arrow keys, diagonals no faster. *Under the hood:* normalizing a
  vector.

**2. Physics**
- 2.1 Bodies and shapes. *Task:* a player that cannot walk through a wall. *Under the hood:* the minimum
  translation vector.
- 2.2 Sliding along walls. *Task:* walk along a wall diagonally. *Under the hood:* removing the part of the
  velocity going into a surface (the dot product).
- 2.3 Gravity and jumping. *Task:* jump onto a platform 3 tiles up. *Under the hood:* v² / 2g, and stepping
  physics at a fixed 1/60 s.
- 2.4 Areas and pickups. *Task:* coins that disappear and count. *Under the hood:* overlap tests.
- 2.5 Rigid bodies and bouncing. *Task:* a bouncing ball. *Under the hood:* reflecting a velocity, and what
  bounce does.
- 2.6 Layers and masks. *Task:* a ball that passes through the paddle. *Under the hood:* bits and the `&`
  operator.

**3. Camera and HUD**
- 3.1 A camera that follows. *Task:* scroll a long level. *Under the hood:* smoothing as 1 − e^(−k·dt).
- 3.2 Camera limits. *Task:* never show past the level's edge.
- 3.3 A HUD on a CanvasLayer. *Task:* a score that stays put.

**4. Animation**
- 4.1 Sprite animation. *Task:* idle, walk and jump. *Under the hood:* frames per second and time.
- 4.2 Keyframes on a timeline. *Task:* a door that slides open. *Under the hood:* linear interpolation.
- 4.3 Animation from scripts. *Task:* play the door's animation when the player arrives.

**5. Tilemaps**
- 5.1 Tilesets. *Task:* cut a sheet into tiles. *Under the hood:* tile numbers, margin and spacing.
- 5.2 Painting a level. *Task:* paint a room with walls. *Under the hood:* bucket fill (flood fill).
- 5.3 Solid tiles. *Task:* walls that stop the player. *Under the hood:* merging tiles into rectangles, and why.
- 5.4 Grid movement. *Task:* move cell to cell in a maze. *Under the hood:* map ↔ world coordinates.
- 5.5 Maps from Tiled. *Task:* import Kenney's sample map.

**6. Scenes**
- 6.1 Scenes inside scenes. *Task:* a coin scene used ten times. *Under the hood:* sources and overrides.
- 6.2 Making things while the game runs. *Task:* a gun that fires bullets.
- 6.3 Groups. *Task:* bullets that only hit enemies.
- 6.4 Signals. *Task:* a health bar wired to the player with no code. *Under the hood:* the observer pattern.
- 6.5 Several scenes. *Task:* title → game → game over, keeping the score.

**7. Game logic**
- 7.1 Chasing the player. *Task:* a ghost that finds you. *Under the hood:* breadth-first search.
- 7.2 Game states. *Task:* start, play, pause and over. *Under the hood:* state machines.
- 7.3 Difficulty over time. *Task:* enemies that come faster. *Under the hood:* curves and timers.

**8. Tetris** (the capstone: the tutorial chain exists, `tasks/tetris.ts`)
- 8.1 to 8.9, one lesson per Tetris task: the board as a 2D array, a piece as data, moving with collision checks,
  falling on a timer and locking, turning, clearing lines, scoring and a HUD, a fair bag of pieces and game over,
  hard drop, levels and the next piece. *Under the hood:* grids as arrays (row × width + column), rotation
  matrices, Fisher–Yates, and speed as 0.5 × 0.85^(level − 1).

**9. Bonus: a game that learns** (Phase 9 is built in Game Studio: Run › Train an agent…)
- One lesson: Q-learning, built on the ML Lab's lab 37. The loop, states from bins, the return, Q and Q*, the
  Bellman optimality equation, the TD error and ε-greedy exploration, in a notebook on a small Catch game. Then the
  task `q-agent`: bin Breakout's numbers into 14 states, train, watch it play, and train on coarser states. ML Lab
  lesson 37.4 links to it. (Rebuilt 2026-10-03; it first taught only the cross-entropy method.)

## Lessons as built (2026-10-01)

**Course:** `src/courses/making-games/`, "Building Games with Game Studio", generated from
`course-sources/making-games.yaml` with `npm run course:create`. Edit the YAML, then regenerate with `--force`.

**Chapter 1, First steps:** four lessons, each built round one existing task:

| Lesson | Id | Task | Under the hood (optional) |
|---|---|---|---|
| 1.1 Scenes, Nodes and Positions | mg1-001 | first-sprite | screen against maths coordinates, y_s = H − y_m |
| 1.2 Run and Stop | mg1-002 | run-and-stop | the frame loop, T = 1/f, and why Run works on a copy |
| 1.3 Your First Script | mg1-003 | first-script | why the sum of v·dt is v·t at any frame rate |
| 1.4 Steering with Input Actions | mg1-004 | input-actions | vector length, normalizing, the zero vector |

- **Each lesson** follows the lesson standard: concrete numbers first, a prediction, a numbered procedure, a
  warning, three examples, three challenges, misconceptions, transfer prompts, debugging, a six-question quiz and
  eight checkpoints.
- **"Under the hood (optional)"** is the lesson's math section, and opens with that heading.
- **The Try it card** (`src/courses/making-games/viz/GameStudioTask.jsx`) sits at the end of the intuition. It
  shows the task's steps with the same pictures as the task panel, and opens Game Studio with the task, carrying
  the lesson's route and checkpoint. Finished, the card says ✓ Done.
- **Tested:**
  - `tasks/tasks.test.ts`: every card names a real task and a lab checkpoint its lesson declares.
  - `e2e/course.acceptance.mjs` (4/4), in `npm run game:acceptance`: the lesson page, its card and pictures,
    opening the task, finishing it, Back to the lesson, and ✓ Done.

**For the user to decide after reviewing:**
- whether Part 1 should start here, with the editor, or with programming basics before Game Studio (the series
  idea above);
- the course's name.

## Order of work

1. **"Try it" in Game Studio:** links, tasks, checks, the task panel, the way back, progress, and tests. About
   1–2 agent sessions.
2. **Lessons 1.1 to 1.4 as a trial,** written to [lesson-writing-standard.md](lesson-writing-standard.md) through
   the YAML course workflow ([course-from-yaml.md](contributing/course-from-yaml.md)). The user reviews them and
   the loop before the rest is written.
3. **Chapters 2–8,** about one session per chapter. The bottleneck is checking that each task's checks are fair:
   they pass for every reasonable way of doing it, not only the solution's.
4. **Chapter 9** after Game Studio's Phase 9.

Phase 8 (export) can go before or after; no lesson before chapter 8 needs it.

## Added 2026-10-01: Tetris, a programming series, pictures, and the art labs

The user asked for four things after the first tutorials.

**1. Build Tetris, step by step, as the course's big project.** By the end the learner has built Tetris and
understands every part, and so knows how a whole game is made. As a chain of tasks (each checked by playing the
learner's game), roughly:
- **The board:** a TileMapLayer as a 10 × 20 grid; the playfield drawn from tiles.
- **A piece:** the seven tetrominoes as data (lists of cells); drawing one; moving it left, right and down
  with the keys.
- **Falling:** a timer that drops the piece one row a step; landing on the floor or on other blocks; locking it
  into the board.
- **Rotation**, with the optional maths: turning cells a quarter turn with (x, y) → (−y, x), a rotation matrix.
  Then wall kicks, so a piece next to a wall can still turn.
- **Clearing lines:** finding full rows, removing them, and moving everything above down.
- **Game rules:** a random bag of all seven pieces (no long droughts), the next-piece preview, scoring and
  levels (faster drops), game over.
- **Polish:** a hard drop, the ghost piece, sound later (when there is audio), and a title and game-over scene.

The optional maths covers grids as arrays (row × width + column), rotation matrices, collision as checking cells,
random bags (shuffling, Fisher–Yates), and how speed grows with level.

**Tetris as built (2026-10-01):** Help › Tutorials › Tetris, nine tasks and 26 steps (`tasks/tetris.ts`), each step
with its picture:

| Task | Steps |
|---|---|
| 1 The board | New script on Board; `this.cells`, 20 rows of 10 zeros; 200 Sprite2Ds made in `ready()`, in `this.sprites[row][col]`; `draw()` sets each sprite's picture from its number |
| 2 A piece | `spawn(type)` makes `this.piece` (type, cells, x, y); `draw()` paints it over the board |
| 3 Moving, and walls | `canPlace(cells, x, y)`; `move(dx, dy)`; ← → with `isJustPressed` (one press, one column) |
| 4 Falling and landing | a timer made from `dt`; `lock()` copies the piece into the board; soft drop with ↓ |
| 5 Turning | `rotated(cells)`, [x, y] → [−y, x]; `rotate()` with wall kicks (the O does not turn); ↑ |
| 6 Clearing lines | `clearLines()` with `filter` and new empty rows (each its own array); called from `lock()` |
| 7 Score | a HUD with Score and Lines labels; 100 / 300 / 500 / 800 points; shown in `draw()` |
| 8 Every piece, and the end | a shuffled bag of seven (Fisher–Yates); a Message label; game over when a new piece cannot fit |
| 9 Hard drop, levels and next | Space; `get level()` and `get interval()` (15% faster a level, points × level); the Next label |

How it differs from the outline above:
- **The board is sprites, not a TileMapLayer.** Each cell is a Sprite2D whose picture is set from the board's
  number every frame. It shows the central idea directly: the game is the numbers, and the screen only shows them.
  It also needs only one colour per piece, not a tileset.
- **Not done yet:** the ghost piece, sound, and title and game-over scenes. They are the obvious exercises to set
  after the chain, or a tenth task.
- **The optional maths** (rotation matrices, Fisher–Yates, the level speed as 0.5 × 0.85^(level − 1)) is named
  in each task's closing line and belongs in the course lessons, which are still to be written.

**How it is built:** each step adds one feature to `scripts/board.js`, in a fixed order. The script after any step
is generated from that order, so a task's start is the previous task's finished script, "Show me" gives this
task's, and the pictures script types each step's script into the real editor. The tests check every step's
script, from the task's start, passes that step and all before it.

**2. A series, "Learn to Program by Making Games".** Programming taught through games, in this app: variables and
expressions (a score), conditions (a key pressed), loops (drawing a grid), functions (a piece's moves), arrays
and objects (the board, a piece), events (signals), state (game states). It suggests the course is that series:
- **Part 1:** programming basics through small games;
- **Part 2:** Game Studio's features (the chapters above);
- **Part 3:** Tetris, then the other projects.

The user later named the course "Building Games with Game Studio" and chose concept lessons plus Tetris over a series of whole games (see the status at the top).

**3. Pictures of what to do, at every step.** Each tutorial step gets a screenshot of the real editor, showing
where to click. They are made by a script that does each task's steps in a browser and photographs the editor at
each one (as the browser tests already do). So the pictures always match the app, and are made again when the app
changes, instead of going stale.

**4. Sprite Forge and Tile Mapper connected to Game Studio** (part of bringing them up to Game Studio's
standard, see game-studio-status.md):
- From Game Studio: **New sprite…** and **Edit in Sprite Forge** for an image, and **New map…** and **Edit in
  Tile Mapper** for a tile layer.
- From the labs: **Send to Game Studio** puts the sprite (with its animation frames, as an AnimatedSprite2D) or
  the map (its tileset and layers, as Tiled import does now) into the open project.
- **Round trip:** edit an image or map in its lab, and the Game Studio project updates.
- **Files:** download and upload still work everywhere (PNG, sprite sheet and atlas JSON, `.tmj`), for using
  the art in other engines or bringing it in from elsewhere.

All three labs run in the same page, so they can hand work over directly, with no files in between.

**As built (2026-10-01):**
- **In Game Studio:**
  - Files › assets/ has **New sprite…**, and a ✎ beside each picture up to 128 × 128 (Sprite Forge's limit)
    opens it in Sprite Forge.
  - The TileMap panel has **New map…**, and **Edit in Tile Mapper** when a tile layer, or the node holding a
    map's layers, is selected.
- **In the labs:** **Send to Game Studio** is in each lab's header.
  - A sprite comes back as one image per frame. The first time, from New sprite…, it is also put in the scene:
    a Sprite2D, or an AnimatedSprite2D with one animation per tag.
  - A map comes back as a Node2D of TileMapLayers. Collision layers become hidden layers whose tile is solid.
- **Round trip:**
  - A picture made in Sprite Forge reopens as the original document.
  - Sending a picture again updates it everywhere it is used (Ctrl+Z undoes it).
  - Sending a map again repaints the same layer nodes by name.
- **Not kept on the way to Tile Mapper:** flipped tiles and layers with two picture tilesets. Game Studio says so
  rather than losing them silently; Tile Mapper has neither.
- **Art that arrives while no project is open** waits, and goes into the next project opened.

## The standard for every game chapter (the user, 2026-10-05)

The user asked that every game be built in full, "no steps skipped", the same for all games. A game chapter meets
this standard when:

1. **It is a build path from empty.** The chapter's first task starts from an empty project (or from a named earlier
   chapter's finished game), and every task starts exactly where the one before ended.
2. **Nothing appears that the learner did not build.** No scene, node, script, action or asset arrives ready-made in a
   task's start. The one exception is something an earlier chapter had the learner build, and then the step says so.
3. **A test enforces it.** Replaying every task's step code in order, from the empty project, gives exactly the
   finished example game. The example's build code *is* that chain of steps, so the two cannot drift apart.
4. **Every line is explained.** Each lesson's notebook ends with a walkthrough of the code its task built, line by
   line, and a short "Questions you might have" section.

The tour lesson that opens a chapter (play the finished game first) is the exception to rule 1: its task opens the
finished game to play and change.

Status, 2026-10-05: Quest Buddies (chapters 11 and 12) is being brought to it first, then Cribbage (chapter 10). New
starters (Kart Circuit onward) are built to it from the start.

- **Chapter 11: rules 1 to 3 done.** Every script version and step lives in `src/labs/game-studio/examples/questBuddiesBuild.ts`;
  the example's code is `QB_FINISHED` (all steps in order) and each task's start is `qbStart(id)`. A new first build
  task, qb-maps (lesson 11.2's first Try it card), builds the maps and the hero from an empty project. The campfire,
  the title screen, the inventory and interact actions, and the dialogue box, which tasks used to hand over, are now
  steps. `tasks/tasks.test.ts` ("one build, from an empty project") checks the chain. Rule 4 (the line-by-line
  walkthroughs and "Questions you might have") is not done yet for any lesson.
- **Chapter 12: rules 1 to 3 done.** `src/labs/game-studio/examples/questAdventureBuild.ts` derives every script from
  chapter 11's final ones (`QB_FINAL`, with `swap`, which fails loudly when chapter 11 changes under it); the chain
  starts at `QB_FINISHED` and the example's code is `QA_FINISHED`. The slime scene, the attack action and sounds, the
  spawner (now qa-combat's fourth step), the buddy scene and its collision layers, the skills panel and the teach keys
  are now steps. The old all-in-one build of the starter is gone. `tasks/tasks.test.ts` checks this chain too.
- **Rule 4 done for both chapters.** Every notebook ends with "The code you wrote, line by line" and "Questions you
  might have" (markdown cells). `src/labs/game-studio/tasks/stepLines.ts` replays the steps and lists every line each
  task wrote (Scene API lines, and in each script the lines that were not there before); `quest.test.js` and
  `adventure.test.js` fail if a lesson's walkthrough does not show one of them. Notebook markdown now draws fenced code
  in a box that scrolls sideways (JSNotebook.jsx), and styles `####` headings.
- **Cribbage (chapter 10): rules 1 to 3 done in code (2026-10-05).** `src/labs/game-studio/examples/cribbageBuild.ts`
  holds every step; the example's code is `CB_FINISHED`, and `tasks.test.ts` checks the chain. Earlier versions of
  table.js and opponent.js are files in `examples/cribbage/stages/`; the art is two tool scripts in
  `examples/cribbage/tools/` (build.js is gone). The table runs from lesson 10.6 with a stand-in playing both seats;
  10.7 gives your seat to clicks, 10.8 the AI's to the rules player. The pegging turns (options, nextTurn) moved from
  the 10.5 task to 10.6. Step pictures regenerated.
- **Cribbage lessons: rule 4 done (2026-10-06).** Each of 10.1–10.12 has a "Try it task" paragraph matching the new
  steps, and ends with "The code you wrote, line by line" and "Questions you might have"; `cribbage.test.js` checks
  every line is shown. stepLines.ts now compares SVG pictures line by line like scripts, and skips comments and saved
  brains. Generators: scratchpad `c10/l*.mjs` → `build10.mjs` (YAML) → `npm run course:create -- course-sources/making-games.yaml --force`
  (it rewrites chapters 1–10 from the YAML; check that only chapter 10 changed).
- **All three game chapters (10, 11, 12) now meet the standard.** Next: Kart Circuit, built to it from the start.

## Added 2026-10-05: chapter 11, Quest Buddies

The first starter project's chapter (plan and progress: [game-studio-starters-plan.md](game-studio-starters-plan.md)).
Eight lessons, `src/courses/making-games/11-quest-buddies/`, mg11-001 to mg11-008: the finished starter to play and
change, then maps and doors, state, saving, menus, a health bar and a bag, dialogue and quests, and sound made from
numbers. Each lesson says its depth (play and tweak, build it, go deep) and decodes its formulas.

Its eight tasks (`tasks/questBuddies.ts`, chain "Quest Buddies") build the game from two empty maps: each task's start is
the one before's start plus its solution. Each also has step-by-step code (`qbStep`), which the tests check (each
step's code ticks that step and every one before) and the step pictures replay. The chapter's notebook outputs are
tested in `src/courses/making-games/quest.test.js`.

## Still open

- ~~The course's name~~: "Building Games with Game Studio" (decided 2026-10-01).
