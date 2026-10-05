---
title: 0.2 — A Python of Its Own
runtime: none
---

Your game will need **pygame-ce**, a library for windows, drawing, sound and keyboard input. Before installing it, there's a question most people skip, and it causes some of the most confusing problems in Python: **where does an installed package go, and which programs can see it?**

This lesson answers that from first principles, then gives the project a Python of its own with exactly the packages it needs, written down so that anyone can rebuild it. By the end, your project folder will satisfy the rule from lesson 0.1: someone given only the folder can do what you do.

## Where packages live

**Build:** find where your Python keeps installed packages, and how `import` finds them.

> **Package**: Python code someone else wrote and published, which you install and then `import`. **pip**: the program that installs packages, normally from **PyPI** (the Python Package Index, pypi.org), the public collection of published packages.

Ask pip where it installs things:

```powershell
python -m pip --version
```

```text
pip 25.3 from C:\Python314\Lib\site-packages\pip (python 3.14)
```

`-m pip` means "run the module named `pip`" with this `python`. A **module** is one `.py` file you can import (lesson 0.1); a **package** is a folder of modules imported under one name. pip is itself a package, and it lives in a folder named **`site-packages`**. That's where every package installed into this Python goes.

Now ask Python where `import` looks:

```powershell
python -c "import sys; print('\n'.join(sys.path))"
```

`sys.path` is a list, and `'\n'.join(sys.path)` turns it into one piece of text, with the items glued together by `\n`, a new line (inside a string, `\n` stands for the new-line character), so each folder prints on its own line.

```text

C:\Python314\python314.zip
C:\Python314\DLLs
C:\Python314\Lib
C:\Python314
C:\Users\you\AppData\Roaming\Python\Python314\site-packages
C:\Python314\Lib\site-packages
```

**Understand: how `import` finds a module.** `sys.path` is a list of folders. When your code runs `import pygame`, Python goes down the list **in order**, looking in each folder for a file `pygame.py` or a folder `pygame`, and uses the first one it finds. If no folder has it, it raises `ModuleNotFoundError`. It's the same rule as the shell's `PATH` search in lesson 0.1: an ordered list, first match wins.

The entries, top to bottom:

- The **empty first line** is an empty string, which means "the current directory". It's there because this command used `-c`. When Python runs a **script**, `python game.py`, the first entry is instead the **script's own folder**, wherever you ran it from. Either way it comes first, which is why a file `hello.py` next to your script can be imported, and also why naming your own file `random.py` breaks `import random` for scripts in that folder: yours is found first.
- `python314.zip`, `DLLs` and `Lib` hold the **standard library**, the modules that come with Python (`sys`, `os`, `json`, `random`, …).
- The two `site-packages` folders hold installed packages: one for your user account, one for this Python installation.

Try importing pygame now:

```powershell
python -c "import pygame"
```

You'll most likely see `ModuleNotFoundError: No module named 'pygame'`, because it isn't in any of those folders yet. (If it imports, some earlier project installed it into this Python, which is exactly the situation the next step avoids.)

> **Engineer:** every program's behaviour depends on things outside its own code: here, which packages happen to be in a shared folder. Those are **dependencies**, and a dependency you haven't written down is a hidden one. Hidden dependencies are why code "works on my machine": the other machine has a different `site-packages`.

## The problem with one shared folder

**Build:** nothing yet. This step is the reason for the next one.

If you install pygame-ce with plain `python -m pip install pygame-ce`, it goes into `C:\Python314\Lib\site-packages`, shared by **every** program that runs with that Python. Three things go wrong as soon as you have more than one project:

1. **Version clashes.** This project needs pygame-ce 2.5.8. A project you start next year needs version 3. There's only one `pygame` folder in `site-packages`, so installing one replaces the other, and the older project breaks without any of its code changing.
2. **Hidden dependencies.** A package installed for another project is importable here too, so this project can start using it without anyone writing that down. It runs fine for you and fails for everyone else.
3. **No record.** Nothing says which packages this project needs or which versions, so nobody, including you on a new computer, can rebuild what you have.

> **Engineer:** shared, global state is a recurring source of bugs, and here it is at the scale of a whole computer. The fix is the one you'll use again and again in this series: give each part its own state, and make what it depends on **explicit**.

## Make a virtual environment

**Build:** a Python that belongs only to this project.

