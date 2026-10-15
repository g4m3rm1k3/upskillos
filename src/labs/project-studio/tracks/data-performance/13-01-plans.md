---
title: 13.1 — Measure the Inbox Before Adding an Index
track: Database Engineering — Performance from Measurements
trackOrder: 46.13
runtime: none
---

A query that is instant on four tickets may behave differently on a realistic distribution. Use the supplied performance probe to populate a disposable dataset; no timing in this lesson is invented.

## Name the workload

The workload asks for the first twenty open tickets in one project ordered by created_at,ticket_id. The fixture inserts many more tickets, with most belonging to a different project. PostgreSQL generate_series(1,n) produces a sequence of rows for test data; it is a fixture generator, not application code. The modulo operator % chooses repeatable groups. The probe captures results before and after your index.

EXPLAIN shows the chosen execution plan without running an ordinary SELECT. EXPLAIN (ANALYZE, BUFFERS) runs it and reports actual row counts, time and buffer activity. For INSERT/UPDATE/DELETE, ANALYZE executes the write too: use disposable data or a deliberate rollback. Compare estimated and actual rows. An index may be ignored when reading most of a table is cheaper.



## Match filtering and ordering

The default PostgreSQL index method is a B-tree, useful for equality, ranges and ordered scans. A composite index starts with project_id, then supports ordering within that project. The partial predicate stores only open tickets; a query must imply that predicate to use it. This index consumes storage and adds maintenance to writes. Create inbox-index.sql.

Run the probe and save its printed before/after plans and timings in performance-notes.md. Repeat after changing the distribution. The check confirms equal query results and a valid index; your report must explain the observed plan rather than asserting that an index is always faster. ANALYZE updates statistics the planner uses. Do not confuse it with EXPLAIN ANALYZE.

```sql file=inbox-index.sql
CREATE INDEX ticket_inbox ON tickets(project_id, created_at, ticket_id) WHERE status='open';
```

```check
run "python checks/verify.py performance" exit=0 label="Compare real plans and preserve query results" stdout="PASS performance" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Consider alternatives

```predict
question: Does every correct query have to use an index scan?
choice: No
choice: Yes
answer: No
explain: A sequential scan can be the best plan for a small table or a large fraction of rows.
```

An INCLUDE column can cover output values without being a search key, but index-only scans also depend on visibility information; storing every column has a cost. Measure before adding it. An N+1 pattern loads a list and then issues one extra query per item. Replace it with a suitable join or a batched query when that preserves cardinality. A pool does not fix N+1.

Our keyset pagination from chapter 4 avoids large offsets and supplies a matching order. It still needs an explicit product policy for records inserted or changed between pages. An index improves access; it does not create a frozen snapshot.



## Your turn: index a second access path

Create assignee-index.sql with a partial B-tree index named ticket_assignee on tickets(assignee_id), restricted to open tickets. Explain which query could benefit and which write cost it adds. The checker verifies definition and usability, not a universal latency promise.


```hints
nudge: Choose the leading filter column for the proposed workload.
concept: The partial predicate excludes closed rows.
shape: Use ON tickets(assignee_id) followed by the open-status WHERE.
```

```check
run "python checks/verify.py index" exit=0 label="Create the requested partial access path" stdout="PASS index" -- Run the command yourself and compare the actual result with the lesson trace.
```
