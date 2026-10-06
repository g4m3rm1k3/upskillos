---
title: 4.5 — What to Test
runtime: python
run: breakout/__main__.py
---

You can write tests. The harder skill is choosing **which** tests to write, and recognising a test that looks fine but will cost you later. This lesson does both: first by reviewing a file of tests someone else wrote, every one of which passes and most of which have a problem, and then by finding a whole kind of bug the project's 56 tests can't see.

## The replay so far

**Build:** make sure your files match the end of lesson 4.4. These three steps are the reference answers to its Your turn.

```python file=replay.py
"""Plays a game with the autopilot, without a window, and reports each change of score, lives or bricks."""

import random
import sys

from breakout import model


def play(seed: int, frames: int) -> list[str]:
    game = model.Game(random.Random(seed))
    events: list[str] = []
    for frame in range(frames):
        before = (game.score, game.lives, len(game.bricks))
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
        after = (game.score, game.lives, len(game.bricks))
        if after != before:
            events.append(f"frame {frame}: score {after[0]}, lives {after[1]}, bricks {after[2]}")
        if not game.playing():
            events.append(f"frame {frame}: the game is over")
            break
    return events


if __name__ == "__main__":
    for line in play(int(sys.argv[1]), int(sys.argv[2])):
        print(line)
```

```check
contains replay.py "events: list[str] = []"
```

## The characterisation tests so far

**Build:** the characterisation tests as lesson 4.4 left them.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught. Test runs use seed 0 unless told otherwise.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def play(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "breakout", *args], cwd=ROOT, capture_output=True, text=True, check=False
    )


def last_line(*args: str) -> str:
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
contains tests/test_characterisation.py "def last_line(*args: str) -> str:"
```

## The argument tests so far

**Build:** the argument tests as lesson 4.4 left them.

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


def test_a_usage_error_says_how_to_use_the_game(capsys: pytest.CaptureFixture[str]):
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
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m pytest -q" stdout="56 passed"
```

## Review a colleague's tests

**Build:** nothing to write. Read a file of tests and judge each one.

A colleague has written some tests for Breakout and asked for your review before they're added. One line in it ends with `# pyright: ignore[reportPrivateUsage]`: a comment telling pyright to skip one named rule on that line (lesson 4.4's escape hatch). Notice it as you read. Click **Create provided review_these_tests.py** and read it:

```python file=review_these_tests.py provided
# Tests a colleague wrote for Breakout, for you to review. Every one of them passes.
# This file isn't in tests/, so pytest won't collect it: run one with
#   .venv\Scripts\python -m pytest review_these_tests.py -k NAME
import pygame
from pygame import Vector2

from breakout import model


def test_paddle():
    paddle = model.Paddle()
    assert paddle._x == 270.0  # pyright: ignore[reportPrivateUsage]


def test_rects_collide():
    assert pygame.Rect(0, 0, 10, 10).colliderect(pygame.Rect(5, 5, 10, 10))


def test_brick_and_paddle():
    brick = model.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    assert brick.hit() == 10
    paddle = model.Paddle()
    paddle.move(1, 0.5)
    assert paddle.x == 480


def test_bricks():
    assert isinstance(model.make_bricks(), list)


def test_a_ball_resting_exactly_against_the_left_wall_keeps_moving_left():
    ball = model.Ball(Vector2(model.BALL_RADIUS, 100), Vector2(-180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(-180, -240)
```

All five pass. The file isn't in `tests/`, so pytest doesn't run it with the others; `testpaths` (lesson 4.3) only looks there. Judge each test by asking: **if this test failed, what would that tell me, and if it passed, what would I know?**

