# Game Studio: status

What is done and what is next. The rules are in
[`docs/game-studio-architecture.md`](game-studio-architecture.md); the product specification is
[`docs/game-plan.md`](game-plan.md). Read this file first when resuming.

## Now

**Phase 0 is done (2026-09-30):**
- The architecture decisions are recorded.
- The Kenney licence (CC0) is verified.
- The user approved:
  - replacing the prototype;
  - bundling Kenney art;
  - scripting in Phase 1;
  - GUI → code as a first-class feature.

**Phase 1 is done (2026-09-30).** `npm run game:acceptance`
passes 15/15 in a real browser, with real clicks and keys and an empty browser profile. It does, in order:
- create a project, a scene, a node and a sprite;
- import a PNG and assign it;
- attach a script from the template and paste in an edited one;
- run it in the sandboxed iframe, where `ready()` logs to Output and ArrowRight moves the player (x 200 → 315);
- stop, and the editor still says 200;
- edit (320), undo (200), redo (320);
- save, close, reopen, where position, image, thumbnail and script are all restored;
- run again, where the saved project logs "Player ready at 320";
- with no page errors.

**Unit tests:** `npx vitest run src/labs/game-studio` passes 24 tests. They cover:
- the model: commands, undo and redo, GUI → code replay to the same project (ids included), and
  saving and loading with a problem report;
- the engine: lifecycle order, fixed-step physics, error isolation, the script class check, runtime nodes,
  input, transforms, and "no fake controls";
- the script loader: imports, cycles, rewriting, stack locations and syntax errors.

### What Phase 1 contains

| Part | Where | What it does |
|---|---|---|
| Model | `core/` | Project, scenes, nodes, scripts, assets and input map as plain data. Node registry (`registry.ts`). Scene API (`api.ts`). Commands with undo, redo and the code log (`doc.ts`). Versioned saving with migrations and a problem report (`serialize.ts`). Shared 2D transforms (`math2d.ts`, `sceneView.ts`) |
| Engine | `engine/` | Node, Node2D, Sprite2D, CharacterBody2D (`moveAndSlide`, no collision yet). Lifecycle `ready`/`physicsUpdate` (fixed 1/60)/`update`/`destroyed`. Input actions. `addChild`/`queueFree`. Errors isolated per node. A draw list for the renderer. `math`, `Vec2` |
| Runtime | `runtime/` | The iframe entry, the protocol, scripts as ES modules with imports between them and errors mapped to `file:line:column`, the Phaser adapter. Built into one file by `npm run game:runtime` (1.6 MB), which runs before dev and build |
| Editor | `editor/`, `GameStudio.tsx` | See below |

The editor's parts:
- menus, toolbar and shortcuts (Ctrl/Cmd+S, Z, Shift+Z, D, Delete, F, F5, F6, F8);
- the scene tree (select, rename, drag to reparent, add, duplicate, delete);
- files (scenes with the main-scene star, scripts, image import, drag an image into the viewport);
- the viewport (the model drawn in the engine's order, pan, zoom, grid, snapping, drag to move as one undo
  step);
