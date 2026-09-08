# Lesson 25 — Packages and Imports: Why "It Works From Here But Not From There"

## Why now
Every lesson so far has been one file. Real code splits across many — and the exact moment people hit their first genuinely confusing Python error is almost always here: a script that imports perfectly when run one way and fails with a cryptic message when run another way, with no code changes at all.

## What you'll learn
- What actually happens when Python resolves `import` — not magic, a real search process
- What `__init__.py` does, mechanically, proven by watching it actually run
- The real, exact error message from running the same file two different ways — and why it happens
- The fix, and why `-m` matters

## What you'll build
A small real package — `movies_pkg/` with `parser.py` and `models.py` — used the way actual multi-file projects are structured, reproducing (and then fixing) a genuinely common real error.

```
pkg_demo/
├── main.py
└── movies_pkg/
    ├── __init__.py
    ├── parser.py
    └── models.py
```

```python
# movies_pkg/parser.py
def parse_line(line):
    fields = line.split(",")
    return {"title": fields[0], "year": int(fields[1])}
```
```python
# movies_pkg/models.py
from .parser import parse_line

def load_movie(line):
    return parse_line(line)
```
```python
# main.py
from movies_pkg.models import load_movie
print(load_movie("Coco,2017"))
```

## The question
`models.py` imports from `parser.py` using `from .parser import parse_line` — the leading dot means "the module named `parser`, in the same package as me." Running `main.py` (which imports `movies_pkg.models`) works fine. What happens if you just run `models.py` directly instead — `python3 movies_pkg/models.py`?

## 1. Predict
Before running anything: does `python3 movies_pkg/models.py` work the same way as importing it from `main.py`, fail with an error, or something else? If it fails, what do you think the actual error message says?

## 2. Try it
```bash
cd pkg_demo
python3 main.py
```
```
movies_pkg/__init__.py is running
{'title': 'Coco', 'year': 2017}
```
Works as expected — `__init__.py`'s print statement runs (more on that below), and `load_movie` returns the parsed dict.

Now, directly:
```bash
python3 movies_pkg/models.py
```
Real output:
```
Traceback (most recent call last):
  File "/home/claude/pkg_demo/movies_pkg/models.py", line 1, in <module>
    from .parser import parse_line
ImportError: attempted relative import with no known parent package
```
Same file, same content, completely different result. If you predicted an error, that's right — and this exact message (`attempted relative import with no known parent package`) is one of the most common real Python errors people hit, and one of the most confusing to someone seeing it for the first time, because nothing about `models.py` itself is wrong.

## 3. Why?
### Code mechanics — what `import` actually does
When Python runs a file directly (`python3 movies_pkg/models.py`), it treats that file as the **top-level script**, executing in a context with no enclosing package at all — Python has no concept, at that point, of `movies_pkg` being a package `models.py` belongs to. A relative import (`from .parser import ...`) explicitly means "look inside my own package" — but if Python doesn't think you're *in* a package (because you launched the file directly, as a standalone script), `.parser` has nothing to resolve relative to, hence: "no known parent package."

When `main.py` does `from movies_pkg.models import load_movie` instead, Python imports `movies_pkg` **as a package first** (running `__init__.py` in the process — which is exactly why its print statement shows up), then loads `models` as a submodule *within* that package context — at which point `.parser` inside `models.py` has a real parent package to resolve relative to.

### `__init__.py`'s actual role
```bash
cd pkg_demo && ls movies_pkg/
```
The presence of `__init__.py` (even empty) is literally what makes Python treat a directory as an importable package rather than just an ordinary folder that happens to contain `.py` files. It runs exactly once, automatically, the first time anything imports that package or anything inside it — this is why `"movies_pkg/__init__.py is running"` printed *before* `load_movie`'s output in the working case: importing `movies_pkg.models` necessarily imports `movies_pkg` itself first.

### Mental model
```
python3 main.py
    → imports movies_pkg  → runs __init__.py, establishes "movies_pkg is a package"
    → imports movies_pkg.models  → models.py runs WITH knowledge of its parent package
    → from .parser import ...  → resolves fine: "parser, in my known parent package"

python3 movies_pkg/models.py  (direct)
    → models.py runs as the TOP-LEVEL script, no parent package context at all
    → from .parser import ...  → nothing to resolve "." against → ImportError
```

