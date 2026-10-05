---
title: 5.6 — What the Tests Don't Touch
runtime: python
run: breakout/__main__.py
---

There are 94 tests now. Do they test everything? You can't tell by reading them, and as the project grows you can tell less and less. **Coverage** measures it: run the tests, and record every line of the game that runs. A line that never runs during the tests isn't tested by them, whatever the tests' names say. This lesson measures it, finds out what the number means and what it doesn't, and closes the gaps that matter. Then it looks back over the chapter.

## The settings module so far

**Build:** make sure `breakout/config.py` matches the end of lesson 5.5, the reference answer to its Your turn.

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import tomllib
from pathlib import Path
from typing import Annotated, Self

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, ValidationError, model_validator
from pydantic_core import ErrorDetails

KEYS = {
    "left": pygame.K_LEFT,
    "right": pygame.K_RIGHT,
    "up": pygame.K_UP,
    "down": pygame.K_DOWN,
    "space": pygame.K_SPACE,
    "return": pygame.K_RETURN,
} | {chr(code): code for code in range(pygame.K_a, pygame.K_z + 1)}


class ConfigError(ValueError):
    """A settings file that can't be used, with every problem found in it."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems


def check_key(name: str) -> str:
    if name not in KEYS:
        raise ValueError(f"unknown key {name!r}: use a letter, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    serve: Key = "space"
    pause: Key = "p"

    @model_validator(mode="after")
    def no_key_does_two_things(self) -> Self:
        actions: dict[str, str] = {}
        for action, key in self.model_dump().items():
            if key in actions:
                raise ValueError(f"{actions[key]} and {action} both use {key!r}")
            actions[key] = action
        return self


class Config(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    level: Path | None = Field(default=None, strict=False)
    controls: Controls = Controls()


def describe(error: ErrorDetails) -> str:
    where = ".".join(str(part) for part in error["loc"]) or "the file"
    return f"{where}: {error['msg'].removeprefix('Value error, ')}"


def load_config(path: Path) -> Config:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8-sig"))
    except tomllib.TOMLDecodeError as error:
        raise ConfigError([f"not valid TOML: {error}"]) from None
    try:
        config = Config.model_validate(data)
    except ValidationError as error:
        raise ConfigError([describe(problem) for problem in error.errors()]) from None
    if config.level is None:
        return config
    return config.model_copy(update={"level": path.parent / config.level})
```

```check
run ".venv/Scripts/python -c \"from breakout import config; config.Controls(left='p')\"" exit=1 stderr="left and pause both use 'p'"
```

## The settings tests so far

**Build:** and `tests/test_config.py`, with the new case.

```python file=tests/test_config.py
from pathlib import Path

import pytest

from breakout import config


def write_config(folder: Path, text: str) -> Path:
    path = folder / "settings.toml"
    path.write_text(text, encoding="utf-8")
    return path


def test_without_a_file_the_controls_are_the_arrows_space_and_p():
    assert config.Config() == config.Config(
        level=None, controls=config.Controls(left="left", right="right", serve="space", pause="p")
    )


def test_a_file_changes_only_what_it_mentions(tmp_path: Path):
    path = write_config(tmp_path, '[controls]\nleft = "a"\nright = "d"\n')
    loaded = config.load_config(path)
    assert loaded.controls == config.Controls(left="a", right="d", serve="space", pause="p")
    assert loaded.level is None


def test_a_level_is_found_from_the_file_s_own_folder(tmp_path: Path):
    path = write_config(tmp_path, 'level = "levels/castle.json"\n')
    assert config.load_config(path).level == tmp_path / "levels" / "castle.json"


def test_an_empty_file_is_all_defaults(tmp_path: Path):
    assert config.load_config(write_config(tmp_path, "")) == config.Config()


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("level = \n", "not valid TOML: Invalid value (at line 1, column 9)"),
        ("speed = 2\n", "speed: Extra inputs are not permitted"),
        ('[controls]\njump = "w"\n', "controls.jump: Extra inputs are not permitted"),
        ("[controls]\nleft = 1\n", "controls.left: Input should be a valid string"),
        (
            '[controls]\nleft = "banana"\n',
            "controls.left: unknown key 'banana': use a letter, or left, right, up, down, space or return",
        ),
        ('[controls]\nleft = "a"\nright = "a"\n', "controls: left and right both use 'a'"),
    ],
)
def test_bad_settings_are_refused_with_where_and_why(tmp_path: Path, text: str, message: str):
    with pytest.raises(config.ConfigError) as refused:
        config.load_config(write_config(tmp_path, text))
    assert str(refused.value) == message
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="94 passed"
```

## A tool that measures tests

**Build:** add **pytest-cov** to the development tools, and install it.

```text file=requirements.txt
pygame-ce==2.5.8
pytest==9.1.1
pytest-cov==7.1.0
pyright[nodejs]==1.1.414
ruff==0.16.10
-e .
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

**Understand.** pytest-cov is a pytest **plugin**: a package that adds options to pytest when it's installed. It's a development tool, like pytest itself, so it goes in `requirements.txt`, not in the game's dependencies. It installs **coverage**, the program that does the measuring; pytest-cov runs it around your tests.

```check
run ".venv/Scripts/python -c \"import pytest_cov; print(pytest_cov.__version__)\"" stdout="7.1.0" label="pytest-cov 7.1.0 is installed"
```

## The first measurement

**Build:** ignore coverage's data file, then measure.

Coverage writes what it records to a file named `.coverage` in the project. It's generated every run, so add it to `.gitignore`:

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/

# Generated: package metadata, written by pip install -e .
*.egg-info/

# Generated: coverage data, written by pytest --cov
.coverage
```

Then:

```powershell
.venv\Scripts\python -m pytest -q --cov=breakout --cov-report=term-missing
```

```text
Name                   Stmts   Miss  Cover   Missing
----------------------------------------------------
breakout\__init__.py       0      0   100%
breakout\__main__.py       2      2     0%   1-3
breakout\app.py           79     79     0%   1-96
breakout\config.py        49      0   100%
breakout\draw.py          18     18     0%   1-27
breakout\level.py         57      0   100%
breakout\model.py        127      0   100%
breakout\settings.py      34      0   100%
----------------------------------------------------
TOTAL                    366     99    73%
```

**Understand: reading the table.** `--cov=breakout` measures the `breakout` package; `--cov-report=term-missing` prints the table with the line numbers that never ran. For each module: **Stmts**, the number of **statements**, the lines of code that can run (blank lines and comments don't count); **Miss**, how many of them never ran; **Cover**, the percentage that did; **Missing**, which ones, as line numbers and ranges.

**How it works.** Python lets a program ask to be told each time a new line starts running (through `sys.settrace`, or since Python 3.12 the faster `sys.monitoring`; coverage picks one for you). coverage asks, keeps a set of every `(file, line)` it's told about, and at the end compares that set with all the statements in each file.

**And `app.py` is 0%.** Not one line, when nine characterisation tests play the game. Look at how they play it: `subprocess.run([sys.executable, "-m", "breakout", ...])`, a **new Python process**. coverage is watching the process the tests run in, and the game runs in a different one. The number is accurate about what it measured, and it measured the wrong thing. That's the first lesson of coverage: before trusting a number, know exactly what was counted.

```check
git-ignored .coverage -- Add .coverage to .gitignore: it's regenerated every time you measure.
run ".venv/Scripts/python -m pytest -q --cov=breakout --cov-report=term-missing" stdout="73%" label="coverage measures the tests: 73%"
```

## Measuring the game's own process

**Build:** tell coverage to follow the tests into the processes they start.

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

[tool.ruff]
line-length = 120

[tool.pyright]
venvPath = "."
venv = ".venv"
typeCheckingMode = "strict"

[tool.coverage.run]
patch = ["subprocess"]
```

Measuring several processes means several data files for a moment, named `.coverage.` followed by the computer's name and the process number. Ignore those too:

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/

# Generated: package metadata, written by pip install -e .
*.egg-info/

# Generated: coverage data, written by pytest --cov
.coverage
.coverage.*
```

Then measure again:

```powershell
.venv\Scripts\python -m pytest -q --cov=breakout --cov-report=term-missing
```

```text
breakout\__main__.py       2      0   100%
breakout\app.py           79     17    78%   24-26, 31-33, 48, 56, 58-60, 62, 66-70
breakout\draw.py          18      0   100%
...
TOTAL                    366     17    95%
```

**Understand.** coverage reads its settings from `[tool.coverage.run]` in `pyproject.toml`, like pytest, ruff and pyright read theirs. `patch = ["subprocess"]` makes coverage follow the tests into every Python process they start. How, step by step:

1. Before the tests run, coverage sets an **environment variable** (lesson 0.1), `COVERAGE_PROCESS_CONFIG`, holding its settings, in the test process. A process started from it gets a copy of its environment, so the game's process has the variable too.
2. Installing coverage put a file named `a1_coverage.pth` in `.venv\Lib\site-packages`. Python reads every `.pth` file there as it starts, and runs any line that begins with `import`; coverage's line checks for the variable. In a Python you start yourself it isn't set, and nothing happens. In the game's process it is, so coverage starts measuring before `breakout` is even imported.
3. When the child exits, it writes what it recorded to its own file, `.coverage.<computer>.<process number>...`: two processes writing to one file at once would spoil it.
4. When the tests finish, pytest-cov **combines** every `.coverage.*` file with the test process's own data into `.coverage`, and deletes them. The table is made from the combined data.

Now the characterisation tests count, and the table is honest.

**Reading what's missing in `app.py`.** Open it beside the list:

| Lines | What they are | Why no test runs them |
|---|---|---|
| 24–26 | a settings file that can't be used: the message, and exit code 1 | no test gives the game a bad settings file |
| 31–33 | a level that can't be used: the message, and exit code 1 | no test gives the game a bad level, from the command line |
| 48 | `clock.tick(60)`, the real clock | test runs use a fixed `dt` instead, so every run gives the same result |
| 56, 58–60, 62 | Escape, and the serve and pause keys | test runs never press a key |
| 66–70 | steering with the player's keys | test runs steer with `--hold` |

The first two rows are behaviour a player will meet, and that a careless change could break without anyone noticing: a real gap. Rows three to five are a different kind of gap: the game's **interactive** shell, which a test run deliberately replaces. Notice what that means for lesson 5.5: the configurable controls were checked by you, playing, and by nothing automatic. Chapter 11 builds an Input class that tests can press keys on; until then, it's a known gap, and knowing it is the point.

```check
git-ignored .coverage.MYPC.1234.XyZ -- Add .coverage.* to .gitignore: the files each process writes while it is measured.
run ".venv/Scripts/python -m pytest -q --cov=breakout" stdout="95%" label="with the game's own process measured: 95%"
```

## What 100% doesn't prove

**Understand.** `level.py` is at 100%. Does that mean the level reader is fully tested?

```predict
question: Delete every `assert` line in `tests/test_level.py`. What does coverage now say for `level.py`?
choice: Lower: the deleted asserts were what tested it
choice: Still 100%
choice: 0%: tests without asserts don't count
answer: Still 100%
explain: Coverage records which lines **ran**, not whether anything checked what they did. The tests still call `load_level`, `parse_level` and `bricks()`, so every line runs; with no `assert`, a `parse_level` that put every brick in the wrong place would pass them all. Coverage can prove a line is **untested** (it never ran); it can't prove a line is **tested**.
```

So what does test whether the tests check things? You did it in lesson 4.5, without a name for it: `check_walls.py` makes small deliberate mistakes in a copy of the code and checks that the tests **fail**. That's **mutation testing**, and tools like `mutmut` do it automatically across a whole project. It's slow, so it's run occasionally, where correctness matters most.

How much coverage is enough? There's no right number. Use it as a **flashlight**, not a target. Low coverage in a module points you at code nobody is checking: look at the missing lines and decide, one by one, whether they need a test. A team that's *required* to hit a number gets tests written to hit the number, assertion-free tests included, and the number stops meaning anything. That's **Goodhart's law**: when a measure becomes a target, it ceases to be a good measure.

## Your turn: test the refusals

**Build, on your own:** close the first two gaps in the table.

Add two tests at the end of `tests/test_characterisation.py`, using its `play` helper:

| Test name | Runs the game with | Checks |
|---|---|---|
| `test_a_level_that_cannot_be_read_stops_the_game_with_exit_code_1` | `--test-run 5` and a `--level` file that doesn't exist | exit code 1; the error output starts with `breakout: ` and the file's path |
| `test_bad_settings_stop_the_game_with_exit_code_1` | `--test-run 5` and a `--config` file containing `speed = 2` | exit code 1; the error output is exactly `breakout: <the file>: speed: Extra inputs are not permitted` and a newline |

Put both files in the test's `tmp_path`. Then measure again: `app.py` should be at 86%, missing only lines `48, 56, 58-60, 62, 66-70`. When all 96 tests pass and every check is clean, commit with a message that mentions **exit code**.

```hints
nudge: `play(...)` returns the finished process. What does it hold besides `stdout`?
concept: `subprocess.run` returns a `CompletedProcess`: `.returncode` is the exit code, and `.stderr` is everything the program wrote to its error output, as a string, because `play` passes `text=True`. A file that doesn't exist is just a path you never write to: `tmp_path / "missing.json"`. Arguments to a program are strings, so pass `str(path)`.
shape: Two tests, each taking `tmp_path: Path`: build a path (and for settings, write the file with `write_text(..., encoding="utf-8")`), call `play("--test-run", "5", "--level", str(path))` or the `--config` version, then assert on `result.returncode` and `result.stderr`.
answer: ~~~python
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
~~~

The first test checks only the start of the message, because the rest is Python's description of the operating system's error (`[Errno 2] No such file or directory: ...`), whose wording isn't the game's to promise and differs between systems for other errors; the part that's the game's own is checked exactly. The second message is all the game's, so it's checked whole. `print(..., file=sys.stderr)` ends with a newline, hence the `\n`.
```

```check
run ".venv/Scripts/python -m pytest -q --cov=breakout --cov-report=" stdout="96 passed" label="all 96 tests pass, with coverage measured"
run ".venv/Scripts/python -m coverage report --include=breakout/app.py --format=total" stdout="86" label="app.py is 86% covered: both refusals are tested"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "exit code"
git-clean
```

## What did we actually learn?

- **Coverage** records which lines run during the tests: `pytest --cov=breakout --cov-report=term-missing`.
- **Know what was counted**: tests that start a new process measured nothing until `patch = ["subprocess"]`.
- **Read the missing lines** and sort them: behaviour that needs a test, and shells that are tested another way or not yet.
- **Coverage proves a line untested, never tested.** Mutation testing checks the tests themselves.
- **A flashlight, not a target** (Goodhart's law).

In C#, `dotnet test --collect:"XPlat Code Coverage"` collects coverage with **coverlet**, and ReportGenerator turns it into reports; in Java, **JaCoCo** does it from Maven or Gradle. Both measure **branch coverage** too: whether each `if` has gone both ways, not only whether its line ran. coverage.py can as well, with `--cov-branch`; try it, and see which `if`s in `app.py` have only ever gone one way.

## Chapter 5, zoomed out: who controls this data?

The chapter started with a wall written as code and ends with levels and settings as files that people you'll never meet can write. Every file the game reads raised the same question: **who controls this data, and what's the worst it could contain?**

- **The game's own files** (`classic.json`, shipped in the package): written by you, tested by your tests. Trusted, and still checked, because you make mistakes too.
- **The player's settings**: written by the person playing, on their own computer. A mistake is likely; malice isn't, since they'd only be attacking themselves. Clear messages matter most.
- **Levels from someone else**: so far, a teammate. In Part 5, strangers will upload levels to the asset library, and anything they upload is **hostile input**: written by someone who may want to crash the game, or worse. What protects you then is what this chapter built: one model that refuses anything outside it, at the boundary, before any other code sees it. The model's limits (8 columns, at most 10 rows, a short list of fields) are also limits on what an attacker can make your program do. Chapter 6 meets the first file format that's dangerous even to *open*.

The same few ideas did all the work, and they'll do it in every program you write: **parse at the boundary** into a type that can only hold good data; **report every problem with where and why**; **paths relative to their file**; **the most specific setting wins**; and **tests that pin each rule**, measured, so you know what they don't touch.
