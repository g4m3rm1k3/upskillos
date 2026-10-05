---
title: 0.6 — Files and Dictionaries: Ninety Rows
runtime: python
support: data/ci_runs.csv
---

So far you've typed every timing into your code. Real data comes from somewhere else: the CI system writes a file, and your program reads it. This lesson reads the CI system's record of fifteen nights, all ninety results, and meets the two problems every data program has to solve:

1. A file is **text**. Every number in it arrives as a string, and has to be converted.
2. The rows come in **one long list**, in the order they were recorded, but you want answers **per test**. That means **grouping**, and grouping needs a new kind of value: the **dictionary**.

## The data

**This step: create the supplied data files and read the description. No code yet.**

Click **Create provided data/README.md** above. It creates two files in a new `data` folder: this description, and `data/ci_runs.csv`, the CI system's record.

```markdown file=data/README.md provided
# data/ci_runs.csv

One row per test per nightly CI run, for a small web shop's test suite.

| Column  | Meaning                                         | Example      |
|---------|-------------------------------------------------|--------------|
| run     | which nightly run (1 to 15)                     | 6            |
| date    | the night it ran, as YYYY-MM-DD                 | 2026-09-06   |
| test    | the test's name                                 | test_export  |
| seconds | how long the test took                          | 120.0        |
| result  | pass or fail                                    | fail         |

15 runs x 6 tests = 90 rows, plus a header row.
The CI system stops any test after 120 seconds and records it as a failure.
The data is made up for this course, but every pattern in it is one real CI data has.
```

Open `data/ci_runs.csv` from the file tree and look at it. The first lines are:

```text
run,date,test,seconds,result
1,2026-09-01,test_login,1.2,pass
1,2026-09-01,test_signup,2.2,pass
1,2026-09-01,test_search,3.0,pass
```

> **CSV** (comma-separated values): a text file holding a table. Each line is a row; commas separate the columns; the first line, the **header**, names them.

It's plain text: you could have typed it yourself. That's why CSV is everywhere: every spreadsheet, database and CI system can write it, and every language can read it. Notice the order: all six tests for run 1, then all six for run 2, and so on. The timings you typed in earlier lessons are in here, spread out, one row in every six.

```check
file data/ci_runs.csv -- Click "Create provided data/README.md" above.
file data/README.md
```

## A dictionary

One row has five values, each with a name: the run, the date, the test, the seconds, the result. A list would hold them by position (`row[3]` is the seconds), which is hard to read and breaks if someone adds a column. A dictionary holds them **by name**. Create `explore/dicts.py`:

```python file=explore/dicts.py
run = {"run": 6, "test": "test_export", "seconds": 120.0, "result": "fail"}
print(run["test"])
print(run["seconds"] > 10.0)
run["note"] = "timeout"
print(run)
print(len(run))
print("result" in run, "date" in run)
```

```powershell
python explore/dicts.py
```

```text
test_export
True
{'run': 6, 'test': 'test_export', 'seconds': 120.0, 'result': 'fail', 'note': 'timeout'}
5
True False
```

> **Dictionary** (type `dict`): a collection of **key → value** pairs, written `{key: value, ...}`. You look a value up by its key: `run["test"]`. Keys are unique; a value can be anything, including a list or another dictionary.

**How it works.**

