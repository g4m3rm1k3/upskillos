---
title: "Knowing the Right Answer: Oracles, Edges and Regression Tests"
runtime: python
---

Break `filter` on purpose, and run Kit's checks:

```
pass check_filter.py
...
8 of 8 passed
```

`check_filter.py` has just found 424 wrong answers out of 4096, and printed them. It also exited with status 0, so `run_checks.py`, and the pre-commit hook behind it, call it a pass. Three of Kit's checks have worked like this since module 1.2: they print what they find and never fail. They can't be turned into tests by copying, either. For `hello`, the expected word count is obviously 1. For 4096 combinations of line and query, nobody is going to work out 4096 expected answers by hand. Where does a test's expected value come from when the right answer isn't obvious? That's the **oracle problem**, and this lesson is about it. You'll also see where bugs cluster (at **boundaries**), and how a bug report becomes a **regression test** that keeps the bug fixed.

**By the end you can:**

- Find an oracle for code whose right answers you can't list: a simpler implementation, a trusted one, or an inverse.
- Choose boundary and edge cases for a function, and test that it raises an error where it should (`pytest.raises`).
- Turn a bug report into a reproduction and then a regression test, and check that the test fails on the old, buggy code.

**You need:** 01-09-01 (`pytest`, parametrize, judging tests by mutation), 01-02-01 to 01-02-04 (`filter`'s queries), 01-03-03 (`pack.to_bytes`), 01-08-04 (the `--json` bug). Commands run inside `kit`.

## A check that can't fail

Make the opening experiment yourself. In `filter.py`'s `matches`, change the first line of the expression from `all(term in line for term in all_terms)` to

```
        any(term in line for term in all_terms)
```

Save, then run the check by itself, and then all of them:

```
.venv/bin/python check_filter.py
.venv/bin/python run_checks.py
```

(On Windows, `.venv/Scripts/python`.) `check_filter.py` prints its first differences and then:

```
4096 cases, 424 differences
```

Yet `run_checks.py` says `pass check_filter.py` and `8 of 8 passed`. The script reports the problem in words and exits with status 0, and `run_checks.py` reads only the status (01-06-06). A person who reads the output would see the problem. Nothing else can. `check_pack.py` and `check_bases.py` are the same. A check is only automatic evidence if its *status* says whether it passed. Tests fix this by design, since `pytest` exits with 1 when any `assert` fails. Put `filter.py` back (`git restore filter.py`).

```check
contains kit/filter.py "all(term in line for term in all_terms)" -- Put matches back (git restore filter.py).
run "cd kit; .venv/Scripts/python check_filter.py" stdout="4096 cases, 0 differences" -- With matches restored, check_filter.py finds no differences.
```

## An oracle

`check_filter.py` already knows where its expected values come from: `matches_loops`, the version of `matches` that 01-02-01 wrote with loops and early returns. It's slower and longer than the one-expression `matches`, and that's the point. It's written in a different way, plainly enough to check by reading, so it's unlikely to share the same mistake. An **oracle** is any way of knowing the right answer that doesn't come from the code under test. Here it's a second, simpler implementation. Move it into a test:

```python file=kit/tests/test_filter.py
import itertools

import pytest

from filter import matches


# matches as 01-02-01 first wrote it: loops and early returns, slow but plain.
# It's the oracle: these tests trust it to give the right answer.
def matches_loops(line, all_terms, any_terms, none_terms):
    for term in all_terms:
        if term not in line:
            return False
    for term in none_terms:
        if term in line:
            return False
    if any_terms:
        for term in any_terms:
            if term in line:
                return True
        return False
    return True


# Every subset of three terms: (), (a,), (b,), (c,), (a, b), (a, c), (b, c), (a, b, c).
VOCABULARY = [b"a", b"b", b"c"]
SUBSETS = []
for size in range(len(VOCABULARY) + 1):
    for subset in itertools.combinations(VOCABULARY, size):
        SUBSETS.append(list(subset))


# One test for each line; inside it, all 512 queries against the oracle.
@pytest.mark.parametrize("present", SUBSETS, ids=lambda terms: b"".join(terms).decode() or "none")
def test_matches_agrees_with_loops(present):
    line = b" ".join(present) + b"\n"
    for all_terms in SUBSETS:
        for any_terms in SUBSETS:
            for none_terms in SUBSETS:
                expected = matches_loops(line, all_terms, any_terms, none_terms)
                got = matches(line, all_terms, any_terms, none_terms)
                assert got == expected, (all_terms, any_terms, none_terms)
```

`ids=` names each of the eight tests after its line (`none`, `a`, `ab`, …) instead of `present0`, `present1`. The `assert` message is the query, so a failure says which one. Save it and run `.venv/bin/python -m pytest -q tests/test_filter.py`: `8 passed`. Now make the same break as before (`any` for `all`) and run it again:

```
E                   AssertionError: ([], [], [])
E                   assert False == True
```

```predict
question: The failing query is ([], [], []): no terms at all. Why does any-for-all get that one wrong?
choice: An empty query should match no line
choice: all() of nothing is True, but any() of nothing is False
choice: The line has no terms in it
answer: all() of nothing is True, but any() of nothing is False
explain: "Every --all term is in the line" is true when there are no --all terms (01-02-03: every member of an empty group passes), so the empty query matches every line. any() of an empty group is False, so the broken version rejects every line for the empty query: the first of the 512 queries tried, for all eight lines.
```

All eight tests fail, each on that first query, and `pytest` exits with status 1. Put `filter.py` back.

How far can you trust an oracle? Only as far as it's independent of the code under test. A second implementation written by the same person, from the same misunderstanding, can share a bug. Then both agree and both are wrong. `matches_loops` earns its place because it's plain enough to check by reading against the rule, line by line. The kinds of oracle you'll meet:

| Oracle | Example in Kit | Its weakness |
|---|---|---|
| Expected values from the specification, by hand | `test_count.py`'s tables | Only as many cases as you'll write |
| A simpler, slower implementation | `matches_loops` for `matches` | Can share a misunderstanding of the rule |
| A trusted implementation of the same thing | Python's `csv` for `parse_csv` (01-09-01); `int.to_bytes` for `pack` | It may differ on purpose (01-07-02's blank line) |
| An inverse that undoes the result | `int(text, base)` for `to_base` (your task) | Says only that it's reversible, not that it's the expected form |
| A property every right answer has | "lines never exceed bytes" | True of many wrong answers too |

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_filter.py" stdout="8 passed" -- tests/test_filter.py should check matches against the oracle, one test per line.
contains kit/filter.py "all(term in line for term in all_terms)" -- Put matches back after the experiment (git restore filter.py).
```

## Boundaries and edge cases

Bugs cluster where behaviour changes: at the **boundary** between "fits" and "doesn't fit", between one digit and two, between empty and not empty. 01-03-03's planted bug was a `>` that should have been `>=`, right at a boundary. `pack.to_bytes(value, size, order)` (01-03-03's task) has two boundaries per size: the smallest value that fits (−128 in one byte) and the largest (255). So test the values on both sides of each:

```python file=kit/tests/test_pack.py
import pytest

