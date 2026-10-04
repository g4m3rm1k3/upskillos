---
title: 6.4 — Bob's Castle
runtime: python
run: breakout/__main__.py
---

A teammate has written a tool for level designers: it reports how a level's games have gone, and can forget a level's scores. It works on every level they tried. This lesson adds one more level, with an apostrophe in its name, and the tool falls over. Then it shows that the same mistake lets anyone who chooses a level's name read or delete every score in the database. That mistake, **SQL injection**, has been near the top of every list of the most common security flaws for twenty years. You'll find it, see what it can do, set up a tool that spots it, and fix it for good.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 6.3, the reference answer to its Your turn.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT
"""


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute(SCHEMA)
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

```check
run ".venv/Scripts/python -m pytest -q" stdout="103 passed"
```

## Bob's Castle

**Build:** a level named by a designer called Bob.

Create `breakout/levels/bobs-castle.json`:

```json file=breakout/levels/bobs-castle.json
{
  "name": "Bob's Castle",
  "lives": 3,
  "wall": [
    "T.TTTT.T",
    "BBBBBBBB"
  ]
}
```

Play it to the end, keeping the score in `scores.db`:

```powershell
.venv\Scripts\breakout --test-run 10000 --hold auto --level breakout/levels/bobs-castle.json --scores scores.db
```

```text
frames=10000 paddle_x=378 score=260 lives=3 bricks=0 inside=True
```

The game saves it without trouble: `add_score` passes the name with a `?` placeholder (lesson 6.3). Look:

```powershell
.venv\Scripts\python -m sqlite3 scores.db "SELECT level, points FROM scores WHERE level = 'Bob''s Castle'"
```

```text
("Bob's Castle", 260)
```

To write an apostrophe inside an SQL text value, you double it: `'Bob''s Castle'`. Remember that.

```check
run ".venv/Scripts/breakout --test-run 10000 --hold auto --level breakout/levels/bobs-castle.json --scores scores.db" stdout="score=260" label="Bob's Castle plays to the end and is saved"
```

## A teammate's report

**Build:** click **Create provided breakout/report.py**, and read it before running it.

```python file=breakout/report.py provided
"""Level reports for level designers: how a level's games have gone. Written by a teammate.

usage: python -m breakout.report SCORES_DB LEVEL            how the level's games have gone
       python -m breakout.report SCORES_DB LEVEL --forget   delete the level's scores
