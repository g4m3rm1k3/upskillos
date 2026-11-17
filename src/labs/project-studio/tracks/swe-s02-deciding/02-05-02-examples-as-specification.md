---
title: "Examples as Specification: Given, When, Then"
runtime: python
---

"Show a month's spending" sounds complete until someone asks: which month? A calendar month, or the statement's period, which runs from the 15th? Is a refund on the 2nd of December, for something bought in November, December's or November's? Does an empty month show nothing, or every category at zero? Rules written as sentences hide those questions, because the sentence reads fine either way. An **example** can't hide them: "given 10.00 of groceries on the 30th of October and 20.00 on the 2nd of November, when November is reported, then groceries are 20.00" has exactly one meaning, and anyone, a person or an agent, can check a result against it. This lesson adds examples to Ledger's spec as **acceptance criteria**, turns them into tests, and finds, the moment they run, a requirement the code doesn't meet. Then Blockfall gets a feature specified the same way, examples first: scoring.

**By the end you can:**

- Write acceptance criteria as given/when/then examples, numbered after the requirements they check.
- Find edge cases, and add them as examples.
- Turn examples into tests that run the real program, and read what their failures say about the spec and the code.
- Write a definition of done, and run a pre-mortem.

**You need:** 02-05-01 (`SPEC.md`), 02-04-02 (the importer), 01-09 (tests), 01-09-04 (Blockfall's tests page). Commands run inside `ledger`, and later inside `blockfall`.

## An example settles it

```predict
question: SPEC.md's F3 says "importing a statement twice, or two statements that overlap, adds each transaction once." Two identical coffees appear on the 7th in October's statement and again in November's. After importing both statements, how many coffees on the 7th should the inbox hold?
choice: 1
choice: 2
choice: 4
answer: 2
explain: Two real coffees were bought, so two must be kept; the overlap means each statement shows the same two. But F3's sentence doesn't say that, and "adds each transaction once" could easily be read as "never adds a row that's already there", which keeps one. 02-03-01 decided it; an example in the spec, "given … when … then the inbox holds both coffees", would have made the sentence impossible to misread.
```

The format used for such examples comes from behaviour-driven development: **given** a starting situation, **when** something happens, **then** an observable result. Each part keeps the example honest. *Given* says what must be true before, so the example can be set up. *When* is one action. *Then* is something you can look at.

## Given, when, then

Add the second half of the spec. Replace `SPEC.md` with:

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

Four new sections, before the note to the builder. **Acceptance criteria** are numbered after the requirement they check (F3.1, F3.2), so a failing test points straight at a line of the spec. Each names real data (November's statement, line 4) and real numbers, not "some transactions". **Edge cases** are the examples at the boundaries, where code usually breaks: a malformed month, an empty statement, duplicates that are real, a negative amount. **Done means** is a **definition of done**: the list a change must satisfy before anyone calls it finished, so "done" means the same thing to everyone, including the agent that says it (01-12-02). And the **pre-mortem**: imagine the project has failed, a year from now, and write down the likeliest reasons, while there's still time to do something about each. It's the cheapest risk analysis there is, and it turns up things a plan doesn't, because it asks "how does this fail?" instead of "how does this work?". Save it.

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib, re; t = pathlib.Path('SPEC.md').read_text(encoding='utf-8'); a = t.split('### Acceptance criteria')[1].split('###')[0]; print(len(re.findall(r'^- F[0-9]+[.][0-9]+[.] Given ', a, re.M)), all(h in t for h in ['### Edge cases', '### Done means', '### Pre-mortem']))\"" stdout="5 True" -- SPEC.md should have five numbered given/when/then criteria, and sections for edge cases, done, and the pre-mortem.
run "cd ledger; .venv/Scripts/python vocab.py" stdout="0 avoided words" -- The new sections should use the vocabulary's words.
```

## Criteria that run

An example in a document is checked when someone remembers to. An example as a test is checked every time. Create `tests/test_criteria.py`:

```python file=ledger/tests/test_criteria.py
import csv
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

import reports

# SPEC.md's acceptance criteria, each as a test named after it. They run the
# real importer, as a person would, in a temporary copy of Ledger.
LEDGER = Path(__file__).resolve().parent.parent


@pytest.fixture
def ledger(tmp_path):
    for name in ["bank.py", "importer.py"]:
        shutil.copy(LEDGER / name, tmp_path)
    shutil.copytree(LEDGER / "bank", tmp_path / "bank")
    (tmp_path / "data").mkdir()
    return tmp_path


def run_import(ledger, statement):
    return subprocess.run([sys.executable, "importer.py", statement], cwd=ledger, capture_output=True, text=True).stdout


def test_f2_1_a_bad_row_is_rejected_with_its_line_and_reason(ledger):
    out = run_import(ledger, "bank/2026-11.csv")
    assert "bank/2026-11.csv line 4: amount '-4,50'" in out
    assert "8 added to data/inbox.csv" in out


def test_f3_1_an_overlapping_statement_adds_only_what_is_new(ledger):
    run_import(ledger, "bank/2026-10.csv")
    assert "3 added to data/inbox.csv, 5 already there" in run_import(ledger, "bank/2026-11.csv")


def test_f3_2_importing_a_statement_again_adds_nothing(ledger):
    run_import(ledger, "bank/2026-11.csv")
    assert "0 added to data/inbox.csv, 8 already there" in run_import(ledger, "bank/2026-11.csv")


# Two months of transactions in a temporary data folder, for F5.
@pytest.fixture
def two_months(tmp_path):
    tables = {
        "accounts": [["id", "name", "holder"], ["1", "Sam's card", "Sam"]],
        "categories": [["id", "name"], ["1", "groceries"], ["2", "rent"]],
        "transactions": [
            ["id", "date", "account_id", "category_id", "cents", "note"],
            ["1", "2026-10-30", "1", "1", "1000", ""],
            ["2", "2026-11-02", "1", "1", "2000", ""],
            ["3", "2026-11-01", "1", "2", "95000", ""],
        ],
    }
    for table, rows in tables.items():
        with open(tmp_path / f"{table}.csv", "w", newline="", encoding="utf-8") as file:
            csv.writer(file).writerows(rows)
    return tmp_path


def test_f5_1_a_months_report_has_only_that_month(two_months):
    assert reports.spent_by("category", two_months, month="2026-11") == {"groceries": 2000, "rent": 95000}


def test_f5_2_a_month_with_no_transactions_reports_nothing(two_months):
    assert reports.spent_by("category", two_months, month="2026-12") == {}


def test_edge_a_month_written_2026_1_is_refused(two_months):
    with pytest.raises(ValueError):
        reports.spent_by("category", two_months, month="2026-1")
```

Each test is named after its criterion, so a failure reads as a line of the spec. The importer tests run `importer.py` as a separate process, exactly as a person would, in a copy of Ledger in pytest's `tmp_path` (01-09-03) with an empty `data` folder, so they never touch the real inbox. The F5 tests build two months of transactions in a temporary folder, and ask `reports.spent_by` for one month. Save it and run the criteria:

```
.venv/bin/python -m pytest -q tests/test_criteria.py
```

(On Windows, `.venv/Scripts/python`.)

```predict
question: The importer tests describe what 02-04-02 built. How many of the six criteria tests pass?
answer: 3
explain: F2.1, F3.1 and F3.2 describe the importer, which already does them. The three F5 tests fail: spent_by has no month argument, because nothing in Ledger has ever reported a single month. F5 has been in the spec since 02-05-01; it took an example to show that the code doesn't meet it.
```

```
FAILED tests/test_criteria.py::test_f5_1_a_months_report_has_only_that_month
FAILED tests/test_criteria.py::test_f5_2_a_month_with_no_transactions_reports_nothing
FAILED tests/test_criteria.py::test_edge_a_month_written_2026_1_is_refused - ...
3 failed, 3 passed in 1.24s
```

Read the evidence. The three failures are all F5, and each says the same thing: `TypeError: spent_by() got an unexpected keyword argument 'month'`. The importer met its criteria on the first run, because it was built from them; `reports.py` was built in 02-02-03 for "what has each person spent", and F5's "a month's spending" was never in its brief. A sentence in a spec can sit unmet for as long as nobody checks it; an example as a test can't.

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_criteria.py -k f3" stdout="2 passed" -- The F3 criteria should pass: the importer already meets them.
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_criteria.py" exit=1 stdout="3 failed, 3 passed" -- Before reports.py takes a month, the three F5 tests should fail and the rest pass.
```

## Meeting F5

Now make the code meet the spec. Replace `reports.py` with:

```python file=ledger/reports.py
import re

import store


# Derived data: worked out from the transactions each time it's asked for,
# never stored, so it can never disagree with them. With a month, written
# YYYY-MM, only that month's transactions count: their dates, YYYY-MM-DD,
# start with the month and a dash, so 2026-1 can't match 2026-11.
def spent_by(field, folder=store.FOLDER, month=None):
    if month is not None and not re.fullmatch(r"\d{4}-\d\d", month):
        raise ValueError(f"month {month!r} isn't written YYYY-MM")
    totals = {}
    for row in store.transactions(folder):
        if month is None or row["date"].startswith(month + "-"):
            totals[row[field]] = totals.get(row[field], 0) + int(row["cents"])
    return totals


if __name__ == "__main__":
    print(spent_by("who"))
```

`month` is optional, so every existing use of `spent_by` (`reports.py`'s own `__main__`, `timing.py`) still works unchanged. A month is checked before anything is read: `2026-1` isn't a month written `YYYY-MM`, and it's refused rather than guessed at (02-04-02). Then `row["date"].startswith(month + "-")`: the edge case in the spec is why the dash is there, since `"2026-11-02".startswith("2026-1")` is true. ISO dates sort and compare as text exactly because every part has a fixed width (01-03-03). Save it and run every test:

```
.venv/bin/python -m pytest -q tests
```

`31 passed`: the 25 from 02-04-02 and the six criteria. Commit the spec, the criteria and the change:

```
git add SPEC.md tests/test_criteria.py reports.py
git commit -m "Add acceptance criteria to the spec, as tests, and report a single month"
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="31 passed" -- With reports.py taking a month, all 31 tests should pass.
run "cd ledger; .venv/Scripts/python reports.py" stdout="{'Sam': 110339, 'Alex': 26350}" -- reports.py without a month should still give the totals it gave before.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('month' in git('show', 'HEAD:reports.py').stdout, git('cat-file', '-e', 'HEAD:tests/test_criteria.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit SPEC.md, the criteria and reports.py.
```

## Scoring, by example

Blockfall has no score. Specify it the same way, examples first, before a line of scoring code. Inside `blockfall`, create `SCORING.md`:

```markdown file=blockfall/SCORING.md
# Blockfall's scoring

Points come from rows cleared. The rule is these examples; the sentence after them only summarises them.

### Examples

| Rows cleared by one lock | Points for that lock |
|---|---|
| 0 | 0 |
| 1 | 100 |
| 2 | 250 |
| 3 | 450 |
| 4 | 700 |

Each row cleared by a lock is worth 50 more than the row before it in the same lock, starting at 100.

### Edge cases

- Undoing a lock (z) takes back the points it scored, and the rows it cleared.
- Moving, turning, dropping, holding and pausing score nothing.
- A new game starts at 0.

### Open questions

- A saved game doesn't keep its score yet: keeping it is a new save format version (SAVE-FORMAT.md).
```

The rule is the table. The sentence under it summarises, and if the two ever disagree the table wins, because the table is what the tests will check. The edge cases include one with a history: 01-12-01's `PLAN.md` recorded that undo after a cleared row doesn't reset the Rows count. Written as an example ("undoing a lock takes back the points it scored, and the rows it cleared"), that known bug becomes a requirement the scoring work must meet. And the **open question** is written down rather than decided quietly: a saved game doesn't keep its score, and changing that is a format change (02-04-03), a decision for later. Save it.

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('../blockfall/SCORING.md').read_text(encoding='utf-8'); print('| 4 | 700 |' in t, '### Edge cases' in t, '### Open questions' in t)\"" stdout="True True True" -- SCORING.md should give the points for 0 to 4 rows as a table, with edge cases and open questions.
```

## Tests from the examples

The examples become tests before the code exists, as 01-09-04 did test-first. Add these to the end of `blockfall/tests.js`:

```js edit=blockfall/tests.js mode=append

// Scoring (SCORING.md), written from its examples before scoreFor exists.
test("a lock that clears no rows scores nothing", () => {
  assertEqual(scoreFor(0), 0);
});

test("one row scores 100", () => {
  assertEqual(scoreFor(1), 100);
});

test("each row in the same lock is worth 50 more than the one before", () => {
  assertEqual([2, 3, 4].map(scoreFor), [250, 450, 700]);
});
```

Reload `tests.html`: `23 passed, 3 failed`, each failure `scoreFor is not defined`. That's the red that test-first starts from (01-09-04): three tests that say what the code must do, and fail because it doesn't exist yet. Don't commit yet; the task makes them pass.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [23,3] errors=none -- With the scoring tests added and no scoreFor yet, 23 should pass and 3 fail.
```

**What else, and why not.** You could write the scoring rule as a formula and test it with a few values you work out from the formula: then the tests check that the code matches the formula, not that the formula matches what you meant, and a wrong formula passes. Examples written first, by a person thinking about play, catch the formula. You could write a tool-specific format such as Gherkin (`Feature:`, `Scenario:`, `Given …`) and a framework to run it: worth it when non-programmers write and read many criteria, and a layer of machinery otherwise; plain tests named after the criteria get most of the benefit. You could skip the edge cases: they're where most of the bugs in this lesson were, including one that had been known for a stage.

## Your turn: make the examples pass

Make Blockfall score, by `SCORING.md`'s examples:

- In `rules.js`, `scoreFor(cleared)`: the points for one lock that clears that many rows. The three scoring tests should pass.
- In `game.js`, the `Game` keeps a score: it starts at 0, each lock adds `scoreFor` of the rows it cleared, and `game.score()` returns it. The board shows `Score: ` and the score.
- `SCORING.md`'s first edge case: undo (`z`) takes back the points and the rows the undone lock cleared. (Undo's history entries will need to remember the score and the row count as well as the board and piece.)

Then commit `SCORING.md`, `rules.js`, `game.js` and `tests.js` in `blockfall`.

```hints
nudge: Check the examples against your formula before writing code: 1 row 100, 2 rows 250, 3 rows 450. What does the second row add? The third? Then look at what undo restores today, and what it forgets.
concept: The nth row in a lock is worth 100 + 50 × (n − 1), so a loop adding that for each row gives the table. The score is game state, like the board: a private field, changed only in lockPiece, read through a method. Undo restores what the history entry saved, so the entry pushed in lockPiece must save cleared and score too, and undo must put them back.
shape: rules.js: function scoreFor(cleared) { let points = 0; for (let row = 0; row < cleared; row++) points += 100 + 50 * row; return points; }. game.js: a #score field set to 0 in the constructor; in lockPiece, push { board, piece, cleared, score } and add scoreFor(result.cleared); score() returns it; undo sets #cleared and #score from the entry; draw adds a Score line.
answer: Add to the end of rules.js:
~~~javascript
// The points for one lock that clears this many rows (SCORING.md): the
// first row is worth 100, and each further row 50 more than the one before.
// So 1 row is 100, 2 are 100 + 150, 3 are 100 + 150 + 200.
function scoreFor(cleared) {
  let points = 0;
  for (let row = 0; row < cleared; row++) {
    points += 100 + 50 * row;
  }
  return points;
}
~~~
In game.js: declare `#score;` with the other fields, and set `this.#score = 0;` in the constructor; in lockPiece push `{ board: this.#board.slice(), piece: this.#piece, cleared: this.#cleared, score: this.#score }` and, after `this.#cleared += result.cleared;`, add `this.#score += scoreFor(result.cleared);`; add a method `score() { return this.#score; }`; in undo, after restoring the board and piece, add `this.#cleared = saved.cleared;` and `this.#score = saved.score;`; in draw, add `context.fillText("Score: " + game.score(), 8, 96);`. Then, in blockfall, git add SCORING.md rules.js game.js tests.js and git commit -m "Score cleared rows, by the examples in SCORING.md". The tempting slip is scoring without touching undo: every scoring test passes, and z leaves the points (and, as before, the Rows count) behind.
```

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [26,0] errors=none -- With scoreFor, all 26 tests should pass.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'ArrowDown', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.score(), game.clearedCount()]; })()" [100,1] errors=none -- Clearing one row should score 100.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'ArrowDown', 'x', 'ArrowRight', 'ArrowUp', ' ', 'z']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.score(), game.clearedCount()]; })()" [0,0] errors=none -- Undoing the lock that cleared the row should take back the points and the row.
page blockfall/index.html "(() => { const seen = []; const real = context.fillText.bind(context); context.fillText = (text, x, y) => { seen.push(text); real(text, x, y); }; draw(); context.fillText = real; return seen.includes('Score: 0'); })()" true errors=none -- The board should show Score: and the score.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('scoreFor' in git('show', 'HEAD:rules.js').stdout, git('cat-file', '-e', 'HEAD:SCORING.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit SCORING.md, rules.js, game.js and tests.js in blockfall.
```

**What these checks establish, and what they don't.** They check that the spec has numbered criteria and the new sections, that the criteria run as tests against the real importer and catch the unmet F5, that `reports.py` now meets F5 and its edge case without changing anything else, and that Blockfall scores by its examples, undo included. They can't check that the examples are the right ones, or enough of them: the coffees in the first prediction show that a missing example is invisible until it's needed. Asking "what's an example where this rule gives a surprising answer?" for each requirement, out loud, with the people who'll use it, is how the missing ones are found.

## What you can do now

- An **example** has one meaning; a sentence often has several. Put examples in the spec.
- **Acceptance criteria** as **given/when/then**: a setup, one action, an observable result, numbered after the requirement they check.
- **Edge cases** are examples at the boundaries; most bugs live there.
- Criteria become **tests that run the real program**, named after the criteria, so a failure reads as a line of the spec, and an unmet requirement shows the first time they run.
- A **definition of done** makes "done" mean one thing; a **pre-mortem** finds how the project fails while there's time to act.
- Specify a feature **examples first**, then tests from the examples, then code: a known bug can become an example, and stop being known and unfixed.

**Next:** 02-06-01 turns examples into rules that must always hold. Invariants of data, classes, loops and systems; preconditions and postconditions; design by contract; and when to assert versus validate. Blockfall checks that the falling piece never overlaps settled blocks, after every move.
