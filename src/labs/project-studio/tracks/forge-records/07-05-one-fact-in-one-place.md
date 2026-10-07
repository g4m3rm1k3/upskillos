---
reference: optional
title: 7.5 — One Fact in One Place
runtime: python
run: breakout/__main__.py
---

Lesson 7.1 stored each player's name once, in a table of their own, instead of in every score, and promised to come back to why. This lesson does. A fact written in many rows can be changed in some of them and not others, and then the database holds two answers to one question, with no way to say which is true. Designing tables so that every fact is stored exactly once is called **normalisation**. You'll feel the problem in a practice table first, then find a fact your own database already stores twice, and close the gap with a migration that rebuilds a table.

## The report so far

**Build:** make sure `breakout/report.py` matches the end of lesson 7.4, the reference answer to its Your turn.

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
run ".venv/Scripts/python -m pytest -q" stdout="133 passed"
```

## A fact in many rows

**Build:** a practice table that stores one fact many times, and three ways it goes wrong.

Open the SQL shell on a new practice file:

```powershell
.venv\Scripts\python -m sqlite3 normal.db
```

A table of plays, one row per game, as someone might first design it: who played, which level, who **designed** the level, and the points.

```sql
CREATE TABLE plays (id INTEGER PRIMARY KEY, player TEXT NOT NULL, level TEXT NOT NULL, designer TEXT NOT NULL, points INTEGER NOT NULL) STRICT;
INSERT INTO plays (player, level, designer, points) VALUES ('Mia', 'Classic', 'Ana', 560), ('Sam', 'Classic', 'Ana', 70), ('Mia', 'Castle', 'Bob', 260), ('Sam', 'Castle', 'Bob', 300);
```

Who designed Castle is one fact, and this table writes it down twice, once per game played on Castle. Now Bob hands the level over to Cy, and a program updates the designer, but only in the row it happened to be looking at:

```predict
question: `UPDATE plays SET designer = 'Cy' WHERE level = 'Castle' AND player = 'Mia'` runs. Then `SELECT DISTINCT level, designer FROM plays` lists each different pair once. How many rows does it list for Castle?
choice: 1: Castle, Cy
choice: 1: Castle, Bob
choice: 2: Castle, Bob and Castle, Cy
answer: 2: Castle, Bob and Castle, Cy
explain: The `WHERE` picked only Mia's game on Castle, so only that row changed. Sam's row still says Bob. The fact "who designed Castle" now has two answers in the table, and nothing in the database can say which is right: it was never told that the designer depends on the level alone.
```

```sql
UPDATE plays SET designer = 'Cy' WHERE level = 'Castle' AND player = 'Mia';
SELECT DISTINCT level, designer FROM plays ORDER BY level, designer;
```

```text
('Castle', 'Bob')
('Castle', 'Cy')
('Classic', 'Ana')
```

`DISTINCT` removes repeated rows from the result, so each different pair appears once, and Castle appears twice. That's an **update anomaly**: changing one fact means changing every row that repeats it, and missing one leaves the table contradicting itself. Two more:

```sql
INSERT INTO plays (level, designer) VALUES ('Tiny', 'Ana');
DELETE FROM plays WHERE level = 'Classic';
SELECT designer FROM plays WHERE level = 'Classic';
```

```text
IntegrityError (SQLITE_CONSTRAINT_NOTNULL): NOT NULL constraint failed: plays.player
```

- **Insert anomaly.** Ana has made a new level, Tiny, that nobody has played yet. There's nowhere to write that down: every row is a play, and a play needs a player and points. The only ways in are a fake game or leaving the level out.
- **Delete anomaly.** Forgetting Classic's games (lesson 6.4's `forget`) also forgot who designed Classic: the last `SELECT` printed nothing at all, because the only rows that knew were the games.

Type `.quit`.

**Understand: why.** Knowing a level tells you its designer: every row with `level = 'Castle'` should say the same designer. That relationship, "if you know A, you know B", is called a **functional dependency**, written `level → designer`. But a row of `plays` is about one **game**: its key is `id`, a play. `designer` doesn't depend on the play; it depends on the level, so it's repeated for every play of that level, and every copy can drift on its own. The rule normalisation follows is: **every column in a table states a fact about that table's key, the whole key, and nothing but the key**. `designer` breaks "nothing but the key". (Database books name the levels of this rule **normal forms**: first, second and third normal form. The sentence above is a well-known summary of third normal form, and it's the one to remember.)

```check
run ".venv/Scripts/python -m sqlite3 normal.db \"SELECT COUNT(DISTINCT designer) FROM plays WHERE level = 'Castle'\"" stdout="(2,)" label="Castle has two designers: the update anomaly"
run ".venv/Scripts/python -m sqlite3 normal.db \"SELECT COUNT(*) FROM plays WHERE level = 'Classic'\"" stdout="(0,)" label="Classic's games are gone, and its designer with them"
```

## One table per kind of thing

**Build:** the same information in two tables, each fact in one place.

The fix is to give the levels a table of their own, so each level's designer is written once, and have each game refer to its level, as lesson 7.1 did for players. In the shell on `normal.db` again:

```sql
CREATE TABLE levels (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, designer TEXT NOT NULL) STRICT;
CREATE TABLE games (id INTEGER PRIMARY KEY, player TEXT NOT NULL, level_id INTEGER NOT NULL REFERENCES levels (id), points INTEGER NOT NULL) STRICT;
INSERT INTO levels (name, designer) VALUES ('Classic', 'Ana'), ('Castle', 'Bob'), ('Tiny', 'Ana');
INSERT INTO games (player, level_id, points) VALUES ('Mia', 1, 560), ('Sam', 1, 70), ('Mia', 2, 260), ('Sam', 2, 300);
```

Now try each anomaly again:

```sql
UPDATE levels SET designer = 'Cy' WHERE name = 'Castle';
SELECT levels.name, levels.designer, COUNT(games.id) FROM levels LEFT JOIN games ON games.level_id = levels.id GROUP BY levels.id ORDER BY levels.name;
DELETE FROM games WHERE level_id = 1;
SELECT designer FROM levels WHERE name = 'Classic';
```

```text
('Castle', 'Cy', 2)
('Classic', 'Ana', 2)
('Tiny', 'Ana', 0)
('Ana',)
```

- **Update:** Castle's designer is one row in `levels`, so one `UPDATE` changes it everywhere it's used: there's nowhere else for an old value to hide.
- **Insert:** Tiny is a row in `levels` with no games, and lesson 7.4's `LEFT JOIN` counts it as 0.
- **Delete:** Classic's games are gone, and `levels` still knows Ana designed it, because that fact was never stored in a game.

Type `.quit`.

**Understand: the cost, and when to pay it.** Reading now takes a join: the designer of a game's level is one table away. That's the trade normalisation makes, and it's almost always the right one: joins on a primary key are fast (lesson 7.6 measures how fast), and a contradiction in the data costs far more than a join, because by the time anyone notices, nobody knows which copy was right. You'll hear of **denormalising**: storing a copy on purpose, usually to make a slow read fast. Do it only when you've measured the slow read, and then guard the copy, as the rest of this lesson does.

```check
run ".venv/Scripts/python -m sqlite3 normal.db \"SELECT designer FROM levels WHERE name = 'Classic'\"" stdout="('Ana',)" label="Classic's designer survives its games being deleted"
run ".venv/Scripts/python -m sqlite3 normal.db \"SELECT COUNT(*) FROM levels LEFT JOIN games ON games.level_id = levels.id WHERE levels.name = 'Tiny'\"" stdout="(1,)" label="Tiny exists, with no games"
```

## A fact your database stores twice

**Build:** nothing. Look for a repeated fact in the scores database, and see what it does.

Apply the rule to your own design. `players` and `sessions` pass: each column is about the row's own player or session. `scores` has `player_id`, whose game it was, and since lesson 7.4 `session_id`, the session it was played in. But a session has a `player_id` too. For a score played in a session, "whose game was this?" is written in **two** places: the score's `player_id`, and its session's `player_id`. They're meant to agree. Nothing makes them.

```predict
question: Mia starts a session. A score of Sam's is saved with Mia's session. What does lesson 7.4's `sessions_report(db, "Mia")` say about that session?
choice: An error: the score isn't Mia's
choice: 0 played: Sam's score doesn't count for Mia
choice: 1 played
answer: 1 played
explain: Nothing refuses the score: `player_id` is a real player and `session_id` a real session, and each foreign key only checks its own column. `sessions_report` counts the scores whose `session_id` is the session, so it counts Sam's game as one of Mia's. Ask `load_scores` instead, and the same score is Sam's. Two questions, two answers.
```

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, load_scores, open_scores, start_session; from breakout.report import sessions_report; db = open_scores(Path(':memory:')); t = datetime(2026, 10, 5, 15, tzinfo=UTC); s = start_session(db, 'Mia', t); add_score(db, Score('Sam', 'Classic', 70, t), s); print(sessions_report(db, 'Mia')); print(load_scores(db)[0].player)"
```

