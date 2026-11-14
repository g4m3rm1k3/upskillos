# Curriculum: Computer Science and Software Engineering for the Age of AI

> Working copy (2026-11-14) of `src/docs/clojure/sql stuff/CAD-CAM/software_engineering_ai_directed_curriculum_final.md`. It adds the projects each module builds (the **Builds** line in every module) and applies the findings of [the audit](agent-architecture-course-audit.md). Section 5 lists what changed.

**Goal:** understand computing from the bottom up, well enough to design complex systems and _steer_ whoever builds them, teammates or AI agents: choose the architecture, state it precisely, verify the result, and keep the codebase healthy. These are engineering skills, not agent techniques. You are not learning to out-type anyone. You are learning to understand the machine, the mechanisms, and the trade-offs well enough that every implementation decision is yours to judge.

**This file is a learning specification and a reference map.** It is deliberately broad, but no curriculum can contain every subfield or future development. Its purpose is to give you a strong general foundation, show how the disciplines connect, and identify where to go deeper when a system demands it. You do not have to study every module at the same depth or complete the entire map before building serious software.

**Who it is for.** You are already comfortable in at least one programming language, usually a scripting language: variables, data types, conditionals, loops, functions, lists and dictionaries. The course assumes these basics and does not assume which language you learned them in. It teaches what is underneath them and what is built on top of them.

---

## 1. How the curriculum is built

### Three tracks, one ordered list

Every module is tagged with its track:

| Tag   | Track                   | What it teaches                                                                                |
| ----- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `CS`  | Computer science        | How computation works: logic, representation, machines, languages, algorithms, systems, theory |
| `SE`  | Software engineering    | How computation is organized into reliable, maintainable systems                               |
| `AI`  | Directing and reviewing | How to direct, review and verify work done by others, human or AI, while keeping engineering control |
| `DOM` | Domain and architecture | How a real-world domain becomes a software model and an architecture                           |

The tracks are **interleaved**, not sequential. You do not finish computer science before learning Git. Each stage pairs control skills (which pay off in your agent work immediately) with foundations (which deepen every decision you make). The tracks meet repeatedly: testing connects algorithmic correctness to engineering verification; types connect data representation to interface contracts; state machines connect logic, domain modeling, concurrency, and testing.

### Ordering principle

Modules are ordered by **when they become useful**, given three constraints:

1. **Real prerequisites.** A module never appears before something it truly depends on. The `Needs` line lists only real dependencies; many modules are independent and can be taken in any order within their stage.
2. **Immediate leverage.** Control skills (version control, verification, boundaries, specification, agent workflow) appear early, because they improve your agent work from day one.
3. **Foundations before structures that rest on them.** Logic before conditionals-at-scale, representation before data structures, execution before concurrency.

### How to use the curriculum without turning it into a checklist

- Treat the stage order as the default route, not a rigid gate. Follow real prerequisites, but revisit earlier modules whenever a later concept exposes a gap.
- Use each module's **Target** as the first stopping point. Do not pursue `E` everywhere just because it is listed; deepen a topic when your work makes it important.
- Stages 1–9 form the broad computer-science and software-engineering spine. Stage 10 is selected according to the kinds of systems you want to understand and build. A specialization is not less important; its importance depends on the problem.
- Projects grow as concepts are taught. Each module's **Builds** line names the project pieces it adds. Several projects grow side by side; there is no final project (section 4).
- Keep building real software while learning. The curriculum is meant to improve your judgment during real work, not postpone that work until the map is complete.
- For any important design, practice the full reasoning chain: **domain → model → constraints and invariants → responsibilities and boundaries → implementation → verification**.

### Depth tiers (how deep you choose to go)

Each module can be studied at four mastery levels. The **Target** is the first level of demonstrated understanding needed to move on ("well enough"); the learner goes deeper wherever they choose. Detailed outcomes and checks for each level are written as each module is authored (section 5).

| Level | Name       | You can...                                                                               |
| ----- | ---------- | ---------------------------------------------------------------------------------------- |
| U     | Understand | Explain the concept accurately with correct terminology                                  |
| R     | Reason     | Predict behavior, work examples, explain _why_ something happens                         |
| A     | Apply      | Use it independently in a new situation                                                  |
| E     | Evaluate   | Compare designs and implementations, identify trade-offs and mistakes, defend a decision |

Each module lists a **Target**: the level to reach first. Targets are a starting point, not a ceiling. When a system you're building makes a topic critical (for example, real-time networking for a multiplayer game, or numerical precision for a geometry engine), raise that module's target.

### Teaching method (applies to every module)

Seven stages per concept (the [Lesson Quality Standard](lesson-quality-standard.md) makes them operational):

0. **Start from a problem**: a puzzle, failure, or observation that the learner's current model cannot explain, so the concept has a reason to exist.
1. **Expose** the mechanism in isolation, with no framework and no application.
2. **Make it observable**: the smallest runnable or manually traceable example; change an input, watch what happens.
3. **Vary** one property at a time: edge cases, alternatives, limits, failure.
4. **Connect** to modules already understood.
5. **Deconstruct**: take something complicated and strip it down to its mechanisms, adding one at a time (a number, then a function, then many items, then a system that updates them, then two processes, then two machines). Understand what each step adds and why.
6. **Recognize** it in real software (operating systems, databases, compilers, frameworks, production codebases).

Three kinds of assessment per module:

- **Construct:** produce a solution from the concepts.
- **Deconstruct:** explain how an unfamiliar implementation works.
- **Evaluate:** find problems and compare alternative designs, including an AI-style snippet or diff with a planted flaw ("spot the flaw").

Spot-the-flaw is never the only measure; recognizing familiar mistakes is not the same as being able to design a sound solution.

### Standing rules

- **Underneath rule:** every abstraction gets a "what's underneath" note: how it is represented, what it costs, what it compiles or lowers to.
- **No unexplained code.** Every name, operation, and dependency has a reason, and execution can be traced.
- **Full names, expanded code.** Dense code is expanded until the logic is visible.
- **Failure modes are taught with every concept.** Knowing how something fails is half of judgment.
- **Trust boundaries are explicit.** Identify what is trusted, what is untrusted, what an agent or program is allowed to change, and what requires independent verification.
- **Teach alternatives.** Never one solution; always "what else, and why not."
- **Math appears where it belongs**, inside the module that needs it.
- **Language per concept.** A concept lesson uses the language that exposes its concept best, and says why in one line: C for memory and layout, Rust for ownership and sum types, Go for small interfaces and channels, SQL for the relational model, TypeScript for gradual types, assembly for execution, Python for scripting and quick experiments. A project lesson uses that project's language. Seeing one idea in two languages separates the idea from the syntax.
- **Language idioms at the point of use.** There are no separate runway lessons. When a lesson first uses a language feature, tool or setup step the learner hasn't met, it explains it right there, and only as much as that step needs. Syntax is not computer science: the explanation teaches how to write it, and the modules teach the ideas underneath (section 4 lists what each language's first lessons must explain).
- **Smallest increment.** A project grows only when the current module teaches a concept that justifies its next piece. A **Builds** line is the smallest meaningful increment: no speculative features, infrastructure or abstractions. Ten projects never mean ten applications being developed at once.
- **Vocabulary is part of every module:** 10 to 20 precise terms per module, each taught in the lesson where it is first needed, not appended as a list at the end.

### Cross-cutting threads (run through everything)

| Thread                                 | What it means                                                                                                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invariants**                         | Every module asks: what must always be true here, and where is it enforced (types, constraints, tests, runtime checks)? Invariants appear from 1.4 onward, not only in specification modules |
| **Domain-to-architecture translation** | Real domain, then conceptual model, then software model, then architecture, then implementation and verification                                                                             |
| **Failure modes**                      | How it breaks, in code, in data, in agents                                                                                                                                                   |
| **Trade-offs**                         | Nothing is free; every choice has a cost                                                                                                                                                     |
| **What's underneath**                  | The layer below, always                                                                                                                                                                      |
| **Trust boundaries**                   | Who or what can supply data, execute actions, change state, or cross a security boundary                                                                                                     |

---

## 2. Why architecture documents often don't save you from "200k lines of mud"

Common causes, which specific modules below address. (These are typical patterns, not a diagnosis of any one codebase.) They are described in terms of AI agents because that is where the problem is sharpest today, but each one applies equally to a team of people.

1. **Documents are advice; constraints are enforcement.** An agent treats a document as one input and drifts. Rules that _execute_ (tests, import-boundary checks, linters, CI gates, size budgets) hold. -> 3.6, 8.9, 8.11
2. **Agents optimize locally; mud is a global property.** Every diff looks reasonable; the whole becomes tangled. -> 3.2, 3.5, 3.9
3. **Agents add; they rarely delete.** -> 3.8, 3.9, 3.10
4. **Review at the wrong granularity.** Outputs instead of diffs, or 5,000-line diffs rubber-stamped. -> 1.8, 1.12
5. **Context loss between sessions.** Conventions must live _in the repo_: examples, scaffolds, instruction files, tests. -> 3.11, 3.12
6. **Specifications with gaps.** The agent fills each gap with a plausible assumption you never saw. -> 2.5, 2.6
7. **The wrong container for the problem.** Spreadsheet as database, custom app where a query would do, JSON blobs for relational data. -> 2.1, 2.2, 7.7

### Symptom -> module index

| Symptom                                        | Start with          |
| ---------------------------------------------- | ------------------- |
| Data lives in a spreadsheet and keeps breaking | 2.1, 2.2, 7.7       |
| "It works, but I can't tell if it's right"     | 1.9, 8.6            |
| Changes break things that worked               | 1.8, 1.9, 8.6, 8.9  |
| 2,000-line files, logic everywhere             | 3.2, 3.8, 3.10      |
| Same logic copy-pasted in many places          | 3.2, 3.8            |
| Agent invents APIs, packages, or columns       | 1.7, 1.11, 3.7, 8.4 |
| Works on my machine, not yours                 | 1.6, 8.4, 9.1       |
| Slow with real data                            | 4.4, 4.11, 7.8      |
| Wrong result only sometimes                    | 7.1, 7.2, 1.10      |
| Wrong state transitions                        | 2.7, 8.7            |
| Geometry or numbers slightly wrong             | 5.2, 10.1, 10.5     |
| Security worries / secrets in code             | 8.1, 8.3, 8.4       |
| Agent does more than I asked                   | 2.5, 1.12, 3.7      |
| Unsure what to build with                      | 2.1, 9.5, 9.8       |
| Can't explain trade-offs to others             | 9.8, 9.9            |

---

## 3. Stage map

| Stage | Theme                                             | Modules               |
| ----- | ------------------------------------------------- | --------------------- |
| 1     | Ignition: first principles and first controls     | 1.1 to 1.12           |
| 2     | Deciding, specifying, and modeling                | 2.1 to 2.11           |
| 3     | Structure, anti-mud, and agent discipline         | 3.1 to 3.14           |
| 4     | Data structures, algorithms, and cost             | 4.1 to 4.12           |
| 5     | The machine underneath                            | 5.1 to 5.10           |
| 6     | Languages, types, compilation, theory             | 6.1 to 6.12           |
| 7     | Concurrency, networks, persistence, distribution  | 7.1 to 7.13           |
| 8     | Security, correctness, and quality at scale       | 8.1 to 8.11           |
| 9     | Operations and large-scale architecture           | 9.1 to 9.10           |
| 10    | Numerics, geometry, graphics, and specializations | 10.1 to 10.16         |
| 11    | Where the labs went                               | crosswalk to projects |

Each module block reads:
**`ID. Title`** `track` · Target · Needs, then **Covers**, **Why**, and **Builds** (the project pieces the module adds).

## 4. Projects

Projects grow across the series. A project gets a new piece when a module teaches the concept that piece needs, so the code arrives just after the idea. There is no final project. A big system is many small projects joined together, and several of these projects use packages from the others. Where to cut a system into packages, and how a package is reused across project boundaries, is one of the course's main lessons.

| Project       | Language                               | What it is                                                                                                                                                                    | Starts | What it teaches                                                                                       |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| **Kit**       | Python                                 | Command-line text and file tools (count, filter, convert, query, compress, snapshot, health) that pipe together                                                               | 1.1    | Scripting, small composable programs, a package other projects import                                 |
| **Blockfall** | JavaScript, later TypeScript           | A falling-block puzzle game in the browser, later with a computer player and online two-player mode                                                                           | 1.2    | State, game loops, state machines, logic kept apart from rendering                                    |
| **Ledger**    | Python, tkinter, SQLite                | A desktop budgeting app                                                                                                                                                       | 2.1    | Domain modeling, money and time, a GUI kept apart from the domain, swappable storage                  |
| **Framework** | C#, HTML, CSS, JavaScript              | A full-stack web framework: request pipeline, routing, dependency injection, templates, data access, jobs, authentication; server templates and a React client both supported | 3.1    | Packages with compiler-enforced boundaries, extension points, a framework that calls your code        |
| **Board**     | C# on Framework; templates, then React | An issue-tracking board for several users                                                                                                                                     | 3.2    | The app that drives Framework. A piece moves into Framework only when Board or a second user needs it |
| **Machine**   | C, with an assembler in Python         | A tiny CPU, assembler and bytecode virtual machine, later with scheduling, paging and garbage collection                                                                      | 5.1    | What actually runs: bits, memory, instructions                                                        |
| **Toylang**   | Rust                                   | A small programming language: lexer, parser, type checker, interpreter, then a compiler to Machine's bytecode                                                                 | 6.1    | Languages, sum types, compilers; two projects joined through a file format                            |
| **Store**     | Go                                     | A networked key-value store: log, index, compaction, write-ahead log, replication                                                                                             | 7.2    | Persistence, concurrency with goroutines and channels, distribution                                   |
| **Netkit**    | Python                                 | Network tools: DNS lookup, reachability checks, TCP chat, an HTTP client from sockets, an uptime monitor, a load generator                                                    | 7.4    | Protocols from the bytes up; a client that tests Framework's server across languages                  |
| **Renderer**  | C++                                    | A software renderer: vector maths, transforms, rasterizer, then a ray tracer                                                                                                  | 10.2   | Numerics, geometry, graphics (a specialization)                                                       |

### Language idioms, explained at first use

There are no runway lessons. Learners already program in some language, so a lesson never re-teaches values, loops or functions. When a project first uses a language, its lessons explain each new idiom, tool and setup step at the point where it is first used. This table is the planning list of what those first lessons must cover; a learner who already knows the language skims those explanations.

