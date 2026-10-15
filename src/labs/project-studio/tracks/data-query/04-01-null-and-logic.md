---
title: 4.1 — Unknown Is Not Zero
track: Database Engineering — Query One Table Accurately
trackOrder: 46.04
runtime: none
---

A triage ticket may not have an estimate or an assignee yet. Continue with model.sql from chapter 2; normal.sql was a separate normalization experiment.

## Represent an unknown deliberately

Add tickets to model.sql. The earlier tables stay unchanged. Here estimate_minutes and assignee_id may be NULL. Zero means a known estimate of zero; NULL means no estimate supplied. We can reference a real user without yet enforcing team membership; chapter 11 will close that authorization boundary.

`trim(title)` removes leading/trailing spaces; `length(...)` counts characters. Their nested use rejects a title made only of spaces. DEFAULT supplies version 1 when omitted; a positive version will later detect stale edits. created_at is temporarily a UTC text timestamp in one fixed format; PostgreSQL's native time type comes later. This design does not yet validate arbitrary timestamp text.

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
CREATE TABLE tickets (
    ticket_id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    estimate_minutes INTEGER CHECK (estimate_minutes >= 0),
    assignee_id INTEGER REFERENCES users(user_id),
    status TEXT NOT NULL CHECK (status IN ('open','closed')),
    created_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
```



## Make a small inspection dataset

Create sample.sql. The explicit column list omits version so its default is used. Single quotes surround text including timestamps; NULL is an unquoted SQL marker. Trace each row's project, optional fields and status before loading it.

Run `sqlite3 -header -column :memory: "PRAGMA foreign_keys=ON;" ".read model.sql" ".read sample.sql" "SELECT * FROM tickets;"`. Here `*` in a SELECT list means all columns, unlike multiplication between expressions.

```sql file=sample.sql
INSERT INTO teams VALUES (1,'Platform'),(2,'Mobile');
INSERT INTO users VALUES (1,'ada@example.test'),(2,'ben@example.test');
INSERT INTO memberships VALUES (1,1,'editor'),(1,2,'viewer'),(2,2,'editor');
INSERT INTO projects VALUES (10,1,'Web'),(20,1,'Empty'),(30,2,'App');
INSERT INTO tickets (ticket_id,project_id,title,estimate_minutes,assignee_id,status,created_at)
VALUES (1,10,'Login',30,1,'open','2026-01-01T09:00:00Z'),
       (2,10,'Export',NULL,NULL,'open','2026-01-01T09:00:00Z'),
       (3,10,'Focus',60,1,'closed','2026-01-02T09:00:00Z'),
       (4,30,'Search',0,2,'open','2026-01-03T09:00:00Z');
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \"SELECT ticket_id FROM tickets WHERE estimate_minutes IS NULL ORDER BY ticket_id;\" \".check '2'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Read three-valued logic

```predict
question: Does estimate_minutes = NULL find the unestimated ticket?
choice: No
choice: Yes
answer: No
explain: Equality to an unknown produces unknown, not true. WHERE keeps only true conditions.
```

Use IS NULL or IS NOT NULL to test absence. Ordinary comparisons with NULL yield unknown. `AND` requires both conditions; `OR` requires either; `NOT` negates, but NOT unknown stays unknown. AND binds more tightly than OR, so write parentheses around alternatives.

Compare `status='open' AND (estimate_minutes IS NULL OR estimate_minutes=0)` with the unparenthesized form. Then close ticket 4 in an experiment: the unparenthesized form incorrectly keeps its zero estimate. Restore the fixture by starting a new memory database. A NULL-aware predicate is a product decision: unknown work is not free work.



## Your turn: unassigned open work

Write triage.sql returning ticket_id for open tickets with no assignee, ordered by ticket_id. Include both conditions and test a closed unassigned ticket too.


```hints
nudge: Ask whether each condition is true for each row.
concept: NULL requires IS NULL; equality does not test absence.
shape: Combine the open-status predicate and absence predicate using AND.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \"INSERT INTO tickets VALUES(5,10,'Old',NULL,NULL,'closed','2026-01-01T00:00:00Z',1);\" \".testcase result\" \".read triage.sql\" \".check '2'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
