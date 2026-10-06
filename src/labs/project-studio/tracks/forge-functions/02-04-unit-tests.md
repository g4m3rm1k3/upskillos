---
title: 2.4 — Unit Tests
runtime: python
run: breakout.py
---

Lesson 2.3 opened a seam: functions can be called directly. This lesson uses it to test every function in `breakout.py`, one behaviour per test, in a fraction of a second. Then comes the chapter's bug hunt, with a new kind of bug report: a test file that fails.

## Tests for the small functions

**Build:** unit tests for `clamp`, `start_ball`, `move_paddle` and `autopilot`, a few at a time.

The three `clamp` tests from lesson 2.3's Your turn stay as they are (if yours have other names, the lines below show the reference names). After them, add tests for the other three small functions. Each is one call and one comparison:

```python file=tests/test_breakout.py
import breakout


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3


def test_a_new_ball_starts_in_the_middle_moving_up_and_right():
    assert breakout.start_ball() == (320, 240, 180, -240)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    assert breakout.move_paddle(270, 1, 0.5) == 480


def test_the_paddle_stops_at_the_right_edge():
    assert breakout.move_paddle(500, 1, 1) == 540


def test_the_paddle_stops_at_the_left_edge():
    assert breakout.move_paddle(10, -1, 1) == 0


def test_the_autopilot_steers_towards_the_ball():
    assert breakout.autopilot(100, 270) == -1
    assert breakout.autopilot(320, 270) == 0
    assert breakout.autopilot(500, 270) == 1
```

**Understand: the shape of a unit test.** Almost every unit test has three parts, often called **arrange, act, assert**:

1. **Arrange**: set up the inputs. In the paddle-bounce tests two steps on, that will mean making a paddle `Rect` and a ball `Rect` at known positions; here, the arguments are all the arranging needed.
2. **Act**: call the one function being tested.
3. **Assert**: compare what it returned with what it should return.

When all three fit on one line, as in `assert breakout.move_paddle(270, 1, 0.5) == 480`, that's fine: the arrange is the arguments, the act is the call, and the assert is the comparison.

**Where each expected value comes from.** Work out every one yourself before you trust it:

```text
clamp(-5, 0, 3)            max(0, min(-5, 3)) = max(0, -5)                 →  0
clamp(9, 0, 3)             max(0, min(9, 3))  = max(0, 3)                  →  3
start_ball()               (640/2, 480/2, 300 × 0.6, -300 × 0.8)          →  (320.0, 240.0, 180.0, -240.0)
move_paddle(270, 1, 0.5)   270 + 1 × 420 × 0.5 = 480, inside 0..540        →  480
move_paddle(500, 1, 1)     500 + 420 = 920, clamped to 640 - 100           →  540
move_paddle(10, -1, 1)     10 - 420 = -410, clamped to 0                   →  0
autopilot(100, 270)        middle = 270 + 50 = 320; 100 < 320 - 10        →  -1
autopilot(320, 270)        320 is within 10 of 320                         →  0
autopilot(500, 270)        500 > 320 + 10                                  →  1
```

`start_ball()` returns floats, `320.0`, and the test compares them with whole numbers, `320`. Python treats `320.0 == 320` as `True`, so that's fine *here*, because each of these values comes out exact. That isn't always so with fractions: remember it for lesson 2.6.

