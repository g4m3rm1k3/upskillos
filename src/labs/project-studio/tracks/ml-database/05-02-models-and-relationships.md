---
title: 5.2 — Models, Predictions and the Links Between Them
track: Databases — The Experiment Database
runtime: none
concepts: sql
revisits: tabular-data, exceptions, testing, aggregation
lab: 28
problem: A prediction is useless for comparing models unless you know which model made it. How do you link records in different tables, and stop the links from ever pointing at nothing?
---

The `predictions` table from lesson 5.1 has no idea which model made each prediction. You could add a `model_name` text column and type `"linear-v1"` into every row, but then renaming a model means changing thousands of rows, a typo (`"linaer-v1"`) silently invents a new model, and facts about the model (its features, its test RMSE) have nowhere to live except copied into every prediction.

The relational answer: a **`models` table** with one row per model, and in each prediction, a column holding the **id** of the model that made it. This lesson builds that, and the rules that keep it honest: every prediction must point at a model that exists, names must be unique, and a batch of predictions is stored completely or not at all.

The code goes in a new module, `experiments.py`, so lesson 5.1's `history.py` and its tests stay as they were.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_experiments.py provided
# Tests for experiments.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_experiments.py
import sqlite3

import pytest
from pytest import approx

import experiments

FEATURES = ["sqft", "bedrooms", "age"]


@pytest.fixture
def db():
    return experiments.connect(":memory:")


def count(db, table):
    return db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def test_schema_has_two_tables(db):
    tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert tables == {"models", "predictions"}


def test_schema_turns_on_foreign_key_checks(db):
    assert db.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_model_names_are_unique(db):
    experiments.add_model(db, "linear-v1", FEATURES)
    with pytest.raises(sqlite3.IntegrityError, match="UNIQUE"):
        experiments.add_model(db, "linear-v1", ["sqft"])


def test_model_rmse_cannot_be_negative(db):
    with pytest.raises(sqlite3.IntegrityError, match="CHECK"):
        experiments.add_model(db, "broken", FEATURES, rmse=-1.0)


def test_link_needs_a_model_that_exists(db):
    with pytest.raises(sqlite3.IntegrityError, match="FOREIGN KEY"):
        experiments.record(db, 99, 1500, 3, 20, 1.0)


def test_link_refuses_a_house_with_no_floor_area(db):
    model = experiments.add_model(db, "linear-v1", FEATURES)
    with pytest.raises(sqlite3.IntegrityError, match="CHECK"):
        experiments.record(db, model, -500, 3, 20, 1.0)


def test_summary_joins_each_model_to_its_predictions(db):
    linear = experiments.add_model(db, "linear-v1", FEATURES)
    experiments.add_model(db, "sqft-only", ["sqft"])
    experiments.record(db, linear, 1500, 3, 20, 250000.0)
    experiments.record(db, linear, 2000, 4, 5, 330000.0)
    assert experiments.summary(db) == [
        {"name": "linear-v1", "predictions": 2, "average_price": approx(290000.0)},
        {"name": "sqft-only", "predictions": 0, "average_price": None},
    ]


def test_update_renames_a_model(db):
    model = experiments.add_model(db, "linear-v1", FEATURES)
    experiments.rename_model(db, model, "linear-final")
    assert [row["name"] for row in experiments.summary(db)] == ["linear-final"]


def test_delete_removes_a_model_and_its_predictions(db):
    model = experiments.add_model(db, "linear-v1", FEATURES)
    experiments.record(db, model, 1500, 3, 20, 1.0)
    experiments.delete_model(db, model)
    assert (count(db, "models"), count(db, "predictions")) == (0, 0)


def test_batch_is_all_or_nothing(db):
    model = experiments.add_model(db, "linear-v1", FEATURES)
    good, bad = (1500, 3, 20, 1.0), (-1, 3, 20, 2.0)
    with pytest.raises(sqlite3.IntegrityError):
        experiments.record_batch(db, model, [good, good, bad])
    assert count(db, "predictions") == 0, "the two good rows were rolled back with the bad one"


