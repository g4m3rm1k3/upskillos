---
title: 6.5 — Setup That Cleans Up After Itself
runtime: python
run: breakout/__main__.py
---

Count the lines in the tests that aren't testing anything: `db = open_scores(tmp_path / "scores.db")` at the top of ten tests and `db.close()` at the bottom, the same `classic_wall()` helper written twice since lesson 5.1, and the same `started_game()` beside it. Worse, when a test fails, its `assert` raises, the lines after it never run, and that test's database is never closed. pytest's answer to both is the **fixture**, and you've used two already: `tmp_path` and `capsys`. This lesson writes your own, then steps back to look at the shape of the whole test suite.

## The report so far

**Build:** make sure `breakout/report.py` matches the end of lesson 6.4, the reference answer to its Your turn.

```python file=breakout/report.py
"""Level reports for level designers: how a level's games have gone. Written by a teammate.

usage: python -m breakout.report SCORES_DB LEVEL            how the level's games have gone
       python -m breakout.report SCORES_DB LEVEL --forget   delete the level's scores
"""

import sqlite3
import sys


def report(db: sqlite3.Connection, level: str) -> str:
    played, best, average = db.execute(
        "SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = ?", (level,)
    ).fetchone()
    if played == 0:
        return f"{level}: no scores yet"
    return f"{level}: {played} played, best {best}, average {average:.0f}"


def forget(db: sqlite3.Connection, level: str) -> int:
    with db:
        return db.execute("DELETE FROM scores WHERE level = ?", (level,)).rowcount


if __name__ == "__main__":
    db = sqlite3.connect(sys.argv[1])
    if "--forget" in sys.argv[3:]:
        print(f"forgot {forget(db, sys.argv[2])} scores")
    else:
        print(report(db, sys.argv[2]))
    db.close()
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="106 passed"
```

## Functions that pause

**Build:** nothing in the project. Meet the one piece of Python this lesson's fixtures depend on.

Lesson 2.6 promised **generator functions** for later; this is later. A function with `yield` in it is a **generator function**, and it behaves unlike any function so far. In the REPL:

```text
>>> def steps():
...     print("setup")
...     yield "the resource"
...     print("teardown")
...
>>> g = steps()
>>> next(g)
setup
'the resource'
>>> next(g)
teardown
Traceback (most recent call last):
  ...
StopIteration
```

Traced:

```text
call         what runs                         printed     returned
steps()      nothing at all                                a generator, g
next(g)      from the top, up to the yield     setup       'the resource'
next(g)      from after the yield, to the end  teardown    (raises StopIteration: nothing left)
```

Calling `steps()` runs **none** of its body: it makes a generator, paused before its first line. Each `next(g)` runs it until the next `yield`, which hands a value out and **pauses** the function, local variables and all. The next `next(g)` carries on from exactly there. When the function ends, `next` raises `StopIteration`, Python's signal for "nothing left". A `for` loop is built on the same thing: it calls `next` until `StopIteration`, which it catches quietly. Anything you can call `next()` on like this is an **iterator**.

Keep the shape in mind: something before the `yield`, a value handed out, something after. That's setup, a resource, and teardown.

## A fixture of your own

**Build:** a file of fixtures for the tests, with one fixture: a scores database.

Create `tests/conftest.py`:

```python file=tests/conftest.py
"""Fixtures: setup that any test in this folder can ask for by name."""

import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest

from breakout.scores import open_scores


@pytest.fixture
def db(tmp_path: Path) -> Iterator[sqlite3.Connection]:
    """A new, empty scores database, closed after the test however the test ends."""
    connection = open_scores(tmp_path / "scores.db")
    yield connection
    connection.close()
```

**Understand.**

**`@pytest.fixture`** marks `db` as a fixture. A test that has a parameter named `db` gets what this function provides, the same way a test with a parameter named `tmp_path` gets a temporary folder: pytest reads the test's parameter names, finds the fixture with each name, runs it, and passes the result in. Reading a function's parameter names is ordinary Python: `import inspect`, then `list(inspect.signature(f).parameters)` for a `def f(db, tmp_path)` gives `['db', 'tmp_path']`. A fixture can ask for other fixtures the same way: `db` asks for `tmp_path`.

**`conftest.py`** is a name pytest looks for. Fixtures defined in it are available to every test in its folder without importing anything. Fixtures that only one test file needs can live in that file instead.

