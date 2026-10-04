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
.venv\Scripts\python -c "import tomllib; print(tomllib.load(open('examples/left-hand.toml', 'rb')))"
```

```text
{'level': '../breakout/levels/castle.json', 'controls': {'left': 'a', 'right': 'd', 'serve': 'w'}}
```

A dict, with the table as a dict inside it. `tomllib` only **reads** TOML; Python has no standard way to write it, which fits: settings files are written by people.

**Which format when?** JSON for data programs write and read (Part 3's editor will save scenes as JSON). TOML for configuration people edit. You'll also meet **YAML**, used by many tools for configuration; it's more flexible than TOML and has more ways to surprise you, which is why Python chose TOML for `pyproject.toml`.

```check
file examples/left-hand.toml
run ".venv/Scripts/python -c \"import tomllib; print(tomllib.load(open('examples/left-hand.toml', 'rb'))['controls'])\"" stdout="{'left': 'a', 'right': 'd', 'serve': 'w'}" label="the example file is valid TOML with a controls table"
```

## The config module

**Build:** a module that reads and checks a settings file.

Create `breakout/config.py`:

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
        raise ValueError(f"unknown key {name!r}: use a letter, or left, right, up, down, space or return")
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

**Understand, from the top.**

**`KEYS`** maps every key name a player may use to pygame's number for that key. The second half is a **dict comprehension**, `{key: value for ...}`, the dict version of a list comprehension: pygame numbers the letter keys `K_a` to `K_z` with consecutive numbers (they're the character codes of `a` to `z`), and `chr(code)` turns a code into its character, so it makes `{"a": 97, "b": 98, ...}`. `|` between two dicts makes a new dict with the items of both. Why a list of allowed keys and not every key pygame knows? Because a game should accept what it has tested, and because the message for a wrong key can then say what *is* allowed.

**`Controls`** is the game's **actions** and the key for each. Every field has a **default**, so a settings file only needs to mention what it changes: a file with just `left = "a"` keeps the other three. Each field's type is `Key`, a `str` that `check_key` checks is in `KEYS`. This is Godot's **InputMap** in miniature: the game asks "is *left* pressed?", and the map says which key that is today.

**`Config`** is the whole file. `controls: Controls = Controls()` is a **nested model**: in the file it's the `[controls]` table, and pydantic checks it with the `Controls` rules. `level` is a `Path`, but TOML has no path type, only strings, and strict mode would refuse a string where a `Path` is wanted. `Field(default=None, strict=False)` relaxes strictness for this field alone, so a string is turned into a `Path`.

**`describe`** is like `describe` in `level.py`, but joins a location with dots: `controls.left`. That's how TOML itself names a key inside a table (`controls.left = "a"` is valid TOML), so it's what a person editing the file will recognise. Two functions that look alike but serve different formats, and will change for different reasons, aren't the duplication the "don't repeat yourself" rule is about. That rule is about one piece of *knowledge* written in two places.

**`load_config`**: `tomllib.loads` reads the text as TOML and raises `TOMLDecodeError` with a line and column if it isn't. `Config.model_validate(data)` checks a Python dict against the model; lesson 5.4's `model_validate_json` did the same from JSON text. Then one more step: a relative `level` path is taken from the **settings file's folder**, not the current folder. The example says `../breakout/levels/castle.json` because the file is in `examples`, and it works from whichever folder the game is started in: lesson 0.1's hidden input again. A frozen model can't be changed, so `model_copy(update={...})` makes a copy with `level` replaced.

```predict
question: What is `Path("C:/games/examples") / "C:/levels/castle.json"`?
choice: C:\games\examples\C:\levels\castle.json
choice: C:\levels\castle.json
choice: An error: you can't join two absolute paths
answer: C:\levels\castle.json
explain: When the right-hand side of `/` is an absolute path, pathlib's result is just that path: an absolute path already says where it is, so the folder before it doesn't matter. So `path.parent / config.level` does the right thing for both kinds of path in the settings file, with no `if`: a relative `level` is found from the file's folder, and an absolute one is left alone.
```

```check
contains breakout/config.py "class Controls(BaseModel):"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout import config; c = config.load_config(Path('examples/left-hand.toml')); print(c.level.name, c.controls.left, c.controls.pause)\"" stdout="castle.json a p" label="the example loads: the castle, A to go left, and P still pauses"
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
    except (OSError, ConfigError) as error:
        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    try:
        level = load_level(level_file)
    except (OSError, LevelError) as error:
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

**Controls.** Every key the game reacts to now goes through `KEYS[controls.<action>]`: the action's key name from the settings, then pygame's number for it. Escape isn't configurable, on purpose: however wrong someone's settings are, there's always a way out.

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

**Build:** tests for the config module.

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
    ],
)
def test_bad_settings_are_refused_with_where_and_why(tmp_path: Path, text: str, message: str):
    with pytest.raises(config.ConfigError) as refused:
        config.load_config(write_config(tmp_path, text))
    assert str(refused.value) == message
```

**Understand.** `write_config` writes a settings file into the test's own temporary folder (`tmp_path`, lesson 5.2), so no test depends on a file in the project or on anyone's real settings. `test_a_level_is_found_from_the_file_s_own_folder` pins down the relative-path rule; the parametrised test, one case per kind of mistake, is lesson 5.2's pattern again.

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

The rule is about the **whole** set of controls, not one field, so `AfterValidator` on a field can't see enough. pydantic's **`model_validator`** runs a method of the model after every field has been checked; finding out how to write one is part of the exercise (pydantic's documentation calls them "model validators"). Add the first row of the table as a case in `test_bad_settings_are_refused_with_where_and_why`. When all 94 tests pass and every check is clean, commit with a message that mentions **twice**, as in "a key used twice".

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
run ".venv/Scripts/python -c \"from breakout import config; config.Controls(left='p')\"" stderr="left and pause both use 'p'" label="a key used for two actions is refused, naming both"
run ".venv/Scripts/python -c \"from breakout import config; print(config.Controls())\"" stdout="left='left' right='right' serve='space' pause='p'" label="the default controls are still accepted"
run ".venv/Scripts/python -m pytest -q tests/test_config.py" stdout="10 passed"
run ".venv/Scripts/python -m pytest -q" stdout="94 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "twice"
git-clean
```

## What did we actually learn?

- **TOML** for files people edit: `key = value`, `[tables]`, comments. `tomllib` reads it. JSON for data programs exchange.
- **Configuration is input**, and gets the same treatment as a level: one model, checked at the boundary, every problem reported.
- **Defaults on every field**, so a settings file says only what it changes. **Nested models** for tables.
- **Paths in a file are relative to the file**, never to the current folder.
- **Precedence: the most specific wins**: command line, then settings file, then the built-in default.
- **Actions, not keys**: the game asks about *left*, and the settings say which key that is.
- **`model_validator`** for rules about several fields at once.

C# programs read settings through `IConfiguration`, from layers added in order (`appsettings.json`, then environment variables, then the command line), with later layers winning, which is this lesson's precedence rule built into the framework; `IOptions<T>` binds a section to a typed class and validates it with the same data annotations as lesson 5.4. Java's Spring Boot does the same with `application.properties` or `application.yml`, `@ConfigurationProperties` classes and `@Validated`, and documents an order in which command-line arguments beat files. Godot keeps project settings in `project.godot` and its input actions in the **InputMap**, which you just built a small version of. Real games also look for a settings file in the player's own folder (on Windows, under `%APPDATA%`) without being told; Chapter 37, which exports the game as a program of its own, does that, once there's an installed game for it to belong to.
