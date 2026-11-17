---
title: "Time, History and Rules: What Changed, and When"
runtime: python
---

Sam corrects a transaction: the coffee was 19.80, not 18.80. A month later the bank's statement says 18.80 after all, and nobody can remember what the transaction said before, or who changed it, or why. Most programs simply overwrite: the old value is gone, and with it the ability to answer "what did we think on the 20th?", "who changed this?", or "how did the total for October change after we'd already reported it?". SPEC.md's F6 has asked for better since 02-05-01: "correct a transaction, keeping the value it had before". This lesson meets it with an **audit history**, a log of changes that's only ever added to, and a way to see a transaction as it was on any day. Along the way it looks at the other ways time and rules enter a domain model: dates that aren't moments, history that has two kinds of time, rules that belong in data rather than code, and, in the task, a recurring transaction that has to decide what "the 31st" means in April.

**By the end you can:**

- Choose between dates and instants for a domain's facts, and say what each claims.
- Keep an audit history: append-only, recorded before the change, with what, when, old, new and why.
- Reconstruct what was recorded at a past moment, and tell recorded time from effective time.
- Decide which rules belong in code and which in data, by separating what's universal from what varies.
- Draw a domain as an entity-relationship diagram.

**You need:** 02-07-02 (`lifecycle.py`, statuses in the data), 02-08-01 (entities and values), 02-02-03 (the lock), 02-05-01 (SPEC.md's F6). Commands run inside `ledger`.

## A date is not a moment

Ledger stores `2026-11-07` for the coffees: a **date**, a day on the calendar. It doesn't store `2026-11-07T09:30:00`, an **instant** (a moment on the world's clock), and that's deliberate. The bank's statement gives a day; the household thinks in days; "spending in November" is a question about days. A time would claim a precision nobody has, and an instant drags in a time zone: 23:30 on the 30th of November in one place is already the 1st of December in another, and the transaction would change months depending on where the computer was (02-11-02). `BankRow` refuses a `datetime` for exactly this reason (02-06-02).

```predict
question: Ledger records a correction made late in the evening of the 21st. Should the audit history store the day it was made, or the instant?
choice: The day: it's like a transaction's date
choice: The instant: when something was recorded is a moment, not a calendar day
choice: It doesn't matter
answer: The instant: when something was recorded is a moment, not a calendar day
explain: Two corrections on the same day need an order, and "what was recorded at 3 pm" is a fair question; that needs the moment, with its time zone. A transaction's date is a fact about the household's calendar; a change's time is a fact about the system's clock. This lesson stores the day, for simplicity and to keep the examples readable, and says so: it's a decision with a known cost (two same-day corrections are ordered only by their place in the log).
```

## Remembering what it was

Create `history.py`:

```python file=ledger/history.py
import csv
import datetime
import os
import re

import store
from lifecycle import Status, next_status

# Every correction to a transaction, in data/changes.csv: appended, never
# rewritten, so what a transaction used to say is never lost (SPEC.md's F6).
CHANGE_FIELDS = ["changed_on", "transaction_id", "field", "old", "new", "reason"]
EDITABLE = {"date", "account_id", "category_id", "cents", "note"}


# The lock DATA.md asks every writer to hold (as importer.py does), here for
# any data folder.
def take_lock(folder):
    try:
        return os.open(f"{folder}/.lock", os.O_CREAT | os.O_EXCL)
    except FileExistsError:
        raise RuntimeError(f"{folder}/.lock exists: another program is writing Ledger's data") from None


def release_lock(folder, lock):
    os.close(lock)
    os.remove(f"{folder}/.lock")


# A new value is checked like any outside data before anything is written.
def check_value(field, value, folder):
    if field not in EDITABLE:
        raise ValueError(f"{field} can't be corrected; only {', '.join(sorted(EDITABLE))}")
    if field == "cents" and not re.fullmatch(r"-?[0-9]+", value):
        raise ValueError(f"cents {value!r} isn't a whole number of cents")
    if field == "date":
        datetime.date.fromisoformat(value)
    if field in ("account_id", "category_id"):
        table = "accounts" if field == "account_id" else "categories"
        if value not in {row["id"] for row in store.read(table, folder)}:
            raise ValueError(f"{field} {value} is not an id in {table}.csv")


# Correct one field of a transaction, with a reason, on a day. The lifecycle
# decides whether it may be edited at all (a reconciled one may not); the
# change is recorded first, and only then is the transaction changed.
def edit(transaction_id, field, value, reason, changed_on, folder=store.FOLDER):
    if not reason.strip():
        raise ValueError("a correction needs a reason")
    check_value(field, value, folder)
    rows = store.read("transactions", folder)
    found = [row for row in rows if row["id"] == transaction_id]
    if not found:
        raise ValueError(f"there's no transaction {transaction_id}")
    row = found[0]
    next_status(Status(row["status"]), "edit")
    lock = take_lock(folder)
    try:
        log = f"{folder}/changes.csv"
        is_new = not os.path.exists(log)
        with open(log, "a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            if is_new:
                writer.writerow(CHANGE_FIELDS)
            writer.writerow([changed_on.isoformat(), transaction_id, field, row[field], value, reason])
        row[field] = value
        with open(f"{folder}/transactions.csv", "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    finally:
        release_lock(folder, lock)


# A transaction as Ledger recorded it at the end of a day: its values now,
# with every later change undone, newest first.
def as_of(transaction_id, day, folder=store.FOLDER):
    row = next(row for row in store.read("transactions", folder) if row["id"] == transaction_id)
    log = f"{folder}/changes.csv"
    changes = store.read("changes", folder) if os.path.exists(log) else []
    for change in reversed(changes):
        if change["transaction_id"] == transaction_id and change["changed_on"] > day.isoformat():
            row[change["field"]] = change["old"]
    return row
```

Read `edit` in order, because the order is the design. It refuses an empty reason (a correction without a why is the commonest gap in real audit logs). It checks the new value as outside data (02-04-02): whole cents, a real date, an id that exists. It asks the lifecycle (02-07-02) whether the transaction may be edited at all, so a reconciled transaction refuses. It takes the lock `DATA.md` requires. Then it **appends** the change, with the old value, to `data/changes.csv`, and only after that rewrites the transaction: if the program stopped between the two, the log would say a change was made that the data doesn't show yet, which can be detected and finished; the other order could lose the old value for good. `as_of` reads history backwards: the values now, with every later change undone, newest first.

Try it on Ledger's own data, with a correction that doesn't change any total: transaction 8, a meal out, gets a note.

```
.venv/bin/python -c "import datetime, history; history.edit('8', 'note', 'with a friend', 'remembered who it was with', datetime.date(2026, 11, 21)); print(history.as_of('8', datetime.date(2026, 11, 20))['note'] == '', history.as_of('8', datetime.date(2026, 11, 21))['note'])"
```

(On Windows, `.venv/Scripts/python`.) It prints `True with a friend`: on the 20th the note was empty; from the 21st it says *with a friend*. `data/changes.csv` now holds:

```
changed_on,transaction_id,field,old,new,reason
2026-11-21,8,note,,with a friend,remembered who it was with
```

Now try a reconciled transaction:

```
.venv/bin/python -c "import datetime, history; history.edit('4', 'cents', '4900', 'typo', datetime.date(2026, 11, 21))"
```

It ends `lifecycle.Refused: a reconciled transaction can't edit`, and nothing is written.

```check
run "cd ledger; .venv/Scripts/python -c \"import store; print(store.read('changes'))\"" stdout="'old': '', 'new': 'with a friend', 'reason': 'remembered who it was with'" -- data/changes.csv should record the correction to transaction 8's note, with the old value and the reason.
run "cd ledger; .venv/Scripts/python -c \"import datetime, history; print(repr(history.as_of('8', datetime.date(2026, 11, 20))['note']), history.as_of('8', datetime.date(2026, 11, 21))['note'])\"" stdout="'' with a friend" -- as_of should show the note as it was recorded on the 20th and on the 21st.
run "cd ledger; .venv/Scripts/python -c \"import datetime, history; history.edit('4', 'cents', '4900', 'typo', datetime.date(2026, 11, 21))\"" exit=1 stderr="a reconciled transaction can't edit" -- A reconciled transaction should refuse to be corrected.
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- A note's correction shouldn't change any total.
```

