---
title: 8.1 — A Copy to Start From
track: Forge — A Second Game
trackOrder: 38
runtime: python
run: shooter/__main__.py
---

Breakout 0.1.0 is released. Part 2 of the series builds an engine: the code every game needs, written once, with games built on top of it, the way Godot's games are built on Godot. But an engine designed before there's a second game is a guess at what games share. So this chapter makes the second game first, the fastest way there is: **copy Breakout, then change the copy**. The game is an arena shooter, like Game Studio's Zombie Arena: you stand in the middle of the screen, move in eight directions, aim with the mouse, and shoot the zombies that walk in from the edges.

Copying works, and quickly. The chapter's real subject is what it costs afterwards: two copies of the same code, changing apart. You'll build the shooter in lessons 8.1 to 8.4, feel what the copy does to you in 8.5, measure it in 8.6, and ask why in 8.7. Nothing gets fixed in this chapter. That's deliberate: the fix, an engine, is Chapter 9, and it only makes sense once you've felt the problem it solves.

## Where Breakout stands

**Build:** nothing. Check that the project is where lesson 7.8 left it.

```check
run ".venv/Scripts/python -m pytest -q" stdout="146 passed"
run "git describe --tags" stdout="v0.1.0" label="the release is tagged v0.1.0" -- Lesson 7.8's step "The release, tagged" made the tag: git tag -a v0.1.0 -m "...".
git-clean
```

`git describe --tags` prints `v0.1.0-1-g` and a hash: one commit, the retrospective, after the release. Every commit from here on is work towards the next release.

## A copy of the package

**Build:** `shooter`, a copy of the `breakout` package.

Copying a working program and changing it is how a lot of software starts: a team copies another team's service, a game studio starts its next game from its last one. It's quick because everything already works on day one. In PowerShell, `Copy-Item -Recurse` copies a folder and everything in it:

```powershell
Copy-Item -Recurse breakout shooter
Get-ChildItem shooter
```

`shooter` holds the same files as `breakout`: `__init__.py`, `__main__.py`, `app.py`, `config.py`, `draw.py`, `level.py`, `model.py`, `report.py`, `scores.py`, `settings.py`, the `levels` folder, and `__pycache__`, the bytecode Python compiled from them (lesson 1.2). The bytecode does no harm, because Python checks it against the source before using it, and `.gitignore` already ignores `__pycache__/` everywhere.

A package with a `__main__.py` can be run with `python -m` (lesson 4.1), so the copy should run too:

```predict
question: What does .venv\Scripts\python -m shooter --test-run 60 print?
choice: An error: there's no shooter game yet
choice: Breakout's summary, from the copy's code in shooter
choice: Breakout's summary, from the original code in breakout
answer: Breakout's summary, from the original code in breakout
explain: `python -m shooter` runs `shooter/__main__.py`, a copy of `breakout/__main__.py`, whose one import is `from breakout.app import run`. It names the **original** package, so the copy's first act is to run Breakout's own `app.py`, which imports Breakout's own `model.py`, and so on. The copy's `app.py`, `model.py` and the rest never run at all.
```

```powershell
.venv\Scripts\python -m shooter --test-run 60
```

```text
frames=60 paddle_x=270 score=10 lives=3 bricks=39 inside=True
```

Breakout's summary, exactly. To see **which** code ran, ask Python. Every module knows the file it was loaded from, `__file__`, and every class knows the name of the module it was defined in, `__module__`:

```powershell
.venv\Scripts\python -c "import shooter.app; print(shooter.app.__file__); print(shooter.app.Game.__module__)"
```

```text
C:\Users\you\Documents\forge\shooter\app.py
breakout.model
```

The copy's `app.py` was loaded, but the `Game` class it uses was defined in `breakout.model`. Traced, `import shooter.app` goes:

| Python reads | and does |
|---|---|
| `import shooter.app` | finds the folder `shooter` in the current folder, runs `shooter/__init__.py`, then `shooter/app.py` |
| `from breakout.config import ...` (in `shooter/app.py`) | finds `breakout`, the original package, and runs `breakout/config.py` |
| `from breakout.model import ... Game ...` | runs `breakout/model.py`, and gives `shooter.app` Breakout's own `Game` |

