# Game Studio: starter projects

Status: **planned**, 2026-10-04. Progress is recorded at the end of this file.

## What the user asked for

The user's words: "We should build starter projects, that do 2 things 1. makes sure we have the game logic to
handle things, driving games, multimap games multiplayer games over lan, and 2 teach how to implement them for
examples that can be followed to extend them, including the AI ideas."

The starters are not full games. Each is a small working game that:
- proves Game Studio can build that kind of game;
- a learner could build themselves, following the lessons;
- can be loaded as a template and extended.

The lessons explain how each starter was built. Their names say what they teach, for example "Several maps and
doors" or "Train a co-op buddy with Q-learning", so a learner can find the one they need.

The user is also building a pygame version of Game Studio in Python. They plan to meet each idea here first, then
build it for real there. So every lesson explains the idea itself, not only Game Studio's API for it.

## Rules

1. **A starter is an ordinary example** (ADR 12 in [game-studio-architecture.md](game-studio-architecture.md)).
   - Its Scene API code builds it from starter art, so GUI → code shows how it was made.
   - It is listed in `EXAMPLES` (`src/labs/game-studio/examples/index.ts`) and has its own test.
2. **Nothing hard-coded.** When a starter needs something the engine lacks, add it to the engine as a general
   feature, never as a one-off inside the starter. A general feature has:
   - an entry in the API reference;
   - controls in the editor where that makes sense, logged by GUI → code;
   - its own tests.
3. **Small and extendable.** A starter has one working example of each mechanic, not a full game. Its guide ends
   with ways to extend it.
4. **One chapter per starter**, in the "Building Games with Game Studio" course. Each lesson has:
   - a Try it task with step pictures;
   - a browser check.
