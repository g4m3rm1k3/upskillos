---
reference: optional
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

## Two tables, by hand

**Build:** a players table and a scores table that refers to it, in a practice database, typed in the SQL shell.

Open a new practice database (`*.db` is already ignored, lesson 6.3):

```powershell
.venv\Scripts\python -m sqlite3 players.db
```

**A table of players**, each stored once:

```sql
CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK (name <> '')) STRICT;
INSERT INTO players (name) VALUES ('Mia'), ('Sam');
SELECT * FROM players;
```

```text
(1, 'Mia')
(2, 'Sam')
```

`UNIQUE` means no two rows can have the same `name`, and `CHECK (name <> '')` that it can't be empty (`<>` is SQL's "not equal"). One `INSERT` can add several rows: one bracket of values each. SQLite numbered them 1 and 2.

**A table of scores that refers to players.** Instead of a name, each score holds the **number** of its player:

```sql
CREATE TABLE scores (id INTEGER PRIMARY KEY, player_id INTEGER NOT NULL REFERENCES players (id), level TEXT NOT NULL, points INTEGER NOT NULL CHECK (points >= 0), played_at TEXT NOT NULL) STRICT;
INSERT INTO scores (player_id, level, points, played_at) VALUES (1, 'Classic', 400, '2026-10-04T15:30:05+00:00'), (2, 'Classic', 70, '2026-10-04T15:41:00+00:00'), (1, 'Castle', 150, '2026-10-05T09:02:30+00:00');
SELECT * FROM scores;
```

```text
(1, 1, 'Classic', 400, '2026-10-04T15:30:05+00:00')
(2, 2, 'Classic', 70, '2026-10-04T15:41:00+00:00')
(3, 1, 'Castle', 150, '2026-10-05T09:02:30+00:00')
```

`player_id INTEGER NOT NULL REFERENCES players (id)` is a **foreign key**: a column whose value is the primary key of a row in another table. The second column of each row says whose score it is: 1 is Mia, 2 is Sam. Declaring it with `REFERENCES` is meant to promise two rules:

- a score can't name a player who doesn't exist: `player_id` 99 should be refused;
- a player who has scores can't be deleted, because their scores would then point at nothing.

Whether SQLite actually keeps that promise is this lesson's bug hunt, at the end. Keeping every reference pointing at a real row is called **referential integrity**.

Refusing the delete is the default, and you can choose otherwise when you declare the key: `REFERENCES players (id) ON DELETE CASCADE` deletes a player's scores along with them (right when the scores mean nothing without the player), and `ON DELETE SET NULL` keeps the scores with no player (right when they still matter on their own, and the column allows `NULL`). Refusing is the safest default: nothing disappears that you didn't ask to delete.

**Asking across both tables.** A number isn't a name. A **join** pairs each score with the player it refers to:

```sql
SELECT players.name, scores.level, scores.points FROM scores JOIN players ON players.id = scores.player_id;
```

```text
('Mia', 'Classic', 400)
('Sam', 'Classic', 70)
('Mia', 'Castle', 150)
```

Traced: for each score, find the player row whose `id` equals the score's `player_id`, and put the two rows side by side.

```text
score row                          player_id   matching player row   selected
(1, 1, 'Classic', 400, ...)        1           (1, 'Mia')            ('Mia', 'Classic', 400)
(2, 2, 'Classic', 70, ...)         2           (2, 'Sam')            ('Sam', 'Classic', 70)
(3, 1, 'Castle', 150, ...)         1           (1, 'Mia')            ('Mia', 'Castle', 150)
```

Both tables have an `id`, so columns are named with their table, `players.name`, `scores.level`: `id` alone would be ambiguous.

**A player who's already there.** Add Mia again:

```sql
INSERT INTO players (name) VALUES ('Mia');
```

```text
IntegrityError (SQLITE_CONSTRAINT_UNIQUE): UNIQUE constraint failed: players.name
```

`UNIQUE` refused it. The game will add a player every time it saves a score, and most of the time they'll already exist, so it needs "add this player unless they're already there":

```sql
INSERT INTO players (name) VALUES ('Mia') ON CONFLICT (name) DO NOTHING;
SELECT COUNT(*) FROM players;
```

```text
(2,)
```

No error, and still two players. `ON CONFLICT (name) DO NOTHING` says what to do when the insert would break the `UNIQUE` rule on `name`: skip it, quietly. It only works on a column that has a `UNIQUE` rule (or is the primary key): without one there's never a conflict to handle, and SQLite refuses the clause. (You'll also meet `INSERT OR IGNORE`, SQLite's older spelling. Avoid it: it skips the row on **any** broken rule, a failed `CHECK` or a missing `NOT NULL` included, not only the conflict you meant.)