**`yield`** is what makes the fixture clean up: it's the generator from the step before. pytest calls `next()` on it once, to run the setup and get the connection; runs the test with it; then calls `next()` again, which runs `connection.close()` and ends the generator. That second `next()` sits in a `finally` inside pytest, so it happens however the test ended. **Setup** before the `yield`, **teardown** after. The return type says so: `Iterator[sqlite3.Connection]`, an iterator that hands out connections, here exactly one. `Iterator` comes from `collections.abc`, the standard library's module of types for things like iterators and containers. (You may also see `Generator[sqlite3.Connection, None, None]`: generators can also receive values and return one at the end, and the two `None`s say this one does neither. `Iterator` says the same thing more simply.)

```predict
question: A test that uses the `db` fixture fails at its first `assert`. Is the database closed?
choice: No: the test stopped at the failed assert, so nothing after it ran
choice: Yes: pytest resumes the fixture after the test however the test ended
choice: Only if the test catches the AssertionError
answer: Yes: pytest resumes the fixture after the test however the test ended
explain: The teardown isn't part of the test: it's in the fixture, after the `yield`, and pytest runs it after every test that used the fixture, whether the test passed, failed, or crashed. That's the difference from `db.close()` as a test's last line, which runs only if every line before it succeeded. Cleanup that must happen belongs in a fixture's teardown.
```

```check
contains tests/conftest.py "@pytest.fixture"
run ".venv/Scripts/python -m pytest -q" stdout="106 passed" label="nothing uses the fixture yet, so nothing changes"
```

## Watch a fixture run

**Build:** a fixture that prints, to watch the order pytest runs things in.

Click **Create provided watch_fixture.py**: a fixture that prints when it sets up and tears down, and two tests that use it, one passing and one failing.

```python file=watch_fixture.py provided
"""Watch a fixture run. Delete this file afterwards."""

from collections.abc import Iterator

import pytest


@pytest.fixture
def resource() -> Iterator[str]:
    print("\n  setup")
    yield "the resource"
    print("  teardown")


def test_passes(resource: str):
    print("  test_passes, given", resource)


def test_fails(resource: str):
    print("  test_fails, given", resource)
    assert resource == "something else"
```

pytest normally hides what tests print, and shows it only for a failure; `-s` lets it through as it happens:

```powershell
.venv\Scripts\python -m pytest -q -s watch_fixture.py
```

```text
  setup
  test_passes, given the resource
.  teardown

  setup
  test_fails, given the resource
F  teardown
...
1 failed, 1 passed in 0.18s
```

For each test: the fixture up to its `yield`, then the test, then pytest's mark for the result (`.` passed, `F` failed), then the rest of the fixture. The failing test's teardown runs exactly like the passing one's. And each test gets its own `setup`: the fixture runs again for every test that asks for it.

Now watch a fixture shared between tests. Make `scratch/test_scope.py`, a fixture with `scope="module"` (one per file, explained in the next step), handing out a list that the first test changes:

```python
from collections.abc import Iterator

import pytest


@pytest.fixture(scope="module")
def shared() -> Iterator[list[str]]:
    print("\n  setup")
    yield []
    print("  teardown")


def test_first(shared: list[str]):
    shared.append("left by test_first")
    print("  test_first sees", shared)


def test_second(shared: list[str]):
    print("  test_second sees", shared)
```

```powershell
.venv\Scripts\python -m pytest -q -s scratch/test_scope.py
```

```text
  setup
  test_first sees ['left by test_first']
.  test_second sees ['left by test_first']
.  teardown
```

One setup, one teardown, around both tests, and `test_second` sees what `test_first` left behind: two tests that were meant to be independent aren't. That's why the `db` fixture keeps the default scope, a fresh one for every test.

Delete the provided file: it was for the demonstration.

```powershell
Remove-Item watch_fixture.py
```

```check
missing watch_fixture.py -- Delete watch_fixture.py: Remove-Item watch_fixture.py
```

## The scores tests, with the fixture

**Build:** the scores tests, asking for `db` instead of opening one.

