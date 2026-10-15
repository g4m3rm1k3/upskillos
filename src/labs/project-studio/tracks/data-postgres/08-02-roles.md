---
title: 8.2 — Give the Application Less Power
track: Database Engineering — Move to PostgreSQL
trackOrder: 46.08
runtime: none
---

A reporting component needs to read tickets. It does not need permission to alter tables or delete projects. Use the scratch schema from 8.1, with an administrative practice role allowed to create roles.

## Separate ownership from use

A database owner can change its objects. An application should use a less powerful role. CREATE ROLE below defines a NOLOGIN role: it is a privilege group, not a password account. GRANT USAGE permits resolving names inside a schema; GRANT SELECT permits reading this particular table. Neither grants writes. SET LOCAL ROLE temporarily acts with the granted role for this transaction; RESET ROLE returns to the original role.

The role and grants are created inside the rolled-back probe. Do not execute the file outside that probe and leave a permanent global role by accident. A production login role can be granted membership separately; password setup is a deployment concern, not source code.

```sql file=reader.sql
CREATE ROLE issue_desk_reader NOLOGIN;
GRANT USAGE ON SCHEMA course_probe TO issue_desk_reader;
GRANT SELECT ON tickets TO issue_desk_reader;
SET LOCAL ROLE issue_desk_reader;
SELECT count(*) FROM tickets;
RESET ROLE;
```

```check
run "psql -X -qAt -v ON_ERROR_STOP=1 -c \"BEGIN; CREATE SCHEMA course_probe; SET LOCAL search_path=course_probe;\" -f pg-model.sql -f sample.sql -f reader.sql -c ROLLBACK" exit=0 label="The restricted reader can read the fixture" stdout="4" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Try the denied operation

```predict
question: Does granting SELECT also grant UPDATE?
choice: No
choice: Yes
answer: No
explain: Privileges are separate; read access is not write access.
```

Within an interactive BEGIN scratch probe, SET LOCAL ROLE issue_desk_reader and attempt `DELETE FROM tickets;`. Expect permission denied, then ROLLBACK. PostgreSQL marks an explicit transaction failed after an error; later statements require rollback or recovery to a savepoint. This differs from the SQLite failure experiment.

Privileges control which operations a database role can perform. They do not automatically answer which team's rows an authenticated product user may access. Chapter 11 introduces that row boundary. Inspect actual grants and test with the restricted role, not an owner who bypasses restrictions.



## Your turn: inspect without granting more

Create privileges.sql returning whether issue_desk_reader has SELECT and UPDATE privileges on tickets, in that order. Use `has_table_privilege('issue_desk_reader','tickets','SELECT')` and its UPDATE counterpart. This built-in function asks PostgreSQL about effective privileges; it does not change them.


```hints
nudge: Read and write are two separate questions.
concept: The function returns a Boolean for one privilege.
shape: Return both calls in one SELECT without adding any GRANT.
```

```check
run "psql -X -qAt -v ON_ERROR_STOP=1 -c \"BEGIN; CREATE SCHEMA course_probe; SET LOCAL search_path=course_probe;\" -f pg-model.sql -f sample.sql -f reader.sql -f privileges.sql -c ROLLBACK" exit=0 label="Read is permitted and update is not" stdout="t|f" -- Run the command yourself and compare the actual result with the lesson trace.
```