5. **The learner chooses how deep to go** (the user, 2026-10-04: "we give the learner as much control or as little
   as they want, teaching as much about machine/nlp/qlearning as they want to know"). Every starter can be used at
   three depths, and each lesson says which depth it is:
   - **Play and tweak:** load the starter, change its settings and numbers in the Inspector, train its agents with
     the defaults.
   - **Build it:** follow the chapter and make the starter from an empty project.
   - **Go deep:** optional lessons on the machine learning, Q-learning and NLP underneath, with the full maths.
     Skipping them never blocks the next lesson.
6. **Not polished.** A starter is the working core of a genre, not a finished game. Polish is left as extensions.
7. **The maths is decoded, every time.** Each formula is written out, then read aloud in plain words. Each
   symbol is pointed at the variable in the code. One update is worked with real numbers.

## The starters

### 1. Quest Buddies: a multi-map RPG with a learning companion

**The game.** You pick a class, walk between two or three maps through doors, talk to a character who gives a
quest, fight a few enemies and pick up loot. A buddy travels with you and gets smarter as you spend skill points
on it.

**Game logic it covers.**
- Maps and doors: arriving at a named spawn point; a camera per map.
- Game state that lasts across maps.
- Saving and loading, with save slots.
- Choosing a class; stats, levels and skill points.
- Inventory and items, including items with randomly generated properties (loot tables and affixes).
- Dialogue and quests, as state machines.
- Simple combat: damage, cooldowns, death and respawn.

**Engine gaps it closes.** Checked in the code on 2026-10-04: none of these exist yet.
- **State that survives `scene.change()`**, like Godot's autoloads.
- **Save and load**, in the browser and the desktop app, surviving export.
- **UI widgets:** Button, Panel, lists, and focus moved by keys or gamepad. Today there is only `Label` on a
  `CanvasLayer`.
- **A dialogue box pattern.**
- **Audio.**

**The AI lessons.**
- **A buddy that learns with Q-learning.** Skill points buy real learning abilities:
  - more senses (more features in its observation);
  - more actions;
  - more practice (training episodes), or a bigger brain (a table, then linear Q);
  - less randomness (a lower ε).
- **Classes as learning problems:** each class is an action set plus a reward. A healer is rewarded for keeping
  you alive, a scout for finding things.
- **Imitation learning.** The buddy records how you play and learns to copy you (behaviour cloning). Then Q-learning
  improves on that.
- **Enemies matched to the player** (dynamic difficulty). A running estimate of the player's skill, like a chess
  rating, decides which enemies and loot are generated.

**Its chapters: "Quest Buddies" (chapter 11 of Building Games with Game Studio, rows 1–8) and its part 2 (chapter 12, rows 9–14).** One feature per lesson, added to the
game as the lesson teaches it, so the learner can build the starter from an empty project or open it finished. Each
lesson has a Try it task with step pictures, and says its depth (play and tweak, build it, go deep).

| # | Lesson | Teaches | Depth |
|---|---|---|---|
| 1 | Quest Buddies: the game you will build | Play the finished starter; how an RPG is put together; the plan | Play |
| 2 | Several maps and doors | `scene.change`, doors as areas, named spawn points, a camera per map | Build |
| 3 | Game state that lasts | `state`: what belongs in it (the party, gold, quests, where you came from) and what does not | Build |
| 4 | Saving and loading | `save` slots, a save point, Continue on the title screen, what to save and why it is a copy | Build |
| 5 | Menus: panels, buttons and focus | Panel, Button, VBoxContainer, `pressed`, `grabFocus` and the arrow keys; the title screen and a pause menu | Build |
| 6 | Health bars and an inventory list | ProgressBar, a list that lays itself out, a HUD that reads `state` | Build |
| 7 | Dialogue and quests | A dialogue box (wrapped, typewriter text); a quest as a state machine | Build |
| 8 | Sound effects from numbers | Waves, pitch in hertz, octaves and the exponential slide, envelopes; `writeSound`, AudioStreamPlayer | Build, go deep |
| 9 | Classes, stats and levelling | Stats as data, an experience curve, skill points | Build, go deep |
| 10 | Items and loot tables | Weighted random choice, generated item properties | Build, go deep |
| 11 | Combat | A damage formula, cooldowns, hit and death | Build |
| 12 | A buddy that learns | The buddy as an agent; skill points buy senses, actions, practice and less randomness | Build, go deep |
| 13 | A buddy that copies you | Imitation learning: record your play, learn from it, then improve with Q-learning | Go deep |
| 14 | Enemies matched to the player | A running skill estimate (an Elo-style rating) choosing enemies and loot | Build, go deep |

### 2. Kart Circuit: a top-down driving game

**The game.** One track, a car you drive, two computer cars, laps, a timer, and a ghost of your best lap.

**Game logic it covers.**
- A car model: throttle and brake, steering that depends on speed, grip and drifting.
- A track made of checkpoints, which counts laps and stops shortcuts.
- Race positions and a lap timer.
- A ghost replay: record your inputs, then play them back.

**Engine gaps it closes.**
- **Raycasts** (`physics.rayCast`). Checked on 2026-10-04: they do not exist. A car needs them to "see" the track
  edges, and most games need them for line of sight.
- **Recording and replaying inputs.** A replay that matches needs the game to be deterministic, so this also
  tests that.
- **Analog gamepad axes,** for steering.

**The AI lessons.**
- **A waypoint follower,** with no learning: the baseline.
- **A driver that learns.** Its observations are distances along a few rays. It learns with linear Q, compared
  against the cross-entropy method (CEM) Game Studio already has.
- **Difficulty two ways:** rubber-banding (cheating) compared with genuinely different trained drivers.

### 3. LAN Arena: co-op over a local network

**The game.** Two to four players fight waves of enemies together. It is played first on one machine, then over a
LAN. Empty player slots are filled by computer teammates.

**Game logic it covers.**
- Local co-op first: two players, each with their own keys or gamepad.
- A lobby: host a game, join one, players arriving and leaving.
- One player's game (the host) decides what happens; the others send their inputs to it.
- Sending snapshots of the game state, and smoothing between them (interpolation).
- Hiding lag.

**Engine gaps it closes.**
- **Gamepads,** with one device per player.
- **A `net` API** (host, join, send, receive) with several transports.

Games run in a sandboxed iframe, and a web page cannot accept incoming connections. So the transports come in this
order:
1. **Loopback:** two players in one page. It is used to teach the protocol and to test it.
2. **Two windows on one machine,** through the editor.
3. **LAN in the desktop app:** Electron hosts a WebSocket server, and other machines join by address. This is the
   real LAN case. The user has a second machine to test it with.
4. **Browser to browser over WebRTC,** with an invite code copied between players. This one is later and
   optional.

**The AI lessons.**
- **Computer players** fill empty slots.
- **Multi-agent Q-learning:**
  - several agents learning together, each on its own (independent learners);
  - a shared team reward, and the problem of deciding which agent earned it (credit assignment);
  - a teammate that learns to support the human player.

### 4. Ruin Diver: a metroidvania

**The game.** A world of connected rooms, larger than the screen, that the camera scrolls through. A double jump
found in one room opens a path in another, so you go back to places you have been. There are save rooms and a
map that fills in as you explore.

**Game logic it covers.**
- A world of rooms: the camera scrolls inside a room and moves between rooms at their edges.
- Abilities that open paths (ability gates), and backtracking.
- Remembering what changed in each room: opened doors, collected items, defeated bosses.
- A map that fills in as you explore.
- Save rooms, and respawning at the last one.
- Platformer movement that feels right: coyote time and jump buffering, plus one-way platforms.

**Engine gaps it closes.**
- **One-way platforms.** Checked on 2026-10-04: they do not exist. Camera follow, smoothing, zoom and limits
  already do.
- **Room transitions** for the camera.
- Per-room world state and saving, shared with Quest Buddies.

**The AI lessons.**
- **Enemy patrols:** a state machine (patrol, chase, return) with no learning, as the baseline.
- **An RL playtester** that explores the world and reports which rooms are hard to reach. Its curiosity bonus is a
  reward for reaching states it has not seen before.
- **An enemy that learns** the player's habits within one room.

### Genres to check

Each genre on this list may need features Game Studio does not have. Check each in the code before planning its
starter; don't assume a feature is missing.

| Genre | What it would test | AI and ML it suits |
|---|---|---|
| Puzzle (Sokoban-style) | Grid moves, undo, level files | Search (breadth-first, A*), and RL on small grids |
| Tower defence | Paths, waves, placing towers, an economy | Choosing waves to match the player, and placement by search |
| Roguelike | Generated dungeons, turns, permadeath | Procedural generation, and an RL playtester |
| Farming and life sim | Clock and calendar, crops, crafting, NPC schedules | NPC routines, and utility AI |
| Stealth | Vision cones (raycasts), noise, alert states | Behaviour trees, and guards that learn your routes |
| Rhythm | Audio timing, beat maps | Generating beat maps from audio |
| Real-time strategy (RTS) | Selecting units, pathfinding for many units, fog of war | Flocking, influence maps, and multi-agent RL |
| Turn-based tactics | Grid movement, turn order, cover | Monte Carlo tree search |
| Fighting | Frame data, hitboxes, input buffers | Learned opponents, and rollback networking |
| Dialogue and narrative | Branching dialogue, variables, choices | NLP: intents, and retrieval over the story |

### Later candidates

These are not planned yet:
- **Turn-based tactics:** grid movement, and Monte Carlo tree search.
- **A procedural dungeon:** generated levels, tested by an RL bot.
- **A fighting game:** frame data, and rollback networking.

## Order of work

1. Quest Buddies first. It is the user's own idea, and it closes the most gaps. Its features (game state, saving,
   UI widgets, audio) are used by the other two starters.
