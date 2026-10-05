---
title: 1.5 — Tests with pytest
runtime: python
---

Your checks so far are `assert` lines under `__name__` guards. They work, but only one module at a time; the first failing assert stops the rest; and an `AssertionError` says *which* line failed but not *what the values were*. The report itself, the part people actually run, has no checks at all.

**pytest** fixes all of that. You write ordinary functions whose names start with `test_`, containing ordinary `assert`s, and pytest finds them, runs every one, and for each failure shows you the values involved. This lesson moves your checks into a `tests` folder, tests the parts that read files and print, and ends with a question every tester eventually asks: *how do I know my tests are any good?*

## Your first test file

Create a folder `tests`, and in it `tests/test_stats.py`:

```python file=tests/test_stats.py
from citools.stats import mean, median


def test_mean():
    assert mean([1, 2, 3]) == 2


def test_median_odd_count():
    assert median([3, 1, 2]) == 2


def test_median_even_count():
    assert median([4, 1, 3, 2]) == 2.5
```

Run pytest with the environment's Python:

```powershell
.venv\Scripts\python -m pytest
```

```text
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\you\Documents\ci-toolkit
configfile: pyproject.toml
collected 3 items

tests\test_stats.py ...                                                  [100%]

============================== 3 passed in 0.02s ==============================
```

Each `.` is a test that passed.

### How pytest finds and runs tests

1. **Collect.** pytest searches the folder you run it from, and every folder inside it, for files named `test_*.py`, and in them for functions named `test_*`. It found three. (`rootdir` is where it started; it noticed your `pyproject.toml` too, where pytest settings can go.)
2. **Run** each test function on its own. A test **passes** if it returns normally, and **fails** if anything inside raises an exception: a failed `assert`, or any other error.
3. **Report**: one character per test, then a summary.

Every test is independent: a failure in one doesn't stop the others, so you see everything that's wrong at once.

**Why `python -m pytest` and not just `pytest`?** `-m` runs the pytest that belongs to *this* Python, the environment's, with `citools` installed in it, and like `python -m citools` it puts the current folder on `sys.path`. The plain `pytest` command would be whichever `pytest.exe` the shell finds first on `PATH`, which might belong to a different Python.

```check
run ".venv/Scripts/python -m pytest tests/test_stats.py" stdout="3 passed" label="pytest collects and passes the three tests in test_stats.py" -- Create tests/test_stats.py with the three test functions, then run .venv\Scripts\python -m pytest
```

## A test that fails

Change the even-count test to expect the wrong answer, 3, as if you'd misremembered how the median works:

```python file=tests/test_stats.py
from citools.stats import mean, median


def test_mean():
    assert mean([1, 2, 3]) == 2


def test_median_odd_count():
    assert median([3, 1, 2]) == 2


def test_median_even_count():
    assert median([4, 1, 3, 2]) == 3
```

```powershell
.venv\Scripts\python -m pytest
```

```text
tests\test_stats.py ..F                                                  [100%]

================================== FAILURES ===================================
___________________________ test_median_even_count ____________________________

    def test_median_even_count():
>       assert median([4, 1, 3, 2]) == 3
E       assert 2.5 == 3
E        +  where 2.5 = median([4, 1, 3, 2])

tests\test_stats.py:13: AssertionError
=========================== short test summary info ===========================
FAILED tests/test_stats.py::test_median_even_count - assert 2.5 == 3
========================= 1 failed, 2 passed in 0.05s =========================
```

**How to read it.** `F` marks the failed test. Below, pytest shows the test's code with `>` at the failing line, then the lines marked `E` explain it: **`assert 2.5 == 3`**, and *where 2.5 came from*: `median([4, 1, 3, 2])`. A plain `assert` in a script only says `AssertionError`. pytest shows the values because, as it imports a test file, it **rewrites** each `assert` statement to record the value of every part of the expression, so it can print them if the assert fails.

