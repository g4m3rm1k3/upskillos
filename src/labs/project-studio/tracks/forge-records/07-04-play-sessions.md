---
reference: optional
title: 7.4 — Play Sessions
runtime: python
run: breakout/__main__.py
---

A score says when a game ended. It doesn't say how long someone sat and played, or which games belong to one evening. That's a **play session**: from starting the game to closing it. A session is a new kind of row, one that's created at the start and **changed** at the end, and asking about sessions needs two things SQL hasn't shown you yet: changing a row that already exists, and a join that keeps the rows with nothing to join to.

## The report so far

**Build:** make sure `breakout/report.py` matches the end of lesson 7.3, the reference answer to its Your turn.

```python file=breakout/report.py
"""Level reports for level designers: how a level's games have gone. Written by a teammate.

usage: python -m breakout.report SCORES_DB                  every level, one line each
       python -m breakout.report SCORES_DB LEVEL            how the level's games have gone
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


def level_table(db: sqlite3.Connection, min_played: int = 1) -> list[str]:
    rows = db.execute(
        """
        SELECT level, COUNT(*), COALESCE(SUM(won), 0), MAX(points), AVG(points)
        FROM scores
        GROUP BY level
        HAVING COUNT(*) >= ?
        ORDER BY level
        """,
        (min_played,),
    )
    return [
        f"{level}: {played} played, {wins} won, best {best}, average {average:.0f}"
        for level, played, wins, best, average in rows
    ]


def forget(db: sqlite3.Connection, level: str) -> int:
    with db:
        return db.execute("DELETE FROM scores WHERE level = ?", (level,)).rowcount


if __name__ == "__main__":
    db = sqlite3.connect(sys.argv[1])
    if len(sys.argv) == 2:
        for line in level_table(db):
            print(line)
    elif "--forget" in sys.argv[3:]:
        print(f"forgot {forget(db, sys.argv[2])} scores")
    else:
        print(report(db, sys.argv[2]))
    db.close()
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="126 passed"
```

## A session is a row, changed later

**Build:** a practice database with sessions in it, and a row changed after it was made.

```powershell
.venv\Scripts\python -m sqlite3 sessions.db
```

Two tables, one player, and two sessions that have started but not ended:

```sql
CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE) STRICT;
CREATE TABLE sessions (id INTEGER PRIMARY KEY, player_id INTEGER NOT NULL REFERENCES players (id), started_at TEXT NOT NULL, ended_at TEXT) STRICT;
INSERT INTO players (name) VALUES ('Mia');
INSERT INTO sessions (player_id, started_at) VALUES (1, '2026-10-05T15:00:00+00:00'), (1, '2026-10-05T17:00:00+00:00');
SELECT * FROM sessions;
```

```text
(1, 1, '2026-10-05T15:00:00+00:00', None)
(2, 1, '2026-10-05T17:00:00+00:00', None)
```

`ended_at` has no `NOT NULL`, so a session can exist before anyone knows when it ends. `NULL` here means "not ended yet". Finding those sessions is lesson 7.3's `IS NULL`, never `= NULL`:

```sql
SELECT id FROM sessions WHERE ended_at = NULL;
SELECT id FROM sessions WHERE ended_at IS NULL;
```

```text
(1,)
(2,)
```