> **Virtual environment**: a folder containing a Python launcher and an empty `site-packages` of its own. Packages installed into it are visible only to programs run with that launcher.

In the terminal, in your `forge` folder:

```powershell
python -m venv .venv
```

`venv` is a module in the standard library, and `.venv` is the folder it creates. It takes a few seconds and prints nothing (silence means success). The leading dot is a convention: editors such as VS Code look for a folder with that name, and macOS and Linux hide names starting with a dot.

The file tree now shows `.venv`. The three things inside it that matter:

- `.venv\pyvenv.cfg`: a short text file. Open it in the editor and read it.
- `.venv\Scripts\python.exe`: this environment's Python. (On macOS and Linux: `.venv/bin/python`.)
- `.venv\Lib\site-packages`: this project's packages. It holds only pip for now.

**Understand: how a folder becomes a separate Python.** `.venv` doesn't contain a copy of Python. `.venv\Scripts\python.exe` is about 255 KB (255,320 bytes on the machine this lesson was written on), far smaller than a Python installation. It's a small **launcher**, and the separation comes from `pyvenv.cfg`:

```text
home = C:\Python314
include-system-site-packages = false
version = 3.14.3
executable = C:\Python314\python.exe
command = C:\Python314\python.exe -m venv C:\Users\you\Documents\forge\.venv
```

When any Python starts, one of the first things it does is look for a `pyvenv.cfg` beside its own `.exe`, or one folder up. If it finds one:

1. `home` says where the real installation is. The standard library is loaded from there, so it's shared, never copied.
2. `sys.prefix`, Python's answer to "where am I installed?", is set to the `.venv` folder. The real location is kept in `sys.base_prefix`.
3. `sys.path` is built with `.venv\Lib\site-packages` in it, and **without** the real installation's `site-packages`. That's what `include-system-site-packages = false` means.

The system `python.exe` finds no `pyvenv.cfg` next to it, so it carries on using its own `site-packages`. Two Pythons, one installation, separate packages.

```check
file .venv/pyvenv.cfg -- In the terminal, in the forge folder, type python -m venv .venv and press Enter.
run ".venv/Scripts/python -c \"import sys; assert sys.prefix != sys.base_prefix\"" label=".venv holds a working virtual environment"
```

## Two Pythons

**Build:** run both Pythons and see the difference.

```powershell
python -c "import sys; print(sys.executable)"
.venv\Scripts\python -c "import sys; print(sys.executable)"
```

```text
C:\Python314\python.exe
C:\Users\you\Documents\forge\.venv\Scripts\python.exe
```

`sys.executable` is the full path of the Python program that is running. The first command searched `PATH` for `python` and found the system one. The second named a file by its path, which skips the `PATH` search entirely. Compare their import paths too:

```powershell
.venv\Scripts\python -c "import sys; print('\n'.join(sys.path))"
```

```text

C:\Python314\python314.zip
C:\Python314\DLLs
C:\Python314\Lib
C:\Python314
C:\Users\you\Documents\forge\.venv
C:\Users\you\Documents\forge\.venv\Lib\site-packages
```

Same standard library, different `site-packages`: the environment's, and only that one.

```predict
question: What will `.venv\Scripts\python -c "import sys; print(sys.prefix == sys.base_prefix)"` print?
choice: True
choice: False
answer: False
explain: In a virtual environment, `sys.prefix` is the `.venv` folder and `sys.base_prefix` is the real installation, so they differ and `==` gives `False`. Run with the system `python`, both are the installation's folder, and it prints `True`. That comparison is the standard way for a program to ask "am I running in a virtual environment?", and you'll use it in this lesson's Your turn.
verify: .venv/Scripts/python -c "import sys; print(sys.prefix == sys.base_prefix)"
```

### Activation, and why the checks don't use it

Typing `.venv\Scripts\python` every time is tedious, so environments come with an **activation** script:

```powershell
.venv\Scripts\Activate.ps1
```

The prompt gains a prefix, `(.venv) PS C:\Users\you\Documents\forge>`, and plain `python` now runs the environment's. It does three things to **this terminal session only**:

1. It puts `.venv\Scripts` at the **front** of `PATH`, so the `PATH` search for `python` finds the environment's first.
2. It sets the environment variable `VIRTUAL_ENV` to the `.venv` path, for other tools to read.
3. It changes the prompt to remind you.

