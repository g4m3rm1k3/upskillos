---
title: 7.2 — A Database That's Already Out There
runtime: python
run: breakout/__main__.py
---

Lesson 7.1 changed the database's design, and the way to get the new design was to delete the old file. That was fine for test data. It isn't fine for a player: their database holds every score they've made, and the next version of the game must open it, keep everything in it, and change its design in place. This lesson gives the database a version number, and the game a list of every change ever made to the design, applied in order, each one completely or not at all. These are **migrations**, and every program that keeps data for longer than one run needs them.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 7.1, the reference answer to its Your turn.

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
    db.execute("PRAGMA foreign_keys = ON")
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

```check
run ".venv/Scripts/python -m pytest -q" stdout="114 passed"
```

## Which design is this file?

**Build:** look inside your `scores.db` for a version number.

SQLite keeps a few numbers in the first 100 bytes of every database file, its **header**. One of them, `user_version`, belongs to you: SQLite never uses it, and starts it at 0. A **pragma** (lesson 7.1) reads it and sets it:

```powershell
.venv\Scripts\python -m sqlite3 scores.db "PRAGMA user_version"
```

```text
(0,)
```

Now set it on the practice database from lesson 7.1, and read it back:

```powershell
.venv\Scripts\python -m sqlite3 players.db "PRAGMA user_version = 7"
.venv\Scripts\python -m sqlite3 players.db "PRAGMA user_version"
```

```text
(7,)
```

**Understand.** Your `scores.db` says 0, and so would a database made a minute ago by lesson 6.3's code, with no players table at all, and so would a brand new empty file. Three different designs, one number. Nothing in the file says which design it has, so a program opening it can only guess. The fix is to give every design a number and write that number into the file whenever its design changes. `user_version` is the place SQLite gives you for it.

```check
run ".venv/Scripts/python -m sqlite3 players.db \"PRAGMA user_version\"" stdout="(7,)" label="players.db remembers the version you gave it"
run ".venv/Scripts/python -m sqlite3 scores.db \"PRAGMA user_version\"" stdout="(0,)" label="your scores.db has no version yet"
```

## A column the old files don't have

**Build:** a score records whether the game was won.