Both sessions, from `IS NULL`; the `= NULL` line printed nothing at all, because a comparison with `NULL` is never true. (The shell shows only the second query's rows: the first had none.)

**Changing a row: `UPDATE`.** The first session ends at 15:45:30:

```sql
UPDATE sessions SET ended_at = '2026-10-05T15:45:30+00:00' WHERE id = 1;
SELECT * FROM sessions;
```

```text
(1, 1, '2026-10-05T15:00:00+00:00', '2026-10-05T15:45:30+00:00')
(2, 1, '2026-10-05T17:00:00+00:00', None)
```

`UPDATE table SET column = value WHERE condition` changes the column in **every row the condition matches**, and leaves the others alone. Here the condition picks one row by its primary key. The `WHERE` is what keeps an `UPDATE` small: without it, the condition is "every row", and `UPDATE sessions SET ended_at = ...` would end every session that has ever existed, at the same moment, with no error. Like `DELETE` in lesson 6.4, an `UPDATE` with no `WHERE` is almost always a bug.

**How long was it?** Times are stored as ISO 8601 text, and text can't be subtracted. **`unixepoch(text)`** turns an ISO 8601 time into a number: the seconds since the start of 1970, in UTC, the usual way computers count time. It's SQLite's own function (other databases have their own), and it arrived in SQLite 3.38, in 2022. The SQLite inside your Python is what counts: `.venv\Scripts\python -c "import sqlite3; print(sqlite3.sqlite_version)"`. On anything older, `strftime('%s', text)` does the same job.

```sql
SELECT id, unixepoch(started_at), unixepoch(ended_at) FROM sessions;
SELECT id, unixepoch(ended_at) - unixepoch(started_at) FROM sessions;
SELECT id, (unixepoch(ended_at) - unixepoch(started_at)) / 60 FROM sessions;
```

```text
(1, 1791212400, 1791215130)
(2, 1791219600, None)

(1, 2730)
(2, None)

(1, 45)
(2, None)
```

Traced for session 1: 1791215130 − 1791212400 = 2730 seconds, and 2730 / 60 = 45. For session 2, `unixepoch(NULL)` is `NULL`, and arithmetic with `NULL` gives `NULL`: a session that hasn't ended has no length yet.

```predict
question: 2730 seconds is 45½ minutes. Why did SQL say 45?
choice: SQLite always rounds down
choice: Both numbers are integers, so `/` gives a whole number and drops the rest
choice: unixepoch only counts whole minutes
answer: Both numbers are integers, so `/` gives a whole number and drops the rest
explain: In SQL, as in many languages, dividing an integer by an integer gives an integer: the remainder is thrown away. `2730 / 60` is 45, and `2730 / 60.0` is 45.5, because one side is a real number. Python is the exception you know: there, `/` always gives a float, and `//` is the whole-number division. For "minutes played", dropping the half minute is what we want; for an average it would be a bug.
```

Leave the shell open for the next step.

```check
run ".venv/Scripts/python -m sqlite3 sessions.db \"SELECT id, ended_at FROM sessions ORDER BY id\"" stdout="(1, '2026-10-05T15:45:30+00:00')" label="session 1 has ended"
run ".venv/Scripts/python -m sqlite3 sessions.db \"SELECT ended_at FROM sessions WHERE id = 2\"" stdout="(None,)" label="session 2 is still going: the UPDATE changed only one row"
```

## Every session, even the empty ones

**Build:** scores that belong to sessions, and a question about every session.

Still in the shell on `sessions.db`:

```sql
CREATE TABLE scores (id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions (id), points INTEGER NOT NULL) STRICT;
INSERT INTO scores (session_id, points) VALUES (1, 100), (1, 200);
SELECT sessions.id, scores.points FROM sessions JOIN scores ON scores.session_id = sessions.id;
```

```text
(1, 100)
(1, 200)
```

Session 2 is missing. A `JOIN` (lesson 7.1) makes a row for each **pair** that matches the `ON` condition, and session 2 has no scores to pair with, so it makes no row at all. For "how many games in each session?", a session with no games should say 0, not vanish.

**`LEFT JOIN`** keeps every row of the table on its left (the one after `FROM`), even with no match. Where there is no match, the right table's columns are `NULL`:

```sql
SELECT sessions.id, scores.points FROM sessions LEFT JOIN scores ON scores.session_id = sessions.id;
```

```text
(1, 100)
(1, 200)
(2, None)
```

Traced:

```text
session   scores whose session_id matches   JOIN gives            LEFT JOIN gives
1         100, 200                          (1, 100), (1, 200)    (1, 100), (1, 200)
2         none                              nothing               (2, None)
```

Now count the games in each session:

```predict
question: `SELECT sessions.id, COUNT(*), COUNT(scores.id) FROM sessions LEFT JOIN scores ON scores.session_id = sessions.id GROUP BY sessions.id`. For session 2, what are `COUNT(*)` and `COUNT(scores.id)`?
choice: 0 and 0
choice: 1 and 0
choice: 1 and 1
answer: 1 and 0
explain: The `LEFT JOIN` made one row for session 2, `(2, None)`, so its group has one row, and `COUNT(*)` counts rows: 1. `COUNT(scores.id)` counts only the rows where `scores.id` isn't `NULL` (lesson 7.3), and in that one row it is `NULL`: 0. So after a `LEFT JOIN`, count a column from the right-hand table, never `*`, or every empty session claims one game.
```

```sql
SELECT sessions.id, COUNT(*), COUNT(scores.id) FROM sessions LEFT JOIN scores ON scores.session_id = sessions.id GROUP BY sessions.id;
```

```text
(1, 2, 2)
(2, 1, 0)
```

**One trap with `LEFT JOIN`.** Ask for sessions with a big score, putting the condition in `WHERE`, then in `ON`:

```sql
SELECT sessions.id, scores.points FROM sessions LEFT JOIN scores ON scores.session_id = sessions.id WHERE scores.points > 150;
SELECT sessions.id, scores.points FROM sessions LEFT JOIN scores ON scores.session_id = sessions.id AND scores.points > 150;
```

```text
(1, 200)
(1, 200)
(2, None)
```

The first query lost session 2. `WHERE` runs after the join, on its rows, and session 2's row has `scores.points` `NULL`, and `NULL > 150` is never true, so `WHERE` dropped it: the `LEFT JOIN` turned back into a plain `JOIN`, with no error. The second puts the condition in the `ON`, which decides which scores **pair** with each session; session 2 still gets its row of `NULL`s. A condition on the right-hand table of a `LEFT JOIN` belongs in its `ON`, unless you mean to drop the empty rows.

Type `.quit` to leave the shell.

```check
run ".venv/Scripts/python -m sqlite3 sessions.db \"SELECT sessions.id, COUNT(scores.id) FROM sessions LEFT JOIN scores ON scores.session_id = sessions.id GROUP BY sessions.id\"" stdout="(2, 0)" label="the empty session is counted, with 0 games"
```

## A table for sessions

**Build:** migration 3: a sessions table, and scores that can belong to one.

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
    # 3: play sessions. Scores saved before sessions existed belong to none: their session_id is NULL.
    """
    CREATE TABLE sessions (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        started_at TEXT NOT NULL,
        ended_at TEXT
    ) STRICT;
    ALTER TABLE scores ADD COLUMN session_id INTEGER REFERENCES sessions (id);
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
        SELECT players.name, scores.level, scores.points, scores.played_at, scores.won
        FROM scores JOIN players ON players.id = scores.player_id
        ORDER BY scores.id
        """
    )
    return [
        Score(name, level, points, datetime.fromisoformat(played_at), None if won is None else bool(won))
        for name, level, points, played_at, won in rows
    ]


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

**Understand.** Migration 3 goes at the end of the list (lesson 7.2's rule: add, never edit). It makes the `sessions` table from the practice, and adds a `session_id` column to `scores`, a foreign key to a session (lesson 7.1).

`session_id` can be `NULL`, and must be. Every score saved before this migration has no session, so the new column is `NULL` in every old row: "not part of any session we know about". SQLite enforces that too, when foreign keys are on and the table already has rows: then a `REFERENCES` column added by `ALTER TABLE` must have `NULL` as its default, because a default of 1 would point every old score at a session that may not exist. (`ALTER TABLE ... ADD COLUMN bad INTEGER REFERENCES sessions (id) DEFAULT 1` fails with `Cannot add a REFERENCES column with non-NULL default value`.)

Opening your `scores.db` runs migration 3 on it, inside its transaction:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())"
```

```text
(3,)
```

```check
contains breakout/scores.py "ALTER TABLE scores ADD COLUMN session_id INTEGER REFERENCES sessions (id);"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())\"" stdout="(3,)" label="your scores.db is at version 3"
run ".venv/Scripts/python -m sqlite3 scores.db \"SELECT COUNT(*) FROM scores WHERE session_id IS NULL\"" label="old scores belong to no session"
```

## Starting and ending a session

**Build:** a function that starts a session and gives back its id, and one that ends it.

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
    # 3: play sessions. Scores saved before sessions existed belong to none: their session_id is NULL.
    """
    CREATE TABLE sessions (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        started_at TEXT NOT NULL,
        ended_at TEXT
    ) STRICT;
    ALTER TABLE scores ADD COLUMN session_id INTEGER REFERENCES sessions (id);
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


def start_session(db: sqlite3.Connection, player: str, when: datetime) -> int:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (player,))
        cursor = db.execute(
            "INSERT INTO sessions (player_id, started_at) SELECT id, ? FROM players WHERE name = ?",
            (when.isoformat(), player),
        )
    assert cursor.lastrowid is not None
    return cursor.lastrowid


def end_session(db: sqlite3.Connection, session: int, when: datetime) -> None:
    with db:
        db.execute("UPDATE sessions SET ended_at = ? WHERE id = ?", (when.isoformat(), session))


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
        SELECT players.name, scores.level, scores.points, scores.played_at, scores.won
        FROM scores JOIN players ON players.id = scores.player_id
        ORDER BY scores.id
        """
    )
    return [
        Score(name, level, points, datetime.fromisoformat(played_at), None if won is None else bool(won))
        for name, level, points, played_at, won in rows
    ]


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