**If you get a red error ending in "running scripts is disabled on this system":** Windows PowerShell refuses to run script files (`.ps1`) until you allow it. Allow scripts for your own account:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

`RemoteSigned` lets scripts made on this computer run, and requires scripts downloaded from the internet to be signed by their publisher. `-Scope CurrentUser` changes it for you only and needs no administrator rights. Then run `Activate.ps1` again.

Activation lasts only for this terminal session, because environment variables belong to a process (lesson 0.1). `deactivate` undoes it, and so does closing the terminal. That's why this series' checks never rely on it: they run `.venv\Scripts\python` by its path, which works whether or not you activated. The **Run** button does the same: when a project has a `.venv` folder, Run uses its Python.

**Understand: `sys.version_info`.** One more thing both Pythons can tell you, which you'll need in a moment:

```powershell
.venv\Scripts\python -c "import sys; print(sys.version_info); print(sys.version_info >= (3, 12))"
```

```text
sys.version_info(major=3, minor=14, micro=3, releaselevel='final', serial=0)
True
```

`sys.version_info` is a **tuple**, a fixed-length sequence like a list that can't be changed, with names for its items. Tuples compare **item by item, left to right**, stopping at the first pair that differs: `(3, 14, 3, …) >= (3, 12)` compares 3 with 3 (equal, so go on), then 14 with 12 (larger, so the answer is `True`). If every item compared is equal and one tuple runs out, the shorter one counts as smaller. That's the check lesson 0.1's **Check my work** ran to make sure you had 3.12 or newer.