## Tests for the history

Create `tests/test_history.py`:

```python file=ledger/tests/test_history.py
import datetime
import shutil
from pathlib import Path

import pytest

import history
import store
from lifecycle import Refused

LEDGER = Path(__file__).resolve().parent.parent
DAY = datetime.date(2026, 11, 21)


# A copy of Ledger's data to correct: transactions 1 to 6 are reconciled,
# 7 to 10 cleared.
@pytest.fixture
def data(tmp_path):
    shutil.copytree(LEDGER / "data", tmp_path, dirs_exist_ok=True)
    (tmp_path / "changes.csv").unlink(missing_ok=True)
    return tmp_path


def transaction(folder, transaction_id):
    return next(row for row in store.read("transactions", folder) if row["id"] == transaction_id)


def test_a_correction_changes_the_transaction_and_keeps_what_it_was(data):
    history.edit("8", "cents", "1980", "the receipt says 19.80", DAY, data)
    assert transaction(data, "8")["cents"] == "1980"
    assert store.read("changes", data) == [{"changed_on": "2026-11-21", "transaction_id": "8", "field": "cents",
                                            "old": "1880", "new": "1980", "reason": "the receipt says 19.80"}]


def test_as_of_shows_what_was_recorded_on_a_day(data):
    history.edit("8", "cents", "1980", "the receipt says 19.80", DAY, data)
    history.edit("8", "cents", "1990", "no, 19.90", DAY + datetime.timedelta(days=2), data)
    assert [history.as_of("8", DAY - datetime.timedelta(days=1), data)["cents"],
            history.as_of("8", DAY, data)["cents"],
            history.as_of("8", DAY + datetime.timedelta(days=2), data)["cents"]] == ["1880", "1980", "1990"]


def test_a_reconciled_transaction_cant_be_corrected(data):
    with pytest.raises(Refused):
        history.edit("4", "cents", "4900", "typo", DAY, data)
    assert not (data / "changes.csv").exists()


@pytest.mark.parametrize(("field", "value", "reason"), [("cents", "19.80", "typo"), ("category_id", "99", "typo"),
                                                        ("date", "2026-11-31", "typo"), ("status", "void", "typo"),
                                                        ("cents", "1980", " ")])
def test_a_bad_correction_is_refused_before_anything_is_written(data, field, value, reason):
    before = (data / "transactions.csv").read_bytes()
    with pytest.raises(ValueError):
        history.edit("8", field, value, reason, DAY, data)
    assert (data / "transactions.csv").read_bytes() == before
    assert not (data / "changes.csv").exists()
```

Each test works on a copy of the data in `tmp_path` (01-09-03), so the real data is never touched. The first checks both halves of a correction: the new value, and the log row with the old one. The second makes two corrections on two days and asks `as_of` about three. The third checks that a reconciled transaction refuses *and* that nothing was logged. The last is five bad corrections at once (fractional cents, an unknown category, a date that doesn't exist, a field that can't be corrected, a blank reason), each refused with the files unchanged, byte for byte: a refusal that leaves a half-written change behind is barely better than none. Save it and run every test:

```
.venv/bin/python -m pytest -q tests
```

`152 passed`. Commit the history, its tests, and the first real correction:

```
git add history.py tests/test_history.py data/transactions.csv data/changes.csv
git commit -m "Keep a history of corrections, and meet SPEC.md's F6"
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_history.py" stdout="8 passed" -- The eight history tests should pass.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="152 passed" -- Every test, 152 in all, should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:history.py').returncode == 0, 'with a friend' in git('show', 'HEAD:data/changes.csv').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit history.py, its tests and the data, with the correction.
```

## Two kinds of time

`as_of` answers "what did Ledger *record*, as of a day?". That's one kind of time, often called **recorded time** (or transaction time): when the system learned something. There's another, **effective time** (or valid time): when the thing was true in the world. If Sam discovers on the 21st that a price changed on the 1st, the change is recorded on the 21st and effective from the 1st. A system that keeps both is **bitemporal**, and can answer "what did we think on the 15th that October's spending was?" as well as "what was October's spending really?". Rent rising from next month is effective dating; a correction of last month's typo is recorded time. Ledger keeps recorded time only, which is enough for an audit history; a salary, a price list or an insurance policy usually needs both. The decision is worth stating, because "as of" is ambiguous until it is.

