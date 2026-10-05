# Forge: learn software engineering by building a game engine, editor and service in Python — series plan

Status (2026-10-04): **Chapters 0–6 written (lessons 0.1–0.3, 1.1–1.6, 2.1–2.6, 3.1–3.6, 4.1–4.7, 5.1–5.6, 6.1–6.5).** The user opened 0.1 in the
app and approved it as the bar; they review the rest by doing the lessons, so writing continues in plan order
without pausing.

- Chapter 1 (`forge-script/`): a window and a loop (with `--test-run`, so checks can drive the game), git and
  the backlog, the paddle (`dt`, floats vs `Rect`), the ball (with the chapter's bug hunt: a slow frame traps
  the ball past a wall; pdb; `--lag-at` to reproduce), bricks and the end of the game, and "what's wrong with
  this script" (evidence-based technical debt, written into `BACKLOG.md`). The finished one-file Breakout is
  143 lines.
- Test-run options the checks use: `--test-run N`, `--hold left|right|none|auto`, `--lag-at FRAME`, and from
  2.6 `--seed N` (test runs default to seed 0).
- Chapter 2 (`forge-functions/`): a safety net (pytest 9.1.1, characterisation tests via `subprocess`), name
  the parts (functions, DRY, scope/LEGB, pure functions), what import runs (`main`, `__name__`, `pytest.ini`
  with `pythonpath = .`), unit tests (arrange/act/assert, regression test for 1.4's bug; bug hunt: a provided
  failing `tests/test_arguments.py`), types (pyright[nodejs] 1.1.414 with `pyrightconfig.json`; `int | None`
  caught statically; `reportMissingParameterType`), randomness (seeded `random.Random` passed in; floats and
  `math.isclose`). Final: `breakout.py` 215 lines, 36 tests.
- Chapter 3 (`forge-classes/`): a ball that knows itself (class, `__init__`, `self`, references and
  aliasing; the Chapter 2 stale-`Rect` bug found by refactoring), dataclasses and vectors (`Vector2`, the
  shared-vector trap, `Brick` with its own colour, frozen `Settings`), test first (TDD: tough top-row bricks,
  30 points, cracked colour; commit at every green), choices and rules (`Hold` enum, the paddle's invariant
  via a read-only property, `git stash`, fail fast with `ValueError`), a game you can hold (`Game` model,
  composition over inheritance, in-process integration tests, first code-reading exercise with a provided
  `replay.py`), and tidy code (ruff 0.16.10: `ruff.toml` line-length 120, format, lint, `check=False`).
  Final: `breakout.py` about 290 lines, 51 tests; definition of done = tests, pyright, ruff format, ruff check.
- Chapter 4 (`forge-package/`): a package (`git mv`, `__init__`, `python -m`, absolute imports), modules with
  one job (`settings`, `model`, `draw`, `app`; a deliberate circular import; `tests/test_architecture.py` checks
  dependency direction through `sys.modules` in a fresh process), a real project (`pyproject.toml`, setuptools,
  editable install with `-e .` in `requirements.txt`, the `breakout` entry point, `*.egg-info/` ignored,
  `argparse` with a `positive_int` validator), strict types (`typeCheckingMode = "strict"` for
  `breakout tests replay.py`), what to test (a provided `review_these_tests.py` to review; boundary values;
  a provided `check_walls.py` that mutates a temporary copy), game states (a `GameState` state machine built on
  a `game-states` branch, fast-forward merge), and a merge conflict resolved on purpose (`title-text`).
  Final: 63 tests.