from pack import to_bytes

# The edges of one byte: the smallest and largest values that fit, signed
# and unsigned, and the first value past each end, which doesn't.
FITS = [
    (-128, b"\x80"),
    (-1, b"\xff"),
    (0, b"\x00"),
    (127, b"\x7f"),
    (128, b"\x80"),
    (255, b"\xff"),
]
DOES_NOT_FIT = [-129, 256]


@pytest.mark.parametrize(("value", "expected"), FITS)
def test_one_byte(value, expected):
    assert to_bytes(value, 1, "little") == expected


@pytest.mark.parametrize("value", DOES_NOT_FIT)
def test_one_byte_does_not_fit(value):
    with pytest.raises(ValueError, match="does not fit"):
        to_bytes(value, 1, "little")


# Every value from one below the smallest to one above the largest, in two
# sizes and both orders, against Python's own int.to_bytes as the oracle.
@pytest.mark.parametrize("order", ["little", "big"])
@pytest.mark.parametrize("size", [1, 2])
def test_agrees_with_int_to_bytes(size, order):
    bits = size * 8
    for value in range(-(1 << (bits - 1)) - 1, (1 << bits) + 1):
        try:
            expected = value.to_bytes(size, order, signed=value < 0)
        except OverflowError:
            expected = None
        try:
            got = to_bytes(value, size, order)
        except ValueError:
            got = None
        assert got == expected, value
