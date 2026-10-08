---
reference: optional
title: 8.6 — Measuring Coupling
runtime: python
run: shooter/__main__.py
---

"Coupling" has come up in every lesson of this chapter: a copy coupled to its original by its imports, two games coupled through a scores folder, a dictionary coupling everyone who imports it. So far it's been a feeling. This lesson makes it a number. You'll write a small tool that reads a program's code, without running it, and lists which module imports which: the program's **import graph**. Then a teammate opens a pull request with a new module for the shooter, and you'll review it with the tool and your own eyes. Measuring first, then arguing, is how engineers keep a design discussion about the code and not about taste.

## The app so far

**Build:** make sure `shooter/app.py` matches the end of lesson 8.5, the reference answer to its Your turn.

```python file=shooter/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame
from pygame import Vector2

from shooter.config import KEYS, Config, ConfigError, load_config
from shooter.draw import draw
from shooter.model import HEIGHT, WIDTH, Game, GameState, direction_from, nearest
from shooter.scores import Score, add_score, best, end_session, open_scores, start_session
from shooter.settings import Hold, parse_args

ARENA = "Arena"  # the shooter's only level: its scores are saved under this name
HOLDS = {Hold.NONE: Vector2(0, 0), Hold.LEFT: Vector2(-1, 0), Hold.RIGHT: Vector2(1, 0), Hold.AUTO: Vector2(0, 0)}


def save_score(db: sqlite3.Connection, score: Score, session: int | None) -> bool:
    """Save a finished game's score. If another program holds the database too long, say so and play on."""
    try:
        add_score(db, score, session)
    except sqlite3.OperationalError as error:
        print(f"shooter: this score wasn't saved: {error}", file=sys.stderr)
        return False
    return True


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)
    try:
        config = load_config(settings.config) if settings.config else Config()
    except (OSError, ConfigError) as error:
        print(f"shooter: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    player = settings.player or config.player
    game = Game(rng)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, ARENA)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"shooter: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Shooter")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    frames = 0
    running = True
    while running:
        if settings.test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == settings.lag_at:
            dt = 0.5
        else:
            dt = 1 / 60

        for event in pygame.event.get():
            if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.serve]:
                if game.state == GameState.OVER:
                    game = Game(rng)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            direction = direction_from(
                keys[KEYS[controls.left]],
                keys[KEYS[controls.right]],
                keys[KEYS[controls.up]],
                keys[KEYS[controls.down]],
            )
            target = Vector2(pygame.mouse.get_pos())
            firing = pygame.mouse.get_pressed()[0]
        else:
            direction = HOLDS[settings.hold]
            target = game.player.position + Vector2(1, 0)
            closest = nearest(game.player.position, game.zombies)
            if settings.hold == Hold.AUTO and closest is not None:
                target = closest.position
            firing = True
        before = game.state
        game.update(direction, target, firing, dt)
        if db and game.state != before and game.state == GameState.OVER:
            score = Score(player, ARENA, game.score, datetime.now(UTC), False)
            if save_score(db, score, session):
                best_score = best(db, ARENA)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
        db.close()
    if settings.test_frames is not None:
        x, y = game.player.position
        print(
            f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives} "
            f"bullets={len(game.bullets)} zombies={len(game.zombies)}"
        )


def run() -> None:
    main(sys.argv[1:])
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="170 passed"
```

## Reading code without running it

**Build:** nothing in the project. Look at code the way Python does, in the REPL.

To find a module's imports you could import it and look at `sys.modules`, as lesson 4.2's architecture tests do. But importing **runs** the module (lesson 2.3), with everything that implies: a module that opens a window, deletes a file or is simply broken does it while you're trying to read it. Python can read code without running it. The first thing it does with any source file is **parse** it: turn the text into a tree of the program's structure, an **abstract syntax tree** (AST). The `ast` module gives you that tree:

