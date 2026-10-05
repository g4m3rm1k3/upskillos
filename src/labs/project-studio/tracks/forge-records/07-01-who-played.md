---
title: 7.1 — Who Played?
track: Forge — Players, Sessions and Statistics
trackOrder: 37
runtime: python
run: breakout/__main__.py
---

The scores table knows the level, the points and the time, but not **who**. Two people sharing a computer share one list of bests, and "my best" can't even be asked. This chapter gives the database more to hold (players, then sessions and statistics) and with it the ideas that make databases worth having: tables that refer to each other, questions asked across them, and rules the database enforces so the data can't contradict itself. This lesson adds players, and a bug that SQLite has been surprising programmers with for years.

## The test fixtures so far

**Build:** make sure `tests/conftest.py` matches the end of lesson 6.5, the reference answer to its Your turn.

```python file=tests/conftest.py
"""Fixtures: setup that any test in this folder can ask for by name."""

import random
import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest

from breakout import level, model
from breakout.scores import open_scores


@pytest.fixture
def db(tmp_path: Path) -> Iterator[sqlite3.Connection]:
    """A new, empty scores database, closed after the test however the test ends."""
    connection = open_scores(tmp_path / "scores.db")
    yield connection
    connection.close()


@pytest.fixture
def new_game() -> model.Game:
    """A game of the classic level with seed 0, waiting on the title screen."""
    return model.Game(random.Random(0), level.load_level(level.LEVELS / "classic.json").bricks())


@pytest.fixture
def game(new_game: model.Game) -> model.Game:
    """The same game, started."""
    new_game.start()
    return new_game
```

```check
contains tests/conftest.py "def game(new_game: model.Game) -> model.Game:"
```

## The game tests so far

**Build:** and `tests/test_game.py`.

```python file=tests/test_game.py
import pygame
from pygame import Vector2

from breakout import model


def test_a_new_game_waits_on_the_title_screen(new_game: model.Game):
    assert (new_game.score, new_game.lives, len(new_game.bricks)) == (0, 3, 40)
    assert new_game.state == model.GameState.TITLE


def test_ten_seconds_of_autopilot_matches_the_test_run(game: model.Game):
    for _ in range(600):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served(game: model.Game):
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces(game: model.Game):
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240


def test_losing_the_last_life_ends_the_game(game: model.Game):
    game.lives = 1
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert game.state == model.GameState.OVER
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins(game: model.Game):
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert game.state == model.GameState.WON
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_game.py" stdout="6 passed"
```

## The state tests so far

**Build:** and `tests/test_states.py`.

```python file=tests/test_states.py
from pygame import Vector2

from breakout import model


def test_starting_from_the_title_begins_play(game: model.Game):
    assert game.state == model.GameState.PLAYING


def test_p_pauses_and_p_again_resumes(game: model.Game):
    game.toggle_pause()
    assert game.state == model.GameState.PAUSED
    game.toggle_pause()
    assert game.state == model.GameState.PLAYING


def test_a_paused_game_does_not_move(game: model.Game):
    game.toggle_pause()
    before = Vector2(game.ball.position)
    game.update(0, 1 / 60)
    assert game.ball.position == before


def test_pausing_on_the_title_screen_does_nothing(new_game: model.Game):
    new_game.toggle_pause()
    assert new_game.state == model.GameState.TITLE
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="106 passed"
```

## Two tables

**Build:** a players table, and scores that belong to a player.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (name <> '')
) STRICT;

CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players (id),
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT;
"""


@dataclass(frozen=True)
class Score:
    player: str
    level: str
    points: int
    when: datetime


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    return db


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at) SELECT id, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.player),
        )


def load_scores(db: sqlite3.Connection) -> list[Score]:
    rows = db.execute(
        """
        SELECT players.name, scores.level, scores.points, scores.played_at
        FROM scores JOIN players ON players.id = scores.player_id
        ORDER BY scores.id
        """
    )
    return [Score(name, level, points, datetime.fromisoformat(played_at)) for name, level, points, played_at in rows]


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

**Understand: why two tables.** The simplest way to record who played would be a `player` text column in `scores`, with the name written in every row. Then a player with a thousand scores has their name stored a thousand times, a typo in one row makes a second "player", and renaming someone means changing a thousand rows and hoping none is missed. Lesson 7.4 looks at that problem properly. The usual design stores each player **once**, in a table of their own, and each score refers to its player by the player's primary key.

**The schema**, now two statements, so it's run with `executescript`, which runs several statements separated by `;`:

- `players`: an `id`, and a `name` that is `UNIQUE`, so no two rows can have the same name, and can't be empty (`CHECK (name <> '')`, where `<>` is SQL's "not equal").
- `scores.player_id INTEGER NOT NULL REFERENCES players (id)`: a **foreign key**, a column whose value is the primary key of a row in another table. It declares a **relationship**: each score belongs to exactly one player, and a player can have any number of scores, which is called **one-to-many**.

**`add_score`** does two things in one transaction:

1. `INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING` adds the player if they're new. If a row with that name already exists, the `UNIQUE` rule would refuse the insert, and `ON CONFLICT (name) DO NOTHING` says to quietly skip it instead. An insert that may already have been done is often called an **upsert**.
2. `INSERT INTO scores (...) SELECT id, ?, ?, ? FROM players WHERE name = ?` adds the score, taking the player's `id` from a `SELECT` instead of from `VALUES`: one statement looks up the player and inserts the score.

Both inside `with db:`, so a score is never saved without its player, or a player half-added.

**`load_scores`** asks one question across both tables with a **join**. `FROM scores JOIN players ON players.id = scores.player_id` pairs each score with the player row whose `id` matches its `player_id`. Columns are then named with their table, `players.name` or `scores.level`, because both tables have an `id`. The result is one row per score, with the player's name in it, exactly as if the name had been stored in the score, without storing it twice.

```check
contains breakout/scores.py "REFERENCES players (id)"
contains breakout/scores.py "JOIN players ON players.id = scores.player_id"
```

## Tests for players

**Build:** the scores tests, with players.

```python file=tests/test_scores.py
"""What the scores database must do, and what it must refuse."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from breakout.scores import Score, add_score, best, load_scores, open_scores

WIN = Score("Mia", "Classic", 400, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC))
LOSS = Score("Sam", "Classic", 70, datetime(2026, 10, 4, 15, 41, 0, tzinfo=UTC))
CASTLE = Score("Mia", "Castle", 150, datetime(2026, 10, 5, 9, 2, 30, tzinfo=UTC))
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


def test_each_player_is_kept_once(db: sqlite3.Connection):
    for score in [WIN, LOSS, CASTLE]:
        add_score(db, score)
    assert db.execute("SELECT name FROM players ORDER BY id").fetchall() == [("Mia",), ("Sam",)]


def test_the_best_score_is_the_highest_on_that_level(db: sqlite3.Connection):
    for score in [LOSS, CASTLE, WIN]:
        add_score(db, score)
    assert best(db, "Classic") == 400


def test_a_level_never_played_has_no_best(db: sqlite3.Connection):
    add_score(db, WIN)
    assert best(db, "Castle") is None


def test_negative_points_are_refused_by_the_database(db: sqlite3.Connection):
    with pytest.raises(sqlite3.IntegrityError):
        add_score(db, Score("Mia", "Classic", -5, WIN.when))
    assert load_scores(db) == []


def test_a_player_with_no_name_is_refused(db: sqlite3.Connection):
    with pytest.raises(sqlite3.IntegrityError):
        add_score(db, Score("", "Classic", 10, WIN.when))
    assert load_scores(db) == []


def test_a_file_that_is_not_a_database_is_refused():
    with pytest.raises(sqlite3.DatabaseError):
        open_scores(DATA / "broken-scores.json")
