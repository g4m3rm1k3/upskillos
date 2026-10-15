---
title: 12.2 — Record What Was Applied
track: Database Engineering — Migrations and Compatibility
trackOrder: 46.12
runtime: none
---

Saving migration files is not enough: the running database must record which versions actually committed. Keep an immutable migration history.

## Lock, execute and record as one transaction

hashlib is Python's hashing library. encode converts text to UTF-8 bytes; sha256 computes a content fingerprint; hexdigest displays it as hexadecimal text. This detects accidental edits, not malicious tampering by a database administrator.

pg_advisory_xact_lock takes an application-chosen lock until transaction end. All migration runners must use the same lock key for it to serialize their work. CREATE TABLE IF NOT EXISTS only creates the ledger if missing; it is not a substitute for checking an old table's design. A previously recorded version with different content is refused. A new script and its ledger row commit together.

The script argument is trusted reviewed migration source, never an HTTP request. Most PostgreSQL DDL participates in transactions, but operations such as CREATE INDEX CONCURRENTLY have different transaction requirements and need a separate deployment step. This runner intentionally handles only transactional migrations. Versions are applied in a reviewed ordered release list; the ledger alone does not discover dependencies.

```python file=migrations.py
import hashlib

def apply_migration(db, version, script):
    checksum = hashlib.sha256(script.encode("utf-8")).hexdigest()
    with db.transaction():
        db.execute("SELECT pg_advisory_xact_lock(420701)")
        db.execute("CREATE TABLE IF NOT EXISTS schema_migrations "
                   "(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL)")
        row = db.execute("SELECT checksum FROM schema_migrations WHERE version=%s",
                         (version,)).fetchone()
        if row is not None:
            if row[0] != checksum:
                raise ValueError("Published migration changed")
            return False
        db.execute(script)
        db.execute("INSERT INTO schema_migrations VALUES(%s,%s)", (version, checksum))
        return True
```

```check
run "python checks/verify.py migration" exit=0 label="Retry unchanged migrations and roll back failed DDL" stdout="PASS migration" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Rehearse compatibility, not just empty installs

```predict
question: If a migration fails halfway, should its version be recorded as complete?
choice: No
choice: Yes
answer: No
explain: The ledger and schema change belong to the same successful transaction.
```

Run against a populated fixture, then exercise the old and new read/write contracts. Record lock waits and duration. Interrupt a backfill between batches and resume it. Do not restore an old binary until you know it can read the new schema. Keep the original migration immutable and add a corrective version when needed.



## Your turn: a repair decision

Create migration-review.txt describing the preflight condition, old-client compatibility, batch-resume rule, validation gate and forward-repair decision for severity. The automated check reruns a failed migration and verifies that no incomplete column or ledger entry remains; it does not assess your deployment judgment.


```hints
nudge: Write a decision for each transition, not only the final schema.
concept: A rollback plan must preserve data created by compatible newer clients.
shape: Describe preflight, expansion, resumption, validation and repair.
```

```check
run "python checks/verify.py migration" exit=0 label="The failure recovery remains atomic" stdout="PASS migration" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file migration-review.txt -- Record the compatibility and repair plan.
```