```text
>>> import ast
>>> tree = ast.parse("from breakout.model import Ball\nimport sys")
>>> print(ast.dump(tree, indent=2))
Module(
  body=[
    ImportFrom(
      module='breakout.model',
      names=[
        alias(name='Ball')],
      level=0),
    Import(
      names=[
        alias(name='sys')])])
```

(Python 3.12 also shows an empty `type_ignores=[]` at the end.) Each statement is a **node**, an object whose class says what kind of statement it is: `ImportFrom` for `from ... import ...`, with the module's name in `module` and the imported names in `names`; `Import` for `import ...`. `level=0` means an absolute import; lesson 8.1's relative `from .model import Ball` would have `level=1`, one dot. It's "abstract" because what doesn't change the meaning is gone: spaces, comments, and whether you used `'` or `"`.

The tree can be deep: an import inside a function is a node inside the function's node. **`ast.walk(tree)`** visits every node in the tree, however deep, one at a time:

```text
>>> [type(node).__name__ for node in ast.walk(tree)]
['Module', 'ImportFrom', 'Import', 'alias', 'alias']
```

So "every import in this file" is: walk the tree, and keep the nodes that are `Import` or `ImportFrom`. Nothing in the file runs. Linters (ruff), type checkers (pyright) and formatters all start exactly here: parse, then walk the tree.

## Every import in a file

**Build:** `coupling.py`, a tool that lists the imports in files.

A tool for the project, not part of either game, so it goes beside `replay.py` at the top of the project:

```python file=coupling.py
"""Who imports whom: a program's imports, read from its code without running it.

usage: python coupling.py FILE...
"""

import ast
import sys
from pathlib import Path


def imports_in(source: str) -> set[str]:
    """Every name a piece of code imports that could be a module.

    from breakout import draw could be importing the module breakout.draw, or a name defined in breakout:
    only the files can say which, so both are returned.
    """
    found: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module is not None:
            found.add(node.module)
            found.update(f"{node.module}.{alias.name}" for alias in node.names)
    return found


def main(args: list[str]) -> None:
    for arg in args:
        print(arg, sorted(imports_in(Path(arg).read_text(encoding="utf-8"))))


if __name__ == "__main__":
    main(sys.argv[1:])
```

- **`isinstance(node, ast.Import)`** picks out `import x` statements; each of their `names` is a module, `import os.path` gives `"os.path"`.
- **`ast.ImportFrom`** is the tricky one. `from breakout.model import Ball` imports a **name** from the module `breakout.model`, but `from breakout import draw` imports the **module** `breakout.draw`, and the two lines look exactly alike. Which one `draw` is depends on whether there's a file called `breakout/draw.py`, and a parse tree only knows about the text. So `imports_in` returns both possibilities, the module (`breakout`) and the module plus the name (`breakout.draw`), and leaves the deciding to code that can see the files.
- **`node.module is not None`**: in `from . import draw`, a relative import with no module name, `module` is `None`. Forge doesn't write those, and the check keeps the type checker sure that `module` is a string.

```powershell
.venv\Scripts\python coupling.py shooter/draw.py
```

```text
shooter/draw.py ['pygame', 'shooter.model', 'shooter.model.BULLET_RADIUS', 'shooter.model.Game', 'shooter.model.GameState', 'shooter.model.PLAYER_RADIUS', 'shooter.model.ZOMBIE_RADIUS']
```

`pygame`, the module `shooter.model`, and five "maybe modules" that are really names inside it.

```check
run ".venv/Scripts/python coupling.py shooter/draw.py" stdout="'shooter.model'" label="coupling.py lists a file's imports"
```

## Tests for imports_in

**Build:** tests of what counts as an import, and what doesn't.

