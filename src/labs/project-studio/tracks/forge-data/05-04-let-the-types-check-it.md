---
title: 5.4 — Let the Types Check It
runtime: python
run: breakout/__main__.py
---

The last lesson checked a level by hand: about 40 lines, nearly all `isinstance`, ranges and messages, stopping at the first problem. This lesson replaces almost all of it with **pydantic**, the most widely used validation library in Python, where you declare what a level *is*, with type hints and constraints, and the library checks any input against that declaration, reports every problem at once, and gives you a typed object. It's the C# and Java approach from the end of the last lesson, in Python.

## The error tests so far

**Build:** make sure `tests/test_level_errors.py` matches the end of lesson 5.3, the reference answer to its Your turn.

```python file=tests/test_level_errors.py
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
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="80 passed"
```

## A dependency the game needs

**Build:** add pydantic to the project's dependencies, and install it.

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
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

**Understand: why `pyproject.toml`, not `requirements.txt`.** Lesson 4.3 separated two kinds of dependency. pytest, pyright and ruff are **development tools**: you need them to work on the game, and a player doesn't. pydantic is a **runtime dependency**: the game imports it, so it can't run without it. Runtime dependencies go in `dependencies` in `pyproject.toml`, which is what pip reads when it installs the game, for you or for anyone else. `requirements.txt` ends with `-e .`, so installing it reinstalls the game, and with it everything in `dependencies`.

Look at the last line pip printed: it installed more than pydantic. `pydantic-core` is pydantic's validation engine, written in **Rust**, a compiled language, and shipped already compiled for your Python and Windows, which is why pydantic is fast. `annotated-types` and `typing-inspection` are what it uses to read type hints. These are **transitive dependencies** (lesson 2.1): pydantic declares them, and pip installs them. You still pin only what you use directly.

```check
run ".venv/Scripts/python -c \"import pydantic; print(pydantic.VERSION)\"" stdout="2.13.5" label="pydantic 2.13.5 is installed"
contains pyproject.toml "\"pydantic==2.13.5\""
```

## A level, declared

**Build:** the level module, with pydantic doing the checking.