```text
['2026-10-05T15:00:00+00:00: still going, 1 played']
Sam
```

The session report says Mia played one game; the scores say that game was Sam's. That's the update anomaly from the practice table, in your own code. The game never does this, because the app always saves a score with its own player's session. But "the code happens not to" is a promise only as good as every line that will ever call `add_score`, and lesson 7.1 showed what a rule declared but not enforced is worth.

```check
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, load_scores, open_scores, start_session; from breakout.report import sessions_report; db = open_scores(Path(':memory:')); t = datetime(2026, 10, 5, 15, tzinfo=UTC); s = start_session(db, 'Mia', t); add_score(db, Score('Sam', 'Classic', 70, t), s); print(sessions_report(db, 'Mia')); print(load_scores(db)[0].player)\"" stdout="1 played" label="a score of Sam's counts as one of Mia's games"
```

## Two places that must agree

**Build:** a rule that makes two copies of a fact agree, tried in a practice database.

There are two ways out.

1. **Remove the copy.** A score in a session doesn't need its own `player_id`: ask the session. But scores saved before lesson 7.4 have no session, so they'd have no player at all. Removing the column would mean inventing a session for every old score, and lesson 7.2's rule is that a migration doesn't invent data.
2. **Keep the copy, and make disagreeing impossible.** If the database refuses any score whose `player_id` isn't its session's player, the two copies can't drift. This is denormalisation done properly: a copy kept on purpose, with a rule that guards it.

