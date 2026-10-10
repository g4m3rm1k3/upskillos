# Build a Spreadsheet — Curriculum Plan

**Status:** proposed — 2026-10-02. **Extended 2026-10-09 into the full-stack bootcamp:** the full sprint order, the clients, and everything added are in [bootcamp-series-plan.md](bootcamp-series-plan.md). This document still holds the teaching rules, the detail of the sprints it lists, and the owner decisions (§23, updated the same day).  
**Series ID:** `spreadsheet-build`

This series teaches the transition from **Python scripting to professional software development** by building one substantial application from an empty folder.

The learner does not receive a prebuilt application and then study it. The application is built incrementally. Every architectural decision is introduced because the current version of the product has created a concrete problem that requires it.

The learner's project is their own real Git repository. The Lesson Engine provides instructions, execution, tests, verification, and tooling around that project; it does not become the project itself.

---

# 1. The product

The learner builds a spreadsheet application that eventually supports:

- editable cells and ranges
- formulas and recalculation
- dependency tracking and cycle detection
- undo/redo
- copy/paste and fill
- CSV import/export
- workbook persistence
- a MATLAB-like matrix language
- Python execution through Pyodide
- JavaScript execution
- custom functions
- a desktop application
- a server API
- accounts and workbook sharing
- live collaborative editing
- encrypted private workbooks
- offline editing and synchronization

The important constraint is **MVP depth, not feature-count depth**.

The series does not attempt to reproduce Excel, Google Sheets, MATLAB, Python, or a full collaboration platform. Each feature is implemented deeply enough to teach the engineering concepts required to build the next feature.

After the series, the learner should be able to extend the application independently.

---

# 2. Who it is for

The learner knows Python fundamentals:

- variables
- `if`
- loops
- functions
- lists
- dictionaries
- running `python script.py`

That list is everything that is assumed. The learner has never necessarily:

- written a class or used `self`
- written a recursive function
- caught an exception or raised one deliberately
- split a program into several files that import each other
- installed a package
- used a terminal for anything except running a script
- seen a type annotation
- written a test
- read a stack trace carefully
- used Git
- seen C#, JavaScript, HTML or SQL

The series teaches each of these from the beginning, at the moment the project needs it,
with the Python version shown alongside wherever there is one.

It also teaches, when needed:

- terminal and filesystem concepts
- Git
- HTML/CSS/browser fundamentals
- JavaScript
- TypeScript
- npm and package management
- testing
- debugging
- HTTP
- SQL
- C#
- .NET
- MAUI
- ASP.NET Core
- authentication and authorization
- concurrency
- deployment and CI

**C# is not assumed.** The C# sprints teach the language from its first line, comparing it
with the TypeScript and Python the learner knows by then.

Python is the bridge into unfamiliar languages and abstractions. The rule is:

> If it is not in the list above, explain it the first time it appears, fully: what it is,
> what problem it solves, what it looks like in Python (if Python has it), and what goes wrong
> without it. Never use a term before it has been explained.

When in doubt, explain. A learner who already knows something skims a paragraph; a learner
who doesn't is stopped.

---

# 3. The central teaching loop

Every feature follows the same development loop:

1. **User story**
2. **Observable behavior**
3. **Small design decision**
4. **Failing test**
5. **Implementation**
6. **Run the feature**
7. **Inspect the result**
8. **Refactor when the code has a demonstrated problem**
9. **Commit**
10. **Challenge**
11. **Verification**
12. **Demo**

The lesson should never begin with “today we learn X.”

It begins with:

> **“The spreadsheet cannot do X. Let's make it do X.”**

Then the engineering concept appears naturally.

### Example

Instead of:

> Learn TypeScript union types.

Use:

> A formula can produce either a number or an error. Our JavaScript implementation currently has no reliable way to represent those two outcomes. We need a type that makes that distinction explicit.

Then introduce the union type.

This principle applies to every tool and language in the series.

---

# 4. One project, continuously evolving

The project starts almost empty.

It does **not** start with:

```text
src/
engine/
ui/
workers/
server/
desktop/
tests/
...
```

Those boundaries emerge from problems.

Early:

```text
index.html
main.ts
```

Then the code becomes painful.

The learner extracts:

```text
src/
  sheet.ts
  address.ts
  main.ts
```

Later:

```text
src/
  engine/
  ui/
```

Later still:

```text
web/
desktop/
server/
```

The lesson explicitly records **why the boundary appeared**.

This teaches architecture as a response to coupling rather than architecture as folder decoration.

---

# 5. The architectural invariant

One boundary is established early and defended throughout the series:

> **The spreadsheet engine must not depend on the browser UI.**

The engine contains concepts such as:

- addresses
- cells
- formulas
- values
- errors
- ranges
- dependency graphs
- recalculation
- commands
- workbook serialization

The UI knows how to display and edit those concepts.

This distinction becomes a recurring teaching point:

```text
UI
 ↓
application commands
 ↓
spreadsheet engine
 ↓
pure data and algorithms
```

The engine must remain testable without a browser.

Later, React is allowed to replace the UI implementation without rewriting the engine.

---

# 6. Language progression

| Sprint | Technology | Reason it appears |
|---|---|---|
| 0 | Terminal, filesystem, PATH, environment variables, processes | The learner needs to operate the development machine |
| 1 | Git/GitHub | The project needs history before it becomes complicated |
| 2 | HTML/CSS | The spreadsheet needs a visible surface |
| 3 | JavaScript, the DOM, events | The grid has to respond, and browsers only run JavaScript |
| 4 | npm, modules, Vite | One file has become too big, and the first library is needed |
| 5 | TypeScript | A real bug from sprint 3 shows the cost of finding mistakes at runtime |
| 6 | Vitest, the debugger, classes | The engine now has behaviour worth protecting and state worth modelling |
| 7–9 | Recursion, union types, graphs, `Set` | The formula language and recalculation need them |
| 10 | React | Manual DOM synchronization has become the problem |
| 13 | async/await | Files are read and written |
| 15–16 | Web Workers, Pyodide | User programs must not block the UI |
| 17 | C#/.NET, from the first line | The project needs a desktop application and a server |
| 18 | .NET MAUI/XAML | The web application needs a native desktop host |
| 19 | HTTP/ASP.NET Core | Workbooks need to leave the local machine |
| 20 | SQL/SQLite/EF Core | Server state needs durable structured storage |
| 21 | Authentication/security | Multiple users and private data now exist |
| 22 | SignalR/WebSockets | Multiple users must edit the same workbook |
| 25–26 | CI/release tooling | The project is now software that must be shipped |

Each topic is introduced in **one** sprint and reused afterwards. A later sprint that needs
it says that it is coming back, and where it was first taught.

The order is intentionally driven by product pressure.

---

# 7. Every lesson has a contract

Each lesson is generated from the same structure.

## Context

What does the current application do?

## User story

> As a user, I want ...

## Current limitation

What cannot the application do yet?

## Observable target

What will the learner see when finished?

## Concept

The single primary engineering concept being introduced.

## Why now

Why the current product makes this concept necessary.

## Build

The learner types the changes into the project.

No unexplained scaffold.

## Test

A failing test is introduced before implementation when the feature is testable.

## Run

The learner runs the actual application.

## Inspect

The lesson points at the relevant code, output, network request, DOM, compiler error, or test result.

## Challenge

The learner changes or extends the feature independently.

## Verification

The Lesson Engine checks the result, including hidden tests where appropriate.

## Commit

The learner creates a meaningful commit.

## Handoff

Only the durable state needed by the next lesson is recorded.

---

# 8. Definition of done

A feature is not finished merely because the code compiles.

A feature is complete when:

- the user-visible behavior works
- automated tests cover its important behavior
- error behavior is intentional
- the code is formatted
- the learner can explain the abstraction
- the feature survives a reload when persistence applies
- relevant edge cases have been tested
- the learner has made the Git commit
- the lesson verification passes

For infrastructure features, the equivalent observable evidence is used.

---

# 9. Teaching abstractions

Whenever a new abstraction is introduced, the lesson answers four questions:

### What does it hide?

For example:

> `Map<string, Cell>` hides the mechanics of locating a sparse cell.

### What is the raw version?

For example:

> Without `Map`, we could search an array of cells manually.

### What invariant does it protect?

For example:

> A cell address identifies at most one stored cell.

### What would make this abstraction the wrong choice?

For example:

> A dense rectangular matrix may be better when nearly every coordinate contains a value.

This prevents “use a class because classes are good” teaching.

---

# 10. Testing philosophy

Testing begins as soon as there is behavior worth protecting.

The learner repeatedly experiences:

```text
write failing test
       ↓
observe failure
       ↓
write smallest implementation
       ↓
observe pass
       ↓
refactor
       ↓
run all tests
```

Tests are not presented as ceremonial files.

The learner learns:

- what a unit test isolates
- what an integration test proves
- what a browser test would prove
- why hidden tests are useful in an educational environment
- how a bad test can pass for the wrong reason
- how to test error behavior
- how to test persistence
- how to test concurrency
- how to test serialization round trips

The Lesson Engine should distinguish:

**learner tests**

from

**lesson verification tests**

The learner owns the first. The engine owns the second.

---

# 11. Error-driven teaching

Real errors are part of the curriculum.

Lessons deliberately expose representative failures:

- command not found
- incorrect working directory
- Git merge conflict
- JavaScript runtime error
- TypeScript compiler error
- failing assertion
- parser error
- circular dependency
- malformed JSON
- CSV quoting bug
- rejected HTTP request
- CORS error
- SQL constraint failure
- C# compiler error
- failed migration
- authorization failure
- concurrent update conflict

The lesson teaches the learner to extract information from the error rather than immediately giving the fix.

---

# 12. Curriculum

# Phase 1 — From scripts to a working sheet

## Sprint 0 — Become operational

**Demo:** `node hello.js` runs beside `python hello.py`.

Teach:

- terminal
- current directory
- absolute vs relative paths
- files and folders
- executable programs
- PATH
- environment variables
- Node.js
- VS Code terminal
- processes
- exit codes

The learner creates the project folder.

No application code yet.

---

## Sprint 1 — Git from zero

**Demo:** the empty project exists on GitHub with meaningful history.

Teach:

- repository
- working tree
- staging
- commit
- snapshot
- branch
- remote
- push
- pull
- `.gitignore`
- `.git/`
- `status`
- `diff`
- `log`

The first commit should be intentionally small.

Later Git lessons return to this same repository.

---

## Sprint 2 — Put something on the screen

**Demo:** a browser displays a small, static spreadsheet grid that the learner wrote by hand.

Teach:

- what a browser does with a file: open `index.html` straight from disk first
- HTML document structure, elements, attributes, nesting
- a `<table>` as the first grid
- CSS: selectors, the box model, borders, a sticky header row
- DevTools: Elements panel, editing CSS live, then copying the change back into the file

No JavaScript yet. The grid is typed in by hand, which is exactly the pain the next sprint
removes: a 26×100 grid typed by hand is not a plan.

---

## Sprint 3 — JavaScript from Python

**Demo:** the grid is generated by JavaScript, cells can be clicked and typed into, and the
address of the selected cell (`B3`) is shown above the grid.

Teach, always next to the Python the learner already knows:

- the `<script>` tag and the DevTools console: where JavaScript runs and where its errors go
- `let` and `const`, functions, arrays, objects, `for ... of`
- `undefined` vs `null`, `==` vs `===`
- the DOM: `document.createElement`, `querySelector`, `textContent`
- events and callbacks: a function you hand to the browser to call later
- converting a column number to letters and back (`0 → A`, `25 → Z`, `26 → AA`), written
  in plain JavaScript

The address code is where the first real bug lives. Mixed up arguments, a string that should
have been a number, `"1" + 1` giving `"11"`: the learner meets these as runtime surprises.
Sprint 5 comes back to them.

The goal is not "learn JavaScript syntax." The goal is:

> Become able to reason about JavaScript code without mentally treating it as Python.

---

## Sprint 4 — npm, modules, Vite

**Demo:** the same application, now split into several JavaScript files and served by Vite's
development server.

Teach:

- why one big file has become a problem: scrolling, name clashes, no way to test one part
- modules: `import` / `export`, compared with Python's `import`
- why a browser refuses modules opened from `file://`, shown with the real error
- npm, `package.json`, dependency versions, lock files, `node_modules`
- Vite: the development server, hot reload, `npm run build`, what is in `dist/`
- `.gitignore` again: why `node_modules` and `dist` are never committed

Every configuration file is explained line by line when it is created. TypeScript is not
introduced here; the files are still `.js`.

---

## Sprint 5 — TypeScript when JavaScript hurts

**Demo:** the same application compiles with TypeScript, and the bugs from sprint 3 are now
compiler errors instead of surprises in the browser.

It starts from the real bugs the learner already wrote or was shown in sprint 3: a column
passed where a row was expected, a string that should have been a number, a function that
sometimes returns `undefined`. The learner renames one file to `.ts` and reads the compiler's
first error.

Then introduce:

- type annotations and inference
- `tsc` and `tsconfig.json`, line by line
- object types and interfaces
- `undefined` in types, and narrowing with `if`
- `unknown` for input from outside the program

Teach the boundary:

> TypeScript prevents a class of mistakes before runtime; it does not make runtime input trustworthy.

---

## Sprint 6 — First test, first real model

**Demo:** cells can be addressed, edited and read back, and the behaviour is protected by
tests that the learner wrote before the code.

Build:

- `Address`
- `Sheet`

Teach:

- why a test: a change that broke sprint 3's address code without anyone noticing
- Vitest, `expect`, red/green/refactor
- the VS Code debugger: breakpoints, stepping, watching values
- classes from zero: what a class is, `constructor`, `this` (compared with Python's
  `self`), methods, `private`
- encapsulation and invariants: a cell address identifies at most one stored cell
- `Map` versus a Python dictionary, and sparse storage versus a 2-D array

The learner types the first test before the implementation.

---

## Sprint 7 — Formula language

**Demo:**

```text
=A1+B1*2
```

produces a calculated value.

Build:

- tokens and a lexer
- a parser
- an AST
- an evaluator

Teach:

- why splitting the string on `+` stops working (shown with `=A1+B1*2`)
- recursion from zero: a function that calls itself, the call stack, the base case
- recursive data structures: a tree of expressions
- union types: a token is one of several kinds; a formula's result is a number or an error
- recursive-descent parsing and operator precedence
- exceptions: throwing and catching, compared with Python's `raise` and `try`
- syntax errors and evaluation errors as values the sheet can display (`#DIV/0!`, `#NAME?`)

The parser is introduced because the formula language has become too complex to evaluate with string splitting.

---

## Sprint 8 — Dependencies and recalculation

**Demo:** changing A1 recalculates only the cells that depend on it, and the measurement
shows how much less work that is.

Where sprint 7 left things: every edit recalculates all 2,600 cells (`showAll`), a cell
used by several formulas is recalculated once per use, and cycles are already caught (7.6
introduced `Set` and the "in progress" check, which shows `#CYCLE!`). Sprint 8 starts by
**measuring** that cost (counting `cellValue` calls, timing an edit on a sheet of formulas),
then builds:

- dependency graph: which cells each formula reads (from its tree)
- reverse dependencies: which cells read a given cell
- graph traversal: everything downstream of an edit
- topological ordering: recalculate each affected cell once, after everything it reads
- a cache of computed values, so a cell used twice is calculated once
- cycle detection revisited: the graph view of the same circles 7.6 catches
- measuring again, to show the improvement with numbers

Introduce:

```text
A1 → B1 → C1
```

before introducing graph terminology.

Then demonstrate:

```text
A1 → B1
↑     ↓
└─────┘
```

as a cycle.

Teach performance by measuring recalculation rather than merely claiming it is faster.

---

## Sprint 9 — Functions and ranges

**Demo:**

```text
=SUM(A1:A10)
=AVERAGE(B1:B20)
=IF(C1>10, "large", "small")
```

Build:

- range references
- function registry
- functions as values
- variadic arguments
- lazy evaluation
- error propagation

Teach why `IF` cannot eagerly evaluate both branches.

---

# Phase 2 — A real front end

## Sprint 10 — React solves a problem

**Demo:** the sheet uses React for the UI while the engine remains framework-independent.

First demonstrate the pain of manual DOM synchronization.

Then introduce:

- components
- props
- state
- events
- hooks
- rendering
- controlled inputs
- component boundaries

The engine is not moved into React.

---

## Sprint 11 — Large sheets

**Demo:** a very large logical sheet remains responsive.

Teach:

- measuring before optimizing
- browser Performance panel
- rendering cost
- virtualized rendering
- memoization
- event frequency
- avoiding unnecessary work

The lesson must show an actual measurement before optimization.

---

## Sprint 12 — Editing history

**Demo:** undo and redo work.

Build:

- command objects
- command history
- undo
- redo
- copy/paste
- fill
- relative references
- absolute references such as `$A$1`

This is where the **Command pattern** is named and analyzed.

Teach:

- what problem it solves
- what it hides
- trade-offs
- where the same pattern can be reused

Git is revisited:

- bad commit
- revert/reset distinction
- `git bisect`

---

## Sprint 13 — Persistence

**Demo:** close the application, reopen it, and recover the workbook.

Teach:

- JSON
- serialization
- deserialization
- versioned file formats
- migrations
- round-trip testing
- async/await
- file APIs

Then add CSV import/export.

CSV is deliberately implemented correctly enough to handle:

- quoted fields
- commas inside fields
- escaped quotes
- newlines inside quoted fields

---

# Phase 3 — Languages inside the spreadsheet

## Sprint 14 — Build a MATLAB-like language

**Demo:**

```text
A = range("A1:C3")
B = A'
C = B * A
```

writes matrix results into the sheet.

Build a real interpreter:

```text
source
  ↓
lexer
  ↓
parser
  ↓
AST
  ↓
interpreter
  ↓
values
```

Teach:

- matrix representation
- indexing
- `:`
- `end`
- transpose
- matrix multiplication
- element-wise operations
- broadcasting
- function calls
- source locations
- interpreter errors

Compare this with OpenMat's existing transpiler.

OpenMat is used as a reference implementation, not copied into the learner project.

---

## Sprint 15 — Python in the browser

**Demo:** Python/NumPy operates on a selected range and writes the result back.

Build:

- Web Worker
- message protocol
- request IDs
- success/error responses
- Pyodide loading
- NumPy conversion
- timeout/cancellation strategy

Teach the browser event loop and why CPU-heavy user code must not run on the UI thread.

---

## Sprint 16 — Multiple execution environments

**Demo:** JavaScript, Python, and the matrix language can produce spreadsheet results.

Build a common execution boundary.

Teach:

- capability boundaries
- untrusted code
- serialization
- execution isolation
- worker lifecycle
- function registration
- asynchronous results

Be exact about isolation. A Web Worker keeps slow code off the UI thread, but it is **not** a
security sandbox: code in it can still make network requests from the page's origin. The
lesson shows that, then names what real isolation needs (for example a sandboxed iframe on a
separate origin) and decides how far the MVP goes.

A custom function such as:

```text
=TAX(A1)
```

becomes the concrete feature that requires this architecture.

---

# Phase 4 — C# and desktop

## Sprint 17 — C# from zero

No C# is assumed. This sprint is longer than most (about 8–10 lessons), because it
teaches a second language from its first line.

**Demo:** a C# console application reads a workbook and prints a summary.

Teach only what the application needs:

- .NET SDK
- `dotnet` CLI
- project files
- compilation
- C# types
- classes
- records
- properties
- collections
- LINQ
- exceptions
- async/await
- NuGet
- xUnit

Compare each major construct with TypeScript and Python.

The goal is not syntax memorization.

The goal is transfer of programming concepts across languages.

---

## Sprint 18 — Desktop application

**Demo:** the spreadsheet runs as a native desktop application.

Build with .NET MAUI:

- project structure
- XAML
- layouts
- events
- HybridWebView
- JavaScript ↔ C# communication
- local files
- application lifecycle

The learner sees exactly what the native layer adds rather than treating MAUI as another web framework.

---

# Phase 5 — Server

## Sprint 19 — HTTP

**Demo:** the browser saves a workbook through a local server.

Teach HTTP from the wire upward:

- request
- response
- URL
- method
- headers
- body
- JSON
- status codes
- GET/POST/PUT/DELETE
- `curl`
- `.http` files
- browser Network tab

Then introduce ASP.NET Core.

---

## Sprint 20 — Database

**Demo:** workbooks survive server restarts.

Teach:

- relational data
- tables
- rows
- primary keys
- foreign keys
- indexes
- SQL
- SQLite
- EF Core
- migrations
- transactions

The learner writes SQL before EF Core hides it.

---

## Sprint 21 — Accounts and authorization

**Demo:** users can own workbooks and share a read-only workbook.

Teach:

- authentication versus authorization
- password hashing
- salts
- PBKDF2/Argon2
- why SHA-256 is not a password-storage scheme
- cookies versus tokens
- authorization rules
- signed links
- threat modeling

Security decisions are tied to concrete assets and threats.

---

## Sprint 22 — Live collaboration

**Demo:** two browser windows edit the same workbook.

Teach:

- WebSockets
- SignalR
- persistent connections
- operations versus snapshots
- ordering
- acknowledgements
- conflicts
- concurrency testing

The first collaborative version is deliberately simple.

The learner then identifies its failure modes before improving it.

---

## Sprint 23 — Private workbooks

**Demo:** a workbook can be encrypted so the server cannot inspect its plaintext contents.

Teach:

- key derivation
- AES-GCM
- nonces
- authenticated encryption
- Web Crypto
- key management
- metadata leakage
- threat-model limitations

Explicitly teach:

> Cryptography is a protocol and key-management problem, not merely an encryption-function call.

---

## Sprint 24 — Offline synchronization

**Demo:** the desktop application edits while offline and synchronizes after reconnecting.

Teach:

- local state
- operation queues
- synchronization
- retries
- idempotency
- conflict detection
- merge strategies
- eventual consistency

The learner observes a real conflict before implementing its resolution.

---

# Phase 6 — Ship it

## Sprint 25 — Quality gates

**Demo:** every push runs automated checks.

Add:

- ESLint
- Prettier
- TypeScript checking
- Vitest
- C# tests
- integration tests
- build verification
- GitHub Actions

Teach CI as:

> a machine repeatedly performing the checks the developer should not have to remember.

---

## Sprint 26 — Release