```python file=tests/test_coupling.py
"""coupling.py: reading a package's imports from its code."""

from coupling import imports_in


def test_every_kind_of_import_is_found():
    source = "import sys\nimport os.path\nfrom breakout.model import Ball\nfrom breakout import draw\n"
    assert imports_in(source) == {
        "sys",
        "os.path",
        "breakout.model",
        "breakout.model.Ball",
        "breakout",
        "breakout.draw",
    }


def test_an_import_inside_a_function_is_still_an_import():
    assert imports_in("def main():\n    import breakout.app\n") == {"breakout.app"}


def test_text_that_only_looks_like_an_import_isnt_one():
    assert imports_in('HELP = "import this"\n# import breakout\n') == set()
```

The third test is the reason for using a parser at all: a string that says `import this` and a comment that says `import breakout` aren't imports, and a text search like lesson 8.1's `Select-String` would have counted both.

```check
run ".venv/Scripts/python -m pytest -q tests/test_coupling.py" stdout="3 passed"
```

## The import graph

**Build:** `coupling.py` lists, for every module in some packages, the modules of those packages it imports.

A **graph**, in mathematics and in programming, is a set of **nodes** (here, modules) joined by **edges** (here, "imports"). Because an import goes one way, from the importer to the imported, it's a **directed** graph. A dictionary from each module's name to the set of modules it imports holds one exactly:

```python file=coupling.py
"""Who imports whom: a package's import graph, read from its code without running it.

usage: python coupling.py PACKAGE...
"""

import ast
import sys
from pathlib import Path

type Graph = dict[str, set[str]]


def imports_in(source: str) -> set[str]:
    """Every name a piece of code imports that could be a module.

    from breakout import draw could be importing the module breakout.draw, or a name defined in breakout:
    only the files can say which, so both are returned, and import_graph keeps the ones that are modules.
    """
    found: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module is not None:
            found.add(node.module)
            found.update(f"{node.module}.{alias.name}" for alias in node.names)
    return found


def module_name(path: Path) -> str:
    """breakout/model.py is breakout.model; a package's own breakout/__init__.py is breakout."""
    if path.name == "__init__.py":
        return path.parent.name
    return f"{path.parent.name}.{path.stem}"


def import_graph(packages: list[Path]) -> Graph:
    """Each module in the packages, and the modules from the same packages it imports."""
    files = {module_name(path): path for package in packages for path in sorted(package.glob("*.py"))}
    graph: Graph = {}
    for name, path in files.items():
        graph[name] = imports_in(path.read_text(encoding="utf-8")) & files.keys()
    return graph


def main(args: list[str]) -> None:
    graph = import_graph([Path(arg) for arg in args])
    for name in sorted(graph):
        print(f"{name:<20} imports {len(graph[name])}: {', '.join(sorted(graph[name]))}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

- **`type Graph = dict[str, set[str]]`** is a **type alias** (Python 3.12's `type` statement): a short name for a long type, used wherever a graph is.
- **`module_name`** turns a path into the name Python would use: `breakout/model.py` is `breakout.model`, and `breakout/__init__.py`, the package itself, is `breakout`.
- **`files.keys()`** is the set of module names that really exist in these packages. `imports_in(...) & files.keys()` is a set **intersection**: `&` between two sets keeps only what's in both (a dictionary's `keys()` behaves as a set for this). Of all the maybe-modules a file imports, it keeps only the real modules of these packages. That drops `pygame` and `sys` (outside the project), and every "maybe" that was really a name, like `shooter.model.Game`.

```powershell
.venv\Scripts\python coupling.py breakout shooter
```

```text
breakout             imports 0:
breakout.__main__    imports 1: breakout.app
breakout.app         imports 6: breakout.config, breakout.draw, breakout.level, breakout.model, breakout.scores, breakout.settings
breakout.config      imports 0:
breakout.draw        imports 1: breakout.model
breakout.level       imports 1: breakout.model
breakout.model       imports 0:
breakout.report      imports 0:
breakout.scores      imports 0:
breakout.settings    imports 0:
shooter              imports 0:
shooter.__main__     imports 1: shooter.app
shooter.app          imports 5: shooter.config, shooter.draw, shooter.model, shooter.scores, shooter.settings
shooter.config       imports 0:
shooter.draw         imports 1: shooter.model
shooter.model        imports 0:
shooter.scores       imports 0:
shooter.settings     imports 0:
```

Read it as a picture. Each game is a small tree with `app` at the top, importing everything, and everything else importing at most `model`. Lesson 4.2's `test_architecture.py` enforces exactly this shape for Breakout, and the copy kept it. The two games share no edges: no `shooter` module imports `breakout`, and no `breakout` module imports `shooter`, which is the good news and the bad news of this chapter at once. And `breakout.report` imports nothing from Breakout, not even `scores`: the backlog's debt from lesson 7.3, "the report tool opens a database with a plain `sqlite3.connect`", visible as a missing edge.

```check
run ".venv/Scripts/python coupling.py breakout shooter" stdout="shooter.app          imports 5: shooter.config, shooter.draw, shooter.model, shooter.scores, shooter.settings" label="coupling.py prints each module's imports from the same packages"
```

## A test for the graph

**Build:** a test of `import_graph` on a package small enough to write out in full.

```python file=tests/test_coupling.py
"""coupling.py: reading a package's imports from its code."""