| First used in | Language | Familiar ideas, new syntax | New to this language |
|---|---|---|---|
| 1.1 | Python | Values, control flow, functions, lists, dictionaries | Virtual environments, modules and packages, standard input and output, `pytest` |
| 1.2 | HTML and JavaScript | The same, in JavaScript | A page with a canvas, the event loop, key events, `requestAnimationFrame` |
| 3.1 | C# | The same, in C# | Static types, classes and interfaces, a solution of projects, project references, `internal`, a test project |
| 5.1 | C | The same, in C | Fixed-size types, pointers, arrays without bounds checks, structs, headers, compiling and linking, a makefile |
| 6.1 | Rust | The same, in Rust | Ownership and borrowing (first look), enums with data, `match`, `Result`, cargo |
| 7.2 | Go | The same, in Go | Interfaces satisfied implicitly, errors as values, slices, goroutines and channels (first look), Go modules |
| 7.6 | HTML and CSS | Document structure, forms | The box model, layout, how the browser turns pages into the DOM. Deeper material links to the app's web and CSS courses |
| 9.5 | React | Functions and objects in JavaScript | Components, props, state, effects, fetching from a JSON API |
| 10.2 | C++ | C from 5.1, classes from C# | References, value semantics, constructors and destructors, standard library containers, CMake |

### Projects by stage

| Stage | Starts           | Grows                                                       |
| ----- | ---------------- | ----------------------------------------------------------- |
| 1     | Kit, Blockfall   |                                                             |
| 2     | Ledger           | Kit, Blockfall                                              |
| 3     | Framework, Board | Kit, Blockfall, Ledger                                      |
| 4     |                  | Kit, Blockfall, Ledger, Framework                           |
| 5     | Machine          | Kit, Ledger, Framework                                      |
| 6     | Toylang          | Kit, Blockfall, Ledger, Framework, Machine                  |
| 7     | Store, Netkit    | Kit, Blockfall, Ledger, Framework, Board                    |
| 8     |                  | All projects                                                |
| 9     |                  | Blockfall, Ledger, Framework, Board, Machine, Store, Netkit |
| 10    | Renderer         | Kit, Blockfall, Ledger, Framework, Board                    |

### Where projects meet

| Connection                                                               | Module              | What it teaches                                                     |
| ------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------- |
| Kit's `archcheck`, `deps`, `lint` and `health` run on the other projects | 3.6, 4.7, 6.6, 8.11 | Tools are projects too; architecture rules that execute             |
| Ledger and Netkit import Kit as a versioned package                      | 8.4                 | Reuse across project boundaries, versioning                         |
| Machine's assembler (Python) and VM (C) share a binary format            | 5.3                 | A file format as a boundary between languages                       |
| Toylang compiles to Machine's bytecode                                   | 6.7                 | The same, between two projects                                      |
| Netkit's HTTP client tests Framework's server                            | 7.5                 | A protocol as a contract between languages                          |
| Framework caches through Store over the network                          | 7.9                 | An adapter to another project's protocol                            |
| Blockfall's online mode runs on Framework                                | 7.10                | Framework's second user, which tests whether its pieces are general |
| Board consumes Framework as a NuGet package, not source                  | 8.9                 | A package boundary the build enforces                               |
| Board is served by both templates and React                              | 7.6, 9.5            | A view layer with two very different users                          |
| Netkit monitors and load-tests Board                                     | 7.13, 9.4           | Operating one project with another                                  |

## 5. Changes from the audit

1. **Projects replace the labs.** Every module has a **Builds** line. The labs are pieces of projects now (stage 11 shows where each went).
2. **Two new modules:** 3.13 Designing for change, and 3.14 Skeleton first.
3. **Language per concept** replaces "Python is the primary language".
4. **Depth tiers:** U / R / A / E are tiers a learner chooses; the Target is "well enough" to move on.
5. **Generic wording:** CAD/CAM examples and personal references removed. Domain-specific labs (G-code controller, material removal) are dropped; the app's G-code and CNC courses cover them.
6. **Not agent-specific:** the title, goal, section 2, 1.12, 3.7, 3.11, 3.12, 8.11 and the closing principle are reframed so they apply to any collaborator, human or AI. 1.11 stays as a concept lesson on how language models work. Tool-specific agent controls are out of scope.
7. **Ordering:** types that rule out invalid states (6.3) and executable architecture (3.6) are needed early. 3.14 teaches them "well enough" in stage 3; the full modules stay in place.
8. **Idioms at the point of use and smallest increments** are standing rules. HTML and CSS are explained in the lessons before 7.6 that first need them: a dependency, not a later enhancement.
9. **Still to do, in order:**
   1. **Module-to-lesson map.** Divide every module's full **Covers** scope into lessons, with nothing missing and nothing added. A lesson belongs to a module and never claims to complete it alone. For example, 1.4 might be four lessons: names and identity; state and copying; invariants and value objects; reading unfamiliar code.
   2. **Lesson specification.** The [Lesson Quality Standard](lesson-quality-standard.md) governs how every lesson is written, reviewed and released. `docs/project-studio-lesson-standard.md` governs platform mechanics.
   3. **Per-module work.** Write each module's mastery-level outcomes and checks, and decide which existing app courses serve as deeper material.

---

# STAGE 1: IGNITION (first principles and first controls)

### 1.1 Computation, information, and programs

`CS` · Target: R · Needs: none  
**Covers:** information vs representation vs meaning; data vs instructions; inputs, outputs, transformations; deterministic vs nondeterministic; algorithm vs program vs process; state; the levels of a solution (problem, algorithm, code, machine); what "correct" means; three models of a program (a function, a state machine, a process).  
**Why:** everything else hangs on this. Separating the problem from the code is how you judge what an agent built.  
**Builds:** **Kit** starts with `count`: read text from standard input, print line, word and character counts. A program as a function from input to output. Concept lesson in Python.

### 1.2 Logic and Boolean algebra

`CS` · Target: A · Needs: 1.1  
**Covers:** propositions; AND, OR, NOT, XOR, implication, equivalence; truth tables; De Morgan's laws; logical equivalences; normal forms (CNF, DNF); simplification; predicates and quantifiers (introduction); short-circuit evaluation; truthiness pitfalls in Python; flattening nested conditionals; the set/logic correspondence; SAT (introduction).  
**Why:** complicated software often hides simple logic under tangled conditions. Agents commonly invert conditions, leave unreachable branches, and miss cases.  
**Builds:** **Blockfall** starts: a page with a canvas and a board. The move check "every cell of the piece is inside the board AND empty" is written as one predicate, then simplified with De Morgan's laws. **Kit:** `filter`, which keeps lines matching an AND / OR / NOT query.

### 1.3 Number systems and integer representation

`CS` · Target: A · Needs: 1.1  
**Covers:** positional notation; binary, octal, hexadecimal; conversion; bitwise operations (and, or, xor, not, shifts, masks); unsigned vs two's complement; overflow and wraparound; fixed-width vs arbitrary-precision integers (Python `int`); flags and bitfields; parity; bytes as the unit; endianness (introduction).  
**Why:** the foundation of representation. Masks, flags, and overflow appear in protocols, file formats, and permissions.  
**Builds:** **Kit:** `hexdump`, which prints any file's bytes in hex. **Blockfall:** each board row is stored as a bitmask, so "row is full" is one comparison. Concept lesson in C, or Python with explicit masking, because Python integers never overflow.

### 1.4 State, identity, and execution (reading and tracing code)

`CS` `SE` · Target: R · Needs: 1.1  
**Covers:** names vs objects; values vs references; aliasing; mutable vs immutable; in-place change vs rebinding; side effects vs pure functions; shallow vs deep copy; where state lives (global, closure, object); invariants and encapsulation; value objects vs entities; reading unfamiliar code (entry points, following data); expanding dense code until the logic is visible.  
**Why:** you cannot evaluate what you cannot read. Hidden shared state and mutation of inputs are the most common sources of agent bugs.  
**Builds:** **Blockfall:** the game-state object, with a planted aliasing bug (copying the board copies only the outer array) and its fix. Concept lesson in Python and JavaScript, which share the name-versus-object model.

### 1.5 Functions, scope, and the call stack

`CS` · Target: R · Needs: 1.4  
**Covers:** parameters vs arguments; return values; scope and lifetime; closures; call-stack frames; recursion and stack overflow; evaluation order; exceptions unwinding the stack; default-argument traps; first-class and higher-order functions; tracing with a debugger.  
**Why:** the execution model underneath all code. Needed for debugging, recursion, concurrency, and compilers.  
**Builds:** **Blockfall:** the game loop, input handlers as closures, and a debugger session tracing one frame. **Kit:** `tree`, a recursive directory walker that hits the recursion limit on a deep folder.

### 1.6 The shell, files, and tooling literacy

`SE` · Target: A · Needs: none  
**Covers:** terminal and shell navigation; paths (absolute and relative); permissions basics; stdin, stdout, stderr; pipes and redirects; environment variables; processes (`ps`, `kill`); `grep`, `find`, `sed`, `awk`-level text tools; practical regular expressions; editors, IDEs, language servers, linters, formatters; package manager basics; running tests from the command line; reading `--help` and man pages; SSH basics; shell scripting basics; backups before risky operations; least-privilege habits; isolated development environments; recognizing destructive commands and untrusted install scripts.  
**Why:** agents run commands on your machine. You must be able to read what they run and know what could be destroyed (`rm -rf`, `chmod -R`, `curl | sh`).  
**Builds:** **Kit:** packaged as a command-line package in a virtual environment. Each tool reads standard input, writes standard output, returns an exit code, and pipes into the others (`filter … | count`). **Blockfall:** run from a local development server.

### 1.7 Reading technical sources

`SE` · Target: A · Needs: none  
**Covers:** official documentation structure (guides vs references); changelogs and release notes; RFCs and standards; specifications; source code as documentation; issue trackers; reading research papers (abstract, method, evaluation); judging source reliability; matching documentation to the installed version; verifying an agent's claim against a primary source.  
**Why:** agents hallucinate APIs and use outdated versions. The remedy is checking primary sources, a habit you build here.  
**Builds:** **Kit:** `csv`, written from the CSV standard (RFC 4180) rather than from memory, with every quirk checked against the source. **Blockfall:** canvas and keyboard behaviour checked against the reference documentation.

### 1.8 Version control, diffs, and review

`SE` · Target: A · Needs: 1.6  
**Covers:** the commit graph (a DAG); objects (blob, tree, commit); refs, HEAD, branches as pointers; merge vs rebase; conflicts; revert vs reset vs restore; stash; tags; `.gitignore`; remotes; pull requests; **reading a diff**; review checklist (deleted or weakened tests, changed signatures, new dependencies, generated or large files, secrets, unrelated changes, TODOs and stubs); `bisect`; `blame`; worktrees; hooks; commit hygiene; removing committed secrets.  
**Why:** it is the undo button and audit trail for all agent work. Every other control depends on it.  
**Builds:** Both projects are under version control from here on, one piece per commit. Review a provided Blockfall diff that quietly weakens a test.

### 1.9 Verification I: assertions, tests, oracles

`SE` · Target: A · Needs: 1.4, 1.5  
**Covers:** what a test is; assertions; the oracle problem (how do you know the right answer?); unit, integration, end-to-end (preview); regression tests; boundaries and edge cases; red-green-refactor; reproduction scripts; evidence vs claims; determinism and isolation; fixtures; judging a test (would it fail if the code were wrong?); tautological tests; over-mocking.  
**Why:** you can't read 200,000 lines. Tests turn trust into measurement. Agents write tests that merely confirm their own code.  
**Builds:** **Blockfall:** rotation and line clearing move into pure functions so they can be tested without a screen. This is the first boundary. **Kit:** tests for `count` and `filter`, with fixture files.

### 1.10 Errors, debugging, and reading failures

`SE` · Target: A · Needs: 1.5, 1.9  
**Covers:** exceptions and tracebacks; error taxonomy (syntax, runtime, logic, environment); reproduction and minimal reproduction; scientific debugging (hypothesis, experiment); bisecting; print vs logger vs debugger; breakpoints and watches; post-mortem debugging; fail-fast vs fail-silent; where to catch an error; retry vs crash; human-readable errors; non-reproducible bugs.  
**Why:** most agent time is "it broke." Reading a failure beats pasting it and hoping. Agents tend to swallow exceptions and mask failures.  
**Builds:** **Blockfall:** a provided bug (a fast drop passes through the floor) is found by reproduction and hypothesis. **Kit:** clear errors and exit codes for missing files and bad input, instead of tracebacks.

### 1.11 How LLMs and coding agents work, and how they fail

`AI` · Target: R · Needs: 1.1  
**Covers:** tokens and tokenization; the context window; attention (high-level); next-token prediction and sampling (temperature); training vs inference; knowledge cutoffs; why hallucination happens; limits of instruction following; degradation over long contexts; tool use and function calling; agent loops; retrieval; prompt caching (concept); system vs user prompts; non-determinism; prompt injection; cost and latency trade-offs; model tiers; no persistent memory unless provided.  
**Why:** a driver should understand the engine. Most "agent failures" follow from these mechanics.  
**Builds:** No project piece. Concept lesson: how language models read code and prose, and why the nearest example in the code outweighs a rule in a document.

### 1.12 Working in small verified steps: tasks, plans, checkpoints, review

`AI` · Target: A · Needs: 1.8, 1.9, 1.11  
**Covers:** task decomposition into small vertical slices; plan before edit; asking for options and choosing; read-only exploration first; one task per diff; checkpoint commits; acceptance criteria in the request; test-first loop; review loop; demanding evidence; handling confident "done" claims; least privilege; approval for destructive or irreversible actions; protecting secrets and production data; verifying changes before deployment.  
**Why:** the same collaborator, human or AI, does far better or worse work depending on direction. This is the basic driving technique.  
**Builds:** **Blockfall:** a hold-piece feature delivered as one small vertical slice: acceptance criteria first, then a plan, checkpoint commits, and review.

---

# STAGE 2: DECIDING, SPECIFYING, AND MODELING

### 2.1 The option space of software

`SE` · Target: E · Needs: none  
**Covers:** kinds of solution (spreadsheet, form plus spreadsheet, no-code/low-code, automation platforms, off-the-shelf SaaS, script, command-line tool, library, notebook, BI dashboard, server-rendered or single-page web app, API/service, desktop app, mobile app, browser extension, bot, plugin, batch job, queue worker); kinds of effort (configure, buy, glue, build); users, data volume, rate of change, lifespan, who maintains it, compliance, cost of failure; build vs buy vs configure; prototype vs product; "boring technology"; the cost of software is mostly maintenance.  
**Why:** the costliest mistakes happen before code. Agents rarely ask whether the thing should exist as code at all.  
**Builds:** **Ledger** starts. Compare a spreadsheet, a script, a web app and a desktop app for a household budget, and record the decision.

