---
title: 4.3 — A Real Project
runtime: python
run: breakout/__main__.py
---

The game is a package now, but it isn't yet a **project** in the sense other Python programs and other people expect: there's no file that says what it is, what it needs, or how to run it. Its settings for pytest, pyright and ruff are in three separate files. It runs as `python -m breakout` only from the right folder. And its command line is parsed by hand, by code that only half-checks what it's given. This lesson fixes all four.

## The model so far

**Build:** make sure your files match the end of lesson 4.2. These four steps are the reference answers to its Your turn.

```python file=breakout/model.py
import math
import random
from dataclasses import dataclass

import pygame
from pygame import Vector2

WIDTH, HEIGHT = 640, 480
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
PADDLE_SPEED = 420
PADDLE_WIDTH, PADDLE_HEIGHT = 100, 14
BALL_SPEED = 300
BALL_RADIUS = 6
BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP = 70, 20, 6
WALL_LEFT, WALL_TOP = 16, 60


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


@dataclass
class Ball:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def bounce_off_walls(self) -> None:
        if self.position.x < BALL_RADIUS:
            self.position.x = BALL_RADIUS
            self.velocity.x = abs(self.velocity.x)
        if self.position.x > WIDTH - BALL_RADIUS:
            self.position.x = WIDTH - BALL_RADIUS
            self.velocity.x = -abs(self.velocity.x)
        if self.position.y < BALL_RADIUS:
            self.position.y = BALL_RADIUS
            self.velocity.y = abs(self.velocity.y)

    def rect(self) -> pygame.Rect:
        r = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
        r.center = (round(self.position.x), round(self.position.y))
        return r


def serve(rng: random.Random) -> Ball:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return Ball(Vector2(WIDTH / 2, HEIGHT / 2), Vector2(across, -up) * BALL_SPEED)


class Paddle:
    # Invariant: the whole paddle is always on the screen, 0 <= x <= WIDTH - PADDLE_WIDTH.
    def __init__(self) -> None:
        self._x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    @property
    def x(self) -> float:
        return self._x

    def move(self, direction: int, dt: float) -> None:
        self._x = clamp(self._x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self._x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.position.x < middle - 10:
        return -1
    if ball.position.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.velocity.y > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.velocity = Vector2(BALL_SPEED * 0.8 * offset, -ball.velocity.y)


@dataclass
class Brick:
    rect: pygame.Rect
    colour: tuple[int, int, int]
    hits_left: int = 1
    points: int = 10
    cracked: bool = False

    def hit(self) -> int:
        if self.hits_left == 0:
            raise ValueError("this brick is already broken")
        self.hits_left -= 1
        self.cracked = True
        if self.hits_left == 0:
            return self.points
        return 0

    def current_colour(self) -> tuple[int, int, int]:
        if not self.cracked:
            return self.colour
        r, g, b = self.colour
        return int(r * 0.6), int(g * 0.6), int(b * 0.6)


def make_bricks() -> list[Brick]:
    bricks = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if row == 0:
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            else:
                bricks.append(Brick(rect, colour))
    return bricks


def hit_brick(ball: pygame.Rect, bricks: list[Brick]) -> int | None:
    i = ball.collidelist([brick.rect for brick in bricks])
    if i == -1:
        return None
    return i


class Game:
    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.paddle = Paddle()
        self.ball = serve(rng)
        self.bricks = make_bricks()
        self.score = 0
        self.lives = 3

    def playing(self) -> bool:
        return self.lives > 0 and len(self.bricks) > 0

    def update(self, direction: int, dt: float) -> None:
        if not self.playing():
            return
        self.paddle.move(direction, dt)
        self.ball.move(dt)
        self.ball.bounce_off_walls()
        bounce_off_paddle(self.ball, self.paddle.rect())

        hit = hit_brick(self.ball.rect(), self.bricks)
        if hit is not None:
            self.score += self.bricks[hit].hit()
            if self.bricks[hit].hits_left == 0:
                self.bricks.pop(hit)
            self.ball.velocity.y = -self.ball.velocity.y

        if self.ball.rect().top > HEIGHT:
            self.lives -= 1
            if self.lives > 0:
                self.ball = serve(self.rng)
```

```check
lacks breakout/model.py "def draw("
```

## The app so far

**Build:** `breakout/app.py` as lesson 4.2 left it.