```python file=tests/test_scores.py
"""What the scores database must do, and what it must refuse."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from breakout.scores import Score, add_score, best, load_scores, open_scores

WIN = Score("Classic", 400, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC))
LOSS = Score("Classic", 70, datetime(2026, 10, 4, 15, 41, 0, tzinfo=UTC))
CASTLE = Score("Castle", 150, datetime(2026, 10, 5, 9, 2, 30, tzinfo=UTC))
DATA = Path(__file__).parent / "data"


def test_a_new_database_has_no_scores(db: sqlite3.Connection):
    assert load_scores(db) == []


def test_scores_come_back_exactly_as_they_were_saved(db: sqlite3.Connection):
    add_score(db, WIN)
    add_score(db, CASTLE)
    assert load_scores(db) == [WIN, CASTLE]


def test_scores_are_still_there_when_the_database_is_opened_again(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    add_score(db, WIN)
    db.close()
    db = open_scores(tmp_path / "scores.db")
    assert load_scores(db) == [WIN]
    db.close()


def test_the_best_score_is_the_highest_on_that_level(db: sqlite3.Connection):
    for score in [LOSS, CASTLE, WIN]:
        add_score(db, score)
    assert best(db, "Classic") == 400


def test_a_level_never_played_has_no_best(db: sqlite3.Connection):
    add_score(db, WIN)
    assert best(db, "Castle") is None


def test_negative_points_are_refused_by_the_database(db: sqlite3.Connection):
    with pytest.raises(sqlite3.IntegrityError):
        add_score(db, Score("Classic", -5, WIN.when))
    assert load_scores(db) == []


def test_a_file_that_is_not_a_database_is_refused():
    with pytest.raises(sqlite3.DatabaseError):
        open_scores(DATA / "broken-scores.json")
```

**Understand.** Each test now says only what it's about: `db: sqlite3.Connection` in its parameters, and no opening or closing. The type annotation is for pyright and for the reader; pytest matches fixtures by **name** alone. One test still opens and closes its own database: `test_scores_are_still_there_when_the_database_is_opened_again`, because closing and reopening is the thing it tests.

**Why closing matters.** An open connection holds its file open, and on Windows a file that's open can't be deleted. Cause it, in `scratch`:

```powershell
.venv\Scripts\python -c "import sqlite3, os; db = sqlite3.connect('scratch/x.db'); db.execute('CREATE TABLE IF NOT EXISTS t (a)'); os.remove('scratch/x.db')"
```

```text
PermissionError: [WinError 32] The process cannot access the file because it is being used by another process: 'scratch/x.db'
```

Run it again with `db.close();` before `os.remove(...)`, and the file is deleted without complaint.

Python closes a connection eventually, when nothing refers to it any more, but "eventually" isn't a time you can rely on. A test suite that leaves connections open can find, later in the same run, that it can't delete or replace a database file; closing in the teardown makes it never happen.

**How often a fixture runs** is its **scope**. The default, `scope="function"`, runs it once for every test that asks for it, which is why each test here gets a new, empty database. `@pytest.fixture(scope="module")` would run it once per test file, and `scope="session"` once for the whole run, sharing one result among tests: faster for something expensive, and only safe for something no test changes. A shared database would let one test's scores leak into the next, so `db` keeps the default.

```check
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="7 passed"
```

## The report tests, with the fixture

**Build:** the report tests, the same way.

```python file=tests/test_report.py
import sqlite3
from datetime import UTC, datetime

from breakout.report import forget, report
from breakout.scores import Score, add_score, load_scores

WHEN = datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)
INJECTION = "x' OR '1'='1"


def add_games(db: sqlite3.Connection, *levels: str) -> None:
    """One 100-point game on each of these levels."""
    for level in levels:
        add_score(db, Score(level, 100, WHEN))


def test_a_level_with_an_apostrophe_is_reported(db: sqlite3.Connection):
    add_games(db, "Bob's Castle")
    assert report(db, "Bob's Castle") == "Bob's Castle: 1 played, best 100, average 100"


def test_sql_in_a_level_name_is_only_a_name(db: sqlite3.Connection):
    add_games(db, "Classic", "Castle")
    assert report(db, INJECTION) == f"{INJECTION}: no scores yet"


def test_forgetting_a_name_with_sql_in_it_deletes_nothing(db: sqlite3.Connection):
    add_games(db, "Classic", "Castle")
    assert forget(db, INJECTION) == 0
    assert len(load_scores(db)) == 2
```

**Understand.** The helper that opened a database and added games becomes `add_games(db, *levels)`, which only adds games: the database comes from the fixture. A helper function and a fixture do different jobs. A **fixture** provides something a test needs and cleans it up afterwards; a **helper** is an ordinary function a test calls, with arguments, when it wants to.