```python file=breakout/level.py
from pathlib import Path
from typing import Annotated

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, ValidationError
from pydantic_core import ErrorDetails

from breakout.model import BRICK_GAP, BRICK_HEIGHT, BRICK_WIDTH, ROW_COLOURS, WALL_LEFT, WALL_TOP, Brick

LEVELS = Path(__file__).parent / "levels"
COLUMNS = 8
MAX_ROWS = 10
MAX_LIVES = 9


class LevelError(ValueError):
    """A level that can't be used, with every problem found in it."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems


def check_row(line: str) -> str:
    if len(line) != COLUMNS:
        raise ValueError(f"a row has {COLUMNS} places, and this one has {len(line)}")
    for col, char in enumerate(line):
        if char not in "TB.":
            raise ValueError(f"unknown brick {char!r} in column {col + 1}: use T, B or .")
    return line


def check_wall(wall: tuple[str, ...]) -> tuple[str, ...]:
    if not wall:
        raise ValueError("a level needs at least one row")
    if len(wall) > MAX_ROWS:
        raise ValueError(f"a level has at most {MAX_ROWS} rows, and this one has {len(wall)}")
    return wall


Row = Annotated[str, AfterValidator(check_row)]


class Level(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    lives: Annotated[int, Field(ge=1, le=MAX_LIVES)]
    wall: Annotated[tuple[Row, ...], AfterValidator(check_wall)]

    def bricks(self) -> list[Brick]:
        """A new wall of bricks, ready to be broken."""
        return make_bricks(self.wall)


def where(location: tuple[int | str, ...]) -> str:
    return ", ".join(str(part) for part in location) or "the level"


def describe(error: ErrorDetails) -> str:
    return f"{where(error['loc'])}: {error['msg'].removeprefix('Value error, ')}"


def parse_level(text: str) -> Level:
    try:
        return Level.model_validate_json(text)
    except ValidationError as error:
        raise LevelError([describe(problem) for problem in error.errors()]) from None


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

**Understand: the class is the format.** Read `Level` as a description of a good level, line by line:

- `class Level(BaseModel)`: a **model**, pydantic's version of a dataclass. Its fields are declared the same way, `name: type`, but creating one **checks** every field, from JSON or from code.
- `model_config = ConfigDict(strict=True, extra="forbid", frozen=True)` sets three rules for the whole model. `strict=True`: a field only accepts a value of exactly its type. Without it, pydantic would turn `"3"` into `3` for you, and `true` into 1 life. `extra="forbid"`: a field the model doesn't declare, like a misspelt `"lifes"`, is an error, not silently ignored. `frozen=True`: like a frozen dataclass, a `Level` can't be changed once made.
- `name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]`. **`Annotated[type, extra, ...]`** is standard Python, from `typing`: the type is `str`, and the extra items are information for whoever reads the annotation. pyright reads only the `str`. pydantic reads the rest as rules: remove spaces from both ends, then require at least one character.
- `lives: Annotated[int, Field(ge=1, le=MAX_LIVES)]`: an `int`, **g**reater than or **e**qual to 1, **l**ess than or **e**qual to 9.
- `wall: Annotated[tuple[Row, ...], AfterValidator(check_wall)]`: a tuple of rows, then checked as a whole by `check_wall`.
- `Row = Annotated[str, AfterValidator(check_row)]` is a **type alias**: a name for a type, so `Row` can be used wherever the type is needed. A row is a `str`, and once pydantic has checked it's a string, it calls `check_row` with it.

**Validators are plain functions.** `check_row` and `check_wall` receive a value that's already the right type: `check_row` gets a `str`, guaranteed, so there's no `isinstance` left in it, only the rules pydantic can't know (8 places, each `T`, `B` or `.`). A validator that finds a problem raises `ValueError` with a message; one that's happy returns the value. Rows are checked one by one first, then `check_wall` checks the number of rows, and only runs if every row was good.

**Reading a level** is one call: `Level.model_validate_json(text)` reads the JSON *and* checks it against the model, in one step inside pydantic-core, and returns a `Level` or raises **`ValidationError`**. A `ValidationError` holds a list of **every** problem it found, from `error.errors()`. Each problem is a dict with, among others:

- `"loc"`, the **location**: a tuple of the steps from the top of the data to the problem. `("lives",)` is the `lives` field; `("wall", 1)` is item 1 of the `wall` field, the second row, since Python counts from 0; `()` is the level as a whole.
- `"msg"`, pydantic's message, such as `Input should be a valid integer`. For a `ValueError` from a validator, it's `Value error, ` followed by the validator's message, so `describe` removes that prefix with `str.removeprefix`.

The type of each problem is `ErrorDetails`, from `pydantic_core`: a **`TypedDict`**, a dict whose keys and the type of each key's value are declared, so pyright checks `error["loc"]` and `error["msg"]` like attributes.

`where` turns a location into text: the parts, joined with commas, or `the level` for the empty location. `parse_level` turns each problem into one line and raises a `LevelError` holding all of them; `LevelError` now keeps the list as `problems`, and its message is the problems joined with `; `.

**What it cost.** `parse_level` is four lines, and the model's rules four more. What's left by hand is only what's particular to Breakout: the row rules and the row count. And the error messages are pydantic's, not yours: correct and consistent, a little less friendly. You could rewrite each one, and for a product used by the public you might; for a level format, the standard ones are a fair trade.

```predict
question: What does `level.Level(name="Test", lives=99, wall=("BBBBBBBB",))` do?
choice: Makes a Level with 99 lives: the rules are only for JSON
choice: Raises ValidationError: lives must be at most 9
choice: pyright refuses it before it runs
answer: Raises ValidationError: lives must be at most 9
explain: A model checks every field whenever one is created, from JSON, a dict, or code: `Input should be less than or equal to 9`. pyright can't help, because `99` *is* an `int`; the range is a rule only pydantic checks, at run time. So unlike lesson 5.3's dataclass, which your own code could create with any values at all, there is no way to make a `Level` that breaks the rules. That's "parse, don't validate" made complete.
```

```check
contains breakout/level.py "class Level(BaseModel):"
lacks breakout/level.py "isinstance(" -- pydantic checks the types now: no isinstance left in level.py.
run ".venv/Scripts/python -c \"from breakout import level; l = level.load_level(level.LEVELS / 'classic.json'); print(l.name, l.lives, len(l.bricks()))\"" stdout="Classic 3 40" label="the classic level loads"
run ".venv/Scripts/python -m pytest -q tests/test_level.py" stdout="6 passed" label="the level tests pass unchanged"
```

## The errors, as they should read

**Build:** the error tests, rewritten for pydantic's messages, **before** the code gives all of them.

```python file=tests/test_level_errors.py
import json

