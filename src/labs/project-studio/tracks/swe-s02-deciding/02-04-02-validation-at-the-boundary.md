---
title: "Validation at the Boundary: Parse, Don't Validate"
runtime: python
---

Somewhere in every program there's a line where data from outside comes in: a file someone downloaded, a form someone filled in, a message from another service. On one side of that line, anything can arrive: `-4,50` with a comma, a date written `07/11/2026`, an empty field, the 31st of November. On the other side, the program assumes things: that an amount is a number of cents, that a date is a date. The bugs live where those assumptions are checked partly, or in several places, or not at all, and the classic symptom is a crash, far from the import, in code that did nothing wrong, on the day a bank changes its export. This lesson builds the importer `IMPORT.md` promised for Ledger: it checks everything at the boundary, turns what it accepts into values that can't be wrong, rejects the rest with a reason for each row, and never counts a transaction twice.

**By the end you can:**

- Put validation at the boundary, and say why once, there, is better than everywhere.
- Explain "parse, don't validate", and write a parser that returns typed values or a reason.
- Describe what schema languages (JSON Schema, OpenAPI, Protocol Buffers) do, and what they don't.
- Decide what "missing" means for each field (nullability), when to use an enum instead of a string, how to carry units, and how to design identifiers.
- Import overlapping files without duplicates, and reject bad rows with reasons a person can act on.

