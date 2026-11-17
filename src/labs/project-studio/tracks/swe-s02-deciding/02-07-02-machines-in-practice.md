---
title: "Machines in Practice: Lifecycles That Can't Go Wrong"
runtime: python
---

A card transaction goes through stages. The bank shows it as *pending* the moment you pay. Days later it *clears*, appearing on the statement. Ledger's people then check it against the statement and mark it *reconciled*: agreed, and not to be edited again. Some pending transactions never clear at all: a hotel holds an amount and then releases it, and the transaction is *void*. The obvious way to store this is a flag or two: `is_cleared`, `is_reconciled`. That allows "reconciled but not cleared", a state nothing should ever be in, and every piece of code that reads the flags has to wonder about it. This lesson gives Ledger's transactions a **lifecycle**: one status from a fixed list, a table of how it may change, and a test of every pair of status and event, so that the illegal states and the illegal moves can't happen, rather than being checked for.

**By the end you can:**

- Explain state explosion, and how hierarchical states (statecharts) tame it.
- Make illegal states unrepresentable, with one value from a fixed set instead of several flags.
- Choose between an enum plus a transition table and the State pattern.
- Test a state machine exhaustively, against a matrix written by hand.
- Recognise protocols as state machines.

**You need:** 02-07-01 (states, events, guards, tables), 02-06-02 (where invariants are enforced), 01-09 (pytest). Commands run inside `ledger`.

## Two flags, four states

```predict
question: A transaction is stored with three yes-or-no flags: is_cleared, is_reconciled and is_void. How many combinations can be stored, and how many of them are real states of a transaction (pending, cleared, reconciled, void)?
answer: 8
explain: Three flags give 2 × 2 × 2 = 8 combinations, and only 4 of them are real: none set (pending), cleared, cleared and reconciled, void. The other four, such as reconciled but not cleared, or void and reconciled, can be stored, and every reader of the flags must decide what they mean. Each flag added doubles the combinations; the real states grow by one.
```

That doubling is **state explosion**: describe a thing with independent parts, and the number of combinations is their product. It happens with flags, and it happens with state machines themselves. Blockfall has five game states; add "sound on or off" and a machine that tracks both has ten; add a two-player mode and it has twenty. Two cures:

- **Make illegal states unrepresentable**: store *one* value from a fixed set, so only the real states can be stored at all. Four statuses, four values.
- **Hierarchy**: states inside states. David Harel's **statecharts** (1987) let a superstate hold behaviour its substates share, and let independent parts run side by side as separate regions, instead of multiplying into one flat machine. Ledger's lifecycle uses the first idea: pending and cleared are both **open**, and whatever an open transaction may do, both may do.

## One status, from a list

Create `lifecycle.py`:

```python file=ledger/lifecycle.py
import enum


# A transaction's lifecycle. pending: seen, not yet on a statement (a card
# transaction the bank hasn't settled). cleared: on a statement. reconciled:
# checked against the statement and agreed, so it isn't edited any more.
# void: a pending one that never cleared (a hotel's hold, released).
class Status(enum.Enum):
    PENDING = "pending"
    CLEARED = "cleared"
    RECONCILED = "reconciled"
    VOID = "void"


# A superstate: pending and cleared are both "open", and whatever open
# allows, each of them allows. A statechart's hierarchy, in one dictionary.
PARENT = {Status.PENDING: "open", Status.CLEARED: "open"}

# (state or superstate, event, guard, next state). A next state of None
# means the transaction stays where it is: the event's action happens, and
# the state doesn't change.
TRANSITIONS = [
    (Status.PENDING, "clear", None, Status.CLEARED),
    (Status.PENDING, "void", None, Status.VOID),
    (Status.CLEARED, "reconcile", "matches_statement", Status.RECONCILED),
    (Status.RECONCILED, "reopen", "has_reason", Status.CLEARED),
    ("open", "edit", None, None),
]
EVENTS = sorted({event for _, event, _, _ in TRANSITIONS})


class Refused(Exception):
    pass


# The status an event leads to, looking in the state itself and then in its
# superstate. Anything the table doesn't allow is refused, with the reason.
def next_status(status, event, facts=None):
    facts = facts or {}
    blocked_by = None
    for state in (status, PARENT.get(status)):
        for source, on, guard, target in TRANSITIONS:
            if source == state and on == event:
                if guard is None or facts.get(guard) is True:
                    return status if target is None else target
                blocked_by = guard
    if blocked_by is not None:
        raise Refused(f"a {status.value} transaction can't {event} until {blocked_by.replace('_', ' ')}")
    raise Refused(f"a {status.value} transaction can't {event}")
```