**Understand.** `start_session` does what `add_score` does for a score (lesson 7.1): the player is added if they're new, then the session is inserted with the player's id from a `SELECT`. The new thing is getting the session's **id** back, so the game can end that session later and attach scores to it.

**`cursor.lastrowid`** is the id of the row the connection inserted most recently. SQLite chose the id itself (lesson 6.3: an `INTEGER PRIMARY KEY` left out is given the next number), and `lastrowid` is how you find out which. Try it, and see where it can mislead you:

```powershell
.venv\Scripts\python -c "import sqlite3; db = sqlite3.connect(':memory:'); db.execute('CREATE TABLE t (x INTEGER)'); c = db.execute('INSERT INTO t VALUES (1)'); print(c.lastrowid, c.rowcount); c = db.execute('INSERT INTO t SELECT 2 WHERE 1 = 0'); print(c.lastrowid, c.rowcount)"
```

```text
1 1
1 0
```

The first `INSERT` added one row (`rowcount` 1), id 1. The second inserted **nothing**: its `SELECT ... WHERE 1 = 0` finds no rows (lesson 7.1's zero-row `INSERT ... SELECT`). (`SELECT 2` with no `FROM` makes one row holding 2; `WHERE 1 = 0` is never true, so not even that one is kept.) But `lastrowid` still says 1, because nothing newer was inserted on that connection. Code that trusted it would carry on with someone else's id. In `start_session` this can't happen: the first statement makes sure the player exists, so the `SELECT` always finds exactly one player, and the `INSERT` always adds one row. (SQLite 3.35 and later also offer `INSERT ... RETURNING id`, which hands back the new row's id as the result of the `INSERT` itself, so there's nothing to go stale. This lesson uses `lastrowid` because it's what you'll see in most existing Python code; `RETURNING` is the neater habit.)

**`assert cursor.lastrowid is not None`.** In Python's type information, `lastrowid` is `int | None`, since it's `None` on a connection that has never inserted anything. `start_session` promises an `int`, and pyright won't allow returning something that might be `None`. `assert` (lesson 3.4's invariants) states the fact we know, a row was just inserted, and pyright then treats `lastrowid` as an `int` after it. If it were ever false, the program would stop right there with `AssertionError`, not return a `None` that fails somewhere far away. One rule for `assert`: Python started with `-O` (optimise) skips every `assert`, so an `assert` may state a fact for the reader and the type checker, never do something the program needs done. You'll also notice `start_session` begins with the same player upsert as `add_score`: two copies of one idea, which the last challenge removes.

