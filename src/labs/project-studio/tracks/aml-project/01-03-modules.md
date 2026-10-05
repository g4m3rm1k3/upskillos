---
title: 1.3 — Modules: One File, One Job
runtime: python
---

`ci_report.py` does three different jobs: statistics (`mean`, `median`, `failure_rate`), judging a test's history (`flips`, `verdict`, `since_last_failure`), and reading data (`load_runs`, `group_by_test`), plus the report itself at the bottom. They change for different reasons. A new statistic means touching the statistics; a new CSV format means touching the loading; neither has anything to do with how the table is laid out. In one file, every change means reading past all the others, and nothing else can reuse a function without copying it.

A **module** is a Python file whose functions other files can **import**. This lesson splits the report into three modules plus a short report script, and shows exactly what happens when one file imports another.

## The plan

**This step: read the plan. No code yet.**

| File | Holds | Changes when… |
|---|---|---|
| `stats.py` | `mean`, `median`, `failure_rate` | you need a new statistic |
| `history.py` | `flips`, `verdict`, `since_last_failure` | the rules for judging a test change |
| `runs.py` | `load_runs`, `group_by_test` | the data's format changes |
| `ci_report.py` | the command line and the table | the report's layout changes |

The report will **use** the other three; none of them will know the report exists. That one-way direction is what makes a module reusable: `stats.py` will work just as well for the model in Chapter 7 as for the report.

Every step keeps the report working. You'll run it after each one, and `git diff` (last lesson) always shows what you've changed since the last commit.

If you skipped lesson 0.7's optional challenge, your report has no "failing now" line. The full versions of `ci_report.py` below include it, and the highlighted difference shows you the lines to add.

## A module of statistics

Create `stats.py` in the `ci-toolkit` folder. **Move** the three statistics functions into it: cut them from `ci_report.py` and paste them here. That's your own code you're moving, so there's nothing to retype. (Leave `ci_report.py` broken for a moment; the next step fixes it.)

```python file=stats.py
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

Now ask Python to use it, from the terminal:

```powershell
python -c "import stats; print(stats.mean([1, 2, 3]))"
```

```text
2.0
```

A new folder appears in the file tree: `__pycache__`.

### How import works

When Python meets `import stats`:

1. **Is it already loaded?** Python keeps every module it has imported in a dictionary, `sys.modules`. If `"stats"` is a key there, it uses that and stops here.
2. **Find it.** Search the folders in `sys.path` (lesson 1.1), in order, for `stats.py`. For `python -c`, the first folder is the current directory, `ci-toolkit`, so it's found there.
3. **Compile it**, and save the compiled bytecode in `__pycache__` so the next import can skip this step (that's the folder that appeared, and why `.gitignore` already ignores it).
4. **Run it, top to bottom**, in a fresh set of names of its own. Running a `def` creates a function, so after this step the module's names are `mean`, `median` and `failure_rate`.
5. **Make a module object**, store it in `sys.modules["stats"]`, and attach the name `stats` to it in the importing code.

`stats.mean` then means "the name `mean` inside the module `stats`". The dot looks a name up *inside* something, as `results.count` did for a list's method.

**Steps 1 and 4 together** mean a module's code runs **once**, the first time it's imported, however many files import it. Put `print("loading stats")` at the top of `stats.py` and run `python -c "import stats; import stats"`: it prints once. (Then delete that line.)

```check
run "python -c \"import stats; print(stats.mean([1, 2, 3]), stats.median([4, 1, 3, 2]), stats.failure_rate(['pass', 'fail']))\"" stdout="2.0 2.5 0.5" label="stats.py provides mean, median and failure_rate" -- Move the three functions from ci_report.py into stats.py, unchanged.
```

## Use it from the report

Fix `ci_report.py`: import the three functions from `stats`, and make sure their definitions are gone from this file. Delete the two `median` asserts too; they move to `stats.py` in the next step.

```python file=ci_report.py
import csv
import sys

from stats import failure_rate, mean, median


def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


def since_last_failure(results):
    count = 0
    for result in results:
        if result == "fail":
            count = 0
        else:
            count = count + 1
    return count