```python file=breakout/app.py
import os
import random

import pygame

from breakout.draw import draw
from breakout.model import HEIGHT, WIDTH, Game, autopilot
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    game = Game(random.Random(seed))

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
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

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                direction -= 1
            if keys[pygame.K_RIGHT]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        game.update(direction, dt)

        draw(screen, font, game)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(game.ball.rect())
        print(
            f"frames={frames} paddle_x={game.paddle.rect().x} score={game.score} lives={game.lives} "
            f"bricks={len(game.bricks)} inside={inside}"
        )
```

```check
lacks breakout/app.py "BACKGROUND = "
```

## The drawing module so far

**Build:** `breakout/draw.py` as lesson 4.2 left it.

```python file=breakout/draw.py
import pygame

from breakout.model import Game

BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:
    screen.fill(BACKGROUND)
    for brick in game.bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, game.paddle.rect())
    pygame.draw.ellipse(screen, BALL_COLOUR, game.ball.rect())
    screen.blit(font.render(f"Score {game.score}   Lives {game.lives}", True, TEXT_COLOUR), (16, 16))
    if game.lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not game.bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))
```

```check
contains breakout/draw.py "BACKGROUND = "
```

## The architecture tests so far

**Build:** `tests/test_architecture.py` as lesson 4.2 left it.

```python file=tests/test_architecture.py
# Which parts of the game may depend on which. Each check imports one module in a fresh Python,
# because this test process has already imported every module the other tests use.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def loaded_by(module: str) -> set[str]:
    code = f"import sys, {module}\nfor name in sys.modules:\n    print(name)"
    result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, check=True)
    return {line for line in result.stdout.splitlines() if line.startswith("breakout")}


def test_settings_depend_on_nothing_else_in_the_game():
    assert loaded_by("breakout.settings") == {"breakout", "breakout.settings"}


def test_the_model_depends_on_nothing_else_in_the_game():
    assert loaded_by("breakout.model") == {"breakout", "breakout.model"}


def test_drawing_depends_only_on_the_model():
    assert loaded_by("breakout.draw") == {"breakout", "breakout.draw", "breakout.model"}
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="54 passed"
```

## A function to start from

**Build:** a function, `run`, that starts the game with the real command line.

```python file=breakout/app.py
import os
import random
import sys

import pygame

from breakout.draw import draw
from breakout.model import HEIGHT, WIDTH, Game, autopilot
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    game = Game(random.Random(seed))

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
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

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                direction -= 1
            if keys[pygame.K_RIGHT]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        game.update(direction, dt)

        draw(screen, font, game)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(game.ball.rect())
        print(
            f"frames={frames} paddle_x={game.paddle.rect().x} score={game.score} lives={game.lives} "
            f"bricks={len(game.bricks)} inside={inside}"
        )


def run() -> None:
    main(sys.argv[1:])
```

**Understand.** `run()` takes no arguments: it reads `sys.argv` itself and passes the words after the program's name to `main`. It's the one place that touches the real command line, and `main(args)` stays testable with any list. A command that a package installs, as the next steps do, calls a function with no arguments, and `run` is that function. (The launcher actually runs `sys.exit(run())`: whatever `run` returns becomes the exit code, and `run` returning `None`, as it does, means 0.)

```check
contains breakout/app.py "def run() -> None:"
```

## `__main__` uses it

**Build:** `python -m breakout` starts through `run` too.

`__main__.py` calls `run()` instead of `main(sys.argv[1:])`: the same function the `breakout` command will call, so both ways of starting the game go through one door, and anything `run` does at startup happens for both.

```python file=breakout/__main__.py
from breakout.app import run

run()
```

```check
run ".venv/Scripts/python -m breakout --test-run 600 --hold auto" stdout="frames=600 paddle_x=435 score=70"
```

## One file for the whole project

**Build:** `pyproject.toml`, the standard file that describes a Python project, starting with what the project is and how it's built.

A TOML file (lesson 3.6) is divided into **tables**, each started by a `[name]` heading; dotted names like `[tool.ruff]` are tables inside tables. Create `pyproject.toml` with three:

```toml file=pyproject.toml
[project]
name = "breakout"
version = "0.1.0"
description = "Breakout, built through the Forge series."
requires-python = ">=3.12"
dependencies = ["pygame-ce==2.5.8"]

[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["breakout"]
```

**Understand: the parts.**

