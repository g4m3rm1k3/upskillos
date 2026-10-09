---
title: 0.1 — A Project With Its Own Python
track: Frontier — A Real Project
trackOrder: 15
runtime: none
---

This series goes from scripts you'd hack together to the methods behind modern AI: your own autograd engine, your own GPT, language models trained by reinforcement learning, and AlphaZero-style search. Nothing is used as a black box. You build each mechanism by hand, check it against the library that professionals use, and then use that library for real work.

You need to be able to write a Python script that works: variables, loops, functions, lists and dictionaries. Everything else is taught when a lesson first needs it, including how to structure a project, test it and debug it, the computer science behind it, the mathematics and all of the machine learning. You type every line yourself, and **Check my work** runs your code to check it.

Chapter 0 sets up the project the whole series builds on. It's the same setup professional Python projects use, and every later lesson relies on it, so it's worth getting right once.

## Choose the project folder

1. Click **Choose folder…** in the middle of this window.
2. Go to your **Documents** folder, make a **New folder** named `frontier`, select it and click **Select Folder**.

Keep the name short and the folder near the top of your drive. Lesson 0.3 installs PyTorch, whose deepest file paths are long, and Windows refuses paths longer than 260 characters unless long paths are turned on. `Documents\frontier` keeps them well inside the limit.

The terminal at the bottom now runs inside `frontier`. Check which Python you have:

```powershell
python --version
```

```text
Python 3.13.14
```

This series needs **Python 3.12 or newer**, because the NumPy version it uses doesn't install on anything older.

If PowerShell says `python` isn't recognized, or opens the Microsoft Store, install Python from [python.org](https://www.python.org/downloads/). In the installer, tick **Add python.exe to PATH**, then close and reopen this window so the terminal sees it.

```check
run "python -c \"import sys; assert sys.version_info >= (3, 12), sys.version\"" label="Python 3.12 or newer runs from the terminal" -- Install Python 3.12 or newer from python.org and tick "Add python.exe to PATH", then reopen this window.
```

## Make a virtual environment

When you `pip install` a package, it goes into one Python installation's `site-packages` folder, which every program using that Python shares. If two projects need different versions of the same package, installing one breaks the other. A **virtual environment** solves this: it's a folder that acts as a Python of its own, with its own empty `site-packages`.

Type:

```powershell
python -m venv .venv
```

`-m venv` means "run the module named `venv`", which comes with Python. `.venv` is the folder it creates. The leading dot is a convention that editors such as VS Code recognise. It takes a few seconds and prints nothing.

### How a folder becomes a separate Python

`.venv` doesn't contain a copy of Python. `.venv\Scripts\python.exe` is a small launcher, and the redirection happens through a text file beside it, `.venv\pyvenv.cfg`. Open it from the file tree:

```text
home = C:\Users\you\AppData\Local\Programs\Python\Python313
include-system-site-packages = false
version = 3.13.14
```

When any Python starts, one of the first things it does is look for a `pyvenv.cfg` next to its own `.exe` (or one folder up). If it finds one:

1. `home` tells it where the real installation is. The **standard library** (`os`, `random`, `json`…) is loaded from there, so it's shared, not copied.
2. It sets `sys.prefix` ("where am I installed?") to the `.venv` folder. The real location is kept in `sys.base_prefix`.
3. Its list of folders to import packages from, `sys.path`, gets `.venv\Lib\site-packages` and **not** the real installation's `site-packages`. That's what `include-system-site-packages = false` means.

So `.venv\Scripts\python` finds only this project's packages. Your system Python finds no `pyvenv.cfg`, so it keeps its own packages. The second check below tests exactly that: inside the environment, `sys.prefix` differs from `sys.base_prefix`.

```check
file .venv/pyvenv.cfg -- Type python -m venv .venv in the terminal, inside the frontier folder.
run ".venv/Scripts/python -c \"import sys; assert sys.prefix != sys.base_prefix\"" label=".venv contains a working virtual environment"
```

### Which `python` runs?

When you type a bare name like `python`, PowerShell searches the folders listed in `$env:PATH`, in order, and runs the first `python.exe` it finds. A path like `.venv\Scripts\python` skips the search and names the exact file. This series always uses the path, so it never matters which Python the search would find. The **Run** button does the same: when a project has a `.venv`, Run uses its Python.