from pathlib import Path

from coupling import import_graph, imports_in


def test_every_kind_of_import_is_found():
    source = "import sys\nimport os.path\nfrom breakout.model import Ball\nfrom breakout import draw\n"
    assert imports_in(source) == {
        "sys",
        "os.path",
        "breakout.model",
        "breakout.model.Ball",
        "breakout",
        "breakout.draw",
    }


def test_an_import_inside_a_function_is_still_an_import():
    assert imports_in("def main():\n    import breakout.app\n") == {"breakout.app"}


def test_text_that_only_looks_like_an_import_isnt_one():
    assert imports_in('HELP = "import this"\n# import breakout\n') == set()


def test_the_graph_holds_only_the_packages_own_modules(tmp_path: Path):
    game = tmp_path / "game"
    game.mkdir()
    (game / "__init__.py").write_text("", encoding="utf-8")
    (game / "model.py").write_text("import math\n", encoding="utf-8")
    (game / "app.py").write_text("import sys\nfrom game.model import Ball\n", encoding="utf-8")
    assert import_graph([game]) == {"game": set(), "game.app": {"game.model"}, "game.model": set()}
```

It builds a tiny package in `tmp_path` (lesson 5.2) with three files, so the expected graph can be written out in full. Then add `coupling.py` to the pyright command in `BACKLOG.md`'s definition of done, so it's checked like the rest: `pyright breakout shooter tests replay.py coupling.py`.

```check
contains BACKLOG.md "pyright breakout shooter tests replay.py coupling.py" -- Add coupling.py to the pyright command in BACKLOG.md's definition of done.
run ".venv/Scripts/python -m pytest -q" stdout="174 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py coupling.py" stdout="0 errors"
```

Commit the tool:

```powershell
git add .
git commit -m "coupling.py: the import graph, read with ast"
```

```check
git-message "import graph"
git-clean
```

## A pull request from Sam

**Build:** Sam's branch, in your repository, to review.

Sam, a teammate, has written a heads-up display for the shooter: the score, the lives, the best score, the player's name, and a warning when a zombie is close. On a real team it would arrive as a **pull request**: a branch, and a request to merge it into `main` (Chapter 16 does this on GitHub). Here, make Sam's branch yourself, and commit Sam's file as Sam:

```powershell
git switch -c sam-hud
```

Then click **Create provided shooter/hud.py**:

```python file=shooter/hud.py provided
"""The heads-up display, drawn over the arena: score, lives, the best score, and a warning. By Sam."""

import sqlite3
import sys
from pathlib import Path

import pygame

from shooter import app, config, model, settings

font = None
warnings = 0