- Chapter 5 (`forge-data/`): a level in a file (text format, `breakout/levels/`, `parse_level`/`load_level` as
  functional core and imperative shell, `Game` given its bricks), when the file is wrong (`LevelError(ValueError)`,
  parametrised error tests, `--level`, exit 1 vs 2; bug hunt: a UTF-8 byte order mark, fixed with `utf-8-sig`),
  a level is more than a wall (JSON with `name`, `lives`, `wall`; validation by hand with `object`, `isinstance`
  and `cast`; a frozen `Level` that keeps rows and makes fresh bricks, the aliasing reason), let the types check
  it (pydantic 2.13.5 as a runtime dependency in `pyproject.toml`: strict, `extra="forbid"`, frozen,
  `Annotated` constraints, `AfterValidator`; every problem reported; tests written first for friendly row
  locations), settings the player keeps (TOML read with `tomllib`, `breakout/config.py` with `Controls` as a
  small InputMap and `KEYS`, `--config`, paths relative to the file, precedence command line > file > default,
  `model_validator` for a key used twice), and coverage (pytest-cov 7.1.0, `.coverage` ignored,
  `[tool.coverage.run] patch = ["subprocess"]` so the characterisation tests count, the untested keyboard
  shell named as a known gap for Chapter 11, mutation testing and Goodhart's law; the chapter zoom-out "who
  controls this data?"). Final: 96 tests; `app.py` 86% covered, everything else 100%.
- Chapter 6 (`forge-saving/`): a score that outlives the game (`breakout/scores.py`, `--scores FILE`, test runs
  keep no scores, the player's folder via `pygame.system.get_pref_path`, UTC and ruff's `DTZ` rules; Your turn:
  ISO 8601 round trip, with `default=str` as the caught shortcut), files you didn't write (pickle's `__reduce__`
  shown with a harmless provided `make_gift.py`; a cut-off `tests/data/broken-scores.json`; `TypeAdapter` over
  the dataclass with `AwareDatetime`; Your turn: warn, play on, never overwrite; atomic-save challenge), tables
  (the `python -m sqlite3` shell, a STRICT table with `CHECK`, transactions with `with db:`, placeholders; Your
  turn: `best` with `MAX` and `(level,)`), Bob's Castle (a provided teammate's `breakout/report.py` built with
  f-strings; injection shown on a copy; ruff `extend-select = ["S608"]`; Your turn: placeholders and attack
  regression tests), and fixtures (`tests/conftest.py` with a `yield` fixture `db`, the testing pyramid measured
  with `--durations`, a declared `slow` marker with `--strict-markers`; Your turn: `new_game` and `game`
  fixtures replace 5.1's duplicated helpers). Final: 106 tests; `pytest -m "not slow"` runs 95 in about 3 s.
  **Promised:** lesson 7.1 opens with reference steps showing `tests/test_game.py` and `tests/test_states.py` in
  full (6.5's Your turn answer).
- Project Studio change: Run on a package's `__main__.py` runs `python -m <package>` from the project folder
  (`desktop/app/runtimes/python.cjs`, tested in `pythonVenv.test.js`), so later lessons use
  `run: breakout/__main__.py`.
- Type-checked files: `breakout.py`, `tests/test_breakout.py`, `tests/test_game.py`. The older test files
  (`test_characterisation.py`, `test_arguments.py`) have unannotated helpers, so checks don't run pyright on
  the whole `tests` folder; Chapter 4's strict mode is the place to annotate them.
- Decisions made while writing: pyright is installed as `pyright[nodejs]` (bundled Node, pinned; the deepest
  path in it is 120 characters, fine under `C:\Users\<name>\Documents\forge`); pytest is configured with
  `pytest.ini` until Chapter 4 moves it to `pyproject.toml`; type checking runs on `breakout.py` only (the
  Chapter 0 practice scripts aren't typed).
- Walkthrough helpers: `FORGE_WRONG_FROM=<lesson id prefix>` tries wrong answers only from that lesson on;
  `editFiles` and `targetOf` describe answers to steps with no code shown; the walkthrough isolates git config
  and uses SDL's dummy video driver.

- Lessons: `src/labs/project-studio/tracks/forge-tools/` — 0.1 the terminal and your first program, 0.2 a
  Python of its own (venv, pinning, rebuild from `requirements.txt`), 0.3 reading tracebacks and the debugging
  method (with the series' first bug hunt).
- Walkthrough: `forge.desktop.test.js` walks every `forge-*` track in one project folder, using
  `tracks/forge.walkthrough.js`. It also requires every lesson to have a Your turn step with checks, hints,
  no code shown and at least one wrong answer the checks reject.
- Hint ladders (```` ```hints ```` fences: `hints.js`, `HintLadder.jsx`) were added to Project Studio for
  Your turn steps. Optional challenges already existed (a step heading starting "Challenge:").
- The series is registered in `src/labs/project-studio/series.js` with all 54 chapters; only chapters with
  lessons appear.

Decided with the user:

- **The goal is to become a software engineer.** The user wants to direct real software of their own later
  (alone and with an AI pair) without it turning into a ball of mud. This is one of a few planned series
  toward that goal, but it stands alone: it assumes only basic scripting.
- **Forge is the vehicle, not the subject.** Every chapter answers: *what idea am I learning here that I'd use
  in a completely different project?* (Third draft review.)
- **Godot's concepts and vocabulary, built by hand on pygame.** The learner writes Forge's nodes as wrappers
  over pygame, so they learn how an engine works underneath and how Godot is used. Forge is its own small
  educational engine, not a Godot clone: where matching Godot exactly would cost more than it teaches, Forge
  differs and says so.
- **3D and deeper machine learning** (2026-10-04): Part 4 builds 3D from first principles, a software
  renderer first and then the GPU through moderngl, with Godot-shaped 3D nodes and a 3D game; Part 6 goes
  well beyond Game Studio's Q-learning, to deep Q-learning, policy gradients, PPO and self-play. The series
  grew from 42 to 54 chapters; chapters after the editor were renumbered, and lessons' references with them.
- **Machine learning, built from first principles** and then added to Forge as a feature (Part 6). Game
  Studio's Train dialog is the calculator; Forge is where the learner learns the mathematics behind it.
- **PySide6 for the editor**, taught only as the editor needs it, starting from a deliberately tiny editor.
- **Agile, git, debugging, security, reading code and directing work** run through the whole series as
  threads, each practised many times, not taught once.
- **Open source** at the end.

This replaces three earlier starts, and reuses what fits from them:

- the Forge roadmap and draft lessons in `src/docs/tutorials/pygame/` (PySide6 + pygame-ce editor);
- the one-lesson `pyside6-engine` Project Studio track;
- `src/courses/pyside6/2-godot-like-editor/001-pygame-surface-to-qimage.js`.

The rl-pygame plan ([rl-pygame-track-plan.md](rl-pygame-track-plan.md)) lists "a separate planned series
rebuilds Game Studio for pygame". This is that series.

## Who it's for

**Assumed:** basic scripting. Variables, `if`, `for` and `while`, writing and calling a function, lists and
dictionaries, `print`, and running a `.py` file. Nothing else.

**Not assumed, and taught when a problem needs it:** everything else. Each idea arrives at the moment the
project can't go on without it.

**Where they end up:** able to start a project from an empty folder, design its structure, write it test
first, debug it methodically, keep it clean as it grows, store and validate its data, put it online, keep it
secure and ship it; able to read and safely change code they didn't write; and able to direct someone else
(a teammate or an AI) to build parts of it, then review what comes back and reject what's wrong.

## The narrative

One piece of software grows the whole way:

```text
one Python file
    ↓
a program with tests
    ↓
a package
    ↓
an engine and the games built on it
    ↓
an editor
    ↓
a plugin system
    ↓
a client/server system with a database
    ↓
a deployed service
    ↓
a released open-source product
```

Every stage starts with a real problem in the code the learner already has, and the engineering idea is the
fix.

## How every lesson is built: three levels

Each step works at three levels, and the lesson makes all three visible.

| Level | Question | Example (the paddle moves) |
|---|---|---|
| **Build** | What are we making? | Make the paddle follow the arrow keys. |
| **Understand** | What is actually happening? | `pygame.event.get()` empties SDL's queue of messages from the operating system; `key.get_pressed()` reads a table of keys held down right now; the loop runs events, update and draw about 60 times a second. |
| **Engineer** | What general principle did this expose? | Keep the state (the paddle's x) separate from drawing it, so the logic can be tested without a window. |

**Zoom-out sections.** Each chapter ends with **"What did we actually learn?"**: not a summary of the code,
but the concept pulled out of it, and where it appears outside games. After the scene tree: what a tree is,
why trees model so many problems (file systems, web pages, organisation charts, the editor's own widgets),
composition vs inheritance, what an API is. Then the next chapter returns to Forge. Larger turning points
(the engine split, the first editor, the first server) get a whole zoom-out lesson.

## Nine threads through every chapter

### 1. Skills map: where each one is taught

Each skill is taught where it's first needed, then used again in later chapters so it's practised, not just
seen once. Chapter numbers refer to the chapter tables below.

| Skill | First taught | Used again |
|---|---|---|
| Functions, pure functions vs side effects | 2 | everywhere |
| **Testing**: tests after, then tests first, what to test (thread 8) | 2, 3 | every chapter |
| Fixtures, parametrised tests, fakes and mocks | 6, 11 | 34, 36 |
| Property-based testing (Hypothesis) | 12 | 15 |
| **Classes**: `__init__`, `self`, methods, invariants | 3 | everywhere |
| Inheritance and composition, when to use which | 3, 10 | 17, 23 |
| **Dataclasses** | 3 | 15, 19 |
| **Type safety**: type hints, pyright, strict mode, generics (thread 9) | 2, 4 | every chapter |
| Interfaces: Protocols and abstract base classes | 9 | 17, 23, 34 |
| **pydantic**: validating data from outside the program | 5 (after validating by hand hurts) | 15, 33, 34 |
| **Data that outlives the program**: why objects can't just be saved, objects vs tables | 6 | 17, 34 |
| **SQL**: tables, primary keys, `SELECT`, `INSERT`, `UPDATE`, parameters | 6 | 7, 17, 34 |
| Relationships, foreign keys, joins, normalisation, indexes, transactions, concurrent writes | 7 | 17, 34 |
| Migrations, SQLAlchemy, and when not to use an ORM | 17, 34 | 35 |
| Files, paths, JSON, text formats, versioned file formats | 5 | 15 |
| Exceptions, error messages, logging | 5, 11 | 16, 52 |
| Recursion and trees | 10 | 19, 20 |
| Design patterns: state machine, observer, registry, command, plugin | 4, 11, 15, 21, 23 | each reused |
| **Coupling and boundaries**: felt first, then fixed | 8 (the pain), 9 (the fix) | every later chapter |
| Concurrency: threads, processes, a background job queue | 22 | 36 |
| Performance: measuring with cProfile, then optimising | 14 | 52 |
| **Machine learning from first principles**: environments, Q-learning, search, supervised learning, neural networks | 38–42 | 48, 53 |
| NumPy, then PyTorch | 38, 42 | 48 |
| HTTP, REST APIs, FastAPI | 33 | 36 |
| Configuration and environments (dev, test, production) | 5 | 37 |
| Containers and deployment | 37 | 51 |
| **Packaging**: executables, export templates, installers, builds for each OS | 49 | 51 |
| **3D mathematics**: vectors, matrices, projection, quaternions, measured then derived | 26, 29 | 31, 32, 47 |
| **Rendering**: rasterising by hand, then the GPU pipeline and shaders | 27, 28, 30 | 31 |
| **Deep reinforcement learning**: DQN, policy gradients, actor-critic, PPO, search and self-play | 43–46 | 47, 48, 53 |

### 2. Debugging, practised in every chapter

Every chapter has at least one **bug hunt**: a real bug (planted, or met naturally) worked through the same
way each time:

```text
observe → reproduce → form a hypothesis → inspect state → isolate → fix → write a regression test
```

The tools are added a few at a time, each when the bug in front of the learner needs it:

| Chapter | Debugging skill added |
|---|---|
| 0 | reading a traceback from the bottom up |
| 1 | `print` vs a breakpoint; inspecting variables |
| 2 | a failing test as a bug report; the regression test |
| 3 | stepping into and over; `assert` for invariants |
| 5 | a minimal reproduction: cutting a failing level file down to the line that matters |
| 8 | a bug that only appears because two parts share state |
| 11 | logging with levels instead of `print`; following a signal through several nodes |
| 12 | conditional breakpoints; a bug that appears on frame 400 |
| 13 | `git bisect`: finding the commit that broke it; `git revert` |
| 14 | the profiler as a debugger for "it's slow" |
| 22 | bugs that only happen with threads: races, and how to make them reproducible |
| 36 | debugging across two programs: client log, server log, the HTTP exchange between them |
| 37 | debugging from production logs only, without a debugger |

### 3. Security: "who controls this data?"

The security mindset starts as soon as the program reads anything from outside, not in a late chapter. Each
time data enters the program, the lesson asks who controls it and what the worst value could be.

| Chapter | Data from outside | What can go wrong |
|---|---|---|
| 4 | command-line arguments | values out of range, a crash instead of a message |
| 5 | level and settings files | malformed or hostile files; validating at the boundary |
| 6 | saved data | why `pickle` must never load a file you didn't write; SQL injection |
| 16 | game scripts | scripts are code: running one gives it everything your program can do |
| 17 | asset paths | path traversal: `../../` escaping the project folder |
| 23 | plugins | trusting third-party code; what a plugin can touch |
| 35 | users and uploads | passwords, tokens, authentication vs authorisation, upload validation, the OWASP Top 10 tried against your own server |
| 37 | secrets and configuration | keys out of the repository; environment variables |
| 51 | dependencies | the supply chain: pinned versions, `pip-audit` |

### 4. Reading code

Real work is mostly reading: understand 500 lines, change 20 safely. Exercises start early:

| Chapter | Reading exercise |
|---|---|
| 3 | An unfamiliar module, not to be changed: explain what happens when the ball hits the paddle. Checked by predictions. |
| 8 | A deliberately badly designed module: find the coupling. |
| 12 | Read a physics function written in a different style; trace it with real numbers before using it. |
| 19 | Read part of PySide6's documentation and an example, then use a class the lesson hasn't taught. |
| 34 | Read a migration someone else wrote; find what it would do to existing data. |
| 53 | The learner's own Forge subsystem from months earlier: add a feature without breaking it. |

### 5. Directing work: specifying, handing off, reviewing

The user's stated end goal is to direct software, often with an AI writing parts of it. That's a skill of
its own, practised in **hand-off lessons** from Part 2 on, at least one per chapter after Chapter 9. Each runs
the same cycle:

```text
define the problem → state constraints → name the affected modules → write acceptance criteria
→ write the tests → hand it off → read the implementation → run the tests and the architecture checks
→ challenge decisions → reject or accept → refine the specification
```

**Supplied implementations, some of them bad.** So that checks are repeatable, the lesson supplies the
implementation that comes back, written the way an AI pair might write it. Some are good. Many are
plausible and wrong in a way the tests don't catch, and the learner must find out why. For example:

- passes the tests but makes the engine import a game (the dependency check catches it, if the learner wrote one);
- duplicates logic that already exists elsewhere;
- handles the happy path and swallows errors;
- changes a public API that a plugin depends on;
- adds a global variable "to make it work";
- solves the wrong problem, because the spec was ambiguous: the fix is in the spec, not the code.

The learner writes a review, and the check reads it for the specific problem. From Part 5 on, an optional
live hand-off to a real AI uses the same cycle, judged by the learner's tests and architecture checks.

### 6. Agile and git, by doing them

The learner works the way a team does from the first chapter. Each practice arrives when it solves a problem
they've just had.

| First needed in | Practice | The problem it solves |
|---|---|---|
| Ch 1 | **git**: `init`, `add`, `commit`, `log`, `diff`, going back to an earlier commit | "it worked an hour ago and I don't know what I changed" |
| Ch 1 | **user stories and a backlog** (a plain `BACKLOG.md`) | "what do I build next, and when is the game done?" |
| Ch 2 | **definition of done**: tests pass and it's committed | "it mostly works" isn't finished |
| Ch 2 | **test-driven development**: red, green, refactor | changing code without knowing if something else broke |
| Ch 3 | **small commits, good messages**, `git restore`, `git stash` | one huge commit that can't be undone in part |
| Ch 4 | **branches**: one per story, merging, merge conflicts | trying an idea without wrecking the working game |
| Ch 7 | **iterations**: each chapter is a sprint ending in a working release, a tag and a retrospective | a project that's never in a state you could show anyone |
| Ch 9 | **refactoring as a planned story**, technical debt in the backlog | the engine split is too big to do "on the side" |
| Ch 12 | **estimating and splitting stories** | physics turned out three times bigger than expected |
| Ch 13 | `git bisect`, `git revert` | something broke weeks ago |
| Ch 15 | **GitHub**: remote, push and pull, issues, pull requests, reviewing a diff | the project lives on one machine |
| Ch 16 | **continuous integration**: GitHub Actions runs the tests on every push | tests only pass "on my machine" |
| Ch 33 | **a second codebase** and an API contract between the two | two programs that must keep agreeing as both change |
| Ch 51 | **semantic versioning, a changelog, releases, open source** | strangers can't use, trust or help with what they can't understand |

The backlog, the retrospectives, the reviews and the git history are part of the project, and checks read
them.

### 7. Godot's concepts, built by hand on pygame

Every Forge node is a wrapper the learner writes over pygame. Each engine lesson does it in two steps: first
the raw pygame way (surfaces, rects, the event queue, blitting), then the Godot-shaped wrapper, and why it's
worth having.

Forge mirrors Godot's important concepts and vocabulary while staying a small educational engine. GDScript
already uses Python-style `snake_case`, so most names carry over:

| Godot concept | In Forge | Built over pygame's |
|---|---|---|
| `Node`, `Node2D`, `SceneTree`, `get_node`, `add_child`, `queue_free` | the same names | plain Python objects and the game loop |
| `_ready()`, `_process(delta)`, `_physics_process(delta)`, `_input(event)` | the same methods, same order | the loop, `Clock.tick`, the event queue |
| `Sprite2D`, `AnimatedSprite2D`, `AnimationPlayer`, `AudioStreamPlayer` | the same names | `Surface`, `blit`, `subsurface`, `pygame.mixer` |
| `CharacterBody2D.move_and_slide()`, `Area2D`, collision layers and masks | the same names | `Rect` and the learner's own collision code, bitmasks |
| `Camera2D`, `CanvasLayer`, `TileMapLayer` | the same names | offsets when blitting, separate surfaces |
| signals, groups, the Input Map | the same ideas and names | — / `key.get_pressed` and events |
| `Resource`, `PackedScene`, `instantiate()`, autoloads | the same ideas and names | a cache and an import database |
| `.tscn` scenes, `project.godot` settings | Forge's own text formats, designed in Chapter 15 | — |
| `EditorPlugin`, the Asset Library | the same ideas, in PySide6 and FastAPI | — |

Each engine chapter links to the matching Game Studio lesson. Where Forge differs from Godot, the lesson says
how and why. Godot compatibility is a direction, not a requirement: no lesson exists only to match Godot. (Godot itself has no built-in machine learning; the Godot RL Agents plugin is the nearest thing, and Chapter 48 compares with it.)

### 8. Testing: after, then first, and knowing what to test

Testing is learned in the order that makes each step make sense: first the pain of having no tests, then
tests written after the code, then tests written first where that fits. Alongside the mechanics, the series
teaches the judgement: **what** to test, **how much**, and **when test-first is the wrong tool**.

| Chapter | Testing practice | Why here |
|---|---|---|
| 1 | **No tests.** Every change is checked by playing the game by hand. | The learner feels the cost: re-playing level 3 to check one bounce, and a fix that quietly breaks something else. |
| 2 | **Tests after the code.** What a test is (arrange, act, assert), `assert`, how pytest finds and runs tests, reading a failure. **Characterisation tests**: pin down what the code does now, before refactoring it. | The code exists; tests make the coming refactor safe. |
| 3 | **Test-first (TDD)** for new logic with clear rules: scoring, brick hits, lives. Red, green, refactor. **When not to:** drawing and "does this feel right?" code is tried first (a *spike*), and its logic is pulled out and tested after. | The learner now knows what a test looks like, so writing one first is possible. |
| 4 | **What to test:** behaviour, not implementation; edge cases and boundaries; one reason to fail per test; test names that read as specifications. **What not to test:** pygame itself, Python itself, trivial code. | The test suite is big enough to have bad tests in it. |
| 5 | **Parametrised tests**: one test, many cases (every malformed level file). **Coverage**: what it finds, and what 100% doesn't prove. | Many inputs with the same rule. |
| 6–7 | **Fixtures** and **integration tests** against a real throwaway SQLite database, not a fake one. The testing pyramid: many fast unit tests, fewer integration tests, very few end-to-end tests. | The first code that talks to something outside itself. |
| 9 | **Testing through a boundary**: passing in a clock, a random generator or a file system (dependency injection) so tests control them. | The engine split creates the seams that make this possible. |
| 11 | **Test doubles**: fakes, stubs and mocks, what each is, and how over-mocking produces tests that pass while the program is broken. | Signals connect objects; tests need to see the calls. |
| 12 | **Property-based tests** (Hypothesis): state a rule ("a body never ends up inside a wall") and let the library hunt for a counterexample. | Physics has too many cases to list by hand. |
| 13 | **Testing pictures**: checking pixels, and comparing against saved reference images. | Drawing code was the "don't TDD this" case; now it gets tested properly. |
| 18–21 | **GUI tests** with pytest-qt: clicking and typing in tests. Why most editor logic is kept out of widgets so it can be tested without them. | The editor. |
| 22 | **Flaky tests**: tests that pass sometimes, why threads and timing cause them, and how to make them deterministic. | Concurrency. |
| 33 | **Contract tests**: the client and server both test against the written API contract. | Two codebases that must agree. |
| 52 | **Mutation testing** (mutmut): deliberately break the code and see whether any test notices. Measures the tests themselves. | Judging a mature test suite. |

From Chapter 3 on, each new feature's lesson says which approach it uses and **why**: test-first, test-after,
or a spike followed by tests. The capstone asks the learner to choose for themselves.

### 9. Type safety, and a path to C# and Java

Python doesn't make you declare types, but it lets you, and a **type checker** reads those declarations and
reports mistakes before the program runs, as the C# and Java compilers do. Forge is written fully typed and
checked, so the habits carry over: someone who finishes this series should find C# and Java's type systems
familiar, not new.

**The rules:**

- Every function, method and attribute has a type hint from **Chapter 2**, when functions first appear.
- **pyright** checks them from Chapter 2, in **strict mode** from Chapter 4. It's the same checker VS Code's
  Python extension (Pylance) uses, so errors show in the editor as you type, the way a C# IDE shows them.
  (mypy is the other common checker; the lesson mentions it, and the two mostly agree.)
- **"pyright reports no errors" is part of the definition of done**, and CI checks it from Chapter 16.
- `Any`, `# type: ignore` and untyped dictionaries passed around as objects count as bugs to be justified,
  not shortcuts. Where Forge genuinely needs runtime flexibility (loading scenes, the inspector, plugins),
  it's done with typed reflection, and the lesson compares it with reflection in C# and Java.
- **ruff** (from Chapter 3) formats and lints the code, so style is never a discussion.

**Each Python feature is taught with its C# and Java counterpart**, in a short "In C# and Java" note, so the
learner meets each idea once and learns it in three languages:

| Python (where taught) | C# | Java |
|---|---|---|
| type hints, pyright (Ch 2) | static types, the compiler | static types, the compiler |
| classes, `self`, `__init__` (Ch 3) | classes, `this`, constructors | classes, `this`, constructors |
| `@dataclass(frozen=True, slots=True)` (Ch 3) | `record` | `record` |
| `Enum` (Ch 3) | `enum` | `enum` |
| `_private` by convention, `@property` (Ch 3) | `private`, properties with `get`/`set` | `private`, getters and setters |
| `Final`, `Literal` (Ch 4) | `readonly`, `const` | `final` |
| modules and packages (Ch 4) | namespaces and assemblies | packages and modules |
| `None` and `X \| None`, checked by pyright (Ch 4) | nullable reference types, `?` | `Optional<T>`, null checks |
| exceptions (Ch 5) | exceptions | checked and unchecked exceptions |
| pydantic models (Ch 5) | data annotations, model validation | Bean Validation |
| `Protocol` (Ch 9) | `interface` | `interface` |
| `ABC`, `@abstractmethod` (Ch 9) | `abstract class` | `abstract class` |
| dependency injection by hand (Ch 9) | constructor injection, `Microsoft.Extensions.DependencyInjection` | constructor injection, Spring |
| inheritance, `super()`, `@override` (Ch 10) | `: Base`, `base`, `override` | `extends`, `super`, `@Override` |
| generics: `class Pool[T]`, `list[Node]` (Ch 10) | `class Pool<T>`, `List<Node>` | `class Pool<T>`, `List<Node>` |
| `Callable[[int], None]`, bound methods (Ch 11) | delegates, `Action<int>` | functional interfaces, `Consumer<Integer>` |
| `Signal` (Ch 11) | `event` | listeners |
| `NewType` for ids, e.g. `NodeId` (Ch 15) | wrapper types, `readonly struct` | wrapper classes |
| SQLAlchemy 2 typed models (Ch 34) | Entity Framework | JPA / Hibernate |
| FastAPI with pydantic (Ch 33) | ASP.NET Core | Spring Boot |
| pytest (Ch 2) | xUnit, NUnit | JUnit |
| threads, `concurrent.futures` (Ch 22) | `Task`, `async`/`await` | `ExecutorService`, `CompletableFuture` |

Where Python and the other two genuinely differ (a type hint is checked by a tool, not enforced when the
program runs; generics are erased in Java but not in C#), the note says so, so nothing is learned wrong.

## First principles before tools

The principle under the whole series, in the user's words: with only a calculator, you learn to use it, not
mathematics. To develop new mathematics, you need its first principles. The same holds for software and
for machine learning: **you can test an idea with a tool you only know how to use, but you can't have the
idea unless you understand what the tool does.**

So, everywhere in the series, the simple version is built by hand before the tool that does it is used:

| Built by hand first | Then the tool |
|---|---|
| the game loop, rects and blitting in raw pygame | Forge's Godot-shaped nodes |
| validation written by hand | pydantic |
| SQL written by hand | SQLAlchemy |
| HTTP read and written by hand | FastAPI and an HTTP client |
| an import cache and file formats designed by hand | (no tool: Forge's own) |
| Q-learning, the cross-entropy method, logistic regression and a neural network, in plain Python and NumPy | PyTorch |
| an agent that learns, written and understood | Game Studio's Train dialog, and any ML library after this series |

The tool is introduced once the learner knows the job it does, and the lesson shows that the tool's answer
matches theirs. After that, using the tool is a choice made with understanding, not a dependency.

## Two more threads (added 2026-10-04, at the user's request)

**Example games and tutorials, from Part 2 on.** The user wants to learn to build example games and tutorials
the way Game Studio has them. So it isn't saved for Chapter 25: every engine chapter (Part 2) ends with a
small **example game** built on that chapter's feature, in the spirit of Game Studio's examples (Coin Run for
physics, Potion Hunt for tilemaps and the camera, Maze Chase for scenes and signals, Zombie Arena for spawning),
and a short **tutorial** for it that the learner writes: steps, what to try, and a check. Writing tutorials is
technical writing practised a little at a time. Chapter 25 then turns them into Forge's in-editor tutorials
with checks, and Chapter 50 into the *Making Games with Forge* course, so by then the learner has written
a dozen.

**Trace it in CodeLens.** Project Studio's "Trace in CodeLens" button now works for Python files
(`codeLensHandoff.js`), and CodeLens traces pygame-ce code. Lessons with game logic worth stepping through
(bounces, collisions, physics steps, state transitions, recursion over the scene tree) supply a small
self-contained `trace_*.py` file that reproduces the logic in a few frames, and ask the learner to step through
it and answer predictions about what they see. CodeLens traces one file, so trace files don't import the
project's package.

## Forge as a product: what it takes from Game Studio

Forge isn't only an engine for this series. It ships as a product a game maker can pick up, with what Game
Studio gives its users: example games, art to start with, tutorials inside the editor, a reference, a course,
shortcuts, and export.

**Game Studio is still being developed.** So this list is where things stood on 2026-10-04, not a fixed scope.
**Before writing each chapter from Part 3 on, re-read [game-studio-status.md](game-studio-status.md) and the
Game Studio course**, and bring in whatever has been added or changed that applies to a desktop Python engine.
Record what was taken, left out and why in this plan's chapter notes.

| Game Studio has (2026-10-04) | In Forge | Chapter |
|---|---|---|
| Example games (Potion Hunt, Coin Run, Breakout, Maze Chase, Zombie Arena, Tetris), each opening as a new project with a guide beside the viewport | **Four finished example games**, built during the series and shipped in the Project Manager: Breakout (Part 1), a top-down shooter like Zombie Arena (Ch 8), a platformer like Coin Run (Part 2), Tetris (capstone). Each runs headless in CI as an engineering test, as Game Studio's examples do. | 7, 8, 17, 41 |
| Kenney CC0 starter art, with credits | the same packs (CC0 allows it), in the Project Manager, with `CREDITS.md` | 25 |
| Projects dialog: list, thumbnails, create, open | the Project Manager (Godot's name for it) | 25 |
| Menus, toolbar and shortcuts (save, undo, redo, duplicate, delete, frame, run, run scene, stop; W/E/R tools) | the same commands and keys, from one action registry; Help › Keyboard Shortcuts; user-changeable keys | 21, 24 |
| Help › API reference (F1): every class, Godot's name, examples, search, tested against the engine both ways | the same, generated from Forge's docstrings and type hints, with the same two-way tests | 24 |
| Script editor with completion, hover help and errors underlined | a built-in script editor with highlighting and errors that jump to the line, and full completion in VS Code through the typed engine | 24 |
| Help › Tutorials: 18 tasks with steps that tick off, hints, "Back to the lesson" | Help › Tutorials with a task panel, checks against the live project, and hints | 25 |
| The "Building Games with Game Studio" course (33 lessons, Try it cards) | **Making Games with Forge**: the same chapters (first steps, physics, camera and HUD, animation, tilemaps, scenes, Tetris), with Try it links opening Forge's tutorials. Started in Ch 39 as documentation practice; the rest written after the series. | 38 |
| GUI → code: every editor action shown as Scene API code | every editor command can print itself as Python, from the command pattern | 21 |
| Undo, redo, versioned saving with migrations and a problem report | the same | 15, 21 |
| Sprite frames editor, animation timeline, tile palette, Tiled import, Sprite Forge and Tile Mapper import | the same panels; Tiled import; the two labs' export formats | 13, 14, 19 |
| Move/rotate/scale tools, snapping, framing, reparenting that keeps world placement, pixel-art setting | the same | 20 |
| Export: website `.zip`, one `.html` file, project `.zip` | a game `.exe` from export templates; project `.zip` export and import | 37 |
| Run in a sandbox, errors with file and line in Output | the game in its own process, errors with file and line in Output | 21 |
| Train an agent (Q-learning, linear Q, cross-entropy method) on a running game, with a live overlay | built by hand in Part 6, then a Train panel in the editor, trained agents saved as Resources, and agents as playtesters | 31–36 |

## Chapters

Each chapter is a Project Studio track with the prefix `forge-`, grouped as one series in
`src/labs/project-studio/series.js`. Each chapter is also one sprint: stories from the backlog, a bug hunt,
(from Part 2) a hand-off, and a zoom-out at the end. Lesson counts are estimates, about 5 per chapter.

### Part 1 — From script to program (the game: Breakout)

| # | Track | Chapter | What's built | Engineering taught |
|---|---|---|---|---|
| 0 | `forge-tools` | Tools of the trade | an empty project that runs | the terminal, a venv, pinned packages, reading a traceback |
| 1 | `forge-script` | A game in one file | Breakout as one script | the game loop, coordinates, `Rect` collision, held keys vs key presses, delta time; git; a backlog; listing what's wrong with the script |
| 2 | `forge-functions` | Functions you can test | the same game, split into functions | pure functions vs side effects, logic separated from drawing, type hints and pyright, pytest with tests written after the code, characterisation tests, seeded randomness |
| 3 | `forge-classes` | Objects and data | `Ball`, `Paddle`, `Brick`, `Level` | what a class is, `__init__` and `self` traced in memory, invariants, test-first (TDD) and when not to use it, ruff, dataclasses, `Vector2`, enums, composition before inheritance; the first reading exercise |
| 4 | `forge-package` | A real project | the game as a package with a command | modules and what `import` runs, packages, `__main__`, circular imports, `pyproject.toml`, pyright strict, `None` handling, what to test and what not to, game states as a state machine; branches |
| 5 | `forge-data` | Levels are data | levels and settings from files | `pathlib`, text and JSON, validating by hand, then **pydantic** and why, exceptions with useful messages, configuration; "who controls this data?" |
| 6 | `forge-saving` | Data that outlives the program | high scores that survive a restart | why objects can't simply be saved (what `pickle` and JSON each lose, and why `pickle` is unsafe), objects vs tables, **SQL** with SQLite: tables, primary keys, queries, parameters, SQL injection, a throwaway test database |
| 7 | `forge-records` | Players, sessions and statistics | profiles, play sessions, per-level statistics; Breakout ships `v0.1` | relationships and foreign keys, joins, duplication and the bugs it causes (normalisation), indexes measured, transactions, two writes at once; the first sprint review and retrospective |

### Part 2 — The engine, Godot-shaped (the games: a second game, then a platformer)

| # | Track | Chapter | What's built | Engineering taught |
|---|---|---|---|---|
| 8 | `forge-second-game` | A second game | a top-down shooter, made by copying Breakout | **the pain, with no fix yet**: copied code drifting apart, a change that breaks five things, shared state; measuring coupling; reading a badly designed module; asking why it's happening |
| 9 | `forge-engine` | The boundary | an `engine` package; both games rebuilt on it | what knows about what, a boundary, dependency direction checked by a test, then Protocols as the way Python states a boundary, an API as a promise, the first ADR; zoom-out lesson |
| 10 | `forge-nodes` | Nodes and the scene tree | `Node`, `Node2D`, `SceneTree`, `get_node`, `queue_free` | trees and recursion, node paths, local and global transforms, the lifecycle, changing a list while looping over it, inheritance used well; zoom-out: trees everywhere |
| 11 | `forge-input-signals` | Input and signals | the Input Map, `Input`, `Signal`, groups | the observer pattern, bound methods and closures, coupling again, errors in one listener not stopping the rest, mocks, logging |
| 12 | `forge-physics` | Physics | `CharacterBody2D`, `move_and_slide`, `Area2D`, layers and masks | the fixed timestep, overlap tests, pushing out by the smallest overlap, sliding and bouncing, bitmasks, property-based tests |
| 13 | `forge-sprites` | Sprites, animation and sound | `Sprite2D`, `AnimatedSprite2D`, `AnimationPlayer`, `AudioStreamPlayer` | surfaces and pixel formats, frame timing, keyframes and interpolation, the mixer; `git bisect` |
| 14 | `forge-world` | Camera, HUD and tilemaps | `Camera2D`, `CanvasLayer`, `TileMapLayer`, Tiled import | world vs screen coordinates, smoothing and limits, drawing only what's visible, measuring before optimising |
| 15 | `forge-scenes` | Scenes are files | Forge's scene format, `PackedScene`, autoloads, project settings | designing a file format on paper first, pydantic models for it, a registry of node types, versioning and upgrading old files, round-trip tests; GitHub |
| 16 | `forge-scripts` | Scripts on nodes | game behaviour in the project's own `.py` files | `importlib`, reloading code while running, isolating errors in user code, untrusted code; continuous integration |
| 17 | `forge-resources` | Resources and importing | `Resource`, `ResourceLoader`, an import step | caching, file hashes, an import database in SQLite, schema changes (migrations) by hand, path traversal |

### Part 3 — The editor (PySide6, taught as needed, starting tiny)

No Qt lesson stands alone. Each Qt idea is taught at the point the editor needs it, and named so the learner
can find it in Qt's documentation. The first editor is deliberately small; everything after it is earned.

| # | Track | Chapter | What's built | Qt taught here | Engineering taught |
|---|---|---|---|---|---|
| 18 | `forge-editor-tiny` | The smallest editor | open a project, list the scene's nodes, select one, show its properties (read-only) | `QApplication` and its event loop, `QMainWindow`, a layout, `QListWidget`, one signal and slot | a GUI is a loop waiting for events, just like the game; zoom-out lesson: what an editor is (a program that edits another program's data) |
| 19 | `forge-editor-model` | The editor's architecture | the tree panel and an editable inspector | `QTreeView` and a model, form widgets, signals and slots properly | model/view separation; the editor's data vs the engine's running tree; an inspector generated from type hints; reading Qt docs |
| 20 | `forge-editor-viewport` | The viewport | the scene drawn inside the editor; select, drag, zoom, pan | a pygame surface in a `QWidget`, `QTimer`, mouse events, `QPainter` overlays | two event loops made into one; the engine must not import Qt (a test); editor vs game coordinates |
| 21 | `forge-editor-project` | Save, undo and Play | New/Open/Save, undo/redo, Play | `QUndoStack`, `QFileDialog`, `QProcess` | the command pattern, one way to change anything, dirty state, running the game in its own process |
| 22 | `forge-editor-files` | The FileSystem dock | a file browser that imports assets in the background | `QFileSystemWatcher`, `QThreadPool`, signals across threads | **concurrency**: threads, races, a job queue, keeping the UI responsive |
| 23 | `forge-editor-plugins` | Editor plugins | an `EditorPlugin` API and two plugins | menus and docks added at run time | designing a public API, entry points, what you've promised vs what you may change, trusting third-party code |
| 24 | `forge-editor-help` | Shortcuts and help | keyboard shortcuts, Help › Keyboard Shortcuts, Help › API Reference (F1), help from the Inspector, a script editor | one `QAction` per command, `QShortcut`, `QSyntaxHighlighter`, `QTextBrowser` | **one source of truth**: every menu item, toolbar button and shortcut comes from one action registry, so they can't disagree; shortcuts the user can change, saved in settings; documentation generated from docstrings and type hints, and **tested both ways** (every documented name exists, nothing public is undocumented, every example runs); a typed engine (`py.typed`) so VS Code completes Forge's API too |
| 25 | `forge-editor-tutorials` | Tutorials and examples inside Forge | Help › Tutorials with a task panel whose steps tick off as the learner works; a Project Manager with example projects and starter art | `QWizard` ideas, dock panels driven by data | checks as tests run against the live project (the same idea as this series' own checks); tutorials as data, not code; example games run in CI as engineering tests |

### Part 4 — 3D, from first principles (the game: a small 3D game)

pygame only puts flat images on the screen, so 3D is built by hand, the same way Part 6 builds machine
learning: a renderer in plain Python and NumPy first, where every pixel is code the learner wrote, then the
same scenes on the graphics card through **moderngl**, with the hand-written renderer kept as the reference the
GPU's output is tested against. The mathematics (vectors, matrices, projection, quaternions) is measured in
code first and derived after. Game Studio wraps Phaser and is 2D only, so this part goes beyond it. It comes
after the editor so that 3D nodes, resources and a 3D viewport are added to an engine and editor that already
exist.

| # | Track | Chapter | What's built | Engineering and mathematics taught |
|---|---|---|---|---|
| 26 | `forge-3d-space` | Space, vectors and matrices | a wireframe cube that turns, drawn with lines | 3D vectors; the dot and cross products measured, then derived; matrices as transformations; composing transforms; homogeneous coordinates; NumPy arrays for many points at once |
| 27 | `forge-3d-raster` | A renderer by hand | solid models from triangles, drawn in the right order, in software | the camera and perspective projection derived; rasterising a triangle; the depth buffer; back-face culling; profiling, then vectorising with NumPy; why real renderers use the GPU |
| 28 | `forge-3d-light` | Light and surfaces | lit, textured models | normals; diffuse and specular light (Lambert, Phong) measured; textures and UV coordinates; perspective-correct interpolation; colour spaces |
| 29 | `forge-3d-rotation` | Rotation and cameras | an orbit camera and a first-person camera | Euler angles and gimbal lock, met as a bug; quaternions measured, then derived; slerp; look-at; a camera rig in the scene tree |
| 30 | `forge-3d-gpu` | The graphics card | the same scenes drawn by the GPU through moderngl, many times faster | the graphics pipeline; vertex and index buffers; shaders in GLSL, written and debugged; uniforms; the software renderer as the test oracle for the GPU's pictures |
| 31 | `forge-3d-nodes` | 3D nodes | `Node3D`, `Camera3D`, `MeshInstance3D`, `DirectionalLight3D`; meshes loaded from glTF; a 3D viewport in the editor | transforms in a tree, again in 3D; reading a file format someone else designed from its specification; resources shared between 2D and 3D |
| 32 | `forge-3d-game` | A 3D game | a small 3D game (a marble maze) with `CharacterBody3D`, collision and raycasts; its example project and tutorial | bounding volumes, sphere and box tests, raycasting; the 2D physics ideas generalised; testing 3D maths with Hypothesis |

### Part 5 — The Forge Asset Library (a web service)

| # | Track | Chapter | What's built | Engineering taught |
|---|---|---|---|---|
| 33 | `forge-library-api` | An API | a FastAPI server: list, search, download | HTTP (requests, responses, status codes) by hand first, then FastAPI; REST, an API contract written first, pydantic on both sides, API tests; zoom-out lesson: client/server |
| 34 | `forge-library-db` | Its database | assets, versions, tags, ratings | schema design, normalisation again at scale, joins and indexes, SQLAlchemy after raw SQL, migrations with Alembic, when raw SQL is better |
| 35 | `forge-library-users` | Users and security | accounts, uploads, permissions | password hashing, tokens, authentication vs authorisation, checking permissions on the server, validating uploads, the OWASP Top 10 tried against your own server |
| 36 | `forge-library-client` | The editor meets the server | browse and install assets from the editor | an HTTP client, timeouts, retries, errors shown to users, work off the UI thread, debugging across two programs |
| 37 | `forge-library-deploy` | Running it for real | the server running with test and production settings | environment configuration, secrets, logs, database backups, containers (optional) |

### Part 6 — Machine learning, from first principles

Game Studio has a **Train an agent** dialog: the learning is done for the user, like a calculator. Forge is
where the learner builds that learning themselves, from first principles, then puts it into the engine and
editor as a feature. Every method is written by hand (lists first, then NumPy) before any library does it,
and every piece of mathematics is first **measured** in code (a slope measured by nudging a number, an average
measured by simulation) and only then derived. Game Studio's ML code (`src/labs/game-studio/ml/`: the
environment, Q-learning, linear Q, the cross-entropy method, policies, comparison, the training worker and its
overlay) is the reference for what Forge's version must be able to do, and is re-read before each chapter, as
with the rest of Game Studio. Chapters 38–42 reach Game Studio's level; Chapters 43–47 go well past it,
to the methods behind modern game-playing agents (deep Q-learning, policy gradients and actor-critic, PPO,
search with self-play), each still measured and derived by hand before PyTorch is allowed to do the work.

| # | Track | Chapter | What's built | Engineering and mathematics taught |
|---|---|---|---|---|
| 38 | `forge-ml-env` | The game as an environment | any Forge scene wrapped as an environment: observation, action, reward, episode end; a headless fast mode; a random agent as the baseline | the agent loop is the game loop; Gymnasium's interface and why it's shaped that way; seeds and repeatability; probability by simulation; averages, variance and the standard error, measured first; NumPy arrays, built up from lists |
| 39 | `forge-ml-qlearning` | Learning to act | a Q-learning agent that learns to play Breakout | the running average and the step size; bandits and explore vs exploit; states from numbers (bins); Q-learning written by hand; judging an agent honestly (greedy runs, many seeds, error bars); zoom-out: what Game Studio's Train dialog was doing |
| 40 | `forge-ml-search` | Learning without gradients | a policy evolved with the cross-entropy method; linear Q-learning with features | a policy as a function with numbers inside it; random search, then the cross-entropy method; features instead of tables; when a method needs no maths about the game at all |
| 41 | `forge-ml-data` | Learning from data | **record your own play** into SQLite; a bot that imitates you | supervised learning: datasets, features and labels, train/test split; a straight-line model and logistic regression **from scratch**; the gradient measured by nudging, then derived; gradient descent; overfitting, measured; evaluation you can trust; the dataset in SQL (Chapters 6–7 again) |
| 42 | `forge-ml-neural` | Neural networks | a small network written in NumPy, then the same network in PyTorch; a network policy for the platformer | layers, activations, the forward pass; backpropagation derived and checked against measured gradients; why PyTorch exists, once its job is known (automatic gradients, the GPU); Q-learning with a network (DQN) and why it's unstable |
| 43 | `forge-ml-dqn` | Deep Q-learning | a DQN agent that learns Breakout from the game's numbers, then from its pixels | a network as the Q-function; why naive training diverges, measured; the replay buffer and the target network; frame stacking; reading training curves honestly (seeds, variance) |
| 44 | `forge-ml-policy` | Learning the policy directly | REINFORCE, then actor-critic, on the platformer | the policy gradient measured, then derived (the likelihood-ratio trick); baselines and variance; the advantage; entropy |
| 45 | `forge-ml-ppo` | PPO | a PPO agent trained on many copies of the game at once | why large policy steps break learning, measured; the clipped objective; generalised advantage estimation; environments in parallel processes; hyperparameters and ablations |
| 46 | `forge-ml-selfplay` | Search and self-play | Monte Carlo tree search, then a small AlphaZero-style agent that teaches itself a board game | game trees and minimax; MCTS and UCB; a network guiding the search; self-play and its pitfalls; measuring strength with matches and Elo ratings |
| 47 | `forge-ml-3d` | Agents in 3D | an agent that learns Part 4's 3D game | designing observations (raycasts vs pixels); reward shaping and its traps; curriculum learning; comparing methods fairly |
| 48 | `forge-ml-in-forge` | Machine learning as a Forge feature | a **Train** panel in the editor (training in a background process, live chart, pause and stop); trained agents saved as Resources; an `Agent` node scripts can use; agents as automated playtesters that measure a level's difficulty; exported games that include a trained agent | training as a long-running job (Chapter 22 again); a model as a versioned file; ML behind a plugin API (Chapter 23 again); zoom-out lesson: **applying ML to a project**: when it's the right tool, when a hand-written rule is better, and how to test an idea of your own |

The rl-pygame track and the Machine Learning series go deeper into each method. This part is complete on its
own, and links to them for the learner who wants more.

### Part 7 — Shipping and open source

| # | Track | Chapter | What's built | Engineering taught |
|---|---|---|---|---|
| 49 | `forge-export` | Export, like Godot | **Project › Export**: the editor turns a project into a standalone game `.exe` that runs on a computer without Python | what "freezing" a Python program means (PyInstaller: an interpreter, your code and its libraries bundled into one program), **export templates** built once and reused, packing the project into one data file (Godot's `.pck`), finding your files from inside a frozen program, export presets, why a Windows build can't be made on a Mac (build machines per OS in CI), antivirus and SmartScreen warnings and code signing; zoom-out: build vs run time |
| 50 | `forge-docs` | Documentation and the Forge course | the Forge manual and the start of **Making Games with Forge**, a course whose "Try it" links open Forge's own tutorials; a docs website | docs as code (MkDocs), the four kinds of documentation (tutorials, how-to guides, reference, explanation) and why mixing them fails, writing for a reader who isn't you, code examples in the docs run as tests, screenshots generated by a script so they never go stale |
| 51 | `forge-release` | Releasing Forge | the Forge editor as its own `.exe` and installer, published on GitHub Releases | packaging the editor (with Qt) vs the game runtime, an installer, semantic versioning, changelog, licence, README, CONTRIBUTING, dependency auditing, builds for Windows, macOS and Linux from CI |
| 52 | `forge-health` | Keeping it healthy | a quality dashboard for the codebase | strict type checking, linting, coverage and what it doesn't tell you, profiling, measuring rot with numbers |
| 53 | `forge-capstone` | Capstone | Tetris in Forge's editor, exported as a game `.exe`, with a trained agent that plays it; a feature added to your own months-old code; then a game and a plugin of your own, published to your library | the whole series, with no tests supplied for the second half; one full hand-off cycle directed by the learner |

54 chapters (0–53), about 270 lessons. Lessons can be inserted later without renumbering (for example `03-04-…` between `03-03`
and `03-05`). A lesson's progress key is its file name, so a published file is never renamed.

## Teaching, not describing

The user's most important requirement. It's easy to write a lesson that **describes** code: it says what each
part is for, the learner types it, the check passes, and the learner couldn't write it again. A lesson
**teaches** when the learner comes out able to reproduce the idea, change it, and explain why each line is
there.

The same code, both ways:

> **Describing:** "`clock.tick(60)` keeps the game at 60 frames per second."
>
> **Teaching:** "60 frames a second is one frame every 1000 / 60 ≈ 16.7 ms. `tick` measures how long has
> passed since its last call, the time this frame's work took, say 3 ms, and asks the operating system not to
> run the program for the other 13.7 ms. It returns the milliseconds since the last call. If the work took
> 20 ms, there's nothing to sleep, and the game simply runs slower than 60. *Predict:* remove the `tick` call.
> What happens to the processor?" Then the learner runs it, and later uses the returned value themselves.

### What every new idea gets

Every new construct, call, pattern or practice must have all of these. A lesson reviewer checks them one by
one.

1. **The real name and a precise definition**, in the words the field uses, so the learner can search for it,
   read documentation and talk to other engineers.
2. **The mechanism**: what the computer actually does, step by step, not just what the code is for. For a
   call, what goes in, what happens, what comes out. For a pattern, which object calls which, in what order.
3. **A trace with real values** for anything with more than one step: a table or step list showing the
   variables changing.
4. **The reason**: why it's written this way, and what goes wrong otherwise. Where it's cheap, the wrong
   version is run so the learner sees the failure.
5. **The learner uses it**: a prediction before running, then a step where they write or change something
   with it themselves, without the code shown (see "Your turn" below).
6. **The general principle** (the Engineer level): what this teaches beyond this line of Forge.

### Analogies: helpers only

- The definition and mechanism come **first**. An analogy may follow, marked *Picture it as*.
- It must say **where it stops matching** the real thing.
- **The deletion test:** if every analogy were deleted from the lesson, the explanation must still be
  complete and correct. If deleting one leaves a gap, the gap is an explanation that's missing, and it's
  written before the lesson ships.
- No analogy is used to avoid a hard part. Hard parts get more mechanism, not more metaphor.

### "Your turn": proving it was taught

Typing given code proves nothing. Every lesson has at least one **Your turn** step: a task using the lesson's
ideas, stated as a story with tests, and **no code shown**. For example, after the paddle moves with the
arrow keys: "the paddle speeds up while Shift is held". The check runs the learner's code. Hints are
available, and the full answer is shown only after the check passes or the learner asks for it.

As the series goes on, Your turn steps grow from a few lines (Part 1) to whole features from an empty file
(Part 2 on) to features the learner specifies themselves (the capstone).

### Struggle without getting stuck

The struggle is where skill is built, so the series has a lot of it. But no exercise may stop the learner
from finishing the series. Three kinds of exercise, each with a rule that keeps it from blocking:

| Kind | Where | How hard | Why it never blocks |
|---|---|---|---|
| **Your turn** | every lesson, on the main path | sized to be solvable with what the lesson taught | a hint ladder ending in the full answer; and the **next step's code already contains the reference solution**, so a learner who moves on still has a working project |
| **Bug hunt** | every chapter, on the main path | a real bug, found with the debugging method | the same hint ladder; the fix is shown after an honest attempt |
| **Challenge** | end of most lessons and chapters, optional | harder: real struggle, stretching past the lesson | the main path **never depends on challenge code**; challenges are done on a git branch (from Chapter 4), so they never disturb the main project |

**The hint ladder.** Hints come one rung at a time, and each rung gives away a little more:

1. a nudge: re-read this part of the lesson; what does the failing test expect?
2. the concept: which idea from the lesson solves it, and why;
3. the shape: the structure of the answer, without the code;
4. the answer, with an explanation of why it's written that way.

Each lesson suggests a time to try before the first hint (about 10 minutes for Your turn, longer for
challenges). The learner can always take a hint sooner: the ladder exists so they take only as much help as
they need, not so they suffer.

**Challenges are a list to come back to.** Each chapter's zoom-out lists its challenges with a difficulty
(★ to ★★★). A learner who skips them can finish the series and return later. Some later challenges build on
earlier ones, and say so.

**Needed in Project Studio:** the `Next step` button is already never locked by checks. The hint ladder
(hints revealed one at a time) and a challenge marker (shown as optional, kept off the main-path progress)
are small additions to `LessonPanel.jsx` and `parseTrack.js`, built before the first lesson that uses them.

### Lesson review checklist

Before a lesson ships, it's read against this list, and any "no" is fixed:

- [ ] Every new term has its real name and a precise definition before anything else.
- [ ] Every new construct has its mechanism, not just its purpose.
- [ ] Every multi-step mechanism has a trace with real values.
- [ ] Every "why" is answered, with the failing alternative shown where possible.
- [ ] Every analogy is marked, says where it breaks, and passes the deletion test.
- [ ] There's at least one prediction and at least one Your turn step with no code shown.
- [ ] No exercise blocks the main path: Your turn and bug-hunt answers are in the next step's code, and no
      main-path step uses challenge code.
- [ ] The chapter's zoom-out names the general principle and where it appears outside games.
- [ ] No sentence says only *what* code does where the learner needs *how* or *why*.

## How lessons are written

These are the rl-pygame and ML series rules, plus what the user asked for this series. "Teaching, not
describing" above comes first; these add to it.

- **Build, understand, engineer.** Every step makes all three levels visible (see above), and every chapter
  ends with a zoom-out that pulls the general concept out of the Forge code.
- **Only basic scripting is assumed.** Anything beyond the list in "Who it's for" is taught where it first
  appears. This series doesn't depend on any other.
- **Problem first, felt before fixed.** Each idea arrives because the project can't go on without it. For big
  ideas (boundaries, normalisation, concurrency) the learner lives with the problem for a whole step or
  chapter before the fix, and the vocabulary comes after the need.
- **Under the hood, then the wrapper.** pygame before Forge's nodes, validation by hand before pydantic, raw
  SQL before SQLAlchemy, HTTP by hand before FastAPI.
- **Transferable.** Every practice is taught under its real name, as it's done in industry.
- **Hands in the code.** The learner types everything, makes design decisions in exercises (with the
  lesson's choice explained afterwards), and from Part 2 on starts some features from an empty file with only
  a story and tests.
- **Every step runs.** Small steps, each checked by **Check my work** against the learner's real files.
- **Tests follow thread 8:** none in Chapter 1 (so their absence is felt), written after the code in Chapter
  2, test-first from Chapter 3 where it fits. Supplied tests are always read and explained first; the
  learner writes more of their own each chapter, and the capstone's second half has none supplied.
- **Typed from Chapter 2,** checked by pyright, strict from Chapter 4 (thread 9).
- **Predict before running,** with a `verify:` command wherever the answer is a number or printed output.
- **Measure every number the text quotes.**

## Technical decisions

- **pygame-ce 2.5.8, Python 3.12 or newer**, same as rl-pygame. 3.12 also gives the new generics syntax
  (`class Pool[T]:`) and `typing.override`.
- **Tooling, each pinned when first installed:** pytest (Ch 2), pyright (Ch 2), ruff (Ch 3), pytest-cov
  (Ch 5), Hypothesis (Ch 12), pytest-qt (Ch 18), httpx with FastAPI's test client (Ch 33), mutmut (Ch 52), PyInstaller (Ch 49), NumPy (Ch 38), PyTorch (Ch 42), moderngl (Ch 30).
  Type checking and tests run in CI from Chapter 16.
- **PySide6** (Chapter 18), **pydantic v2** (Chapter 5), **SQLite** (standard library, Chapter 6),
  **FastAPI** (Chapter 33), **SQLAlchemy 2** and **Alembic** (Chapter 34), each pinned in the chapter that
  installs it. PySide6 and pygame-ce are LGPL, which allows Forge to be released under any open-source
  licence; the licence is chosen in Chapter 51.
- **The engine never imports Qt, and never imports a game.** Tests the learner writes check both.
- **The game runs in a separate process when launched from the editor** (Chapter 21), for the same reason
  Game Studio runs games in an iframe: the editor survives whatever the game does.
- **The asset library server is its own repository** (Chapter 33).
- **Hand-off implementations are supplied files**, so checks are repeatable. A learner's review is checked
  for the specific problem in each one. Live AI hand-offs are optional extras from Part 5 on.
- **pytest** for checks, with SDL's dummy drivers so tests run with no window; Qt checks use the `offscreen`
  platform; server checks use FastAPI's test client and a throwaway database.
- **git runs in the learner's own project folder**, never in this repository. Checks read the learner's
  history.
- **Export works the way Godot's does.** Godot ships prebuilt *export templates* (the engine with no editor),
  and exporting copies a template and packs the project's scenes and assets into a `.pck` file beside it or
  inside it. Forge does the same: a game runtime (the engine, no Qt, no editor) is frozen once with
  PyInstaller into a template `.exe`; **Project › Export** copies it and packs the project into a single data
  file it reads at start-up. Exporting is fast, needs no Python on the player's computer, and the exported game
  can't contain the editor, because the engine never imports Qt (checked since Chapter 20). Earlier chapters
  prepare for this: assets are always loaded through `ResourceLoader` with project-relative paths (Ch 17), so
  the same code reads from the project folder or from the packed file.
- **Executables for each operating system.** PyInstaller only builds for the system it runs on, so Windows,
  macOS and Linux builds come from CI build machines (GitHub Actions), as real projects do. The learner's own
  machine builds the Windows `.exe` directly.
- **Containers are optional** in Chapter 37; the server runs without them and the lesson shows both.
- **Verification** follows rl-pygame: a `forge-*.walkthrough.js` per track and a desktop test that walks it
  like a learner, typing each step, running each check, and trying wrong answers that must fail.

## Open questions for the user

- The name. Working title: **"Forge — Learn Software Engineering by Building a Game Engine in Python"**.
- Part 1's game. Breakout is chosen: small, but it needs collision, levels as data, game states and saved
  scores.
