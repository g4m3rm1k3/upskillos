---
title: "Entities, Keys and Nothing: Giving Data a Shape"
runtime: python
---

Ledger's `budget.csv` writes the category's name in every row: `groceries`, `groceries`, `groceries`. Ten years at 60 entries a month is 7,200 rows, and about 2,900 of them would say `groceries`. Rename the category to `food`, and all of those rows have to change, every one, correctly, or the totals split in two the way 02-02-01's `grocery` row split them. Who paid has the same problem: the row says `Sam`, and the day a second Sam joins the household, every old row is ambiguous. The cause is one shape mistake: a fact (this category's name, which account paid) is copied into many rows instead of being stored once and *referred to*. This lesson gives Ledger's data its proper shape, with entities, relationships and keys, and writes the program that checks the files keep it, because CSV files won't.

**By the end you can:**

- Find the entities in a domain, their attributes, and the relationships between them (one-to-one, one-to-many, many-to-many).
- Choose primary keys, tell natural keys from surrogate keys, and use foreign keys to refer to rows.
- Say what "nothing" (NULL) can mean in data, and decide which meaning each empty field has.
- Check a set of files for key and constraint violations, and read what the check reports.

**You need:** 02-02-01 (`store.py`, `STORAGE.md`). Commands run inside `ledger`.

## Facts stored once

```predict
question: At 60 entries a month for ten years, with 4 of every 10 entries groceries, how many rows of budget.csv would renaming "groceries" change?
answer: 2880
explain: 7,200 rows over ten years, and 4 in 10 of them are groceries: 2,880 rows to rewrite for one rename, and a mistake in any of them is a wrong total. If the name were stored once, in a categories table, and each row referred to the category by a number, a rename would change one row.
```

The fix is to store each fact once, in the place where it belongs, and refer to it from everywhere else. A category's name belongs to the category, not to each transaction. That idea, applied carefully, is most of what data modeling is.

## Entities, attributes, relationships

An **entity** is a kind of thing the data is about, whose instances you can tell apart and that have facts of their own. Ledger's are:

- **Account**: Sam's card, Alex's card. Facts: a name, a holder.
- **Category**: rent, groceries. Fact: a name.
- **Transaction**: one payment. Facts: a date, an amount, a note.

Those facts are **attributes**. Some facts are about two entities at once: "this transaction was paid from Sam's card", "this transaction is groceries". Those are **relationships**, and each one has a **cardinality**, how many of one side go with how many of the other:

| Cardinality | Meaning | Example |
|---|---|---|
| **One-to-many (1:N)** | One A has many Bs; each B has exactly one A | One account has many transactions; each transaction is paid from one account |
| **One-to-one (1:1)** | Each A has at most one B, and each B one A | A person and their login; an account and its settings |
| **Many-to-many (M:N)** | An A has many Bs, and a B has many As | Transactions and tags: a payment can be "shared" and "recurring", and "shared" applies to many payments |

