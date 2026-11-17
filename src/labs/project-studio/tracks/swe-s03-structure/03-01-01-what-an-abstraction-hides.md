---
title: "What an Abstraction Hides: Ledger's Books"
track: 03 · Structure
runtime: python
---

Stage 2 ended with a sketch: Ledger's modules in layers, every dependency pointing at the domain, and `layers.py` to check it. The sketch says which module may *import* which. It says nothing about what each module *knows*, and that's where the next change hurts. Ledger will move from CSV files to a database, SQLite, later in the course. Today `reports.py` is handed a folder name. It gets each transaction back as a dictionary of strings, and turns the `"cents"` column into a number itself. So does `total.py`. So do the tests, which write CSV files into temporary folders sixty times over just to check that adding up works. Every one of them knows how the transactions are stored, so every one of them changes when the storage does. Stage 3 is about structure, and its first question is the central one: **what should this component know?** This lesson finds out what Ledger's reports know about storage, hides it behind an interface, and shows what that buys: tests with no files, and a storage change that touches one file.

**By the end you can:**

- Find out what a component knows about another, by changing one hidden decision and seeing what breaks (U).
- Say what an abstraction hides and what it exposes, and tell an interface from its implementations (R).
- Tell encapsulation (bundling data with the code that uses it, and keeping callers out) from information hiding (keeping a *decision* in one place) (R).
- Write an interface as a Python `Protocol`, with two implementations, and move callers onto it (A).
- Test that two implementations keep the same promise (A).

