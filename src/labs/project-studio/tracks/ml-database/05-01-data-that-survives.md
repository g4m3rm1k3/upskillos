---
title: 5.1 — Data That Survives: SQLite and SQL
track: Databases — The Experiment Database
trackOrder: 25
runtime: none
support: data/houses.csv, predictor.py
concepts: sql
revisits: http, tabular-data, testing, file-paths
lab: 28
problem: Every estimate the service gives is forgotten the moment it's sent. How do you keep data after the program that made it has stopped?
---

The price service from Chapter 4 answers every request and then forgets it. Restart it and there's no trace of what it estimated yesterday, for which houses, or with which model. That matters more than it sounds. To know whether a new model is better than the old one, you need the old one's predictions. To answer "why did the service quote this price last Tuesday?", you need last Tuesday.

Variables live in the computer's memory, which is wiped when the program ends. Data that must survive has to be written somewhere that outlasts the program. A text file would do for a handful of rows, but you'd be back to Chapter 1's problems: writing your own code to find rows, filter them, count them, and keep two programs from writing at once. A **database** does all of that, and the language for asking it things is **SQL**. This chapter builds the **experiment database**: every model you train and every prediction it makes, stored and queryable.

> **Database**: a program (or library) that stores data on disk in an organised way and answers questions about it. A **relational database** stores data in **tables**: each table has named **columns** (each with a type) and any number of **rows**.
>
> *Picture it as* the filing cabinet in a quality office, with one drawer per kind of record (parts, inspections, suppliers) and one card per record, every card in a drawer having the same boxes. It's still there when you come back tomorrow, and whoever looks after it can find any card quickly. **Where the picture stops working:** a real clerk might misfile a card; the database enforces the rules you set for every card, every time.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `experiment-db`.
2. `python -m venv .venv`
3. `requirements.txt`: this chapter's project ends with the database behind the Chapter 4 web service, so it starts with that service's packages:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

The database itself needs no installing. **SQLite** is a complete relational database in a single file, and Python's standard library includes it as the module `sqlite3`. It's used inside phones, browsers and aircraft systems: "lite" means "no separate server to run", not "toy".

```check
run ".venv/Scripts/python -c \"import sqlite3, fastapi; print(sqlite3.sqlite_version)\"" label="SQLite is available and the service's packages are installed" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/houses.csv` and `predictor.py`, the one-file model from lesson 4.1 (you wrote it there; this project gets a fresh copy).

```python file=tests/test_history.py provided
# Tests for history.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_history.py
import sqlite3

from pytest import approx

import history


def test_connect_creates_the_predictions_table():
    connection = history.connect(":memory:")
    tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")]
    assert tables == ["predictions"]


def test_connect_twice_keeps_what_was_there(tmp_path):
    path = tmp_path / "keep.db"
    history.connect(path).execute("INSERT INTO predictions (sqft, bedrooms, age, price, created_at) VALUES (1, 1, 1, 1, 'x')").connection.commit()
    assert history.connect(path).execute("SELECT COUNT(*) FROM predictions").fetchone()[0] == 1


def test_record_gives_each_prediction_a_new_id():
    connection = history.connect(":memory:")
    assert history.record(connection, 1500, 3, 20, 252006.15) == 1
    assert history.record(connection, 2000, 4, 5, 330000.0) == 2


def test_record_survives_a_restart(tmp_path):
    path = tmp_path / "survive.db"
    first = history.connect(path)
    history.record(first, 1500, 3, 20, 252006.15)
    first.close()
    second = history.connect(path)
    assert second.execute("SELECT price FROM predictions").fetchone()[0] == approx(252006.15)


def test_recent_lists_newest_first_up_to_a_limit():
    connection = history.connect(":memory:")
    for sqft in [1000, 1500, 2000]:
        history.record(connection, sqft, 3, 20, sqft * 150)
    rows = history.recent(connection, limit=2)
    assert [row["sqft"] for row in rows] == [2000, 1500]
    assert set(rows[0]) == {"id", "sqft", "bedrooms", "age", "price", "created_at"}


def test_recent_stores_the_time_in_utc():
    connection = history.connect(":memory:")
    history.record(connection, 1500, 3, 20, 1.0)
    assert history.recent(connection)[0]["created_at"].endswith("+00:00")
```

- **`":memory:"`** is a special path that makes SQLite keep the whole database in memory: gone when the connection closes, so perfect for tests that don't care about surviving. The tests that *do* care use a real file in `tmp_path`.
- **`test_record_survives_a_restart`** is the point of the chapter in one test: write, close, open again, and the data is still there.

```check
file tests/test_history.py -- Click "Create provided tests/test_history.py" above.
file predictor.py
```

## Tables and SQL, at the prompt

