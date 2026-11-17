---
title: "Where Data Can Live: Files, Databases and the Signs You've Outgrown One"
runtime: python
---

A household spreadsheet works for a year. Then three small things happen. Sam edits a downloaded copy while Alex edits the shared one, and now there are two versions, and nobody knows which is right. Someone types `grocery` instead of `groceries`, and the month's grocery total quietly drops. A row is deleted by accident, and there's no way to see what it said. None of these is a bug in the spreadsheet. Each is a sign that the data has outgrown the place it lives. Data outlives code: programs get rewritten, but the data from year one is still needed in year ten, so where it lives is one of the most expensive decisions to get wrong. This lesson lays out the places data can live and the signs that one has stopped being enough, and gives Ledger its first storage: CSV files, chosen on purpose, with their limits written down.

**By the end you can:**

- Name the main kinds of data store, from a CSV file to a vector database, and say what each is good at.
- Recognize the six signs that a spreadsheet or file has stopped being enough.
- Keep all access to a project's data behind one module, and say why.
- Record a storage decision with its revisit triggers.

**You need:** 02-01-02 (Ledger, `DECISION.md`). Commands run inside `ledger`.

## Fourteen places

`DECISION.md` left one thing open: "Where its data lives is a separate decision, not made yet." Here are the options. Each is a kind of store, with a well-known example, roughly from simplest to most specialized:

| Kind | What it holds | Good at | Example |
|---|---|---|---|
| **Spreadsheet** | A grid people edit | Small data people look at and change by hand | A shared sheet |
| **CSV file** | Rows of text fields | Simple tables, readable anywhere, easy to export | `budget.csv` |
| **JSON or YAML file** | Nested values as text | Settings, small nested data | A `package.json`, a CI configuration |
| **SQLite** | Tables in one file, with types and rules | One program's data, enforced rules, no server | Phone apps, browsers |
| **Relational server** | Tables, shared over a network | Many writers, relationships, money that must add up | PostgreSQL, MySQL |
| **Document store** | One nested record per item | Items whose shape varies, read whole | MongoDB |
| **Key-value store** | A value for each key | Fast lookups by one key | Redis, DynamoDB |
| **Object storage** | Large files by name | Photos, videos, backups, written once and read whole | Amazon S3 |
| **Search index** | Words mapped to documents | Finding text among millions of documents | Elasticsearch |
| **Warehouse** | Huge tables, stored by column | Reports over years of business data | BigQuery, Snowflake |
| **Time-series database** | Measurements in time order | Readings every second, asked for by time range | InfluxDB |
| **Graph database** | Things and the links between them | Questions about paths: friends of friends | Neo4j |
| **Vector database** | Lists of numbers (embeddings) | Finding items similar in meaning | pgvector |
| **In memory** | Values in a running program | Speed, for data that can be rebuilt or lost | A Python `dict` |

Most of these exist because one question became too slow or too hard in a general store. A search index exists because scanning every document for a word stops working at millions of documents. A time-series database exists because "the average for each hour of last year" over billions of readings needs data kept in time order. The general rule is to start with the simplest store that answers your questions, and move only when a question it can't answer well actually arrives.

```predict
question: A notes app has a million notes, and people search them for a word. Which store makes that search fast?
choice: A key-value store
choice: A search index
choice: A warehouse
answer: A search index
explain: A search index keeps, for every word, the list of notes containing it, built ahead of time, so a search reads one list instead of scanning a million notes. A key-value store finds a note quickly by its key, not by a word inside it. A warehouse is for reports over huge tables, not for finding text.
```

## A store with one door

Ledger's data is `budget.csv`, and today `total.py` reads it directly. Before any more programs touch that file, give it one door: a module that's the only code allowed to read or write Ledger's data. Create `store.py`:

```python file=ledger/store.py
import csv

# Ledger's storage, for now: one CSV file, read whole and appended to.
# Nothing here checks what is written. STORAGE.md says why, and what it costs.
PATH = "budget.csv"
FIELDS = ["date", "who", "category", "cents", "note"]


def load(path=PATH):
    with open(path, newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def add(row, path=PATH):
    with open(path, "a", newline="", encoding="utf-8") as file:
        csv.DictWriter(file, fieldnames=FIELDS).writerow(row)
```

`load` reads every row as a dictionary. `add` opens the file in append mode (`"a"`), so the new row goes at the end and nothing before it is rewritten, and `csv.DictWriter` writes the dictionary's values in `FIELDS` order. `newline=""` is the same rule as in 02-01-01: let the `csv` module write its own line endings. Save it, and ask it for the data:

```
.venv/bin/python -c "import store; rows = store.load(); print(len(rows), rows[0])"
```

(On Windows, `.venv/Scripts/python`.) It prints the number of rows and the first one:

```
10 {'date': '2026-11-01', 'who': 'Sam', 'category': 'rent', 'cents': '95000', 'note': 'November'}
```

Every value is a string, `'95000'` included: a CSV file holds text, and nothing in it says that `cents` is a number. Why the one door? Because the storage decision will change. If every program opens `budget.csv` itself, moving to SQLite means finding and changing all of them. If only `store.py` does, it means changing one file. You don't have to make the final storage decision now. You have to make it cheap to change later. Commit it:

```
git add store.py
git commit -m "Give Ledger's data one door: store.py"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import store; rows = store.load(); print(len(rows), rows[0]['cents'])\"" stdout="10 95000" -- store.load() should return the ten rows, the first with cents 95000.
run "cd ledger; git cat-file -e HEAD:store.py" -- Commit store.py.
```

## No rules

A CSV file accepts anything. See what that means. Sam adds a grocery bill, and types the category the way people do:

```
.venv/bin/python -c "import store; store.add({'date': '2026-11-30', 'who': 'Sam', 'category': 'grocery', 'cents': '1240', 'note': ''})"
```

```predict
question: The new row says category "grocery", not "groceries". What does total.py print now?
choice: it crashes
choice: a separate grocery line
choice: groceries grows to 241.70
answer: a separate grocery line
explain: total.py adds up by whatever text is in the category column. "grocery" is different text from "groceries", so it gets a line of its own, 12.40, and groceries stays at 229.30. Nothing crashes and nothing warns. The month's total is right, but the grocery total is wrong, and only someone who notices the extra line would know.
verify: cd ledger; .venv/Scripts/python -c "import os, shutil, subprocess, sys, tempfile, store; p = os.path.join(tempfile.mkdtemp(), 'b.csv'); shutil.copy('budget.csv', p); store.add({'date': '2026-11-30', 'who': 'Sam', 'category': 'grocery', 'cents': '1240', 'note': ''}, p); out = subprocess.run([sys.executable, 'total.py', p], capture_output=True, text=True).stdout; print('a separate grocery line' if 'grocery          12.40' in out else 'other')"
```

Run it:

```
.venv/bin/python total.py
```

```
rent            950.00
groceries       229.30
bills           111.29
eating out       46.30
transport        30.00
grocery          12.40
total          1379.29
```

Read the evidence. The store took the row without complaint. The mistake shows up only in the output of a different program, as a line that looks perfectly reasonable. Had Sam typed `12.40` in the cents column instead, `store.add` would have accepted that too, and `total.py` would have crashed with 02-01-02's `ValueError`: a failure far from its cause, in a program that did nothing wrong. Either way, the place that *could* have caught the mistake, the moment it was written, didn't.

Undo it. `budget.csv` is in Git, so restore the committed version (01-08-03):

```
git restore budget.csv
```