- **`[project]`** describes the project for every Python tool, in a format defined by the Python packaging standards: its `name`, its `version`, a one-line `description`, which Pythons it supports, and the packages it needs to **run**. `requires-python = ">=3.12"` means "3.12 or newer": `>=` allows any version from that one up, where `==`, used in `requirements.txt`, pins exactly one. `dependencies` lists only pygame-ce: pytest, pyright and ruff are needed to *develop* the game, not to play it, so they aren't listed here. (It pins an exact version, which suits an **application** like this game. A **library**, published for other projects to use, gives a range instead, `pygame-ce>=2.5,<3`, so it can be installed alongside other packages that need a slightly different version.)
- **`[build-system]`** says which tool turns this folder into an installable package: **setuptools**, one of several **build backends**, at version 80 or newer. pip reads this table first, installs setuptools in a temporary environment, and asks it to do the building. (So installing even your own project downloads setuptools: an install with no internet connection fails here, and now you know why.) `build-backend` names the module inside setuptools that pip calls to build: `setuptools.build_meta`.
- **`[tool.setuptools]`** tells setuptools which package to include: `breakout`. Left to itself, setuptools would try to discover packages by looking through the folder, and could pick up `tests` or the Chapter 0 scripts; saying exactly which one avoids surprises.

pygame-ce is now written down in two places: here, and in `requirements.txt`. They do different jobs. `requirements.txt` is how *this* development environment is built, with every tool at an exact version; `pyproject.toml`'s `dependencies` is what anyone installing the game needs to run it. The next step connects them.

A **version** number follows lesson 0.2's semantic versioning: 0.1.0 means "early, not yet promised to stay the same". Chapter 57 is about releases and what changing it means.

```check
file pyproject.toml
contains pyproject.toml "[build-system]"
```

## A command for the game

**Build:** a table that turns the game into a command you can type, once it's installed.

Add it after `[project]`:

```toml file=pyproject.toml
[project]
name = "breakout"
version = "0.1.0"
description = "Breakout, built through the Forge series."
requires-python = ">=3.12"
dependencies = ["pygame-ce==2.5.8"]

[project.scripts]
breakout = "breakout.app:run"

[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["breakout"]
```

**Understand.** `[project.scripts]` declares a **command**: installing the project will create a program named `breakout`. Its value, `"breakout.app:run"`, has two parts either side of the colon: the **module** to import, `breakout.app`, and the **function** in it to call, `run`. So typing `breakout` will import `breakout.app` and call `run()`. A command declared like this is called an **entry point**. It doesn't exist yet: installing the project, in the next step, creates it.

```check
contains pyproject.toml "breakout = \"breakout.app:run\""
```

## Every tool's settings in one file

**Build:** move the settings of pytest, ruff and pyright into `pyproject.toml`, and delete the three files they came from.

Each tool looks for its own table in `pyproject.toml`, under `[tool.<name>]`. Add the three, holding exactly the settings from `pytest.ini`, `ruff.toml` and `pyrightconfig.json`:

```toml file=pyproject.toml
[project]
name = "breakout"
version = "0.1.0"
description = "Breakout, built through the Forge series."
requires-python = ">=3.12"
dependencies = ["pygame-ce==2.5.8"]

[project.scripts]
breakout = "breakout.app:run"

[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["breakout"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 120

[tool.pyright]
venvPath = "."
venv = ".venv"
reportMissingParameterType = "error"
```

Then delete the three settings files it replaces, telling Git:

```powershell
git rm pytest.ini ruff.toml pyrightconfig.json
```

**Understand.** `[tool.pytest.ini_options]`, `[tool.ruff]` and `[tool.pyright]` are the old files' settings, moved into one place, so one file describes the whole project. `testpaths = ["tests"]` tells pytest where the tests are, so it no longer searches every folder in the project.

One setting doesn't move: `pytest.ini`'s `pythonpath = .`, which put the project folder on `sys.path` for pytest, whichever folder it was started from. From the project folder, the tests still pass without it, because `python -m pytest` puts the current folder on `sys.path` itself (lesson 4.1). Start pytest from inside `tests`, though, and they can't find the game:

```powershell
cd tests
..\.venv\Scripts\python -m pytest -q test_breakout.py
cd ..
```

That fails with `ModuleNotFoundError: No module named 'breakout'`: the current folder is `tests`, and there's no `breakout` in it. The next step fixes that for every folder, a better way than a pytest setting.

```check
missing pytest.ini -- git rm pytest.ini ruff.toml pyrightconfig.json: their settings are in pyproject.toml now.
missing ruff.toml
missing pyrightconfig.json
run ".venv/Scripts/python -m pyright breakout" stdout="0 errors" label="pyright reads its settings from pyproject.toml"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
```

## Install the project

**Build:** install the game into its own environment, so that `breakout` is a command.