The rule is a **foreign key on two columns**. Try it on a new practice file:

```powershell
.venv\Scripts\python -m sqlite3 keys.db
```

```sql
CREATE TABLE sessions (id INTEGER PRIMARY KEY, player TEXT NOT NULL) STRICT;
CREATE UNIQUE INDEX sessions_id_player ON sessions (id, player);
CREATE TABLE scores (id INTEGER PRIMARY KEY, player TEXT NOT NULL, session_id INTEGER, points INTEGER NOT NULL, FOREIGN KEY (session_id, player) REFERENCES sessions (id, player)) STRICT;
PRAGMA foreign_keys = ON;
INSERT INTO sessions (player) VALUES ('Mia');
INSERT INTO scores (player, session_id, points) VALUES ('Mia', 1, 400);
INSERT INTO scores (player, session_id, points) VALUES ('Sam', 1, 70);
INSERT INTO scores (player, session_id, points) VALUES ('Sam', NULL, 150);
SELECT * FROM scores;
```

```text
IntegrityError (SQLITE_CONSTRAINT_FOREIGNKEY): FOREIGN KEY constraint failed
(1, 'Mia', 1, 400)
(2, 'Sam', None, 150)
```

- `FOREIGN KEY (session_id, player) REFERENCES sessions (id, player)` is written after the columns, as a **table constraint**, because it's about two columns at once. It says: the **pair** in this row must exist as a pair in `sessions`. Mia's score in session 1 is the pair `(1, 'Mia')`, which exists. Sam's score in session 1 is `(1, 'Sam')`, which doesn't: refused.
- Sam's score with no session is accepted: when any column of a foreign key is `NULL`, SQLite doesn't check it. Scores from before sessions keep working.
- `CREATE UNIQUE INDEX sessions_id_player ON sessions (id, player)` is required. The columns a foreign key points at must be unique together in the other table, so that each pair names exactly one row. `id` alone is already unique, so the pair is too, but SQLite needs an index that says so: an **index** is a sorted list of a table's values that SQLite keeps up to date, used to find rows fast (lesson 7.6 measures it), and a `UNIQUE` index also refuses duplicates. Leave it out and every insert fails with `foreign key mismatch - "scores" referencing "sessions"`.
- `PRAGMA foreign_keys = ON` is lesson 7.1's: this shell's connection wouldn't check otherwise.

