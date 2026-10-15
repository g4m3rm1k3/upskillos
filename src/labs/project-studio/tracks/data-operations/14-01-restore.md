---
title: 14.1 — A Backup Is Useful Only If You Can Restore It
track: Database Engineering — Operating and Recovering the System
trackOrder: 46.14
runtime: none
---

Replication copies current changes to another system; it can also copy an accidental deletion. A backup offers a recovery point. Neither is proven by seeing a file appear.

## Choose a recovery contract

Recovery point objective (RPO) is the acceptable amount of lost work, measured in time or another agreed quantity. Recovery time objective (RTO) is how long restoration may take. Define both before choosing a backup schedule. A logical pg_dump captures database objects/data; cluster roles and other global objects need separate treatment. Physical backups and WAL archives support different recovery procedures, including point-in-time recovery when configured and retained correctly.

Use `pg_dump --format=custom --file=issue-desk.dump issue_desk_course` for a manual practice backup. The source is your practice database. Restore into a different newly created practice database with `pg_restore --exit-on-error --no-owner --dbname=issue_desk_restore issue-desk.dump`. The destination must be prepared with suitable roles/extensions. --no-owner avoids replaying original ownership, so ownership and privileges need explicit review. Never restore over your only copy to test a backup.



## Verify restored facts and behavior

The automated drill creates a uniquely named schema, dumps it using the actual pg_dump tool, removes only that drill schema, restores it, and verifies its rows, relationships and constraints. It also attempts an invalid write after restore. The rest of the configured practice database is untouched. This schema-only teaching drill does not prove a whole-cluster disaster recovery plan.

Run the test, inspect its elapsed time, and record what it does not include: external files, credentials, roles outside the dump, application configuration and deployment cutover. A complete rehearsal needs those too. Encrypt and restrict backups according to the data they contain; deleting a live row may not remove historical backup copies.

```check
run "python checks/verify.py restore" exit=0 label="Dump, restore and test a disposable schema with real tools" stdout="PASS restore" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Recover without guessing

```predict
question: Does a successful dump command prove the application can recover from it?
choice: No
choice: Yes
answer: No
explain: A restore plus checks of required behavior is the relevant evidence.
```

After a destructive incident, stop further damage, preserve logs, identify the recovery point, restore separately, verify key totals and relationships, then plan cutover. Do not overwrite evidence before understanding the failure. Retention policies must address audit records, personal information and backup expiry consistently. Access to recovery tools can be as sensitive as access to the live database.



## Your turn: a restore runbook

Create restore-runbook.txt with Source, Destination, Verify, RPO and RTO sections. Name the practice source, a distinct destination, the invariants to test and your measured drill time. Mark the time as a local rehearsal, not a production promise.


```hints
nudge: A destination is not the source under another spelling.
concept: Verification includes constraints and application behavior, not only counts.
shape: Record source, destination, checks and recovery objectives.
```

```check
run "python checks/verify.py restore" exit=0 label="Repeat a recoverable drill" stdout="PASS restore" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
file restore-runbook.txt -- Write a recovery procedure with separate source and destination.
```