```

Three new things here. **`pytest.raises(ValueError, match="does not fit")`** is a test that an error *is* raised: the `with` block must raise `ValueError` with a message containing the text, or the test fails. An error the program should raise is behaviour too, and an edge case often has one. Two `parametrize` lines on one test make every combination: 2 sizes × 2 orders, 4 tests. And the last test checks every value in the range, both boundaries and everything between, against `int.to_bytes` as the oracle, which is how `check_pack.py` did it. The six hand-picked cases say *which* edges matter. The sweep catches the edges you didn't think of.

Save and run `.venv/bin/python -m pytest -q tests/test_pack.py`: `12 passed`. Then judge it: in `pack.py`, change `value >= 1 << bits` to `value > 1 << bits` (the boundary bug), and run again:

```
E       Failed: DID NOT RAISE ValueError
...
E           AssertionError: 256
E           assert b'\x00' == None
```

With `>`, 256 counts as fitting in one byte, and it wraps around to `b'\x00'`, the silent wraparound 01-03-03 warned about. The hand-picked test and the sweep both catch it. `check_pack.py` finds the same 4 differences and exits with status 0 again. Put `pack.py` back.

Edge cases worth trying for almost any function, before you think hard about its particular rules: nothing (empty text, empty list, zero), one (one item, one byte, one character), the largest and smallest allowed, one past each, a negative number, a duplicate, and for text: a line ending (LF, CRLF, none at the end), a non-ASCII character, and whitespace at the edges.

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_pack.py" stdout="12 passed" -- tests/test_pack.py should test one byte's boundaries and sweep both sizes and orders.
contains kit/pack.py "value >= 1 << bits" -- Put the boundary back after the experiment (git restore pack.py).
```

## A bug report becomes a test

01-08-04 started with a bug report: "`count samples/hello.txt --json` crashes." The first move was to **reproduce** it, and the smallest command that shows a bug is a **reproduction**. `check_json_flag.py` turned the reproduction into a script that exits 0 or 1, so that `git bisect run` could use it. A reproduction script that stays in the project, runs with the other tests, and fails if the bug ever comes back is a **regression test**. Write it as one:

```python file=kit/tests/test_cli.py
import json
import subprocess
import sys

import pytest


# A regression test for 01-08-04's bug report: count crashed when --json came
# after the file name. It runs count.py the way the user did, both ways round.
@pytest.mark.parametrize("args", [["--json", "samples/hello.txt"], ["samples/hello.txt", "--json"]])
def test_json_flag_anywhere(args):
    command = [sys.executable, "count.py", *args]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["bytes"] == 7
```

It runs the program as a user would, through its command line, not by calling a function, because that's where the bug was. The first `assert`'s message is the program's error output, so a failure shows the traceback. Save it and run `.venv/bin/python -m pytest -q tests/test_cli.py`: `2 passed`.

A regression test must fail on the code that had the bug, or it's just a test that passes. Check that this one does. `git restore` can take a file from any commit (`--source`), so bring back Sam's broken `kitargs.py` from 01-08-04:

```
git log --oneline --grep="^Simplify take_flag"
git restore --source 34ae632 kitargs.py
.venv/bin/python -m pytest -q tests/test_cli.py
```

(Use the id your `git log` prints.) One test fails, the one with `--json` after the file name, and its report includes the `LookupError` traceback from 01-08-04. Then put `kitargs.py` back with `git restore kitargs.py`, which takes it from the last commit again.