Add one line, `-e .`, to the end of `requirements.txt`:

```text file=requirements.txt
pygame-ce==2.5.8
pytest==9.1.1
pyright[nodejs]==1.1.414
ruff==0.16.10
-e .
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

```text
  Building editable for breakout (pyproject.toml): started
  Building editable for breakout (pyproject.toml): finished with status 'done'
  Created wheel for breakout: filename=breakout-0.1.0-0.editable-py3-none-any.whl size=2969 ...
Successfully built breakout
Installing collected packages: breakout
Successfully installed breakout-0.1.0
```

```powershell
.venv\Scripts\breakout --test-run 600 --hold auto
```

```text
frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True
```

**Understand: an editable install.** `-e .` means "install the project in this folder (`.`), **editable**". A normal install copies the package's files into `site-packages` (lesson 0.2); then editing your code wouldn't change what's installed until you installed again. An editable install copies nothing. Look in `.venv\Lib\site-packages`:

```text
__editable__.breakout-0.1.0.pth
__editable___breakout_0_1_0_finder.py
breakout-0.1.0.dist-info
```

A `.pth` file is read every time Python starts, and any line in it beginning with `import` is run. This one installs a small **finder** that tells Python's import system: "the package `breakout` is in this project folder". So `import breakout` works from anywhere, with any current folder, and always gets the code as you last saved it. pip also made `.venv\Scripts\breakout.exe`, a tiny launcher that starts this environment's Python and calls `breakout.app.run()`: the entry point.

Two things are better now:

- the tests import `breakout` without any `pythonpath` setting, from any folder, because the package is installed;
- `breakout` is a command, like `pip` and `pytest` are.

And anyone who clones this project and runs `pip install -r requirements.txt` gets exactly the same setup.

What editable doesn't cover: the **code** is live, but the project's **metadata** isn't. A change to `pyproject.toml` (the command's entry point, the dependencies, the version) means nothing until you install again. Keep that in mind for the bug hunt below. And the bare word `breakout`, with no `.venv\Scripts\` in front, works only while the environment is activated (lesson 0.2): activation is what puts `.venv\Scripts` on `PATH`. The checks always use the full path.

(The wheel pip built is named `...-py3-none-any.whl`: any Python 3, no compiled code, any platform, a pure-Python wheel. As an editable wheel, it holds only the `.pth` file and the finder, not your code.)

```check
run ".venv/Scripts/breakout --test-run 600 --hold auto" stdout="frames=600 paddle_x=435 score=70" label="the breakout command runs the game" -- Add -e . to requirements.txt and run .venv\Scripts\python -m pip install -r requirements.txt.
run "cd tests; ../.venv/Scripts/python -m pytest -q test_breakout.py" stdout="passed" label="the tests import the installed package from any folder"
```

## The metadata stays out of Git

**Build:** ignore the folder the install wrote.

Building the editable install also wrote a folder, `breakout.egg-info`, into the project: the package's **metadata** (its name, version and dependencies, read from `pyproject.toml`), in the form setuptools uses. Like `.venv` and `__pycache__`, it's generated from files you write, so it must not be committed (lesson 1.2). Add it to `.gitignore`:

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/

# Your own experiments (lesson 1.1's scratch files): kept, never part of the project
scratch/

# Generated: package metadata, written by pip install -e .
*.egg-info/
```

`*` matches any characters, so `*.egg-info/` covers this package and any other.

```check
git-ignored breakout.egg-info -- Add *.egg-info/ to .gitignore: it's generated by the install.
```

## Bug hunt: a command that won't start

**Build:** nothing new: break the command the way a hurried teammate might, then find the cause with the debugging method.

A teammate thinks the entry point should name the function that does the work, and changes one line of `pyproject.toml`:

```toml
breakout = "breakout.app:main"
```