def draw_hud(screen: pygame.Surface, game: model.Game) -> None:
    global font, warnings
    if font is None:
        font = pygame.font.Font(None, 36)
    options = settings.parse_args(sys.argv[1:])
    player = options.player or config.Config().player
    path = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = sqlite3.connect(path)
    (best,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (app.ARENA,)).fetchone()
    db.close()
    text = f"{player}   Score {game.score}   Lives {game.lives}   Best {best}"
    screen.blit(font.render(text, True, (230, 230, 230)), (16, 16))
    for zombie in game.zombies:
        if zombie.position.distance_to(game.player.position) < 100:
            warnings += 1
            screen.blit(font.render("CLOSE!", True, (239, 68, 68)), (model.WIDTH - 110, 16))
            break
```

```powershell
git add shooter/hud.py
git commit --author="Sam <sam@example.com>" -m "Add a HUD with the best score and a warning"
git log -1
```

`--author` records someone else as the commit's **author**, the person who wrote the change, while you're still its **committer**, the person who put it in the repository; `git log` shows the author. Now measure before reading:

```powershell
.venv\Scripts\python coupling.py shooter
```

```text
shooter              imports 0:
shooter.__main__     imports 1: shooter.app
shooter.app          imports 5: shooter.config, shooter.draw, shooter.model, shooter.scores, shooter.settings
shooter.config       imports 0:
shooter.draw         imports 1: shooter.model
shooter.hud          imports 5: shooter, shooter.app, shooter.config, shooter.model, shooter.settings
shooter.model        imports 0:
shooter.scores       imports 0:
shooter.settings     imports 0:
```

`draw` imports one module of the shooter. `hud`, which draws the status line that `draw` already draws, imports five, as many as `app`, and one of them **is** `app`. (`shooter` on its own is there because `from shooter import app` runs `shooter/__init__.py` first; that edge is real, and harmless.) The number doesn't say the code is wrong. It says where to look.

```check
git-branch sam-hud
file shooter/hud.py -- Click Create provided shooter/hud.py, then commit it on the sam-hud branch.
git-clean
```

## Reviewing the HUD

**Build:** nothing. Read `shooter/hud.py` the way a reviewer does, then decide.

Read it top to bottom, once, before going on. Then answer two questions.

```predict
question: The app would have to call draw_hud every frame. What happens the moment app.py adds import shooter.hud?
choice: Nothing: hud only reads app.ARENA
choice: A circular import: app imports hud, and hud imports app
choice: The HUD is drawn twice
answer: A circular import: app imports hud, and hud imports app
explain: `app` would import `hud`, which starts with `from shooter import app`: each needs the other to finish loading first. Lesson 4.2 caused one on purpose and watched the `ImportError` it gives. Here it's worse than an error message: `hud` needs `app` for one constant, `ARENA`, and the module at the top of the program can't be imported by the modules it uses.
```

```predict
question: How often does draw_hud open the scores database?
choice: Once, the first time it's called
choice: Every frame, about 60 times a second
choice: Only when a game ends
answer: Every frame, about 60 times a second
explain: `sqlite3.connect`, a query and `close` are all inside `draw_hud`, which is called once per frame. Sixty connections a second, each of them reading a file the game is also writing to.
```

Here is the review a careful reviewer would write. A good review names each problem, says why it matters, and suggests what to do, so the author can act on it without guessing:

1. **It imports `shooter.app`**, the module at the top of the program, for one constant. Once `app` uses the HUD, the two import each other. `ARENA` belongs lower down (the model knows it's the arena), or the HUD should be given it.
2. **It opens the database itself, every frame**, with its own path. That ignores `--scores` (a test run, which should keep no scores, would read the player's real file), skips `open_scores` (no foreign keys, no migrations, so an old file gives wrong answers or an error, lesson 7.2), and makes 60 connections a second. The app already knows the best score: pass it in.
3. **It reads the command line again**, `settings.parse_args(sys.argv[1:])`, inside a drawing function. Its output depends on something no caller can see, and in a test, `sys.argv` holds pytest's own arguments (`-q`, a file name), which `argparse` doesn't recognise: it prints `error: unrecognized arguments` and raises `SystemExit`, and the test fails without testing anything. Pass the player's name in.
4. **It keeps state in module-level variables**, `font` and `warnings`, changed with `global`. That's lesson 8.5's global state: shared by every game and every test in the process, and `warnings` is counted and never read. A font can be made once by the app and passed in.
5. **It repeats `draw`**: the status line, the colours as numbers, and a position worked out from `model.WIDTH` by hand. Two places drawing the score is two places to change.

All five have one root: **the HUD reaches out for what it needs**, instead of being **given** it. A function that's given everything as parameters, `draw_hud(screen, font, game, best, player)`, depends only on `model` and pygame, can be tested with a fake screen and made-up numbers, and can't surprise anyone: everything it uses is in its signature. Passing a function what it depends on, instead of letting it find it, is called **dependency injection**, and it's the simplest version of the idea Chapter 9 is built on.

The verdict is **request changes**. The branch stays for Sam to fix; it isn't merged. Go back to `main`:

```powershell
git switch main
```

`shooter/hud.py` disappears from your folder: it only exists in Sam's commit, on Sam's branch.

```check
git-branch main
missing shooter/hud.py -- git switch main: the file belongs to Sam's branch.
git-has-branch sam-hud
```

## Your turn: imported by

**Build, on your own:** `coupling.py` also counts, for each module, how many modules import it.

"Imports 6" says `app` depends on a lot. The opposite question matters as much: how many modules depend on **this** one? A change to a module that nothing imports breaks nothing else; a change to a module that everything imports reaches everywhere, as lesson 8.2's change to the model sent pyright to 22 lines. Click **Create provided tests/test_imported_by.py**:

```python file=tests/test_imported_by.py provided
"""imported_by: the import graph turned around, to count how many modules depend on each one."""