## Rules as data, and what varies

Every domain mixes what's **universal**, the same for every household, with what **varies**. Money is always whole cents; a lifecycle is the same for every transaction; a date is a date. But which categories exist, which description belongs to which category (Kit's `categories.csv`, 02-03-02), which costs recur, and the bank's format vary from household to household, and over time. A good model keeps the universal in code, where it's typed and tested, and the varying in **data**, where it can change without a programmer: Ledger's categories are a table, not a Python list; a rule that sends `MARKET` to groceries belongs in a file the household edits. The test is who changes it and how often. A rule that changes when the domain changes (the lifecycle, the money rules) is code; a rule that changes when one household's habits change is data.

A picture of the model helps decide such things. An **entity-relationship diagram** shows entities, and the relationships between them with their cardinality (02-02-02). Ledger's, in text:

```
account 1 ──< transaction >── 1 category
                  │
                  1
                  │
                  ^
           transaction_tag >── 1 tag
                  
transaction 1 ──< change
```

Read `1 ──<` as "one, to many": an account has many transactions, each transaction one account; a transaction has many tag links and many changes. A **class diagram** shows the same for the code's types (`Money`, `Status`, `BankRow`) with their fields and methods. Either is worth sketching before code, because a missing line is far easier to see in a drawing than in twenty files, which is exactly what 02-09-01 does.

```predict
question: Ledger needs to know that council tax is 120.00 on the 1st of every month. Where should that rule live: in code, or in data?
choice: In code: it's a rule
choice: In data: it's this household's, and it will change
answer: In data: it's this household's, and it will change
explain: The amount, the day and even whether it exists are particular to one household and change every year, so a person should be able to change them without a new version of Ledger. What's universal is how a monthly rule turns into dates (including what the 31st means in April), and that's code, which this lesson's task writes.
```

**What else, and why not.** You could keep history by copying the whole data folder on every change: simple, and enormous, and it can't say *why*. You could store an `updated_at` column on each transaction: it says when, but not what it was or why, which is most of what an audit is for. You could make every record immutable and store each change as a new version of the row (**event sourcing** keeps only the changes, and derives the current state from them): powerful, and the natural next step when history matters more than the current state; Ledger's log is a small version of the same idea.

## Your turn: rent on the 31st

Recurring transactions need dates. Write `recurring.py` with one function, `monthly(day, start, end)`: the dates a monthly rule on `day` falls on, from `start` to `end`, both included. The domain decision first: if a month has no such day ("the 31st" in April), the rule falls on the month's **last day**, because the household pays at the end of short months, not at the start of the next. Write that decision in a comment. Refuse a day that no month has (0, 32, 1.5) with a `ValueError`. `calendar.monthrange(year, month)` gives, second, the number of days in a month.

Add `tests/test_recurring.py`: the 31st across January to April, the 29th of February in a leap year (2028), the start and end days included, a year end crossed, and the refusals. Commit both files.