Make that change yourself (it's the setup for the hunt), save, and run the game the two ways it can be started:

```powershell
.venv\Scripts\python -m breakout --test-run 5
.venv\Scripts\breakout --test-run 5
```

Both work. **Observe** that: the change appears to be harmless. Now do what the next person to set up the project will do, and install it:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\breakout --test-run 5
```

Now the command fails, while `python -m breakout` still works. Find out why with lesson 0.3's method before reading the hints: **reproduce** it (you just did), read the traceback **from the bottom**, form a **hypothesis** about what the launcher calls and with what, and check it against `app.py`. Then fix `pyproject.toml`, and think about what else you must do for the fix to take effect.

```hints
nudge: The traceback's last line names a function and an argument. Which function does the launcher call, and how many arguments does it give it? And why did the command keep working until you reinstalled?
concept: The launcher calls the entry point's function with **no arguments** (this lesson's `run`). `main` needs one, `args`, so it fails with `TypeError: main() missing 1 required positional argument: 'args'`. It worked at first because the launcher in `.venv\Scripts` was made at the last install, from the old `pyproject.toml`: an editable install keeps code live, not metadata. `python -m breakout` never uses the entry point at all, so it couldn't show the bug.
shape: Put `breakout = "breakout.app:run"` back in `[project.scripts]`, then reinstall with `.venv\Scripts\python -m pip install -r requirements.txt`, then run `.venv\Scripts\breakout --test-run 5`.
answer: The entry point must name `run`, the function made to be called with no arguments, which reads the command line itself. Fix the line, **reinstall**, and the command works. Two lessons: a function's signature is part of its contract with whoever calls it, here a launcher you didn't write; and after changing `pyproject.toml`, reinstall, or you're testing the old metadata. A regression check for it is the first check below.
```

```check
run ".venv/Scripts/breakout --test-run 5" stdout="frames=5" label="the installed command starts the game" -- The entry point must be breakout.app:run, and the project must be reinstalled after changing it.
contains pyproject.toml "breakout = \"breakout.app:run\""
```

## argparse, on its own

**Build:** a scratch program that tries Python's standard command-line parser before the game uses it.

The game reads its command line by hand: find a word, take the one after it, check it, print a usage line. Python's standard library has a module that does all of that, `argparse`. Try it on a made-up program first:

```python file=scratch/args_demo.py
import argparse

parser = argparse.ArgumentParser(prog="demo")
parser.add_argument("--count", type=int, default=1)
parser.add_argument("--colour", choices=["red", "blue"])
parser.add_argument("--dry-run", action="store_true")

print(parser.parse_args([]))
print(parser.parse_args(["--count", "3", "--colour", "red", "--dry-run"]))
options = parser.parse_args(["--count", "3"])
print(options.count + 1, options.colour, options.dry_run)
parser.parse_args(["--count", "three"])
```

```powershell
.venv\Scripts\python scratch\args_demo.py
```

```text
Namespace(count=1, colour=None, dry_run=False)
Namespace(count=3, colour='red', dry_run=True)
4 None False
usage: demo [-h] [--count COUNT] [--colour {red,blue}] [--dry-run]
demo: error: argument --count: invalid int value: 'three'
```

**Understand.** A **parser** is told which options exist (`add_argument`), then given the words (`parse_args`). It returns a **namespace**: an object with one attribute per option, named after it with dashes turned into underscores, `--dry-run` into `dry_run`. Traced:

```text
words                                      count   colour   dry_run
[]                                         1       None     False    defaults: 1 given, None for the rest
[--count 3 --colour red --dry-run]         3       'red'    True     "3" converted by type=int
[--count three]                            error: int("three") fails, so: usage line, message, exit
```

`type=int` turns the text into a number (the namespace's `count` is the int 3, so `+ 1` gives 4). `choices` refuses anything not listed. `action="store_true"` makes an option that takes no value: present means `True`. And on a bad word, `argparse` prints the usage line and a message to standard error, then calls `sys.exit(2)`, which raises `SystemExit(2)` (lesson 2.4): that's why the last line is the last thing the program does, and why a test can catch it with `pytest.raises(SystemExit)`. The usage line was written for you.

```check
run ".venv/Scripts/python scratch/args_demo.py" exit=2 stdout="Namespace(count=3, colour='red', dry_run=True)" label="the scratch parser reads its options"
```

## Let argparse read the command line

**Build:** replace the hand-written parsing with Python's standard `argparse`.

```python file=breakout/settings.py
import argparse
from dataclasses import dataclass
from enum import Enum


class Hold(Enum):
    NONE = "none"
    LEFT = "left"
    RIGHT = "right"
    AUTO = "auto"


@dataclass(frozen=True)
class Settings:
    test_frames: int | None = None
    hold: Hold = Hold.NONE
    lag_at: int | None = None
    seed: int | None = None


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="breakout", description="Play Breakout. A test run lets another program play it."
    )
    parser.add_argument(
        "--test-run", type=int, metavar="FRAMES", help="play FRAMES frames with no window, then print a summary"
    )
    parser.add_argument(
        "--hold", choices=[h.value for h in Hold], default="none", help="what the paddle does in a test run"
    )
    parser.add_argument("--lag-at", type=int, metavar="FRAME", help="in a test run, make this frame last half a second")
    parser.add_argument("--seed", type=int, metavar="N", help="seed for the random serve (test runs use 0)")
    return parser