from coupling import Graph, imported_by


def test_each_module_lists_the_modules_that_import_it():
    graph: Graph = {"game.app": {"game.model", "game.draw"}, "game.draw": {"game.model"}, "game.model": set()}
    assert imported_by(graph) == {"game.app": set(), "game.draw": {"game.app"}, "game.model": {"game.app", "game.draw"}}


def test_a_module_nobody_imports_is_still_listed():
    graph: Graph = {"game.tool": set()}
    assert imported_by(graph) == {"game.tool": set()}
```

| Test / command | Result |
|---|---|
| `pytest -q tests/test_imported_by.py` | `2 passed` |
| `python coupling.py breakout` | each line reads `name imports N, imported by M`, for example `breakout.model       imports 0, imported by 3` |

When all 176 tests pass and every check is clean, commit with a message that mentions **imported by**.

```hints
nudge: The graph says, for each module, what it points to. You want, for each module, what points to it. Write out the provided test's graph on paper as arrows, then turn every arrow round. What did you do for each arrow?
concept: Turning a directed graph around (the **reverse** or **transpose** of a graph) means: for every edge from A to B, record an edge from B to A. One loop over the modules and, inside it, one loop over what each imports. The second test says a module nobody imports must still appear, with an empty set, so start with every module in the result.
shape: `imported_by(graph: Graph) -> Graph`: a new dictionary with every module mapped to an empty set; then for each `name, imports` in `graph.items()`, for each `module` in `imports`, add `name` to that module's set. `main` calls it once, after `import_graph`, and prints both counts.
answer: ~~~python
def imported_by(graph: Graph) -> Graph:
    """The same graph, turned around: each module, and the modules that import it."""
    reverse: Graph = {name: set() for name in graph}
    for name, imports in graph.items():
        for module in imports:
            reverse.setdefault(module, set()).add(name)
    return reverse
