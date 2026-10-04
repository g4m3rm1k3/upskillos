---
title: 5.3 — A Level Is More Than a Wall
runtime: python
run: breakout/__main__.py
---

A real level has more than a wall: a **name** to show the player, and settings, like how many lives the player gets. The text format can't hold those: every line is a row, and there's nowhere to put anything else. This lesson moves levels to **JSON**, the most common format for structured data, reads it with Python's standard library, and checks every part of it by hand. Checking by hand works, and it's worth doing once, because it shows you exactly what the library in the next lesson does for you.

## The level tests so far

**Build:** make sure `tests/test_level.py` matches the end of lesson 5.2, the reference answer to its Your turn.

```python file=tests/test_level.py
from pathlib import Path

import pygame

from breakout import level, model


def test_the_classic_level_is_the_old_wall():
    bricks = level.load_level(level.LEVELS / "classic.txt")
    assert len(bricks) == 40
    assert bricks[0] == model.Brick(pygame.Rect(16, 60, 70, 20), model.ROW_COLOURS[0], hits_left=2, points=30)
    assert bricks[-1] == model.Brick(pygame.Rect(548, 164, 70, 20), model.ROW_COLOURS[4])


def test_a_dot_leaves_a_gap():
    bricks = level.parse_level("B.B.....")
    assert [brick.rect.x for brick in bricks] == [16, 168]


def test_a_t_is_a_tough_brick():
    (brick,) = level.parse_level("T.......")
    assert (brick.hits_left, brick.points) == (2, 30)


def test_each_row_takes_the_next_colour():
    bricks = level.parse_level("B.......\nB.......")
    assert [brick.colour for brick in bricks] == model.ROW_COLOURS[:2]


def test_a_level_saved_with_a_byte_order_mark_loads(tmp_path: Path):
    path = tmp_path / "castle.txt"
    path.write_text("B.BBBB.B\nBBTTTTBB\nBB....BB\n", encoding="utf-8-sig")
    assert len(level.load_level(path)) == 18
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="72 passed"
```

## A level is a JSON file

**Build:** the classic level, as JSON.

Create `breakout/levels/classic.json`:

```json file=breakout/levels/classic.json
{
  "name": "Classic",
  "lives": 3,
  "wall": [
    "TTTTTTTT",
    "BBBBBBBB",
    "BBBBBBBB",
    "BBBBBBBB",
    "BBBBBBBB"
  ]
}
```

and delete the old text version:

```powershell
Remove-Item breakout\levels\classic.txt
```

**Understand: JSON.** JSON (JavaScript Object Notation, pronounced "Jason") writes data with a handful of pieces, nested as deeply as you like:

| JSON | Example | Python value after reading |
|---|---|---|
| object: names and values in `{ }` | `{"lives": 3}` | `dict` |
| array: values in order, in `[ ]` | `["TTTTTTTT", "BBBBBBBB"]` | `list` |
| string, always in **double** quotes | `"Classic"` | `str` |
| number | `3`, `2.5` | `int`, `float` |
| `true`, `false` | `true` | `True`, `False` |
| `null` | `null` | `None` |

So this file is one object with three **fields**: `name` (a string), `lives` (a number) and `wall` (an array of strings, the rows). JSON is strict where Python is relaxed: names must be in double quotes, a comma after the last item is an error, and there are no comments. That strictness is why every language can read it the same way, and why it's how programs send data to each other over the web (Chapter 26's asset library speaks it).

Python reads it with the `json` module, in the standard library:

```powershell
.venv\Scripts\python -c "import json; print(json.load(open('breakout/levels/classic.json')))"
```

```text
{'name': 'Classic', 'lives': 3, 'wall': ['TTTTTTTT', 'BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB']}
```

A Python `dict` of a `str`, an `int` and a `list`. The game is broken from now until the app step, since it still looks for `classic.txt`.

```check
file breakout/levels/classic.json
missing breakout/levels/classic.txt -- Delete classic.txt: the level is JSON now.
```

## Reading and checking a level

**Build:** a level module that reads JSON and checks every part of it.