def parse_args(args: list[str]) -> Settings:
    options = make_parser().parse_args(args)
    return Settings(test_frames=options.test_run, hold=Hold(options.hold), lag_at=options.lag_at, seed=options.seed)
```

```powershell
.venv\Scripts\breakout --help
```

```text
usage: breakout [-h] [--test-run FRAMES] [--hold {none,left,right,auto}]
                [--lag-at FRAME] [--seed N]

Play Breakout. A test run lets another program play it.

options:
  -h, --help            show this help message and exit
  --test-run FRAMES     play FRAMES frames with no window, then print a
                        summary
  --hold {none,left,right,auto}
                        what the paddle does in a test run
  --lag-at FRAME        in a test run, make this frame last half a second
  --seed N              seed for the random serve (test runs use 0)
```

**Understand.** `argparse.ArgumentParser` is a **declarative** parser: instead of writing code that searches the list of words, you **declare** each option and what it accepts, and the parser does the searching, checking and error messages.

- `add_argument("--test-run", type=int, metavar="FRAMES", help=...)`: an option that takes one value; `type=int` converts the text with `int(...)`, and if that fails, reports it. `metavar` is the placeholder shown in the usage line; `help` is its line in `--help`.
- `argparse.ArgumentParser(prog="breakout", description=...)`: `prog` is the program's name in the usage line and the error messages (`usage: breakout ...`); without it, argparse would use the name of whatever was run, which differs between `python -m breakout` and `breakout`. `description` is the paragraph `--help` shows under the usage line.
- `add_argument("--hold", choices=[...], default="none", ...)`: the value must be one of the choices, or it's an error; if the option isn't given, it's `"none"`. argparse only ever hands back text, so the choices and the default are the enum's *values*, the strings; `Hold(options.hold)` then turns the string into the member (lesson 3.4's lookup by value).
- `parse_args(args)` returns a **namespace**: an object with one attribute per option, named after it with the dashes turned into underscores (`--test-run` becomes `options.test_run`), and `None` for options not given without a default.
- **On an error**, it prints the usage line and a message to **standard error** (the separate output channel for errors, lesson 0.1), and calls `sys.exit(2)`, the "used wrong" code from lesson 0.1. `sys.exit` raises `SystemExit(2)` (lesson 2.4), which is why `pytest.raises(SystemExit)` in the argument tests catches it, and `stopped.value.code` is 2:

```text
breakout: error: argument --test-run: invalid int value: 'ten'
breakout: error: argument --hold: invalid choice: 'sideways' (choose from none, left, right, auto)
breakout: error: argument --lag-at: expected one argument
```

`make_parser()` builds the parser and returns it, and `parse_args` uses it with `make_parser().parse_args(args)`: the call makes a parser, then calls that parser's own `parse_args` method on the arguments. Keeping the building in its own function means it can be used on its own too, for instance to print the help.

```predict
question: The game is started with no `--hold`. What is `options.hold` after `parse_args`?
choice: None
choice: "none"
choice: Hold.NONE
answer: "none"
explain: An option that isn't given gets its `default`, and the default is the string `"none"`: argparse deals only in text. `None` is what an option without a default gets. `Hold.NONE` only appears one line later, when `Hold(options.hold)` looks the member up by its value.
```

`-h` and `--help` come for free. `number_after` and the `USAGE` constant are gone: thirty lines of hand-written checking replaced by four declarations, with better messages.

Run the tests:

```text
FAILED tests/test_arguments.py::test_a_usage_error_says_how_to_use_the_game
FAILED tests/test_characterisation.py::test_a_bad_frame_count_is_a_usage_error
2 failed, 52 passed in 10.49s
```

Both expect the old usage message on standard output; `argparse` writes `usage: breakout ...` to standard error. The contract changed on purpose, so the next two steps update the tests.

```check
contains breakout/settings.py "import argparse"
run ".venv/Scripts/breakout --hold sideways" exit=2 stderr="invalid choice: 'sideways'" label="argparse refuses --hold sideways, with a message"
```

## Tests for the new messages

**Build:** the argument tests, reading standard error.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

from breakout import settings
from breakout.settings import Hold, Settings


def test_no_arguments_is_a_normal_game():
    assert settings.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert settings.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(
        test_frames=600, hold=Hold.AUTO, lag_at=40, seed=7
    )


def test_an_unknown_hold_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--hold", "sideways"])
    assert stopped.value.code == 2


def test_a_hold_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--hold"])
    assert stopped.value.code == 2


def test_a_lag_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--lag-at"])
    assert stopped.value.code == 2


def test_a_lag_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--lag-at", "soon"])
    assert stopped.value.code == 2


def test_a_usage_error_says_how_to_use_the_game(capsys):
    with pytest.raises(SystemExit):
        settings.parse_args(["--hold", "sideways"])
    assert capsys.readouterr().err.startswith("usage: breakout")


def test_a_seed_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--seed", "lucky"])
    assert stopped.value.code == 2
```