```

**Understand.** Every `Score` now names its player. `test_each_player_is_kept_once` adds three scores by two players and checks the `players` table directly: `fetchall()` returns every row, as a list of tuples. `test_a_player_with_no_name_is_refused` checks the `CHECK` rule, and that the transaction left nothing behind.

```check
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="9 passed"
```

## The report tests, with a player

**Build:** the report tests' games belong to someone now.

```python file=tests/test_report.py
import sqlite3
from datetime import UTC, datetime

from breakout.report import forget, report
from breakout.scores import Score, add_score, load_scores

WHEN = datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)
INJECTION = "x' OR '1'='1"


def add_games(db: sqlite3.Connection, *levels: str) -> None:
    """One 100-point game by Mia on each of these levels."""
    for level in levels:
        add_score(db, Score("Mia", level, 100, WHEN))


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

```check
run ".venv/Scripts/python -m pytest -q tests/test_report.py" stdout="3 passed"
```

## A player on the command line

**Build:** a `--player` option.

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
    scores: Path | None = None
    player: str | None = None


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
    parser.add_argument("--scores", type=Path, metavar="FILE", help="keep scores in this file (test runs keep none)")
    parser.add_argument("--player", metavar="NAME", help="whose scores these are (default: from the settings file)")
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
        scores=options.scores,
        player=options.player,
    )
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="10 passed"
```

## A player in the settings file

**Build:** a `player` setting, so a player doesn't have to type their name every time.

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

**Understand.** `player` is a name with something in it besides spaces, like a level's name (lesson 5.4), and `Player` if the file doesn't say.

```check
run ".venv/Scripts/python -m pytest -q tests/test_config.py" stdout="10 passed"
```

## The app records who played

**Build:** the app saves each score under the player's name.

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
from breakout.scores import Score, add_score, best, open_scores
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
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, level.name)
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
            add_score(db, Score(player, level.name, game.score, datetime.now(UTC)))
            best_score = best(db, level.name)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
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

**Understand.** `player = settings.player or config.player`: lesson 5.5's precedence again, command line first, then the settings file, whose default is `Player`.

Your `scores.db` from the last chapter has the **old** `scores` table, with no `player_id`, and `CREATE TABLE IF NOT EXISTS` leaves an existing table exactly as it is. It's only test data, so delete it and start again:

```powershell
Remove-Item scores.db -ErrorAction Ignore
.venv\Scripts\breakout --test-run 10000 --hold auto --scores scores.db --player Mia
.venv\Scripts\breakout --test-run 600 --hold none --scores scores.db
.venv\Scripts\python -m sqlite3 scores.db "SELECT players.name, scores.level, scores.points FROM scores JOIN players ON players.id = scores.player_id"
```

```text
('Mia', 'Classic', 560)
('Player', 'Classic', 40)
```

`-ErrorAction Ignore` makes `Remove-Item` say nothing if the file isn't there. A player's own database is different: it can't be deleted to make room for a new design. That's the next lesson.

```check
run ".venv/Scripts/python -m sqlite3 scores.db \"SELECT players.name, scores.points FROM scores JOIN players ON players.id = scores.player_id WHERE players.name = 'Mia'\"" stdout="('Mia', 560)" label="Mia's win is saved under her name"
```

## Your turn: bug hunt — the reference nobody checks

**Build, on your own:** click **Create provided tests/test_foreign_keys.py**, then find out why it fails, and fix the game.

```python file=tests/test_foreign_keys.py provided
"""A bug report, written as tests: the database keeps scores that belong to no player."""

import sqlite3
from datetime import UTC, datetime

import pytest

from breakout.scores import Score, add_score


def test_a_score_for_a_player_who_does_not_exist_is_refused(db: sqlite3.Connection):
    with pytest.raises(sqlite3.IntegrityError), db:
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at) VALUES (99, 'Classic', 10, '2026-10-04T15:30:05Z')"
        )