One-to-many is by far the commonest, and it's stored on the "many" side: each transaction records *which* account it belongs to. Many-to-many can't be stored on either side without a list in a field, so it gets a table of its own, one row per pairing (this lesson's task).

```predict
question: A household's people each have several accounts, and an account can be shared by two people. What's the cardinality between people and accounts?
choice: One-to-many
choice: One-to-one
choice: Many-to-many
answer: Many-to-many
explain: A person has many accounts, and an account (a joint one) has many people. That needs a table of pairings, person and account, and a model that said "each account has one holder" would have no way to record the joint account at all. Ledger's accounts have one holder each, which is a simplification the data model makes on purpose: it should be stated, not discovered later.
```

## Tables with ids

Each entity gets a table, and each row a **key**: a value that identifies that row and no other. Which value? There are two kinds:

- A **natural key** is a fact that's already unique: a currency code (`EUR`), a country code, an ISBN. Natural keys are meaningful, which is also their weakness: names change, emails change, and things that seemed unique turn out not to be (two Sams).
- A **surrogate key** is a value made up only to identify the row: 1, 2, 3. It means nothing, so it never needs to change.

A category's name is a poor key, because renaming is exactly what you'll want to do. Ledger uses surrogate keys, numbered ids, for all three tables. The id that identifies a row in its own table is its **primary key**. A field that holds another table's primary key, as a transaction's `category_id` does, is a **foreign key**: a reference to a row elsewhere.

Create `make_data.py`, which writes the same made-up month as `make_budget.py`, now as three tables:

```python file=ledger/make_data.py
import csv
import os

# Ledger's made-up data as separate tables, each row with an id. The ids are
# surrogate keys: numbers that mean nothing, so a name can change freely.
ACCOUNTS = [(1, "Sam's card", "Sam"), (2, "Alex's card", "Alex")]
CATEGORIES = [(1, "rent"), (2, "groceries"), (3, "transport"), (4, "eating out"), (5, "bills")]
TRANSACTIONS = [
    (1, "2026-11-01", 1, 1, 95000, "November"),
    (2, "2026-11-02", 2, 2, 6420, "market"),
    (3, "2026-11-04", 1, 3, 3000, "bus pass"),
    (4, "2026-11-07", 2, 2, 4815, ""),
    (5, "2026-11-09", 1, 4, 2750, "birthday"),
    (6, "2026-11-12", 2, 5, 7130, "electricity"),
    (7, "2026-11-15", 1, 2, 5590, ""),
    (8, "2026-11-20", 2, 4, 1880, ""),
    (9, "2026-11-25", 1, 5, 3999, "phone"),
    (10, "2026-11-28", 2, 2, 6105, "market"),
]
TABLES = {
    "accounts": (["id", "name", "holder"], ACCOUNTS),
    "categories": (["id", "name"], CATEGORIES),
    "transactions": (["id", "date", "account_id", "category_id", "cents", "note"], TRANSACTIONS),
}

os.makedirs("data", exist_ok=True)
for table, (header, rows) in TABLES.items():
    with open(f"data/{table}.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(header)
        writer.writerows(rows)
```

Read a transaction: `(4, "2026-11-07", 2, 2, 4815, "")` is transaction 4, on 7 November, paid from account 2 (Alex's card), category 2 (groceries), 48.15, no note. The words are gone from the transactions; each is stored once, in its own table. `os.makedirs(..., exist_ok=True)` makes the `data` folder, and does nothing if it's already there. Save it and run it:

```
.venv/bin/python make_data.py
```

(On Windows, `.venv/Scripts/python`.) It writes `data/accounts.csv`, `data/categories.csv` and `data/transactions.csv`. The last begins:

```
id,date,account_id,category_id,cents,note
1,2026-11-01,1,1,95000,November
2,2026-11-02,2,2,6420,market
```

```check
run "cd ledger; .venv/Scripts/python -c \"import csv; n = lambda t: len(list(csv.DictReader(open('data/' + t + '.csv', newline='', encoding='utf-8')))); print(n('accounts'), n('categories'), n('transactions'))\"" stdout="2 5 10" -- make_data.py should write 2 accounts, 5 categories and 10 transactions into data/.
```

## Through the door

Now every program that reads the data needs names back: `total.py` prints `groceries`, not `2`. Looking a name up by its id is a **join**, and it belongs in `store.py`, the one door from 02-02-01. Replace `store.py` with:

```python file=ledger/store.py
import csv

# Ledger's storage: one CSV file per table in data/, each row with an id.
# Nothing here checks what is stored; check_data.py checks the keys.
FOLDER = "data"


def read(table, folder=FOLDER):
    with open(f"{folder}/{table}.csv", newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


# Each transaction, with its account's holder and its category's name
# looked up by id.
def transactions(folder=FOLDER):
    holders = {row["id"]: row["holder"] for row in read("accounts", folder)}
    names = {row["id"]: row["name"] for row in read("categories", folder)}
    return [
        {**row, "who": holders[row["account_id"]], "category": names[row["category_id"]]}
        for row in read("transactions", folder)
    ]
```

`read` loads any table by name. `transactions` builds two dictionaries from id to name (a dictionary is a lookup table: 02-03-02 calls it a function), then gives each transaction row back with two more fields. `{**row, "who": …}` is a new dictionary holding everything in `row` plus the new keys; `row` itself isn't changed. The ids are compared as text, `"2"` with `"2"`, since CSV holds only text. `add` is gone: nothing called it, and writing comes back in 02-04-02, with rules. Save it, and ask it for transaction 4:

```
.venv/bin/python -c "import store; print(store.transactions()[3])"
```

```
{'id': '4', 'date': '2026-11-07', 'account_id': '2', 'category_id': '2', 'cents': '4815', 'note': '', 'who': 'Alex', 'category': 'groceries'}
```

```check
run "cd ledger; .venv/Scripts/python -c \"import store; rows = store.transactions(); print(len(rows), rows[3]['who'], rows[3]['category'])\"" stdout="10 Alex groceries" -- store.transactions() should give the ten transactions with who and category looked up: the fourth is Alex's groceries.
```

## One source of truth

`budget.csv` and the new tables now hold the same month. Two copies of the same facts drift apart as soon as one is changed and the other isn't, so one must go. Before removing it, find every reader, so nothing breaks silently:

```
git grep -n "budget.csv"
```

```
STORAGE.md:7:DECISION.md left open where Ledger's data lives. Today it is one CSV file, budget.csv, read by total.py, and store.py is the only code that reads or writes it. Ten years is a few hundred kilobytes (estimate.py). Two people use one computer, one at a time.
estimate.py:4:name = sys.argv[1] if len(sys.argv) > 1 else "budget.csv"
make_budget.py:19:with open("budget.csv", "w", newline="", encoding="utf-8") as file:
total.py:12:name = sys.argv[1] if len(sys.argv) > 1 else "budget.csv"
```

`store.py` isn't in the list: it now reads `data/`. Three programs bypass the door: `total.py` and `estimate.py` read `budget.csv` themselves, and `make_budget.py` writes it. That's the lesson of the door: it only helps if everyone goes through it. (`git grep` searches only files Git tracks, which is why it's the right tool here: it can't miss a committed file, and it skips `.venv`.) Move `total.py` through it. Replace `total.py` with:

```python file=ledger/total.py
import store


# Whole cents as money, without ever making a float: 136689 is 1366.89.
def money(cents):
    return f"{cents // 100}.{cents % 100:02d}"


# Read the month's spending through store.py, and print the total for each
# category, largest first, then the month's total.
totals = {}
for row in store.transactions():
    totals[row["category"]] = totals.get(row["category"], 0) + int(row["cents"])

for category, cents in sorted(totals.items(), key=lambda item: -item[1]):
    print(f"{category:12} {money(cents):>9}")
print(f"{'total':12} {money(sum(totals.values())):>9}")
```

Only the reading changed. In `estimate.py`, change `"budget.csv"` to `"data/transactions.csv"` (one word, on line 4). Then remove the old copy and the script that made it, and run both:

```
git rm budget.csv make_budget.py
.venv/bin/python total.py
.venv/bin/python estimate.py
```

`total.py` prints exactly what it printed in 02-01-01, ending `total          1366.89`. That's the test of a change of shape: the same questions give the same answers. `estimate.py` now reports `29.4 bytes each on average` and `about 212 KB`: rows are shorter, since a number replaces each name. Commit the new shape as one change:

```
git add make_data.py data store.py total.py estimate.py
git commit -m "Store each fact once: accounts, categories and transactions with ids"
```

(`STORAGE.md` still says "one CSV file, budget.csv": a record of what was decided then. Its trigger "data in one file refers to data in another" has just happened; 02-02-03 writes the next record.)

```check
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- total.py, reading through store.py, should print the same total as before: 1366.89.
run "cd ledger; .venv/Scripts/python total.py" stdout="groceries       229.30" -- Groceries should still be 229.30.
run "cd ledger; .venv/Scripts/python estimate.py" stdout="7200 rows" -- estimate.py should read data/transactions.csv.
missing ledger/budget.csv -- Remove budget.csv (git rm budget.csv make_budget.py): its facts now live in data/.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:data/transactions.csv').returncode == 0, git('cat-file', '-e', 'HEAD:budget.csv').returncode != 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit the new tables, store.py, total.py and estimate.py, with budget.csv removed.
```

## Nothing

Transaction 4's note is empty. What does empty mean? Here it means "there's no note", which is a perfectly good value. But an empty field can mean at least three different things:

- **Unknown**: there is a value, but we don't know it (a transaction whose category hasn't been chosen yet).
- **Not applicable**: there can't be a value (the "date closed" of an account that's still open).
- **Empty**: the value is known and is nothing (a note that says nothing).