**Demo:** a tagged release can be installed and used by someone who did not build it.

Teach:

- semantic versioning
- release notes
- production builds
- configuration
- environment variables
- installer/package creation
- README writing
- troubleshooting instructions

The learner performs a clean-machine installation test.

---

# 13. Recurring engineering concepts

Concepts should recur rather than appear once.

| Concept | First appearance | Later reuse |
|---|---|---|
| Encapsulation | `Cell` / `Sheet` | server services, desktop boundary |
| Interfaces | formula functions | execution engines, persistence |
| Union types | formula results | protocol messages |
| `Map` / `Set` | cell storage | dependency graph, registries |
| Recursion | formula parser | graph traversal |
| Command pattern | undo | collaboration operations |
| Serialization | workbook files | worker/API protocols |
| Async programming | file persistence | HTTP, workers, SignalR |
| Dependency injection | ASP.NET Core | testability and service composition |
| Transactions | database | collaborative updates |
| Idempotency | sync | network retries |
| Versioning | workbook format | APIs and releases |

The lesson should explicitly say when a previously learned concept reappears in a new context.

---

# 14. Git is part of the development story

Git is not a separate “Git course.”

It appears throughout the project.

Required experiences:

- first repository
- small commits
- feature branch
- merge
- conflict
- conflict resolution
- bad commit
- recovery
- `reflog`
- `git bisect`
- pull request to self
- CI failure
- release tag

The learner should finish knowing how to recover from mistakes, not merely how to type `git add`.

---

# 15. Reference implementations

The repository may contain reference material, but the learner does not copy the production implementation.

## Spreadsheet Lab

Reference:

```text
src/labs/spreadsheet-lab/
```

UpSkillOS's own spreadsheet, merged on 2026-10-03. It is not complete, but it is a working,
tested spreadsheet engine, and it is the closest reference this series has. When writing a
sprint, read the matching part first: how it was solved, what its tests cover, and where the
series' simpler version should deliberately differ.

| Sprint | Reference in the lab |
|---|---|
| 6 (addresses) | `engine/address.js`: the same bijective base-26 column names, 0-based internally, A1 shown to the learner |
| 7 (formulas) | `engine/parser.js`, `engine/evaluate.js`, `engine/values.js` (error values) |
| 9 (functions, ranges) | `engine/functions/`, `functions.test.js` |
| 12 (editing, fill, references shifting) | `engine/editing.js`, `engine/fill.js`, `engine/rewrite.js` |
| 13 (persistence, CSV) | `engine/workbook.js`, `engine/csv.js`, `engine/xlsx.js` |
| 15–16 (Python and JavaScript in workers) | `runtime/python.worker.js`, `runtime/code.worker.js`, `runtime/runtime.js` |

Charts, conditional formatting, pivot tables and Excel import/export are in the lab but not
in the series' MVP; they are natural extensions for the learner after the series.

As with OpenMat: the learner builds their own, never copies the lab's code, and a lesson may
compare the two designs when the comparison teaches something.

## OpenMat

Reference:

```text
packages/openmat/src/
```

Use it to examine:

- lexer-like processing
- MATLAB syntax handling
- transpilation
- mathjs integration
- tests
- edge cases

The learner's spreadsheet language deliberately takes a different implementation route:

```text
source
→ lexer
→ parser
→ AST
→ interpreter
```

This creates a concrete comparison between:

**transpilation**

and

**interpretation**.

---

## Pyodide

Reference existing project usage where appropriate.

The lesson can inspect:

```text
src/labs/codelens/codelens/interpreter/pythonExecution.worker.ts
```

to understand:

- worker startup
- message passing
- Pyodide loading
- execution

But the learner builds the spreadsheet worker themselves.

---

# 16. Lesson Engine requirements

The Lesson Engine needs to support the project as an external learner-owned repository.

## The workspace

The series runs in the desktop app's **Project Studio** (`src/labs/project-studio/`), which
already has the three panes it needs for files, with one added:

- a file tree and a multi-file editor (Monaco) working on the learner's real files, which
  refuses to overwrite a file that changed on disk in another editor
- the lesson pane, which shows each step and the difference between the learner's file and
  the step's target
- an output pane
- **a real terminal** (added for this series): the learner's own shell (PowerShell on
  Windows, zsh on macOS) running in the project folder, through node-pty and xterm.js. Not a
  simulated one: the commands the learner types are the real ones, with the real output and
  errors, and they work the same in VS Code's terminal afterwards.

Measured on 2026-10-02: node-pty 1.1.0 ships prebuilt binaries for Windows and macOS, and they
load in the app's Electron (35.7.5) without compiling anything.

