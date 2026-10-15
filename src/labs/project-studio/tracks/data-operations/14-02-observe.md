---
title: 14.2 — Diagnose Before Restarting
track: Database Engineering — Operating and Recovering the System
trackOrder: 46.14
runtime: none
---

An application is slow. The database may be waiting on a lock, holding too many idle transactions or executing an expensive query. Restarting immediately can erase useful evidence.

## Observe a live waiting session

pg_stat_activity exposes session activity visible to your role. pid identifies a server process, state describes activity, and wait_event_type/wait_event identify waits. current_database limits the view; pg_backend_pid excludes your own observer. Restricted roles may not see every query detail. Create activity.sql.

Revisit the lock experiment from 10.2 while a second terminal runs this query. Record which session holds a transaction and which waits. The automated probe checks that the query executes against real activity; it cannot grade your incident diagnosis. Avoid logging full query text when it contains private data.

```sql file=activity.sql
SELECT pid, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE datname=current_database() AND pid<>pg_backend_pid()
ORDER BY pid;
```

```check
run "python checks/verify.py activity" exit=0 label="Read the actual session activity view" stdout="PASS activity" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Choose the least disruptive repair

```predict
question: Should a lock wait automatically be treated as evidence that an index is missing?
choice: No
choice: Yes
answer: No
explain: A transaction holding a conflicting lock is a different cause from a slow access path.
```

Investigate the blocking transaction, its owner and expected lifetime. Set bounded statement and lock timeouts in the application. A connection budget must consider the database limit, every application instance and operational headroom; a larger pool can amplify contention. Transaction age and idle-in-transaction state matter because old snapshots can delay cleanup.

PostgreSQL vacuum reclaims reusable space from obsolete row versions and maintains visibility information; it is not a universal shrink-file command. Autovacuum is a routine maintenance mechanism. Monitor its effectiveness alongside growth, dead tuples and workload. Killing a backend is a consequential operational action: identify the owner and rollback consequences before doing so. This lesson does not issue termination commands.



## Your turn: an incident handoff

Create incident.md describing a reproducible lock wait: timeline, observed states, likely cause, evidence that would disprove it, and a proposed bounded repair. Run the lock test again as the reproduction. Do not claim a production incident was repaired.


```hints
nudge: Separate observation from your hypothesis.
concept: State what would make your hypothesis wrong.
shape: Record timeline, evidence, cause and the least disruptive next action.
```

```check
run "python checks/verify.py lock" exit=0 label="Reproduce and release the lock" stdout="PASS lock" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file incident.md -- Record the evidence and a bounded repair proposal.
```
