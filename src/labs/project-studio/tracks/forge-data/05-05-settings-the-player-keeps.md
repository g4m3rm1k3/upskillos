---
title: 5.5 — Settings the Player Keeps
runtime: python
run: breakout/__main__.py
---

Levels are data the game's *designer* writes. **Settings** are data the *player* writes: which keys they like, which level they want to start on. A player shouldn't have to type `--level breakout/levels/castle.json` every time, and a left-handed player shouldn't need to edit the code to steer with A and D. This lesson adds a settings file in **TOML**, reads it with the standard library, checks it with pydantic, and decides what happens when the command line and the file disagree.

## The level module so far

**Build:** make sure `breakout/level.py` matches the end of lesson 5.4, the reference answer to its Your turn.

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
    parts = [f"row {part + 1}" if isinstance(part, int) else part for part in location]
    return ", ".join(parts) or "the level"


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

```check
run ".venv/Scripts/python -m pytest -q" stdout="83 passed"
```

## Settings in a TOML file

**Build:** an example settings file, for playing with the left hand.

Create the folder `examples`, and in it `left-hand.toml`:

```toml file=examples/left-hand.toml
# Breakout settings for playing with the left hand.
# Use it with: breakout --config examples/left-hand.toml

# Relative to this file's folder.
level = "../breakout/levels/castle.json"

[controls]
left = "a"
right = "d"
serve = "w"
```