**You need:** 02-03-01 (multisets), 02-02-03 (`DATA.md`'s lock), 02-04-01 (formats), 01-09 (pytest), 01-10-01 (errors that help). Commands run inside `ledger`.

## The boundary

Ledger's `IMPORT.md` set three requirements: the importer must reject bad rows and say why, importing the same month twice must not count it twice, and when the bank changes its format the importer must notice. Where should the checking happen?

```predict
question: Ledger will read bank statements in the importer, and use the amounts in reports, budgets and the desktop window. Where should it check that an amount is a valid number of cents?
choice: In every place that uses an amount
choice: Once, where the statement is read, turning it into cents there
choice: Nowhere: the bank's export is reliable
answer: Once, where the statement is read, turning it into cents there
explain: Checked at the boundary, once, the amount becomes an int number of cents, and everything past that point can rely on it. Checked everywhere, the checks drift apart (one place accepts "-4,50", another doesn't), and each new piece of code must remember to add its own. A bank export is outside data: it changes, it has mistakes, and someone may edit it by hand.
```

## Checked, then trusted

A common way to "check at the boundary" is to **validate**: run a test on the text, and if it passes, pass the text on. Here's the test many people would write for a date, a regular expression (01-06-03):

```
.venv/bin/python -c "import re; text = '2026-11-31'; print(bool(re.fullmatch(r'\d{4}-\d\d-\d\d', text)))"
```

(On Windows, `.venv/Scripts/python`.) It prints `True`: four digits, a dash, two, a dash, two. The text is passed on, as text, and some later piece of code, a report grouping by month, finally turns it into a date:

```
.venv/bin/python -c "import datetime; print(datetime.date.fromisoformat('2026-11-31'))"
```

```
ValueError: day 31 must be in range 1..30 for month 11 in year 2026
```

Read the evidence. The validator said yes, and it was wrong, because it checked the shape of the text, not its meaning. And the error came later, in the report, with no idea which file or line the date came from. The validated text is still just a string, so every later use has to parse it again, and any of them can fail.

The better habit has a name, from Alexis King's 2019 essay "Parse, don't validate": instead of checking text and keeping text, **parse** it, turning it into a value of a type that can only hold valid data, and fail right there if you can't. A `datetime.date` can't be the 31st of November. An `int` of cents can't be `-4,50`. Once the boundary has made those values, nothing past it needs to check again, or can be handed the unchecked text by mistake.

One more surprise from the same function: Python 3.11 made `fromisoformat` accept more of ISO 8601, so

```
.venv/bin/python -c "import datetime; print(datetime.date.fromisoformat('20261107'), datetime.date.fromisoformat('2026-W45-6'))"
```

prints `2026-11-07 2026-11-07`. If a bank's file said `20261107`, that's probably a format change you want to hear about, not accept quietly. So Ledger's parser checks the shape *and* parses: shape first, so only `YYYY-MM-DD` is accepted, then the parse, so only real dates are.

## A statement from the bank

Make two statements as a bank would export them, the second with five rows a person or a bank might really get wrong. Create `make_bank.py`:

```python file=ledger/make_bank.py
import csv
import os

# Two made-up statements as a bank exports them: dates, descriptions, and
# amounts in currency units, a minus for money going out. November's has
# five rows a person or a bank might really get wrong.
OCTOBER = [
    ("2026-10-16", "COFFEE CORNER", "-4.50"),
    ("2026-10-20", "CITY TRANSPORT", "-30.00"),
    ("2026-10-28", "MARKET", "-48.15"),
    ("2026-11-01", "RENT", "-950.00"),
    ("2026-11-02", "MARKET", "-64.20"),
    ("2026-11-07", "COFFEE CORNER", "-4.50"),
    ("2026-11-07", "COFFEE CORNER", "-4.50"),
    ("2026-11-12", "POWER CO", "-71.30"),
]
NOVEMBER = [
    ("2026-11-01", "RENT", "-950.00"),
    ("2026-11-02", "MARKET", "-64.20"),
    ("2026-11-03", "BAKERY", "-4,50"),
    ("2026-11-07", "COFFEE CORNER", "-4.50"),
    ("2026-11-07", "COFFEE CORNER", "-4.50"),
    ("07/11/2026", "CORNER SHOP", "-3.20"),
    ("2026-11-12", "POWER CO", "-71.30"),
    ("2026-11-15", "", "-9.99"),
    ("2026-11-20", "PIZZA PLACE", "-18.80"),
    ("2026-11-25", "PHONE CO", "-39.99"),
    ("2026-11-28", "MARKET", "-61.05"),
    ("2026-11-31", "MARKET", "-12.00"),
    ("2026-11-30", "REFUND SHOP", "18.8"),
]

os.makedirs("bank", exist_ok=True)
for name, rows in [("2026-10", OCTOBER), ("2026-11", NOVEMBER)]:
    with open(f"bank/{name}.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["date", "description", "amount"])
        writer.writerows(rows)
```

The five problems in November: a comma for the decimal point (`-4,50`, as many countries write it), a date in day/month/year order, an empty description, the 31st of November, and an amount with one decimal (`18.8`). Save it and run it:

```
.venv/bin/python make_bank.py
```

It writes `bank/2026-10.csv` and `bank/2026-11.csv`.

```check
run "cd ledger; .venv/Scripts/python -c \"import csv; print([len(list(csv.reader(open(f'bank/2026-{m}.csv', newline='', encoding='utf-8')))) - 1 for m in ['10', '11']])\"" stdout="[8, 13]" -- make_bank.py should write October's statement (8 rows) and November's (13 rows, five of them bad).
```

## Parse, don't validate

The boundary is one module, `bank.py`. It knows the bank's format, and nothing else in Ledger needs to. Create `bank.py`:

```python file=ledger/bank.py
import csv
import dataclasses
import datetime
import re

# What Ledger accepts from a bank statement. This module turns the bank's
# text into BankRow values, or says exactly why it can't; code past this
# boundary only ever sees BankRows, never the text.
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


class RowError(ValueError):
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
        for raw in reader:
            try:
                rows.append(parse_row(raw))
            except RowError as error:
                problems.append((reader.line_num, str(error)))
    return rows, problems
```

`BankRow` is the type the boundary produces: a `dataclass` (a class whose fields are declared, with `__init__` and `==` written for you), `frozen=True` so its fields can't be changed after it's made (01-04-04) and so it can be hashed, in a set or a `Counter`. Each `parse_` function takes text and returns a value, or raises `RowError` with a reason written for the person who'll fix the file. `parse_amount` makes cents from the digits with integer arithmetic, never through a float. `parse_row` first checks the row has exactly the fields it should, since `csv.DictReader` doesn't complain about a short or long row: it fills in `None`, or keeps the extras under the key `None`. `read_statement` collects every good row and every problem, with the line number `reader.line_num` reports, so one bad row doesn't hide the others. Save it, and parse November:

```
.venv/bin/python -c "import bank; rows, problems = bank.read_statement('bank/2026-11.csv'); print(len(rows), rows[0]); [print(p) for p in problems]"
```

```
8 BankRow(date=datetime.date(2026, 11, 1), description='RENT', cents=-95000)
(4, "amount '-4,50' isn't written like -12.34 (a minus for money out, two decimals)")
(7, "date '07/11/2026' isn't a real date written YYYY-MM-DD")
(9, 'description is empty')
(13, "date '2026-11-31' isn't a real date written YYYY-MM-DD")
(14, "amount '18.8' isn't written like -12.34 (a minus for money out, two decimals)")
```

Eight good rows, each a `BankRow` with a real `date` and an `int` of cents, and five problems, each with its line and its reason.

```check
run "cd ledger; .venv/Scripts/python -c \"import bank; rows, problems = bank.read_statement('bank/2026-11.csv'); print(len(rows), len(problems), rows[0].cents, [line for line, reason in problems])\"" stdout="8 5 -95000 [4, 7, 9, 13, 14]" -- bank.py should accept 8 rows (rent as -95000 cents) and reject lines 4, 7, 9, 13 and 14.
run "cd ledger; .venv/Scripts/python -c \"import bank; print(bank.parse_amount('-0.05'), type(bank.parse_date('2026-11-07')).__name__)\"" stdout="-5 date" -- Amounts should become whole cents and dates real dates.
```

## Into the inbox

The importer writes what `bank.py` accepts into `data/inbox.csv`: transactions in, not yet given an account and a category. It must keep `IMPORT.md`'s second promise, never counting a transaction twice, and `DATA.md`'s rule, holding `data/.lock` while it writes. Create `importer.py`:

```python file=ledger/importer.py
import collections
import csv
import datetime
import os
import sys

from bank import BankRow, read_statement

INBOX = "data/inbox.csv"
LOCK = "data/.lock"


# DATA.md: a program that writes Ledger's data holds data/.lock while it
# does. If the lock is there already, say so and stop, rather than wait
# forever for a program that may have crashed.
def take_lock():
    try:
        return os.open(LOCK, os.O_CREAT | os.O_EXCL)
    except FileExistsError:
        sys.exit(f"{LOCK} exists: another program is writing Ledger's data, or one stopped "
                 f"before finishing. If nothing else is running, delete {LOCK}.")


# The inbox: imported transactions not yet given an account and a category.
# Its cents are signed as the bank signs them, negative for money going out;
# Ledger's transactions record spending as positive cents, so moving a row
# from the inbox into the transactions must flip the sign.
def read_inbox():
    if not os.path.exists(INBOX):
        return []
    with open(INBOX, newline="", encoding="utf-8") as file:
        return [BankRow(datetime.date.fromisoformat(r["date"]), r["description"], int(r["cents"]))
                for r in csv.DictReader(file)]


# What the statement has more of than the inbox, in the statement's order.
# The inbox and the statement are multisets (02-03-01): importing the same
# month twice, or two months that overlap, adds each transaction once.
def new_rows(inbox, statement):
    extra = collections.Counter(statement) - collections.Counter(inbox)
    found = []
    for row in statement:
        if extra[row] > 0:
            extra[row] -= 1
            found.append(row)
    return found


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: importer.py BANK_FILE")
    source = sys.argv[1]
    rows, problems = read_statement(source)
    for line, reason in problems:
        print(f"{source} line {line}: {reason}")
    lock = take_lock()
    try:
        added = new_rows(read_inbox(), rows)
        is_new = not os.path.exists(INBOX)
        with open(INBOX, "a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            if is_new:
                writer.writerow(["date", "description", "cents"])
            writer.writerows((row.date.isoformat(), row.description, row.cents) for row in added)
    finally:
        os.close(lock)
        os.remove(LOCK)
    print(f"{len(added)} added to {INBOX}, {len(rows) - len(added)} already there, {len(problems)} rejected")
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

`new_rows` is 02-03-01's multiset idea: what the statement has more of than the inbox already holds. Importing the same file again adds nothing; importing two overlapping months adds the overlap once; and the two real coffees on the 7th stay two. `take_lock` uses the lock file from 02-02-03, and, as `DATA.md` promised, it doesn't wait if the lock is there: it says what's going on and what to do. The `try`/`finally` removes the lock even if writing fails. The good rows are imported even when some are rejected, and the exit status is 1 when anything was rejected, so a script running the importer can tell. Save it, and import October, then November, then November again:

```
.venv/bin/python importer.py bank/2026-10.csv
.venv/bin/python importer.py bank/2026-11.csv
.venv/bin/python importer.py bank/2026-11.csv
```

```predict
question: October's statement adds 8 transactions to the empty inbox. November's has 8 good rows, 5 of which overlap with October's. How many does the first import of November add?
answer: 3
explain: The 5 overlapping rows (rent, the market on the 2nd, both coffees on the 7th, the power bill) are already in the inbox, so only pizza, phone and the market on the 28th are new. The second import of November adds 0. The five bad rows are reported both times, and imported neither time.
```

```
8 added to data/inbox.csv, 0 already there, 0 rejected
bank/2026-11.csv line 4: amount '-4,50' isn't written like -12.34 (a minus for money out, two decimals)
bank/2026-11.csv line 7: date '07/11/2026' isn't a real date written YYYY-MM-DD
bank/2026-11.csv line 9: description is empty
bank/2026-11.csv line 13: date '2026-11-31' isn't a real date written YYYY-MM-DD
bank/2026-11.csv line 14: amount '18.8' isn't written like -12.34 (a minus for money out, two decimals)
3 added to data/inbox.csv, 5 already there, 5 rejected
bank/2026-11.csv line 4: amount '-4,50' isn't written like -12.34 (a minus for money out, two decimals)
bank/2026-11.csv line 7: date '07/11/2026' isn't a real date written YYYY-MM-DD
bank/2026-11.csv line 9: description is empty
bank/2026-11.csv line 13: date '2026-11-31' isn't a real date written YYYY-MM-DD
bank/2026-11.csv line 14: amount '18.8' isn't written like -12.34 (a minus for money out, two decimals)
0 added to data/inbox.csv, 8 already there, 5 rejected
```

Read the last lines: `3 added`, then `0 added … 8 already there`. Each rejected row has its line and its reason, written so someone can fix the file and import it again; when they do, only the corrected rows will be new. Notice the inbox's amounts are negative, as the bank signs them: the comment in `importer.py` records that Ledger's transactions count spending as positive, so moving rows across must flip the sign. A **sign convention** is part of a number's unit, and mixing two is as bad as mixing dollars and cents.

Try the lock, too. Make a `data/.lock` as a crashed program might leave it, and import:

```
.venv/bin/python -c "open('data/.lock', 'w').close()"
.venv/bin/python importer.py bank/2026-10.csv
```

```
data/.lock exists: another program is writing Ledger's data, or one stopped before finishing. If nothing else is running, delete data/.lock.
```

Then delete it (`rm data/.lock`).

```check
run "cd ledger; .venv/Scripts/python -c \"import csv; rows = list(csv.DictReader(open('data/inbox.csv', newline='', encoding='utf-8'))); print(len(rows), sum(int(r['cents']) for r in rows), sum(r['description'] == 'COFFEE CORNER' and r['date'] == '2026-11-07' for r in rows))\"" stdout="11 -129699 2" -- After both imports, the inbox should hold 11 transactions (-1296.99 in all), with both coffees of the 7th.
run "cd ledger; .venv/Scripts/python importer.py bank/2026-11.csv" exit=1 stdout="0 added to data/inbox.csv, 8 already there, 5 rejected" -- Importing November again should add nothing, and still report the five bad rows.
missing ledger/data/.lock -- Delete data/.lock after trying it.
```

## Tests for the boundary

The boundary's rules are exactly what tests should pin down. Ledger hasn't needed pytest until now; install the same version as Kit's (01-09-01), in Ledger's own environment:

```
.venv/bin/python -m pip install pytest==9.2.0
```

Then create `tests/test_bank.py`:

```python file=ledger/tests/test_bank.py
import datetime

import pytest

from bank import BankRow, RowError, parse_amount, parse_date, parse_row
from importer import new_rows

COFFEE = BankRow(datetime.date(2026, 11, 7), "COFFEE CORNER", -450)
RENT = BankRow(datetime.date(2026, 11, 1), "RENT", -95000)


@pytest.mark.parametrize(("text", "cents"), [("-4.50", -450), ("18.80", 1880), ("-0.05", -5), ("0.00", 0)])
def test_amounts_become_whole_cents(text, cents):
    assert parse_amount(text) == cents


@pytest.mark.parametrize("text", ["-4,50", "18.8", "-4.505", "4", "", "1e3", "- 4.50", "+4.50"])
def test_amounts_not_written_like_the_bank_are_refused(text):
    with pytest.raises(RowError):
        parse_amount(text)


@pytest.mark.parametrize("text", ["2026-11-31", "07/11/2026", "20261107", "2026-W45-6", "2026-1-7", ""])
def test_only_real_dates_written_yyyy_mm_dd_are_accepted(text):
    with pytest.raises(RowError):
        parse_date(text)


def test_a_good_row_becomes_a_bank_row():
    raw = {"date": "2026-11-07", "description": " COFFEE CORNER ", "amount": "-4.50"}
    assert parse_row(raw) == COFFEE


@pytest.mark.parametrize("raw", [
    {"date": "2026-11-07", "description": "", "amount": "-4.50"},
    {"date": "2026-11-07", "description": "COFFEE CORNER", "amount": None},
    {"date": "2026-11-07", "description": "COFFEE CORNER", "amount": "-4.50", None: ["extra"]},
])
def test_rows_with_a_missing_or_extra_field_are_refused(raw):
    with pytest.raises(RowError):
        parse_row(raw)


def test_importing_the_same_rows_again_adds_nothing():
    assert new_rows([COFFEE, COFFEE, RENT], [RENT, COFFEE, COFFEE]) == []


def test_only_what_the_statement_has_more_of_is_new():
    assert new_rows([COFFEE], [COFFEE, COFFEE, RENT]) == [COFFEE, RENT]
```

Most of these tests are lists of inputs, through `pytest.mark.parametrize` (01-09-01): amounts that must become cents, amounts that must be refused (each a real way of writing money: a comma, one decimal, three, no decimals, scientific notation, a space, a plus), dates that must be refused (including the two 3.11 forms), rows with a missing or an extra field. The last two tests pin down the importer's promise about duplicates. Run them, from inside `ledger`:

```
.venv/bin/python -m pytest -q tests
```

`24 passed`. Commit the importer, the statements, the inbox and the tests:

```
git add make_bank.py bank bank.py importer.py data/inbox.csv tests/test_bank.py
git commit -m "Import bank statements at a checked boundary, without duplicates"
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="24 passed" -- Ledger's 24 boundary tests should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(all(git('cat-file', '-e', 'HEAD:' + n).returncode == 0 for n in ['bank.py', 'importer.py', 'data/inbox.csv', 'bank/2026-11.csv', 'tests/test_bank.py']), git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit the importer, the statements, the inbox and the tests.
```

## Schemas, nothing, names and units

`bank.py` is a hand-written **schema**: a description of what valid data looks like, applied in code. Schema languages write the same description as data, so many programs, in many languages, can apply one definition:

- **JSON Schema** describes JSON: types, required fields, patterns, ranges. A bank row might be:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "date": {"type": "string", "format": "date"},
    "description": {"type": "string", "minLength": 1},
    "amount": {"type": "string", "pattern": "^-?[0-9]+\\.[0-9]{2}$"}
  },
  "required": ["date", "description", "amount"],
  "additionalProperties": false
}
```

  It's a validator, not a parser: the result is still JSON with a string in it. And in the 2020-12 version, `"format": "date"` is only an annotation unless the validator is told to enforce it, which is the regex trap again, in a standard.
- **OpenAPI** describes an HTTP API: its paths, and JSON Schemas for each request and response. One file is the contract that client code, servers and documentation can all be generated from (stage 7).
- **Protocol Buffers** (02-04-01) describe messages in `.proto` files, with a type for every field; the generated code parses bytes into typed objects. That's "parse, don't validate" built into the format.

The rest of the boundary's decisions are about meaning:

- **Nullability.** For each field, can it be missing, and what would missing mean (02-02-02)? Ledger's bank rows: no field may be missing; an empty description is an error, not "unknown". Decide it, write it in the parser, and test it, because "the field was empty" will happen.
- **Enums versus strings.** When a field has a fixed set of values (a direction `in`/`out`, a status), represent it as an **enum** (`enum.Enum` in Python), not as free text, so a typo like `grocery` (02-02-01) can't be stored at all. Parse the text into the enum at the boundary.
- **Units.** A number without a unit is half a fact. `cents` is in the name of every Ledger amount, and the sign convention is in a comment. In 1999 NASA lost the Mars Climate Orbiter because one team's software produced thrust impulse in pound-force seconds and another's expected newton-seconds: both numbers were valid; the unit wasn't carried. Convert to one unit at the boundary, and name it.
- **Identifiers.** Bank rows have none, so the importer can only compare whole rows. Good ids are stable (never change, 02-02-02), unique, never reused for something else, and meaningless; ids that leave your system (in a URL, on an invoice) shouldn't be guessable in sequence, and shouldn't be the database's internal number, so it can change without breaking anyone's link.

```predict
question: A web form sends "quantity": "3" as a string, and the shop's code does price * quantity in many places. What goes wrong, and where's the fix?
explain: In Python, a price times the string "3" is a TypeError, raised wherever the multiplication happens to be; in JavaScript, "3" * 2 is 6 but "3" + 2 is "32", so some places compute wrongly instead of failing. The fix is one parse at the boundary, where the request is read: turn quantity into a positive integer or reject the request with a reason, so every later line receives an int and can't be handed the string.
```

## Your turn: when the bank changes its format

`IMPORT.md`'s third promise: when the bank changes its export, the importer must notice. Try it now: write a statement with the columns `Date,Description,Amount,Balance` (capital letters, and an extra column, as banks really do change them) and import it. You'll get a traceback ending `KeyError: 'description'`, from deep inside `parse_row`: true, and no help to anyone.

Make `bank.py` check the header before reading any row: if the columns aren't exactly `date`, `description`, `amount`, raise a `StatementError` (a new exception class) whose message names the file, the expected columns and the columns found, and asks whether the bank has changed its format. Make `importer.py` catch it and stop with that message and status 1, **before** taking the lock or writing anything. Add a test for it to `tests/test_bank.py` (pytest's `tmp_path` fixture, 01-09-03, gives a folder to write the statement in). Commit your changes.