**Understand.** `from breakout.model import Game` is an **absolute import**: it names the module by its full path from the top-level package, the kind lesson 4.1 chose. Absolute imports always mean the same thing, wherever the file that contains them is, which is why the Python style guide, PEP 8, recommends them. That's exactly why they don't follow a copy: the copied line still means "Breakout's model". Python also has **relative imports**, `from .model import Game`, where the dot means "the package this file is in"; those **would** follow the copy. Forge keeps absolute imports, because a line that names its package says where the code comes from to anyone reading the file on its own. The cost of that choice shows up today, once.

**Engineer.** A copy isn't independent just because the files are separate. Whatever a copied file **names** (a package, a folder, a file on disk, a database) still points at the original until someone changes it. Before trusting a copy, find out what it refers to.

```check
file shooter/__main__.py -- Copy the package: Copy-Item -Recurse breakout shooter
run ".venv/Scripts/python -m shooter --test-run 60" stdout="frames=60" label="python -m shooter runs"
```

## Imports that point home

**Build:** every import in the copy that names `breakout` names `shooter` instead.

First, find every place the copy mentions Breakout. `Select-String` is PowerShell's text search (the same job as `grep` on Linux and macOS). It prints each matching line as `file:line number:text`, and it ignores upper and lower case unless told otherwise:

```powershell
Select-String -Path shooter\*.py -Pattern "breakout"
```

```text
shooter\__init__.py:1:"""Breakout: the game built through the Forge series."""
shooter\__main__.py:1:from breakout.app import run
shooter\app.py:10:from breakout.config import KEYS, Config, ConfigError, load_config
shooter\app.py:11:from breakout.draw import draw
shooter\app.py:12:from breakout.level import LEVELS, LevelError, load_level
shooter\app.py:13:from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
shooter\app.py:14:from breakout.scores import Score, add_score, best, end_session, open_scores, start_session
shooter\app.py:15:from breakout.settings import Hold, parse_args
shooter\app.py:29:        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
shooter\app.py:37:        print(f"breakout: {level_file}: {error}", file=sys.stderr)
shooter\app.py:44:        scores_file = Path(pygame.system.get_pref_path("forge", "breakout")) / "scores.db"
shooter\app.py:54:            print(f"breakout: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
shooter\app.py:59:    pygame.display.set_caption(f"Breakout: {level.name}")
shooter\draw.py:3:from breakout.model import Game, GameState
shooter\draw.py:10:    GameState.TITLE: "BREAKOUT: press Space to play",
shooter\level.py:8:from breakout.model import BRICK_GAP, BRICK_HEIGHT, BRICK_WIDTH, ROW_COLOURS, WALL_LEFT, WALL_TOP, Brick
shooter\report.py:3:usage: python -m breakout.report SCORES_DB                  every level, one line each
shooter\report.py:4:       python -m breakout.report SCORES_DB LEVEL            how the level's games have gone
shooter\report.py:5:       python -m breakout.report SCORES_DB LEVEL --forget   delete the level's scores
shooter\settings.py:42:        prog="breakout", description="Play Breakout. A test run lets another program play it."
```

Twenty lines, of two kinds. Nine are **imports**, `from breakout.`: code that decides which code runs. The rest are **names**: what the copy calls itself to a player, and where it keeps its things. This step fixes the imports; the names are this lesson's Your turn.

In the editor, open each of the four files with imports, `shooter/__main__.py`, `shooter/app.py`, `shooter/draw.py` and `shooter/level.py`, and replace `from breakout.` with `from shooter.` (the editor's Replace, `Ctrl+H`, does a whole file at once; keep the final dot in what you search for, so only imports change). Then check what the shooter loads now. `sys.modules` is Python's record of every module imported so far in this run, a dictionary from each module's name to the module itself (lesson 4.2's architecture tests read it):

```powershell
.venv\Scripts\python -c "import sys, shooter.app; print(sorted(name for name in sys.modules if name.startswith('breakout')))"
.venv\Scripts\python -m shooter --test-run 60
```

```text
[]
frames=60 paddle_x=270 score=10 lives=3 bricks=39 inside=True
```

Nothing from `breakout` is loaded, and the copy plays exactly the game the original played, to the pixel, because it is the same code. At this moment the project holds two complete Breakouts.

```check
run ".venv/Scripts/python -c \"import sys, shooter.app; print(sorted(name for name in sys.modules if name.startswith('breakout')))\"" stdout="[]" label="importing the shooter loads nothing from breakout" -- One of the four files still says from breakout.: Select-String -Path shooter\*.py -Pattern "from breakout" finds it.
run ".venv/Scripts/python -m shooter --test-run 60" stdout="frames=60 paddle_x=270 score=10 lives=3 bricks=39 inside=True" label="the copy plays the same game, from its own code"
```