```predict
question: `test_paddle` checks that a new paddle's `_x` is 270.0. What's the problem?
choice: Nothing: it's a correct, useful test
choice: It tests how Paddle stores its position, not what a paddle does
choice: It tests pygame, not Breakout
answer: It tests how Paddle stores its position, not what a paddle does
explain: `_x` is private (lesson 3.4): the leading underscore says it's the class's own business, and pyright had to be told to ignore the rule against reading it, which is a warning sign in itself: a comment `# pyright: ignore[reportPrivateUsage]` at the end of a line switches off that one named rule, on that line only. If the paddle later stored its centre instead of its left edge, or used an integer, this test would fail even though the paddle still works perfectly. A test should check **behaviour**, what other code can observe through the public interface: `model.Paddle().rect().x == 270`, or `paddle.x`. Tests of internals break when you improve the code, so they discourage improving it.
```

```predict
question: `test_rects_collide` checks that two overlapping rectangles collide. What's the problem?
choice: It tests pygame, not Breakout
choice: It needs more cases
choice: Nothing
answer: It tests pygame, not Breakout
explain: Every line in it is pygame's code. If it failed, it would mean pygame's `colliderect` is broken, which pygame's own tests are responsible for, and there'd be nothing to fix in this project. Don't test code you didn't write; test **your** code that uses it. `test_a_ball_that_hits_a_brick_breaks_it_and_bounces` in `test_game.py` uses `colliderect` and tests what Breakout does with the answer.
```

```predict
question: `test_brick_and_paddle` checks a brick hit, then a paddle move. What's the main problem?
choice: It's too slow
choice: Two unrelated behaviours in one test, under a name that says neither
choice: It tests a private attribute
answer: Two unrelated behaviours in one test, under a name that says neither
explain: If it fails, the report says `FAILED ...::test_brick_and_paddle`, and you don't know whether bricks or paddles are broken; and if the brick part fails, the paddle part never runs, so a second problem stays hidden. One behaviour per test, named so the failure report reads as a description of what broke (lessons 2.1 and 2.4). Both behaviours are already tested properly in `test_breakout.py`, so this test should simply be deleted.
```

```predict
question: `test_bricks` checks that `make_bricks()` returns a list. What's the problem?
choice: It's too weak: almost any broken make_bricks would still pass
choice: It should use isinstance on each brick too
choice: Nothing: return types matter
answer: It's too weak: almost any broken make_bricks would still pass
explain: An empty list passes. A list of 500 bricks passes. A list of strings passes. A test that can't fail when the code is wrong protects nothing, and pyright already checks the return type, from the `-> list[Brick]` annotation, without running anything. A useful test of `make_bricks` checks what makes the wall *right*: how many bricks, where the first and last are, which row is tough, as `test_breakout.py` and `test_game.py` already do.
```

The last test, `test_a_ball_resting_exactly_against_the_left_wall_keeps_moving_left`, is the good one: its name is a sentence about the game, it uses only the public interface, it checks one behaviour, and it would fail if that behaviour broke. It also tests something none of the other tests in the project do, which is the subject of the next step.

> **Engineer:** a good test checks **behaviour, through the public interface**: something a caller can observe. It tests **your code**, not a library's. It checks **one behaviour**, named as a sentence. And it can **fail**: there's a plausible wrong version of the code that it would catch. Tests that break these rules either break when you improve the code, or don't break when you damage it, and both make a test suite less trusted and less used.

```check
file review_these_tests.py -- Click "Create provided review_these_tests.py" above.
```

## Boundaries

**Build:** find a whole kind of bug your tests can't see, and a tool that checks for it.

In `breakout/model.py`, in `Ball.bounce_off_walls`, change the right-wall condition from `>` to `>=`:

```python
        if self.position.x >= WIDTH - BALL_RADIUS:
```

Run all the tests. All 56 pass: none of them notices. Now make the same change at the **left** wall too, `<` to `<=`, and run just the colleague's good test: `.venv\Scripts\python -m pytest -q review_these_tests.py -k left_wall`. It fails:

```text
E       assert Vector2(180, -240) == Vector2(-180, -240)
```

Traced: the ball is at x = 6, exactly on the boundary, moving left. `6 <= 6` is `True`, so the changed code bounces it (`abs(-180)` is 180, moving right); the test expects it to keep going left. Put both back with `git restore breakout/model.py`.

**Understand: equivalence classes and boundaries.** Lesson 2.4 chose its tests by this idea without naming it: one test per **equivalence class**, a group of inputs the code treats the same way. For the left wall there are two classes: past the wall (`x < 6`: bounce) and not past it (`x ≥ 6`: leave alone). The project's tests pick a value well inside each class: x = 3 and x = 100. The mistake of writing `<=` instead of `<` only changes what happens at **exactly** x = 6, the **boundary** between the two classes, so tests that stay away from the boundary can't notice it.

Why is `<` right and `<=` wrong? Because of what the wall means: the wall is at x = 6 (the ball's radius from the edge), so a ball whose centre is exactly 6 is **touching** the wall, not past it, and the rule is to leave it alone until it's actually past. That's a decision, and `<=` would be a different decision, arguably just as reasonable. What makes `<=` a mistake here is that it isn't what the game was written to do. A boundary test pins the decision down, so nobody changes it by accident. Writing one is often what forces a vague rule to become exact.

Try the idea on something you can hold in your head. A law says you can vote from the age of 18; someone wrote:

```text
>>> def can_vote(age):
...     return age > 18
...
>>> can_vote(30), can_vote(5)
(True, False)
>>> can_vote(18)
False
```

The two classes, adults and children, are both right. Only the boundary, 18 itself, shows that `>` should be `>=`.

> **Boundary value**: an input at the edge where the code's behaviour changes, such as the exact value in a comparison. **Off-by-one error**: a mistake at a boundary, like `<` for `<=`, or a loop that runs once too often or too seldom. They're among the commonest bugs there are, precisely because ordinary tests don't go near the boundary.

The rule that follows: for every comparison that decides behaviour, test **at** the boundary, and just past it on each side when the two sides behave differently.

**A tool that tests your tests.** Click **Create provided check_walls.py**:

```python file=check_walls.py provided
"""Checks that tests/test_boundaries.py notices three off-by-one mistakes at the walls.

Each mistake is made in a temporary copy of the game, never in your own files.
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
MISTAKES = [
    ("self.position.x < BALL_RADIUS:", "self.position.x <= BALL_RADIUS:"),
    ("self.position.x > WIDTH - BALL_RADIUS:", "self.position.x >= WIDTH - BALL_RADIUS:"),
    ("self.position.y < BALL_RADIUS:", "self.position.y <= BALL_RADIUS:"),
]

caught = 0
for right, wrong in MISTAKES:
    with tempfile.TemporaryDirectory() as folder:
        copy = Path(folder)
        shutil.copytree(ROOT / "breakout", copy / "breakout")
        shutil.copytree(ROOT / "tests", copy / "tests")
        model = copy / "breakout" / "model.py"
        model.write_text(model.read_text().replace(right, wrong))
        command = [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "tests/test_boundaries.py"]
        result = subprocess.run(command, cwd=copy, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            caught += 1
            print(f"caught: {wrong}")
        else:
            print(f"missed: {wrong}")
print(f"caught {caught} of {len(MISTAKES)}")
```

Read it before running it. For each of three mistakes, it:

1. makes a **temporary folder** (`tempfile.TemporaryDirectory`), which Python deletes at the end of the `with` block. That's lesson 2.4's context manager doing set-up at the start of the block and clean-up at the end, even if an error happens inside. In the REPL: `with tempfile.TemporaryDirectory() as folder: print(os.path.exists(folder))` prints `True`, and `os.path.exists(folder)` afterwards is `False`;
2. copies the game and the tests into it (`shutil.copytree`), so your own files are never touched;
3. makes the mistake in the copy of `model.py`: `read_text()` reads the whole file as one string, `str.replace(right, wrong)` swaps the correct line for the mistaken one, and `write_text(...)` writes the result back;
4. runs `tests/test_boundaries.py` against the damaged copy, in that folder, so `import breakout` finds the copy. Why the copy, when lesson 4.3's editable install makes `import breakout` find your real project from anywhere? Because `-m` puts the current folder, the copy, first on `sys.path`, and Python's normal search through `sys.path` happens **before** the editable install's finder is asked: the finder was added at the **end** of `sys.meta_path`, a second list: of **finders**, the objects Python asks in turn to find a module. `.venv\Scripts\python -c "import sys; print(sys.meta_path)"` shows it: `PathFinder`, the finder that searches the folders in `sys.path`, comes before the editable install's `_EditableFinder`. A `breakout` found on `sys.path` wins. `-p no:cacheprovider` stops pytest writing its `.pytest_cache` folder into the copy, a little noise and time saved;
5. counts the mistake as **caught** if the tests fail (a non-zero exit code), and **missed** if they still pass.

A test that passes against wrong code is a test that isn't testing; this tool makes each wrong version on purpose and checks that your tests notice. The idea has a name, **mutation testing**, and Chapter 58 uses a full tool for it on the whole project.

```check
file check_walls.py -- Click "Create provided check_walls.py" above.
contains breakout/model.py "self.position.x > WIDTH - BALL_RADIUS:" -- Put model.py back with git restore breakout/model.py.
run ".venv/Scripts/python -m pytest -q" stdout="56 passed"
```

## Your turn: test the boundaries

**Build, on your own:** boundary tests for all three walls, then tidy up and commit.

Write `tests/test_boundaries.py` with three tests, one per wall, each placing the ball **exactly** at the wall's boundary and moving towards it, and checking that its velocity is unchanged:

| Test name | Ball at | Moving |
|---|---|---|
| `test_a_ball_resting_exactly_against_the_left_wall_keeps_moving_left` | x = `BALL_RADIUS` | left |
| `test_a_ball_resting_exactly_against_the_right_wall_keeps_moving_right` | x = `WIDTH - BALL_RADIUS` | right |
| `test_a_ball_resting_exactly_against_the_top_keeps_moving_up` | y = `BALL_RADIUS` | up |

Use the constants from `model`, not the numbers 6 and 634: the tests then stay right if the ball or the window changes size. Then:

```powershell
.venv\Scripts\python check_walls.py
```

must print `caught 3 of 3`. Finally, delete `review_these_tests.py` (its job is done, and everything good in it is now in `tests/`), and commit with a message that mentions **boundaries**.

Try it for about 15 minutes before taking a hint.

```hints
nudge: The colleague's good test is the first of the three. What changes for the right wall: which coordinate, which value, which direction of movement?
concept: "Exactly at the boundary" means the comparison in the code is *just* false: for the right wall the code bounces when `x > WIDTH - BALL_RADIUS`, so the boundary is `x == WIDTH - BALL_RADIUS`. A ball there moving right hasn't gone past, so nothing should change. If a test puts the ball one pixel away from the boundary, `<` and `<=` behave the same there, and `check_walls.py` reports the mistake as missed.
shape: Each test: `ball = model.Ball(Vector2(x, y), Vector2(vx, vy))`, `ball.bounce_off_walls()`, `assert ball.velocity == Vector2(vx, vy)`. The file needs `from pygame import Vector2` and `from breakout import model`.
answer: ~~~python
from pygame import Vector2

from breakout import model


def test_a_ball_resting_exactly_against_the_left_wall_keeps_moving_left():
    ball = model.Ball(Vector2(model.BALL_RADIUS, 100), Vector2(-180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(-180, -240)


def test_a_ball_resting_exactly_against_the_right_wall_keeps_moving_right():
    ball = model.Ball(Vector2(model.WIDTH - model.BALL_RADIUS, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(180, -240)


def test_a_ball_resting_exactly_against_the_top_keeps_moving_up():
    ball = model.Ball(Vector2(100, model.BALL_RADIUS), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball.velocity == Vector2(180, -240)
~~~

then `Remove-Item review_these_tests.py`. With the ball one pixel inside each wall instead, all three tests still pass, and `check_walls.py` prints `caught 0 of 3`: they'd pass for the wrong code too. Three tests that look almost the same as the project's existing wall tests, and catch three bugs none of the others can.
```

```check
run ".venv/Scripts/python check_walls.py" stdout="caught 3 of 3" label="the boundary tests catch all three off-by-one mistakes" -- Put the ball exactly at each boundary: BALL_RADIUS, WIDTH - BALL_RADIUS, and BALL_RADIUS from the top.
run ".venv/Scripts/python -m pytest -q" stdout="59 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
missing review_these_tests.py -- Delete review_these_tests.py: its job is done.
git-message "boundaries"
git-clean
```

## Challenge: the paddle's edges

**Optional, ★.** Write boundary tests for the paddle: at exactly `x == 0` and at exactly `x == WIDTH - PADDLE_WIDTH`, moving outwards, it must stay where it is. Then add mutations to a copy of `check_walls.py` that swap `max` and `min` in `clamp`, and check your tests catch them. On a branch.

## Challenge: a mutation tool

**Optional, ★★.** Turn `check_walls.py` into `mutate.py`, which reads its mutations from a list of `(file, right, wrong)` triples, runs the **whole** test suite against each, and prints the ones that survive. Find one mutation in `Brick.hit` that the current tests miss, and write the test that kills it.

## Challenge: review your own tests

**Optional, ★★.** Review `tests/test_game.py` against this lesson's rules, in a Markdown file on a branch: behaviour not implementation, boundaries, one reason to fail, names that read as specifications. Note also any test of trivial code, a line with no decision in it, which the behaviour tests already cover and which only adds maintenance. Propose one change, and make it.

## What did we actually learn?

- **Test behaviour through the public interface**, not internals; tests of internals punish improving the code.
- **Test your code**, not your libraries.
- **One behaviour per test**, named as a sentence about the program.
- **A test must be able to fail**: a test that passes for plausible wrong code protects nothing, and types already check what a weak "it returns a list" test checks.
- **Equivalence classes and boundary values**: one test per class finds most bugs; tests at the boundary find the off-by-one errors the others can't.
- **Mutation testing**: make deliberate mistakes in a copy, and check that the tests notice.
- **What not to test**: libraries, Python itself, and trivial code with no decisions in it.

These principles are the same in every language. In C# and Java, boundary tests are often written as one **parameterised** test with several cases (xUnit's `[Theory]` with `[InlineData(...)]`, JUnit's `@ParameterizedTest`), which pytest does with `@pytest.mark.parametrize`, coming in Chapter 5. Mutation-testing tools exist for both: Stryker.NET for C# and PIT for Java.
