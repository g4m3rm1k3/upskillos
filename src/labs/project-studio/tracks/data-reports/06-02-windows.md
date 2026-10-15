---
title: 6.2 — Keep Detail While Computing a Total
track: Database Engineering — Reporting Without Misleading Numbers
trackOrder: 46.06
runtime: none
---

Grouping removes ticket detail. A window calculation can attach a running total while preserving one output row per ticket.

## Name a query, then define a window

WITH gives a subquery a local name, a **common table expression** (CTE). known below excludes unknown estimates; it does not update the table. OVER defines the rows used by a window aggregate. PARTITION BY restarts the total for each project. Its ORDER BY chooses accumulation order. ROWS ... UNBOUNDED PRECEDING ... CURRENT ROW includes earlier rows through this one. An explicit row frame avoids accidentally including all equal-sort peers through a default range frame.

Compute ticket 1 → 30, ticket 3 → 90, ticket 4 → 0 in its separate project. The final ORDER BY controls display independently of the window's order.

```sql file=running.sql
WITH known AS (
    SELECT ticket_id, project_id, estimate_minutes
    FROM tickets WHERE estimate_minutes IS NOT NULL
)
SELECT ticket_id,
       sum(estimate_minutes) OVER (
           PARTITION BY project_id ORDER BY ticket_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_minutes
FROM known
ORDER BY ticket_id;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read running.sql\" \".check '1|30\n3|90\n4|0'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Rank without hiding ties

```predict
question: Does a window SUM collapse Web into a single output row?
choice: No
choice: Yes
answer: No
explain: The window computes a value for each input row; GROUP BY would change the grain.
```

`row_number() OVER (PARTITION BY project_id ORDER BY created_at,ticket_id)` numbers tickets within each project. RANK assigns equal ranks to peers and leaves a gap after ties; DENSE_RANK does not leave that gap. If you add ticket_id to the ranking order, you deliberately break ties. Decide whether the report wants ties before choosing the order.

For an aging report, define the reference instant, whether closed tickets count, and whether age starts at creation or last reopening. A calendar-day difference and elapsed hours answer different questions. Never compare a duration to a date string without choosing units.



## Your turn: newest in each project

Write newest.sql returning ticket_id for the newest ticket in each project. Use a CTE with row_number ordered by created_at DESC and ticket_id DESC, then filter row number 1 in the outer query. Return ticket IDs ascending. A window result cannot be filtered in the same SELECT's WHERE.


```hints
nudge: There is a separate ordering within each project.
concept: The CTE exposes the window result to an outer WHERE.
shape: PARTITION BY project_id, rank newest first, then keep position 1.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read newest.sql\" \".check '3\n4'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