Databases mark a missing value with **NULL**, and SQL treats it as "unknown": `NULL = NULL` is not true but unknown, so a query for rows where a field equals NULL finds nothing (it needs `IS NULL`). Python's `None` is a value like any other: `None == None` is `True`. CSV has no way to say NULL at all. See what it does with Python's `None`:

```
.venv/bin/python -c "import csv, io; f = io.StringIO(); csv.writer(f).writerow([None, '', 'x']); print(repr(f.getvalue())); print(next(csv.reader(io.StringIO(f.getvalue()))))"
```

```
',,x\r\n'
['', '', 'x']
```

`None` and `''` are written the same way, as nothing between two commas, and both come back as `''`. Whatever difference there was is lost in the file. So for each field, decide which meaning an empty value has, and write it down. Ledger's rule: an empty `note` means "no note"; every key, `date` and `cents` must never be empty (they are **NOT NULL**, in database terms). A rule a field must always keep is a **constraint**. Primary keys (present and unique), foreign keys (pointing at a row that exists) and NOT NULL are the three every relational database enforces. A CSV file enforces none of them.

```check
run "cd ledger; .venv/Scripts/python -c \"import store; rows = store.read('transactions'); print(sum(1 for r in rows if r['note'] == ''), all(r['id'] and r['date'] and r['cents'] for r in rows))\"" stdout="3 True" -- Three transactions have an empty note, which means "no note"; ids, dates and amounts are never empty.
```