### 2.2 Data I: storage options and shapes

`SE` · Target: E · Needs: none  
**Covers:** spreadsheet, CSV, JSON/YAML files, SQLite, relational servers, document, key-value, object storage, search index, warehouse, time-series, graph, vector, in-memory; when a spreadsheet stops being enough (multiple writers, relationships, enforced rules, history, one source of truth, automation); entities, attributes, relationships (1:1, 1:N, M:N); keys (primary, foreign, natural, surrogate); NULL; constraints; normalization vs denormalization; source of truth vs derived data; access patterns; concurrent writers; data lifecycle; backups.  
**Why:** data outlives code, and a bad foundation poisons everything built on it.  
**Builds:** **Ledger:** its first data model (accounts, transactions, categories) is kept in CSV files on purpose, so their limits show: relationships and a single source of truth. It moves to SQLite in 7.7. **Blockfall:** high scores saved as JSON in browser storage.

### 2.3 Sets, relations, and functions

`CS` · Target: R · Needs: 1.2  
**Covers:** sets and set operations; membership; cardinality; algebra of sets; Cartesian products; relations and their properties (reflexive, symmetric, transitive); equivalence relations and partitions; partial and total orders; functions (injective, surjective, bijective); composition and inverse; mappings as dictionaries; multisets; relations as tables; functional dependencies (introduction).  
**Why:** sets explain uniqueness and membership; relations explain data; functions explain transformation; orders explain sorting.  
**Builds:** **Kit:** `uniq`, `diff` and `join` over CSV files: set operations and a relational join by key. Concept lesson in Python.

### 2.4 Data II: schemas, formats, serialization, validation

`SE` · Target: A · Needs: 2.2  
**Covers:** JSON, YAML, TOML, CSV, XML, Protocol Buffers, Avro, Parquet, MessagePack; text vs binary formats; schema languages (JSON Schema, OpenAPI, Protobuf); validation at the boundary; "parse, don't validate"; forward and backward compatibility; nullability; enums vs strings; units; identifier design; serialization pitfalls (pickle security, float round-trips); canonical forms; data contracts.  
**Why:** boundaries are where data goes wrong. Agents pass loose dictionaries everywhere and break formats silently.  
**Builds:** **Kit:** `convert` between CSV, JSON and TOML, validating at the boundary ("parse, don't validate"). **Ledger:** a bank-statement import that rejects bad rows and gives reasons. **Blockfall:** saved games carry a format version.

### 2.5 Requirements, constraints, and non-goals

`SE` · Target: E · Needs: 2.1, 2.2  
**Covers:** requirements vs implementation; functional vs non-functional (performance, security, reliability, usability, maintainability, cost); constraints (technical, budget, time, legacy, skills); assumptions (written down); **non-goals**; acceptance criteria (given/when/then); edge cases; domain vocabulary; examples as specification; definition of done; pre-mortem; the two audiences of a spec (humans and agents).  
**Why:** the agent fills every gap with a plausible assumption. A good spec leaves fewer gaps.  
**Builds:** **Ledger:** a written specification with non-goals and given/when/then acceptance criteria, before any Ledger code. **Blockfall:** the scoring rules written as examples first.

### 2.6 Invariants and contracts

`CS` `SE` · Target: E · Needs: 1.2, 1.4  
**Covers:** kinds of invariant (data, class, loop, system); preconditions and postconditions; design by contract; assertion vs validation; where an invariant is enforced (types, database constraints, tests, runtime checks); finding the invariants of a domain; state invariants; stating invariants to an agent; turning invariants into tests.  
**Why:** invariants are the most precise way to tell an agent what must never break. An account balance must always equal the sum of its transactions; that is a property, not a detail.  
**Builds:** **Ledger:** "a balance equals the sum of its transactions" and "money is never a float", enforced by types and tests. **Blockfall:** "the falling piece never overlaps settled blocks", checked by an assertion after every move.

### 2.7 State machines and state-transition systems

`CS` `DOM` · Target: E · Needs: 1.2, 2.3  
**Covers:** states, transitions, events, guards, actions; initial and terminal states; transition tables; Mealy and Moore machines; hierarchical machines and statecharts; state explosion; making illegal states unrepresentable; implementation (enum plus table vs State pattern); exhaustive testing; examples (network connection, authentication, file upload, database transaction, order lifecycle, game states); protocols as state machines.  
**Why:** agents often implement individual conditions without modeling the overall machine, producing illegal transitions.  
**Builds:** **Blockfall:** game states (menu, playing, paused, clearing lines, game over) as a transition table with guards. **Ledger:** the transaction lifecycle (pending, cleared, reconciled).

### 2.8 Domain modeling

`DOM` · Target: E · Needs: 2.2, 2.6  
**Covers:** entities, value objects, aggregates; relationships and cardinality; lifecycles; domain events; ubiquitous language; rich vs anemic models; modeling money, time, and units; history and temporal data (effective dating); audit; ER and class diagrams; business rules as data vs code; separating what is universal from what varies.  
**Why:** an agent can know every pattern and still build a terrible system because it misunderstands the domain.  
**Builds:** **Ledger:** money as a value object, dates without times, recurring transactions, categories, and an audit history of edits.

### 2.9 Domain-to-architecture translation

`DOM` · Target: E · Needs: 2.5, 2.8  
**Covers:** real domain, then conceptual model, then software model, then architecture, then implementation and verification; actors, responsibilities, and glossary; commonality and variability analysis; what is configurable vs hardcoded; who owns which state; sketching the model before any code exists.  
**Why:** this is the skill that makes architecture decisions _yours_.  
**Builds:** **Ledger:** the module sketch before any code: a pure domain package, a storage package and a tkinter interface package, with dependencies pointing at the domain.

### 2.10 Estimating scale and shape

`SE` · Target: A · Needs: 2.5  
**Covers:** users, data volume, request rates, growth; back-of-envelope arithmetic; latency and storage orders of magnitude; peak vs average; read/write ratios; when scale changes the design; sanity-checking units.  
**Why:** it decides the architecture. A design for ten users and a design for ten million are different designs.  
**Builds:** **Ledger:** how many transactions ten years produce, and what that means for storage and search. **Kit:** when a tool must stream its input and when it may load it whole.

### 2.11 Text, time, and locale

`CS` `SE` · Target: A · Needs: 1.3  
**Covers:** code points vs graphemes; UTF-8 and UTF-16; normalization; collation and sorting; case folding; line endings; instants vs local times; time zones and daylight saving; UTC; ISO 8601; leap seconds; wall-clock vs monotonic clocks; calendars; durations; internationalization and localization; number, date, and currency formatting.  
**Why:** text and time are famously harder than they look, and agents handle them naively.  
**Builds:** **Ledger:** transaction dates and time zones, and currency formatting by locale. **Kit:** `count` counts user-perceived characters (graphemes), not bytes.

---

# STAGE 3: STRUCTURE, ANTI-MUD, AND AGENT DISCIPLINE

### 3.1 Abstraction, interfaces, and information hiding

`SE` · Target: E · Needs: 1.4, 1.5  
**Covers:** what an abstraction hides and exposes; interface vs implementation; encapsulation; separation of concerns; information hiding; contracts at module boundaries; leaky abstractions; what a component should and should not know.  
**Why:** the central question of clean architecture: what should this component know?  
**Builds:** **Framework** starts: a C# solution whose first project defines `Request`, `Response` and a handler interface, with no networking at all. Tests build requests in memory. **Ledger:** a storage interface with a CSV implementation, so SQLite can replace it later.

### 3.2 Boundaries: coupling, cohesion, layers, dependency direction

`SE` · Target: E · Needs: 3.1  
**Covers:** coupling and cohesion; layers (presentation, logic, data); **dependency direction**; circular dependencies; god objects and god files; shared mutable state; global state; "utils" dumping grounds; single source of truth; "one place to change"; dependency injection; ports and adapters (introduction); measuring (file and function size, import graph, duplication).  
**Why:** mud is a failure of boundaries. Agents add features by reaching into whatever code is nearest.  
**Builds:** **Framework:** split into several projects (core, routing, hosting) with one-way references and `internal` types, so the compiler enforces the boundaries. **Board** starts: the issue board's domain as its own project, referencing nothing from Framework. **Ledger:** the domain never imports tkinter. **Blockfall:** the game-logic module never touches the page.

### 3.3 Object-oriented design in practice

`SE` · Target: E · Needs: 3.1  
**Covers:** classes and objects; encapsulation; polymorphism; composition vs inheritance; interfaces and protocols; SOLID; delegation; immutability; value vs entity design; when classes are the wrong tool.  
**Why:** agents overuse inheritance and treat classes as namespaces.  
**Builds:** **Framework:** the router and pipeline composed from small objects. **Blockfall:** the seven piece shapes as data in one table, not seven classes. This is a case where classes are the wrong tool.

### 3.4 Design patterns and anti-patterns

`SE` · Target: E · Needs: 3.3  
**Covers:** creational (Factory, Abstract Factory, Builder, Prototype, Singleton and its costs); structural (Adapter, Decorator, Facade, Composite, Proxy, Bridge, Flyweight); behavioral (Strategy, Observer, Command, State, Iterator, Template Method, Chain of Responsibility, Mediator, Visitor, Memento); enterprise (Repository, Unit of Work, Service Layer, DTO, Active Record vs Data Mapper); anti-patterns (God Object, big ball of mud, spaghetti, copy-paste, golden hammer, premature abstraction, speculative generality, shotgun surgery, feature envy, primitive obsession, magic numbers, singleton abuse, anemic model). Each pattern: the problem it solves, what it hides, what it costs, **when not to use it**.  
**Why:** learn to recognize patterns in existing code. Agents produce "pattern soup": a factory for one class, an abstract base with one implementation.  
**Builds:** **Framework:** middleware as Chain of Responsibility. **Ledger:** undo and redo as Command, and the window updated from the model through Observer. **Blockfall:** the State pattern compared with the transition table from 2.7.

### 3.5 Architectural reasoning

`DOM` `SE` · Target: E · Needs: 2.9, 3.2  
**Covers:** responsibilities and where each lives; who owns data; who may modify it; necessary vs prohibited dependencies; what changes the design should and should not accommodate; what happens when a component fails; testability in isolation; what happens when complexity doubles; dependency graphs, sequence diagrams, component diagrams, and state diagrams as **thinking tools**.  
**Why:** being able to reason about an architecture before any code exists.  
**Builds:** **Framework and Board:** before the code, a sequence diagram of a request through the pipeline, and an ownership table showing who owns which state and who may change it.

### 3.6 Executable architecture: enforcement and guardrails

`SE` `AI` · Target: E · Needs: 1.9, 3.2  
**Covers:** architecture tests; import-boundary rules; lint rules; type checking; size and complexity budgets; pre-commit hooks; dependency allowlists; diff-size limits; golden-file tests; fitness functions; a "definition of done" script; making violations detectable and failing the build.  
**Why:** architecture must be reflected in mechanisms that make violations detectable. A document an agent can violate silently is not a constraint.  
**Builds:** **Framework:** architecture tests that fail the build when a project references one it must not. **Kit:** `archcheck`, a small import-rule checker for Python packages, run on Ledger. **Blockfall:** a lint rule that the logic module never touches the page.

### 3.7 Plausible-but-wrong code: a failure-mode catalog

`AI` · Target: E · Needs: 1.9, 1.12  
**Covers:** invented APIs, functions, packages, and columns (including slopsquatted package names); duplicated code instead of reuse; over-engineering; under-engineering and hardcoding; swallowed exceptions and masking fallbacks; test gaming; scope creep; dead code left behind; inconsistent patterns across files; ignoring existing utilities; stale library assumptions; confident "done" claims; partial implementations with TODOs; mocking away the real problem; changed public interfaces; security shortcuts; misleading comments. Each failure paired with its detection and its guardrail.  
**Why:** a driver who knows exactly how the car fails drives faster. This catalog grows with every later module.  
**Builds:** No new piece. Provided diffs against Blockfall and Ledger, each containing one plausible-but-wrong change to find: a swallowed error, a duplicated rule, a weakened test, or an unneeded layer.

### 3.8 Code quality, naming, smells, and refactoring

`SE` · Target: E · Needs: 1.9, 3.2  
**Covers:** readability; naming; function size; comments (why, not what); dead code; duplication (DRY and its limits; the rule of three; the wrong abstraction costs more than duplication); KISS; YAGNI; code smell catalog; refactoring moves (extract, rename, move, inline, parameter object, replace conditional with polymorphism); refactoring safely (tests first, small steps); cyclomatic complexity; linters, formatters, type checkers.  
**Why:** agents add flags and layers instead of refactoring.  
**Builds:** **Blockfall:** refactor a provided 200-line update function in small, tested steps. **Kit:** duplicated argument handling across tools pulled into one shared module.

### 3.9 Technical debt and recognizing over-engineering

`SE` · Target: E · Needs: 3.8  
**Covers:** deliberate vs accidental debt; interest and principal; measuring code health; layers with one implementation; configuration for things that never change; plugin systems nobody uses; speculative generality; deleting code as a virtue; when duplication is the right answer.  
**Why:** an agent can produce a valid implementation with five unnecessary layers. Spotting that is an engineering skill.  
**Builds:** **Framework:** judge a provided plugin system that nobody asked for, and remove it. The course rule from here on: a piece moves into Framework only when a second user of it needs it.

### 3.10 Rescuing a muddy codebase

`SE` · Target: E · Needs: 1.8, 1.9, 3.2, 3.8  
**Covers:** mapping the system (entry points, dependency graph, hotspots from version-control churn); characterization tests; seams; strangler-fig migration; branch by abstraction; extracting a module; deleting dead code (coverage plus search); consolidating duplicates; introducing and enforcing boundaries; ratcheting metrics; incremental improvement vs rewrite (and why rewrites usually fail); prioritizing by churn times pain; agent-assisted refactor loops (small, tested, reviewable); freezing features during stabilization.  
**Why:** very few courses teach recognizing a structurally unhealthy system and systematically recovering it.  
**Builds:** Supplied codebases, not one of the growing projects: the same system at about its fifteenth feature, built twice, once muddy and once clean. Add feature sixteen to both, then rescue the muddy one.

### 3.11 Documentation, ADRs, and conventions in the repo

`SE` `AI` · Target: A · Needs: 3.2, 1.12  
**Covers:** README; architecture overview; architecture decision records; API docs; docstrings; runbooks; diagrams (C4, sequence, ER); docs as code; keeping docs honest (generated docs, tests as docs); **contributor guides** (commands, conventions, boundaries, glossary), read by new people and AI tools alike; examples over rules; scaffolds and templates; directory structure as documentation; naming conventions; repo maps; handoff notes.  
**Why:** conventions must live in the repo, or every new contributor re-derives them and drifts.  
**Builds:** Every project gets a README, a short architecture overview, and decision records (for example, Ledger: why CSV first; Framework: why an in-memory pipeline first). The folder layout serves as documentation.