Type `.quit`.

```check
run ".venv/Scripts/python -m sqlite3 keys.db \"SELECT COUNT(*) FROM scores\"" stdout="(2,)" label="Sam's score in Mia's session was refused"
```

## Migration 4: a table rebuilt

**Build:** the two-column rule on the real `scores` table, by a migration.

Lesson 7.2 listed what SQLite's `ALTER TABLE` can't do, and adding a table constraint to a table that exists is one of them. So migration 4 uses the standard procedure: build a new table with the rule, copy every row in, drop the old table, and give the new one the old name.

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

**Understand.** Migration 4, statement by statement, inside the transaction `migrate` wraps around it (lesson 7.2), so it happens completely or not at all:

```text
CREATE UNIQUE INDEX sessions_id_player ...   (id, player_id) unique in sessions: what the new key points at
CREATE TABLE scores_new (...)                the same columns as scores, in the same order, plus the
                                             two-column FOREIGN KEY; session_id's own REFERENCES goes,
                                             since the pair checks that the session exists too
INSERT INTO scores_new (...) SELECT ...      every row copied, ids included, so nothing that refers to a
                                             score's id changes
DROP TABLE scores                            the old table, gone
ALTER TABLE scores_new RENAME TO scores      the new table takes the old name, so no other code changes
```

The `INSERT ... SELECT` is lesson 7.1's, copying a whole table at once. With foreign keys on, every copied row is checked against the new rule as it goes in: a score in the wrong player's session would stop the migration right there. (SQLite's documentation adds one more step for tables that **other** tables refer to: turn foreign keys off while rebuilding, since dropping such a table would break them. No table refers to `scores`, so this migration doesn't need it.)

Open your `scores.db` to run it, and look at the result:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())"
.venv\Scripts\python -m sqlite3 scores.db "SELECT sql FROM sqlite_schema WHERE name = 'scores'"
```

```text
(4,)
('CREATE TABLE "scores" (\n        id INTEGER PRIMARY KEY,\n        player_id INTEGER NOT NULL REFERENCES players (id),\n        level TEXT NOT NULL,\n        points INTEGER NOT NULL CHECK (points >= 0),\n        played_at TEXT NOT NULL,\n        won INTEGER CHECK (won IN (0, 1)),\n        session_id INTEGER,\n        FOREIGN KEY (session_id, player_id) REFERENCES sessions (id, player_id)\n    ) STRICT',)
```

Version 4, and the table's definition has the new rule. SQLite put quotes around the new name, `"scores"`, when it renamed the table: double quotes are how SQL writes a table or column name (single quotes are for text). Your scores are all still there. Now run the demonstration from two steps ago again:

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, load_scores, open_scores, start_session; from breakout.report import sessions_report; db = open_scores(Path(':memory:')); t = datetime(2026, 10, 5, 15, tzinfo=UTC); s = start_session(db, 'Mia', t); add_score(db, Score('Sam', 'Classic', 70, t), s); print(sessions_report(db, 'Mia')); print(load_scores(db)[0].player)"
```

