# Curriculum Roadmap
## Building a Godot-like Sprite/Scene Editor for pygame-ce

## The project

You'll build **Forge** (working name — rename it whatever you like): a desktop
editor, GUI shell in **PySide6**, live game-preview and sprite/animation
rendering in **pygame-ce**. By the end, Forge will let you:

- Import a spritesheet, slice it into frames, preview animations
- Build a scene tree of game objects (like Godot's node tree)
- Edit object properties in an inspector panel
- Save/load `.forge` project files (JSON)
- Export a small runtime module so a real pygame-ce game can load what you authored

This is also a Python-mastery track. Every lesson uses the project as the
excuse to teach a real language or engineering concept — not toy examples.

## Why two frameworks

pygame-ce owns *rendering a 2D scene fast*. PySide6 owns *professional desktop
UI* (docks, menus, property grids, file dialogs). Godot conceptually separates
these too (editor UI vs. viewport rendering) — we're doing the same split,
just with two separate libraries instead of one engine that does both.
Phase 4 is the lesson where these two worlds are stitched together; everything
before it is deliberately single-framework so you're not learning two new
libraries in the same breath.

---

## Phase 0 — Orientation (1–2 lessons)
**Goal:** environment that won't fight you later.
- venv, `pip`/project layout, `pyproject.toml` basics, why we pin `pygame-ce` not `pygame`
- git init + a `.gitignore` that actually matches this project
- Artifact: a runnable-but-empty project skeleton

## Phase 1 — Python Foundations the Project Actually Needs (4–6 lessons)
Not a generic Python course — only what Forge's data model requires, taught properly:
1. **Classes vs. `dataclasses`** — why Forge's data model uses `@dataclass`
2. **Type hints & why they matter for a GUI codebase** (autocompletion, catching bugs before runtime)
3. **Enums** — for things like `NodeType`, `PlaybackState`
4. **`pathlib` + JSON serialization** — how a "project file" becomes a Python object and back
5. **Properties (`@property`) and descriptors basics** — foreshadows the Inspector panel binding to arbitrary object attributes
- Artifact: `GameObject` and `Transform` dataclasses with round-trip JSON save/load

## Phase 2 — PySide6 Fundamentals (5–7 lessons)
1. `QApplication`, `QMainWindow`, the event loop — **Lesson 1, below**
2. Layouts (`QVBoxLayout`/`QHBoxLayout`/`QSplitter`) and why absolute positioning is wrong here
3. Signals & slots — Qt's event system, contrasted with plain Python callbacks
4. `QDockWidget` — building the panel layout (Scene tree / Inspector / Viewport) like an IDE
5. `QTreeView` + a custom model — the Scene Hierarchy panel
6. `QFileDialog`, `QAction`, `QMenuBar` — File > New/Open/Save
- Artifact: the empty editor shell — dockable panels, menu bar, no content yet

## Phase 3 — pygame-ce Fundamentals, Standalone (5–6 lessons)
Taught with zero Qt in the room, so pygame's own model is clear first.
1. `Surface`, `Rect`, the coordinate system
2. Images: loading, `blit`, alpha/transparency
3. Spritesheets — slicing one image into frames with `subsurface`
4. `pygame.time.Clock`, delta time, and why frame-rate independence matters
5. `sprite.Sprite` / `sprite.Group` — pygame's own object model (and where it *won't* fit Forge's needs)
- Artifact: a standalone script that loads a spritesheet and flips through frames in a plain pygame window

## Phase 4 — The Merge: pygame Surface Inside a Qt Widget (2–3 lessons, dense)
This is the architectural hinge of the whole project.
1. Rendering pygame **headlessly** (no real window) to an off-screen `Surface`
2. Converting a pygame `Surface` → `QImage` → painting it in a custom `QWidget.paintEvent`
3. Driving redraws with `QTimer` instead of pygame's own loop — reconciling "two event loops" into one
- Artifact: the Viewport dock now shows a *live, animating* pygame scene inside the PySide6 shell

## Phase 5 — Undo/Redo and the Command Pattern (2 lessons)
- Why direct mutation breaks an editor UX
- The Command pattern; a `QUndoStack`-backed history
- Artifact: moving/renaming an object in the scene tree is undoable

## Phase 6 — The Animation System (4 lessons)
1. `AnimationClip` data model — frames, durations, looping
2. Import wizard: click-drag frame boundaries over a spritesheet preview (Qt `QGraphicsView`)
3. Playback engine driven off the shared delta-time clock from Phase 3
4. Timeline scrubber widget
- Artifact: import a spritesheet, define a clip, scrub/play it in the editor

## Phase 7 — The Node/Scene-Graph System (4 lessons)
1. Base `GameObject`/`Node` class, parent-child hierarchy, `Transform` composition
2. Reflection-driven Inspector panel — using `dataclasses.fields()` and type hints to *auto-generate* the property UI (this is the "why type hints mattered" payoff from Phase 1)
3. Selection state shared between Scene Tree, Viewport, and Inspector (a small pub/sub or Qt signals)
4. Serialization of the whole tree to a `.forge` JSON project file
- Artifact: build a small scene of 3–4 objects, save it, reopen it, everything's intact

## Phase 8 — Editor Polish & Engineering Practices (ongoing thread, 4+ lessons)
- `pytest` for the data model and serialization (not the GUI — that's a deliberate design decision we'll discuss)
- Packaging with `pyinstaller` or similar
- Logging vs. print debugging
- A plugin-hook seam, if you want to extend Forge later
- Artifact: CI-able test suite + a distributable build

## Phase 9 — Export Runtime (2 lessons)
- A small `forge_runtime.py` that any pygame-ce game can `import` to load `.forge` scenes/animations at runtime
- Artifact: a *separate*, tiny pygame-ce game that loads and plays back something authored in Forge

---

## How we'll proceed

Each lesson follows the schema in your uploaded document exactly — mechanical,
construct-by-construct code explanation, predictions before running code,
an execution trace for anything non-trivial, a trap where one genuinely
exists, and an exercise. I won't summarize code in place of explaining it.

Lesson 1 is attached separately. Tell me when you're ready for Lesson 2, or
if you want to reorder/skip/merge any phase above — this roadmap is a
starting draft, not a contract.
