---
title: 4.4 — Strict Types
runtime: python
run: breakout/__main__.py
---

Since lesson 2.5, pyright has checked the game, but gently: anything it couldn't work out, it let through. The older test files were never checked at all, because their helpers had no type hints. This lesson switches pyright to **strict** mode for the whole project, finds out what that gentle mode was letting through, and fixes it, so that from now on every line in the project is checked.

## The settings so far

**Build:** make sure your files match the end of lesson 4.3. These two steps are the reference answers to its Your turn.

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


def positive_int(text: str) -> int:
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError(f"must be at least 1, not {value}")
    return value


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="breakout", description="Play Breakout. A test run lets another program play it."
    )
    parser.add_argument(
        "--test-run",
        type=positive_int,
        metavar="FRAMES",
        help="play FRAMES frames with no window, then print a summary",
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

```check
contains breakout/settings.py "def positive_int(text: str) -> int:"
```

## The argument tests so far

**Build:** the argument tests as lesson 4.3 left them.

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


def test_a_negative_frame_count_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "-5"])
    assert stopped.value.code == 2


def test_zero_frames_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "0"])
    assert stopped.value.code == 2
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="56 passed"
```

## Switch on strict mode

**Build:** pyright's strictest standard setting, for the whole project.

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
typeCheckingMode = "strict"
```

`typeCheckingMode = "strict"` replaces `reportMissingParameterType`: strict mode includes that rule and turns on all the others. Now check **everything**, the tests and `replay.py` included:

```powershell
.venv\Scripts\python -m pyright breakout tests replay.py
```

```text
breakout\model.py:117:17 - error: Type of "append" is partially unknown
breakout\model.py:120:12 - error: Return type, "list[Unknown]", is partially unknown (reportUnknownVariableType)
replay.py:17:13 - error: Type of "append" is partially unknown
replay.py:21:12 - error: Return type, "list[Unknown]", is partially unknown (reportUnknownVariableType)
tests\test_arguments.py:42:49 - error: Type annotation is missing for parameter "capsys" (reportMissingParameterType)
tests\test_arguments.py:45:12 - error: Type of "readouterr" is unknown (reportUnknownMemberType)
tests\test_characterisation.py:10:11 - error: Type annotation is missing for parameter "args" (reportMissingParameterType)
tests\test_characterisation.py:12:9 - error: Argument type is partially unknown
...
17 errors, 0 warnings, 0 informations
```

pyright has four modes, from least to most checking: **`off`**, **`basic`**, **`standard`** (the default, which you've used since lesson 2.5) and **`strict`**. Strict turns on a family of rules the others leave off, among them the `reportUnknown...` rules, `reportMissingParameterType` and `reportPrivateUsage` (lesson 3.4's `_x`).

**Understand: `Unknown`.** When pyright can't work out a type, it gives the value the type **`Unknown`**, and in its default mode it then stops checking anything to do with that value. That's the gentleness: no false alarms, but also no checking, and `Unknown` **spreads**. See it with lesson 2.5's `reveal_type`, in `scratch/unknowns.py`:

```python
def make():
    items = []
    items.append(1)
    return items


reveal_type(make())
x = make()[0]
reveal_type(x)
d = {}
reveal_type(d)
```

```powershell
.venv\Scripts\python -m pyright scratch\unknowns.py
```

```text
  scratch\unknowns.py:7:13 - information: Type of "make()" is "list[Unknown]"
  scratch\unknowns.py:9:13 - information: Type of "x" is "Unknown"
  scratch\unknowns.py:11:13 - information: Type of "d" is "dict[Unknown, Unknown]"
0 errors, 0 warnings, 3 informations
```

