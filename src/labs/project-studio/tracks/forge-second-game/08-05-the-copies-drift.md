---
reference: optional
title: 8.5 — The Copies Drift
runtime: python
run: shooter/__main__.py
---

The shooter is playable, and the copy has saved weeks of work. Now comes the part of the story that copying doesn't advertise. This lesson is a week in the life of a project with two copies of one program: a bug report that has to be fixed twice, a small change that breaks more than it should, a tempting shortcut that would make things worse, and a fix that reaches one copy and not the other. Nothing here is fixed for good. Each problem is felt, given its real name, and left for Chapter 9.

## The app so far

**Build:** make sure `shooter/app.py` matches the end of lesson 8.4, the reference answer to its Your turn.

```python file=shooter/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame
from pygame import Vector2

from shooter.config import KEYS, Config, ConfigError, load_config
from shooter.draw import draw
from shooter.model import HEIGHT, WIDTH, Game, GameState, direction_from, nearest
from shooter.scores import Score, add_score, best, end_session, open_scores, start_session
from shooter.settings import Hold, parse_args

ARENA = "Arena"  # the shooter's only level: its scores are saved under this name
HOLDS = {Hold.NONE: Vector2(0, 0), Hold.LEFT: Vector2(-1, 0), Hold.RIGHT: Vector2(1, 0), Hold.AUTO: Vector2(0, 0)}


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
        print(f"shooter: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    player = settings.player or config.player
    game = Game(rng)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, ARENA)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"shooter: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Shooter")
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
                if game.state == GameState.OVER:
                    game = Game(rng)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            direction = direction_from(
                keys[KEYS[controls.left]],
                keys[KEYS[controls.right]],
                keys[KEYS[controls.up]],
                keys[KEYS[controls.down]],
            )
            target = Vector2(pygame.mouse.get_pos())
            firing = pygame.mouse.get_pressed()[0]
        else:
            direction = HOLDS[settings.hold]
            target = game.player.position + Vector2(1, 0)
            closest = nearest(game.player.position, game.zombies)
            if settings.hold == Hold.AUTO and closest is not None:
                target = closest.position
            firing = True
        before = game.state
        game.update(direction, target, firing, dt)
        if db and game.state != before and game.state == GameState.OVER:
            score = Score(player, ARENA, game.score, datetime.now(UTC), False)
            add_score(db, score, session)
            best_score = best(db, ARENA)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
        db.close()
    if settings.test_frames is not None:
        x, y = game.player.position
        print(
            f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives} "
            f"bullets={len(game.bullets)} zombies={len(game.zombies)}"
        )


def run() -> None:
    main(sys.argv[1:])
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="164 passed"
run ".venv/Scripts/shooter --test-run 1800 --hold auto" stdout="lives=3"
```

## A bug report

**Build:** Breakout accepts key names written in capitals.

A player writes in: "I put `pause = "P"` in my settings file, and Breakout won't start." Reproduce it first (lesson 0.3). Make a settings file like theirs, `scratch/capitals.toml`:

```toml
[controls]
pause = "P"
```

```powershell
.venv\Scripts\breakout --test-run 5 --config scratch/capitals.toml
```

```text
breakout: scratch\capitals.toml: controls.pause: unknown key 'P': use a-z, or left, right, up, down, space or return
```

`KEYS` (lesson 5.5) names letters in lower case, so `"P"` isn't in it, and nothing says that case doesn't matter. To a player, "P" is the P key. Test first: add a case to `tests/test_config.py`:

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


def test_key_names_can_be_written_in_capitals(tmp_path: Path):
    path = write_config(tmp_path, '[controls]\npause = "P"\nserve = "Space"\n')
    assert config.load_config(path).controls == config.Controls(left="left", right="right", serve="space", pause="p")


def test_an_empty_file_is_all_defaults(tmp_path: Path):
    assert config.load_config(write_config(tmp_path, "")) == config.Config()


