---
title: "What a Test Is: Assertions, Evidence, and Tests That Can Fail"
runtime: python
---

In 01-08-02, `run_checks.py` printed `8 of 8 passed` for a change that counted words twice. The checks had been edited so that they couldn't see the bug. In 01-08-04 it printed `8 of 8 passed` for a change that crashed `count`, because no check ran `count` that way. Both times, "all checks pass" was a claim that sounded like evidence. This module is about telling the two apart. A **test** is evidence only if it could have failed: it states what correct means, runs the code, and fails loudly when the code is wrong. This lesson turns Kit's hand-made `check_counts.py` into tests run by `pytest`, Python's most used test tool. Then it does what this lesson is really about: it breaks the code on purpose, to find out whether each test notices.

**By the end you can:**

- Write tests as functions with `assert`, and run them with `pytest`.
- Turn a table of examples into one test per example with `@pytest.mark.parametrize`.
- Judge a test by breaking the code it tests, and read `pytest`'s report of what failed and why.
- Recognise a tautological test, one that compares the code with itself and so can't fail.

**You need:** 01-01-03 and 01-01-04 (`check_counts.py`, the definitions of a word and a line), 01-06-05 (installing packages into `.venv`), 01-08-04 (the pre-commit hook). Commands run inside `kit`.

## A claim that can fail

A test has three parts: an input, the result a correct program gives for it (the **expected** result), and a comparison of the two that stops loudly if they differ. Python's **`assert`** statement is that comparison. It does nothing if its condition is true and raises `AssertionError` if it's false:

```
.venv/bin/python -c "assert 1 + 1 == 3, 'arithmetic'"
```

(On Windows, `.venv/Scripts/python`.) The traceback ends:

```
AssertionError: arithmetic
```

The text after the comma is the message to show when it fails. `check_counts.py` is made of comparisons like this, with its own loop, its own `FAIL:` lines and its own count of passes. Every one of Kit's `check_*.py` scripts reinvents that reporting slightly differently. A **test runner** does it once: it finds the tests, runs each one separately, catches every failure, reports what was compared, and exits with status 1 if anything failed. Install `pytest`, pinned to one version so that everyone sees the same output (01-06-04 did the same for Ruff):

```
.venv/bin/python -m pip install pytest==9.2.0
.venv/bin/python -m pytest --version
```

```
pytest 9.2.0
```

```check
run "cd kit; .venv/Scripts/python -m pytest --version" stdout="pytest 9.2.0" -- Install pytest 9.2.0 into kit's .venv.
```

## A first test file

`pytest` looks for files named `test_*.py` and runs every function in them whose name starts with `test_`. Each such function is one test. It passes if it returns, and fails if anything in it raises an exception, which is what a false `assert` does. Make a `tests` folder and start with three of `check_counts.py`'s word examples:

```python file=kit/tests/test_count.py
from count import measure


# Each test runs the code on one input and asserts what a correct count is.
def test_one_word():
    assert measure(b"hello", "utf-8")["words"] == 1


def test_words_split_by_a_space():
    assert measure(b"hello world\n", "utf-8")["words"] == 2


def test_a_dash_is_a_word():
    assert measure(b"a - b", "utf-8")["words"] == 3
```

Each name says what the test claims, so a failure report tells you what broke before you read any code. Save it and run `pytest` through the environment's Python (`python -m pytest`, as with Ruff, which also puts `kit` itself on the import path, so `from count import measure` works):

```
.venv/bin/python -m pytest
```

```
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\Users\you\swe\kit
configfile: pyproject.toml
collected 3 items

tests\test_count.py ...                                                  [100%]

============================== 3 passed in 0.15s ==============================
```

Each `.` is a test that passed. `-v` gives a line per test instead (`tests/test_count.py::test_one_word PASSED`). `pytest` writes a `.pytest_cache` folder for itself, with its own `.gitignore` inside, as Python's `.venv` does (01-08-01), so Git ignores it already.

```check
run "cd kit; .venv/Scripts/python -m pytest -q" stdout="3 passed" -- tests/test_count.py should hold three passing tests.
```

## Every example, every size

Three examples is a start. `check_counts.py` has 26, in four tables, each checked whole and in pieces of 1, 2, 3 and 4096 bytes. Writing 26 functions by hand would be silly. **`@pytest.mark.parametrize`** runs one test function once per row of a table, passing the row's values as arguments. Replace `tests/test_count.py` with the whole of `check_counts.py`, as tests:

```python file=kit/tests/test_count.py
import pytest

from count import feed, finish, measure, start

# A word is a run of bytes that are not ASCII whitespace,
# as long as it can go: whitespace or the edge of the data on both sides.
WORD_EXAMPLES = [
    (b"", 0),
    (b"hello", 1),
    (b"hello world\n", 2),
    (b"  two   spaces  ", 2),
    (b"tab\tand\r\nwindows", 3),
    (b"\n\n\n", 0),
    (b"one\xe2\x80\x94two three", 2),
    (b"a - b", 3),
]

# A line is a run of bytes ending in a newline, or a final run of
# bytes after the last newline, if there is one.
LINE_EXAMPLES = [
    (b"", 0),
    (b"a", 1),
    (b"a\n", 1),
    (b"a\nb", 2),
    (b"\n\n", 2),
    (b"a\r\nb\r\n", 2),
    (b"a\rb", 1),
]

# Characters in UTF-8; None when the bytes aren't UTF-8 text.
CHARACTER_EXAMPLES = [
    (b"", 0),
    (b"h\xc3\xa9llo\n", 6),
    (b"\xe2\x80\x94", 1),
    (b"h\xe9llo", None),
    (b"h\xc3", None),
]

# The longest line's length in bytes, not counting its newline.
LONGEST_EXAMPLES = [
    (b"", 0),
    (b"a\n", 1),
    (b"abc\nde\n", 3),
    (b"ab\nabcd", 4),
    (b"\n\n", 0),
    (b"ab\r\n", 3),
]

SIZES = [1, 2, 3, 4096]


# Feed data to the state machine in pieces of the given size.
def stream_counts(data, size):
    state = start("utf-8")
    for i in range(0, len(data), size):
        state = feed(state, data[i : i + size])
    return finish(state)


# The whole data at once, then in pieces of every size, must give expected.
def assert_counts(name, data, expected):
    assert measure(data, "utf-8")[name] == expected
    for size in SIZES:
        assert stream_counts(data, size)[name] == expected, f"in pieces of {size}"


@pytest.mark.parametrize(("data", "expected"), WORD_EXAMPLES)
def test_words(data, expected):
    assert_counts("words", data, expected)


@pytest.mark.parametrize(("data", "expected"), LINE_EXAMPLES)
def test_lines(data, expected):
    assert_counts("lines", data, expected)


@pytest.mark.parametrize(("data", "expected"), CHARACTER_EXAMPLES)
def test_characters(data, expected):
    assert_counts("characters", data, expected)


@pytest.mark.parametrize(("data", "expected"), LONGEST_EXAMPLES)
def test_longest(data, expected):
    assert_counts("longest", data, expected)
```

