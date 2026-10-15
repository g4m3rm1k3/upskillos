---
title: 6.1 — Count the Thing You Mean
track: Database Engineering — Reporting Without Misleading Numbers
trackOrder: 46.06
runtime: none
---

Web has three tickets but only two estimates. Empty has neither tickets nor estimates. A useful report must preserve those distinctions.

## Compute the report on paper

An aggregate combines several rows into one value. COUNT(*) counts rows, including a LEFT JOIN placeholder; COUNT(column) counts non-NULL values. SUM adds known values and returns NULL when there are none. AVG averages known values, not all tickets. For Web: ticket count 3, estimated count 2, sum 90, average 45. For Empty: 0, 0 and unknown sum. For App: 1, 1 and known sum 0.

GROUP BY forms a group for each project. Every selected nonaggregated field must have a valid grouping meaning; do not rely on SQLite accepting arbitrary ungrouped columns. Create workload.sql.

```sql file=workload.sql
SELECT p.project_id, count(t.ticket_id) AS ticket_count,
       count(t.estimate_minutes) AS estimated_count,
       sum(t.estimate_minutes) AS total_known_minutes
FROM projects AS p
LEFT JOIN tickets AS t ON t.project_id=p.project_id
GROUP BY p.project_id
ORDER BY p.project_id;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read workload.sql\" \".check '10|3|2|90\n20|0|0|\n30|1|1|0'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Filter groups after counting

```predict
question: Would COUNT(*) give Empty zero after this LEFT JOIN?
choice: No
choice: Yes
answer: No
explain: The outer join preserved one placeholder row; COUNT(ticket_id) excludes its NULL.
```

WHERE filters input rows; HAVING filters groups after aggregation. Add `HAVING count(t.ticket_id) >= 2` between GROUP BY and ORDER BY to keep only Web. Restore afterward. `COALESCE(value, fallback)` supplies the first non-NULL argument. If the UI shows zero instead of NULL totals, label it as a display choice; it does not prove all work was estimated.

Do not join memberships into this report and then sum. Web's tickets would appear once per member. Aggregate tickets to the project grain before joining another many-side.



## Your turn: count open tickets

Write open-counts.sql returning each project_id and its number of open tickets, including zero for Empty. Pair only open tickets in ON and count their identities.


```hints
nudge: Preserve projects before counting.
concept: COUNT on a nonnullable ticket key excludes placeholders.
shape: Put the status predicate in ON, then group by project identity.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read open-counts.sql\" \".check '10|2\n20|0\n30|1'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
