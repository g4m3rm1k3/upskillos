---
title: 2.1 — A Safety Net
track: Forge — Functions You Can Test
trackOrder: 32
runtime: python
run: breakout.py
---

Chapter 1 ended with a list of what's wrong with `breakout.py`. This chapter fixes the worst of it: it splits the script into **functions**, small parts with names, and tests them one by one. But changing the structure of working code is exactly how working code gets broken. So before touching a single line of the game, this lesson builds a **safety net**: tests that record what the game does *now*, and fail if a change alters it.

> **Test**: a piece of code that runs part of a program with known inputs, and checks that it produces the expected results. **Test runner**: a program that finds the tests in a project, runs them all, and reports which passed and which failed.

## Install pytest

**Build:** add the test runner the rest of the series uses.

**pytest** is the most widely used test runner for Python. Add it to `requirements.txt`, under pygame-ce:

```text file=requirements.txt
pygame-ce==2.5.8
pytest==9.1.1
```

Then install, exactly as in lesson 0.2:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest --version
```

```text
pytest 9.1.1
```

**Understand: dependencies of dependencies.** pip installs more than pytest. Run `.venv\Scripts\python -m pip list` and you'll see `pluggy`, `iniconfig`, `packaging`, `colorama` and `Pygments` too. pytest needs them, so pip installed them as well: they're **transitive dependencies**, the dependencies of your dependencies. `requirements.txt` pins only the packages *you* use directly; the versions of the others are chosen by pip on the day. That's usually fine, and Chapter 51 shows how to pin everything when a release needs to be exactly reproducible.

```check
contains requirements.txt "pytest==9.1.1"
run ".venv/Scripts/python -m pytest --version" stdout="pytest 9.1.1" label="pytest 9.1.1 is installed in the environment" -- Run .venv\Scripts\python -m pip install -r requirements.txt.
```

## The first test

**Build:** a test that runs the game the way **Check my work** has been doing, and compares the result with what it does today.

Make a folder named `tests` in the project, and in it a file `test_characterisation.py`:

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught.
import subprocess
import sys
from pathlib import Path

GAME = Path(__file__).parent.parent / "breakout.py"


def play(*args):
    return subprocess.run([sys.executable, str(GAME), *args], capture_output=True, text=True)


def last_line(*args):
    return play(*args).stdout.strip().splitlines()[-1]


def test_autopilot_plays_for_ten_seconds():
    assert last_line("--test-run", "600", "--hold", "auto") == "frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True"
```

Run every test in the project:

```powershell
.venv\Scripts\python -m pytest
```

```text
collected 1 item

tests\test_characterisation.py .                                         [100%]

============================== 1 passed in 1.17s ==============================
```

(Timings in this lesson are from the machine it was written on; yours will differ.)

**Understand: how pytest finds and runs tests.** pytest searches the current folder and every folder below it for files named `test_*.py`. It imports each one, and every function whose name starts with `test_` is a test. It calls each test function in turn: if the function returns normally, the test **passes** (a `.` in the output); if it raises an exception, the test **fails** (an `F`). That's the whole contract. Nothing has to be registered anywhere, and a test is an ordinary function.

**`assert`** is a Python statement: `assert condition` does nothing if the condition is true and raises `AssertionError` if it's false. So `assert last_line(...) == "..."` passes when the game printed exactly that line.

`-q` ("quiet") makes pytest print one character per test, `.` for a pass and `F` for a failure, and a one-line summary at the end, instead of a line per test. The checks use it, and so will you.

**Understand: the helpers, piece by piece.**

`Path(__file__)` is the path of this test file, as a `Path` object from Python's `pathlib` module. An **object** is a value that carries its own data together with functions that work on it, called its **methods**, reached with a dot; you've used them already, like `"600".isdigit()`. A `Path` object represents a file path, with methods for working with it. `.parent` is the folder it's in (`tests`), and `.parent.parent` the folder above that (the project). The `/` operator joins a `Path` and a name, so `GAME` is the full path of `breakout.py`, however the tests are started and from whatever folder. Lesson 0.1's rule about relative paths, applied: no hidden input.