**A score, by the player's name.** The game knows a player's name, not their number. One statement can look up the number and insert the score with it: an `INSERT` that takes its values from a `SELECT` instead of from `VALUES`. Before you run it for a player who doesn't exist:

```predict
question: There's no player called Zoe. What does `INSERT INTO scores (player_id, level, points, played_at) SELECT id, 'Classic', 5, '2026-10-05T10:00:00+00:00' FROM players WHERE name = 'Zoe'` do?
choice: An error: Zoe isn't a player
choice: Adds a score with no player_id
choice: Nothing, with no error
answer: Nothing, with no error
explain: `INSERT ... SELECT` inserts one row for every row the `SELECT` gives. `WHERE name = 'Zoe'` matches no player, so the `SELECT` gives no rows, and zero rows are inserted. That isn't an error to SQL: "insert all of these", where "these" is nothing, succeeded. The game avoids it by making sure the player exists first.
```

```sql
INSERT INTO scores (player_id, level, points, played_at) SELECT id, 'Classic', 5, '2026-10-05T10:00:00+00:00' FROM players WHERE name = 'Zoe';
SELECT COUNT(*) FROM scores;
INSERT INTO scores (player_id, level, points, played_at) SELECT id, 'Classic', 5, '2026-10-05T10:00:00+00:00' FROM players WHERE name = 'Sam';
SELECT * FROM scores WHERE id = 4;
```

```text
(3,)
(4, 2, 'Classic', 5, '2026-10-05T10:00:00+00:00')
```

Zoe: still three scores, and no error. Sam: the `SELECT` found his `id`, 2, and a fourth score was added with it. The values you write in the `SELECT` (`'Classic'`, `5`, ...) are simply the same in every row it gives.

Type `.quit` to leave the shell.

```check
run ".venv/Scripts/python -m sqlite3 players.db \"SELECT players.name, scores.points FROM scores JOIN players ON players.id = scores.player_id WHERE scores.level = 'Castle'\"" stdout="('Mia', 150)" label="players.db joins each score to its player"
run ".venv/Scripts/python -m sqlite3 players.db \"SELECT COUNT(*) FROM players\"" stdout="(2,)" label="Mia is in the players table once"
```

## Two tables in the schema

**Build:** the game's schema, with the two tables you just typed.

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
    level: str
    points: int
    when: datetime


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    return db


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute(
            "INSERT INTO scores (level, points, played_at) VALUES (?, ?, ?)",
            (score.level, score.points, score.when.isoformat()),
        )


def load_scores(db: sqlite3.Connection) -> list[Score]:
    rows = db.execute("SELECT level, points, played_at FROM scores ORDER BY id")
    return [Score(level, points, datetime.fromisoformat(played_at)) for level, points, played_at in rows]


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

**Understand: why two tables.** The simplest way to record who played would be a `player` text column in `scores`, with the name written in every row. Then a player with a thousand scores has their name stored a thousand times, a typo in one row makes a second "player", and renaming someone means changing a thousand rows and hoping none is missed. Lesson 7.5 looks at that problem properly. The usual design, called **normalisation**, stores each player **once**, in a table of their own, and each score refers to its player by the player's primary key. Each score belongs to exactly one player, and a player can have any number of scores: a **one-to-many** relationship.

**The schema** is two statements now, separated by `;`. `execute` runs exactly one, and refuses more: `ProgrammingError: You can only execute one statement at a time`. **`executescript`** runs a whole script of them, in order. One difference to know: if a transaction is open, `executescript` commits it first, so it isn't for use in the middle of one. Here it runs straight after `connect`, with nothing open.

```check
contains breakout/scores.py "REFERENCES players (id)"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); print(db.execute('SELECT COUNT(*) FROM players').fetchone(), db.execute('SELECT COUNT(*) FROM scores').fetchone())\"" stdout="(0,) (0,)" label="open_scores makes both tables, empty"
```

`add_score` and `load_scores` still use the old table's columns, and the app still makes a `Score` with no player: they change in the next two steps and in "The app records who played", and nothing plays a game with scores before then.

## A score knows its player

**Build:** a `Score` says who made it, and `add_score` stores the player once and the score with their id.

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
    rows = db.execute("SELECT level, points, played_at FROM scores ORDER BY id")
    return [Score(level, points, datetime.fromisoformat(played_at)) for level, points, played_at in rows]


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

**Understand.** `Score` gains a `player` field, first, so it reads like a sentence: Mia, Classic, 400, at this time.