> **SQL** (Structured Query Language): the language for defining tables and asking a relational database for data. A **statement** is one instruction: `CREATE TABLE` makes a table, `INSERT` adds rows, `SELECT` reads them. You describe **what** you want, and the database works out **how** to get it.
>
> *Picture it as* filling in a request form at a records office ("all inspection cards for part 1500, newest first") instead of going into the cabinet and searching yourself. **Where the picture stops working:** a clerk might interpret a vague request; SQL is exact, and a statement means one thing.

Try SQL before writing any module. Start Python's prompt (`.venv\Scripts\python`) and type each line, predicting the results first:

```text
>>> import sqlite3
>>> connection = sqlite3.connect(":memory:")
>>> connection.execute("CREATE TABLE parts (id INTEGER PRIMARY KEY, name TEXT, weight REAL)")
<sqlite3.Cursor object at 0x...>
>>> connection.execute("INSERT INTO parts (name, weight) VALUES ('bracket', 0.25)")
<sqlite3.Cursor object at 0x...>
>>> connection.execute("INSERT INTO parts (name, weight) VALUES ('bolt', 0.02)")
<sqlite3.Cursor object at 0x...>
>>> connection.execute("SELECT * FROM parts").fetchall()
[(1, 'bracket', 0.25), (2, 'bolt', 0.02)]
>>> connection.execute("SELECT name FROM parts WHERE weight > 0.1").fetchall()
[('bracket',)]
>>> connection.execute("SELECT COUNT(*), SUM(weight) FROM parts").fetchone()
(2, 0.27)
```

Line by line:

- **`sqlite3.connect(path)`** opens (or creates) a database and returns a **connection**: your open line to it. Everything goes through `connection`.
- **`CREATE TABLE parts (…)`** defines a table and its columns: `name TEXT` is a text column, `weight REAL` a floating-point one. `id INTEGER PRIMARY KEY` is special: the **primary key**, a column whose value is different for every row, so it identifies the row. In SQLite, an `INTEGER PRIMARY KEY` you don't fill in is numbered automatically: 1, 2, 3…
- **`INSERT INTO parts (name, weight) VALUES (…)`** adds one row. Strings in SQL are in single quotes.
- **`SELECT * FROM parts`** reads every column (`*`) of every row. `.fetchall()` collects the result rows as a list of tuples.
- **`WHERE weight > 0.1`** keeps only matching rows: lesson 1.3's mask, in SQL.
- **`COUNT(*)`** and **`SUM(weight)`** are **aggregate functions**: they combine many rows into one value, like lesson 1.2's `describe`. `fetchone()` takes just the first result row.

`execute` returns a **cursor**, the object you read results from. The prompt shows it as `<sqlite3.Cursor object …>` when you don't ask it for rows.

## A table for predictions

Create `history.py`:

```python file=history.py
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    sqft REAL NOT NULL,
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
)
"""


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute(SCHEMA)
    return connection
```

- **The schema**, Chapter 1's word: the table's columns and their types, written once as a constant. Triple quotes let the SQL span several lines, which keeps a table definition readable.
- **`IF NOT EXISTS`** makes the statement safe to run every time the program starts: on a new database it creates the table; on an existing one it does nothing, and **the rows already there are kept**. Without it, the second connection would fail with `table predictions already exists`.
- **`NOT NULL`** is a **constraint**: a rule the database enforces on every row. `NULL` is SQL's "no value" (Python's `None`); `NOT NULL` refuses a row with that column missing. The database checks it, so no bug anywhere in your code can store a prediction without a price.
- **`connection.row_factory = sqlite3.Row`** changes what result rows look like: instead of plain tuples, `Row` objects that can be read by column name, `row["price"]`, as well as by position. `dict(row)` turns one into a dictionary.

```check
run ".venv/Scripts/python -m pytest -q tests/test_history.py -k connect" label="connect creates the table once, and opening again keeps the rows" -- CREATE TABLE IF NOT EXISTS, so running the schema again changes nothing.
```

## Record a prediction

Add `now` and `record`:

```python file=history.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    sqft REAL NOT NULL,
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
)
"""


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute(SCHEMA)
    return connection


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def record(connection, sqft: float, bedrooms: float, age: float, price: float) -> int:
    cursor = connection.execute(
        "INSERT INTO predictions (sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?)",
        (sqft, bedrooms, age, price, now()),
    )
    connection.commit()
    return cursor.lastrowid
```

**`?` placeholders.** The values aren't written into the SQL text. Each `?` is a slot, and the tuple after the SQL fills the slots in order. The database receives the statement and the values **separately**, so a value can never be mistaken for part of the statement. Never build SQL by pasting values into the string with an f-string: Chapter 6 shows how an attacker uses exactly that mistake to read or destroy a whole database (**SQL injection**). Placeholders make it impossible.