```python file=breakout/level.py
import json
from dataclasses import dataclass
from pathlib import Path
from typing import cast

import pygame

from breakout.model import BRICK_GAP, BRICK_HEIGHT, BRICK_WIDTH, ROW_COLOURS, WALL_LEFT, WALL_TOP, Brick

LEVELS = Path(__file__).parent / "levels"
COLUMNS = 8
MAX_ROWS = 10
MAX_LIVES = 9
FIELDS = {"name", "lives", "wall"}


class LevelError(ValueError):
    """A level that can't be used, saying where in it the problem is."""

    def __init__(self, message: str, where: str) -> None:
        super().__init__(f"{where}: {message}")
        self.where = where


@dataclass(frozen=True)
class Level:
    name: str
    lives: int
    wall: tuple[str, ...]

    def bricks(self) -> list[Brick]:
        """A new wall of bricks, ready to be broken."""
        return make_bricks(self.wall)


def parse_level(text: str) -> Level:
    try:
        data: object = json.loads(text)
    except json.JSONDecodeError as error:
        raise LevelError(f"not valid JSON: {error.msg}", f"line {error.lineno}, column {error.colno}") from None
    if not isinstance(data, dict):
        raise LevelError("must be a JSON object, { ... }", "the level")
    fields = cast(dict[str, object], data)
    missing = sorted(FIELDS - fields.keys())
    if missing:
        raise LevelError("is missing", missing[0])
    unknown = sorted(fields.keys() - FIELDS)
    if unknown:
        raise LevelError(f"isn't part of a level, which has {', '.join(sorted(FIELDS))}", unknown[0])

    name = fields["name"]
    if not isinstance(name, str) or not name.strip():
        raise LevelError("must be some text", "name")

    lives = fields["lives"]
    if isinstance(lives, bool) or not isinstance(lives, int) or not 1 <= lives <= MAX_LIVES:
        raise LevelError(f"must be a whole number from 1 to {MAX_LIVES}", "lives")

    wall = fields["wall"]
    if not isinstance(wall, list) or not wall:
        raise LevelError('must be a list of rows, like ["BBBBBBBB"]', "wall")
    rows = cast(list[object], wall)
    if len(rows) > MAX_ROWS:
        raise LevelError(f"a level has at most {MAX_ROWS} rows, and this one has {len(rows)}", "wall")
    return Level(name, lives, tuple(check_row(row, line) for row, line in enumerate(rows)))


def check_row(row: int, line: object) -> str:
    where = f"wall, row {row + 1}"
    if not isinstance(line, str):
        raise LevelError('must be text, like "BBBBBBBB"', where)
    if len(line) != COLUMNS:
        raise LevelError(f"a row has {COLUMNS} places, and this one has {len(line)}", where)
    for col, char in enumerate(line):
        if char not in "TB.":
            raise LevelError(f"unknown brick {char!r}: use T, B or .", f"{where}, column {col + 1}")
    return line


def make_bricks(wall: tuple[str, ...]) -> list[Brick]:
    bricks: list[Brick] = []
    for row, line in enumerate(wall):
        colour = ROW_COLOURS[row % len(ROW_COLOURS)]
        for col, char in enumerate(line):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if char == "T":
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            elif char == "B":
                bricks.append(Brick(rect, colour))
    return bricks


def load_level(path: Path) -> Level:
    return parse_level(path.read_text(encoding="utf-8-sig"))
```

**Understand, from the top.**

**`Level`** is what a level *is* once it's been read: a frozen dataclass (lesson 3.5) with a name, a number of lives, and the wall's rows as a `tuple[str, ...]`, a tuple of any length whose items are all strings. A tuple, not a list, because a tuple can't be changed, so a frozen `Level` really can't change. It keeps the **rows**, not bricks, and its method `bricks()` makes a fresh list of `Brick` objects from them every time it's called. The predictions below show why.

**`LevelError`** now says *where* with a piece of text, not a line number, because in a JSON level the place is a field (`lives`) or a row of the wall (`wall, row 2`), whichever line it's written on.

