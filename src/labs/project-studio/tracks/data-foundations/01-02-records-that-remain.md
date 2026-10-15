---
title: 1.2 — Records That Survive Closing the Program
runtime: none
---

Yesterday's calculation vanished when its command ended. An issue tracker also needs to remember which tickets exist. Build a table, add records and reopen a real database file. Continue in the same `issue-desk` project folder from 1.1.

## Decide what one row means

A **table** holds records with named fields. A **row** is one record; a **column** is one field across those records. Here, one row means one piece of requested work, not a project and not a person.

| ticket_id | title | estimate_minutes |
| --- | --- | --- |
| 1 | Fix login | 30 |
| 2 | Export report | 120 |
| 3 | Keyboard focus | 60 |
| 4 | Search | 30 |

Two requests can have the same title but need different identities. Why would a `quantity = 2` cell lose information about which request has been completed?

The **schema** describes the table's structure. `CREATE TABLE` introduces a table name and parenthesized column definitions. `INTEGER` describes whole numbers; `TEXT` describes text. Commas separate definitions. These declarations alone do not enforce our business rules in SQLite; lesson 1.4 adds constraints and later work adds stricter type rules.

```sql file=schema.sql
CREATE TABLE tickets (
    ticket_id INTEGER,
    title TEXT,
    estimate_minutes INTEGER
);
```

Run `sqlite3 :memory: ".read schema.sql" ".schema tickets"`. The `.schema` shell command shows the stored table definition. Creating a table does not create any tickets. The check uses `count(*)`, which counts rows in a table; the empty table must give zero. We will study aggregation properly in the reporting chapter.

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \".testcase result\" \"SELECT count(*) FROM tickets;\" \".check '0'\"" stdout="testcase-result ok" exit=0 label="The new table has no records" -- Save the SQL file and run the command in the lesson terminal.
```

## Put values into named columns

`INSERT INTO` adds records. The list after the table name states which columns receive values. `VALUES` introduces a row of values in the same order. Single quotes mark text; `30` is a number, while `'30'` is text. A comma between parentheses introduces another row.

```sql file=seed.sql
INSERT INTO tickets (ticket_id, title, estimate_minutes)
VALUES
    (1, 'Fix login', 30),
    (2, 'Export report', 120),
    (3, 'Keyboard focus', 60),
    (4, 'Search', 30);
```

This is **seed data**: a small known dataset for development. We keep it separate from the schema so table design and example records can change independently.

To read stored values, `SELECT` now names columns, and `FROM` names their table. Run:

```text
sqlite3 -header -column :memory: ".read schema.sql" ".read seed.sql" "SELECT ticket_id, title, estimate_minutes FROM tickets;"
```

`-column` aligns the display. Expect the records above, but do not depend on their order yet. SQL only promises a chosen order when you request one, which lesson 1.3 teaches.

```predict
question: Does reading seed.sql twice into this unconstrained table keep four rows or add four more?
choice: Keep four rows
choice: Add four more
answer: Add four more
explain: INSERT adds rows every time. No rule currently prevents duplicate identities.
```

Try it in `:memory:` by repeating the `.read seed.sql` argument. Observe duplicates. Start a fresh command to restore a clean experiment. We will make the database reject duplicate identities in lesson 1.4; do not hide this problem with a delete-and-recreate script.

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \".read seed.sql\" \".testcase result\" \"SELECT count(*) FROM tickets;\" \".check '4'\"" stdout="testcase-result ok" exit=0 label="The seed creates four records" -- Save the SQL file and run the command in the lesson terminal.
```

## Close and reopen

Now substitute a file path for `:memory:`. In this new project, run the initialization exactly once:

```text
sqlite3 -batch -bail tracker.db ".read schema.sql" ".read seed.sql"
```

The command exits. Reopen the file with a separate command:

```text
sqlite3 -header -column tracker.db "SELECT ticket_id, title, estimate_minutes FROM tickets;"
```

The tickets are still there. `tracker.db` contains stored data and schema; `schema.sql` and `seed.sql` contain instructions. Editing seed.sql does not update tracker.db. That distinction matters when software changes after customers have stored their own data.

If you rerun initialization and see `table tickets already exists`, stop: you already initialized this file. Read its contents instead of deleting it. Continue practice in `:memory:`; later chapters teach controlled updates and migrations.

```check
run "sqlite3 -batch -bail tracker.db \".testcase result\" \"SELECT count(*) FROM tickets;\" \".check '4'\"" stdout="testcase-result ok" exit=0 label="The stored file retains its records" -- Save the SQL file and run the command in the lesson terminal.
```

## Your turn: read only what the screen needs

Create `labels.sql` without copying a supplied solution. Return just the `title` column from `tickets`. Do not create or insert records in the query file. Run it against tracker.db. The output should contain the ticket titles, with no estimates or IDs. Row order is not part of this task yet.

```hints
nudge: A screen listing ticket names does not need all the stored fields.
concept: SELECT chooses columns, while FROM identifies the table holding them.
shape: Use the title column as your SELECT list and tickets after FROM.
```

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".read schema.sql\" \"INSERT INTO tickets VALUES (9, 'Import CSV', 15);\" \".testcase result\" \".read labels.sql\" \".check 'Import CSV'\"" stdout="testcase-result ok" exit=0 label="Read a previously unseen title" -- Save the SQL file and run the command in the lesson terminal.
```

The checks also add an unseen ticket before running your file. A query must read current data, not print the four titles you happen to remember.
