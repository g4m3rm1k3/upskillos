---
title: 2.1 — Decide Who Owns a Project
track: Database Engineering — Design Before Adding Tables
trackOrder: 46.02
runtime: none
---

Continue in your Issue Desk folder. Keep tracker.db from the opening untouched. New schema files are design experiments run in fresh in-memory databases until migrations are taught.

## Write a contract before a table

Two teams both want a project named Website. Inside one team, two Website projects would confuse their links. A **candidate key** is a minimal set of fields that uniquely identifies a record under the business rules. Here (team, name) is a candidate key. The numeric project_id is the primary key we choose for stable references when names change.

A **relationship** connects records. One team owns zero or more projects; each project belongs to exactly one team. This is one-to-many cardinality. Optionality asks whether the connection may be absent. A team may have no projects, but a project may not have no team. Write these sentences in design-notes.md before coding. A name is not automatically unique just because it looks unique in today's examples.



## Reference an existing owner

Create model.sql. REFERENCES requires the referenced team to exist. NOT NULL separately requires an owner to be supplied. UNIQUE with two columns enforces the combination, not each field independently. Read the two possible Website rows aloud before adding them.

SQLite needs `PRAGMA foreign_keys=ON;` on each connection. A pragma configures the engine. Run `sqlite3 :memory: "PRAGMA foreign_keys=ON;" ".read model.sql"`. Enabling it in one command does not enable it in the next connection. Our checks enable it explicitly.

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
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".testcase result\" \"INSERT INTO teams VALUES (1,'Platform'),(2,'Mobile'); INSERT INTO projects VALUES (10,1,'Website'),(20,2,'Website'); SELECT name FROM projects ORDER BY project_id;\" \".check 'Website\nWebsite'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Try the orphan

```predict
question: Can a project reference team 99 when that team does not exist?
choice: No
choice: Yes
answer: No
explain: Foreign-key enforcement rejects the missing parent.
```

An **orphan** is a child referring to a nonexistent parent. Try inserting a project owned by team 99, then create team 99 first and retry in a fresh database. The second sequence should succeed. Explain why checking only in the screen would not protect an import script.

```check
run "sqlite3 -batch -bail :memory:" exit=1 label="Reject an orphan project" stdin="PRAGMA foreign_keys=ON;\n.read model.sql\nINSERT INTO projects VALUES (1,99,'Missing');\n" stderr="constraint failed" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Your turn: names are local

Create departments.sql for departments(department_id INTEGER PRIMARY KEY, name TEXT NOT NULL) and desks(desk_id INTEGER PRIMARY KEY, department_id required reference, name required). A desk name must be unique within its department, but reusable across departments. Explain the two different keys.


```hints
nudge: Draw two departments with a Help desk each.
concept: The composite uniqueness rule belongs to the child table.
shape: Use REFERENCES for ownership and UNIQUE(department_id, name) for local naming.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read departments.sql\" \".testcase result\" \"INSERT INTO departments VALUES (1,'A'),(2,'B'); INSERT INTO desks VALUES(1,1,'Help'),(2,2,'Help'); SELECT count(*) FROM desks;\" \".check '2'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
```check
run "sqlite3 -batch -bail :memory:" exit=1 label="Reject duplicate desk names within one department" stdin="PRAGMA foreign_keys=ON;\n.read departments.sql\nINSERT INTO departments VALUES(1,'A'); INSERT INTO desks VALUES(1,1,'Help'),(2,1,'Help');\n" stderr="constraint failed" -- Run the command yourself and compare the actual result with the lesson trace.
```
