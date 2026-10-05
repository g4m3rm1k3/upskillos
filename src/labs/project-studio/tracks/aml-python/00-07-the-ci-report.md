---
title: 0.7 — Your Tool: The CI Report
runtime: python
---

Everything in this chapter comes together here. `ci_report.py` stops using timings typed into it and reads the CI system's file instead; it groups the rows by test, works out each test's numbers with the functions you wrote, and prints a report a team could read every morning. You'll run it the way real tools are run: from the terminal, with the file to analyse given as an argument.

## What the tool should do

**This step: read the plan. No code yet.**

Before writing a program, decide what it must do, in terms someone could check. Running

```powershell
python ci_report.py data/ci_runs.csv
```

must print one line per test, as a table:

```text
test            runs  failed  median    mean  slowest  verdict
test_login        15      0%     1.2    1.19      1.3  stable
test_signup       15     13%     2.1    1.91      2.2  broke, then fixed
test_search       15     20%     3.0    3.03      3.3  flaky
test_upload       15      0%     6.6    6.47      9.0  stable
test_checkout     15      0%     8.2    7.95      8.4  stable
test_export       15      7%     4.1   11.77    120.0  broke, then fixed
```

And running it without a file must explain how to use it, instead of crashing.

Every column is something you can already compute: `failure_rate`, `median`, `mean`, `max` and `verdict` are in `ci_report.py`, and grouping is lesson 0.6. What's new is putting them together: reading the file inside the tool, and laying out the output. Look at the table for a moment and you can already see the stories in the data: `test_search` is flaky, `test_signup` broke and was fixed, and `test_export`'s mean is nearly three times its median, the sign of an outlier.

## Read the file

Replace the typed-in lists at the bottom of `ci_report.py` with two new functions and a loop. At the top, add `import csv`. After `since_last_failure`, add `load_runs` and `group_by_test`. Delete the three lists and the three `print` lines, and end the file with the new loop:

```python file=ci_report.py
import csv


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


assert median([3, 1, 2]) == 2
assert median([4, 1, 3, 2]) == 2.5
assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0

rows = load_runs("data/ci_runs.csv")
seconds_by_test, results_by_test = group_by_test(rows)

for test, seconds in seconds_by_test.items():
    results = results_by_test[test]
    print(f"{test}: median {median(seconds)} s, {verdict(results)}")
```

```powershell
python ci_report.py
```

```text
test_login: median 1.2 s, stable
test_signup: median 2.1 s, broke, then fixed
test_search: median 3.0 s, flaky
test_upload: median 6.6 s, stable
test_checkout: median 8.2 s, stable
test_export: median 4.1 s, broke, then fixed
```

### How it works

- **`load_runs`** returns from inside the `with` block. That's fine: leaving the block by `return` still closes the file. `with` guarantees it however the block ends.
- **`group_by_test`** builds two dictionaries in **one pass** over the rows: the seconds and the results of each test. A test is new to both at the same moment, so one `if` creates both lists. One pass instead of two matters little for 90 rows, and a great deal for 90 million.
- **`return seconds_by_test, results_by_test`** returns **two values**. Strictly, Python packs them into one value, a **tuple** (an ordered, unchangeable group, written with commas), and returns that.
- **`seconds_by_test, results_by_test = group_by_test(rows)`** **unpacks** the tuple, as `for test, seconds in ...items()` did in lesson 0.6: the first item goes to the first name, the second to the second.
- In the final loop, `results_by_test[test]` finds the results that belong with the seconds: both dictionaries use the same test names as keys.

**Why so many small functions?** Read the last five lines: *load the runs, group them by test, then for each test print its median and verdict*. The program's top level now reads like the plan, because each detail has been moved into a function with a name that says what it does. When something is wrong with grouping, there's one function to look at, and you can test it on its own.

```check
run "python ci_report.py" stdout="test_search: median 3.0 s, flaky\ntest_upload: median 6.6 s, stable" label="ci_report.py reads the file and reports on all six tests" -- Delete the typed-in lists, and call load_runs("data/ci_runs.csv") then group_by_test(rows).
lacks ci_report.py "export = [" label="the timings come from the file, not typed-in lists" -- Delete the export, search and signup lists at the bottom.
```

## A table

Replace the final loop with a header line and a row per test, each column a fixed width:

```python file=ci_report.py
import csv


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


assert median([3, 1, 2]) == 2
assert median([4, 1, 3, 2]) == 2.5
assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0

rows = load_runs("data/ci_runs.csv")
seconds_by_test, results_by_test = group_by_test(rows)

print(f"{'test':<15}{'runs':>5}{'failed':>8}{'median':>8}{'mean':>8}{'slowest':>9}  verdict")
for test, seconds in seconds_by_test.items():
    results = results_by_test[test]
    print(f"{test:<15}{len(seconds):>5}{failure_rate(results):>8.0%}{median(seconds):>8.1f}"
          f"{mean(seconds):>8.2f}{max(seconds):>9.1f}  {verdict(results)}")
```

```text
test            runs  failed  median    mean  slowest  verdict
test_login        15      0%     1.2    1.19      1.3  stable
test_signup       15     13%     2.1    1.91      2.2  broke, then fixed
test_search       15     20%     3.0    3.03      3.3  flaky
test_upload       15      0%     6.6    6.47      9.0  stable
test_checkout     15      0%     8.2    7.95      8.4  stable
test_export       15      7%     4.1   11.77    120.0  broke, then fixed
```

### How the columns line up

Every column has a fixed **width**, and the header and the rows use the **same widths**:

| Column | Header spec | Row spec | Width |
|---|---|---|---|
| test | `<15` | `<15` | 15, left-aligned |
| runs | `>5` | `>5` | 5, right-aligned |
| failed | `>8` | `>8.0%` | 8 |
| median | `>8` | `>8.1f` | 8 |
| mean | `>8` | `>8.2f` | 8 |
| slowest | `>9` | `>9.1f` | 9 |

Numbers are **right-aligned** so their decimal points line up, which is what makes a column of numbers easy to compare by eye; text is left-aligned. Each width is a little wider than the widest thing that column holds, so there's always at least one space between columns. `'test'` in the header is a string *inside* the f-string's braces, so it can be given a width like any other value.

**The row is two f-strings, one per line.** Inside brackets, Python lets a statement continue onto the next line (as the long lists did in lesson 0.4). And two string literals written next to each other, with nothing between them, are joined into one string before the program runs. So the two f-strings become one long line of output. Breaking long lines this way keeps the code readable.

```check
run "python ci_report.py" stdout="test            runs  failed  median    mean  slowest  verdict\ntest_login        15      0%     1.2    1.19      1.3  stable" label="the header and the first row line up exactly" -- Use the same widths in the header and the row: <15, >5, >8, >8, >8, >9, then two spaces before the verdict.
run "python ci_report.py" stdout="test_export       15      7%     4.1   11.77    120.0  broke, then fixed" label="test_export's row shows its 11.77 mean and 120.0 slowest run"
```

## The file as an argument

The tool only reads `data/ci_runs.csv`. Real CI systems write a new file every night, under different names. Let whoever runs the tool say which file. Add `import sys`, and replace the line that loads the runs:

```python file=ci_report.py
import csv
import sys


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


assert median([3, 1, 2]) == 2
assert median([4, 1, 3, 2]) == 2.5
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
for test, seconds in seconds_by_test.items():
    results = results_by_test[test]
    print(f"{test:<15}{len(seconds):>5}{failure_rate(results):>8.0%}{median(seconds):>8.1f}"
          f"{mean(seconds):>8.2f}{max(seconds):>9.1f}  {verdict(results)}")
```

Run it both ways:

```powershell
python ci_report.py data/ci_runs.csv
python ci_report.py
```

The first prints the table. The second prints

```text
usage: python ci_report.py RUNS_CSV
```

### How it works

- **`sys.argv`** (*argument vector*) is a list of the words on the command line that started the program, given to Python by the shell. For `python ci_report.py data/ci_runs.csv` it is `['ci_report.py', 'data/ci_runs.csv']`: the script's own name first, then each word after it. So the file is `sys.argv[1]`.
- **`if len(sys.argv) != 2:`** catches a missing file name (or too many words). Without this check, `sys.argv[1]` would fail with `IndexError: list index out of range`, which tells the person running the tool nothing about how to use it.
- **The usage line** follows a convention almost every command-line tool uses: `usage:`, the command, then the arguments in capitals. Capitals mean "put your own value here".
- **`sys.exit(2)`** ends the program immediately with **exit code 2**. Lesson 0.1: 0 means success, anything else failure. By convention, 2 means "you used the command wrongly", as opposed to 1, "it ran and something failed". CI systems, scripts and other programs read that number, not the text.