Now the important question: **is the bug in the code or in the test?** Here it's the test: the median of 1, 2, 3, 4 really is 2.5. A failing test means the code and the test disagree, and either can be wrong. Reading the failure, then deciding which one is right, is a skill you'll use constantly.

```check
run ".venv/Scripts/python -m pytest tests/test_stats.py" exit=1 stdout="assert 2.5 == 3" label="pytest reports the failing test with the values: assert 2.5 == 3" -- Change the last test's expected value to 3.
```

## Fix the test, and test more

Put `2.5` back, and add three more tests: a float result, an error, and the failure rate:

```python file=tests/test_stats.py
import pytest

from citools.stats import failure_rate, mean, median


def test_mean():
    assert mean([1, 2, 3]) == 2


def test_median_odd_count():
    assert median([3, 1, 2]) == 2


def test_median_even_count():
    assert median([4, 1, 3, 2]) == 2.5


def test_mean_of_timings():
    assert mean([2.2, 2.1, 2.2]) == pytest.approx(2.1667, abs=0.0001)


def test_mean_of_nothing():
    with pytest.raises(ValueError, match="empty"):
        mean([])


def test_failure_rate():
    assert failure_rate(["pass", "fail", "pass", "pass"]) == 0.25
```

```text
tests\test_stats.py ......                                               [100%]
============================== 6 passed in 0.02s ==============================
```

**How the two new tools work.**

- **`pytest.approx(2.1667, abs=0.0001)`** makes a value that compares equal to anything within 0.0001 of 2.1667. It's the tolerance comparison from lesson 0.2, built in: `mean([2.2, 2.1, 2.2])` is really `2.1666666666666665`, and comparing floats with plain `==` is exactly the trap you learned to avoid.
- **`with pytest.raises(ValueError, match="empty"):`** says "the code in this block must raise a `ValueError` whose message contains `empty`". If it does, the test passes. If it raises nothing, or a different exception, the test fails. Lesson 0.5 decided that `mean` should *refuse* an empty list; this test makes sure nobody quietly undoes that decision later. **`with`** here works like `with open(...)` in lesson 0.6: it sets something up for the indented block and finishes it afterwards, which here means checking what the block raised.

```check
run ".venv/Scripts/python -m pytest tests/test_stats.py" stdout="6 passed" label="all six tests in test_stats.py pass" -- Put 2.5 back, and add the three new tests with import pytest at the top.
```

## Retire the guard

`stats.py`'s checks now live in `tests/test_stats.py`, run by pytest, with better failure messages. Delete the `if __name__ == "__main__":` block at the end of `citools/stats.py`, so it's just the three functions:

```python file=citools/stats.py
def mean(values):
    if len(values) == 0:
        raise ValueError("mean() of an empty list")
    return sum(values) / len(values)


def median(values):
    in_order = sorted(values)
    middle = len(in_order) // 2
    if len(in_order) % 2 == 1:
        return in_order[middle]
    return (in_order[middle - 1] + in_order[middle]) / 2


def failure_rate(results):
    return results.count("fail") / len(results)
```

**Why keep tests in their own files?** Code that ships contains only what it needs to do its job; the tests live beside it, in `tests/`, and run whenever you or a CI system ask. A file of tests is also documentation: `test_mean_of_nothing` tells a reader what `mean([])` is supposed to do more precisely than any comment.

```check
lacks citools/stats.py "__main__" -- Delete the if __name__ == "__main__": block from citools/stats.py.
run ".venv/Scripts/python -m pytest tests/test_stats.py" stdout="6 passed"
```

## Testing code that reads files

`load_runs` reads a file. A test shouldn't depend on `data/ci_runs.csv`: if someone edits the data, the test breaks for no reason. It should make its own small file, with exactly the rows it needs. Create `tests/test_runs.py`:

```python file=tests/test_runs.py
from citools.runs import group_by_test, load_runs

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
```