import pytest

from breakout import level


def level_text(**changes: object) -> str:
    """A good level's JSON, with these fields changed."""
    return json.dumps({"name": "Test", "lives": 3, "wall": ["BBBBBBBB"], **changes})


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("", "the level: Invalid JSON: EOF while parsing a value at line 1 column 0"),
        ('["BBBBBBBB"]', "the level: Input should be an object"),
        ('{"name": "Test", "lives": 3}', "wall: Field required"),
        (level_text(speed=2), "speed: Extra inputs are not permitted"),
        (level_text(name=" "), "name: String should have at least 1 character"),
        (level_text(lives=10), "lives: Input should be less than or equal to 9"),
        (level_text(lives=True), "lives: Input should be a valid integer"),
        (level_text(lives="3"), "lives: Input should be a valid integer"),
        (level_text(wall="BBBBBBBB"), "wall: Input should be a valid array"),
        (level_text(wall=[]), "wall: a level needs at least one row"),
        (level_text(wall=["BBBBBBBB"] * 11), "wall: a level has at most 10 rows, and this one has 11"),
        (level_text(wall=["BBBBBBBB", 8]), "wall, row 2: Input should be a valid string"),
        (level_text(wall=["BBBBBBB"]), "wall, row 1: a row has 8 places, and this one has 7"),
        (level_text(wall=["BBBBXBBB"]), "wall, row 1: unknown brick 'X' in column 5: use T, B or ."),
    ],
)
def test_a_bad_level_is_refused_with_where_and_why(text: str, message: str):
    with pytest.raises(level.LevelError) as refused:
        level.parse_level(text)
    assert str(refused.value) == message