**`add_score`** does two things in one transaction:

1. `INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING` adds the player if they're new, and skips quietly if they're not, as in the shell. You'll hear inserts like this called **upserts**, from "update or insert": strictly, an upsert updates the row that's already there (`ON CONFLICT ... DO UPDATE`), and `DO NOTHING` is its "insert or ignore" form. The updating form names what to change: `ON CONFLICT (name) DO UPDATE SET last_seen = excluded.last_seen`, where **`excluded`** means the row you tried to insert, so the existing row takes its new value. (`players` has no such column; it's only the shape.)
2. `INSERT INTO scores (...) SELECT id, ?, ?, ? FROM players WHERE name = ?` is the shell's `INSERT ... SELECT`, with placeholders: one statement looks up the player's `id` and inserts the score with it. Step 1 is what makes it safe: the player always exists by then, so the `SELECT` always finds exactly one row, never Zoe's none.

The second statement has **four** placeholders, filled in order:

```text
SELECT id,  ?,            ?,             ?                        FROM players WHERE name = ?
            score.level   score.points   score.when.isoformat()                         score.player
```

The fourth `?` is in the `WHERE`, which is why `score.player` comes last in the tuple, though it's first in the `Score`.

**Why the first statement must come first.** If no player has that name, the `SELECT` finds no rows, and `INSERT ... SELECT` inserts nothing at all: no error, just a score silently not saved. The first statement makes sure the player exists, so the second always finds exactly one. Both are inside `with db:`, so a player is never half-added and a score never saved without its player.

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, open_scores; db = open_scores(Path(':memory:')); t = datetime(2026, 10, 4, tzinfo=UTC); [add_score(db, Score(p, 'Classic', n, t)) for p, n in [('Mia', 400), ('Sam', 70), ('Mia', 150)]]; print(db.execute('SELECT * FROM players').fetchall()); print(db.execute('SELECT player_id, points FROM scores').fetchall())"
```

```text
[(1, 'Mia'), (2, 'Sam')]
[(1, 400), (2, 70), (1, 150)]
```

`fetchall()` gives every row of a result at once, as a list of tuples, where `fetchone()` gives one. Three scores, two players: Mia's second score found her existing row, id 1. (`[add_score(...) for p, n in [...]]` is a list comprehension used only for a loop on one line: the list it builds, three `None`s, is thrown away. In a file you'd write a `for` loop.)

```check
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); from breakout.scores import Score, add_score; t = datetime(2026, 10, 4, tzinfo=UTC); add_score(db, Score('Mia', 'Classic', 400, t)); add_score(db, Score('Mia', 'Castle', 150, t)); print(db.execute('SELECT * FROM players').fetchall(), db.execute('SELECT player_id FROM scores').fetchall())\"" stdout="[(1, 'Mia')] [(1,), (1,)]" label="two scores by Mia: one player, and both scores point at her"
```

## Scores with names, by a join

**Build:** `load_scores` gives each score its player's name back.

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

**Understand.** The query is the shell's join, with the `played_at` column too, and `ORDER BY scores.id` so the scores come back in the order they were added. The result is one row per score with the player's name in it, exactly as if the name had been stored in the score, without storing it twice. A `JOIN` only gives rows that match, though: a score whose player is gone simply disappears from `load_scores`, without an error. Keep that in mind for the bug hunt. A query this long is easier to read over several lines, so it's in a triple-quoted string: SQL doesn't mind the line breaks.

```check
contains breakout/scores.py "JOIN players ON players.id = scores.player_id"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); from breakout.scores import Score, add_score, load_scores; t = datetime(2026, 10, 4, tzinfo=UTC); add_score(db, Score('Mia', 'Classic', 400, t)); add_score(db, Score('Sam', 'Classic', 70, t)); print([(s.player, s.points) for s in load_scores(db)])\"" stdout="[('Mia', 400), ('Sam', 70)]" label="each score comes back with its player's name"
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


def player_name(text: str) -> str:
    name = text.strip()
    if not name:
        raise argparse.ArgumentTypeError("must have something in it besides spaces")
    return name


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
    parser.add_argument(
        "--player", type=player_name, metavar="NAME", help="whose scores these are (default: from the settings file)"
    )
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

**Understand.** `player_name` is a `type` function, like `positive_int` (lesson 4.3): argparse calls it with the text after `--player`, and uses what it returns. It removes spaces from both ends, and refuses a name with nothing else in it, so `--player "   "` is a usage error, as `--test-run 0` is. Without it, a name of three spaces would get past the database's `CHECK (name <> '')`: three spaces aren't empty.