**`parse_level(text)`** goes from the outside in, and refuses at the first problem:

1. **Is it JSON?** `json.loads(text)` ("load string") turns JSON text into Python values, and raises `json.JSONDecodeError` if the text isn't JSON. That exception carries `msg`, `lineno` and `colno` (what's wrong, and where), which become a `LevelError`. `raise ... from None` tells Python not to print the original exception as well: the `LevelError` says everything the player needs.
2. **Is it an object?** `data: object` is a deliberate annotation. `json.loads` can return any JSON value, a list or a number as easily as a dict, so `object`, "could be anything", is the honest type: pyright won't let you use an `object` as a dict, or as anything, until you've checked what it is. `isinstance(data, dict)` is that check.
3. **Are exactly the right fields there?** `fields.keys()` behaves like a set, and `-` between sets is **set difference**, the items in the first and not the second: `FIELDS - fields.keys()` is the fields that are missing, and `fields.keys() - FIELDS` the ones that shouldn't be there. A misspelt `"lifes": 5` is refused instead of silently ignored, and the error names it. `sorted(...)` puts them in alphabetical order, so the same file always gives the same message (a set has no order of its own).
4. **Is each field the right kind of value?** `name` must be a string with something in it besides spaces (`strip()` removes spaces from both ends). `lives` must be an integer from 1 to 9: `1 <= lives <= MAX_LIVES` is a **chained comparison**, meaning `1 <= lives and lives <= MAX_LIVES`. `wall` must be a list that isn't empty, of at most 10 rows.
5. **Is each row a good row?** `check_row` returns the row as a `str` once it has checked that it is one, of 8 places, each `T`, `B` or `.`. `char not in "TB."` asks whether a one-character string appears in `"TB."`. The **generator expression** `check_row(row, line) for row, line in enumerate(rows)` checks every row in turn, and `tuple(...)` collects the results.

**`cast`, a promise to pyright.** After `isinstance(data, dict)`, pyright knows `data` is a dict, but not what's inside it: `dict[Unknown, Unknown]`, which strict mode refuses to use. `cast(dict[str, object], data)` tells pyright "treat this as a dict of strings to anything". At run time `cast` does **nothing**: it returns `data` unchanged and checks nothing. It's a promise, and it's only safe because this one is true: the keys of a JSON object are always strings, and `object` claims nothing about the values. `cast(list[object], wall)` makes the same promise about the wall. A cast that isn't true hides a bug from the type checker, so every `cast` should come with a reason this clear.

**`make_bricks`** no longer checks anything: it's only ever given a wall that `parse_level` has already checked. Once a `Level` exists, its data is good; everything after the boundary can rely on that. This is **parse, don't validate**: turn unchecked input into a type that only holds checked data, at one place, and pass that type around instead of checking again everywhere.

```predict
question: Without `isinstance(lives, bool)`, what would `"lives": true` do?
choice: Be refused: true isn't a number
choice: Be accepted, as 1 life
choice: Crash the game
answer: Be accepted, as 1 life
explain: In Python, `bool` is a subclass of `int`: `True` is the integer 1 and `False` is 0 (`True + True` is 2), so `isinstance(True, int)` is `True` and `1 <= True <= 9` passes. A level with `"lives": true` is almost certainly a mistake, so the check rules booleans out first. This is the kind of rule that's easy to forget when checking by hand.
```

```predict
question: Suppose `Level` stored the bricks, `bricks: list[Brick]`, and every new game was given `level.bricks`. After the player wins and presses Space, what does the new game's wall look like?
choice: A whole new wall
choice: Empty: the first game broke every brick in that list
choice: It crashes: a frozen dataclass can't be changed
answer: Empty: the first game broke every brick in that list
explain: `frozen=True` stops `level.bricks = ...`, giving the field a new value. It doesn't stop changing the list the field refers to, and `Game` removes bricks from its list as they break. Both games would be given the **same** list object, so the second gets whatever the first left: an empty wall, and an instant win. Two names for one changeable object is called **aliasing**, and it's behind many of the hardest bugs to find. Keeping immutable rows and making new bricks from them each time avoids it completely.
```

