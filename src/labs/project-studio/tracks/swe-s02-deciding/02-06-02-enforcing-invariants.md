---
title: "Enforcing Invariants: Types, Constraints, Tests and Checks"
runtime: python
---

"Money is never a float" is easy to say and hard to keep. It has to hold in the bank's statement once parsed, in every row Ledger stores, in every total it reports, in code written next year by someone who never read this sentence, and in code an agent writes in a minute. Saying it once in a document doesn't make it true anywhere. Each invariant has to be **enforced** somewhere: built into a type so a wrong value can't be made, written into a database so a wrong row can't be stored, turned into a test so a wrong total fails the build, or checked while the program runs. Those places differ in how early they catch a mistake, what they cost, and how much they can be trusted. This lesson takes Ledger's two central invariants, "money is never a float" and "a total is the sum of its transactions", and puts each where it's strongest. Then it writes them into the spec, where whoever builds next will find them.

**By the end you can:**

- Compare the places an invariant can be enforced: by construction, by a type, by a database constraint, by a test, by a runtime check.
- Find a domain's invariants by asking what must never be true.
- Make a wrong value impossible to construct, and know when Python's type hints do and don't help.
- Turn invariants into tests that try many cases, and state invariants so a builder can't miss them.

**You need:** 02-06-01 (invariants and contracts), 02-04-02 (`BankRow`), 02-02-03 (derived totals), 02-05-02 (the spec's criteria). Commands run inside `ledger`.

## Where a rule can live

Five places, from the strongest to the weakest:

| Where | How it enforces | Catches a mistake | Ledger example |
|---|---|---|---|
| **By construction** | The design makes breaking it impossible | Never needs to: it can't happen | Totals are derived, so they can't disagree with the transactions |
| **A type** | A value that breaks it can't be created | When the bad value is made | A `BankRow` whose `cents` isn't an int |
| **A database constraint** | A row that breaks it can't be stored | When it's written, from any program | `CHECK (typeof(cents) = 'integer')` |
| **A test** | The build fails if code breaks it | Before the code is committed | Every total is an int, on 60 sets of data |
| **A runtime check** | A program looks, and reports | When someone runs the check | `check_data.py` |

The higher, the earlier and the more certain; the lower, the more it relies on someone running it. Most invariants end up enforced in two places: the strongest one available, and a test that proves it works.

To **find** a domain's invariants, ask of each thing in the vocabulary: what must never be true of it? A transaction must never have no account. An amount must never be fractional cents. Two imports must never count one transaction twice. The answers are the invariants, and most of them are already half-written somewhere, as a comment, a check, or a bug report.

```predict
question: Which place enforces "a total equals the sum of its transactions" most strongly in Ledger?
choice: A test that adds them up
choice: check_data.py
choice: By construction: totals are never stored, only derived
answer: By construction: totals are never stored, only derived
explain: 02-02-03 decided that totals are worked out from the transactions every time. There's no stored total that could drift, so the invariant can't break while that design holds. A test is still worth having, because it would catch someone later adding a cache, or a bug in how the adding is done; but the design is what makes it true.
```

## A type that doesn't check

`BankRow` (02-04-02) declares its types: `date: datetime.date`, `cents: int`. Do they enforce anything?

```
.venv/bin/python -c "import bank; print(bank.BankRow(date='soon', description='', cents=4.5))"
```

(On Windows, `.venv/Scripts/python`.)

```
BankRow(date='soon', description='', cents=4.5)
```

Read the evidence: a "date" that's the word `soon`, an empty description, and a float of cents, all accepted. Python's **type hints** are notes for people and for tools such as type checkers (mypy, pyright) and editors; the language itself never looks at them when the program runs. `bank.py`'s parser never builds a bad `BankRow`, but nothing stops other code from doing it: a test, a new importer, an agent's quick fix. The type *says* "money is an int" and enforces nothing.

## Making the wrong value impossible

Give `BankRow` checks of its own, so that a wrong one can't exist. Replace `bank.py` with:

```python file=ledger/bank.py
import csv
import dataclasses
import datetime
import re

# What Ledger accepts from a bank statement. This module turns the bank's
# text into BankRow values, or says exactly why it can't; code past this
# boundary only ever sees BankRows, never the text.
COLUMNS = ["date", "description", "amount"]
DATE = re.compile(r"\d{4}-\d\d-\d\d")
AMOUNT = re.compile(r"(-?)(\d+)\.(\d\d)")


# One transaction from a statement: a real date, a description that isn't
# empty, and the amount in whole cents (the unit is in the name), signed as
# the bank signs it: negative for money going out.
@dataclasses.dataclass(frozen=True)
class BankRow:
    date: datetime.date
    description: str
    cents: int

    # The types above are notes: Python doesn't check them. These checks make
    # a BankRow that breaks them impossible to create. type(...) is, not
    # isinstance: True is an int to isinstance, and a datetime is a date.
    def __post_init__(self):
        if type(self.date) is not datetime.date:
            raise TypeError(f"date must be a datetime.date, not {self.date!r}")
        if type(self.description) is not str or not self.description:
            raise TypeError(f"description must be text that isn't empty, not {self.description!r}")
        if type(self.cents) is not int:
            raise TypeError(f"cents must be an int, not {self.cents!r}")


class RowError(ValueError):
    pass


# The whole file can't be read: its columns aren't the ones Ledger expects.
class StatementError(ValueError):
    pass


# Only YYYY-MM-DD, and only a date that exists. date.fromisoformat alone
# would also take 20261107 and 2026-W45-6 (Python 3.11 and later).
def parse_date(text):
    if DATE.fullmatch(text):
        try:
            return datetime.date.fromisoformat(text)
        except ValueError:
            pass
    raise RowError(f"date {text!r} isn't a real date written YYYY-MM-DD")


# "-4.50" is -450 cents: digits, a point, exactly two digits, and a minus
# for money going out. Never through a float (01-07-03, 02-04-01).
def parse_amount(text):
    match = AMOUNT.fullmatch(text)
    if match is None:
        raise RowError(f"amount {text!r} isn't written like -12.34 (a minus for money out, two decimals)")
    sign, whole, part = match.groups()
    cents = int(whole) * 100 + int(part)
    return -cents if sign else cents


# A row as csv.DictReader gives it. A row with too few fields has None for
# the missing ones; one with too many has the extras under the key None.
def parse_row(raw):
    if None in raw or None in raw.values():
        raise RowError("has the wrong number of fields")
    description = raw["description"].strip()
    if not description:
        raise RowError("description is empty")
    return BankRow(parse_date(raw["date"]), description, parse_amount(raw["amount"]))


# The statement's good rows as BankRows, and (line, reason) for each bad one.
def read_statement(path):
    rows, problems = [], []
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != COLUMNS:
            found = ", ".join(reader.fieldnames or []) or "nothing"
            raise StatementError(f"{path}: expected the columns {', '.join(COLUMNS)}, but found {found}. "
                                 "Has the bank changed its format?")
        for raw in reader:
            try:
                rows.append(parse_row(raw))
            except RowError as error:
                problems.append((reader.line_num, str(error)))
    return rows, problems
```

A dataclass calls `__post_init__` right after setting its fields, so this is where a value can refuse to exist. Each check uses `type(…) is`, not `isinstance`, on purpose: `isinstance(True, int)` is true, since `bool` is a kind of `int` in Python, and `isinstance(a_datetime, datetime.date)` is true as well, since a `datetime` is a kind of `date`; neither is what a `BankRow` should hold (02-11-02 explains why a date and a time are different things). It raises `TypeError`, not `RowError`: a bad `BankRow` can only come from Ledger's own code, since outside data goes through the parser first, so it's an assertion (02-06-01). Save it and try again:

```
.venv/bin/python -c "import bank; print(bank.BankRow(date='soon', description='', cents=4.5))"
```

```
TypeError: date must be a datetime.date, not 'soon'
```

Now "a `BankRow`'s cents is an int" isn't a hope; it's a property of every `BankRow` there is. Every test still passes, because `bank.py`'s parser only ever built good ones.

```check
run "cd ledger; .venv/Scripts/python -c \"import bank, datetime; print(bank.BankRow(datetime.date(2026, 11, 7), 'COFFEE CORNER', -450).cents)\"" stdout="-450" -- A good BankRow should still be made.
run "cd ledger; .venv/Scripts/python -c \"import bank; print(bank.BankRow(date='soon', description='', cents=4.5))\"" exit=1 stderr="TypeError: date must be a datetime.date, not 'soon'" -- A BankRow whose date is text should be refused with a TypeError.
run "cd ledger; .venv/Scripts/python -c \"import bank, datetime; print(bank.BankRow(datetime.date(2026, 11, 7), 'COFFEE CORNER', 4.5))\"" exit=1 stderr="cents must be an int, not 4.5" -- A BankRow with a float of cents should be refused.
run "cd ledger; .venv/Scripts/python -c \"import bank, datetime; print(bank.BankRow(datetime.date(2026, 11, 7), 'COFFEE CORNER', True))\"" exit=1 stderr="cents must be an int, not True" -- True is an int to isinstance, so it needs type(...) is int to be refused.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="31 passed" -- Every test should still pass.
```

## A rule in the database

When Ledger moves to SQLite (7.7), the database itself can hold rules: no program can store a row that breaks them, not Ledger, not a script, not a person at the SQLite prompt. Python includes SQLite. See it refuse a float, and see what happens without the rule. Create `constraint.py`:

```python file=ledger/constraint.py
import sqlite3

# The same rule, "an amount is a whole number of cents", as a database
# constraint. SQLite comes with Python; ":memory:" is a database that lives
# only while this program runs.
db = sqlite3.connect(":memory:")

# A column declared INTEGER, and nothing else: SQLite stores what it's given.
db.execute("CREATE TABLE loose (cents INTEGER)")
db.execute("INSERT INTO loose VALUES (4.5)")
print("loose:", db.execute("SELECT cents, typeof(cents) FROM loose").fetchall())

# The same column with a CHECK constraint: the database refuses the float.
db.execute("CREATE TABLE amounts (cents INTEGER NOT NULL CHECK (typeof(cents) = 'integer'))")
db.execute("INSERT INTO amounts VALUES (450)")
try:
    db.execute("INSERT INTO amounts VALUES (4.5)")
except sqlite3.IntegrityError as error:
    print("refused:", error)
print("amounts:", db.execute("SELECT cents FROM amounts").fetchall())
```

`sqlite3.connect(":memory:")` makes a database that exists only while the program runs. The first table declares `cents INTEGER` and nothing more; the second adds `NOT NULL` and a `CHECK` constraint, a condition every row must meet. Save it and run it:

```
.venv/bin/python constraint.py
```

```predict
question: The table "loose" declares cents as INTEGER, and the program inserts 4.5. What happens?
choice: SQLite refuses it
choice: SQLite rounds it to 4
choice: SQLite stores 4.5
answer: SQLite stores 4.5
explain: In SQLite a column's declared type is only a preference ("type affinity"): a value that can't be stored as an integer without losing information is stored as what it is, here a real number. Only the CHECK constraint, or a STRICT table, makes the type a rule. Many databases are stricter than this, but it's a good reminder that a declared type and an enforced rule can be different things.
```

```
loose: [(4.5, 'real')]
refused: CHECK constraint failed: typeof(cents) = 'integer'
amounts: [(450,)]
```

Read the two halves. `loose` stored `4.5` as `real` without a word, the same lesson as `BankRow`'s hints, one layer down. `amounts` refused it: `CHECK constraint failed`. A constraint in the database is the strongest runtime enforcement there is, because it covers every program that will ever write to it, including ones not yet written.

```check
run "cd ledger; .venv/Scripts/python constraint.py" stdout="refused: CHECK constraint failed: typeof(cents) = 'integer'" -- The CHECK constraint should refuse 4.5.
run "cd ledger; .venv/Scripts/python constraint.py" stdout="loose: [(4.5, 'real')]" -- Without it, the INTEGER column should store 4.5 as real.
```

## Rules as tests

A test of an invariant shouldn't check one example; it should check the rule on as many cases as it can, because the rule is meant to hold for all of them. Create `tests/test_invariants.py`:

```python file=ledger/tests/test_invariants.py
import csv
import datetime
import random

import pytest

import reports
from bank import BankRow

# Ledger's invariants (SPEC.md) as tests, each on many sets of made-up data:
# a seeded random.Random makes the same data every run, so a failure can be
# repeated (01-09-03).


def make_data(folder, seed):
    rng = random.Random(seed)
    tables = {
        "accounts": [["id", "name", "holder"], ["1", "Sam's card", "Sam"], ["2", "Alex's card", "Alex"]],
        "categories": [["id", "name"], ["1", "rent"], ["2", "groceries"], ["3", "bills"]],
        "transactions": [["id", "date", "account_id", "category_id", "cents", "note"]],
    }
    for i in range(1, rng.randint(0, 60) + 1):
        date = f"2026-{rng.randint(10, 12)}-{rng.randint(1, 28):02d}"
        tables["transactions"].append([str(i), date, str(rng.randint(1, 2)), str(rng.randint(1, 3)), str(rng.randint(-5000, 100000)), ""])
    for table, rows in tables.items():
        with open(folder / f"{table}.csv", "w", newline="", encoding="utf-8") as file:
            csv.writer(file).writerows(rows)
    return sum(int(row[4]) for row in tables["transactions"][1:])


# I2: however the transactions are added up, the total is the same.
@pytest.mark.parametrize("seed", range(50))
def test_every_way_of_adding_up_gives_the_same_total(tmp_path, seed):
    total = make_data(tmp_path, seed)
    by_person = sum(reports.spent_by("who", tmp_path).values())
    by_category = sum(reports.spent_by("category", tmp_path).values())
    by_month = sum(sum(reports.spent_by("category", tmp_path, month=f"2026-{m}").values()) for m in ["10", "11", "12"])
    assert by_person == by_category == by_month == total


# I1, for totals: every total is an int of cents.
@pytest.mark.parametrize("seed", range(10))
def test_money_is_never_a_float(tmp_path, seed):
    make_data(tmp_path, seed)
    for totals in [reports.spent_by("who", tmp_path), reports.spent_by("category", tmp_path)]:
        assert all(type(cents) is int for cents in totals.values())


# I1, for statements: a BankRow that breaks its types can't be made.
@pytest.mark.parametrize("bad", [{"cents": 4.5}, {"cents": True}, {"date": "2026-11-07"},
                                 {"date": datetime.datetime(2026, 11, 7, 9, 30)}, {"description": ""}])
def test_a_bank_row_that_breaks_its_types_cannot_be_made(bad):
    fields = {"date": datetime.date(2026, 11, 7), "description": "COFFEE CORNER", "cents": -450} | bad
    with pytest.raises(TypeError):
        BankRow(**fields)
```

`make_data` writes a made-up Ledger, up to 60 transactions across three months, two accounts and three categories, from a **seed**: `random.Random(seed)` gives the same "random" numbers every time for the same seed, so a failure on seed 17 fails on seed 17 again tomorrow (01-09-03's determinism). `parametrize` over `range(50)` runs the first test on fifty different Ledgers. It checks **I2**, the sum rule, three ways at once: by person, by category, by month, and against the total worked out independently while making the data. The second test checks **I1** for every total: `type(cents) is int`. The third checks that `BankRow` refuses each kind of bad value, `datetime` included. Save it and run every test:

```
.venv/bin/python -m pytest -q tests
```

`96 passed`. Now break the invariant in the place it would really break. In `reports.py`, change `int(row["cents"])` to `float(row["cents"])`, the kind of change that looks harmless ("in case there are cents in it"), and run the tests again:

```
.venv/bin/python -m pytest -q tests
```

```predict
question: With spent_by adding floats, which invariant tests fail: the sum rule (I2), the money rule (I1), or both?
choice: Only I2
choice: Only I1
choice: Both
answer: Only I1
explain: Whole numbers of cents as floats add up exactly until about 2^53, so every total still agrees with every other: the sum rule passes. But every total is now a float, so all ten money tests fail. An invariant has to be tested for itself; the other tests passing says nothing about it.
```

```
FAILED tests/test_invariants.py::test_money_is_never_a_float[0] - assert False
FAILED tests/test_invariants.py::test_money_is_never_a_float[1] - assert False
…
FAILED tests/test_invariants.py::test_money_is_never_a_float[9] - assert False
10 failed, 86 passed in 2.54s
```

Read it: the ten money tests fail (`assert False`, from the line `assert all(type(cents) is int …)`), and all fifty sum tests pass, because whole floats add exactly. Then the day someone's statement has 0.1 and 0.2 in it (02-04-01), they won't. Put `reports.py` back:

```
git restore reports.py
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="96 passed" -- With reports.py restored (git restore reports.py), all 96 tests should pass.
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_invariants.py -k money" stdout="10 passed" -- The ten money tests should pass on the restored reports.py.
```

## Saying it to a builder

The invariants now hold, and are tested, but someone extending Ledger has to know they exist, or a cache of totals or a float "for convenience" will arrive with the next feature. Write them into the spec, each with where it's enforced. Replace `SPEC.md` with:

```markdown file=ledger/SPEC.md
# Ledger: specification

### Purpose

Ledger keeps a household's record of money spent, so that the people in it can see where their money goes each month, for years. DECISION.md records why it's a desktop app.

### Vocabulary

| Term | Meaning | Not |
|---|---|---|
| transaction | One amount of money spent or received, on one date, from one account | expense, payment, entry, purchase |
| account | Where money is spent from, such as a card or a bank account, held by one person | wallet, fund |
| category | What a transaction was for, chosen from Ledger's list: rent, groceries | label, bucket |
| statement | A bank's file of the transactions on one account over a period | bank file, download |
| inbox | Imported transactions not yet given an account and a category | staging |
| cents | Amounts, always as whole numbers of cents | pennies |

### Functional requirements

- F1. Record a transaction: its date, account, category, amount in cents, and an optional note.
- F2. Import a statement into the inbox, rejecting each row that can't be read, with its line and the reason.
- F3. Importing a statement twice, or two statements that overlap, adds each transaction once.
- F4. Move a transaction from the inbox into Ledger's transactions by giving it an account and a category.
- F5. Show a month's spending by category, largest first, and the month's total.
- F6. Correct a transaction, keeping the value it had before.
- F7. Back up the data, and prove each backup by restoring it.

### Non-functional requirements

- N1. Performance: a month's report appears within 1 second with ten years of transactions (7,200; timing.py measures about 0.05 s).
- N2. Reliability: stopping the program in the middle of a change leaves the data as it was before the change or after it, never half done. Not yet met: importer.py appends in place.
- N3. Privacy: the data never leaves the computer, except in backups the people make themselves. Ledger uses no network.
- N4. Usability: someone who has never used Ledger can record a transaction in under a minute, without help. Measured by asking someone to try.
- N5. Maintainability: every rule in this spec has a test, and every test passes before each commit.
- N6. Cost: nothing to pay for: no services, no subscriptions.

### Constraints

- C1. Technical: Python 3.11 or later, its standard library only (pytest for the tests), and tkinter for windows.
- C2. Runs without a network, on Windows, macOS and Linux.
- C3. Time: built in small steps by people learning, each step small enough for one evening.
- C4. Skills: looked after by people who know Python, not web development.
- C5. Legacy: the data Ledger already holds (data/*.csv) and the statement format bank.py reads keep working.

### Assumptions

- A1. One person uses Ledger at a time, on one computer.
- A2. One currency.
- A3. Statements arrive as CSV files with the columns date, description and amount (bank.py).
- A4. Fewer than 100 transactions a month.
- A5. Every amount is a whole number of cents.

### Non-goals

- Ledger does not connect to banks.
- Ledger has no user names or passwords.
- Ledger does not run on phones or in a browser.
- Ledger does no taxes, investments or forecasts.
- Ledger does not convert between currencies.

### Invariants

What is true of Ledger's data at every moment, and where each rule is enforced. The strongest place is the one that makes breaking the rule impossible; the weakest is a check someone has to remember to run.

- I1. Money is never a float: every amount is an int of cents. Enforced by bank.py's parsing and BankRow's own checks, so a float can't get in from a statement, and tested for every total in tests/test_invariants.py.
- I2. A total is the sum of its transactions, however it's added up: by person, by category or by month. Enforced by construction, because totals are derived and never stored (DATA.md); tested on made-up data in tests/test_invariants.py.
- I3. Every transaction's account and category exist. Checked by check_data.py; a database's foreign keys will enforce it (7.7).
- I4. No two transactions share an id. Checked by check_data.py.
- I5. Only one program writes the data at a time. Enforced by data/.lock (importer.py).

### Acceptance criteria

Each criterion is an example: given a situation, when something happens, then the result. Each is a test in tests/test_criteria.py, named after it.

- F2.1. Given November's statement, whose line 4 has a comma for the decimal point, when it is imported, then line 4 is rejected with its reason, and the 8 good transactions are added to the inbox.
- F3.1. Given an inbox holding October's statement, when November's is imported, then 3 transactions are added and 5 are already there.
- F3.2. Given an inbox holding November's statement, when November's is imported again, then nothing is added.
- F5.1. Given 10.00 of groceries in October and 20.00 in November, when November's spending is reported, then groceries are 20.00.
- F5.2. Given transactions in October and November only, when December's spending is reported, then the report is empty.

### Edge cases

- A month written 2026-1 is refused: it must not match November, 2026-11.
- A statement with no transactions adds nothing and rejects nothing.
- Two transactions alike in every field are both kept (02-03-01's coffees).
- A refund is a positive amount, and lowers that category's spending.

### Done means

A change is done when: its acceptance criteria pass as tests; every test passes; vocab.py and check_data.py find nothing; backup.py restores identical; SPEC.md says what changed; and it is committed.

### Pre-mortem

Imagine it's a year from now and Ledger has failed. The likeliest reasons, and what's being done about each:

- The data was lost: backups were never run, or never copied off the computer. backup.py proves each backup; copying it off is a monthly habit (DATA.md).
- Importing stopped working when the bank changed its export, and nobody noticed for months. The importer refuses a changed format with a message (bank.py), and rejected rows make it exit 1.
- Totals were quietly wrong: a transaction counted twice, or in the wrong month. F3 and F5's criteria are tests.
- It became too much work to keep up. Each change stays small (C3), and DECISION.md says when to stop and use a spreadsheet.

### For whoever builds from this

This spec is for people and for AI agents. Where it doesn't say, ask; don't assume. A change that would cross a non-goal, a constraint or an assumption needs a new decision record first. Use the vocabulary's words in code, tests and messages; vocab.py finds the others.
```

Each invariant gets a number (I1–I5), a statement anyone can check, and where it's enforced, so a builder can see which rules a type guarantees, which only a check looks at, and which the next database move must keep. For an agent this section is worth more than any example: "money is never a float; enforced by BankRow and tests/test_invariants.py" is a rule it can follow and a test it can run, where "be careful with money" is neither. Save it, and commit:

```
git add bank.py constraint.py tests/test_invariants.py SPEC.md
git commit -m "Enforce Ledger's invariants: types, tests, and the spec says where"
```

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib, re; t = pathlib.Path('SPEC.md').read_text(encoding='utf-8'); s = t.split('### Invariants')[1].split('###')[0]; print(len(re.findall(r'^- I[0-9]+[.]', s, re.M)), 'Enforced' in s)\"" stdout="5 True" -- SPEC.md should list five numbered invariants, each with where it's enforced.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('__post_init__' in git('show', 'HEAD:bank.py').stdout, git('cat-file', '-e', 'HEAD:tests/test_invariants.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit bank.py, constraint.py, the invariant tests and SPEC.md.
```

**What else, and why not.** You could rely on a static type checker (mypy, pyright) to enforce the hints: it would catch `BankRow(cents=4.5)` written in code, before it runs, which is better; but it can't see values that arrive at run time, so the parser and `__post_init__` would still be needed. You could make money a class of its own that refuses floats in every operation: that's a **value object**, and it's 02-08-01's subject. You could check every invariant at runtime on every change, as Blockfall's contracts do: for Ledger's data, a check on the whole data set takes longer as it grows, which is why I3 and I4 are a separate check, and why 7.7 hands them to the database.

## Your turn: the stored data's invariants

`check_data.py` checks I3 and I4, but not I1: a `cents` of `48.15`, typed into `data/transactions.csv` by hand, passes it, and only fails later, wherever `int()` meets it. Two changes:

- In `check_data.py`, a check that every `cents` in `transactions.csv` is a whole number written in digits (an optional minus, then digits), reporting the line and the value, as the other checks do.
- `tests/test_data.py`, with two tests: Ledger's own data has no problems at all, so every test run checks the stored data's invariants; and a copy of the data with transaction 4's `4815` changed to `48.15` is reported, naming `'48.15'`.

Run every test, and commit both files.

```hints
nudge: check_data.py's rules are dictionaries at the top (KEYS, REFERS, REQUIRED). A rule about a field's form fits the same pattern. And a test can import check_data and call problems(folder) directly.
concept: A whole number of cents written in digits matches the regular expression -?[0-9]+ in full (re.fullmatch), which refuses 48.15, 1e3, 12,00 and an empty string. Turning check_data.py into a test makes a runtime check, one someone has to remember, into one every test run performs; the broken copy in tmp_path proves the check can fail (01-09-01).
shape: In check_data.py: import re; CENTS = {"transactions": ["cents"]}; in the loop over rows, for field in CENTS.get(table, []): if row[field] and not re.fullmatch(r"-?[0-9]+", row[field]): found.append(...). tests/test_data.py: LEDGER = Path(__file__).resolve().parent.parent; one test asserting problems(LEDGER / "data") == []; one copying data to tmp_path, replacing ",4815," with ",48.15,", and asserting a problem mentions '48.15'.
answer: In check_data.py, import re, add after REFERS:
~~~python
# Fields that must hold a whole number of cents, written in digits (SPEC.md's I1).
CENTS = {"transactions": ["cents"]}
~~~
and, in problems, after the REQUIRED check inside the loop over rows:
~~~python
            for field in CENTS.get(table, []):
                if row[field] and not re.fullmatch(r"-?[0-9]+", row[field]):
                    found.append(f"{table}.csv line {line}: {field} {row[field]!r} isn't a whole number of cents")
~~~
tests/test_data.py:
~~~python
import shutil
from pathlib import Path

import check_data

LEDGER = Path(__file__).resolve().parent.parent


# SPEC.md's I1, I3 and I4, checked on Ledger's own data, as a test, so every
# test run checks them and nobody has to remember to run check_data.py.
def test_ledgers_own_data_keeps_its_invariants():
    assert check_data.problems(LEDGER / "data") == []


def test_cents_that_arent_a_whole_number_are_found(tmp_path):
    shutil.copytree(LEDGER / "data", tmp_path, dirs_exist_ok=True)
    path = tmp_path / "transactions.csv"
    path.write_text(path.read_text(encoding="utf-8").replace(",4815,", ",48.15,"), encoding="utf-8")
    assert any("'48.15'" in problem and "whole number" in problem for problem in check_data.problems(tmp_path))
~~~
Then git add check_data.py tests/test_data.py and git commit -m "Check that stored amounts are whole cents, in every test run". The tempting slip is int(row["cents"]) inside a try: it accepts " 4815" and "+4815", which a hand-typed file shouldn't contain, and it would refuse 48.15 only by accident of how int parses.
```

```check
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); shutil.copytree('data', d, dirs_exist_ok=True); p = os.path.join(d, 'transactions.csv'); t = open(p, encoding='utf-8', newline='').read().replace(',4815,', ',48.15,'); open(p, 'w', encoding='utf-8', newline='').write(t); r = subprocess.run([sys.executable, 'check_data.py', d], capture_output=True, text=True); print(r.returncode, '48.15' in r.stdout, 'line 5' in r.stdout)\"" stdout="1 True True" -- check_data.py should report a cents of 48.15, with its line (line 5), and exit 1.
run "cd ledger; .venv/Scripts/python check_data.py" stdout="0 problems" -- Ledger's own data should still have no problems.
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_data.py" stdout="2 passed" -- The two data tests should pass.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="98 passed" -- Every test, 98 in all, should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('CENTS' in git('show', 'HEAD:check_data.py').stdout, git('cat-file', '-e', 'HEAD:tests/test_data.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit check_data.py and tests/test_data.py.
```

**What these checks establish, and what they don't.** They check that `BankRow` refuses each kind of bad value and still accepts good ones, that SQLite stores a float in a plain `INTEGER` column and refuses it with a `CHECK`, that the sum rule and the money rule hold on fifty and ten made-up Ledgers and that the money tests catch a float, that the spec lists the invariants with where each is enforced, and that `check_data.py` now finds bad cents, in every test run. They can't check that you've found all the invariants, or put each in the strongest place it could go. The way to find the missing ones is the question from the start of the lesson, asked of every word in the vocabulary: what must never be true of this?

## What you can do now

- Enforce each invariant in the **strongest place available**: **by construction** (it can't break), a **type** (a wrong value can't exist), a **database constraint** (a wrong row can't be stored), a **test** (wrong code can't be committed), a **runtime check** (someone looks). Usually two of them.
- **Find** invariants by asking, for each thing in the domain, what must never be true of it.
- Python's **type hints enforce nothing** at run time; `__post_init__` can. `type(x) is int` refuses `True`; a `datetime` isn't a `date`.
- A database's declared type may be only a preference (SQLite's affinity); a **CHECK constraint** is a rule.
- Test invariants on **many generated cases**, seeded so failures repeat, and test each invariant **for itself**.
- **State** invariants in the spec, numbered, with where each is enforced: the most useful thing to give a builder.

**Next:** 02-07-01 models what a program *does* over time: state machines. Blockfall's game gets states (a menu, playing, paused, clearing rows, game over), with the moves between them written as a transition table, and guards that say when a move is allowed.