`Status` is an **enum** (`enum.Enum`): a type whose only values are the four listed, so a status can't be `"done"` or misspelled `"cleard"`, and comparing two is comparing members, not strings. `PARENT` is the hierarchy: pending and cleared have the superstate `"open"`. `TRANSITIONS` is the same shape as Blockfall's table, with two guards, `matches_statement` (reconciling needs the amount to agree with the statement) and `has_reason` (reopening a reconciled transaction needs a reason, since reconciled is meant to be final). The last row is an **internal transition**: `edit` on an open transaction changes it without changing its status, and it's written once, on the superstate, for both substates. `next_status` looks in the status's own rows, then its parent's, and refuses anything else, saying which guard blocked it when one did, because "can't" without "why" is the least helpful message a program can give (01-10-01). Save it, and try a few moves:

```
.venv/bin/python -c "from lifecycle import *; print(next_status(Status.PENDING, 'edit'), next_status(Status.CLEARED, 'reconcile', {'matches_statement': True}))"
.venv/bin/python -c "from lifecycle import *; next_status(Status.RECONCILED, 'edit')"
```

(On Windows, `.venv/Scripts/python`.) The first prints `Status.PENDING Status.RECONCILED`: editing leaves a pending transaction pending, and a matching statement reconciles a cleared one. The second ends `lifecycle.Refused: a reconciled transaction can't edit`.

(A first draft of `Status`'s comment said "a card payment". `vocab.py` from 02-05-01 found it at once: SPEC.md's word is transaction. The checker works on its author too.)

```check
run "cd ledger; .venv/Scripts/python -c \"from lifecycle import *; print(next_status(Status.PENDING, 'edit').value, next_status(Status.CLEARED, 'reconcile', {'matches_statement': True}).value, next_status(Status.PENDING, 'void').value)\"" stdout="pending reconciled void" -- Editing should leave a pending transaction pending; reconciling with a matching statement, and voiding, should move it.
run "cd ledger; .venv/Scripts/python -c \"from lifecycle import *; next_status(Status.RECONCILED, 'edit')\"" exit=1 stderr="a reconciled transaction can't edit" -- A reconciled transaction should refuse to be edited, saying so.
run "cd ledger; .venv/Scripts/python vocab.py" stdout="0 avoided words" -- lifecycle.py should use the vocabulary's words.
```

## Every pair, tested

A machine with four states and five events has twenty pairs, and every one of them is a decision: either the event moves the transaction somewhere, or it's refused. A bug in a state machine is almost always one wrong pair, and examples (02-05-02) tend to test the pairs people think of. Test them all. Create `tests/test_lifecycle.py`:

```python file=ledger/tests/test_lifecycle.py
import pytest

from lifecycle import EVENTS, Refused, Status, next_status

# The lifecycle's whole behaviour, written out by hand: for every status and
# every event, where it leads (None: refused), with every guard true. The
# table in lifecycle.py is the implementation; this is the specification.
EXPECTED = {
    #                    clear      edit       reconcile     reopen     void
    Status.PENDING:    ["cleared", "pending", None,         None,      "void"],
    Status.CLEARED:    [None,      "cleared", "reconciled", None,      None],
    Status.RECONCILED: [None,      None,      None,         "cleared", None],
    Status.VOID:       [None,      None,      None,         None,      None],
}
ALL_TRUE = {"matches_statement": True, "has_reason": True}


def outcome(status, event, facts):
    try:
        return next_status(status, event, facts).value
    except Refused:
        return None


def test_the_events_are_the_ones_the_specification_lists():
    assert EVENTS == ["clear", "edit", "reconcile", "reopen", "void"]


# Every pair of status and event: 4 statuses times 5 events.
@pytest.mark.parametrize("status", list(Status))
@pytest.mark.parametrize("event", EVENTS)
def test_every_status_and_event(status, event):
    assert outcome(status, event, ALL_TRUE) == EXPECTED[status][EVENTS.index(event)]


def test_reconciling_needs_the_statement_to_match():
    with pytest.raises(Refused, match="can't reconcile until matches statement"):
        next_status(Status.CLEARED, "reconcile", {"matches_statement": False})


def test_reopening_needs_a_reason():
    with pytest.raises(Refused, match="can't reopen until has reason"):
        next_status(Status.RECONCILED, "reopen", {})
```

`EXPECTED` is the whole lifecycle written out by hand, as a matrix: one row per status, one column per event, the result or `None` for refused, with every guard true. It's the specification; the table in `lifecycle.py` is the implementation; the test says they agree everywhere. Two stacked `parametrize` decorators make the **Cartesian product** (02-03-01): every status with every event, 20 tests. The first test checks that the events are the ones the matrix's columns assume, so adding an event without deciding its column fails loudly. The last two check that the guards really block. Save it and run it:

```
.venv/bin/python -m pytest -q tests/test_lifecycle.py
```