def test_index_finds_a_models_predictions_without_reading_them_all(db):
    plan = " ".join(row[3] for row in db.execute("EXPLAIN QUERY PLAN SELECT price FROM predictions WHERE model_id = 1"))
    assert "USING INDEX predictions_by_model" in plan
```

Every test checks a **rule the database itself enforces**, not just your Python code. `IntegrityError` is the exception `sqlite3` raises when a statement would break one of the table's rules; `match="UNIQUE"` checks which rule. That's the shift this lesson makes: rules about the data move from scattered `if` statements into the schema, where no code path can skip them.

(`count` builds SQL with an f-string, which lesson 5.1 told you never to do. It's safe *here* only because `table` always comes from the test's own code, never from outside. Table names can't be placeholders in SQL, so this is the one case where you have to be careful by hand.)

```check
file tests/test_experiments.py -- Click "Create provided tests/test_experiments.py" above.
```

## Two tables and a link

Create `experiments.py`:

```python file=experiments.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    features TEXT NOT NULL,
    rmse REAL CHECK (rmse >= 0),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models (id) ON DELETE CASCADE,
    sqft REAL NOT NULL CHECK (sqft > 0),
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str | Path, check_same_thread: bool = True) -> sqlite3.Connection:
    connection = sqlite3.connect(path, check_same_thread=check_same_thread)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection
```

The new parts of the schema, one rule each:

- **`UNIQUE`** on `name`: no two models may share a name, so a name can be used to find a model.
- **`CHECK (rmse >= 0)`**: a condition every row must satisfy. An RMSE is a square root, so a negative one can only be a bug. The column has no `NOT NULL`, so a model that hasn't been evaluated yet can have no RMSE (`NULL`), and `CHECK` treats `NULL` as allowed.
- **`CHECK (sqft > 0)`** on predictions: the same rule `House` enforced in Chapter 4, now enforced a second time by the database, for any program that writes to it.
- **`REFERENCES models (id)`** makes `model_id` a **foreign key**.

> **Foreign key**: a column whose value must be the primary key of a row in another table. It's how one row **refers** to another. The database refuses any row whose foreign key points at nothing.
>
> *Picture it as* the part number on a work order. The work order doesn't copy the part's drawing, material and revision onto itself; it just names the part, and the part number must exist in the parts list. Change the part's description and every work order sees the change, because they only ever stored the number. **Where the picture stops working:** a typo'd part number on paper goes unnoticed until someone looks; the database rejects it the moment it's written.

- **`ON DELETE CASCADE`**: when a model is deleted, its predictions are deleted with it, rather than being left pointing at a model that no longer exists. (The alternative, the default, is to refuse to delete a model that still has predictions. Which you want is a design decision; here, a model's predictions mean nothing without it.)

And in `connect`:

- **`PRAGMA foreign_keys = ON`**. SQLite, for compatibility with very old databases, *doesn't* check foreign keys unless told to, on every connection. Leave this out and the `REFERENCES` clause is decoration. A `PRAGMA` is a SQLite-specific setting, not standard SQL.
- **`executescript(SCHEMA)`**: `execute` runs exactly one statement; the schema now has two, separated by `;`. `executescript` runs several.
- **`check_same_thread`** passes through to `sqlite3.connect`. By default, a connection refuses to be used from any thread except the one that opened it. Lesson 5.3 puts this database behind the web service, whose requests run on several threads, and needs to turn that check off; it's a parameter now so `connect` doesn't have to change later.

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiments.py -k schema" label="two tables, with foreign-key checks switched on" -- PRAGMA foreign_keys = ON on every connection, then executescript(SCHEMA).
```

## Add models and predictions

Add `add_model` and `record` to `experiments.py`:

```python file=experiments.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    features TEXT NOT NULL,
    rmse REAL CHECK (rmse >= 0),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models (id) ON DELETE CASCADE,
    sqft REAL NOT NULL CHECK (sqft > 0),
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str | Path, check_same_thread: bool = True) -> sqlite3.Connection:
    connection = sqlite3.connect(path, check_same_thread=check_same_thread)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection


def add_model(connection, name: str, features: list[str], rmse: float | None = None) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO models (name, features, rmse, created_at) VALUES (?, ?, ?, ?)",
            (name, ",".join(features), rmse, now()),
        )
    return cursor.lastrowid


def record(connection, model_id: int, sqft: float, bedrooms: float, age: float, price: float) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO predictions (model_id, sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (model_id, sqft, bedrooms, age, price, now()),
        )
    return cursor.lastrowid
```

