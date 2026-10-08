---
title: 0.1 — A Project With Its Own Python
track: Q-Arcade — Setup
trackOrder: 12.1
runtime: none
---

This series teaches **Q-learning**, a way for a program to learn which action to take in each situation purely from trying things and seeing what reward it gets. You'll use it on the two classic problems: **CartPole** (balance a pole on a moving cart) and **QMaze** (a rat finding the cheese). Then you'll build a **Pac-Man** clone in pygame and teach an agent to play it.

You need basic Python: variables, functions, lists, loops and `if`. Everything else is taught when a lesson first needs it, including NumPy, pygame, PyTorch and Keras. You type every line yourself, and **Check my work** runs your code to check it.

This lesson sets up the project: a folder, a Python environment that belongs only to that folder, and the exact packages the series uses. It's the same setup the later lessons rely on, so it's worth getting right once.

## Choose the project folder

1. Click **Choose folder…** in the middle of this window.
2. Go to your **Documents** folder, make a **New folder** named `q-arcade`, select it and click **Select Folder**.

Keep the name short and the folder near the top of your drive: Chapter 4 installs PyTorch, whose deepest file paths are long, and Windows refuses paths longer than 260 characters unless long paths are turned on. `Documents\q-arcade` keeps them well inside the limit.

The terminal at the bottom now runs inside `q-arcade`. Check which Python you have:

```powershell
python --version
```

```text
Python 3.13.14
```

This series needs **Python 3.12 or newer**, because NumPy 2.5 doesn't install on anything older.

If PowerShell says `python` isn't recognized, or opens the Microsoft Store, install Python from [python.org](https://www.python.org/downloads/). In the installer, tick **Add python.exe to PATH**, then close and reopen this window so the terminal sees it.

```check
run "python -c \"import sys; assert sys.version_info >= (3, 12), sys.version\"" label="Python 3.12 or newer runs from the terminal" -- Install Python 3.12 or newer from python.org and tick "Add python.exe to PATH", then reopen this window.
```

## Make a virtual environment

When you `pip install` a package, it goes into one Python installation's `site-packages` folder, which every program using that Python shares. Two projects that need different versions of the same package would then break each other. A **virtual environment** solves this: it's a folder that acts as a Python of its own, with its own empty `site-packages`.

Type:

```powershell
python -m venv .venv
```

`-m venv` means "run the module named `venv`", which comes with Python. `.venv` is the folder it creates; the leading dot is a convention that editors such as VS Code recognise. It takes a few seconds and prints nothing.

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

So `.venv\Scripts\python` finds only this project's packages, and your system Python, which finds no `pyvenv.cfg`, keeps its own. The second check below tests exactly that: inside the environment, `sys.prefix` differs from `sys.base_prefix`.

```check
file .venv/pyvenv.cfg -- Type python -m venv .venv in the terminal, inside the q-arcade folder.
run ".venv/Scripts/python -c \"import sys; assert sys.prefix != sys.base_prefix\"" label=".venv contains a working virtual environment"
```

### Which `python` runs?

When you type a bare name like `python`, PowerShell searches the folders listed in `$env:PATH`, in order, and runs the first `python.exe` it finds. A path like `.venv\Scripts\python` skips the search and names the exact file. This series always uses the path, so it never matters which Python the search would find. The **Run** button does the same: when a project has a `.venv`, Run uses its Python.

(You may see advice to run `.venv\Scripts\Activate.ps1`. It puts `.venv\Scripts` at the front of `PATH` for this terminal only, so a bare `python` finds the environment first. If PowerShell answers that "running scripts is disabled on this system", `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` allows scripts for your own account. You don't need activation for this series.)

## Pin the packages

Four packages to start with:

- **NumPy**: arrays of numbers. Every Q-table in this series is a NumPy array.
- **pygame-ce**: windows, drawing and the keyboard. It's the community edition of pygame; you still write `import pygame`. It has ready-built packages for the newest Pythons, which plain `pygame` 2.6.1 doesn't.
- **Gymnasium**: the standard way reinforcement-learning environments are written. CartPole comes from it.
- **pytest**: runs the test files that check your code.

Create a file named `requirements.txt` in the project folder (right-click in the file tree, or **New file**) and type:

```text file=requirements.txt
numpy==2.5.3
pygame-ce==2.5.8
gymnasium==1.3.0
pytest==9.1.1
```

`==` **pins** an exact version. Without pins, `pip` installs whatever is newest on the day you run it, so a project that works today could break in a month with no change to your code. These four versions were tested together for this series.

Notice what's *not* written: `gymnasium[classic-control]`. Gymnasium's documentation suggests that form to get CartPole's drawing code, but the extra installs the original `pygame`, which would overwrite `pygame-ce` (both install a folder called `pygame`). You'll draw CartPole yourself in Chapter 2, so you don't need it.

```check
contains requirements.txt "numpy==2.5.3"
contains requirements.txt "pygame-ce==2.5.8"
contains requirements.txt "gymnasium==1.3.0"
contains requirements.txt "pytest==9.1.1"
lacks requirements.txt "classic-control" label="requirements.txt doesn't ask for Gymnasium's pygame extras" -- Plain gymnasium==1.3.0: the [classic-control] extra installs the original pygame over pygame-ce.
```

## Install them

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

`-r requirements.txt` means "install everything listed in this file". `python -m pip` runs pip **inside that particular Python**, so it installs into that Python's `site-packages`: here, `.venv\Lib\site-packages`. A bare `pip` command is whichever `pip.exe` the `PATH` search finds first, which may belong to a different Python. That mismatch is one of the most common setup bugs: the install says it worked, and then your program can't find the package.

What pip does, in order:

1. It asks the package index (pypi.org) for each exact version.
2. It reads each package's own requirements (Gymnasium needs `cloudpickle`, pytest needs `pluggy`…) and adds those too. That's why more than four packages get installed.
3. It downloads each as a **wheel**, a zip of ready-to-use files whose name says which Python and operating system it was built for (`numpy-2.5.3-cp313-cp313-win_amd64.whl` is for CPython 3.13 on 64-bit Windows), and unzips it into `site-packages`.

When it finishes, the last line starts with `Successfully installed`.

```check
run ".venv/Scripts/python -c \"import numpy, pygame, gymnasium, pytest\"" label="the four packages import in the project's Python" -- Run .venv\Scripts\python -m pip install -r requirements.txt and wait for "Successfully installed".
run ".venv/Scripts/python -c \"import pygame; assert getattr(pygame, 'IS_CE', False), 'this is the original pygame, not pygame-ce'\"" label="pygame is pygame-ce" -- If you installed plain pygame: .venv\Scripts\python -m pip uninstall -y pygame, then install requirements.txt again.
```

## Your turn: keep the environment out of Git

**Build, on your own:** a `.gitignore` file.

`.venv` holds well over 100 MB of files that only work on this computer: `pyvenv.cfg` names this machine's Python by its full path. Nobody copies a `.venv` to another machine; they copy `requirements.txt` and install again. That's the real job of `requirements.txt`: it's a recipe that rebuilds the environment anywhere.

If you use Git for this project, it must ignore the environment, and also two folders that tools create by themselves:

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
q-arcade/
  .venv/             this project's Python and packages (never shared)
  requirements.txt   the recipe for .venv (shared)
  .gitignore
```

Next lesson: a window, and the loop that every game in this series, and every agent, runs inside.
