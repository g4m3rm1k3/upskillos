---
reference: optional
title: 7.6 — Finding Rows Fast
runtime: python
run: breakout/__main__.py
---

Every question so far has been answered instantly, because your databases hold a handful of rows. A real game's scores grow for years, and a question that reads every row gets slower with every game played. This lesson makes a database big enough to measure, a million scores, watches SQLite read all of them to answer one question, and then gives it an **index**, the structure that lets a database jump to the rows it needs. You'll measure what an index buys and what it costs, learn to read how SQLite plans to answer a query, and finish with tests that fail if the game's questions ever go back to reading every row.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 7.5, the reference answer to its Your turn.

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
run ".venv/Scripts/python -m pytest -q" stdout="138 passed"
```

## A million scores

**Build:** a practice database with a million made-up scores in it, made by a scratch script.

Make `scratch/big.py`:

```python
"""A practice database with a million scores in it: big enough to measure. Not part of the game."""

import random
import sqlite3
import time
from pathlib import Path

path = Path("scratch/big.db")
path.unlink(missing_ok=True)
db = sqlite3.connect(path)
db.execute("CREATE TABLE scores (id INTEGER PRIMARY KEY, player TEXT, level TEXT, points INTEGER) STRICT")
rng = random.Random(0)
rows = [(f"player {rng.randrange(1000)}", f"level {rng.randrange(100)}", rng.randrange(1000)) for _ in range(1_000_000)]
start = time.perf_counter()
with db:
    db.executemany("INSERT INTO scores (player, level, points) VALUES (?, ?, ?)", rows)
print(f"{len(rows):,} scores saved in {time.perf_counter() - start:.2f} s; the file is {path.stat().st_size:,} bytes")
db.close()
```

```powershell
.venv\Scripts\python scratch\big.py
```

```text
1,000,000 scores saved in 1.43 s; the file is 30,879,744 bytes
```

Your time will differ; the size won't. Read it piece by piece:

- `rng = random.Random(0)`: lesson 2.6's seeded generator, so everyone's million scores are the same million: a thousand players, a hundred levels, points from 0 to 999. `rng.randrange(1000)` is a whole number from 0 up to, not including, 1000.
- `rows` is a list comprehension (lesson 3.2) that builds a million tuples, one per score. `1_000_000` is just `1000000`: Python lets you put `_` between digits so a long number can be read.
- **`db.executemany(sql, rows)`** runs one `INSERT` for every tuple in `rows`, with the tuple's values in the placeholders. One statement, prepared once (lesson 6.4's two phases), a million times over, inside one transaction: that's why it takes about a second. A million separate `with db:` transactions, each saved to disk on its own, would take many minutes.
- **`time.perf_counter()`** reads a clock made for measuring: subtract two readings and you have the seconds between them.
- `f"{len(rows):,}"`: the `,` after the colon writes the number with commas between the thousands. `path.stat().st_size` is the file's size in bytes (lesson 6.2).

`scratch/` is ignored by Git (lesson 1.2), so the 30 MB file never goes near a commit.

```check
run ".venv/Scripts/python -m sqlite3 scratch/big.db \"SELECT COUNT(*) FROM scores\"" stdout="(1000000,)" label="scratch/big.db holds a million scores"
```

## How long does one question take?

**Build:** a scratch script that times a question and asks SQLite how it answers it.

Make `scratch/ask.py`. It asks the report tool's question about one level (lesson 6.4), ten times, and prints the average time:

```python
"""Ask the million-score database some questions, and time each one."""

import sqlite3
import time

QUESTIONS = [
    ("SELECT COUNT(*), MAX(points) FROM scores WHERE level = ?", ("level 7",)),
]

db = sqlite3.connect("scratch/big.db")
for sql, values in QUESTIONS:
    plan = [step for _, _, _, step in db.execute("EXPLAIN QUERY PLAN " + sql, values)]
    start = time.perf_counter()
    for _ in range(10):
        answer = db.execute(sql, values).fetchone()
    milliseconds = (time.perf_counter() - start) / 10 * 1000
    print(f"{sql}\n    answer {answer}, {milliseconds:.2f} ms, plan {plan}")
db.close()
```

```powershell
.venv\Scripts\python scratch\ask.py
```

```text
SELECT COUNT(*), MAX(points) FROM scores WHERE level = ?
    answer (9992, 999), 145.90 ms, plan ['SCAN scores']