A score of 400 in a game that was won and 400 in a game that was lost are different results, and the statistics in lesson 7.3 will want to tell them apart. The scores table gets a new column, `won`, and `Score` a new field:

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
    played_at TEXT NOT NULL,
    won INTEGER CHECK (won IN (0, 1))
) STRICT;
"""


@dataclass(frozen=True)
class Score:
    player: str
    level: str
    points: int
    when: datetime
    won: bool | None = None


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(SCHEMA)
    return db


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at, won) "
            "SELECT id, ?, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.won, score.player),
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

**Understand.**

- `won INTEGER CHECK (won IN (0, 1))`: SQLite has no true-or-false type, so `won` is an integer that the `CHECK` limits to 0 (lost) or 1 (won). `IN (0, 1)` is true when the value is one of those in the list. The column has no `NOT NULL`, so it can also be `NULL`: unknown.
- `won: bool | None = None`: a field with a **default**, like `Controls` in lesson 5.5. A `Score` made without it, as every test and the app still do, gets `None`, "unknown". So nothing that already makes a `Score` has to change: the new field is **backwards compatible**.
- `add_score` passes `score.won` to a fifth placeholder. Python's `sqlite3` stores `True` as 1, `False` as 0 and `None` as `NULL`.
- The `INSERT` is now too long for one line, so it's written as two strings side by side, with nothing between them. Python joins adjacent string literals into one when it reads the code: `"INSERT ... won) " "SELECT ..."` is exactly the same string as writing it all at once. (The space at the end of the first part matters.)

```predict
question: Your `scores.db` was made by lesson 7.1's code. The game opens it with this new `open_scores` and saves a score. What happens?
choice: It works: the score is saved, with `won` set
choice: The scores table is made again, with the new column, and the old scores are lost
choice: It fails: the table has no column named `won`
answer: It fails: the table has no column named `won`
explain: `CREATE TABLE IF NOT EXISTS scores (...)` does nothing at all when a table called `scores` exists, whatever its columns are. So the old table stays as it was, without `won`, and the `INSERT` that names `won` fails. A new, empty file would work, which is exactly why a test run with a fresh database wouldn't notice.
```

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, open_scores; add_score(open_scores(Path('scores.db')), Score('Mia', 'Classic', 10, datetime.now(UTC)))"
```

```text
sqlite3.OperationalError: table scores has no column named won
```

Every player who already has a database would get this, on their first game with the new version. In the app, `add_score` runs at the end of a game, outside the `try` that guards opening the database, so the game would crash then.

```check
contains breakout/scores.py "won INTEGER CHECK (won IN (0, 1))"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, open_scores; add_score(open_scores(Path('scores.db')), Score('Mia', 'Classic', 10, datetime.now(UTC)))\"" exit=1 stderr="no column named won" label="the old file still has the old design"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, open_scores; db = open_scores(Path(':memory:')); add_score(db, Score('Mia', 'Classic', 10, datetime.now(UTC), True)); print(db.execute('SELECT won FROM scores').fetchone())\"" stdout="(1,)" label="a new file gets the new design, and True is stored as 1"
```

## Every change, in order

**Build:** replace the one `SCHEMA` with a list of every change to the design, and run the ones a file hasn't had yet.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# Every change to the database's design, in order. A database's version is how many of them it has had,
# kept in the file as PRAGMA user_version. New ones go at the end; one that has shipped is never changed.
MIGRATIONS = [
    # 1: players and their scores (lesson 7.1). IF NOT EXISTS, so files made before versions existed fit.
    """
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
    """,
    # 2: whether the game was won. Scores saved before this are NULL: nobody recorded it.
    """
    ALTER TABLE scores ADD COLUMN won INTEGER CHECK (won IN (0, 1));
    """,
]


@dataclass(frozen=True)
class Score:
    player: str
    level: str
    points: int
    when: datetime
    won: bool | None = None


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    migrate(db)
    return db


def migrate(db: sqlite3.Connection) -> None:
    """Bring the database up to the newest design, one migration at a time."""
    (version,) = db.execute("PRAGMA user_version").fetchone()
    for number in range(version + 1, len(MIGRATIONS) + 1):
        db.executescript(f"{MIGRATIONS[number - 1]} PRAGMA user_version = {number};")


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at, won) "
            "SELECT id, ?, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.won, score.player),
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

**Understand.** `MIGRATIONS` is a list of SQL scripts. Each one is a **migration**: one change to the design, written as the SQL that makes it. A database's version is the number of migrations it has had, so version 2 means "migrations 1 and 2 have been run on this file".

- Migration 1 is lesson 7.1's design. It's the only one with `IF NOT EXISTS`: files made before versions existed already have those tables, at version 0, and for them migration 1 must change nothing but the number.
- Migration 2 is the new column. `ALTER TABLE scores ADD COLUMN won ...` adds it to an existing table, keeping every row; the rows already there get `NULL` in the new column, which is the honest value: nobody recorded whether those games were won. A migration can't invent data the program never collected.

**`migrate`** reads the file's version, then runs every migration after it, in order. Each script ends by setting `user_version` to that migration's number, so the file always says how far it has got. `range(version + 1, len(MIGRATIONS) + 1)` counts from the first migration the file hasn't had up to the last; the migration numbered `number` is at list position `number - 1`, since lists count from 0. Traced for three files:

```text
file                         version   range(...)    migrations run                       version after
a new, empty file            0         range(1, 3)   1 (makes both tables), 2 (adds won)    2
your scores.db from 7.1      0         range(1, 3)   1 (changes nothing), 2 (adds won)      2
a file this code made        2         range(3, 3)   none: the range is empty               2
```

The last row is the one that runs every time the game starts: one `PRAGMA`, an empty loop, and nothing else.

**Two rules come with this list.**

1. **Add, never edit.** Once a migration has run on anyone's file, it never changes. A file at version 2 will never run migrations 1 or 2 again, so editing migration 2 would leave two files that both say "version 2" with different designs, and no way to tell them apart: the problem this lesson started with. A mistake in a shipped migration is fixed by a new migration.
2. **Only the number comes from the code.** `f"... PRAGMA user_version = {number};"` builds SQL with an f-string, which lesson 6.4 warned against. Here it's safe, and it's the only way: `number` is an `int` from `range`, never data from outside, and SQLite doesn't allow `?` placeholders in a `PRAGMA`.

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())"
.venv\Scripts\python -m sqlite3 scores.db "SELECT won, COUNT(*) FROM scores GROUP BY won"
```

```text
(2,)
(None, 2)
```

Your file is at version 2 now, and its scores are all still there, with `won` unknown: 2 of them if you played just lesson 7.1's two games. (The `GROUP BY` counts rows for each value of `won`; lesson 7.3 explains it properly.)

```check
contains breakout/scores.py "def migrate(db: sqlite3.Connection) -> None:"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())\"" stdout="(2,)" label="your scores.db is migrated to version 2"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, open_scores; add_score(open_scores(Path('scores.db')), Score('Mia', 'Classic', 10, datetime.now(UTC)))\"" label="a score can be saved in your old file now"
```

## A migration that stops halfway

**Build:** nothing. Break a migration on purpose, and watch what it does to a file.

The command below adds a third migration that starts well (it makes a table called `half`) and then fails (`NOT SQL` isn't SQL), then opens a new file, `half.db`. It's one command, run in its own Python, so the broken migration never reaches your code or your `scores.db`:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout import scores; scores.MIGRATIONS.append('CREATE TABLE half (x INTEGER); NOT SQL;'); scores.open_scores(Path('half.db'))"
```

```text
sqlite3.OperationalError: near "NOT": syntax error
```

```predict
question: Run the same command again, on the same `half.db`. What happens?
choice: The same syntax error
choice: It works this time
choice: A different error
answer: A different error
explain: The first run got through migrations 1 and 2 and set the version to 2. Then migration 3 made the table `half` and failed on the next line, so the line setting the version to 3 never ran. The file now says version 2 and has a `half` table. The second run starts migration 3 again from its first line, and `CREATE TABLE half` fails, because `half` exists: `table half already exists`.
```

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout import scores; scores.MIGRATIONS.append('CREATE TABLE half (x INTEGER); NOT SQL;'); scores.open_scores(Path('half.db'))"
```

```text
sqlite3.OperationalError: table half already exists
```

**Understand.** `executescript` runs the statements of a script one after another, and each one that succeeds is saved straight away. When one fails, the script stops there. So migration 3 is **half done**: its first statement is in the file, the rest isn't, and the version still says 2. Every later attempt starts the migration from the top and fails sooner. The file is stuck: no version of the game can open it until someone repairs it by hand.

For a player, that's lesson 7.1's policy at its worst: "playing without keeping scores", at every start, for ever. Their scores aren't deleted, but the game will never save another one.

```check
run ".venv/Scripts/python -m sqlite3 half.db \"SELECT name FROM sqlite_schema WHERE name = 'half'\"" stdout="('half',)" label="the half-done migration left its table behind"
run ".venv/Scripts/python -m sqlite3 half.db \"PRAGMA user_version\"" stdout="(2,)" label="and the version still says 2"
```

## All or nothing

**Build:** run each migration inside a transaction.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# Every change to the database's design, in order. A database's version is how many of them it has had,
# kept in the file as PRAGMA user_version. New ones go at the end; one that has shipped is never changed.
MIGRATIONS = [
    # 1: players and their scores (lesson 7.1). IF NOT EXISTS, so files made before versions existed fit.
    """
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
    """,
    # 2: whether the game was won. Scores saved before this are NULL: nobody recorded it.
    """
    ALTER TABLE scores ADD COLUMN won INTEGER CHECK (won IN (0, 1));
    """,
]


@dataclass(frozen=True)
class Score:
    player: str
    level: str
    points: int
    when: datetime
    won: bool | None = None


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    migrate(db)
    return db


def migrate(db: sqlite3.Connection) -> None:
    """Bring the database up to the newest design, one migration at a time, each completely or not at all."""
    (version,) = db.execute("PRAGMA user_version").fetchone()
    for number in range(version + 1, len(MIGRATIONS) + 1):
        try:
            db.executescript(f"BEGIN; {MIGRATIONS[number - 1]} PRAGMA user_version = {number}; COMMIT;")
        except sqlite3.Error:
            db.rollback()
            raise


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at, won) "
            "SELECT id, ?, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.won, score.player),
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

**Understand.** Each script now starts with `BEGIN;` and ends with `COMMIT;`, so the migration and the line that sets its version are one **transaction** (lesson 6.3): saved together at `COMMIT`, or not at all. `user_version` is part of the transaction too, so the design and the number that describes it can't disagree.

When a statement fails, `executescript` stops and raises, and the `COMMIT` at the end never runs: the transaction is left open, with the half-done work in it. The `except` block handles that:

1. `db.rollback()` ends the open transaction by throwing away everything done in it: the `half` table and the version change.
2. `raise` on its own, with no exception after it, raises the same exception again, so whoever called `migrate` still finds out it failed. Swallowing it would hide a broken migration and let the game carry on with the old design.

Traced for the broken migration 3 on a new file:

```text
BEGIN;                                  a transaction starts
CREATE TABLE half (x INTEGER);          inside the transaction: not saved yet
NOT SQL;                                fails: executescript raises OperationalError
(PRAGMA user_version = 3; COMMIT;)      never run
except: db.rollback()                   the half table is thrown away; the version is still 2
raise                                   the same OperationalError goes on to the caller
```

One thing `executescript` does that matters here (lesson 7.1): if a transaction is already open when it's called, it commits it first. So `migrate` must not be called in the middle of other work. It isn't: `open_scores` runs it straight after connecting.

Try the broken migration on a new file, twice:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout import scores; scores.MIGRATIONS.append('CREATE TABLE half (x INTEGER); NOT SQL;'); scores.open_scores(Path('whole.db'))"
.venv\Scripts\python -c "from pathlib import Path; from breakout import scores; scores.MIGRATIONS.append('CREATE TABLE half (x INTEGER); NOT SQL;'); scores.open_scores(Path('whole.db'))"
```

```text
sqlite3.OperationalError: near "NOT": syntax error
sqlite3.OperationalError: near "NOT": syntax error
```

The same error both times, because each attempt starts from a file with nothing of migration 3 in it. Fix the migration, and the next start runs it from the beginning.

```check
contains breakout/scores.py "db.rollback()"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout import scores; scores.MIGRATIONS.append('CREATE TABLE half (x INTEGER); NOT SQL;'); scores.open_scores(Path('whole.db'))\"" exit=1 stderr="syntax error" label="a failed migration fails the same way every time"
run ".venv/Scripts/python -m sqlite3 whole.db \"SELECT COUNT(*) FROM sqlite_schema WHERE name = 'half'\"" stdout="(0,)" label="and leaves nothing of itself behind"
run ".venv/Scripts/python -m sqlite3 whole.db \"PRAGMA user_version\"" stdout="(2,)" label="the file is still a good version 2"
```

## Tests for migrations

**Build:** tests for what opening a database does to its design.

```python file=tests/test_migrations.py
"""What opening a database does to its design, whichever version the file has."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from breakout import scores
from breakout.scores import Score, load_scores, migrate, open_scores

