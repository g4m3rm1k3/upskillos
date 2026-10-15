---
title: 1.1 — Ask a Database a Question
track: Database Engineering — First Queries and Trustworthy Records
trackOrder: 46
runtime: none
---

An engineering team estimates 30 minutes for each of three similar tasks. The combined estimate is 90 minutes. Before building tables or a server, ask a database engine to calculate that result. By the end, you can save and run a SQL statement and explain the difference between your source file and a database file.

No earlier course or programming experience is required. You need basic arithmetic and the ability to create a file. This is the opening of a standalone database engineering series; later chapters on PostgreSQL and application engineering are planned, not prerequisites.

## Prepare a place to work

In Project Studio Desktop, choose an empty project folder called `issue-desk`. The editor saves text files there. The terminal runs programs in that folder. A **command** is an instruction you type after the terminal prompt; do not copy the prompt itself.

Our first engine is SQLite: it can work with a database in a single file without a separate server. **SQL** is the language we send it. The `sqlite3` program is a terminal interface to that engine. It is a separate installation from Project Studio.

Run this command in the terminal:

```text
sqlite3 --version
```

Expect a version number. If the terminal says the command cannot be found, install the command-line tools from the [official SQLite downloads](https://sqlite.org/download.html). On Windows, extract the tools ZIP into a folder and add that folder to your user PATH (the list of folders searched for commands), then reopen the terminal. On macOS or Linux, use an existing `sqlite3` if available or your system's package manager. The opening uses longstanding SQLite features; it does not require the newest release. Installation and Windows execution still need independent platform review.

```check
run "sqlite3 --version" label="The SQLite command-line program is available" -- Install the sqlite3 command-line tool, reopen the terminal, then retry.
```

## One calculation, one result

`SELECT` asks for a result. `30` and `3` are literal numbers: their values are written directly. `*` multiplies them. The semicolon ends the SQL statement. SQL keywords are shown in capitals for readability; `select` would work too.

Create and save `first.sql`. The `.sql` extension identifies a text file containing SQL instructions.

```sql file=first.sql
SELECT 30 * 3;
```

Run:

```text
sqlite3 -batch -bail :memory: ".read first.sql"
```

Read the command from left to right. `sqlite3` is the program. `-batch` runs without an interactive prompt. `-bail` stops at the first error. `:memory:` creates a temporary database that disappears when this command ends. The quoted `.read first.sql` tells the SQLite shell to read your saved file. Dot commands belong to the shell; they are not SQL and do not take SQL semicolons.

Expect `90`. We have not created or stored a ticket record: this statement only calculates a result.

```predict
question: Change 3 to 4 before running. What number should the query return?
answer: 120
explain: SELECT evaluates 30 multiplied by 4; nothing is stored between these temporary runs.
verify: sqlite3 :memory: "SELECT 30 * 4;"
```

Try the change, compare your prediction, then restore `3`. Remove the `*` and run once: the syntax error says the engine cannot interpret the statement. Restore it. Explain why changing a saved file has no effect until you run it.

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".testcase result\" \".read first.sql\" \".check '90'\"" stdout="testcase-result ok" exit=0 label="The calculation returns exactly 90" -- Save the SQL file and run the command in the lesson terminal.
```

The automated check uses two extra shell commands: `.testcase result` starts recording output and `.check` compares it with the expected result. `-noheader` hides names and `-list` separates fields with a vertical bar. These are test presentation tools, not business SQL. A passing check prints `testcase-result ok`; a mismatch prints FAILED.

## Name the output

A result can have a column name even without a stored table. `AS` gives a result a name, called an **alias**. The name below describes both the quantity and the unit.

```sql file=first.sql
SELECT 30 * 3 AS total_minutes;
```

Run `sqlite3 -header :memory: ".read first.sql"`. The new `-header` option displays the column name above `90`. Removing `-header` changes presentation, not the calculation.

Whole minutes keep this example simple. An estimate is not time already spent. We will model those as separate facts when we design work logs.

```check
run "sqlite3 -batch -bail -noheader -list :memory: \".testcase result\" \".read first.sql\" \".check '90'\"" stdout="testcase-result ok" exit=0 label="The calculation returns exactly 90" -- Save the SQL file and run the command in the lesson terminal.
```

## Your turn: estimate a batch

Create `quote.sql` yourself. Each of five report tasks is estimated at 45 minutes. Return their calculated total in a column named `total_minutes`. Keep the multiplication in the statement so another engineer can see the estimate per task and task count.

Run it, then change the task count to six and predict the result before running again. Restore five before checking. Explain which part of your file is a value, which part is an operation, and which part is a name.

```hints
nudge: Reuse the shape of first.sql, but think about which two numbers describe this batch.
concept: SELECT evaluates an expression; AS names its result without changing its value.
shape: Put estimate, multiplication, task count, then the alias before the semicolon.
```

```check
run "sqlite3 -batch -bail -header -list :memory: \".testcase result\" \".read quote.sql\" \".check 'total_minutes\n225'\"" stdout="testcase-result ok" exit=0 label="The quote has the requested name and value" -- Save the SQL file and run the command in the lesson terminal.
```

The check compares the returned value and header. It does not prove you can explain the arithmetic, and a hardcoded total can mimic a single result: the six-task experiment is part of your review.