**`with connection:`** is the `with` statement from lesson 0.3, applied to a transaction. When the block finishes normally, the connection **commits**; when an exception escapes the block, it **rolls back** and lets the exception continue. (It does *not* close the connection, despite what `with open(...)` taught you to expect: for a `sqlite3` connection, the setup and cleanup are "start a transaction" and "commit or roll back".) So an insert that breaks a rule leaves nothing half-done behind.

`",".join(features)` stores the feature list as one text value, `"sqft,bedrooms,age"`. A list doesn't fit in one column; joining is the simplest honest way to keep it (a fully normalised design would give features their own table, which would be overkill here). `None` for `rmse` becomes SQL `NULL`.

Watch the rules work at the prompt:

```text
>>> import experiments
>>> db = experiments.connect(":memory:")
>>> experiments.add_model(db, "linear-v1", ["sqft", "bedrooms", "age"], 25889.0)
1
>>> experiments.add_model(db, "bad", ["sqft"], -1)
sqlite3.IntegrityError: CHECK constraint failed: rmse >= 0
>>> experiments.record(db, 99, 1500, 3, 20, 1.0)
sqlite3.IntegrityError: FOREIGN KEY constraint failed
>>> experiments.record(db, 1, 1500, 3, 20, 252006.15)
1
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiments.py -k \"test_model or test_link\"" label="the database refuses duplicate names, negative RMSEs, missing models and empty houses" -- Insert inside with connection: so a failed insert is rolled back.
```

## Questions across tables: JOIN

The question you built this for: *for each model, how many predictions has it made, and what's their average price?* The answer needs both tables. Add `summary`:

```python file=experiments.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    features TEXT NOT NULL,
    rmse REAL CHECK (rmse >= 0),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models (id) ON DELETE CASCADE,
    sqft REAL NOT NULL CHECK (sqft > 0),
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str | Path, check_same_thread: bool = True) -> sqlite3.Connection:
    connection = sqlite3.connect(path, check_same_thread=check_same_thread)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection


def add_model(connection, name: str, features: list[str], rmse: float | None = None) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO models (name, features, rmse, created_at) VALUES (?, ?, ?, ?)",
            (name, ",".join(features), rmse, now()),
        )
    return cursor.lastrowid


def record(connection, model_id: int, sqft: float, bedrooms: float, age: float, price: float) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO predictions (model_id, sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (model_id, sqft, bedrooms, age, price, now()),
        )
    return cursor.lastrowid


def summary(connection) -> list[dict]:
    rows = connection.execute(
        """
        SELECT models.name, COUNT(predictions.id) AS predictions, AVG(predictions.price) AS average_price
        FROM models
        LEFT JOIN predictions ON predictions.model_id = models.id
        GROUP BY models.id
        ORDER BY models.name
        """
    ).fetchall()
    return [dict(row) for row in rows]
```

> **Join**: combining rows from two tables by matching a column in one with a column in the other, usually a foreign key with the primary key it refers to. `predictions JOIN models ON models.id = predictions.model_id` pairs each prediction with its own model's row.
>
> *Picture it as* laying the work orders next to the parts list and, for each work order, reading across to the part whose number matches. Each combined line has the work order's facts and the part's facts side by side.

Read the query clause by clause, in the order the database applies them:

1. **`FROM models LEFT JOIN predictions ON predictions.model_id = models.id`**: pair every model with each of its predictions. A plain `JOIN` keeps only pairs that match, so a model with no predictions would vanish from the answer. **`LEFT JOIN`** keeps every row of the *left* table (`models`) even with no match, filling the prediction columns with `NULL`. That's how `sqft-only` appears with 0 predictions.
2. **`GROUP BY models.id`**: split the paired rows into one group per model: lesson 1.2's *split, apply, combine*, in SQL.
3. **`COUNT(predictions.id)`** and **`AVG(predictions.price)`** are applied to each group. `COUNT` of a column counts the non-`NULL` values, so the left-joined `NULL` row of a model with no predictions counts as 0, and `AVG` of nothing is `NULL` (`None` in Python).
4. **`AS predictions`**, **`AS average_price`** name the result columns, so `dict(row)` has sensible keys.
5. **`ORDER BY models.name`**: alphabetical, so the answer comes back in the same order every time.