`end_session` is the practice step's `UPDATE`, with placeholders: one row, picked by the session's id.

```check
contains breakout/scores.py "def start_session(db: sqlite3.Connection, player: str, when: datetime) -> int:"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); from breakout.scores import start_session; print(start_session(db, 'Mia', datetime.now(UTC)), start_session(db, 'Mia', datetime.now(UTC)))\"" stdout="1 2" label="each session gets the next id"
```

## A score belongs to its session

**Build:** `add_score` records which session a score was made in.

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
    # 3: play sessions. Scores saved before sessions existed belong to none: their session_id is NULL.
    """
    CREATE TABLE sessions (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        started_at TEXT NOT NULL,
        ended_at TEXT
    ) STRICT;
    ALTER TABLE scores ADD COLUMN session_id INTEGER REFERENCES sessions (id);
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


def start_session(db: sqlite3.Connection, player: str, when: datetime) -> int:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (player,))
        cursor = db.execute(
            "INSERT INTO sessions (player_id, started_at) SELECT id, ? FROM players WHERE name = ?",
            (when.isoformat(), player),
        )
    assert cursor.lastrowid is not None
    return cursor.lastrowid


def end_session(db: sqlite3.Connection, session: int, when: datetime) -> None:
    with db:
        db.execute("UPDATE sessions SET ended_at = ? WHERE id = ?", (when.isoformat(), session))


def add_score(db: sqlite3.Connection, score: Score, session: int | None = None) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at, won, session_id) "
            "SELECT id, ?, ?, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.won, session, score.player),
        )


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


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

**Understand.** `session: int | None = None`: a third parameter with a default, so every existing call, `add_score(db, score)`, still works and saves a score that belongs to no session. That's the same backwards-compatible change as `won` in lesson 7.2. The `INSERT` gets a sixth column and a sixth placeholder. Placeholders are filled in order, so `session` goes in the tuple where `session_id` is in the column list: fifth, after `score.won`, with `score.player` still last for the `WHERE`.

A score can only point at a session that exists: `session_id` is a foreign key, and `open_scores` turned foreign keys on in lesson 7.1. Saving a score with session 99 fails with `FOREIGN KEY constraint failed`.

```check
contains breakout/scores.py "session: int | None = None"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); from breakout.scores import Score, add_score, start_session; s = start_session(db, 'Mia', datetime.now(UTC)); add_score(db, Score('Mia', 'Classic', 10, datetime.now(UTC)), s); print(db.execute('SELECT session_id FROM scores').fetchone())\"" stdout="(1,)" label="a score remembers its session"
```

## The app plays in sessions

**Build:** each run of the game is one session.

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
            add_score(db, score, session)
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

**Understand.** Three places change:

1. After the database opens, `start_session` starts this run's session, inside the same `try`: if the database can't be used, there's no session either, and `session` stays `None`.
2. Each finished game is saved with `session`. The `Score` is made on its own line first, because with three arguments the call was too long for one.
3. After the loop, before the database closes, the session is ended with the time the player closed the game. `if session is not None` is needed because `session` is `None` whenever there's no database, and `end_session` needs a real id.

Traced for one evening:

```text
start the game          open_scores, then start_session → session 4 (ended_at NULL)
win a game              add_score(..., 4)
lose a game             add_score(..., 4)
close the window        end_session(db, 4, now) → ended_at set; db.close()
```

If the game crashes, step 4 never happens, and the session stays `NULL` in `ended_at`. The data says exactly that: the session never ended properly. The challenges come back to it.

```powershell
.venv\Scripts\breakout --test-run 600 --hold auto --scores scores.db
.venv\Scripts\python -m sqlite3 scores.db "SELECT id, ended_at IS NOT NULL FROM sessions ORDER BY id DESC LIMIT 1"
```

The last line prints the newest session's id and `1`: `ended_at IS NOT NULL` is a condition, and SQL shows true as 1. The test run ended normally, so the session did too. A session starts when the game opens, whether or not a game is played: one with 0 games is still a session, someone opened the game. Lesson 7.3's `HAVING` could leave them out of a report if a designer wanted.

```check
contains breakout/app.py "start_session(db, player, datetime.now(UTC))"
run ".venv/Scripts/breakout --test-run 600 --hold auto --scores scores.db" stdout="frames=600"
run ".venv/Scripts/python -m sqlite3 scores.db \"SELECT ended_at IS NOT NULL FROM sessions ORDER BY id DESC LIMIT 1\"" stdout="(1,)" label="the run's session was started and ended"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="11 passed" label="games without --scores play exactly as before"
```

## Tests for sessions

**Build:** tests for what a session records.

```python file=tests/test_sessions.py
"""What a play session records."""

import sqlite3
from datetime import UTC, datetime

from breakout.scores import Score, add_score, end_session, start_session

START = datetime(2026, 10, 5, 15, 0, 0, tzinfo=UTC)
END = datetime(2026, 10, 5, 15, 45, 30, tzinfo=UTC)


def test_a_session_starts_with_no_end(db: sqlite3.Connection):
    session = start_session(db, "Mia", START)
    row = db.execute("SELECT started_at, ended_at FROM sessions WHERE id = ?", (session,)).fetchone()
    assert row == ("2026-10-05T15:00:00+00:00", None)


def test_ending_a_session_records_when(db: sqlite3.Connection):
    session = start_session(db, "Mia", START)
    end_session(db, session, END)
    (ended,) = db.execute("SELECT ended_at FROM sessions WHERE id = ?", (session,)).fetchone()
    assert ended == "2026-10-05T15:45:30+00:00"


def test_each_session_gets_its_own_id(db: sqlite3.Connection):
    assert start_session(db, "Mia", START) != start_session(db, "Mia", END)


def test_a_score_remembers_its_session(db: sqlite3.Connection):
    session = start_session(db, "Mia", START)
    add_score(db, Score("Mia", "Classic", 100, START), session)
    add_score(db, Score("Mia", "Castle", 50, START))
    rows = db.execute("SELECT level, session_id FROM scores ORDER BY id").fetchall()
    assert rows == [("Classic", session), ("Castle", None)]
```

**Understand.** Each test uses the `db` fixture (lesson 6.5), so each starts from an empty, fully migrated database. The tests read the `sessions` table directly with SQL, because nothing in `scores.py` returns a session's times: the tests check what's **stored**, which is what the next program to open the file will see. `test_a_score_remembers_its_session` saves one score with a session and one without, and checks both, so it would catch `session_id` being put in the wrong place in the `INSERT`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_sessions.py" stdout="4 passed"
run ".venv/Scripts/python -m pytest -q" stdout="130 passed"
```

## Your turn: how long did I play?

**Build, on your own:** `sessions_report(db, player)` in `breakout/report.py`: a line for each of a player's sessions, with how long it lasted and how many games were played in it.

Click **Create provided tests/test_playtime.py**: the request, written as tests.

```python file=tests/test_playtime.py provided
"""A player's request, written as tests: how long did I play, and how many games?"""

