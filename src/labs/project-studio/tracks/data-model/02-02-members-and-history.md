---
title: 2.2 — Many People, Many Teams
track: Database Engineering — Design Before Adding Tables
trackOrder: 46.02
runtime: none
---

Continue in your Issue Desk folder. Keep tracker.db from the opening untouched. New schema files are design experiments run in fresh in-memory databases until migrations are taught.

## A relationship can own facts

Ada works in Platform and Mobile. Platform also has Ben. Putting a single team_id on users would forbid Ada's second membership; putting user IDs into comma-separated text would prevent normal foreign keys.

A **junction table** stores one row per relationship. Its composite primary key is the pair (team_id,user_id). Role belongs to that membership: Ada can be editor in Platform and viewer in Mobile. `IN` tests membership in a set of allowed values; the CHECK below restricts role spellings. Add users, then memberships to model.sql.

```sql file=model.sql
CREATE TABLE teams (
    team_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE projects (
    project_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(team_id),
    name TEXT NOT NULL,
    UNIQUE (team_id, name)
);
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
);
CREATE TABLE memberships (
    team_id INTEGER NOT NULL REFERENCES teams(team_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
    PRIMARY KEY (team_id, user_id)
);
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".testcase result\" \"INSERT INTO teams VALUES(1,'A'),(2,'B'); INSERT INTO users VALUES(1,'ada@example.test'); INSERT INTO memberships VALUES(1,1,'editor'),(2,1,'viewer'); SELECT role FROM memberships ORDER BY team_id;\" \".check 'editor\nviewer'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Deleting is a domain decision

```predict
question: Can you delete a team that still has referenced projects under our current rules?
choice: No
choice: Yes
answer: No
explain: The default foreign-key behavior rejects the dangling reference.
```

`DELETE FROM teams WHERE team_id = 1;` removes matching rows if constraints allow it. WHERE limits the affected rows; leaving it out targets all teams. Use fresh experiments only. Our schema refuses deletion while child records remain. `ON DELETE CASCADE` would remove children automatically; `ON DELETE SET NULL` would clear an optional reference. Neither is a universal improvement. Deleting a team should not silently erase an audit trail.

Decide whether production teams are archived, retained or deleted. Record retention requirements and who may approve deletion. The check proves the refusal, not that your policy is right.

```check
run "sqlite3 -batch -bail :memory:" exit=1 label="Preserve referenced ownership" stdin="PRAGMA foreign_keys=ON;\n.read model.sql\nINSERT INTO teams VALUES(1,'A'); INSERT INTO projects VALUES(1,1,'Site'); DELETE FROM teams WHERE team_id=1;\n" stderr="constraint failed" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Your turn: one subscription per pair

Create subscriptions.sql defining a standalone subscriptions table with required INTEGER user_id and topic_id, a required TEXT delivery restricted to immediate or digest, and one row per user/topic pair. Parent tables are outside this transfer exercise; do not claim it checks orphan references.


```hints
nudge: Identify what one row means.
concept: Identity belongs to the combination, not either column alone.
shape: Use a two-column primary key and an IN check.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read subscriptions.sql\" \".testcase result\" \"INSERT INTO subscriptions VALUES(1,10,'digest'),(1,20,'immediate'),(2,10,'digest'); SELECT count(*) FROM subscriptions;\" \".check '3'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
run "sqlite3 -batch -bail :memory:" exit=1 label="Reject a duplicate relationship" stdin="PRAGMA foreign_keys=ON;\n.read subscriptions.sql\nINSERT INTO subscriptions VALUES(1,10,'digest'),(1,10,'immediate');\n" stderr="constraint failed" -- Run the command yourself and compare the actual result with the lesson trace.
```