**Understand: each test is one behaviour.** `test_the_autopilot_steers_towards_the_ball` has three `assert`s, all about one behaviour, steering, so one test is right. If one fails, the test stops at that line, and pytest shows which. Mixing unrelated behaviours in one test hides failures: a failed first `assert` means nothing after it was checked at all. (pytest can also run one test once per case and report each separately, with `@pytest.mark.parametrize`; Chapter 5 uses it, and a challenge below tries it now.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="8 passed" label="eight unit tests pass" -- Copy the tests exactly; if one fails, read its E lines: the difference is between your function and the lesson's.
```

## Tests for the walls

**Build:** a test for every way `bounce_off_walls` can treat the ball, and one for lesson 1.4's bug.

```python file=tests/test_breakout.py
import breakout


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3


def test_a_new_ball_starts_in_the_middle_moving_up_and_right():
    assert breakout.start_ball() == (320, 240, 180, -240)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    assert breakout.move_paddle(270, 1, 0.5) == 480


def test_the_paddle_stops_at_the_right_edge():
    assert breakout.move_paddle(500, 1, 1) == 540


def test_the_paddle_stops_at_the_left_edge():
    assert breakout.move_paddle(10, -1, 1) == 0


def test_the_autopilot_steers_towards_the_ball():
    assert breakout.autopilot(100, 270) == -1
    assert breakout.autopilot(320, 270) == 0
    assert breakout.autopilot(500, 270) == 1


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    assert breakout.bounce_off_walls(100, 100, 180, -240) == (100, 100, 180, -240)


def test_the_left_wall_sends_the_ball_right():
    assert breakout.bounce_off_walls(3, 100, -180, -240) == (6, 100, 180, -240)


def test_the_right_wall_sends_the_ball_left():
    assert breakout.bounce_off_walls(638, 100, 180, -240) == (634, 100, -180, -240)


def test_the_top_wall_sends_the_ball_down():
    assert breakout.bounce_off_walls(100, 2, 180, -240) == (100, 6, 180, 240)


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    assert breakout.bounce_off_walls(100, -40, 180, 240) == (100, 6, 180, 240)
```

**Understand: choosing the cases.** Testing every possible input is impossible, so each test is one **representative** of a group of inputs that the code treats the same way. `bounce_off_walls` treats a ball in four ways: not touching any wall, past the left, past the right, past the top. So there's one test for each, and each one would fail if that branch of the code were wrong. The numbers are chosen to make the right answer obvious: 3 pixels from the left with a radius of 6 is past the wall, so it must come back at 6, moving right.

```text
bounce_off_walls(100, 100, 180, -240)   no wall is near                    →  (100, 100, 180, -240)
bounce_off_walls(3, 100, -180, -240)    3 < 6: put back at 6, vx = +180    →  (6, 100, 180, -240)
bounce_off_walls(638, 100, 180, -240)   638 > 640 - 6: back at 634, vx = -180  →  (634, 100, -180, -240)
bounce_off_walls(100, 2, 180, -240)     2 < 6: back at 6, vy = +240        →  (100, 6, 180, 240)
```

Look at the comparisons with tuples: `== (6, 100, 180, -240)` checks all four values at once. Two tuples are equal when they have the same length and every pair of items is equal. Two `Rect`s are equal when their positions and sizes are.

**Understand: the regression test.** `test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down` is lesson 1.4's bug, written as a test: the exact state the ball was in after the slow frame (40 pixels past the top, already moving down), and what must happen next. Lesson 0.3's method ended with "check it can't come back"; this is how. The comment above it says *why* the test exists, which is the one thing its name can't.

> **Regression test**: a test written for a bug that was found and fixed, so that the bug can never quietly return. (A **regression** is a change that makes something that used to work stop working.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="13 passed" label="thirteen unit tests pass" -- Copy the tests exactly; if one fails, read its E lines: the difference is between your function and the lesson's.
```

## Tests for the paddle bounce

**Build:** tests that put a ball against the paddle at chosen places.

`bounce_off_paddle` takes two `Rect`s, so these tests have to make them, which needs `pygame` imported at the top of the test file. Each test **arranges** a paddle where the game puts it and a ball touching it:

```python file=tests/test_breakout.py
import pygame

import breakout


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3


def test_a_new_ball_starts_in_the_middle_moving_up_and_right():
    assert breakout.start_ball() == (320, 240, 180, -240)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    assert breakout.move_paddle(270, 1, 0.5) == 480


def test_the_paddle_stops_at_the_right_edge():
    assert breakout.move_paddle(500, 1, 1) == 540


def test_the_paddle_stops_at_the_left_edge():
    assert breakout.move_paddle(10, -1, 1) == 0


def test_the_autopilot_steers_towards_the_ball():
    assert breakout.autopilot(100, 270) == -1
    assert breakout.autopilot(320, 270) == 0
    assert breakout.autopilot(500, 270) == 1


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    assert breakout.bounce_off_walls(100, 100, 180, -240) == (100, 100, 180, -240)


def test_the_left_wall_sends_the_ball_right():
    assert breakout.bounce_off_walls(3, 100, -180, -240) == (6, 100, 180, -240)


def test_the_right_wall_sends_the_ball_left():
    assert breakout.bounce_off_walls(638, 100, 180, -240) == (634, 100, -180, -240)


def test_the_top_wall_sends_the_ball_down():
    assert breakout.bounce_off_walls(100, 2, 180, -240) == (100, 6, 180, 240)


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    assert breakout.bounce_off_walls(100, -40, 180, 240) == (100, 6, 180, 240)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (320, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, 240) == (0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (370, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, 240) == (240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (320, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, -240) == (180, -240)
```

**Understand: the arranged positions.** `pygame.Rect(270, 436, 100, 14)` is the paddle exactly where the game starts it: left edge 270, top 436 (lesson 1.3 worked that out from `midbottom` at 450). The ball's `Rect` is 12 × 12, and `ball.center = (320, 438)` puts it at x 314 to 325 and y 432 to 443: its bottom 8 rows (y 436 to 443) overlap the paddle's top rows, which is what makes `colliderect` true. Check the arrangement in the REPL before trusting it:

```text
>>> import pygame
>>> paddle = pygame.Rect(270, 436, 100, 14)
>>> ball = pygame.Rect(0, 0, 12, 12)
>>> ball.center = (320, 438)
>>> ball, ball.colliderect(paddle)
(Rect(314, 432, 12, 12), True)
>>> ball.center = (320, 420)
>>> ball, ball.colliderect(paddle)
(Rect(314, 414, 12, 12), False)
```

A test's arranged values are worth checking on their own like this: a test built on a ball that doesn't actually touch the paddle would test nothing. Then:

```text
centre x 320, moving down (vy = 240):   offset (320 - 320) / 50 =  0  →  vx = 300 × 0.8 × 0 =   0,  vy = -240   →  (0, -240)
centre x 370, moving down:              offset (370 - 320) / 50 =  1  →  vx = 300 × 0.8 × 1 = 240,  vy = -240   →  (240, -240)
centre x 320, moving up (vy = -240):    vy > 0 is False, so nothing changes                           →  (180, -240)
```

The third test pins a rule that's easy to break: a ball already moving up must never be bounced again, or it would stick to the paddle (lesson 1.4).

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="16 passed" label="sixteen unit tests pass" -- Copy the tests exactly; if one fails, read its E lines: the difference is between your function and the lesson's.
```

## Tests for the wall of bricks

**Build:** tests that the wall is built where it should be, in the right colours.

```python file=tests/test_breakout.py
import pygame

import breakout


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3


def test_a_new_ball_starts_in_the_middle_moving_up_and_right():
    assert breakout.start_ball() == (320, 240, 180, -240)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    assert breakout.move_paddle(270, 1, 0.5) == 480


def test_the_paddle_stops_at_the_right_edge():
    assert breakout.move_paddle(500, 1, 1) == 540


def test_the_paddle_stops_at_the_left_edge():
    assert breakout.move_paddle(10, -1, 1) == 0


def test_the_autopilot_steers_towards_the_ball():
    assert breakout.autopilot(100, 270) == -1
    assert breakout.autopilot(320, 270) == 0
    assert breakout.autopilot(500, 270) == 1


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    assert breakout.bounce_off_walls(100, 100, 180, -240) == (100, 100, 180, -240)


def test_the_left_wall_sends_the_ball_right():
    assert breakout.bounce_off_walls(3, 100, -180, -240) == (6, 100, 180, -240)


def test_the_right_wall_sends_the_ball_left():
    assert breakout.bounce_off_walls(638, 100, 180, -240) == (634, 100, -180, -240)


def test_the_top_wall_sends_the_ball_down():
    assert breakout.bounce_off_walls(100, 2, 180, -240) == (100, 6, 180, 240)


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    assert breakout.bounce_off_walls(100, -40, 180, 240) == (100, 6, 180, 240)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (320, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, 240) == (0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (370, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, 240) == (240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (320, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, -240) == (180, -240)


def test_the_wall_has_forty_bricks_from_the_top_left():
    bricks = breakout.make_bricks()
    assert len(bricks) == 40
    assert bricks[0] == pygame.Rect(16, 60, 70, 20)
    assert bricks[-1] == pygame.Rect(548, 164, 70, 20)


def test_each_row_of_bricks_has_its_own_colour():
    bricks = breakout.make_bricks()
    assert breakout.brick_colour(bricks[0]) == breakout.ROW_COLOURS[0]
    assert breakout.brick_colour(bricks[-1]) == breakout.ROW_COLOURS[4]
```

**Understand.** The first and last bricks pin the whole layout down. The first is at column 0, row 0: x = 16, y = 60. The last is at column 7, row 4:

```text
x = 16 + 7 × (70 + 6) = 16 + 532 = 548
y = 60 + 4 × (20 + 6) = 60 + 104 = 164         →  pygame.Rect(548, 164, 70, 20)
```

Two `Rect`s are equal when their positions and sizes are, so one `==` checks all four numbers. The colour test checks the top row gets the first colour and the bottom row the fifth.

```powershell
.venv\Scripts\python -m pytest -q tests/test_breakout.py
```

```text
..................                                                       [100%]
18 passed in 0.11s
```

Eighteen tests in a tenth of a second.

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="18 passed" label="eighteen unit tests pass" -- Copy the tests exactly; if one fails, read its E lines: the difference is between your function and the lesson's.
```

## Which tests notice?

**Build:** nothing to keep. Put lesson 1.4's bug back, and see which tests catch it.

In `bounce_off_walls`, replace the top-wall lines with the original buggy version:

```python
    if y < BALL_RADIUS:
        vy = -vy
```

```predict
question: Running all the tests (characterisation and unit), which will fail?
choice: Only the characterisation test about a slow frame
choice: The two top-wall unit tests, and at least one characterisation test
choice: Every test that plays the game
answer: The two top-wall unit tests, and at least one characterisation test
explain: The two unit tests that pass a ball past the top fail, and say exactly where: `test_the_top_wall_sends_the_ball_down` and the regression test. Among the characterisation tests, `test_autopilot_wins` fails, because the ball's path changes slightly every time it touches the top. And the characterisation test *named* after the slow frame passes! With bricks in the way, the slow frame at frame 40 now costs a life instead of trapping the ball past the top, so that test never exercises the bug it was named after. A characterisation test's name is a guess about what it covers. A unit test aims at one behaviour directly.
```

```text
FAILED tests/test_breakout.py::test_the_top_wall_sends_the_ball_down - assert...
FAILED tests/test_breakout.py::test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down
FAILED tests/test_characterisation.py::test_autopilot_wins - AssertionError: ...
3 failed, 23 passed in 8.46s
```

Put it back:

```powershell
git restore breakout.py
```

**Understand: two kinds of test, two jobs.** The characterisation test says *something changed in the game* and nothing about where. The unit tests say *the top wall is wrong*, and their names say what the right behaviour is. That's why a project needs both kinds: tests of small pieces, which are fast and precise, and tests of the whole, which catch problems in how the pieces work together. This balance has a name, the **testing pyramid**: many fast **unit tests** at the bottom, fewer **integration tests** of several pieces together above them, and a few slow **end-to-end tests** of the whole program at the top. Your characterisation tests are end-to-end tests.

```check
contains breakout.py "y, vy = BALL_RADIUS, abs(vy)" -- Put the file back with git restore breakout.py.
run ".venv/Scripts/python -m pytest -q" stdout="passed" label="every test passes again"
```

## Your turn: bug hunt — the command line

**Build, on your own:** make a failing test file pass.

Lesson 1.6 found that only `--test-run` is checked: `--hold sideways` is silently ignored, and `--lag-at` with no number crashes. Here's that bug report, written as tests. Click **Create provided tests/test_arguments.py**, read it, then run it:

```python file=tests/test_arguments.py provided
# Supplied with lesson 2.4: what the game's command line should accept, and what it should refuse.
import pytest

import breakout


def test_no_arguments_is_a_normal_game():
    assert breakout.parse_args([]) == (None, "none", None)


def test_a_test_run_with_every_option():
    assert breakout.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40"]) == (600, "auto", 40)


def test_an_unknown_hold_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--hold", "sideways"])
    assert stopped.value.code == 2


def test_a_hold_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--hold"])
    assert stopped.value.code == 2


def test_a_lag_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--lag-at"])
    assert stopped.value.code == 2


def test_a_lag_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--lag-at", "soon"])
    assert stopped.value.code == 2


def test_a_usage_error_says_how_to_use_the_game(capsys):
    with pytest.raises(SystemExit):
        breakout.parse_args(["--hold", "sideways"])
    assert capsys.readouterr().out.startswith("usage: python breakout.py")
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_arguments.py
```

```text
FAILED tests/test_arguments.py::test_an_unknown_hold_is_a_usage_error - Faile...
FAILED tests/test_arguments.py::test_a_hold_with_nothing_after_it_is_a_usage_error
FAILED tests/test_arguments.py::test_a_lag_with_nothing_after_it_is_a_usage_error
FAILED tests/test_arguments.py::test_a_lag_that_is_not_a_number_is_a_usage_error
FAILED tests/test_arguments.py::test_a_usage_error_says_how_to_use_the_game
5 failed, 2 passed in 0.27s
```

(pytest cuts long summary lines short with `...`.)

**First, catching an exception.** Until now an exception has always stopped the program. It doesn't have to. Try this scratch program, `scratch/catch.py`:

```python
import sys

try:
    sys.exit(2)
except SystemExit as error:
    print("caught it; the code was", error.code)
print("still running")
```

```predict
question: Will `still running` be printed?
choice: No: `sys.exit(2)` ends the program
choice: Yes: the exception is caught, and the program carries on after it
answer: Yes: the exception is caught, and the program carries on after it
explain: `sys.exit(2)` doesn't end the program by itself: it **raises** an exception, `SystemExit`, carrying the code 2. `try:` marks a block whose exceptions you're ready for. When something inside it raises, Python stops running the block and looks for an `except` naming that exception's type; `except SystemExit as error:` matches, binds the exception to `error`, and runs its block. After that the program carries on below, as if nothing happened. So it prints `caught it; the code was 2`, then `still running`. Only an exception nobody catches ends the program, with a traceback (or, for `SystemExit`, quietly with its code).
```

`try`/`except` is how a program deals with a failure it expected, instead of crashing. Chapter 5 uses it properly, for files a player got wrong; here it explains what pytest does for you.

**Reading the bug report.** Four things in it are new:

- **`sys.exit(2)` raises an exception.** It doesn't stop Python on the spot: it raises `SystemExit(2)`, and if nothing catches it, Python ends with that exit code. That's what lets a test check it.
- **`with X as name:`** is a `with` statement, new here. `X` is a **context manager**: an object Python calls once when the block starts, and once when it ends, however it ends. The second call is told about any exception the block raised, and may catch it, like the `except` above. `as stopped` names what `X` hands over at the start, so the test can look at it afterwards. (Opening a file with `with open(...)`, in Chapter 5, is the same mechanism: there, the end of the block closes the file.)
- **`with pytest.raises(SystemExit) as stopped:`** runs the indented code and **expects** it to raise `SystemExit`. If it does, the exception is caught, stored in `stopped.value`, and the test continues: `stopped.value.code` is the code given to `sys.exit`. If the code *doesn't* raise, the test fails with `DID NOT RAISE`. If it raises a *different* exception, like `IndexError`, that exception isn't caught, and the test fails with it.
- **`capsys`** in `def test_…(capsys):` asks pytest for a helper object, by naming it as a parameter. Before calling the test, pytest reads its parameter names, finds a helper with each name (`capsys` is built in), makes it, and passes it in: `test_…(capsys=<the capture object>)`. Misspell it, `capsy`, and the test fails with `fixture 'capsy' not found`. While the test runs, pytest captures everything printed, and `capsys.readouterr()` returns it, split into `.out` (standard output) and `.err` (standard error), and empties the capture for whatever is printed next. (Objects pytest hands to tests this way are called **fixtures**; Chapter 6 writes its own.)

Now **fix `breakout.py`** until all seven tests pass, following the method: read each failure's `E` lines (*observe*), run one test at a time with `-k` (*reproduce*), and decide what each failure means before changing anything. The tests are the specification: you're done when they pass, and the existing tests still do.

Two requirements the tests imply:

- A usage error prints a usage line starting `usage: python breakout.py` and exits with code 2, for every option, not just `--test-run`.
- `--hold` accepts only `left`, `right`, `none` and `auto`.

Try it for about 20 minutes before taking a hint.

```hints
nudge: The five failures are three different problems. Group them by the error in their `E` lines: which ones say `DID NOT RAISE`, which `IndexError`, and which `ValueError`? They come from two options' missing checks: `--hold` and `--lag-at` each read the word after them without checking it.
concept: `--test-run` already has the right check: "is there a word after it, and is it all digits?". `--lag-at` needs exactly the same check, so it belongs in a function both can use (lesson 2.2: one piece of knowledge, one place). `--hold` needs a different check: is there a word after it, and is that word one of the four allowed? `in` works on lists: `"sideways" in ["left", "right", "none", "auto"]` is `False`.
shape: A function `number_after(args, name)` returning `None` if `name` isn't in `args`, printing the usage line and calling `sys.exit(2)` if the word after it is missing or not digits, and otherwise returning it as an `int`. Use it for both `--test-run` and `--lag-at`. For `--hold`, the same "missing or not allowed" check against a list constant `HOLDS`. Make the usage line a constant too, `USAGE`, since three places print it.
answer: New constants, under the others:

~~~python
HOLDS = ["left", "right", "none", "auto"]
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]]"
~~~

and `parse_args` with its helper:

~~~python
def number_after(args, name):
    if name not in args:
        return None
    i = args.index(name)
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print(USAGE)
        sys.exit(2)
    return int(args[i + 1])


def parse_args(args):
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at
~~~

`number_after` is lesson 1.1's check, given a name and a parameter so it serves any numeric option. The usage line now describes every option; the nested square brackets say that `--hold` and `--lag-at` only make sense inside a test run. The characterisation test for usage still passes because it only checks the beginning of the line, which is why it was written that way in lesson 2.1. The next lesson's first step shows the whole file.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="7 passed" label="all seven argument tests pass" -- Every option needs a check: a missing or non-numeric number, and a --hold that isn't left, right, none or auto, must print the usage line and sys.exit(2).
run ".venv/Scripts/python -m pytest -q" stdout="33 passed" label="and every other test still passes"
run ".venv/Scripts/python breakout.py --test-run 5 --hold sideways" exit=2 stdout="usage: python breakout.py" label="the real program refuses --hold sideways"
```

## Challenge: one test per case

**Optional, ★.** Rewrite `test_the_autopilot_steers_towards_the_ball` with `@pytest.mark.parametrize("ball_x, expected", [(100, -1), (320, 0), (500, 1), (309, -1), (331, 1)])` above it, and `ball_x` and `expected` as its parameters: pytest calls it once per pair and reports each by name (`-v` shows them). Add the exact edges of the dead zone, 310 and 330: what should they give? Testing at the boundaries is where off-by-one mistakes are found.

## Challenge: test the drawing

**Optional, ★★.** `draw` has side effects, and they can be tested too, by inspecting what it changed. Make a surface with no window, `pygame.Surface((640, 480))`, and a font (after `pygame.font.init()`), call `draw`, then check a pixel inside the first brick: `screen.get_at((20, 65))[:3] == breakout.ROW_COLOURS[0]`.

## Challenge: find the untested lines

**Optional, ★★.** Install `coverage` (pin its version in `requirements.txt`), run `.venv\Scripts\python -m coverage run -m pytest tests/test_breakout.py tests/test_arguments.py`, then `.venv\Scripts\python -m coverage report -m`. It lists, per file, which lines no test ran. Write unit tests for any line of the pure functions it reports. (Chapter 5 does this properly.)

## Done: commit it

**Build:** commit, and cross off the debt.

In `BACKLOG.md`, under *Technical debt*, delete the items this chapter has fixed so far (the duplicated ball set-up, the brick colours worked out from a separate copy of the spacing, everything being global, and the half-checked arguments), or mark them `(fixed)` if you'd rather keep a record. Then commit, with a message that mentions the **command-line**:

```powershell
git add .
git commit -m "Add unit tests, and check every command-line option"
```

```check
git-tracked tests/test_arguments.py
git-message "command-line" -- Commit with a message that mentions the command-line.
git-clean
```

## What did we actually learn?

- **Arrange, act, assert**: the shape of almost every unit test.
- **One representative per group of inputs** the code treats the same way: a test for each branch.
- **One behaviour per test**, named so the failure report reads as a description of what broke.
- **Regression tests** pin down a fixed bug so it can't return.
- **Unit tests and whole-program tests do different jobs**: precise and fast against broad and slow. The testing pyramid is many of the first and a few of the second.
- **A failing test is a precise bug report**: it says what should happen, with exact inputs, and pytest shows what did. `pytest.raises` checks that code raises an exception; `sys.exit` is one.

The same test in C#'s xUnit is a method marked `[Fact]` containing `Assert.Equal((6, 100, 180, -240), Breakout.BounceOffWalls(3, 100, -180, -240))`, and in Java's JUnit a method marked `@Test` with `assertEquals(...)`. Expecting an exception is `Assert.Throws<ArgumentException>(() => ...)` in xUnit and `assertThrows(IllegalArgumentException.class, () -> ...)` in JUnit, the same idea as `pytest.raises`. Those two languages don't use exit codes for argument errors inside a program; they throw an exception, and only the very top of the program turns it into an exit code. Chapter 5 does the same in Python.