- the Inspector (controls generated from the registry, live values while running, the Code section);
- the Monaco script editor (engine types for completion, unsaved marker, jump to an error's line);
- Output with click-to-source, and GUI → code;
- the project list and Project settings (size, background, main scene, input map with key capture);
- IndexedDB with a recovery copy.

### Problems the tests found and fixed

- **The project list could not close after creating a project.** When no project was open, it was shown
  without a Close handler, and the same missing handler was used to close it after Create.
- **Every Inspector edit was recorded twice** (Enter committed, then blur committed again), so the first
  Ctrl+Z seemed to do nothing. Fields now commit once. Commands that change nothing are no longer steps.
- **Syntax errors came back with no line number.** Scripts are now parsed first (architecture doc,
  change 4).

### Notes

- **The old prototype is gone from `src/labs/game-studio`.** Its example walkthroughs are in git history
  (`src/labs/game-studio/examples.js` before 2026-09-30), and their teaching text can be reused when the
  example games are rebuilt.
- **Its saved projects** are left in IndexedDB's `projects` store, as ADR 1 says.
- **A development-only handle:** `window.__gameStudio = { store }`, for browser tests.

## Done: the Kenney starter set and Phase 2 (2026-09-30)

**Starter art** (`src/labs/game-studio/starter/`, 4.0 MB, 871 images) holds five Kenney CC0 packs:
- Pixel Platformer;
- Tiny Dungeon;
- Top-down Shooter;
- Puzzle Pack 2 (paddles, balls, bricks);
- UI Pack.

Each pack keeps its own `License.txt`, and `CREDITS.md` lists them. The sound packs wait for the audio node.

In the editor, a **Starter art** tab sits beside Files. Pick a pack and folder, then drag a thumbnail into
the viewport: the image is added to the project (once) and a Sprite2D appears where you dropped it. Or
pick several and use "Add to project".

**Phase 2:**

| Feature | What it does |
|---|---|
| **Camera2D** | Under a node, it follows it. `current`, `zoom`, and `smoothing` (the view closes 1 − e^(−k·dt) of the gap each frame). The editor draws each camera's frame |
| **Label** | Text, with `text`, `fontSize` and `color`. Its origin is the top-left corner |
| **CanvasLayer** | A screen layer, for the HUD. Its children are placed on the screen, and a second Phaser camera draws them, so they neither move nor zoom with the world |
| **Move / Rotate / Scale tools** | W, E and R, from the toolbar too. With Snap, rotation goes in 15° steps and scale in 0.1 steps. Rotate and scale work on the selection wherever you press |
| **Reparenting keeps world placement** | Dragging a node onto another in the tree keeps it where it is on screen (the local transform is recalculated), as in Godot's editor |
| **Pixel art setting** | On by default. Hard-edged scaling in the game and the viewport, so the Kenney pixel packs stay crisp when zoomed |

**Other changes:**
- The API types in the script editor gain the new classes.
- A sibling name that clashes counts on from its number (`Tile0009` → `Tile0010`), as Godot does.

**Tested:**
- `npx vitest run src/labs/game-studio` passes 28 tests. New ones cover no camera, a camera following
  exactly, the smoothing formula, the HUD on the screen, reparenting in place, and name numbering. The
  "no fake controls" check covers every property of the new types, and now also compares the camera view.
- `npm run game:acceptance` runs both browser tests: Phase 1 passes 15/15 and Phase 2 passes 9/9.
- The Phase 2 test builds a pixel-platformer scene from the starter art by dragging, reparents the character
  under the player, adds a zoomed camera and a HUD, attaches the movement script, and rotates (90°) and
  scales (2×) a tile, undoing both. It then runs: holding → scrolls the ground while the HUD's pixels stay
  identical.

**Bugs found and fixed:**
- **The GUI → code log was not exact.** It rounded numbers to 4 decimal places, so π/2 was written as
  1.5708 and replay gave a slightly different project. Numbers are now written in their shortest exact form.
- **Pressing next to a node with Rotate or Scale cleared the selection.** It now acts on the selection.

## Done: the first example, Potion Hunt (2026-09-30)

**What it is:** a top-down dungeon from Kenney's Tiny Dungeon art. You walk the hero round, collect eight
potions and keep away from a bat. It has a following camera limited to the level, a HUD with a count, and
a message at the end.

**How it is built:**
- **Only the real Scene API:** `examples/potionHunt.ts` is the same kind of code the GUI → code panel
  writes. A loop lays the 240 floor and wall tiles.
- **Its scripts** (`player.js`, `bat.js`) use only the documented Game API.
- **Opening it** from the project list makes a new project: the images come from the starter art, and the
  code runs as one undoable command (`Doc.runCode`). GUI → code then shows the whole build.
- **A guide beside the viewport** says what to look at and try.
- **The walls** are a StaticBody2D with four rectangle shapes; the hero is a CharacterBody2D, and the
  potions and the bat are Area2Ds (rebuilt on Phase 4 physics, below).

**Added to the engine and editor for it** (each works for any project):
- **Camera limits** (`limitTopLeft`, `limitBottomRight`, Godot's style, with defaults so large they do
  nothing). The editor draws them.
- **Running a block of Scene API code** as one command.
- **Collapsible branches in the scene tree,** with branches over 20 children closed at first.
- **Framing:** a project or scene opens framed to its content, and there's a Frame all menu item.

**Tested:**
- `examples/examples.test.ts` plays the example on the real engine, with its scripts loaded as ES modules
  and no special cases. It checks:
  - every example builds soundly and its GUI → code log replays exactly;
  - the HUD starts at 0 / 8;
  - standing on each potion counts up, and at 8 the message shows;
  - the bat moves, and touching it sends the hero back to the start;
  - the hero stops at the wall;
  - the camera stays within the dungeon.
- `e2e/examples.acceptance.mjs` opens each example from the project list in a browser, runs it, plays it
  with the arrow keys, and finds no script errors.
- All of this is in `npm run game:acceptance`.

## Done: Phase 4, physics (2026-09-30)

The engine's own collision, in `engine/physics.ts` and `engine/nodes.ts`, not Phaser's (architecture doc,
change 9). Shapes are axis-aligned: a rectangle does not turn with its body yet.

| Part | What it does |
|---|---|
| **CollisionShape2D** | `shape` (rectangle or circle) and `size` (a circle uses `size.x` as its diameter). The editor draws body shapes teal and area shapes green |
| **StaticBody2D** | Never moves; others stop against it. `collisionLayer` |
| **CharacterBody2D** | Moved by its script: `velocity`, then `moveAndSlide()`, which stops at solid bodies and keeps the part of the velocity along the surface. Then `isOnFloor()`, `isOnWall()`, `isOnCeiling()`, `getSlideCollisions()`. It moves in steps of at most 4 pixels, so it cannot pass through a thin wall |
| **RigidBody2D** | Moves by itself: gravity × `gravityScale`, and `bounce` (1 keeps all its speed, 0 stops dead) off solid bodies. `onCollision(body, normal)` |
| **Area2D** | Solid to nothing; `bodyEntered(body)` and `bodyExited(body)` when bodies on its mask come in and go out, and `getOverlappingBodies()` |
| **Layers and masks** | 16 layers. A body stops at another when its mask includes a layer the other is on. The Inspector shows 16 toggles |
| **Gravity** | A project setting (default 980 pixels per second²), and `physics.gravity` in scripts |

**Order in each physics step:** every `physicsUpdate`, then rigid bodies move, then areas report who came
in and went out.

**Input in `physicsUpdate` (change 10):** "just pressed" there means since the last physics step, not
since the last frame. A screen faster than 60 Hz draws some frames with no physics step, and a jump
pressed in one of those was lost before.

**Tested:** `engine/physics.test.ts` (stopping at a wall at exactly 84, sliding, landing, no tunnelling,
bounce 1, 0.5 and 0, gravity, areas), the "no fake controls" test in `engine/engine.test.ts` (every
physics property must change what happens in a scenario), and the input test above.

## Done: the second example, Coin Run (2026-09-30)

**What it is:** a side-on platformer from Kenney's Pixel Platformer art. Run and jump along a level 60 tiles
long, collect ten coins, reach the flag; fall down a gap and you go back to the start.

**What it shows**, all with the real Scene API and Game API (`examples/platformer.ts`):
- gravity as a project setting, added to `velocity.y` by the player's script;
- jumping only when `isOnFloor()`, and a shorter jump if you let go early;
- one StaticBody2D for all the ground and platforms: a `stretch()` function in the build code lays each
  stretch's tiles and one rectangle shape covering them;
- invisible walls (shapes with no picture) at both ends;
- coins as Area2Ds sharing one script, bobbing on a sine wave; a flag Area2D that ends the level;
- a two-picture walk (the script swaps `texture`);
- a backdrop where a plain picture is stretched with `scale`;
- a camera at zoom 3 that scrolls the level and stops at its edges, and a HUD.

**Tested** in `examples/examples.test.ts`, headlessly on the real engine:
- the player lands at exactly 222 (ground top 234 − half its shape);
- a jump rises exactly what the step-by-step sum of gravity gives (about 69 pixels);
- holding jump does not jump again in mid-air;
- running and jumping lands on the first platform (168);
- falling down a gap sends the player back to the start;
- every coin counts, the flag shows the message and stops the player;
- the invisible edges stop the player;
- the camera's view never leaves the level.

The browser test opens it, runs it and plays it with the arrow keys and Space.

**Totals then:** `npx vitest run src/labs/game-studio` passed 54 tests in 5 files; `npm run game:acceptance`
passed 15/15, 9/9 and 6/6. After the API reference and Breakout below: 71 tests in 6 files, and 15/15, 9/9, 8/8 and 10/10.

**Browser test fixes found on the way:** the site's welcome tour popup could appear part-way through a test
and cover the button it clicked; the harness now marks the tour as seen before the page loads. When a
browser test fails, the harness saves a screenshot to the system temp folder and prints its path.
Phase 1's key-move step holds the key 1.2 s, because headless Chromium's frames are uneven.

## Done: the API reference, and the script editor's help (2026-09-30)

**What it is:** Help › API reference (F1), docked beside the viewport. It covers every class, property,
method and global a script can use. Each entry gives:
- what it does, and Godot's name for it;
- a short example script, with a Copy button;
- the Inspector properties it has, marked as such;
- links to the classes it extends.

A search finds names, Godot names, descriptions and examples (`move_and_slide` finds `moveAndSlide`). The
contents page explains how a script works and how Godot's names map. It also documents the Scene API, the
language GUI → code writes. The Inspector links each node type to its entry, and the script editor has an
API reference link.

**One source:** `core/apiReference.ts` holds the reference. Inspector properties come from the node registry,
with its help text, so the Inspector and the reference cannot disagree. The script editor's completion and
hover types are generated from it (architecture doc, change 11).

**Tested:** `core/apiReference.test.ts` checks it against the real engine, both ways:
- every entry and member exists;
- nothing a script can reach is missing (a short list of engine internals is named in the test);
- every script global is covered;
- each class extends what the engine's class extends;
- the Scene API entries match the real project, scene and node handles;
- the generated types compile;
- every example in the reference, and every example game's scripts, type-check against them;
- a misspelt method is caught.

`e2e/reference.acceptance.mjs` checks it in a browser:
- F1, an entry, a search by Godot name, and the Inspector's links;
- hover in the script editor shows the reference's text;
- an example script has nothing underlined, and `this.queueFre()` is underlined with "Did you mean
  'queueFree'?".

**Problems it found and fixed:**
- **Hover and completion were broken for every node method from Node.** The script editor loaded the
  browser's own types, whose `Node` clashed with the engine's. So `this.queueFree()`, `this.path` and
  `this.children` had no help. The editor now loads JavaScript's types without the browser's, and `console`
  is declared as part of the API.
- **The script editor never underlined mistakes.** Monaco checks only syntax in JavaScript unless told
  otherwise. It now checks names and types too, with the noisy "could be typed" hints off.
- **The example guide covered the script editor.** It now shows only over the scene view.
- **Scripts could not refer to PhysicsBody2D,** for example `body instanceof PhysicsBody2D`. It is now a
  script global.

**This finishes most of Phase 3.** Hover documentation is in, and mistakes are underlined before Run. Still
to do: a browser test for a script error at run time with click-to-source.

## Done: the third example, Breakout (2026-09-30)

**What it is:** from Kenney's Puzzle Pack 2. Bat the ball into a wall of 48 bricks with the paddle, and clear
them with three balls. Where the ball lands on the paddle aims it.

**What it shows** (`examples/breakout.ts`):
- a RigidBody2D that moves by itself, with `gravityScale` 0 and `bounce` 1;
- `onCollision(body, normal)`, used both to break bricks and to steer the ball off the paddle;
- collision layers: the ball is on layer 2 and collides with layer 1; the paddle's mask leaves out layer 2,
  so the ball never blocks it;
- a game with no camera, where the world is the screen;
- high-resolution art brought down to size with `scale`.

**Tested** headlessly:
- the HUD at the start;
- the ball follows the paddle until Space;
- the launch angle, and exactly 360 px/s kept through 300 frames of bouncing;
- the first brick breaks (47 left, score 10);
- landing half-way to the paddle's end sends it 30° right;
- three misses end the game, and Space then does nothing;
- the paddle stops at the wall at x = 52;
- the ball never blocks the paddle;
- all 48 bricks give "You cleared the wall!".

Its scripts also type-check against the API reference, and the browser test opens it and plays it.

**Fixed on the way:** the starter art's Puzzle Pack had no balls, although the credits said it did. The
pack keeps them in colour subfolders, which the first import missed. All 40 (black, blue, grey, yellow) are
in `starter/puzzle-pack/balls/` now, from the same Kenney download (its licence file is unchanged).

**Phase 4 is now proven** by all three examples: Potion Hunt, Coin Run and Breakout.

## Done: Phase 5, animation (2026-09-30)

Two nodes, as in Godot, each with its editor. Both are in the API reference.

**AnimatedSprite2D:** named animations made of pictures, such as idle, walk and jump.
- Each animation has a speed in frames per second, and loops or not.
- Properties: `animation`, `playing`, `speedScale`, `frame`, `flipX`, `flipY`, `opacity`.
- Scripts call `play(name)`, `pause()`, `stop()` and `isPlaying()`, and can write `animationFinished(name)`.
- The Inspector edits the animations: add, rename, delete, fps, loop, and add or remove pictures. Each
  animation has a small preview playing at its own speed. `animation` is chosen from the names.
- Renaming the animation that is showing renames it in `animation` too, as one undo step (`Doc.setProps`,
  new: several properties of one node as one command).

**AnimationPlayer:** named animations of keyframes.
- Each animation has a length, loops or not, and has tracks. A track is one property of one node: a path from
  the player's parent, as in Godot, with keys.
- Between keys, numbers and vectors move in a straight line, colours blend, and anything else (true/false,
  text, a picture, layers) switches at each key.
- Properties: `animations`, `autoplay`, `speedScale`.
- Scripts call `play(name)`, `pause()`, `stop()`, `seek(time)` and `isPlaying()`, read `currentAnimation`
  and `currentTime`, and can write `animationFinished(name)`.
- A track to a missing node or property is reported in Output, and in the problem report with the key
  values checked against the property.

**The Animation panel** (a bottom-panel tab, opened by selecting an AnimationPlayer):
- choose, create, rename and delete animations; set the length, loop and autoplay;
- a ruler to click or drag the playhead along;
- tracks with keyframe diamonds: click one to edit its time and value, drag it to move it, delete it;
- ▶ previews at the player's speed.

While it shows an animation:
- the viewport and the Inspector show the scene as it is at the playhead;
- ◆ beside every Inspector property adds a key at the playhead;
- editing a property that already has a track, by typing or by dragging in the viewport, sets its key at the
  playhead instead of the node's own value.

So what you see is what you edit (architecture doc, change 13).

**The timeline shows what the game does:** the editor's preview (`applyClip`) and the engine use the same
sampling function (`core/animation.ts`). A test compares them at seven times, including exactly on a key and
past the end, for a position, an angle, a colour and a true/false.

**In the examples:** Coin Run's player is an AnimatedSprite2D (idle, walk, jump), so the walk no longer needs a
script swapping pictures. Its flag waves, and reaching the flag plays an AnimationPlayer that grows the
message from 8 to 40 pixels.

**Problems found and fixed:**
- **List values were broken in two places.** Reading a list property copied it into a plain object
  (`propValue`), and the engine turned any object value into a vector (`applyProps`). Both now copy lists
  properly.
- **A key could be reached a frame late.** Thirty steps of 1/60 add up to 0.49999999999999994, not 0.5, so a
  key at 0.5 s was missed until the next frame. Key times now allow for rounding (tested).

**Tested:**
- `npx vitest run src/labs/game-studio`: 103 tests in 8 files, covering:
  - frame timing, speed, looping, play, pause, stop and finishing, for both nodes;
  - validation and the problem report;
  - the sampling maths;
  - preview and engine agreeing;
  - "no fake controls" for every new property;
  - Coin Run's animations.
- `e2e/phase5.acceptance.mjs` (10/10), in a browser:
  - builds a sprite animation in the Inspector, and undoes a rename in one step;
  - adds an AnimationPlayer, and keys a position at 0 s with ◆;
  - scrubs to 2 s and types a new x, which becomes a key while the node keeps its own value;
  - reads x = 150 at 1 s;
  - turns on autoplay and runs, and reads both the frame and the position changing in the running game.
- `npm run game:acceptance`: 15/15, 9/9, 8/8, 10/10 and 10/10.

## Done: Phase 6, tilemaps (2026-09-30)

The milestone was "the user can build a tile-based level". The Phase 6 browser test does exactly that, in the
editor.

**Tilesets** are project files, like scripts (`tilesets/….tileset`). Each one is:
- an image cut into tiles of a given size, with margin and spacing;
- numbered across, then down;
- with a list of solid tiles: the collision metadata, shared by every layer that uses the tileset.

The project format is now 2. Older projects are migrated on load: the first real use of the migration path,
and it is tested. Scene API: `project.createTileset(path, {...})`, and fields set with
`project.tileset(path).solid = [...]`.

**TileMapLayer** is a node, as in Godot 4.3.
- **Layers** are separate TileMapLayer nodes: a floor, walls in front, coins on top.
- **Properties:** `tileset`, `cells` (stored compactly as `[x, y, tile, …]` in a fixed order), and
  `collisionLayer`.
- **Scripts** have `getCell`, `setCell`, `eraseCell`, `getUsedCells`, `localToMap`, `mapToLocal`,
  `isCellSolid` and `tileSize`.
- **The Scene API** adds `paint([[x, y, tile], …])`, `fill(x, y, w, h, tile)`, `setCell` and
  `fromText(rows, legend)`, which reads a map written as text.
- **The game** draws it with Phaser's real Tilemap and TilemapLayer, rebuilt only when its cells change.

**Collision:** solid tiles are merged into as few rectangles as a greedy pass finds (`solidRects`). A body
sliding along a floor of many tiles therefore meets one flat edge and cannot catch on the seams between tiles.
- Bodies stop at them, and `getSlideCollisions` and `onCollision` name the layer.
- Areas notice them too, as Godot's do.
- Erasing a tile opens the way at once.

**The TileMap panel** is a bottom-panel tab, opened by selecting a TileMapLayer:
- the layer's tileset, and a form to make a tileset from any project image;
- the tools: Paint, Erase, Rectangle, Bucket fill and Pick (Alt-click picks with any tool);
- the palette: the tileset enlarged, where a click chooses the tile;
- "Solid tiles" mode, where clicking palette tiles marks them solid.

In the viewport, while the panel is open:
- the selected layer shows its cell grid and the cell under the pointer;
- a drag paints every cell it crosses (Bresenham's line), previewed live;
- each stroke is one command, logged as `paint([...])`;
- solid tiles are drawn as collision outlines, like body shapes.

Tilesets are listed in Files.

**The fourth example, Maze Chase** (Tiny Dungeon art). Eat every coin before two ghosts catch you. It has:
- three tile layers, with the map written as text and read with `fromText`;
- movement from cell centre to cell centre that asks the map where it can go;
- coins that are tiles, so eating one is `eraseCell`;
- ghosts that find the player with a breadth-first search, in `scripts/grid.js`, a module both ghosts import.

Tested headlessly:
- every cell is reachable;
- walking a row eats exactly its five coins and stops at the centre of the last open cell;
- a ghost's route is the shortest one;
- a ghost catches a standing player, which costs a life and sends everyone home;
- the last coin wins;
- erasing a wall opens a passage the player uses.

**Potion Hunt now uses tiles.** Its 240 floor and wall sprites, and the StaticBody2D with four shapes, are two
TileMapLayers. Its wall tests pass unchanged, which shows the tile collision has the same geometry.

**Problems found and fixed:**
- **The script editor could not resolve imports between scripts.** Monaco only knew the script that was open,
  so `import … from './grid.js'` would have been underlined as missing. Every project script is now a Monaco
  model, kept in step with its saved or unsaved text.
- **`node.children` and `node.parent` were typed as plain Node,** so `child.restart()` (a method from the
  child's own script) was underlined. They are typed like `get()` now.
- **Two infinite loops** in the first draft of Maze Chase's scripts: a "next cell" equal to the current cell.
  The headless tests hung, and showed it before it reached the browser.
- **The example tests imported every image as 16 × 16.** That was harmless until a tileset's tile count
  depended on its image's size; they now read each PNG's real size.
- **The bottom panel was a fixed 190 px,** too short for a tile palette. It now resizes by dragging its top
  edge, and remembers its height in this browser.

**Not done yet:** importing maps from Tiled (`.tmj` files). The spec's §40 list does not need it, but the
phase table names it.

**Tested:**
- `npx vitest run src/labs/game-studio`: 129 tests in 10 files. New: tile maths, tilesets and layers in the
  model (including the migration), the engine's tiles (the API; landing; a 40-tile slide checked every frame
  for snags; landing on a seam; walls; erasing; rigid bounces; areas), "no fake controls" for the three new
  properties, and Maze Chase.
- `e2e/phase6.acceptance.mjs` (11/11).
- `npm run game:acceptance`: 15/15, 9/9, 10/10, 10/10, 10/10 and 11/11.

## Done: Phase 3's error test, and Tiled import (2026-10-01)

**Phase 3 is complete.** `e2e/phase3.acceptance.mjs` (6/6), through the editor:
- A script that throws on its 30th frame is reported once in Output, with its file, line and node:
  `scripts/broken.js:6 this.notThere is not a function (node Broken)`.
- Another script keeps logging, because the error stopped only its own node.
- Clicking the error opens the script at line 6.
- Typing a syntax error and pressing Run refuses to start ("Not running: 1 script has a syntax error"),
  pointing at `scripts/broken.js:3:20`.
- Clicking that error puts the cursor at line 3, column 20.

**Tiled import** finishes the Phase 6 row. Tiled (mapeditor.org) is the free map editor most 2D art is made
for, and Kenney's packs include Tiled maps.
- **Formats:** maps in Tiled's XML (`.tmx`) or JSON (`.tmj`), with tilesets inside the map or in their own
  files (`.tsx`, `.tsj`).
- **Layer data:** CSV, arrays or uncompressed base64; finite maps and infinite maps (chunks); group layers;
  layer offsets; hidden layers.
- **Solid tiles:** taken from a tile's collision shapes, or a `solid` / `collides` property.
- **Flipped and turned tiles:** Tiled's three flip flags are kept in the cell. The editor and Phaser draw them
  the same way, using the mapping Phaser's own Tiled loader uses. Kenney's sample map depends on this for its
  walls.
- **An import is Scene API code run as one command**, so it is one undo step and GUI → code shows it: a tileset
  for each Tiled tileset, a TileMapLayer for each tile layer (one per tileset when a layer uses several),
  painted with `paint([...])`.
- **Images** are matched by the end of their path: `../Tilemap/tilemap.png` finds
  `assets/tiny-dungeon/tilemap/tilemap.png`.
- **What it cannot take, it says how to fix in Tiled:** compressed layers ("set Tile Layer Format to CSV"),
  a tileset file not chosen with the map, an image not in the project, or an isometric map. Object and image
  layers are left out, and named in the message.

**In the editor:**
- Files › Import… also takes `.tmx` and `.tmj`, with their `.tsx` and `.tsj` chosen alongside.
- Starter art › Tiny Dungeon has "Tiled map: sample-map.tmx › Import". It is Kenney's own sample, now in
  `starter/tiny-dungeon/tiled/`; it adds the sheet it needs and imports the map.

**Tested:**
- `core/xml.ts`: a small XML reader, so the model still runs in Node.
- `core/tiled.test.ts` (8 tests), on Kenney's real files:
  - 32 × 20 cells and three layers;
  - gid 51 with its flags becomes tile 50 with the same flags;
  - the import builds a project with no problems;
- and on JSON maps covering every other form and every error message.
- The Phase 6 browser test (13/13) imports the sample both ways, and the game draws it.

## Done: Phase 7, scene composition (2026-10-01)

The milestone was "the user can build a multi-scene game". Zombie Arena is one, and the Phase 7 browser test
works with it in the editor.

**Scenes inside scenes (§41).** A node can be an instance of another scene (`instance: "scenes/coin.scene"`).
- Its type, properties, script, groups, connections and children come from that scene, so editing the source
  changes every instance.
- Saved on the instance is only what differs: its own properties, and `overrides` (changed properties of
  nodes inside it, by path: `{ "Sprite": { "scale": … } }`). That is the spec's "source scene, instance,
  instance overrides".
- `expandScene` builds the full tree for the engine and the editor. Nodes from an instance get stable ids
  (`<instance>:<id in its scene>`).
- They can be changed (as overrides) but not renamed, moved or deleted, which belongs in their own scene.
- A scene cannot contain itself, directly or through others; the problem report names any loop.
- **In the editor:**
  - Files › ⧉ puts a scene into the one being edited.
  - The tree shows an instance's contents greyed and marks instances with ⧉ (click to open the source).
  - The Inspector says where a node comes from, marks overridden properties, and ↺ puts the source's value
    back.
  - GUI → code logs `scene.instance(...)`, and overrides as `scene.get("Zombie2/Sprite").scale = …`.

**Groups (§42).** Nodes have groups, set in Inspector › Groups. Scripts use:
- `isInGroup`, `addToGroup`, `removeFromGroup`;
- `scene.getNodesInGroup`, `scene.callGroup`.

**Signals (§43).** Any node can `emit(name, ...args)`, and `connect(name, target, method)` or a function
connects to it.
- The engine's own events (`bodyEntered`, `bodyExited`, `animationFinished`, `onCollision`) are emitted as
  signals too, so an area with no script can still be wired to something.
- Connections can be saved in the scene, from Inspector › Signals, and are wired when the game starts. They
  keep their target by id, so renaming or moving it does not break them, and deleting it removes them.
- A connected method that does not exist is reported against the node it should belong to.

**Scenes while the game runs:**
- `scene.instantiate(path)` makes a copy of a scene, with its scripts, for bullets and enemies.
- `scene.change(path)` switches scenes at the end of the frame: old nodes get `destroyed()`, new ones
  `ready()`.
- Values that must last from scene to scene live in a script module: modules are loaded once per game.
  Zombie Arena's `state.js` keeps the score and the best.

**Resources.** In Godot, resources are shared data files. Here the shared files are tilesets (Phase 6) and
scenes used as instances. A general data file type is not needed yet, and has not been invented.

**Format 3:** instances, overrides, groups and connections on nodes. Format 2 projects migrate unchanged.

**The fifth example, Zombie Arena** (Top-down Shooter art):
- a title screen, an arena and game over, switched with `scene.change`;
- the player is an instance of `player.scene`;
- zombies and bullets come from `zombie.scene` and `bullet.scene`, made while running;
- bullets hit `isInGroup('zombies')`;
- each zombie's `died` signal is connected in code;
- the player's `healthChanged` is connected to the HUD in the scene, with no code wiring;
- the score and best are kept in `state.js`.

**Breakout now uses instances:** its 48 bricks are instances of `brick.scene`, in the group `bricks`. The rows
below the first override only their picture. Its tests pass unchanged.

**Problems found and fixed:**
- **Renaming, deleting or duplicating a node inside an instance failed with "No node n9:n5".** The commands
  worked out the node's path for the log before anything else; they now find it through the expanded scene,
  so the clear message ("rename it in its own scene") comes through.
- **After changing a node inside an instance, the selection was cleared.** The store kept only selected nodes
  it could find in the saved scene; it now looks in the expanded scene.
- **`node.children`, `node.parent` and `scene.root` were typed as plain Node** in the script editor, so calling
  a method from that node's own script (`scene.root.gameOver()`) was underlined. They are typed like `get()`.
- **The Files panel grew wider than its column** when a long image name did not fit, which hid the ★ and ⧉
  buttons. Names now shorten with "…".
- **Closing a script tab could make Monaco report "Canceled" as a page error,** once every script was kept
  as a model. Models are now kept when a tab closes, set to the project's text when opened, and removed when
  their script is deleted.

**Tested:**
- `npx vitest run src/labs/game-studio`: 159 tests in 13 files. New:
  - `core/instances.test.ts`: expansion, the source changing every instance, overrides (logged, replayed and
    removed again), loops, refused edits, groups and connections as commands, connections surviving a rename,
    the problem report, format 3;
  - `engine/scenes.test.ts`: instances running their scripts, groups, `connect` and `emit`, a connection saved
    in the scene, a missing method reported once, `callGroup`, `instantiate`, `change`;
  - Zombie Arena played through: title → arena, shooting, a kill scoring through the signal, zombies coming,
    the HUD through the saved connection, game over, back to the title.
- `e2e/phase7.acceptance.mjs` (9/9).
- `npm run game:acceptance`: all eight browser tests pass (15, 6, 9, 12, 10, 10, 13 and 9 checks).

## Done: the whole course, 33 lessons (2026-10-01)

"Building Games with Game Studio" (`src/courses/making-games/`, from `course-sources/making-games.yaml`):
- **8 chapters:** first steps, physics, camera and HUD, animation, tilemaps, scenes, Tetris (9 lessons), and a bonus
  lesson on training an agent.
- **Each lesson has:**
  - a Try it card opening its Game Studio task, with that task's high-definition step pictures;
  - an optional "Under the hood" section, with every number checked against the engine;
  - three examples, three challenges, a six-question quiz and eight checkpoints.
- **Pictures** are now 2× WebP (about 120 KB each, 88 of them), after the user found the old 0.6× JPEGs pixelated.
- **Checks:**
  - schema validation and `check_latex` pass for all 33;
  - `tasks.test.ts` checks every Try it card names a real task and a declared lab checkpoint;
  - `e2e/course.acceptance.mjs` (5/5) opens all 33 lessons in the browser and finds each card, as well as the
    full loop for lesson 1.1;
  - `npm run facts` and `catalog:check` pass (1265 lessons in the app).

## Fixed: links into labs, and windows losing their work (2026-10-01)

The user found that a lesson's Try it button left the course for `#/labs`, a page that does not exist, though the
lesson and Game Studio can both be open at once. Looking into it turned up four connected problems, all fixed:
- **Opening a lab from inside the app left the page you were on.** The `/lab/<id>` route opens the window, then
  always went to a listing page: `/labs`, which has no route. Now:
  - the Try it card, Game Studio, Sprite Forge and Tile Mapper open each other's windows directly, with no route
    change (`src/components/desktop/useOpenLab.js`), so the lesson stays where it was underneath;
  - a `#/lab/<id>` link followed inside the app goes back to the page it came from;
  - a link opened cold goes to `/labs`, which now redirects to the home page, as `/games` already did.
- **Any address with no page was blank.** A catch-all route now shows "There is no page at …" with a link home
  (`src/pages/NotFoundPage.jsx`).
- **So it cannot happen again:** `src/routes.test.js` finds every in-app link in the source and checks that a
  route exists for it: `navigate('/…')`, `to="/…"`, `backTo="/…"`, `href="#/…"`, plus each lab's own `routes`.
  Switching off the `/labs` route makes it fail, naming `App.jsx:307 → /labs`.
- **Maximizing, restoring or minimizing a window threw away the lab's work.** This affected every lab.
  - `FloatingWindow` drew a maximized window and a normal one as two different element trees, so the lab inside
    remounted on every switch.
  - The desktop also unmounted minimized windows.
  - Now there is one tree for every state, and a minimized window is only hidden.
- **"Back to the lesson" now minimizes Game Studio** with its project intact, so the lesson shows. The task test
  checks that the project survives.
- **Two browser checks waited a fixed time** for a game to move or tick (Phase 1's arrow-key move, Phase 3's
  ticks after an error). A cold link now lands on the home desktop behind the window rather than a blank page, so
  headless frames are slower, and the checks failed. They now wait until the thing happens, with a limit.
  All 16 browser tests pass again, each run on its own, and so does `npm run build`.

## Done: Q-learning in Game Studio, and the bonus lesson rebuilt around it (2026-10-03)

The user asked for the bonus lesson to teach Q-learning for real, building on the ML Lab's lab 37, with Game Studio
as the place it is done. Before, the lesson only described the cross-entropy method and had no Try it task.

**Q-learning on any game** (`ml/qlearning.ts`):
- **States from numbers.** A reading gets `bins` (cut points); a value's bin is how many cuts are below it, and the
  binned readings combine like digits. Breakout bins "ball − paddle" into 7 and velocity.y into 2: 14 states.
- **Watkins' update,** ε-greedy with ties broken at random (as the ML Lab does), and ε falling from 0.3 to 0.02.
- **Greedy checks.** Every 10 episodes the greedy policy plays 2 games on seeds of its own, without learning, and
  the best table is kept. Without this the final table was unreliable: training returns climbed on every seed, but
  the last table sometimes played at −6, because a binned state hides details that matter.
- **Measured on Breakout** (100 episodes, about 15 seconds; scored on the game's real reward):

  | Variant | Scores |
  |---|---|
  | As set up | 48, 48, 48 on seeds 1–3 (the whole wall) |
  | −1 per lost ball, not −3 | 48, 44, 41 |
  | No penalty for a lost ball | 43, 1, 48 |
  | No velocity.y bins (7 states) | 43, 43, 18 |
  | Three bins across | 13, 24, 34 |

- **Its table does not read as "move towards the ball" in every row:** the state leaves out the ball's sideways
  speed, and some well-visited rows look wrong. The lesson says so instead of claiming a rule.

**In the editor:** Run › Train an agent… has a method switch, Q-learning (the default) or Cross-entropy:
- Q-learning has its own settings (episodes, α, γ, ε).
- Its curve shows each episode's return, the average of the last 10, and the greedy checks.
- "What it learned" is the Q table: a row per state, with its bins in words, the greedy action in green, and how
  often each state was updated.
- "Watch it play" and the runtime take either kind of policy (`ml/policy.ts`).

**The task `q-agent`** (`tasks/learning.ts`, chain "A game that learns") has five steps:
1. bin the ball-across reading;
2. bin velocity.y;
3. train;
4. watch it play;
5. train again on three bins and compare.

Its checks are editor checks on a new `training` view: the dialog's spec as typed, the finished runs, and whether
it was watched. `GameTask.agent` sets the environment the task starts from, and `solvedEditor` lets
`tasks.test.ts` prove the steps pass. Its pictures come from `npm run game:shots` (`tutorials.shots.mjs q-agent`
drives the real dialog).

**The lesson** (mg8-001, from the YAML) teaches:
- the loop, with the notation $S_t, A_t, R_{t+1}$;
- states from bins, and the return with its recursion;
- $Q$ and $Q^*$, and the Bellman optimality equation;
- the TD target and TD error, and ε-greedy exploration;
- off-policy learning, with the convergence conditions under the hood.

Its notebook builds all of this on a small Catch game: one update by hand, training, then the learned table
against $Q^*$ solved backwards. With ε = 1 the table converges to within 0.0002 of $Q^*$. The notebook also uses
Breakout's bins (checked against `ml/qlearning.ts`) and a picture of the table.

The challenge is to write the update. It checks itself against four cases, so it stays plain YAML data. The Try it
card opens `q-agent`. ML Lab lesson 37.4 now links to the lesson.

**Tested:**
- `ml/qlearning.test.ts`: bins and states; the update on two hand-solvable environments; Breakout from −5.3 to
  above 40 with ten checks.
- `courses/making-games/bonus.test.js`: every cell's printed numbers, the self-checking challenge, the card and the
  ML Lab link.
- `e2e/ml.acceptance.mjs` (9/9): Q-learning reaches 48 with the 14-row table, then Watch it play; the
  cross-entropy method reaches 37.
- `tutorials.shots.mjs q-agent` (5/5 steps ticked through the real dialog).

## Done: Phase 9, machine learning, in Game Studio (2026-10-01)

**A game is now a Gymnasium-style environment** (`ml/env.ts`):
```text
env = await GameEnv.create(project, spec, loadScripts)
reset(seed) → observation
step(action) → observation, reward, terminated, truncated
```
- It runs the game's own scripts on the real engine, headless, as the task checks do.
- **The agent sees the game's state,** not its pixels. The spec is plain JSON, so Python can send it later:
  - observation: node paths such as `Ball:position.x`, with an optional `minus` for a difference, and a scale;
  - actions: sets of input actions held for a step, so the agent uses the player's controls;
  - reward: how much chosen values change;
  - when an episode ends.
- **Repeatable:** a seed fixes the game's own randomness (`Math.random`, while the game runs).

**An agent learns Breakout from its state** (`ml/cem.ts`, `ml/breakout.ts`):
- the method is the cross-entropy method on a linear policy, with elitism;
- random play averages −5; after 10 generations (about 15 seconds) the agent averages 37, keeping the ball in play
  and breaking 37 bricks in 80 seconds of play;
- its weights read as "move towards the ball".

**In the editor:** Run › Train an agent… holds the spec (the Breakout example comes with one), Train in a worker,
the learning curve against random play, a table of what it learned, and **Watch it play**, which runs the real
game in the runtime with the agent at the controls (the runtime's new `agent` message).

**What we learned building it** (worth a lesson):
- **The first reward taught nothing.** Each launch breaks a few bricks for free, so losing a ball cost almost
  nothing, and random play scored as well as anything. Losing a ball now costs 3.
- **The first features gave nothing to choose between.** With the ball's x and the paddle's x as separate
  numbers, almost every random weighting behaved alike. Observing the difference (`minus`) made "move towards
  the ball" easy to find.

**Tested:**
- `ml/env.test.ts` (5):
  - reset and step;
  - actions move the paddle and launch the ball;
  - the rewards add up to the score, less 3 a ball;
  - the same seed gives the same episode;
  - spec mistakes are refused before play;
  - training: random below 0, trained 30 or more, and the policy moves towards the ball.
- `e2e/ml.acceptance.mjs` (6/6), in `npm run game:acceptance`:
  - the dialog opens with Breakout's spec;
  - training reports each generation;
  - the trained score is 37 against random's −5.3;
  - the weights table;
  - Watch it play moves the paddle with no key pressed.

**Next for Phase 9: the ML Lab.** The same environment, used from the ML Lab's Python, so a lesson can write the
learning algorithm itself (policy gradients, Q-learning on a grid game). That needs the engine in the Python
worker, or a bridge to it. It is a design decision about the ML Lab's runtime, so it is left for the user.

## Done: Phase 8, export (2026-10-01)

**Project › Export game for a website (.zip)…** gives `index.html`, `game.js` (the runtime), `project.json` and the
images the game uses. Every path is relative, so it runs from any static host, a GitHub Pages subpath included.

**Project › Export game as one file (.html)…** puts the runtime, the project and its images in one page, which
opens by double-click, even from disk.
- **Both forms run the very file the editor runs** (`runtime/dist/game-runtime.js`). With no editor around it, the
  runtime loads its own project: from the page (`window.GAME_DATA`), or from `project.json` beside it. If it cannot
  start, it says why on the page.
- **Only the images it needs:** those its scenes use, its tilesets' pictures, and any a script names, such as
  Tetris's `pieces.js` (`usedAssets`).

**Project › Export project (.zip)…** and **Import project (.zip)…** (also in the Projects dialog) move a project
between browsers:
- inside the .zip: `project.json`, each scene as its own file, each script as plain JavaScript, and the images;
- importing migrates and checks it, as opening a saved project does, and says exactly what is missing or wrong;
- a .zip whose files sit inside one folder, as file managers make them, also works.

**Tested:**
- `core/archive.test.ts` (11):
  - every example goes out and comes back exactly;
  - a folder-wrapped .zip is read;
  - five kinds of broken .zip are refused with their reason;
  - the images a game needs, including Tetris's;
  - the website .zip's files and relative paths;
  - the one-file game's contents and its escaped `</script`;
  - no main scene, no export.
- `e2e/export.acceptance.mjs` (5/5), added to `npm run game:acceptance`:
  - Breakout, exported for a website, is unzipped under `/my-games/breakout/` on a plain static file server and
    plays there with no editor (Space launches the ball);
  - the one-file export plays from `file://`;
  - Export project, then Import project, gives back the identical project with every image.

## Done: the course's first lessons, 1.1 to 1.4 (2026-10-01)

**"Building Games with Game Studio"** (named 2026-10-01; first called "Learn to Program by Making Games") is in the catalogue (`src/courses/making-games/`), with
chapter 1's four lessons. Each teaches one idea, sends the learner to Game Studio with a Try it card, and explains
the maths under "Under the hood (optional)". The details and the decisions left to the user are in the course plan,
under "Lessons as built". They are the trial the plan asked for: the user reviews them before more are written.
- **Why a card:** lesson prose does render Markdown links (an earlier version of this note said it could not),
  but a link cannot show the task's steps and pictures, open Game Studio over the lesson, or say Done. So the
  Try it card is a registered visualization (`GameStudioTask`). It fits the lesson schema as it is.
- **Checks:**
  - `validate-lesson-schema` and `check_latex` pass for all four;
  - `npm run facts` regenerated the catalogue (44 courses, 1236 lessons);
  - `catalog:check` passes;
  - the browser test does the whole loop.

## Done: Sprite Forge and Tile Mapper connected to Game Studio (2026-10-01)

You can now make or edit art in either lab and send it straight back, with no files. What is where is in the
course plan, under "Sprite Forge and Tile Mapper connected", "As built". How it works is change 21 in the
architecture record.
- **Sprites:**
  - **New sprite…** opens Sprite Forge with a new 32 × 32 sprite.
  - **Send to Game Studio** adds it: one image per frame. The first time it is also put in the middle of the
    scene, as a Sprite2D or as an AnimatedSprite2D with an animation per tag.
  - **✎ (Edit in Sprite Forge)** beside a picture opens it in Sprite Forge. A picture made there opens as the
    original, frames and all.
  - Sending it back updates that picture everywhere it is used, and Ctrl+Z puts the old one back.
- **Maps:**
  - **New map…** opens Tile Mapper. Sending the map adds a Node2D of TileMapLayers to the scene; a collision
    layer becomes a hidden layer whose tile is solid.
  - **Edit in Tile Mapper** opens a map's layers there. Sending it back repaints the same nodes by layer name,
    so their scripts and connections stay. The tileset picture is matched by its bytes, so it is not added twice.
- **Fixed, in the desktop:** a window opened or focused while another was maximized opened behind it. A
  maximized window always sat at z-index 1800, so Game Studio maximized would hide Sprite Forge. Windows focused
  after a maximized one now go above it (`src/components/desktop/DesktopProvider.jsx`).
- **Tested:**
  - `core/artMaps.test.ts`: new map, re-send (same ids, dropped layer, undo), the round trip giving identical
    cells, cells left of the origin, the refusals, and `replaceAsset` with undo.
  - `tile-mapper/gameStudio.test.js`.
  - `e2e/artlabs.acceptance.mjs` (9/9), added to `npm run game:acceptance`. It does the whole round trip through
    the real windows: draw, send, edit, send, undo; choose a starter tileset, paint, send, edit, paint, send.
  - Unit tests for the three labs: 282 pass.

- **Tile Mapper can now use the starter art:** its tileset dialog has a Starter art tab with Kenney's four tile
  sheets (Tiny Dungeon, Pixel Platformer and its backgrounds, Top-down Shooter). Their tile sizes are known, so
  there is nothing to set. A PNG chosen from disk is now named after its file, not "Imported tileset".

**Up to Game Studio's standard** (the user's ask, 2026-09-30: the same architecture, commands with undo, GUI →
code, tests and examples). Done on 2026-10-01:
- **GUI → code in both labs.** Every edit is a command that is also a line of code, as in Game Studio:
  - Tile Mapper: `map.paint("Ground", [[x, y, tile]])`, `map.addLayer('collision')` and so on (`mapApi.js`);
  - Sprite Forge: `sprite.paint(0, [[x, y, colour]])`, `sprite.flipH('all')`, `sprite.color(1, '#ff004d')`
    and so on (`spriteApi.js`).
- **The Code panel** (`</> Code`, in each lab's header; `src/components/ui/CodeLogPanel.jsx`):
  - it lists the lines;
  - **Copy all** copies them;
  - code typed in its box runs as one edit, one undo step.
- **Undo and redo keep the log in step** (`src/utils/useCommandHistory.js`, shared by both labs). The log always
  rebuilds the document on screen from the one the session started with. The hook now keeps the document in a
  ref, so two edits in one event cannot overwrite each other.
- **Tile Mapper examples, made by code** (Examples…):
  - a dungeon room with walls, a doorway and collision;
  - a maze generated by a recursive backtracker, written in the map API itself.
  Opening one shows its code in the Code panel.
- **Tested:**
  - replay tests in both labs: a session of every kind of edit, and its log run on the start, give the same
    document;
  - undo and redo with the log, through the real hook;
  - the code runners' error messages;
  - the examples: the room's doorway and walls, and the maze connected with no loops;
  - in the browser: `tile-mapper/e2e/tilemapper.acceptance.mjs` (8/8) and
    `sprite-forge/e2e/spriteforge.acceptance.mjs` (8/8), both in `npm run game:acceptance`.

- **Sprite Forge examples, made by code** (Examples…):
  - a heart drawn from its implicit curve, (x² + y² − 1)³ − x²y³ ≤ 0, with an outline;
  - a four-frame spinning coin whose width follows |cos θ|, tagged "spin".
  They are tested for their shape, symmetry and frame widths, and in the Sprite Forge browser test (now 8/8).

Still open: a look that matches Game Studio's (both labs keep the app's light and dark themes).

## Done: the Tetris tutorial (2026-10-01)

**Help › Tutorials › Tetris:** nine tasks and 26 steps, from an empty Board to a whole game (`tasks/tetris.ts`):
1. the board;
2. a piece;
3. moving, and walls;
4. falling and landing;
5. turning, with wall kicks;
6. clearing lines;
7. score and a HUD;
8. a shuffled bag of seven, and game over;
9. hard drop, levels and the Next label.

The task list and how it differs from the plan are in the course plan, under "Tetris as built". That makes
**32 tasks in 7 tutorials**.

- **One script, built step by step:** every step adds one feature to `scripts/board.js`, in a fixed order, so
  each step has its own script. The tests check each one passes its step from that task's start. The pictures
  script types each one into the editor and runs the game, so the picture shows what that step does.
- **The checks call the learner's own methods** on the running game: `canPlace` against each wall, the floor
  and a full cell; `rotate` against the wall; `clearLines` on a board with two full rows. They give an exact
  "not yet" message for the usual mistakes. Each of these was tried and gave the right message:
  - `isPressed` instead of `isJustPressed`: "Holding ← took the piece from column 4 to 1";
  - new top rows that are one shared array;
  - `rotated()` changing the cells it was given;
  - no wall kicks;
  - sprites placed by their corner, not their centre;
  - a bag that is never shuffled;
  - a timer that is never reset.
- **Art:** Kenney Puzzle Pack 2 squares in orange, pink, grey and black are added to the starter set (black is an
  empty cell), so each of the seven pieces has its own colour (`starter/CREDITS.md`).
- **Pictures:** `npm run game:shots` (or `npm run game:shots -- tetris` for just these) now makes 88 pictures,
  3.1 MB. All 26 Tetris steps were done through the real editor, ticked, and pictured.

**Fixed:** the task checker loaded the learner's scripts before putting the node classes (Node2D…) where scripts
can see them, so the first script loaded in a fresh checker failed with "Node2D is not defined". The tests passed
only because an earlier task had left them there. The classes now go first.

**Tested:** `npx vitest run src/labs/game-studio` passes 201 tests; `tsc` is clean for Game Studio.

## Done: Scenes tutorials, and pictures for every step (2026-10-01)

**The Scenes tutorial** (5 tasks): one coin scene used three times; a gun that fires (instantiate); bullets that
hit only enemies (groups); a health display wired with a signal (no code joins them); a title screen
(scene.change). That makes **23 tasks in 6 tutorials**.

**A new scene's root can be any node type:** Files › scenes/ › + now asks for the root (Node2D unless you pick
another), as Godot does. A coin scene's root is an Area2D. It starts at Node2D each time; it used to remember
the last choice and quietly make the next scene an Area2D.

**Pictures for every step**, made by `npm run game:shots` (`e2e/tutorials.shots.mjs`):
- It plays every tutorial in a browser, doing each step through the editor as the step says, waits for the tick,
  outlines the control used, and saves `tasks/shots/<task>-<step>.jpg`: 62 pictures, 2.7 MB.
- The task panel shows the picture under the step you are on; click to enlarge.
- **It is also a test:** every one of the 62 steps can be done as written, and ticks.

**What it found:**
- The task panel hid while the game ran, so "run the game" could not be seen ticking. It now stays.
- "Walls that stop you" never said where to put Player. New nodes start at (0, 0), so Player walked above the
  wall. The step now says 300, 270, and the check explains when the wall is not in Player's way.
- The new-scene root choice remembered the last one (above).

**Fixed for the browser tests:** the app's "What's new" popup now appears for returning visitors, and test
browsers count as returning, because the welcome tour is marked seen. The harness now marks the latest What's
new as read too, using the app's own data (`src/data/whatsNew.js`).

## Fixed: switching projects could silently do nothing (2026-10-01)

The user found that creating a project, opening another, or starting a tutorial left the current project open.
There were two causes.
- **A running game kept playing over the new project.** Switching never stopped it, and the editor shows the
  running game instead of the viewport. Every switch now stops the game, and drops the old project's task and
  panel state.
- **The "unsaved changes" question used the browser's `confirm()`.** A browser can be told to stop showing such
  boxes, and then `confirm()` answers "no" without asking, so nothing happened. The editor now asks its own
  question (`store.ask`, `QuestionDialog`): **Save, then continue**, **Continue without saving**, or **Cancel**.
  Every other `confirm()` (stop a task, Show me, delete a project) is replaced too.

**Tested:** `e2e/switching.acceptance.mjs` (6/6), starting with an example open, unsaved, and its game running:
- creating a project asks, inside the editor;
- Cancel keeps everything, still running;
- "Continue without saving" switches and stops the game;
- "Save, then continue" saves first (the project appears in the saved list);
- starting a tutorial while a game runs works.

The browser tests used to accept every browser dialog automatically, which hid this. They now answer "no", as a
browser that blocks dialogs does, so any `confirm()` left anywhere would show up as a failure.

## Done: 18 tutorials in Help › Tutorials, and the home page search (2026-10-01)

The user found the in-editor tutorials good and asked for many more, ahead of the course lessons. **Help ›
Tutorials** now has five chains, 18 tasks, following the course outline:

| Tutorial | Tasks |
|---|---|
| First steps | a character on the screen; run your game; make Hero move (100 px/s on any screen); steer with the keyboard |
| Physics | walls that stop you; gravity and jumping; coins (areas); a bouncing ball; collision layers |
| Camera and HUD | a camera that follows (and smoothing); camera limits; a HUD that stays put |
| Animation | a walking AnimatedSprite2D; a door sliding open by keyframes; a switch that opens it from a script |
| Tilemaps | a tileset and a floor; solid walls on their own layer; Kenney's map from Tiled |

- **Checks:** play checks can now arrange the game first (`setup`: put the player on a coin), press keys later
  (`keysAt`: after landing), and watch every frame (`watch`, with the camera's view: the top of a jump, how far
  the camera lags).
- **Tested** as every task is: each start is not already done, and each solution passes every step (21 task
  tests).
- **The browser test** does two tutorials through the real editor, as their steps say: Physics' first three
  steps, including New script giving a CharacterBody2D arrow-key movement, and the Tiled task with the real
  Starter art Import button.

**Fixed:**
- **Typing "game studio" in the home page search did not find Game Studio** (typing "studio" did). The search
  treats "game" as "show only games", and Game Studio is a builder, so it was filtered out before its own name
  was looked at. A query found in an item's own text now always matches; category words narrow only other
  searches. Tested in `src/pages/matchItem.test.js`.
- **Long dialogs ran off the screen** (the Tutorials list): the overlay centred them with a grid, so their height
  limit did nothing. Centred with flexbox, they fit and scroll.

## Done: "Try it", tasks for the course and for Help › Tutorials (2026-10-01)

A **task** is one thing to try (`tasks/`): a starting project (Scene API code), steps with checks and hints, and a
solution. There are three kinds of check:
- **project**, which looks at the project ("a Sprite2D called Hero");
- **play**, which runs the learner's own game, headless, on the real engine, with keys held ("holding → moves Hero
  right", "100 px a second at 30 and at 144 frames a second");
- **editor**, which looks at what the learner did ("the game has been run").

- **Opening a task:** a lesson's link (`gameStudioLink(task, { from, lesson, checkpoint })`) or Help ›
  Tutorials… The task starts as a new project.
- **The task panel** sits beside the viewport. Steps tick off as Game Studio sees them done. The step you are on
  says what is not right yet, and has a hint. "Show me" applies the solution as one undo step.
- **Finishing** marks the lesson's checkpoint in the app's progress. "Back to the lesson" returns to it; in a
  tutorial, "Next task" goes on.
- **Play checks run in a worker,** away from the editor's page, and read scripts as typed (saved or not).
- **Chapter 1's four tasks:** put a character on the screen, run your game, make Hero move (at 100 px/s on any
  screen), and steer Hero with the keyboard (diagonals no faster).

**Tested:**
- `tasks/tasks.test.ts`: every task's start is sound and not already done, and its solution passes every step;
  links open their task, and an unknown task fails there.
- `e2e/tasks.acceptance.mjs` (7/7):
  - a lesson-style link opens the task;
  - every step ticks as it is done in the editor;
  - the checkpoint is marked, and Back returns to the lesson;
  - a script typed but not saved passes the play checks;
  - "Next task" and "Show me".

**Fixed on the way:** Monaco reports its own cancelled work as an unhandled "Canceled" error when an editor
closes; it came and went in Phase 3's browser test. Only that exact error is now silenced, as VS Code does.

## Next

In this order (proposed to the user, 2026-10-01):

1. ~~Scenes tutorials~~ and ~~pictures for every step~~: done (above).
2. ~~Tetris, step by step~~: done (above). The optional maths waits for the course lessons.
3. ~~Sprite Forge and Tile Mapper connected~~ and ~~brought to Game Studio's standard~~: done (above): round-trip
   editing, GUI → code with a Code panel, examples in both, and browser tests. Still open: the look.
4. ~~The course, "Building Games with Game Studio"~~: all 33 lessons written (2026-10-01), in 8 chapters. Details are
   in [game-studio-course-plan.md](game-studio-course-plan.md). The bonus lesson was rebuilt around Q-learning on
   2026-10-03, with a Try it task, and ML Lab lesson 37.4 links to it.
5. ~~Phase 8, export~~ and ~~Phase 9 in Game Studio~~: done (above). For the ML Lab, the user chose a bonus lesson
   at the end of the course, linked from the ML Lab (item 4). A bridge from its Python stays possible later.
6. **Starter projects** (2026-10-04): Quest Buddies (a multi-map RPG with a learning buddy), Kart Circuit (driving)
   and LAN Arena (co-op over a LAN). Each closes engine gaps as general features and has a chapter of lessons.
   Plan and progress: [game-studio-starters-plan.md](game-studio-starters-plan.md).

## Phases

| Phase | Content | Proven by | State |
|---|---|---|---|
| 0 | Architecture decisions, licence check | This record | Done |
| 1 | Model, editor shell, commands, undo, code log, image assets, Sprite/Node2D/CharacterBody2D (no collision), scripts, input, iframe runtime, IndexedDB, the Kenney starter set | The Phase 1 acceptance test | Done |
| 2 | Camera, more node types, asset browser, drag-and-drop, project settings | Phase 2 browser test | Done |
| 3 | Script editor completeness, Output with click-to-source, TypeScript later | Script error test | Done: API reference, hover docs, underlined mistakes, run-time and syntax errors with click-to-source (phase 3 test) |
| 4 | Physics: bodies, shapes, layers and masks, gravity | Platformer, Breakout (physics part) | Done: Potion Hunt, Coin Run and Breakout all pass |
| 5 | Animation: sprite frames, property tracks, timeline | Platformer animation | Done: AnimatedSprite2D, AnimationPlayer and the Animation panel; Coin Run uses both |
| 6 | Tilemaps: tilesets, painting, tile collision, Tiled import | Maze chase | Done: tilesets, TileMapLayer, the TileMap panel, Tiled import, Maze Chase |
| 7 | Scene instancing, groups, signals, resources | Breakout, puzzle, shooter | Done: instances with overrides, groups, signals, instantiate and change; Breakout (instanced bricks) and Zombie Arena |
| 8 | Project zip, game export, Pages-safe output | Export test: open the exported game on its own | Done: website .zip, one-file .html, project .zip export and import (export test) |
| 9 | Machine learning: a Gymnasium-style environment for any game, used from the ML Lab | Train an agent to play Breakout from game state | In Game Studio: the environment, CEM training, Watch it play (ML test). Open: use from the ML Lab's Python |
| After | Tile Mapper (and Sprite Lab) brought up to Game Studio's standard | Their own acceptance tests, and use from Game Studio | |

## Size

About 12–20 agent sessions in all; Phases 1–3 are about 4–6. The bottleneck is checking each feature in a
real browser.
