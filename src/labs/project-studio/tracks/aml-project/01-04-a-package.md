---
title: 1.4 — A Package You Can Run from Anywhere
runtime: python
---

The modules work, but three problems are left:

1. **The explore scripts can't use them.** `import stats` from `explore/` fails, because a script's own folder is what's on `sys.path`, not `ci-toolkit` (lesson 1.3's Try it).
2. **The report only works from the right folder.** Run it from anywhere else and `import stats` fails the same way.
3. **The names are generic.** `stats`, `runs` and `history` could be anyone's modules. Install a package that also has a module called `stats`, and which one you get depends on the order of `sys.path`, lesson 0.6's shadowing problem again.

All three are solved the way every real Python project solves them: put the modules in a **package** with a distinctive name, `citools`, and **install** it into the project's environment.

## A folder for the package

> **Package**: a folder of modules that's imported as one name. `import citools.stats` imports the module `stats` inside the package `citools`.

Make the folder and move the three modules into it. Use `git mv` rather than moving them in the file tree, so Git records each one as a rename instead of a deletion plus an unrelated new file:

```powershell
mkdir citools
git mv stats.py citools/stats.py
git mv history.py citools/history.py
git mv runs.py citools/runs.py
git status --short
```

```text
R  history.py -> citools/history.py
R  runs.py -> citools/runs.py
R  stats.py -> citools/stats.py
```

`R` is a rename, already staged. Keeping renames as renames means `git log --follow citools/stats.py` still shows the file's whole history, back to when it was `stats.py`.

`ci_report.py` is broken now: `import stats` finds nothing. That's expected; it gets replaced in a few steps.

```check
file citools/stats.py -- Run mkdir citools, then git mv stats.py citools/stats.py (and the same for history.py and runs.py).
file citools/history.py
file citools/runs.py
missing stats.py -- Use git mv to move stats.py into citools.
```

## Mark it as a package

Create `citools/__init__.py`, containing one line:

```python file=citools/__init__.py
"""Tools for analysing a CI system's test runs."""
```

```powershell
python -c "import citools; print(citools.__doc__)"
python -c "import citools.stats; print(citools.stats.median([4, 1, 3, 2]))"
```

```text
Tools for analysing a CI system's test runs.
2.5
```

**How it works.**

