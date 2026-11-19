---
title: "Layers and Direction: Ledger Gets a Window"
runtime: python
---

Sam and Alex want a window. They don't want to type `python total.py` into a terminal any more. They want to open Ledger, see the spending, and import a statement with a button. Where does that code go?

Open `ledger` and you see twenty-five `.py` files side by side, from `money.py` to `make_bank.py`. Nothing in the folder says that `money.py` must never open a file, or that `store.py` must never draw on the screen. Those rules exist. They're in a table in `MODULES.md`, and `layers.py` checks them. But a table is the last thing someone in a hurry reads, and the first thing an agent skips. The folder is what everyone sees.

This lesson makes the rules visible in the folder itself. Ledger's modules move into one package per layer, `domain/`, `storage/` and `ui/`, and the checker reads each module's layer from where it lives. Then Ledger gets its first window, in `ui/`. You'll also see what happens when someone makes a lower layer reach up into it. Python gives a loud error, the kind a dependency in the wrong direction is lucky to get.

## A rule written in a table

A **layer** is a group of modules with one kind of job, and a rule about which other layers it may use. The classic three are:

- **Presentation:** what a person sees and does. Windows, pages, printed reports.
- **Logic** (or *domain*): the rules of the problem itself. What money is, which moves a transaction may make. It would be true with no computer at all.
- **Data** (or *storage*): where things are kept, and how. Files, databases, a bank's export format.

The point of layers is the direction of the arrows. In the textbook version, presentation uses logic and logic uses data. Ledger chose differently in 02-09-01 and 03-01-01. Every dependency points *at the domain*. Storage uses the domain (`store.py` builds `Transaction`s from `books.py`), and the domain uses nothing. That's why the domain's tests need no files, and why `reports.py` could switch from the CSV files to `MemoryBooks` without changing. Ledger's interface layer may use both the domain and storage.

From the course folder, go into `ledger`, check that everything is committed, and run the current checker:

```
cd ledger
git status
.venv/Scripts/python layers.py
```

(`.venv/bin/python` on macOS and Linux.) `git status` says `nothing to commit, working tree clean`. `layers.py` lists who imports whom, and ends:

```
0 problems in 25 modules
```

The rule holds. But it holds because each module's layer is written in `MODULES.md`, and somebody keeps that table right.

```predict
question: An agent is asked to add a window, and creates window.py next to the other 25 files. What does layers.py say?
choice: Nothing new: it isn't checked
choice: window.py isn't placed in MODULES.md's Layers table
choice: window.py breaks the layer rule
answer: window.py isn't placed in MODULES.md's Layers table
explain: layers.py reports any module the table doesn't place. That's a good catch, but look at what it asks for: a row in a document, typed by hand, with a layer name in it. Typing the wrong layer, or copying the row above, would silence it. The layer is a fact about the module that lives in a different file from the module.
```

```check
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 25 modules" -- Ledger's layers should check clean before the move.
```

## Packages, one per layer

In Python, a **package** is a folder of modules with an `__init__.py` file in it. The file can be nearly empty. Its presence says "this folder is importable". With `money.py` inside `domain/`, the import becomes:

```
from domain.money import Money
```

and `import store` becomes `from storage import store`, which keeps the name `store`, so code that says `store.read(...)` doesn't change. Running a module inside a package changes too. `python ui/total.py` would put `ui/` on Python's import path, where there's no `domain` to find. Instead you run it by its module name, from the `ledger` folder: `python -m ui.total`. `-m` puts the current folder on the path, so `domain`, `storage` and `ui` are all found.

Thirteen modules move, and 38 import lines across modules, tools and tests must change with them. Thirty-eight hand edits is how a move goes wrong. One import gets missed, and nobody finds out until the program that uses it runs. A **codemod** is better: a small script that makes a mechanical change everywhere, the same way, and reports what it did. Create `ledger/restructure.py`:

```python file=ledger/restructure.py
"""Move Ledger's modules into one package per layer, and rewrite the imports.

A one-off tool: run it once, read what it printed and the diff, and commit.
It moves each module with git mv, so Git records a move rather than a
deletion and a new file, and then rewrites every import of a moved module,
in every Python file, the same way. Doing it by hand would mean 38 edits,
and one missed edit is a program that fails the first time it's run.
"""

import pathlib
import re
import subprocess

# MODULES.md's Layers table, as folders. Tools stay where they are.
PACKAGES = {
    "domain": ["money", "lifecycle", "recurring", "books"],
    "storage": ["store", "bank", "importer", "history", "check_data", "backup", "locking"],
    "ui": ["reports", "total"],
}
WHERE = {module: package for package, modules in PACKAGES.items() for module in modules}
NAMES = "|".join(WHERE)

# import store         ->  from storage import store       (store.read still works)
# from money import X  ->  from domain.money import X
IMPORT = re.compile(rf"^(\s*)import ({NAMES})$", re.MULTILINE)
FROM = re.compile(rf"^(\s*)from ({NAMES}) import ", re.MULTILINE)


def rewrite(text):
    text = IMPORT.sub(lambda m: f"{m[1]}from {WHERE[m[2]]} import {m[2]}", text)
    return FROM.sub(lambda m: f"{m[1]}from {WHERE[m[2]]}.{m[2]} import ", text)


def main():
    for package, modules in PACKAGES.items():
        pathlib.Path(package).mkdir(exist_ok=True)
        init = pathlib.Path(package, "__init__.py")
        init.write_text(f'"""Ledger\'s {package} layer (MODULES.md)."""\n', encoding="utf-8")
        subprocess.run(["git", "add", str(init)], check=True)
        for module in modules:
            subprocess.run(["git", "mv", f"{module}.py", f"{package}/{module}.py"], check=True)

    for path in sorted(pathlib.Path(".").rglob("*.py")):
        if ".venv" in path.parts or path.name == "restructure.py":
            continue
        old = path.read_text(encoding="utf-8")
        new = rewrite(old)
        if new != old:
            path.write_text(new, encoding="utf-8")
            for before, after in zip(old.splitlines(), new.splitlines()):
                if before != after:
                    print(f"{path.as_posix()}: {before.strip()}  ->  {after.strip()}")

    # MODULES.md's table: each module by its path, and no Layer column,
    # since the folder now says which layer a module is in.
    modules = pathlib.Path("MODULES.md")
    text = modules.read_text(encoding="utf-8")
    text = text.replace("| Module | Layer | Responsibility |\n|---|---|---|", "| Module | Responsibility |\n|---|---|")
    row = re.compile(r"^\| (\w+)\.py \| \w+ \| (.*) \|$", re.MULTILINE)
    text = row.sub(lambda m: f"| {WHERE[m[1]] + '/' if m[1] in WHERE else ''}{m[1]}.py | {m[2]} |", text)
    modules.write_text(text, encoding="utf-8")

    # What no regular expression can fix: code that names a moved file. (The
    # .md files name modules too, as names, which is still true.)
    mentions = re.compile(rf"\b(?<!/)({NAMES})\.py\b")
    for path in sorted(pathlib.Path(".").rglob("*")):
        if path.suffix == ".py" and ".venv" not in path.parts and path.name != "restructure.py":
            for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if mentions.search(line):
                    print(f"still names a moved file: {path.as_posix()} line {number}: {line.strip()}")


if __name__ == "__main__":
    main()
```

What to notice:

- `git mv` moves a file and tells Git it's the same file, so `git log --follow domain/money.py` still shows its whole history.
- The two patterns match only whole import lines of the thirteen moved names. `import csv` is left alone, and so is `from storage import store`, which the script itself writes. `^(\s*)` keeps any indentation, because `total.py` imports `store` inside its `if __name__ == "__main__":` block.
- `MODULES.md`'s table loses its Layer column. Once the folder says where a module belongs, a column saying the same thing is a second copy, and two copies of a fact will drift apart. The section after next makes the checker read the folders instead.
- The last loop finds what a regular expression can't fix safely: code that names a moved *file*, not a module.

Save it and run it, from `ledger`:

```
.venv/Scripts/python restructure.py
```

It prints one line per rewritten import, 38 in all, beginning:

```
domain/books.py: from money import Money  ->  from domain.money import Money
storage/bank.py: from money import Money  ->  from domain.money import Money
storage/check_data.py: import store  ->  from storage import store
```

and ends with the code that still names a moved file:

```
still names a moved file: leak.py line 16: for program in ["reports.py", "total.py"]:
still names a moved file: storage/importer.py line 40: sys.exit("usage: importer.py BANK_FILE")
still names a moved file: storage/store.py line 8: # Nothing here checks what is stored; check_data.py checks the keys.
still names a moved file: tests/test_criteria.py line 27: return subprocess.run([sys.executable, "importer.py", statement], cwd=ledger, capture_output=True, text=True).stdout
still names a moved file: tests/test_data.py line 10: # test run checks them and nobody has to remember to run check_data.py.
still names a moved file: tests/test_lifecycle.py line 7: # table in lifecycle.py is the implementation; this is the specification.
```

Three of those are comments that still read correctly. The other three are programs that run a file by its name, and they will break. Run `git status` to see the moves: lines like `renamed: money.py -> domain/money.py`, and `modified:` for every file whose imports changed.

```check
file ledger/domain/money.py -- money.py should be in the domain package.
file ledger/storage/__init__.py -- storage should be a package, with an __init__.py.
missing ledger/money.py -- money.py should have moved out of the top folder.
contains ledger/tests/test_money.py "from domain.money import Money" -- The tests' imports should be rewritten.
contains ledger/MODULES.md "| domain/money.py |" -- MODULES.md's table should name each module by its path.
```