```hints
nudge: The header is known before the first row is read: csv.DictReader has a fieldnames attribute. What should the importer do if the file can't be read at all, rather than row by row?
concept: A changed header isn't one bad row; it's a different format, so the whole file is refused, with one clear message, and nothing is imported. A separate exception class keeps that case apart from RowError, so the importer can stop for it and carry on for bad rows. Checking fieldnames == COLUMNS catches renamed, missing, extra and reordered columns at once.
shape: In bank.py: COLUMNS = ["date", "description", "amount"], class StatementError(ValueError), and in read_statement, after making the reader: if reader.fieldnames != COLUMNS: raise StatementError(f"{path}: expected the columns ..., but found .... Has the bank changed its format?"). In importer.py: try: rows, problems = read_statement(source) except StatementError as error: sys.exit(str(error)).
answer: In bank.py, add COLUMNS = ["date", "description", "amount"] with the other constants, and after RowError:
~~~python
# The whole file can't be read: its columns aren't the ones Ledger expects.
class StatementError(ValueError):
    pass
~~~
In read_statement, right after reader = csv.DictReader(file):
~~~python
        if reader.fieldnames != COLUMNS:
            found = ", ".join(reader.fieldnames or []) or "nothing"
            raise StatementError(f"{path}: expected the columns {', '.join(COLUMNS)}, but found {found}. "
                                 "Has the bank changed its format?")
~~~
In importer.py, import StatementError, and in main:
~~~python
    try:
        rows, problems = read_statement(source)
    except StatementError as error:
        sys.exit(str(error))
~~~
In tests/test_bank.py, import StatementError and read_statement, and add:
~~~python
def test_a_statement_with_other_columns_is_refused_whole(tmp_path):
    path = tmp_path / "changed.csv"
    path.write_text("Date,Description,Amount,Balance\n2026-11-07,COFFEE CORNER,-4.50,100.00\n", encoding="utf-8")
    with pytest.raises(StatementError):
        read_statement(path)
~~~
Then git add bank.py importer.py tests/test_bank.py and git commit -m "Refuse a statement whose columns have changed". The tempting slips: lower-casing the header to make it match (Date and date are a change worth hearing about), and checking only that the three names are present (an added Balance column, or a reordered one, may mean the meaning changed too).
```