`capsys.readouterr().err` is everything printed to standard error during the test.

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="passed"
```

## …and the characterisation test

**Build:** the characterisation test for a usage error, reading standard error.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught. Test runs use seed 0 unless told otherwise.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def play(*args):
    return subprocess.run(
        [sys.executable, "-m", "breakout", *args], cwd=ROOT, capture_output=True, text=True, check=False
    )


def last_line(*args):
    return play(*args).stdout.strip().splitlines()[-1]


def test_autopilot_plays_for_ten_seconds():
    assert (
        last_line("--test-run", "600", "--hold", "auto")
        == "frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True"
    )


def test_nobody_at_the_paddle_loses():
    assert (
        last_line("--test-run", "600", "--hold", "none")
        == "frames=600 paddle_x=270 score=40 lives=0 bricks=36 inside=False"
    )


def test_autopilot_wins():
    assert (
        last_line("--test-run", "10000", "--hold", "auto")
        == "frames=10000 paddle_x=371 score=560 lives=3 bricks=0 inside=True"
    )


def test_holding_right_for_half_a_second():
    assert (
        last_line("--test-run", "30", "--hold", "right")
        == "frames=30 paddle_x=480 score=10 lives=3 bricks=39 inside=True"
    )


def test_a_slow_frame_keeps_the_ball_on_screen():
    assert (
        last_line("--test-run", "400", "--hold", "auto", "--lag-at", "40")
        == "frames=400 paddle_x=536 score=50 lives=2 bricks=35 inside=True"
    )


def test_a_bad_frame_count_is_a_usage_error():
    result = play("--test-run", "ten")
    assert result.returncode == 2
    assert result.stderr.startswith("usage: breakout")


def test_holding_left_for_a_second_stops_at_the_left_edge():
    assert (
        last_line("--test-run", "60", "--hold", "left") == "frames=60 paddle_x=0 score=10 lives=3 bricks=39 inside=True"
    )


def test_a_lost_game_stays_lost():
    assert (
        last_line("--test-run", "1000", "--hold", "none")
        == "frames=1000 paddle_x=270 score=40 lives=0 bricks=36 inside=False"
    )


def test_a_different_seed_plays_a_different_game():
    assert (
        last_line("--test-run", "600", "--hold", "auto", "--seed", "7")
        == "frames=600 paddle_x=7 score=60 lives=3 bricks=34 inside=True"
    )
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="54 passed"
```

## Your turn: who controls this data?

**Build, on your own:** refuse a frame count that makes no sense.

```powershell
.venv\Scripts\breakout --test-run -5
```

```text
frames=1 paddle_x=270 score=0 lives=3 bricks=40 inside=True
```

`type=int` accepts any whole number, including −5 and 0, and the game quietly runs one frame. Command-line arguments are **input from outside the program**: whoever runs it controls them, and they will sometimes be wrong, by mistake or on purpose. A program should check every outside value at the point it comes in, and refuse what it can't use, with a message, instead of doing something surprising.

Make `--test-run` accept only whole numbers of at least 1:

| Command | Prints (to standard error) | Exit code |
|---|---|---|
| `breakout --test-run -5` | `breakout: error: argument --test-run: must be at least 1, not -5` | 2 |
| `breakout --test-run 0` | `... must be at least 1, not 0` | 2 |
| `breakout --test-run ten` | `... invalid positive_int value: 'ten'` | 2 |
| `breakout --test-run 3` | `frames=3 ...` | 0 |

