---
title: 5.5 — Changing the Schema Safely: Migrations
track: Databases — The Experiment Database
runtime: none
concepts: data-access-layers
revisits: sql, testing, exceptions
lab: 32
problem: The service now needs to record where each prediction came from. The table already holds data you can't lose, and every copy of the database (yours, a colleague's, production's) is at a different stage. How do you change a live schema, everywhere, without breaking any of them?
---

A new requirement arrives: record **where each prediction came from**: the API, the web page, or a batch job. That's a new column on `predictions`.

On a brand-new database, you'd just add the column to `SCHEMA`. But look at what `SCHEMA` actually does: `CREATE TABLE IF NOT EXISTS`. On a database whose `predictions` table already exists, the whole statement is skipped, new column included. Your `experiments.db`, with its recorded predictions, would never get the column, and the first insert that uses it would fail.

Deleting the database and starting over isn't an option: that's the data the chapter exists to keep. What's needed is a way to say "from the schema as it is, go to the schema it should be", applied once to every copy of the database, in order, and recorded so it never happens twice. That's a **migration**.

> **Migration**: a numbered, ordered change to a database schema (add a column, create a table, add an index), together with a record, kept inside the database, of which migrations it has already had. Running "migrate" applies the ones that are missing, in order.
>
> *Picture it as* engineering change orders on a drawing. The drawing carries its current revision letter; each change order says "from revision C to revision D, do this". Any copy of the drawing, however old, can be brought up to date by applying the change orders after its revision, in order, and never applying one twice. **Where the picture stops working:** a change order is applied by a person; a migration is applied by code, so the same change is made exactly the same way on every copy.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_migrate.py provided
# Tests for migrate.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_migrate.py
import sqlite3

import pytest

import experiments
import migrate


def columns(db, table):
    return [row[1] for row in db.execute(f"PRAGMA table_info({table})")]


def test_migrate_brings_a_new_database_to_the_latest_version():
    db = sqlite3.connect(":memory:")
    assert migrate.migrate(db) == [1, 2, 3]
    assert migrate.version(db) == 3
    assert "source" in columns(db, "predictions")


def test_migrate_upgrades_an_existing_database_and_keeps_its_rows(tmp_path):
    db = experiments.connect(tmp_path / "old.db")          # the lesson 5.2 schema, version 0
    model = experiments.add_model(db, "linear-v1", ["sqft"])
    experiments.record(db, model, 1500, 3, 20, 252006.15)
    assert migrate.version(db) == 0
    migrate.migrate(db)
    assert tuple(db.execute("SELECT price, source FROM predictions").fetchone()) == (252006.15, "api")


def test_migrate_twice_changes_nothing_the_second_time():
    db = sqlite3.connect(":memory:")
    migrate.migrate(db)
    assert migrate.migrate(db) == []


def test_migrate_failure_leaves_the_database_as_it_was():
    db = sqlite3.connect(":memory:")
    migrate.migrate(db)
    broken = [*migrate.MIGRATIONS, "ALTER TABLE predictions ADD COLUMN client TEXT; CREATE TABLE models (x);"]
    with pytest.raises(sqlite3.OperationalError):
        migrate.migrate(db, broken)
    assert migrate.version(db) == 3
    assert "client" not in columns(db, "predictions"), "the half-done migration was rolled back"
```

The last test plants a migration that does one valid thing (adds a column) and then fails (the `models` table already exists). Afterwards, the database must be exactly as it was: version 3, no `client` column. A migration that's half-applied is the worst outcome of all: the database is at no known version, and neither "run migration 4" nor "skip migration 4" is right.

```check
file tests/test_migrate.py -- Click "Create provided tests/test_migrate.py" above.
```

## Migrations by hand

Create `migrate.py`:

```python file=migrate.py
import sqlite3

import experiments

# Never edit or reorder a migration once it has been run anywhere: add a new one.
MIGRATIONS = [
    # 1: the schema from lesson 5.2 (already there on existing databases, so IF NOT EXISTS skips it)
    experiments.SCHEMA,
    # 2: record where each prediction came from
    "ALTER TABLE predictions ADD COLUMN source TEXT NOT NULL DEFAULT 'api';",
    # 3: find a model's predictions in time order without sorting them
    "CREATE INDEX IF NOT EXISTS predictions_by_model_and_time ON predictions (model_id, created_at);",
]


def version(connection) -> int:
    return connection.execute("PRAGMA user_version").fetchone()[0]


def migrate(connection, migrations: list[str] = MIGRATIONS) -> list[int]:
    applied = []
    for number, script in enumerate(migrations, start=1):
        if number <= version(connection):
            continue
        try:
            connection.executescript(f"BEGIN; {script} PRAGMA user_version = {number}; COMMIT;")
        except sqlite3.Error:
            if connection.in_transaction:
                connection.rollback()
            raise
        applied.append(number)
    return applied
