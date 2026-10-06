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

Look at the last line pip printed. It starts `Successfully installed`, and names more than pydantic: `annotated-types-0.8.0`, `pydantic-2.13.5`, `pydantic-core-2.46.5` and `typing-inspection-0.4.4` among them (your versions of the three that aren't pinned may be newer). `pydantic-core` is pydantic's validation engine, written in **Rust**, a **compiled** language: translated ahead of time into the processor's own instructions, so it runs much faster than Python, but it has to be built separately for each operating system and Python version. pip downloads a **wheel** (lesson 4.3's ready-to-install package) already built for your Python and Windows, so you never compile anything. `annotated-types` and `typing-inspection` are what it uses to read type hints. These are **transitive dependencies** (lesson 2.1): pydantic declares them, and pip installs them. You still pin only what you use directly.

```check
run ".venv/Scripts/python -c \"import pydantic; print(pydantic.VERSION)\"" stdout="2.13.5" label="pydantic 2.13.5 is installed"
contains pyproject.toml "\"pydantic==2.13.5\""
```

## A level, declared

**Build:** `Level` becomes a pydantic **model**, and all the hand-written checking goes.

Start with the plainest model there is: the three fields and their types, nothing else. `parse_level` becomes one line. (`LevelError` changes shape too, ready for step five; until then pydantic's own errors come out as they are.)

```python file=breakout/level.py
from pathlib import Path

import pygame
from pydantic import BaseModel

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


class Level(BaseModel):
    name: str
    lives: int
    wall: tuple[str, ...]

    def bricks(self) -> list[Brick]:
        """A new wall of bricks, ready to be broken."""
        return make_bricks(self.wall)


def parse_level(text: str) -> Level:
    return Level.model_validate_json(text)


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

**Understand.** `class Level(BaseModel)`: a **model**, pydantic's version of a dataclass. Its fields are declared the same way, `name: type`, but creating one **checks** every field, from JSON or from code.

How can a class check anything? Through its annotations. When Python runs a `class` statement, it stores the class's annotations in a dict, `Level.__annotations__`, which any code can read. `BaseModel` reads it the moment the class is created, builds a **validator** for those fields inside pydantic-core, and gives the class an `__init__` that runs the validator. So `Level(name=5, ...)` goes: the generated `__init__` → the validator checks each field → it collects every problem → it raises one `ValidationError` holding them all. (pyright knows the parameters of that generated `__init__` because pydantic tells type checkers it behaves like a dataclass.)

Try a model with nothing else in the way first. In `scratch/pyd_demo.py`:

```python
from pydantic import BaseModel, ValidationError


class Point(BaseModel):
    x: int
    name: str


print(Point.__annotations__)
print(Point(x=3, name="a"))
print(Point.model_validate_json('{"x": "3", "name": "a"}'))
try:
    Point(x="three", name=5)
except ValidationError as error:
    print(error)
```

```text
{'x': <class 'int'>, 'name': <class 'str'>}
x=3 name='a'
x=3 name='a'
2 validation errors for Point
x
  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='three', input_type=str]
    For further information visit https://errors.pydantic.dev/2.13/v/int_parsing
name
  Input should be a valid string [type=string_type, input_value=5, input_type=int]
    For further information visit https://errors.pydantic.dev/2.13/v/string_type
```

Line by line: the annotations are just a dict; a model made from code; a model made from JSON, where `"3"` quietly became `3` (pydantic's default, **lax** mode, which the next step turns off); and two problems reported **at once**, each with its field, a message, and an error `type` (`int_parsing`, `string_type`). Lesson 5.3's hand-written checks stopped at the first.

**One thing breaks for a while.** `LevelError` changes shape in this step, so tests in `tests/test_level_errors.py` fail from now until the end of the lesson: the step "The errors, as they should read" rewrites them, and the Your turn makes the last four pass. Until then, `tests/test_level.py` is the one to watch.

**Reading a level** is one call: `Level.model_validate_json(text)` reads the JSON *and* checks it against the model, in one step inside pydantic-core, and returns a `Level` or raises **`ValidationError`**.

Give it a level with a name that's a number:

```powershell
.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': 5, 'lives': 3, 'wall': ['BBBBBBBB']}))"
```

```text
pydantic_core._pydantic_core.ValidationError: 1 validation error for Level
name
  Input should be a valid string [type=string_type, input_value=5, input_type=int]