## Keys you can check

Since the files won't enforce Ledger's constraints, a program has to check them. Create `check_data.py`:

```python file=ledger/check_data.py
import sys

import store

# The rules Ledger's tables must keep. A database would enforce them itself;
# CSV files can't, so this program checks them.
# Each table's primary key: the field, or fields, that must be present and unique.
KEYS = {"accounts": ["id"], "categories": ["id"], "transactions": ["id"]}
# Each foreign key: a (table, field) that must hold an id from another table.
REFERS = {
    ("transactions", "account_id"): "accounts",
    ("transactions", "category_id"): "categories",
}
# Fields that must not be empty, besides the keys.
REQUIRED = {"accounts": ["name", "holder"], "categories": ["name"], "transactions": ["date", "cents"]}


def problems(folder):
    found = []
    rows = {table: store.read(table, folder) for table in KEYS}
    for table, key in KEYS.items():
        seen = set()
        for line, row in enumerate(rows[table], start=2):
            value = tuple(row[field] for field in key)
            if not all(value):
                found.append(f"{table}.csv line {line}: {', '.join(key)} must not be empty")
            elif value in seen:
                found.append(f"{table}.csv line {line}: {', '.join(key)} {', '.join(value)} is used twice")
            seen.add(value)
            for field in REQUIRED.get(table, []):
                if not row[field]:
                    found.append(f"{table}.csv line {line}: {field} must not be empty")
    for (table, field), target in REFERS.items():
        ids = {row["id"] for row in rows[target]}
        for line, row in enumerate(rows[table], start=2):
            if row[field] not in ids:
                found.append(f"{table}.csv line {line}: {field} {row[field] or '(empty)'} is not an id in {target}.csv")
    return found


if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else store.FOLDER
    found = problems(folder)
    for problem in found:
        print(problem)
    print(f"{len(found)} problems")
    sys.exit(1 if found else 0)
```

