---
title: 4.2 — Stable Pages and Honest Time Ranges
track: Database Engineering — Query One Table Accurately
trackOrder: 46.04
runtime: none
---

Continue with model.sql and sample.sql. A report for January 1–2 must include every instant on those dates, and paging must handle equal timestamps.

## Include the start and exclude the next start

A half-open range includes its start with >= and excludes the next period's start with <. This avoids guessing a final instant such as 23:59:59. Our fixed-width UTC strings sort in timestamp order because all use the same format and zone. Mixed offsets or local calendar dates need proper conversion, taught with PostgreSQL.

CASE selects a value by conditions: WHEN names the condition, THEN supplies its result, ELSE handles other rows, and END closes it. The label below preserves unknown estimates rather than silently turning them into zero. ORDER BY uses ticket_id to resolve equal creation times; LIMIT returns only the first two.

```sql file=page.sql
SELECT ticket_id, title,
       CASE WHEN estimate_minutes IS NULL THEN 'unestimated' ELSE 'estimated' END AS estimate_state
FROM tickets
WHERE created_at >= '2026-01-01T00:00:00Z'
  AND created_at < '2026-01-03T00:00:00Z'
ORDER BY created_at, ticket_id
LIMIT 2;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read page.sql\" \".check '1|Login|estimated\n2|Export|unestimated'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Search and deduplicate intentionally

```predict
question: Can ordering only by created_at guarantee which of tickets 1 and 2 comes first?
choice: No
choice: Yes
answer: No
explain: Their timestamps tie; the unique identity gives a deterministic tie-breaker.
```

`title LIKE 'Lo%'` matches a title beginning with Lo; `%` means any sequence and `_` means one character. Case sensitivity and collation depend on engine/settings; test your chosen contract rather than assuming identical behavior across engines. `SELECT DISTINCT project_id FROM tickets;` returns distinct project values. DISTINCT does not repair an incorrect join.

OFFSET skips a number of result rows, but concurrent inserts can shift boundaries. A **keyset cursor** records the last returned sort values. For the next page after (timestamp, id), keep a later timestamp OR the same timestamp with a larger ID. This avoids the skip caused by a new earlier row; it does not freeze the entire dataset like a snapshot.



## Your turn: continue after a tie

Write next-page.sql returning ticket_id after cursor (2026-01-01T09:00:00Z, 1), ordered by created_at then ticket_id, limited to two rows. Use >, =, AND, OR and parentheses. Expect ticket 2 to survive even though its timestamp equals the cursor.


```hints
nudge: The cursor has two fields.
concept: Equal timestamps need an identity comparison.
shape: Combine later-time OR (same-time AND larger-id).
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read model.sql\" \".read sample.sql\" \".testcase result\" \".read next-page.sql\" \".check '2\n3'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