def test_the_player_is_called_player_unless_the_file_names_one(tmp_path: Path):
    assert config.Config().player == "Player"
    assert config.load_config(write_config(tmp_path, 'player = " Mia "\n')).player == "Mia"


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
        ('[controls]\nleft = "a"\nright = "a"\n', "controls: left and right both use 'a'"),
        ('player = "   "\n', "player: String should have at least 1 character"),
    ],
)
def test_bad_settings_are_refused_with_where_and_why(tmp_path: Path, text: str, message: str):
    with pytest.raises(config.ConfigError) as refused:
        config.load_config(write_config(tmp_path, text))
    assert str(refused.value) == message
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_config.py" exit=1 stdout="1 failed" label="the new test shows the bug"
```

## The fix, once

**Build:** key names are read without regard to case.

```python file=breakout/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import tomllib
from pathlib import Path
from typing import Annotated, Self

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, ValidationError, model_validator
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
    name = name.lower()  # "P" and "Space" mean the same keys as "p" and "space"
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
    player: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)] = "Player"
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

`check_key` is the `AfterValidator` for every key (lesson 5.5): pydantic calls it with the value from the file, and stores what it **returns**. So returning `name.lower()` doesn't only accept `"P"`, it stores `"p"`, and everything after it, `KEYS[controls.pause]` in the app and the check that no key does two things, sees the one spelling. Turning equivalent inputs into one standard form at the boundary is called **normalisation**, the word lesson 8.2 used for vectors, for the same idea: one canonical form, so the rest of the program never meets the others.

```powershell
.venv\Scripts\breakout --test-run 5 --config scratch/capitals.toml
```

```text
frames=5 paddle_x=270 score=0 lives=3 bricks=40 inside=True
```

```check
run ".venv/Scripts/breakout --test-run 5 --config scratch/capitals.toml" stdout="frames=5" label="Breakout accepts pause = \"P\""
run ".venv/Scripts/python -m pytest -q" stdout="165 passed"
```

## The same bug, in the copy

**Build:** the shooter accepts key names in capitals too.

```predict
question: Does the shooter have the same bug?
choice: No: it was fixed in config.py
choice: Yes: the fix was made to breakout/config.py, and the shooter has its own copy
choice: It depends on whether the shooter imports breakout
answer: Yes: the fix was made to breakout/config.py, and the shooter has its own copy
explain: `shooter/config.py` was copied from `breakout/config.py` in lesson 8.1, before this bug was found. Since then they're two separate files. A fix to one is a fix to one.
```

```powershell
.venv\Scripts\shooter --test-run 5 --config scratch/capitals.toml
```

```text
shooter: scratch\capitals.toml: controls.pause: unknown key 'P': use a-z, or left, right, up, down, space or return
```

So the same fix, again. The shooter's `config.py` has drifted a little from Breakout's (lesson 8.2 added `up` and `down`), but `check_key` is still identical:

```python file=shooter/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import tomllib
from pathlib import Path
from typing import Annotated, Self

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, ValidationError, model_validator
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
    name = name.lower()  # "P" and "Space" mean the same keys as "p" and "space"
    if name not in KEYS:
        raise ValueError(f"unknown key {name!r}: use a-z, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    up: Key = "up"
    down: Key = "down"
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
    player: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)] = "Player"
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
run ".venv/Scripts/shooter --test-run 5 --config scratch/capitals.toml" stdout="frames=5" label="the shooter accepts pause = \"P\""
```

## A test for the copy

**Build:** the shooter's first test of its settings file.

The shooter has no tests of its settings file at all: every test in `tests/test_config.py` imports `breakout.config`. Without a test, nothing stops this fix being undone in one copy and not the other, so the shooter gets a test of its own:

```python file=tests/test_shooter_config.py
"""The shooter's settings file."""

from pathlib import Path

from shooter import config


def test_key_names_can_be_written_in_capitals(tmp_path: Path):
    path = tmp_path / "settings.toml"
    path.write_text('[controls]\nup = "W"\nserve = "Space"\n', encoding="utf-8")
    assert config.load_config(path).controls.up == "w"
    assert config.load_config(path).controls.serve == "space"
```

Count what one bug cost: four files changed, two of them nearly line-for-line copies of the other two. And this was the easy case, because you **knew** the copy existed. On a team, the person who fixes the bug in one copy often doesn't know there's another. Commit both fixes together:

```powershell
git add .
git commit -m "Accept key names in capitals, in both games"
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="166 passed"
git-message "capitals"
git-clean
```

## One number, fifteen tests