```check
run ".venv/Scripts/python -m pytest -q tests/test_report.py" stdout="3 passed"
```

## The shape of the test suite

**Understand: what takes the time.** pytest can list the slowest tests:

```powershell
.venv\Scripts\python -m pytest -q --durations=5
```

```text
2.95s call     tests/test_characterisation.py::test_autopilot_wins
1.51s call     tests/test_characterisation.py::test_a_lost_game_stays_lost
1.25s call     tests/test_characterisation.py::test_autopilot_plays_for_ten_seconds
...
106 passed in 16.79s
```

Your times will differ; the pattern won't. The 11 characterisation tests take about 13 of the 17 seconds. The other 95 take about 3 seconds, most of it pytest starting up. The suite has three kinds of test:

| Kind | Here | Tests | What a failure tells you |
|---|---|---|---|
| **Unit** | `test_breakout.py`, `test_game.py`, `test_level.py`: one function or class, in memory | most | exactly which rule broke |
| **Integration** | `test_scores.py`, `test_config.py`: your code with something real outside it, a database or a file | some | your code and the outside thing disagree |
| **End-to-end** | `test_characterisation.py`: the whole program, started as a player would start it | few | something, somewhere, is wrong |

That's the **testing pyramid**: many fast, precise unit tests at the bottom, fewer integration tests, and a few slow end-to-end tests at the top, which check that the pieces really fit together. A suite shaped the other way round, mostly end-to-end, is slow to run and vague when it fails, so people stop running it.

**Build:** a **marker** for the slow tests, so you can run the fast ones while you work.

```toml file=pyproject.toml
[project]
name = "breakout"
version = "0.1.0"
description = "Breakout, built through the Forge series."
requires-python = ">=3.12"
dependencies = ["pygame-ce==2.5.8", "pydantic==2.13.5"]

[project.scripts]
breakout = "breakout.app:run"

[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["breakout"]

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

**Understand.** `markers` declares a marker named `slow`, with a description. `--strict-markers`, added to every run by `addopts`, makes pytest refuse a marker that isn't declared, so `@pytest.mark.slwo` is an error, `'slwo' not found in `markers` configuration option`, not a silently unmarked test. `addopts` is a list of command-line options pytest adds to every run as if you'd typed them.

```check
contains pyproject.toml "--strict-markers"
```

## Marking the slow tests

**Build:** mark every test in the characterisation file as slow.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught. Test runs use seed 0 unless told otherwise.
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent

pytestmark = pytest.mark.slow


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


def test_a_level_that_cannot_be_read_stops_the_game_with_exit_code_1(tmp_path: Path):
    missing = tmp_path / "missing.json"
    result = play("--test-run", "5", "--level", str(missing))
    assert result.returncode == 1
    assert result.stderr.startswith(f"breakout: {missing}: ")


def test_bad_settings_stop_the_game_with_exit_code_1(tmp_path: Path):
    settings = tmp_path / "settings.toml"
    settings.write_text("speed = 2\n", encoding="utf-8")
    result = play("--test-run", "5", "--config", str(settings))
    assert result.returncode == 1
    assert result.stderr == f"breakout: {settings}: speed: Extra inputs are not permitted\n"
```

**Understand.** `pytestmark = pytest.mark.slow` at the top of a test file marks every test in it. The name matters: pytest looks for a module-level variable called exactly `pytestmark`, as it looks for `conftest.py` and for functions starting with `test_`. Now:

```powershell
.venv\Scripts\python -m pytest -q -m "not slow"
```

```text
95 passed, 11 deselected in 2.84s
```

Careful: this `-m` comes **after** `pytest`, so it's pytest's own option, "markers"; the `-m` after `python` is Python's "run this module". `-m` chooses tests by marker: `"not slow"` runs everything else, in a few seconds, as often as you like while you work. Run the whole suite, slow tests included, before every commit: the definition of done hasn't changed.

```check
run ".venv/Scripts/python -m pytest -q -m \"not slow\"" stdout="95 passed, 11 deselected" label="the fast tests run without the slow ones"
```

## Your turn: one game, set up once

**Build, on your own:** remove the duplicated setup from `tests/test_game.py` and `tests/test_states.py`.

Add two fixtures to `tests/conftest.py`:

| Fixture | Provides |
|---|---|
| `new_game` | a `model.Game` of the classic level, with `random.Random(0)`, waiting on the title screen |
| `game` | the same game, started. It should ask for `new_game` rather than build its own. |