"""

import sqlite3
import sys


def report(db: sqlite3.Connection, level: str) -> str:
    played, best, average = db.execute(
        f"SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = '{level}'"
    ).fetchone()
    if played == 0:
        return f"{level}: no scores yet"
    return f"{level}: {played} played, best {best}, average {average:.0f}"


def forget(db: sqlite3.Connection, level: str) -> int:
    with db:
        return db.execute(f"DELETE FROM scores WHERE level = '{level}'").rowcount


if __name__ == "__main__":
    db = sqlite3.connect(sys.argv[1])
    if "--forget" in sys.argv[3:]:
        print(f"forgot {forget(db, sys.argv[2])} scores")
    else:
        print(report(db, sys.argv[2]))
    db.close()
```

**Understand: reading it.** This is lesson 3.5's skill again: someone else's code, read before it's trusted.

- `report` runs one `SELECT` with three aggregates (`COUNT(*)` rows, the `MAX` points, the `AVG`, average, points), unpacks the one row it returns into three names, and turns them into a sentence. `{average:.0f}` formats a number with no decimal places.
- `forget` deletes every score on a level, in a transaction, and returns `rowcount`, the number of rows the `DELETE` changed.
- At the bottom, `sys.argv[1]` is the database file and `sys.argv[2]` the level; `--forget` anywhere after them switches to forgetting.
- And both queries are built with **f-strings**: the level's name is pasted into the SQL text between single quotes.

Try it on the classic level:

```powershell
.venv\Scripts\python -m breakout.report scores.db Classic
```

```text
Classic: 2 played, best 560, average 300
```

Your numbers depend on the games you've saved. Now predict before you run it on Bob's level:

```predict
question: What SQL text does `report` send to the database for the level `Bob's Castle`?
choice: SELECT ... WHERE level = 'Bob''s Castle'
choice: SELECT ... WHERE level = 'Bob's Castle'
choice: SELECT ... WHERE level = Bob's Castle
answer: SELECT ... WHERE level = 'Bob's Castle'
explain: The f-string pastes the name in exactly as it is, between the two quotes the code wrote. SQL reads `'Bob'` as a complete text value, because the apostrophe closes it, and then `s Castle'` as more SQL, which isn't valid SQL. Nothing doubled the apostrophe, because nothing in the f-string knows it's building SQL.
```

```powershell
.venv\Scripts\python -m breakout.report scores.db "Bob's Castle"
```

```text
sqlite3.OperationalError: near "s": syntax error
```

```check
file breakout/report.py -- Click "Create provided breakout/report.py" above.
run ".venv/Scripts/python -m breakout.report scores.db Classic" stdout="Classic: " label="the report works for the classic level"
```

## When data becomes code

**Understand, by trying it on a copy.** A crash on an apostrophe is the harmless version. The level's name decides what SQL runs, and a level's name is chosen by whoever made the level. Make a copy of the database to attack:

```powershell
Copy-Item scores.db attack.db
.venv\Scripts\python -m breakout.report attack.db "x' OR '1'='1"
```

```text
x' OR '1'='1: 3 played, best 560, average 287
```

The f-string built `WHERE level = 'x' OR '1'='1'`: the "name" closed the quote and added SQL of its own. `'1'='1'` is true for every row, so the condition matches every score in the table, on every level. With `--forget`:

```powershell
.venv\Scripts\python -m breakout.report attack.db "x' OR '1'='1" --forget
.venv\Scripts\python -m breakout.report attack.db Classic
```

```text
forgot 3 scores
Classic: no scores yet
```

Every score, gone, by asking to forget a level that doesn't exist. This is **SQL injection**: input meant to be **data** is pasted into a command and becomes part of the **code**. In a real service, the same mistake lets a stranger read every user's data, log in as anyone, or delete everything, and it's how many of the largest data breaches on record began. The well-known joke is a mother who named her son `Robert'); DROP TABLE Students;--` and a school that lost its records.

Remove the copy:

```powershell
Remove-Item attack.db
```

**Why not double the apostrophes?** It's tempting to fix it by escaping: `level.replace("'", "''")`. That works for this one database and this one kind of quote, until it doesn't: other databases have other rules (backslashes, other quote characters, text encodings), and every query written by every person on the team must remember it, forever. The real fix removes the problem instead of patching it: the **placeholder** from lesson 6.3. With `?`, the SQL text is fixed and the value travels **separately**. The database receives "compare `level` with the first value", and the value is only ever a value, whatever characters it contains. There's nothing to escape because nothing is pasted.

```check
missing attack.db -- Remove-Item attack.db: it was only for the attack.
```

## A tool that spots it

**Build:** turn on ruff's check for SQL built from strings.

```toml file=pyproject.toml
[project]
name = "breakout"
version = "0.1.0"
description = "Breakout, built through the Forge series."
requires-python = ">=3.12"
dependencies = ["pygame-ce==2.5.8", "pydantic==2.13.5"]

[project.scripts]
breakout = "breakout.app:run"

[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
packages = ["breakout"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 120

[tool.ruff.lint]
# On top of ruff's default rules: S608 finds SQL built from strings (lesson 6.4).
extend-select = ["S608"]

[tool.pyright]
venvPath = "."
venv = ".venv"
typeCheckingMode = "strict"

[tool.coverage.run]
patch = ["subprocess"]
```

```powershell
.venv\Scripts\python -m ruff check .
```

```text
S608 Possible SQL injection vector through string-based query construction
  --> breakout\report.py:13:9
...
Found 2 errors.
```

**Understand.** ruff's default rules are a careful minimum. `[tool.ruff.lint]` adds more, by code: `extend-select = ["S608"]` adds one rule from its **S** group, which comes from the security linter **Bandit**, and spots strings that look like SQL being built with f-strings, `+` or `%`. Turning it on makes `ruff check`, part of the definition of done since lesson 3.6, fail until the report is fixed. A tool like this doesn't replace knowing why: it catches the slip on a tired day, in code you didn't write, and in code an AI assistant wrote for you.

```check
run ".venv/Scripts/python -m ruff check ." exit=1 stdout="Found 2 errors." label="ruff finds both injectable queries"
```

## Your turn: names are only names

**Build, on your own:** fix `breakout/report.py` so that a level's name can never change the SQL, and pin it with tests.

Use placeholders in both queries. Then create `tests/test_report.py`:

| Test name | Checks |
|---|---|
| `test_a_level_with_an_apostrophe_is_reported` | with one 100-point game on `Bob's Castle`, the report is exactly `Bob's Castle: 1 played, best 100, average 100` |
| `test_sql_in_a_level_name_is_only_a_name` | with games on `Classic` and `Castle`, the report for `x' OR '1'='1` is `x' OR '1'='1: no scores yet` |
| `test_forgetting_a_name_with_sql_in_it_deletes_nothing` | with games on `Classic` and `Castle`, forgetting `x' OR '1'='1` returns 0, and both scores are still there |

Each test makes its own database in `tmp_path` with `open_scores` and adds its scores with `add_score`, then closes it. Write the tests first and watch all three fail, then fix the report. When all 106 tests pass and every check is clean, commit with a message that mentions **injection**.

```hints
nudge: What did `add_score` do with the level's name that `report` doesn't?
concept: In both queries, put `?` where `'{level}'` was, with no quotes around it (the placeholder is the whole value), make the string a plain string instead of an f-string, and pass `(level,)` as the second argument to `execute`. For the tests, three tests all need a database with a few scores in it: a small helper that opens one in `tmp_path` and adds one score per level name saves writing it three times.
shape: In `report.py`: `db.execute("SELECT ... WHERE level = ?", (level,))` and `db.execute("DELETE FROM scores WHERE level = ?", (level,))`. In the tests: imports from `breakout.report` and `breakout.scores`, a `WHEN` datetime in UTC, a helper `scores_for(tmp_path, *levels)` returning the connection, and three tests that call `report` or `forget` and then `db.close()`.
answer: ~~~python
def report(db: sqlite3.Connection, level: str) -> str:
    played, best, average = db.execute(
        "SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = ?", (level,)
    ).fetchone()
    if played == 0:
        return f"{level}: no scores yet"
    return f"{level}: {played} played, best {best}, average {average:.0f}"


def forget(db: sqlite3.Connection, level: str) -> int:
    with db:
        return db.execute("DELETE FROM scores WHERE level = ?", (level,)).rowcount
~~~

and `tests/test_report.py`:

~~~python
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from breakout.report import forget, report
from breakout.scores import Score, add_score, load_scores, open_scores

WHEN = datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)
INJECTION = "x' OR '1'='1"


def scores_for(tmp_path: Path, *levels: str) -> sqlite3.Connection:
    """A new scores database with one 100-point game on each of these levels."""
    db = open_scores(tmp_path / "scores.db")
    for level in levels:
        add_score(db, Score(level, 100, WHEN))
    return db


def test_a_level_with_an_apostrophe_is_reported(tmp_path: Path):
    db = scores_for(tmp_path, "Bob's Castle")
    assert report(db, "Bob's Castle") == "Bob's Castle: 1 played, best 100, average 100"
    db.close()


def test_sql_in_a_level_name_is_only_a_name(tmp_path: Path):
    db = scores_for(tmp_path, "Classic", "Castle")
    assert report(db, INJECTION) == f"{INJECTION}: no scores yet"
    db.close()


def test_forgetting_a_name_with_sql_in_it_deletes_nothing(tmp_path: Path):
    db = scores_for(tmp_path, "Classic", "Castle")
    assert forget(db, INJECTION) == 0
    assert len(load_scores(db)) == 2
    db.close()
~~~

The f-strings that remain in `report` are fine: they build a sentence for a person to read, not SQL. The rule is about where a string goes, not about f-strings: **values never become part of SQL text**. The tests use the very attack you ran by hand, so if anyone ever brings the f-string back, they fail, and so does ruff.
```

```check
run ".venv/Scripts/python -m breakout.report scores.db \"Bob's Castle\"" stdout="best 260" label="Bob's Castle is reported"
run ".venv/Scripts/python -m breakout.report scores.db \"x' OR '1'='1\"" stdout="no scores yet" label="SQL in a name matches nothing"
run ".venv/Scripts/python -m breakout.report scores.db \"x' OR '1'='1\" --forget" stdout="forgot 0 scores" label="SQL in a name deletes nothing"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!" -- Use ? placeholders in both queries: ruff's S608 still sees SQL built from a string.
run ".venv/Scripts/python -m pytest -q tests/test_report.py" stdout="3 passed"
run ".venv/Scripts/python -m pytest -q" stdout="106 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
git-message "injection"
git-clean
```

## What did we actually learn?

- **SQL injection**: a value pasted into SQL text can end the value and add SQL of its own. Data becomes code.
- **Placeholders** are the fix: the SQL text never changes, and values travel separately. Escaping by hand is not a fix.
- **Who controls this data?** A level's name looked like the game's own data, and is chosen by whoever made the level.
- **Read code before trusting it**, especially code that touches data: look for where values go.
- **ruff's S608** (from Bandit) finds SQL built from strings; `extend-select` adds rules beyond the defaults.
- **Regression tests made of the attack itself.**

Every language has this flaw and the same fix. In C#, `command.Parameters.AddWithValue("@level", level)` with `WHERE level = @level` in the SQL, and analysers that warn when SQL is built by concatenation; in Java, `PreparedStatement` with `?` and `statement.setString(1, level)`, and never a `Statement` with `+`. The ORMs you'll meet later (SQLAlchemy in Chapter 27, Entity Framework in C#, Hibernate in Java) use parameters for you, and each still has a way to write raw SQL, where the same rule applies.
