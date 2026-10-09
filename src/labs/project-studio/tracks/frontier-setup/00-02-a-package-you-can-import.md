---
title: 0.2 — A Package You Can Import
runtime: python
support: tests/conftest.py
---

A pile of scripts works until one script needs a function from another. Then you start copying functions between files, or running everything from one particular folder so the imports happen to work. This lesson does it the way NumPy and every other library you install does it: your code becomes a **package** with a name, installed into the project's environment, so `import frontier` works from any file and any folder.

Its first module records facts about the machine: the Python version, the operating system, the version of each library. That sounds dull, but in Chapter 11 every experiment you run saves these facts next to its results. When a number changes between two runs, the first question is always "what was different?", and this is half the answer.

## A package is a folder

A **module** is one `.py` file. A **package** is a folder of modules with an `__init__.py` file in it. When you `import frontier`, Python finds the folder and runs its `__init__.py`. Whatever that file defines becomes `frontier.<name>`.

Create the folders `src` and `src/frontier`, then `src/frontier/__init__.py`:

```python file=src/frontier/__init__.py
"""Frontier: the code you write in this series."""

__version__ = "0.1.0"
```

The text in triple quotes at the top is the module's **docstring**: `help(frontier)` shows it. `__version__` is a convention: most packages say what version they are this way, which is how `numpy.__version__` worked in the last lesson's check.

Why `src/frontier` and not just `frontier` at the top of the project? Before installing anything, try to import it:

```predict
question: From the project folder, what does `.venv\Scripts\python -c "import frontier"` do?
choice: It imports the package
choice: ModuleNotFoundError
choice: SyntaxError
answer: ModuleNotFoundError
explain: Python only looks for packages in the folders listed in `sys.path`. With `-c`, the first entry is the current folder (the project folder), and `frontier` isn't there: it's inside `src`. So the import fails, on purpose.
verify: .venv/Scripts/python -c "import subprocess, sys; r = subprocess.run([sys.executable, '-c', 'import frontier'], capture_output=True, text=True); print('ModuleNotFoundError' if 'ModuleNotFoundError' in r.stderr else 'It imports the package')"
```

See the list for yourself:

```powershell
.venv\Scripts\python -c "import sys; print('\n'.join(sys.path))"
```

The first line is empty: that means "the current folder". Then come the standard library's folders, and last `.venv\Lib\site-packages`. When you `import` a name, Python tries each folder in that order and takes the first match.

If the package sat at the top of the project, `import frontier` would work, but only by accident: only when the current folder happens to be the project folder. Run the same code from another folder and it breaks. Worse, tests would import the loose folder rather than the installed package, so they'd pass even when the installed package is broken. The `src` folder blocks the accident. The only way to import `frontier` is to install it, and that's the next step.

```check
file src/frontier/__init__.py
```

## pyproject.toml: what the project is

A package is installed from a description of it. Today's standard is a file named `pyproject.toml` at the top of the project. Create it:

```toml file=pyproject.toml
[build-system]
requires = ["setuptools>=70"]
build-backend = "setuptools.build_meta"

[project]
name = "frontier"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["numpy>=2"]

[tool.setuptools.packages.find]
where = ["src"]
```

TOML is a settings format: `[section]` headings, then `key = value` lines. The three sections:

- **`[build-system]`**: which tool turns this folder into an installable package. pip doesn't do it itself. It downloads the tool named here (setuptools, the oldest and most common one) into a temporary environment and asks it.
- **`[project]`**: the package's name, version, which Pythons it supports, and its **dependencies**, the packages it needs to work.
- **`[tool.setuptools.packages.find]`**: tells setuptools to look for packages inside `src`.

Notice `numpy>=2` here and `numpy==2.5.3` in `requirements.txt`. They answer different questions. `dependencies` says what the package **can** work with, as a range, so it can be installed next to other packages that need a slightly different NumPy. `requirements.txt` says exactly what **this** environment contains, so it can be rebuilt identically. Libraries publish ranges. Projects you run experiments in also pin.

Now install the project into its own environment:

```powershell
.venv\Scripts\python -m pip install -e .
```

`.` means "the project in this folder". `-e` means **editable**. A normal install copies the package's files into `site-packages`, so editing `src/frontier` afterwards would change nothing until you installed again. An editable install copies nothing. It puts a small file in `site-packages` whose name starts with `__editable__` and ends in `.pth`. Python reads every `.pth` file in `site-packages` when it starts and adds the folders they name to `sys.path`. This one names your `src` folder. Your code stays where you edit it, and Python finds it from anywhere.

The install also made a folder named `src/frontier.egg-info`: setuptools' notes about the package (its name, version, file list). It's rebuilt on every install, so add one line to `.gitignore`:

```text
*.egg-info/
```

`*` matches any name, so this ignores the folder whatever the package is called.

```check
run ".venv/Scripts/python -c \"import frontier; print(frontier.__version__)\"" stdout="0.1.0" label="import frontier works from the project folder" -- Run .venv\Scripts\python -m pip install -e . in the project folder.
run ".venv/Scripts/python -c \"import frontier, pathlib; assert pathlib.Path(frontier.__file__).parent.parent.name == 'src', frontier.__file__\"" label="it's an editable install: Python imports your src folder, not a copy" -- Install with -e: .venv\Scripts\python -m pip install -e .
contains .gitignore "*.egg-info/" label=".gitignore ignores setuptools' build notes" -- Add the line *.egg-info/ to .gitignore.
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.**

Every lesson from here on comes with a test file: small functions that run your code and check what it does. **Check my work** runs them. Reading them first tells you exactly what you're about to build.

Click **Create provided tests/test_info.py** above. It also creates a second supplied file, `tests/conftest.py`, explained below.

```python file=tests/test_info.py provided
# Tests for src/frontier/info.py (lesson 0.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_info.py
import platform


