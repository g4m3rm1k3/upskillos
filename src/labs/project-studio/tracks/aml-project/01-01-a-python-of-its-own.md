---
title: 1.1 — A Python of Its Own
track: Applied ML — A Project of Its Own
runtime: python
---

`ci_report.py` works, but it's held together by hand. Its tests are `assert` lines that run every time the report does; everything is in one file; and it depends on whatever Python happens to be installed on the computer it runs on. This chapter turns it into a **project**: a folder that anyone (including you, in six months, on a new laptop) can rebuild and run exactly as it works today.

The first job is the tests. Real Python projects test with **pytest**, a tool that finds and runs test functions and shows precisely what went wrong when one fails. pytest doesn't come with Python: it's a **package** someone else wrote, which you install. And *where* it gets installed turns out to matter a great deal.

## A package Python doesn't have

Ask Python to run pytest:

```powershell
python -m pytest --version
```

`-m pytest` means "find the module called `pytest` and run it as a program". You'll get one of two answers:

```text
C:\...\python.exe: No module named pytest
```

or a version number, like `pytest 7.4.3`, because some program or some earlier tutorial installed a pytest into this computer's Python.

```predict
question: Which of those two answers is a problem for your project?
choice: "No module named pytest", because the tests can't run
choice: A version number, because you didn't choose it
choice: Both
answer: Both
explain: "No module named pytest" is the obvious problem. The quiet one is a version number you didn't choose. Your project would depend on *whatever pytest is on this computer*: a different version on a colleague's machine, or on the CI server, can behave differently, and nothing in your project folder would record which one the code was written for. Lesson 0.1 said a project should be a folder someone else can rebuild. A package installed into the computer's Python, outside the folder, breaks that.
```

The fix is to give the project **its own Python**, with exactly the packages it needs, written down in the folder.

## Where Python looks for modules

When your code says `import csv`, Python has to find a file. It searches a list of folders, in order, and uses the first match. Create `explore/search_path.py`:

```python file=explore/search_path.py
import sys

for folder in sys.path:
    print(folder)
```

```powershell
python explore/search_path.py
```

```text
C:\Users\you\Documents\ci-toolkit\explore
C:\Python313\python313.zip
C:\Python313\DLLs
C:\Python313\Lib
C:\Python313
C:\Python313\Lib\site-packages
```

Your paths will differ (and may include more folders), but the shape is the same.

> **`sys.path`**: the list of folders Python searches, in order, when it imports a module. **site-packages**: the folder where installed packages go.

**How it works.** `sys.path` is an ordinary list of strings that Python builds as it starts:

1. **The script's own folder** comes first: here, `explore`. That's why an `explore/csv.py` hid Python's `csv` module in lesson 0.6, and why `explore/types.py` broke `import csv` while this course was being written: Python found your file before its own.
2. **The standard library**: `Lib` and friends, where `csv.py`, `random.py` and the rest live.
3. **site-packages**: everything installed with `pip`. There's one for the whole computer's Python, and often one more inside your user folder.

`import pytest` succeeds only if some folder on this list contains a `pytest` package. So "installing a package" just means *putting its files in a folder that's on `sys.path`*, and the question "which pytest do I get?" is "which folders are on the list?".

```check
run "python explore/search_path.py" stdout="site-packages" label="search_path.py lists Python's search folders, including a site-packages" -- Loop over sys.path and print each folder.
run "python explore/search_path.py" stdout="explore" label="the first folder is the script's own folder"
```

## Make a virtual environment

In the terminal, in the `ci-toolkit` folder:

```powershell
python -m venv .venv
```

It takes a few seconds and prints nothing. A new folder, `.venv`, appears in the file tree. Look inside it:

```text
.venv
├── Include
├── Lib
│   └── site-packages      (pip is the only thing in here)
├── Scripts
│   ├── python.exe
│   ├── pip.exe
│   └── Activate.ps1  (and a few other activate scripts)
└── pyvenv.cfg
```

> **Virtual environment** (**venv**): a folder holding a Python of its own, with its own site-packages, so one project's packages never mix with another's.

Open `.venv/pyvenv.cfg`. It's a small text file:

```text
home = C:\Python313
include-system-site-packages = false
version = 3.13.5
```

The name `.venv` is a convention almost every Python tool recognises. The dot at the start marks it as "not part of the project's own code".

```check
file .venv/pyvenv.cfg -- In the terminal, in the ci-toolkit folder, run python -m venv .venv
```

## How the environment's Python is different

Run the same script with the environment's Python. Its path is `.venv\Scripts\python`:

```powershell
.venv\Scripts\python explore/search_path.py
```

```text
C:\Users\you\Documents\ci-toolkit\explore
C:\Python313\python313.zip
C:\Python313\DLLs
C:\Python313\Lib
C:\Python313
C:\Users\you\Documents\ci-toolkit\.venv
C:\Users\you\Documents\ci-toolkit\.venv\Lib\site-packages
```