```powershell
.venv\Scripts\python -m pytest
```

```text
tests\test_runs.py .                                                     [100%]
tests\test_stats.py ......                                               [100%]
============================== 7 passed in 0.03s ==============================
```

### How `tmp_path` works

The test function has a **parameter**, `tmp_path`, and nothing in your code passes it an argument. pytest does. Before calling a test, pytest looks at the names of its parameters, and for each one it knows, a **fixture**, it prepares a value and passes it in. `tmp_path` is a fresh, empty folder, created for this one test, somewhere in your user's temporary files. Every test that asks for it gets its own, so tests can never trip over each other's files.

- `tmp_path` is a **`Path`**, an object from Python's `pathlib` module that represents a file path. **`tmp_path / "runs.csv"`** uses `/` to join path parts, a path to a file called `runs.csv` inside that folder. (`Path` defines what `/` means for paths, the way strings define `*`.)
- **`path.write_text(CSV)`** creates the file with that text in it.
- The `"""..."""` string is a **triple-quoted string**, which can run over several lines: an easy way to write a whole small CSV file into a test.
- `==` between two dictionaries is true when they have the same keys with equal values, so one assert checks the whole grouping.

```check
run ".venv/Scripts/python -m pytest tests/test_runs.py" stdout="1 passed" label="test_runs.py builds its own CSV and checks the grouping" -- Create tests/test_runs.py as shown.
```

## Testing what the report prints

`main` prints a report and returns an exit code. Both are its behaviour, so test both. Create `tests/test_report.py`:

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
```

```text
tests\test_report.py ..                                                  [100%]
tests\test_runs.py .                                                     [100%]
tests\test_stats.py ......                                               [100%]
============================== 9 passed in 0.04s ==============================
```

**How it works.** **`capsys`** is another fixture: while the test runs, it **captures** everything printed, instead of letting it reach the terminal. `capsys.readouterr()` returns what's been captured so far, and `.out` is the printed text, as one string. `in` on two strings asks "does the first appear anywhere in the second?". A test can ask for several fixtures, like `tmp_path` and `capsys` here.

This is where last lesson's design pays off. Because `main` takes `argv` as a parameter and *returns* its exit code, a test can call it directly, as many times as it likes, with any arguments. If it called `sys.exit`, the first test would end the whole pytest run.

```check
run ".venv/Scripts/python -m pytest tests/test_report.py" stdout="2 passed" label="test_report.py checks the usage message and a failing run's exit code and output" -- Create tests/test_report.py as shown.
```

## Are the tests any good?

**This step: create the supplied checker and read it. No code yet.**

Every test passes. But passing tests prove less than they seem: a test file with one weak test passes too. How do you find out whether your tests would *notice* a bug?

Break the code on purpose, and see if the tests fail. That's called **mutation testing**: make a small change to the code (a **mutant**), the kind of mistake a person really makes, like `>` instead of `>=`, and run the tests. If they fail, the mutant is **caught**. If they still pass, your tests have a blind spot exactly there.

Click **Create provided tools/mutants.py** above.

```python file=tools/mutants.py provided
# Checks your tests by breaking citools/history.py on purpose, one small bug at a time, and
# running tests/test_history.py against each broken version. A good test file fails for every
# one of them. Your real files are never changed: each broken version is made in a temporary
# copy of the project. Run it from the ci-toolkit folder:
#   .venv\Scripts\python tools/mutants.py
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
TARGET = Path("citools") / "history.py"

# (what the bug is, the text it replaces, the text it puts in its place)
MUTANTS = [
    ("flips also compares the first run with the last", "range(1, len(results))", "range(0, len(results))"),
    ("two flips count as flaky", "flips(results) > 2", "flips(results) >= 2"),
    ("failing looks at the first run instead of the latest", 'results[-1] == "fail"', 'results[0] == "fail"'),
    ("a test with one failure counts as stable", 'results.count("fail") == 0', 'results.count("fail") <= 1'),
    ("a failure doesn't reset the streak", "            count = 0\n", "            count = count\n"),
]