def load_runs(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def group_by_test(rows):
    seconds_by_test = {}
    results_by_test = {}
    for row in rows:
        test = row["test"]
        if test not in seconds_by_test:
            seconds_by_test[test] = []
            results_by_test[test] = []
        seconds_by_test[test].append(float(row["seconds"]))
        results_by_test[test].append(row["result"])
    return seconds_by_test, results_by_test


assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0

if len(sys.argv) != 2:
    print("usage: python ci_report.py RUNS_CSV")
    sys.exit(2)

rows = load_runs(sys.argv[1])
seconds_by_test, results_by_test = group_by_test(rows)

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
    sys.exit(1)
```

```powershell
python ci_report.py data/ci_runs.csv
```

The report is exactly as before.

**How it works.** `from stats import failure_rate, mean, median` imports `stats` (all five steps above) and then attaches the names `failure_rate`, `mean` and `median` **in this file** to the module's functions, so the rest of the file calls `mean(...)` as before, without `stats.` in front. It's the same function object, not a copy: one definition, now in one place.

Two conventions the file follows, which you'll see in almost every Python project:

- **Imports go at the top**, so a reader sees at a glance what a file depends on. Python's own modules come first, then a blank line, then the project's own.
- **Names inside `from ... import` are in alphabetical order**, which makes a long list easy to scan and stops two people adding the same name twice.

When you run `python ci_report.py`, `sys.path[0]` is the folder `ci_report.py` is in, `ci-toolkit`, which is where `stats.py` is. That's why the import finds it.

```check
run "python ci_report.py data/ci_runs.csv" stdout="test_search       15     20%     3.0    3.03      3.3  flaky" label="the report works with the statistics imported" -- Add from stats import failure_rate, mean, median below import sys.
lacks ci_report.py "def median" label="median is defined in stats.py only" -- Delete mean, median and failure_rate from ci_report.py: they live in stats.py now.
```

## Checks that belong to the module

The two `median` asserts test `stats.py`, so they belong in `stats.py`. But a module's code runs whenever it's imported, so asserts at the top level would run every time the report does. Put them where they only run when you ask. Add this to the end of `stats.py`:

```python file=stats.py
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


if __name__ == "__main__":
    assert median([3, 1, 2]) == 2
    assert median([4, 1, 3, 2]) == 2.5
    print("stats.py: all checks passed")
```

Run the module itself, then the report:

```powershell
python stats.py
python ci_report.py data/ci_runs.csv
```

```predict
question: The report imports stats, which runs all of stats.py. Does "stats.py: all checks passed" appear in the report's output?
choice: Yes, because importing runs the whole file
choice: No
answer: No
explain: Importing does run the whole file, including the `if` line. But the condition, `__name__ == "__main__"`, is False when stats.py is imported, so the block under it is skipped. It's only True when stats.py is the program you started.
```

```text
stats.py: all checks passed
```

The first command prints the line; the report doesn't.

### How `__name__` works

Every module has a variable called `__name__` (two underscores on each side; Python's special names look like this, and people say them as "dunder name"). Python sets it before running the module's code:

| How the file is run | `__name__` is |
|---|---|
| `python stats.py`: it's the program you started | `"__main__"` |
| `import stats` from another file | `"stats"`, the module's own name |

So `if __name__ == "__main__":` means **"only if this file is the program being run"**. The block under it is a module's way of saying "here's what to do if someone runs me directly": here, check myself. Importers never see it. You'll find this line at the bottom of a great many Python files.

```check
run "python stats.py" stdout="stats.py: all checks passed" label="python stats.py runs its own checks" -- Put the two median asserts and the print under if __name__ == "__main__": at the end of stats.py.
run "python ci_report.py data/ci_runs.csv" without="all checks passed" label="importing stats doesn't run its checks" -- The asserts and the print must be indented under the if __name__ == "__main__": line.
```

## Loading and grouping

Create `runs.py` and move `load_runs` and `group_by_test` into it. `load_runs` uses the `csv` module, so `import csv` moves with it:

```python file=runs.py
import csv


def load_runs(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def group_by_test(rows):
    seconds_by_test = {}
    results_by_test = {}
    for row in rows:
        test = row["test"]
        if test not in seconds_by_test:
            seconds_by_test[test] = []
            results_by_test[test] = []
        seconds_by_test[test].append(float(row["seconds"]))
        results_by_test[test].append(row["result"])
    return seconds_by_test, results_by_test
```

**Why `import csv` goes here.** Every module has its own names. `runs.py` uses `csv.DictReader`, so `runs.py` must import `csv` itself; it can't rely on whoever imports `runs` having imported `csv` first. Each file states its own dependencies, and can be read and tested on its own.

```check
run "python -c \"import runs; rows = runs.load_runs('data/ci_runs.csv'); seconds, results = runs.group_by_test(rows); print(len(rows), len(seconds), results['test_search'].count('fail'))\"" stdout="90 6 3" label="runs.py loads the 90 rows and groups them into 6 tests" -- Move load_runs and group_by_test into runs.py, with import csv at the top.
```

## The report, importing both

Update `ci_report.py`: import from `runs`, and remove `import csv` and the two functions you moved.

```python file=ci_report.py
import sys

from runs import group_by_test, load_runs
from stats import failure_rate, mean, median


def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


def since_last_failure(results):
    count = 0
    for result in results:
        if result == "fail":
            count = 0
        else:
            count = count + 1
    return count


assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0

if len(sys.argv) != 2:
    print("usage: python ci_report.py RUNS_CSV")
    sys.exit(2)

rows = load_runs(sys.argv[1])
seconds_by_test, results_by_test = group_by_test(rows)

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
    sys.exit(1)
```

`ci_report.py` no longer uses `csv` itself, so it doesn't import it. An import that a file doesn't use is clutter that misleads the reader about what the file depends on.

```check
run "python ci_report.py data/ci_runs.csv" stdout="Needs attention:\n  flaky: test_search" label="the report still works, with loading imported from runs" -- Add from runs import group_by_test, load_runs and delete the two functions from ci_report.py.
lacks ci_report.py "def load_runs" label="load_runs is defined in runs.py only"
lacks ci_report.py "import csv" label="ci_report.py no longer imports csv, which it doesn't use" -- Delete import csv from ci_report.py.
```

## Try it

| Change | What to notice |
|---|---|
| Create `explore/use_stats.py` containing `import stats` and run `python explore/use_stats.py` | `ModuleNotFoundError: No module named 'stats'`. The script's folder, `explore`, is first on `sys.path`, and `stats.py` isn't in it. The next lesson fixes this properly. Delete the file. |
| `python -c "import stats; print(stats.__file__)"` | The file the module was loaded from. |
| `python -c "import stats, sys; print('stats' in sys.modules)"` | `True`: the cache import checks first. |
| In `stats.py`, change `mean` to divide by `len(values) + 1`, then run the report | Every mean in the table changes. One function, used everywhere. `git restore stats.py` to undo it. |
| `python -c "from stats import mean; print(median)"` | `NameError`: `from ... import` attaches only the names you list. |
| `git status` | `stats.py` and `runs.py` are new (untracked); `ci_report.py` is modified. You'll commit at the end of the lesson. |

## Your turn: history.py

**No code is shown in this step.** Move the three history functions, `flips`, `verdict` and `since_last_failure`, into a new module, `history.py`, so that:

- `python history.py` runs their four asserts (the ones still at the top level of `ci_report.py`) and prints `history.py: all checks passed`;
- importing `history` prints nothing;
- `ci_report.py` imports `verdict` from `history`, defines no functions and has no asserts of its own, and prints exactly the same report as before.

Then commit the whole change, with a message that mentions **modules**, and finish with nothing uncommitted.

```hints
nudge: It's the same move you made twice already: cut, paste into a new file, import. The asserts go under a __name__ guard, as in stats.py.
concept: verdict calls flips, so flips must be in history.py too (it is). ci_report.py only calls verdict directly, so that's the only name it needs to import from history.
shape: history.py: the three functions, then if __name__ == "__main__": with the four asserts and a print, indented. ci_report.py: add from history import verdict above the other from-imports (alphabetical by module), delete the functions and the asserts. Then git add . and git commit -m "Split ci_report.py into modules".
answer: `history.py`:
~~~python
def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


def since_last_failure(results):
    count = 0
    for result in results:
        if result == "fail":
            count = 0
        else:
            count = count + 1
    return count


if __name__ == "__main__":
    assert flips(["pass", "fail", "pass"]) == 2
    assert verdict(["pass", "pass", "fail"]) == "failing"
    assert since_last_failure(["pass"] * 15) == 15
    assert since_last_failure(["pass", "fail"]) == 0
    print("history.py: all checks passed")
~~~
The top of `ci_report.py`:
~~~python
import sys

from history import verdict
from runs import group_by_test, load_runs
from stats import failure_rate, mean, median
~~~
followed directly by `if len(sys.argv) != 2:` and the rest of the report. Then
~~~powershell
git add .
git commit -m "Split ci_report.py into modules"
~~~
`ci_report.py` is now about 40 lines, and every one of them is about the report.
```

```check
run "python history.py" stdout="history.py: all checks passed" label="python history.py runs its own four checks" -- Put the four asserts and the print under if __name__ == "__main__": at the end of history.py.
run "python -c \"import history; print(history.verdict(['pass', 'fail', 'pass', 'fail', 'pass']), history.since_last_failure(['fail', 'pass']))\"" stdout="flaky 1" without="all checks passed" label="importing history gives verdict and since_last_failure, and prints nothing else" -- Move flips, verdict and since_last_failure into history.py.
run "python ci_report.py data/ci_runs.csv" stdout="test_signup       15     13%     2.1    1.91      2.2  broke, then fixed\ntest_search       15     20%     3.0    3.03      3.3  flaky" label="the report is unchanged" -- ci_report.py needs from history import verdict.
lacks ci_report.py "def " label="ci_report.py defines no functions" -- Every function now lives in stats.py, history.py or runs.py.
lacks ci_report.py "assert " label="ci_report.py has no asserts" -- The asserts belong to the modules they test, under their __name__ guards.
git-message "modules" -- Commit with a message that mentions modules, e.g. git commit -m "Split ci_report.py into modules".
git-clean -- Run git add . and commit, so nothing is left uncommitted.
```

## What you've learned

- A **module** is a Python file other files **import**. `import` finds it on `sys.path`, compiles it (caching bytecode in `__pycache__`), runs it **once**, and caches it in `sys.modules`.
- `import stats` gives you `stats.mean`; `from stats import mean` attaches `mean` directly. Each module imports what it uses itself.
- **`if __name__ == "__main__":`** runs only when the file is the program you started, never on import.
- Group functions that **change for the same reason**; let the report depend on the modules, never the other way round.

Next lesson: the explore scripts can't import your modules, the report only works when run from the right folder, and `stats`, `runs` and `history` are generic names that could clash with anyone's. Fixing all three turns these files into a **package**.