**You need:** 02-08-01 (`Money`), 02-09-01 (`MODULES.md` and `layers.py`), 02-05-01 (`SPEC.md`'s vocabulary and `vocab.py`), 01-09 (`pytest`). Commands run inside `ledger`.

## What the reports know

A component **knows** a fact about another when its code would break if that fact changed. That's a test you can run. Pick one decision that belongs to storage, the name of the `cents` column in `data/transactions.csv`, change it in a copy of Ledger, and see which programs break. Create `leak.py`:

```python file=ledger/leak.py
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

# What do Ledger's programs know about how transactions are stored? Change
# one storage decision, the name of the cents column, in a copy of Ledger,
# and see which programs break, and in which file each error is raised.
copy = pathlib.Path(tempfile.mkdtemp()) / "ledger"
shutil.copytree(".", copy, ignore=shutil.ignore_patterns(".venv", ".git", "__pycache__"))
table = copy / "data" / "transactions.csv"
table.write_bytes(table.read_bytes().replace(b",cents,", b",amount_cents,", 1))

for program in ["reports.py", "total.py"]:
    result = subprocess.run([sys.executable, program], cwd=copy, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"{program}: still works")
        continue
    file, line = re.findall(r'File "([^"]+)", line (\d+)', result.stderr)[-1]
    error = result.stderr.strip().splitlines()[-1]
    print(f"{program}: {error}, raised in {pathlib.Path(file).name} line {line}")
shutil.rmtree(copy.parent)
```

It copies Ledger to a temporary folder, without the virtual environment or Git's files, and renames the column in the copy's header line. It changes bytes, not text, so the file's line endings stay exactly as they were. Then it runs both programs in the copy. When one fails, `leak.py` reads Python's traceback. Its last `File "…", line N` is where the error was raised, and its last line is the error. Your real `data/` is never touched.

```predict
question: With the column renamed to amount_cents, reports.py fails. In which file will its error be raised?
choice: store.py, which reads the CSV files
choice: reports.py itself
choice: Neither: store.py passes the rows through, so nothing fails
answer: reports.py itself
explain: store.py reads each row into a dictionary and passes it on without looking at the cents. The first code that asks for row["cents"] is the report adding it up, so that's where the KeyError is raised. The column's name is a storage decision, but the code that depends on it is in the reports.
```

Add a row for it to `MODULES.md`'s Layers table, after `layers.py`'s row, or `layers.py` will report it as unplaced:

```
| leak.py | tool | Showing which programs know how transactions are stored |
```

Save both, and run it:

```
.venv/bin/python leak.py
```

(On Windows, `.venv/Scripts/python`.)

```
reports.py: KeyError: 'cents', raised in reports.py line 16
total.py: KeyError: 'cents', raised in total.py line 14
```

Each program fails inside its *own* code. `store.py` hands out rows exactly as the file holds them, so every caller learns the file's column names, and that the amounts are text. Then every caller writes its own `int(row["cents"])`. Rename the column, and you edit every module that reads an amount. Move to SQLite, whose rows come back differently, and you edit them all again. That's what a leaked decision costs: one decision, written into many places.

```check
run "cd ledger; .venv/Scripts/python leak.py" stdout="reports.py: KeyError: 'cents', raised in reports.py" -- reports.py should fail in its own code when the column is renamed.
run "cd ledger; .venv/Scripts/python leak.py" stdout="total.py: KeyError: 'cents', raised in total.py" -- total.py should fail in its own code too.
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 24 modules" -- leak.py should have its row in MODULES.md's Layers table.
```

## An interface: what may be asked

An **abstraction** is a promise in two parts. It says what you may ask, and it keeps everything else to itself. The part you may ask is the **interface**. The code that keeps the promise is an **implementation**, and one interface can have many. A report needs one thing from storage: the transactions, each with a date, a person, a category and an amount. It doesn't need the folder, the files, the ids, or the fact that amounts are written as text.

Write that down as code. Create `books.py`, in the domain:

```python file=ledger/books.py
import dataclasses
import datetime
from typing import Protocol

from money import Money


# One transaction as the rest of Ledger sees it: real types, not the text a
# file holds, and names rather than ids. Whoever keeps the transactions turns
# its own way of storing them into these.
@dataclasses.dataclass(frozen=True)
class Transaction:
    id: str
    date: datetime.date
    who: str
    category: str
    amount: Money
    note: str


# Ledger's books: everything the rest of Ledger may ask of wherever its
# transactions are kept. Where and how they're kept (a folder of CSV files
# today, a database later) is each implementation's own business.
class Books(Protocol):
    def transactions(self) -> list[Transaction]: ...


# Books kept in a list, with no files: for tests, and for any program that
# already has its transactions in hand.
class MemoryBooks:
    def __init__(self, transactions):
        self._transactions = list(transactions)

    def transactions(self):
        return list(self._transactions)
```

Three pieces:

- **`Transaction`** is what every reader gets: a frozen dataclass, like `Money` (02-08-01), with a real `datetime.date` and a real `Money`. It has `who` and `category` as names, not as ids to look up. It leaves out the transaction's status, and its account, because no reader needs them yet. Leaving them out is a decision too. A field added later costs one line. A field removed later breaks every caller that used it, so an interface starts small.
- **`Books`** is the interface. A `Protocol` (from `typing`) describes a *shape*: any object with a `transactions()` method that returns a list of `Transaction`s counts as `Books`. The `...` is Python's placeholder for "no body here". The protocol is never called. It's a description, which type checkers and readers use (a type checker arrives in 03-08-01).
- **`MemoryBooks`** is one implementation: the transactions, kept in a list. It returns a *copy* of its list, so a caller that adds to what it got can't change the books.

"Books" is a new word in Ledger's domain, and 02-05-01's rule is that a domain word gets a row in `SPEC.md`'s vocabulary. Add one after the `cents` row:

```
| books | All of Ledger's transactions, wherever they're kept | |
```

The third column, the words not to use, stays empty. Then add `books.py` to `MODULES.md`'s Layers table, after `recurring.py`'s row:

```
| books.py | domain | Transactions as Ledger sees them, and what may be asked of the books |
```

```predict
question: MemoryBooks never mentions Books: it doesn't inherit from it or name it. Will a report that expects Books accept a MemoryBooks?
choice: No: it has to subclass Books
choice: Yes: it has the right method, and that's all a Protocol asks
choice: Only after registering it with the Protocol
answer: Yes: it has the right method, and that's all a Protocol asks
explain: A Protocol is structural: an object fits it by having the right shape, not by declaring that it does. This is often called duck typing, and the Protocol writes the duck down. At run time Python doesn't check anything at all; the report just calls transactions(). An abstract base class (abc.ABC) is the nominal alternative: implementations must subclass it, and Python refuses to create one that misses a method.
```

Save the three files, then try the books in Python:

```
.venv/bin/python -c "import books, money, datetime; print(books.MemoryBooks([books.Transaction('1', datetime.date(2026, 11, 2), 'Sam', 'groceries', money.Money(2000), 'market')]).transactions())"
```

```
[Transaction(id='1', date=datetime.date(2026, 11, 2), who='Sam', category='groceries', amount=Money(cents=2000), note='market')]
```

Then run `layers.py` (`0 problems in 25 modules`) and `vocab.py` (`0 avoided words in 35 files`).

```check
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 25 modules" -- books.py should be placed in the domain, and import only the domain.
run "cd ledger; .venv/Scripts/python -c \"import books, dataclasses; print(dataclasses.is_dataclass(books.Transaction), books.Transaction.__dataclass_params__.frozen, [f.name for f in dataclasses.fields(books.Transaction)])\"" stdout="True True ['id', 'date', 'who', 'category', 'amount', 'note']" -- Transaction should be a frozen dataclass with these six fields.
run "cd ledger; .venv/Scripts/python -c \"import books; b = books.MemoryBooks([1, 2]); b.transactions().append(3); print(b.transactions())\"" stdout="[1, 2]" -- MemoryBooks should hand out a copy, so a caller can't change the books.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; print('| books |' in pathlib.Path('SPEC.md').read_text(encoding='utf-8'))\"" stdout="True" -- SPEC.md's vocabulary should have a row for books.
run "cd ledger; .venv/Scripts/python vocab.py" stdout="0 avoided words" -- The vocabulary should still be kept.
```

## The CSV implementation

Now the implementation that matters: books kept as CSV files. Replace `store.py` with this version. Its first half is unchanged; `CsvBooks` is new, with the imports it needs:

```python file=ledger/store.py
import csv
import datetime

from books import Transaction
from money import Money

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


# Ledger's books (books.Books) kept as CSV files in a folder. The folder, the
# files, their columns and the text in them stay in here: what comes out is
# Transactions, with dates as dates and amounts as Money.
class CsvBooks:
    def __init__(self, folder=FOLDER):
        self._folder = folder

    def transactions(self):
        return [
            Transaction(row["id"], datetime.date.fromisoformat(row["date"]), row["who"], row["category"],
                        Money(int(row["cents"])), row["note"])
            for row in transactions(self._folder)
        ]
```

All the storage facts now sit in one place: the folder, the file names, the id lookups, the column called `cents`, and the conversion from text. That one place is the information hiding. The decision "transactions are CSV files with these columns" lives in `CsvBooks` and nowhere else. A caller that asks for `transactions()` can't depend on the decision, because it never sees it.

Two words often get mixed up here:

- **Encapsulation** is the mechanism. Data and the code that works on it go in one unit (`CsvBooks` and its folder), and callers stay out of the inside. Python doesn't enforce staying out. The leading underscore in `self._folder` is a convention that means "not part of the interface: don't use this from outside". Languages like C# and Java enforce it with `private`, which Framework uses from 03-01-02.
- **Information hiding** is the design principle that tells you *what* to put inside: the decisions likely to change. David Parnas put it this way in 1972: give each module one decision to hide (03-13-01 comes back to his paper). You can encapsulate badly. A class can keep its fields private while its methods hand out rows of raw text, and then the decision has leaked anyway.

Save it, and ask the real books for their first transaction:

```
.venv/bin/python -c "import store; print(store.CsvBooks().transactions()[0])"
```

```
Transaction(id='1', date=datetime.date(2026, 11, 1), who='Sam', category='rent', amount=Money(cents=95000), note='November')
```

That's the same shape `MemoryBooks` gives. Two implementations, one interface.

```check
run "cd ledger; .venv/Scripts/python -c \"import store; print(store.CsvBooks().transactions()[0])\"" stdout="Transaction(id='1', date=datetime.date(2026, 11, 1), who='Sam', category='rent', amount=Money(cents=95000), note='November')" -- CsvBooks should turn the first row of data/ into a Transaction with a real date and Money.
run "cd ledger; .venv/Scripts/python -c \"import store; print(len(store.CsvBooks().transactions()), len(store.transactions()))\"" stdout="10 10" -- CsvBooks should give one Transaction for every row.
```

## Reports ask the books

Now move the reports onto the interface. Replace `reports.py`:

```python file=ledger/reports.py
import re


# Derived data: worked out from the transactions each time it's asked for,
# never stored, so it can never disagree with them. With a month, written
# YYYY-MM, only that month's transactions count. The books can be any books
# (books.Books): a report asks them for transactions, and never needs to
# know where they're kept.
def spent_by(field, books, month=None):
    if month is not None and not re.fullmatch(r"\d{4}-\d\d", month):
        raise ValueError(f"month {month!r} isn't written YYYY-MM")
    totals = {}
    for transaction in books.transactions():
        if month is None or transaction.date.strftime("%Y-%m") == month:
            key = getattr(transaction, field)
            totals[key] = totals.get(key, 0) + transaction.amount.cents
    return totals


if __name__ == "__main__":
    import store

    print(spent_by("who", store.CsvBooks()))
```

`spent_by` takes `books` where it took `folder`. It reads `transaction.date` and `transaction.amount`, not text. `getattr(transaction, field)` reads the field named by `field`, so `spent_by("who", …)` groups by `transaction.who`. The month test now compares dates written as `YYYY-MM`, not strings that happen to start the same way. The module doesn't import `store` at all. Only the lines that run the program do, under `__main__`, because that's the one place that has to choose *which* books. That place is where a program's parts get wired together (03-02-03 gives it a name and a pattern).

An interface change reaches every caller, and `spent_by` has three:

- In `tests/test_criteria.py`, add `import store` after `import reports`. Then change the last line of the `two_months` fixture from `return tmp_path` to `return store.CsvBooks(tmp_path)`. The F5 tests are acceptance tests, so they keep using the real CSV files.
- In `timing.py`, add `import store` after `import reports`, and change `reports.spent_by("who", folder)` to `reports.spent_by("who", store.CsvBooks(folder))`.
- `tests/test_invariants.py` is the third caller. The next step rewrites it, so leave it for now.

Save, and run the report, the timing and `leak.py`:

```
.venv/bin/python reports.py
.venv/bin/python timing.py
.venv/bin/python leak.py
```

```
{'Sam': 110339, 'Alex': 26350}
7200 rows: 22118600 cents, derived in 0.071 s
reports.py: KeyError: 'cents', raised in store.py line 38
total.py: KeyError: 'cents', raised in total.py line 14
```

The report prints the same totals as before (your timing will differ a little). `leak.py` now shows the change you made: renaming the column breaks `reports.py` *inside `store.py`*, so one line in one file would fix it. `total.py` still knows the column, because it still reads rows itself. That's your task at the end.

Run the tests, though, and the invariants fail. `pytest` reports 60 of them, all with the same line:

```
E       AttributeError: 'WindowsPath' object has no attribute 'transactions'
```

(`'PosixPath'` on macOS and Linux.) The tests still pass a folder, and a folder isn't books. That's expected until the next step.

```check
run "cd ledger; .venv/Scripts/python reports.py" stdout="{'Sam': 110339, 'Alex': 26350}" -- The report should print the same totals as before.
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_criteria.py" stdout="passed" without="failed" -- The acceptance tests should pass through CsvBooks.
run "cd ledger; .venv/Scripts/python timing.py" stdout="7200 rows: 22118600 cents" -- timing.py should derive the totals through CsvBooks.
run "cd ledger; .venv/Scripts/python leak.py" stdout="reports.py: KeyError: 'cents', raised in store.py" -- reports.py should no longer know the cents column: the error should come from store.py.
run "cd ledger; .venv/Scripts/python -c \"import inspect, reports; print(list(inspect.signature(reports.spent_by).parameters), 'import store' in inspect.getsource(reports).split('__main__')[0])\"" stdout="['field', 'books', 'month'] False" -- spent_by should take books, and reports.py should import store only where the program runs.
```

## Tests that need no files

The invariant tests check adding up. To make their data they wrote three CSV files into a temporary folder, sixty times, because the reports could only read files. With books they can hand the report a list. Replace `tests/test_invariants.py`:

```python file=ledger/tests/test_invariants.py
import datetime
import random

import pytest

import reports
from bank import BankRow
from books import MemoryBooks, Transaction
from money import Money

# Ledger's invariants (SPEC.md) as tests, each on many sets of made-up data:
# a seeded random.Random makes the same data every run, so a failure can be
# repeated (01-09-03). The data is kept in MemoryBooks: the invariants are
# about adding up, so these tests need no files.


def make_books(seed):
    rng = random.Random(seed)
    made = [
        Transaction(str(i), datetime.date(2026, rng.randint(10, 12), rng.randint(1, 28)),
                    rng.choice(["Sam", "Alex"]), rng.choice(["rent", "groceries", "bills"]),
                    Money(rng.randint(-5000, 100000)), "")
        for i in range(1, rng.randint(0, 60) + 1)
    ]
    return MemoryBooks(made), sum(transaction.amount.cents for transaction in made)


# I2: however the transactions are added up, the total is the same.
@pytest.mark.parametrize("seed", range(50))
def test_every_way_of_adding_up_gives_the_same_total(seed):
    books, total = make_books(seed)
    by_person = sum(reports.spent_by("who", books).values())
    by_category = sum(reports.spent_by("category", books).values())
    by_month = sum(sum(reports.spent_by("category", books, month=f"2026-{m}").values()) for m in ["10", "11", "12"])
    assert by_person == by_category == by_month == total


# I1, for totals: every total is an int of cents.
@pytest.mark.parametrize("seed", range(10))
def test_money_is_never_a_float(seed):
    books, _ = make_books(seed)
    for totals in [reports.spent_by("who", books), reports.spent_by("category", books)]:
        assert all(type(cents) is int for cents in totals.values())


# I1, for statements: a BankRow that breaks its types can't be made.
@pytest.mark.parametrize("bad", [{"cents": 4.5}, {"cents": True}, {"date": "2026-11-07"},
                                 {"date": datetime.datetime(2026, 11, 7, 9, 30)}, {"description": ""}])
def test_a_bank_row_that_breaks_its_types_cannot_be_made(bad):
    fields = {"date": datetime.date(2026, 11, 7), "description": "COFFEE CORNER", "cents": -450} | bad
    with pytest.raises(TypeError):
        BankRow(**fields)
```

`make_books` makes `Transaction`s directly: the same seeded randomness as before, now as dates, names and `Money`, with no accounts or category ids to keep consistent. The tests no longer use `tmp_path`, or `csv`, or `open`. Save it, and run all the tests:

```
.venv/bin/python -m pytest -q tests
```

All pass. Run just this file and compare its time with before. On the machine this lesson was written on, the 65 invariant tests took 1.80 s with files and 0.19 s without, ten times faster. The time matters less than what it shows: a test that needs files to check addition is testing two things at once.

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="passed" without="failed" -- Every test should pass.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('tests/test_invariants.py').read_text(encoding='utf-8'); print('MemoryBooks' in t, 'tmp_path' in t, 'open(' in t)\"" stdout="True False False" -- The invariant tests should use MemoryBooks, with no files.
```

**What else, and why not.** You could pass the report a list of transactions instead of books. That's simpler, and for a report that wants every transaction it's arguably enough. Books earns its place because storage will be asked more than one question: writing arrives with the window, and a database answers "this month's transactions" faster than a full scan. With a list, every new question goes back to every caller. You could put a `transactions_in(month)` method on `Books` now, so SQLite can use an index. 02-10-01 measured a full scan of ten years at well under a second, so that's a method every implementation must carry, for a speed nobody needs yet. Add it when a measurement asks for it. You could use an abstract base class (`abc.ABC` with `@abstractmethod`) instead of a `Protocol`. Then implementations must subclass it, and Python refuses to build one that's missing a method. That's a run-time guard that a `Protocol` doesn't give. The price is that every implementation must import the interface. You could also hide storage behind an ORM, a library that maps rows to objects. That brings a large dependency and its own leaks (03-01-02) for a twelve-row household.

## When an implementation breaks its promise

An interface is only as good as its implementations. Python doesn't check `Transaction`'s field types at run time, so an implementation can quietly hand out the wrong thing. Try it. In `store.py`, change `datetime.date.fromisoformat(row["date"])` to `row["date"]`, as someone might who thought "the date was a string before and everything worked". Run the tests:

```
.venv/bin/python -m pytest -q tests
```

```
FAILED tests/test_criteria.py::test_f5_1_a_months_report_has_only_that_month
FAILED tests/test_criteria.py::test_f5_2_a_month_with_no_transactions_reports_nothing
2 failed, 170 passed
```

Both failures end the same way:

```
reports.py:14: AttributeError
E           AttributeError: 'str' object has no attribute 'strftime'
```

Read the evidence. The error is raised in `reports.py`, line 14, the month comparison. But `reports.py` didn't change. It's correct for the interface, which promises a `datetime.date`. The cause is upstream, in the implementation that broke the promise. Notice also what *didn't* fail. `total.py` and `reports.py` still print the right totals, and the 65 invariant tests pass, because they use `MemoryBooks`, which keeps the promise. Only a month report shows the bug, far from where it was made.

A bug like that wants a test at its source: give both kinds of books the same transactions, and require the same `Transaction`s back, values and types. Create `tests/test_books.py`:

```python file=ledger/tests/test_books.py
import csv
import datetime

import store
from books import MemoryBooks, Transaction
from money import Money

# Both kinds of books must keep the same promise: given the same
# transactions, they give back the same Transactions, with the same values
# and the same types. Then a report tested on MemoryBooks can trust CsvBooks.
SAME = [
    Transaction("1", datetime.date(2026, 10, 30), "Sam", "groceries", Money(1000), ""),
    Transaction("2", datetime.date(2026, 11, 2), "Alex", "rent", Money(-450), "refund"),
]


def test_csv_books_give_what_memory_books_give(tmp_path):
    tables = {
        "accounts": [["id", "name", "holder"], ["1", "Sam's card", "Sam"], ["2", "Alex's card", "Alex"]],
        "categories": [["id", "name"], ["1", "groceries"], ["2", "rent"]],
        "transactions": [["id", "date", "account_id", "category_id", "cents", "note"],
                         ["1", "2026-10-30", "1", "1", "1000", ""], ["2", "2026-11-02", "2", "2", "-450", "refund"]],
    }
    for table, rows in tables.items():
        with open(tmp_path / f"{table}.csv", "w", newline="", encoding="utf-8") as file:
            csv.writer(file).writerows(rows)
    assert store.CsvBooks(tmp_path).transactions() == MemoryBooks(SAME).transactions()
```

Save it, and run it while `store.py` is still broken:

```
.venv/bin/python -m pytest -q tests/test_books.py
```

```
E         At index 0 diff: Transaction(id='1', date='2026-10-30', who='Sam', category='groceries', amount=Money(cents=1000), note='') != Transaction(id='1', date=datetime.date(2026, 10, 30), who='Sam', category='groceries', amount=Money(cents=1000), note='')
```

Now the failure names the broken field, `date='2026-10-30'`, in a test about storage. Put `datetime.date.fromisoformat(row["date"])` back in `store.py`, and run all the tests: every one passes. Then commit:

```
git add books.py store.py reports.py leak.py timing.py MODULES.md SPEC.md tests/test_books.py tests/test_invariants.py tests/test_criteria.py
git commit -m "Ask the books for transactions, not the folder"
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_books.py" stdout="1 passed" -- With the date converted again, the books test should pass.
run "cd ledger; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; d = pathlib.Path(tempfile.mkdtemp()) / 'l'; shutil.copytree('.', d, ignore=shutil.ignore_patterns('.venv', '.git')); p = d / 'store.py'; q = chr(34); p.write_text(p.read_text(encoding='utf-8').replace('datetime.date.fromisoformat(row[' + q + 'date' + q + '])', 'row[' + q + 'date' + q + ']'), encoding='utf-8'); r = subprocess.run([sys.executable, '-m', 'pytest', '-q', 'tests/test_books.py'], cwd=d, capture_output=True, text=True); print(r.returncode, 'fromisoformat' not in p.read_text(encoding='utf-8'))\"" stdout="1 True" -- The books test should fail when CsvBooks hands out dates as text.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:books.py').returncode == 0, git('cat-file', '-e', 'HEAD:tests/test_books.py').returncode == 0, 'fromisoformat' in git('show', 'HEAD:store.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True True" -- Commit the books, with store.py converting dates, and nothing left over.
```

```predict
question: Ledger moves to SQLite, and SqliteBooks is written. Which test tells you it gives reports what they need, before any report runs on it?
explain: The same comparison as test_books.py: give SqliteBooks the same transactions and require the same Transactions MemoryBooks gives. A test that every implementation of an interface must pass is a contract test, and it's what lets every other test use the fast implementation. 03-01-02 writes contracts at boundaries down properly.
```

## Your turn: total.py through the books

`leak.py` still says `total.py: KeyError: 'cents', raised in total.py`. `total.py` reads rows from `store.transactions()` and does its own `Money(int(row["cents"]))`. Move it onto the books:

- A function `lines(books, place=None)` in `total.py` returns the lines to print, as a list of strings: each category's total, largest first, then the `total` line, written plainly or, with `place`, the way that place writes amounts.
- Running `total.py`, with or without `--place de-DE`, prints exactly what it printed before. Importing `total` prints nothing.
- `tests/test_total.py` tests `lines` with `MemoryBooks`, with no files. Cover at least the order of categories, and books with no transactions at all.
- `leak.py` says both programs now fail in `store.py`. Every test passes. Commit.

Before you change anything, save what it prints today, so you can compare: `.venv/bin/python total.py > before.txt` (delete `before.txt` before you commit).

```hints
nudge: Which lines of total.py decide what to print, and which line decides where the transactions come from? Only the second kind should know about store.
concept: The same move as reports.py: the logic takes books and reads Transactions (transaction.category, transaction.amount, already Money); the choice of CsvBooks happens only in the __main__ block, which is also why importing total prints nothing. A test with MemoryBooks can then check the order and the total without data/.
shape: def lines(books, place=None): show = …; totals = {}; for transaction in books.transactions(): totals[transaction.category] = totals.get(transaction.category, Money(0)) + transaction.amount; sort largest first; return the category lines plus the total line. if __name__ == "__main__": import store; read --place; for line in lines(store.CsvBooks(), place): print(line). In the test, three transactions in two categories, and MemoryBooks([]) for the empty case.
answer: total.py:
~~~python
import sys

from money import Money


# A month's spending by category, largest first, then the total, as lines to
# print. Every amount is a Money from the moment it's read to the moment it's
# written: plainly, or as the place given writes it (de-DE). The books can be
# any books (books.Books).
def lines(books, place=None):
    show = (lambda amount: amount.format(place)) if place else str
    totals = {}
    for transaction in books.transactions():
        totals[transaction.category] = totals.get(transaction.category, Money(0)) + transaction.amount
    ordered = sorted(totals.items(), key=lambda item: item[1], reverse=True)
    return [f"{category:12} {show(amount):>9}" for category, amount in ordered] + [
        f"{'total':12} {show(Money.total(totals.values())):>9}"]


if __name__ == "__main__":
    import store

    place = sys.argv[sys.argv.index("--place") + 1] if "--place" in sys.argv[:-1] else None
    for line in lines(store.CsvBooks(), place):
        print(line)
~~~
tests/test_total.py:
~~~python
import datetime

import total
from books import MemoryBooks, Transaction
from money import Money


def made(category, cents):
    return Transaction("1", datetime.date(2026, 11, 1), "Sam", category, Money(cents), "")


def test_categories_come_largest_first_then_the_total():
    books = MemoryBooks([made("groceries", 2000), made("rent", 95000), made("groceries", 450)])
    assert total.lines(books) == ["rent            950.00", "groceries        24.50", "total           974.50"]


def test_no_transactions_is_a_total_of_nothing():
    assert total.lines(MemoryBooks([])) == ["total             0.00"]
~~~
Then git add total.py tests/test_total.py and git commit -m "Print totals from any books". The tempting slip is making lines read store.CsvBooks() itself, "since that's what total.py always uses": the program prints the same and leak.py is satisfied, but lines ignores the books it's given, so a test with MemoryBooks gets data/'s totals back, and the function can't be tested without files.
```

```check
run "cd ledger; .venv/Scripts/python total.py" stdout="rent            950.00" -- total.py should still print rent first.
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- total.py should still print the same total.
run "cd ledger; .venv/Scripts/python total.py --place de-DE" stdout="total         1.366,89" -- total.py --place de-DE should still write the total the German way.
run "cd ledger; .venv/Scripts/python -c \"import total; print('imported')\"" stdout="imported" without="rent" -- Importing total should print nothing.
run "cd ledger; .venv/Scripts/python -c \"import datetime, total; from books import MemoryBooks, Transaction; from money import Money; t = lambda c, n: Transaction('1', datetime.date(2026, 11, 1), 'Sam', c, Money(n), ''); print(total.lines(MemoryBooks([t('a', 100), t('b', 300), t('a', 50)]))); print(total.lines(MemoryBooks([])))\"" stdout="['b                 3.00', 'a                 1.50', 'total             4.50']" -- lines(books) should return the categories largest first, then the total.
run "cd ledger; .venv/Scripts/python leak.py" stdout="total.py: KeyError: 'cents', raised in store.py" -- total.py should no longer know the cents column.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('tests/test_total.py').read_text(encoding='utf-8'); print('MemoryBooks' in t, 'tmp_path' in t)\"" stdout="True False" -- tests/test_total.py should test lines with MemoryBooks, with no files.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="passed" without="failed" -- Every test should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:tests/test_total.py').returncode == 0, 'def lines' in git('show', 'HEAD:total.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit total.py and its test, with nothing left over (before.txt deleted).
```

**What these checks establish, and what they don't.** They check that `reports.py` and `total.py` no longer know how transactions are stored. The renamed column now breaks them inside `store.py`, the tests of adding up need no files, and the CSV books give the same `Transaction`s as the memory books, types included. They can't check that `Books` is the *right* interface. `history.py`, `importer.py` and `check_data.py` still read and write CSV rows directly. They're storage themselves, so knowing the columns is their job, but it means writing hasn't been hidden yet: moving to SQLite would still touch them. Nor can they check that `Transaction` holds what future readers will need. When the window wants a transaction's status, the interface grows, and every implementation and the contract test grow with it. Run `leak.py` again after any change to storage: it's a question you can keep asking.

## What you can do now

- A component **knows** a fact when its code breaks if the fact changes. Change one hidden decision in a copy and see what breaks (`leak.py`); where the error is raised tells you who knew.
- An **abstraction** is a promise: an **interface** says what may be asked, and **implementations** keep it, as many as you need (`CsvBooks`, `MemoryBooks`). Start the interface small. Adding to it is cheap, and removing from it breaks callers.
- **Encapsulation** is the mechanism: data and its code in one unit, callers kept out (`_folder` by convention in Python, `private` in C#). **Information hiding** is the principle that says what to keep inside: the decisions likely to change, one per module.
- A Python **`Protocol`** describes an interface by its shape. Anything with the right methods fits, and nothing is checked at run time. An abstract base class checks more and couples more.
- Choose the implementation in one place, where the program starts (`__main__`). Everything below that place takes the interface as an argument, and its tests pass the fast implementation.
- Python won't stop an implementation from breaking its promise. A test that every implementation must pass catches it at the source, not three modules away.

**Next:** 03-01-02 starts Framework, the course's C# web framework, from its interface: a request, a response and a handler, with no networking at all. You'll see contracts at module boundaries written down, why separating concerns starts there, and what happens when an abstraction leaks.
