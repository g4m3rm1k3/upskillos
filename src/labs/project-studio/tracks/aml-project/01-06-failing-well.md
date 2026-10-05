---
title: 1.6 — When Things Go Wrong: Failing Well
runtime: python
---

Run the report on a file that doesn't exist, or on a file with a mistake in it, and it crashes with a traceback. A traceback is perfect for *you*: it shows exactly which line failed and how the program got there. For someone who just wants their morning report, it's a wall of text that doesn't say what to do. And there's a worse problem, which you'll see in the first step: when it crashes, the CI system can't tell a broken file from a failing test.

This lesson makes the tool **fail well**: one clear line saying what's wrong and where, on the right output, with an exit code that means something. Along the way you'll see how Python's exceptions actually travel, and write an exception type of your own.

## Three ways to fail

Make a file with a mistake in it, the kind a real CI export produces when a test is interrupted. Create `data/broken_runs.csv`:

```text file=data/broken_runs.csv
run,date,test,seconds,result
1,2026-10-01,test_a,1.5,pass
2,2026-10-02,test_a,n/a,pass
```

Run the report on it, and on a file that doesn't exist:

```powershell
.venv\Scripts\python -m citools data/broken_runs.csv
$LASTEXITCODE
.venv\Scripts\python -m citools nope.csv
$LASTEXITCODE
```

```text
Traceback (most recent call last):
  ...
  File "C:\Users\you\Documents\ci-toolkit\citools\runs.py", line 17, in group_by_test
    seconds_by_test[test].append(float(row["seconds"]))
                                 ~~~~~^^^^^^^^^^^^^^^^
ValueError: could not convert string to float: 'n/a'
1
Traceback (most recent call last):
  ...
FileNotFoundError: [Errno 2] No such file or directory: 'nope.csv'
1
```

A file whose header says `secs` instead of `seconds` gives a third: `KeyError: 'seconds'`.

```predict
question: The report already uses exit code 1 when a test is failing now (lesson 0.7's challenge). What's the problem with these crashes also exiting with 1?
choice: There isn't one: both are failures
choice: A CI system can't tell "the report found a failing test" from "the report couldn't run at all"
choice: Exit code 1 means success on Windows
answer: A CI system can't tell "the report found a failing test" from "the report couldn't run at all"
explain: Python exits with 1 whenever a program ends with an uncaught exception. So right now exit code 1 means two completely different things: "your tests have a problem, go and look at test_a" and "the report itself is broken, nothing was checked". A team that sees 1 might go hunting for a failing test that doesn't exist. Exit codes are only useful if each one means one thing.
```

The fix: catch these errors, say what's wrong in one line, and exit with **2**, which already means "the report couldn't do its job" (a usage error, lesson 0.7). 1 keeps meaning "a test is failing now".

```check
run ".venv/Scripts/python -m citools data/broken_runs.csv" exit=1 stderr="ValueError: could not convert string to float: 'n/a'" label="the broken file crashes the report with a ValueError (for now)" -- Create data/broken_runs.csv with n/a as the seconds on its last line.
```

## Catch the missing file

Update `citools/report.py`: add `import sys` at the top, and wrap the loading in `try` / `except`:

```python file=citools/report.py
import sys

from citools.history import verdict
from citools.runs import group_by_test, load_runs
from citools.stats import failure_rate, mean, median

USAGE = "usage: python -m citools RUNS_CSV"


def main(argv):
    if len(argv) != 1:
        print(USAGE)
        return 2

    try:
        rows = load_runs(argv[0])
        seconds_by_test, results_by_test = group_by_test(rows)
    except FileNotFoundError:
        print(f"error: no such file: {argv[0]}", file=sys.stderr)
        return 2

    print(f"{'test':<15}{'runs':>5}{'failed':>8}{'median':>8}{'mean':>8}{'slowest':>9}  verdict")
    flaky = []
    slow = []
    outliers = []
    failing = []
    for test, seconds in seconds_by_test.items():
        results = results_by_test[test]
        print(f"{test:<15}{len(seconds):>5}{failure_rate(results):>8.0%}{median(seconds):>8.1f}"
              f"{mean(seconds):>8.2f}{max(seconds):>9.1f}  {verdict(results)}")
        if verdict(results) == "flaky":
            flaky.append(test)
        if median(seconds) > 5.0:
            slow.append(test)
        if mean(seconds) > 1.5 * median(seconds):
            outliers.append(test)
        if verdict(results) == "failing":
            failing.append(test)

    print()
    print("Needs attention:")
    print(f"  flaky: {', '.join(flaky)}")
    print(f"  slow (median over 5.0 s): {', '.join(slow)}")
    print(f"  outliers (mean over 1.5 x median): {', '.join(outliers)}")
    print(f"  failing now: {', '.join(failing)}")
    if failing:
        return 1
    return 0
```

```powershell
.venv\Scripts\python -m citools nope.csv
$LASTEXITCODE
```

```text
error: no such file: nope.csv
2
```

### How exceptions travel

When `open` can't find the file, it **raises** a `FileNotFoundError`. Raising stops the current function immediately, and the exception travels **up the call stack**: out of `open`, out of `load_runs`, back into `main`, one frame at a time (the frames a traceback lists, lesson 0.5).

At each frame, Python checks: is the line that's failing inside a **`try`** block? If it is, it looks at that block's **`except`** clauses, top to bottom, for one whose type matches the exception. The first match **catches** it: the exception stops travelling, and that `except` block runs instead. If nothing catches it all the way to the top, Python prints the traceback and exits with 1.

So here: `load_runs` has no `try`, so the exception passes straight through it, into `main`, where it's inside the `try`, and `except FileNotFoundError:` matches. The code after the failing line in the `try` block is skipped (`group_by_test` never runs), and the `except` block prints the message and returns 2.

**Catch only what you can handle.** `except FileNotFoundError:` catches exactly one kind of problem, the one this code knows how to explain. A bare `except:`, which catches *everything*, would also catch your own bugs, such as a `NameError` from a typo, and report them as "no such file", hiding them.

### Why `file=sys.stderr`

A program has two outputs. **stdout** (standard output) is for the program's results, the report. **stderr** (standard error) is for messages *about* the run: errors, warnings. In a terminal, both appear on screen. But they can be sent to different places: `python -m citools data/ci_runs.csv > report.txt` saves stdout to a file, while anything on stderr still shows on screen. If an error message went to stdout, it would end up saved as if it were the report. `print(..., file=sys.stderr)` sends a line to stderr.

```check
run ".venv/Scripts/python -m citools nope.csv" exit=2 stderr="error: no such file: nope.csv" label="a missing file gives one line on stderr and exit code 2" -- Wrap load_runs and group_by_test in try, with except FileNotFoundError: printing the message to sys.stderr and returning 2.
run ".venv/Scripts/python -m citools nope.csv" exit=2 without="error" label="the error message isn't on stdout" -- Pass file=sys.stderr to print.
run ".venv/Scripts/python -m pytest -q" stdout="passed" without="failed" label="the existing tests still pass"
```

## Test it

Add a test for the missing file to the end of `tests/test_report.py`. `capsys.readouterr()` gives stderr as `.err`, as well as stdout as `.out`:

```python file=tests/test_report.py
from citools.report import main

STILL_FAILING = """run,date,test,seconds,result
1,2026-10-01,test_a,1.0,pass
2,2026-10-02,test_a,1.0,fail
1,2026-10-01,test_b,1.0,pass
2,2026-10-02,test_b,1.0,pass
"""


def test_no_file_prints_usage(capsys):
    assert main([]) == 2
    assert "usage: python -m citools RUNS_CSV" in capsys.readouterr().out


def test_a_failing_test_fails_the_report(tmp_path, capsys):
    path = tmp_path / "runs.csv"
    path.write_text(STILL_FAILING)
    assert main([str(path)]) == 1
    out = capsys.readouterr().out
    assert "test_a" in out
    assert "failing now: test_a" in out


def test_missing_file(capsys):
    assert main(["no_such_file.csv"]) == 2
    captured = capsys.readouterr()
    assert captured.out == ""
    assert "error: no such file: no_such_file.csv" in captured.err
```