The three scripts are tests now, so remove them, check, and commit:

```
git rm check_filter.py check_pack.py check_json_flag.py
.venv/bin/python run_checks.py
git add tests
git commit -m "Turn the filter, pack and --json checks into tests"
git push
```

`run_checks.py` ends `5 of 5 passed`: `check_bases.py`, `check_can_match.py`, `check_top.py`, Ruff and `pytest`.

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_cli.py" stdout="2 passed" -- tests/test_cli.py should run count.py with --json in both places.
run "cd kit; git status --porcelain kitargs.py" without="kitargs.py" -- Put kitargs.py back after checking the test fails on the old code (git restore kitargs.py).
run "cd kit; git cat-file -e HEAD:check_filter.py" exit=128 -- check_filter.py should be removed in a commit.
run "cd kit; git cat-file -e HEAD:check_pack.py" exit=128 -- check_pack.py should be removed in a commit.
run "cd kit; git cat-file -e HEAD:check_json_flag.py" exit=128 -- check_json_flag.py should be removed in a commit.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="5 of 5 passed" -- run_checks.py should run three checks, Ruff and pytest.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Commit the tests and push.
```

## Your turn: an oracle for to_base

`check_bases.py` (01-03-01) checks `bases.to_base(n, base)` for every `n` up to 4096 in every base from 2 to 16, and, like the others, exits 0 whatever it finds. Write `tests/test_bases.py` with:

1. Hand-picked **edge cases**, with expected values from the definition of place value: where the number of digits changes (in base 2: 1 and 2; in base 16: 15, 16, 255, 256), and zero.
2. A sweep with an **inverse** as the oracle: `int(digits, base)` must give `n` back, and for bases 2, 8 and 16 the digits must equal Python's own `format(n, "b")`, `"o"`, `"x"`.

Judge it with two breaks in `bases.py`, one at a time, putting it back after each: change `if n == 0:` to `if False:` (zero gives empty text), and `while n > 0:` to `while n > 1:`. Each must fail at least one of your tests. Then remove `check_bases.py` and commit.

```hints
nudge: The edge cases are a table of (n, base, expected text): parametrize. The sweep is check_bases.py's loop, with assert where it counted differences.
concept: Expected digits for edges come from place value (01-03-01): 16 in base 16 is "10", because it's one sixteen and no units. For the sweep, int(to_base(n, base), base) == n is the inverse check; it's weak on its own (it can't see "010" for 8), so add the format() comparison for bases 2, 8, 16.
shape: EDGES = [(0, 2, "0"), (1, 2, "1"), (2, 2, "10"), (15, 16, "f"), (16, 16, "10"), ...]; test_edges(n, base, expected) asserts to_base(n, base) == expected. test_round_trip(base) parametrized over range(2, 17), looping n over range(4097), asserting int(digits, base) == n and, for bases in LETTERS, digits == format(n, LETTERS[base]).
answer: tests/test_bases.py:
~~~python
import pytest

from bases import to_base

# Python's own spelling of a number in the bases it has a letter for.
LETTERS = {2: "b", 8: "o", 16: "x"}

# Where digits change: zero, one, the largest one-digit number, the first
# two-digit one, and the same again one place up.
EDGES = [
    (0, 2, "0"),
    (1, 2, "1"),
    (2, 2, "10"),
    (7, 8, "7"),
    (8, 8, "10"),
    (15, 16, "f"),
    (16, 16, "10"),
    (255, 16, "ff"),
    (256, 16, "100"),
]


@pytest.mark.parametrize(("n", "base", "expected"), EDGES)
def test_edges(n, base, expected):
    assert to_base(n, base) == expected


# int(text, base) undoes to_base: reading the digits back must give n.
@pytest.mark.parametrize("base", range(2, 17))
def test_round_trip(base):
    for n in range(4097):
        digits = to_base(n, base)
        assert int(digits, base) == n, (n, digits)
        if base in LETTERS:
            assert digits == format(n, LETTERS[base]), n
~~~
24 tests. The zero break fails test_edges for 0 and every round trip (int("", base) raises ValueError, which pytest reports as a failure too). The n > 1 break drops a leading 1 digit, so it fails the edges 1, 2, 8, 16 and 256, and every round trip (20 tests). Then git rm check_bases.py, git add tests, commit, push; run_checks.py reports 4 of 4. The tempting slip is relying on the round trip alone: it accepts any text that reads back to n, including the empty text for 0 if int() accepted it, so the edge cases and format() do work the inverse can't.
```

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_bases.py" stdout="passed" without="failed" -- tests/test_bases.py should pass.
run "cd kit; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; src = pathlib.Path('bases.py').read_text(encoding='utf-8'); muts = [('if n == 0:', 'if False:'), ('while n > 0:', 'while n > 1:')]; run = lambda code: (lambda t: (pathlib.Path(t.name, 'tests').mkdir(), shutil.copy('tests/test_bases.py', pathlib.Path(t.name, 'tests')), pathlib.Path(t.name, 'bases.py').write_text(code, encoding='utf-8'), subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'tests'], cwd=t.name, capture_output=True).returncode, t.cleanup())[3])(tempfile.TemporaryDirectory()); print(run(src) == 0, [run(src.replace(o, n, 1)) != 0 if o in src else 'cannot mutate' for o, n in muts])\"" stdout="True [True, True]" -- Your tests should pass on bases.py and fail on each of the two broken versions.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; out = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--collect-only', 'tests/test_bases.py'], capture_output=True, text=True).stdout; print(out.count('test_bases.py::') >= 10)\"" stdout="True" -- tests/test_bases.py should have hand-picked edge cases as well as the sweep (at least 10 tests).
run "cd kit; git cat-file -e HEAD:check_bases.py" exit=128 -- check_bases.py should be removed in a commit.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="4 of 4 passed" -- run_checks.py should run two checks, Ruff and pytest.
```

**What these checks establish, and what they don't.** They check that three scripts that could never fail became tests that do, and that each new test file catches a planted break at a boundary or in the logic. The `to_base` check runs your tests against two broken versions in a temporary folder, as 01-09-01's did. They can't tell whether your oracle is truly independent of the code. A copy of `to_base` used as its own oracle would pass the sweep and fail none of the breaks it shares. They also can't tell whether your edge cases are the right ones, only that they catch these two breaks. Ask of every oracle: if the code had this bug, would the oracle have it too?

## What you can do now

- A check must **fail by its exit status**, not only in its printed words, or nothing automatic can tell.
- An **oracle** is a source of right answers that doesn't come from the code under test: the specification by hand, a simpler implementation, a trusted one, an inverse, or a property. It's only as good as its independence.
- Bugs cluster at **boundaries**: test both sides of every edge (smallest, largest, one past each, zero, empty, one), and that errors are raised where they should be (`pytest.raises(…, match=…)`).
- A bug report becomes a **reproduction**, then a **regression test** that runs the program the way the user did, and must fail on the old code (`git restore --source OLD FILE` lets you check).

```predict
question: You're writing tests for a function that sorts a list of names "the way a phone book does" (ignoring case and accents). There's no simpler implementation to compare with. What oracles and edge cases would you use?
explain: Oracles: a handful of hand-written examples from the specification ("Émile" between "Emil" and "Emma"; "adam" before "Bob"); properties every right answer has (the output is a rearrangement of the input: same names, same count; it's in order by the rule; sorting it again changes nothing); and a slow but obviously correct version for small lists (try every ordering of 4 names and keep the one in order). Edge cases: an empty list, one name, two names equal except for case or accents, duplicates, names already sorted, sorted backwards, and a name with characters outside the alphabet.
```

**Next:** 01-09-03 is about tests you can trust from one run to the next: tests that give the same result every time (determinism), that don't depend on each other or on where you run them from (isolation), and fixtures, `pytest`'s way to give each test what it needs. One of today's tests passes only when it's run from inside `kit`. You'll find out which.
