---
reference: optional
title: 7.7 — Two Writes at Once
runtime: python
run: breakout/__main__.py
---

So far one program at a time has used each database. That won't last: the report tool can run while a game is open, and two copies of the game can be started on one computer. A database file shared by several programs needs rules about who may change it when, and SQLite has them: **locks**. This lesson opens two connections to one file, watches them wait for each other, finds a real bug that two copies of the game opening an old file at the same moment would hit, fixes it, and switches the scores database to the mode that lets reading and writing happen together.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 7.6, the reference answer to its Your turn.

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
    # 4: a score in a session must be the session's player's (lesson 7.5). SQLite can't add a rule to a table
    # that exists, so scores is rebuilt: a new table with the rule, every row copied in, the old one replaced.
    """
    UPDATE scores SET session_id = NULL
    WHERE session_id IS NOT NULL
      AND player_id <> (SELECT player_id FROM sessions WHERE sessions.id = scores.session_id);
    CREATE UNIQUE INDEX sessions_id_player ON sessions (id, player_id);
    CREATE TABLE scores_new (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        level TEXT NOT NULL,
        points INTEGER NOT NULL CHECK (points >= 0),
        played_at TEXT NOT NULL,
        won INTEGER CHECK (won IN (0, 1)),
        session_id INTEGER,
        FOREIGN KEY (session_id, player_id) REFERENCES sessions (id, player_id)
    ) STRICT;
    INSERT INTO scores_new (id, player_id, level, points, played_at, won, session_id)
    SELECT id, player_id, level, points, played_at, won, session_id FROM scores;
    DROP TABLE scores;
    ALTER TABLE scores_new RENAME TO scores;
    """,
    # 5: indexes for the questions the game asks (lesson 7.6): each level's best, and a player's scores.
    """
    CREATE INDEX scores_level_points ON scores (level, points);
    CREATE INDEX scores_player ON scores (player_id);
    """,
    # 6: indexes for a player's sessions and each session's scores (lesson 7.6's Your turn).
    """
    CREATE INDEX sessions_player ON sessions (player_id);
    CREATE INDEX scores_session ON scores (session_id);
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

```check
run ".venv/Scripts/python -m pytest -q" stdout="142 passed"
```

## Two connections, one file

**Build:** nothing in the project. Two connections to one practice file, in one REPL, standing in for two programs.

Each `sqlite3.connect` is a separate connection, exactly as if two different programs had opened the file, so one Python session can show what two programs see. Start the REPL in your `forge` folder:

```text
>>> import sqlite3
>>> setup = sqlite3.connect("scratch/locks.db")
>>> setup.execute("CREATE TABLE t (x INTEGER)")
<sqlite3.Cursor object at 0x...>
>>> setup.close()
>>> a = sqlite3.connect("scratch/locks.db", timeout=0)
>>> b = sqlite3.connect("scratch/locks.db", timeout=1)
>>> a.execute("INSERT INTO t VALUES (1)")
<sqlite3.Cursor object at 0x...>
>>> b.execute("SELECT COUNT(*) FROM t").fetchone()
(0,)
>>> b.execute("INSERT INTO t VALUES (2)")
Traceback (most recent call last):
  ...
sqlite3.OperationalError: database is locked
>>> b.rollback()
>>> a.commit()
>>> b.execute("SELECT COUNT(*) FROM t").fetchone()
(1,)
```

Traced:

```text
A: INSERT 1          A's transaction begins (lesson 6.3), and A takes the file's write lock
B: SELECT COUNT(*)   (0,): B can read, but sees only what's committed; A's row isn't, yet
B: INSERT 2          B needs the write lock, and A has it: B waits up to its timeout, 1 second,
                     then gives up with "database is locked"
A: commit            A's row is saved, and the write lock is free
B: SELECT COUNT(*)   (1,): now B sees it
```

- **One writer at a time.** SQLite has one **write lock** per database file. A connection takes it when its transaction first changes something, and keeps it until the transaction commits or rolls back. While one connection has it, no other can write. That's how two programs can't interleave half of one change with half of another.
- **Not seeing what isn't committed.** B never saw A's row while A could still roll it back. Each connection sees the database as of its last commit: a transaction's changes are **isolated** until they're committed.
- **The timeout.** `timeout=` is how long a connection waits for a lock before giving up: SQLite's **busy timeout**. Python's default is 5 seconds; `0` means "don't wait at all". The game's transactions take milliseconds, so a 5-second wait covers almost any clash. A program that keeps a transaction open for a long time, though, makes everyone else wait, and eventually fail.
- `b.rollback()`: B's failed `INSERT` had already begun a transaction for B, and it has to be ended before B can do anything else.

Keep the REPL open for the next step.

## A reader in the way

**Build:** nothing in the project. A read that stops a write.

Still in the REPL. This time B begins a transaction and reads, and is still reading, the way the report tool is in the middle of its work, when A tries to save:

```text
>>> b.execute("BEGIN")
<sqlite3.Cursor object at 0x...>
>>> b.execute("SELECT COUNT(*) FROM t").fetchone()
(1,)
>>> a.execute("INSERT INTO t VALUES (3)")
<sqlite3.Cursor object at 0x...>
>>> a.commit()
Traceback (most recent call last):
  ...
sqlite3.OperationalError: database is locked
>>> b.rollback()
>>> a.commit()
```

A could **start** its change while B was reading, but not **commit** it. Lesson 6.3's rollback journal explains why: to commit, SQLite writes the changed parts of the database file **in place**, after saving the old parts in `locks.db-journal`. Changing the file under a reader in the middle of reading would show the reader half old and half new data. So a commit waits until no one is reading, and with `timeout=0`, A didn't wait. Once B's read ended, the commit went through.

For the game, that means: while the report tool reads a big database, a game that finishes can't save its score. With a reader that takes longer than 5 seconds, the save fails.

## A log written ahead

**Build:** nothing in the project. The other way SQLite can keep its changes.

Still in the REPL:

```text
>>> a.execute("PRAGMA journal_mode = WAL").fetchone()
('wal',)
>>> b.execute("BEGIN")
<sqlite3.Cursor object at 0x...>
>>> b.execute("SELECT COUNT(*) FROM t").fetchone()
(2,)
>>> a.execute("INSERT INTO t VALUES (4)")
<sqlite3.Cursor object at 0x...>
>>> a.commit()
>>> b.execute("SELECT COUNT(*) FROM t").fetchone()
(2,)
>>> b.commit()
>>> b.execute("SELECT COUNT(*) FROM t").fetchone()
(3,)
```

A committed while B was reading. **WAL**, the **write-ahead log**, turns the journal around: instead of copying the old data aside and changing the database in place, SQLite leaves the database file alone and **appends** each committed change to a second file, `locks.db-wal`. A reader that started earlier keeps reading the old pages it began with, so it sees one consistent moment (B's count stayed at 2 until B's transaction ended), and a writer never has to wait for readers. From time to time, when no one needs the old pages, SQLite copies the log's changes into the database file: a **checkpoint**.

- **Readers don't block the writer, and the writer doesn't block readers.** There's still only one writer at a time: two writers still wait for each other, as in the first step.
- The mode is stored **in the file**: unlike lesson 7.1's `foreign_keys`, which each connection must ask for, `journal_mode = WAL` lasts until someone changes it back, for every program that opens the file.
- While the database is open, there are two files beside it, `locks.db-wal` and `locks.db-shm` (a small index of the log that the connections share). When the last connection closes, SQLite checkpoints and deletes them.
- WAL needs every program using the file to be on the same computer; it doesn't work on a network drive. For a game's scores, that's no limit.

Type `exit()` to close the REPL.

```check
run ".venv/Scripts/python -m sqlite3 scratch/locks.db \"PRAGMA journal_mode\"" stdout="('wal',)" label="locks.db keeps its write-ahead log setting"
```

## Files beside the database

**Build:** keep SQLite's temporary files out of Git.

`scores.db-journal`, `scores.db-wal` and `scores.db-shm` can appear beside your `scores.db` while a program has it open, and none of them should ever be committed: they're part of a database that's already ignored. `*.db` doesn't match them, because their names end in `-journal`, `-wal` and `-shm`, not `.db`.

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/

# Your own experiments (lesson 1.1's scratch files): kept, never part of the project
scratch/

# Generated: package metadata, written by pip install -e .
*.egg-info/

# Generated: coverage data, written by pytest --cov
.coverage
.coverage.*

# Scores saved by games you test by hand, and databases you practise SQL in
scores.json
*.db

# Generated: files SQLite keeps beside a database while it's open (lesson 7.7)
*.db-journal
*.db-wal
*.db-shm
```

```check
run "git check-ignore -q scores.db-wal" label="SQLite's write-ahead log is ignored"
run "git check-ignore -q scores.db-journal" label="and its rollback journal"
```

## Two games, one old file

**Build:** nothing in the project. Two copies of the game opening an old file, stepped through by hand.

`migrate` (lesson 7.2) reads the file's version, then runs each migration after it. Imagine two copies of the game started at the same moment on a file at version 3: a player double-clicked, or the game and the report tool both opened it. Each runs `migrate`. This scratch script plays their steps in the one order that goes wrong, by hand, so it happens every time. Make `scratch/race.py`:

```python
"""Two copies of the game open the same old file at the same moment, stepped through by hand."""

import sqlite3
from pathlib import Path

from breakout.scores import MIGRATIONS

path = Path("scratch/race.db")
path.unlink(missing_ok=True)
old = sqlite3.connect(path)
for number in range(1, 4):
    old.executescript(f"BEGIN; {MIGRATIONS[number - 1]} PRAGMA user_version = {number}; COMMIT;")
old.close()

a = sqlite3.connect(path)
b = sqlite3.connect(path)
(a_version,) = a.execute("PRAGMA user_version").fetchone()
(b_version,) = b.execute("PRAGMA user_version").fetchone()
print(f"A reads version {a_version}, B reads version {b_version}")
a.executescript(f"BEGIN; {MIGRATIONS[3]} PRAGMA user_version = 4; COMMIT;")
print("A runs migration 4")
b.executescript(f"BEGIN; {MIGRATIONS[3]} PRAGMA user_version = 4; COMMIT;")
print("B runs migration 4")
```

The setup builds an old file by running migrations 1 to 3 on it, as lesson 7.4's code would have left it. Then A and B each do what `migrate` does: read the version, then run the next migration.

```predict
question: Both copies read version 3. A runs migration 4 and commits. Then B runs migration 4. What happens?
choice: Nothing: B's migration changes nothing that A hasn't already changed
choice: B's migration fails
choice: B waits for A, then skips it
answer: B's migration fails
explain: B decided what to do from a version it read **before** A changed it. By the time B acts, migration 4 has already run, and its first statement that can't be repeated, `CREATE UNIQUE INDEX sessions_id_player`, fails because the index exists. B's migration rolls back, B's `open_scores` raises, and that copy of the game plays without keeping scores, with a message that makes no sense to a player.
```

```powershell
.venv\Scripts\python scratch\race.py
```

```text
A reads version 3, B reads version 3
A runs migration 4
Traceback (most recent call last):
  ...
sqlite3.OperationalError: index sessions_id_player already exists
```

This is a **race condition**: a bug that depends on the order two programs happen to do things in. Read the version, then act on it: between the two, the world changed. The pattern has a name, **check-then-act**, and it's wrong whenever something else can act in the gap. Here the gap is milliseconds, so the bug would show up rarely, which is what makes race conditions so hard to find: Chapter 25 meets them again with threads.

```check
run ".venv/Scripts/python scratch/race.py" exit=1 stderr="already exists" label="the second copy repeats a migration the first one ran"
```

## Take the lock, then look

**Build:** `migrate` takes the write lock before it reads the version.

The fix is to close the gap: take the write lock **first**, then read the version and run the migration, all in one transaction. While A holds the lock, B can't start its own; when A commits, B gets the lock and reads the version A left: 4, so it moves on to the next migration.

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
    # 4: a score in a session must be the session's player's (lesson 7.5). SQLite can't add a rule to a table
    # that exists, so scores is rebuilt: a new table with the rule, every row copied in, the old one replaced.
    """
    UPDATE scores SET session_id = NULL
    WHERE session_id IS NOT NULL
      AND player_id <> (SELECT player_id FROM sessions WHERE sessions.id = scores.session_id);
    CREATE UNIQUE INDEX sessions_id_player ON sessions (id, player_id);
    CREATE TABLE scores_new (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        level TEXT NOT NULL,
        points INTEGER NOT NULL CHECK (points >= 0),
        played_at TEXT NOT NULL,
        won INTEGER CHECK (won IN (0, 1)),
        session_id INTEGER,
        FOREIGN KEY (session_id, player_id) REFERENCES sessions (id, player_id)
    ) STRICT;
    INSERT INTO scores_new (id, player_id, level, points, played_at, won, session_id)
    SELECT id, player_id, level, points, played_at, won, session_id FROM scores;
    DROP TABLE scores;
    ALTER TABLE scores_new RENAME TO scores;
    """,
    # 5: indexes for the questions the game asks (lesson 7.6): each level's best, and a player's scores.
    """
    CREATE INDEX scores_level_points ON scores (level, points);
    CREATE INDEX scores_player ON scores (player_id);
    """,
    # 6: indexes for a player's sessions and each session's scores (lesson 7.6's Your turn).
    """
    CREATE INDEX sessions_player ON sessions (player_id);
    CREATE INDEX scores_session ON scores (session_id);
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
    """Bring the database up to the newest design, one migration at a time, each completely or not at all.

    Each migration takes the write lock before it reads the version, so two programs opening an old file at the
    same moment can't both run the same migration: the second waits for the first, then finds it done.
    """
    db.autocommit = True  # from here until the end, the SQL itself says when each transaction begins and ends
    try:
        while True:
            db.execute("BEGIN IMMEDIATE")
            (version,) = db.execute("PRAGMA user_version").fetchone()
            if version >= len(MIGRATIONS):
                db.execute("COMMIT")
                return
            try:
                db.executescript(f"{MIGRATIONS[version]} PRAGMA user_version = {version + 1};")
            except sqlite3.Error:
                db.execute("ROLLBACK")
                raise
            db.execute("COMMIT")
    finally:
        db.autocommit = sqlite3.LEGACY_TRANSACTION_CONTROL


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