`captured.out == ""` checks that **nothing** went to stdout: the error is entirely on stderr, where it belongs.

```check
run ".venv/Scripts/python -m pytest tests/test_report.py" stdout="3 passed" label="test_report.py also checks the missing-file message, on stderr" -- Add test_missing_file to tests/test_report.py.
```

## Errors that say what's wrong with the data

The `ValueError` and `KeyError` come from deep inside `group_by_test`, and their messages talk about Python (`could not convert string to float`), not about the file. The function that's reading the rows is the one that knows *which line* of the file it's on, so it's the right place to turn them into an error that makes sense to the person who owns the file. Update `citools/runs.py`:

```python file=citools/runs.py
import csv


class DataError(Exception):
    """The runs file doesn't hold what the report needs."""


def load_runs(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def group_by_test(rows):
    seconds_by_test = {}
    results_by_test = {}
    for line, row in enumerate(rows, start=2):
        try:
            test = row["test"]
            seconds = float(row["seconds"])
            result = row["result"]
        except KeyError as error:
            raise DataError(f"line {line}: no {error} column") from None
        except (TypeError, ValueError):
            raise DataError(f"line {line}: seconds should be a number, got {row['seconds']!r}") from None
        if test not in seconds_by_test:
            seconds_by_test[test] = []
            results_by_test[test] = []
        seconds_by_test[test].append(seconds)
        results_by_test[test].append(result)
    return seconds_by_test, results_by_test
```

The report doesn't catch `DataError` yet (that's the next step), so call `group_by_test` directly:

```powershell
.venv\Scripts\python -c "from citools.runs import group_by_test, load_runs; group_by_test(load_runs('data/broken_runs.csv'))"
```

```text
Traceback (most recent call last):
  ...
citools.runs.DataError: line 3: seconds should be a number, got 'n/a'
```

### How it works