```text
sqlite3.IntegrityError: FOREIGN KEY constraint failed
```

The same mistake, refused by the database, for every program that will ever write to the file.

```check
contains breakout/scores.py "FOREIGN KEY (session_id, player_id) REFERENCES sessions (id, player_id)"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; print(open_scores(Path('scores.db')).execute('PRAGMA user_version').fetchone())\"" stdout="(4,)" label="your scores.db is at version 4"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, load_scores, open_scores, start_session; from breakout.report import sessions_report; db = open_scores(Path(':memory:')); t = datetime(2026, 10, 5, 15, tzinfo=UTC); s = start_session(db, 'Mia', t); add_score(db, Score('Sam', 'Classic', 70, t), s); print(sessions_report(db, 'Mia')); print(load_scores(db)[0].player)\"" exit=1 stderr="FOREIGN KEY constraint failed" label="a score in another player's session is refused"
run ".venv/Scripts/python -m pytest -q" stdout="133 passed" label="every test from before still passes"
```

## Tests for the rule

**Build:** tests that pin the rule down.

```python file=tests/test_one_fact.py
"""One fact in one place: a score in a session belongs to that session's player."""

import sqlite3
from datetime import UTC, datetime

import pytest

from breakout.scores import Score, add_score, load_scores, start_session

WHEN = datetime(2026, 10, 5, 15, 0, 0, tzinfo=UTC)


def test_a_score_in_the_players_own_session_is_saved(db: sqlite3.Connection):
    session = start_session(db, "Mia", WHEN)
    add_score(db, Score("Mia", "Classic", 400, WHEN), session)
    assert db.execute("SELECT session_id FROM scores").fetchall() == [(session,)]


def test_a_score_in_another_players_session_is_refused(db: sqlite3.Connection):
    session = start_session(db, "Mia", WHEN)
    with pytest.raises(sqlite3.IntegrityError):
        add_score(db, Score("Sam", "Classic", 70, WHEN), session)
    assert load_scores(db) == []


def test_a_score_with_no_session_is_still_saved(db: sqlite3.Connection):
    add_score(db, Score("Sam", "Castle", 150, WHEN))
    assert db.execute("SELECT session_id FROM scores").fetchall() == [(None,)]
```

**Understand.** Three tests, one for each row of the rule's table: the right session is accepted, the wrong player's session is refused, and no session at all is still fine. The second test also checks that the refused score left nothing behind: `add_score` runs inside `with db:` (lesson 6.3), so when the `INSERT` fails, the player Sam it added a moment earlier is rolled back too, and `load_scores` finds nothing.

```check
run ".venv/Scripts/python -m pytest -q tests/test_one_fact.py" stdout="3 passed"
run ".venv/Scripts/python -m pytest -q" stdout="136 passed"
```

## Your turn: a file that already disagrees

**Build, on your own:** click **Create provided tests/test_migration_4.py**, then make migration 4 work on files that already contain the mistake.