`total.py` prints `total          1366.89` again. The real fix is rules: a list of allowed categories, and cents that must be a whole number, checked when a row is written. A database such as SQLite can enforce some rules itself (a column's type, a value that must exist in another table). A CSV file enforces none, so with CSV the rules have to live in code, and 02-04-02 and 02-06-02 write them.

```check
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- Restore budget.csv (git restore budget.csv): the total should be back to 1366.89.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Nothing should be changed after the restore.
```

## Six signs

Here are the signs that a spreadsheet, or a plain file, has stopped being enough. Each one has an answer for Ledger today:

| Sign | What it looks like | Ledger now |
|---|---|---|
| **Multiple writers** | Two people or programs change the data at the same time, and a change is lost | Not yet: one computer, one person at a time |
| **Relationships** | Data refers to other data (a transaction to its account), and keeping them consistent by hand fails | Coming: accounts and categories, in 02-02-02 |
| **Enforced rules** | Values must follow rules (a known category, a whole number), and people break them | **Already**: the `grocery` row |
| **History** | You need to know what a value used to be, and who changed it | Partly: Git keeps each commit, not each edit |
| **One source of truth** | Copies drift apart, and nobody knows which is right | Not yet: one file, in one place |
| **Automation** | Programs need to read and change the data without a person clicking | Already, and CSV handles it well |

One sign present doesn't mean moving at once. It means that sign's cost is now real, and you pay it somewhere: Ledger will pay for "enforced rules" in code, in `store.py`'s neighbours. When several signs arrive together, the cost of staying usually exceeds the cost of moving. Ledger moves to SQLite in module 7.7, when its relationships and rules have grown enough to make that worthwhile.

```predict
question: Five housemates each keep a copy of a shared-bills spreadsheet on their own laptop and email changes to each other. Which two signs are present?
explain: Multiple writers (five people change the data) and one source of truth (five copies, drifting apart). Both point to one shared store that everyone writes to: an online spreadsheet would answer them for five people, before any software is built.
```

## Recording the choice

Ledger's data stays in CSV for now, on purpose: it's tiny, readable, and every change to it shows in Git. Write that down, with what it costs and when to revisit, in the same shape as `DECISION.md`. Create `STORAGE.md`:

```markdown file=ledger/STORAGE.md
# Decision: where Ledger's data lives, for now

Decided 2026-11-16, by Sam and Alex.

### Context

DECISION.md left open where Ledger's data lives. Today it is one CSV file, budget.csv, read by total.py, and store.py is the only code that reads or writes it. Ten years is a few hundred kilobytes (estimate.py). Two people use one computer, one at a time.

### Options considered

- CSV files: readable in any editor, diffable in Git, in Python's standard library; enforce no rules at all.
- A spreadsheet file: familiar; hard for code to read reliably, and formulas mix data with calculation.
- JSON files: nested data, standard library; still no rules, and the whole file is rewritten on every change.
- SQLite: one file with tables, types and constraints, in the standard library; harder to read by eye, and more to learn before it helps.

### Decision

Keep Ledger's data in CSV files, read and written only through store.py.

### Why

At this size, every option is fast enough. CSV files let us see every byte of our data and every change to it in Git, which matters while Ledger is young and its data model is still changing. Keeping all access in store.py means moving to SQLite later changes one module, not every program.

### Consequences

- Nothing stops a bad row: a misspelled category or a dollar amount in the cents column is written without complaint. Code must check what it writes.
- One writer at a time. Two programs writing at once can lose a change.
- History is whatever Git has: we must commit after changes, or lose the old values.

### Revisit when

- Code checking what is written grows past what store.py can sensibly hold.
- Data in one file refers to data in another (accounts, categories) and keeping them consistent by hand fails.
- More than one program, or person, needs to write at the same time.
- We need the history of single edits, not just commits.
```

The revisit triggers are the six signs, written for Ledger. That's what makes "CSV for now" a decision rather than a habit: it says exactly what would end it. Anyone, or any agent, later asked to "add a second user who edits from their own laptop" can see that this crosses a trigger, and that the storage decision has to be made again first.

**What else, and why not.** SQLite now would enforce types and some rules from the start, and Ledger will need it. But learning tables, keys and SQL before Ledger has data that relates to other data means learning the tool before the problem; 02-02-02 and 02-02-03 build the problem first, so 7.7's move solves something you've seen. A database server (PostgreSQL) would add a server to install, secure, back up and keep running for two people on one computer, which `DECISION.md` already ruled out. A spreadsheet file keeps data and formulas together, which is convenient for people and unreliable for programs.

Commit it:

```
git add STORAGE.md
git commit -m "Record where Ledger's data lives for now"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('STORAGE.md').read_text(encoding='utf-8'); print(all(h in t for h in ['### Context', '### Options considered', '### Decision', '### Why', '### Consequences', '### Revisit when']), 'store.py' in t.split('### Decision')[1].split('###')[0])\"" stdout="True True" -- STORAGE.md should have the six sections, and its decision should name store.py as the only way in.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:STORAGE.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit STORAGE.md.
```

## Your turn: where would it live?

Six needs, from six different projects. For each, choose the kind of store from this lesson's table that fits best, and say why. Write `STORES.md` in `ledger` with one section per need, using these headings exactly, and two lines in each: `Store:` naming the kind, and `Because:` giving the reason, in terms of the questions the data must answer.

- `### Notes search`: a notes app with millions of notes, searched by any word.
- `### Sensor readings`: a greenhouse sensor sends a temperature every second, for years; people ask for hourly averages.
- `### Photos`: an app stores the photos its users upload, several megabytes each.
- `### Friends of friends`: a social app suggests people you might know: friends of your friends, and theirs.
- `### Orders and payments`: a shop's orders, customers and payments, written by several staff at once, where the money must always add up.
- `### Similar questions`: a help site finds questions similar in meaning to the one just asked, even with different words.

Commit `STORES.md`.

```hints
nudge: For each need, find the question the data has to answer quickly ("which notes contain this word?", "what was the average at 3 pm?"), then find the row of the table whose "Good at" column is that question.
concept: Search by word: a search index. Readings in time order: a time-series database. Large files read whole: object storage (with their details in a database). Paths between people: a graph database. Related records, many writers, money that must add up: a relational database. Similar in meaning: a vector database, comparing embeddings.
shape: # Where each one's data would live, then six sections like ### Photos / Store: object storage / Because: … one sentence about what the data must do.
answer: STORES.md:
~~~markdown
# Where each one's data would live

### Notes search

Store: a search index
Because: finding every note containing a word, among millions, needs an index of words to notes, built ahead of time; scanning every note for each search is too slow.

### Sensor readings

Store: a time-series database
Because: readings arrive every second, forever, and are asked for by time range ("the last hour", "the daily average"); a time-series store keeps them in time order and summarizes old data.

### Photos

Store: object storage
Because: photos are large files that are written once and read whole; object storage keeps files by name cheaply, and a database keeps only each photo's name and details.

### Friends of friends

Store: a graph database
Because: the question is about paths between people, several steps deep; a graph store follows links directly instead of joining a table to itself again and again.

### Orders and payments

Store: a relational database
Because: orders, customers and payments refer to each other, the money must always add up, and several people write at once; a relational database enforces keys, constraints and transactions.

### Similar questions

Store: a vector database
Because: "similar in meaning" means comparing embeddings, lists of numbers; a vector index finds the nearest ones without comparing the question with every stored one.
~~~
Then git add STORES.md and git commit -m "Choose a store for six needs". The tempting slips: a document store for orders (it keeps each order whole, but doesn't make the money across orders add up), and photos in the database itself (it works for a few, and makes every backup and query carry gigabytes).
```

```check
file ledger/STORES.md -- Write STORES.md in ledger.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('STORES.md').read_text(encoding='utf-8'); parts = {p.splitlines()[0].strip(): p for p in t.split('### ')[1:]}; want = {'Notes search': ['search'], 'Sensor readings': ['time-series', 'time series'], 'Photos': ['object'], 'Friends of friends': ['graph'], 'Orders and payments': ['relational', 'sql', 'postgres', 'mysql'], 'Similar questions': ['vector']}; line = lambda p, k: ([l for l in p.splitlines() if l.startswith(k)] + [''])[0].lower(); print([n for n, ws in want.items() if not (n in parts and any(w in line(parts[n], 'Store:') for w in ws))] or 'all right')\"" stdout="all right" -- Each need's Store: line should name the kind that fits it best. The check prints the needs whose store doesn't fit, or whose heading is missing.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('STORES.md').read_text(encoding='utf-8'); parts = t.split('### ')[1:]; print(len(parts) == 6 and all(len(([l for l in p.splitlines() if l.startswith('Because:')] + [''])[0]) > 30 for p in parts))\"" stdout="True" -- Each of the six sections should give its reason on a Because: line.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:STORES.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit STORES.md.
```

**What these checks establish, and what they don't.** They check that `store.py` reads Ledger's data, that the experiment's bad row was undone, that `STORAGE.md` has its six sections and names the one door, and that each of the six needs got the kind of store that fits it. They can't check your reasons. A `Because:` line that says "it's the best one" passes, and teaches you nothing. The reason should name the question the data must answer and why that store answers it well, because that's what lets you choose when a need doesn't match any example: then the table helps only if you know why each row is there.

## What you can do now

- Data lives in many kinds of store, from **CSV files and SQLite** to **search indexes, time-series, graph and vector databases**. Most exist because one kind of question became too slow in a general store.
- Start with the **simplest store that answers your questions**, and move when a question it can't answer arrives.
- The **six signs** that a file or spreadsheet has stopped being enough: multiple writers, relationships, enforced rules, history, one source of truth, automation.
- A CSV file **enforces no rules**: a mistake is accepted when written, and shows up later, somewhere else, or never.
- Give data **one door** (`store.py`), so a storage decision can change in one place.
- A storage decision's **revisit triggers** are the signs, written for your project.

```predict
question: A team keeps product prices in a JSON file that three services each read, and two of them can also update it. Prices are sometimes lost after an update. Which signs are present, and what would you check first?
explain: Multiple writers (two services update the file, so one can overwrite the other's change: a lost update) and one source of truth (three readers, possibly with stale copies). Check first how each service writes the file: read it whole, change it, and write it whole is the classic way to lose a concurrent change. The fix is one store that handles concurrent writes (a database), or one service that owns the prices and that the others ask.
```

**Next:** 02-02-02 gives Ledger's data a shape. A transaction belongs to an account and a category, so they become separate CSV files with ids: entities, attributes, relationships, keys, what "nothing" means in data (NULL), and the rules (constraints) that keep the files consistent, checked by a program of their own.