The standard library folders are the same, but **site-packages** is now `.venv\Lib\site-packages`, and the computer-wide site-packages (and the one in your user folder) are gone.

### How it works

`.venv\Scripts\python.exe` is the same Python program, not a copy of the whole of Python. What makes it different is what it does as it starts:

1. It looks for a file called `pyvenv.cfg` next to itself or one folder up. It finds `.venv\pyvenv.cfg`.
2. `home = C:\Python313` tells it where the real Python lives, so it uses *that* standard library. Nothing was copied.
3. It sets `sys.prefix` (Python's idea of "where am I installed?") to the `.venv` folder, so the site-packages it puts on `sys.path` is `.venv\Lib\site-packages`.
4. `include-system-site-packages = false` tells it **not** to add the computer-wide site-packages.

So the environment's Python sees the standard library, plus only what's been installed into `.venv`, which right now is nothing but pip. Packages installed for other projects, or for the whole computer, are invisible to it. Python records the difference in two variables:

```powershell
.venv\Scripts\python -c "import sys; print(sys.prefix); print(sys.base_prefix)"
```

```text
C:\Users\you\Documents\ci-toolkit\.venv
C:\Python313
```

`sys.base_prefix` is always the real Python's folder. Inside a virtual environment, `sys.prefix` is different from it; outside one, they're the same. (`python -c "..."` runs the code in the quotes instead of a file: handy for one-line questions like this.)

```check
run ".venv/Scripts/python -c \"import sys; assert sys.prefix != sys.base_prefix\"" label=".venv holds a working virtual environment"
run ".venv/Scripts/python explore/search_path.py" stdout=".venv" label="the environment's Python searches the environment's site-packages"
```

## Pin what the project needs

Write down what the project needs. Create `requirements.txt` in the `ci-toolkit` folder:

```text file=requirements.txt
pytest==9.1.1
```

> **requirements.txt**: a list of the packages a project needs, one per line. **Pinning**: giving an exact version with `==`, so every install gets the same one.

**Why pin?** `pytest` on its own means "the newest pytest on the day you install". Today that's 9.1.1; in a year it will be something else, possibly with changed behaviour. `pytest==9.1.1` means exactly this version, every time, on every computer, so a test that passes today passes next year for the same reason. When you *want* a newer version, you change the number on purpose, and the change shows up in the project's history (next lesson).

```check
contains requirements.txt "pytest==9.1.1" -- One line: pytest==9.1.1, with two equals signs.
```

## Install it

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

```text
Collecting pytest==9.1.1 (from -r requirements.txt (line 1))
  ...
Successfully installed colorama-0.4.6 iniconfig-2.3.0 packaging-26.3 pluggy-1.6.0 pygments-2.21.0 pytest-9.1.1
```

(pip may also print a notice that a newer pip is available. You can ignore it.)

**How it works.** **pip** is Python's package installer, and `-m pip` runs the pip that belongs to *this* Python, so it installs into `.venv`. `-r requirements.txt` means "install everything listed in this file". For each line, pip:

1. asks **PyPI** (the Python Package Index, pypi.org, where almost all Python packages are published) for that exact version;
2. downloads it as a **wheel**, a zip file of the package's code in a standard layout;
3. reads the wheel's own list of what *it* needs, its **dependencies**, and fetches those too: pytest needs `pluggy`, `iniconfig`, `packaging`, `pygments` and, on Windows, `colorama`;
4. unzips everything into `.venv\Lib\site-packages`.

That's all installing is: files in a folder on `sys.path`. Look in `.venv\Lib\site-packages` and you'll find a `pytest` folder of Python files you could open and read. See what's installed with:

```powershell
.venv\Scripts\python -m pip list
```

```text
Package   Version
--------- -------
colorama  0.4.6
iniconfig 2.3.0
packaging 26.3
pip       26.1.2
pluggy    1.6.0
Pygments  2.21.0
pytest    9.1.1
```

Now run pytest with the environment's Python:

```powershell
.venv\Scripts\python -m pytest --version
```

```text
pytest 9.1.1
```

Exactly the version you pinned, whatever the computer's own Python has or hasn't got.

```check
run ".venv/Scripts/python -m pytest --version" stdout="pytest 9.1.1" label="pytest 9.1.1 runs with the environment's Python" -- Run .venv\Scripts\python -m pip install -r requirements.txt in the ci-toolkit folder.
```

## Throw it away and rebuild

The environment is **disposable**. The project is described by `requirements.txt`; `.venv` is just something built from it, like a printout of a document. Prove it: delete it and rebuild.

```powershell
Remove-Item -Recurse .venv
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

Same result, from nothing but the file. This is also how anyone else sets up your project, and how you fix an environment that's got into a strange state: don't repair it, rebuild it. It's why `.venv` won't be saved in the project's history in the next lesson. It's a product of `requirements.txt`, not part of the source.

### Why this series types `.venv\Scripts\python` every time

You'll see guides that **activate** the environment first (`.venv\Scripts\Activate.ps1`), after which plain `python` means the environment's Python until you close the terminal. It works, but it's a hidden state: the same command, `python`, runs a different program depending on something you did earlier. (On some Windows computers PowerShell also refuses to run the activate script at all, because of a security setting called the *execution policy*.) Typing the path is a few more characters and always means exactly one thing, so this series does that.

```check
run ".venv/Scripts/python -m pytest --version" stdout="pytest 9.1.1" label="the rebuilt environment has pytest 9.1.1"
```

## Try it

| Change | What to notice |
|---|---|
| `python -m pip list` (no `.venv\Scripts\`) | The computer's own packages: a different list, maybe a long one. |
| `.venv\Scripts\python -c "import pytest; print(pytest.__file__)"` | The exact file that `import pytest` found: inside `.venv\Lib\site-packages`. |
| `python -c "import sys; print(sys.prefix == sys.base_prefix)"` | `True`: the computer's Python isn't in a virtual environment. |
| Change the pin to `pytest==1.0.0` and install again | pip can't find a version that works with your Python and stops with an error. Put `9.1.1` back. |
| Run `python explore/search_path.py` from inside the `explore` folder (`cd explore`, then `python search_path.py`) | The first folder is still `explore`: it's the **script's** folder that goes first, not the current directory. `cd ..` to go back. |

## Your turn: an environment check

**No code is shown in this step.** Every project has someone who runs it with the wrong Python. Create `explore/env_check.py` so that:

- run with the **environment's** Python, `.venv\Scripts\python explore/env_check.py`, it prints exactly

  ```text
  virtual environment: yes
  pytest: 9.1.1
  ```

- run with the **computer's** Python, `python explore/env_check.py`, it prints

  ```text
  virtual environment: no (run it with .venv\Scripts\python)
  ```

  and exits with code **1**, without trying to import pytest (which may not exist there, or may be the wrong version).

```hints
nudge: Two questions: are we in a virtual environment, and which pytest version is installed? The first decides whether to ask the second.
concept: Inside a virtual environment sys.prefix differs from sys.base_prefix. pytest.__version__ is the installed version as a string. An import doesn't have to be at the top of a file: put import pytest after the check, so it only happens inside the environment.
shape: import sys; if sys.prefix == sys.base_prefix: print the "no" line and sys.exit(1). After that, import pytest and print the two lines. In a normal Python string, \ starts an escape, so write the path as .venv\\Scripts\\python, or use a raw string r"...".
answer: ~~~python
import sys

if sys.prefix == sys.base_prefix:
    print(r"virtual environment: no (run it with .venv\Scripts\python)")
    sys.exit(1)

import pytest

print("virtual environment: yes")
print(f"pytest: {pytest.__version__}")
~~~
The `r` before the string makes it a **raw string**: backslashes are kept as they are instead of starting escapes like `\n`. Here `\S` and `\p` wouldn't be escapes anyway, but Python 3.12 and later warn about backslashes that aren't valid escapes, and raw strings are the habit to have for Windows paths. `sys.exit(1)` before the `import` means the import never runs outside the environment.
```

```check
run ".venv/Scripts/python explore/env_check.py" stdout="virtual environment: yes\npytest: 9.1.1" label="with the environment's Python, it reports yes and pytest 9.1.1" -- Compare sys.prefix with sys.base_prefix, then import pytest and print pytest.__version__.
run "python explore/env_check.py" exit=1 stdout="virtual environment: no (run it with .venv\Scripts\python)" label="with the computer's Python, it says how to fix it and exits with 1" -- Print the message and call sys.exit(1) when sys.prefix == sys.base_prefix.
run "python -c \"import runpy, sys; sys.modules['pytest'] = None; runpy.run_path('explore/env_check.py')\"" exit=1 stdout="virtual environment: no" label="outside the environment it never imports pytest" -- Put import pytest after the check, so the program exits before it.
```

## What you've learned

- **`sys.path`** is the list of folders `import` searches, in order: the script's folder, the standard library, then **site-packages**. Installing a package means putting its files in site-packages.
- A **virtual environment** is a folder with its own site-packages. Its `python.exe` finds `pyvenv.cfg` as it starts and searches only the environment's packages; `sys.prefix` differs from `sys.base_prefix`.
- **`requirements.txt`** with **pinned** versions (`==`) records exactly what the project needs. `.venv` is built from it, so it's disposable: rebuild it rather than repair it.
- **pip** downloads **wheels** from **PyPI**, with their **dependencies**, into the environment's site-packages.
- Run the environment's Python by its path, `.venv\Scripts\python`, so the command always means one thing.

Next lesson: you're about to take `ci_report.py` apart and rebuild it as a project. Before changing that much code, you'll set up the safety net that lets you undo anything: **Git**.
