---
title: 1.3 — Choose Rows and Make Their Order Explicit
runtime: none
---

The team needs a short-task list: tickets estimated at most 60 minutes. The schema and seed files from 1.2 provide the data. You will choose rows with a condition and give the result a repeatable order.

## Choose a row using a condition

`WHERE` keeps rows whose condition is true. `<=` means less than or equal to. The comparison is applied to each row: Fix login (30) stays, Export report (120) leaves, Keyboard focus (60) stays, Search (30) stays.

```sql file=short.sql
SELECT ticket_id, title, estimate_minutes
FROM tickets
WHERE estimate_minutes <= 60;
```

Run the file after schema and seed, as in 1.2:

```text
sqlite3 -header -column :memory: ".read schema.sql" ".read seed.sql" ".read short.sql"
```

Change `<=` to `<`. Before running, name the row you expect to disappear. Observe that Keyboard focus disappears because equality no longer qualifies. Restore `<=`.

No check requires a row order at this step: you have not requested one yet.

## Break a tie deliberately

`ORDER BY` requests sorted output. `ASC` means ascending (smallest first); `DESC` means descending (largest first). A second sort column resolves ties in the first. We choose descending estimate, then ascending identity.

```sql file=short.sql
SELECT ticket_id, title, estimate_minutes
FROM tickets
WHERE estimate_minutes <= 60
ORDER BY estimate_minutes DESC, ticket_id ASC;
```

```predict
question: Which ticket comes first after sorting the short-task list?
choice: Fix login
choice: Keyboard focus
choice: Export report
answer: Keyboard focus
explain: Export report does not qualify. Keyboard focus is the largest-estimate qualifying ticket at 60 minutes.
```

Run again. Expect Keyboard focus, Fix login, Search. Fix login and Search tie at 30; IDs 1 and 4 decide their order. Reverse just the second direction and observe Search before Fix login. Restore ASC. Do not describe this as changing how the table stores its rows: sorting changes this query's result.

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \".read seed.sql\" \".testcase result\" \".read short.sql\" \".check '3|Keyboard focus|60\n1|Fix login|30\n4|Search|30'\"" stdout="testcase-result ok" exit=0 label="Return all qualifying rows in the requested order" -- Save the SQL file and run the command in the lesson terminal.
```

## Trace before you run

Think through the query in this order: start from tickets, keep qualifying rows, choose the named fields, then sort the result. This is a reasoning aid, not a promise about the engine's physical execution plan. Optimizers can choose different work while preserving the specified result.

To inspect the smallest-estimate qualifying record, add `LIMIT 1` after ORDER BY and before the semicolon in a temporary copy. LIMIT caps how many result rows are returned. With the current descending estimate order, that actually returns the largest-estimate qualifying record! Change the first direction to ASC to get the smallest-estimate. Explain why LIMIT alone would not reliably mean smallest-estimate. Restore short.sql to the previous step before checking.

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \".read seed.sql\" \".testcase result\" \".read short.sql\" \".check '3|Keyboard focus|60\n1|Fix login|30\n4|Search|30'\"" stdout="testcase-result ok" exit=0 label="Return all qualifying rows in the requested order" -- Save the SQL file and run the command in the lesson terminal.
```

## Your turn: a longer-task list

Create `longer.sql`. Return ticket_id and title, in that order, for tickets estimated at least 60 minutes. Sort by estimate ascending, then ticket_id ascending. `>=` means greater than or equal to. Do not include the estimate in the output, even though you use it to filter and sort.

Predict the result from the seed before running. Then add a temporary fifth ticket estimated exactly 60 in an in-memory run. Explain where it belongs and why. Leave seed.sql unchanged.

```hints
nudge: Work out membership before thinking about order. The boundary value must qualify.
concept: A column can participate in WHERE and ORDER BY without being returned by SELECT.
shape: Use >= for membership, then two ascending sort columns to resolve equal estimates.
```

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \".read seed.sql\" \"INSERT INTO tickets VALUES (5, 'Import CSV', 60), (6, 'Docs typo', 10);\" \".testcase result\" \".read longer.sql\" \".check '3|Keyboard focus\n5|Import CSV\n2|Export report'\"" stdout="testcase-result ok" exit=0 label="Include equality and break an estimate tie by identity" -- Save the SQL file and run the command in the lesson terminal.
```

Checks include a boundary value, a same-estimate tie and a shorter nonmember. They cannot assess your explanation of the design: give that explanation before marking the lesson finished.