Then delete `classic_wall` and `started_game` from both test files (and `autopilot_game` from `test_game.py`), and make every test ask for the fixture it needs. The tests must keep testing exactly what they test now: all 10 in the two files must still pass. When all 106 tests pass and every check is clean, commit with a message that mentions **fixture**.

```hints
nudge: Which tests start from a game on the title screen, and which from a game already started? The ten seconds of autopilot: what does it need besides a started game?
concept: A fixture can take another fixture as a parameter: `def game(new_game: model.Game) -> model.Game:` gets the title-screen game, starts it, and returns it. Neither needs `yield`: there's nothing to clean up, so they `return`. A test asks for one by naming it as a parameter, `def test_...(game: model.Game):`, and uses `game` where it called `started_game()`. The autopilot test only ever used seed 0, so it can take `game` and run its 600 frames in the test itself.
shape: In `conftest.py`: import `random` and `from breakout import level, model`; two fixtures, the first returning `model.Game(random.Random(0), level.load_level(level.LEVELS / "classic.json").bricks())`. In the test files: no helpers left, and every test's parameters naming `game` or `new_game`.
answer: ~~~python
@pytest.fixture
def new_game() -> model.Game:
    """A game of the classic level with seed 0, waiting on the title screen."""
    return model.Game(random.Random(0), level.load_level(level.LEVELS / "classic.json").bricks())


@pytest.fixture
def game(new_game: model.Game) -> model.Game:
    """The same game, started."""
    new_game.start()
    return new_game
~~~

added to `tests/conftest.py`, with `import random` and `from breakout import level, model` at the top. Then, for example:

~~~python
def test_ten_seconds_of_autopilot_matches_the_test_run(game: model.Game):
    for _ in range(600):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_pausing_on_the_title_screen_does_nothing(new_game: model.Game):
    new_game.toggle_pause()
    assert new_game.state == model.GameState.TITLE
~~~

Every test gets a **new** game: pytest runs a fixture again for each test that asks for it, so one test breaking bricks never changes the wall another test sees. Lesson 7.1 starts with both test files in full.
```

```check
lacks tests/test_game.py "def classic_wall" -- Delete classic_wall from test_game.py: the new_game fixture loads the wall now.
lacks tests/test_states.py "def classic_wall"
lacks tests/test_game.py "def started_game" -- Delete started_game too: tests ask for the game fixture.
lacks tests/test_states.py "def started_game"
contains tests/conftest.py "def new_game("
contains tests/conftest.py "def game("
run ".venv/Scripts/python -m pytest -q tests/test_game.py tests/test_states.py" stdout="10 passed" label="the game and state tests all still pass"
run ".venv/Scripts/python -m pytest -q" stdout="106 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "fixture"
git-clean
```

## Challenge: a fixture that makes databases

**Optional, ★.** A fixture can return a function. Write `scores_with`, a fixture returning a function so a test can write `db = scores_with("Classic", "Castle")` and get a database with one game on each level, replacing `add_games`. The fixture's teardown closes every database it made. On a branch.

## Challenge: every test on two databases

**Optional, ★★.** `@pytest.fixture(params=["memory", "file"])` runs every test that uses the fixture twice, once per value, which the fixture reads as `request.param` (`request` is a fixture too). Make `db` give an in-memory database for one and a file for the other, and watch the test count double. On a branch.

## Challenge: a fixture made once