```check
contains breakout/level.py "def parse_level(text: str) -> Level:"
run ".venv/Scripts/python -c \"from breakout import level; l = level.load_level(level.LEVELS / 'classic.json'); print(l.name, l.lives, len(l.bricks()))\"" stdout="Classic 3 40" label="the classic level loads: name, lives and 40 bricks"
```

## Lives come from the level

**Build:** `Game` takes its number of lives as an argument.

```python file=breakout/model.py
import math
import random
from dataclasses import dataclass
from enum import Enum

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


def hit_brick(ball: pygame.Rect, bricks: list[Brick]) -> int | None:
    i = ball.collidelist([brick.rect for brick in bricks])
    if i == -1:
        return None
    return i


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"
    WON = "won"


class Game:
    def __init__(self, rng: random.Random, bricks: list[Brick], lives: int = 3) -> None:
        self.rng = rng
        self.paddle = Paddle()
        self.ball = serve(rng)
        self.bricks = bricks
        self.score = 0
        self.lives = lives
        self.state = GameState.TITLE

    def start(self) -> None:
        if self.state == GameState.TITLE:
            self.state = GameState.PLAYING

    def toggle_pause(self) -> None:
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
        elif self.state == GameState.PAUSED:
            self.state = GameState.PLAYING

    def update(self, direction: int, dt: float) -> None:
        if self.state != GameState.PLAYING:
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

        if self.lives == 0:
            self.state = GameState.OVER
        elif not self.bricks:
            self.state = GameState.WON
```

**Understand.** `lives: int = 3` is a parameter with a **default value**: a caller that doesn't pass `lives` gets 3, the classic game, so the tests that don't care about lives don't have to say. The model still knows nothing about levels or files; it's just told how many lives to start with.

```check
contains breakout/model.py "def __init__(self, rng: random.Random, bricks: list[Brick], lives: int = 3) -> None:"
contains breakout/model.py "self.lives = lives"
```

## The app plays a level

**Build:** the app loads a `Level` and uses all of it.

```python file=breakout/app.py
import os
import random
import sys

import pygame

from breakout.draw import draw
from breakout.level import LEVELS, LevelError, load_level
from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)
    level_file = settings.level or LEVELS / "classic.json"
    try:
        level = load_level(level_file)
    except (OSError, LevelError) as error:
        print(f"breakout: {level_file}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, level.bricks(), level.lives)
    if settings.test_frames is not None:
        game.start()

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(f"Breakout: {level.name}")
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
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if game.state in (GameState.OVER, GameState.WON):
                    game = Game(rng, level.bricks(), level.lives)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_p:
                game.toggle_pause()

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

**Understand.** `level_file` is the path; `level` is now the `Level` read from it, loaded **once**. Each game, the first and every one after Space, gets `level.bricks()`, a new wall, and `level.lives`. A level that changes on disk while the game runs no longer matters, and a file read can't fail halfway through a session. The window title shows the level's name: `pygame.display.set_caption(f"Breakout: {level.name}")`.

```powershell
.venv\Scripts\breakout --test-run 600 --hold auto
```

```text
frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True
```

And the old castle, still in the text format, is refused with a clear message instead of a crash:

```powershell
.venv\Scripts\breakout --test-run 60 --level breakout/levels/castle.txt
```

```text
breakout: breakout\levels\castle.txt: line 1, column 1: not valid JSON: Expecting value
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game plays exactly as before"
contains breakout/app.py "set_caption(f\"Breakout: {level.name}\")"
```

## The tests' wall comes from JSON

**Build:** the game tests' helper loads `classic.json` and makes its bricks.

```python file=tests/test_game.py
import random

import pygame
from pygame import Vector2

from breakout import level, model


def classic_wall() -> list[model.Brick]:
    return level.load_level(level.LEVELS / "classic.json").bricks()


def started_game(seed: int = 0) -> model.Game:
    game = model.Game(random.Random(seed), classic_wall())
    game.start()
    return game