### 3.12 Workflow II: scaffolds, parallel work, independent review

`AI` · Target: E · Needs: 3.6, 3.11  
**Covers:** contributor guides in practice; scaffolding new modules from templates; parallel work on branches and worktrees; independent review vs self-review; least privilege and sandboxing for automated changes; unattended changes and their risks; handoffs and summaries; stating constraints, negative examples and a definition of done.  
**Why:** more people or agents changing a codebase without more mud.  
**Builds:** **Kit:** a template for a new tool. **Framework:** a template for new middleware. Each addition gets one obvious shape. Two pieces are built in parallel branches and merged.

### 3.13 Designing for change

`SE` `DOM` · Target: E · Needs: 3.2, 3.5
**Covers:** decomposing by what is likely to change (Parnas's information-hiding criterion), not by processing steps; extension points (a table, a registry, an interface) and when to add one (at the second or third variant, not the first); organizing by feature versus by layer, and what each does to the locality of a change; predicting a change's impact (list the files it should touch, then compare with the real diff); "if you change X, also do Y" recipes kept beside the code; the cost of the wrong abstraction.
**Why:** systems rarely break when first written; they break when the next feature arrives. Good structure gives the next change one obvious place.
**Builds:** **Kit:** a new tool is added by creating one file that the registry finds. **Blockfall:** a second game mode added through an extension point, with its impact predicted first. **Framework:** a new kind of route added without editing the router's core.

### 3.14 Skeleton first: contracts before implementations

`SE` · Target: A · Needs: 1.9, 2.6, 3.1
**Covers:** fixing boundaries, interfaces, types and failing tests before writing implementations; types that make invalid states impossible (a "well enough" preview of 6.3); stubs that fail loudly; acceptance tests as the definition of done; someone else (a teammate, a contractor, an agent) filling in an implementation against a fixed contract; reviewing an implementation against its contract; reviewing the contract itself against the domain requirements, because a contract written in code can still be wrong, and a perfectly implemented wrong contract is a wrong system.
**Why:** a design written as code (signatures, types, tests) can be compiled and run against. A design written only as prose cannot. This is how the design stays yours while others write the code.
**Builds:** **Framework:** the template engine's interface, types and failing tests; its parser is built in 6.5 to pass them. **Ledger:** the reporting module's skeleton, filled in at 4.4.

---

# STAGE 4: DATA STRUCTURES, ALGORITHMS, AND COST

### 4.1 Data structures I: sequences, maps, sets, stacks, queues

`CS` · Target: A · Needs: 1.4  
**Covers:** arrays and lists; dynamic arrays and amortized growth; linked lists; stacks; queues; deques; hash maps and sets (use); tuples and records; strings as sequences; choosing by operation (lookup, insert, order, uniqueness); mutability and hashability; ordered vs unordered; Python container behavior.  
**Why:** agents use lists for membership tests in loops and dict-of-dicts instead of real types.  
**Builds:** **Blockfall:** the board as a 2D array, a flat array and row bitmasks, compared; the next-piece queue as a deque. **Kit:** `freq` (word frequencies), with list lookup and dictionary lookup measured against each other.

### 4.2 Recursion, induction, and recurrences

`CS` · Target: R · Needs: 1.5, 2.3  
**Covers:** recursive structure (base case, step); the call stack; tail recursion; mutual recursion; mathematical induction; strong induction; structural induction; recurrence relations; solving recurrences (unrolling, master theorem); memoization.  
**Why:** induction and recursion are the proof and construction tools of computing.  
**Builds:** **Kit:** `tree` and a JSON pretty-printer rewritten with structural recursion, then the recursion limit removed by replacing recursion with an explicit stack. Concept lesson in Python.

### 4.3 Algorithmic reasoning: correctness and termination

`CS` · Target: R · Needs: 4.2, 1.2  
**Covers:** specification (pre and postconditions); loop invariants; partial vs total correctness; termination (variants); edge cases; proof sketches; testing vs proving; decomposition; pseudocode and flowcharts.  
**Why:** judging whether code does the right thing independent of any example.  
**Builds:** **Blockfall:** line clearing with a stated loop invariant and an argument that it terminates. **Kit:** binary search in `filter` for sorted input.

### 4.4 Complexity and asymptotics

`CS` · Target: R · Needs: 4.2  
**Covers:** Big-O, Big-Omega, Big-Theta; best, average, worst case; amortized analysis; space complexity; solving recurrences; constants in practice; cost models (RAM model, memory hierarchy); empirical measurement; common classes (constant, logarithmic, linear, linearithmic, quadratic, exponential).  
**Why:** knowing how work grows with input is how you catch an agent's "works on 10 rows" solution.  
**Builds:** **Kit:** `dedupe`, written quadratic, measured, then rewritten as linear. **Ledger:** monthly reports over a hundred thousand transactions, implemented against the skeleton from 3.14.

### 4.5 Data structures II: hash tables, trees, heaps, graphs

`CS` · Target: R · Needs: 4.1, 4.4  
**Covers:** hash table internals (hashing, collisions, chaining, open addressing, load factor, resizing); trees (binary search trees; balanced trees: AVL, red-black); heaps and priority queues; tries; graph representations; disjoint sets (union-find); segment and Fenwick trees; traversals and iterators.  
**Why:** you can then judge structure choices instead of accepting them.  
**Builds:** **Kit:** a hash map and a heap written from scratch (concept lessons), then `top`, which finds the k most frequent words. **Ledger:** category autocomplete with a trie.

### 4.6 Algorithms I: searching, sorting, divide and conquer

`CS` · Target: R · Needs: 4.4, 4.5  
**Covers:** linear and binary search; sorting (insertion, merge, quick, heap, counting, radix; stability; the comparison lower bound); divide and conquer; selection; two pointers; sliding window; hashing techniques; string algorithms (KMP, Rabin-Karp, edit distance introduction).  
**Why:** the core toolkit and the vocabulary for describing it.  
**Builds:** **Kit:** `sort` for files larger than memory (external merge sort). **Ledger:** stable sorting of transactions by several keys.

### 4.7 Algorithms II: graph algorithms

`CS` · Target: R · Needs: 4.5  
**Covers:** BFS; DFS; topological sort; connected components; shortest paths (Dijkstra, Bellman-Ford, Floyd-Warshall, A\*); minimum spanning trees; max-flow and min-cut (introduction); cycle detection; dependency resolution and build ordering.  
**Why:** dependencies, imports, networks, workflows, and navigation are all graphs.  
**Builds:** **Framework:** the dependency-injection container, which resolves services as a graph, orders them topologically and reports cycles. **Kit:** `deps`, the import graph of a Python project with cycle detection; `archcheck` gains a no-cycles rule.

### 4.8 Algorithms III: greedy, dynamic programming, backtracking

`CS` · Target: R · Needs: 4.3, 4.4  
**Covers:** greedy algorithms and exchange arguments; dynamic programming (memoization vs tabulation; knapsack, LCS); backtracking; branch and bound; randomized algorithms; approximation algorithms; heuristics; online algorithms; recognizing NP-hard problems; constraint solving, SAT, SMT, and ILP awareness.  
**Why:** recognizing when a problem is hard, and which family of technique applies.  
**Builds:** **Blockfall:** a computer player that scores every placement with a heuristic, then searches two pieces ahead. Concept lesson on dynamic programming, linking to the Dynamic Programming course.

### 4.9 Discrete mathematics: counting, probability, proof

`CS` · Target: R · Needs: 2.3, 4.2  
**Covers:** combinatorics; permutations and combinations; binomial coefficients; inclusion-exclusion; pigeonhole; counting arguments; state-space size; basic probability (events, conditional probability, Bayes, expectation, variance); randomness and pseudorandom generators; the birthday bound; Markov chains (introduction); proof techniques (direct, contradiction, contrapositive, counterexample).  
**Why:** counting possible states and combinations explains why testing everything is impossible and why collisions happen.  
**Builds:** **Blockfall:** the shuffled-bag randomizer compared with pure randomness, with the probability of long droughts both measured and calculated. Concept lesson in Python, linking to the discrete maths course.

### 4.10 Graph theory and trees (formal)

`CS` · Target: R · Needs: 2.3, 4.7  
**Covers:** directed and undirected graphs; DAGs; degree; paths and cycles; connectivity; trees and spanning trees; bipartite graphs; planarity; coloring; matching; isomorphism (awareness); graph models of software (imports, calls, dependencies, workflows, networks).  
**Why:** the formal language for dependency and structure analysis.  
**Builds:** **Kit:** `snap`, content-addressed snapshots of a folder in which each snapshot points at its parent. The result is a DAG, as in version control.

### 4.11 Performance reasoning and profiling

`SE` · Target: E · Needs: 4.4  
**Covers:** measure, don't guess; CPU and memory profilers; flame graphs; benchmarking and its pitfalls; I/O-bound vs CPU-bound; N+1 patterns; batching; caching and invalidation; lazy evaluation and streaming; vectorization; memory use; latency vs throughput; percentiles; Amdahl's law; load testing; performance budgets; premature optimization.  
**Why:** agents optimize the wrong thing, load whole files into memory, and cache without invalidation.  
**Builds:** **Blockfall:** frame-time profiling, then redrawing only what changed. **Kit:** streaming instead of loading whole files, measured. **Ledger:** an N+1 query pattern found and batched.

### 4.12 Specialized data structures

`CS` · Target: U · Needs: 4.5  
**Covers:** B-tree and B+tree; LSM-tree; skip list; Bloom and cuckoo filters; count-min sketch and HyperLogLog; k-d tree, quadtree, octree, R-tree, bounding-volume hierarchy; ring buffer; persistent and immutable structures; rope and gap buffer; interval trees; concurrent structures; inverted index; columnar layouts.  
**Why:** these appear inside databases, search engines, graphics, and geometry; know they exist and what they are for.  
**Builds:** No piece yet. Forward links: Netkit uses a ring buffer (7.4), Store a log-structured design (7.8), Renderer a bounding-volume hierarchy (10.5).

---

# STAGE 5: THE MACHINE UNDERNEATH

### 5.1 Digital logic: from gates to a CPU

`CS` · Target: R · Needs: 1.2, 1.3  
**Covers:** transistors to gates (AND, OR, NOT, NAND, NOR, XOR); universality of NAND; combinational circuits; half and full adders; multiplexers and decoders; the ALU; sequential logic (latches, flip-flops, registers, clocks, counters); memory cells (SRAM, DRAM); finite-state machines in hardware; timing and propagation delay; simulating a toy CPU.  
**Why:** it removes the mystery. Computation is built from this.  
**Builds:** **Machine** starts: gates simulated in C, then adders, then an ALU. Links to the digital fundamentals course and the logic simulator lab.

### 5.2 Representation II: floating point, text, layout

`CS` · Target: R · Needs: 1.3  
**Covers:** IEEE 754 (sign, exponent, mantissa; subnormals; infinity and NaN; rounding modes); why `0.1 + 0.2 != 0.3`; comparing floats; ULPs; Kahan summation; fixed-point and decimal types; BCD; integer vs float for money; character encodings; endianness; alignment, padding, and struct layout; bit packing; binary formats; magic numbers; checksums.  
**Why:** a program can be logically correct and numerically wrong.  
**Builds:** **Kit:** `inspect`, a parser for a binary file header (an image or audio format) with explicit sizes and byte order. **Ledger:** floats shown failing at money, which is why it uses decimals. Concept lesson in C for struct layout and padding.

### 5.3 Computer architecture I: ISA, instructions, assembly

`CS` · Target: R · Needs: 5.1  
**Covers:** von Neumann architecture; instruction set architectures (RISC vs CISC); registers; instruction formats; the fetch-decode-execute cycle; addressing modes; assembly basics (x86-64, ARM, or RISC-V); calling conventions; stack frames; flags and branching; reading disassembly; how a function becomes instructions; the system-call instruction.  
**Why:** what the computer actually executes.  
**Builds:** **Machine:** a tiny instruction set, an assembler written in Python, and a fetch-decode-execute loop in C. The two halves meet through a binary file format.

### 5.4 Computer architecture II: pipelines, caches, parallel hardware

`CS` · Target: R · Needs: 5.3  
**Covers:** pipelining and hazards; branch prediction; out-of-order and superscalar execution; speculative execution (and Spectre-class issues); cache hierarchy (levels, lines, associativity, replacement); locality; false sharing; TLB; memory bandwidth and latency; SIMD and vectorization; multicore; cache coherence; memory consistency models; NUMA; GPU architecture overview; storage devices (HDD, SSD, NVMe); the latency-numbers table.  
**Why:** explains why a vectorized NumPy call beats a Python loop and why data layout matters.  
**Builds:** **Machine:** a cache simulator that counts hits and misses. Concept lesson in C: a 2D array traversed by rows and by columns, timed.

### 5.5 Memory: stack, heap, allocation, virtual memory

`CS` · Target: R · Needs: 5.3, 1.5  
**Covers:** address spaces; stack vs heap vs static; pointers and references; allocators (malloc, arenas, pools); fragmentation; virtual memory (pages, page tables, TLB, page faults, swap); memory-mapped files; copy-on-write; object layout; the Python object model in memory; leaks; dangling references; buffer overflows (introduction); memory limits.  
**Why:** the layer under every variable.  
**Builds:** **Machine:** the VM's memory, stack and heap, and an arena allocator in C.

### 5.6 Resource ownership and lifetimes

`CS` `SE` · Target: E · Needs: 5.5  
**Covers:** who owns a resource, who can use it, and when its lifetime ends; ownership and borrowing (Rust); RAII; context managers; destructors and finalizers; garbage collection and non-memory resources; files, sockets, database connections, locks, threads, tasks; leaks and exhaustion; cancellation and cleanup; pools; double free and use-after-free; leases in distributed settings; idempotent cleanup.  
**Why:** memory is not the only resource. Connections get exhausted, files stay locked, and tasks outlive the user's cancel.  
**Builds:** **Framework:** per-request lifetimes for services and connections (`IDisposable`, scoped services). **Kit:** context managers for files. Concept lesson in Rust, where ownership is part of the type.

### 5.7 Information theory, compression, and error correction

`CS` · Target: U · Needs: 4.9, 5.2  
**Covers:** entropy; bits as information; Shannon's model; lossless compression (Huffman, LZ family); lossy compression; redundancy; error detection (parity, checksums, CRC); error correction (Hamming, Reed-Solomon); hash functions (non-cryptographic vs cryptographic); channels and noise; encoding efficiency; entropy of passwords.  
**Why:** underlies storage, networking, cryptography, and data formats.  
**Builds:** **Kit:** `compress`, a Huffman encoder and decoder, and `checksum` (CRC-32), which `snap` uses to detect corruption.

### 5.8 Operating systems I: processes, threads, scheduling

`CS` · Target: R · Needs: 5.5  
**Covers:** kernel vs user mode; system calls; processes (states, `fork`, `exec`); threads; context switching; scheduling (FCFS, round-robin, priority, CFS-style); inter-process communication (pipes, sockets, shared memory, signals); synchronization (introduction); deadlock; process lifecycle; daemons.  
**Why:** what "running a program" means.  
**Builds:** **Machine:** a process-scheduler simulator with several policies. **Kit:** `watch`, which runs a command as a subprocess and handles signals.

### 5.9 Operating systems II: files, I/O, isolation, boot

`CS` · Target: R · Needs: 5.8  
**Covers:** file systems (inodes, directories, journaling, links); the virtual file system; file descriptors; buffering and the page cache; `fsync` and durability; atomic rename; permissions, users, groups, capabilities; sandboxing; namespaces and cgroups; containers vs virtual machines; hypervisors; the boot process (firmware, bootloader, kernel, init); drivers; I/O models (blocking, non-blocking, epoll, kqueue, io_uring); system logging.  
**Why:** non-atomic file writes corrupt data; containers and isolation are everywhere.  
**Builds:** **Ledger:** atomic saves (write a temporary file, then rename it). **Machine:** a page-table and page-replacement simulator.

### 5.10 Hardware interfaces and industrial protocols

`CS` · Target: U · Needs: 5.8  
**Covers:** interrupts; DMA; buses (PCIe, USB); memory-mapped I/O; polling vs interrupt-driven I/O; serial protocols (UART, SPI, I2C, CAN); GPIO; drivers and firmware; timing; the hardware/software boundary; industrial control awareness (PLCs, Modbus, OPC UA, EtherCAT, motion controllers).  
**Why:** where software touches the physical world.  
**Builds:** **Machine:** a memory-mapped console device and a timer interrupt in the VM. Concept lesson at the Understand tier.

---

# STAGE 6: LANGUAGES, TYPES, COMPILATION, AND THEORY

### 6.1 Programming-language fundamentals

`CS` · Target: R · Needs: 1.5  
**Covers:** syntax vs semantics; grammar basics; lexical vs dynamic scope; binding and environments; name resolution; evaluation strategies (eager, lazy, by value, by reference, by name); expressions vs statements; operational semantics (introduction); mutation semantics; modules and namespaces; exception semantics; language-design trade-offs; foreign-function interfaces.  
**Why:** languages stop being magic interfaces.  
**Builds:** **Toylang** starts in Rust: design the language (expressions, bindings, functions, scope rules) on paper and as example programs.

### 6.2 Type systems I: static, dynamic, strong, weak

`CS` · Target: E · Needs: 6.1  
**Covers:** static vs dynamic typing; strong vs weak; nominal vs structural; type inference; gradual typing (Python type hints); compile-time vs runtime checking; type safety and soundness; the null problem; casting; duck typing; protocols and interfaces; what types prove and what they don't.  
**Why:** types are one of the strongest tools for controlling complexity.  
**Builds:** **Blockfall:** the game logic migrated to TypeScript one file at a time, so gradual typing is seen happening. **Ledger:** Python type hints with a type checker.

### 6.3 Type systems II: algebraic data types, generics, variance

`CS` · Target: R · Needs: 6.2  
**Covers:** product and sum types; algebraic data types; tagged unions and pattern matching; Option/Maybe and Result/Either; generics and parametric polymorphism; ad hoc polymorphism; subtyping; variance (covariant, contravariant, invariant); bounded generics; type classes and traits; newtypes and phantom types; making illegal states unrepresentable; refinement types; dependent types (introduction); runtime validation vs compile-time checking.  
**Why:** types can make invalid operations hard to express, which is enormously useful when directing an agent.  
**Builds:** **Toylang:** the syntax tree as Rust enums; the compiler refuses a match that misses a case. **Blockfall:** game states as a discriminated union in TypeScript. **Framework:** validation results returned as a result type instead of thrown as exceptions.

### 6.4 Automata and regular languages

`CS` · Target: R · Needs: 2.3, 2.7  
**Covers:** alphabets, strings, languages; DFAs and NFAs; subset construction; regular expressions; equivalence; the pumping lemma (introduction); limits of regex; lexers as DFAs; regex engines (backtracking, catastrophic backtracking and ReDoS); protocols as automata.  
**Why:** foundations of lexers, validators, and protocols.  
**Builds:** **Kit:** a small regular-expression engine (Thompson's construction), with a demonstration of catastrophic backtracking. **Toylang:** the lexer as a state machine.

### 6.5 Context-free grammars and parsing

`CS` · Target: R · Needs: 6.4  
**Covers:** context-free grammars; BNF and EBNF; derivations and parse trees; ambiguity; pushdown automata; top-down parsing (recursive descent, LL); bottom-up parsing (LR); precedence and associativity; parser combinators; PEG; parsing data formats; error recovery; writing a tiny parser.  
**Why:** how any structured input becomes a data structure.  
**Builds:** **Toylang:** a recursive-descent parser in Rust. **Framework:** the template parser (`{{ }}` expressions, loops, conditionals) in C#, written to pass the tests from 3.14. The same idea in a second language.

### 6.6 Compilers I: front end

`CS` · Target: R · Needs: 6.5  
**Covers:** the compilation pipeline; lexing; parsing; AST design; symbol tables and scopes; semantic analysis; type checking; name resolution; error messages; tree-walking interpreters; desugaring; how linters, formatters, and language servers use ASTs; Python's `ast` module.  
**Why:** it explains syntax errors, linters, and the tools you use daily.  
**Builds:** **Toylang:** name resolution, type checking and a tree-walking interpreter. **Kit:** `lint`, a rule checker built on Python's `ast` module, which replaces `archcheck`'s text matching.

### 6.7 Compilers II: back end, linking, loading

`CS` · Target: U · Needs: 6.6, 5.3  
**Covers:** intermediate representations (three-address code, SSA); control-flow graphs; data-flow analysis; optimizations (constant folding, dead-code elimination, inlining, loop optimizations); register allocation; instruction selection; code generation; linking (static, dynamic); loaders; object formats (ELF, PE, Mach-O); ABIs; debug information; build pipelines; LLVM overview; cross-compilation.  
**Why:** how source becomes an executable.  
**Builds:** **Toylang:** compiles to Machine's bytecode and runs on it, two projects joined through a file format. Adds constant folding and dead-code removal.

### 6.8 Interpreters, virtual machines, JIT, and garbage collection

`CS` · Target: R · Needs: 6.6, 5.5  
**Covers:** bytecode; stack vs register VMs; dispatch; CPython internals (bytecode, `dis`, the GIL); JVM overview; JIT compilation (tracing, method-based); ahead-of-time compilation; garbage collection (reference counting, mark-sweep, generational, compacting, concurrent); WebAssembly; sandboxing; reflection; startup cost.  
**Why:** what actually runs your Python, and why it behaves as it does.  
**Builds:** **Machine:** a mark-and-sweep garbage collector for Toylang's heap values. Concept lesson: CPython bytecode, read with `dis`.

### 6.9 Programming paradigms compared

`CS` `SE` · Target: E · Needs: 3.3, 6.1  
**Covers:** imperative, procedural, object-oriented, functional, declarative, logic, data-oriented, actor, event-driven, reactive, dataflow, array programming; the same problem solved in several styles (for example, a game board as procedural functions, as an object owning state, as pure state transformations, and as arrays processed in bulk); mixing styles; when each fits.  
**Why:** compare, don't memorize vocabulary.  
**Builds:** **Blockfall:** the same game logic written four ways and compared: procedurally, as an object owning state, as pure state transformations, and as arrays processed in bulk.

### 6.10 Functional programming theory

`CS` · Target: R · Needs: 6.1, 6.3  
**Covers:** lambda calculus; Church encoding; beta reduction; fixed points; purity and referential transparency; immutability; higher-order functions; map, filter, fold; composition and currying; functors, applicatives, and monads (intuition); handling effects; lazy evaluation; memoization; algebraic laws.  
**Why:** reasoning about transformation, composition, and side effects.  
**Builds:** **Toylang:** closures and higher-order functions. **Ledger:** report pipelines written as map, filter and fold.

### 6.11 Metaprogramming, reflection, and DSLs

`CS` `SE` · Target: R · Needs: 6.1, 6.6  
**Covers:** reflection and introspection; decorators; metaclasses; macros (hygienic and unhygienic); code generation; templates; annotation processing; internal and external DSLs; configuration languages; the risks of `eval`; ORMs as metaprogramming; why "magic" hurts readability.  
**Why:** much framework "magic" is this; agents love generating it.  
**Builds:** **Framework:** routes declared with attributes and found by reflection, compared with an explicit route table, to show the cost of magic. **Kit:** a decorator that registers new tools (an extension point).

### 6.12 Computability and complexity theory

`CS` · Target: U · Needs: 4.4, 6.4  
**Covers:** models of computation; Turing machines; the Church-Turing thesis; universal machines; decidability; the halting problem; Rice's theorem (the limits of static analysis); reductions; P, NP, NP-complete, NP-hard, co-NP, PSPACE; space complexity; the complexity hierarchy; practical consequences (why linters can't be perfect, why scheduling is hard, why SAT solvers matter).  
**Why:** knowing what cannot be computed, or cannot be computed efficiently, prevents asking for the impossible.  
**Builds:** No piece. Concept lesson: why Kit's `lint` can never be perfect (Rice's theorem).