**Why `sys` needed importing, when `print` didn't.** Python makes a few dozen functions available everywhere (**built-ins** like `print`, `len`, `sum`, `sorted`), and keeps everything else in modules you import when you need them. That keeps every program from loading code it doesn't use.

```check
run "python ci_report.py data/ci_runs.csv" stdout="test_search       15     20%     3.0    3.03      3.3  flaky" label="python ci_report.py data/ci_runs.csv prints the table" -- Read the path from sys.argv[1].
run "python ci_report.py" exit=2 stdout="usage: python ci_report.py RUNS_CSV" label="with no file, it prints the usage line and exits with code 2" -- Check len(sys.argv) != 2 before using sys.argv[1]; print the usage line and call sys.exit(2).
```

## Try it

| Change | What to notice |
|---|---|
| `python ci_report.py nope.csv` | `FileNotFoundError` with a traceback. A friendlier tool would catch it and print one line; Chapter 1 shows how (`try`/`except`). |
| `python ci_report.py data/ci_runs.csv extra` | The usage line: three words in `sys.argv`. |
| Add `print(sys.argv)` before the `if` | See exactly what the shell handed over. |
| `python ci_report.py data/README.md` | A `KeyError: 'test'`: the file isn't a CSV with those columns. Errors in data look like errors in code; reading the traceback tells you which. |
| After running it, type `$LASTEXITCODE` in PowerShell | The exit code of the last program: `0` after a good run, `2` after a usage error. |
| Change `>8.0%` to `>8.1%` in the row | `13.3%`, but now the header and rows no longer line up: the widths stay, the contents grow. |

## Your turn: what needs attention

**No code is shown in this step.** A table is good for looking things up; a team's morning report should also say what to *do*. After the table, print a blank line and then exactly:

```text
Needs attention:
  flaky: test_search
  slow (median over 5.0 s): test_upload, test_checkout
  outliers (mean over 1.5 x median): test_export
```

Each line lists every test that matches, in the table's order, separated by `, `. Work the lists out from the data with the functions you have: if a different file had two flaky tests, the first line would name both.

```hints
nudge: Each of the three lines is a list of test names that you build in the same loop that prints the table, then print after it.
concept: Start three empty lists before the loop: flaky, slow and outliers. Inside the loop, .append(test) to each list whose condition the test meets: verdict(results) == "flaky"; median(seconds) > 5.0; mean(seconds) > 1.5 * median(seconds). After the loop, ", ".join(names) turns a list of strings into one string with ", " between them.
shape: Before the loop: flaky = [], slow = [], outliers = []. Inside, three ifs. After it: print() for the blank line, print("Needs attention:"), then three prints like print(f"  flaky: {', '.join(flaky)}").
answer: The end of the file becomes:
~~~python
print(f"{'test':<15}{'runs':>5}{'failed':>8}{'median':>8}{'mean':>8}{'slowest':>9}  verdict")
flaky = []
slow = []
outliers = []
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

print()
print("Needs attention:")
print(f"  flaky: {', '.join(flaky)}")
print(f"  slow (median over 5.0 s): {', '.join(slow)}")
print(f"  outliers (mean over 1.5 x median): {', '.join(outliers)}")
~~~
Three separate `if`s, not `elif`: a test can be both slow and flaky, and should appear on both lines. `", ".join(...)` is a string method: the string it's called on is the separator, and it goes *between* the items, never at the end.
```

```check
run "python ci_report.py data/ci_runs.csv" stdout="Needs attention:\n  flaky: test_search\n  slow (median over 5.0 s): test_upload, test_checkout\n  outliers (mean over 1.5 x median): test_export" label="the report ends with the three Needs attention lines" -- Build the three lists inside the table loop, then print them with ", ".join(...).
run "python ci_report.py data/ci_runs.csv" stdout="test_export       15      7%     4.1   11.77    120.0  broke, then fixed\n\nNeeds attention:" label="a blank line separates the table from Needs attention" -- print() with no argument prints the blank line.
run "python -c \"import os, subprocess, sys, tempfile; p = os.path.join(tempfile.gettempdir(), 'aml_two_flaky.csv'); open(p, 'w').write('run,date,test,seconds,result\\n' + ''.join(f'{i},d,{t},1.0,{r}\\n' for t in ['a', 'b'] for i, r in enumerate(['pass', 'fail', 'pass', 'fail', 'pass']))); print(subprocess.run([sys.executable, 'ci_report.py', p], capture_output=True, text=True).stdout)\"" stdout="  flaky: a, b" label="with two flaky tests in a file, the flaky line names both" -- Build the flaky list from verdict(results) for every test, and join it with ", ".
```