`type=` doesn't have to be `int`: it can be **any function**, passed by its name with no brackets, `type=positive_int`, because the name of a function on its own is a value, the function itself, which argparse calls later on each piece of text. The function takes the text and returns the value, or raises an exception if the text is unacceptable. `argparse` catches `ValueError` (and reports *invalid … value*, using the function's name) and `argparse.ArgumentTypeError` (and reports the exception's own message).

Write the function, named `positive_int`, test first: two tests in `tests/test_arguments.py`, `test_a_negative_frame_count_is_a_usage_error` and `test_zero_frames_is_a_usage_error`. Commit with a message that mentions the **command line**.

```hints
nudge: The third row of the table names the function: `invalid positive_int value`. What does `positive_int("ten")` need to do for argparse to print that, and what does `positive_int("-5")` need to do for it to print *must be at least 1, not -5*?
concept: `int(text)` already raises `ValueError` for `"ten"`, which gives the *invalid … value* message for free. For a number that converts but is too small, raise `argparse.ArgumentTypeError` with your own message; argparse puts it after `argument --test-run:`. Then pass the function itself, not a call to it, as the type: `type=positive_int`.
shape: `def positive_int(text: str) -> int:` converts with `int`, raises `argparse.ArgumentTypeError(f"must be at least 1, not {value}")` if the value is below 1, and otherwise returns it. Each test is lesson 2.4's pattern: `with pytest.raises(SystemExit) as stopped:` around `settings.parse_args(["--test-run", "-5"])`, then `assert stopped.value.code == 2`.
answer: ~~~python
def positive_int(text: str) -> int:
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError(f"must be at least 1, not {value}")
    return value
~~~

with `type=positive_int` in the `--test-run` declaration, and the tests:

~~~python
def test_a_negative_frame_count_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "-5"])
    assert stopped.value.code == 2


def test_zero_frames_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "0"])
    assert stopped.value.code == 2
~~~

`type=positive_int` passes the function as a value, to be called later by argparse, once per use of the option; `type=positive_int(...)` would call it immediately, which isn't what's wanted. Functions are values in Python: they can be stored, passed and called later, which Chapter 11 builds on. The next lesson's first step shows the whole file.
```

```check
run ".venv/Scripts/breakout --test-run -5" exit=2 stderr="must be at least 1, not -5" label="a negative frame count is refused with a message" -- Write positive_int and use it as the type of --test-run.
run ".venv/Scripts/breakout --test-run 0" exit=2 stderr="must be at least 1, not 0"
run ".venv/Scripts/breakout --test-run ten" exit=2 stderr="invalid positive_int value" label="a non-number is still refused, naming the function" -- The function must be called positive_int: argparse uses its name in the message.
run ".venv/Scripts/python -m pytest -q -k frame_count" stdout="passed"
run ".venv/Scripts/python -m pytest -q" stdout="56 passed"
run ".venv/Scripts/python -m pyright breakout" stdout="0 errors"
git-message "command line"
git-clean
```

## Challenge: --version

**Optional, ★.** Add `parser.add_argument("--version", action="version", version=...)`, with the version read from the installed metadata: `importlib.metadata.version("breakout")`. Test it with `capsys` (lesson 2.4). On a branch.

## Challenge: a function that makes validators

**Optional, ★★.** Write `int_between(low, high)`, which **returns** a validator function, and use it as `type=int_between(0, 100_000)` for `--lag-at`. Its error message must name both limits. A function that makes and returns another function, which remembers `low` and `high`, is called a **closure**; Chapter 11 uses them for signals.

## Challenge: a real wheel

**Optional, ★★.** Build a normal, non-editable wheel, `.venv\Scripts\python -m pip wheel . --no-deps -w dist`, make a second environment in the scratch folder, install the wheel into it, and run its `breakout`. Then change `model.py` in the project: the second environment's game doesn't change, because a normal install is a copy. Delete `dist` afterwards (or add it to `.gitignore`).

## What did we actually learn?

- **`pyproject.toml`** describes a project (name, version, Python, runtime dependencies, commands) and holds every tool's settings in one place.
- **A build backend** (setuptools) turns the project into an installable package; **an editable install** points Python at your working folder through a `.pth` file and a finder, so the installed package is always your latest code.
- **Entry points** turn a function into a command.
- **Runtime dependencies** (in `[project]`) are separate from **development tools** (pinned in `requirements.txt`).
- **`argparse`** declares options and gets checking, errors (on standard error, exit code 2) and `--help` for free. **`type=` takes any function**: validation at the boundary.
- **Every value from outside is checked where it enters**: who controls this data is the first question of security.

C#'s equivalent of `pyproject.toml` is the `.csproj` file (with `dotnet run`, `dotnet test`, and `<PackageReference>` for dependencies), and Java's is Maven's `pom.xml` or Gradle's `build.gradle`. Command-line parsing libraries there, `System.CommandLine` in .NET and picocli in Java, work the same declarative way as `argparse`, including validation functions.