```hints
nudge: Walk through the months from start's to end's. For each, which day is it: day, or something smaller? And should the result be kept if it falls before start or after end?
concept: For each month, the date is min(day, days in that month). Months are walked as (year, month) pairs, which compare as tuples, and December wraps to January of the next year. A date is kept only if start <= date <= end, which handles a start or end in the middle of a month. The month-end rule is a decision about the domain, and the tests are where it's stated precisely.
shape: def monthly(day, start, end): refuse bad days; dates = []; year, month = start.year, start.month; while (year, month) <= (end.year, end.month): last = calendar.monthrange(year, month)[1]; date = datetime.date(year, month, min(day, last)); if start <= date <= end: dates.append(date); step to the next month; return dates.
answer: recurring.py:
~~~python
import calendar
import datetime


# The dates a monthly rule falls on, from start to end, both included: the
# given day of each month, or the month's last day when the month is shorter.
# "The 31st" is the 30th in April and the 28th or 29th in February: the
# household pays rent at the end of short months, not at the start of the next.
def monthly(day, start, end):
    if type(day) is not int or not 1 <= day <= 31:
        raise ValueError(f"a day of the month is 1 to 31, not {day!r}")
    dates = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        last = calendar.monthrange(year, month)[1]
        date = datetime.date(year, month, min(day, last))
        if start <= date <= end:
            dates.append(date)
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return dates
~~~
tests/test_recurring.py:
~~~python
import datetime

import pytest

from recurring import monthly

D = datetime.date


def test_the_31st_is_the_last_day_of_shorter_months():
    assert monthly(31, D(2026, 1, 1), D(2026, 4, 30)) == [D(2026, 1, 31), D(2026, 2, 28), D(2026, 3, 31), D(2026, 4, 30)]


def test_a_leap_year_has_a_29th_of_february():
    assert monthly(30, D(2028, 2, 1), D(2028, 2, 29)) == [D(2028, 2, 29)]


def test_the_start_and_end_days_are_included_and_nothing_outside():
    assert monthly(15, D(2026, 10, 15), D(2026, 12, 14)) == [D(2026, 10, 15), D(2026, 11, 15)]


def test_a_year_end_is_crossed():
    assert monthly(1, D(2026, 12, 1), D(2027, 1, 31)) == [D(2026, 12, 1), D(2027, 1, 1)]


@pytest.mark.parametrize("day", [0, 32, 1.5])
def test_a_day_that_no_month_has_is_refused(day):
    with pytest.raises(ValueError):
        monthly(day, D(2026, 1, 1), D(2026, 12, 31))
~~~
Then git add recurring.py tests/test_recurring.py and git commit -m "Work out the dates of a monthly rule, ending short months on their last day". The tempting slip is date + timedelta(days=30): a month isn't 30 days, and after a few months the rule drifts off its day.
```

```check
run "cd ledger; .venv/Scripts/python -c \"import datetime; from recurring import monthly; print([d.isoformat() for d in monthly(31, datetime.date(2026, 1, 1), datetime.date(2026, 4, 30))])\"" stdout="['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']" -- The 31st should be each month's last day when the month is shorter.
run "cd ledger; .venv/Scripts/python -c \"import datetime; from recurring import monthly; print(monthly(30, datetime.date(2028, 2, 1), datetime.date(2028, 2, 29))[0].day, len(monthly(1, datetime.date(2026, 12, 1), datetime.date(2027, 1, 31))), len(monthly(15, datetime.date(2026, 10, 15), datetime.date(2026, 12, 14))))\"" stdout="29 2 2" -- A leap February, a year end and the range's ends should be handled.
run "cd ledger; .venv/Scripts/python -c \"import datetime; from recurring import monthly; monthly(32, datetime.date(2026, 1, 1), datetime.date(2026, 12, 31))\"" exit=1 stderr="ValueError" -- A day no month has should be refused.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="passed" without="failed" -- Every test should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:recurring.py').returncode == 0, git('cat-file', '-e', 'HEAD:tests/test_recurring.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit recurring.py and its tests.
```

**What these checks establish, and what they don't.** They check that a correction is logged with its old value and reason before the transaction changes, that `as_of` reconstructs earlier days, that reconciled transactions and bad corrections are refused with nothing written, and that monthly dates handle short months, leap years, year ends and range ends. They don't make Ledger *create* the recurring transactions, or show the history to anyone: those need a place to live in the program's structure, which is 02-09-01's question. And they can't check that recorded time is enough for this household; only asking "what will you want to know about the past, and when?" can.

## What you can do now

- Store **dates** for calendar facts and **instants** for moments; a date claims no time and no time zone.
- An **audit history** is append-only and recorded **before** the change: when, what, old, new, why. Refuse a correction without a reason, and check new values like outside data.
- **as of** a day: current values with later changes undone. **Recorded** time (when the system learned it) differs from **effective** time (when it was true); **bitemporal** keeps both.
- Keep what's **universal** in code and what **varies** in data; the test is who changes it, and how often.
- An **ER diagram** shows entities and cardinalities; sketch it before code.
- A recurring rule has domain decisions inside it (the 31st in April); make them explicit and tested.

**Next:** 02-09-01 turns the model into a structure: from the real domain to a conceptual model, a software model and an architecture. Ledger gets its module sketch: a pure domain package, a storage package and an interface package, with every dependency pointing at the domain.