`23 passed`. Now make the kind of change that looks harmless. In `lifecycle.py`, add a row after the reconcile row, as a shortcut ("if the statement matches, why wait for it to clear?"):

```
    (Status.PENDING, "reconcile", "matches_statement", Status.RECONCILED),
```

Run the tests again:

```
.venv/bin/python -m pytest -q tests/test_lifecycle.py
```

```
E       AssertionError: assert 'reconciled' == None
FAILED tests/test_lifecycle.py::test_every_status_and_event[reconcile-Status.PENDING]
1 failed, 22 passed in 0.10s
```

Read the evidence. Exactly one pair is wrong, and the test's name says which: `reconcile` from `PENDING`, which should be refused and now reconciles. A pending transaction hasn't appeared on any statement yet, so there's nothing to reconcile it against; the shortcut would let unchecked amounts become final. No example test would have tried that pair, because nobody writing examples thinks of the move they didn't intend. Delete the line you added, run the tests (`23 passed`), and commit:

```
git add lifecycle.py tests/test_lifecycle.py
git commit -m "Give transactions a lifecycle, with every move tested"
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_lifecycle.py" stdout="23 passed" -- With the shortcut removed, all 23 lifecycle tests should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); t = git('show', 'HEAD:lifecycle.py').stdout; print('class Status' in t, '(Status.PENDING, ' + chr(34) + 'reconcile' not in t, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit lifecycle.py and the tests, without the shortcut.
```

## Tables, patterns and protocols

There are two common ways to build a state machine in code.

- **An enum plus a table**, as here and in Blockfall: the states are values, the behaviour is data. The whole machine can be read in one place, printed, tested pair by pair, and even drawn from the data. Best when states differ mainly in *which moves they allow*.
- **The State pattern**: a class for each state (`Pending`, `Cleared`…), each with a method per event that returns the next state object. Each state's behaviour lives together with it, which helps when states differ in *what they do*: a lot of code per state. The cost is that the overall machine is spread across classes, and no single place shows every move.

For Ledger's lifecycle, where the states differ only in what's allowed, the table wins.

Many things you'll build or call are state machines whether or not anyone wrote them down: a file upload (selected, uploading, done, failed), a login (signed out, awaiting a code, signed in, locked out), a database transaction (begun, committed or rolled back), an order (placed, paid, shipped, delivered, returned). **Protocols** are state machines shared by two programs. TCP, which carries most of the internet's traffic, is specified with states such as `LISTEN`, `SYN-SENT`, `ESTABLISHED` and `TIME-WAIT`, and each side may only send what its state allows; Ledger's lock file (02-02-03) is a tiny protocol between writers: unlocked, then locked by one, then unlocked. When something you call behaves oddly, finding its states is often the fastest way to understand it.

```predict
question: A web shop stores an order's status as text, and its code checks things like if status == "paid" in many places. A refund feature is added, and refunded orders keep being shipped. What's the likely cause, and the structural fix?
explain: Somewhere, code decides "ship it" by checking for a status it knows (say, status != "cancelled") rather than for the one status that allows shipping, so the new "refunded" status falls through. Each scattered if is a partial copy of the machine, and adding a state means finding them all. The fix: an enum of statuses and one transition table (shipping allowed only from paid), with an exhaustive test, so a new status starts with every move refused until someone decides its row.
```

**What else, and why not.** You could keep the flags and add a check that refuses impossible combinations: that catches them after they're stored, where the enum makes them unstorable. You could use strings without an enum: they read the same in a CSV file, and a misspelling is a new status. You could write the matrix as the implementation and drop the table: that works for small machines, but the table's guards and superstate say *why* each cell is what it is, and the matrix only says *what*.

## Your turn: statuses in the data

The lifecycle exists in code; Ledger's stored transactions don't have a status yet. Add one:

- In `make_data.py`, a `status` column at the end of `transactions`: transactions 1 to 6 `reconciled`, 7 to 10 `cleared`. Run it, so `data/transactions.csv` has the column.
- In `check_data.py`, a rule that every transaction's `status` is one of `lifecycle.Status`'s values, read from the enum itself so the list is written down once, reporting the line and the value otherwise.
- In `tests/test_data.py`, a test that a copy of the data with one status changed to `done` is reported.

Every test should pass, and `total.py` print what it always has. Commit your changes.

