---
title: 5.2 — When the File Is Wrong
runtime: python
run: breakout/__main__.py
---

A level file is written by a person, and people make mistakes: a row one brick short, a letter the game doesn't know, a file that's empty. Right now `parse_level` quietly makes whatever it can from any text, so a broken level gives a broken wall and no clue why. This lesson makes the game refuse a bad level with a message that says **where** and **why**, tests a whole list of bad levels with one test, lets the player choose a level from the command line, and then hunts down the strangest file bug most programmers ever meet.

## The basic tests so far

**Build:** make sure your files match the end of lesson 5.1. These two steps are the reference answers to its Your turn.

```python file=tests/test_breakout.py
import math
import random

import pygame
import pytest
from pygame import Vector2

from breakout import model


def test_clamp_leaves_a_value_in_range_alone():
    assert model.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert model.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert model.clamp(9, 0, 3) == 3


def test_the_same_seed_serves_the_same_ball():
    assert model.serve(random.Random(1)) == model.serve(random.Random(1))


def test_every_serve_starts_in_the_middle_going_up_at_full_speed():
    for seed in range(100):
        ball = model.serve(random.Random(seed))
        assert ball.position == Vector2(320, 240)
        assert ball.velocity.y < 0
        assert abs(ball.velocity.x) <= 0.6 * model.BALL_SPEED
        assert math.isclose(ball.velocity.length(), model.BALL_SPEED)


def test_a_new_paddle_is_centred_near_the_bottom():
    assert model.Paddle().rect() == pygame.Rect(270, 436, 100, 14)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    paddle = model.Paddle()
    paddle.move(1, 0.5)
    assert paddle.x == 480


def test_the_paddle_stops_at_the_right_edge():
    paddle = model.Paddle()
    paddle.move(1, 1)
    assert paddle.x == 540


def test_the_paddle_stops_at_the_left_edge():
    paddle = model.Paddle()
    paddle.move(-1, 1)
    assert paddle.x == 0


def test_the_autopilot_steers_towards_the_ball():
    paddle = model.Paddle()
    assert model.autopilot(model.Ball(Vector2(100, 240), Vector2(0, 0)), paddle) == -1
    assert model.autopilot(model.Ball(Vector2(320, 240), Vector2(0, 0)), paddle) == 0
    assert model.autopilot(model.Ball(Vector2(500, 240), Vector2(0, 0)), paddle) == 1


def test_a_ball_moves_by_its_velocity_times_dt():
    ball = model.Ball(Vector2(100, 100), Vector2(180, -240))
    ball.move(0.5)
    assert ball == model.Ball(Vector2(190, -20), Vector2(180, -240))


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    ball = model.Ball(Vector2(100, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball == model.Ball(Vector2(100, 100), Vector2(180, -240))


def test_the_left_wall_sends_the_ball_right():
    ball = model.Ball(Vector2(3, 100), Vector2(-180, -240))
    ball.bounce_off_walls()
    assert ball == model.Ball(Vector2(6, 100), Vector2(180, -240))


def test_the_right_wall_sends_the_ball_left():
    ball = model.Ball(Vector2(638, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball == model.Ball(Vector2(634, 100), Vector2(-180, -240))


def test_the_top_wall_sends_the_ball_down():
    ball = model.Ball(Vector2(100, 2), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball == model.Ball(Vector2(100, 6), Vector2(180, 240))


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    ball = model.Ball(Vector2(100, -40), Vector2(180, 240))
    ball.bounce_off_walls()
    assert ball == model.Ball(Vector2(100, 6), Vector2(180, 240))


def test_a_ball_knows_its_rectangle():
    assert model.Ball(Vector2(320, 438), Vector2(0, 0)).rect() == pygame.Rect(314, 432, 12, 12)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    ball = model.Ball(Vector2(320, 438), Vector2(180, 240))
    model.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert ball.velocity == Vector2(0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    ball = model.Ball(Vector2(370, 438), Vector2(180, 240))
    model.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert ball.velocity == Vector2(240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    ball = model.Ball(Vector2(320, 438), Vector2(180, -240))
    model.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert ball.velocity == Vector2(180, -240)


def test_a_tough_brick_survives_its_first_hit():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2)
    assert brick.hit() == 0
    assert brick.hits_left == 1


def test_an_ordinary_brick_breaks_at_once_for_10_points():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    assert brick.hit() == 10
    assert brick.hits_left == 0


def test_a_tough_brick_scores_its_points_when_it_breaks():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    assert brick.hit() == 0
    assert brick.hit() == 30
    assert brick.hits_left == 0


def test_an_untouched_brick_keeps_its_colour():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    assert brick.current_colour() == (239, 68, 68)


def test_a_cracked_brick_is_drawn_darker():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    brick.hit()
    assert brick.current_colour() == (143, 40, 40)


def test_a_broken_brick_cannot_be_hit_again():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    brick.hit()
    with pytest.raises(ValueError):
        brick.hit()
    assert brick.hits_left == 0
```

