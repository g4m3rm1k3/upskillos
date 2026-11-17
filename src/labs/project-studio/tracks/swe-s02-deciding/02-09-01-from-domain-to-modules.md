---
title: "From Domain to Modules: Sketching the Structure First"
runtime: python
---

Ledger now has twenty Python files in one folder. Each was written for a good reason in its own lesson, and nothing says how they fit together: which ones hold the household's rules, which touch files, which a window will call, and which are scripts someone runs once. Left alone, a folder like this grows into the codebase everyone has worked in: rules about money inside the code that reads CSV files, a window that opens files itself, and a change to the bank's format that touches eleven places. Architecture is the decision about where each part of the model lives and what may use what. It's cheapest before the code exists, and next cheapest now, while Ledger is small. This lesson walks the chain from the real household to the code, sketches Ledger's modules in layers with one rule ("every dependency points at the domain"), and writes a small tool that checks the code keeps to the sketch.

**By the end you can:**

- Follow a domain through conceptual model, software model, architecture, implementation and verification.
- Name the actors and give each module one responsibility.
- Separate what's common from what varies, and decide what's configurable and what's fixed.
- Say who owns each piece of state.
- Sketch modules in layers before moving code, and check that the dependencies follow the sketch.

**You need:** 02-05-01 (`SPEC.md`, the vocabulary), 02-08-01 and 02-08-02 (Ledger's domain model), 01-04-05 (reading code with `ast`). Commands run inside `ledger`.

## From the household to the code

Every program makes the same journey, whether or not anyone writes it down:

1. **The real domain**: two people, cards, a bank, a month's spending, a habit.
2. **A conceptual model**: the words and rules people agree on, with no code in them. Ledger's is `SPEC.md`: the vocabulary, the requirements, the invariants, the lifecycle.
3. **A software model**: the types that represent it: `Money`, `Status`, `BankRow`, the tables.
4. **An architecture**: which module holds which part, and which may use which.
5. **The implementation**, and its **verification**: the code, and the tests and checks that it is what the steps above said.

Each step can go wrong on its own. A wrong conceptual model (02-02-02's "an account has one holder") gives correct code for the wrong domain. A wrong architecture gives correct code that's painful to change. Writing each step down is what makes it checkable.

```predict
question: The household decides they want to import statements from a second bank, with a different format. In a well-structured Ledger, how many modules should change?
choice: Every module that touches amounts or dates
choice: One: the module that reads that bank's format
choice: None: the format is in a settings file
answer: One: the module that reads that bank's format
explain: The bank's format is one thing that varies, so it belongs in one place: a reader that turns that bank's text into BankRows. Everything past the reader works with BankRows and Money, which don't change. If the change touches many modules, the format has leaked past the boundary (02-04-02). A settings file can describe small variations (a column's name), but a different format usually needs a different reader.
```

## What depends on what

First, look at what Ledger is, not what it was meant to be. Create `layers.py`:

```python file=ledger/layers.py
import ast
import pathlib
import sys

# Ledger's modules, what each imports, and whether that's allowed by
# MODULES.md's Layers table. The rule: every dependency points at the domain.
# A module may import its own layer, and the layers listed here for it.
MODULES = pathlib.Path("MODULES.md")
ALLOWED = {
    "domain": set(),
    "storage": {"domain"},
    "interface": {"domain", "storage"},
    "tool": {"domain", "storage", "interface"},
}


# MODULES.md's Layers table as {module: layer}; empty if there's no table yet.
def layers_from(text):
    if "### Layers" not in text:
        return {}
    section = text.split("### Layers")[1].split("\n### ")[0]
    placed = {}
    for line in section.splitlines():
        cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[1] in ALLOWED:
            placed[cells[0].removesuffix(".py")] = cells[1]
    return placed


# The names of Ledger's own modules that a file imports, read from its code
# (ast, 01-04-05) rather than by running it.
def imports(path, ours):
    found = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            found |= {alias.name for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return sorted(found & ours)


def problems(graph, placed):
    found = [f"{module}.py isn't placed in MODULES.md's Layers table" for module in graph if module not in placed]
    for module, targets in graph.items():
        for target in targets:
            if module in placed and target in placed:
                layer, other = placed[module], placed[target]
                if other != layer and other not in ALLOWED[layer]:
                    found.append(f"{module} ({layer}) imports {target} ({other}): {layer} may import only {', '.join(sorted(ALLOWED[layer])) or 'its own layer'}")
    return found


if __name__ == "__main__":
    files = sorted(pathlib.Path(".").glob("*.py"))
    ours = {path.stem for path in files}
    graph = {path.stem: imports(path, ours) for path in files}
    for module, targets in graph.items():
        if targets:
            print(f"{module} -> {', '.join(targets)}")
    placed = layers_from(MODULES.read_text(encoding="utf-8") if MODULES.exists() else "")
    found = problems(graph, placed)
    for problem in found:
        print(problem)
    print(f"{len(found)} problem{'' if len(found) == 1 else 's'} in {len(graph)} modules")
    sys.exit(1 if found else 0)
```

`imports` reads each file's code with `ast` (01-04-05), without running it, and keeps only the imports of Ledger's own modules. `layers_from` reads a table from `MODULES.md`, the way `vocab.py` reads `SPEC.md` (02-05-01): one document holds the decision, and the tool checks the code against it. `ALLOWED` is the rule, and it's short: the domain imports nothing of Ledger's, storage may import the domain, the interface both, tools anything; and any module may import its own layer. Save it and run it:

```
.venv/bin/python layers.py
```

(On Windows, `.venv/Scripts/python`.)

```
bank -> money
check_data -> lifecycle, store
history -> lifecycle, store
importer -> bank
reports -> store
timing -> reports
total -> money, store
backup.py isn't placed in MODULES.md's Layers table
…
20 problems in 20 modules
```

The arrows are Ledger's real dependencies, read from its code. The twenty problems are all the same: no module has been placed in a layer, because `MODULES.md` doesn't exist yet. That's the honest starting point. The structure is in the code already (only a few modules import others, and none of the money or lifecycle code imports anything), but nobody has said it is.

```check
run "cd ledger; .venv/Scripts/python layers.py" exit=1 stdout="bank -> money" -- layers.py should print Ledger's import graph, starting with bank -> money.
run "cd ledger; .venv/Scripts/python layers.py" exit=1 stdout="20 problems in 20 modules" -- With no MODULES.md, all twenty modules should be unplaced.
```

## The sketch

Write the structure down. Create `MODULES.md`:

```markdown file=ledger/MODULES.md
# Ledger: from the domain to the modules

### From the household to the code

- The real domain: two people, their cards, their bank's statements, a month's spending, and a habit of checking it.
- The conceptual model (SPEC.md): transactions, accounts, categories, statements, the inbox, and their rules (the vocabulary, the invariants, the lifecycle).
- The software model: Money, Status and its lifecycle, BankRow, the tables in data/.
- The architecture (this file): which module holds which part, and which may use which.
- The implementation and its verification: the modules, their tests, and layers.py, which checks this file's rule.

### Actors

- Sam and Alex: record and correct transactions, import statements, read reports. They never edit data/ by hand.
- The bank: produces statements, in a format it can change without warning.
- Whoever builds Ledger next, person or agent: reads SPEC.md and this file first.

### Layers

| Module | Layer | Responsibility |
|---|---|---|
| money.py | domain | Amounts: reading, adding, splitting and writing money |
| lifecycle.py | domain | A transaction's statuses and the moves between them |
| recurring.py | domain | The dates a monthly rule falls on |
| store.py | storage | Reading Ledger's tables from data/ |
| bank.py | storage | Reading a bank's statement into BankRows |
| importer.py | storage | Adding a statement's new transactions to the inbox |
| history.py | storage | Corrections, and the record of what each one changed |
| check_data.py | storage | Checking the stored data's keys and values |
| backup.py | storage | Backing up data/, and proving the backup |
| reports.py | interface | Totals for a person to read |
| total.py | interface | Printing a month's spending by category |
| estimate.py | tool | Estimating ten years of data |
| score.py | tool | Scoring the options in DECISION.md |
| timing.py | tool | Timing a report at ten years' size |
| race.py | tool | Showing a lost update between two writers |
| constraint.py | tool | Showing a database constraint |
| vocab.py | tool | Checking SPEC.md's vocabulary |
| make_bank.py | tool | Making the sample statements |
| make_data.py | tool | Making the sample data |
| layers.py | tool | Checking this table's rule |

The rule: every dependency points at the domain. Domain modules import none of Ledger's own modules, so the rules about money and lifecycles can be read, tested and reused without files, windows or a bank. Storage may use the domain. The interface, the tkinter window to come, may use both. Tools, run by hand, may use anything.

### Who owns which state

- data/ and data/.lock belong to storage; nothing else opens them.
- The rules (what a valid amount is, which moves a transaction may make) belong to the domain, and storage asks the domain rather than deciding for itself.
- What a person is looking at (the month on screen, a half-typed correction) belongs to the interface, and isn't stored until it's saved.

### What varies

- Each household's categories, accounts and recurring costs: data, in data/.
- The bank's statement format: one module, bank.py, so a new bank means a new reader, not changes everywhere.
- Money's rules, the lifecycle, how monthly dates fall: the same for every household, so code.

### Configurable or fixed

- Fixed in code: the data folder's name, data, and one currency (SPEC.md's A2). Changing either is a decision, not a setting.
- Configurable later, when a second household uses Ledger: where data/ is, and the bank's format.
```

Each section is one of this lesson's ideas, applied to Ledger. **From the household to the code** is the chain above, with Ledger's actual documents and types at each step. **Actors** are who uses or affects the system: the two people, the bank, and the next builder. **Layers** gives every module a layer and one **responsibility**, a single sentence; a module that needs "and" twice in its sentence is a module doing two jobs. The rule follows, with its reason: the domain imports nothing, so the money and lifecycle rules can be read, tested and reused with no files, windows or banks involved; later, the tkinter window (the interface) will use the domain and storage, and nothing will use the window. **Who owns which state** says which part may change what. **What varies** is a **commonality and variability analysis**: find what's the same for everyone (code) and what differs between households or over time (data, or one module). **Configurable or fixed** says which choices are settings and which are decisions, and that the line will move only when a second household arrives: a setting nobody needs is a setting someone must test. Save it, and run `layers.py` again:

```
.venv/bin/python layers.py
```

The graph, then `0 problems in 20 modules`: every module placed, and every arrow allowed.

```check
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 20 modules" -- With MODULES.md, every module should be placed and every import allowed.
run "cd ledger; .venv/Scripts/python -c \"import pathlib, layers; t = pathlib.Path('MODULES.md').read_text(encoding='utf-8'); placed = layers.layers_from(t); print(sorted(m for m, l in placed.items() if l == 'domain'), all(h in t for h in ['### Actors', '### Who owns which state', '### What varies', '### Configurable or fixed']))\"" stdout="['lifecycle', 'money', 'recurring'] True" -- MODULES.md should place money, lifecycle and recurring in the domain, and have the sketch's sections.
```

## A dependency in the wrong direction

Rules about structure break quietly: one convenient import, and the domain depends on files. Try it. Add this line at the very top of `money.py`, as someone might who wanted `Money` to read amounts straight from the data:

```
import store
```

Run `layers.py`:

```
.venv/bin/python layers.py
```

```
money (domain) imports store (storage): domain may import only its own layer
1 problem in 20 modules
```

Read it: the check names the module, its layer, what it imported and why that's not allowed. Nothing else would have noticed: every test passes with that import in place, because the import does nothing yet. That's the danger of structural rules: they don't fail until someone builds on the violation, by which time it's load-bearing. Remove the line, run `layers.py` (`0 problems`), and commit:

```
git add layers.py MODULES.md
git commit -m "Sketch Ledger's modules in layers, and check the dependencies"
```

```check
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 20 modules" -- With the import removed from money.py, there should be no problems.
run "cd ledger; .venv/Scripts/python -c \"import os, shutil, subprocess, sys, tempfile; d = tempfile.mkdtemp(); [shutil.copy(n, d) for n in os.listdir('.') if n.endswith('.py') or n == 'MODULES.md']; p = os.path.join(d, 'lifecycle.py'); open(p, 'w', encoding='utf-8').write('import history' + chr(10) + open(p, encoding='utf-8').read()); r = subprocess.run([sys.executable, 'layers.py'], cwd=d, capture_output=True, text=True); print(r.returncode, 'lifecycle (domain) imports history (storage)' in r.stdout)\"" stdout="1 True" -- layers.py should catch a domain module importing storage.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:MODULES.md').returncode == 0, 'import store' not in git('show', 'HEAD:money.py').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit layers.py and MODULES.md, with money.py unchanged.
```

**What else, and why not.** You could move the files into package folders now (`domain/`, `storage/`, `ui/`): that makes the layers visible in the file tree, and it's a refactor of twenty files and every test's imports, best done once the window exists and the boundaries have been tested by real use; the sketch and its check keep the structure honest until then (stage 3 enforces architecture this way, at scale). You could write the architecture as a diagram only: it can't be checked, so it's true on the day it's drawn. You could skip layers for a project this size: twenty files is exactly the size at which nobody remembers why each one exists, and the size at which fixing it is still an afternoon.

```predict
question: A new module, budgets.py, needs to read a category's monthly limit from data/ and compare it with Money. Which layer, and what may it import?
explain: Reading data/ makes it storage, or splits it in two: the rule "is this category over its limit?" is pure (Money compared with Money: domain), and reading the limits from a file is storage. Split, the domain part is testable with no files, and the storage part asks the domain for the decision, which is MODULES.md's "storage asks the domain rather than deciding for itself". Either way, MODULES.md gets a row, or layers.py reports it as unplaced.
```

## Your turn: one lock, one owner

`MODULES.md` says data/.lock belongs to storage. But storage takes it in two ways: `importer.py` has its own `take_lock` (02-04-02, with a fixed path), and `history.py` has another (02-08-02, with a folder and a shorter message). Two copies of the same protocol (02-07-02) will drift, and the day one changes how the lock works, the other won't.

Give the lock one owner:

- Create `locking.py` (storage) with `take_lock(folder)` and `release_lock(folder, lock)`, and an exception `Locked`, raised when the lock is already held, whose message is the importer's: `{folder}/.lock exists: another program is writing Ledger's data, or one stopped before finishing. If nothing else is running, delete {folder}/.lock.`
- Make `importer.py` and `history.py` use it, and delete their own copies. The importer still stops with that message and status 1 when the lock is held.
- Place `locking.py` in `MODULES.md`'s Layers table, and add `tests/test_locking.py`: a second writer is refused while the first holds the lock, and taking it again works once it's released.

`layers.py` should find no problems, and every test should pass. Commit.

```hints
nudge: Start with the two existing take_lock functions side by side. What's the same, what differs, and which caller wants an exception rather than a program exit?
concept: The shared module raises an exception (Locked); each caller decides what a held lock means for it: the importer turns it into sys.exit with the message, history lets it propagate. The folder is an argument, so the same code serves data/ and a test's tmp_path. layers.py will report locking.py as unplaced until MODULES.md has its row, which is the check doing its job.
shape: locking.py: class Locked(Exception); def take_lock(folder): try: return os.open(f"{folder}/.lock", os.O_CREAT | os.O_EXCL) except FileExistsError: raise Locked(...) from None; def release_lock(folder, lock): os.close(lock); os.remove(f"{folder}/.lock"). importer.py: from locking import Locked, release_lock, take_lock; in main, try: lock = take_lock("data") except Locked as error: sys.exit(str(error)); release_lock("data", lock) in the finally. history.py: from locking import release_lock, take_lock, and delete its copies.
answer: locking.py:
~~~python
import os


# Ledger's one lock (DATA.md): a writer holds folder/.lock while it changes
# the data. Taking it fails at once if it's already there, rather than waiting
# for a program that may have crashed.
class Locked(Exception):
    pass


def take_lock(folder):
    try:
        return os.open(f"{folder}/.lock", os.O_CREAT | os.O_EXCL)
    except FileExistsError:
        raise Locked(f"{folder}/.lock exists: another program is writing Ledger's data, or one stopped "
                     f"before finishing. If nothing else is running, delete {folder}/.lock.") from None


def release_lock(folder, lock):
    os.close(lock)
    os.remove(f"{folder}/.lock")
~~~
In importer.py, import from locking, delete LOCK and the old take_lock, take the lock with `try: lock = take_lock("data")` / `except Locked as error: sys.exit(str(error))`, and release it with `release_lock("data", lock)`. In history.py, import take_lock and release_lock from locking and delete its two functions. In MODULES.md's table: `| locking.py | storage | The one lock on data/, for every writer |`. tests/test_locking.py:
~~~python
import pytest

from locking import Locked, release_lock, take_lock


def test_a_second_writer_is_refused_while_the_first_holds_the_lock(tmp_path):
    lock = take_lock(tmp_path)
    with pytest.raises(Locked, match="another program is writing"):
        take_lock(tmp_path)
    release_lock(tmp_path, lock)
    release_lock(tmp_path, take_lock(tmp_path))
    assert not (tmp_path / ".lock").exists()
~~~
Then git add locking.py importer.py history.py MODULES.md tests/test_locking.py and git commit -m "Give data/.lock one owner, locking.py". The tempting slip is importing take_lock from importer.py into history.py: one copy, but now history (storage) depends on the importer, and the importer's sys.exit ends whatever program is correcting a transaction.
```

```check
run "cd ledger; .venv/Scripts/python -c \"import pathlib; i = pathlib.Path('importer.py').read_text(encoding='utf-8'); h = pathlib.Path('history.py').read_text(encoding='utf-8'); print('def take_lock' not in i, 'def take_lock' not in h, 'from locking import' in i and 'from locking import' in h)\"" stdout="True True True" -- importer.py and history.py should both use locking.py, with no copies of their own.
run "cd ledger; .venv/Scripts/python layers.py" stdout="0 problems in 21 modules" -- locking.py should be placed in MODULES.md, and every import allowed.
run "cd ledger; .venv/Scripts/python -c \"import subprocess, sys; open('data/.lock', 'w').close(); r = subprocess.run([sys.executable, 'importer.py', 'bank/2026-10.csv'], capture_output=True, text=True); import os; os.remove('data/.lock'); print(r.returncode, 'or one stopped before finishing' in r.stderr)\"" stdout="1 True" -- With the lock held, the importer should still stop with the full message and status 1.
run "cd ledger; .venv/Scripts/python -m pytest -q tests/test_locking.py" stdout="1 passed" -- The locking test should pass.
run "cd ledger; .venv/Scripts/python -m pytest -q tests" stdout="passed" without="failed" -- Every test should pass.
run "cd ledger; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:locking.py').returncode == 0, 'locking.py' in git('show', 'HEAD:MODULES.md').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit locking.py, the two modules, MODULES.md and the test.
```

**What these checks establish, and what they don't.** They check that `layers.py` reads the real import graph, that every module is placed and every import follows the rule, that a domain module importing storage is caught, and that the lock now has one owner without changing the importer's behaviour. They can't check that the layers are the right ones, or that each module's responsibility is really one thing: `reports.py` sits in the interface for now, and a good argument says its totals are domain logic that only happens to read files. The sketch is where that argument belongs, before the window is built on top of it.

## What you can do now

- A program travels from the **real domain** to a **conceptual model**, a **software model**, an **architecture** and an **implementation with verification**; each step can be wrong on its own, so write each down.
- Name the **actors**; give each module **one responsibility**, in one sentence.
- **Commonality and variability**: what's the same for everyone is code; what differs is data, or one module behind a boundary. Make a choice **configurable** only when someone needs it changed.
- Say **who owns which state**, and keep one owner for each (the lock).
- **Sketch** the structure, in **layers** with one dependency rule (towards the domain), and **check** the code against the sketch, because structural rules break silently.

**Next:** 02-10-01 puts numbers on the design: users, data volume, request rates, growth, back-of-envelope arithmetic, latency and storage orders of magnitude, peaks and averages. Ledger's ten years, and when Kit's tools must stream their input instead of loading it whole.