- **`class DataError(Exception):`** makes a new **type** of exception, called `DataError`, that is a kind of `Exception`. You'll write classes of your own in Chapter 7. For now, this line is the whole recipe for "an error that means *this*". The docstring says what it's for. Because it's its own type, code can catch *data* problems specifically, with `except DataError:`, without catching anything else.
- **`enumerate(rows, start=2)`** gives each row together with a counter: `(2, first row)`, `(3, second row)`, and so on, unpacked into `line, row`. It starts at 2 because line 1 of the file is the header, so the first row of data is line 2. Now the error can say exactly where to look.
- **One `try`, two `except`s.** Reading a row can fail two ways: a column that isn't there (`KeyError` from `row["seconds"]`), or a value that isn't a number (`ValueError` from `float("n/a")`, or `TypeError` from `float(None)`, which is what `DictReader` gives for a row that's missing values at the end). **`except (TypeError, ValueError):`** with a tuple catches either type.
- **`except KeyError as error:`** attaches the name `error` to the exception that was caught. A `KeyError` shown in an f-string is the missing key in quotes, `'seconds'`, so the message reads `no 'seconds' column`.
- **`raise DataError(...) from None`** raises the new error *instead of* the old one. Without `from None`, Python would print both tracebacks, the original `ValueError` and then *"During handling of the above exception, another exception occurred"*, which is noise once the new message says everything.
- **`{row['seconds']!r}`** shows the value as Python would write it in code (its **repr**): `'n/a'` in quotes, `None` as `None`. That makes an empty string `''` or a stray space `' 1.5'` visible, where plain `{...}` would print nothing you could see.

```check
run ".venv/Scripts/python -c \"from citools.runs import DataError, group_by_test, load_runs; group_by_test(load_runs('data/broken_runs.csv'))\"" exit=1 stderr="DataError: line 3: seconds should be a number, got 'n/a'" label="group_by_test raises DataError naming line 3 and the bad value" -- Define class DataError(Exception), number the rows with enumerate(rows, start=2) and raise DataError(...) from None in the except blocks.
run ".venv/Scripts/python -c \"from citools.runs import group_by_test; group_by_test([{'test': 'a', 'result': 'pass'}])\"" exit=1 stderr="DataError: line 2: no 'seconds' column" label="a missing column raises DataError naming the column"
```

## The report catches DataError

Add a second `except` to `main`, and import `DataError`:

```python file=citools/report.py
import sys

from citools.history import verdict
from citools.runs import DataError, group_by_test, load_runs
from citools.stats import failure_rate, mean, median

USAGE = "usage: python -m citools RUNS_CSV"


def main(argv):
    if len(argv) != 1:
        print(USAGE)
        return 2

    try:
        rows = load_runs(argv[0])
        seconds_by_test, results_by_test = group_by_test(rows)
    except FileNotFoundError:
        print(f"error: no such file: {argv[0]}", file=sys.stderr)
        return 2
    except DataError as error:
        print(f"error: {argv[0]}: {error}", file=sys.stderr)
        return 2

    print(f"{'test':<15}{'runs':>5}{'failed':>8}{'median':>8}{'mean':>8}{'slowest':>9}  verdict")
    flaky = []
    slow = []
    outliers = []
    failing = []
    for test, seconds in seconds_by_test.items():
        results = results_by_test[test]
        print(f"{test:<15}{len(seconds):>5}{failure_rate(results):>8.0%}{median(seconds):>8.1f}"
              f"{mean(seconds):>8.2f}{max(seconds):>9.1f}  {verdict(results)}")
        if verdict(results) == "flaky":
            flaky.append(test)
        if median(seconds) > 5.0:
            slow.append(test)
        if mean(seconds) > 1.5 * median(seconds):
            outliers.append(test)
        if verdict(results) == "failing":
            failing.append(test)

    print()
    print("Needs attention:")
    print(f"  flaky: {', '.join(flaky)}")
    print(f"  slow (median over 5.0 s): {', '.join(slow)}")
    print(f"  outliers (mean over 1.5 x median): {', '.join(outliers)}")
    print(f"  failing now: {', '.join(failing)}")
    if failing:
        return 1
    return 0
```

```powershell
.venv\Scripts\python -m citools data/broken_runs.csv
```

```text
error: data/broken_runs.csv: line 3: seconds should be a number, got 'n/a'
```

One line: which file, which line in it, what's wrong, and what the value was. Whoever owns that file can fix it without knowing any Python.

Notice the division of work. `runs.py` knows about rows and lines, so it **detects** the problem and describes it. `report.py` knows it's a command-line program, so it **decides** what happens: a message on stderr and exit code 2. A different program using `citools.runs`, say a web page in a later chapter, could catch the same `DataError` and show the message in red instead. Raise where you detect; handle where you know what to do.

```check
run ".venv/Scripts/python -m citools data/broken_runs.csv" exit=2 stderr="error: data/broken_runs.csv: line 3: seconds should be a number, got 'n/a'" label="the report explains the broken file in one line and exits with 2" -- Import DataError from citools.runs and add except DataError as error: to main.
run ".venv/Scripts/python -m citools data/ci_runs.csv" stdout="Needs attention:" label="a good file still gives the full report"
```

## Tests for bad data

Add tests for both data errors to `tests/test_runs.py`. They call `group_by_test` with rows written straight into the test, as dictionaries, which is exactly what `load_runs` produces, so no file is needed:

```python file=tests/test_runs.py
import pytest

from citools.runs import DataError, group_by_test, load_runs

CSV = """run,date,test,seconds,result
1,2026-10-01,test_a,1.5,pass
1,2026-10-01,test_b,2.0,fail
2,2026-10-02,test_a,1.7,pass
"""


def test_load_and_group(tmp_path):
    path = tmp_path / "runs.csv"
    path.write_text(CSV)
    rows = load_runs(path)
    assert len(rows) == 3
    seconds_by_test, results_by_test = group_by_test(rows)
    assert seconds_by_test == {"test_a": [1.5, 1.7], "test_b": [2.0]}
    assert results_by_test == {"test_a": ["pass", "pass"], "test_b": ["fail"]}


def test_seconds_that_arent_a_number():
    rows = [{"test": "test_a", "seconds": "1.5", "result": "pass"},
            {"test": "test_a", "seconds": "n/a", "result": "pass"}]
    with pytest.raises(DataError, match="line 3: seconds should be a number, got 'n/a'"):
        group_by_test(rows)


def test_a_missing_column():
    with pytest.raises(DataError, match="line 2: no 'seconds' column"):
        group_by_test([{"test": "test_a", "result": "pass"}])
```

`match=` is a **regular expression**, a pattern language for text (you'll meet it properly in Chapter 4). For plain words and quotes like these it simply means "the message contains this".

```check
run ".venv/Scripts/python -m pytest tests/test_runs.py" stdout="3 passed" label="test_runs.py checks both data errors" -- Add the two tests, and import pytest and DataError at the top.
```

## Try it

| Change | What to notice |
|---|---|
| `.venv\Scripts\python -m citools data/ci_runs.csv > report.txt`, then open `report.txt` | The report, saved. Now try `nope.csv > report.txt`: the error still appears on screen, and `report.txt` is empty. |
| In `report.py`, replace `except FileNotFoundError:` with `except Exception:`, then misspell `group_by_test` as `group_by_tset` and run with a good file | `error: no such file`, for a file that exists: the broad `except` swallowed your `NameError`. Undo both with `git restore citools/report.py`. |
| Remove `from None` in `runs.py` and run the broken file with `python -c` as above | Two tracebacks joined by *During handling of the above exception*. Put it back. |
| In `data/broken_runs.csv`, change `n/a` to ` 1.5` (with a leading space) | It works: `float(" 1.5")` ignores surrounding spaces. Change it to `1,5` (a comma): `DictReader` sees an extra column, and the result moves along by one. |
| `python -c "print(repr('n/a'), repr(''), repr(None))"` | `'n/a' '' None`: what `!r` shows. |

## Your turn: results must be pass or fail

**No code is shown in this step.** Some CI systems record a third result, `skipped`, or write `Pass` with a capital letter. Right now `group_by_test` accepts any result at all, and the report would quietly count a `skipped` as not failing. Make it refuse:

- `group_by_test` raises `DataError` with the message `line N: result should be pass or fail, got 'skipped'` (with the actual line number and value) for any result that isn't exactly `pass` or `fail`;
- add a test for it to `tests/test_runs.py`, named so it says what it checks;
- the whole suite passes, and `tools/mutants.py` still catches all five bugs;
- commit, with a message that mentions **errors**, and leave nothing uncommitted.

```hints
nudge: The check belongs in group_by_test, after the row's values have been read, before they're added to the groups.
concept: in works on a tuple: result not in ("pass", "fail") is True for anything other than exactly those two strings. The check doesn't need a try: nothing raises an exception here; your code decides the value is wrong and raises one itself.
shape: After the try/except block: if result not in ("pass", "fail"): raise DataError(f"line {line}: result should be pass or fail, got {result!r}"). The test: with pytest.raises(DataError, match="line 2: result should be pass or fail, got 'skipped'"): group_by_test([{"test": "test_a", "seconds": "1.0", "result": "skipped"}]).
answer: In `group_by_test`, right after the `except` blocks:
~~~python
        if result not in ("pass", "fail"):
            raise DataError(f"line {line}: result should be pass or fail, got {result!r}")
~~~
At the end of `tests/test_runs.py`:
~~~python


def test_a_result_that_isnt_pass_or_fail():
    with pytest.raises(DataError, match="line 2: result should be pass or fail, got 'skipped'"):
        group_by_test([{"test": "test_a", "seconds": "1.0", "result": "skipped"}])
~~~
Then `git add .` and `git commit -m "Report bad data and missing files as errors"`. There's no `from None` on this `raise`: it isn't inside an `except`, so there's no earlier exception to hide.
```

```check
run ".venv/Scripts/python -c \"from citools.runs import group_by_test; group_by_test([{'test': 'a', 'seconds': '1', 'result': 'pass'}, {'test': 'a', 'seconds': '1', 'result': 'Pass'}])\"" exit=1 stderr="DataError: line 3: result should be pass or fail, got 'Pass'" label="a result of Pass on line 3 raises the DataError" -- After reading the row, check result not in ("pass", "fail") and raise DataError with the line and the value.
run ".venv/Scripts/python -c \"from citools.runs import group_by_test; print(group_by_test([{'test': 'a', 'seconds': '1', 'result': 'pass'}, {'test': 'a', 'seconds': '2', 'result': 'fail'}]))\"" stdout="({'a': [1.0, 2.0]}, {'a': ['pass', 'fail']})" label="pass and fail are still accepted"
contains tests/test_runs.py "result should be pass or fail" label="test_runs.py tests the new error" -- Add a test using pytest.raises(DataError, match="...result should be pass or fail...").
run ".venv/Scripts/python -m pytest" stdout="passed" without="failed" label="the whole test suite passes"
run ".venv/Scripts/python tools/mutants.py" stdout="5 of 5 bugs caught" label="the mutation check still catches all five bugs"
git-message "error" -- Commit with a message that mentions errors.
git-clean -- Run git add . and commit, so nothing is left uncommitted.
```

## What you've built in this chapter

The report from Chapter 0 is now a real project:

```text
ci-toolkit/
├── .gitignore            .venv, __pycache__ and *.egg-info stay out of the history
├── README.md             what it is and how to run it
├── pyproject.toml        the project's name, version and package
├── requirements.txt      pytest, pinned, plus the project itself, editable
├── citools/              the package
│   ├── __init__.py
│   ├── __main__.py       python -m citools: argv in, exit code out
│   ├── report.py         main(argv): the report, and what to do about errors
│   ├── runs.py           reading and grouping rows, and DataError
│   ├── stats.py          mean, median, failure_rate
│   └── history.py        flips, verdict, since_last_failure
├── tests/                21 tests, run by pytest
├── tools/mutants.py      checks that the history tests catch real bugs
├── data/
└── explore/              every small program from Chapters 0 and 1
```

Anyone given this folder can rebuild your environment with two commands, run the report from anywhere, run the tests, and read the history of every change. That's what *a project* means, and every chapter from here builds on it.

- **Exceptions travel up the call stack** until an `except` of the matching type catches them; uncaught, they print a traceback and exit with 1. Catch only what you can explain.
- **stdout** is for results, **stderr** for messages about the run.
- A **custom exception** (`class DataError(Exception):`) lets callers catch exactly one kind of problem. Raise it where you **detect** the problem, with the context only that code knows (the line, the value); handle it where you know what to **do**.
- **Exit codes** mean one thing each: 0 all good, 1 a test is failing now, 2 the report couldn't run.

**Next chapter: pandas, rebuilt by hand.** The CI history grows from 90 rows to 3,000, with crashes recorded as missing values, and your grouping loop starts to feel slow and long-winded. That's when pandas arrives, and you'll check every answer it gives against the code you've written.