2. Kart Circuit second, which adds raycasts, replays and analog input.
3. Ruin Diver third. It reuses the world state and saving from Quest Buddies, and adds one-way platforms and room
   transitions.
4. LAN Arena last. It is the riskiest, and it builds on gamepads and on the determinism from replays.
5. Then the genres from "Genres to check", one at a time, in the order the user picks.
6. 2.5D, last (below).

Each starter goes through the same five steps:
1. The engine features, with tests.
2. The starter example, with its test.
3. Tasks, with step pictures.
4. The lessons.
5. Browser checks. For LAN Arena, this includes play between two real machines.

## The end of the series: 2.5D, then perhaps 3D

**2.5D comes last in this series** (the user, 2026-10-04). It is 2D drawn to look like depth, so it fits the current
engine:
- isometric maps;
- sprites sorted by their y position, so lower ones are drawn in front;
- parallax layers;
- sprites scaled with distance, for a pseudo-3D road.

Phaser can draw isometric tilemaps. Whether Game Studio's `TileMapLayer` can is not checked yet.

**Perhaps a 3D environment later.** After MeshLab and the modelling course are finished, the user may join Game
Studio and the mesh engine (three.js, `src/engines/mesh`) into a 3D environment. That would be a new phase with its
own architecture decision: 3D nodes, a 3D physics library, and a 3D editor view. It is not a starter.

## Size

About 3–5 agent sessions each for Quest Buddies, Kart Circuit and Ruin Diver, and 5–7 for LAN Arena. Checking in a real
browser is the bottleneck, and so is two-machine testing for the LAN.

## Open decisions

1. **Where the chapters go:** new chapters at the end of "Building Games with Game Studio" (proposed), or a
   separate course.
2. ~~Timing~~: decided 2026-10-04. This series comes first; the user's interest is game development with
   Q-learning for now. The modelling course (lessons 11.3 to 12.5) resumes after it, then the question of 3D.

## Progress