def test_every_problem_is_reported_at_once():
    with pytest.raises(level.LevelError) as refused:
        level.parse_level(level_text(name=5, lives=0, wall=["BBBBBBBB", "BB"]))
    assert refused.value.problems == [
        "name: Input should be a valid string",
        "lives: Input should be greater than or equal to 1",
        "wall, row 2: a row has 8 places, and this one has 2",
    ]
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_level_errors.py
```

(The test IDs are shortened here: pytest prints each case's whole level.)

```text
FAILED tests/test_level_errors.py::test_a_bad_level_is_refused_with_where_and_why[...-wall, row 2: Input should be a valid string]
FAILED tests/test_level_errors.py::test_a_bad_level_is_refused_with_where_and_why[...-wall, row 1: a row has 8 places, and this one has 7]
FAILED tests/test_level_errors.py::test_a_bad_level_is_refused_with_where_and_why[...-wall, row 1: unknown brick 'X' in column 5: use T, B or .]
FAILED tests/test_level_errors.py::test_every_problem_is_reported_at_once - AssertionError: ...
4 failed, 11 passed
```

**Understand.** The cases are lesson 5.3's, with pydantic's messages, plus a few that are new: `"3"` as a number of lives (refused because the model is strict), and an empty wall. `test_every_problem_is_reported_at_once` checks what the hand-written version couldn't do: a level with three problems gets all three in one error, so a level designer fixes them in one go instead of one run at a time.

Four tests fail, and that's deliberate. They say what a level designer should read, `wall, row 2`, and the code says `wall, 1`: Python's 0-based index, with no word to say what it counts. This is lesson 3.3's red, green, refactor, used for messages: the tests say exactly what "friendly" means before anyone changes the code, and the Your turn takes them from red to green.

```check
run ".venv/Scripts/python -m pytest -q tests/test_level_errors.py" exit=1 stdout="4 failed, 11 passed" label="eleven pass, and the four about rows fail until the next step"
```

## Your turn: rows a designer can find

**Build, on your own:** make the four failing tests pass by changing `where` in `breakout/level.py`, and nothing else.

| Location | `where` gives |
|---|---|
| `()` | `the level` |
| `("lives",)` | `lives` |
| `("wall", 0)` | `wall, row 1` |
| `("wall", 1)` | `wall, row 2` |

A location's parts are field names (`str`) and positions in a list or tuple (`int`). Don't change the tests: they are the specification. When all 83 tests pass and every check is clean, commit with a message that mentions **pydantic**.

```hints
nudge: The location's parts have two types, `int | str`. What should happen to a part that's an `int`, and what to one that's a `str`?
concept: Turn each part into text separately: a `str` part stays as it is; an `int` part is a position counted from 0, so it becomes `row ` and the position plus 1. A conditional expression, `a if condition else b`, chooses inside a list comprehension, and `isinstance(part, int)` tells the two kinds apart; pyright then knows that in the `else` branch the part is a `str`. This `isinstance` isn't checking a level designer's input, which pydantic has done: it picks between the two types a location is declared to hold.
shape: Two lines: a list comprehension making `parts`, then the same `", ".join(...) or "the level"` as before, joining `parts`.
answer: ~~~python
def where(location: tuple[int | str, ...]) -> str:
    parts = [f"row {part + 1}" if isinstance(part, int) else part for part in location]
    return ", ".join(parts) or "the level"
~~~

`", ".join([])` is the empty string, which is false, so `or` gives `the level` for the empty location. Every `int` in a level's location is a row, because the wall is the only list in the format; if the format gains another list (Part 3's editor will want several), `where` will need to know which list it's in, and these tests will say so.
```

```check
contains tests/test_level_errors.py "wall, row 2: Input should be a valid string" -- The tests are the specification: change where, not the tests.
run ".venv/Scripts/python -m pytest -q tests/test_level_errors.py" stdout="15 passed" label="every error test passes"
run ".venv/Scripts/python -m pytest -q" stdout="83 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "pydantic"
git-clean
```

## What did we actually learn?

- **Declare, don't check**: a pydantic `BaseModel` says what valid data is, and creating one checks it, from JSON or from code. `model_validate_json` reads and checks in one step.
- **`Annotated[type, rules]`**: the type for pyright, the rules for pydantic. `Field(ge=, le=)`, `StringConstraints(...)`, and `AfterValidator(function)` for rules of your own.
- **Strict mode** refuses conversions (`"3"`, `true`); **`extra="forbid"`** refuses unknown fields; **`frozen=True`** makes the model immutable.
- **Every problem at once**, each with a location; turning locations into words a person can follow.
- **Runtime dependencies** go in `pyproject.toml`; transitive ones come with them.
- **Test-first for messages**: tests that say exactly what a person should read, red before the code changes.

In C#, the same model is a class with attributes from `System.ComponentModel.DataAnnotations`: `[Range(1, 9)] public int Lives { get; init; }`, `[Required]`, `[MinLength(1)]`, and an `IValidatableObject` for custom rules like `check_row`; `init` makes it immutable like `frozen`. In Java, it's a `record` with **Bean Validation** annotations, `@Min(1) @Max(9) int lives`, and a custom constraint for the rows. Both, like pydantic, put the rules on the type itself so they can't drift apart from it. pydantic is also how FastAPI checks every request in Chapter 26: the model you learned here is the one you'll use there.
