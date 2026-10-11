---
title: 3 — Make the database the arbiter
track: Backend Developer Bootcamp — FastAPI — Equipment Booking
trackOrder: 51.01
runtime: none
---

Outcome: persist bookings and prove that two requests cannot reserve the same slot. SQL is introduced directly so the constraints remain visible before an ORM can hide them.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Create a transactional store

A primary key identifies a row. A unique constraint prevents duplicate business keys. `UNIQUE(equipment, day)` is the final authority even if two processes race. A SELECT followed by INSERT without a constraint is unsafe: both clients can observe an empty slot.

Placeholders bind values separately from SQL syntax; never assemble input into SQL with string interpolation. The context manager commits on success, rolls back on exception and always closes the connection. Every operation opens its own connection, avoiding accidental cross-thread sharing. The connection timeout bounds waiting for a writer.

`credentials` and `bookings` are separate tables because secrets and business records have different access and retention rules. A random token's SHA-256 digest can be stored instead of the raw token because the token has high entropy. This is NOT an appropriate password-storage method; human passwords require a password hashing function such as Argon2.

This is schema version 1, initialized for a new local database. `CREATE TABLE IF NOT EXISTS` does not migrate existing columns. Do not delete user data to simulate an upgrade.

```python file=store.py
import hashlib
import sqlite3
import time
from contextlib import contextmanager

SCHEMA = """
CREATE TABLE IF NOT EXISTS credentials (
 digest TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
 id INTEGER PRIMARY KEY, owner TEXT NOT NULL, equipment TEXT NOT NULL,
 day TEXT NOT NULL, UNIQUE(equipment, day)
);
PRAGMA user_version = 1;
"""

@contextmanager
def connect(path):
    db = sqlite3.connect(path, timeout=5)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()

def initialize(path):
    with connect(path) as db:
        db.executescript(SCHEMA)

def issue(path, token, owner, seconds=3600):
    with connect(path) as db:
        db.execute("INSERT INTO credentials VALUES (?, ?, ?)",
                   (hashlib.sha256(token.encode()).hexdigest(), owner, int(time.time()) + seconds))

def identity(path, token):
    with connect(path) as db:
        row = db.execute("SELECT owner FROM credentials WHERE digest=? AND expires>?",
                         (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
        return row["owner"] if row else None

def reserve(path, owner, equipment, day):
    with connect(path) as db:
        cursor = db.execute("INSERT INTO bookings(owner,equipment,day) VALUES (?,?,?)",
                            (owner, equipment, day))
        return {"id": cursor.lastrowid, "equipment": equipment, "day": day}

def owned(path, owner, booking_id):
    with connect(path) as db:
        row = db.execute("SELECT id,equipment,day FROM bookings WHERE id=? AND owner=?",
                         (booking_id, owner)).fetchone()
        return dict(row) if row else None
```


```predict
question: Can two successful preflight availability reads guarantee one winner?
choice: No
choice: Yes
answer: No
explain: Both reads may happen before either insert; uniqueness must be enforced atomically.
```

## Read the query plan

Run `python -c "import store; store.initialize('bookings.db')"`. In a Python session open `store.connect` and run `EXPLAIN QUERY PLAN SELECT id FROM bookings WHERE equipment=? AND day=?` with a sample pair. Compare it with filtering only by day. A composite index's column order matters. Normalization avoids repeated equipment metadata: if you later add descriptions, introduce an equipment table and a foreign key rather than copying descriptions into every booking. Enable and test SQLite foreign-key enforcement on every connection when adding that relationship.

## Your turn: design a safe schema upgrade

Add a migration that introduces an optional note without destroying existing bookings. Track the version, run the upgrade twice, and assert existing rows survive. Explain expand/backfill/contract and why an old app instance must tolerate the expanded schema during a rolling release.

Write your evidence in `evidence/data.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/data.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

Simulate an exception before commit and inspect the persisted count from a fresh connection. Explain why an ORM transaction still needs a database constraint.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