| Step | State |
|---|---|
| Plan | Written 2026-10-04 |
| Quest Buddies: `state` and `save` | Done 2026-10-04. `engine/saves.ts`: `state` (the game's data, kept across `scene.change()`, empty at each start) and `save` (write, read, load, has, remove, slots; JSON copies in named slots). The editor keeps each project's slots in its page storage under the project id and sends them with each run (the game frame is sandboxed); Output says "Saved to slot …"; Run › Clear saved games. An exported game keeps its own (`game-studio-saves:<name>`). Training saves to memory only. API reference entries with examples. Tests: `engine/saves.test.ts` (8), browser test `e2e/saves.acceptance.mjs` (10 checks: across runs, cleared, and an exported game across visits) |
| Quest Buddies: UI widgets | Done 2026-10-04. New node types Panel, Button, ProgressBar, VBoxContainer and HBoxContainer (base BoxContainer, not addable), and Label.wrapWidth. One description of their look and the containers' layout in `core/widgets.ts`, used by the engine's draw list and the editor's viewport, so both show the same. Buttons: a click is down and up on the same button; Enter or Space presses the focused one; the arrow keys move the focus to the nearest enabled button that way (straight ahead counts double the sideways distance); `grabFocus`, `releaseFocus`, `hasFocus`; the `pressed` callback and signal (in the Inspector's signal list). Containers place visible 2D children every frame, innermost first; a Label's size is estimated (0.55 × fontSize per letter). Renderer: rect borders, centred text, wrapped text. Tests: `engine/widgets.test.ts` (13), the no-fake-controls test (a scenario for `separation`; base types checked through scenarios), browser test `e2e/widgets.acceptance.mjs` (6 checks, real mouse and keys; screenshots show editor and game match) |
| Quest Buddies: typewriter text | Done 2026-10-04. `Label.visibleCharacters` (−1: all) and `totalCharacters`; the renderer wraps the whole text first, then shows the first letters on those lines, so words do not jump lines as they appear (checked by eye in the widgets browser test's screenshot) |
| Quest Buddies: sound | Done 2026-10-04. Made sounds, like SVG images: `project.writeSound(path, { wave, from, to, length, attack?, volume?, seed? })` keeps a recipe in the project; `core/sound.ts` makes the samples (an exponential pitch slide, five waves, attack then linear fade, seeded noise) and a 16-bit mono .wav. Asset kind `sound`, prop type `sound`. Node **AudioStreamPlayer** (stream, volume, pitchScale, autoplay, loop; play, stop, playing; finished callback and signal): the engine keeps time (playing until length / pitchScale) and tells an `AudioOut` what to play, so training and tests are silent; the runtime plays through Phaser and warns in Output if a sound cannot load or play. Editor: Files › New sound…, sounds listed with ▶, the recipe edited as JSON beside its waveform with ▶ Hear it (unsaved edits too), the Inspector's sound picker with ▶. Exports carry the .wav made from the recipe, only if used. Tests: `core/sound.test.ts` (8), `engine/audio.test.ts` (9), no-fake-controls scenarios for each AudioStreamPlayer property, browser test `e2e/audio.acceptance.mjs` (8 checks). Imported sound files (.ogg, .mp3) are not supported yet |
| Quest Buddies: the starter, part 1 | Done 2026-10-05. `examples/questBuddies.ts`: a title screen (New game, Continue only with a save, How to play), the town and the forest joined by doors (each door a small script extending `door.js` with its target and spawn point), the ranger's quest as a state machine (not started → started → found → done), the amulet (only there while the quest wants it), the campfire that heals and saves, a HUD scene instanced in both maps (health bar, gold, messages, a typewriter dialogue box, the pause menu, the bag list), six made sounds, and a player scene instanced in both maps. A map run on its own starts a new game. Tests: `examples/questBuddies.test.ts` plays it headless from title to reward across two runs sharing a save; the example tests now allow made sounds; browser test `e2e/questbuddies.acceptance.mjs` plays it with the keyboard (steering by the live position, since a headless browser's frame rate makes held keys unreliable) and its screenshots were checked |
| Quest Buddies: chapter 11 lessons 1–8 and their tasks | Done 2026-10-05. Lessons mg11-001 to mg11-008 (schema, JS-cell and LaTeX validators pass; 11.8 checked in the browser). Notebook cells were run first and their outputs are quoted in the prose and tested (`quest.test.js`, which also checks 11.8 against `core/sound.ts`). Tasks qb-tour, qb-doors, qb-state, qb-save, qb-menus, qb-bars, qb-talk, qb-sounds, each starting where the last ended; their step-by-step code is tested; 24 step pictures made and checked (`npm run game:shots qb-`). The course browser test opens all 64 lessons with their Try it cards. Note for LaTeX: the checker splits at commas inside \\left( … \\right), so write those with plain brackets |
| Quest Buddies, part 2: classes and stats, items and loot, combat, the learning buddy, the buddy that copies you, enemies matched to the player | Next. These are rows 9–14 of the lesson table above, now **chapter 12** (lesson 11.1 tells learners so) |