The tables and `stream_counts` are `check_counts.py`'s. What's gone is the bookkeeping: the loop over examples, `passed += 1`, the `FAIL:` lines, `sys.exit(1)`. `assert_counts` is a helper, not a test (its name doesn't start with `test_`). The message `f"in pieces of {size}"` says which size failed. Save it and run `.venv/bin/python -m pytest`:

```
tests\test_count.py ..........................                           [100%]

============================== 26 passed in 0.19s ==============================
```

Twenty-six tests, one per example, each named after its row: `-v` shows `tests/test_count.py::test_words[hello-1] PASSED` and so on. One example failing no longer hides the others, and each is reported on its own.

```check
run "cd kit; .venv/Scripts/python -m pytest -q" stdout="26 passed" -- tests/test_count.py should run all 26 examples as separate tests.
run "cd kit; .venv/Scripts/python -m pytest -q --collect-only" stdout="test_words[hello-1]" -- The word examples should be parametrized, one test each.
run "cd kit; .venv/Scripts/ruff check tests" stdout="All checks passed!" -- The tests should pass Ruff too.
```

## Would it fail if the code were wrong?

Twenty-six passing tests show that `count` agrees with 26 examples. They show it's *correct* only as far as they'd fail if it weren't. The direct way to find out is to make the code wrong on purpose and watch. In `count.py`'s `feed`, the line `words -= 1` takes off the word that crosses from one chunk into the next (01-08-02). Change it to

```
        words -= 0
```

so that the fix does nothing, save, and run `.venv/bin/python -m pytest`:

```predict
question: Which tests will fail with the boundary fix switched off?
choice: All 26: the word count is wrong everywhere
choice: Some word tests: the ones whose words get cut by small pieces
choice: None: measure counts the whole data at once
answer: Some word tests: the ones whose words get cut by small pieces
explain: Each word test also feeds the data in pieces of 1, 2 and 3 bytes, so any example with a word longer than one byte has a word cut in two somewhere, and that word is counted twice. The examples with no words (b"", b"\n\n\n") still pass, and so do the line, character and longest tests, whose code wasn't touched.
```

```
...
name = 'words', data = b'hello', expected = 1

    def assert_counts(name, data, expected):
        assert measure(data, "utf-8")[name] == expected
        for size in SIZES:
>           assert stream_counts(data, size)[name] == expected, f"in pieces of {size}"
E           AssertionError: in pieces of 1
E           assert 5 == 1

tests\test_count.py:64: AssertionError
...
=========================== short test summary info ===========================
FAILED tests/test_count.py::test_words[hello-1] - AssertionError: in pieces of 1
FAILED tests/test_count.py::test_words[hello world\n-2] - AssertionError: in ...
FAILED tests/test_count.py::test_words[  two   spaces  -2] - AssertionError: ...
FAILED tests/test_count.py::test_words[tab\tand\r\nwindows-3] - AssertionErro...
FAILED tests/test_count.py::test_words[one\xe2\x80\x94two three-2] - Assertio...
======================== 5 failed, 21 passed in 0.36s =========================
```

Read the report from the bottom. The summary lists each failed test by name and parameters. Above it, for each failure, `pytest` shows the code with `>` at the failing line, the values of the arguments (`data = b'hello', expected = 1`), and `E` lines with what was compared: `assert 5 == 1`, in pieces of 1. `pytest` rewrites `assert` statements so that a failure shows both sides, which is why a plain `assert` is enough and there's no `assertEqual` to remember. `hello`, fed one byte at a time, gives 5 words: exactly 01-08-02's bug, and the tests say so without your having to guess.

This is the most important habit in the module: **judge a test by whether it fails when the code is wrong.** Making a deliberate small change and checking that some test fails is called **mutation testing**. Tools can do it automatically (module 8.6). Done by hand on the line you care about, it takes a minute. Put the line back with `git restore count.py`, and check that all 26 pass again.

```check
contains kit/count.py "words -= 1" -- Put the boundary fix back (git restore count.py).
run "cd kit; .venv/Scripts/python -m pytest -q" stdout="26 passed" -- With the fix back, all 26 tests should pass.
```

## A test that can't fail

Here's a test that looks reasonable. Add it as `tests/test_same.py`:

```python file=kit/tests/test_same.py
import io

from count import count_stream, measure


# Reading in chunks should give the same counts as counting all the bytes.
def test_stream_agrees_with_measure():
    data = b"tab\tand\r\nwindows"
    assert count_stream(io.BytesIO(data), "utf-8") == measure(data, "utf-8")
```

It passes. Now switch the boundary fix off again (`words -= 0`) and run only this file, `.venv/bin/python -m pytest tests/test_same.py`:

```
============================== 1 passed in 0.10s ==============================
```

It still passes, with `count` broken. Both sides of its `assert` come from the same code: `count_stream` reads the 18 bytes in one chunk of up to 65536, so it does exactly what `measure` does, bug included. The test compares the code with itself. A test like that is **tautological**: it can't fail, whatever the code does, so its passing is no evidence of anything. The fix is the one `test_count.py` already uses: an expected value from outside the code, written down from the definition (01-01-03), here `3` words.

Tautologies are rarely this visible. The usual forms:

- **Expected computed by the code under test:** `expected = measure(data)["words"]`, then `assert measure(data)["words"] == expected`.
- **An assertion that's always true:** `assert counts` (a non-empty dictionary is truthy, 01-02-01), `assert result is not None` when the function always returns something.
- **A copy of the implementation in the test,** which repeats the code's mistakes.
- **A test that never reaches its `assert`,** for example because it loops over an empty list.

All four pass whatever the code does, and all four are caught the same way: break the code and see whether the test notices. Delete `tests/test_same.py`, and put `count.py` back with `git restore count.py`.

```check
missing kit/tests/test_same.py -- Delete the tautological test.
contains kit/count.py "words -= 1" -- Put the boundary fix back (git restore count.py).
run "cd kit; .venv/Scripts/python -m pytest -q" stdout="26 passed" -- All 26 real tests should pass.
```

## Tests replace the checks

`tests/test_count.py` does everything `check_counts.py` did, and reports it better, so remove the old one rather than keep two copies that can drift apart. Then make `run_checks.py` run `pytest`, so that the pre-commit hook (01-08-04) runs the tests before every commit. In `run_checks.py`, after the line that appends the Ruff command, add:

```
COMMANDS.append([sys.executable, "-m", "pytest", "-q"])
```

Then:

```
git rm check_counts.py
.venv/bin/python run_checks.py
```

```
pass check_bases.py
pass check_can_match.py
pass check_csv.py
pass check_filter.py
pass check_json_flag.py
pass check_pack.py
pass check_top.py
pass -m ruff check .
pass -m pytest -q
9 of 9 passed
```

Commit the change. The hook runs the same nine commands, `pytest` included, before letting the commit through:

```
git add tests run_checks.py
git commit -m "Turn check_counts.py into pytest tests"
git push
```

The commit's summary includes a line you might not expect: `rename check_counts.py => tests/test_count.py (55%)`. Git doesn't record renames. A commit is only a tree of files (01-08-01). When Git displays a commit, it notices that a deleted file and an added file are 55% alike, and reports them as one file renamed.

**What else, and why not.**

| Way to check code | Cost |
|---|---|
| Hand-made check scripts (`check_*.py`) | Every script reinvents running, reporting and exit status; one failure can hide the next |
| `unittest`, in Python's standard library | No install; classes and `self.assertEqual(...)` for every comparison; `pytest` runs these too |
| `pytest` | One package to install and pin; plain `assert`, clear failure reports, parametrize, fixtures (01-09-03) |
| Trying it by hand after each change | Nothing to write; nothing kept, and nobody repeats it the same way twice |

```check
run "cd kit; git cat-file -e HEAD:check_counts.py" exit=128 -- check_counts.py should be removed from the last commit (git rm check_counts.py).
run "cd kit; git cat-file -e HEAD:tests/test_count.py" -- tests/test_count.py should be committed.
contains kit/run_checks.py "\"-m\", \"pytest\"" -- run_checks.py should run pytest.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="9 of 9 passed" -- run_checks.py should run the seven checks, Ruff and pytest, all passing.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Commit and push (the hook runs pytest now).
```

## Your turn: csvtool's tests

`check_csv.py` (01-07-02) checks `csvtool.parse_csv` against RFC 4180's five examples and against 512 tables written by Python's own `csv` module. Turn it into `tests/test_csv.py`: one parametrized test per RFC example, and one test that compares `parse_csv` with Python's `csv` on the 512 tables. Then judge your tests, as above, by breaking `parse_csv` in two ways, one at a time:

1. In the line `field += '"'  # two quotes are one quote (rule 7)`, make it add two quotes instead of one.
2. Change `if state != FIELD_START or field or row:` to `if False:`, so that a last record without a line break is lost.

Each break must make at least one of your tests fail. Put `csvtool.py` back after each (`git restore csvtool.py`), remove `check_csv.py`, and commit.

```hints
nudge: The RFC examples are already a table of (text, expected records): that's exactly what parametrize takes. The 512 tables are a loop: one test can loop and assert inside.
concept: @pytest.mark.parametrize(("text", "expected"), RFC_EXAMPLES) over a test that asserts parse_csv(text) == expected. A second test loops over itertools.product(PIECES, repeat=3), writes each table with csv.writer into an io.StringIO, and asserts parse_csv(text) equals list(csv.reader(io.StringIO(text, newline=""))). Put text after the comma in that assert, so a failure shows which table.
shape: Copy RFC_EXAMPLES and PIECES from check_csv.py. test_rfc_example(text, expected) — one assert. test_agrees_with_python_csv() — the loop from check_csv.py, with assert in place of the differences counter. Then git rm check_csv.py; git add tests; git commit -m "Turn check_csv.py into pytest tests".
answer: tests/test_csv.py:
~~~python
import csv
import io
import itertools

import pytest

from csvtool import parse_csv

# RFC 4180's own examples (section 2), with the records they describe.
RFC_EXAMPLES = [
    ("aaa,bbb,ccc\r\nzzz,yyy,xxx\r\n", [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ("aaa,bbb,ccc\r\nzzz,yyy,xxx", [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ('"aaa","bbb","ccc"\r\nzzz,yyy,xxx\r\n', [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ('"aaa","b\r\nbb","ccc"\r\nzzz,yyy,xxx\r\n', [["aaa", "b\r\nbb", "ccc"], ["zzz", "yyy", "xxx"]]),
    ('"aaa","b""bb","ccc"\r\n', [["aaa", 'b"bb', "ccc"]]),
]

# Fields that need care, for tables written by Python's own csv module.
PIECES = ["", "a", "b c", ",", '"', 'x"y', "line\r\nbreak", "é"]


@pytest.mark.parametrize(("text", "expected"), RFC_EXAMPLES)
def test_rfc_example(text, expected):
    assert parse_csv(text) == expected


def test_agrees_with_python_csv():
    for row in itertools.product(PIECES, repeat=3):
        out = io.StringIO()
        csv.writer(out).writerows([list(row), ["first", "second", "third"]])
        text = out.getvalue()
        assert parse_csv(text) == list(csv.reader(io.StringIO(text, newline=""))), text
~~~
pytest reports 6 passed for this file (5 examples and the loop). The first break fails test_rfc_example for the "b""bb" example and the loop test; the second fails the example without a final CRLF. Then: git rm check_csv.py, git add tests, git commit -m "Turn check_csv.py into pytest tests", git push. run_checks.py now reports 8 of 8. The tempting slip is a test that only checks the shape, such as assert isinstance(parse_csv(text), list): it passes with both breaks, the same as test_same.py.
```

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_csv.py" stdout="passed" -- tests/test_csv.py should pass.
run "cd kit; .venv/Scripts/python -c \"import subprocess, sys; out = subprocess.run([sys.executable, '-m', 'pytest', '-q', '--collect-only', 'tests/test_csv.py'], capture_output=True, text=True).stdout; print(out.count('test_csv.py::') >= 5)\"" stdout="True" -- There should be a test for each RFC example: at least 5 tests in tests/test_csv.py.
run "cd kit; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; src = pathlib.Path('csvtool.py').read_text(encoding='utf-8'); a = chr(39); q = chr(34); muts = [('field += ' + a + q + a, 'field += ' + a + q + q + a), ('if state != FIELD_START or field or row:', 'if False:')]; run = lambda code: (lambda t: (pathlib.Path(t.name, 'tests').mkdir(), shutil.copy('kitargs.py', t.name), shutil.copy('tests/test_csv.py', pathlib.Path(t.name, 'tests')), pathlib.Path(t.name, 'csvtool.py').write_text(code, encoding='utf-8'), subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'tests'], cwd=t.name, capture_output=True).returncode, t.cleanup())[4])(tempfile.TemporaryDirectory()); print(run(src) == 0, [run(src.replace(o, n, 1)) != 0 if o in src else 'cannot mutate' for o, n in muts])\"" stdout="True [True, True]" -- Your tests should pass on csvtool.py, and fail on each of the two broken versions.
run "cd kit; git cat-file -e HEAD:check_csv.py" exit=128 -- check_csv.py should be removed in a commit.
run "cd kit; git cat-file -e HEAD:tests/test_csv.py" -- tests/test_csv.py should be committed.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="8 of 8 passed" -- run_checks.py should now run six checks, Ruff and pytest.
```

**What these checks establish, and what they don't.** They check that `pytest` is installed and runs Kit's tests, that the old check scripts are gone and committed as gone, and, most usefully, that your `test_csv.py` fails on two specific broken versions of `parse_csv`. That last check is itself a small mutation test. It can't tell you that your tests would catch *every* mistake: two mutations are a sample, not a proof. It also can't see whether your expected values came from the RFC or from running `parse_csv` and copying what it printed. That's the subtlest tautology, a test that only records what the code did. Write expected values from the specification, then run the code.

## What you can do now

- A **test** is an input, an **expected** result from outside the code, and a comparison that fails loudly. `assert` is the comparison; `pytest` finds `test_*` functions in `test_*.py` files, runs each, and reports both sides of every failed `assert`.
- `@pytest.mark.parametrize` turns a table of examples into one test per row.
- **Judge a test by breaking the code:** a deliberate small change (a mutation) that no test notices means the tests don't cover it.
- A **tautological** test compares the code with itself (or with nothing) and can't fail; its passing is not evidence.
- "All checks pass" is a **claim**; a test that would have failed on the wrong code is **evidence**.

```predict
question: An assistant adds a feature and reports "all 40 tests pass, including 12 new ones". What would you do before believing that the feature works?
explain: Read the new tests' expected values: do they come from the specification, or were they copied from what the new code printed? Look for the tautology patterns (expected computed by the code under test, assert result, loops over empty data). Then break the feature on purpose, for example reverse a condition in the new code, and run the tests: if none of the 12 fails, they don't test the feature. Passing tests are evidence only when they could have failed.
```

**Next:** 01-09-02 is about the hardest part of a test, the expected value: where it comes from when the right answer isn't obvious (an **oracle**), where bugs cluster (boundaries and edge cases), and turning a bug report into a test that keeps it fixed.