- `run["test"]` looks up the key `"test"` and gives its value. Square brackets again, but with a **key** where a list had an index.
- `run["note"] = "timeout"` **adds** a new pair, because there was no key `"note"`. If the key existed, the same line would **replace** its value. Assigning to a key never makes a duplicate.
- `len(run)` counts the pairs. `"result" in run` asks whether that **key** exists (it doesn't search the values).
- The pairs stay in the order they were added. (Python has guaranteed that since version 3.7.)

### How lookup is fast

A list finds item 7 by moving 7 places from the start. A dictionary can't do that with a key like `"test"`. Instead, when you store a pair, Python turns the key into a number with a function called a **hash** (the same key always gives the same number), and uses that number to pick a slot in a table to store the pair in. To look a key up, it hashes it again and goes straight to that slot. So finding a key takes about the same time whether the dictionary has 5 pairs or 5 million: it never compares your key against the others one by one. That's why grouping ninety rows, or ninety million, by test name is fast. It's also why keys must be values that can't change, like strings and numbers: if a key changed after it was stored, its hash would point to the wrong slot.

```check
run "python explore/dicts.py" stdout="test_export\nTrue\n{'run': 6, 'test': 'test_export', 'seconds': 120.0, 'result': 'fail', 'note': 'timeout'}\n5\nTrue False" label="dicts.py looks up, adds and checks keys"
```

## Reading a file

Create `explore/read_lines.py`:

```python file=explore/read_lines.py
with open("data/ci_runs.csv") as f:
    lines = f.read().splitlines()
print(len(lines))
print(lines[0])
print(lines[1])
print(lines[1].split(","))
```

Run it **from the `ci-toolkit` folder** (where the prompt should already be):

```powershell
python explore/read_lines.py
```

```text
91
run,date,test,seconds,result
1,2026-09-01,test_login,1.2,pass
['1', '2026-09-01', 'test_login', '1.2', 'pass']
```

**How it works.**

- **`open("data/ci_runs.csv")`** asks the operating system for the file and gives back a **file object**, `f`, which knows how to read it.
- **`with ... as f:`** makes sure the file is **closed** when the indented block ends, even if an error happens inside it. An open file holds a resource the operating system has to keep track of (and on Windows, a file that's open can't be deleted or replaced). `with` is the reliable way to give it back.
- **`f.read()`** reads the whole file into one string. **`.splitlines()`** cuts that string at each line break into a list of strings, one per line: 91 of them, the header plus 90 rows.
- **`.split(",")`** cuts one line at each comma. Every piece is a **string**, even `'1'` and `'1.2'`. A file is text, so that's all it can give you.

**The path is relative.** `"data/ci_runs.csv"` doesn't say which drive or folder it's in, so Python looks for it starting from the **current directory** of whoever ran the program (lesson 0.1). Run it from the `ci-toolkit` folder and it works. `cd explore` first and run `python read_lines.py`, and you get `FileNotFoundError`, because there's no `explore/data/ci_runs.csv`. In Chapter 1 you'll make your tool find its files no matter where it's run from.

```check
run "python explore/read_lines.py" stdout="91\nrun,date,test,seconds,result\n1,2026-09-01,test_login,1.2,pass\n['1', '2026-09-01', 'test_login', '1.2', 'pass']" label="read_lines.py reads 91 lines and splits the first row"
```

## The csv module

Splitting at commas breaks as soon as a value contains a comma. A test named `test_export, large files` would be written in the file as `"test_export, large files"`, in quotes, and `.split(",")` would cut it in two. Python comes with code that reads CSV properly. Create `explore/read_csv.py`:

```python file=explore/read_csv.py
import csv

with open("data/ci_runs.csv", newline="") as f:
    rows = list(csv.DictReader(f))
print(len(rows))
print(rows[0])
print(rows[5]["seconds"], type(rows[5]["seconds"]))
```

```text
90
{'run': '1', 'date': '2026-09-01', 'test': 'test_login', 'seconds': '1.2', 'result': 'pass'}
4.1 <class 'str'>
```

**How it works.**

- **`import csv`** loads a **module**: a file of Python code, here one that comes with Python (its **standard library**), and gives you its functions under the name `csv`. You'll write your own modules in Chapter 1.
- **`csv.DictReader(f)`** reads the header line, then turns **every following line into a dictionary** whose keys are the header's names. It handles quotes and commas inside values correctly.
- **`list(...)`** collects all the rows into a list: 90 dictionaries. The header isn't one of them; it became the keys.
- **`newline=""`** lets the csv module deal with line endings itself, which the module's documentation asks for, because a quoted value can contain a line break.
- `rows[5]` is the sixth row: run 1's `test_export`. Its `"seconds"` is **`'4.1'`, a string**.

So the data is now a **list of dictionaries**: one dictionary per row, one key per column. That shape is how most data looks when it first arrives in a program, and in Chapter 2 you'll see it is exactly what a pandas table is built from.

```check
run "python explore/read_csv.py" stdout="90\n{'run': '1', 'date': '2026-09-01', 'test': 'test_login', 'seconds': '1.2', 'result': 'pass'}\n4.1 <class 'str'>" label="read_csv.py reads 90 rows as dictionaries of strings"
```

## Every number needs converting

Add up every second the CI system spent on these tests. Add a loop to `explore/read_csv.py`:

```python file=explore/read_csv.py
import csv

with open("data/ci_runs.csv", newline="") as f:
    rows = list(csv.DictReader(f))
print(len(rows))
print(rows[0])
print(rows[5]["seconds"], type(rows[5]["seconds"]))

total = 0
for row in rows:
    total = total + float(row["seconds"])
print("total seconds:", total)
```

```predict
question: Without float(...) around row["seconds"], what would happen?
choice: The same total
choice: The seconds would be joined into one long string
choice: A TypeError on the first row
answer: A TypeError on the first row
explain: `total` starts as the int 0. `0 + "1.2"` asks Python to add a number and a string, and Python refuses to guess what that means (lesson 0.2): `TypeError: unsupported operand type(s) for +: 'int' and 'str'`. If `total` had started as the string `""`, it *would* join them into one long string, with no error at all, which is worse.
```

```text
90
{'run': '1', 'date': '2026-09-01', 'test': 'test_login', 'seconds': '1.2', 'result': 'pass'}
4.1 <class 'str'>
total seconds: 484.8
```

The loop is lesson 0.3's accumulator. The only new thing is `float(...)`, which converts each `'4.1'` into the number 4.1 as it's used. Remove `float(` and its `)` to see the TypeError, then put them back.

```check
run "python explore/read_csv.py" stdout="total seconds: 484.8" label="read_csv.py adds up all 90 timings: 484.8 seconds"
```

## Grouping, by hand

The rows are in the order the CI system ran them. You want a list of timings **per test**: a dictionary whose keys are test names and whose values are lists of seconds. Start with eight rows typed in, small enough to trace. Create `explore/group_small.py`:

```python file=explore/group_small.py
rows = [
    {"test": "test_login", "seconds": "1.2"},
    {"test": "test_signup", "seconds": "2.2"},
    {"test": "test_search", "seconds": "3.0"},
    {"test": "test_upload", "seconds": "4.0"},
    {"test": "test_checkout", "seconds": "7.7"},
    {"test": "test_export", "seconds": "4.1"},
    {"test": "test_login", "seconds": "1.3"},
    {"test": "test_signup", "seconds": "2.1"},
]

seconds_by_test = {}
for row in rows:
    test = row["test"]
    if test not in seconds_by_test:
        seconds_by_test[test] = []
    seconds_by_test[test].append(float(row["seconds"]))

print(seconds_by_test)
```

```text
{'test_login': [1.2, 1.3], 'test_signup': [2.2, 2.1], 'test_search': [3.0], 'test_upload': [4.0], 'test_checkout': [7.7], 'test_export': [4.1]}
```

### How grouping works

This is the most important pattern in this lesson. It's an accumulator again: the "answer so far" is a whole dictionary, which starts empty and grows by one value per row. Step through the eight rows:

```figure
name: aml/GroupingTrace
caption: Each row does one of two things: a test seen for the first time gets a new, empty list; then the row's seconds are appended to that test's list.
props: {"rows": [["test_login", 1.2], ["test_signup", 2.2], ["test_search", 3.0], ["test_upload", 4.0], ["test_checkout", 7.7], ["test_export", 4.1], ["test_login", 1.3], ["test_signup", 2.1]]}
```

Each pass does two things:

1. **Make sure the test has a list.** `if test not in seconds_by_test:` is `True` only the first time a test name appears. Then `seconds_by_test[test] = []` adds the key with a new, empty list as its value.
2. **Append to that test's list.** `seconds_by_test[test]` looks up the list, and **`.append(...)`** adds the converted seconds to its end.

**Why step 1 is needed.** Without it, the first row would try to look up `"test_login"` in an empty dictionary: `KeyError: 'test_login'`. You can't append to a list that doesn't exist yet.

**Why there's no `=` in step 2.** With numbers you always wrote `total = total + x`, because a number can't be changed: `+` makes a new number, and the name has to be moved to it. A list **can** be changed in place. `seconds_by_test[test]` gives you *the actual list stored in the dictionary*, not a copy, and `.append` changes that list. The dictionary still holds the same list, which now has one more item, so there's nothing to reassign. Values that can be changed in place, like lists and dictionaries, are called **mutable**; numbers and strings are **immutable**.

This is the code to trace in **CodeLens**: open `explore/group_small.py`, press 🔬 Trace in CodeLens, and watch the dictionary in the variables pane. Each list is drawn once, and the dictionary *points* to it. When `.append` runs, you see the list grow while the arrow to it stays the same.

```check
run "python explore/group_small.py" stdout="{'test_login': [1.2, 1.3], 'test_signup': [2.2, 2.1], 'test_search': [3.0], 'test_upload': [4.0], 'test_checkout': [7.7], 'test_export': [4.1]}" label="group_small.py groups eight rows into six lists"
```

## Grouping the whole file

The same loop works on all ninety rows. Create `explore/group.py`:

```python file=explore/group.py
import csv

with open("data/ci_runs.csv", newline="") as f:
    rows = list(csv.DictReader(f))

seconds_by_test = {}
for row in rows:
    test = row["test"]
    if test not in seconds_by_test:
        seconds_by_test[test] = []
    seconds_by_test[test].append(float(row["seconds"]))

for test, seconds in seconds_by_test.items():
    print(test, len(seconds), seconds[:3])
```

```text
test_login 15 [1.2, 1.3, 1.1]
test_signup 15 [2.2, 2.1, 2.2]
test_search 15 [3.0, 3.2, 3.1]
test_upload 15 [4.0, 4.4, 4.7]
test_checkout 15 [7.7, 8.1, 7.5]
test_export 15 [4.1, 4.1, 3.8]
```

Fifteen timings per test, and the first three of `test_export` are the ones you typed in lesson 0.2.

**How it works.** **`.items()`** gives the dictionary's pairs, one at a time, as `(key, value)`. `for test, seconds in ...` **unpacks** each pair into two names: `test` gets the key and `seconds` gets the list. The tests come out in the order they were first added, which is the order they appear in the file.

Nothing in the loop knows how many tests there are or what they're called. Add a seventh test to the file and it gets its own list, with no change to the code. That's the difference between code that handles *this* data and code that handles *data like this*.

```check
run "python explore/group.py" stdout="test_login 15 [1.2, 1.3, 1.1]\ntest_signup 15 [2.2, 2.1, 2.2]\ntest_search 15 [3.0, 3.2, 3.1]\ntest_upload 15 [4.0, 4.4, 4.7]\ntest_checkout 15 [7.7, 8.1, 7.5]\ntest_export 15 [4.1, 4.1, 3.8]" label="group.py shows 15 timings for each of the six tests"
```

## Try it

| Change | What to notice |
|---|---|
| `print(run["date"])` in `dicts.py` | `KeyError: 'date'`. `run.get("date")` returns `None` instead, and `run.get("date", "unknown")` returns `"unknown"`. |
| In `group_small.py`, delete the two `if` lines | `KeyError: 'test_login'` on the first row: there's no list to append to yet. |
| In `group_small.py`, use `seconds_by_test[test] = [float(row["seconds"])]` instead of `.append(...)` | Each test ends with only its *last* timing: `=` replaced the list every time. |
| `cd explore`, then `python read_lines.py` | `FileNotFoundError`: the relative path is looked up from the new current directory. `cd ..` to go back. |
| Create an empty file `explore/csv.py`, then run `python explore/read_csv.py` | `AttributeError: module 'csv' has no attribute 'DictReader'`, and Python 3.13 adds *consider renaming …csv.py since it has the same name as the standard library module*. When you run a script, Python looks for modules **in the script's own folder first**, so `import csv` found your empty file instead of Python's. Never name a file after a module you use (`csv.py`, `types.py`, `random.py`). Delete it. |
| In `read_csv.py`, print `rows[-1]` | The last row: run 15's `test_export`. |
| In `group.py`, print `seconds_by_test["test_export"]` | All fifteen timings, including the 120.0, recovered from the file. |

## Your turn: failure rates from the file

**No code is shown in this step.** Create `explore/rates.py` that reads `data/ci_runs.csv`, groups the **results** (`"pass"` or `"fail"`) by test, and prints each test's failure rate, in the order the tests appear in the file:

```text
test_login: 0% failed
test_signup: 13% failed
test_search: 20% failed
test_upload: 0% failed
test_checkout: 0% failed
test_export: 7% failed
```

```hints
nudge: It's group.py with one change to what's appended, and a different final loop.
concept: Group row["result"] instead of float(row["seconds"]): results are already strings, so no conversion. Then for each test, the failure rate is the count of "fail" in its list divided by the list's length.
shape: Read rows with csv.DictReader; results_by_test = {}; for each row, make sure the test has a list, then append row["result"]. Then for test, results in results_by_test.items(): print an f-string with results.count("fail") / len(results) formatted :.0%.
answer: ~~~python
import csv

with open("data/ci_runs.csv", newline="") as f:
    rows = list(csv.DictReader(f))

results_by_test = {}
for row in rows:
    test = row["test"]
    if test not in results_by_test:
        results_by_test[test] = []
    results_by_test[test].append(row["result"])

for test, results in results_by_test.items():
    print(f"{test}: {results.count('fail') / len(results):.0%} failed")
~~~
Inside the f-string, `'fail'` uses single quotes because the f-string itself is in double quotes. (Since Python 3.12 you may reuse double quotes inside, but single quotes work in every version.) `test_export` failed 1 of 15 runs, 6.67%, shown as `7%`.
```

```check
run "python explore/rates.py" stdout="test_login: 0% failed\ntest_signup: 13% failed\ntest_search: 20% failed\ntest_upload: 0% failed\ntest_checkout: 0% failed\ntest_export: 7% failed" label="rates.py prints each test's failure rate from the file" -- Group row["result"] by row["test"], then print results.count("fail") / len(results) with :.0%.
contains explore/rates.py "ci_runs.csv" label="rates.py reads the data file" -- Open data/ci_runs.csv and read it with csv.DictReader.
```

## What you've learned

- A **CSV** file is a table as text: a header, then one line per row.
- **`with open(path) as f:`** opens a file and guarantees it's closed. A **relative path** is looked up from the current directory.
- **`csv.DictReader`** turns each row into a **dictionary** keyed by the header. Everything read from a file is a **string**: convert numbers with `float(...)`.
- A **dictionary** maps keys to values; lookups are fast because keys are **hashed**.
- **Grouping**: for each row, make sure its group has a list, then `.append` to it. `.append` changes a list in place (lists are **mutable**), so no `=` is needed.
- **`.items()`** loops over a dictionary's pairs, **unpacked** into two names.

Next lesson: everything you've built comes together into a tool you run on the CI system's file, with a proper report at the end.