## What the move broke

Run the tests:

```
.venv/Scripts/python -m pytest -q
```

```
3 failed, 172 passed
```

The three are in `tests/test_criteria.py`: F2.1, F3.1 and F3.2, the acceptance tests that run the importer as a person would. Each fails the same way:

```
AssertionError: assert '3 added to data/inbox.csv, 5 already there' in ''
```

The importer printed nothing at all. A program that prints nothing has usually failed before its first `print`, and the reason is on stderr. But look at `run_import` in `tests/test_criteria.py`. It keeps `.stdout` and throws stderr away. The evidence is being discarded. Get it back, for one run. Change the end of `run_import`'s line from `.stdout` to `.stderr`, save, and run just F2.1:

```
.venv/Scripts/python -m pytest -q tests/test_criteria.py -k f2_1
```

The assertion now shows what the importer said, after the path of the temporary folder:

```
importer.py': [Errno 2] No such file or directory
```

The file moved. In the same line, replace `"importer.py"` with `"-m", "storage.importer"`, so the list reads `[sys.executable, "-m", "storage.importer", statement]`. Save and run F2.1 again.

```predict
question: With the importer run as -m storage.importer, does F2.1 pass now?
choice: Yes
choice: No, with a different error
answer: No, with a different error
explain: The new error is "No module named 'storage'". The importer runs in a temporary copy of Ledger, made by the ledger fixture, and the fixture copies only the top folder's .py files (LEDGER.glob("*.py")). The packages were never copied. The first fix revealed a second cause, which is common: a failure can have more than one reason, and only the first is visible until it's fixed.
```

Fix the fixture. Replace its first two lines (the `for path in LEDGER.glob("*.py"):` loop) with:

```
    for package in ["domain", "storage", "ui"]:
        shutil.copytree(LEDGER / package, tmp_path / package)
```

Change `.stderr` back to `.stdout`, save, and run every test. `175 passed`.

One more program runs files by name: `leak.py`, from 03-01-01, which renames a column in a copy of Ledger and runs the reports. Change its loop's first two lines to run modules:

```
for program in ["ui.reports", "ui.total"]:
    result = subprocess.run([sys.executable, "-m", program], cwd=copy, capture_output=True, text=True)
```

Save and run `.venv/Scripts/python leak.py`. It prints the same findings as before, now named by module:

```
ui.reports: KeyError: 'cents', raised in store.py line 38
ui.total: KeyError: 'cents', raised in store.py line 38
```

`restructure.py` has done its one job. Delete it (`rm restructure.py`) and commit the move:

```
git add domain storage ui tests MODULES.md leak.py timing.py
git commit -m "Move Ledger's modules into domain, storage and ui packages"
```

```check
run "cd ledger; .venv/Scripts/python -m pytest -q" stdout="175 passed" without="failed" -- Every test should pass after the move.
contains ledger/tests/test_criteria.py "storage.importer" -- test_criteria.py should run the importer as a module.
run "cd ledger; .venv/Scripts/python leak.py" stdout="ui.total: KeyError: 'cents', raised in store.py line 38" -- leak.py should run the reports as modules, with the same findings.
missing ledger/restructure.py -- Delete restructure.py once it has done its job.
run "cd ledger; git log -1 --format=%s" stdout="packages" -- Commit the move.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../ledger'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:domain/money.py').returncode == 0, git('cat-file', '-e', 'HEAD:money.py').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True False True" -- The commit should hold the packages and not the old files, with nothing left over.
```

## The layers, from the folders

`layers.py` still reads layers from the table's Layer column, which is gone. Make the folder the **single source of truth**: one place that holds a fact, which everything else reads. A module's layer is now the package it's in. Replace `ledger/layers.py`:

```python file=ledger/layers.py
import ast
import pathlib
import sys

# Ledger's layers are its packages, so a module's folder is the one place
# that says which layer it's in. The rule: every dependency points at the
# domain. A module may import its own layer, and the layers listed here for
# it. Tools, the .py files at the top, are run by hand and may use anything.
LAYERS = ("domain", "storage", "ui")
ALLOWED = {
    "domain": set(),
    "storage": {"domain"},
    "ui": {"domain", "storage"},
    "tool": {"domain", "storage", "ui"},
}
# Only the interface may open windows.
WINDOW_MODULES = {"tkinter"}


# storage/importer.py -> storage.importer; scale.py -> scale
def module_name(path):
    return ".".join(path.with_suffix("").parts)


# storage.importer -> storage; scale -> tool
def layer_of(module):
    first = module.split(".")[0]
    return first if first in LAYERS else "tool"


# Every name a file imports, read from its code (ast) rather than by running
# it. "from storage import store" imports storage.store, so both are listed.
def imports(path):
    found = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            found |= {alias.name for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module:
            found |= {node.module} | {f"{node.module}.{alias.name}" for alias in node.names}
    return found


# Each cycle in the graph once, as a list of modules that ends where it starts.
def cycles(graph):
    found = []
    def visit(module, path):
        for target in graph[module]:
            if target in path:
                cycle = path[path.index(target):] + [target]
                if sorted(cycle[:-1]) not in [sorted(c[:-1]) for c in found]:
                    found.append(cycle)
            else:
                visit(target, path + [target])
    for module in graph:
        visit(module, [module])
    return found


def problems(graph, named, documented):
    found = []
    for module, targets in graph.items():
        layer = layer_of(module)
        for target in targets:
            other = layer_of(target)
            if other != layer and other not in ALLOWED[layer]:
                found.append(f"{module} ({layer}) imports {target} ({other}): {layer} may import only {', '.join(sorted(ALLOWED[layer])) or 'its own layer'}")
        windows = {name for name in named[module] if name.split(".")[0] in WINDOW_MODULES}
        if windows and layer != "ui":
            found.append(f"{module} ({layer}) imports {', '.join(sorted(windows))}: only ui may open windows")
        if module.replace(".", "/") + ".py" not in documented:
            found.append(f"{module.replace('.', '/')}.py isn't in MODULES.md's table")
    found += ["a cycle: " + " -> ".join(cycle) for cycle in cycles(graph)]
    return found


if __name__ == "__main__":
    files = sorted(pathlib.Path(".").glob("*.py")) + sorted(p for layer in LAYERS for p in pathlib.Path(layer).glob("*.py"))
    files = [path for path in files if path.name != "__init__.py"]
    ours = {module_name(path) for path in files}
    named = {module_name(path): imports(path) for path in files}
    graph = {module: sorted(names & ours) for module, names in named.items()}
    for module, targets in graph.items():
        if targets:
            print(f"{module} -> {', '.join(targets)}")
    documented = pathlib.Path("MODULES.md").read_text(encoding="utf-8")
    found = problems(graph, named, documented)
    for problem in found:
        print(problem)
    print(f"{len(found)} problem{'' if len(found) == 1 else 's'} in {len(graph)} modules")
    sys.exit(1 if found else 0)
```

What changed from the old checker:

- `layer_of` takes a module's layer from its first name: `storage.importer` is in `storage`. Anything at the top level is a tool. Moving a module to another layer is now one change, moving the file, and the rule follows it. That's **"one place to change"**: when a decision lives in one place, changing it can't leave a stale copy behind.
- `imports` turns `from storage import store` into both `storage` and `storage.store`, because the name after `import` may be a module. `graph` keeps only the names that are Ledger's own modules.
- A new rule: only `ui` may import `tkinter`. A domain module that opened a window would still pass the layer rule, since `tkinter` isn't one of Ledger's modules, so the rule has to name it.
- `cycles` follows every chain of imports and reports any that comes back to where it started. More on that soon.
- `MODULES.md` still has to list each module. Documentation isn't the source of the layer any more, but it is where a reader learns what each module is *for*, and a module nobody described is a question nobody answered.

In `MODULES.md`, the row for `layers.py` still says `Checking this table's rule`. Change it to `Checking the layers' rules, from the folders`. Save both and run the checker:

```
.venv/Scripts/python layers.py
```

The list now uses full module names (`storage.store -> domain.books, domain.money`) and ends `0 problems in 25 modules`.

```check
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 25 modules" -- The layers, read from the folders, should check clean.
run "cd ledger; .venv/Scripts/python layers.py" stdout="storage.store -> domain.books, domain.money" -- layers.py should name modules by package.
contains ledger/MODULES.md "Checking the layers' rules, from the folders" -- Update layers.py's row in MODULES.md.
```

## One way to import

The window needs a button that imports a statement. The importer's work is inside `main()`, tangled with `sys.argv` and `print`. The quickest way to get a button working is to copy those twenty lines into the window. Then Ledger has two importers. The next fix to one, say a change to how the lock is taken, is missing from the other, and nobody notices until the window imports a statement twice. **One place to change** applies to behaviour as well as facts. Pull the work out into one function that both the command line and the window call. Replace `ledger/storage/importer.py`:

```python file=ledger/storage/importer.py
import collections
import csv
import dataclasses
import datetime
import os
import sys

from storage.bank import BankRow, StatementError, read_statement
from storage.locking import Locked, release_lock, take_lock

INBOX = "data/inbox.csv"


# The inbox: imported transactions not yet given an account and a category.
# Its cents are signed as the bank signs them, negative for money going out;
# Ledger's transactions record spending as positive cents, so moving a row
# from the inbox into the transactions must flip the sign.
def read_inbox():
    if not os.path.exists(INBOX):
        return []
    with open(INBOX, newline="", encoding="utf-8") as file:
        return [BankRow(datetime.date.fromisoformat(r["date"]), r["description"], int(r["cents"]))
                for r in csv.DictReader(file)]


# What the statement has more of than the inbox, in the statement's order.
# The inbox and the statement are multisets (02-03-01): importing the same
# month twice, or two months that overlap, adds each transaction once.
def new_rows(inbox, statement):
    extra = collections.Counter(statement) - collections.Counter(inbox)
    found = []
    for row in statement:
        if extra[row] > 0:
            extra[row] -= 1
            found.append(row)
    return found


# What one import did: the rows it added, how many of the statement's rows
# were in the inbox already, and the rows it rejected, as (line, reason).
@dataclasses.dataclass(frozen=True)
class Imported:
    added: list
    already: int
    problems: list


# Add a statement's new rows to the inbox: the one way Ledger imports, for
# the command line and the window alike. Raises StatementError for a file
# that isn't a statement, and Locked while another program writes the data.
def import_statement(source):
    rows, problems = read_statement(source)
    lock = take_lock("data")
    try:
        added = new_rows(read_inbox(), rows)
        is_new = not os.path.exists(INBOX)
        with open(INBOX, "a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            if is_new:
                writer.writerow(["date", "description", "cents"])
            writer.writerows((row.date.isoformat(), row.description, row.cents) for row in added)
    finally:
        release_lock("data", lock)
    return Imported(added, len(rows) - len(added), problems)


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: python -m storage.importer BANK_FILE")
    source = sys.argv[1]
    try:
        result = import_statement(source)
    except (StatementError, Locked) as error:
        sys.exit(str(error))
    for line, reason in result.problems:
        print(f"{source} line {line}: {reason}")
    print(f"{len(result.added)} added to {INBOX}, {result.already} already there, {len(result.problems)} rejected")
    if result.problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

`import_statement` does the work and *returns* what happened, as an `Imported`. It prints nothing and never exits, so any front end can decide how to show the result. `main` is now only the command line's front end: arguments in, lines out, an exit status. The usage message names the new way to run it. One behaviour moved: a locked inbox used to be reported after the rejected rows were printed, and now only the lock is reported. Nothing relied on the order. Save it and run the tests, then run the importer with no file:

```
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m storage.importer
```

`175 passed`, and `usage: python -m storage.importer BANK_FILE`. The three acceptance tests ran the command line from end to end, so its output is unchanged.

```check
run "cd ledger; .venv/Scripts/python -m pytest -q" stdout="175 passed" without="failed" -- Every test should still pass, the acceptance tests included.
run "cd ledger; .venv/Scripts/python -m storage.importer" exit=1 stderr="usage: python -m storage.importer BANK_FILE" -- The importer's usage message should say how to run it now.
run "cd ledger; .venv/Scripts/python -c \"from storage.importer import import_statement, Imported; print(callable(import_statement), sorted(Imported.__dataclass_fields__))\"" stdout="True ['added', 'already', 'problems']" -- import_statement should return an Imported with added, already and problems.
```

## A first window

tkinter is Python's built-in toolkit for windows. It comes with Python on Windows and macOS. On Linux you may need your distribution's `python3-tk` package. Create `ledger/ui/window.py`:

```python file=ledger/ui/window.py
"""Ledger's first window: the spending by category, the inbox, and a button
that imports a bank statement. From the ledger folder: python -m ui.window
"""

import tkinter as tk
from tkinter import filedialog, messagebox

from storage import store
from storage.bank import StatementError
from storage.importer import import_statement, read_inbox
from storage.locking import Locked
from ui import total


# What the window shows, as text. A plain function, so a test can check it
# without opening a window.
def summary(books, inbox):
    waiting = f"{len(inbox)} in the inbox, waiting for an account and a category"
    return "\n".join(total.lines(books) + ["", waiting])


class Window:
    def __init__(self, root):
        root.title("Ledger")
        self.shown = tk.Label(root, font=("Courier", 11), justify="left")
        self.shown.pack(padx=16, pady=16)
        tk.Button(root, text="Import a statement...", command=self.ask_import).pack(pady=(0, 16))
        self.refresh()

    # Read the books and the inbox again, and show them.
    def refresh(self):
        self.shown.config(text=summary(store.CsvBooks(), read_inbox()))

    def ask_import(self):
        source = filedialog.askopenfilename(title="Import a bank statement", filetypes=[("Statements", "*.csv")])
        if not source:
            return
        try:
            result = import_statement(source)
        except (StatementError, Locked) as error:
            messagebox.showerror("Not imported", str(error))
            return
        messagebox.showinfo("Imported", f"{len(result.added)} added, {result.already} already there, {len(result.problems)} rejected")
        self.refresh()