def test_environment_names_this_python():
    from frontier.info import environment
    assert environment()["python"] == platform.python_version()


def test_environment_names_the_numpy_it_imported():
    import numpy
    from frontier.info import environment
    assert environment()["numpy"] == numpy.__version__


def test_report_has_one_line_per_fact():
    from frontier.info import environment, report
    lines = report().splitlines()
    assert len(lines) == len(environment()), "one line for each key in environment()"
    assert lines[0] == f"python: {platform.python_version()}"
```

How to read a test:

- Each `def test_…` is one test. pytest finds every function whose name starts with `test_` in every file whose name starts with `test_`, and calls it.
- `assert something` checks that `something` is true. If it isn't, the test fails, and pytest shows the values involved and the message after the comma.
- The imports are **inside** each test. While `info.py` doesn't exist yet, or has no `report`, only the tests that need it fail and the rest still run. That's why each step below can check its own part while later parts are still missing.
- The tests import `frontier.info`, the installed package, just as any other code would. That works from the `tests` folder only because of the install you just did.

Now open `tests/conftest.py`. pytest runs a file with this name before any test in its folder:

```python
import os

threads = os.environ.get("TORCH_NUM_THREADS", "2")
for name in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS"):
    os.environ.setdefault(name, threads)
```

NumPy and, later, PyTorch do their heavy maths in compiled libraries that start one **thread** (one stream of work the processor runs) for every core your CPU has. That's right for a long training run and wrong for a quick test: the test grabs every core, and the rest of the computer stalls until it finishes. These libraries read those environment variables when they start, so setting them here, before any import, limits them to two threads. `setdefault` sets each one only if it isn't set already, so you can still choose differently for a big run.

Each check below runs one part of the test file with `-k`: `pytest -k environment` runs only the tests whose names contain `environment`.

```check
file tests/conftest.py -- Click "Create provided tests/test_info.py" above; it creates this file too.
file tests/test_info.py -- Click "Create provided tests/test_info.py" above.
```

## Your machine, as data

Create `src/frontier/info.py`:

```python file=src/frontier/info.py
"""Facts about the machine and the packages a run used."""
import platform

import numpy


def environment():
    return {
        "python": platform.python_version(),
        "system": f"{platform.system()} {platform.release()}",
        "numpy": numpy.__version__,
    }
```

- **`platform`** is a standard-library module that asks the operating system about itself. `python_version()` gives `"3.13.14"`. `system()` and `release()` give `"Windows"` and `"11"`.
- The function returns a **dictionary**, not printed text. Data can be saved, compared and tested. Text can only be read. Two runs' environments can later be compared key by key to find what changed.
- Imports go at the top, standard library first, then a blank line, then installed packages. That's the usual order (the style guide PEP 8 sets it), so a reader sees at a glance what the module depends on.

Try it from the terminal:

```powershell
.venv\Scripts\python -c "from frontier.info import environment; print(environment())"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_info.py -k environment" label="environment() names the Python and NumPy versions" -- Return a dictionary with the keys "python", "system" and "numpy".
```

## Your turn: a `frontier-info` command

**Build, on your own:** a command named `frontier-info` that prints one fact per line, like this:

```text
python: 3.13.14
system: Windows 11
numpy: 2.5.3
```

Three pieces:

1. In `info.py`, a function `report()` that **returns** that text as one string (the test checks it), with one `key: value` line per entry of `environment()`.
2. In `info.py`, a function `main()` that prints `report()`.
3. In `pyproject.toml`, a new section that turns `main` into a command:

   ```toml
   [project.scripts]
   frontier-info = "frontier.info:main"
   ```

   It means "a command named `frontier-info` that calls `main` in the module `frontier.info`". Put it after the `[project]` section.

pip only creates commands when it installs, so after changing `pyproject.toml`, install again with the same `-e` command. pip then writes `.venv\Scripts\frontier-info.exe`, a small program that starts the environment's Python and calls your `main`. Run it:

```powershell
.venv\Scripts\frontier-info
```

```hints
nudge: `report` builds a list of lines, one for each `key, value` in `environment().items()`, and joins them with a newline.
concept: `"\n".join(parts)` puts a newline between the parts. `f"{key}: {value}"` makes one line. A generator expression can go straight inside `join(...)`.
answer: Add to `src/frontier/info.py`:
~~~python
def report():
    return "\n".join(f"{key}: {value}" for key, value in environment().items())


def main():
    print(report())
~~~
Add to `pyproject.toml`, after the `[project]` section:
~~~toml
[project.scripts]
frontier-info = "frontier.info:main"
~~~
Then install again: `.venv\Scripts\python -m pip install -e .`
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_info.py -k report" label="report() gives one key: value line per fact" -- Join one f"{key}: {value}" line per item of environment() with "\n".
run ".venv/Scripts/frontier-info" stdout="numpy: " label="the frontier-info command prints the report" -- Add the [project.scripts] section to pyproject.toml, then run .venv\Scripts\python -m pip install -e . again.
```

### What you have

```text
frontier/
  pyproject.toml          what the package is, what it needs, its commands
  requirements.txt        the exact environment
  src/frontier/
    __init__.py
    info.py               environment(), report(), main()
  tests/
    conftest.py           two threads for tests
    test_info.py
```

Next lesson: PyTorch, and the first time you check one library's answer against another.