**Build:** nothing that stays. An experiment: make Breakout's window bigger, and count what breaks.

Someone asks for Breakout at 800 × 600. It's one line, in `breakout/model.py`:

```python
WIDTH, HEIGHT = 800, 600
```

```predict
question: Change that one line by hand and run all 166 tests. How many fail?
choice: None: everything is worked out from WIDTH and HEIGHT
choice: One or two
choice: Ten or more
answer: Ten or more
explain: Fifteen, in three files. Some of them should fail: the characterisation tests (lesson 2.1) record exactly what the game did, so a different game fails them by design. Others fail because a number that was worked out from 640 was written in as a number: a paddle "centred" at x = 270 is centred only on a 640-wide screen.
```

Make the change, then run the tests, the game, and the shooter:

```powershell
.venv\Scripts\python -m pytest -q
.venv\Scripts\breakout --test-run 600 --hold auto
.venv\Scripts\shooter --test-run 60 --hold right
```

```text
FAILED tests/test_breakout.py::test_every_serve_starts_in_the_middle_going_up_at_full_speed
FAILED tests/test_breakout.py::test_a_new_paddle_is_centred_near_the_bottom
...
FAILED tests/test_characterisation.py::test_autopilot_wins - AssertionError: ...
...
FAILED tests/test_game.py::test_a_missed_ball_costs_a_life_and_a_new_ball_is_served
15 failed, 151 passed in 26.96s
frames=600 paddle_x=105 score=30 lives=3 bricks=37 inside=True
frames=60 x=540 y=240 score=0 lives=3 bullets=3 zombies=1
```

One number changed; here's everything it reached:

1. **Six unit tests** in `test_breakout.py` that wrote positions as numbers worked out for a 640 × 480 screen.
2. **Seven characterisation tests**, which record a whole game: a bigger screen is a different game.
3. **Two tests in `test_game.py`** that compare the game with a recorded test run.
4. **The wall**, which no test checks: eight bricks 70 pixels wide with 6-pixel gaps, starting at x = 16, end at x = 618. On a 640-wide screen that leaves 22 pixels on the right, close to the 16 on the left; on an 800-wide one, 182. `level.py`'s `COLUMNS` and `model.py`'s `WALL_LEFT` assumed 640 without saying so.
5. **The shooter**, unchanged: still 640 × 480. If the request was "all our games at 800 × 600", it's only half done, and nothing anywhere says so.