The rules are data, in three dictionaries at the top: `KEYS` (each table's primary key, as a list of fields, so a key can have more than one), `REFERS` (each foreign key and the table it points at) and `REQUIRED`. The code below them applies whatever rules the dictionaries hold. A key's value is a tuple of its fields, so a set of tuples finds the repeats. `enumerate(..., start=2)` numbers the rows as an editor shows the lines, the header being line 1, so each problem says where to look. It exits 1 if anything is wrong (01-06-06), so other programs and hooks can rely on it. Save it and run it:

```
.venv/bin/python check_data.py
```

```
0 problems
```

Zero problems means nothing yet, until you've seen it find one (01-09-01). Break the data the way hands do. Open `data/transactions.csv` and make two edits: on the line for transaction 4, change its `category_id` from `2` to `9` (so the line reads `4,2026-11-07,2,9,4815,`), and on the line for transaction 7, change its id from `7` to `6`. Save, and check:

```
.venv/bin/python check_data.py
```

```
transactions.csv line 8: id 6 is used twice
transactions.csv line 5: category_id 9 is not an id in categories.csv
2 problems
```

Both found, each with the line to fix. Now see what the rest of Ledger makes of the same mistake:

```
.venv/bin/python total.py
```

It stops in `store.py`, with `KeyError: '9'`, in the middle of a lookup, saying nothing about which file or line. That's the difference between a check written for the rule and a failure that happens to trip over it. Restore the file, and check again:

```
git restore data/transactions.csv
.venv/bin/python check_data.py
```

`0 problems`. Commit the check:

```
git add check_data.py
git commit -m "Check Ledger's keys and required fields"
```

```check
run "cd ledger; .venv/Scripts/python check_data.py" stdout="0 problems" -- check_data.py should find no problems in the restored data.
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); shutil.copytree('data', d, dirs_exist_ok=True); p = os.path.join(d, 'transactions.csv'); t = open(p, encoding='utf-8', newline='').read().replace('4,2026-11-07,2,2,', '4,2026-11-07,2,9,'); open(p, 'w', encoding='utf-8', newline='').write(t); r = subprocess.run([sys.executable, 'check_data.py', d], capture_output=True, text=True); print(r.returncode, 'category_id 9' in r.stdout)\"" stdout="1 True" -- check_data.py should exit 1 and name category_id 9 when a transaction refers to a category that doesn't exist.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:check_data.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit check_data.py; data/transactions.csv should be restored.
```

**What else, and why not.** You could keep names in the transactions and fix renames with search and replace: it works until one replacement is missed, and nothing tells you. You could nest the data, each account holding a list of its transactions, in one JSON file: that makes "all groceries across accounts" a walk through every account, and many-to-many impossible without copying. You could move to SQLite now, which enforces all three kinds of constraint itself: that's 7.7, once you've seen what the constraints are for. A check you've written yourself, on files you can read, shows you exactly what a database will be doing for you.

## Your turn: tags, many to many

Sam and Alex want to tag transactions: `shared` for costs they split, `recurring` for bills that come every month, `gift` for presents. A transaction can have several tags (rent is shared and recurring), and a tag applies to many transactions. That's many-to-many.

Add it to Ledger:

- In `make_data.py`, a `tags` table (`id`, `name`) and a `transaction_tags` table with two columns, `transaction_id` and `tag_id`, one row per pairing. Include at least one transaction with two tags, and one tag used by two or more transactions. Run it.
- In `check_data.py`, the rules for both new tables: `tags` has the primary key `id` and a required `name`; `transaction_tags` has no id of its own, so its primary key is the **pair** of its two fields (the same pairing twice is a mistake), and each field is a foreign key.

`check_data.py` should report `0 problems`. Commit your changes.

```hints
nudge: The link table's rows are just two ids. Which tables do they point at, and what does it mean if the same pair appears twice?
concept: A many-to-many relationship is stored as a table of pairs. Its primary key is composite: both fields together must be unique, though each one alone repeats. Both fields are foreign keys. check_data.py already supports keys of several fields (KEYS holds a list), so the new rules are new entries in KEYS, REFERS and REQUIRED.
shape: make_data.py: TAGS = [(1, "shared"), …] and TRANSACTION_TAGS = [(1, 1), (1, 2), …], and two entries in TABLES. check_data.py: "tags": ["id"] and "transaction_tags": ["transaction_id", "tag_id"] in KEYS; ("transaction_tags", "transaction_id"): "transactions" and ("transaction_tags", "tag_id"): "tags" in REFERS; "tags": ["name"] in REQUIRED.
answer: In make_data.py, before TABLES:
~~~python
TAGS = [(1, "shared"), (2, "recurring"), (3, "gift")]
# Many-to-many: a transaction can have several tags, and a tag many
# transactions, so each pairing is a row of its own.
TRANSACTION_TAGS = [(1, 1), (1, 2), (3, 2), (5, 3), (6, 1), (6, 2), (9, 2)]
~~~
and in TABLES:
~~~python
    "tags": (["id", "name"], TAGS),
    "transaction_tags": (["transaction_id", "tag_id"], TRANSACTION_TAGS),
~~~
In check_data.py:
~~~python
KEYS = {
    "accounts": ["id"],
    "categories": ["id"],
    "transactions": ["id"],
    "tags": ["id"],
    "transaction_tags": ["transaction_id", "tag_id"],
}
REFERS = {
    ("transactions", "account_id"): "accounts",
    ("transactions", "category_id"): "categories",
    ("transaction_tags", "transaction_id"): "transactions",
    ("transaction_tags", "tag_id"): "tags",
}
REQUIRED = {"accounts": ["name", "holder"], "categories": ["name"], "transactions": ["date", "cents"], "tags": ["name"]}
~~~
Run make_data.py and check_data.py (0 problems), then git add make_data.py data check_data.py and git commit -m "Tag transactions: a many-to-many relationship". The tempting slips: giving transaction_tags only foreign-key rules, so the same pairing can appear twice, and adding a tags field to transactions.csv holding "1;2", a list in a field, which no key check can see inside.
```

```check
file ledger/data/tags.csv -- make_data.py should write data/tags.csv.
file ledger/data/transaction_tags.csv -- make_data.py should write data/transaction_tags.csv.
run "cd ledger; .venv/Scripts/python -c \"import collections, store; links = store.read('transaction_tags'); t = collections.Counter(l['transaction_id'] for l in links); g = collections.Counter(l['tag_id'] for l in links); print(max(t.values()) >= 2, max(g.values()) >= 2)\"" stdout="True True" -- transaction_tags.csv should have a transaction with two tags and a tag used by two transactions.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; print('transaction_tags' in pathlib.Path('make_data.py').read_text(encoding='utf-8'))\"" stdout="True" -- make_data.py itself should write the tag tables, so running it again doesn't lose them.
run "cd ledger; .venv/Scripts/python check_data.py" stdout="0 problems" -- check_data.py should find no problems with the tags added.
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); shutil.copytree('data', d, dirs_exist_ok=True); f = open(os.path.join(d, 'transaction_tags.csv'), 'a', newline=''); f.write('5,99' + chr(13) + chr(10)); f.close(); r = subprocess.run([sys.executable, 'check_data.py', d], capture_output=True, text=True); print(r.returncode, '99' in r.stdout)\"" stdout="1 True" -- check_data.py should catch a pairing with a tag that doesn't exist (tag 99).
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); shutil.copytree('data', d, dirs_exist_ok=True); f = open(os.path.join(d, 'transaction_tags.csv'), 'a', newline=''); f.write('99,1' + chr(13) + chr(10)); f.close(); r = subprocess.run([sys.executable, 'check_data.py', d], capture_output=True, text=True); print(r.returncode)\"" stdout="1" -- check_data.py should catch a pairing with a transaction that doesn't exist (transaction 99).
run "cd ledger; .venv/Scripts/python -c \"import csv, os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); shutil.copytree('data', d, dirs_exist_ok=True); p = os.path.join(d, 'transaction_tags.csv'); first = list(csv.reader(open(p, newline='')))[1]; f = open(p, 'a', newline=''); f.write(','.join(first) + chr(13) + chr(10)); f.close(); r = subprocess.run([sys.executable, 'check_data.py', d], capture_output=True, text=True); print(r.returncode)\"" stdout="1" -- check_data.py should catch the same pairing twice: the link table's primary key is both fields together.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:data/transaction_tags.csv').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit the tags.
```

**What these checks establish, and what they don't.** They check that the data has its new shape and still gives the same totals, that `total.py` and `estimate.py` read the new tables, that `budget.csv` is gone, and that `check_data.py` passes on good data and fails, by name, on a dangling reference, a missing transaction, and a repeated pairing. They can't check that the model is right: that accounts really have one holder, that "shared" should be a tag and not a field, or that you've found every entity. A model can satisfy every constraint and still not describe the household. That's checked by asking the people who live in it, which 02-05-01 does in writing.

## What you can do now

- Store each **fact once**, where it belongs, and **refer** to it from elsewhere; a fact copied into many rows will one day be changed in only some of them.
- **Entities** have **attributes**; **relationships** have a **cardinality**: one-to-many (stored on the many side), one-to-one, many-to-many (a table of pairs).
- A **primary key** identifies a row; a **foreign key** refers to one elsewhere. **Natural keys** are meaningful and can change; **surrogate keys** mean nothing and never need to. A key can have several fields.
- **NULL** can mean unknown, not applicable or empty; CSV can't tell them apart, so decide each field's meaning and write it down.
- **Constraints** (primary key, foreign key, NOT NULL) are rules the data must always keep. Files don't enforce them, so a check must, and it must be seen to fail.
- When the data changes shape, **find every reader first**, and check that the same questions give the same answers.

```predict
question: A shop's orders table has a column "customer_email", and customers sometimes change their email. What goes wrong, and what shape fixes it?
explain: The email is a natural key copied into every order. When a customer changes it, their old orders either keep the old email (and look like another customer's) or must all be rewritten. The fix is a customers table with a surrogate id and the email as an attribute, and orders holding customer_id, a foreign key. Changing an email then changes one row, and every order still points at the right customer.
```

**Next:** 02-02-03 is about the copies that remain. A balance can be stored or worked out from the transactions; two programs writing one CSV file at once lose a change; and Blockfall's high scores need a place to live. It covers normalization, the source of truth versus derived data, access patterns, data's lifecycle, and backups.
