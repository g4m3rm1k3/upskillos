---
title: 10.3 — Retry the Whole Transaction
track: Database Engineering — Concurrent Users and Retries
trackOrder: 46.1
runtime: none
---

An operation can fail because another transaction committed a conflicting change. Reusing the failed transaction or retrying only its last statement is not a valid recovery.

## Pass an operation, not its result

A function can be passed as a value. connect and operation below are callable parameters: connect() opens a fresh connection, and operation(db) performs the business work. attempts=3 is a default argument. range(attempts) produces 0,1,2 when attempts is 3.

try encloses connection creation, transaction, operation and commit. except handles only SerializationFailure. A bare raise rethrows the current error after the final attempt. Returning from inside with still runs the context exit, including commit; a commit failure is caught by the surrounding try. Every attempt has a fresh transaction and recomputes reads.

Create retries.py. Production retries should also use bounded jittered backoff and an overall deadline to avoid synchronized retry storms; this small deterministic teaching function is bounded by attempts only. Deadlock retries require a similarly deliberate classification, not catching all database exceptions.

```python file=retries.py
from psycopg.errors import SerializationFailure

def run_retry(connect, operation, attempts=3):
    for attempt in range(attempts):
        try:
            with connect() as db:
                with db.transaction():
                    db.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
                    return operation(db)
        except SerializationFailure:
            if attempt == attempts - 1:
                raise
    raise ValueError("attempts must be positive")
```

```check
run "python checks/verify.py retry" exit=0 label="Recover from a real serialization failure without duplicate history" stdout="PASS retry" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Do not repeat external effects

```predict
question: Is sending an email inside a retried transaction safe just because the database rolls back?
choice: No
choice: Yes
answer: No
explain: An external mail service is not undone by a database rollback.
```

Put a uniquely identified outbound message in an **outbox** table inside the transaction. A separate delivery process sends it afterward and records progress. Delivery can still repeat after a crash, so use an idempotent receiver or deduplication key. The database can atomically store the business change and delivery intent; it cannot promise exactly-once arbitrary network side effects.

The acceptance test forces a serialization conflict on the first attempt using another session. It verifies that the first attempt's event is rolled back, a second attempt succeeds, and only one event remains. Also explain which errors should not be retried: malformed SQL, invalid business input and forbidden operations need repair or rejection.



## Your turn: bound failed retries

Create retry-policy.txt documenting the maximum attempts, the error class retried, the point where failure reaches the caller, and why emails are excluded from the operation. Run the exhaustion test: an always-conflicting operation must stop after the configured attempts. The file-presence check cannot judge the design explanation.


```hints
nudge: A retry policy includes both scope and a stopping condition.
concept: Rollback covers database writes, not arbitrary external calls.
shape: Name the retried error, attempt limit and external-effect boundary.
```

```check
run "python checks/verify.py retry_limit" exit=0 label="Stop after the configured retry budget" stdout="PASS retry_limit" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file retry-policy.txt -- Write the retry policy and side-effect explanation.
```