```check
run ".venv/Scripts/breakout --test-run 5 --player \"   \"" exit=2 stderr="must have something in it besides spaces" label="a name of only spaces is a usage error"
```

## Tests for the player name

**Build:** two tests for `--player`, at the end of `tests/test_arguments.py`.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

from breakout import settings
from breakout.settings import Hold, Settings


def test_no_arguments_is_a_normal_game():
    assert settings.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert settings.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(
        test_frames=600, hold=Hold.AUTO, lag_at=40, seed=7
    )


def test_an_unknown_hold_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--hold", "sideways"])
    assert stopped.value.code == 2


def test_a_hold_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--hold"])
    assert stopped.value.code == 2


def test_a_lag_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--lag-at"])
    assert stopped.value.code == 2


def test_a_lag_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--lag-at", "soon"])
    assert stopped.value.code == 2


def test_a_usage_error_says_how_to_use_the_game(capsys: pytest.CaptureFixture[str]):
    with pytest.raises(SystemExit):
        settings.parse_args(["--hold", "sideways"])
    assert capsys.readouterr().err.startswith("usage: breakout")


def test_a_seed_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--seed", "lucky"])
    assert stopped.value.code == 2


def test_a_negative_frame_count_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "-5"])
    assert stopped.value.code == 2


def test_zero_frames_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "0"])
    assert stopped.value.code == 2


def test_a_player_name_is_kept_without_the_spaces_around_it():
    assert settings.parse_args(["--player", " Mia "]).player == "Mia"


def test_a_player_name_of_only_spaces_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--player", "   "])
    assert stopped.value.code == 2
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="12 passed"
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

**Understand.** `player` is a name with something in it besides spaces, like a level's name (lesson 5.4), and `Player` if the file doesn't say. The same rule as `--player`, written the pydantic way: `strip_whitespace=True`, then `min_length=1`.

```check
contains breakout/config.py "player: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]"
```

## Tests for the player setting

**Build:** tests for the `player` setting: one for the default and a name read from the file, and one more refusal in the parametrised test.

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
run ".venv/Scripts/python -m pytest -q tests/test_config.py" stdout="12 passed"
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
    except (OSError, UnicodeDecodeError, ConfigError) as error:
        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    player = settings.player or config.player
    try:
        level = load_level(level_file)
    except (OSError, UnicodeDecodeError, LevelError) as error:
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

`-ErrorAction Ignore` makes `Remove-Item` say nothing if the file isn't there.