**`connection.commit()`** makes the change permanent.

> **Transaction**: a group of changes that the database applies all together or not at all. Changes made since the last commit are **pending**: other connections can't see them, and if the program crashes they're discarded. **Commit** makes them permanent; **rollback** discards them.
>
> *Picture it as* filling in a form in pencil and only inking it when it's complete. Until you ink it (commit), you can rub it all out (roll back), and nobody else treats a half-filled form as real.

Forget the commit and the insert seems to work (the same connection can see its own pending change), but nothing reaches the file: close the connection and it's gone. The test `test_record_survives_a_restart` catches exactly that.

**`cursor.lastrowid`** is the primary key SQLite gave the new row: the prediction's id, which the service will hand back so a client can refer to it later.

**`now()`** records *when*, as text in the **ISO 8601** format, `2026-10-04T00:01:21+00:00`: year first, so sorting the text sorts by time. **UTC** (`timezone.utc`) is the world's reference time, with no daylight saving. Storing local time is a classic bug: when the clocks go back, an hour of records happens twice, and a server in another time zone disagrees with you about what "yesterday" means. Store UTC; convert to local time only when showing it to a person.

```check
run ".venv/Scripts/python -m pytest -q tests/test_history.py -k record" label="record stores a prediction permanently and returns its id" -- Commit after the INSERT, then return cursor.lastrowid.
```

## Ask for the recent ones

Add `recent`:

```python file=history.py
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY,
    sqft REAL NOT NULL,
    bedrooms REAL NOT NULL,
    age REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL
)
"""


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute(SCHEMA)
    return connection


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def record(connection, sqft: float, bedrooms: float, age: float, price: float) -> int:
    cursor = connection.execute(
        "INSERT INTO predictions (sqft, bedrooms, age, price, created_at) VALUES (?, ?, ?, ?, ?)",
        (sqft, bedrooms, age, price, now()),
    )
    connection.commit()
    return cursor.lastrowid


def recent(connection, limit: int = 10) -> list[dict]:
    rows = connection.execute(
        "SELECT id, sqft, bedrooms, age, price, created_at FROM predictions ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]
```

Read the `SELECT` as a sentence: *select these columns from the predictions table, ordered by id, highest first (`DESC` for descending), and give me at most `limit` rows*. Ids only go up, so the highest ids are the newest predictions. The limit is a placeholder too: every value from outside the code goes through `?`.

`(limit,)` is a tuple with one element: the comma makes it a tuple. `(limit)` without the comma is just `limit` in brackets, and `execute` would complain that it expected a sequence.

```check
run ".venv/Scripts/python -m pytest -q tests/test_history.py" label="every history test passes" -- ORDER BY id DESC LIMIT ?, with (limit,) as the values.
```

## It survives a restart

Now prove it with a program that records a prediction and reports how many it has ever made. Create `remember.py`:

```python file=remember.py
import history
import predictor

connection = history.connect("history.db")
price = predictor.predict(1500, 3, 20)
history.record(connection, 1500, 3, 20, price)

total = connection.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
print(f"estimated {price:,.0f}; predictions stored so far: {total}")
for row in history.recent(connection, limit=3):
    print(f"  #{row['id']}  {row['created_at']}  {row['price']:,.0f}")
connection.close()
```

Run it three times:

```powershell
.venv\Scripts\python remember.py
.venv\Scripts\python remember.py
.venv\Scripts\python remember.py
```

```predict
question: After the third run, what does "predictions stored so far" say?
answer: 3
explain: Each run is a separate program: it starts with empty memory, connects to history.db, adds one row, commits, and ends. The row survives in the file, so the second run finds one row already there and adds a second, and the third run counts 3. A variable can't do that: a count kept in a Python variable would say 1 every time, because each run starts from nothing.

`history.db` is an ordinary file in the project folder: SQLite keeps the whole database, every table and row, in that one file. Copy it and you've copied the database.
verify: .venv/Scripts/python -c "import os, subprocess, sys; os.path.exists('history.db') and os.remove('history.db'); [subprocess.run([sys.executable, 'remember.py'], check=True, capture_output=True) for _ in range(3)]; import history; print(history.connect('history.db').execute('SELECT COUNT(*) FROM predictions').fetchone()[0])"
```

```check
run ".venv/Scripts/python remember.py" stdout="predictions stored so far:" label="remember.py records a prediction and counts what's stored"
file history.db -- Run remember.py once; it creates history.db.
```

### What you have, and what's missing

One table, rows that outlive the program, and four kinds of SQL statement. But look at what the table can't say: **which model** made each prediction. You'll train more than one model, and comparing them is the reason to keep the history at all. Next lesson: a second table for models, a link between the two, and the rules that keep the link honest.