- **`__init__.py`** is the code that runs when the *package* is imported: `import citools.stats` first imports `citools` (running `__init__.py`), then `citools.stats`. Most `__init__.py` files are empty or nearly so; their job is to say "this folder is a package". (Python can import a folder without one, a *namespace package*, but that's meant for packages split across several folders. A normal package has an `__init__.py`.)
- **The string on the first line is a docstring**: a string on its own as the first statement of a module, function or class. Python doesn't run it as an instruction; it stores it as that thing's documentation, `__doc__`, which tools and `help(citools)` show. A one-line description is good manners for any package.
- **`citools.stats`** is found by finding `citools` on `sys.path` first, then `stats.py` inside it. Only one name, `citools`, has to be unique on `sys.path` now.

```check
run "python -c \"import citools, citools.stats; print(citools.__doc__); print(citools.stats.median([4, 1, 3, 2]))\"" stdout="Tools for analysing a CI system's test runs.\n2.5" label="citools is a package with a docstring, and citools.stats imports" -- Create citools/__init__.py with the docstring as its only line.
```

## The report as a function

The report becomes a module of the package too: `citools/report.py`. Its code moves inside a function, **`main(argv)`**, which **returns** the exit code instead of calling `sys.exit`. Create it:

```python file=citools/report.py
from citools.history import verdict
from citools.runs import group_by_test, load_runs
from citools.stats import failure_rate, mean, median

USAGE = "usage: python -m citools RUNS_CSV"


def main(argv):
    if len(argv) != 1:
        print(USAGE)
        return 2

    rows = load_runs(argv[0])
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
        return 1
    return 0
```

Most of this is `ci_report.py`'s code, indented one level more to sit inside the function. What's different:

- **Imports name the package**: `from citools.stats import ...`. These are **absolute imports**: they say where the module is from the top of the package, so they work the same whoever imports `report`.
- **`argv` is a parameter.** The function is given the command-line words instead of reaching for `sys.argv` itself, so it no longer needs `sys` at all. `argv[0]` is the file, because whoever calls `main` will pass the words *after* the program's name.
- **`return 2` instead of `sys.exit(2)`.** `sys.exit` ends the whole Python program on the spot. A function that does that can only ever be the last thing a program does: you couldn't call it twice, or call it and then check what it printed. Returning the code leaves that decision to the caller.
- **`USAGE`** is a **constant**: a name for a value that never changes, written in capitals by convention so readers know not to reassign it.

**Why all this matters next lesson:** a test can call `main(["data/ci_runs.csv"])`, look at the return value, and check what was printed, all without starting a new program. Code that takes its inputs as parameters and returns its results is code you can test.

```check
run "python -c \"from citools.report import main; print('returned', main([]))\"" stdout="usage: python -m citools RUNS_CSV\nreturned 2" label="main([]) prints the usage line and returns 2" -- main must return 2 after printing USAGE, not call sys.exit.
run "python -c \"from citools.report import main; print('returned', main(['data/ci_runs.csv']))\"" stdout="  failing now: \nreturned 0" label="main(['data/ci_runs.csv']) prints the report and returns 0"
```

## Run the package

Python runs a package with `-m` by running a module inside it called `__main__`. Create `citools/__main__.py`:

```python file=citools/__main__.py
import sys

from citools.report import main

sys.exit(main(sys.argv[1:]))
```

```powershell
python -m citools data/ci_runs.csv
python -m citools
$LASTEXITCODE
```

The first prints the report; the second prints the usage line, and `$LASTEXITCODE` shows `2`.

**How it works.** `python -m citools`:

1. puts the **current directory** at the front of `sys.path` (not a script's folder: there's no script);
2. finds the package `citools` there and imports it (running `__init__.py`);
3. runs `citools/__main__.py` as the program, with `__name__` set to `"__main__"`.

`__main__.py` is the only file that touches the outside world: it reads `sys.argv`, drops the first word (the program's name) with the slice `[1:]` (lesson 0.3: from index 1 to the end), calls `main`, and hands the returned code to `sys.exit`. Everything else in the package is functions that take inputs and return results.

```check
run "python -m citools data/ci_runs.csv" stdout="test_export       15      7%     4.1   11.77    120.0  broke, then fixed" label="python -m citools data/ci_runs.csv prints the report" -- Create citools/__main__.py calling sys.exit(main(sys.argv[1:])).
run "python -m citools" exit=2 stdout="usage: python -m citools RUNS_CSV" label="with no file, it prints the usage line and exits with code 2"
```

## Retire ci_report.py

The package does everything `ci_report.py` did. Delete it through Git, so the deletion is staged with the rest of the change:

```powershell
git rm ci_report.py
```

```check
missing ci_report.py -- Run git rm ci_report.py
```

## Describe the project

`python -m citools` still only works from the `ci-toolkit` folder, because that's what `-m` puts on `sys.path`. To make `citools` importable from anywhere, **install** it into the environment, like pytest. pip needs a description of what to install. Create `pyproject.toml` in the `ci-toolkit` folder:

```toml file=pyproject.toml
[build-system]
requires = ["setuptools>=80"]
build-backend = "setuptools.build_meta"

[project]
name = "ci-toolkit"
version = "0.1.0"
requires-python = ">=3.12"

[tool.setuptools]
packages = ["citools"]
```

> **pyproject.toml**: the standard file describing a Python project: its name, version, what it needs, and how to build it. **TOML**: a simple settings format of `[sections]` and `key = value` lines.

Read it section by section:

- **`[build-system]`** says which tool turns this folder into something pip can install: **setuptools**, the oldest and most widely used. pip fetches it for the install and doesn't keep it.
- **`[project]`** is the project's identity: its **distribution name**, `ci-toolkit` (what `pip list` will show), a version, and the Pythons it supports. The distribution name and the import name, `citools`, don't have to match, and often don't.
- **`[tool.setuptools]`** tells setuptools which packages to include: just `citools`, not `explore` or `data`.

```check
contains pyproject.toml "packages = [\"citools\"]" -- [tool.setuptools] must list the package: packages = ["citools"]
contains pyproject.toml "name = \"ci-toolkit\""
```

## Install it, editable

Add the project itself to `requirements.txt`, so the one install command sets up everything:

```text file=requirements.txt
pytest==9.1.1
-e .
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

```text
...
Successfully built ci-toolkit
Successfully installed ci-toolkit-0.1.0
```

Now try it from a different folder:

```powershell
cd explore
..\.venv\Scripts\python -m citools ..\data\ci_runs.csv
cd ..
```

It works: the environment's Python finds `citools` wherever you are.

**How it works.** **`-e .`** means "install the project in this folder (`.`), in **editable** mode". An ordinary install would *copy* `citools` into `.venv\Lib\site-packages`, and every later change you made to the code would need another install. Editable mode copies nothing. Instead, pip writes two small files into site-packages: a `.pth` file and a **finder**. Python reads every `.pth` file in site-packages as it starts; this one runs the finder, which tells `import` that `citools` lives in *your* `ci-toolkit\citools` folder. So the environment always imports your current code.

```check
run "Set-Location explore; ..\.venv\Scripts\python -m citools ..\data\ci_runs.csv" stdout="Needs attention:" label="the environment's Python runs citools from inside explore" -- Add -e . to requirements.txt and run .venv\Scripts\python -m pip install -r requirements.txt
```

## Ignore setuptools' notes

A folder called `ci_toolkit.egg-info` also appeared: setuptools' notes about the install, generated, like `__pycache__`. Add it to `.gitignore`:

```text file=.gitignore
.venv/
__pycache__/
*.egg-info/
```

`*` matches any characters, so `*.egg-info/` ignores any folder whose name ends in `.egg-info`.

```check
git-ignored ci_toolkit.egg-info -- Add the line *.egg-info/ to .gitignore.
```

## Try it

| Change | What to notice |
|---|---|
| `.venv\Scripts\python -m pip show ci-toolkit` | Its name, version and where it's installed from. |
| `python -m citools data/ci_runs.csv` from **inside** `explore` with the computer's Python | `No module named citools`: only the environment knows about the install. |
| Change `USAGE` in `report.py`, then run `.venv\Scripts\python -m citools` | The new text appears with no reinstall: editable mode imports your files. |
| `python -c "import citools; help(citools)"` | The docstring, as documentation. Press `q` to leave. |
| `git status --short` | Renames (`R`), new files (`??` or `A`), a deletion (`D`). |

## Your turn: use the package from a script

**No code is shown in this step.** Create `explore/slow_tests.py`, which uses the package's functions (it defines none of its own) to print every test whose median run time is over 5 seconds:

```text
test_upload: median 6.6 s
test_checkout: median 8.2 s
```

Run it with the environment's Python: `.venv\Scripts\python explore/slow_tests.py`.

```hints
nudge: You need two things from the package: something that loads and groups the runs, and something that computes a median.
concept: citools.runs has load_runs and group_by_test; citools.stats has median. Because citools is installed in the environment, an explore script can import it like any other package.
shape: Two from-imports, load and group the runs from "data/ci_runs.csv", then a loop over seconds_by_test.items() with an if on median(seconds) > 5.0.
answer: ~~~python
from citools.runs import group_by_test, load_runs
from citools.stats import median

rows = load_runs("data/ci_runs.csv")
seconds_by_test, results_by_test = group_by_test(rows)
for test, seconds in seconds_by_test.items():
    if median(seconds) > 5.0:
        print(f"{test}: median {median(seconds)} s")
~~~
Run it from the `ci-toolkit` folder: the data path is still relative to where you run it.
```

```check
run ".venv/Scripts/python explore/slow_tests.py" stdout="test_upload: median 6.6 s\ntest_checkout: median 8.2 s" label="slow_tests.py prints the two slow tests" -- Import load_runs and group_by_test from citools.runs and median from citools.stats.
contains explore/slow_tests.py "from citools" label="slow_tests.py uses the citools package"
lacks explore/slow_tests.py "def " label="slow_tests.py defines no functions of its own" -- Use the package's functions instead of writing new ones.
```

## Commit the package

Update the **run** command in your `README.md`, which still mentions `ci_report.py`, to

```text
.venv\Scripts\python -m citools data/ci_runs.csv
```

Then commit everything, with a message that mentions the **package**:

```powershell
git add .
git commit -m "Turn the report into an installable package"
```

```check
contains README.md "-m citools" -- Change the run command in README.md to .venv\Scripts\python -m citools data/ci_runs.csv
lacks README.md "ci_report.py" -- ci_report.py doesn't exist any more: update the README.
git-message "package" -- Commit with a message that mentions the package.
git-clean -- Run git add . and commit, so nothing is left uncommitted.
```

## What you've learned

- A **package** is a folder of modules with an **`__init__.py`**; `import citools.stats` finds `citools` on `sys.path`, then `stats.py` inside it. A **docstring** documents a module or function.
- **`python -m citools`** puts the current directory on `sys.path` and runs `citools/__main__.py`. Keep that file thin: read `sys.argv`, call `main`, exit with what it returns.
- **`main(argv)`** takes its inputs as a parameter and **returns** an exit code, which makes it callable and testable.
- **`pyproject.toml`** describes the project; **`pip install -e .`** installs it **editable**, so the environment imports your live code from anywhere.
- **`git mv`** and **`git rm`** keep renames and deletions in the history.

Next lesson: the asserts under `__name__` guards were a start. **pytest** turns them into real tests, including tests of the report itself.