If you played real games in Chapter 6, the database in your data folder (lesson 6.1's `get_pref_path`) has the old table as well, and the next real game would crash when it ends, with `table scores has no column named player_id`. It's your own test data, so delete it too:

```powershell
Remove-Item "$env:APPDATA\forge\breakout\scores.db" -ErrorAction Ignore
```

`$env:APPDATA` is the environment variable (lesson 0.1) holding your `AppData\Roaming` folder. A real player's database is different: it can't be deleted to make room for a new design. That's the next lesson.

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

The schema says `REFERENCES players (id)`. Above the summary, pytest explains each failure: `Failed: DID NOT RAISE IntegrityError`. The database accepts a score for player 99, who doesn't exist, and lets a player who has scores be deleted, leaving scores that belong to no one: **orphans**. Try it yourself in the shell on the practice file, `players.db`, not your `scores.db`, which the next lessons rely on: count the rows, insert a score for player 99, count again, then delete it again with `DELETE FROM scores WHERE player_id = 99;`. Then find out why. This one is about SQLite itself, so its documentation on foreign keys is the place to look. One new piece of syntax in the tests: `with pytest.raises(sqlite3.IntegrityError), db:` is two context managers in one `with`, entered left to right and left in reverse order. So `db`'s transaction ends first: if the `INSERT` raised, it's rolled back, and the exception carries on out. Then `pytest.raises` catches it and checks its type. If nothing raised, the transaction commits, and `pytest.raises` fails the test with `DID NOT RAISE`. It's the same as one `with` inside the other.

| Test / check | Result |
|---|---|
| `pytest -q tests/test_foreign_keys.py` | `2 passed` |
| every connection `open_scores` returns | refuses orphans: in the game, the report tool and the tests, not only in the tests |

When all 114 tests pass and every check is clean, commit with a message that mentions **foreign key**.

```hints
nudge: The schema is right: the rule is declared. So is the database ignoring it? Search SQLite's documentation for "foreign key support". What does it say about whether foreign keys are enforced by default?
concept: For compatibility with old databases, SQLite **doesn't enforce foreign keys unless each connection asks it to**, with `PRAGMA foreign_keys = ON`. A **pragma** is an SQLite-specific command that changes how the connection behaves or reports on it: `PRAGMA foreign_keys` alone shows the current setting, `(0,)` or `(1,)`. It's per connection, not stored in the file, so it must be run every time the database is opened. That's also why the shell let you insert an orphan into `players.db`: the shell's connection never asked.
shape: One line in `open_scores`, right after `sqlite3.connect`: `db.execute("PRAGMA foreign_keys = ON")`. Not in the test fixture: that would make the tests pass while the game, which opens the database through `open_scores` too, keeps accepting orphans.
answer: ~~~python
def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(SCHEMA)
    return db
~~~

Putting it in `open_scores` means every connection the program makes gets it, because there's only one way to open the scores database. That's a reason to have exactly one function that opens it. Other databases (PostgreSQL, MySQL with InnoDB, SQL Server) enforce foreign keys by default; SQLite's default is a historical leftover that every SQLite program has to deal with, and now you know to look for it. A rule the database declares but doesn't check is worse than no rule: everyone reading the schema believes it.
```

**What a pragma is.** A **pragma** is an SQLite-specific command that changes how SQLite behaves, or reports on it, rather than working on your tables: `PRAGMA foreign_keys` alone shows the setting, and `PRAGMA foreign_keys = ON` changes it. This one belongs to the **connection**, not the file: it's forgotten when the connection closes, which is why it must be run every time the database is opened. See it work, in the shell on `players.db` (one shell session, so one connection):

```sql
PRAGMA foreign_keys;
PRAGMA foreign_keys = ON;
INSERT INTO scores (player_id, level, points, played_at) VALUES (99, 'x', 1, 'x');
DELETE FROM players WHERE name = 'Mia';
```

```text
(0,)
IntegrityError (SQLITE_CONSTRAINT_FOREIGNKEY): FOREIGN KEY constraint failed
IntegrityError (SQLITE_CONSTRAINT_FOREIGNKEY): FOREIGN KEY constraint failed
```

Off at first; then both rules kept. Quit the shell, open it again, and `PRAGMA foreign_keys;` says `(0,)` again: a new connection.

One more thing a real schema adds: an **index** on `scores.player_id` (lesson 7.6), so finding a player's scores, for a join or for the check before deleting a player, doesn't mean reading every score.

```check
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA foreign_keys').fetchone())\"" stdout="(1,)" label="every connection open_scores makes enforces foreign keys" -- Run PRAGMA foreign_keys = ON in open_scores itself, not only in the test fixture.
run ".venv/Scripts/python -m pytest -q tests/test_foreign_keys.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="114 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "foreign key"
git-clean
```

## Challenge: a player's own best

**Optional, ★.** Add `best_for(db, player, level)`: one player's best on one level, using the join and a `WHERE` on both tables. Test it for a player who has played, and one who never has. On a branch.

## Challenge: rename a player

**Optional, ★★.** Add `rename_player(db, old, new)`: one `UPDATE` (lesson 6.3) on `players`, and every score follows, because each refers to the player by number. That's the payoff of storing the name once. Test it, and test that renaming to a name that's taken raises `IntegrityError`. On a branch.

## Challenge: find the orphans

**Optional, ★★.** `PRAGMA foreign_key_check` lists every row whose foreign key points at nothing. Add `python -m breakout.report SCORES_DB --orphans`, which prints them, and try it on a copy of `players.db` with an orphan you made with foreign keys off. Declared isn't enforced, and here's how you'd find out what slipped through. On a branch.

## What did we actually learn?

- **Store each thing once**, and refer to it by its primary key: a **foreign key** and a **one-to-many relationship**.
- **Joins** answer one question across two tables: `FROM scores JOIN players ON players.id = scores.player_id`.
- **`UNIQUE`**, **upserts** (`ON CONFLICT ... DO NOTHING`) and **`INSERT ... SELECT`**; `executescript` for several statements.
- **Declared isn't enforced**: SQLite checks foreign keys only after `PRAGMA foreign_keys = ON`, on every connection (a **pragma** is a setting of SQLite itself, and this one belongs to the connection). One function that opens the database is the one place to say so.
- **Orphans**: rows that refer to something gone. Foreign keys exist to make them impossible.

In C#, Entity Framework declares the same relationship with a navigation property (`public Player Player { get; set; }` on a score, `public List<Score> Scores` on a player) and writes the join for you; Java's JPA does it with `@ManyToOne` and `@OneToMany`. Both generate SQL much like this lesson's, against databases that enforce foreign keys, so the SQLite pragma is the one part you won't see there. Knowing the SQL underneath is what lets you read what those libraries do, and find out why when it's slow.