---

# STAGE 7: CONCURRENCY, NETWORKS, PERSISTENCE, AND DISTRIBUTION

### 7.1 Concurrency I: threads, async, races

`CS` · Target: E · Needs: 5.8, 4.1  
**Covers:** concurrency vs parallelism; processes, threads, coroutines; the event loop and async/await; race conditions; critical sections; deadlock, livelock, starvation; thread safety; shared mutable state; immutability as a safety tool; Python's GIL; I/O-bound vs CPU-bound; pools; producer/consumer; debugging concurrency.  
**Why:** two functions that pass tests alone can break when run together.  
**Builds:** **Ledger:** a long import runs in the background without freezing the window, following tkinter's one-thread rule. **Framework:** asynchronous request handling.

### 7.2 Concurrency II: synchronization and memory models

`CS` · Target: R · Needs: 7.1, 5.4  
**Covers:** locks, mutexes, read-write locks, semaphores, condition variables, barriers; atomic operations; compare-and-swap; memory ordering and happens-before; language memory models; lock-free and wait-free structures; linearizability; the ABA problem; false sharing; deadlock avoidance (lock ordering).  
**Why:** correct low-level shared-state behavior.  
**Builds:** **Store** starts in Go: a concurrent map, with a race found by the race detector and fixed with a lock.

### 7.3 Concurrency III: actors, channels, structured concurrency

`CS` · Target: R · Needs: 7.1  
**Covers:** the actor model; CSP and channels; software transactional memory; dataflow; structured concurrency; cancellation and timeouts; backpressure; async resource safety; reentrancy; task supervision; parallel patterns (map-reduce, fork-join); GPU concurrency overview; determinism; testing concurrent code (stress testing, deterministic schedulers).  
**Why:** alternatives to locks, and how to stop work cleanly.  
**Builds:** **Store:** one goroutine per connection, channels between stages, and cancellation with contexts. Concept lesson comparing Go channels with Python's `asyncio`.

### 7.4 Networking I: layers, addressing, DNS

`CS` · Target: R · Needs: 5.8  
**Covers:** the OSI and TCP/IP models; the link layer (Ethernet, Wi-Fi, MAC, ARP); IP (v4, v6, subnets, CIDR); routing (BGP overview); NAT; ports and sockets; DNS (resolution, records, TTL); DHCP; firewalls; proxies; VPNs; latency, bandwidth, jitter, loss; diagnostic tools (`ping`, `traceroute`, `dig`, `curl`, `tcpdump`, Wireshark); localhost vs LAN vs WAN.  
**Why:** how any two machines find and reach each other.  
**Builds:** **Netkit** starts in Python: a DNS lookup built from raw UDP packets, a subnet calculator, and reachability checks of the learner's own machines, with a ring buffer of recent results.

### 7.5 Networking II: TCP, UDP, HTTP, TLS

`CS` · Target: R · Needs: 7.4  
**Covers:** UDP; TCP (handshake, sequence and acknowledgment, flow control, congestion control, retransmission, head-of-line blocking); QUIC and HTTP/3; HTTP/1.1 and HTTP/2; TLS (handshake, certificates, chains, SNI); WebSockets; server-sent events; the sockets API and blocking vs non-blocking sockets; connection pooling; keep-alive; load balancing (L4, L7); CDNs; protocol design; timeouts.  
**Why:** how reliable communication is built on unreliable links.  
**Builds:** **Netkit:** a TCP chat server and client, and an HTTP/1.1 client built from sockets. **Framework:** a real HTTP host plugged into the in-memory pipeline from 3.1, with no other changes needed. Netkit's client tests Framework's server across languages.

### 7.6 APIs and protocol design

`SE` · Target: E · Needs: 7.5, 2.4  
**Covers:** REST principles; resource modeling; HTTP semantics (methods, idempotency, status codes, headers, caching); pagination; filtering; versioning; error models; authentication and authorization protocols (cookies, tokens, OAuth2, OIDC); GraphQL; gRPC; webhooks; rate limiting; idempotency keys; OpenAPI; backward compatibility; event APIs.  
**Why:** agents ship endpoints with no authorization checks, no validation, inconsistent shapes, and no pagination.  
**Builds:** **Framework:** JSON API conventions, an error format, pagination and validation. **Board:** its first HTTP API, and server-rendered HTML pages using Framework's templates. HTML and CSS concept lessons link to the app's web and CSS courses.

### 7.7 The relational model and SQL

`CS` `SE` · Target: E · Needs: 2.2, 2.3  
**Covers:** relational algebra (select, project, join, union, difference); SQL (DDL, DML, queries); joins; aggregates; subqueries; CTEs; window functions; NULL and three-valued logic; constraints and keys; normalization (1NF through BCNF; higher forms awareness); functional dependencies; denormalization; views; triggers; stored procedures; schema design; SQL injection; ORMs.  
**Why:** business data belongs in a database with enforced rules, not in code or a spreadsheet.  
**Builds:** **Ledger:** CSV storage replaced by SQLite behind the storage interface from 3.1. **Framework:** a data-access package (connections, parameterized queries, migrations). **Board:** its database schema. Links to the SQL course.