import sqlite3
from datetime import UTC, datetime

from breakout.report import sessions_report
from breakout.scores import Score, add_score, end_session, start_session


def at(hour: int, minute: int, second: int = 0) -> datetime:
    return datetime(2026, 10, 5, hour, minute, second, tzinfo=UTC)


def test_each_session_with_its_length_and_games(db: sqlite3.Connection):
    long = start_session(db, "Mia", at(15, 0))
    add_score(db, Score("Mia", "Classic", 100, at(15, 10)), long)
    add_score(db, Score("Mia", "Classic", 200, at(15, 30)), long)
    end_session(db, long, at(15, 45, 30))
    short = start_session(db, "Mia", at(17, 0))
    end_session(db, short, at(17, 5))
    assert sessions_report(db, "Mia") == [
        "2026-10-05T15:00:00+00:00: 45 minutes, 2 played",
        "2026-10-05T17:00:00+00:00: 5 minutes, 0 played",
    ]


def test_a_session_that_has_not_ended_is_still_going(db: sqlite3.Connection):
    now = start_session(db, "Mia", at(18, 0))
    add_score(db, Score("Mia", "Castle", 50, at(18, 5)), now)
    assert sessions_report(db, "Mia") == ["2026-10-05T18:00:00+00:00: still going, 1 played"]