```python file=tests/test_migration_4.py provided
"""Migration 4 on a file that already has a score in the wrong player's session."""

import sqlite3
from pathlib import Path

from breakout import scores
from breakout.scores import open_scores

# A database as lesson 7.4's code could leave it: version 3, Mia's session 1, a score of hers in it, and a
# score of Sam's that was wrongly saved in her session too.
LESSON_7_4_DATABASE = """
CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK (name <> '')) STRICT;
CREATE TABLE scores (
    id INTEGER PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players (id),
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL,
    won INTEGER CHECK (won IN (0, 1)),
    session_id INTEGER REFERENCES sessions (id)
) STRICT;
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players (id),
    started_at TEXT NOT NULL,
    ended_at TEXT
) STRICT;
INSERT INTO players (name) VALUES ('Mia'), ('Sam');
INSERT INTO sessions (player_id, started_at) VALUES (1, '2026-10-05T15:00:00+00:00');
INSERT INTO scores (player_id, level, points, played_at, won, session_id) VALUES
    (1, 'Classic', 400, '2026-10-05T15:10:00+00:00', 1, 1),
    (2, 'Classic', 70, '2026-10-05T15:20:00+00:00', 0, 1);
PRAGMA user_version = 3;
"""


def lesson_7_4_file(tmp_path: Path) -> Path:
    path = tmp_path / "scores.db"
    old = sqlite3.connect(path)
    old.executescript(LESSON_7_4_DATABASE)
    old.close()
    return path


def test_a_file_that_already_disagrees_still_opens(tmp_path: Path):
    db = open_scores(lesson_7_4_file(tmp_path))
    assert db.execute("PRAGMA user_version").fetchone() == (len(scores.MIGRATIONS),)
    assert db.execute("SELECT COUNT(*) FROM scores").fetchone() == (2,)


def test_only_the_score_in_the_wrong_session_loses_its_session(tmp_path: Path):
    db = open_scores(lesson_7_4_file(tmp_path))
    rows = db.execute("SELECT player_id, session_id FROM scores ORDER BY id").fetchall()
    assert rows == [(1, 1), (2, None)]
```

Your `scores.db` migrated without trouble, because it never had a score in the wrong session. A player's file might. Run the new tests:

```powershell
.venv\Scripts\python -m pytest -q tests/test_migration_4.py
```

```text
FAILED tests/test_migration_4.py::test_a_file_that_already_disagrees_still_opens
FAILED tests/test_migration_4.py::test_only_the_score_in_the_wrong_session_loses_its_session
2 failed
```

Above the summary, both failures end with `sqlite3.IntegrityError: FOREIGN KEY constraint failed`. The copy into `scores_new` reaches Sam's score, the rule refuses it, the migration rolls back, and the file stays at version 3 for ever: lesson 7.2's stuck file, caused this time by the data, not the SQL. Decide what migration 4 should do with a score whose session belongs to someone else, and make it do that **before** the copy.

| Test | Result |
|---|---|
| `pytest -q tests/test_migration_4.py` | `2 passed` |
| the score in the wrong session | kept, with its points and its player, but no longer in that session |
| every other score | exactly as it was |

Change migration 4 itself. Lesson 7.2's rule says a migration that has **shipped** is never changed, and this one hasn't shipped: it exists only in your project, and your own file, already at version 4, had nothing for the new step to do. When all 138 tests pass and every check is clean, commit with a message that mentions **migration**.