### 7.8 Database internals and transactions

`CS` · Target: R · Needs: 7.7, 4.12, 5.9  
**Covers:** storage (pages, heap files, slotted pages); indexes (B+tree, hash, bitmap, covering, partial); query parsing, planning, and optimization (cost models, statistics; nested-loop, hash, and merge joins); `EXPLAIN`; transactions and ACID; write-ahead logging; crash recovery; the buffer pool; MVCC; locking (two-phase locking); isolation levels and anomalies (dirty read, non-repeatable read, phantom, write skew); deadlock detection; connection pooling; vacuum and compaction; replication basics; backups and point-in-time recovery.  
**Why:** explains why queries are slow, why data corrupts, and what "transaction" really guarantees.  
**Builds:** **Store:** an append-only log, an index, compaction, a write-ahead log and crash recovery. **Ledger:** a transfer between accounts as one transaction. **Board:** optimistic locking with a version column. **Kit:** `query`, a tiny query engine (scan, filter, project, join) over CSV files.

### 7.9 Non-relational data stores

`SE` · Target: U · Needs: 7.7  
**Covers:** key-value, document, wide-column, graph, time-series stores; search engines (inverted index, ranking); vector databases (approximate nearest neighbor); object storage; caches (Redis, Memcached; eviction policies); columnar and OLAP systems; data lakes and warehouses; polyglot persistence; consistency trade-offs; how to choose.  
**Why:** knowing the menu so an overloaded spreadsheet gets the right replacement.  
**Builds:** **Framework:** a cache interface with two implementations, one in memory and one that talks to Store over the network. Links to the NoSQL course.

### 7.10 Distributed systems I: failure, time, replication, consistency

`CS` · Target: R · Needs: 7.5, 7.8  
**Covers:** why distribute; the fallacies of distributed computing; failure models (crash, omission, Byzantine); partial failure; network partitions; clocks (physical, Lamport, vector, hybrid); ordering; replication (leader-follower, multi-leader, leaderless); consistency models (linearizable, sequential, causal, eventual); CAP and PACELC; quorums; idempotence; retries.  
**Why:** which machine is authoritative, and what happens when messages arrive late, twice, or never.  
**Builds:** **Store:** leader-follower replication. **Blockfall:** an online two-player mode with an authoritative server built on Framework's WebSocket support. Blockfall is Framework's second user.

### 7.11 Distributed systems II: consensus, transactions, partitioning

`CS` · Target: U · Needs: 7.10  
**Covers:** consensus (Paxos, Raft); leader election; distributed locks, leases, and fencing tokens; two-phase commit; sagas; the outbox pattern; CRDTs; gossip and anti-entropy; partitioning and sharding; consistent hashing; rebalancing; distributed caching; stream processing and exactly-once semantics; Byzantine fault tolerance (awareness); testing distributed systems (Jepsen-style, chaos).  
**Why:** the mechanisms behind multiplayer state, replicated databases, and cloud services.  
**Builds:** **Store:** leader election (a simplified Raft). **Blockfall:** client-side prediction and reconciliation. **Board:** the outbox pattern for notifications.

### 7.12 Queues, streams, events, and jobs

`SE` · Target: A · Needs: 7.1, 7.10  
**Covers:** queues vs logs (RabbitMQ and SQS vs Kafka-style); publish/subscribe; delivery semantics; ordering; partitions and consumer groups; dead-letter queues; backpressure; idempotent consumers; schedulers and cron; workflow and orchestration engines; event-driven architecture; webhooks; stream processing (windowing).  
**Why:** jobs that duplicate side effects on retry are a classic agent bug.  
**Builds:** **Framework:** a background-jobs package (queue, worker, retries, idempotency, dead letters). **Board:** notifications sent as jobs.

### 7.13 Reliability engineering basics

`SE` · Target: E · Needs: 7.6, 7.8  
**Covers:** failure is normal; timeouts; retries with backoff and jitter; circuit breakers; bulkheads; rate limiting and load shedding; idempotency; atomicity patterns; graceful degradation; health checks; redundancy; backups and **tested restores**; recovery point and recovery time objectives; disaster recovery; chaos engineering; data-integrity checks; defensive validation.  
**Why:** agents assume success; real systems fail constantly.  
**Builds:** **Framework:** timeouts, retries with backoff, and a health endpoint. **Store:** backups and a tested restore. **Netkit:** an uptime monitor that watches Board.

---

# STAGE 8: SECURITY, CORRECTNESS, AND QUALITY AT SCALE

### 8.1 Security fundamentals and threat modeling

`SE` · Target: E · Needs: 7.6  
**Covers:** confidentiality, integrity, availability; threat modeling (STRIDE); attack surface; trust boundaries; least privilege; defense in depth; secure defaults; fail-secure; authentication, authorization, accounting; risk; adversarial thinking; incident response basics; security of AI agents (sandboxing, permissions).  
**Why:** agents take security shortcuts to make things "work."  
**Builds:** **Board:** a written threat model. **Netkit:** the rule that every tool is aimed only at machines you own.

### 8.2 Cryptography fundamentals

`CS` · Target: R · Needs: 4.9, 5.7  
**Covers:** symmetric encryption (AES, modes, nonces); asymmetric encryption (RSA, ECC); key exchange (Diffie-Hellman, ECDH); hash functions; MACs and HMAC; digital signatures; authenticated encryption; key derivation and password hashing (bcrypt, scrypt, Argon2); cryptographically secure randomness; PKI and certificates; key management and rotation; common misuses; "never roll your own"; side channels; post-quantum and zero-knowledge awareness.  
**Why:** you must be able to tell proper use from dangerous improvisation.  
**Builds:** **Framework:** password hashing with a standard library, and signed session cookies. Concept lesson in Python: break a home-made cipher to see why you never roll your own.

### 8.3 Application and web security

`SE` · Target: E · Needs: 8.1, 7.6  
**Covers:** the OWASP Top 10; injection (SQL, command, template); XSS; CSRF; SSRF; broken access control and IDOR; session management; authentication flows; CORS; CSP; clickjacking; file upload risks; path traversal; unsafe deserialization; secrets in code; sensitive data in logs; security headers; API security; secure code review; prompt injection and LLM-app security.  
**Why:** the most common ways agent-written apps get compromised.  
**Builds:** **Framework:** templates escape output by default, forms carry CSRF tokens, and queries are parameterized. **Board:** every request checks that the user may see that issue.

### 8.4 Supply chain, dependencies, secrets, environments

`SE` · Target: E · Needs: 1.6, 1.8  
**Covers:** package managers and lockfiles; virtual environments; semantic versioning; transitive dependencies; dependency confusion, typosquatting, and hallucinated packages; SBOMs; vulnerability scanning; license compliance; pinning; reproducible builds; secret management (vaults, environment variables, rotation); configuration layering; twelve-factor config; environment parity; container images; vendoring.  
**Why:** agents add dependencies for three lines of code and invent package names.  
**Builds:** **Kit** is published as a versioned package that Ledger and Netkit import. Every project pins its dependencies with its ecosystem's lockfile: pip, npm, NuGet, Go modules or Cargo.

### 8.5 Memory safety and low-level vulnerabilities

`CS` · Target: U · Needs: 5.5, 5.3  
**Covers:** buffer overflow; stack smashing; use-after-free; double free; integer overflow; format strings; time-of-check/time-of-use races; ASLR, DEP, stack canaries; return-oriented programming (awareness); memory-safe languages; sanitizers; `unsafe` blocks; FFI risks; hardening.  
**Why:** the class of vulnerabilities that explains why memory-safe languages exist.  
**Builds:** **Machine:** a buffer overflow in the VM's program loader, found with a sanitizer and fixed, then compared with the same loader written in Rust.

### 8.6 Testing strategy

`SE` · Target: E · Needs: 1.9  
**Covers:** test pyramid and trophy; unit, integration, system, end-to-end, contract, acceptance tests; TDD and BDD; test doubles (mock, stub, fake, spy) and **when not to mock**; fixtures and factories; determinism (time, randomness, network); flaky tests; coverage (line, branch, mutation); regression tests; characterization, golden, and snapshot tests; performance, load, and soak tests; exploratory testing; testing in production; verification vs validation; test data; test architecture; testing legacy code; test smells.  
**Why:** how to build a test suite that actually protects you from an agent quietly breaking things.  
**Builds:** Each project gets a test plan: **Blockfall** browser tests, **Framework** integration tests through the in-memory host, and **Board** contract tests for its API.

### 8.7 Property-based, fuzz, and mutation testing

`SE` · Target: R · Needs: 8.6, 2.6  
**Covers:** properties and invariants; generators and shrinking (Hypothesis); model-based testing; differential and metamorphic testing; coverage-guided fuzzing; mutation testing; fault injection; simulation testing; oracles from invariants; testing numerical code (tolerances); exhaustively testing state machines.  
**Why:** tests that explore instead of confirming chosen examples.  
**Builds:** **Toylang:** a fuzzed parser. **Kit:** property tests that CSV and JSON conversions round-trip. **Blockfall:** board invariants checked after random move sequences. **Store:** crashes injected during writes.

### 8.8 Formal specification and program correctness

`CS` · Target: U · Needs: 4.3, 2.6  
**Covers:** Hoare logic; preconditions and postconditions; weakest preconditions; loop invariants and variants; refinement; specification languages (TLA+, Alloy); model checking; SAT and SMT solvers (Z3); theorem provers (Coq, Lean, Isabelle awareness); abstract interpretation; static analysis (data-flow, taint); type-based verification; design-by-contract tooling; proof vs testing trade-offs; verified-software examples; specifying concurrent and distributed protocols.  
**Why:** testing checks executions; formal reasoning establishes properties across all of them.  
**Builds:** Concept lesson: Store's replication or Blockfall's game state machine specified in TLA+ or Alloy and model-checked.

### 8.9 CI/CD, build systems, and release engineering

`SE` · Target: E · Needs: 1.8, 8.6  
**Covers:** build tools (make, ninja, bazel concepts); incremental and cached builds; reproducible builds; CI pipelines (build, test, lint, type check, security scan); branch protection and required checks; pre-commit hooks; artifacts and registries; environments and promotion; deployment strategies (rolling, blue/green, canary); feature flags; rollback; release versioning and changelogs; monorepo vs polyrepo; trunk-based development; **gates an agent cannot skip**; dependency update bots.  
**Why:** agents use `--no-verify` and edit CI to make checks pass.  
**Builds:** Each project gets a build pipeline that runs its tests, linters and architecture checks. **Framework** is packaged as a NuGet package, and **Board** consumes the package, not the source.

### 8.10 Privacy, compliance, ethics, licensing, and law

`SE` · Target: U · Needs: 8.1  
**Covers:** data classification and PII; GDPR, CCPA, HIPAA, SOC 2, ISO 27001 awareness; retention and deletion; consent; audit trails; open-source licenses (MIT, Apache, GPL, AGPL); copyright and generated code; export-control awareness; safety-critical standards awareness (IEC 61508, DO-178C, ISO 26262); professional ethics; accessibility law; responsible AI use; contracts and SLAs.  
**Why:** non-technical constraints still decide what you may build.  
**Builds:** **Board:** a user's data can be exported and deleted, and no personal data reaches the logs. **Framework:** choosing its open-source licence.

### 8.11 Measuring code health over time

`AI` · Target: E · Needs: 3.6, 8.9  
**Covers:** code-health metrics (growth, duplication, complexity, coupling, churn, test counts, mutation score); ratchets (never let a metric get worse); architecture fitness functions; sampled review; cost and time tracking; long-run health dashboards; detecting drift.  
**Why:** if you can't measure, "the codebase is getting better" is a feeling.  
**Builds:** **Kit:** `health`, which measures size, duplication, complexity and dependency rules for any project, and fails when a number gets worse. It runs on every project.

---

# STAGE 9: OPERATIONS AND LARGE-SCALE ARCHITECTURE

### 9.1 Deployment, containers, and orchestration

`SE` · Target: A · Needs: 5.9, 8.4  
**Covers:** hosting options (VPS, platform-as-a-service, serverless, static); process managers; reverse proxies; Docker (images, layers, volumes, networking); Compose; registries; orchestration and Kubernetes concepts (pods, services, deployments) and **when not to use them**; service discovery; configuration and secrets in deployment; zero-downtime deploys; health checks; rollbacks; edge and CDN.  
**Why:** agents default to over-built infrastructure for small problems.  
**Builds:** **Board**, **Framework** and **Store** run in containers behind a reverse proxy.

### 9.2 Infrastructure as code and cloud primitives

`SE` · Target: A · Needs: 9.1  
**Covers:** IaaS, PaaS, SaaS; compute, storage, network, and identity primitives; VPCs; regions and availability zones; managed services; IaC (Terraform, CloudFormation, Pulumi); configuration management; immutable infrastructure; GitOps; cost model and FinOps; lock-in; quotas; security groups; secrets managers.  
**Why:** infrastructure you can review, diff, and reproduce.  
**Builds:** **Board:** its whole environment described as code.

### 9.3 Observability and site reliability

`SE` · Target: A · Needs: 1.10, 9.1  
**Covers:** logs, metrics, traces; structured logging; correlation IDs; OpenTelemetry; dashboards; symptom-based alerting; SLIs, SLOs, error budgets; the four golden signals; on-call; incident response; runbooks; blameless postmortems; capacity planning; toil; debugging in production; audit logging; keeping PII out of logs.  
**Why:** you can't fix what you can't see, and agents log nothing useful or log secrets.  
**Builds:** **Framework:** structured logging, a correlation-ID middleware and a metrics endpoint. **Netkit:** a log follower that reads them.

### 9.4 Scalability, availability, and capacity

`SE` · Target: R · Needs: 4.11, 7.10, 2.10  
**Covers:** vertical vs horizontal scaling; stateless design; load balancing; caching layers; CDNs; sharding; read replicas; queues for smoothing load; backpressure; autoscaling; bottleneck analysis; Little's law; queueing theory (introduction); the Universal Scalability Law; capacity planning; redundancy and failover; multi-region; disaster recovery; cost vs complexity; tail latency.  
**Why:** scale changes the design, not just the hardware.  
**Builds:** **Netkit:** a load generator aimed at Board. **Board:** caching through Store, and the bottleneck found and fixed.

### 9.5 Architectural styles