...
def main(args: list[str]) -> None:
    graph = import_graph([Path(arg) for arg in args])
    users = imported_by(graph)
    for name in sorted(graph):
        print(f"{name:<20} imports {len(graph[name])}, imported by {len(users[name])}")
~~~

`{name: set() for name in graph}` is a **dictionary comprehension**: a new dictionary with an entry for every module. `setdefault(module, set())` returns the module's set, first adding an empty one if it isn't there; in this graph every module is already there, but a graph of a package whose files import a module outside it would need it. Traced for the first test: `game.app`'s two imports add `game.app` to the sets of `game.model` and `game.draw`; `game.draw`'s import adds `game.draw` to `game.model`'s set; `game.model` imports nothing. Result: `game.model` is imported by two.

~~~text
breakout             imports 0, imported by 0
breakout.__main__    imports 1, imported by 0
breakout.app         imports 6, imported by 1
breakout.config      imports 0, imported by 1
breakout.draw        imports 1, imported by 1
breakout.level       imports 1, imported by 1
breakout.model       imports 0, imported by 3
breakout.report      imports 0, imported by 0
breakout.scores      imports 0, imported by 1
breakout.settings    imports 0, imported by 1
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_imported_by.py" stdout="2 passed"
run ".venv/Scripts/python coupling.py breakout" stdout="imports 0, imported by 3" label="the model is imported by three modules" -- Print both counts on each line: name imports N, imported by M.
run ".venv/Scripts/python -m pytest -q" stdout="176 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py coupling.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "imported by"
git-clean
```

## Challenge: instability

**Optional, ★.** Robert C. Martin named the two counts: **efferent coupling**, Ce, what a module imports, and **afferent coupling**, Ca, what imports it. His **instability** is `I = Ce / (Ca + Ce)`: 0 for a module that only others depend on (hard to change, so it should rarely need to), 1 for one that only depends on others (easy to change). Add an `I` column, and check his rule, the **Stable Dependencies Principle**: does every module in Breakout import only modules more stable than itself? What should `I` be for a module nothing imports and that imports nothing?

## Challenge: a picture of the graph

**Optional, ★★.** Add `--dot` to `coupling.py`, which prints the graph in Graphviz's DOT language (`digraph { "breakout.app" -> "breakout.model"; ... }`). Paste the output into an online Graphviz viewer and look at both games side by side. On a branch.

## Challenge: find the cycles

**Optional, ★★★.** Add `cycles(graph)`, which returns every module that can reach itself by following imports. Test it on a tiny graph with a cycle in it, then on Sam's branch, after adding `import shooter.hud` to the shooter's `app.py` there. (A hint: from each module, keep a set of modules already visited, and keep following edges until you find the start again or run out of modules. Chapter 10 does trees and recursion properly.)

## What did we actually learn?

- **Parsing**: Python turns source into an **abstract syntax tree** before running anything; `ast.parse` and `ast.walk` let a program read code safely, the way linters and type checkers do.
- **A graph** is nodes and edges; imports make a **directed graph**, held as a dictionary of sets. **Reversing** it answers "who depends on this?"
- **Fan-out and fan-in** (efferent and afferent coupling): what a module needs, and what needs it. Numbers don't judge code; they say where to look.
- **Reviewing**: measure, then read; name each problem, why it matters, and what to do instead; give a verdict.
- **Reaching out vs being given**: a function that fetches its own dependencies (other modules, files, the command line, globals) is coupled to all of them; one that's given them as parameters is coupled to nothing it can't see. That's **dependency injection**.

C# has Roslyn and Java has the javac Tree API (and tools like JavaParser) for exactly what `ast` does here, and both ecosystems have ready-made coupling tools: NDepend for .NET, JDepend for Java (by Mike Clark, built on Martin's metrics). ArchUnit (Java) and NetArchTest (C#) write lesson 4.2's architecture tests as rules: "classes in `..model..` must not depend on classes in `..app..`".
