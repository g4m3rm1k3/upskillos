---
title: 10.2 — Observe Snapshots and Locks
track: Database Engineering — Concurrent Users and Retries
trackOrder: 46.1
runtime: none
---

PostgreSQL uses multiple row versions so readers can see a consistent view while other sessions write. This is multiversion concurrency control, or MVCC. Inspect its observable behavior rather than imagining a global database lock.

## Choose what the reader can observe

At READ COMMITTED, each statement sees a snapshot of data committed before that statement began. A later SELECT in the same transaction can see newly committed data. PostgreSQL REPEATABLE READ keeps a snapshot from the first relevant statement and may reject a write whose target changed since that snapshot. SERIALIZABLE adds detection of executions that cannot correspond to a serial order; it can abort a transaction that must then be retried.

Create snapshot.sql. SET TRANSACTION must run within the transaction before its data operations. The supplied test opens reader and writer sessions: reader reads title, writer changes and commits it, then reader reads again. Predict the second read before running the test.

```sql file=snapshot.sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

```check
run "python checks/verify.py snapshot" exit=0 label="Hold a stable snapshot while another session commits" stdout="PASS snapshot" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Lock a known row

```predict
question: Does REPEATABLE READ guarantee every cross-row business invariant without retries or further design?
choice: No
choice: Yes
answer: No
explain: Snapshot isolation can still allow serialization anomalies across multiple rows.
```

`SELECT ... FOR UPDATE` locks selected rows against conflicting updates until transaction end. Try session A: BEGIN; SELECT ticket_id FROM tickets WHERE ticket_id=1 FOR UPDATE. Session B: BEGIN; SET LOCAL lock_timeout='500ms'; UPDATE the same ticket. B must time out while A holds the lock. ROLLBACK B, COMMIT A, and retry successfully. Always release both sessions afterward.

A deadlock occurs when A waits for B's lock while B waits for A's. PostgreSQL aborts one participant. Lock rows in a consistent order (for example ascending ticket_id), keep transactions short and retry the whole failed transaction when appropriate. A lock on existing rows does not automatically lock a missing future row; use a suitable uniqueness constraint or stronger design for that case. The automated lock probe uses a bounded timeout, so a missing release cannot hang the walkthrough.

```check
run "python checks/verify.py lock" exit=0 label="Observe an actual lock timeout and release" stdout="PASS lock" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Your turn: see a later commit

Create fresh-snapshot.sql containing the transaction isolation setting for READ COMMITTED. The same two-session sequence should now observe the writer's committed title on the second SELECT. Explain why this is permitted rather than a corrupt read.


```hints
nudge: Choose the isolation level whose snapshot begins per statement.
concept: A committed change is not a dirty read.
shape: Set READ COMMITTED before the first read.
```

```check
run "python checks/verify.py fresh" exit=0 label="See the later committed value at statement isolation" stdout="PASS fresh" -- Run the command yourself and compare the actual result with the lesson trace.
```