`SE` · Target: E · Needs: 3.5, 7.6  
**Covers:** layered architecture; hexagonal/ports-and-adapters; clean architecture; modular monolith; microservices; service-oriented architecture; event-driven architecture; CQRS and event sourcing; serverless; plugin architectures; pipes and filters; peer-to-peer; client-server; monolith vs distributed system; choosing based on team, deployment, data, and failure boundaries; migration between styles.  
**Why:** architecture is a set of trade-offs, not a diagram or a fashionable label.  
**Builds:** **Board:** server-rendered templates compared with a React client that uses Framework's JSON API. **Framework:** its view layer adjusted until both work. Also: a modular monolith compared with splitting notifications into a separate service.

### 9.6 Domain-driven design in depth

`DOM` `SE` · Target: R · Needs: 2.8, 3.5  
**Covers:** bounded contexts; context maps; aggregates and consistency boundaries; domain services; application services; repositories; domain events; anti-corruption layers; strategic vs tactical DDD; event storming; when DDD is overkill.  
**Why:** large domains need explicit boundaries and a shared language.  
**Builds:** **Board:** bounded contexts (boards, identity, notifications) as separate C# projects, plus an anti-corruption layer for importing another tool's export.

### 9.7 Migrations and evolution

`SE` · Target: E · Needs: 3.10, 7.8  
**Covers:** schema migration; expand-migrate-contract; zero-downtime changes; API versioning and deprecation; data backfills; dual writes and their hazards; feature flags; strangler migrations; compatibility windows; rollback vs roll-forward; evolutionary architecture; preserving behavior while changing structure.  
**Why:** real systems evolve; they are not rebuilt from a clean slate every time.  
**Builds:** **Board:** a schema change done as expand, migrate, contract, and an API version retired. **Ledger:** its storage format moved from version 1 to version 2.

### 9.8 Trade-offs, decisions, and software economics

`SE` · Target: E · Needs: 2.10, 3.5  
**Covers:** build vs buy; total cost of ownership; lifecycle cost; opportunity cost; complexity budgets; risk; reversibility; options value; decision matrices (and their limits); ADRs; technical debt economics; premature optimization; local vs global optimization; choosing boring technology; communicating trade-offs.  
**Why:** senior engineering is largely the ability to make and defend decisions under constraints.  
**Builds:** Decision records across projects. **Framework** compared honestly with an established framework: when would you use either?

### 9.9 Project, process, and organizational practice

`SE` · Target: A · Needs: 1.12, 3.11  
**Covers:** agile principles; Scrum and Kanban (mechanics, not rituals); iterative delivery; vertical slicing; estimation and uncertainty; prioritization; risk registers; stakeholder communication; technical leadership; code review culture; ownership; bus factor; team topology; Conway's law; incident learning; working with product and domain experts.  
**Why:** software is built by people and organizations, not code alone.  
**Builds:** **Board:** a release planned as vertical slices.

### 9.10 Real-time and embedded systems

`CS` `SE` · Target: U · Needs: 5.10, 7.1  
**Covers:** hard vs soft real-time; deadlines and jitter; worst-case execution time; scheduling (rate-monotonic, EDF); interrupt latency; deterministic behavior; fixed-point arithmetic; resource constraints; watchdogs; fail-safe states; RTOS concepts; hardware-in-the-loop testing; safety integrity levels; control loops.  
**Why:** when timing is a correctness requirement, average performance is not enough.  
**Builds:** **Blockfall:** a fixed-timestep loop with a frame budget. **Machine:** deadlines enforced with a timer interrupt.

---

# STAGE 10: NUMERICS, GEOMETRY, GRAPHICS, AND SPECIALIZATIONS

### 10.1 Numerical computing I: error, conditioning, stability

`CS` · Target: E · Needs: 5.2  
**Covers:** floating-point error; absolute vs relative error; ULPs; error propagation; catastrophic cancellation; conditioning vs stability; summation algorithms; tolerance design (absolute plus relative); comparison; overflow and underflow; rounding; robust numeric code; interval arithmetic; exact and rational arithmetic; arbitrary precision; cross-platform determinism; unit handling.  
**Why:** a program can be logically correct and numerically wrong. Tolerances are decisions, not details.  
**Builds:** **Ledger:** rounding rules for money. Concept lesson in Python: catastrophic cancellation and tolerances.

### 10.2 Linear algebra for computing

`CS` · Target: R · Needs: 10.1  
**Covers:** vectors; dot and cross products; matrices; transformations; determinants and inverses; solving linear systems (Gaussian elimination, LU); QR; SVD; eigenvalues; least squares; norms; conditioning; sparse matrices; BLAS and LAPACK; NumPy vectorization and broadcasting; row-major vs column-major layout.  
**Why:** the working language of graphics, geometry, simulation, and machine learning.  
**Builds:** **Renderer** starts: vectors and matrices in C++. **Blockfall:** rotation as a matrix. Links to the linear algebra course.

### 10.3 Numerical methods

`CS` · Target: R · Needs: 10.1, 10.2  
**Covers:** root finding (bisection, Newton, secant); interpolation (polynomial, spline); numerical differentiation and integration (trapezoid, Simpson, Gaussian quadrature); ODE solvers (Euler, Runge-Kutta, implicit and stiff solvers); PDE basics (finite differences, finite elements awareness); optimization (gradient descent, Newton, constrained, linear programming, convex); FFT and signal processing; curve fitting; Monte Carlo; error control and adaptive step sizes.  
**Why:** how to compute continuous things on a discrete machine, with controlled error.  
**Builds:** Concept lessons in Python with NumPy: root finding, integration, and an ODE solver.

### 10.4 Geometry and transforms

`CS` · Target: R · Needs: 10.2  
**Covers:** Euclidean coordinates; reference frames; homogeneous coordinates and 4x4 transforms; composition and order; rotations (matrices, Euler angles and gimbal lock, axis-angle, quaternions); projections; handedness and the right-hand rule; transform hierarchies and scene graphs; forward and inverse kinematics (introduction); affine vs projective.  
**Why:** world, camera, and object coordinates become something you can calculate.  
**Builds:** **Renderer:** a camera, homogeneous transforms and a scene graph.

### 10.5 Computational geometry

`CS` · Target: R · Needs: 10.4, 4.12  
**Covers:** geometric primitives; robust predicates (orientation, in-circle); convex hull; polygon operations (clipping, offsetting, booleans); triangulation (Delaunay); Voronoi diagrams; point location; spatial indexing (k-d tree, BVH, R-tree); intersection tests; distance queries; mesh structures (half-edge, winged-edge); mesh boolean operations; tolerance in geometry; degeneracies; exact vs floating computation.  
**Why:** booleans and offsets fail at degeneracies; knowing why is the difference between a toy and a kernel.  
**Builds:** **Renderer:** triangle rasterization, clipping and a bounding-volume hierarchy.

### 10.6 Curves, surfaces, and solid representations

`CS` · Target: R · Needs: 10.5  
**Covers:** parametric curves (Bezier, B-splines, NURBS); surfaces; curvature; offsetting; boundary representation (topology plus geometry); constructive solid geometry; meshes; implicit surfaces and signed distance fields; voxels, dexels, heightmaps; representation trade-offs; tessellation; file formats (STEP, STL, IGES); geometric-kernel awareness; feature trees and parametric history.  
**Why:** choosing the right representation for the question is most of what makes modeling correct and simulation fast.  
**Builds:** **Renderer:** Bezier curves and an OBJ mesh loader (parsing again, in a third language).

### 10.7 Graphics and GPU programming

`CS` · Target: U · Needs: 10.4, 5.4  
**Covers:** the rendering pipeline; rasterization; depth buffers; shading models; ray tracing and path tracing; textures and lighting; shaders (GLSL, WGSL); graphics APIs (OpenGL, Vulkan, WebGL, WebGPU); GPU architecture; GPGPU (CUDA, compute shaders); parallel patterns on the GPU; color spaces; image formats; 2D vector graphics (SVG, canvas); fonts and text rendering.  
**Why:** displaying and accelerating spatial and numeric work.  
**Builds:** **Renderer:** a ray tracer. **Blockfall:** a WebGL renderer replaces the canvas one, which the logic/rendering boundary from 3.2 makes possible.

### 10.8 Simulation and control

`CS` · Target: R · Needs: 10.3, 10.4  
**Covers:** numerical integration for dynamics; rigid-body physics; collision detection; constraint solvers; discrete-event simulation; fixed vs variable time steps; determinism; kinematics and dynamics; control theory (PID, stability, feedback); state estimation (Kalman filters, awareness); co-simulation.  
**Why:** verifying behavior against a model of the physical world.  
**Builds:** Concept lesson in Python: a pendulum with a PID controller, run with fixed and with variable time steps. Links to the simulation course.

### 10.9 Probability, statistics, and machine-learning foundations

`CS` · Target: U · Needs: 4.9  
**Covers:** distributions; estimation; hypothesis testing; confidence intervals; regression; bias and variance; classification; clustering; neural-network basics; gradient descent and backpropagation; overfitting; evaluation metrics; data leakage; feature engineering; deployment concerns and drift; causal vs correlational reasoning; common statistical pitfalls.  
**Why:** to judge claims made with data, and to understand the models you direct.  
**Builds:** **Blockfall:** the computer player's weights tuned from recorded games. Concept lessons link to the machine learning courses.

### 10.10 LLM-powered systems

`AI` · Target: A · Needs: 1.11, 7.9  
**Covers:** prompting as an interface; structured outputs; tool and function calling; retrieval-augmented generation (chunking, embeddings, vector search, reranking); evaluations; agent architectures; memory; guardrails; cost and latency; caching; fine-tuning vs prompting (awareness); safety; prompt-injection defense; observability for LLM applications; MCP and connectors; multi-agent coordination; human-in-the-loop design.  
**Why:** building products where an LLM is a component, not just your assistant.  
**Builds:** Optional Python piece: a small tool-calling loop around a language model, with permissions and logging. Links to the AI engineering course.

### 10.11 Human-computer interaction and accessibility

`SE` · Target: U · Needs: none  
**Covers:** usability heuristics; mental models; affordances; feedback; error prevention; information architecture; interaction design; user-research basics; WCAG; screen readers; keyboard navigation; color contrast; cognitive load; forms; internationalization; human factors and safety-critical interfaces; prototyping.  
**Why:** software is used by people; accessibility is also a legal and quality requirement.  
**Builds:** **Ledger:** full keyboard use and screen-reader labels. **Board:** an accessibility audit of its templates and its React client. **Blockfall:** a colour-blind palette and key remapping.

### 10.12 Frontend and UI engineering

`SE` · Target: U · Needs: 7.5, 2.7  
**Covers:** HTML, CSS, JavaScript; the DOM and event model; the browser rendering pipeline; component frameworks and state management; reactivity; bundlers; SPA vs SSR vs static; routing; forms and validation; performance (Core Web Vitals); the browser security model (same-origin policy); web APIs; WebAssembly; PWAs; UI testing; design systems.  
**Why:** most users see your system through a UI.  
**Builds:** **Board:** the React client gains state management, routing and a build step. **Framework:** a static-asset pipeline.

### 10.13 Mobile and desktop applications

`SE` · Target: U · Needs: 10.12  
**Covers:** native vs cross-platform; app lifecycle; UI toolkits; packaging, signing, and stores; permissions and sandboxing; offline operation and sync; background tasks; push notifications; updates; local storage; embedding web views (for example, pywebview); platform differences.  
**Why:** distribution and platform constraints change the architecture.  
**Builds:** **Ledger:** packaged as an installable desktop app, then synced with a Framework API while still working offline.

### 10.14 Games and real-time interactive systems

`SE` · Target: U · Needs: 7.10, 10.8  
**Covers:** the game loop; fixed vs variable timestep; entity-component-system; scene management; input; audio; netcode (client prediction, rollback, lag compensation, authoritative servers, interest management); determinism; tick rates; asset pipelines; persistence; anti-cheat awareness; performance budgets.  
**Why:** a concentrated example of state, time, networking, and performance together.  
**Builds:** **Blockfall:** replays from recorded inputs (determinism), and why an entity-component system is the wrong tool for this game.

### 10.15 Data engineering and analytics

`SE` · Target: U · Needs: 7.9, 7.12  
**Covers:** ETL and ELT; batch vs stream; dimensional modeling (star schema); warehouses, lakes, lakehouses; orchestration; data quality and lineage; partitioning and columnar formats; BI and dashboards; schema evolution; MapReduce and Spark concepts; change data capture; data governance; moving from notebooks to production.  
**Why:** where company data becomes decisions.  
**Builds:** **Kit:** a pipeline from Ledger's export into reporting tables (a star schema).

### 10.16 Scientific and engineering computing workflows

`CS` `SE` · Target: U · Needs: 10.1, 10.3  
**Covers:** reproducibility; notebooks; units and dimensional analysis; numerical-library ecosystems; HPC basics (MPI, OpenMP); job schedulers; floating-point reproducibility; scientific file formats (HDF5, NetCDF); visualization; provenance; validation against known solutions; verification and validation of simulations; uncertainty quantification.  
**Why:** engineering software must be trusted, which means demonstrably checked.  
**Builds:** Concept lesson: a reproducible analysis of Ledger data, with its inputs and versions recorded.

---

# STAGE 11: WHERE THE LABS WENT

The original deconstruction labs are now pieces of the growing projects, built at the modules that teach each mechanism.

| Lab                                    | Now                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| L1 A number to a game                  | Blockfall, 1.4 to 7.11                                              |
| L2 A tiny CPU and VM                   | Machine, 5.1 to 5.5                                                 |
| L3 A tiny compiler                     | Toylang, 6.1 to 6.7                                                 |
| L4 A key-value store                   | Store, 7.2 to 7.13                                                  |
| L5 A relational query engine           | Kit's `query`, 7.8                                                  |
| L6 An HTTP server                      | Netkit and Framework, 7.5                                           |
| L7 A job queue                         | Framework's jobs package, 7.12                                      |
| L8 A version control system            | Kit's `snap`, 4.10 and 5.7                                          |
| L9 A controller and G-code interpreter | Dropped: domain-specific; the app's G-code and CNC courses cover it |
| L10 A geometry kernel slice            | Renderer, 10.4 to 10.6                                              |
| L11 A material-removal simulation      | Dropped: domain-specific; the app's CNC labs cover it               |
| L12 A multiplayer netcode loop         | Blockfall, 7.10 and 7.11                                            |
| L13 A scheduler and paging simulator   | Machine, 5.8 and 5.9                                                |
| L14 A small agent harness              | Optional Python piece, 10.10                                        |
| L15 A muddy-codebase rescue            | Supplied paired codebases, 3.10                                     |

---

# APPENDIX A: Connections (learn once, recognize everywhere)