# A database as lesson 7.1's code left it: both tables, no won column, and no version.
LESSON_7_1_DATABASE = """
CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK (name <> '')) STRICT;
CREATE TABLE scores (
    id INTEGER PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players (id),
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT;
INSERT INTO players (name) VALUES ('Mia');
INSERT INTO scores (player_id, level, points, played_at) VALUES (1, 'Classic', 560, '2026-10-04T15:30:05+00:00');
"""


def version(db: sqlite3.Connection) -> int:
    (number,) = db.execute("PRAGMA user_version").fetchone()
    return number


def test_a_new_database_has_the_newest_design(db: sqlite3.Connection):
    assert version(db) == len(scores.MIGRATIONS)


def test_a_lesson_7_1_database_keeps_its_scores(tmp_path: Path):
    path = tmp_path / "scores.db"
    old = sqlite3.connect(path)
    old.executescript(LESSON_7_1_DATABASE)
    old.close()
    db = open_scores(path)
    assert version(db) == len(scores.MIGRATIONS)
    assert load_scores(db) == [Score("Mia", "Classic", 560, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC))]
    db.close()


def test_opening_a_database_again_runs_no_migration_twice(tmp_path: Path):
    path = tmp_path / "scores.db"
    open_scores(path).close()
    db = open_scores(path)
    assert version(db) == len(scores.MIGRATIONS)
    db.close()