## 4. The actual fix — running as a module
```bash
python3 -m movies_pkg.models
```
Real output:
```
movies_pkg/__init__.py is running
```
(No printed dict here, since `models.py` on its own doesn't call `load_movie` — but critically, no `ImportError` either.) The `-m` flag tells Python: "treat this as a module *within* its package, resolve it through the normal import system" — rather than "just execute this file as a standalone script." This is precisely the missing context from the direct-run version: `-m` gives Python the parent-package awareness it needs for the relative import to resolve.

### What changed vs. what did not
The file `models.py` itself never changed across all three attempts — same code, same relative import. What changed each time was purely *how Python was invoked* — direct script execution versus module execution via `-m` versus being imported from another file. This is the single biggest thing worth taking from this lesson: a relative-import error is almost never a sign your import statement is wrong; it's a sign of *how the file was run*.

## 5. Put it in the project — organizing real lesson code
```python
# movies_pkg/parser.py
def parse_line(line):
    fields = line.split(",")
    return {"title": fields[0], "year": int(fields[1])}

# movies_pkg/db.py
import sqlite3
from .parser import parse_line

def load_movies_into_db(filepath, conn):
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS movies (title TEXT, year INTEGER)")
    with open(filepath) as f:
        next(f)  # skip header
        for line in f:
            movie = parse_line(line.strip())
            cursor.execute("INSERT INTO movies VALUES (?, ?)", (movie["title"], movie["year"]))
    conn.commit()

# main.py
import sqlite3
from movies_pkg.db import load_movies_into_db

conn = sqlite3.connect(":memory:")
load_movies_into_db("movies.csv", conn)
print(conn.execute("SELECT * FROM movies").fetchall())
```

### Code walkthrough
- `from .parser import parse_line` inside `db.py` — a relative import within the package, exactly like `models.py`'s, reusing Lesson 1's parsing logic instead of duplicating it. This is the actual payoff of organizing code this way: `parser.py`'s logic is written once and imported wherever it's needed across the whole project, rather than copy-pasted into every file that happens to need it.
- `main.py`'s import (`from movies_pkg.db import load_movies_into_db`) is an **absolute** import (no leading dot) — this works regardless of how `main.py` itself is run, because `main.py` isn't inside the package; it's importing the package from outside, which always goes through the normal top-level import resolution.
- Note the asymmetry: files *inside* `movies_pkg` use relative imports (`.parser`) to refer to their siblings; `main.py`, *outside* the package, uses an absolute import (`movies_pkg.db`) to refer to the package as a whole. This isn't inconsistency — it's the correct pattern: relative imports for "within my own package," absolute imports for "reaching into a package from outside it."

### Why this design?
Splitting `parser.py` and `db.py` apart, rather than keeping everything in one growing file, mirrors real project structure: each file has one clear responsibility, and other files (or other projects entirely) can import just the piece they need — `parser.py`'s `parse_line` could be reused by a completely different script with no database logic at all, without dragging `sqlite3` along for the ride.

## 6. Trap
**Normal rule:** if `import` works when you run your main script, your imports are correct.
**Apparently equivalent code:** later, while debugging, running an inner file directly (`python3 movies_pkg/db.py`) "just to test it quickly" — a completely natural, common instinct.
**Surprising result:** the exact `ImportError: attempted relative import with no known parent package` from step 2, on code that works perfectly fine in its actual intended use.
**Exact reason:** as established above, this error is about *invocation context*, not correctness of the import statement itself — direct execution strips away the parent-package context relative imports need.
**Project consequence:** don't "fix" this by removing the dot and using an absolute import instead (`from parser import parse_line` instead of `from .parser import parse_line`) just to make direct-running work — that specific fix quietly breaks the normal `main.py`-driven usage in subtler ways (Python can end up loading two separate copies of the same module under different names, causing bugs that are far harder to trace than this error is). The real fix is either running via `-m` (`python3 -m movies_pkg.db`) for quick testing, or better, writing separate small test files/scripts at the top level that import the package normally, exactly the way `main.py` already does.

## Exercise
- **Predict:** If `__init__.py` contained real setup code (not just a print statement) — say, creating a shared database connection — would that code run once per program, or once per file that imports something from the package?
- **Modify:** Add a third file, `movies_pkg/reports.py`, that imports from both `parser.py` and `db.py` using relative imports, and have `main.py` import a function from it. Confirm it works the same way as `models.py`/`db.py` did.
- **Break:** Remove `__init__.py` entirely and try `python3 main.py` again. Does it still work? (Modern Python supports "namespace packages" without `__init__.py` in many cases — check whether that's true here, and note that relying on this is a real but less explicit style choice than including one.)
- **Repair:** Put `__init__.py` back, and write one sentence on why an explicit empty `__init__.py` is still worth keeping even if Python doesn't strictly require it in every case.
- **Trace:** Walk through exactly what happens, step by step, when `python3 -m movies_pkg.models` runs — which file's code executes first, second, and in what order do the two `import`-related side effects (the `__init__.py` print, and any code inside `models.py` itself) occur?

## What to remember
- `import` resolution depends on *how a file was invoked* (direct script vs. `-m` module vs. imported by another file), not just the import statement's own correctness.
- `__init__.py` is what makes a directory an importable package, and it runs automatically, once, the first time anything imports from that package.
- Relative imports (`.module`) only resolve correctly when Python knows the file's parent package — which requires running via `-m` or being imported from outside, never direct script execution of an inner file.
- Use relative imports within a package, absolute imports from outside it — this asymmetry is the correct pattern, not an inconsistency.

## Next lesson
Back to ML with the elbow method for choosing `n_clusters` properly (queued from Lesson 24) — or, staying in SWE, virtual environments and dependency management (`pip`, `requirements.txt`), which becomes relevant the moment a project like this one needs to be shared or run somewhere else reliably. Your call.
