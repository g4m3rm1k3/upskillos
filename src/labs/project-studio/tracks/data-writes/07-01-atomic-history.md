---
title: 7.1 — A Status Change and Its History Belong Together
track: Database Engineering — Change Data Deliberately
trackOrder: 46.07
runtime: none
---

Closing a ticket without recording its history misleads an audit. Recording history without changing the ticket is just as bad.

## Define the history grain

One ticket_events row records one status-change fact. event_id identifies the occurrence; ticket_id references the changed ticket. This first event model is deliberately small; actor, timestamp and prior state are separate later design decisions, not details to silently invent. Create events.sql and load it after model.sql and sample.sql in each experiment.

```sql file=events.sql
CREATE TABLE ticket_events (
    event_id INTEGER PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id),
    new_status TEXT NOT NULL CHECK(new_status IN ('open','closed'))
);
```



## Wrap the business operation

A transaction is a unit of database work. BEGIN starts it, COMMIT makes it durable, and ROLLBACK abandons its uncommitted changes. Atomicity means either all its writes survive or none do. UPDATE targets ticket 1; `version=version+1` increments the stored value. The event insert omits its generated integer key.

Before executing close.sql, run SELECT with the same WHERE to preview the target. Then run the file in a fresh database. A successful transaction does not by itself prove the correct business rule: an incorrect WHERE can atomically change the wrong tickets.

```sql file=close.sql
BEGIN;
UPDATE tickets SET status='closed', version=version+1 WHERE ticket_id=1;
INSERT INTO ticket_events(ticket_id,new_status) VALUES(1,'closed');
COMMIT;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".read events.sql\" \".read close.sql\" \".testcase result\" \"SELECT status, version FROM tickets WHERE ticket_id=1; SELECT count(*) FROM ticket_events;\" \".check 'closed|2\n1'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Rehearse a failure

```predict
question: If the second write fails and we roll back, should the first write remain?
choice: No
choice: Yes
answer: No
explain: The rollback abandons all writes in the transaction.
```

In an interactive sqlite3 session, load the model, sample and events. Type BEGIN, then the UPDATE from close.sql. Try an event for nonexistent ticket 999. Observe the foreign-key error, then type ROLLBACK and read ticket 1. It should still be open at version 1. SQLite statement failure does not automatically roll back every earlier statement in an open transaction; the caller must handle the error. With a short-lived `-bail` process, closing the failed connection also rolls back its open transaction.

Atomicity, consistency, isolation and durability are often abbreviated ACID. Constraints contribute to consistency; application correctness still matters. Isolation concerns other sessions, which chapter 10 explores. Durability still requires working storage and recovery procedures.



## Your turn: a reversible rehearsal

Create rehearsal.sql. Begin a transaction, set ticket 2 to closed and insert its closed event, then roll back. The final database must still show ticket 2 open with no events. Include the actual attempted writes; explain why a no-op file is not a useful rehearsal.


```hints
nudge: End the transaction without keeping its writes.
concept: ROLLBACK is different from undoing just the last statement.
shape: Put both writes between BEGIN and ROLLBACK.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".read events.sql\" \".read rehearsal.sql\" \".testcase result\" \"SELECT status FROM tickets WHERE ticket_id=2; SELECT count(*) FROM ticket_events;\" \".check 'open\n0'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