```

Refused, with where (`name`) and why. (`pydantic_core._pydantic_core.ValidationError` is where the class is defined: the leading `_` marks a private module inside pydantic-core. You import it as `from pydantic import ValidationError`.) That one check replaces an `isinstance` you wrote by hand. But try a level with a misspelt field and the lives written as text:

```powershell
.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': 'A', 'lives': '3', 'lifes': 5, 'wall': ['BBBBBBBB']}))"
```

No error at all. By default pydantic is **lax**: it turns `"3"` into 3 for you, and ignores fields it doesn't know. The next step makes it as strict as lesson 5.3's checks.

```check
contains breakout/level.py "class Level(BaseModel):"
run ".venv/Scripts/python -c \"import json; from breakout import level; level.parse_level(json.dumps({'name': 5, 'lives': 3, 'wall': ['BBBBBBBB']}))\"" exit=1 stderr="Input should be a valid string" label="a name that is not a string is refused"
```

## Strict, closed and frozen

**Build:** three rules for the whole model: exact types only, no unknown fields, and no changes after it's made.

A model reads its settings from a **class attribute** named exactly `model_config`, which pydantic looks for and doesn't treat as a field. A class attribute is a variable set in the class body, not on `self`: it belongs to the class, and every object sees it until it's given its own. In the REPL:

```text
>>> class C:
...     n = 1
...
>>> a, b = C(), C()
>>> C.n, a.n, b.n
(1, 1, 1)
>>> a.n = 5
>>> C.n, a.n, b.n
(1, 5, 1)
>>> C.n = 2
>>> C.n, a.n, b.n
(2, 5, 2)
```

`a.n = 5` gave `a` its own `n`, hiding the class's; `b` still reads the class's, so changing `C.n` changes what `b` sees. Lesson 3.1's `self.x = ...` in `__init__` is the other kind, an **instance attribute**, one per object. Here is the model with its settings:

```python file=breakout/level.py
from pathlib import Path

import pygame
from pydantic import BaseModel, ConfigDict

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


class Level(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    name: str
    lives: int
    wall: tuple[str, ...]

    def bricks(self) -> list[Brick]:
        """A new wall of bricks, ready to be broken."""
        return make_bricks(self.wall)


def parse_level(text: str) -> Level:
    return Level.model_validate_json(text)


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

**Understand.** `model_config = ConfigDict(strict=True, extra="forbid", frozen=True)` sets three rules for the whole model. `strict=True`: a field only accepts a value of exactly its type. Without it, pydantic would turn `"3"` into `3` for you, and `true` into 1 life. `extra="forbid"`: a field the model doesn't declare, like a misspelt `"lifes"`, is an error, not silently ignored. `frozen=True`: like a frozen dataclass, a `Level` can't be changed once made.

The same level as before:

```powershell
.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': 'A', 'lives': '3', 'lifes': 5, 'wall': ['BBBBBBBB']}))"
```

```text
pydantic_core._pydantic_core.ValidationError: 2 validation errors for Level
lifes
  Extra inputs are not permitted [type=extra_forbidden, input_value=5, input_type=int]
lives
  Input should be a valid integer [type=int_type, input_value='3', input_type=str]
```

Both problems, in one go: pydantic doesn't stop at the first. That's already better than the hand-written version, which made a level designer fix one mistake per run.

```check
run ".venv/Scripts/python -c \"import json; from breakout import level; level.parse_level(json.dumps({'name': 'A', 'lives': '3', 'lifes': 5, 'wall': ['BBBBBBBB']}))\"" exit=1 stderr="Extra inputs are not permitted" label="an unknown field is refused"
```

## Rules on the values

**Build:** the name must have something in it, and the lives must be from 1 to 9.

A type alone says "an `int`"; these rules say *which* ints. Python's `Annotated` attaches them to the type:

```python file=breakout/level.py
from pathlib import Path
from typing import Annotated

import pygame
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

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


class Level(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    lives: Annotated[int, Field(ge=1, le=MAX_LIVES)]
    wall: tuple[str, ...]

    def bricks(self) -> list[Brick]:
        """A new wall of bricks, ready to be broken."""
        return make_bricks(self.wall)


def parse_level(text: str) -> Level:
    return Level.model_validate_json(text)


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

**Understand.** `name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]`. **`Annotated[type, extra, ...]`** is standard Python, from `typing`: the type is `str`, and the extra items are information for whoever reads the annotation. pyright reads only the `str`. pydantic reads the rest as rules: remove spaces from both ends, then require at least one character. Python itself ignores the extras completely: `x: Annotated[int, "anything at all"] = "oops"` runs without complaint (annotations are never checked at run time), and pyright reports only that `"oops"` isn't an `int`. Only a library that reads the annotation, like pydantic, gives the extras a meaning.

`strip_whitespace=True` doesn't only check: it changes the stored value. A level named `"  Castle  "` is stored as `"Castle"`, and one named `"   "` becomes `""`, which then fails `min_length=1`.

`lives: Annotated[int, Field(ge=1, le=MAX_LIVES)]`: an `int`, **g**reater than or **e**qual to 1, **l**ess than or **e**qual to 9.

```powershell
.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': ' ', 'lives': 10, 'wall': ['BBBBBBBB']}))"
```

```text
pydantic_core._pydantic_core.ValidationError: 2 validation errors for Level
name
  String should have at least 1 character [type=string_too_short, input_value=' ', input_type=str]