(You may see advice to run `.venv\Scripts\Activate.ps1`. It puts `.venv\Scripts` at the front of `PATH` for this terminal only, so a bare `python` finds the environment first. You don't need activation for this series.)

## Pin the packages

Two packages to start with. More arrive in the lesson that first needs them.

- **NumPy**: arrays of numbers, and fast maths on them. Almost every chapter uses it.
- **pytest**: runs the test files that check your code.

Create a file named `requirements.txt` in the project folder (right-click in the file tree, or **New file**) and type:

```text file=requirements.txt
numpy==2.5.3
pytest==9.1.1
```

`==` **pins** an exact version. Without pins, `pip` installs whatever is newest on the day you run it, so a project that works today could break next month with no change to your code. For research, pins matter even more: a result you can't rebuild the environment for is a result nobody can check, including you in six months.

```check
contains requirements.txt "numpy==2.5.3"
contains requirements.txt "pytest==9.1.1"
```

## Install them

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

`-r requirements.txt` means "install everything listed in this file". `python -m pip` runs pip **inside that particular Python**, so it installs into that Python's `site-packages`: here, `.venv\Lib\site-packages`. A bare `pip` command is whichever `pip.exe` the `PATH` search finds first, which may belong to a different Python. That mismatch is one of the most common setup bugs: the install says it worked, and then your program can't find the package.

What pip does, in order:

1. It asks the package index (pypi.org) for each exact version.
2. It reads each package's own requirements (pytest needs `pluggy`, `iniconfig` and others) and adds those too. That's why more than two packages get installed.
3. It downloads each as a **wheel**, a zip of ready-to-use files whose name says which Python and operating system it was built for (`numpy-2.5.3-cp313-cp313-win_amd64.whl` is for CPython 3.13 on 64-bit Windows), and unzips it into `site-packages`.

When it finishes, the last line starts with `Successfully installed`.

```check
run ".venv/Scripts/python -c \"import numpy, pytest\"" label="NumPy and pytest import in the project's Python" -- Run .venv\Scripts\python -m pip install -r requirements.txt and wait for "Successfully installed".
run ".venv/Scripts/python -c \"import numpy; assert numpy.__version__ == '2.5.3', numpy.__version__\"" label="NumPy is the pinned version" -- Check requirements.txt says numpy==2.5.3, then install again.
```

## Your turn: keep the environment out of Git

**Build, on your own:** a `.gitignore` file.

`.venv` holds tens of megabytes of files that only work on this computer: `pyvenv.cfg` names this machine's Python by its full path. Nobody copies a `.venv` to another machine. They copy `requirements.txt` and install again. That's the real job of `requirements.txt`: it's a recipe that rebuilds the environment anywhere.

Chapter 1 puts this project in Git, the tool that keeps a project's history. Git must ignore the environment, and also two folders that tools create by themselves:

- `__pycache__`: when Python imports a module, it saves the module translated into **bytecode** (simpler instructions its interpreter runs) here, so the next import can skip the translation.
- `.pytest_cache`: pytest's memory of the last run, used for example by `pytest --lf` to rerun only the tests that failed.

Both are rebuilt automatically whenever they're missing, so neither belongs in version control.

Create `.gitignore` in the project folder, with one line for each of the three folders. In a `.gitignore`, a name ending in `/` matches a folder with that name anywhere in the project.

```hints
nudge: Three lines, one folder name per line. Which three folders were named above?
concept: A trailing slash means "a folder called this": `.venv/` ignores the folder `.venv` and everything in it.
answer: Create `.gitignore` containing:
~~~text
.venv/
__pycache__/
.pytest_cache/
~~~
```

```check
contains .gitignore ".venv/" label=".gitignore ignores the environment" -- One line per folder: .venv/
contains .gitignore "__pycache__/" label=".gitignore ignores Python's bytecode cache" -- __pycache__/ on its own line.
contains .gitignore ".pytest_cache/" label=".gitignore ignores pytest's cache" -- .pytest_cache/ on its own line.
```

### What you have

```text
frontier/
  .venv/             this project's Python and packages (never shared)
  requirements.txt   the recipe for .venv (shared)
  .gitignore
```

Next lesson: turning this folder into a Python **package**, so your code can be imported from anywhere in the project the same way NumPy is.