`items = []` gave pyright nothing to go on (it doesn't learn from the later `append`), so the list is a list of `Unknown`; everything taken out of it is `Unknown` too, and nothing done with `x` will ever be checked. No errors: in this mode, that silence is the problem. In `make_bricks`: In `make_bricks`:

```text
bricks = []              an empty list: a list of what? Nothing says.  →  list[Unknown]
bricks.append(Brick(…))  append takes an Unknown, so anything is accepted
return bricks            the function returns list[Unknown]
```

So inside `make_bricks`, nothing checks what goes into the list: `bricks.append("oops")` would be accepted without a word. Its callers are protected only because the function declares `-> list[Brick]`, and pyright believes the declaration. A function *without* that annotation would hand `list[Unknown]` to every caller, and then a typo like `brick.colur` on one of its items would never be reported anywhere. Strict mode reports an `Unknown` where it **starts**, so it can't spread.

```predict
question: In default mode, `bricks = []` followed by `bricks.append("oops")` inside `make_bricks`. Does pyright report anything?
choice: Yes: "oops" isn't a Brick
choice: No: the list's type is Unknown, so anything is accepted
answer: No: the list's type is Unknown, so anything is accepted
explain: `[]` gives pyright nothing to infer from, so the list is `list[Unknown]`, and appending anything to it is allowed. The mistake would only show up at run time, when something used `"oops"` as a brick. The next step says what the list will hold, and then the same line is reported.
```

Seventeen errors, but only four causes:

| Where | Cause |
|---|---|
| `model.py`, `make_bricks` | `bricks = []`: an empty list, with nothing saying what it will hold |
| `replay.py`, `play` | the same: `events = []` |
| `test_arguments.py` | the `capsys` fixture has no type, so everything done with it is `Unknown` |
| `test_characterisation.py` | `play(*args)` and `last_line(*args)` have no types |

One cause usually produces several errors. So don't work through the list line by line: read the **first** error for each cause, fix that, run pyright again, and only then look at what's left. Errors further down are often consequences that vanish with their cause.

```check
contains pyproject.toml "typeCheckingMode = \"strict\""
run ".venv/Scripts/python -m pyright breakout tests replay.py" exit=1 stdout="17 errors" label="strict mode finds 17 errors (for now)" -- Replace reportMissingParameterType = "error" with typeCheckingMode = "strict" in [tool.pyright].
```

## Say what an empty list will hold

**Build:** the first cause, fixed with a **variable annotation**.

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
    bricks: list[Brick] = []
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

The only change is in `make_bricks`:

```python
    bricks: list[Brick] = []
```

**Understand.** A type hint can go on a variable as well as on a parameter: `name: type = value`. For most variables pyright doesn't need one, because it infers the type from the value: `score = 0` is obviously an `int`. Empty collections are the exception: `[]` could become a list of anything, and the same goes for an empty `{}` dictionary or `set()`, so that's where saying what it will hold is required in strict mode. (Add `items: list[int] = []` to `scratch\unknowns.py` and run pyright again: the reveals become `list[int]` and `int`.)

Two more kinds of hint belong here. **`Final`**, from `typing`, marks a name that must never be given a new value: `WIDTH: Final = 640`. pyright then refuses `WIDTH = 800` anywhere, with `"WIDTH" is declared as Final and cannot be reassigned`. And **`Literal`**, also from `typing`, makes a type of exact values: `Literal["none", "left", "right", "auto"]` allows only those four strings. Lesson 3.4's `Hold` enum does the same job better, since its members can't be mistyped as plain strings. A challenge below makes the game's constants `Final`.

Finally, the **escape hatches**, which you'll meet in other people's code: the type **`Any`** (anything goes, nothing checked), **`cast(T, value)`** ("trust me, this is a `T`"), and a comment **`# pyright: ignore[rule]`** on a line (lesson 4.5 has one, for a good reason). Each switches checking off in one place. None of them is wrong, but a reviewer should ask why each one is there, and strict mode reports an ignore that no longer ignores anything. With the annotation, `bricks.append(...)` checks that what's appended is a `Brick`, and `make_bricks` returns a `list[Brick]`, as its own `-> list[Brick]` already promised.

```powershell
.venv\Scripts\python -m pyright breakout
```

```text
0 errors, 0 warnings, 0 informations
```

The game itself is clean in strict mode: lessons 2.5 to 4.3 had typed everything else already. What's left is in `replay.py` and the tests.

```check
contains breakout/model.py "bricks: list[Brick] = []"
run ".venv/Scripts/python -m pyright breakout" stdout="0 errors" label="the game's package passes strict mode"
```

## Your turn: strict everywhere

**Build, on your own:** fix the other three causes, so that pyright in strict mode finds no errors anywhere in the project.

```powershell
.venv\Scripts\python -m pyright breakout tests replay.py
```

must report `0 errors`. You'll need three types you haven't met:

- **`subprocess.CompletedProcess[str]`** is what `subprocess.run(..., text=True)` returns: the `[str]` says its output is text.
- **`pytest.CaptureFixture[str]`** is the type of the `capsys` fixture.
- For **`*args`**, the hint is the type of **each** argument, not of the tuple: `*args: str` means every positional argument is a string, and inside the function `args` is a `tuple[str, ...]` (a tuple of any number of `str`s: the `...` means "any length").

Then make strict checking of everything part of done: in `BACKLOG.md`, change the pyright command in the definition of done to `.venv\Scripts\python -m pyright breakout tests replay.py`. Commit with a message that mentions **strict**.

```hints
nudge: Run pyright and read only the first error in each file. For `replay.py`, it's the same problem you just fixed in `make_bricks`. For each test helper, what does it take and what does it return?
concept: `events: list[str] = []` in `replay.py`, since it collects lines of text. `play` takes any number of command-line words and returns what `subprocess.run` returns; `last_line` takes the same words and returns one line of text. `capsys` needs its type written on the parameter, like any other parameter.
shape: `def play(*args: str) -> subprocess.CompletedProcess[str]:`, `def last_line(*args: str) -> str:`, `def test_a_usage_error_says_how_to_use_the_game(capsys: pytest.CaptureFixture[str]):`, and `events: list[str] = []`.
answer: The four changed lines:

~~~python
    events: list[str] = []                                                                  # replay.py
def play(*args: str) -> subprocess.CompletedProcess[str]:                                    # tests/test_characterisation.py
def last_line(*args: str) -> str:                                                           # tests/test_characterisation.py
def test_a_usage_error_says_how_to_use_the_game(capsys: pytest.CaptureFixture[str]):       # tests/test_arguments.py
~~~

Test functions themselves don't need `-> None`: pyright infers it, and strict mode only insists on types it *can't* infer. The `[str]` in `CompletedProcess[str]` and `CaptureFixture[str]` is a **type argument**: these are lesson 2.5's **generic** types, defined once for any type of output and specialised by what goes in the brackets, as `list[str]` is. Chapter 10 writes a generic type of its own.
```

```check
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors" label="strict mode finds no errors anywhere in the project" -- Annotate the empty list in replay.py, the test helpers' *args and return types, and the capsys fixture.
run ".venv/Scripts/python -m pytest -q" stdout="56 passed"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
contains BACKLOG.md "pyright breakout tests replay.py" -- Update the pyright command in the definition of done.
git-message "strict"
git-clean
```

## Challenge: constants that stay constant

**Optional, ★.** Mark every constant in `model.py` and `draw.py` as `Final`, then try to give one a new value in a scratch file that imports it, and read pyright's error. Types as promises the checker enforces. On a branch.

## Challenge: rules beyond strict

**Optional, ★★.** Strict isn't everything pyright can check. Turn on `reportImplicitOverride` or `reportUnnecessaryTypeIgnoreComment` in `[tool.pyright]`, see what (if anything) it finds, and write in the commit message whether the rule is worth keeping. Reading the configuration documentation and judging a rule's cost. On a branch.

## Challenge: three ways to handle None

**Optional, ★★.** Write `first_brick(bricks: list[Brick]) -> Brick | None` in a scratch file, use its result without a check, and read pyright's error. Then fix it three ways: an `if ... is None:` block, an early `return`, and an `assert`. Write in a comment which you'd use, and when.

## What did we actually learn?

- **`Unknown` spreads**: a value pyright can't type turns off checking for everything that touches it. **Strict mode** reports it where it starts.
- **Empty collections need a type**: `bricks: list[Brick] = []`. Most other variables are inferred.
- **Many errors, few causes**: fix the first cause, then reread.
- **Generic types** take type arguments in brackets: `list[Brick]`, `CompletedProcess[str]`, `CaptureFixture[str]`.
- **`*args: str`** types each argument.
- **Check everything**: the tests are code too, and checking them catches mistakes in the safety net itself.

This is as close as Python gets to C# and Java's compilers: in strict mode, every value has a known type and every call is checked against its signature (and `X | None` must be handled before use, as it has had to be since lesson 2.5). The difference that remains is when: C# and Java refuse to *build* code with type errors, while Python runs it anyway and the checker is a separate step, which is why it's in the definition of done, and why Chapter 17 runs it automatically on every push. `var bricks = new List<Brick>();` in C# and `List<Brick> bricks = new ArrayList<>();` in Java are the same as `bricks: list[Brick] = []`: an empty collection always says what it will hold.