```check
lacks tests/test_breakout.py "make_bricks"
```

## The level tests so far

**Build:** `tests/test_level.py` as lesson 5.1 left it.

```python file=tests/test_level.py
import pygame

from breakout import level, model


def test_the_classic_level_is_the_old_wall():
    bricks = level.load_level(level.LEVELS / "classic.txt")
    assert len(bricks) == 40
    assert bricks[0] == model.Brick(pygame.Rect(16, 60, 70, 20), model.ROW_COLOURS[0], hits_left=2, points=30)
    assert bricks[-1] == model.Brick(pygame.Rect(548, 164, 70, 20), model.ROW_COLOURS[4])


def test_a_dot_leaves_a_gap():
    bricks = level.parse_level("B.B")
    assert [brick.rect.x for brick in bricks] == [16, 168]


def test_a_t_is_a_tough_brick():
    (brick,) = level.parse_level("T")
    assert (brick.hits_left, brick.points) == (2, 30)


def test_each_row_takes_the_next_colour():
    bricks = level.parse_level("B\nB")
    assert [brick.colour for brick in bricks] == model.ROW_COLOURS[:2]
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="66 passed"
```

## Refuse what can't be played

**Build:** `parse_level` checks the level as it reads it, and raises a `LevelError` saying what's wrong and where.

```python file=breakout/level.py
from pathlib import Path

import pygame

from breakout.model import BRICK_GAP, BRICK_HEIGHT, BRICK_WIDTH, ROW_COLOURS, WALL_LEFT, WALL_TOP, Brick

LEVELS = Path(__file__).parent / "levels"
COLUMNS = 8
MAX_ROWS = 10


class LevelError(ValueError):
    """A level that can't be used, saying where in it the problem is."""

    def __init__(self, message: str, line: int, column: int | None = None) -> None:
        where = f"line {line}" if column is None else f"line {line}, column {column}"
        super().__init__(f"{where}: {message}")
        self.line = line
        self.column = column


def parse_level(text: str) -> list[Brick]:
    lines = text.splitlines()
    if not lines:
        raise LevelError("the level is empty", 1)
    if len(lines) > MAX_ROWS:
        raise LevelError(f"a level has at most {MAX_ROWS} rows, and this one has {len(lines)}", MAX_ROWS + 1)
    bricks: list[Brick] = []
    for row, line in enumerate(lines):
        if len(line) != COLUMNS:
            raise LevelError(f"a row has {COLUMNS} places, and this one has {len(line)}", row + 1)
        colour = ROW_COLOURS[row % len(ROW_COLOURS)]
        for col, char in enumerate(line):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if char == "T":
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            elif char == "B":
                bricks.append(Brick(rect, colour))
            elif char != ".":
                raise LevelError(f"unknown brick {char!r}: use T, B or .", row + 1, col + 1)
    return bricks


def load_level(path: Path) -> list[Brick]:
    return parse_level(path.read_text(encoding="utf-8"))
```

