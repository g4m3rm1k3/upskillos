---
title: 4.1 — A Package
track: Forge — A Real Project
trackOrder: 34
runtime: python
run: breakout/__main__.py
---

`breakout.py` is almost 300 lines: settings parsing, the model, drawing and the game loop, all in one file. Chapters 2 and 3 gave every piece a name and a clear job; this chapter gives each job its own file, and turns the folder of files into a **project**: something you install, run as a command, configure in one place, and work on in parallel branches.

It starts with Python's unit of organisation above the file: the **package**.

## The characterisation tests so far

**Build:** make sure the characterisation tests match the end of lesson 3.6, including its Your turn's `check=False`.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught. Test runs use seed 0 unless told otherwise.
import subprocess
import sys
from pathlib import Path

GAME = Path(__file__).parent.parent / "breakout.py"


def play(*args):
    return subprocess.run([sys.executable, str(GAME), *args], capture_output=True, text=True, check=False)


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
    assert result.stdout.strip().splitlines()[-1].startswith("usage: python breakout.py")


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
contains tests/test_characterisation.py "check=False"
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
```

## A package

**Build:** a folder named `breakout` that Python treats as one importable thing, with the game's code moved inside it.

First, move the file, letting Git know it's a move:

```powershell
mkdir breakout
git mv breakout.py breakout/model.py
```

Then create `breakout/__init__.py`:

```python file=breakout/__init__.py
"""Breakout: the game built through the Forge series."""
```

**Understand: modules and packages.**

> **Module**: one `.py` file, imported by its name. **Package**: a folder of modules that can be imported as a whole, marked by a file named `__init__.py`. Modules inside a package are named with a dot: `breakout.model` is the module `model.py` in the package `breakout`. (Since Python 3.3, a folder *without* `__init__.py` still imports, as a **namespace package**, a special kind meant for packages spread over several folders, whose `__file__` is `None`. `python -c "import tests; print(tests.__file__)"` shows it with your `tests` folder. Always write `__init__.py` for an ordinary package.)

When Python imports `breakout` now, the search through `sys.path` (lesson 0.2) finds a **folder** named `breakout` containing `__init__.py`, and imports it as a **package**: the package is created and `__init__.py` runs, exactly as a module's file runs when it's imported (lesson 2.3). Its first statement is a string, so it's the package's **docstring**, the description tools show for it. Ask Python about it:

```powershell
.venv\Scripts\python -c "import breakout; print(breakout.__file__); print(breakout.__path__); print(breakout.__doc__)"
```

```text
C:\Users\you\Documents\forge\breakout\__init__.py
['C:\\Users\\you\\Documents\\forge\\breakout']
Breakout: the game built through the Forge series.
```

The three lines are `__file__`, `__path__` and `__doc__`, in that order.

`__path__` is what makes a package a package: the folder Python searches for its submodules. `import breakout.model` finds `model.py` there, runs it once, and stores it as an attribute of the package, `breakout.model`.

**Why `git mv`?** Git doesn't really record moves: it records that `breakout.py` disappeared and `breakout/model.py` appeared, and works out afterwards that it was a move because the contents are almost the same. `git mv` is a convenience: it moves the file and stages both halves in one command, so `git status` straight away shows `renamed: breakout.py -> breakout/model.py`. Moving the file any other way and then running `git add .` ends up the same, because Git detects the move from the contents either way. That detection is also what lets `git log --follow breakout/model.py` find the file's history from before it moved.

Right now nothing runs: `python breakout.py` says `can't open file ... breakout.py: [Errno 2] No such file or directory`. The next step gives the package a way to start.

```check
file breakout/__init__.py
file breakout/model.py -- Move the file with git mv breakout.py breakout/model.py.
missing breakout.py
```

## Run it as a module

**Build:** a `__main__.py`, so that `python -m breakout` starts the game.

Create `breakout/__main__.py`:

```python file=breakout/__main__.py
import sys

from breakout.model import main

main(sys.argv[1:])
```

And since the command has changed, change the usage line near the top of `breakout/model.py` to start `usage: python -m breakout` instead of `usage: python breakout.py`.

```powershell
.venv\Scripts\python -m breakout --test-run 600 --hold auto
```

```text
frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True
```

```predict
question: What happens if you run the file by its path instead: `.venv\Scripts\python breakout/__main__.py --test-run 60`?
choice: The same as -m: the game runs
choice: ModuleNotFoundError: No module named 'breakout'
choice: Nothing happens
answer: ModuleNotFoundError: No module named 'breakout'
explain: Running a file by its path puts the file's own folder, `breakout`, at the front of `sys.path` (lesson 0.2), not the project folder. So when `__main__.py` says `from breakout.model import main`, Python looks for a `breakout` inside `breakout`, and there isn't one. The explanation below shows why `-m` doesn't have this problem.
```

See the difference between the two ways of running on a package of your own, in the scratch folder. Make `scratch\pkgdemo\__init__.py`, empty, and `scratch\pkgdemo\__main__.py` containing `import sys; print(__name__); print(sys.path[0])`. Then, from `scratch`:

```powershell
cd scratch
..\.venv\Scripts\python -m pkgdemo
..\.venv\Scripts\python pkgdemo\__main__.py
cd ..
```

```text
__main__
C:\Users\you\Documents\forge\scratch
__main__
C:\Users\you\Documents\forge\scratch\pkgdemo
```

Both run `__main__.py` as the main program, but the first puts the **current folder** first on `sys.path`, and the second puts **the file's own folder** there. That one difference is what the predict was about.

**Understand: what `-m` does.** `python -m breakout` means "find the module or package named `breakout`, the way `import` would, and run it as the main program". For a package, "run it" means run its `__main__.py`, with `__name__` set to `"__main__"` (lesson 2.3). Two details matter:

1. **`-m` puts the current folder at the front of `sys.path`**, which is how `breakout` is found when you're in the project folder. Run the file by its path instead, `python breakout/__main__.py`, and Python puts the file's own folder, `breakout`, on `sys.path`, so `from breakout.model import main` fails with `ModuleNotFoundError: No module named 'breakout'`: there's no `breakout` *inside* `breakout`. That's why packages are run with `-m`.
2. **`from breakout.model import main`** is the **absolute** form of an import: the full dotted name from the top of the package. It imports the module `breakout.model` (running it if this is the first import) and then binds just the name `main` from it. There's also a **relative** form, `from .model import main`, where the dot means "from this package". It works only inside a package that was imported (it fails with `ImportError: attempted relative import with no known parent package` in a file run by its path). Forge uses absolute imports throughout: they read the same in every file, and a reader never has to work out where the dot points.

The **Run** button now runs `breakout/__main__.py` the same way, as `python -m breakout` from the project folder.

`__main__.py` doesn't need lesson 2.3's `if __name__ == "__main__":` guard: its whole job is to be run, and nothing should ever import it. (If something did, `import breakout.__main__` would start the game, because importing runs the file.)

`__init__.py` can hold more than a docstring. Real packages often **re-export** names there, `from breakout.model import Game`, so users can write `breakout.Game`; but every import of the package then runs those imports too. Forge keeps it to a docstring, so importing `breakout.settings` loads nothing else (lesson 4.2 tests exactly that).

The game's own module, `model.py`, still has its guard at the bottom. It's harmless, and the next lesson moves `main` out of it altogether.

```check
contains breakout/model.py "usage: python -m breakout"
run ".venv/Scripts/python -m breakout --test-run 600 --hold auto" stdout="frames=600 paddle_x=435 score=70" label="python -m breakout runs the game" -- breakout/__main__.py should import main from breakout.model and call main(sys.argv[1:]).
```

## Tests follow the code

**Build:** characterisation tests that run the game the new way.

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
    assert result.stdout.strip().splitlines()[-1].startswith("usage: python -m breakout")


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

**Understand.** `play` now runs `python -m breakout`, with `cwd=ROOT`: the **current working directory** of the new process is the project folder, wherever pytest was started from, so `-m` finds the package (detail 1 above, applied deliberately). Without it, starting pytest from inside `tests` would start the game from `tests` too, and `-m breakout` would fail with `No module named breakout`. `ROOT` replaces `GAME`, since there's no single file to point at any more. The usage test expects the new usage line.

The long `subprocess.run(...)` call is split over three lines: that's ruff's formatter laying out a line that would be longer than 120 characters. Run `ruff format .` after typing and it will do the same.

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before, run as a package"
```

## Import what you test

**Build:** the unit tests, importing the module they test.

Run the unit tests first:

```text
E       AttributeError: module 'breakout' has no attribute 'clamp'
```

`import breakout` now imports the **package**, and the package only contains what `__init__.py` defines (a docstring); `clamp` lives one level down, in `breakout.model`. Import that:

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


def test_the_wall_has_forty_bricks_from_the_top_left():
    bricks = model.make_bricks()
    assert len(bricks) == 40
    assert bricks[-1] == model.Brick(pygame.Rect(548, 164, 70, 20), model.ROW_COLOURS[4])


def test_the_top_row_is_tough():
    bricks = model.make_bricks()
    assert bricks[0] == model.Brick(pygame.Rect(16, 60, 70, 20), model.ROW_COLOURS[0], hits_left=2, points=30)
    assert all(brick.hits_left == 2 for brick in bricks[:8])
    assert all(brick.hits_left == 1 for brick in bricks[8:])


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

**Understand.** `from breakout import model` works in two steps: Python first looks for an attribute named `model` on the package `breakout`; if there isn't one, it imports the submodule `breakout.model` and uses that. That's why it works even though `import breakout` on its own never runs `model.py`. Either way it binds the name `model` to the module, so `model.clamp`, `model.Ball` and `model.BALL_SPEED` read as what they are: things from the model. Importing the **module** and naming things through it, rather than importing every name separately (`from breakout.model import clamp, Ball, ...`), keeps it obvious where each name comes from, and keeps the import list short.

```check
contains tests/test_breakout.py "from breakout import model"
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="passed" label="the unit tests pass again"
```

## Your turn: everything else

**Build, on your own:** update the rest of the project for the package, and commit.

Three more files still `import breakout` and use names that are now in `breakout.model`:

- `tests/test_game.py`
- `tests/test_arguments.py` (it also imports `Hold` and `Settings`, and checks the usage line)
- `replay.py`

Make them work the same way. Then check *everything*:

- `.venv\Scripts\python -m pytest -q` passes (51 tests);
- `.venv\Scripts\python -m pyright breakout tests/test_breakout.py tests/test_game.py` finds no errors: pyright now checks the **package folder**, `breakout`, which covers every module in it;
- `ruff format --check .` and `ruff check .` both pass;
- `.venv\Scripts\python replay.py 0 600` still prints seven lines.

The definition of done in `BACKLOG.md` still says `pyright breakout.py`, a file that no longer exists: change it to `pyright breakout`. Commit with a message that mentions **package**.

```hints
nudge: The change in each file is the same as in `tests/test_breakout.py`: one import line at the top, and the prefix on every use. Which names does each file use?
concept: `from breakout import model` gives you the module; then `breakout.Game` becomes `model.Game`, `breakout.autopilot` becomes `model.autopilot`, and so on. For names a test uses without a prefix, like `Hold` and `Settings` in `test_arguments.py`, import them from the module directly: `from breakout.model import Hold, Settings`. Both forms are fine; choose by how the file reads.
shape: In `test_game.py` and `replay.py`: replace `import breakout` with `from breakout import model`, and every `breakout.` with `model.`. In `test_arguments.py`: `from breakout import model` and `from breakout.model import Hold, Settings`, `model.parse_args(...)`, and the usage text `usage: python -m breakout`.
answer: For example, the top of `tests/test_arguments.py`:

~~~python
import pytest

from breakout import model
from breakout.model import Hold, Settings


def test_no_arguments_is_a_normal_game():
    assert model.parse_args([]) == Settings()
~~~

and its last usage check:

~~~python
    assert capsys.readouterr().out.startswith("usage: python -m breakout")
~~~

`replay.py`'s import and its loop:

~~~python
from breakout import model


def play(seed: int, frames: int) -> list[str]:
    game = model.Game(random.Random(seed))
    ...
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
~~~

Search-and-replace (Ctrl+H in VS Code and most editors) does this kind of change quickly, but use **Replace** one match at a time, not **Replace All**, and read each one: a blind replace of `breakout.` would also change `"usage: python breakout.py"` in strings, and in other projects, words you didn't mean. The next lesson's first steps show the whole files.
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="51 passed" label="every test passes"
run ".venv/Scripts/python -m pyright breakout tests/test_breakout.py tests/test_game.py" stdout="0 errors" label="pyright finds no errors in the package and the typed tests"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted"
run ".venv/Scripts/python replay.py 0 600" stdout="frame 492: score 70, lives 3, bricks 33"
contains BACKLOG.md "pyright breakout`" -- The definition of done should run pyright on the package: .venv\Scripts\python -m pyright breakout
git-message "package"
git-clean
```

From this chapter on, do challenges on a **branch** (lesson 4.6 teaches branches; until then, a copy of the file is fine).

## Challenge: the replay, inside the package

**Optional, ★.** Move `replay.py` into the package as `breakout/replay.py`, run it with `python -m breakout.replay 0 600` (a dotted name runs a module inside a package), and explain in a comment why `python breakout/replay.py 0 600` would fail.

## Challenge: a package inside a package

**Optional, ★★.** In the scratch folder, build `shapes/__init__.py`, `shapes/round/__init__.py` and `shapes/round/circle.py`. Import `circle` three ways (`import shapes.round.circle`, `from shapes.round import circle`, and a relative import from inside `shapes/round/__init__.py`), and print `__name__` and `__path__` for each package.

## Challenge: a version number

**Optional, ★★.** Give `breakout/__init__.py` a `__version__ = "0.1.0"`, and after lesson 4.3 add a test that it matches the version in `pyproject.toml`. What does every `import breakout.settings` now run, and does that matter?

## What did we actually learn?

- **A package** is a folder of modules with an `__init__.py`; its modules have dotted names, `breakout.model`.
- **Importing a package runs its `__init__.py`**; submodules are found through the package's `__path__` and imported separately.
- **`python -m package`** runs the package's `__main__.py`, with the current folder on `sys.path`: the way to run a package.
- **Absolute imports** name a module by its full dotted path. Import the module and name things through it, so every name says where it's from.
- **`git mv`** records a move as one change and keeps the file's history followable.
- **Moving code breaks callers**: tests, scripts and even the definition of done had to follow. The tests made every break visible at once.

C# organises code into **namespaces** (`namespace Breakout.Model;`) and **assemblies** (the compiled `.dll` a project produces); Java into **packages** (`package breakout.model;`, which must match the folder `breakout/model/`) and **modules**. In both, `using Breakout.Model;` or `import breakout.model.Ball;` makes names available without running anything: importing never has side effects in those languages, which is the habit lesson 2.3 built in Python.