```check
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess, sys, tempfile; p = os.path.join(tempfile.mkdtemp(), 'changed.csv'); open(p, 'w', newline='').write('Date,Description,Amount,Balance' + chr(13) + chr(10) + '2026-11-07,COFFEE CORNER,-4.50,100.00' + chr(13) + chr(10)); before = open('data/inbox.csv', 'rb').read(); r = subprocess.run([sys.executable, 'importer.py', p], capture_output=True, text=True); print(r.returncode, 'Traceback' in r.stderr, 'date, description, amount' in r.stderr, 'Date, Description, Amount, Balance' in r.stderr, open('data/inbox.csv', 'rb').read() == before, os.path.exists('data/.lock'))\"" stdout="1 False True True True False" -- A statement with other columns should stop the importer with status 1 and a message naming the expected and found columns, no traceback, nothing written and no lock left.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess, sys, tempfile; p = os.path.join(tempfile.mkdtemp(), 'reordered.csv'); open(p, 'w', newline='').write('description,date,amount' + chr(13) + chr(10) + 'RENT,2026-11-01,-950.00' + chr(13) + chr(10)); r = subprocess.run([sys.executable, 'importer.py', p], capture_output=True, text=True); print(r.returncode, 'found description, date, amount' in r.stderr)\"" stdout="1 True" -- Reordered columns are a change too.
run "cd ledger; .venv/Scripts/python importer.py bank/2026-11.csv" exit=1 stdout="0 added to data/inbox.csv, 8 already there, 5 rejected" -- Statements in the expected format should import as before.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="25 passed" -- With your new test, 25 tests should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('StatementError' in git('show', 'HEAD:bank.py').stdout, 'StatementError' in git('show', 'HEAD:importer.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit bank.py, importer.py and the test.
```