def test_a_migration_that_fails_changes_nothing(db: sqlite3.Connection, monkeypatch: pytest.MonkeyPatch):
    newest = len(scores.MIGRATIONS)
    broken = "CREATE TABLE half (x INTEGER); NOT SQL;"
    monkeypatch.setattr(scores, "MIGRATIONS", [*scores.MIGRATIONS, broken])
    with pytest.raises(sqlite3.OperationalError):
        migrate(db)
    assert version(db) == newest
    assert db.execute("SELECT name FROM sqlite_schema WHERE name = 'half'").fetchall() == []
```

**Understand.**

- `LESSON_7_1_DATABASE` is the design lesson 7.1's code made, with one player and one score in it, written as SQL so the test can build a real old file in `tmp_path`. When a design ships, a test like this one keeps a copy of it for ever, so every later migration is tested against the files players really have.
- The tests compare with `len(scores.MIGRATIONS)`, "the newest design", never with the number 2. The next
  migration will make the newest version 3, and these tests should still be true then; a test that pins `2`
  would fail for no reason. In the failing-migration test, `newest` is read **before** the broken migration is
  added, since afterwards the list is one longer.
- `test_opening_a_database_again_runs_no_migration_twice`: if `migrate` ran migration 2 again, `ADD COLUMN won` would fail with `duplicate column name: won`, and `open_scores` would raise. Opening a file twice is what every player does every day.
- `test_a_migration_that_fails_changes_nothing` needs a broken migration, without breaking the real list. **`monkeypatch`** is a fixture pytest provides: `monkeypatch.setattr(scores, "MIGRATIONS", new_list)` sets the module's `MIGRATIONS` to `new_list` for this test only, and puts the original back afterwards, however the test ends, like a `yield` fixture's teardown (lesson 6.5). `migrate` looks up `MIGRATIONS` in its module each time it runs, so it sees the patched list.
- `[*scores.MIGRATIONS, broken]` makes a **new** list. The demo in the last step used `append`, which changes the list itself: fine in a Python that exits straight afterwards, but in a test it would change the one list every other test in the run uses, and `monkeypatch` would only put back the name, not undo the change to the list. Rebinding versus mutating, from lesson 2.2.

```check
run ".venv/Scripts/python -m pytest -q tests/test_migrations.py" stdout="4 passed"
run ".venv/Scripts/python -m pytest -q" stdout="118 passed"
```

## Your turn: wins, recorded and read back

**Build, on your own:** make the game save whether it was won, and `load_scores` give it back.

Click **Create provided tests/test_wins.py**: a bug report written as tests.

```python file=tests/test_wins.py provided
"""A bug report, written as tests: whether a game was won is saved, but never read back."""