## Project selection

The learner selects a folder.

The engine stores the project location.

It must never silently replace or reset learner files.

## Node/TypeScript execution

Support:

```text
npm install
npx vitest run
npx tsc
npm run build
```

The engine parses results so a lesson can verify specific tests.

## Hidden verification

Lesson verification tests are engine-owned. They must:

- live **outside** the learner's folder and be pointed at the learner's code, rather than being
  copied in and removed afterwards (a crash in between would leave them behind, showing in
  `git status`). If a tool can't do that, the fallback is a copy in a folder Git ignores,
  and the engine cleans it up on the next start.
- not modify learner source
- never create commits
- report useful failure information

A hidden test has to import something, so each lesson that uses one states a small **public
interface**: for example, "`src/engine/address.ts` exports `parseAddress(text)`". That is the
one place file shape is fixed on purpose (see Rule 8). Everything behind it is the learner's
choice.

## When the learner's project drifts

Learners will skip a challenge, name something differently, or try an idea of their own.
Lesson 40 must not depend on the exact code of lesson 12. Three things keep them on track:

1. Checks test behaviour through the stated public interface, not file contents.
2. A **reference repository** has one tag per sprint (`sprint-06`, ...). A learner who is
   stuck compares their work with it (`git diff` against the tag, or the side-by-side view in
   the lesson pane) and chooses what to take.
3. The engine never overwrites learner files to "fix" a lesson. A challenge solution is shown
   as a difference for the learner to type in, never applied for them.

## Terminal verification

Support checks such as:

- file exists
- command succeeds
- version is installed
- Git repository exists
- commit exists
- expected branch exists
- working tree state

## Long-running processes

Support starting/stopping:

```text
vite
dotnet run
```

The engine should:

- capture stdout/stderr
- expose the port
- provide a preview
- stop processes when the lesson closes
- detect startup failure

## Git verification

Read-only checks can verify:

- branch
- commit
- clean/dirty state
- merge state
- tag
- presence of expected history

The engine never performs Git operations on behalf of the learner.

---

## Quality bar for every lesson

The same standard as WPF Mastery:

- every output, error message and version number in a lesson is the one the real tool printed
  when the lesson was written, on the real tool, not recalled
- each challenge's checks are run against a set of wrong answers, and each wrong answer must
  fail; a check that passes a wrong answer is fixed before the lesson ships
- each challenge's reference solution passes its checks

## Platforms

- The series is written and verified on Windows first. Terminal commands are given for
  PowerShell and, where they differ, for zsh on macOS.
- MAUI (sprint 18) builds for Windows on Windows and for macOS only on a Mac.
- Stopping a runaway Pyodide script (sprint 15) with its interrupt buffer needs
  cross-origin isolation headers; sprint 18 must check those also work inside MAUI's web view.

---

# 17. External project safety

The Lesson Engine is operating on a real user-owned directory.

Therefore:

- file operations are explicitly scoped to the selected project
- destructive operations require deliberate lesson semantics
- the engine never silently overwrites learner work
- generated verification files are temporary
- processes started by the engine are tracked
- lesson cleanup must not delete learner source
- the current project state must survive closing and reopening the Lesson Engine

This is both a product requirement and an engineering lesson.

---

# 18. Educational progression rules

The lesson generator must obey these rules.

### Rule 1 — One primary concept

A lesson may contain supporting concepts, but one concept is the instructional center.

### Rule 2 — One meaningful feature

A lesson should normally produce one observable change.

### Rule 3 — No unexplained code dumps

The learner types code incrementally.

### Rule 4 — Show the problem first

Whenever practical:

```text
problem
→ failed attempt
→ limitation
→ new concept
→ implementation
```

### Rule 5 — Define before using

A term is introduced before being used as if already known.

### Rule 6 — Preserve runnable states

Every small group of lessons should leave the project in a runnable state.

### Rule 7 — Refactor after pain

Do not introduce architecture merely because it is considered “best practice.”

### Rule 8 — Verify behavior, not file shape

A lesson should prefer:

> “A1 evaluates to 42”

over:

> “Create `src/engine/evaluator.ts`.”

File structure can be checked where architecture itself is the subject, but behavior is the default.

### Rule 9 — Real errors

Where the real tool produces an error, use the real error.

### Rule 10 — No fake difficulty

Do not intentionally break correct learner code merely to manufacture a lesson.

### Rule 11 — Explain the logic, not just the code