**What these checks establish, and what they don't.** They check that the statements are made as described, that `bank.py` accepts exactly the good rows and rejects the bad ones with their lines, that amounts become cents and dates dates, that the inbox gets each transaction once however often a month is imported, that the lock is honoured, that the boundary's tests pass, and that a changed format is refused whole, with a message and no damage. They can't check that the rules are the bank's real rules: whether it ever writes `+4.50` for a refund, or splits a payment over two lines. The parser is a statement of what Ledger believes the format to be; the first real statement that breaks it is information, and the right response is to update the parser and its tests, not to loosen them until everything passes.

## What you can do now

- Check outside data **once, at the boundary**, and nowhere else.
- **Parse, don't validate**: turn text into values of types that can't be wrong (`date`, `int` cents, a frozen dataclass), or fail there with a reason. Validated text is still text.
- Strict parsing checks **shape and meaning**: `YYYY-MM-DD` *and* a real date.
- Report **every** bad row with its **line** and a **reason** someone can act on; refuse a changed **format** whole.
- **Schema languages** (JSON Schema, OpenAPI, Protocol Buffers) share one definition across programs; most validate rather than parse.
- Decide **nullability** per field, prefer **enums** for fixed sets, carry **units** and sign conventions in names, and make **identifiers** stable, unique, meaningless and never reused.
- Import idempotently: as **multisets**, importing again adds nothing.

```predict
question: An API accepts {"start": "2026-11-07", "nights": "3"} for a hotel booking. List the checks its boundary should make before anything else runs.
explain: Parse start into a real date (and decide: in which time zone, and may it be in the past? 02-11-02); parse nights into an integer, at least 1 and below some maximum; reject fields that aren't expected (a misspelled "night" shouldn't be silently ignored); and say, for each failure, which field and why, in the response. After the boundary, the code works with a date and an int, and never sees the strings.
```

**Next:** 02-04-03 asks what happens when a format must change. Blockfall's saved best score from 02-02-03 gets a version number, and a newer Blockfall must read what an older one saved: forward and backward compatibility, and data contracts.