def main():
    source = (PROJECT / TARGET).read_text()
    tests = PROJECT / "tests" / "test_history.py"
    if not tests.exists():
        print("tests/test_history.py doesn't exist yet.")
        return 1
    caught = 0
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / "project"
        shutil.copytree(PROJECT, copy, ignore=shutil.ignore_patterns(".venv", ".git", "__pycache__", "*.egg-info"))
        for name, old, new in MUTANTS:
            if old not in source:
                print(f"? {name}: can't find {old!r} in {TARGET}")
                continue
            (copy / TARGET).write_text(source.replace(old, new, 1))
            # -m puts the copy's folder first on sys.path, so it imports the broken copy of citools.
            result = subprocess.run(
                [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "tests/test_history.py"],
                cwd=copy, capture_output=True, text=True,
            )
            if result.returncode == 0:
                print(f"MISSED  {name}")
            else:
                caught += 1
                print(f"caught  {name}")
    print(f"{caught} of {len(MUTANTS)} bugs caught")
    return 0 if caught == len(MUTANTS) else 1


if __name__ == "__main__":
    sys.exit(main())
```

You can read all of it with what you know:

- **`MUTANTS`** is a list of **tuples** (lesson 0.7), each a description, a piece of text from `history.py`, and the buggy text to put in its place. Every one is a realistic mistake, and one of them is exactly the bug lesson 0.4's flip counter warned about.
- **`shutil.copytree`** copies the whole project into a temporary folder, skipping `.venv` and `.git`. Each mutant is written into the **copy**, never into your file.
- **`subprocess.run([...])`** runs another program, here `python -m pytest` on your history tests, in the copy's folder, and waits for it. `returncode` is that program's exit code: pytest exits with 0 when every test passed. So **a 0 means the bug got past your tests**.
- Because the tests run with `-m` from the copy's folder, the copy's broken `citools` comes first on `sys.path`, ahead of the installed one.

It's supplied rather than typed because it's a tool *about* your tests, not part of the lesson's subject; but nothing in it is hidden from you. Real projects use a package for this (`mutmut` is a common one), which does the same thing with thousands of automatically generated mutants.

```check
file tools/mutants.py -- Click "Create provided tools/mutants.py" above.
```

## Try it

| Change | What to notice |
|---|---|
| `.venv\Scripts\python -m pytest -v` | `-v` (*verbose*) lists every test by name, with PASSED or FAILED. |
| `.venv\Scripts\python -m pytest -k median` | `-k` runs only tests whose names contain `median`. |
| `.venv\Scripts\python -m pytest tests/test_stats.py::test_mean` | One test, by its exact name. |
| In `citools/stats.py`, make `median` return `in_order[middle]` always, run pytest, then `git restore citools/stats.py` | One test fails, and its `E` lines show exactly how. That's the safety net working. |
| In `test_mean_of_nothing`, change `"empty"` to `"zero"` | Fails: the error is raised, but its message doesn't match. |
| `.venv\Scripts\python tools/mutants.py` (before the next step) | `tests/test_history.py doesn't exist yet.` |

## Your turn: test history.py

**No code is shown in this step.** Write `tests/test_history.py`, testing `flips`, `verdict` and `since_last_failure`, so that:

- every test passes on the real `citools/history.py`, and
- **every one** of the five bugs in `tools/mutants.py` is caught:

  ```powershell
  .venv\Scripts\python tools/mutants.py
  ```

  must end with `5 of 5 bugs caught`.

Then delete the `if __name__ == "__main__":` block from `citools/history.py`, since its checks now live in your test file, and commit, with a message that mentions **tests**.

Write the tests a few at a time, running `tools/mutants.py` after each, and watch the misses turn into catches. For each miss, ask: *what input would give a different answer with this bug than without it?*