def autopilot_game(seed: int, frames: int) -> model.Game:
    game = started_game(seed)
    for _ in range(frames):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    return game


def test_a_new_game_waits_on_the_title_screen():
    game = model.Game(random.Random(0), classic_wall())
    assert (game.score, game.lives, len(game.bricks)) == (0, 3, 40)
    assert game.state == model.GameState.TITLE


def test_ten_seconds_of_autopilot_matches_the_test_run():
    game = autopilot_game(0, 600)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served():
    game = started_game()
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces():
    game = started_game()
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240


def test_losing_the_last_life_ends_the_game():
    game = started_game()
    game.lives = 1
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert game.state == model.GameState.OVER
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins():
    game = started_game()
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert game.state == model.GameState.WON
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_game.py" stdout="6 passed"
```

## …and the state tests'

**Build:** the same change in the state tests.

```python file=tests/test_states.py
import random

from pygame import Vector2

from breakout import level, model


def classic_wall() -> list[model.Brick]:
    return level.load_level(level.LEVELS / "classic.json").bricks()


def started_game() -> model.Game:
    game = model.Game(random.Random(0), classic_wall())
    game.start()
    return game


def test_starting_from_the_title_begins_play():
    assert started_game().state == model.GameState.PLAYING


def test_p_pauses_and_p_again_resumes():
    game = started_game()
    game.toggle_pause()
    assert game.state == model.GameState.PAUSED
    game.toggle_pause()
    assert game.state == model.GameState.PLAYING


def test_a_paused_game_does_not_move():
    game = started_game()
    game.toggle_pause()
    before = Vector2(game.ball.position)
    game.update(0, 1 / 60)
    assert game.ball.position == before


def test_pausing_on_the_title_screen_does_nothing():
    game = model.Game(random.Random(0), classic_wall())
    game.toggle_pause()
    assert game.state == model.GameState.TITLE
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_states.py" stdout="4 passed"
```

## …and the replay's

**Build:** `replay.py`, with the same change.

```python file=replay.py
"""Plays a game with the autopilot, without a window, and reports each change of score, lives or bricks."""

import random
import sys

from breakout import level, model


def play(seed: int, frames: int) -> list[str]:
    game = model.Game(random.Random(seed), level.load_level(level.LEVELS / "classic.json").bricks())
    game.start()
    events: list[str] = []
    for frame in range(frames):
        before = (game.score, game.lives, len(game.bricks))
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
        after = (game.score, game.lives, len(game.bricks))
        if after != before:
            events.append(f"frame {frame}: score {after[0]}, lives {after[1]}, bricks {after[2]}")
        if game.state in (model.GameState.OVER, model.GameState.WON):
            events.append(f"frame {frame}: the game is over")
            break
    return events


if __name__ == "__main__":
    for line in play(int(sys.argv[1]), int(sys.argv[2])):
        print(line)
```

```check
run ".venv/Scripts/python replay.py 0 600" stdout="frame 492: score 70, lives 3, bricks 33"
```

## The castle, as JSON

**Build:** the castle, with a name and five lives.

Create `breakout/levels/castle.json`:

```json file=breakout/levels/castle.json
{
  "name": "Castle",
  "lives": 5,
  "wall": [
    "B.BBBB.B",
    "BBTTTTBB",
    "BB....BB"
  ]
}
```

and delete `castle.txt`:

```powershell
Remove-Item breakout\levels\castle.txt
```

```powershell
.venv\Scripts\breakout --test-run 600 --hold auto --level breakout/levels/castle.json
```

```text
frames=600 paddle_x=8 score=30 lives=5 bricks=15 inside=True
```

Five lives, from the file. A level designer can now make a hard level and a forgiving one without touching the code.

```check
missing breakout/levels/castle.txt
run ".venv/Scripts/breakout --test-run 600 --hold auto --level breakout/levels/castle.json" stdout="lives=5 bricks=15" label="the castle plays, with five lives"
```

## The level tests, for JSON

**Build:** the level tests, written for JSON levels.

```python file=tests/test_level.py
import json
from pathlib import Path

import pygame

