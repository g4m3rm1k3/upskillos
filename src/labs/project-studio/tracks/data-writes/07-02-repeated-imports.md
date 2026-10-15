---
title: 7.2 — A Retry Must Not Duplicate the Work
track: Database Engineering — Change Data Deliberately
trackOrder: 46.07
runtime: none
---

An import client times out after the server may already have accepted a ticket. A repeated request should not create another ticket just because the response was lost.

## Separate request identity from row identity

An **idempotent** operation has the same intended effect when repeated. source_key identifies the external request; it is not a randomly regenerated value on each retry. ON CONFLICT(source_key) DO NOTHING skips an insert that collides with that unique key. Other constraint failures still fail.

Create inbox.sql. Its CREATE TABLE runs once per experiment. Repeating the whole schema file is not the retry operation: repeat only the INSERT. A different body with the same key requires a policy, such as refusing the mismatch, rather than silently overwriting the first request.

```sql file=inbox.sql
CREATE TABLE inbox (
    source_key TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL
);
INSERT INTO inbox VALUES('external-7','Login import')
ON CONFLICT(source_key) DO NOTHING;
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read inbox.sql\" \".testcase result\" \"INSERT INTO inbox VALUES('external-7','Login import') ON CONFLICT(source_key) DO NOTHING; SELECT count(*) FROM inbox;\" \".check '1'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Know what was changed

```predict
question: If every retry generates a new source_key, does the uniqueness rule prevent duplicate requests?
choice: No
choice: Yes
answer: No
explain: The server cannot recognize the same logical request under a different identity.
```

`ON CONFLICT(source_key) DO UPDATE SET title=excluded.title` is an upsert: insert if absent, otherwise update the conflicting record. `excluded` names the proposed new row. It is appropriate only if the source owns the title and replacements are intended. DO NOTHING is not an update and must not be reported as one.

Preview a DELETE with a SELECT using the same predicate. Avoid using deletion to make an import test pass. Record whether the caller created, reused or rejected the request. In PostgreSQL, RETURNING and the driver row count make these outcomes observable.



## Your turn: repeat the request safely

Write retry.sql containing only the retry insert for external-7 with title Login import and conflict handling. It will run twice after inbox.sql. Also explain what your API should do if the same key arrives with a different title.


```hints
nudge: The retry must reuse the original external identity.
concept: Only the intended unique conflict is safe to ignore here.
shape: Attach ON CONFLICT(source_key) DO NOTHING to the INSERT.
```

```check
run "\"sqlite3\" \"-batch\" \"-bail\" \"-noheader\" \"-list\" \":memory:\" \"PRAGMA foreign_keys=ON;\" \".read inbox.sql\" \".read retry.sql\" \".read retry.sql\" \".testcase result\" \"SELECT source_key,title FROM inbox;\" \".check 'external-7|Login import'\"" exit=0 label="The result matches the traced rows" stdout="testcase-result ok" -- Run the command yourself and compare the actual result with the lesson trace.
```