```

A **millisecond** (ms) is a thousandth of a second, so about a seventh of a second for one answer. The `plan` comes from **`EXPLAIN QUERY PLAN`**: put it before any query, and instead of running it, SQLite describes **how** it would answer it, one row per step. Each row has four columns; the first three are numbers SQLite uses to arrange the steps, and the fourth is the description, which is what `ask.py` keeps.

```predict
question: `SCAN scores` answers a question about level 7. About 1% of the scores are on level 7. How many rows does SQLite look at?
choice: About 10,000: the ones on level 7
choice: About 500,000: on average it finds them halfway through
choice: All 1,000,000
answer: All 1,000,000
explain: **SCAN** means reading the table from its first row to its last. The rows are stored in the order they were added, not by level, so a level 7 score can be anywhere, including the very last row. The only way to be sure of finding every one is to look at every row: a million, to keep about ten thousand. Double the scores and the question takes twice as long.
```

That's lesson 6.3's "SQL says what you want, not how": you didn't ask SQLite to read every row; it chose to, because it had no better way.

```check
run ".venv/Scripts/python scratch/ask.py" stdout="SCAN scores" label="with no index, SQLite reads the whole table"
```

## An index

**Build:** an index on the level column of the practice database, then the same question again.

```powershell
.venv\Scripts\python -m sqlite3 scratch/big.db "CREATE INDEX scores_level ON scores (level)"
.venv\Scripts\python scratch\ask.py
```

```text
SELECT COUNT(*), MAX(points) FROM scores WHERE level = ?
    answer (9992, 999), 39.00 ms, plan ['SEARCH scores USING INDEX scores_level (level=?)']
```

Nearly four times faster, and the plan says **SEARCH** instead of SCAN: SQLite went straight to the rows it needed, using the index.

**Understand: what an index is.** `CREATE INDEX scores_level ON scores (level)` makes a second structure in the file: every row's `level`, **sorted**, each paired with that row's `id`. Imagine it for eight scores:

```text
the table (in the order added)          the index on level (sorted)
id  level      points                   level      id
1   level 3    120                      level 1    4
2   level 7    560                      level 3    1
3   level 9    70                       level 3    6
4   level 1    300                      level 7    2
5   level 7    999                      level 7    5
6   level 3    40                       level 7    8
7   level 9    10                       level 9    3
8   level 7    800                      level 9    7
```

Because the index is sorted, all the `level 7` entries sit together, and SQLite can find where they start without reading from the top, the way you find a word in a dictionary: open it in the middle, see whether your word comes before or after, and repeat in that half. Each look halves what's left, so a million sorted entries take about 20 looks (2 to the power 20 is about a million), not a million. Then it reads the `level 7` entries in a row, and stops at the first that isn't. (SQLite keeps an index as a **B-tree**, a tree of pages of sorted entries, which gives the same halving and stays sorted cheaply as rows are added.) SQLite keeps every index up to date itself: each `INSERT`, `UPDATE` and `DELETE` changes the indexes too.

**Why still 39 ms?** The index holds `level` and `id`, but the question also needs `points`. So for each of the 9,992 entries, SQLite takes the `id` and fetches that row from the table to read its points: ten thousand jumps around a 30 MB file. The index found the rows; it couldn't answer the question by itself.

```check
run ".venv/Scripts/python scratch/ask.py" stdout="USING INDEX scores_level" label="the question now searches the index"
```

## An index that answers by itself

**Build:** an index on two columns, and more questions to try it on.

```powershell
.venv\Scripts\python -m sqlite3 scratch/big.db "CREATE INDEX scores_level_points ON scores (level, points)"
.venv\Scripts\python scratch\ask.py
```

```text
SELECT COUNT(*), MAX(points) FROM scores WHERE level = ?
    answer (9992, 999), 1.35 ms, plan ['SEARCH scores USING COVERING INDEX scores_level_points (level=?)']
