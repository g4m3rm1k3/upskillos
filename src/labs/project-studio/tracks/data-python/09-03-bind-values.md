---
title: 9.3 — Send Values Separately from SQL
track: Database Engineering — Application Code from the Beginning
trackOrder: 46.09
runtime: none
support: checks/verify.py
---

Now connect the language to the schema. The function receives a connection so tests and application boundaries can decide its lifetime.

## Provide an acceptance tool

Use Create provided for checks/README.txt. It also installs the supplied acceptance tool checks/verify.py. This is course testing machinery, not application code you are asked to copy or memorize. It creates a uniquely named temporary schema in your configured practice database, loads pg-model.sql and sample.sql, runs real assertions, and removes that schema afterward. It never deletes tracker.db or your normal PostgreSQL tables.

The check names below select specific behaviors. Read their printed failure to identify the violated contract. Later concurrency checks open real additional connections. These tools still cannot judge your explanation of a design.

```text file=checks/README.txt provided
Acceptance tools use your PostgreSQL connection settings and an isolated schema.
Run python checks/verify.py followed by the named case.
```



## Bind values rather than constructing syntax

Create issue.py. `strip()` removes surrounding whitespace; `not title` detects an empty string. `and` requires both conditions. Two adjacent quoted strings inside parentheses concatenate into one SQL command; this is formatting of a fixed command, not insertion of user text.

`%s` is a Psycopg value placeholder regardless of the value's type. Pass the values separately as the second argument. Do not quote the placeholders or substitute with Python's % operator or an f-string. CURRENT_TIMESTAMP supplies an instant. RETURNING exposes the inserted identity; fetchone reads one returned tuple and row[0] selects its first value.

Try a title containing an apostrophe and SQL-looking punctuation. It must be stored as data, not executed. A parameter cannot stand for a table name or sort direction: choose allowed SQL structure from a fixed allowlist instead.

```python file=issue.py
def create_ticket(db, project_id, title, minutes):
    title = title.strip()
    if not title:
        raise ValueError("A title is required")
    if minutes is not None and minutes < 0:
        raise ValueError("Negative estimate")
    row = db.execute(
        "INSERT INTO tickets(project_id,title,estimate_minutes,status,created_at) "
        "VALUES (%s,%s,%s,'open',CURRENT_TIMESTAMP) RETURNING ticket_id",
        (project_id, title, minutes),
    ).fetchone()
    return row[0]
```

```check
run "python checks/verify.py create" exit=0 label="Create and read a real parameterized ticket" stdout="PASS create" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Own the connection at the boundary

```predict
question: Should a title containing a quote be concatenated into SQL text?
choice: No
choice: Yes
answer: No
explain: Binding keeps value content separate from SQL structure.
```

A connection owns a session. `with psycopg.connect(autocommit=True) as db:` creates it and closes it when the indented block exits, even after an exception. Autocommit makes each independent statement its own transaction; a multi-write business operation still needs an explicit transaction block. Psycopg's default instead starts transactions implicitly, including on reads, which can leave a long-lived caller idle in transaction.

Use one connection at a time in this small CLI. A pool later manages reusable connections for requests; it is not a cache of query results. Never let a caller receive a connection left in a failed transaction or with another user's session context.



## Your turn: read one ticket

Create lookup.py defining ticket_title(db,ticket_id). Execute a parameterized SELECT title for that identity, call fetchone, return None if no row exists and otherwise return its first field. `if row is None` distinguishes absence from a row containing a NULL field.


```hints
nudge: fetchone may have no row to return.
concept: The one-parameter argument is a one-item tuple with a comma.
shape: Check row is None before indexing its first field.
```

```check
run "python checks/verify.py lookup" exit=0 label="Read an existing and a missing identity" stdout="PASS lookup" -- Run the command yourself and compare the actual result with the lesson trace.
```