```hints
nudge: Try the check_data.py rule first, before changing the data: what does it say about every transaction? Then add the column, and run it again.
concept: The enum is the single definition: {status.value for status in Status} is the set of allowed values, so a fifth status added to lifecycle.py is allowed in the data automatically, and nothing else is. A missing column gives None from row.get, which isn't in the set either, so the rule also catches data written before the column existed.
shape: make_data.py: each TRANSACTIONS tuple gets a final "reconciled" or "cleared", and the header list gains "status". check_data.py: from lifecycle import Status; CHOICES = {("transactions", "status"): {status.value for status in Status}}; a loop over CHOICES reporting values not in the set. tests/test_data.py: copy data to tmp_path, replace the first ",cleared" with ",done", assert a problem mentions 'done'.
answer: In make_data.py, add the status to each transaction, for example `(1, "2026-11-01", 1, 1, 95000, "November", "reconciled"),` for 1 to 6 and `"cleared"` for 7 to 10, and "status" at the end of the transactions header. In check_data.py, add `from lifecycle import Status`, and after REFERS:
~~~python
# Fields whose value must come from a fixed list: a transaction's status is
# one of lifecycle.Status, the one place the list is written down.
CHOICES = {("transactions", "status"): {status.value for status in Status}}
~~~
and, in problems, before the foreign-key loop:
~~~python
    for (table, field), allowed in CHOICES.items():
        for line, row in enumerate(rows[table], start=2):
            if row.get(field) not in allowed:
                found.append(f"{table}.csv line {line}: {field} {row.get(field)!r} isn't one of {', '.join(sorted(allowed))}")
~~~
In tests/test_data.py:
~~~python
def test_a_status_that_isnt_in_the_lifecycle_is_found(tmp_path):
    shutil.copytree(LEDGER / "data", tmp_path, dirs_exist_ok=True)
    path = tmp_path / "transactions.csv"
    path.write_text(path.read_text(encoding="utf-8").replace(",cleared", ",done", 1), encoding="utf-8")
    assert any("'done'" in problem and "isn't one of" in problem for problem in check_data.problems(tmp_path))
~~~
Run make_data.py, then check_data.py (0 problems) and the tests, and git add make_data.py data check_data.py tests/test_data.py and git commit -m "Store each transaction's status, from the lifecycle's list". The tempting slip is writing the allowed list out again in check_data.py, {"pending", "cleared", "reconciled", "void"}: it works today, and disagrees with lifecycle.py the day a status is added.
```

```check
run "cd ledger; .venv/Scripts/python -c \"import store; rows = store.read('transactions'); print(rows[0]['status'], rows[9]['status'], len(rows))\"" stdout="reconciled cleared 10" -- data/transactions.csv should have a status column: transaction 1 reconciled, 10 cleared.
run "cd ledger; .venv/Scripts/python check_data.py" stdout="0 problems" -- check_data.py should find no problems in the data with its statuses.
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); shutil.copytree('data', d, dirs_exist_ok=True); p = os.path.join(d, 'transactions.csv'); t = open(p, encoding='utf-8', newline='').read().replace(',reconciled', ',done', 1); open(p, 'w', encoding='utf-8', newline='').write(t); r = subprocess.run([sys.executable, 'check_data.py', d], capture_output=True, text=True); print(r.returncode, 'done' in r.stdout, 'line 2' in r.stdout)\"" stdout="1 True True" -- A status that isn't in the lifecycle should be reported with its line.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; print('Status' in pathlib.Path('check_data.py').read_text(encoding='utf-8'))\"" stdout="True" -- check_data.py should take the allowed statuses from lifecycle.Status.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="122 passed" -- With your test, all 122 tests should pass.
run "cd ledger; .venv/Scripts/python total.py" stdout="total          1366.89" -- The totals shouldn't change.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('status' in git('show', 'HEAD:data/transactions.csv').stdout.splitlines()[0], git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit make_data.py, the data, check_data.py and the test.
```

**What these checks establish, and what they don't.** They check that the lifecycle allows and refuses the right moves with reasons, that every one of the twenty pairs matches the matrix written by hand and that the matrix catches a one-cell shortcut, and that the stored data now carries statuses from the enum, checked by `check_data.py` in every test run. They don't make Ledger *use* the lifecycle yet: nothing moves a transaction from pending to cleared when a statement arrives, which the interface will do (stage 3). And the matrix is only as right as the person who wrote it: it's the place to argue about whether a void transaction may ever be reopened, which is exactly why it's written out.

## What you can do now

- Independent flags multiply: **state explosion**. Store **one value from a fixed set** (an enum), so illegal states can't be stored.
- **Hierarchy** (statecharts): a superstate's moves apply to all its substates, so shared behaviour is written once.
- An **internal transition** acts without changing the state.
- **Enum plus table** when states differ in what's allowed; the **State pattern** when they differ in what they do.
- Test a machine **exhaustively**: every state with every event, against a **matrix written by hand**, plus the guards. One-cell bugs are the usual kind.
- **Protocols** are state machines between programs; finding the states is the fastest way to understand one.

**Next:** 02-08-01 turns to the domain itself: entities and value objects, aggregates, lifecycles and domain events, a vocabulary used in the code, and rich versus anemic models. Ledger's money becomes a value object.