`models.name` and `predictions.price` are written **table.column**, because both tables have columns named `id` and `created_at`; naming the table removes the ambiguity.

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiments.py -k summary" label="summary counts and averages each model's predictions, including models with none" -- LEFT JOIN keeps models with no predictions; GROUP BY models.id.
```

## Change, delete, and all or nothing

The rest of **CRUD**: **C**reate (INSERT), **R**ead (SELECT), **U**pdate, **D**elete, the four things any program does with stored records. Add the last two, and a batch insert:

```python file=experiments.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    features TEXT NOT NULL,
    rmse REAL CHECK (rmse >= 0),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models (id) ON DELETE CASCADE,
    sqft REAL NOT NULL CHECK (sqft > 0),
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str | Path, check_same_thread: bool = True) -> sqlite3.Connection:
    connection = sqlite3.connect(path, check_same_thread=check_same_thread)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection


def add_model(connection, name: str, features: list[str], rmse: float | None = None) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO models (name, features, rmse, created_at) VALUES (?, ?, ?, ?)",
            (name, ",".join(features), rmse, now()),
        )
    return cursor.lastrowid


def record(connection, model_id: int, sqft: float, bedrooms: float, age: float, price: float) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO predictions (model_id, sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (model_id, sqft, bedrooms, age, price, now()),
        )
    return cursor.lastrowid


def record_batch(connection, model_id: int, rows: list[tuple[float, float, float, float]]) -> None:
    with connection:
        for sqft, bedrooms, age, price in rows:
            connection.execute(
                "INSERT INTO predictions (model_id, sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (model_id, sqft, bedrooms, age, price, now()),
            )


def rename_model(connection, model_id: int, name: str) -> None:
    with connection:
        connection.execute("UPDATE models SET name = ? WHERE id = ?", (name, model_id))


def delete_model(connection, model_id: int) -> None:
    with connection:
        connection.execute("DELETE FROM models WHERE id = ?", (model_id,))


def summary(connection) -> list[dict]:
    rows = connection.execute(
        """
        SELECT models.name, COUNT(predictions.id) AS predictions, AVG(predictions.price) AS average_price
        FROM models
        LEFT JOIN predictions ON predictions.model_id = models.id
        GROUP BY models.id
        ORDER BY models.name
        """
    ).fetchall()
    return [dict(row) for row in rows]