**Understand: TOML.** TOML (Tom's Obvious, Minimal Language) is made for files people edit by hand. You've been editing one since lesson 4.3: `pyproject.toml`.

- `key = value` sets a value. Strings go in double quotes; numbers and `true`/`false` don't.
- `#` starts a **comment**, to the end of the line. JSON has no comments, which is fine for data programs exchange and bad for a file a person maintains: here, the comments say what the file is for and how a path is read.
- `[controls]` starts a **table**: every `key = value` after it, until the next table, belongs to `controls`. It's the same as a JSON object nested in the top one.

Python reads TOML with `tomllib`, in the standard library since Python 3.11:

```powershell
.venv\Scripts\python -c "import tomllib; from pathlib import Path; print(tomllib.loads(Path('examples/left-hand.toml').read_text(encoding='utf-8')))"
```

```text
{'level': '../breakout/levels/castle.json', 'controls': {'left': 'a', 'right': 'd', 'serve': 'w'}}
```

A dict, with the table as a dict inside it. Try each piece on its own in the REPL:

```text
>>> import tomllib
>>> tomllib.loads('a = 1\nb = "x"\nc = true\n[t]\nk = 2\nu.v = 3')
{'a': 1, 'b': 'x', 'c': True, 't': {'k': 2, 'u': {'v': 3}}}
>>> tomllib.loads('a = ')
Traceback (most recent call last):
  ...
tomllib.TOMLDecodeError: Invalid value (at end of document)
```

A number, a string, a boolean, and a table `t`. `u.v = 3` is a **dotted key**: a table `u` inside `t`, written in one line, so a location in TOML can be read as a path, `t.u.v`. This lesson's error messages use the same idea (`controls.left`). A file that isn't TOML raises `TOMLDecodeError`, with what's wrong and where.

`tomllib.loads` ("load string") reads TOML from text, like `json.loads` in lesson 5.3, and `read_text(encoding="utf-8")` gets the text with the encoding said out loud.

You'll also see `tomllib.load`, which reads straight from an open file:

```python
with open(path, "rb") as file:
    data = tomllib.load(file)
```

(the `with` closes the file, lesson 5.1). The file must be opened in **binary** mode, `"rb"` (**r**ead, **b**inary): Python then hands over raw **bytes**, the numbers stored in the file, without decoding them, and `tomllib` decodes them as UTF-8 itself, because the TOML standard says a TOML file is always UTF-8. Both give the same dict; this series uses `loads`, so every file it reads names its encoding in the same place.

`tomllib` only **reads** TOML; Python has no standard way to write it, which fits: settings files are written by people.

**Which format when?** JSON for data programs write and read (Part 3's editor will save scenes as JSON). TOML for configuration people edit. You'll also meet **YAML**, used by many tools for configuration; it's more flexible than TOML and has more ways to surprise you, which is why Python chose TOML for `pyproject.toml`.

```check
file examples/left-hand.toml
run ".venv/Scripts/python -c \"import tomllib; from pathlib import Path; print(tomllib.loads(Path('examples/left-hand.toml').read_text(encoding='utf-8'))['controls'])\"" stdout="{'left': 'a', 'right': 'd', 'serve': 'w'}" label="the example file is valid TOML with a controls table"
```

## Key names a player can write

**Build:** the start of a module for settings: the keys a player may choose, by name.

A settings file will say `left = "a"`. pygame's key events don't carry names, they carry numbers: `pygame.K_a`, `pygame.K_LEFT`. So the first thing the module needs is a dictionary from the names a person writes to the numbers pygame uses.

Create `breakout/config.py`:

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import pygame

KEYS = {
    "left": pygame.K_LEFT,
    "right": pygame.K_RIGHT,
    "up": pygame.K_UP,
    "down": pygame.K_DOWN,
    "space": pygame.K_SPACE,
    "return": pygame.K_RETURN,
} | {chr(code): code for code in range(pygame.K_a, pygame.K_z + 1)}
```

**Understand.** The first six items are written out: a name, and pygame's number for it. The second half is a **dict comprehension**, `{key: value for ...}`, the dict version of a list comprehension. pygame numbers the letter keys `K_a` to `K_z` with consecutive numbers, the character codes of `a` to `z`, and `chr(code)` turns a code back into its character. Traced:

```text
range(pygame.K_a, pygame.K_z + 1)  =  range(97, 123)      +1, because range stops before its end
code  97  →  chr(97)  = "a"   →  "a": 97
code  98  →  chr(98)  = "b"   →  "b": 98
...
code 122  →  chr(122) = "z"   →  "z": 122
```

`|` between two dicts makes a new dict with the items of both: 6 named keys and 26 letters.

```powershell
.venv\Scripts\python -c "from breakout import config; print(len(config.KEYS), config.KEYS['a'], config.KEYS['z'], config.KEYS['left'])"
```

```text
32 97 122 1073741904
```

The arrow keys have no character, so pygame gives them numbers far above any character code. Nobody needs to remember them: that's what the names are for.

Why a list of allowed keys and not every key pygame knows? Because a game should accept what it has tested, and because the message for a wrong key can then say what *is* allowed.

```check
run ".venv/Scripts/python -c \"from breakout import config; print(len(config.KEYS), config.KEYS['a'], config.KEYS['z'])\"" stdout="32 97 122" label="32 key names: six named keys and the letters a to z"
```

## Actions and their keys

**Build:** the game's actions, each with a key, checked against `KEYS`.

The game shouldn't ask "is the left arrow pressed?" but "is *left* pressed?", and let the settings say which key that is. A model with one field per action:

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

from typing import Annotated

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict

KEYS = {
    "left": pygame.K_LEFT,
    "right": pygame.K_RIGHT,
    "up": pygame.K_UP,
    "down": pygame.K_DOWN,
    "space": pygame.K_SPACE,
    "return": pygame.K_RETURN,
} | {chr(code): code for code in range(pygame.K_a, pygame.K_z + 1)}


def check_key(name: str) -> str:
    if name not in KEYS:
        raise ValueError(f"unknown key {name!r}: use a-z, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    serve: Key = "space"
    pause: Key = "p"
```

**Understand.** `check_key` is a validator like `check_row` in lesson 5.4: it gets a `str` that pydantic has already checked, raises `ValueError` if the name isn't in `KEYS`, and returns it if it is. `Key = Annotated[str, AfterValidator(check_key)]` names that rule, as `Row` did. Names are exact: `"A"` and `"Left"` aren't in `KEYS`, so they're refused, which is why the message says `a-z`, the lower-case letters. (A challenge at the end of the lesson accepts any case.)

**`Controls`** has a field for each **action**, and each field's type is `Key`. Every field has a **default** after `=`, as in a dataclass, so a model can be made with none, some or all of them given. The config is lesson 5.4's: strict, no unknown fields, frozen. This is Godot's **InputMap** in miniature: the game asks about an action, and the map says which key it is today.

```powershell
.venv\Scripts\python -c "from breakout import config; print(config.Controls()); print(config.Controls(left='a'))"
```

```text
left='left' right='right' serve='space' pause='p'
left='a' right='right' serve='space' pause='p'
```

Given only `left`, the other three keep their defaults. A name that isn't a key, and an action that doesn't exist, are both refused:

```powershell
.venv\Scripts\python -c "from breakout import config; config.Controls(left='banana')"
.venv\Scripts\python -c "from breakout import config; config.Controls(jump='w')"
```

```text
left
  Value error, unknown key 'banana': use a-z, or left, right, up, down, space or return [type=value_error, ...]
jump
  Extra inputs are not permitted [type=extra_forbidden, ...]
```

```check
contains breakout/config.py "class Controls(BaseModel):"
run ".venv/Scripts/python -c \"from breakout import config; print(config.Controls(left='a'))\"" stdout="left='a' right='right' serve='space' pause='p'" label="one action changed, the others keep their defaults"
run ".venv/Scripts/python -c \"from breakout import config; config.Controls(left='banana')\"" exit=1 stderr="unknown key 'banana'" label="a key that doesn't exist is refused"
```

## The whole file, as a model

**Build:** a model for the whole settings file: a level, and the controls.

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

from pathlib import Path
from typing import Annotated

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field

KEYS = {
    "left": pygame.K_LEFT,
    "right": pygame.K_RIGHT,
    "up": pygame.K_UP,
    "down": pygame.K_DOWN,
    "space": pygame.K_SPACE,
    "return": pygame.K_RETURN,
} | {chr(code): code for code in range(pygame.K_a, pygame.K_z + 1)}


def check_key(name: str) -> str:
    if name not in KEYS:
        raise ValueError(f"unknown key {name!r}: use a-z, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    serve: Key = "space"
    pause: Key = "p"


class Config(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    level: Path | None = Field(default=None, strict=False)
    controls: Controls = Controls()
```

**Understand.** `controls: Controls = Controls()` is a **nested model**: a field whose type is another model. In the file it will be the `[controls]` table, and pydantic checks it with the `Controls` rules. Its default, `Controls()`, is one `Controls` with every action's default key, made once, when the class is defined, and used by every `Config` that doesn't give its own. Sharing one object is safe only because `Controls` is frozen: nobody can change the shared one.

So there are three ways a file can treat the controls, and two of them end up the same:

```text
no [controls] table      →  the field is missing          →  the default, Controls()
an empty [controls]      →  {} is checked as a Controls    →  every field defaulted: the same as Controls()
[controls] left = "a"    →  {"left": "a"}                  →  left is "a", the rest defaulted
```

`level` is a `Path`, or `None` when the file doesn't name one. TOML has no path type, only strings, and strict mode would refuse a string where a `Path` is wanted. `Field(default=None, strict=False)` gives the default and relaxes strictness for this field alone, so a string is turned into a `Path`.

`Config.model_validate(data)` checks a Python **dict** against the model, as lesson 5.4's `model_validate_json` did with JSON text. Which is exactly what `tomllib` will give it:

```powershell
.venv\Scripts\python -c "from breakout import config; print(repr(config.Config.model_validate({'level': 'castle.json', 'controls': {'left': 'a'}})))"
```

```text
Config(level=WindowsPath('castle.json'), controls=Controls(left='a', right='right', serve='space', pause='p'))
```

`repr` shows the types: the string became a `WindowsPath` (a `Path`, on Windows), and the inner dict became a `Controls`.

```check
run ".venv/Scripts/python -c \"from breakout import config; print(repr(config.Config.model_validate({'level': 'castle.json', 'controls': {'left': 'a'}})))\"" stdout="controls=Controls(left='a', right='right'" label="the inner table becomes a Controls"
run ".venv/Scripts/python -c \"from breakout import config; print(config.Config.model_validate({'controls': {}}) == config.Config())\"" stdout="True" label="an empty controls table is the same as none"
```

## Reading the file

**Build:** read a settings file, and turn every problem in it into one `ConfigError`.

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import tomllib
from pathlib import Path
from typing import Annotated

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, ValidationError
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
        raise ValueError(f"unknown key {name!r}: use a-z, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    serve: Key = "space"
    pause: Key = "p"


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
        return Config.model_validate(data)
    except ValidationError as error:
        raise ConfigError([describe(problem) for problem in error.errors()]) from None
```

**Understand.** `ConfigError` is lesson 5.4's `LevelError` again: a `ValueError` that keeps the list of problems.

`load_config` can fail in two different ways, so it has two `try` blocks. First, the text might not be TOML at all: `tomllib.loads` raises `TOMLDecodeError`, whose message says where (`Invalid value (at line 1, column 9)`). Then the TOML might not be good settings: `model_validate` raises `ValidationError`, with every problem. `encoding="utf-8-sig"` accepts a file with or without a byte order mark, as levels do since lesson 5.2.

**`describe`** is like `describe` in `level.py`, but joins a location with dots: `controls.left`. That's how TOML itself names a key inside a table (`controls.left = "a"` is valid TOML), so it's what a person editing the file will recognise. Two functions that look alike but serve different formats, and will change for different reasons, aren't the duplication the "don't repeat yourself" rule is about. That rule is about one piece of *knowledge* written in two places.

`pyproject.toml` is valid TOML, but not a settings file:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout import config; config.load_config(Path('pyproject.toml'))"
```

```text
breakout.config.ConfigError: project: Extra inputs are not permitted; build-system: Extra inputs are not permitted; tool: Extra inputs are not permitted
```

Now load the example, and ask whether the level it names exists:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout import config; c = config.load_config(Path('examples/left-hand.toml')); print(repr(c.level), c.level.exists())"
```

```text
WindowsPath('../breakout/levels/castle.json') False
```

It doesn't. `..` means "the folder above", and a relative path is found from the **current** folder: the project folder, whose parent has no `breakout\levels`. The file meant "above *my* folder", `examples`. That's lesson 0.1's hidden input again, and the next step fixes it.

```check
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout import config; config.load_config(Path('pyproject.toml'))\"" exit=1 stderr="project: Extra inputs are not permitted" label="a TOML file that isn't settings is refused, every problem named"
```

## Paths from the file's folder

**Build:** a relative `level` in a settings file is found from the settings file's folder.

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import tomllib
from pathlib import Path
from typing import Annotated

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, ValidationError
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
        raise ValueError(f"unknown key {name!r}: use a-z, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    serve: Key = "space"
    pause: Key = "p"


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

**Understand.** The model is checked into `config` first. If it names no level, there's nothing to fix. Otherwise the level path is joined onto the settings file's folder, `path.parent`. Traced for the example:

```text
path                        examples/left-hand.toml
path.parent                 examples
config.level                ../breakout/levels/castle.json
path.parent / config.level  examples/../breakout/levels/castle.json
                            = into examples, up out of it, into breakout/levels: the castle
```

That works from whichever folder the game is started in, because it only depends on where the settings file is.

Notice what it allows: an absolute path, or one with `..` that leads out of the settings folder, anywhere on the disk. For the player's own file, that's fine: it's their computer, and their choice. For a file from a stranger (Part 5's shared levels), the same line would let the file reach any file the game can read, a hole called **path traversal**, which Chapter 18 closes.

`config` is frozen, so its `level` can't be changed. **`model_copy(update={...})`** makes a new model with the same fields, except those named in `update`; the original is left as it was. pydantic doesn't check the `update` values again, which is fine here: a `Path` joined to a `Path` is a `Path`.

```predict
question: What is `Path("C:/games/examples") / "C:/levels/castle.json"`?
choice: C:\games\examples\C:\levels\castle.json
choice: C:\levels\castle.json
choice: An error: you can't join two absolute paths
answer: C:\levels\castle.json
explain: When the right-hand side of `/` is an absolute path, pathlib's result is just that path: an absolute path already says where it is, so the folder before it doesn't matter. So `path.parent / config.level` does the right thing for both kinds of path in the settings file, with no `if`: a relative `level` is found from the file's folder, and an absolute one is left alone.
```

```check
contains breakout/config.py "model_copy(update="
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout import config; c = config.load_config(Path('examples/left-hand.toml')); print(c.level.name, c.level.exists(), c.controls.left, c.controls.pause)\"" stdout="castle.json True a p" label="the example loads: the castle (found this time), A to go left, and P still pauses"
```

## The config stands alone

**Build:** an architecture rule for the new module.

```python file=tests/test_architecture.py
# Which parts of the game may depend on which. Each check imports one module in a fresh Python,
# because this test process has already imported every module the other tests use.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def loaded_by(module: str) -> set[str]:
    code = f"import sys, {module}\nfor name in sys.modules:\n    print(name)"
    result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, check=True)
    return {line for line in result.stdout.splitlines() if line.startswith("breakout")}


def test_settings_depend_on_nothing_else_in_the_game():
    assert loaded_by("breakout.settings") == {"breakout", "breakout.settings"}


def test_the_config_depends_on_nothing_else_in_the_game():
    assert loaded_by("breakout.config") == {"breakout", "breakout.config"}


def test_the_model_depends_on_nothing_else_in_the_game():
    assert loaded_by("breakout.model") == {"breakout", "breakout.model"}


def test_levels_depend_only_on_the_model():
    assert loaded_by("breakout.level") == {"breakout", "breakout.level", "breakout.model"}


def test_drawing_depends_only_on_the_model():
    assert loaded_by("breakout.draw") == {"breakout", "breakout.draw", "breakout.model"}
```

**Understand.** `config` depends on nothing else in the game, like `settings` and `model`: it describes the player's choices, and anything may read them. pygame and pydantic aren't part of the game, so they don't count.

```check
run ".venv/Scripts/python -m pytest -q tests/test_architecture.py" stdout="5 passed"
```

## A settings file on the command line

**Build:** a `--config` option.

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
    config: Path | None = None


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
    parser.add_argument("--config", type=Path, metavar="FILE", help="read settings from this TOML file")
    return parser


def parse_args(args: list[str]) -> Settings:
    options = make_parser().parse_args(args)
    return Settings(
        test_frames=options.test_run,
        hold=Hold(options.hold),
        lag_at=options.lag_at,
        seed=options.seed,
        level=options.level,
        config=options.config,
    )
```

**Understand.** `--config FILE` is stored as `settings.config`, a `Path`, like `--level`. `parse_args` doesn't read the file: it only turns the command line into a `Settings`, and reading files is the app's job, so `parse_args` stays a pure function that the argument tests can call without any files.

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="10 passed"
contains breakout/settings.py "\"--config\""
```

## The app plays by the player's settings

**Build:** the app reads the settings file and uses its controls.

```python file=breakout/app.py
import os
import random
import sys

import pygame

from breakout.config import KEYS, Config, ConfigError, load_config
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
    try:
        config = load_config(settings.config) if settings.config else Config()
    except (OSError, UnicodeDecodeError, ConfigError) as error:
        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    try:
        level = load_level(level_file)
    except (OSError, UnicodeDecodeError, LevelError) as error:
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
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.serve]:
                if game.state in (GameState.OVER, GameState.WON):
                    game = Game(rng, level.bricks(), level.lives)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[KEYS[controls.left]]:
                direction -= 1
            if keys[KEYS[controls.right]]:
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

**Understand: precedence.** Where can the level come from now? The command line, the settings file, and the built-in classic wall. When more than one says something, one must win, and the rule must be one a player can predict. The usual rule, used by almost every program you'll meet, is **the most specific wins**:

```python
level_file = settings.level or config.level or LEVELS / "classic.json"
```

`or` gives the first value that's set: `None` counts as false, so it's skipped. The command line is a choice for *this* run, so it beats the file; the file is the player's standing choice, so it beats the game's default. So a player whose file says "castle" can still try the classic wall once with `--level`, without editing the file.

**Two kinds of settings, two names.** `Settings` (lesson 4.3) is **this run's command line**: `--level`, `--config`, `--test-run`. `Config` is **the player's file**, kept between runs. `settings.config` is the command-line option naming the file; `config.level` is the level the file names; `settings.level` is the level the command line names.

**Which settings?** `load_config(settings.config) if settings.config else Config()` is a conditional expression (lesson 5.2): with `--config`, read that file; without it, `settings.config` is `None`, which counts as false, and `Config()` gives every default. Either way, `config` is a `Config`, and the rest of `main` doesn't care which.

**Controls.** Every key the game reacts to now goes through `KEYS[controls.<action>]`: the action's key name from the settings, then pygame's number for it. Traced for steering left, with and without the example file:

```text
                     --config examples/left-hand.toml     no --config
controls.left        "a"                                  "left"
KEYS[controls.left]  97 (pygame.K_a)                      1073741904 (pygame.K_LEFT)
keys[...]            True while A is held                 True while the left arrow is held
```

The loop is the same code for both players; only the data differs. Escape isn't configurable, on purpose: however wrong someone's settings are, there's always a way out.

**A known gap.** The title screen still says "press Space to play", and the pause screen "press P to go on": `draw.py`'s `MESSAGES` were written before keys could change. With `examples/left-hand.toml`, serving is W, and the screen tells the player to press Space, which now does nothing: the game says something that isn't true for this player. A challenge at the end of this lesson fixes it, the way this series fixes everything: a pure function, tested without a window.

A bad settings file stops the game before it starts, with the same kind of message as a bad level, and exit code 1:

```powershell
.venv\Scripts\breakout --config pyproject.toml
```

```text
breakout: pyproject.toml: project: Extra inputs are not permitted; build-system: Extra inputs are not permitted; tool: Extra inputs are not permitted
```

Now play: `.venv\Scripts\breakout --config examples/left-hand.toml`. The castle, with A, D and W.

```check
run ".venv/Scripts/breakout --test-run 600 --hold auto --config examples/left-hand.toml" stdout="lives=5 bricks=15" label="the settings file's level is played"
run ".venv/Scripts/breakout --test-run 600 --hold auto --config examples/left-hand.toml --level breakout/levels/classic.json" stdout="lives=3 bricks=33" label="--level beats the settings file"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="without settings, the game plays exactly as before"
lacks breakout/app.py "pygame.K_LEFT" -- Steering uses the settings now: KEYS[controls.left].
```

## Tests for the settings

**Build:** tests for what a good settings file gives.

```python file=tests/test_config.py
from pathlib import Path

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
```

**Understand.** `write_config` writes a settings file into the test's own temporary folder (`tmp_path`, lesson 5.2), so no test depends on a file in the project or on anyone's real settings.

The tests compare whole models with `==`. Two models are **equal** when they're the same class and every field is equal, like dataclasses; they don't have to be the same object:

```powershell
.venv\Scripts\python -c "from breakout import config; a = config.Controls(left='a'); b = config.Controls(left='a'); print(a == b, a is b, a == config.Controls())"
```

```text
True False False
```

`a` and `b` are two objects (`is` is false) with the same fields (`==` is true); `Controls()` has a different `left`. So one `assert` checks all four controls at once, and a failure shows both models side by side. `test_a_level_is_found_from_the_file_s_own_folder` pins down the last step's path rule: the file is in `tmp_path`, so its `levels/castle.json` must come back as `tmp_path / "levels" / "castle.json"`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_config.py" stdout="4 passed"
```

## Bad settings, every kind

**Build:** one test for every kind of mistake a settings file can have.

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
            "controls.left: unknown key 'banana': use a-z, or left, right, up, down, space or return",
        ),
    ],
)
def test_bad_settings_are_refused_with_where_and_why(tmp_path: Path, text: str, message: str):
    with pytest.raises(config.ConfigError) as refused:
        config.load_config(write_config(tmp_path, text))
    assert str(refused.value) == message
```

**Understand.** Lesson 5.2's pattern: a list of `(text, message)` pairs, and one test function that pytest runs once per pair, so five cases make five tests. Each case is a different kind of mistake, and each message says where and why:

```text
level = \n                     not TOML at all              the TOML error, with line and column
speed = 2                     a setting that doesn't exist  speed
[controls] jump = "w"         an action that doesn't exist  controls.jump
[controls] left = 1           a number, not a key name      controls.left
[controls] left = "banana"    a name that isn't a key       controls.left, and the keys that are
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_config.py" stdout="9 passed"
run ".venv/Scripts/python -m pytest -q" stdout="93 passed"
```

## Your turn: one key, two actions

**Build, on your own:** refuse settings that give two actions the same key.

With `left = "p"`, pressing P would steer left **and** pause. The game shouldn't guess what the player meant: it should refuse the file and say which two actions clash.

| Settings | Result |
|---|---|
| `left = "a"`, `right = "a"` | `controls: left and right both use 'a'` |
| `left = "p"` (pause is still `p`) | `controls: left and pause both use 'p'` |
| no `[controls]` at all | the defaults, which don't clash |

The rule is about the **whole** set of controls, not one field, so `AfterValidator` on a field can't see enough. You need three new pieces, shown here on a model that has nothing to do with Breakout.

```python
from typing import Self

from pydantic import BaseModel, model_validator


class Window(BaseModel):
    low: int
    high: int

    @model_validator(mode="after")
    def low_not_above_high(self) -> Self:
        if self.low > self.high:
            raise ValueError(f"low is {self.low}, above high {self.high}")
        return self
```

- **`@model_validator(mode="after")`** above a method makes pydantic call it once every field has been checked ("after"), with the finished model as `self`. Like a field validator, it raises `ValueError` to refuse, and returns the model to accept. `Window(low=9, high=5)` is refused with `low is 9, above high 5`; `Window(low=1, high=5)` is made.
- **`Self`**, from `typing`, means "this class": the method returns a `Window` here, a `Controls` in yours, without naming it.
- **`model_dump()`** returns a model's fields as a plain dict, in the order they're declared: `Window(low=1, high=5).model_dump()` is `{'low': 1, 'high': 5}`, and `Controls().model_dump()` is `{'left': 'left', 'right': 'right', 'serve': 'space', 'pause': 'p'}`. A dict can be looped over, which a model's fields, written one by one, can't.

Before writing Breakout's version, paste the `Window` example into `scratch/window.py` and run it with `print(Window(low=1, high=5).model_dump())` and then `Window(low=9, high=5)`: see both lines above happen.

A problem raised by a model validator belongs to no single field, so its location is the model's own: inside a `Config`, that's `controls`. Add the first row of the table as a case in `test_bad_settings_are_refused_with_where_and_why`. When all 94 tests pass and every check is clean, commit with a message that mentions **twice**, as in "a key used twice".

```hints
nudge: The validator needs every action and its key. Which method gives a model's fields as a dict? And as you go through them, how will you remember which action already used a key?
concept: `@model_validator(mode="after")` above a method `def name(self) -> Self:` makes pydantic call it once all the fields are valid; it raises `ValueError` to refuse, or returns `self` to accept. `Self` comes from `typing` and means "this class". `self.model_dump()` returns the fields as a dict, `{"left": "a", "right": "d", ...}`, in the order they're declared. Keep a second dict from key to the action that used it first: when a key is already in it, you've found a clash, and you have both names for the message.
shape: Import `Self` from `typing` and `model_validator` from `pydantic`. Inside `Controls`, a decorated method with a `dict[str, str]`, a `for action, key in ...items():` loop, one `if` that raises, and `return self` at the end. In the test, one more `(text, message)` pair with `left` and `right` both set to `"a"`.
answer: ~~~python
    @model_validator(mode="after")
    def no_key_does_two_things(self) -> Self:
        actions: dict[str, str] = {}
        for action, key in self.model_dump().items():
            if key in actions:
                raise ValueError(f"{actions[key]} and {action} both use {key!r}")
            actions[key] = action
        return self
~~~

at the end of `Controls`, with `from typing import Annotated, Self` and `model_validator` added to the `pydantic` import. And in `tests/test_config.py`, a new case after the `banana` one:

~~~python
        ('[controls]\nleft = "a"\nright = "a"\n', "controls: left and right both use 'a'"),
~~~

`actions` maps each key seen so far to the action that used it, so `actions[key]` is the **first** action with that key and `action` the second: that's why the message names both, in the order they're declared. The location is `controls`, the whole table, because the problem belongs to no single field. Comparing only `left` with `right` would pass the first row of the table and miss the second: the check compares every action with every other in one pass.
```

```check
run ".venv/Scripts/python -c \"from breakout import config; config.Controls(left='p')\"" exit=1 stderr="left and pause both use 'p'" label="a key used for two actions is refused, naming both"
run ".venv/Scripts/python -c \"from breakout import config; print(config.Controls())\"" stdout="left='left' right='right' serve='space' pause='p'" label="the default controls are still accepted"
run ".venv/Scripts/python -m pytest -q tests/test_config.py" stdout="10 passed"
run ".venv/Scripts/python -m pytest -q" stdout="94 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "twice"
git-clean
```

## Challenge: keys in any case

**Optional, ★.** Accept `left = "A"` and store it as `"a"`. A **`BeforeValidator(str.lower)`** in `Key`, before the `AfterValidator`, changes the value before it's checked. Add test cases for `"A"` and `"Left"`. On a branch.

## Challenge: messages that name the real keys

**Optional, ★★.** Close the known gap: write a pure function `message_for(state, controls) -> str | None` in `draw.py` that says "press W to play" when serve is `w`, test it without a window, and use it in `draw`. On a branch.

## Challenge: settings the game finds by itself

**Optional, ★★★.** Without `--config`, read `Path.home() / ".breakout.toml"` if it exists (`Path.home()` is your user folder). Precedence becomes four layers: command line, `--config`, the home file, the defaults. Test it with pytest's **`monkeypatch`** fixture, which replaces something for one test only: `monkeypatch.setattr(Path, "home", lambda: tmp_path)`. On a branch.

## What did we actually learn?

- **TOML** for files people edit: `key = value`, `[tables]`, comments. `tomllib` reads it. JSON for data programs exchange.
- **Configuration is input**, and gets the same treatment as a level: one model, checked at the boundary, every problem reported.
- **Defaults on every field**, so a settings file says only what it changes. **Nested models** for tables.
- **Paths in a file are relative to the file**, never to the current folder.
- **Precedence: the most specific wins**: command line, then settings file, then the built-in default.
- **Actions, not keys**: the game asks about *left*, and the settings say which key that is.
- **`model_validator`** for rules about several fields at once.

C# programs read settings through `IConfiguration`, from layers added in order (`appsettings.json`, then environment variables, then the command line), with later layers winning, which is this lesson's precedence rule built into the framework; `IOptions<T>` binds a section to a typed class and validates it with the same data annotations as lesson 5.4. Java's Spring Boot does the same with `application.properties` or `application.yml`, `@ConfigurationProperties` classes and `@Validated`, and documents an order in which command-line arguments beat files. Godot keeps project settings in `project.godot` and its input actions in the **InputMap**, which you just built a small version of. Real games also look for a settings file in the player's own folder (on Windows, under `%APPDATA%`: the environment variable holding your own application folder, usually `C:\Users\you\AppData\Roaming`; `%NAME%` is how Windows writes a variable's value) without being told; Chapter 54, which exports the game as a program of its own, does that, once there's an installed game for it to belong to.