**Understand: your own exception.** `class LevelError(ValueError):` declares a new kind of exception that **is a** `ValueError`: the brackets name the class it **inherits** from (lesson 3.5's *is-a*). Everything a `ValueError` can do, a `LevelError` can do, so any code that already catches `ValueError` catches this too, and code that wants only level problems can catch `LevelError` alone. Exceptions are where inheritance is used most, because "is a kind of" is exactly how errors relate: a `LevelError` is a kind of bad value.

Its `__init__` takes the message and the position. `super().__init__(...)` calls the **parent class's** `__init__`, `ValueError`'s, with the full text: that text is what `str(error)` returns and what a traceback prints. `super()` means "the class I inherit from", so the parent's setup still happens, with your addition. The position is also kept as attributes, `line` and `column`, so a program (an editor, Chapter 18) can put the cursor on the problem instead of parsing the message.

**Understand: the rules**, checked in order, each stopping the parse at the first problem:

| Problem | Message |
|---|---|
| no lines at all | `line 1: the level is empty` |
| more than 10 rows | `line 11: a level has at most 10 rows, and this one has 12` |
| a row that isn't 8 places | `line 3: a row has 8 places, and this one has 7` |
| a character other than `T`, `B` or `.` | `line 2, column 5: unknown brick 'X': use T, B or .` |

Line and column numbers count from **1**, as editors and people do; Python's `enumerate` counts from 0, hence `row + 1`. In `f"unknown brick {char!r}"`, the `!r` shows the character's `repr` (lesson 0.3), quotes included, so a space or an invisible character is visible in the message: `' '` is clearly a space, where a bare space would be lost.

`else` versus `elif char != "."`: a `.` is a gap, so it makes no brick and no error; anything else falls through to the error.

> **Engineer:** **validate at the boundary**. A file is input from outside the program (lesson 4.3's *who controls this data?*), so it's checked once, completely, where it enters, and turned into values the rest of the program can trust. Nothing past `parse_level` ever has to wonder whether a row might be short. And the error is for a **person**: what's wrong, where, and what would be right.

```check
contains breakout/level.py "class LevelError(ValueError):"
run ".venv/Scripts/python -c \"from breakout import level; level.parse_level('BBBB')\"" exit=1 stderr="line 1: a row has 8 places, and this one has 4" label="a short row is refused, saying where and why"
```

## Many bad levels, one test

**Build:** one test, run once for each of five bad levels.

Create `tests/test_level_errors.py`:

```python file=tests/test_level_errors.py
import pytest

from breakout import level


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("", "line 1: the level is empty"),
        ("BBBBBBB", "line 1: a row has 8 places, and this one has 7"),
        ("BBBBBBBB\nBBBBBBBBB", "line 2: a row has 8 places, and this one has 9"),
        ("BBBBXBBB", "line 1, column 5: unknown brick 'X': use T, B or ."),
        ("BBBBBBBB\n" * 11, "line 11: a level has at most 10 rows, and this one has 11"),
    ],
)
def test_a_bad_level_is_refused_with_where_and_why(text: str, message: str):
    with pytest.raises(level.LevelError) as refused:
        level.parse_level(text)
    assert str(refused.value) == message
```

```powershell
.venv\Scripts\python -m pytest tests/test_level_errors.py -v
```

```text
test_a_bad_level_is_refused_with_where_and_why[-line 1: the level is empty] PASSED
test_a_bad_level_is_refused_with_where_and_why[BBBBBBB-line 1: a row has 8 places, and this one has 7] PASSED
test_a_bad_level_is_refused_with_where_and_why[BBBBBBBB\nBBBBBBBBB-line 2: a row has 8 places, and this one has 9] PASSED
test_a_bad_level_is_refused_with_where_and_why[BBBBXBBB-line 1, column 5: unknown brick 'X': use T, B or .] PASSED
...
5 passed
```

**Understand: parametrised tests.** `@pytest.mark.parametrize(names, cases)` is a decorator (lesson 3.2) that turns one test function into many: for each case in the list, pytest runs the test with the case's values passed as the named parameters, `text` and `message`. Each run is a separate test, with the case shown in square brackets after its name (`-v`, *verbose*, lists them), so a failure says exactly which case failed, and the others still run.

Lesson 2.4 said: one representative test for each group of inputs that the code treats the same way. Here the five groups are the five rules, and adding a sixth bad level is one more line in the list, not one more function. `"BBBBBBBB\n" * 11` repeats a string 11 times: an eleven-row level in one expression.

`str(refused.value) == message` checks the **whole** message, not just that *some* `LevelError` was raised: a test that only checks the exception type would pass if every bad level gave the same unhelpful message.

Now run all the tests:

```text
FAILED tests/test_level.py::test_a_dot_leaves_a_gap - breakout.level.LevelErr...
FAILED tests/test_level.py::test_a_t_is_a_tough_brick - breakout.level.LevelE...
FAILED tests/test_level.py::test_each_row_takes_the_next_colour - breakout.le...
```

Lesson 5.1's tests used tiny levels like `"B.B"`, and the new rules correctly refuse them: a row has 8 places. The tests' data broke the rules the code now enforces, so the tests must change, not the code.

```check
run ".venv/Scripts/python -m pytest -q tests/test_level_errors.py" stdout="5 passed"
```

## Test levels must be real levels

**Build:** the level tests, with full 8-place rows.

```python file=tests/test_level.py
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
```

`"B.B....."` is still a brick, a gap and a brick at the start of the row, then five gaps: the same positions as before, in a level the game would accept.

```check
run ".venv/Scripts/python -m pytest -q" stdout="71 passed"
```

## Choose a level from the command line

**Build:** a `--level FILE` option.

```python file=breakout/settings.py
import argparse
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


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
    level: Path | None = None


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
    parser.add_argument("--level", type=Path, metavar="FILE", help="play this level file (default: the classic wall)")
    return parser


def parse_args(args: list[str]) -> Settings:
    options = make_parser().parse_args(args)
    return Settings(
        test_frames=options.test_run,
        hold=Hold(options.hold),
        lag_at=options.lag_at,
        seed=options.seed,
        level=options.level,
    )
```

**Understand.** `type=Path` turns the text into a `Path` (any function or class taking one string will do, lesson 4.3). The option is `None` when it isn't given, and `Settings.level` records it. `settings` still imports nothing from the game: choosing a file is the command line's job, and reading it isn't.

```check
contains breakout/settings.py "--level"
```

## Friendly errors

**Build:** the app reads the chosen level, and reports a missing or broken one without a traceback.

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
    level = settings.level or LEVELS / "classic.txt"
    try:
        bricks = load_level(level)
    except (OSError, LevelError) as error:
        print(f"breakout: {level}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, bricks)
    if settings.test_frames is not None:
        game.start()

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
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if game.state in (GameState.OVER, GameState.WON):
                    game = Game(rng, load_level(level))
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

**Understand.** `settings.level or LEVELS / "classic.txt"`: `or` returns its left side if that's true, otherwise its right side, and `None` counts as false (lesson 0.3's truthiness), so no `--level` means the classic wall.

`try:` / `except (OSError, LevelError) as error:` runs `load_level`, and if it raises either kind of exception, jumps to the `except` block instead of crashing, with the exception in `error`. **`OSError`** is Python's exception for operating-system failures: a missing file raises `FileNotFoundError`, which *is an* `OSError`, as `LevelError` is a `ValueError`. The block prints one line to standard error and exits with **1**:

```text
breakout --test-run 5 --level nowhere.txt
breakout: nowhere.txt: [Errno 2] No such file or directory: 'nowhere.txt'

breakout --test-run 5 --level bad.txt
breakout: bad.txt: line 1: a row has 8 places, and this one has 7
```

Exit code **1**, not 2: lesson 0.1's convention gives 2 for "you used the program wrong" (a bad option, which argparse reports) and 1 for "something went wrong while working" (the file is missing or broken). Scripts and other programs can tell the two apart.

Only these two exceptions are caught. Anything else, a bug in the game itself, still crashes with a full traceback, which is what you want from a bug: catching every exception would hide them. Catch exactly what you expect and can explain to the user.

```check
run ".venv/Scripts/breakout --test-run 5 --level nowhere.txt" exit=1 stderr="breakout: nowhere.txt:" label="a missing level file is reported without a traceback" -- Catch OSError and LevelError around load_level, print one line to sys.stderr, and sys.exit(1).
run ".venv/Scripts/breakout --test-run 600 --hold auto" stdout="frames=600 paddle_x=435 score=70" label="no --level still plays the classic wall"
run ".venv/Scripts/python -m pytest -q" stdout="71 passed"
```

## Your turn: bug hunt — the castle that won't load

**Build, on your own:** find out why a level that looks perfect is refused, and fix the game, not the file.

A teammate made a new level in an editor that saves "UTF-8 with BOM", Notepad's other UTF-8 option. Save it the same way:

```powershell
.venv\Scripts\python -c "from pathlib import Path; Path('breakout/levels/castle.txt').write_text('B.BBBB.B\nBBTTTTBB\nBB....BB\n', encoding='utf-8-sig')"
```

Open `breakout/levels/castle.txt` in the editor: three rows of 8, all valid. Then:

```powershell
.venv\Scripts\breakout --test-run 600 --hold auto --level breakout/levels/castle.txt
```

```text
breakout: breakout\levels\castle.txt: line 1: a row has 8 places, and this one has 9
```

Work through the method from lesson 0.3. **Reproduce** it as small as possible: delete lines until only the problem remains, and the error stays at line 1. **Inspect**: what does Python actually read? The level's text in a `repr` will tell you more than the editor does. Then find out what you're looking at; searching for it is part of the job. The fix belongs in the game, because levels will come from many editors: `load_level` should accept this file **and** ordinary ones.

| Command / test | Result |
|---|---|
| `breakout --test-run 600 --hold auto --level breakout/levels/castle.txt` | plays: `frames=600 ... bricks=15 ...` |
| a test named `test_a_level_saved_with_a_byte_order_mark_loads` | passes |

For the test, write a file in a **temporary folder** that pytest provides: name a parameter `tmp_path` and pytest passes a `Path` to a new, empty folder for that test alone, deleted afterwards (a **fixture**, like `capsys`). Commit with a message that mentions the **byte order mark**.

Try it for about 20 minutes before taking a hint.

```hints
nudge: Print the file's text with its `repr`: `.venv\Scripts\python -c "from pathlib import Path; print(repr(Path('breakout/levels/castle.txt').read_text(encoding='utf-8')))"`. What's before the first `B`, and why doesn't the editor show it?
concept: `'﻿'` is the **byte order mark** (BOM): the character U+FEFF, which some programs write at the very start of a UTF-8 file to say "this is UTF-8". It's invisible in editors, but it's still a character, so the first row has 9. Python has an encoding for exactly this: `"utf-8-sig"` reads UTF-8 and drops a BOM at the start if there is one, and reads files without one exactly like `"utf-8"`.
shape: One word in `load_level`: `encoding="utf-8-sig"`. The test writes the castle into `tmp_path / "castle.txt"` with `write_text(..., encoding="utf-8-sig")`, which writes the BOM, then checks `load_level` returns its 18 bricks.
answer: ~~~python
def load_level(path: Path) -> list[Brick]:
    return parse_level(path.read_text(encoding="utf-8-sig"))
~~~

and in `tests/test_level.py` (with `from pathlib import Path` at the top):

~~~python
def test_a_level_saved_with_a_byte_order_mark_loads(tmp_path: Path):
    path = tmp_path / "castle.txt"
    path.write_text("B.BBBB.B\nBBTTTTBB\nBB....BB\n", encoding="utf-8-sig")
    assert len(level.load_level(path)) == 18
~~~

On disk the file starts with the bytes `EF BB BF`, the UTF-8 encoding of U+FEFF: `open('breakout/levels/castle.txt', 'rb').read()[:3]` shows them. Editing the file to remove them would fix this file and leave the bug waiting for the next one: the bug was the game's assumption that UTF-8 files never start with a BOM. The error message was accurate but unhelpful, too, since the ninth character was invisible; reading the text with `repr` is what made it visible.
```

```check
run ".venv/Scripts/breakout --test-run 600 --hold auto --level breakout/levels/castle.txt" stdout="frames=600" label="the castle level plays" -- Read level files with encoding="utf-8-sig", which drops a byte order mark if there is one.
run ".venv/Scripts/python -m pytest -q -k byte_order_mark" stdout="1 passed" label="a regression test for levels saved with a byte order mark passes"
run ".venv/Scripts/python -m pytest -q" stdout="72 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "byte order mark"
git-clean
```

## What did we actually learn?

- **Your own exception class**, inheriting from a standard one (`class LevelError(ValueError)`), with `super().__init__` and the details a program needs as attributes.
- **Validate at the boundary**, once, completely, with messages that say where and why for a person.
- **Parametrised tests**: one test, many cases, each reported separately.
- **New rules can invalidate old test data**; then the tests change.
- **Catch exactly what you expect** (`OSError`, `LevelError`), report it, and let real bugs crash. Exit 1 for "couldn't do the work", 2 for "used wrong".
- **The minimal reproduction** and **`repr`**: cut a problem down until it's obvious, and look at what the program really sees.
- **The byte order mark**, and `utf-8-sig`. Encodings are where "it looks fine" and "it is fine" part company.

C# and Java have the same pieces: `class LevelException : FormatException` with `base(message)` in its constructor (C#), or `class LevelException extends IllegalArgumentException` with `super(message)` (Java); `try { } catch (IOException | LevelException e) { }`; xUnit's `[Theory]` and JUnit's `@ParameterizedTest` for parametrised tests. .NET's `File.ReadAllText` drops a UTF-8 BOM by default, and Java's `Files.readString` doesn't, which is exactly this lesson's bug, waiting in Java code.