import sqlite3
from datetime import UTC, datetime

import pytest

from breakout.scores import Score, add_score, load_scores

WHEN = datetime(2026, 10, 5, 12, 0, 0, tzinfo=UTC)


@pytest.mark.parametrize("won", [True, False, None])
def test_whether_a_game_was_won_comes_back_as_it_was_saved(db: sqlite3.Connection, won: bool | None):
    add_score(db, Score("Mia", "Classic", 100, WHEN, won))
    (loaded,) = load_scores(db)
    assert loaded.won is won
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_wins.py
```

```text
2 failed, 1 passed
```

Two things are missing, and neither is in a migration:

| What | Where | Result |
|---|---|---|
| `load_scores` reads `won` back | `breakout/scores.py` | `pytest -q tests/test_wins.py`: `3 passed` |
| the app says whether the game was won | `breakout/app.py` | after `breakout --test-run 10000 --hold auto --scores scores.db`, the newest row's `won` is `1` |

The test compares with `is`, not `==`: the value that comes back must be `True`, `False` or `None` itself, not the 1 or 0 that's stored. When all 121 tests pass and every check is clean, commit with a message that mentions **won**.

```hints
nudge: The test for `None` passes already. Why? What does `load_scores` put in `won` when it doesn't read the column at all? And in the app, which value of `game.state` means the game was won?
concept: Add `scores.won` to the `SELECT`, and a fifth name to the unpacking. The column gives 1, 0 or `None`, and `1 is True` is false, so turn it into a `bool`, except when it's `None`, which must stay `None`: a conditional expression (lesson 5.2) does exactly that. In the app, `game.state == GameState.WON` is already a `bool`: pass it as the `Score`'s fifth argument.
shape: In `load_scores`: `SELECT ..., scores.won`, then a comprehension that makes `Score(name, level, points, datetime.fromisoformat(played_at), None if won is None else bool(won))` for each of five names. In `app.py`: one more argument in the `Score(...)` the game saves.
answer: ~~~python
def load_scores(db: sqlite3.Connection) -> list[Score]:
    rows = db.execute(
        """
        SELECT players.name, scores.level, scores.points, scores.played_at, scores.won
        FROM scores JOIN players ON players.id = scores.player_id
        ORDER BY scores.id
        """
    )
    return [
        Score(name, level, points, datetime.fromisoformat(played_at), None if won is None else bool(won))
        for name, level, points, played_at, won in rows
    ]
