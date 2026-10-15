---
title: 3.1 — Store a Fact Where It Belongs
track: Database Engineering — Relational Design and Durable Facts
trackOrder: 46.03
runtime: none
---

A spreadsheet repeats Ada's email beside Website and API. Updating just one cell creates two conflicting emails for the same person. We will remove that update anomaly without losing the relationship.

## Trace three anomalies

An **update anomaly** leaves conflicting copies after changing only one occurrence. An **insertion anomaly** prevents recording a person until they have a project. A **deletion anomaly** loses the only record of a person when their last project is removed.

A **functional dependency** means one value determines another under the rules: person_id determines email. It is a statement about the domain, not a coincidence in a small sample. First normal form requires single values at the chosen field granularity rather than repeating groups. Second normal form removes non-key facts depending on only part of a candidate key. Third normal form also removes non-key facts depending transitively on the key through other non-key facts. In the flattened project sheet, project_id determines owner_id, which determines owner_email. Move the email to the owner record.

Draw the before/after rows. For a membership keyed by (team_id,user_id), the user's email depends only on user_id, so it should not be stored there. A project owner's current email and the email printed on an old invoice are different facts: historical snapshots need an explicit meaning.



## Split and reconstruct

Create normal.sql as a self-contained experiment. The people table owns the email; workspaces owns the owner reference. The inserts preserve both project records while storing the current email once.

To reconstruct the view, `JOIN ... ON` pairs rows whose specified IDs match. `w` and `p` below are short aliases for table names, and `w.name` selects a column from one specific table. We will study join cardinality in detail in chapter 5.

```sql file=normal.sql
CREATE TABLE people (person_id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE);
CREATE TABLE workspaces (
    workspace_id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES people(person_id),
    name TEXT NOT NULL
);
INSERT INTO people VALUES (1, 'ada@example.test');
INSERT INTO workspaces VALUES (10, 1, 'Website'), (20, 1, 'API');
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read normal.sql\" \".testcase result\" \"SELECT w.name, p.email FROM workspaces AS w JOIN people AS p ON p.person_id=w.owner_id ORDER BY w.workspace_id;\" \".check 'Website|ada@example.test\nAPI|ada@example.test'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Make one change

```predict
question: If Ada changes her email once in people, how many joined project rows display the new email?
choice: Both
choice: Only the first
answer: Both
explain: Both project references point to the same person record.
```

`UPDATE people SET email='new@example.test' WHERE person_id=1;` changes one stored fact. Run it in memory, then repeat the join. Both rows change. Delete one workspace in that experiment and verify the person remains.

Denormalization deliberately duplicates or precomputes a fact to serve a measured need. If a stored ticket count is added later, document who updates it, how failures are repaired and how it is reconciled. Normal forms help reason about anomalies; they do not replace workload measurements.



## Your turn: reconstruct a view

Create owners.sql returning workspace name and current owner email, ordered by workspace_id. Use the existing normal.sql experiment. The check changes the email before executing your query.


```hints
nudge: Follow the owner reference.
concept: Current email is read from people at query time.
shape: Join owner_id to person_id and qualify the output columns.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read normal.sql\" \"UPDATE people SET email='changed@example.test' WHERE person_id=1;\" \".testcase result\" \".read owners.sql\" \".check 'Website|changed@example.test\nAPI|changed@example.test'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
