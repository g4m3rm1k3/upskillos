---
title: 5.1 — Keep the Projects with No Tickets
track: Database Engineering — Combine Related Records
trackOrder: 46.05
runtime: none
---

A manager asks for every project, including Empty. Continue with model.sql and sample.sql; do not add fake tickets to make the report work.

## Predict the pairings

An inner JOIN returns matching row pairs. Web has three tickets, so it appears three times. Empty has no matching tickets and disappears. App appears once. A LEFT JOIN preserves every left-side row; for an unmatched project it supplies NULL on the ticket side. The word LEFT describes which side is preserved, not a preferred execution order.

Trace Web to tickets 1,2,3; Empty to one unmatched result; App to ticket 4. Predict the total result count before running. The following query returns project and ticket identities so duplicated names do not hide cardinality.

```sql file=projects-with-tickets.sql
SELECT p.project_id, p.name, t.ticket_id
FROM projects AS p
LEFT JOIN tickets AS t ON t.project_id = p.project_id
ORDER BY p.project_id, t.ticket_id;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read projects-with-tickets.sql\" \".check '10|Web|1\n10|Web|2\n10|Web|3\n20|Empty|\n30|App|4'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## A filter can erase an outer join

```predict
question: If WHERE t.status = open follows the LEFT JOIN, does Empty remain?
choice: No
choice: Yes
answer: No
explain: Its NULL ticket status is not true for the WHERE comparison.
```

To retain projects while pairing only open tickets, put `AND t.status='open'` inside ON. WHERE runs on the result and removes rows whose condition is not true. Compare both versions and name the lost project. Restore the original query.

Joining projects to memberships on team_id alone pairs each ticket with every team member. The resulting extra rows are real pairs, not a display glitch. Count the intended grain before adding another relationship; DISTINCT can hide both mistakes and legitimate duplicates.



## Your turn: find projects without work

Write empty-projects.sql returning project_id for projects with no tickets. Use LEFT JOIN and test `t.ticket_id IS NULL`. Order by project_id. Compare its meaning with an inner join.


```hints
nudge: Which side must remain when no match exists?
concept: The matched ticket primary key cannot be NULL, so NULL signals absence here.
shape: LEFT JOIN on project identity, then test the ticket identity.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read empty-projects.sql\" \".check '20'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
