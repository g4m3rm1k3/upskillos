---
title: 5.2 — Ask Whether a Match Exists
track: Database Engineering — Combine Related Records
trackOrder: 46.05
runtime: none
---

A project with only closed tickets has no open work, even though it has history. Express that question without counting every matching row.

## Read a correlated question

EXISTS is true when its subquery returns any row; NOT EXISTS reverses that condition. The subquery below refers to the outer p.project_id, so it is **correlated**: its question is about the current project. SELECT 1 supplies an irrelevant value because EXISTS cares about presence, not the output value.

Compare this with the earlier empty-projects query. Both find Empty now, but add a closed-only project and they answer different questions. Explain that difference before executing.

```sql file=no-open.sql
SELECT p.project_id
FROM projects AS p
WHERE NOT EXISTS (
    SELECT 1 FROM tickets AS t
    WHERE t.project_id = p.project_id AND t.status = 'open'
)
ORDER BY p.project_id;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read no-open.sql\" \".check '20'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Avoid the unknown list

```predict
question: Can NOT IN behave differently from NOT EXISTS if its list contains NULL?
choice: Yes
choice: No
answer: Yes
explain: A comparison with an unknown can make NOT IN unknown rather than true.
```

Try `SELECT 3 NOT IN (1, NULL);` in SQLite with `-nullvalue UNKNOWN`. It displays UNKNOWN, not true. A nullable assignee list is therefore a dangerous exclusion list unless NULL handling is explicit. A correlated NOT EXISTS expresses absence directly.

Now add a second open ticket to Web and observe that no-open.sql still returns each qualifying project once. EXISTS does not multiply the outer rows. This is useful for permission membership checks later.



## Your turn: inactive people

Write idle-users.sql returning user_id for users who are not assigned any open ticket, ordered by user_id. Add a new user with no assignment in your own experiment. The check closes Ben's work before running your query.


```hints
nudge: Ask about open assignments, not all history.
concept: Correlate the ticket assignee to the current user.
shape: Keep the open-status condition inside the NOT EXISTS subquery.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \"UPDATE tickets SET status='closed' WHERE ticket_id=4;\" \".testcase result\" \".read idle-users.sql\" \".check '2'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