```hints
nudge: Start by turning history.py's four asserts into test functions. Then run tools/mutants.py and look at what it MISSED.
concept: A test catches a bug only if the bug changes that test's answer. To catch "flips also compares the first run with the last", you need a history whose first and last results differ: ["fail", "pass"] has 1 flip, but the buggy version counts 2. To catch ">= 2", test a history with exactly two flips and check it is NOT flaky. To catch "results[0]", use a failing history whose first run passed. To catch "<= 1", check a history with exactly one failure isn't stable. To catch the streak bug, put a failure before some passes.
shape: One test function per behaviour, each with a name that says what it checks: test_flips_counts_changes, test_flips_ignores_first_and_last, test_stable, test_flaky, test_failing, test_fixed, test_two_flips_is_not_flaky, test_since_last_failure. Each is one or two asserts on a short, hand-made history.
answer: ~~~python
from citools.history import flips, since_last_failure, verdict


def test_flips_counts_changes():
    assert flips(["pass", "fail", "pass"]) == 2


def test_flips_ignores_first_and_last():
    assert flips(["fail", "pass"]) == 1


def test_stable():
    assert verdict(["pass", "pass", "pass"]) == "stable"


def test_flaky():
    assert verdict(["pass", "fail", "pass", "fail", "pass"]) == "flaky"


def test_failing():
    assert verdict(["pass", "pass", "fail"]) == "failing"


def test_fixed():
    assert verdict(["fail", "fail", "pass"]) == "broke, then fixed"


def test_two_flips_is_not_flaky():
    assert verdict(["pass", "fail", "pass"]) == "broke, then fixed"


def test_since_last_failure():
    assert since_last_failure(["pass", "fail", "pass", "pass"]) == 2
    assert since_last_failure(["pass"] * 3) == 3
~~~
Each test exists to catch something: `test_fixed` has one failure that isn't at the end (catches "one failure counts as stable" and "the first run instead of the latest"); `test_two_flips_is_not_flaky` sits exactly on the boundary between `> 2` and `>= 2`. Testing **at the boundary** of a condition is the habit that catches off-by-one bugs. Then delete the `__main__` block from `history.py`, `git add .` and `git commit -m "Move the checks into pytest tests"`.
```

```check
run ".venv/Scripts/python -m pytest tests/test_history.py" stdout="passed" without="failed" label="every test in test_history.py passes" -- Run .venv\Scripts\python -m pytest tests/test_history.py and read the first failure.
run ".venv/Scripts/python tools/mutants.py" stdout="5 of 5 bugs caught" label="your tests catch all five bugs" -- Run tools/mutants.py: each MISSED line names a bug no test of yours notices yet.
lacks citools/history.py "__main__" label="history.py's checks have moved to the tests" -- Delete the if __name__ == "__main__": block from citools/history.py.
run ".venv/Scripts/python -m pytest" stdout="passed" without="failed" label="the whole test suite passes" -- Run .venv\Scripts\python -m pytest and fix whatever fails.
git-message "test" -- Commit with a message that mentions tests.
git-clean -- Run git add . and commit, so nothing is left uncommitted.
```

## What you've learned

- **pytest** collects `test_*` functions from `test_*.py` files and runs each on its own. A test fails if it raises anything. Run it as `.venv\Scripts\python -m pytest`.
- pytest **rewrites `assert`** to show the values when one fails. When a test fails, decide whether the code or the test is wrong.
- **`pytest.approx`** compares floats with a tolerance; **`pytest.raises`** checks that code raises the right error.
- **Fixtures** are prepared values pytest passes to tests by parameter name: **`tmp_path`** is a fresh folder, **`capsys`** captures printed output.
- **Mutation testing** checks the tests: break the code on purpose, and a good test fails. Test **at the boundaries** of conditions.

Next lesson: the last rough edge. What does the tool do when the file is missing, or a row is garbage? Right now it crashes with a traceback. You'll make it fail **well**.