```

- **`UPDATE models SET name = ? WHERE id = ?`** changes a column in every row that matches the `WHERE`. Because predictions store only the model's id, renaming the model changes one row, and every prediction "sees" the new name through the join.
- **`DELETE FROM models WHERE id = ?`** removes matching rows, and `ON DELETE CASCADE` removes the model's predictions in the same statement.

**Always write the `WHERE`.** `UPDATE models SET name = 'x'` with no `WHERE` renames **every** model, and `DELETE FROM models` deletes them all, along with every prediction. SQL doesn't ask "are you sure?".

**`record_batch`** puts every insert inside **one** `with connection:` block: one transaction. The test sends two good rows and one bad one. The first two inserts succeed (pending, uncommitted), the third raises `IntegrityError`, the exception leaves the `with` block, and the connection rolls back **all three**. Either the whole batch is stored or none of it is.

```predict
question: If record_batch called record() for each row instead (each with its own `with connection:`), how many predictions would the test find after the bad batch?
answer: 2
explain: Each record() commits its own transaction. The two good rows would each be committed before the third row failed, so they'd stay: 2 rows of a batch that, as a whole, was rejected. Half a batch in the database is usually worse than none, because nothing marks which half is there. One transaction around the whole batch is what makes it all-or-nothing.
verify: script batch_without_one_transaction.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiments.py -k \"update or delete or batch\"" label="rename, delete (with its predictions), and an all-or-nothing batch" -- One with connection: around the whole loop in record_batch.
```

## Find it fast: an index

"All predictions made by model 1" is the question this database will be asked most. Ask SQLite **how** it would answer, with `EXPLAIN QUERY PLAN`:

```text
>>> import experiments
>>> db = experiments.connect(":memory:")
>>> db.execute("EXPLAIN QUERY PLAN SELECT price FROM predictions WHERE model_id = 1").fetchone()[3]
'SCAN predictions'
```

**SCAN** means "read every row of the table and check each one". With 50 rows, instant. With 50 million predictions, every question about one model reads all 50 million.

> **Index**: an extra structure the database keeps alongside a table, sorted by one or more columns, so rows with a given value can be found without reading the whole table. The database keeps it up to date on every insert, update and delete.
>
> *Picture it as* the index at the back of a manual. To find every page about "spindle", you don't read the manual cover to cover; you look up "spindle" in the alphabetical index and go straight to the pages listed. **Where the picture stops working:** a printed index is written once; a database index is rewritten on every change, which is its cost: every insert does a little extra work.

Add one line to the end of the schema in `experiments.py`:

```python file=experiments.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    features TEXT NOT NULL,
    rmse REAL CHECK (rmse >= 0),
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models (id) ON DELETE CASCADE,
    sqft REAL NOT NULL CHECK (sqft > 0),
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS predictions_by_model ON predictions (model_id);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: str | Path, check_same_thread: bool = True) -> sqlite3.Connection:
    connection = sqlite3.connect(path, check_same_thread=check_same_thread)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)
    return connection


def add_model(connection, name: str, features: list[str], rmse: float | None = None) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO models (name, features, rmse, created_at) VALUES (?, ?, ?, ?)",
            (name, ",".join(features), rmse, now()),
        )
    return cursor.lastrowid


def record(connection, model_id: int, sqft: float, bedrooms: float, age: float, price: float) -> int:
    with connection:
        cursor = connection.execute(
            "INSERT INTO predictions (model_id, sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (model_id, sqft, bedrooms, age, price, now()),
        )
    return cursor.lastrowid


def record_batch(connection, model_id: int, rows: list[tuple[float, float, float, float]]) -> None:
    with connection:
        for sqft, bedrooms, age, price in rows:
            connection.execute(
                "INSERT INTO predictions (model_id, sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (model_id, sqft, bedrooms, age, price, now()),
            )


def rename_model(connection, model_id: int, name: str) -> None:
    with connection:
        connection.execute("UPDATE models SET name = ? WHERE id = ?", (name, model_id))


def delete_model(connection, model_id: int) -> None:
    with connection:
        connection.execute("DELETE FROM models WHERE id = ?", (model_id,))


def summary(connection) -> list[dict]:
    rows = connection.execute(
        """
        SELECT models.name, COUNT(predictions.id) AS predictions, AVG(predictions.price) AS average_price
        FROM models
        LEFT JOIN predictions ON predictions.model_id = models.id
        GROUP BY models.id
        ORDER BY models.name
        """
    ).fetchall()
    return [dict(row) for row in rows]
```

Ask again, on a new connection: the plan is now `SEARCH predictions USING INDEX predictions_by_model (model_id=?)`. **SEARCH** means "jump to the matching rows": in a sorted index, finding a value among *n* rows takes about log₂(*n*) steps, around 26 steps for 50 million rows instead of 50 million.

Why not index every column? Each index makes every insert slower and the file bigger. Index the columns you search by often, and check with `EXPLAIN QUERY PLAN` that the database actually uses the index. (Primary keys are always indexed: that's what made `WHERE id = ?` fast all along.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_experiments.py" label="every experiments test passes, and the query uses the index" -- CREATE INDEX IF NOT EXISTS predictions_by_model ON predictions (model_id);
```

### What you have

Two tables linked by a foreign key, rules the database enforces on every row, a join that answers questions across them, all four CRUD operations, transactions, and an index. Next lesson: the code that talks to this database gets a single home, a **repository**, and the web service from Chapter 4 starts recording every prediction it makes.
