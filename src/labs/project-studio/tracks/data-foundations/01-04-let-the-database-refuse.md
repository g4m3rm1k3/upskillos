---
title: 1.4 — Make Invalid Records Impossible to Save
runtime: none
---

In 1.2 the database accepted two rows with ticket_id 1. An application asking for item 1 could no longer identify one request. Put rules in the schema so every writer meets the same requirements, including scripts that bypass the user interface.

We will edit schema.sql and test fresh in-memory databases. This does not migrate the tracker.db file you already created. Keep that file intact; a later migration lesson will address changing an existing design without losing data.

## Give a record one identity

A **primary key** identifies a row uniquely. Adding `PRIMARY KEY` to ticket_id makes a second explicit ID 1 an error. In SQLite, `INTEGER PRIMARY KEY` also has special generated-ID behavior when the value is omitted; we supply IDs explicitly here. This behavior must not be assumed identical in another engine.

```sql file=schema.sql
CREATE TABLE tickets (
    ticket_id INTEGER PRIMARY KEY,
    title TEXT,
    estimate_minutes INTEGER
);
```

Run the schema and seed in memory as before, then try a second insert with ticket_id 1. Expect a uniqueness error. Explain why duplicate titles may still be useful (two requests titled Fix login), while duplicate identities are not.

```check
run "sqlite3 -batch -bail :memory:" stdin=".read schema.sql\nINSERT INTO tickets VALUES (1, 'Fix login', 30); INSERT INTO tickets VALUES (1, 'Other login fix', 35);\n" exit=1 stderr="constraint failed" label="Reject duplicate ticket identities" -- A constraint should reject this insert; inspect the SQLite error.
```

## Missing is different from empty

`NULL` represents a missing or unknown value. It is not zero and is not the empty text `''`. `NOT NULL` refuses a missing value in a column. Add it to the title and daily estimate.

```sql file=schema.sql
CREATE TABLE tickets (
    ticket_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    estimate_minutes INTEGER NOT NULL
);
```

Try inserting `(5, NULL, 20)` using the column order from seed.sql. Expect a NOT NULL error. Replace NULL with `''`: that succeeds because an empty text value is still a value. Decide whether our future application should also forbid blank names. Record that as an unresolved rule, not a claim this schema already enforces.

```check
run "sqlite3 -batch -bail :memory:" stdin=".read schema.sql\nINSERT INTO tickets VALUES (5, NULL, 20);\n" exit=1 stderr="constraint failed" label="Reject an absent title" -- A constraint should reject this insert; inspect the SQLite error.
```

## Require a sensible range

A **constraint** is a rule checked by the database when data is written. `CHECK (estimate_minutes >= 0)` accepts nonnegative amounts and refuses negative ones. Keep NOT NULL too: a CHECK expression that evaluates to unknown because of NULL does not substitute for a missing-value rule.

```sql file=schema.sql
CREATE TABLE tickets (
    ticket_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    estimate_minutes INTEGER NOT NULL CHECK (estimate_minutes >= 0)
);
```

```predict
question: Does a daily estimate of zero satisfy this range rule?
choice: Yes
choice: No
answer: Yes
explain: >= 0 includes zero. Whether zero-minute estimates make sense is a product decision, not a SQL syntax decision.
verify: sqlite3 :memory: "SELECT CASE WHEN 0 >= 0 THEN 'Yes' ELSE 'No' END;"
```

Test negative, zero and positive estimates in separate temporary databases. The negative insert must fail; zero and positive values must succeed. A test suite needs accepted cases as well as rejected cases: refusing every write would not be a useful implementation.

SQLite's ordinary INTEGER declaration is not a strict integer-only guarantee. This lesson tests whole-number inputs. Later design work must address storage types, blank names and units before calling the schema complete.

```check
run "sqlite3 -batch -bail :memory:" stdin=".read schema.sql\nINSERT INTO tickets VALUES (5, 'Docs typo', -1);\n" exit=1 stderr="constraint failed" label="Reject a negative estimate" -- A constraint should reject this insert; inspect the SQLite error.
```

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \".testcase result\" \"INSERT INTO tickets VALUES (5, 'Docs typo', 0); SELECT estimate_minutes FROM tickets;\" \".check '0'\"" stdout="testcase-result ok" exit=0 label="Accept a zero estimate" -- Save the SQL file and run the command in the lesson terminal.
```

## Your turn: rooms at a venue

Transfer the same ideas to a different domain. Create `rooms.sql`, defining a table named rooms. One row represents one bookable room. Use room_id as an INTEGER PRIMARY KEY, name as required TEXT, and capacity as required INTEGER. A capacity must be strictly greater than zero; `>` excludes the boundary. Keep different rooms with the same name legal.

Before writing SQL, explain why capacity zero is rejected here while estimate zero was accepted for tickets. Then test duplicate identities, absent capacity, zero capacity and a valid capacity of one.

```hints
nudge: Translate each sentence in the requirements into one column or one constraint.
concept: A unique identity, presence and a valid range are separate rules; none replaces the others.
shape: Attach PRIMARY KEY to room_id, NOT NULL to both other columns, and CHECK with > 0 to capacity.
```

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read rooms.sql\" \".testcase result\" \"INSERT INTO rooms VALUES (1, 'Studio', 1), (2, 'Studio', 20); SELECT room_id, capacity FROM rooms ORDER BY room_id;\" \".check '1|1\n2|20'\"" stdout="testcase-result ok" exit=0 label="Accept valid capacities and duplicate room names" -- Save the SQL file and run the command in the lesson terminal.
```

```check
run "sqlite3 -batch -bail :memory:" stdin=".read rooms.sql\nINSERT INTO rooms VALUES (1, 'Studio', 1), (1, 'Hall', 20);\n" exit=1 stderr="constraint failed" label="Reject duplicate room identities" -- A constraint should reject this insert; inspect the SQLite error.
```

```check
run "sqlite3 -batch -bail :memory:" stdin=".read rooms.sql\nINSERT INTO rooms VALUES (1, 'Studio', NULL);\n" exit=1 stderr="constraint failed" label="Reject missing capacity" -- A constraint should reject this insert; inspect the SQLite error.
```

```check
run "sqlite3 -batch -bail :memory:" stdin=".read rooms.sql\nINSERT INTO rooms VALUES (1, 'Studio', 0);\n" exit=1 stderr="constraint failed" label="Reject zero capacity" -- A constraint should reject this insert; inspect the SQLite error.
```

```check
run "sqlite3 -batch -bail :memory:" stdin=".read rooms.sql\nINSERT INTO rooms VALUES (1, NULL, 10);\n" exit=1 stderr="constraint failed" label="Reject a missing name" -- A constraint should reject this insert; inspect the SQLite error.
```

```check
run "sqlite3 -batch -bail :memory:" stdin=".read rooms.sql\nINSERT INTO rooms VALUES (1, 'Studio', -1);\n" exit=1 stderr="constraint failed" label="Reject a negative capacity" -- A constraint should reject this insert; inspect the SQLite error.
```

These checks exercise actual inserts and reads. They do not prove a complete venue design, strict type handling, or safety under concurrent reservations. Those are later engineering problems, and our next design chapter starts with relationships and competing requirements.