Saying what each line does is not enough. A lesson explains **why the code works**: the
reasoning that makes it correct, what would go wrong with an obvious alternative, and how
the learner could have arrived at it themselves. "`index = Math.floor(index / 26) - 1`
divides by 26 and subtracts 1" describes the code; the lesson must explain why subtracting
one is what makes `26` become `AA` rather than `BA`.

### Rule 12 — Analogies come after the code is explained

An analogy is a helper for remembering, never a substitute for explaining. First explain
the code and its logic in its own terms; only then, if it helps, add the analogy. A lesson
that offers an analogy and leaves the code unexplained has failed, however vivid the
analogy is.

### Rule 13 — Small changes, each explained, in this order

Keep the established rhythm of the series: one small change at a time, explained when it
is made, with no large blocks of code handed over to be read later. The order of sprints
and lessons in this plan stands.

---

# 19. Challenges

Every meaningful lesson ends with a challenge.

A challenge should require the learner to transfer the concept.

Examples:

- add `MIN`
- support unary minus
- detect a second cycle
- add a new command
- add a serialization version
- add a new matrix operator
- add cancellation to a worker request
- add an HTTP endpoint
- write a database constraint test

The challenge solution is available after the learner attempts it.

Challenges are verified by tests rather than text matching.

---

# 20. What the learner should be able to do at the end

The learner should be able to look at an unfamiliar software project and reason about:

- where behavior lives
- where state lives
- how data moves
- how errors propagate
- how code is tested
- how dependencies are managed
- how a UI communicates with an engine
- how asynchronous work is represented
- how data crosses process boundaries
- how a server exposes behavior
- how a database persists state
- how authentication differs from authorization
- how concurrent updates create conflicts
- how software is tested and released

More importantly, they should have experienced those problems rather than merely reading about them.

---

# 21. Final architecture

The final project should emerge into approximately:

```text
spreadsheet/
│
├── web/
│   ├── src/
│   │   ├── engine/
│   │   ├── lang/
│   │   ├── workers/
│   │   └── ui/
│   └── ...
│
├── desktop/
│   └── .NET MAUI application
│
├── server/
│   ├── API
│   ├── persistence
│   ├── authentication
│   └── collaboration
│
├── server.tests/
│
└── .github/
    └── workflows/
        └── ci.yml
```

This is a **destination**, not a starting scaffold.

The learner should be able to explain why each major boundary exists.

---

# 22. First implementation milestone

Before writing any lessons, implement only the Lesson Engine capabilities required for the first vertical slice:

1. external project-folder selection
2. safe folder-scoped file access
3. Node/TypeScript command runner
4. Vitest result parsing
5. TypeScript compiler result parsing
6. terminal verification
7. read-only Git verification
8. long-running process management

Then implement:

**Sprint 0 → Sprint 6**

before building the remainder of the series.

That first milestone should prove the educational infrastructure itself:

```text
Learner
  ↓
Lesson Engine
  ↓
their real project folder
  ↓
terminal / npm / tests / Git
  ↓
working spreadsheet
```

If that loop works reliably, the rest of the curriculum becomes incremental content rather than another application that has to be invented all at once.

---

# 23. Owner decisions

The following are deliberate design decisions, not implementation details to be silently changed by an agent:

- The project is learner-owned and external to the lesson repository.
- The learner builds from an empty project.
- React is introduced only after manual DOM synchronization has become a real problem.
- TypeScript is introduced after a concrete JavaScript failure demonstrates its value.
- Tests begin before the engine becomes large.
- The spreadsheet engine remains independent of the UI framework.
- SQL is taught before EF Core hides it.
- HTTP is taught before ASP.NET Core abstracts it.
- The matrix language is a real interpreter, specifically so it can be compared with OpenMat's transpiler.
- Pyodide runs in a Web Worker.
- Collaboration is taught through actual concurrent edits rather than a theoretical networking lesson.
- Security is taught from assets, threats, and trust boundaries.
- Offline synchronization is introduced only after the online version works.
- The final architecture is discovered through the build rather than handed to the learner.
- (2026-10-09) The series is the full-stack bootcamp (`docs/bootcamp-series-plan.md`). The server stays C# / ASP.NET Core. The matrix language and Pyodide stay. The .NET MAUI desktop app (Sprint 18) is an optional elective that nothing later depends on.

---

# 24. The governing principle

The series is not:

> Learn technology A, then technology B, then technology C.

It is:

> **Build something real. Encounter a problem. Learn the smallest concept that solves it. Build the solution. Test it. Use it. Encounter the next problem.**

The spreadsheet is the continuous project.

The technologies are the tools required to keep that project growing.

The learner finishes not with a collection of disconnected tutorials, but with one substantial codebase, a professional development workflow, and the experience required to continue building it without the curriculum.
