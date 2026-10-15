---
title: 12.1 — Change a Populated Schema Without Rebuilding It
track: Database Engineering — Migrations and Compatibility
trackOrder: 46.12
runtime: none
---

A new Issue Desk release needs normal or urgent severity. Existing tickets and an older application version must keep working during the change.

## Expand before requiring

ALTER TABLE changes an existing table. Add the new column as nullable first, then provide a default for future inserts. Existing NULL rows still need backfill because we added the default after creating the column. Old create_ticket code omits severity and continues to work; a new reader must temporarily tolerate NULL. This is an explicit compatibility period, not the final model.

Create expand.sql. Run it only through the supplied isolated probe until the migration runner exists. A production schema change needs lock and runtime planning; even a quick ALTER can wait behind a long transaction.

```sql file=expand.sql
ALTER TABLE tickets ADD COLUMN severity TEXT;
ALTER TABLE tickets ALTER COLUMN severity SET DEFAULT 'normal';
```

```check
run "python checks/verify.py expand" exit=0 label="Preserve old rows and accept an old-style insert" stdout="PASS expand" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Backfill in repeatable batches

A **backfill** supplies values for old records. The subquery picks two remaining NULL rows in identity order. IN limits the update to those identities. Every batch can commit separately; if interrupted, rerunning selects only still-missing values. Do not overwrite an urgent value already entered by a new application. LIMIT 2 is for observing the process, not a recommended production batch size.

```sql file=backfill.sql
UPDATE tickets SET severity='normal'
WHERE ticket_id IN (
    SELECT ticket_id FROM tickets WHERE severity IS NULL
    ORDER BY ticket_id LIMIT 2
);
```

```check
run "python checks/verify.py backfill" exit=0 label="Resume partial work without overwriting an edited value" stdout="PASS backfill" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Validate before contracting

```predict
question: Should the backfill replace an existing urgent value with normal?
choice: No
choice: Yes
answer: No
explain: Only missing values belong to the backfill.
```

NOT VALID lets the new CHECK apply to new writes while deferring the scan of old data. VALIDATE CONSTRAINT checks the existing rows. SET NOT NULL then makes absence impossible. Decide when all deployed clients are compatible before removing transitional behavior. A rollback of application code is different from dropping data added by the migration; sometimes a forward repair is safer.

Create contract.sql. It is intended to run after the backfill has no NULLs left. The probe tests that ordering and then exercises both allowed and forbidden values.

```sql file=contract.sql
ALTER TABLE tickets ADD CONSTRAINT severity_values
    CHECK (severity IN ('normal','urgent')) NOT VALID;
ALTER TABLE tickets VALIDATE CONSTRAINT severity_values;
ALTER TABLE tickets ALTER COLUMN severity SET NOT NULL;
```

```check
run "python checks/verify.py contract" exit=0 label="Enforce final severity rules after a complete backfill" stdout="PASS contract" -- Run the command yourself and compare the actual result with the lesson trace.
```

## Your turn: a preflight report

Write remaining.sql returning count(*) of tickets still missing severity. This is the preflight gate before NOT NULL. Explain why a zero count taken long before enforcement is insufficient if clients can still insert explicit NULLs.


```hints
nudge: Count only the transitional state.
concept: Use IS NULL for missing severity.
shape: Apply the same missing-value predicate as the backfill.
```

```check
run "python checks/verify.py remaining" exit=0 label="Detect remaining rows before and after batches" stdout="PASS remaining" -- Run the command yourself and compare the actual result with the lesson trace.
```
