# Lesson 16: Packaging, Virtual Environments, and Dependency Management Done Right

**What you will build.** Since Lesson 2, this curriculum has installed
`mypy` with `pip install mypy --break-system-packages` — straight into
the one, shared, global Python installation this entire environment
uses for everything. You'll first make that real cost visible: this
environment's global site-packages already holds over a hundred
unrelated packages, with nothing anywhere recording which of them this
specific project actually needs. You'll then build a real virtual
environment, install a *deliberately different* version of `mypy`
inside it than the one already installed globally, and prove — with
both versions actually run, side by side — that they coexist without
conflict, because they're genuinely separate installations. Finally,
you'll turn the project itself into a real, installable Python
package — a proper `src/` layout, a `pyproject.toml`, a `requirements.
txt` — and prove the entire thing is honestly reproducible by building
a completely independent, second virtual environment from nothing but
those two files, and watching it produce an identical, working,
type-checked project from scratch. The transferable problem: "it works
on my machine" is a genuine, recurring failure across every language
with a package ecosystem — C#'s NuGet and `.csproj` dependency
declarations, Java's Maven/Gradle and their own lock files, Node's
`package.json`/`package-lock.json`, all exist to solve the identical
problem this lesson solves for Python: making a project's real
dependencies an explicit, checked-in fact, not tribal knowledge living
only in whoever set up the original machine's head.