from breakout import level, model


def level_text(*rows: str) -> str:
    """A level's JSON, with these rows as its wall."""
    return json.dumps({"name": "Test", "lives": 3, "wall": list(rows)})


def test_the_classic_level_is_the_old_wall():
    classic = level.load_level(level.LEVELS / "classic.json")
    assert (classic.name, classic.lives) == ("Classic", 3)
    bricks = classic.bricks()
    assert len(bricks) == 40
    assert bricks[0] == model.Brick(pygame.Rect(16, 60, 70, 20), model.ROW_COLOURS[0], hits_left=2, points=30)
    assert bricks[-1] == model.Brick(pygame.Rect(548, 164, 70, 20), model.ROW_COLOURS[4])


def test_a_dot_leaves_a_gap():
    bricks = level.parse_level(level_text("B.B.....")).bricks()
    assert [brick.rect.x for brick in bricks] == [16, 168]


def test_a_t_is_a_tough_brick():
    (brick,) = level.parse_level(level_text("T.......")).bricks()
    assert (brick.hits_left, brick.points) == (2, 30)


def test_each_row_takes_the_next_colour():
    bricks = level.parse_level(level_text("B.......", "B.......")).bricks()
    assert [brick.colour for brick in bricks] == model.ROW_COLOURS[:2]


def test_every_game_gets_a_whole_new_wall():
    tough = level.parse_level(level_text("T......."))
    (first,) = tough.bricks()
    first.hit()
    (second,) = tough.bricks()
    assert second.hits_left == 2


def test_a_level_saved_with_a_byte_order_mark_loads(tmp_path: Path):
    path = tmp_path / "castle.json"
    path.write_text(level_text("B.BBBB.B", "BBTTTTBB", "BB....BB"), encoding="utf-8-sig")
    assert len(level.load_level(path).bricks()) == 18