**Optional, ★★.** Write a `scope="session"` fixture that writes a level JSON file once for the whole run (pytest's `tmp_path_factory` fixture makes folders for wider scopes), use it in two test files, and prove with `-s` that it runs once. In a comment, say why `db` must never be session-scoped. On a branch.

## Bug hunt: the scores that vanish

**Build:** nothing in the project. Find out why a program's saves disappear.

A teammate wrote their own small score keeper, and says the database "forgets everything". Here's a version cut down to the problem. Save it as `scratch/vanish.py`:

```python
import sqlite3
from pathlib import Path


def add_score(db: sqlite3.Connection, level: str, points: int) -> None:
    db.execute("INSERT INTO scores (level, points) VALUES (?, ?)", (level, points))


def count(path: Path) -> int:
    db = sqlite3.connect(path)
    (n,) = db.execute("SELECT COUNT(*) FROM scores").fetchone()
    db.close()
    return n


path = Path("scratch/vanish.db")
path.unlink(missing_ok=True)
db = sqlite3.connect(path)
db.execute("CREATE TABLE scores (level TEXT, points INTEGER)")
add_score(db, "Classic", 560)
add_score(db, "Castle", 150)
print("this connection sees", db.execute("SELECT COUNT(*) FROM scores").fetchone()[0], "scores")
print("another connection sees", count(path))
db.close()
print("after closing, the file holds", count(path))
```

```powershell
.venv\Scripts\python scratch\vanish.py
```

```text
this connection sees 2 scores
another connection sees 0
after closing, the file holds 0
```

The program that added the scores can see them; nobody else ever can. Find the cause, and fix it in two ways: one with a single added line, and one in the style of `breakout/scores.py`. Try for ten minutes before the hints.

```hints
nudge: Something is different between the connection that sees the scores and every other one. What does `db.in_transaction` say just after the two `add_score` calls? Add a `print`.
concept: Other connections only see **committed** data. Lesson 6.3: Python's `sqlite3` begins a transaction before an `INSERT`, and waits for a commit.
answer: `True`: Python's `sqlite3` began a transaction before the first `INSERT` (lesson 6.3), and nothing ever ended it. Other connections only see committed data, and `close()` without a commit rolls back. One-line fix: `db.commit()` before `db.close()`. The `scores.py` fix: `with db:` around the `INSERT` inside `add_score`, so every score is committed as it's added.
```

## What did we actually learn?

- **Fixtures** provide what a test needs, by parameter name; `conftest.py` shares them with a whole folder; fixtures can use fixtures.
- **Generator functions**: calling one runs nothing; `next()` runs it to the next `yield` and pauses it there; `StopIteration` says it's done.
- **`yield` fixtures** run their teardown however the test ends: cleanup that must happen goes there.
- **A fixture runs again for every test**, so tests can't affect each other; a wider `scope` shares one, and with it anything a test changes.
- **The testing pyramid**: many unit tests, some integration tests, few end-to-end tests, measured with `--durations`.
- **Markers** (`slow`, declared, with `--strict-markers`) and `-m "not slow"` for fast runs while working.

xUnit in C# sets up with a test class's constructor and cleans up in `Dispose`, and shares expensive setup with **class fixtures** (`IClassFixture<T>`); JUnit uses `@BeforeEach` and `@AfterEach` methods, and `@Tag("slow")` with a filter to choose tests, like markers. pytest's version, setup chosen by naming it, is unusual, and many people who've used both find it the most convenient of the three.

## Chapter 6, zoomed out: data that outlives the program

A program's objects die with it. The chapter kept scores alive three ways, each fixing what the one before couldn't:

- **A JSON file** you design: readable, any language can read it, and you choose how each type is written (ISO 8601 for times). But everything is rewritten to add one score, a crash can leave half a file, and two writers lose each other's work.
- **`pickle`**: no conversions to write, Python only, tied to your class names, and **runs code when it loads**. Never for a file you didn't write.
- **A database**: one row added at a time, transactions that complete or don't happen, constraints every writer must obey, and questions answered in SQL without loading everything.

And the same security question from Chapter 5, **who controls this data?**, had two new answers. A file your own program wrote can still come back broken or edited, so it's checked. And a value can't be trusted just because it's "only a name": pasted into SQL, it became code. Values never become code: placeholders in SQL, and in everything else that runs commands. Starting a program is the same story: `subprocess.run(f"del {name}", shell=True)` hands a whole string to a shell, which a name like `x & del *` can turn into two commands, while `subprocess.run(["breakout", "--level", name])`, the list form the characterisation tests' `play()` already uses, passes `name` as one argument, whatever it contains.

**Chapter 6's challenges**, to come back to (on branches): the best score's date in local time ★, the top scores from the command line ★★, let json do the conversion ★★ (6.1); pin the policy ★, never leave half a file ★★, rescue what's left ★★, a pickle that only opens what you allow ★★★ (6.2); more questions, one query each ★, a database that refuses bad times ★★, no connection left open ★★ (6.3); a database that isn't one ★, names that contain a word ★★, every level, attacked ★★★ (6.4); a fixture that makes databases ★, every test on two databases ★★, a fixture made once ★★ (this lesson).

The next chapter gives the database more to hold (players, sessions, statistics) and the questions that come with several tables at once: how they connect, why duplicated data goes wrong, and what happens when two games write at the same moment. Then Breakout ships its first release.