~~~

and in `breakout/app.py`:

~~~python
            add_score(db, Score(player, level.name, game.score, datetime.now(UTC), game.state == GameState.WON))
~~~

`bool(won)` alone would turn `None` into `False`, and an old score whose result nobody recorded would read as a loss: unknown and "no" are different facts, as "no best yet" and "a best of 0" were in lesson 6.1. The comprehension is split over three lines because it no longer fits on one; the brackets let it run on.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_wins.py" stdout="3 passed" label="True, False and unknown all come back as they were saved"
run ".venv/Scripts/breakout --test-run 10000 --hold auto --scores scores.db" stdout="score=560" label="a won game is saved"
run ".venv/Scripts/python -m sqlite3 scores.db \"SELECT won FROM scores ORDER BY id DESC LIMIT 1\"" stdout="(1,)" label="and recorded as won"
run ".venv/Scripts/python -m pytest -q" stdout="121 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "won"
git-clean
```

## What did we actually learn?

- **A database outlives the code that made it.** The next version of a program must open every file the last versions made.
- **A version number in the file** (`PRAGMA user_version`), so a program knows which design it's opening instead of guessing.
- **Migrations**: every change to the design, in order, each one run once per file. Add new ones; never edit one that has shipped.
- **Each migration in a transaction, with its version number**: completely or not at all, so a failure can be fixed and run again, never leaving a file stuck.
- **New columns for old rows are `NULL`**: data that was never collected can't be migrated in; "unknown" is the honest value.
- **Test migrations against real old files**, kept as test data from the day each design ships.
- **`monkeypatch`** swaps a module's attribute for one test; make new values instead of changing shared ones.

The tools you'll meet later do the same job with more help: **Alembic** for SQLAlchemy (Chapter 37) writes migrations as Python files with an `upgrade` and a `downgrade`, and keeps the version in a table; **Flyway** and **Liquibase** do it in Java; **Entity Framework migrations** in C#. All of them keep an ordered list of changes and a record in the database of which ones it has had. Now you know what they're doing.