```

How it works, piece by piece:

- **`MIGRATIONS`** is the list of changes, oldest first. A migration's **number** is its position in the list, starting at 1 (`enumerate(…, start=1)`).
- **`PRAGMA user_version`** is a whole number SQLite keeps in the database file's header, free for applications to use. It starts at 0. This code uses it as the revision letter: "this database has had migrations up to number *n*". It lives **inside** the database, so a copied file carries its own version with it.
- **The loop skips** every migration whose number is at or below the current version, and applies the rest in order.
- **Each migration is one transaction**: `BEGIN;`, the migration's SQL, setting `user_version` to its number, `COMMIT;`, all in one `executescript`. In SQLite, schema changes (`ALTER TABLE`, `CREATE INDEX`) are transactional like inserts, so if any statement fails, everything since `BEGIN`, version number included, is undone. That's what the last test checks. (Not every database can do this: MySQL, for one, commits each schema change immediately, which makes failed migrations much messier there.)
- **`except sqlite3.Error: … raise`**: roll back anything still pending, then let the error continue to the caller. A failed migration must stop the program: carrying on with a database at an unknown version would be worse.

The two new migrations:

- **`ALTER TABLE predictions ADD COLUMN source TEXT NOT NULL DEFAULT 'api'`** adds the column to a table that already has rows. A `NOT NULL` column needs a value in every existing row, so the `DEFAULT` says what the old rows get: `'api'`, because every prediction recorded so far came from the API. This is the second test: an old row comes through the migration with its price intact and `source = 'api'`.
- **`CREATE INDEX … ON predictions (model_id, created_at)`** is an index on **two** columns: sorted by model, and within each model by time, so "this model's predictions, in time order" needs no sorting at all.

Migration 1 is lesson 5.2's `SCHEMA`. On a new database it creates everything; on a database made by `experiments.connect` before migrations existed (version 0, tables already there), every statement in it says `IF NOT EXISTS`, so it changes nothing but the version number. That's called a **baseline**: it brings old databases into the migration system without touching them.

```check
run ".venv/Scripts/python -m pytest -q tests/test_migrate.py" label="migrations apply in order, keep existing rows, never run twice, and roll back completely on failure" -- Put the migration and PRAGMA user_version = n inside one BEGIN ... COMMIT.
```

## Upgrade the real database

Create `upgrade.py`, the command you'd run on any copy of the database when the code is updated:

```python file=upgrade.py
import sys

import experiments
import migrate

path = sys.argv[1] if len(sys.argv) > 1 else "experiments.db"
connection = experiments.connect(path)
before = migrate.version(connection)
applied = migrate.migrate(connection)
print(f"{path}: version {before} -> {migrate.version(connection)}; applied {applied or 'nothing'}")
connection.close()
```

```powershell
.venv\Scripts\python upgrade.py
.venv\Scripts\python upgrade.py
```

```text
experiments.db: version 0 -> 3; applied [1, 2, 3]
experiments.db: version 3 -> 3; applied nothing
```

The first run upgrades your real database (with all its recorded predictions) to version 3; the second finds nothing to do. Check that the old predictions survived and gained their `source`:

```text
>>> import sqlite3
>>> db = sqlite3.connect("experiments.db")
>>> db.execute("SELECT id, price, source FROM predictions LIMIT 3").fetchall()
[(1, 252006.15, 'api'), (2, 269152.35, 'api'), (3, 286298.55, 'api')]
```

(Your rows depend on the estimates you made in lesson 5.3.)

```check
run ".venv/Scripts/python upgrade.py" stdout="-> 3" label="upgrade.py brings experiments.db to version 3"
```

## The professional version: Alembic

Every project with a database needs what you just wrote, and in Python the standard tool for it is **Alembic**, written by SQLAlchemy's author. You won't install it in this chapter, because you'd learn its configuration files rather than the idea, and you have the idea. Here's how your code maps onto it, so that when you meet an Alembic project (Chapter 15's ML Studio uses one), you'll recognise every part:

| Your `migrate.py` | Alembic |
|---|---|
| a string in `MIGRATIONS` | a **revision**: a Python file in `migrations/versions/` with an `upgrade()` function (and a `downgrade()` to undo it) |
| its position in the list | a random revision id, plus `down_revision`: the id of the revision it follows |
| `PRAGMA user_version` | a table called `alembic_version` holding the current revision id |
| `python upgrade.py` | `alembic upgrade head` ("head" is the newest revision) |
| writing the `ALTER TABLE` yourself | `alembic revision --autogenerate`: compares your SQLAlchemy classes with the database and *drafts* the migration for you to review |

Why the extra machinery? Revision ids instead of list positions let two developers write migrations on separate branches and notice when both followed the same revision. `downgrade()` lets a bad release be rolled back. And autogenerate saves typing, though it's a draft: it can't tell a renamed column from a dropped one plus a new one, and only a person reading the migration can.

The rules are the same whichever tool you use: **never edit a migration that has run anywhere; add a new one. Run migrations before the new code starts. Test them on a copy of real data.**

### Chapter 5: what you built, and why each piece exists

| Piece | The problem it fixed |
|---|---|
| A database file and SQL | Every estimate was lost when the program stopped |
| Primary keys | No way to refer to one particular record |
| Constraints (`NOT NULL`, `UNIQUE`, `CHECK`) | Bad data could be stored by any code path that forgot a check |
| Foreign keys and joins | Predictions with no record of which model made them |
| Transactions | Half-finished changes left behind by errors |
| Indexes | Every question reading the whole table |
| A repository | SQL scattered through the web routes |
| An environment variable for the database location | Tests writing into the real data |
| SQLAlchemy, with echo on | The schema described twice, and typos found only at run time |
| Migrations | No safe way to change a schema that already holds data |

The service now remembers, but it remembers for **everyone together**: any visitor can read the whole history, and nothing stops one person's model from being renamed or deleted by another. Next chapter: **users**, **logins**, and the security problems that arrive the moment a web service has anything worth protecting.