| Concept                  | Where it appears                                                         |
| ------------------------ | ------------------------------------------------------------------------ |
| State and who owns it    | Variables, objects, databases, caches, UIs, kernels, distributed systems |
| Invariants               | Algorithms, schemas, domain models, API contracts, tests, proofs         |
| Queues                   | Scheduling, networking, job processing, event systems, buffers           |
| Graphs                   | Dependencies, imports, networks, workflows, navigation, compilers        |
| Trees                    | File systems, parsers, ASTs, databases, UI hierarchies, scene graphs     |
| State machines           | Protocols, controllers, parsers, lifecycles, authentication              |
| Boundaries and contracts | Functions, modules, APIs, services, teams, syscalls                      |
| Idempotency              | HTTP, queues, migrations, retries, payments                              |
| Caching                  | CPU, OS, databases, HTTP, applications                                   |
| Transactions             | Databases, payments, distributed workflows, file systems                 |
| Ownership and lifetime   | Memory, files, connections, locks, tasks, leases                         |
| Representation           | Integers, floats, text, formats, geometry, schemas                       |
| Tolerance and error      | Floating point, geometry, measurement, simulation, timeouts              |
| Trade-offs               | Every design choice; nothing is free                                     |

# APPENDIX B: Frontier and niche areas (catalog only; outside the core, worth knowing exist)

| Area                                         | What it is                                                          |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Hardware description and FPGAs               | Designing circuits in HDL (Verilog, VHDL); reconfigurable hardware  |
| Quantum computing                            | Qubits, gates, algorithms (Shor, Grover), error correction          |
| Blockchain and distributed ledgers           | Consensus under adversaries, smart contracts, cryptographic ledgers |
| Robotics                                     | Perception, planning, kinematics, ROS-style middleware              |
| Bioinformatics and computational science     | Sequence analysis, molecular simulation, domain pipelines           |
| Programming language implementation research | Type theory, program synthesis, probabilistic programming           |
| Operating-system development                 | Writing kernels, bootloaders, drivers from scratch                  |
| High-performance computing                   | Clusters, MPI, GPU clusters, performance engineering at scale       |
| Safety-critical certification                | Formal certification processes in aerospace, medical, automotive    |
| Digital signal processing                    | Filters, transforms, audio and radio processing                     |

---

# APPENDIX C: Progress tracker

Mark U, R, A, E as you demonstrate each level.

| ID    | Module                                 | U   | R   | A   | E   |
| ----- | -------------------------------------- | --- | --- | --- | --- |
| 1.1   | Computation, information, programs     | [ ] | [ ] | [ ] | [ ] |
| 1.2   | Logic and Boolean algebra              | [ ] | [ ] | [ ] | [ ] |
| 1.3   | Number systems, integer representation | [ ] | [ ] | [ ] | [ ] |
| 1.4   | State, identity, execution             | [ ] | [ ] | [ ] | [ ] |
| 1.5   | Functions, scope, call stack           | [ ] | [ ] | [ ] | [ ] |
| 1.6   | Shell, files, tooling                  | [ ] | [ ] | [ ] | [ ] |
| 1.7   | Reading technical sources              | [ ] | [ ] | [ ] | [ ] |
| 1.8   | Version control, diffs, review         | [ ] | [ ] | [ ] | [ ] |
| 1.9   | Verification I                         | [ ] | [ ] | [ ] | [ ] |
| 1.10  | Errors and debugging                   | [ ] | [ ] | [ ] | [ ] |
| 1.11  | How LLMs and agents work and fail      | [ ] | [ ] | [ ] | [ ] |
| 1.12  | Working in small verified steps        | [ ] | [ ] | [ ] | [ ] |
| 2.1   | Option space of software               | [ ] | [ ] | [ ] | [ ] |
| 2.2   | Data I: storage and shapes             | [ ] | [ ] | [ ] | [ ] |
| 2.3   | Sets, relations, functions             | [ ] | [ ] | [ ] | [ ] |
| 2.4   | Data II: schemas and formats           | [ ] | [ ] | [ ] | [ ] |
| 2.5   | Requirements, constraints, non-goals   | [ ] | [ ] | [ ] | [ ] |
| 2.6   | Invariants and contracts               | [ ] | [ ] | [ ] | [ ] |
| 2.7   | State machines                         | [ ] | [ ] | [ ] | [ ] |
| 2.8   | Domain modeling                        | [ ] | [ ] | [ ] | [ ] |
| 2.9   | Domain-to-architecture translation     | [ ] | [ ] | [ ] | [ ] |
| 2.10  | Estimating scale and shape             | [ ] | [ ] | [ ] | [ ] |
| 2.11  | Text, time, locale                     | [ ] | [ ] | [ ] | [ ] |
| 3.1   | Abstraction and interfaces             | [ ] | [ ] | [ ] | [ ] |
| 3.2   | Boundaries and layers                  | [ ] | [ ] | [ ] | [ ] |
| 3.3   | OO design in practice                  | [ ] | [ ] | [ ] | [ ] |
| 3.4   | Patterns and anti-patterns             | [ ] | [ ] | [ ] | [ ] |
| 3.5   | Architectural reasoning                | [ ] | [ ] | [ ] | [ ] |
| 3.6   | Executable architecture                | [ ] | [ ] | [ ] | [ ] |
| 3.7   | Plausible-but-wrong code catalog       | [ ] | [ ] | [ ] | [ ] |
| 3.8   | Quality and refactoring                | [ ] | [ ] | [ ] | [ ] |
| 3.9   | Technical debt, over-engineering       | [ ] | [ ] | [ ] | [ ] |
| 3.10  | Rescuing a muddy codebase              | [ ] | [ ] | [ ] | [ ] |
| 3.11  | Documentation and repo conventions  | [ ] | [ ] | [ ] | [ ] |
| 3.12  | Workflow II                            | [ ] | [ ] | [ ] | [ ] |
| 3.13  | Designing for change                   | [ ] | [ ] | [ ] | [ ] |
| 3.14  | Skeleton first                         | [ ] | [ ] | [ ] | [ ] |
| 4.1   | Data structures I                      | [ ] | [ ] | [ ] | [ ] |
| 4.2   | Recursion, induction, recurrences      | [ ] | [ ] | [ ] | [ ] |
| 4.3   | Algorithmic reasoning                  | [ ] | [ ] | [ ] | [ ] |
| 4.4   | Complexity                             | [ ] | [ ] | [ ] | [ ] |
| 4.5   | Data structures II                     | [ ] | [ ] | [ ] | [ ] |
| 4.6   | Algorithms I                           | [ ] | [ ] | [ ] | [ ] |
| 4.7   | Algorithms II: graphs                  | [ ] | [ ] | [ ] | [ ] |
| 4.8   | Algorithms III                         | [ ] | [ ] | [ ] | [ ] |
| 4.9   | Discrete math                          | [ ] | [ ] | [ ] | [ ] |
| 4.10  | Graph theory and trees                 | [ ] | [ ] | [ ] | [ ] |
| 4.11  | Performance and profiling              | [ ] | [ ] | [ ] | [ ] |
| 4.12  | Specialized structures                 | [ ] | [ ] | [ ] | [ ] |
| 5.1   | Digital logic                          | [ ] | [ ] | [ ] | [ ] |
| 5.2   | Representation II                      | [ ] | [ ] | [ ] | [ ] |
| 5.3   | Architecture I                         | [ ] | [ ] | [ ] | [ ] |
| 5.4   | Architecture II                        | [ ] | [ ] | [ ] | [ ] |
| 5.5   | Memory                                 | [ ] | [ ] | [ ] | [ ] |
| 5.6   | Resource ownership and lifetimes       | [ ] | [ ] | [ ] | [ ] |
| 5.7   | Information theory                     | [ ] | [ ] | [ ] | [ ] |
| 5.8   | OS I                                   | [ ] | [ ] | [ ] | [ ] |
| 5.9   | OS II                                  | [ ] | [ ] | [ ] | [ ] |
| 5.10  | Hardware interfaces                    | [ ] | [ ] | [ ] | [ ] |
| 6.1   | PL fundamentals                        | [ ] | [ ] | [ ] | [ ] |
| 6.2   | Types I                                | [ ] | [ ] | [ ] | [ ] |
| 6.3   | Types II                               | [ ] | [ ] | [ ] | [ ] |
| 6.4   | Automata and regular languages         | [ ] | [ ] | [ ] | [ ] |
| 6.5   | Grammars and parsing                   | [ ] | [ ] | [ ] | [ ] |
| 6.6   | Compilers I                            | [ ] | [ ] | [ ] | [ ] |
| 6.7   | Compilers II                           | [ ] | [ ] | [ ] | [ ] |
| 6.8   | Interpreters, VMs, GC                  | [ ] | [ ] | [ ] | [ ] |
| 6.9   | Paradigms compared                     | [ ] | [ ] | [ ] | [ ] |
| 6.10  | Functional theory                      | [ ] | [ ] | [ ] | [ ] |
| 6.11  | Metaprogramming and DSLs               | [ ] | [ ] | [ ] | [ ] |
| 6.12  | Computability and complexity theory    | [ ] | [ ] | [ ] | [ ] |
| 7.1   | Concurrency I                          | [ ] | [ ] | [ ] | [ ] |
| 7.2   | Concurrency II                         | [ ] | [ ] | [ ] | [ ] |
| 7.3   | Concurrency III                        | [ ] | [ ] | [ ] | [ ] |
| 7.4   | Networking I                           | [ ] | [ ] | [ ] | [ ] |
| 7.5   | Networking II                          | [ ] | [ ] | [ ] | [ ] |
| 7.6   | APIs and protocol design               | [ ] | [ ] | [ ] | [ ] |
| 7.7   | Relational model and SQL               | [ ] | [ ] | [ ] | [ ] |
| 7.8   | Database internals                     | [ ] | [ ] | [ ] | [ ] |
| 7.9   | Non-relational stores                  | [ ] | [ ] | [ ] | [ ] |
| 7.10  | Distributed systems I                  | [ ] | [ ] | [ ] | [ ] |
| 7.11  | Distributed systems II                 | [ ] | [ ] | [ ] | [ ] |
| 7.12  | Queues, streams, events, jobs          | [ ] | [ ] | [ ] | [ ] |
| 7.13  | Reliability engineering                | [ ] | [ ] | [ ] | [ ] |
| 8.1   | Security fundamentals                  | [ ] | [ ] | [ ] | [ ] |
| 8.2   | Cryptography                           | [ ] | [ ] | [ ] | [ ] |
| 8.3   | Application and web security           | [ ] | [ ] | [ ] | [ ] |
| 8.4   | Supply chain, deps, secrets            | [ ] | [ ] | [ ] | [ ] |
| 8.5   | Memory safety and low-level vulns      | [ ] | [ ] | [ ] | [ ] |
| 8.6   | Testing strategy                       | [ ] | [ ] | [ ] | [ ] |
| 8.7   | Property, fuzz, mutation testing       | [ ] | [ ] | [ ] | [ ] |
| 8.8   | Formal specification and correctness   | [ ] | [ ] | [ ] | [ ] |
| 8.9   | CI/CD and release engineering          | [ ] | [ ] | [ ] | [ ] |
| 8.10  | Privacy, compliance, ethics, law       | [ ] | [ ] | [ ] | [ ] |
| 8.11  | Measuring code health                  | [ ] | [ ] | [ ] | [ ] |
| 9.1   | Deployment and containers              | [ ] | [ ] | [ ] | [ ] |
| 9.2   | IaC and cloud                          | [ ] | [ ] | [ ] | [ ] |
| 9.3   | Observability and SRE                  | [ ] | [ ] | [ ] | [ ] |
| 9.4   | Scalability and availability           | [ ] | [ ] | [ ] | [ ] |
| 9.5   | Architectural styles                   | [ ] | [ ] | [ ] | [ ] |
| 9.6   | DDD in depth                           | [ ] | [ ] | [ ] | [ ] |
| 9.7   | Migrations and evolution               | [ ] | [ ] | [ ] | [ ] |
| 9.8   | Trade-offs and economics               | [ ] | [ ] | [ ] | [ ] |
| 9.9   | Project, process, organization         | [ ] | [ ] | [ ] | [ ] |
| 9.10  | Real-time and embedded                 | [ ] | [ ] | [ ] | [ ] |
| 10.1  | Numerical computing I                  | [ ] | [ ] | [ ] | [ ] |
| 10.2  | Linear algebra                         | [ ] | [ ] | [ ] | [ ] |
| 10.3  | Numerical methods                      | [ ] | [ ] | [ ] | [ ] |
| 10.4  | Geometry and transforms                | [ ] | [ ] | [ ] | [ ] |
| 10.5  | Computational geometry                 | [ ] | [ ] | [ ] | [ ] |
| 10.6  | Curves, surfaces, solids               | [ ] | [ ] | [ ] | [ ] |
| 10.7  | Graphics and GPU                       | [ ] | [ ] | [ ] | [ ] |
| 10.8  | Simulation and control                 | [ ] | [ ] | [ ] | [ ] |
| 10.9  | Probability, statistics, ML            | [ ] | [ ] | [ ] | [ ] |
| 10.10 | LLM-powered systems                    | [ ] | [ ] | [ ] | [ ] |
| 10.11 | HCI and accessibility                  | [ ] | [ ] | [ ] | [ ] |
| 10.12 | Frontend and UI                        | [ ] | [ ] | [ ] | [ ] |
| 10.13 | Mobile and desktop                     | [ ] | [ ] | [ ] | [ ] |
| 10.14 | Games and real-time interactive        | [ ] | [ ] | [ ] | [ ] |
| 10.15 | Data engineering and analytics         | [ ] | [ ] | [ ] | [ ] |
| 10.16 | Scientific computing workflows         | [ ] | [ ] | [ ] | [ ] |

**Projects:** Kit [ ] Blockfall [ ] Ledger [ ] Framework [ ] Board [ ] Machine [ ] Toylang [ ] Store [ ] Netkit [ ] Renderer [ ]

---

## Final operating principle

The objective is not to memorize this catalog, collect design-pattern names, or become a faster typist than an agent. The objective is to develop enough technical understanding and engineering judgment to remain responsible for the system:

1. Understand the real problem and the domain well enough to recognize a wrong model.
2. Understand the mechanisms well enough to predict how a design behaves and where it can fail.
3. Choose representations, algorithms, boundaries, and architecture for explicit reasons.
4. Give whoever implements it, a teammate or an agent, precise constraints, examples, acceptance criteria, and room to propose alternatives.
5. Verify behavior independently through tests, analysis, inspection, and operational evidence.
6. Keep the system understandable as it changes: simplify, consolidate, remove, measure, and enforce its boundaries.

**Someone else, or an agent, can produce the implementation. You remain the engineer responsible for deciding whether that implementation is the right one.**