lives
  Input should be less than or equal to 9 [type=less_than_equal, input_value=10, input_type=int]
```

```check
run ".venv/Scripts/python -c \"import json; from breakout import level; level.parse_level(json.dumps({'name': ' ', 'lives': 10, 'wall': ['BBBBBBBB']}))\"" exit=1 stderr="Input should be less than or equal to 9" label="lives over 9 are refused"
```

## Rules of your own

**Build:** the rules only Breakout knows: what a row may contain, and how many rows there may be.

pydantic can check types and ranges; it can't know that a row is 8 places of `T`, `B` or `.`. For that, write a plain function and attach it:

```python file=breakout/level.py
from pathlib import Path
from typing import Annotated

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

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


def parse_level(text: str) -> Level:
    return Level.model_validate_json(text)


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

**Understand.** `Row = Annotated[str, AfterValidator(check_row)]` is a **type alias**: a name for a type, so `Row` can be used wherever the type is needed. A row is a `str`, and once pydantic has checked it's a string, it calls `check_row` with it.

`wall: Annotated[tuple[Row, ...], AfterValidator(check_wall)]`: a tuple of rows, then checked as a whole by `check_wall`.

**Validators are plain functions.** `check_row` and `check_wall` receive a value that's already the right type: `check_row` gets a `str`, guaranteed, so there's no `isinstance` left in it, only the rules pydantic can't know (8 places, each `T`, `B` or `.`). A validator that finds a problem raises `ValueError` with a message; one that's happy returns the value. Rows are checked one by one first, then `check_wall` checks the number of rows, and only runs if every row was good.

The order shows when a row and the row count are both wrong.

```predict
question: A level has eleven rows, and the first is only `"BB"`. Rows are checked first, then the whole wall. What does pydantic report?
choice: Only the short row (`wall.0`)
choice: Only the row count (`wall`)
choice: Both: the short row and the row count
answer: Only the short row (`wall.0`)
explain: `check_wall` is an after-validator on the whole tuple: it runs only once the tuple has been built, and the tuple is built only if every row passed. Row 0 failed, so there's no tuple to check, and the row count goes unmentioned until the short row is fixed. "Every problem at once" means every problem pydantic could reach. Run it: `.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': 'A', 'lives': 3, 'wall': ['BB'] + ['BBBBBBBB'] * 10}))"`.
```

And a single bad character:

```powershell
.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': 'A', 'lives': 3, 'wall': ['BBBBXBBB']}))"
```

```text
wall.0
  Value error, unknown brick 'X' in column 5: use T, B or . [type=value_error, ...]
```

`wall.0` is pydantic's way of saying where: the `wall` field, item 0. The last step turns that into words.

```check
run ".venv/Scripts/python -c \"import json; from breakout import level; level.parse_level(json.dumps({'name': 'A', 'lives': 3, 'wall': ['BBBBXBBB']}))\"" exit=1 stderr="unknown brick 'X' in column 5" label="an unknown brick is refused, by your own rule"
```

## Every problem, in words

**Build:** turn pydantic's errors into one `LevelError` holding a line for every problem.

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

**Understand.** A `ValidationError` holds a list of **every** problem it found, from `error.errors()`. Each problem is a dict with, among others:

- `"loc"`, the **location**: a tuple of the steps from the top of the data to the problem. `("lives",)` is the `lives` field; `("wall", 1)` is item 1 of the `wall` field, the second row, since Python counts from 0; `()` is the level as a whole.
- `"msg"`, pydantic's message, such as `Input should be a valid integer`. For a `ValueError` from a validator, it's `Value error, ` followed by the validator's message, so `describe` removes that prefix with `str.removeprefix`.

For a level with 0 lives and a second row of `"BB"`, `error.errors()` is this list of two dicts (shown with only four of their keys):

```text
{'type': 'greater_than_equal', 'loc': ('lives',),  'msg': 'Input should be greater than or equal to 1',          'input': 0}
{'type': 'value_error',        'loc': ('wall', 1), 'msg': 'Value error, a row has 8 places, and this one has 2', 'input': 'BB'}
```

`type` is a fixed name for the kind of problem, for code that wants to react to one kind; `input` is the value that was refused. `describe` only needs `loc` and `msg`.

The type of each problem is `ErrorDetails`, from `pydantic_core`: a **`TypedDict`**, a dict whose keys and the type of each key's value are declared, so pyright checks `error["loc"]` and `error["msg"]` like attributes. Declaring one looks like a dataclass:

```python
from typing import TypedDict