**Understand.**

- **`BEGIN IMMEDIATE`** starts a transaction and takes the write lock **at once**. A plain `BEGIN` (lesson 7.2's) is **deferred**: it takes no lock until the transaction first writes, so a version read after a plain `BEGIN` could still be stale. With `IMMEDIATE`, the read happens while this connection is the only one that can change anything, so the version can't change until it commits.
- **One migration per transaction, in a loop.** Each time round: take the lock, read the version, run the one migration after it, set the new version, commit. `MIGRATIONS[version]` is the next migration because lists count from 0: at version 3, `MIGRATIONS[3]` is migration 4. When the version is already the newest, it commits the empty transaction and returns. Re-reading the version every time round means that if another program ran some migrations while this one waited, they're skipped.
- **`db.autocommit = True`.** Lesson 7.2 put `BEGIN;` and `COMMIT;` inside the script because `executescript` commits any open transaction before it starts. That's Python's **legacy transaction control**, the mode `sqlite3` connections start in, where Python begins transactions for you (lesson 6.3). Setting `autocommit = True` turns it off: Python then starts and commits nothing by itself, `executescript` runs inside the transaction `migrate` began, and every `BEGIN`, `COMMIT` and `ROLLBACK` is one this code wrote. **`finally:`** is a third part a `try` can have (after lesson 5.2's `except`): its block runs however the `try` ends, normally, by `return`, or by an exception on its way out. Here it puts the connection back to `sqlite3.LEGACY_TRANSACTION_CONTROL`, so `add_score`'s `with db:` works exactly as before.

See B wait for A instead of repeating its work. `scratch/race.py` left `race.db` at version 4 (A's migration committed; B's rolled back). Make `scratch/wait.py`:

```python
"""Copy A holds the write lock, as if in the middle of a migration; copy B opens the same file."""

import sqlite3
from pathlib import Path

from breakout.scores import migrate

path = Path("scratch/race.db")
a = sqlite3.connect(path, autocommit=True)
a.execute("BEGIN IMMEDIATE")
print("A takes the write lock")
b = sqlite3.connect(path, timeout=1)
try:
    migrate(b)
except sqlite3.OperationalError as error:
    print(f"B, while A holds it: {error}")
a.execute("COMMIT")
print("A commits")
migrate(b)
print(f"B, once A is done: version {b.execute('PRAGMA user_version').fetchone()[0]}")
```

```powershell
.venv\Scripts\python scratch\wait.py
```

```text
A takes the write lock
B, while A holds it: database is locked
A commits
B, once A is done: version 6
```

B gave up after its 1-second timeout because A never finished; with the game's 5-second default and a migration that takes milliseconds, B would simply have waited. Either way, B never acted on a version it read before A was done.

```check
contains breakout/scores.py "BEGIN IMMEDIATE"
run ".venv/Scripts/python scratch/wait.py" stdout="version 6" label="B waits for A, then carries on from where A left the file"
run ".venv/Scripts/python -m pytest -q" stdout="142 passed"
```

## Tests for the order

**Build:** tests that pin down when the version is read.

The race needs two programs and bad luck to happen. The fix doesn't: it's an order of statements, and the trace callback from lesson 7.6 can record it.

```python file=tests/test_locking.py
"""Opening a database takes the write lock before deciding which migrations to run."""

import sqlite3
from pathlib import Path

from breakout import scores
from breakout.scores import migrate, open_scores


def statements_run_by_migrate(path: Path) -> list[str]:
    db = sqlite3.connect(path)
    statements: list[str] = []
    db.set_trace_callback(statements.append)
    migrate(db)
    db.set_trace_callback(None)
    db.close()
    return statements


def test_the_version_is_read_only_after_the_write_lock_is_taken(tmp_path: Path):
    statements = statements_run_by_migrate(tmp_path / "scores.db")
    assert statements[:2] == ["BEGIN IMMEDIATE", "PRAGMA user_version"]


def test_a_database_at_the_newest_version_runs_no_migration(tmp_path: Path):
    open_scores(tmp_path / "scores.db").close()
    statements = statements_run_by_migrate(tmp_path / "scores.db")
    assert statements == ["BEGIN IMMEDIATE", "PRAGMA user_version", "COMMIT"]
    assert len(scores.MIGRATIONS) > 0
```

**Understand.** `statements_run_by_migrate` opens a plain connection, so nothing but `migrate` runs on it, and records every statement. The first test checks that, on a new file, the very first thing `migrate` does is take the lock, and only then read the version. The second checks that on a file that's already up to date, `migrate` does nothing else at all: lock, read, commit. Both would fail on the old `migrate`, which read the version first and never said `BEGIN IMMEDIATE`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_locking.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="144 passed"
```

## Your turn: saving while someone reads

**Build, on your own:** click **Create provided tests/test_readers.py**, then make the scores database keep a write-ahead log.

```python file=tests/test_readers.py provided
"""A game saving a score isn't held up by another program that's reading the scores."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from breakout.scores import Score, add_score, open_scores

WHEN = datetime(2026, 10, 5, 15, 0, 0, tzinfo=UTC)


def test_the_database_keeps_a_write_ahead_log(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    assert db.execute("PRAGMA journal_mode").fetchone() == ("wal",)


def test_a_game_can_save_while_the_report_tool_is_reading(tmp_path: Path):
    game = open_scores(tmp_path / "scores.db")
    reader = sqlite3.connect(tmp_path / "scores.db")
    reader.execute("BEGIN")
    assert reader.execute("SELECT COUNT(*) FROM scores").fetchone() == (0,)
    add_score(game, Score("Mia", "Classic", 400, WHEN))
    assert reader.execute("SELECT COUNT(*) FROM scores").fetchone() == (0,)
    reader.rollback()
    assert reader.execute("SELECT COUNT(*) FROM scores").fetchone() == (1,)
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_readers.py
```

```text
E       AssertionError: assert ('delete',) == ('wal',)
E       sqlite3.OperationalError: database is locked
FAILED tests/test_readers.py::test_the_database_keeps_a_write_ahead_log - Ass...
FAILED tests/test_readers.py::test_a_game_can_save_while_the_report_tool_is_reading
2 failed in 5.92s
```

The second test takes 5 seconds to fail: the game's connection waited its full default timeout for the reader. `delete` is the name of the rollback-journal mode, after what happens to the journal file at each commit.

| Test | Result |
|---|---|
| `pytest -q tests/test_readers.py` | `2 passed`, in well under a second |
| every database the game opens | uses a write-ahead log, your `scores.db` included |

When all 146 tests pass and every check is clean, commit with a message that mentions the **write-ahead log** (not just "WAL": earlier commits about the wall already contain those letters, so a check for them would pass before you commit).

```hints
nudge: The REPL step "A log written ahead" turned it on with one statement. Where does every connection to the scores database get made?
concept: `PRAGMA journal_mode = WAL` is stored in the file, so running it once per file would be enough, but `open_scores` doesn't know whether this file has had it, and running it again costs nothing. It can't go in a migration: a migration runs inside a transaction, and SQLite refuses to change the journal mode inside one (`cannot change into wal mode from within a transaction`). And it has to be in the game's code, not only in the tests' fixture, or the game would keep the old mode.
shape: One line in `open_scores`, next to lesson 7.1's `PRAGMA foreign_keys = ON`, before `migrate` runs.
answer: ~~~python
def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA journal_mode = WAL")
    migrate(db)
    return db
~~~

Traced for the second test: the reader begins and reads (0 scores); the game's `add_score` inserts and commits, appending to `scores.db-wal`, without waiting; the reader, still in its transaction, reads its old snapshot (0); after `rollback`, it reads again and sees the new score (1). Every program that opens your `scores.db` from now on, the report tool included, gets the log, because the mode is in the file. (A database held in memory, `":memory:"`, can't keep a log; there, the pragma quietly leaves the mode as `memory`, and the tests' `db` fixture uses a file, so that's no problem.)
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_readers.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="146 passed"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA journal_mode').fetchone())\"" stdout="('wal',)" label="your scores.db keeps a write-ahead log" -- Turn it on in open_scores, so every program that opens the database gets it, not only the tests.
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "write-ahead log"
git-clean
```

## Challenge: tell the player why

**Optional, ★.** If another program holds the scores database for more than 5 seconds, the game's `add_score` raises `database is locked`, and the game crashes. Catch it in the app (only that one error), print `breakout: the scores database is busy; this score wasn't saved` to standard error, and play on. Test it the way `test_readers.py` holds a lock, with a connection that's begun `BEGIN IMMEDIATE` and not committed, and a game opened with a short timeout. On a branch.

## Challenge: two programs, a thousand scores each

**Optional, ★★.** Write `scratch/hammer.py`, which opens `scratch/hammer.db` with `open_scores` and saves 1,000 scores, and start two copies at once (`Start-Process` in PowerShell starts a program without waiting for it). Check that all 2,000 scores arrive. Then make it fail: give both copies `timeout=0`, and count how many saves each lost.

## Challenge: a log that only grows

**Optional, ★★★.** A checkpoint can only copy log pages that no reader still needs. Keep a reader's transaction open in one REPL while another saves thousands of scores, and watch `scratch/locks.db-wal` grow (its size from `Path(...).stat().st_size`). Then end the reader and run `PRAGMA wal_checkpoint(TRUNCATE)`. Explain, in a few sentences, what a program that never ends its read transactions does to a WAL database.

## What did we actually learn?

- **One writer at a time**: a transaction takes the file's **write lock** when it first writes and holds it until it ends; others wait up to their **busy timeout**, then fail with `database is locked`.
- **Isolation**: a connection sees only what's committed.
- **Rollback journal vs write-ahead log**: in the default mode a commit waits for readers; in **WAL** mode readers and the writer don't block each other, readers see a consistent snapshot, and **checkpoints** copy the log back. `journal_mode` is stored in the file; `foreign_keys` isn't.
- **Race conditions** and **check-then-act**: decide and act inside one lock. **`BEGIN IMMEDIATE`** takes the write lock before reading; a plain `BEGIN` is deferred.
- Python's **legacy transaction control** vs **`autocommit = True`**, where your SQL says `BEGIN` and `COMMIT` itself.
- **Testing an order** with a trace, so a race can be guarded without needing the bad luck that causes it.

Big database servers solve the same problems at a finer grain: PostgreSQL and SQL Server lock single **rows**, not whole files, so many writers can work at once on different rows, and PostgreSQL's readers see snapshots just as WAL's do (it's called **MVCC**, multi-version concurrency control). In C#, `connection.BeginTransaction(IsolationLevel.Serializable)` chooses how strictly transactions are kept apart, and Java's JDBC has `setTransactionIsolation`; both are this lesson's isolation, with names for each level of strictness. The question to ask in every language is this lesson's: between the moment I looked and the moment I acted, could anyone else have changed it?