if __name__ == "__main__":
    root = tk.Tk()
    Window(root)
    root.mainloop()
```

The tkinter in it:

- `tk.Tk()` makes the main window, and `root.mainloop()` hands control to tkinter, which waits for clicks and keys and calls your code when they come. That's **event-driven** code: you don't call the window, it calls you. Compare Blockfall's `keydown` listener.
- `tk.Label` shows text and `tk.Button` calls `command` when it's clicked. `pack` places each one below the last.
- `filedialog.askopenfilename` shows the system's file chooser and returns the path, or `""` if the person cancels. `messagebox` shows a small dialog.

Look at what `window.py` imports: `storage`, `storage.bank`, `storage.importer`, `storage.locking` and `ui.total`. Every arrow points down, into storage and the ui's own `total`. It also adds nothing to storage. It calls `import_statement`, the same function the command line uses, and asks it nothing about windows. The text it shows comes from `summary`, a plain function, so a check can test the window's content without opening a window.

`layers.py` won't pass yet: it reports `ui/window.py isn't in MODULES.md's table`. In `MODULES.md`, add a row after `ui/total.py`'s:

```
| ui/window.py | The window: spending by category, the inbox, and importing a statement |
```

Save everything and open the window, from `ledger`:

```
.venv/Scripts/python -m ui.window
```

It shows the spending by category, from `rent 950.00` down to `total 1366.89`, and `11 in the inbox, waiting for an account and a category`. Click **Import a statement...** and choose `bank/2026-11.csv`. The message says `0 added, 8 already there, 5 rejected`: that statement is already in the inbox, and importing it again changes nothing (02-03-01's multisets). Close the window.

```check
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 26 modules" -- With window.py described in MODULES.md, the layers should check clean.
run "cd ledger; .venv/Scripts/python -c \"from storage import store; from storage.importer import read_inbox; from ui.window import summary; print(summary(store.CsvBooks(), read_inbox()).splitlines()[-1])\"" stdout="11 in the inbox, waiting for an account and a category" -- The window's text should show the inbox.
run "cd ledger; .venv/Scripts/python -c \"import sys, domain.money, domain.books, domain.lifecycle, domain.recurring, storage.store, storage.importer, storage.history, storage.bank, storage.locking, ui.total, ui.reports; print('tkinter' in sys.modules)\"" stdout="False" -- Loading the domain, storage and the reports should never load tkinter.
```

## A cycle

Here's a request that sounds harmless. "When an import finishes, the open window should refresh by itself." The importer knows when an import finishes, so the quick way is to have the importer tell the window. Its first line would be an import. Add just that line to `storage/importer.py`, under the other two `from` lines:

```
from ui.window import Window
```

Save it and run the tests.

```predict
question: What happens when the tests run?
choice: They all pass: one unused import changes nothing
choice: The tests that import the importer fail
choice: pytest can't even collect the tests
answer: pytest can't even collect the tests
explain: test_bank.py imports storage.importer. Its new line starts loading ui.window, which imports import_statement from storage.importer, a module that's still being loaded and doesn't define import_statement yet. Python raises ImportError while collecting, and pytest stops before running anything.
```

```
ImportError: cannot import name 'import_statement' from partially initialized module 'storage.importer' (most likely due to a circular import)
```

That's a **circular dependency**: `storage.importer` needs `ui.window`, which needs `storage.importer`. Python runs a module's lines top to bottom as it imports it, so one of the two always has to be used before it's finished. Try the command line too: `.venv/Scripts/python -m storage.importer bank/2026-11.csv`. It fails with an `ImportError` before reading the file. A change made for the window has broken the command-line importer, which has nothing to do with windows. And the cycle drags `tkinter` into every program that imports storage. Now run the checker:

```
.venv/Scripts/python layers.py
```

```
storage.importer (storage) imports ui.window (ui): storage may import only domain
a cycle: storage.importer -> ui.window -> storage.importer
2 problems in 26 modules
```

The cycle is a symptom. The cause is one arrow pointing the wrong way, from storage up to the interface. Python's error was lucky. It came from `from … import name`, which needs the name to exist already. If both modules used plain `import a`, and looked names up only when their functions ran (`a.hello()`), Python would finish loading both, and the cycle would sit there silently until the day the order mattered. The layer rule catches it either way.

Take the line out of `storage/importer.py`, save, and run the tests: `175 passed`. The window already refreshes after an import, in `ask_import`, after `import_statement` returns. That's how the arrow stays pointing down. The lower layer returns what happened, and the upper layer decides what to do about it. If something lower ever does need to start something higher, the higher layer hands it a function to call (a *callback*). Then the lower layer runs code it has never imported. 03-02-03 makes that a pattern.

Commit the checker, the importer and the window:

```
git add layers.py MODULES.md storage/importer.py ui/window.py
git commit -m "Give Ledger a window, with one importer for the window and the command line"
```

```check
lacks ledger/storage/importer.py "ui.window" -- Take the window import back out of the importer.
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 26 modules" -- With the cycle gone, the layers should check clean.
run "cd ledger; .venv/Scripts/python -m pytest -q" stdout="175 passed" without="error" -- The tests should collect and pass again.
run "cd ledger; git log -1 --format=%s" stdout="window" -- Commit the window.
```

**What else, and why not.** You could leave Ledger flat and keep the table. The old checker worked. But the layer lived in a document beside the code, and anyone adding a module had to know to go and edit it. The folders put the decision where it can't be missed. You could use the standard layout for a Python project people install: one top package, `ledger/`, with `domain`, `storage` and `ui` inside it, under `src/`, installed with `pip install -e .`. That's right once Ledger is installed somewhere else, or published. Today it would add packaging files, and an install step, to a program that runs from its own folder. You could use the textbook direction, with the domain calling storage. Then every domain test would need files on disk, the cost 03-01-01 measured. You could use an existing checker. `import-linter` enforces layer contracts like these from a configuration file. It's a fine choice for a real project. This one is a hundred lines you can read, so you know what such a tool checks and what it can't. 03-06-01 makes boundaries fail the build.

## Your turn: choose the month

The window shows every month's spending added together, and Sam and Alex want one month at a time. Add a month chooser:

- `ui/total.py` gets `months(books)`: the months that have transactions, written `YYYY-MM`, earliest first.
- `total.lines` takes a `month=None` argument. With a month, only that month's transactions count. Without one, it's as before, so `python -m ui.total` and its tests don't change.
- The window shows a choice of months, `all` plus every month in the books, latest first, starting on the latest month. Choosing one shows that month's spending.
- The list of months must come from the books. A list typed into the window would be a second copy of a fact the transactions already hold, and it would be wrong the first day of next month.
- Every test passes, `layers.py` finds no problems, and both files are committed.

```hints
nudge: Which layer is "the months that have transactions" a question for, and where does the window already get its numbers?
concept: The months are derived data, like totals (reports.py's comment): worked out from the transactions every time, never stored or typed, so they can't disagree with the books. Put the question next to lines in ui/total.py, and have the window ask it. Writing the month of a transaction, date.strftime("%Y-%m"), once, in one small function, keeps months and lines agreeing about what a month is.
shape: In total.py: def month_of(transaction) returning transaction.date.strftime("%Y-%m"); def months(books) returning sorted({month_of(t) for t in books.transactions()}); lines(books, place=None, month=None) skipping transactions whose month_of isn't the month given. In window.py: summary(books, inbox, month=None) passing month to total.lines; in __init__, choices = ["all"] + total.months(store.CsvBooks())[::-1], a tk.StringVar starting on choices[1], and tk.OptionMenu(root, self.month, *choices, command=lambda choice: self.refresh()); refresh passes None for "all".
answer: ui/total.py, above lines, and lines with its new argument:
~~~python
# The month a transaction is in, written YYYY-MM: the one place that says so.
def month_of(transaction):
    return transaction.date.strftime("%Y-%m")


# The months that have transactions, earliest first. Worked out from the
# books each time, so there's no list of months to keep up to date.
def months(books):
    return sorted({month_of(transaction) for transaction in books.transactions()})


# Spending by category, largest first, then the total, as lines to print:
# every month's, or with a month, written YYYY-MM, only that month's. ...
def lines(books, place=None, month=None):
    show = (lambda amount: amount.format(place)) if place else str
    totals = {}
    for transaction in books.transactions():
        if month is not None and month_of(transaction) != month:
            continue
        totals[transaction.category] = totals.get(transaction.category, Money(0)) + transaction.amount
    ...
~~~
ui/window.py, summary and the start of __init__, and refresh:
~~~python
def summary(books, inbox, month=None):
    waiting = f"{len(inbox)} in the inbox, waiting for an account and a category"
    return "\n".join(total.lines(books, month=month) + ["", waiting])

class Window:
    def __init__(self, root):
        root.title("Ledger")
        # The months to choose from come from the books, latest first.
        choices = ["all"] + total.months(store.CsvBooks())[::-1]
        self.month = tk.StringVar(value=choices[1] if len(choices) > 1 else "all")
        tk.OptionMenu(root, self.month, *choices, command=lambda choice: self.refresh()).pack(pady=(16, 0))
        ...

    def refresh(self):
        month = None if self.month.get() == "all" else self.month.get()
        self.shown.config(text=summary(store.CsvBooks(), read_inbox(), month))
~~~
A StringVar holds the chosen value, and OptionMenu shows the choices and calls command with the one picked. Then git add ui/total.py ui/window.py and git commit -m "Choose the month the window shows". The tempting slips are a typed list of months in the window, and a set of months returned without sorted(), which comes out in any order.
```

```check
run "cd ledger; .venv/Scripts/python -c \"import datetime; from domain.books import MemoryBooks, Transaction; from domain.money import Money; from ui import total; t = lambda d, c, n: Transaction('1', datetime.date.fromisoformat(d), 'Sam', c, Money(n), ''); b = MemoryBooks([t('2026-11-03', 'rent', 95000), t('2026-10-30', 'groceries', 2000), t('2026-11-20', 'groceries', 450), t('2025-12-31', 'rent', 90000)]); print(total.months(b), total.lines(b, month='2026-10'), total.lines(b)[-1])\"" stdout="['2025-12', '2026-10', '2026-11'] ['groceries        20.00', 'total            20.00'] total          1874.50" -- months should come from the books, earliest first, and lines should count only the month given.
run "cd ledger; .venv/Scripts/python -c \"import datetime; from domain.books import MemoryBooks, Transaction; from domain.money import Money; from ui.window import summary; t = lambda d, n: Transaction('1', datetime.date.fromisoformat(d), 'Sam', 'rent', Money(n), ''); b = MemoryBooks([t('2026-11-01', 95000), t('2026-10-01', 90000)]); print(summary(b, [], '2026-10').splitlines()[0])\"" stdout="rent            900.00" -- The window's text should show only the month chosen.
contains ledger/ui/window.py "months(" -- The window's months should come from total.months.
lacks ledger/ui/window.py "2026-" -- The window shouldn't type a list of months.
run "cd ledger; .venv/Scripts/python -m pytest -q" stdout="passed" without="failed" -- Every test should pass.
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 26 modules" -- The layers should still check clean.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../ledger'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('def months' in git('show', 'HEAD:ui/total.py').stdout, 'months(' in git('show', 'HEAD:ui/window.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit total.py and window.py, with nothing left over.
```

**What these checks establish, and what they don't.** They check that Ledger's modules live in `domain`, `storage` and `ui`, and that the tests, `leak.py` and the acceptance tests still work after the move. They check that `layers.py` reads each layer from its folder, and finds no problems. They check that loading the domain, storage and the reports never loads tkinter, and that the window's text and months come from the books. They don't open the window. Nothing here clicks the button or checks what the dialog says. You did that by hand, once, and a later change could break it without a single check failing. Nor do they make the layers impossible to break. `layers.py` runs only when someone runs it. It finds imports, not everything: a module that reads `data/transactions.csv` with `open` is using storage without importing it, and the checker can't see that. And importing `storage.backup` still makes a backup, because that module does its work as it loads, with no `if __name__ == "__main__":`. That's why the tkinter check leaves it out. It's a module that's dangerous to import, and worth fixing.

```predict
question: A teammate asks for "a warning in the window when a statement has rejected rows". Their change adds a messagebox call inside storage/importer.py's import_statement. Every test passes. What's wrong, and what would you ask for instead?
explain: Storage now shows windows. layers.py reports it (storage importing tkinter or ui), and so would anyone reading the diff: the command-line importer, and every test that imports storage, now loads tkinter and might open a dialog. import_statement already returns the rejected rows in Imported.problems. The window should look at them after it returns and show the warning itself. Asking for it that way in the first place ("the importer returns what it rejected; the window decides how to show it") is a request that can be checked.
```

## What you can do now

- **Layers group modules by job, and their point is direction.** Presentation, logic and data. Ledger points every dependency at the domain, so its rules are tested without files or windows.
- **Put structure where people look.** A layer written in a table drifts. A layer that is the folder can't, and moving a file is the one change that moves a module to another layer.
- **One source of truth for each fact.** The Layer column went once the folders said the same. A window's month list comes from the books, not a typed copy.
- **One place to change, for behaviour too.** `import_statement` is the one way Ledger imports, called by the command line and the window. A copy of its body in the window would have been a second importer to keep in step.
- **A codemod makes a mechanical change everywhere, the same way,** and reports it. What it can't fix (files run by name, a fixture that copies the old layout) shows up when the tests run, if you read the evidence: an empty stdout means look at stderr.
- **A circular dependency means an arrow points the wrong way.** Python's `ImportError … partially initialized module` is the loud form. A plain `import` makes it silent. Fix the direction: the lower layer returns what happened, and the upper layer acts on it.

**Next:** 03-02-03 makes the direction a design tool. Dependency injection and ports and adapters. Framework splits into Core, Routing and Hosting projects that the C# compiler won't let point the wrong way, and Board, the issue tracker, starts as a domain that references nothing at all.