## Challenge: fail the build

**Optional.** A CI system runs your report after the tests, and its **exit code** decides whether the build is marked as failed. Make `ci_report.py` exit with code **1** when any test's verdict is `failing` (it failed on the latest run and hasn't been fixed), and print one more line under Needs attention:

```text
  failing now: <names>
```

With `data/ci_runs.csv`, nothing is failing now, so the line ends after the colon and the exit code stays 0. To test the other case, create a small CSV of your own, `data/still_failing.csv`, in which one test fails on its last run.

```hints
nudge: You need a fourth list, built like the others, and a decision after the printing.
concept: A test is failing now when verdict(results) == "failing". After printing, if the list isn't empty, call sys.exit(1). An empty list counts as False in an if, so `if failing:` reads naturally.
shape: failing = [] before the loop; if verdict(results) == "failing": failing.append(test) inside it; print(f"  failing now: {', '.join(failing)}") with the others; then if failing: sys.exit(1) at the very end.
answer: Add `failing = []` with the other lists, this inside the loop:
~~~python
    if verdict(results) == "failing":
        failing.append(test)
~~~
and this at the end of the file:
~~~python
print(f"  failing now: {', '.join(failing)}")
if failing:
    sys.exit(1)
~~~
A small `data/still_failing.csv` to try it:
~~~text
run,date,test,seconds,result
1,2026-10-01,test_login,1.2,pass
2,2026-10-02,test_login,1.2,pass
3,2026-10-03,test_login,1.3,fail
~~~
`python ci_report.py data/still_failing.csv` then lists `test_login` as failing now, and `$LASTEXITCODE` is 1.
```

```check
run "python ci_report.py data/ci_runs.csv" stdout="  failing now:" label="with the CI file, nothing is failing now and it exits with 0" -- Print the failing now line even when its list is empty.
run "python -c \"import os, subprocess, sys, tempfile; p = os.path.join(tempfile.gettempdir(), 'aml_still_failing.csv'); open(p, 'w').write('run,date,test,seconds,result\\n1,d,test_a,1.0,pass\\n2,d,test_a,1.0,fail\\n1,d,test_b,1.0,pass\\n2,d,test_b,1.0,pass\\n'); r = subprocess.run([sys.executable, 'ci_report.py', p], capture_output=True, text=True); print(r.stdout); print('exit', r.returncode)\"" stdout="  failing now: test_a\n\nexit 1" label="a file whose last run failed lists the test and exits with code 1" -- When the failing list isn't empty, call sys.exit(1) after printing.
```

## What you've built

A tool that reads a CI system's record and tells a team, every morning, which tests to look at, and why:

- **Reading data**: a file path from the **command line** (`sys.argv`), a **usage** line and **exit code 2** when it's missing.
- **Grouping**: one pass over the rows into dictionaries of lists, returned as a **tuple** and unpacked.
- **Statistics**: mean, median, maximum and failure rate, each a small function you've checked with `assert`.
- **Judgements**: flaky versus broken-then-fixed versus failing, slow tests by a threshold, outliers by comparing the mean with the median.
- **Output**: a table with fixed-width, aligned columns, and a summary of what needs attention.

And one thing it **misses**. Look at `test_upload`: *stable*, 0% failed, median 6.6 s, flagged only as slow. But its timings were 4.0, 4.4, 4.7, … 9.0: it gets about a third of a second slower **every night**. At that rate it passes the team's 10-second budget in about three more nights, and then it starts failing every run. No column in this report can see that, because every number in it summarises the runs without regard to their **order in time**. Seeing a trend and predicting where it's heading is a job for a model, and in Chapter 7 you'll build exactly that one.

**Next chapter: a project of its own.** `ci_report.py` is now 100 lines in one file, with its tests mixed in with its code, and it only works when run from the right folder. Chapter 1 turns it into a real project: modules, a virtual environment, tests run by pytest, and git, so that it can grow into everything that comes after.