A small change that needs edits in many places has a name: **change amplification** (John Ousterhout's term, from *A Philosophy of Software Design*). When the many places are copies of each other, Martin Fowler's catalogue of code smells calls it **shotgun surgery**. Some of the fifteen are the price of good tests; the copies are a price of their own. Put the line back:

```powershell
git restore breakout/model.py
```

`git restore` (lesson 2.1) throws away the uncommitted change to the file.

```check
run ".venv/Scripts/python -m pytest -q" stdout="166 passed"
git-clean
```

## Borrowing instead of copying

**Build:** nothing in the project. Try a tempting way to stop the copies drifting, in a scratch file.

The copies drift because there are two of them. So why not delete `shooter/config.py`, and have the shooter import `breakout.config`? One copy, fixed once. Try what would happen the first time the shooter needed something Breakout doesn't have, say a Tab key to show the scores. Make `scratch/borrow.py`:

```python
"""What if the shooter borrowed Breakout's key table, instead of copying it?"""

import pygame

import breakout.config
from breakout.config import KEYS, Controls

# The shooter needs one more key than Breakout knows, so it adds it to the table it borrowed:
KEYS["tab"] = pygame.K_TAB

# Somewhere else in the same program, Breakout checks a player's settings:
print(Controls(pause="tab"))
print(KEYS is breakout.config.KEYS)
```

```powershell
.venv\Scripts\python scratch\borrow.py
```

```text
left='left' right='right' serve='space' pause='tab'
True
```

Breakout has accepted a key it never added, and the program that changed Breakout's rules isn't Breakout. The mechanism:

- **A module is imported once per program.** The first `import breakout.config` runs the file and stores the module object in `sys.modules` (lesson 4.2); every later import, anywhere in the program, gets **that same object** from there.
- **So `KEYS` is one dictionary**, shared by everyone who imports it. `KEYS is breakout.config.KEYS` is `True`: not equal, identical. Changing it from the shooter changes it for Breakout.
- **Nothing in `breakout/config.py` shows it.** Read the file and `KEYS` has six named keys and the letters; the extra key exists only while a program that ran `borrow.py`'s line is running. A test of Breakout's settings would pass on its own and fail when run after a shooter test in the same `pytest` run, a test that fails or passes depending on the order: one of the hardest kinds of bug to find.

A variable at the top level of a module, changed while the program runs, is **global state**: shared by every part of the program that imports it, with no record of who changed it. Borrowing a module that holds mutable state doesn't end the coupling between the games; it makes it **invisible**. Copies drift apart in plain sight. Shared mutable state changes under you. Chapter 9's answer has to avoid both.

## A busy database

**Build:** in Breakout, a score that can't be saved because the database is busy is reported, and the game goes on.

The backlog's technical debt list (lesson 7.8) ends with a crash: "If another program holds the scores database for more than 5 seconds, saving a score crashes the game (lesson 7.7)." `add_score` waits for the write lock for 5 seconds, then raises `sqlite3.OperationalError: database is locked`, and nothing catches it. Time to pay it, in Breakout first. A test, first:

```python file=tests/test_busy.py
"""A score the game can't save, because another program holds the database, doesn't stop the game."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from breakout.app import save_score
from breakout.scores import Score, load_scores, open_scores

WHEN = datetime(2026, 10, 7, 12, 0, 0, tzinfo=UTC)
SCORE = Score("Mia", "Classic", 400, WHEN)


def test_a_score_is_saved_when_nobody_else_is_writing(db: sqlite3.Connection):
    assert save_score(db, SCORE, None)
    assert load_scores(db) == [SCORE]


def test_a_busy_database_is_reported_and_the_game_goes_on(tmp_path: Path, capsys: pytest.CaptureFixture[str]):
    game = open_scores(tmp_path / "scores.db")
    game.execute("PRAGMA busy_timeout = 100")  # give up after a tenth of a second, not the usual five
    other = sqlite3.connect(tmp_path / "scores.db")
    other.execute("BEGIN IMMEDIATE")
    assert not save_score(game, SCORE, None)
    assert "this score wasn't saved: database is locked" in capsys.readouterr().err
    other.rollback()
```

- **`PRAGMA busy_timeout = 100`** sets how many milliseconds this connection waits for a lock before giving up, the same setting as `sqlite3.connect`'s `timeout` (lesson 7.7), changed after connecting. The test waits a tenth of a second instead of five.
- **`other.execute("BEGIN IMMEDIATE")`** takes the write lock and keeps it (lesson 7.7), standing in for another program in the middle of a long write.
- **`save_score`** doesn't exist yet: the app needs one function that saves a score and reports whether it could, so there's something to test without opening a window.
- **`capsys`** is pytest's fixture that captures what the code prints (lesson 2.4); `readouterr().err` is everything printed to standard error.

```check
run ".venv/Scripts/python -m pytest -q tests/test_busy.py" exit=2 stdout="ImportError" label="save_score doesn't exist yet"
```

## Saving, or saying why not

**Build:** `save_score` in Breakout's app.

```python file=breakout/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame

from breakout.config import KEYS, Config, ConfigError, load_config
from breakout.draw import draw
from breakout.level import LEVELS, LevelError, load_level
from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
from breakout.scores import Score, add_score, best, end_session, open_scores, start_session
from breakout.settings import Hold, parse_args


def save_score(db: sqlite3.Connection, score: Score, session: int | None) -> bool:
    """Save a finished game's score. If another program holds the database too long, say so and play on."""
    try:
        add_score(db, score, session)
    except sqlite3.OperationalError as error:
        print(f"breakout: this score wasn't saved: {error}", file=sys.stderr)
        return False
    return True


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
    player = settings.player or config.player
    try:
        level = load_level(level_file)
    except (OSError, LevelError) as error:
        print(f"breakout: {level_file}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, level.bricks(), level.lives)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "breakout")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, level.name)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"breakout: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

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
        before = game.state
        game.update(direction, dt)
        if db and game.state != before and game.state in (GameState.OVER, GameState.WON):
            score = Score(player, level.name, game.score, datetime.now(UTC), game.state == GameState.WON)
            if save_score(db, score, session):
                best_score = best(db, level.name)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
        db.close()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(game.ball.rect())
        print(
            f"frames={frames} paddle_x={game.paddle.rect().x} score={game.score} lives={game.lives} "
            f"bricks={len(game.bricks)} inside={inside}"
        )


def run() -> None:
    main(sys.argv[1:])
```

- **`except sqlite3.OperationalError`**, and nothing wider. `OperationalError` is what SQLite raises when it can't do the operation right now: a locked database, a full disk, a file it can't open. `sqlite3.IntegrityError`, a score that breaks a `CHECK` or a foreign key, means a bug in the game, and should still crash loudly (lesson 5.2: catch exactly what you expect).
- **It returns whether the score was saved**, so the loop only asks for the new best score if there is one.
- **The message goes to standard error**, like the game's other complaints, and the player plays on.

```powershell
.venv\Scripts\python -m pytest -q tests/test_busy.py
```

```text
2 passed in 0.31s
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_busy.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="168 passed"
```

## Your turn: a fix that reached one copy

**Build, on your own:** the shooter survives a busy database too, and the debt leaves the backlog.

The test you just wrote imports `breakout.app`. The shooter's `app.py` was copied from Breakout's in lesson 8.1, and has the same `add_score` call with nothing around it: right now, the shooter crashes exactly as Breakout did an hour ago. This is the way copies really drift: not a dramatic rewrite, but a fix that went into one and not the other, because the person fixing it was thinking about one.

| What | Result |
|---|---|
| `save_score(db, score, session)` in `shooter/app.py` | returns `False` and prints `shooter: this score wasn't saved: ...` to standard error when the database is locked |
| `tests/test_shooter_busy.py` | your tests of it, like `tests/test_busy.py`'s: `pytest -q tests/test_shooter_busy.py` prints `2 passed` |
| `BACKLOG.md` | the technical debt line about a busy database is gone, now that **both** games are fixed |

When all 170 tests pass and every check is clean, commit with a message that mentions the **busy** database.

```hints
nudge: Start from a copy of `tests/test_busy.py`, and change everything in it that's Breakout's. There's more of it than the first import: run pyright on your test file, and read what it says.
concept: Two things in the copied test are Breakout's without saying so. `Score` comes from `breakout.scores`, and the shooter's `save_score` expects a `shooter.scores.Score`: a different class, from a different copy of the file, that happens to have the same name and fields. pyright reports `Argument of type "Score" cannot be assigned to parameter "score" of type "Score"`, because two classes defined in two files are two types, however alike they look. Python would run the test anyway, and the first test would fail in a baffling way: the shooter's `load_scores` returns the shooter's `Score`s, and a dataclass is never equal to an instance of another class, so two scores with identical fields compare unequal. And the `db` fixture in `tests/conftest.py` opens the database with `breakout.scores.open_scores`. The type checker is the only thing in the project that notices when the copies are being mixed up.
shape: In `shooter/app.py`, the same function as Breakout's, with the shooter's message, used in the same place. In `tests/test_shooter_busy.py`, both tests open the database with `shooter.scores.open_scores` themselves, in `tmp_path`, instead of using the `db` fixture, and use `shooter.scores.Score`. In `BACKLOG.md`, delete the Technical debt line about a busy database.
answer: In `shooter/app.py`, before `main`:

~~~python
def save_score(db: sqlite3.Connection, score: Score, session: int | None) -> bool:
    """Save a finished game's score. If another program holds the database too long, say so and play on."""
    try:
        add_score(db, score, session)
    except sqlite3.OperationalError as error:
        print(f"shooter: this score wasn't saved: {error}", file=sys.stderr)
        return False
    return True
~~~

and in the loop:

~~~python
            if save_score(db, score, session):
                best_score = best(db, ARENA)
~~~

`tests/test_shooter_busy.py`:

~~~python
"""A score the shooter can't save, because another program holds the database, doesn't stop the game."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from shooter.app import save_score
from shooter.scores import Score, load_scores, open_scores

WHEN = datetime(2026, 10, 7, 12, 0, 0, tzinfo=UTC)
SCORE = Score("Mia", "Arena", 400, WHEN)


def test_a_score_is_saved_when_nobody_else_is_writing(tmp_path: Path):
    game = open_scores(tmp_path / "scores.db")
    assert save_score(game, SCORE, None)
    assert load_scores(game) == [SCORE]


def test_a_busy_database_is_reported_and_the_game_goes_on(tmp_path: Path, capsys: pytest.CaptureFixture[str]):
    game = open_scores(tmp_path / "scores.db")
    game.execute("PRAGMA busy_timeout = 100")  # give up after a tenth of a second, not the usual five
    other = sqlite3.connect(tmp_path / "scores.db")
    other.execute("BEGIN IMMEDIATE")
    assert not save_score(game, SCORE, None)
    assert "this score wasn't saved: database is locked" in capsys.readouterr().err
    other.rollback()
~~~

The test is a near copy of Breakout's, so the project now has duplicated tests of duplicated code: two of everything. That's the bill for lesson 8.1's copy, and it arrives a line at a time.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_busy.py" stdout="2 passed"
run ".venv/Scripts/python -c \"import sqlite3, tempfile; from datetime import UTC, datetime; from pathlib import Path; from shooter.app import save_score; from shooter.scores import Score, open_scores; path = Path(tempfile.mkdtemp()) / 'scores.db'; game = open_scores(path); game.execute('PRAGMA busy_timeout = 100'); other = sqlite3.connect(path); other.execute('BEGIN IMMEDIATE'); print('saved:', save_score(game, Score('Mia', 'Arena', 1, datetime.now(UTC)), None))\"" stdout="saved: False" stderr="shooter: this score wasn't saved" label="the shooter reports a busy database and plays on" -- Add save_score to shooter/app.py, catching sqlite3.OperationalError around add_score.
lacks BACKLOG.md "saving a score crashes the game" -- Both games are fixed now, so the debt is paid: delete its line from BACKLOG.md.
run ".venv/Scripts/python -m pytest -q" stdout="170 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors" -- A test that mixes the games' classes is reported here: use the shooter's own Score and open_scores.
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "busy"
git-clean
```

## Challenge: the order-dependent test

**Optional, ★.** Make `scratch/borrow.py`'s problem happen in the test suite, on a branch: a test file `tests/test_aaa_borrow.py` whose one test adds `"tab"` to `breakout.config.KEYS`, and a test in `tests/test_config.py` that `pause = "tab"` is refused. Run that test alone, then run everything, and explain the difference. Then read about the `pytest-randomly` plugin, which runs tests in a different order every time, and why teams turn it on. Delete the branch afterwards.

## Challenge: what every file has in common

**Optional, ★★.** Write `scratch/twins.py`, which goes through `breakout/*.py` and `shooter/*.py` and prints every **function** whose source is identical in both packages: `ast.parse` each file (lesson 8.6 meets it properly), find each `ast.FunctionDef`, and compare `ast.get_source_segment(source, node)`. How many functions are exact twins today? Run it again after lesson 8.7.

## Challenge: the window, everywhere

**Optional, ★★.** On a branch, try the request properly: both games at 800 × 600. Fix each failing test so it works its expectation out from `WIDTH` and `HEIGHT` instead of writing a number, where that's the honest thing to do, and decide which tests should simply be re-recorded. Then count the files you changed. Delete the branch afterwards: the games stay 640 × 480.

## What did we actually learn?

- **One bug, two copies**: every fix has to be found, made and tested twice, and the second copy is fixed only if someone remembers it exists.
- **Change amplification** and **shotgun surgery**: a small change that needs edits in many places, measured here as fifteen tests and two untested places from one number.
- **Normalising input at the boundary**: one canonical form (`"p"`), so nothing after the check meets the others.
- **A module is imported once**, and its top-level objects are shared by everyone who imports it: mutable module-level state is **global state**, coupling that no file shows.
- **The type checker sees the copies**: two classes with the same name in two files are two types, and pyright reports a mix-up that Python would silently run.
- **A debt is paid when every copy is fixed**, not when the first one is.

In C# and Java, the static fields of a class are the same kind of global state as a module's variables (`static Dictionary<string, Key> Keys`), with the same order-dependent tests. Both languages' test runners can be told to run tests in parallel, which makes such bugs show up sooner and less predictably.