`subprocess.run([...])` starts another program as a separate **process**, exactly as the shell did in lesson 0.1, waits for it to finish, and returns a result object. The list is the program and its arguments, already split into words:

- `sys.executable` is the path of the Python running this test: the `.venv` one, so the game runs with the same packages.
- `str(GAME)` turns the `Path` back into text, which is what a command line is made of.
- `capture_output=True` keeps the program's standard output and error instead of letting them appear in the terminal, and `text=True` gives them back as strings rather than bytes.

The result has `.stdout` (everything the game printed) and `.returncode` (its exit code).

**`*args`** in `def play(*args)` collects all the positional arguments the function is given into a **tuple** named `args` (a tuple is a fixed sequence of values written in round brackets, like a list that can't be changed): `play("--test-run", "600")` gives `args = ("--test-run", "600")`. In the list `[sys.executable, str(GAME), *args]`, the `*` does the opposite: it **unpacks** the tuple, putting its items into the list one by one. Traced:

```text
last_line("--test-run", "600", "--hold", "auto")
  → play("--test-run", "600", "--hold", "auto")      args = ("--test-run", "600", "--hold", "auto")
  → subprocess.run([".venv\Scripts\python.exe", "C:\...\forge\breakout.py", "--test-run", "600", "--hold", "auto"], ...)
  → stdout = "pygame-ce 2.5.8 (...)\nframes=600 paddle_x=218 ...\n"
  → .strip().splitlines()[-1] = "frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True"
```

`.strip()` removes the trailing newline, `.splitlines()` splits the text into a list of lines, and `[-1]` is the last one: negative indexes count from the end.

**Why `python -m pytest`, not `pytest`?** The same reason as `python -m pip` in lesson 0.2: it can only be this environment's pytest.

> **Characterisation test**: a test that records what existing code does *now*, right or wrong, so that any later change to its behaviour is noticed. It doesn't claim the behaviour is correct, only that it's unchanged. Also called a **golden master** test: the recorded output is the "master" copy that every later run is compared with.

```check
run ".venv/Scripts/python -m pytest -q" stdout="1 passed" label="pytest finds one test, and it passes" -- The file must be tests/test_characterisation.py and the function's name must start with test_.
```

## Make it fail on purpose

**Build:** nothing to keep. Find out what a failing test looks like before you need to read one for real.

In `breakout.py`, change `BALL_SPEED = 300` to `BALL_SPEED = 310`: a ball 3% faster. Don't run the tests yet.

Run the single test now:

```powershell
.venv\Scripts\python -m pytest
```

```text
F                                                                        [100%]
================================== FAILURES ===================================
____________________ test_autopilot_plays_for_ten_seconds _____________________

    def test_autopilot_plays_for_ten_seconds():
>       assert last_line("--test-run", "600", "--hold", "auto") == "frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True"
E       AssertionError: assert 'frames=600 p...5 inside=True' == 'frames=600 p...3 inside=True'
E
E         - frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True
E         ?                     ^^^       ^                  ^
E         + frames=600 paddle_x=0 score=50 lives=3 bricks=35 inside=True
E         ?                     ^       ^                  ^

tests\test_characterisation.py:19: AssertionError
=========================== short test summary info ===========================
FAILED tests/test_characterisation.py::test_autopilot_plays_for_ten_seconds
1 failed in 1.07s
```

**Understand: reading a pytest failure.** It's a traceback (lesson 0.3) with extra help:

- The `>` marks the line that failed, and `E` lines explain why.
- pytest rewrites every `assert` in a test file before running it, so when one fails it can show the values on both sides, not just "AssertionError". Long strings are shortened (`...`) on the first line, then shown in full below.
- The `-` line is what the test **expected**, the `+` line is what the code **actually** produced, and the `?` lines put `^` under each character that differs: the paddle's position, the score, and the bricks left.
- The last line names the file and line of the failed `assert`, and the summary lists every failed test by its full name: `file::function`.

Now put it back, and check:

```powershell
git restore breakout.py
.venv\Scripts\python -m pytest
```

> **Engineer:** a test you've never seen fail might not be able to fail. Make each new test fail once, on purpose, by changing the code it covers, and check that it fails for the reason you expect. Then you know it's watching what you think it's watching.

```check
contains breakout.py "BALL_SPEED = 300" -- Put the speed back with git restore breakout.py.
run ".venv/Scripts/python -m pytest -q" stdout="1 passed" label="the test passes again"
```

## Pin more of the game

**Build:** five more characterisation tests, covering the other things the game does.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught.
import subprocess
import sys
from pathlib import Path

GAME = Path(__file__).parent.parent / "breakout.py"


def play(*args):
    return subprocess.run([sys.executable, str(GAME), *args], capture_output=True, text=True)


def last_line(*args):
    return play(*args).stdout.strip().splitlines()[-1]


def test_autopilot_plays_for_ten_seconds():
    assert last_line("--test-run", "600", "--hold", "auto") == "frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True"


def test_nobody_at_the_paddle_loses():
    assert last_line("--test-run", "600", "--hold", "none") == "frames=600 paddle_x=270 score=50 lives=0 bricks=35 inside=False"


def test_autopilot_wins():
    assert last_line("--test-run", "10000", "--hold", "auto") == "frames=10000 paddle_x=245 score=400 lives=3 bricks=0 inside=True"


def test_holding_right_for_half_a_second():
    assert last_line("--test-run", "30", "--hold", "right") == "frames=30 paddle_x=480 score=10 lives=3 bricks=39 inside=True"


def test_a_slow_frame_keeps_the_ball_on_screen():
    assert last_line("--test-run", "400", "--hold", "auto", "--lag-at", "40") == "frames=400 paddle_x=386 score=60 lives=2 bricks=34 inside=True"


def test_a_bad_frame_count_is_a_usage_error():
    result = play("--test-run", "ten")
    assert result.returncode == 2
    assert result.stdout.strip().splitlines()[-1].startswith("usage: python breakout.py")
```

```text
.venv\Scripts\python -m pytest
collected 6 items

tests\test_characterisation.py ......                                    [100%]

============================== 6 passed in 6.47s ==============================
```

**Understand.** Each test is one behaviour, and its **name says what the behaviour is**, so a failure report like `FAILED ...::test_nobody_at_the_paddle_loses` tells you what broke before you read any code. A good test name reads as a sentence about the program.

The last test checks two things about one behaviour (the exit code, then the message): if the first `assert` fails, the second doesn't run, and the report points at the first. `s.startswith(p)` returns `True` when the string `s` begins with `p`. It checks only the beginning of the usage line, on purpose: lesson 2.4 will change what comes after `usage: python breakout.py`, and this test is about *getting* a usage message, not its exact wording.

Notice what the slow-frame test records: `lives=2`. With bricks in the way, the half-second frame now costs a life. Is that right? It doesn't matter here. A characterisation test pins down **what happens**, right or wrong, so that you notice when it changes. Deciding what *should* happen comes with unit tests, in lesson 2.4.

**These tests are slow.** Add `--durations=3` to see where the time goes:

```text
2.51s call     tests/test_characterisation.py::test_autopilot_wins
0.97s call     tests/test_characterisation.py::test_nobody_at_the_paddle_loses
0.95s call     tests/test_characterisation.py::test_autopilot_plays_for_ten_seconds
```

Six tests, six and a half seconds, because each one starts Python, starts pygame and plays thousands of frames. Fine for a safety net; far too slow to run after every small change, and far too coarse to say *which* part is wrong when one fails. Both problems are what lesson 2.4 fixes.

Now try the experiment from the last step again, with all six:

```predict
question: Change `BALL_SPEED` to 310 again, a ball 3% faster. How many of the six tests will fail?
choice: All six: everything the game does has changed
choice: Some of them, but not all
choice: None: 3% is too small to notice
answer: Some of them, but not all
explain: A test only notices what it looks at. A faster ball changes where the ball goes, so the tests that let the ball play for a while see different numbers. But the test that holds right for half a second checks a moment before the ball reaches anything that would differ, and the usage-error test never starts the game at all. When this lesson was written, 3 of the 6 failed. A test suite isn't a guarantee that nothing changed; it's a guarantee that *what it checks* didn't change.
```

Put `BALL_SPEED` back to 300 before checking.

```check
run ".venv/Scripts/python -m pytest -q" stdout="6 passed" label="all six characterisation tests pass"
```

## Raise the bar for "done"

**Build:** add the tests to the definition of done, and commit.

From now on, a story isn't done until the tests pass. Change the second line of `BACKLOG.md` to:

```text
A story is done when every acceptance check under it is ticked, `.venv\Scripts\python -m pytest` passes, and the work is committed.
```

Then commit everything:

```powershell
git add .
git commit -m "Add characterisation tests for breakout.py"
```

Note that `git status` never showed a `.pytest_cache` folder: pytest makes one, but it writes a `.gitignore` inside it that ignores the folder itself, a courtesy many tools now extend.

```check
contains BACKLOG.md "python -m pytest` passes" -- Change the definition of done in BACKLOG.md to include the tests passing.
git-tracked tests/test_characterisation.py -- git add . and commit.
git-clean
```

## Your turn: two more pins

**Build, on your own:** two more characterisation tests, for behaviours the six don't cover yet.

| Test name must contain | Behaviour |
|---|---|
| `left_edge` | holding **left** for **one second** (60 frames) leaves the paddle at the left edge |
| `stays_lost` | with nobody at the paddle, the game after **1000** frames is exactly as it was when it was lost (compare with the 600-frame test's line) |

Record the real output first, by running the command yourself and copying its last line. The checks run your new tests on their own with `-k`: `pytest -k left_edge` runs only the tests whose names contain `left_edge`, which is also how you'll run one test while you work on it. Then write the test, run it, and **make it fail once on purpose** (as above) to be sure it can. Put the code back before checking.

```hints
nudge: Run `.venv\Scripts\python breakout.py --test-run 60 --hold left` and look at its last line: that's the expected value for the first test. What command gives the second one?
concept: Each test follows the same pattern as the others: call `last_line` with the arguments as separate strings, and `assert` that it equals the line you recorded. The name must start with `test_` so pytest finds it, and should say what the behaviour is.
shape: Two new functions at the end of the file, `def test_holding_left_for_a_second_stops_at_the_left_edge():` and `def test_a_lost_game_stays_lost():`, each with one `assert last_line(...) == "..."`.
answer: ~~~python
def test_holding_left_for_a_second_stops_at_the_left_edge():
    assert last_line("--test-run", "60", "--hold", "left") == "frames=60 paddle_x=0 score=10 lives=3 bricks=39 inside=True"


def test_a_lost_game_stays_lost():
    assert last_line("--test-run", "1000", "--hold", "none") == "frames=1000 paddle_x=270 score=50 lives=0 bricks=35 inside=False"
~~~

The second test pins down the *Win or lose* story's "stops play": 400 more frames after the game was lost, and nothing has changed, not even the score. If a later change let the ball keep moving after the last life, this test would catch it, and the 600-frame test wouldn't.
```

```check
run ".venv/Scripts/python -m pytest -q -k left_edge" stdout="1 passed" label="a test whose name contains left_edge passes" -- The name must contain left_edge, and the expected line must be what the game really prints.
run ".venv/Scripts/python -m pytest -q -k stays_lost" stdout="1 passed" label="a test whose name contains stays_lost passes"
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="all eight tests pass"
```

## What did we actually learn?

- **A test is code that checks code**, and a test runner finds and runs them: for pytest, `test_*.py` files and `test_` functions, passing unless they raise.
- **Characterisation tests** pin down what code does now, so that changing its structure safely becomes possible. They say nothing about whether the behaviour is right.
- **A test only catches what it looks at.** Make each one fail once, on purpose, to know it can.
- **Read failures from the `E` lines**: expected (`-`), actual (`+`), and where they differ.
- **`subprocess`** starts programs from Python, the way a shell does: arguments in, output and exit code out.
- **Done now includes the tests passing.** The definition of done only ever gets stricter.

Every language has a test runner that works this way: in C#, xUnit finds methods marked `[Fact]` and you write `Assert.Equal(expected, actual)`; in Java, JUnit finds methods marked `@Test`, with `assertEquals(expected, actual)`. Characterisation testing is the standard first step in changing old code in any language: the technique comes from Michael Feathers' book *Working Effectively with Legacy Code*, where "legacy code" is defined as code without tests.