def test_only_that_players_sessions_are_listed(db: sqlite3.Connection):
    start_session(db, "Sam", at(9, 0))
    assert sessions_report(db, "Mia") == []
```

| Session | Line |
|---|---|
| ended, 45½ minutes, 2 games | `2026-10-05T15:00:00+00:00: 45 minutes, 2 played` |
| ended, no games | `2026-10-05T17:00:00+00:00: 5 minutes, 0 played` |
| not ended | `2026-10-05T18:00:00+00:00: still going, 1 played` |

One query does it all: the player's sessions, the games in each (including none), and each length in whole minutes. Sessions come out in the order they started. When all 133 tests pass and every check is clean, including `ruff format --check .`, commit with a message that mentions **session**.

```hints
nudge: Which kind of join keeps a session that has no games? And after that join, which count gives 0 for it?
concept: Start `FROM sessions`, `JOIN players` to find the player by name (`WHERE players.name = ?`), and `LEFT JOIN scores ON scores.session_id = sessions.id` so sessions with no games stay. `GROUP BY sessions.id` makes one row per session; `COUNT(scores.id)`, not `COUNT(*)`, counts its games. The length is `(unixepoch(sessions.ended_at) - unixepoch(sessions.started_at)) / 60`: whole minutes, and `NULL` while the session is still going, which reaches Python as `None`. A conditional expression (lesson 5.2) chooses between `"still going"` and `f"{minutes} minutes"`.
shape: A function with `rows = db.execute("""SELECT sessions.started_at, <length>, COUNT(scores.id) FROM sessions JOIN players ... LEFT JOIN scores ... WHERE ... GROUP BY sessions.id ORDER BY sessions.started_at""", (player,))`, then a list comprehension making one line per row from three names.
answer: ~~~python
def sessions_report(db: sqlite3.Connection, player: str) -> list[str]:
    rows = db.execute(
        """
        SELECT sessions.started_at,
               (unixepoch(sessions.ended_at) - unixepoch(sessions.started_at)) / 60,
               COUNT(scores.id)
        FROM sessions
        JOIN players ON players.id = sessions.player_id
        LEFT JOIN scores ON scores.session_id = sessions.id
        WHERE players.name = ?
        GROUP BY sessions.id
        ORDER BY sessions.started_at
        """,
        (player,),
    )
    return [
        f"{started}: {'still going' if minutes is None else f'{minutes} minutes'}, {games} played"
        for started, minutes, games in rows
    ]