```

**Understand.** `json.dumps` ("dump string") is the reverse of `json.loads`: Python values in, JSON text out. `level_text("B.B.....")` builds a whole level's JSON around the rows a test cares about, so each test still says only what matters to it. `*rows: str` collects any number of arguments into a tuple: `level_text("B.......", "B.......")` passes two rows.

`test_every_game_gets_a_whole_new_wall` pins down the aliasing prediction: it cracks a tough brick from one call to `bricks()`, then checks the next call's brick is whole. If someone "optimises" `Level` to store its bricks, this test says why not.

```check
run ".venv/Scripts/python -m pytest -q tests/test_level.py" stdout="6 passed"
```

## Your turn: every refusal, tested

**Build, on your own:** rewrite `tests/test_level_errors.py` for JSON levels.

The old cases are text levels, so all five fail now. Replace them with one case for each of these messages: twelve cases, in one parametrised test like lesson 5.2's. Finding a level that gives exactly each message is the exercise.

| Message `parse_level` must give |
|---|
| `line 1, column 1: not valid JSON: Expecting value` |
| `the level: must be a JSON object, { ... }` |
| `wall: is missing` |
| `speed: isn't part of a level, which has lives, name, wall` |
| `name: must be some text` |
| `lives: must be a whole number from 1 to 9` (a number that's too big) |
| `lives: must be a whole number from 1 to 9` (`true`) |
| `wall: must be a list of rows, like ["BBBBBBBB"]` |
| `wall: a level has at most 10 rows, and this one has 11` |
| `wall, row 2: must be text, like "BBBBBBBB"` |
| `wall, row 1: a row has 8 places, and this one has 7` |
| `wall, row 1, column 5: unknown brick 'X': use T, B or .` |

When all 80 tests pass and every check is clean, commit with a message that mentions **JSON**.

```hints
nudge: Most of the bad levels are a good level with one field changed. What if a helper made a good level's JSON, and each case said only what it changes?
concept: In Python, a JSON string can go in single quotes so its double quotes need no escaping: `'{"name": "Test", "lives": 3}'`. For the rest, build the JSON with `json.dumps` from a dict. `{**good, **changes}` makes a new dict from `good`, then overwrites or adds whatever is in `changes`; a parameter written `**changes: object` collects keyword arguments into a dict, so `level_text(lives=10)` gives `changes == {"lives": 10}`. Python's `True` becomes JSON's `true`.
shape: `import json`, `import pytest`, `from breakout import level`; a helper `level_text(**changes: object) -> str`; one test with `@pytest.mark.parametrize(("text", "message"), [...])` and twelve `(text, message)` pairs; the test body is the same as lesson 5.2's.
answer: ~~~python
import json

import pytest

from breakout import level


def level_text(**changes: object) -> str:
    """A good level's JSON, with these fields changed."""
    return json.dumps({"name": "Test", "lives": 3, "wall": ["BBBBBBBB"], **changes})


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("", "line 1, column 1: not valid JSON: Expecting value"),
        ('["BBBBBBBB"]', "the level: must be a JSON object, { ... }"),
        ('{"name": "Test", "lives": 3}', "wall: is missing"),
        (level_text(speed=2), "speed: isn't part of a level, which has lives, name, wall"),
        (level_text(name=""), "name: must be some text"),
        (level_text(lives=10), "lives: must be a whole number from 1 to 9"),
        (level_text(lives=True), "lives: must be a whole number from 1 to 9"),
        (level_text(wall="BBBBBBBB"), 'wall: must be a list of rows, like ["BBBBBBBB"]'),
        (level_text(wall=["BBBBBBBB"] * 11), "wall: a level has at most 10 rows, and this one has 11"),
        (level_text(wall=["BBBBBBBB", 8]), 'wall, row 2: must be text, like "BBBBBBBB"'),
        (level_text(wall=["BBBBBBB"]), "wall, row 1: a row has 8 places, and this one has 7"),
        (level_text(wall=["BBBBXBBB"]), "wall, row 1, column 5: unknown brick 'X': use T, B or ."),
    ],
)
def test_a_bad_level_is_refused_with_where_and_why(text: str, message: str):
    with pytest.raises(level.LevelError) as refused:
        level.parse_level(text)
    assert str(refused.value) == message
~~~

`["BBBBBBBB"] * 11` is a list of eleven rows: `*` repeats a list. The missing-field case is written out in full, because the helper can add or change fields but not remove one. Each case breaks exactly **one** rule in a level that is otherwise good, so if a case starts failing, you know which rule changed.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_level_errors.py" stdout="12 passed" label="twelve refusals, each tested"
contains tests/test_level_errors.py "not valid JSON: Expecting value"
contains tests/test_level_errors.py "at most 10 rows, and this one has 11"
run ".venv/Scripts/python -m pytest -q" stdout="80 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "JSON"
git-clean
```

## What did we actually learn?

- **JSON**: objects, arrays, strings, numbers, `true`/`false`, `null`, and the Python values each becomes. `json.loads` reads it; `json.dumps` writes it.
- **Check from the outside in**: is it JSON, is it an object, are the right fields there, is each value the right kind, is each part of it right. Refuse at the first problem, and say where.
- **`object` is the honest type of unchecked data**; `isinstance` narrows it; **`cast` is a promise**, checked by nobody, so make only true ones.
- **`bool` is an `int`** in Python. Checks for numbers must rule it out.
- **Parse, don't validate**: unchecked input becomes a `Level` at one place, and the rest of the game trusts it.
- **Aliasing**: a frozen object can still hold a list that changes. Keep immutable data, and make fresh changeable objects from it.

Look at what the checking cost: about 40 lines of `parse_level` and `check_row` for three fields, nearly all of them `isinstance`, ranges and messages, and every new field will need more. C# and Java programmers rarely write this by hand: `JsonSerializer.Deserialize<Level>(text)` (C#) and Jackson's `mapper.readValue(text, Level.class)` (Java) read JSON straight into a typed class and refuse what doesn't fit, so the class definition *is* the format's rules. Godot's `JSON.parse_string` returns an untyped `Variant`, the same problem this lesson solved by hand. The next lesson gives Python the C# and Java approach: **pydantic**, where the `Level` class's type hints become the validation.