def test_a_player_who_has_scores_cannot_be_deleted(db: sqlite3.Connection):
    add_score(db, Score("Mia", "Classic", 400, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)))
    with pytest.raises(sqlite3.IntegrityError), db:
        db.execute("DELETE FROM players WHERE name = 'Mia'")
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_foreign_keys.py
```

```text
FAILED tests/test_foreign_keys.py::test_a_score_for_a_player_who_does_not_exist_is_refused
FAILED tests/test_foreign_keys.py::test_a_player_who_has_scores_cannot_be_deleted
2 failed
```

The schema says `REFERENCES players (id)`. Above the summary, pytest explains each failure: `Failed: DID NOT RAISE IntegrityError`. The database accepts a score for player 99, who doesn't exist, and lets a player who has scores be deleted, leaving scores that belong to no one: **orphans**. Try it yourself in the shell on `scores.db`, and count the rows before and after. Then find out why. This one is about SQLite itself, so its documentation on foreign keys is the place to look. (`pytest.raises(...), db` in a `with` is two context managers in one statement: the transaction and the check that it raises.)

| Test / check | Result |
|---|---|
| `pytest -q tests/test_foreign_keys.py` | `2 passed` |
| every connection `open_scores` returns | refuses orphans: in the game, the report tool and the tests, not only in the tests |

When all 110 tests pass and every check is clean, commit with a message that mentions **foreign key**.

```hints
nudge: The schema is right: the rule is declared. So is the database ignoring it? Search SQLite's documentation for "foreign key support". What does it say about whether foreign keys are enforced by default?
concept: For compatibility with old databases, SQLite **doesn't enforce foreign keys unless each connection asks it to**, with `PRAGMA foreign_keys = ON`. A **pragma** is an SQLite-specific command that changes how the connection behaves or reports on it: `PRAGMA foreign_keys` alone shows the current setting, `(0,)` or `(1,)`. It's per connection, not stored in the file, so it must be run every time the database is opened. That's also why the shell let you insert an orphan into `scores.db`: the shell's connection never asked.
shape: One line in `open_scores`, right after `sqlite3.connect`: `db.execute("PRAGMA foreign_keys = ON")`. Not in the test fixture: that would make the tests pass while the game, which opens the database through `open_scores` too, keeps accepting orphans.
answer: ~~~python
def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(SCHEMA)
    return db
~~~

Putting it in `open_scores` means every connection the program makes gets it, because there's only one way to open the scores database. That's a reason to have exactly one function that opens it. Other databases (PostgreSQL, MySQL with InnoDB, SQL Server) always enforce foreign keys; SQLite's default is a historical leftover that every SQLite program has to deal with, and now you know to look for it. A rule the database declares but doesn't check is worse than no rule: everyone reading the schema believes it.
```

```check
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA foreign_keys').fetchone())\"" stdout="(1,)" label="every connection open_scores makes enforces foreign keys" -- Run PRAGMA foreign_keys = ON in open_scores itself, not only in the test fixture.
run ".venv/Scripts/python -m pytest -q tests/test_foreign_keys.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="110 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "foreign key"
git-clean
```

## What did we actually learn?

- **Store each thing once**, and refer to it by its primary key: a **foreign key** and a **one-to-many relationship**.
- **Joins** answer one question across two tables: `FROM scores JOIN players ON players.id = scores.player_id`.
- **`UNIQUE`**, **upserts** (`ON CONFLICT ... DO NOTHING`) and **`INSERT ... SELECT`**; `executescript` for several statements.
- **Declared isn't enforced**: SQLite checks foreign keys only after `PRAGMA foreign_keys = ON`, on every connection. One function that opens the database is the one place to say so.
- **Orphans**: rows that refer to something gone. Foreign keys exist to make them impossible.

In C#, Entity Framework declares the same relationship with a navigation property (`public Player Player { get; set; }` on a score, `public List<Score> Scores` on a player) and writes the join for you; Java's JPA does it with `@ManyToOne` and `@OneToMany`. Both generate SQL much like this lesson's, against databases that enforce foreign keys, so the SQLite pragma is the one part you won't see there. Knowing the SQL underneath is what lets you read what those libraries do, and find out why when it's slow.