## What in the copy is really Breakout?

**Build:** remove the one module the shooter will never use.

Over the next three lessons the copy becomes a shooter. Before changing anything, read what you copied, module by module, asking one question: **what in here is about Breakout, and what would any game need?**

| Module | Lines | About Breakout | Any game would need |
|---|---|---|---|
| `settings.py` | 75 | `--hold left/right/auto` steers a paddle; `--level` picks a wall | a test run, a seed, a settings file, scores, a player's name |
| `config.py` | 80 | the four actions: left, right, serve, pause | keys a player chooses, checked with a clear message |
| `scores.py` | 157 | | everything: players, sessions, scores, migrations, locks |
| `model.py` | 168 | the ball, the paddle, bricks, and Breakout's rules in `Game` | the four game states, `clamp` |
| `draw.py` | 30 | bricks, paddle and ball | the status line, the centred message |
| `level.py` | 88 | walls of bricks | files of levels, checked by pydantic |
| `app.py` | 124 | which level, the autopilot, the paddle in the summary | the loop, frame timing, events, a test run, saving scores |
| `report.py` | 73 | per-level statistics for Breakout's level designers | |

```predict
question: Which of the copied modules has nothing in it that's about Breakout?
choice: settings.py
choice: scores.py
choice: app.py
choice: draw.py
answer: scores.py
explain: `scores.py` knows about players, sessions, levels by name and points, and nothing about balls or bricks. Every line of it would serve the shooter unchanged. Hold on to that: the shooter will soon own a second, separate copy of 157 lines that were never about Breakout at all.
```

The shooter has a single arena, not a set of levels, so the level designers' report has nothing to compare. Keeping it would mean a second copy that nobody uses but somebody has to maintain. Delete it:

```powershell
Remove-Item shooter\report.py
```

The other Breakout-only parts, the model, the levels and the drawing, get replaced over the next three lessons, one piece at a time, each step leaving a game that runs.

**Engineer.** The table you just read is the first draft of a **boundary**: the line between what a program is about and the machinery any program like it needs. Here it's only in your head. Lesson 8.7 writes it down, and Chapter 9 turns it into code.

```check
missing shooter/report.py -- Remove-Item shooter\report.py
```

## A second entry point

**Build:** install the shooter as a command, `shooter`, next to `breakout`.

`python -m shooter` works from the `forge` folder, but not because the shooter is installed. Try it from another folder. `$forge = Get-Location` saves the current folder in a variable first, so the commands can still find the project's Python:

```powershell
$forge = Get-Location
Push-Location $env:TEMP
& "$forge\.venv\Scripts\python" -m breakout --test-run 1
& "$forge\.venv\Scripts\python" -m shooter --test-run 1
Pop-Location
```

```text
frames=1 paddle_x=270 score=0 lives=3 bricks=40 inside=True
C:\Users\you\Documents\forge\.venv\Scripts\python.exe: No module named shooter
```

(`&` is PowerShell's **call operator**: it runs the program named by the string after it, here a path built from `$forge`. `Push-Location` and `Pop-Location` are lesson 7.8's.)

`python -m` searches the folders in `sys.path`, the module search path. With `-m`, the first of those folders is the current one, so from `forge` Python found the `shooter` folder simply because you were standing next to it. Breakout works from anywhere because lesson 4.3 **installed** it: `pip install -e .` registered the packages listed in `pyproject.toml` with the virtual environment, wherever you run from. The shooter isn't listed. Add it to the packages, and give it a command of its own:

```toml file=pyproject.toml
[project]
name = "breakout"
version = "0.1.0"
description = "Breakout, built through the Forge series."
requires-python = ">=3.12"
dependencies = ["pygame-ce==2.5.8", "pydantic==2.13.5"]

[project.scripts]
breakout = "breakout.app:run"
shooter = "shooter.app:run"

[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["breakout", "shooter"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = ["--strict-markers"]
markers = ["slow: plays the game in a new Python process"]

[tool.ruff]
line-length = 120

[tool.ruff.lint]
# On top of ruff's default rules: S608 finds SQL built from strings (lesson 6.4).
extend-select = ["S608"]

[tool.pyright]
venvPath = "."
venv = ".venv"
typeCheckingMode = "strict"

[tool.coverage.run]
patch = ["subprocess"]
```