```

From 146 ms to just over 1: about a hundred times faster than with no index. An index on `(level, points)` is sorted by `level`, and within each level by `points`, like a phone book sorted by surname and then by first name. Every value the question needs, `level` to find the rows and `points` to count and compare, is **in the index**, so SQLite never touches the table: a **covering index**, one that covers everything the query uses. SQLite also chose it over `scores_level` by itself, because it could see it was the better one.

Now add more questions to `ask.py`. Replace its `QUESTIONS` with:

```python
QUESTIONS = [
    ("SELECT COUNT(*), MAX(points) FROM scores WHERE level = ?", ("level 7",)),
    ("SELECT MAX(points) FROM scores WHERE level = ?", ("level 7",)),
    ("SELECT COUNT(*) FROM scores WHERE points > ?", (990,)),
    ("SELECT COUNT(*) FROM scores WHERE level LIKE ?", ("%7",)),
    ("SELECT COUNT(*) FROM scores WHERE lower(level) = ?", ("level 7",)),
]
```

```predict
question: Which of the four new questions will the `(level, points)` index make fast?
choice: All four: they're all about the same table
choice: Only `MAX(points) ... WHERE level = ?`
choice: The two that use `level`
answer: Only `MAX(points) ... WHERE level = ?`
explain: An index helps when the query can use its **order** to jump to a starting point. `MAX(points)` for one level is the last entry of that level's run in the index: one jump. `points > 990` would need the index sorted by points first, and it's sorted by level first. `LIKE '%7'` (lesson 6.4's challenge) means "ends in 7", and a sorted list can't jump to things that end in something. `lower(level)` asks about a value the index doesn't hold. Run it and see.
```

```powershell
.venv\Scripts\python scratch\ask.py
```

```text
SELECT COUNT(*), MAX(points) FROM scores WHERE level = ?
    answer (9992, 999), 1.33 ms, plan ['SEARCH scores USING COVERING INDEX scores_level_points (level=?)']
SELECT MAX(points) FROM scores WHERE level = ?
    answer (999,), 0.12 ms, plan ['SEARCH scores USING COVERING INDEX scores_level_points (level=?)']
SELECT COUNT(*) FROM scores WHERE points > ?
    answer (8973,), 86.51 ms, plan ['SCAN scores USING COVERING INDEX scores_level_points']
SELECT COUNT(*) FROM scores WHERE level LIKE ?
    answer (100581,), 130.55 ms, plan ['SCAN scores USING COVERING INDEX scores_level_points']
SELECT COUNT(*) FROM scores WHERE lower(level) = ?
    answer (9992,), 299.64 ms, plan ['SCAN scores USING COVERING INDEX scores_level_points']
```

- **`MAX(points)` for one level: 0.12 ms**, more than a thousand times faster than with no index. It's one jump to the end of level 7's run. That's the game's `best`.
- **`points > 990`: a scan.** The index is in level order; scores over 990 are scattered through every level's run. This is the **leftmost column rule**: an index on `(a, b)` helps questions about `a`, or `a` and then `b`, but not about `b` alone, just as a phone book sorted by surname can't find everyone called Anna.
- **`LIKE '%7'`: a scan.** A pattern that starts with `%` has no first letters to jump to.
- **`lower(level)`: a scan, and the slowest of all**, because the function runs on every one of a million values. The index holds `level`, not `lower(level)`.

`SCAN scores USING COVERING INDEX` means SQLite still read every entry, but read the index instead of the table, because the index is smaller and has every column these questions need. A scan of something smaller, but still a scan.

```check
run ".venv/Scripts/python scratch/ask.py" stdout="USING COVERING INDEX scores_level_points" label="the two-column index covers the question"
```

## What an index costs

**Build:** a scratch script that adds scores, timed with and without the indexes.

An index is a second copy of some columns, kept sorted, and that isn't free. Make `scratch/add.py`:

```python
"""Add 100,000 more scores to the million-score database, and time it."""

import random
import sqlite3
import time

db = sqlite3.connect("scratch/big.db")
rng = random.Random(1)
rows = [(f"player {rng.randrange(1000)}", f"level {rng.randrange(100)}", rng.randrange(1000)) for _ in range(100_000)]
start = time.perf_counter()
with db:
    db.executemany("INSERT INTO scores (player, level, points) VALUES (?, ?, ?)", rows)
(indexes,) = db.execute("SELECT COUNT(*) FROM sqlite_schema WHERE type = 'index'").fetchone()
print(f"{indexes} indexes: {len(rows):,} scores added in {time.perf_counter() - start:.2f} s")
db.close()
```

Run it with the two indexes in place, then drop them both and run it again:

```powershell
.venv\Scripts\python scratch\add.py
.venv\Scripts\python -m sqlite3 scratch/big.db "DROP INDEX scores_level"
.venv\Scripts\python -m sqlite3 scratch/big.db "DROP INDEX scores_level_points"
.venv\Scripts\python scratch\add.py
```

```text
2 indexes: 100,000 scores added in 5.15 s
0 indexes: 100,000 scores added in 0.27 s
```

With no index, each new score goes on the end of the table. With an index, each one must also go into its sorted place in every index, wherever that is in the file: about twenty times slower here. The indexes also took space: the file grew from 31 MB to 48 MB with the first index, and to 68 MB with the second, before you dropped them.

So an index is a trade: faster questions, slower changes, a bigger file. The rule real projects follow is to **index the questions you actually ask, and measure**: an index nobody's query uses is all cost. For the game, the trade is easy: a score is saved once per game, and `best` is asked at every start and after every game.

```check
run ".venv/Scripts/python -m sqlite3 scratch/big.db \"SELECT COUNT(*) FROM sqlite_schema WHERE type = 'index'\"" stdout="(0,)" label="the practice indexes are dropped"
```

## The game's own questions

**Build:** migration 5, with indexes for the questions the game and the report tool ask.

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

**Understand.** Two indexes, each for a question the code really asks:

- **`scores_level_points ON scores (level, points)`**: `best(db, level)`, asked at every start and after every game, is `MAX(points) ... WHERE level = ?`, the 0.12 ms question. The report tool's `report` and `level_table` group and filter by level too.
- **`scores_player ON scores (player_id)`**: lesson 7.1 promised it. Finding a player's scores, and the check SQLite makes when someone tries to delete a player (lesson 7.1's foreign key: does any score still refer to them?), would otherwise scan every score.

A new migration, because migration 4 has run on your `scores.db` (lesson 7.2: add, never edit). Indexes don't change any row, so it's safe on every file, of any size: it only takes longer on a big one, once.

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())"
.venv\Scripts\python -m sqlite3 scores.db "EXPLAIN QUERY PLAN SELECT MAX(points) FROM scores WHERE level = 'Classic'"
```

```text
(5,)
(3, 0, 55, 'SEARCH scores USING COVERING INDEX scores_level_points (level=?)')
```

```check
contains breakout/scores.py "CREATE INDEX scores_level_points ON scores (level, points);"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())\"" stdout="(5,)" label="your scores.db is at version 5"
run ".venv/Scripts/python -m pytest -q" stdout="138 passed"
```

## A test that watches the plan

**Build:** tests that fail if the game's questions stop using the index.

An index can be lost without anyone noticing: a query rewritten with `lower(level)`, or a column renamed, and the game still works, just slower, and only on databases big enough to matter. A timing test is a poor guard: times vary from run to run with whatever else the computer is doing, so a test with a time limit can pass on one run and fail the next, a **flaky** test. (Chapter 25 deals with flaky tests properly.) The plan is exact. These tests check it:

```python file=tests/test_query_plans.py
"""The questions the game asks most are answered from an index, not by reading every score."""

import sqlite3
from collections.abc import Callable
from datetime import UTC, datetime

from breakout.report import report
from breakout.scores import Score, add_score, best

WHEN = datetime(2026, 10, 5, 15, 0, 0, tzinfo=UTC)


def plan_of(db: sqlite3.Connection, ask: Callable[[], object]) -> list[str]:
    """Run ask(), and return how SQLite answered every statement it ran: each step of each query plan."""
    statements: list[str] = []
    db.set_trace_callback(statements.append)
    ask()
    db.set_trace_callback(None)
    return [step for sql in statements for _, _, _, step in db.execute("EXPLAIN QUERY PLAN " + sql)]


def test_the_best_score_comes_from_an_index(db: sqlite3.Connection):
    add_score(db, Score("Mia", "Classic", 400, WHEN))
    assert plan_of(db, lambda: best(db, "Classic")) == [
        "SEARCH scores USING COVERING INDEX scores_level_points (level=?)"
    ]


def test_a_level_report_comes_from_an_index(db: sqlite3.Connection):
    add_score(db, Score("Mia", "Classic", 400, WHEN))
    assert plan_of(db, lambda: report(db, "Classic")) == [
        "SEARCH scores USING COVERING INDEX scores_level_points (level=?)"
    ]
```

**Understand.**

- **`db.set_trace_callback(statements.append)`** asks the connection to call a function with the text of every statement it runs, with the placeholders' values filled in, here `SELECT MAX(points) FROM scores WHERE level = 'Classic'`. `statements.append` without brackets isn't a call: it's that one list's `append` method, handed over to be called later, and called a **bound method** because it stays tied to its list. So each statement lands in `statements`. `set_trace_callback(None)` stops it.
- So `plan_of` runs whatever it's given, collects the SQL it ran, and asks for each statement's plan. The test checks the **real** query `best` runs, not a copy of its text that could drift away from it.
- **`lambda: best(db, "Classic")`** is a function written in one expression: `lambda` makes a function with no name, whose body is the expression after the colon. `plan_of` needs a function to call at the right moment, between starting and stopping the trace; `best(db, "Classic")` on its own would run immediately, before `plan_of` began.
- `Callable[[], object]`, from `collections.abc` like lesson 6.5's `Iterator`, is the type of a function: the list says what arguments it takes (none) and `object` what it returns (anything).
- The expected plan is pinned exactly. If a new Python brings a SQLite that words its plans differently, these tests will say so, and you'll read the new plan and update the text: a plan test documents how the question is answered, and a change in how is worth a look.

```check
run ".venv/Scripts/python -m pytest -q tests/test_query_plans.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="140 passed"
```

## Your turn: a player's sessions, without a scan

**Build, on your own:** click **Create provided tests/test_session_plans.py**, then make lesson 7.4's `sessions_report` find its rows through indexes.

```python file=tests/test_session_plans.py provided
"""A player's sessions report finds its rows through indexes, however many sessions and scores there are."""

import sqlite3
from collections.abc import Callable
from datetime import UTC, datetime

from breakout.report import sessions_report
from breakout.scores import Score, add_score, start_session

WHEN = datetime(2026, 10, 5, 15, 0, 0, tzinfo=UTC)


def plan_of(db: sqlite3.Connection, ask: Callable[[], object]) -> list[str]:
    """Run ask(), and return how SQLite answered every statement it ran: each step of each query plan."""
    statements: list[str] = []
    db.set_trace_callback(statements.append)
    ask()
    db.set_trace_callback(None)
    return [step for sql in statements for _, _, _, step in db.execute("EXPLAIN QUERY PLAN " + sql)]


def sessions_plan(db: sqlite3.Connection) -> list[str]:
    session = start_session(db, "Mia", WHEN)
    add_score(db, Score("Mia", "Classic", 400, WHEN), session)
    return plan_of(db, lambda: sessions_report(db, "Mia"))


def test_no_table_is_read_from_start_to_end(db: sqlite3.Connection):
    assert [step for step in sessions_plan(db) if step.startswith("SCAN")] == []


def test_no_index_is_built_just_for_this_query(db: sqlite3.Connection):
    assert [step for step in sessions_plan(db) if "AUTOMATIC" in step] == []
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_session_plans.py
```

```text
E         Left contains one more item: 'SCAN sessions USING INDEX sessions_id_player'
E         Left contains one more item: 'SEARCH scores USING AUTOMATIC COVERING INDEX (session_id=?) LEFT-JOIN'
FAILED tests/test_session_plans.py::test_no_table_is_read_from_start_to_end
FAILED tests/test_session_plans.py::test_no_index_is_built_just_for_this_query
2 failed
```

Each failure names one step of the plan. Read them both, work out what each says SQLite is doing, and add what's missing.

| Test | Result |
|---|---|
| `pytest -q tests/test_session_plans.py` | `2 passed` |
| the plan for one player's sessions | no `SCAN`, and no `AUTOMATIC` index |
| your `scores.db` | gets the change too, at version 6 |

When all 142 tests pass and every check is clean, commit with a message that mentions **index**.

```hints
nudge: `SCAN sessions` reads every session to find one player's. Which column does `sessions_report` look sessions up by? And the `AUTOMATIC` index: which column of `scores` did SQLite need badly enough to build an index on it for this one query?
concept: An **automatic index** is one SQLite builds by itself while answering a query, because a join needs to look rows up by a column that has no index, and building one, using it, and throwing it away is cheaper than scanning over and over. It's built again for **every** run of the query: SQLite telling you which index is missing. `sessions_id_player` doesn't help find a player's sessions: it's sorted by `id` first (the leftmost column rule). Your `scores.db` is already at version 5, so migration 5 will never run on it again (lesson 7.2).
shape: A migration 6 at the end of `MIGRATIONS`, with two `CREATE INDEX` statements: one on `sessions (player_id)`, one on `scores (session_id)`. Name them the way migration 5 names its own: table, then column.
answer: ~~~python
    # 6: indexes for a player's sessions and each session's scores (lesson 7.6's Your turn).
    """
    CREATE INDEX sessions_player ON sessions (player_id);
    CREATE INDEX scores_session ON scores (session_id);
    """,
~~~

Traced, the plan for one player's sessions goes from

```text
SEARCH players USING COVERING INDEX sqlite_autoindex_players_1 (name=?)
SCAN sessions USING INDEX sessions_id_player
SEARCH scores USING AUTOMATIC COVERING INDEX (session_id=?) LEFT-JOIN
```

to

```text
SEARCH players USING COVERING INDEX sqlite_autoindex_players_1 (name=?)
SEARCH sessions USING INDEX sessions_player (player_id=?)
SEARCH scores USING COVERING INDEX scores_session (session_id=?) LEFT-JOIN
```

Find the player by name (the index `UNIQUE` made for itself), their sessions by `player_id`, each session's scores by `session_id`: three searches, whatever the database's size. (`USE TEMP B-TREE FOR ORDER BY` stays: sorting a player's few sessions is cheap, and isn't what the tests are about.)

If you add only the `sessions` index first, the second test passes and the first fails on a **new** line, `SCAN scores LEFT-JOIN`: with an index to find the sessions, SQLite judged a few test rows cheaper to scan than to build an automatic index for. The missing index is the same; the plan just shows it differently. A plan is SQLite's choice for the data it has, which is why the tests check what matters, no scans and no automatic indexes, rather than one exact plan.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_session_plans.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="142 passed"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())\"" stdout="(6,)" label="your scores.db has the new indexes, at version 6" -- Add a new migration: migration 5 has already run on your scores.db, so changing it would never reach the file.
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "index"
git-clean
```

## Challenge: an index on a calculation

**Optional, ★.** SQLite can index the result of an expression: `CREATE INDEX scores_lower_level ON scores (lower(level))` in `scratch/big.db`. Run `ask.py` again: what happens to the `lower(level)` question, and its plan? Then work out why it wouldn't help `WHERE upper(level) = ?`.

## Challenge: grouping from an index

**Optional, ★★.** A question about every level, like `level_table`'s, has to read every score: a `SCAN` is right there. But compare the plan of `SELECT level, COUNT(*), MAX(points) FROM scores GROUP BY level` in `scratch/big.db` with and without an index on `(level, points)`: one plan has a second line, `USE TEMP B-TREE FOR GROUP BY`, and the other doesn't. Explain in a sentence what the index saved SQLite from doing, then add the question to `ask.py` and measure both.

## Challenge: a speed test that doesn't flake

**Optional, ★★★.** Write a test marked `slow` (lesson 6.5) that fills a temporary database with 100,000 scores and checks that `best` takes under 5 ms, then run it twenty times (`pytest --count` needs a plugin; a loop in a script will do). Does it ever fail? Now make it fail on purpose by dropping the index, and compare: which test, this or `test_query_plans.py`, would you rather keep, and why?

## What did we actually learn?

- **Measure first**: a seeded scratch database big enough to show the problem, and `time.perf_counter()`. `executemany` for many rows in one transaction.
- **`EXPLAIN QUERY PLAN`** shows how SQLite will answer: **SCAN** (every row) or **SEARCH** (jump to the rows needed).
- An **index** is a sorted copy of some columns with each row's id; a sorted list finds a value in about 20 looks among a million. A **covering index** answers without touching the table.
- The **leftmost column rule**, and why `LIKE '%...'` and functions on a column can't use an ordinary index.
- **Indexes cost** slower writes and a bigger file: index the questions you ask.
- An **automatic index** in a plan is SQLite telling you which index is missing.
- **Plan tests** guard performance exactly, where timing tests flake. `set_trace_callback` records the SQL a function really runs; `lambda` makes a small function in one expression.

Every database works this way. SQL Server and PostgreSQL show plans with `EXPLAIN` and graphical plan viewers, and both have **covering indexes** (`INCLUDE (points)` in SQL Server and PostgreSQL adds a column to an index just to cover queries). In C#, Entity Framework declares indexes on the model (`HasIndex(s => new { s.Level, s.Points })`) and logs the SQL it runs, as `set_trace_callback` does; in Java, JPA uses `@Index` and Hibernate's SQL logging. The skill that carries everywhere is this lesson's: read the plan before guessing.