```hints
nudge: Which of the two copies is the mistake: the score's player, or the session it was linked to? The test says what to keep. Then: an `UPDATE` can change those rows before the `INSERT ... SELECT` copies them.
concept: The score's own `player_id` came from the score itself; the session was passed alongside it, and is the likelier mistake. So keep the score and its player, and drop the link: set `session_id` to `NULL` for the scores whose player isn't their session's player. To find the session's player inside an `UPDATE`, use a **subquery**: a `SELECT` in brackets, used as a value. `(SELECT player_id FROM sessions WHERE sessions.id = scores.session_id)` runs once for each row the `UPDATE` looks at, with `scores.session_id` taken from that row: a subquery that refers to the outer row like this is called **correlated**. Don't compare with `NULL` using `=` (lesson 7.3): skip the scores with no session with `session_id IS NOT NULL`.
shape: One `UPDATE scores SET session_id = NULL WHERE session_id IS NOT NULL AND player_id <> (subquery);` as the first statement of migration 4, before the `CREATE UNIQUE INDEX`. Deleting the score instead would lose a game someone really played; a migration keeps data whenever it can.
answer: ~~~python
    # 4: a score in a session must be the session's player's (lesson 7.5). SQLite can't add a rule to a table
    # that exists, so scores is rebuilt: a new table with the rule, every row copied in, the old one replaced.
    """
    UPDATE scores SET session_id = NULL
    WHERE session_id IS NOT NULL
      AND player_id <> (SELECT player_id FROM sessions WHERE sessions.id = scores.session_id);
    CREATE UNIQUE INDEX sessions_id_player ON sessions (id, player_id);
~~~

The rest of the migration stays as it was. Traced for the test's file:

```text
score   player_id   session_id   the session's player   <> ?    after the UPDATE
1       1 (Mia)     1            1 (Mia)                false   session_id 1, kept
2       2 (Sam)     1            1 (Mia)                true    session_id NULL
```

Then the copy meets no mistakes, and the file reaches version 4 with both scores. A migration that meets data it can't keep as it is must choose what to keep, and choose deliberately: here, the game that was played, without the link nobody can vouch for.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_migration_4.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="138 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "migration"
git-clean
```

## Challenge: find the disagreements first

**Optional, ★.** Before a migration changes anyone's data, it's worth knowing how much it will change. Write the `SELECT` that lists every score whose player isn't its session's player, as a `JOIN` of `scores` to `sessions` this time instead of a subquery, and add it to the report tool as `python -m breakout.report SCORES_DB --check`. Try it on a copy of the test's 7.4 file. On a branch.

## Challenge: remove the copy instead

**Optional, ★★.** On a branch you **won't merge**, try way 1: a migration that gives every player one "before sessions" session covering their old scores (from their first `played_at` to their last: `MIN` and `MAX` with `GROUP BY`, lesson 7.3), links those scores to it, then rebuilds `scores` without `player_id`, with `session_id NOT NULL`. Every query that needs a score's player now joins through `sessions`. Then write down, in a sentence each, what that cost and what it bought, and why this lesson chose the other way.

## Challenge: levels as a table

**Optional, ★★★.** `scores.level` is a level's name, written in every score, like the practice table's `level`. While a level has no facts of its own in the database, that's only a reference; give it one, and it's the practice table's problem. Add a `designer` field to the level files (lesson 5.4's model), a `levels` table by migration (name and designer, filled from the existing scores' level names with `INSERT ... SELECT DISTINCT`), scores that refer to it by id, and a report line for every level, played or not. On a branch.

## What did we actually learn?

- **Normalisation**: every column states a fact about its table's key, the whole key, and nothing but the key. A **functional dependency** (`level → designer`) says where a fact belongs.
- The three anomalies a repeated fact causes: **update** (copies drift apart), **insert** (no place for a fact until something else exists), **delete** (removing one thing loses another).
- **One table per kind of thing**, joined by keys; normalised data costs a join to read, and is worth it.
- **Denormalising on purpose**: keep a copy only with a rule that guards it. A **two-column foreign key** makes two copies agree; the columns it points at need a `UNIQUE` index; `NULL` in it means "not checked".
- **Rebuilding a table** in a migration: create, copy, drop, rename, in one transaction.
- **A migration meets real data**: decide what to keep, before the copy, and test it on a file that already has the problem. **Correlated subqueries** look up a value per row.

Every relational database works this way: C#'s Entity Framework and Java's JPA both map one class to each normalised table and generate the joins, and both let you declare composite foreign keys (`HasForeignKey(s => new { s.SessionId, s.PlayerId })` in Entity Framework, `@JoinColumns` in JPA). Their migration tools (EF Core Migrations, Flyway and Liquibase in Java) run numbered migrations exactly like `MIGRATIONS`, and for SQLite, EF Core even performs the same create-copy-drop-rename rebuild when a change needs one.