- **`packages = ["breakout", "shooter"]`**: the packages this project installs. One project can install several, and both games still come from this one `pyproject.toml`, one version number and one set of dependencies. The project's `name` is still `breakout`, which no longer describes it; lesson 8.7 comes back to that.
- **`shooter = "shooter.app:run"`**: like lesson 4.3's `breakout` entry: a command called `shooter` that imports `shooter.app` and calls its `run` function.

Both are read only when the project is installed, so install it again:

```powershell
.venv\Scripts\python -m pip install -e .
.venv\Scripts\shooter --test-run 60
```

```text
Successfully installed breakout-0.1.0
frames=60 paddle_x=270 score=10 lives=3 bricks=39 inside=True
```

pip has written a second launcher, `.venv\Scripts\shooter.exe`, next to `breakout.exe`. (If you skip the reinstall, `shooter` isn't a command at all: the launcher is made at install time.)

```check
run ".venv/Scripts/shooter --test-run 60" stdout="frames=60" label="the shooter is a command" -- Add shooter = "shooter.app:run" under [project.scripts], then reinstall: .venv\Scripts\python -m pip install -e .
run ".venv/Scripts/python -c \"import os; os.chdir(os.environ['TEMP']); import shooter.app; print('found', shooter.app.__name__)\"" stdout="found shooter.app" label="Python finds the shooter from any folder" -- List "shooter" in packages under [tool.setuptools], then reinstall.
```

## The definition of done, for two games

**Build:** pyright checks the shooter too.

Lesson 7.8's backlog says when a story is done: the tests pass, pyright reports no errors on `breakout tests replay.py`, ruff is clean, and the work is committed. ruff checks the whole folder, `.`, so it already covers the shooter; pyright is told which folders to check, and the shooter isn't one of them. In `BACKLOG.md`, change `pyright breakout tests replay.py` to `pyright breakout shooter tests replay.py`, and run it:

```powershell
.venv\Scripts\python -m pyright breakout shooter tests replay.py
```

```text
0 errors, 0 warnings, 0 informations
```

No errors: the copy is Breakout, and Breakout was already clean. The command checks the shooter from now on, so the moment a change makes the two copies disagree in a way types can see, pyright will say so.

```check
contains BACKLOG.md "pyright breakout shooter tests replay.py" -- In the definition of done near the top of BACKLOG.md, add shooter to the pyright command.
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
```

## Your turn: a copy with its own name

**Build, on your own:** everywhere the copy still calls itself Breakout to a player, or keeps its things in Breakout's places, it uses its own name.

The rest of the `Select-String` list is yours. Most of it is cosmetic, but one line isn't: it decides **where the shooter keeps its scores**. Find it, and work out what would happen to Breakout's best scores if both games kept that line as it is.

| What | Result |
|---|---|
| `.venv\Scripts\shooter --help` | starts `usage: shooter`, and the description says it plays the shooter |
| `.venv\Scripts\shooter --test-run 5 --level nowhere.json` | reports `shooter: nowhere.json: ...` on standard error, and exits with 1 |
| the shooter's scores | kept in a folder of the shooter's own, not Breakout's |
| the window's title | `Shooter: ` and the level's name |
| the title screen | `SHOOTER: press Space to play` |
| `shooter/__init__.py` | describes the shooter, not Breakout |

When `Select-String -Path shooter\*.py -Pattern "breakout"` finds no line that a player would see or that decides where something is kept, and every check is clean, commit everything (the copy, `pyproject.toml` and `BACKLOG.md`) with a message that mentions the **shooter**.

```hints
nudge: Go down the `Select-String` list from the "Imports that point home" step, skipping the imports you've already changed and `report.py`, which is gone. Each remaining line is one change. For the scores, read lines 42 to 44 of `shooter/app.py`: which folder does `get_pref_path` return, and what file is in it?
concept: `pygame.system.get_pref_path("forge", "breakout")` (lesson 6.1) returns the folder the operating system keeps for the application named `breakout` by the organisation `forge`: the same folder for any program that asks with those two names. Left as it is, both games would open the same `scores.db`. Both have levels called Classic, so a shooter score on Classic would count as Breakout's best on Classic. The two programs would share **state through the file system**, with nothing in either program's code to show it.
shape: Eight changes in four files: the `prog` and `description` in `shooter/settings.py`; three error messages, the `get_pref_path` call and the window title in `shooter/app.py`; the title message in `shooter/draw.py`; the docstring in `shooter/__init__.py`. Then `git add .` and one commit.
answer: In `shooter/settings.py`:

~~~python
    parser = argparse.ArgumentParser(
        prog="shooter", description="Play the shooter. A test run lets another program play it."
    )
~~~

In `shooter/app.py`, the three messages start `shooter: ` instead of `breakout: `, and:

~~~python
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
...
    pygame.display.set_caption(f"Shooter: {level.name}")
~~~

In `shooter/draw.py`, `GameState.TITLE: "SHOOTER: press Space to play",`, and in `shooter/__init__.py`:

~~~python
"""The shooter: a second game, started as a copy of Breakout."""
~~~

Then:

~~~powershell
git add .
git commit -m "Copy Breakout to start a shooter, with a name and a scores folder of its own"
~~~

The scores folder is the change that matters. The others are about what a player reads; that one is about what the two programs **share**. Two programs that write to the same file are coupled even though neither imports the other, and no import search will ever find it.
```

```check
run ".venv/Scripts/shooter --help" stdout="usage: shooter" label="the shooter's help names the shooter" -- Change prog= in shooter/settings.py.
run ".venv/Scripts/shooter --test-run 5 --level nowhere.json" exit=1 stderr="shooter: nowhere.json" label="its error messages name the shooter" -- The messages printed to sys.stderr in shooter/app.py start with "breakout: ".
lacks shooter/app.py "\"forge\", \"breakout\"" -- The shooter's scores still go in Breakout's folder: look at the get_pref_path call in shooter/app.py.
lacks shooter/app.py "Breakout: " -- The window's title is set with pygame.display.set_caption.
contains shooter/draw.py "SHOOTER: press Space to play"
lacks shooter/__init__.py "Breakout: the game"
run ".venv/Scripts/python -m pytest -q" stdout="146 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "shooter"
git-clean
```

## Challenge: imports that travel

**Optional, ★.** On a branch, change every import inside `shooter` to a relative one (`from .model import Game`), then copy `shooter` to `scratch/third` and run `.venv\Scripts\python -c "import sys; sys.path.insert(0, 'scratch'); import third.app; print(third.app.Game.__module__)"`. Count the edits a third game would need now. Then open one of the files on its own and decide, in a sentence, what the dot costs a reader.

## Challenge: two games, one database

**Optional, ★★.** On a branch, put back `get_pref_path("forge", "breakout")` in the shooter, and give both games the same file with `--scores scratch/both.db`: play a game of each (a test run with `--scores` keeps its score). Then run `.venv\Scripts\python -m breakout.report scratch/both.db`. Which line in the report is which game's? Design a migration that would let a shared database tell them apart, and decide whether you'd rather never share the file.

## Challenge: a copying script

**Optional, ★★.** Write `scratch/copy_game.py SOURCE NEW`, which copies a package with `shutil.copytree` and replaces `from SOURCE.` with `from NEW.` in every `.py` file. Run it to make `scratch/pong`. Then find something plain text replacement gets wrong: a docstring, a string, a name that merely contains the package's name. Tools that generate projects from templates (cookiecutter is a popular one) exist because of exactly this.

## What did we actually learn?

- **Copying** gets a second program working on day one, and gives every copied line a second owner.
- **Absolute imports** name a module from the top-level package, so a copy's imports still point at the original; **relative imports** (`.model`) follow the copy, and hide where the code comes from.
- **`__file__`, `__module__` and `sys.modules`** show which code really ran, instead of which code you think ran.
- **An installed package** is found from any folder; a package found because it's in the current folder isn't installed. `[tool.setuptools] packages` and `[project.scripts]` are read at install time, so they need a reinstall.
- **Coupling isn't only imports**: two programs that use the same folder, file or database are coupled through it, and no import will show it.

C# and Java behave differently here, and the difference is instructive. A copied C# project still says `namespace Breakout` in every file, and compiles; two `Breakout.Game` classes then collide as soon as one program references both, a compile error. In Java, a class in `com.forge.breakout` must sit in a `com/forge/breakout` folder, so a copied package won't compile until every `package` line is renamed: the compiler finds at build time what Python only showed you by running the program.