~~~

The f-string has another f-string inside it: the conditional expression picks either the plain text `'still going'` or the f-string `f'{minutes} minutes'`, and the outer f-string puts whichever it picked in place. Since Python 3.12, the inner one may use the same quotes as the outer; here it uses single quotes, which works in every version. If that's hard to read, a small helper function that returns the length text is just as good. Why may `sessions.started_at` and the length sit next to `GROUP BY sessions.id`, when lesson 7.3 called columns that aren't grouped a mistake? Because of 7.3's exception: the groups are made by `sessions.id`, a primary key, so every row in a group comes from the same session, and its `started_at` and `ended_at` have exactly one value per group. `GROUP BY sessions.id, sessions.started_at, sessions.ended_at` would give the same answer, and says so out loud, if you prefer. The order of the joins matters for reading, not for the result: the `JOIN players` finds whose sessions they are, and the `LEFT JOIN scores` brings each session's games, or a row of `NULL`s.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_playtime.py" stdout="3 passed" label="lengths, games and unfinished sessions, for that player only"
run ".venv/Scripts/python -m pytest -q" stdout="133 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "session"
git-clean
```

## Challenge: sessions that never ended

**Optional, ★★.** A session whose game crashed keeps `ended_at` as `NULL` for ever, and `sessions_report` will say "still going" about something that stopped days ago. When the game starts, any session of this player that is still open can't really be running (only one game runs at a time on one computer). Close each one, with `ended_at` set to the time of its **last score**, or its start if it has none: that's the latest moment we know the player was there. Write it test-first: a test with an open session and two scores, then `start_session` (or a new function it calls) that closes it. You'll need an `UPDATE` whose new value comes from a `SELECT`: `UPDATE sessions SET ended_at = (SELECT MAX(played_at) FROM scores WHERE ...) WHERE ...`, a **subquery**, and `COALESCE` (lesson 7.3) for a session with no scores.

## Challenge: the longest session

**Optional, ★.** Add `python -m breakout.report SCORES_DB --longest PLAYER` to the report tool: it prints the player's longest finished session, its length in minutes and its games. One query, using `ORDER BY` on the length, `DESC`, and `LIMIT 1` (lesson 6.3). What should it print for a player with no finished sessions? Decide, and write a test for that case too.

## Challenge: one way to find a player

**Optional, ★★.** `add_score` and `start_session` both start with the same upsert and lookup of the player. Extract `player_id(db, name) -> int` (the upsert, then `SELECT id`), use it in both, and change no test: the 133 tests are your safety net, as in lesson 3.3's refactors. On a branch.

## What did we actually learn?

- **`UPDATE ... SET ... WHERE`** changes rows that exist; the `WHERE` decides which. Without it, every row changes.
- **A row's life**: created at the start (`ended_at` `NULL`), completed later. `NULL` can mean "not yet".
- **`LEFT JOIN`** keeps every row on the left, with `NULL`s where nothing matched; count a right-hand column, not `*`.
- **Integer division** drops the remainder in SQL; Python's `/` doesn't, `//` does.
- **`lastrowid`** is the id SQLite just chose, and only means something if a row really was inserted: check `rowcount`, or make sure the insert can't come up empty.
- **`assert`** to state a fact the type checker can't know, and fail loudly if it's ever false.
- **Defaults keep old callers working** when a function grows a parameter.

C# and Java have the same pieces: an `UPDATE` with parameters, `LEFT JOIN` in SQL or LINQ's `GroupJoin`/`DefaultIfEmpty`, and the new row's id from `SCOPE_IDENTITY()` in SQL Server, `RETURNING id` in PostgreSQL (and in SQLite since 3.35), or JDBC's `getGeneratedKeys()`.