**What you need to know first.** Lesson 2's own `pip install mypy
--break-system-packages` — this lesson revisits that exact command
directly, explains precisely what it was actually doing to this shared
environment, and replaces it with something reproducible. Lesson 4's
proof that a module is a real object, importable by name — this
lesson's own package restructuring (`import tasks_app.tasks`, a name
this project has never used before) depends on that exact mechanism,
now applied to a real, installed package rather than a same-directory
file.

**Terms used in this lesson**

- **Virtual environment** — a self-contained, isolated Python
  installation, complete with its own separate `pip` and its own
  separate set of installed packages, entirely independent of the
  system's global Python installation or any other virtual
  environment. This term exists to name the specific tool this
  lesson's second unit uses to solve its first unit's own problem:
  every project gets its own private set of dependencies, with zero
  risk of one project's needs conflicting with another's.
- **`site-packages`** — the real directory where `pip install`
  actually places downloaded packages, whether that's the system's one
  global Python installation or a specific virtual environment's own,
  separate copy. This term exists because "installing a package"
  otherwise sounds abstract; `site-packages` is the literal, real
  location on disk this lesson's own commands actually populate,
  either the shared global one or a project-private one.
- **Dependency** — an external package a project's own code requires
  in order to run or to be checked (`mypy` itself, for this project,
  is a dependency of the *development* process, not of `tasks_app`'s
  own runtime behavior — a distinction real projects often track
  separately, though this lesson's own project keeps things simple
  with one combined list). This term exists to name, precisely, the
  category of thing a `requirements.txt` or `pyproject.toml` is
  supposed to record.
- **`requirements.txt`** — a plain text file, one package (and,
  typically, an exact version) per line, that `pip install -r
  requirements.txt` reads to install an entire project's dependencies
  in one command. This term exists to name the specific, simple
  mechanism this lesson's third unit uses to make this project's own
  dependencies an explicit, checked, reproducible fact, rather than
  something only the original person to set up the project's machine
  would know.
- **`pyproject.toml`** — a standardized configuration file describing
  a Python project itself — its name, version, and how it should be
  built and installed as a real package. This term exists because it's
  the specific, modern, standard file this lesson's third unit writes
  to turn `tasks_app` from "a folder of scripts" into a genuinely
  installable package.
- **Editable install** — installing a package (via `pip install -e
  .`) in a mode where Python imports it directly from its own source
  directory, rather than copying it into `site-packages` — meaning
  edits to the actual source files take effect immediately, with no
  reinstall step needed. This term exists because it's the specific
  installation mode that makes sense for a project you're actively
  developing (as this curriculum's own project has been, continuously,
  since Lesson 2), as opposed to a finished package you'd only ever
  use, never edit.
- **`src/` layout** — a package directory structure where the actual
  importable package code lives inside a `src/` subdirectory (here,
  `src/tasks_app/`), rather than directly in the project's own root
  directory. This term exists to name the specific, standard
  restructuring this lesson's third unit performs — a deliberate
  choice, discussed directly in this lesson's own SE Lens, over the
  alternative of leaving package code at the project root.
- **`py.typed` marker (PEP 561)** — an empty file, placed directly
  inside an installed package's own directory, that tells `mypy` (and
  other type checkers) "this package's own type hints are meant to be
  trusted and checked against, not skipped." This term exists because
  this lesson's third unit hits, and fixes, a real, honest failure
  caused by its absence — proof this isn't an abstract formality but a
  genuine, checkable requirement.

**Objects and methods used**

- **`sys.executable`**
  - *What it is:* An attribute of the standard-library `sys` module
    (this curriculum's first use of `sys`, though Lesson 4's own
    `sample_module.py` lab imported it briefly for `sys.path`, without
    naming `sys.executable` specifically).
  - *Implementation:* `sys.executable` is a plain string, set once by
    the interpreter itself at startup, holding the absolute filesystem
    path to the exact Python interpreter binary currently running the
    program.
  - *Its use:* This lesson's second unit needs direct, checkable proof
    that a virtual environment's own Python and the system's global
    Python are genuinely two separate interpreters, not the same one
    behaving differently — `sys.executable`, printed from each, is
    exactly that proof.
  - *Type:* A plain module attribute — a `str`, not a function or
    method; accessed via `sys.executable`, with no parentheses, since
    nothing is being called.
  - *Responsibility:* Report, accurately, which specific interpreter
    binary is currently executing — nothing about what packages that
    interpreter can see; that's a separate, if closely related, fact
    this lesson's own commands check directly via `pip list` instead.
  - *Depends on:* Nothing — it's set automatically the moment any
    Python process starts.
  - *Connects to:* Read directly by this lesson's own verification
    commands; its value differs specifically because a virtual
    environment's own `python` (or `python3`) is a genuinely separate
    binary (or, on some platforms, a symlink to one) from the system's,
    with its own, separate `site-packages` directory associated with
    it.
  - *Shape:* A single, absolute path string, e.g.
    `/home/.../project/.venv/bin/python` for a virtual environment's
    own interpreter, or `/usr/bin/python3` for this environment's
    global one.

---

## Concept Unit: The Real Cost of a Shared, Global Environment

### The Problem

Since Lesson 2, `mypy` has lived in this environment's one, single,
global Python installation — the exact same installation `python3`
itself has always pointed to throughout this entire curriculum.
Nothing about that command, `pip install mypy --break-system-packages`,
recorded anywhere that *this specific project* is what actually needs
`mypy` — it simply added `mypy` to the same pool of packages every
other Python program on this machine also draws from. What's actually
wrong with that, concretely — not as an abstract "best practice," but
as a real, checkable fact about this exact environment?

> **Before reading on:** if a second, completely unrelated project on
> this same machine needed a *different* version of `mypy` than this
> project does — an older one, say, for compatibility with some other
> tool it depends on — what would actually happen, given that both
> projects share the identical global `site-packages` directory? Is
> there any way for both versions to coexist in that single, shared
> location at once? And separately: if you handed this project's own
> `tasks.py`/`main.py` files to someone else, on a completely different
> machine, what would they need to already know, or guess correctly,
> in order to get `mypy main.py` working at all?

### Isolating the Concept

```
pip list --format=freeze | wc -l
```

Real output, run in this exact environment:

```
134
```

This environment's global **site-packages** (defined in Terms, above)
holds `134` separate packages — the vast majority of them installed for
reasons that have nothing to do with this specific curriculum's own
project at all. `mypy`, installed back in Lesson 2, is simply one more
entry in that same undifferentiated pool:

```
mypy --version
which mypy
```

Real output:

```
mypy 2.3.1 (compiled: yes)
/usr/local/bin/mypy
```

Nothing about this installation is wrong, exactly — `mypy` genuinely
works, and has worked correctly since Lesson 2. The real problem this
unit's own Socratic prompt named is structural, not immediate: if a
second project needed `mypy` version `1.13.0` specifically, there is no
way to have both `2.3.1` and `1.13.0` installed into this one, shared,
global location at the same time — installing one would simply replace
the other, silently breaking whichever project depended on the version
just overwritten. And nothing in this project's own two files —
`tasks.py`, `main.py` — records that `mypy` is even a **dependency**
(defined in Terms, above) at all; a second person, or a future version
of this very curriculum running in a fresh environment, would have to
already know, from outside the project's own files entirely, that
`pip install mypy` is a required setup step.

### Discarding the Example

Not applicable in the usual throwaway-code sense — this unit's own
"lab" is real, direct inspection of this actual environment's actual,
already-existing state, not a constructed example to isolate and
discard; the real fix, built in the next two units, replaces this
state rather than merely illustrating a problem with disposable code.

### Project Change

No project change in this unit — this unit establishes, with real,
checked evidence from this exact environment, the problem the next two
units directly solve.

### Mechanical Walkthrough

- `pip list --format=freeze` — a real terminal command, not Python
  code; `pip` is the package installer this curriculum has used since
  Lesson 2; `list` asks it to report every currently-installed
  package; `--format=freeze` requests output in the exact
  `name==version` shape a `requirements.txt` file itself uses (a
  detail this lesson's third unit relies on directly).
- `| wc -l` — a Unix pipe (`|`, sending the previous command's output
  directly into the next one) into `wc -l`, a standard command-line
  tool counting the number of lines in its input — genuinely narrow to
  this exact terminal-usage moment, not Python syntax at all, included
  here only to get a real, quick count.
- `mypy --version` — the same command this curriculum has run since
  Lesson 2, reporting the currently-installed, global `mypy`'s own
  version.
- `which mypy` — a standard command-line tool reporting the full
  filesystem path to whichever `mypy` executable the shell would
  actually run — confirming it lives in a system-wide location,
  `/usr/local/bin`, shared by every user and every project on this
  machine.

### CS Lens

This is a hard concept — dependency isolation, and the real conflicts
that arise without it — so, per the Repetition Rule, several unrelated
recurrences:

```
Also recognized in: "DLL hell" in older Windows software (multiple
programs sharing one global set of system libraries, with no
isolation, leading to exactly this lesson's own hypothetical conflict
becoming a real, historically infamous problem), Node.js's own
per-project node_modules directory (a deliberate design choice
avoiding this exact global-sharing problem from the very start, by
giving every single project its own, fully separate copy of every
dependency by default), Docker containers and virtual machines more
broadly (isolating an entire operating system's worth of dependencies,
not just Python packages, for the identical underlying reason —
different workloads needing different, potentially conflicting
software versions on the same physical machine), and the general
software engineering principle of reproducible builds — the ability
to recreate an identical, working environment from a checked-in
specification, rather than from an undocumented sequence of manual
steps someone once ran and half-remembers
```

### SE Lens

The alternative — continuing to install every dependency globally, for
every project, indefinitely — was rejected here specifically because
this exact curriculum has already been doing it since Lesson 2, and
this unit's own real numbers (a shared pool of `134` packages, with
this project's own actual needs recorded nowhere) are the honest,
measured cost of that choice, not a hypothetical one. The real,
mitigating cost of the *fix*, worth naming directly rather than
pretending it's free: virtual environments and proper packaging add
real, genuine setup steps — this lesson's own next two units run
several new commands that plain global installation never required —
and for a truly small, single-file, never-shared script, that overhead
can genuinely not be worth paying. It becomes worth it exactly at the
point a project might need a specific, pinned dependency version, might
be run on more than one machine, or might need to be handed to someone
else at all — every one of which is already true of this curriculum's
own project, sixteen lessons in.

### Commands Needed

```
pip list --format=freeze | wc -l
mypy --version
which mypy
```

All three are ordinary shell commands, run directly in a terminal, not
inside a Python script — the same category of tool-invocation this
curriculum has used since Lesson 2's own `mypy main.py`.

### Run It

Already shown and verified above, under "Isolating the Concept" — real
output from this exact environment.

### Connection

This unit established the real, measured cost of this curriculum's own
global dependency habit. The next unit fixes it directly: a real,
isolated environment, proven separate by actually installing a
different `mypy` version inside it.

---

## Concept Unit: Virtual Environments — Real, Proven Isolation

### The Problem

The previous unit's core question was whether two different versions
of the same package could coexist on this one machine at all, given
one shared global `site-packages`. Python's own standard library ships
a direct answer: `venv`, a module for creating a **virtual environment**
(defined in Terms, above) — but does it actually deliver genuine
isolation, or is that just documentation's own claim? What would it
take to prove it directly, rather than trust it?

> **Before reading on:** if a virtual environment really does give a
> project its own, separate `site-packages`, what experiment would
> *prove* that, rather than merely describe it? Specifically: if you
> installed a deliberately *different* version of `mypy` inside a new
> virtual environment than the one already installed globally, and then
> ran `mypy --version` from inside that environment versus from the
> ordinary, global command line — what result would convince you the
> isolation is real, versus a result that would suggest it isn't?

### Isolating the Concept

```
cd project
python3 -m venv .venv
```

This creates a real, self-contained Python installation inside
`project/.venv/` — genuinely narrow, this-exact-command usage; `python3
-m venv` (Lesson 2's own `-m` flag, restated per the Repetition Rule:
runs the standard-library `venv` module as a script) followed by a
target directory name, here `.venv`, a real, if purely conventional,
name for this exact purpose.

```
.venv/bin/python -c "import sys; print(sys.executable)"
python3 -c "import sys; print(sys.executable)"
```

Real output:

```
/home/claude/python-mastery/project/.venv/bin/python
/usr/bin/python3
```

Two genuinely different interpreter paths, confirmed directly via
`sys.executable` (full treatment in Objects and methods, above) — the
virtual environment's own Python is a real, separate binary from this
machine's global one.

```
.venv/bin/python -m pip list --format=freeze
```

Real output:

```
pip==24.0
```

A brand-new virtual environment starts with almost nothing installed —
just `pip` itself — genuinely, provably separate from the global
environment's own `134` packages this lesson's first unit counted.
Now, the direct test this unit's own Socratic prompt asked for:

```
.venv/bin/python -m pip install mypy==1.13.0
.venv/bin/mypy --version
mypy --version
```

Real output:

```
mypy 1.13.0 (compiled: yes)
mypy 2.3.1 (compiled: yes)
```

Two genuinely different, coexisting versions of the identical package,
on the identical machine, at the identical moment — `1.13.0`, installed
specifically and deliberately inside this new virtual environment, and
`2.3.1`, the same global installation this curriculum has used since
Lesson 2, completely undisturbed by anything this unit just did. This
is real, direct, checkable proof that a virtual environment's own
`site-packages` is genuinely separate from the global one — not a
description of what `venv` is *supposed* to do, but a measured
confirmation that it actually did it, on this exact machine, right now.

### Discarding the Example

Not applicable in the throwaway-code sense — the virtual environment
this unit built (`.venv`, at `project/.venv/`) is not discarded; it's
the real, persistent environment this project's remaining lessons and
this curriculum's own future work will continue to use.

### Project Change

- **Reference Source:** No reference counterpart — original to this
  project.
- **Files affected:** `project/.venv/` — created new (not itself a
  source file this lesson tracks line-by-line, since it's a large,
  generated directory of installed packages, not authored code).
- **Change type:** Add.
- **Location:** Directly inside the existing `project/` directory,
  alongside `tasks.py` and `main.py`.
- **Dependencies:** Python's own standard-library `venv` module — no
  separate installation required to create one at all.

### Mechanical Walkthrough

- `python3 -m venv .venv` — a shell command, not Python code; `-m
  venv` runs the standard-library `venv` module, which constructs a
  new, self-contained Python installation (a real copy of the
  necessary interpreter files and a fresh, empty `site-packages`) at
  the given path, `.venv`.
- `.venv/bin/python` — the resulting virtual environment's own,
  private Python interpreter — a real, separate executable file,
  distinct from `/usr/bin/python3`.
- `-c "import sys; print(sys.executable)"` — the `-c` flag (genuinely
  narrow, this-exact-usage syntax, telling `python` to run the given
  string directly as a program rather than reading it from a file),
  running an `import` statement (Lesson 2, restated per the Repetition
  Rule) and a `print` call (Lesson 1, restated per the Repetition
  Rule) on `sys.executable` (full treatment in Objects and methods,
  above).
- `.venv/bin/python -m pip list --format=freeze` — runs `pip`, this
  virtual environment's own private copy of it, not the global one,
  since it's invoked via this specific interpreter's own `-m pip`
  rather than a bare `pip` command that might resolve to the system's
  copy instead.
- `.venv/bin/python -m pip install mypy==1.13.0` — installs a
  specific, pinned version of `mypy` — `==1.13.0` (a real, valid `pip`
  version-pinning syntax) — deliberately different from the already-
  installed global `2.3.1`, specifically to make the isolation this
  unit is proving directly checkable.
- `.venv/bin/mypy --version` — runs this virtual environment's own,
  newly-installed `mypy` directly.
- `mypy --version` — runs the ordinary, global `mypy`, exactly as every
  previous lesson has, completely unaffected by anything the virtual
  environment did.

### CS Lens

This reappears the isolation idea from the previous unit, restated in
full per the Repetition Rule, now demonstrated as a real, working
mechanism rather than a described problem:

```
Also recognized in: chroot and containerization technologies generally
(a virtual environment is, conceptually, a much lighter-weight version
of the identical idea — a genuinely separate, self-contained
filesystem view for a specific piece of software, rather than sharing
the host's own global state), Java's own classpath isolation per
project (a comparable, if less strictly enforced, mechanism for
keeping one project's library versions from colliding with another's),
sandboxing in general operating-systems design (isolating a running
program's effects from the rest of the system, for safety or
reproducibility — a virtual environment isolates dependency *versions*
specifically, a narrower but closely related goal), and the broader
principle of "the tool that creates the environment for a program
should itself be simple and reliable" — venv is deliberately part of
Python's own standard library, needing no separate installation, so
that the very first step toward reproducibility doesn't itself
introduce a new, unmanaged dependency
```

### SE Lens

The alternative — installing packages globally, but being extremely
careful and disciplined never to let two projects' version needs
actually conflict — was rejected as a real, scalable strategy because
it depends entirely on perfect, ongoing human discipline across every
project ever run on a given machine, indefinitely, with no tooling
enforcing it at all; this lesson's own first unit's real number
(`134` already-installed global packages) is exactly the kind of
accumulated state that makes tracking every project's true
requirements, by memory alone, genuinely infeasible past a small
number of projects. The real, honest cost of virtual environments
themselves: they take real disk space (this lesson's own `.venv`
directory duplicates a working Python installation's own files) and
require remembering to actually *use* the right interpreter (`.venv/
bin/python`, not the bare `python3` this curriculum has otherwise used
throughout) — a real, easy mistake to make, and exactly what the next
unit's own reproducibility test is partly designed to catch, by
verifying the *right* interpreter, freshly built, produces the correct
result.

### Commands Needed

```
python3 -m venv .venv
.venv/bin/python -m pip install mypy==1.13.0
.venv/bin/mypy --version
```

Each command is explained in full in the Mechanical Walkthrough, above.

### Run It

Already shown and verified above, under "Isolating the Concept" — both
`mypy` versions, run directly, on the same machine, at the same time.

### Connection

This unit proved virtual environments deliver real, checkable
isolation. The next unit uses that isolated environment to build
something more ambitious: turning this project's own two loose files
into a genuinely reproducible, installable package, and proving that
reproducibility with the strongest test available — building a
completely separate, second environment from nothing but the project's
own checked-in configuration files.

---

## Concept Unit: A Real Package — `pyproject.toml`, `src/` Layout, and Full Reproducibility

### The Problem

`tasks.py` and `main.py` have lived as two loose files directly inside
`project/` since Lesson 2, imported via Python's own same-directory
lookup (Lesson 2's own `from tasks import create_task`) — which only
works because both files happen to sit next to each other. A real,
shareable project needs more: a formal declaration of what it *is* (a
real, named, installable package), and a formal declaration of what it
*needs* (its dependencies, pinned to exact, known-working versions) —
together making it possible for someone else, or a future you, to
recreate a working copy of this exact project with confidence, rather
than hope.

> **Before reading on:** if you moved `tasks.py` into a proper package
> directory — say, `src/tasks_app/tasks.py`, with an `__init__.py`
> alongside it marking `tasks_app` as a real, importable package — what
> would `main.py`'s own import line need to change to? And separately:
> if you generated a `requirements.txt` from everything currently
> installed in this lesson's own virtual environment, and handed both
> that file and the project's own source code to someone starting from
> a completely empty virtual environment of their own, what sequence of
> commands would they need to run to end up with an identical, working
> setup — and how would you actually *prove*, rather than merely hope,
> that it really would work?

### Isolating the Concept

The **`src/` layout** (defined in Terms, above): `tasks.py` moved into
`src/tasks_app/tasks.py`, with an empty `src/tasks_app/__init__.py`
(Lesson 4's own proof that a package needs a real, if empty, file
marking it as one). A minimal, real **`pyproject.toml`** (defined in
Terms, above):

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "tasks-app"
version = "0.1.0"
requires-python = ">=3.9"

[tool.setuptools.packages.find]
where = ["src"]
```

Installing it, as an **editable install** (defined in Terms, above),
into this lesson's own virtual environment:

```
.venv/bin/python -m pip install -e .
```

Real output (abbreviated):

```
Successfully installed tasks-app-0.1.0
```

`main.py`'s own import line changes from `from tasks import ...` to
`from tasks_app.tasks import ...` — a real, different module path,
proven genuinely different (not merely renamed) by running it and
inspecting a class's own reported location:

```
print(type(LoggingTaskList))
```

Real output:

```
<class 'tasks_app.tasks.TaskListRegistry'>
```

`tasks_app.tasks` — not a bare `tasks` — confirming `LoggingTaskList`'s
own metaclass is genuinely being found through the newly-installed
package, not through some leftover same-directory file.

Checking this with `mypy` exposed a real, honest failure this unit
didn't anticipate in advance:

```
.venv/bin/mypy main.py
```

Real output:

```
main.py:1: error: Skipping analyzing "tasks_app.tasks": module is installed, but missing library stubs or py.typed marker  [import-untyped]
```

This is a real, standard requirement: `mypy` refuses to trust an
installed package's own type hints unless that package explicitly
marks itself as supporting them, via a **`py.typed` marker** (defined
in Terms, above) — an empty file, `src/tasks_app/py.typed`, per PEP
561, Python's own official specification for exactly this. Adding it,
and reinstalling:

```
touch src/tasks_app/py.typed
.venv/bin/python -m pip install -e .
.venv/bin/mypy main.py
```

Real output:

```
Success: no issues found in 1 source file
```

Finally, generating a real **`requirements.txt`** (defined in Terms,
above) from this lesson's own virtual environment, and the strongest
possible proof this unit can offer: building a completely separate,
*second*, brand-new virtual environment, from nothing but this
project's own checked-in `requirements.txt` and `pyproject.toml`:

```
.venv/bin/python -m pip freeze
```

Real output (the project's own editable-install line removed, keeping
only genuine, real third-party dependencies):

```
mypy==1.13.0
mypy_extensions==1.1.0
typing_extensions==4.16.0
```

```
python3 -m venv .venv2
.venv2/bin/python -m pip install -r requirements.txt
.venv2/bin/python -m pip install -e .
.venv2/bin/mypy --version
.venv2/bin/python main.py
.venv2/bin/mypy main.py
```

Real output:

```
mypy 1.13.0 (compiled: yes)
[... the project's own real output, identical to every previous run ...]
Success: no issues found in 1 source file
```

A completely independent virtual environment — one that never shared
anything with `.venv` beyond the two checked-in files — reproduces the
identical `mypy` version and a fully working, correctly type-checked
project. This is genuine, proven **reproducibility**: not a claim, but
a real, executed second build, from scratch, that matched.

### Discarding the Example

The second, throwaway `.venv2` environment built purely to prove
reproducibility is deleted now — its entire purpose was this unit's
own verification, not a second, ongoing environment this project needs
to maintain going forward.

### Project Change

- **Reference Source:** No reference counterpart — original to this
  project.
- **Files affected:** `project/tasks.py` — moved to
  `project/src/tasks_app/tasks.py`; `project/src/tasks_app/__init__.py`
  — created new (empty); `project/src/tasks_app/py.typed` — created
  new (empty); `project/pyproject.toml` — created new;
  `project/requirements.txt` — created new; `project/main.py` —
  modified (import line only).
- **Change type:** Refactor (restructuring existing, working code into
  a proper package) plus Add (the new configuration files).
- **Location:** The new `src/tasks_app/` directory sits inside the
  existing `project/` directory, alongside `main.py`, `pyproject.toml`,
  and `requirements.txt`.
- **Dependencies:** `setuptools`, declared in `pyproject.toml`'s own
  `[build-system]` table — the standard tool that actually builds and
  installs a package from a `pyproject.toml` description; installed
  automatically by `pip` itself when needed, requiring no separate,
  manual installation step of its own.

### The New Code

`pyproject.toml`, in full:

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "tasks-app"
version = "0.1.0"
requires-python = ">=3.9"

[tool.setuptools.packages.find]
where = ["src"]
```

`requirements.txt`, in full:

```
mypy==1.13.0
mypy_extensions==1.1.0
typing_extensions==4.16.0
```

`main.py`'s own changed line:

```python
from tasks_app.tasks import create_task, create_id_generator, describe_task, TaskList, LoggingTaskList, Persistable, add_task, TaskListRegistry
```

### The Updated Project

```
project/
├── .venv/                       (a real virtual environment; not tracked line-by-line)
├── pyproject.toml               ← new
├── requirements.txt             ← new
├── main.py                      ← changed (import line only)
└── src/
    └── tasks_app/
        ├── __init__.py          ← new (empty)
        ├── py.typed             ← new (empty)
        └── tasks.py             ← moved here, unchanged in content since Lesson 15
```

As a whole, the project is now a real, installable Python package —
`tasks_app` — with its own declared name, version, and dependency list,
rather than two loose files relying on same-directory import luck.
`main.py` remains the project's own runnable entry point, now importing
`tasks_app.tasks` the same way any other program, anywhere on the
system, could, once the package is installed.

### Mechanical Walkthrough

- `[build-system]` / `requires = ["setuptools>=61.0"]` / `build-backend
  = "setuptools.build_meta"` — a TOML table (a real, standard
  configuration file format — genuinely narrow syntax to this exact
  file, not Python code at all, and not a subject of its own beyond
  this note) declaring which tool (`setuptools`, a real, extremely
  common Python packaging tool) and which specific interface
  (`setuptools.build_meta`) should be used to actually build this
  package.
- `[project]` / `name = "tasks-app"` / `version = "0.1.0"` /
  `requires-python = ">=3.9"` — a second TOML table declaring the
  project's own real, human-facing identity: its name (as it would
  appear if ever published), its version, and the minimum Python
  version it requires.
- `[tool.setuptools.packages.find]` / `where = ["src"]` — configuration
  specific to `setuptools` itself, telling it to look for real,
  importable packages inside the `src/` directory — this is the exact
  setting that makes the **`src/` layout** (defined in Terms, above)
  actually work.
- `mypy==1.13.0` and its two lines beneath it, in `requirements.txt` —
  plain text, one dependency per line, in the identical `name==version`
  shape `pip list --format=freeze` already produces — no special
  syntax beyond that.
- `from tasks_app.tasks import ...`, in `main.py` — an import statement
  (Lesson 2, restated per the Repetition Rule); `tasks_app` is now a
  real, installed package name (found because the editable install
  registered it), and `.tasks` reaches the `tasks.py` module inside it
  — the identical dotted-attribute-style module access this curriculum
  has used since Lesson 4's own module-as-object proof, here applied to
  a genuine sub-module inside a real package for the first time.
- `.venv/bin/python -m pip install -e .` — installs the current
  directory (`.`, referring to wherever `pyproject.toml` itself lives)
  as an editable package; per this unit's own term, this means Python
  will import `tasks_app` directly from `src/tasks_app/`, so further
  edits to `tasks.py` take effect immediately, with no need to reinstall.
- `touch src/tasks_app/py.typed` — a standard Unix command (not Python)
  creating a real, empty file at the given path — the entire, complete
  content of a valid **PEP 561 marker** (defined in Terms, above) is
  simply that the file exists at all.

### CS Lens

This is a hard concept — formal, declarative project metadata as the
foundation of genuine reproducibility — so, per the Repetition Rule,
several unrelated recurrences:

```
Also recognized in: C#'s .csproj files and NuGet package references
(declaring a project's exact dependencies and their versions in a
checked-in, machine-readable file — the direct structural counterpart
to pyproject.toml plus requirements.txt), Java's pom.xml (Maven) or
build.gradle (Gradle) serving the identical role, Node.js's
package.json plus package-lock.json (package.json declaring intended
version ranges, package-lock.json pinning the exact, tested versions
actually used — a two-file split some Python projects also adopt,
though this lesson's own project keeps its dependency declaration in
one simple requirements.txt for clarity), and the broader "Infrastructure
as Code" movement in software engineering generally — treating an
environment's own configuration as checked-in, versioned, reviewable
text, rather than a sequence of manual steps someone once performed and
nobody wrote down
```

### SE Lens

The alternative — continuing to describe this project's setup steps
only in prose (in a README, say, or worse, only in this curriculum's
own lesson text) rather than in real, machine-readable files a tool can
actually execute — was rejected because prose instructions can drift
out of date silently, with nothing checking whether they're still
accurate, while `requirements.txt` and `pyproject.toml` are
*executable* documentation: this unit's own final test — a completely
fresh `.venv2`, built and verified from nothing else — is the direct
proof that these particular files are still accurate, right now,
because it just used them successfully. The real, honest cost, worth
stating plainly: this lesson's own restructuring is a genuine, one-time
disruption — every future lesson in this curriculum working with this
project must now remember to activate or reference `.venv/bin/python`
specifically, and to import `tasks_app.tasks` rather than plain
`tasks`, a real, permanent change to how this project's own code is
written and run from this point forward.

### Commands Needed

```
mkdir -p src/tasks_app
touch src/tasks_app/__init__.py
touch src/tasks_app/py.typed
.venv/bin/python -m pip install -e .
.venv/bin/python -m pip freeze
.venv/bin/python main.py
.venv/bin/mypy main.py
```

Each command is explained in full above, in the Mechanical Walkthrough
and the "Isolating the Concept" narrative.

### Run It

Already shown and verified above, under "Isolating the Concept" —
including the real, honest `py.typed` failure and its fix, and the full
independent-environment reproducibility test.

### Connection

This unit is where every previous unit's own finding became a real,
durable project structure: the first unit's measured problem (no
record of this project's real dependencies) is exactly what
`requirements.txt` now solves; the second unit's proven isolation is
exactly what makes a virtual environment the correct place to install
this project's own dependencies into in the first place; and this
unit's own final, independent-environment test is the strongest form of
evidence this curriculum's own Verification Rule has ever demanded of
a single claim — not "this should be reproducible," but "this was
reproduced, for real, from nothing but these two checked-in files."

---

## Connect the Pieces

Trace one command — `.venv2/bin/mypy main.py`, from this unit's own
final reproducibility test — through everything this lesson built.
`.venv2` itself exists only because this lesson's second unit already
proved `python3 -m venv` creates a genuinely separate, isolated Python
installation — the identical mechanism, run a second time, on a
brand-new directory name. `.venv2/bin/python -m pip install -r
requirements.txt`, run just before it, installed the exact three
packages this lesson's third unit recorded — `mypy==1.13.0`,
`mypy_extensions==1.1.0`, `typing_extensions==4.16.0` — the identical
versions this lesson's second unit deliberately, specifically chose to
differ from this environment's own pre-existing global `mypy 2.3.1`,
precisely so that seeing `1.13.0` reappear here, unprompted, in a
completely fresh environment, would be unambiguous proof of real
reproduction rather than a coincidence. `.venv2/bin/python -m pip
install -e .`, run next, used this lesson's own `pyproject.toml` to
install `tasks_app` as a real, editable package — the exact same
`src/` layout this unit's own restructuring created, now proven to
work from a description alone, with no manual copying of files
involved at all. And `mypy main.py` itself succeeds only because this
unit's own real, honest `py.typed` fix is present in the installed
package, exactly where this unit's own earlier, failed attempt
revealed it was missing — a real bug, in this very lesson's own first
attempt, caught by the identical Verification Rule this entire
curriculum has followed since Lesson 1, and fixed before this lesson
was ever considered finished.