class Point(TypedDict):
    x: int
    y: int


p: Point = {"x": 1, "y": 2}
```

At run time `p` is an ordinary dict; only pyright knows its shape, and it would flag `{"x": 1}` (missing `y`) or `p["z"]`.

`where` turns a location into text: the parts, joined with commas, or `the level` for the empty location. `parse_level` turns each problem into one line and raises a `LevelError` holding all of them; `LevelError` now keeps the list as `problems`, and its message is the problems joined with `; `.

`where` ends with `or "the level"`: `", ".join(...)` of an empty location is the empty string `""`, which counts as false, so `or` gives `"the level"` instead. Traced:

```text
loc ("lives",)     →  "lives"                         →  "lives: Input should be ..."
loc ("wall", 1)    →  "wall, 1"                       →  "wall, 1: a row has 8 places, ..."
loc ()             →  "" or "the level" = "the level" →  "the level: Invalid JSON: ..."
```

```powershell
.venv\Scripts\python -c "import json; from breakout import level; level.parse_level(json.dumps({'name': 5, 'lives': 0, 'wall': ['BBBBBBBB', 'BB']}))"
```

```text
breakout.level.LevelError: name: Input should be a valid string; lives: Input should be greater than or equal to 1; wall, 1: a row has 8 places, and this one has 2
```

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
concept: Turn each part into text separately: a `str` part stays as it is; an `int` part is a position counted from 0, so it becomes `row ` and the position plus 1. A conditional expression, `a if condition else b` (lesson 5.2), chooses inside a list comprehension, and `isinstance(part, int)` tells the two kinds apart; pyright then knows that in the `else` branch the part is a `str`. This `isinstance` isn't checking a level designer's input, which pydantic has done: it picks between the two types a location is declared to hold.
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

## Where this comes from

Every argument in this lesson, `StringConstraints`, `Field(ge=, le=)`, `strict`, `extra`, `AfterValidator`, came from pydantic's documentation, and from now on that's where you'll find the next one. The pages to know: **Models**, **Fields**, **Validators**, and **Strict Mode**, whose conversion table says exactly what lax mode would have converted. Look one thing up now: what `max_length` means on a `str` and on a tuple, and whether `check_wall` could be replaced by it.

## Challenge: autocompletion for level files

**Optional, ★.** `Level.model_json_schema()` describes the model as a **JSON Schema**, a standard format editors understand. Save it as `breakout/levels/level.schema.json` (with `json.dumps(..., indent=2)`), and point VS Code's `json.schemas` setting at it for `breakout/levels/*.json`: level files now get autocompletion and red squiggles, from the same model. On a branch.

## Challenge: friendlier messages

**Optional, ★★.** Give each pydantic error `type` (`missing`, `extra_forbidden`, `int_type`, ...) your own wording in `describe`, with a dictionary lookup and a fallback for types you didn't list. Update the parametrised tests first. On a branch.

## Challenge: a wall written as text

**Optional, ★★★.** Accept a wall written either as a list of rows or as one string with a row per line. A **`BeforeValidator`** runs before pydantic's own checks, so it can turn a string into a list with `splitlines()`. Test both forms, and explain in a comment why it has to be *before*. On a branch.

## What did we actually learn?

- **Declare, don't check**: a pydantic `BaseModel` says what valid data is, and creating one checks it, from JSON or from code. It works by reading the class's annotations when the class is created.
- **Class attributes** belong to the class and are shared; **instance attributes** belong to each object. `model_validate_json` reads and checks in one step.
- **`Annotated[type, rules]`**: the type for pyright, the rules for pydantic. `Field(ge=, le=)`, `StringConstraints(...)`, and `AfterValidator(function)` for rules of your own.
- **Strict mode** refuses conversions (`"3"`, `true`); **`extra="forbid"`** refuses unknown fields; **`frozen=True`** makes the model immutable.
- **Every problem at once**, each with a location; turning locations into words a person can follow.
- **Runtime dependencies** go in `pyproject.toml`; transitive ones come with them.
- **Test-first for messages**: tests that say exactly what a person should read, red before the code changes.

In C#, the same model is a class with attributes from `System.ComponentModel.DataAnnotations`: `[Range(1, 9)] public int Lives { get; init; }`, `[Required]`, `[MinLength(1)]`, and an `IValidatableObject` for custom rules like `check_row`; `init` makes it immutable like `frozen`. In Java, it's a `record` with **Bean Validation** annotations, `@Min(1) @Max(9) int lives`, and a custom constraint for the rows. Both, like pydantic, put the rules on the type itself so they can't drift apart from it. pydantic is also how FastAPI checks every request in Chapter 36: the model you learned here is the one you'll use there.