> **Engineer:** the environment's job is **isolation**: this project's packages can't affect another project, and another project's can't leak in. Isolation is one of the most important ideas in engineering. You'll meet it again as separate processes (a crashing game that can't take the editor down), separate tests that can't affect each other, and separate services that only talk through a contract.

## Pin the packages

**Build:** a file listing exactly what this project needs.

Create a file named `requirements.txt` in the project folder and type:

```text file=requirements.txt
pygame-ce==2.5.8
```

**Understand.** Each line names a package and, after `==`, the exact version, which is called **pinning** it. Version numbers here have three parts, **major.minor.patch**: by the widespread convention called **semantic versioning**, the patch number goes up for bug fixes, the minor for new features that don't break existing code, and the major for changes that can. Without a pin, pip installs the newest version on the day you install, so two people installing on different days can get different code. With a pin, everyone gets 2.5.8.

Why **pygame-ce** and not **pygame**? Both are installed under different names but imported with the same `import pygame`. pygame-ce is the community edition: actively maintained, and published for the newest Pythons. Plain `pygame` 2.6.1 has no build for Python 3.14.

`requirements.txt` grows as the project does. Each package is added in the chapter that first needs it, with its reason.

> **Engineer:** `requirements.txt` turns a hidden dependency into an **explicit** one. It's a small piece of documentation that a program (pip) can act on, which makes it the best kind: it can't silently go out of date, because installing from it is how the project is set up.

```check
contains requirements.txt "pygame-ce==2.5.8" -- requirements.txt must contain the line pygame-ce==2.5.8 exactly, with two equals signs.
```

## Install it

**Build:** install the pinned packages into the environment.

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

```text
Collecting pygame-ce==2.5.8 (from -r requirements.txt (line 1))
  Downloading pygame_ce-2.5.8-cp314-cp314-win_amd64.whl (9.8 MB)
Installing collected packages: pygame-ce
Successfully installed pygame-ce-2.5.8
```

pip may add a notice that a newer pip exists. You can ignore it.

```predict
question: Where will pip put pygame?
choice: In the system Python's site-packages
choice: Inside .venv
choice: Next to requirements.txt
answer: Inside .venv
explain: `.venv\Scripts\python -m pip` runs pip *with the environment's Python*, and pip installs into the `site-packages` of whichever Python is running it: `.venv\Lib\site-packages`. Look in the file tree: there's a `pygame` folder there now, and a `pygame_ce-2.5.8.dist-info` folder beside it.
verify: .venv/Scripts/python -c "import os, pygame; print('Inside .venv' if os.sep + '.venv' + os.sep in pygame.__file__ else 'elsewhere')"
```

**Understand: what pip did.** `-r requirements.txt` means "read the package list from this file". For each line, pip:

1. asks PyPI for that package at that version;
2. picks a **wheel**, a ready-to-install `.whl` file (a zip archive) built for your exact situation. Its name says which: `cp314` means CPython 3.14, and `win_amd64` means 64-bit Windows. A wheel made for another Python version or operating system won't be chosen;
3. unpacks it into `site-packages`: here a `pygame` folder with the code;
4. records what it installed in a `pygame_ce-2.5.8.dist-info` folder beside it, which is how `pip list` and `pip uninstall` know it's there.

**Why `python -m pip` instead of just `pip`?** A bare `pip` is found by the `PATH` search, so it could be any Python's pip. `.venv\Scripts\python -m pip` can only be this environment's pip, installing into this environment. It's the same lookup-order lesson as before, avoided by naming the exact file.

Now import it with the environment's Python:

```powershell
.venv\Scripts\python -c "import pygame; print(pygame.__file__)"
```

```text
pygame-ce 2.5.8 (SDL 2.32.10, Python 3.14.3)
C:\Users\you\Documents\forge\.venv\Lib\site-packages\pygame\__init__.py
```

The first line is printed by pygame itself whenever it's imported. The second is the file Python actually loaded: **`__file__`** is the path of a module's source. A folder imported as a module runs its `__init__.py`. When you're unsure *which* copy of a package you're getting, `__file__` answers it.

```check
run ".venv/Scripts/python -c \"import pygame; assert pygame.version.ver == '2.5.8', pygame.version.ver\"" label="pygame-ce 2.5.8 imports with the environment's Python" -- Run .venv\Scripts\python -m pip install -r requirements.txt in the forge folder.
```

## Throw it away and rebuild

**Build:** delete the environment, and get it back from `requirements.txt` alone.

If you activated the environment, type `deactivate` first. Then:

```powershell
Remove-Item -Recurse .venv
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

`-Recurse` lets `Remove-Item` delete a folder with things inside it, without asking. (Lesson 0.1: no Recycle Bin. Here that's fine, and that's the point of this step.) pip says `Using cached …` instead of `Downloading`: it kept a copy of the wheel from last time.

**Understand.** Nothing was lost, because nothing in `.venv` was yours. It was **derived**: built from `requirements.txt` by a command. That's the difference between the two:

| | `.venv` | `requirements.txt` |
|---|---|---|
| Who writes it | `venv` and pip | you |
| Is it the truth? | No: a copy, built from the list | Yes: the list itself |
| Shared with others? | Never | Always |
| If deleted | rebuild it in a minute | the knowledge is gone |

`.venv` also can't be copied to another computer: `pyvenv.cfg` names one particular Python installation's folder, and the wheels inside were built for this machine.

> **Engineer:** separate what you **write** from what is **generated** from it. Generated things are disposable, are never edited by hand, and are never shared: anyone can regenerate them. In Chapter 1, git will be told to ignore `.venv` for exactly this reason. You'll meet the same split for compiled programs, build folders, caches and packaged releases.

```check
run ".venv/Scripts/python -c \"import pygame; assert pygame.version.ver == '2.5.8', pygame.version.ver\"" label="the rebuilt environment has pygame-ce 2.5.8"
```

## Your turn: a setup check

**Build, on your own:** a program `check_setup.py` that tells someone whether their setup is right, and says how to fix it if not.

| Command | Prints | Exit code |
|---|---|---|
| `.venv\Scripts\python check_setup.py` | `Setup OK: Python 3.14.3 in a virtual environment` (with your version) | 0 |
| `python check_setup.py` (the system Python) | `Not in a virtual environment. Run: .venv\Scripts\python check_setup.py` | 1 |
| any Python older than 3.12 | `Python 3.12 or newer is needed, not 3.11.9` (with that version) | 1 |

Check the environment first, then the version. The third row can't be checked automatically on your machine, since you don't have an old Python, so prove it works yourself: change `(3, 12)` to `(3, 99)` in your code, run it, see the message and the exit code, and change it back.

Everything you need was in this lesson and the last: `sys.prefix`, `sys.base_prefix`, `sys.version_info`, and `sys.exit`. One trap: inside a Python string, a backslash starts an **escape sequence** (`\n` is a new line), so each backslash in `.venv\Scripts\python` must be typed as two, `\\`, to mean one real backslash.

Try it for about 10 minutes before taking a hint.

```hints
nudge: Run `python -c "import sys; print(sys.prefix, sys.base_prefix)"`, then the same with `.venv\Scripts\python`. What's different between the two outputs, and what Python expression is `True` only in the second case?
concept: `sys.prefix != sys.base_prefix` is `True` exactly when running in a virtual environment. `sys.version_info >= (3, 12)` is `True` for 3.12 and newer, and `sys.version_info.major`, `.minor` and `.micro` are the three numbers you need to print a version like `3.14.3`. Each failure prints its message and calls `sys.exit(1)`.
shape: Two guard clauses, then the success line. First: if *not* in an environment, print the first message and exit with 1. Second: if the version is *less than* `(3, 12)`, build the version text from major, minor and micro, print the second message and exit with 1. If the program gets past both, print the OK line; running off the end exits with 0.
answer: ~~~python
import sys

if sys.prefix == sys.base_prefix:
    print("Not in a virtual environment. Run: .venv\\Scripts\\python check_setup.py")
    sys.exit(1)

v = sys.version_info
version = f"{v.major}.{v.minor}.{v.micro}"

if v < (3, 12):
    print(f"Python 3.12 or newer is needed, not {version}")
    sys.exit(1)

print(f"Setup OK: Python {version} in a virtual environment")
~~~

The two `\\` in the first message are each one backslash: inside a Python string, `\` starts an **escape sequence** (`\n` is a new line), so a real backslash is written `\\`. `sys.version_info` is a tuple whose items also have names, so `v.major` reads the item named `major` (`3`), `v.minor` the next (`14`), and `v.micro` the last; the f-string (lesson 0.1) joins them as `3.14.3`. The version text is built once and used in both messages. `v < (3, 12)` is the same tuple comparison as before, the other way round.
```

```check
run ".venv/Scripts/python check_setup.py" stdout="Setup OK: Python 3." label="with the environment's Python, it reports the setup OK" -- sys.prefix and sys.base_prefix differ inside a virtual environment.
run "python check_setup.py" exit=1 stdout="Not in a virtual environment." label="with the system Python, it says how to fix it and exits with 1" -- Compare sys.prefix with sys.base_prefix first, print the message and call sys.exit(1).```

## Challenge: check every pinned package

**Optional, ★★★.** Extend `check_setup.py` so that, after the version check, it reads `requirements.txt` and checks every pinned package is installed at its pinned version. For each line `name==version` it prints either `pygame-ce 2.5.8 OK` or a fix, such as `pygame-ce is 2.4.0, needs 2.5.8: run .venv\Scripts\python -m pip install -r requirements.txt`, and exits with 1 if any package is wrong.

This needs two things the series hasn't taught, on purpose. Practising finding them is the challenge:

- **Reading a file.** Look up Python's built-in `open` function, or `pathlib.Path.read_text`. And remember lesson 0.1: `"requirements.txt"` is a relative path. What happens if someone runs your script from another folder? `__file__` (this lesson) is part of a fix.
- **Asking which version of a package is installed.** Search the Python documentation for `importlib.metadata`. Note that it wants the name you *install* (`pygame-ce`), not the name you import.

```check
run ".venv/Scripts/python check_setup.py" stdout="pygame-ce 2.5.8 OK" label="it reports pygame-ce 2.5.8 as OK"
```

## What did we actually learn?

- **Import is a lookup** down an ordered list of folders, `sys.path`, first match wins: the same idea as `PATH` for programs. When the wrong thing loads, `__file__` tells you which one you got.
- **Dependencies must be explicit.** A package you rely on but haven't written down is a hidden input, and hidden inputs are why code works on one machine and not another.
- **Isolation**: each project gets its own environment, so projects can't break each other.
- **Written vs generated**: `requirements.txt` is the truth and is shared; `.venv` is built from it, disposable, and never shared.
- **Pin versions**, so that everyone, on any day, gets the same code. Semantic versioning (major.minor.patch) says how risky an upgrade is.

Every language has the same pieces under other names. In C#, a project's `.csproj` file lists its NuGet packages with versions, and `dotnet restore` rebuilds them. In Java, Maven's `pom.xml` or Gradle's `build.gradle` does it. Both keep packages per project by default; Python needs a virtual environment to get the same isolation, which is why this lesson exists.

The next lesson is about the moment every programmer meets many times a day: the program crashed, and Python printed a traceback. Reading one well is the first skill of debugging.
