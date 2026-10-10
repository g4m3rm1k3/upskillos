# The Bootcamp: full-stack software engineer — plan

**Status:** planned 2026-10-09 with the owner, over several rounds:

1. An ordinary issue-tracker project was rejected as not interesting enough.
2. The owner asked for practice that makes the learner build their own tools and libraries, learn parsing and other computer science, and practise what job listings ask for: turning business requirements into solutions on an agile team.
3. The owner chose to **use the unfinished spreadsheet series (`spreadsheet-build`) as the bootcamp's practice project**, and decided:
   - **the back end is C# / ASP.NET Core**, as the spreadsheet plan already said;
   - **the matrix language and Python-in-the-browser stay; the .NET MAUI desktop app becomes an optional elective.**
4. The owner added two subjects: **styling, taught properly**, and **how to give users access to machine learning**.
5. The owner set the framing: **this is a bootcamp, not an app course.** The spreadsheet is the tool every skill is practised on, not the goal. The plan below is organised by what the learner learns.
6. The owner made **security** a requirement throughout, as job listings make it: the spreadsheet gets accounts, admins and permissions, and every language construct the bootcamp adds (formulas, the matrix language, Python cells, AI functions) is treated as code users run, with its own security rules. See *Security in every module*.
7. The owner asked for **real database capabilities**: the product becomes *Excel meets Access*. Module 4, *The spreadsheet becomes a database*, does that.
8. The owner asked for **a full development environment and a full API**, like Project Studio rather than VBA, with support for several languages. Module 5, *A development environment inside the spreadsheet*, does that.
9. After a gap analysis, the owner approved ten more subjects so the bootcamp covers what a working engineer is expected to know: Linux and the network, software design and architecture, services and message brokers, the cloud, front-end architecture, file uploads, search, payments, email and internationalisation, how computers work, the UX process, privacy law, Git beyond merging, and product analytics. Eight are new sprints; the rest extend existing ones.
10. The owner's standing concern: **it must teach, not dump code and concepts.** *Making sure it teaches* says how that's checked.
11. The owner set the shape of every section: **learn it, experiment with it, then see how it's applied in the real world.** Styling is a styling section first (learn CSS, experiment in a playground), and only then applied to the app. The same goes for every subject. See *Learn, experiment, apply* below.

Waiting for the owner's approval of this version. No new lessons are written yet.

This plan extends [spreadsheet-build-curriculum-improved.md](spreadsheet-build-curriculum-improved.md), which still holds:

- the teaching rules (§3, §7–§11, §18);
- the detail of the sprints this plan takes from it;
- the owner decisions (§23).

## What it is

A full-stack software engineering bootcamp, the kind that prepares someone for a six-figure engineering job, for a person who already loves to code but taught themselves by hacking. It covers what a strong bootcamp covers, and goes deeper where self-taught developers are usually thin: testing, security, databases, computer science, shipping to production, and working on a team from real requirements.

**The practice project.** Every skill is first learned and experimented with on its own, then applied to one codebase that grows the whole way through: a spreadsheet application the learner builds from an empty folder. A spreadsheet is a good practice field because it needs nearly everything a bootcamp teaches:

- a user interface people actually use, which has to look good and work for everyone;
- a programming language inside it (formulas), which needs parsing and an interpreter;
- a server, a database, accounts and permissions, once teams share workbooks;
- live collaboration, background work, integrations and machine learning, once businesses depend on it.

Working on one codebase for the whole bootcamp is itself part of the training. Engineers spend most of their careers changing code that already exists, and the learner lives with every decision they made earlier.

**The clients.** Four fictional businesses bring vague briefs, change their minds mid-sprint and have the work demoed to them. They're how requirements, agile delivery and stakeholder communication are taught.

**The end.** Interview practice, a capstone for a client the learner finds themselves, and the job hunt.

## Who it's for

- **Assumed:** the learner writes code and gets things working: Python or JavaScript scripts, hacked together. The spreadsheet plan's §2 list is the formal minimum. Everything professional is taught when it's first needed.
- **For the self-taught hacker:** early modules (terminal, git, HTML) move quickly for someone who has hacked before. The checks are the same either way, so what the learner already knows goes fast.
- **Two languages:** TypeScript in the browser and C# on the server, the combination many business-software teams hire for. C# is taught from its first line, compared with TypeScript and Python.

## Learning outcomes

By the end, the learner can:

1. **Turn a business requirement into working software:** ask the right questions, write user stories and acceptance criteria, estimate, deliver in sprints, and handle a change of mind.
2. **Work on an agile team:** branches and pull requests, code review given and received, design docs, retrospectives, feature flags.
3. **Build the front end:** HTML, CSS and styling done properly, a design system, React, accessibility, front-end performance and testing.
4. **Build the back end:** HTTP from the wire up, ASP.NET Core APIs, SQL and EF Core, transactions, background jobs, integrations.
5. **Secure what they build, by habit:** threat modelling, accounts and sessions, admins, roles and permissions enforced on the server, the common attacks and their fixes, running user-written code safely, and cryptography used correctly. Security is part of every module, not a module at the end.
6. **Design and build with databases, from the inside:** normalise a messy spreadsheet into tables, write SQL, and explain how a database runs a query, uses an index and survives a crash, because they've built one.
7. **Build developer tools:** a typed public API, an editor with language services, a debugger, and extensions with permissions.
8. **Give users machine learning:** models trained from users' own data, models served from a server, language-model features, each evaluated honestly and secured.
9. **Use computer science where it matters:** parsing and interpreters, graphs, caching, concurrency and conflict resolution, complexity.
10. **Ship and run software:** CI, containers, deployment, monitoring, incidents and releases.
11. **Work in code they didn't write,** and contribute to open source.
12. **Get hired:** pass coding, system design and behavioural interviews, with a portfolio that proves the skills.

Honest note: a bootcamp can't promise a salary or a job. This one can build the skills, the portfolio and the interview practice that six-figure roles ask for.

## How the bootcamp teaches

### Learn, experiment, apply

Each module is a run of sprints, and **every sprint is a section on one subject** (styling, SQL, parsing, authentication, machine learning…) in three parts, always in this order:

1. **Learn.** The subject on its own terms, taught from the beginning: what it is, how it works, why it exists. Nothing in this part depends on the spreadsheet.
2. **Experiment.** Hands-on play in a **playground**: a folder of its own in the learner's repository (`playground/<sprint>-<subject>/`), separate from the app. Small pages, scripts, queries and tests the learner changes freely. They predict what will happen, try it, and break things on purpose. For styling, this means pages of layout puzzles, specificity battles, a type scale to tune and a theme to swap. For SQL, it means a scratch database to query and wreck. For machine learning, it means toy data to fit and overfit.
3. **Apply in the real world.** "Here's how it's used for real." The same subject is put to work on the spreadsheet, usually for a client, with the constraints real work brings: an existing codebase, a brief, a deadline, a change of mind, tests that must keep passing. The lesson points out what's different from the playground and why.

Then the sprint's **challenge** and **solution** (below).

The spreadsheet is never the reason a subject is taught. The subject is the reason, and the spreadsheet is where the learner sees it working in a real codebase. Sprints 0–7 were written before this rule. They teach inside the app, and spike 1 decides whether they get playground parts added.

### Clients and agile delivery

From Module 2 on, each module is a **release for a client**. The briefs are supplied, vague on purpose and a little contradictory, as real ones are.

| Module | Client | What they need | The change halfway through |
|---|---|---|---|
| 2 and 4 | **Crumb & Co.**, a bakery with three shops | their old spreadsheets imported, recipes that scale with batch size, stock that warns when it runs low, the app in their brand | "Wholesale customers get tiered prices." |
| 6 | **Northside Clinic** | shared workbooks on a server, appointments with no double booking, privacy, an audit trail | "Reception may see allergies after all, but never notes." |
| 7–8 | **Haul Logistics** | carriers' CSV files, live shared boards, alerts, partner webhooks, weekly reports; then predictions of which shipments will be late | "A new carrier sends dates as `DD/MM/YY`." |
| 9 | **Fieldday**, a volunteer nonprofit | public sign-up forms anyone can use, on their phones | "Half our volunteers use screen readers." |

Every release runs the same way, so the habits stick:

1. **The brief** arrives. The learner writes their questions for the client *before* the supplied answers are created, then compares them.
2. **Wireframes and a five-minute usability test**: a rough sketch of the screens, shown to a real person before anything is built, because the cheapest bug to fix is the one in a drawing.
3. **User stories** with acceptance criteria (*Given / When / Then*) go into `docs/backlog.md`, and the criteria become failing **acceptance tests**.
4. **Estimate and plan** the sprint: what fits, what's cut, what "done" means.
5. **Build**, a story per branch and pull request, with a GitHub Issue for each.
6. **The change request** arrives mid-release. The learner re-plans.
7. **Sprint review** (a demo script run against the acceptance tests) and a **retrospective** in `docs/retros/`.

A client usually needs something the spreadsheet can't do yet. The learner adds it in a general way, then delivers the client's solution with it. This is how product teams split platform work from client work.

### Challenges and solutions

Every sprint ends with a pair, as Sprint 7 already does with 7.7, *Challenge: Negative Numbers*:

- **Challenge.** The learner applies the sprint's skills alone: a spec, the public interface the code must have, and acceptance tests. No code is shown. There's a hint ladder (nudge, concept, shape) but no answer.
- **Solution.** The next lesson goes through a reference solution step by step, explains its choices, and compares it with alternatives.
  - **If the learner's version passes the tests and keeps the public interface, they keep it.** Later sprints depend only on that interface, which is a lesson in itself.
  - **Otherwise they type the reference version,** in small explained steps.

7.7 gets its solution lesson (`07-08-…`) first, as the model for the rest.

### Computer science that comes back

Parsing returns six times, each harder, each needed by a feature:

1. **formulas** (Sprint 7, written): tokens, recursive descent, trees;
2. **a matrix language** (Sprint 18): a full interpreter with source locations;
3. **a view language** (Sprint 39), in C#: `status = "open" and due < today()` compiled to parameterised SQL, adding code generation and a second language;
4. **SQL** (Sprint 24): a real query language, run by an engine of your own;
5. **a small Lisp** (Sprint 33's challenge): a language of your own, plugged into the product;
6. **cron schedules** (Sprint 51): "every Monday at 9", with time zones and daylight saving.

The CSV reader (Sprint 16) is a state machine, the parser's simpler cousin. Graphs (Sprint 8), caching (Sprints 8, 53, 58) and conflict resolution (Sprint 72) come back the same way. The interview module then names and drills what the learner has already used.

### Security in every module

Job listings name security in almost every role, and interviewers ask about it in every round. So security isn't one module: **every module has a security part**, taught in the same learn → experiment → apply way, and every challenge's acceptance tests include at least one security requirement.

| Module | Security, in that module |
|---|---|
| 1 Foundations | secrets never in Git (1.5); `textContent`, never `innerHTML`, for anything a user typed (XSS, Sprint 3); formulas evaluated by our own interpreter, never `eval` (Sprint 7); packages and lockfiles as a supply chain, `npm audit` (Sprint 4) |
| 2 Front end | imported files as untrusted input (size limits, validation); **CSV injection** (a cell starting with `=` that runs in someone else's Excel); a file format that is checked, not trusted, on load |
| 3 Languages | running user-written code: resource limits (a formula or script that never ends, or eats memory), capabilities (a function can only do what it was given), what a Web Worker isolates and what it doesn't, a Content Security Policy, third-party packages loaded into Pyodide |
| 4 Database | SQL injection: a `=QUERY` built by pasting cell text into SQL, attacked and then fixed with parameters; constraints as data integrity; the security checklist applied to `=QUERY`, the first construct that can read whole tables at once |
| 5 Development environment | extensions declare permissions and the user approves them; scripts run sandboxed, with limits; triggers can't be used to run code a user didn't approve; shared extensions as a supply chain; why VBA macros became an attack route, and what this design does differently |
| 6 Back end | threat model from the clinic's assets; **accounts and sessions**; **admins, roles and permissions**; attacks on the app as tests; audit trail; encryption |
| 7 Distributed | authorisation on every real-time message, not only at connection; signed webhooks and replay protection; API keys with scopes; SSRF through user-supplied URLs; rate limits |
| 8 Machine learning | training only on data the user may read; prompt injection through cell text; per-workspace cost limits as abuse protection; never sending private data to a model without saying so |
| 9 Interfaces | permissions shown honestly in the interface (a disabled control says why), without the interface ever being the thing that enforces them |
| 10 Shipping | secrets management; least privilege for the deployed app and its database user; dependency and secret scanning in CI; security headers; logs without personal data; a security incident drill |
| 11 Team | security in code review (a supplied pull request hides an authorisation bug); responsible disclosure in open source |
| 12 Interviews | security questions in system design (where authorisation happens, how sessions are revoked, how a multi-tenant database keeps tenants apart) |

**Every language construct passes the same checklist.** The bootcamp keeps adding constructs: formula functions, ranges, the matrix language, Python cells, custom functions, automations' conditions, view filters, AI functions. Each one gets these questions, in its lesson, with a test for each answer:

1. **Can it run forever, or use unbounded memory?** Then it has a limit, and the limit is tested.
2. **What can it reach?** Only what it's given (cells, ranges, a sandbox), never the network, the file system or the page, unless that's its job.
3. **Can it read data the user isn't allowed to see?** A formula that refers to another workbook, a lookup into a protected range, a Python cell reading a range, an AI function summarising cells, a view filter over a table: **each one is checked against the user's permissions, on the server, at the moment it runs**. A construct must never become a way around the permission system. (Sprint 42's tests try exactly that.)
4. **Can its output attack someone else?** Text it produces is shown with `textContent`; anything exported is escaped for where it's going (CSV, HTML, SQL).
5. **Is it logged?** Constructs that read across permission boundaries, or cost money, are audited.

### Making sure it teaches

A bootcamp that covers everything and teaches none of it well is worthless, and the easy failure for a big curriculum is the **code dump**: a step that hands over forty lines with a paragraph of names, and a learner who types it, sees green checks, and has learned to type. These are the rules that prevent that, and how each is checked.

**The shape of a step.** A problem the learner can see, first. Then a prediction. Then a change of **3 to 15 lines**, explained before it's typed and traced after, line by line, with each new name or idea explained where it first appears. Then the learner runs it, and an experiment changes or breaks something on purpose. A bigger step is split, not justified.

**Explaining, not describing.** Small steps are necessary but not enough: a step can be twelve lines and still only *name* what it does. The bar is the Q-Arcade series after its explanation rework (`tracks/qarcade-corridor/01-02-the-q-table.md` is the example). Every lesson has:

- **The story so far**, in plain words: what the earlier lessons built and the few terms this one relies on, without a jargon recap table.
- **What this lesson builds**, with a picture (a diagram, a table of the finished result, or the output it will print), so the learner knows where each step is heading.
- **What each test protects**, for every supplied test file: which bug each group of tests would catch, and why that bug matters later.
- **An inputs-and-returns table** for every function the learner writes: each input, what it is, an example value; what it returns, with an example.
- **The mechanism, not the name**, for every new call or idea: what it actually does, traced with real values (a trace, a worked example, or a REPL session whose output was checked by running it), and why the obvious alternative fails.

The teaching check looks for each of these, and the read-through (gate 4) judges whether they explain.

**The shape of a lesson.** At least one prediction, at least one experiment, and a Your turn that needs a decision, not a copy. Everything the Your turn needs was taught earlier in the lesson or before it.

**Five gates, before a sprint counts as done:**

1. **The walkthrough** (`spreadsheetBuild.desktop.test.js`): every check is right, every wrong answer is caught, every prediction's answer is what the code really does. *This proves the lessons are correct, not that they teach.*
2. **The teaching check** (`node scripts/check-bootcamp-teaching.mjs`): it follows every file through the track, including what the learner writes in Your turns, and reports each step's real size (over 15 lines is big, over 30 a dump), the explanation per line, and any lesson without a prediction, an experiment or a Your turn. **No dumps, and every big step either split or recorded in the audit with the reason it can't be.** (A step whose point is the repetition, like 2.2's typed table, is the kind of reason that counts.)
3. **The concept ledger.** Each lesson lists what it teaches and what it uses, in its front matter (`teaches:`, `uses:`), and the teaching check fails when a lesson uses a concept no earlier lesson taught. That's how "nothing used before it's taught" is enforced across 450 lessons, instead of remembered.
4. **A read-through as the learner.** Before a sprint is marked done, it's read start to finish knowing only the earlier lessons. Each Your turn is attempted from the text alone, before the hints, and anything that needed knowledge from outside the lesson, or a hint that gives the answer away, is fixed. Findings go in `docs/bootcamp-audit.md`.
5. **The owner does the lessons.** That's the real test. Notes from doing them are fixed before the next sprint is written.

"Covered" in this plan means it passed all five, never that it's mentioned in a table.

## The curriculum

Sprints 0–7 are written: 42 lessons in `src/labs/project-studio/tracks/spreadsheet-build/`. Their file names are learners' progress keys and never change. The plan order is the writing order. Lesson counts are estimates: about 5 per sprint plus the challenge and solution, roughly 450 lessons in all.

In the tables, **Learn and experiment** is the sprint's subject, taught and played with in its playground. **Apply in the real world** is how it's then put to work on the spreadsheet. **Source** "SP *n*" means the content of the spreadsheet plan's sprint *n*, with anything added listed.

### Module 1 — Professional foundations

From hacking to working like an engineer: the tools, two languages' worth of fundamentals, testing, and the first real computer science.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 0–7 | the terminal, Node, git and GitHub, HTML and CSS basics, JavaScript from Python, the DOM, npm and Vite, TypeScript, testing, recursion, trees, lexing and parsing | a grid on the page, cells you can edit, a formula language with a lexer, parser and evaluator, cycle detection; challenge 7.7 | SP 0–7, **written** |
| 8 | graphs, topological order, caching, measuring performance before and after | recalculating only the cells an edit affects | SP 8 |
| 9 | function registries, variadic and lazy evaluation, error propagation | ranges and functions: `SUM`, `AVERAGE`, `IF` | SP 9 |

### Module 2 — Front-end engineering (client: Crumb & Co.)

Requirements and agile delivery start here. On the technical side: React, styling done properly, performance, design patterns, and data import.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 10 | requirements: questions for a client, user stories, acceptance criteria as acceptance tests (Vitest), estimating, planning a sprint, the definition of done | the bakery's brief, turned into a backlog and failing tests | new |
| 11 | React: components, props, state, events, hooks, rendering | the sheet's interface moved to React, with the engine kept separate | SP 10 |
| 12 | front-end architecture: routing between pages, server state with TanStack Query (caching, invalidation, optimistic updates), code splitting and Core Web Vitals; server-side rendering and static generation in outline (the ideas behind Next.js), and when a product needs them | the spreadsheet becomes an app with pages (workbooks, settings, sharing), fast to load | new |
| 13 | **styling and design systems** (the whole sprint is a styling section, in a playground of pages): the box model, the cascade and specificity, flexbox and grid in depth, custom properties as design tokens, spacing and type scales, responsive layout and container queries, theming and dark mode, motion and `prefers-reduced-motion`; CSS Modules, then Tailwind, compared; building accessible components (button, input, menu, dialog); matching a mockup with DevTools; visual regression tests with Playwright screenshots; working from a designer's handoff in Figma | the bakery's brand guide and mockup turned into the app's look and its own small component library | new |
| 14 | measuring before optimising, the browser's Performance panel, virtualised rendering, memoisation | a sheet with a huge number of rows that stays smooth | SP 11 |
| 15 | the command pattern, undo and redo, relative and absolute references, `git bisect` | undo, copy/paste, fill, `$A$1` | SP 12 |
| 16 | serialisation, versioned file formats, migrations, round-trip tests, async file APIs, a CSV reader as a state machine, streaming a large file | saving workbooks; importing the bakery's messy CSV files | SP 13, extended |
| 17 | modelling typed data; validation; handling a change request; running a sprint review and a retrospective | typed columns, structured tables (`Orders[Total]`), `XLOOKUP`, data validation, conditional formatting: the bakery's tiered prices | new |

### Module 3 — Languages and libraries

The computer science module: interpreters, running code safely, and publishing a library others can use.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 18 | building an interpreter: matrices, indexing, broadcasting, source locations, interpreter errors | a MATLAB-like language in the sheet, compared with OpenMat's transpiler | SP 14 |
| 19 | Web Workers, message protocols, the browser event loop, cancellation | Python and NumPy (Pyodide) running on a selected range | SP 15 |
| 20 | running untrusted code safely: the language-construct checklist (above), resource limits, capability boundaries, what a worker really isolates, a Content Security Policy | custom functions like `=TAX(A1)` in several languages, each with tests that a hostile one can't hang the sheet, reach the network or read the page | SP 16, extended |
| 21 | library design: a public API, semver, changelogs, documentation; property-based testing and fuzzing (fast-check); packing and publishing | the formula engine published as its own package | new |

### Module 4 — The spreadsheet becomes a database (client: Crumb & Co., release 2)

The bakery is back: "Our order sheets are a mess. The same customer is typed five different ways, prices are copied by hand, and two sheets give different totals for the same week. We want it to work like a real database, but still feel like our spreadsheet." That's the most common story in business software, and the product this module builds is **Excel meets Access**: a spreadsheet whose tables are a real relational database, queried with SQL from a cell, with Access-style forms, reports and a relationships diagram.

As everywhere, it's built by hand first (relational tables, a SQL parser, a query engine, a B-tree index, a write-ahead log), then checked against and replaced by the professional tool, SQLite. The server module after it then moves the same tables and the same SQL to a server.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 22 | why spreadsheets fail as databases: duplication, update and delete anomalies; normalisation (first, second and third normal form) worked from a real mess; entities and relationships on paper | the bakery's supplied order workbook, analysed and redesigned as tables, with the brief, backlog and acceptance tests | new |
| 23 | the relational model: tables, typed columns, primary keys, foreign keys, constraints (`NOT NULL`, `UNIQUE`, `CHECK`), referential integrity and what happens on delete (restrict, cascade, set null) | **tables as first-class sheets**: a schema, keys, linked records (a cell that points to a row in another table), constraint errors shown in the cell | new |
| 24 | SQL as a language: `SELECT`, `WHERE`, `JOIN`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`; **the fifth parser**: SQL into a tree; parameters instead of text pasted into a query | `=QUERY("SELECT …")`, whose result spills into the grid below the cell, with cell references passed as parameters | new |
| 25 | running queries: relational algebra; the iterator (Volcano) model; nested-loop and hash joins; grouping and aggregation; sorting; `NULL` and three-valued logic | the engine behind `=QUERY`, its results recalculated when the tables change (the dependency graph from Sprint 8) | new |
| 26 | indexes and query planning: **a B-tree built by hand**; when an index helps and when it costs; a simple planner that chooses one; your own `EXPLAIN`; measured at 100,000 rows; full-text search (SQLite's FTS5) and ranking | `CREATE INDEX`, and a view of each query's plan | new |
| 27 | transactions and durability: atomicity, a write-ahead log, crash recovery (a test pulls the plug halfway through a save), isolation basics | saving that survives a crash mid-write; multi-cell edits that apply completely or not at all | new |
| 28 | the professional tool: SQLite compiled to WebAssembly; **a conformance suite** running the same queries on your engine and on SQLite; storage in the browser (the Origin Private File System); knowing when to stop building and use the tool | the sheet's tables stored in SQLite, with your engine kept and checked against it | new |
| 29 | Access-style tools: a relationships diagram (graph layout), a visual query builder that writes SQL, data-entry forms generated from a table's schema, grouped reports with totals | the bakery's order-entry form and weekly sales report; their sprint review | new |

### Module 5 — A development environment inside the spreadsheet

Spreadsheets have always been programmable, and the programming has usually been miserable: VBA's editor has barely changed in decades, with no types, no tests, no version control, and macros so easy to abuse that offices learned to block them. This module builds what that should have been, modelled on the environment you're learning in: a **typed scripting API**, an **editor with real language services**, a **debugger**, **extensions with permissions**, and **several languages** behind one interface. Building developer tools is also some of the best computer science practice there is: you're writing tools that understand code.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 30 | designing a public API: an object model (workbook, sheet, range, table, query, events), what to expose and what to keep private, naming, versioning and deprecation, type definitions as documentation; an API is a contract, pinned by tests | **the spreadsheet's scripting API**, with the `.d.ts` file that describes it and contract tests that keep it stable | new |
| 31 | building a development environment: embedding Monaco (the editor inside VS Code); language services (completion, hover, errors as you type) for TypeScript, checked against the API's types, and for the formula language, using your own parser; the Language Server Protocol, in outline | **a script editor inside the sheet**: files and tabs, completion that knows the API, inline errors, a console, a Run button | new |
| 32 | debuggers from the inside: breakpoints, stepping and inspecting variables, **built into the matrix-language interpreter you wrote**; source maps and stack traces, so an error in any language points at the right line | stepping through a matrix-language script line by line, watching its variables; script errors that open the editor at the line | new |
| 33 | extensions done safely: triggers (on edit, on open, a button, a menu), custom functions written as scripts, a **manifest declaring the permissions** an extension needs, which the user approves (the security checklist again); tests for scripts; packaging and sharing an extension; why macros became one of the most common ways into a company | the bakery's "close the day" script as an extension: a button, declared permissions, and tests. **Module challenge: add a language of your own**, a small Lisp, written and plugged in through the language interface (the sixth parser) | new |

Languages in the finished product: **formulas**, **TypeScript and JavaScript** (scripts and extensions), **Python** (Pyodide), **the matrix language**, **SQL** (`=QUERY` and the database), and any language added through the plugin interface from Sprint 20, as the module challenge shows. Outside the product, the REST API, the generated SDK and the command-line tool (Sprint 52) expose the same object model, so the sheet can be scripted from any language on any computer.

### Module 6 — Back-end engineering and security, in C# (client: Northside Clinic)

A second language, servers, databases and security, driven by a client with legal requirements.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 34 | non-functional requirements (privacy, audit) written so they can be tested; threat modelling from assets; privacy law (GDPR): consent, retention, a person's right to export and delete their data | the clinic's brief, backlog and threat model | new |
| 35 | C# from zero: the .NET SDK, types, classes, records, collections, LINQ, exceptions, async, NuGet, xUnit (8–10 lessons); threads and async in depth, locks and deadlocks | a console tool that reads a workbook and summarises it | SP 17 |
| 36 | HTTP from the wire up, then ASP.NET Core | saving workbooks through a server | SP 19 |
| 37 | software design and architecture: SOLID, the patterns you'll meet every week (strategy, adapter, repository, observer), dependency injection with a container, layered ("clean") architecture, code smells and refactoring | the server reorganised into layers, with its dependencies injected and its tests faster for it | new |
| 38 | the same tables on a server: SQLite, then EF Core and migrations; transactions across users, with a race condition reproduced and fixed | workbooks and their tables stored on the server; appointments that can't double-book | SP 20, extended |
| 39 | a second parser in a second language; code generation; parameterised SQL and why string-built SQL is an injection; query plans; the N+1 problem | filtered, sorted, grouped views compiled to SQL | new |
| 40 | porting code between languages; conformance test suites shared by two implementations | the formula engine in C#, kept identical to the TypeScript one | new |
| 41 | authentication: password hashing and why not SHA-256, salts, sessions and cookies (and their flags) vs tokens, signing out everywhere, rate-limiting sign-in, multi-factor sign-in (TOTP), password reset by single-use link | accounts: sign up, sign in, sign out, reset a password, turn on a second factor | SP 21, extended |
| 42 | authorisation: roles (owner, admin, editor, commenter, viewer), least privilege, checks in one place on the server, policy engines, row-, column- and range-level rules, **the confused-deputy problem** (formulas, Python cells and AI functions reading around permissions), testing authorisation as a matrix of role × action | **workspaces with admins**: an admin console to invite and remove people, change roles, deactivate an account and see the audit log; sharing a workbook; protected ranges; reception can't read notes, by any route, including a formula | new |
| 43 | attacking your own app: injection, XSS, CSRF, SSRF, broken access control (changing an id in a URL, a viewer calling an editor's endpoint, a formula reading a protected range), denial of service through user code, secrets in git, vulnerable packages | each attack written as a test, run against the app, then fixed | new |
| 44 | event sourcing; rebuilding state from events; diff algorithms (longest common subsequence); deleting a person's data from a history that never forgets | the clinic's audit trail and version history; their sprint review | new |
| 45 | key derivation, authenticated encryption, Web Crypto, key management, threat-model limits | private workbooks the server can't read | SP 23 |

### Module 7 — Distributed and asynchronous systems (client: Haul Logistics)

Real-time, offline, background work, scheduling, integrations and reporting.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 46 | splitting a large brief into releases; integration requirements | Haul's brief, and the `DD/MM/YY` change request | new |
| 47 | WebSockets, SignalR, operations vs snapshots, ordering, conflicts, a CRDT by hand | two people editing one workbook | SP 22, extended |
| 48 | local state, operation queues, retries, idempotency, eventual consistency | editing offline in the browser and syncing later | SP 24 (browser) |
| 49 | state machines, job queues, background services, retries and backoff; email done properly: templates, deliverability, unsubscribe | automations: triggers, conditions in the formula language, actions | new |
| 50 | services and messages: a message broker (RabbitMQ), event-driven design, at-least-once delivery and idempotent consumers, when to split a service out and when not to (monolith first); REST compared with GraphQL and gRPC | the automations engine moved behind a queue, as its own service; a gRPC endpoint for a partner | new |
| 51 | a cron parser; time zones and daylight saving; testing time with a fake clock | scheduled automations | new |
| 52 | API design with OpenAPI, generated SDKs, command-line tools, API keys and scopes, signed webhooks (HMAC), OAuth 2.0 | an API, a TypeScript SDK, a `dotnet tool` command line, "Sign in with GitHub" | new |
| 53 | aggregation in SQL, caching (an LRU cache by hand, then the framework's), load testing | pivot tables and Haul's weekly report; their sprint review | new |
| 54 | files: uploads (multipart), validation and size limits, object storage (S3 or Azure Blob, then a local emulator), signed URLs, image thumbnails as a background job | Haul's proof-of-delivery photos, attached to shipments | new |
| 55 | taking payments: Stripe in test mode, Checkout, verifying webhooks, handling an event twice safely, subscription states | plans for the spreadsheet itself: a free tier and a paid one, enforced on the server | new |

### Module 8 — Machine learning for your users (Haul Logistics, release 2)

Haul asks which shipments will be late. The learner learns how to put machine learning in users' hands, safely and honestly, and practises it by letting any user train and use models from their own data. As everywhere else, it's built by hand first, then with the professional tool.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 56 | what a model is; least squares by hand, then gradient descent; train/test splits and why training accuracy lies; scikit-learn; presenting evaluation honestly to non-experts | `=TREND`, `=FORECAST`, and models trained on a range with `=PREDICT(model, A2:D2)`, with a held-out score and overfitting warnings | new |
| 57 | serving models: ONNX, ONNX Runtime in ASP.NET Core, model versioning, logging predictions, drift | Haul's late-shipment model served from the server, with a model registry page | new |
| 58 | building on language models: keeping keys on the server, streaming, caching, cost limits, structured output, prompt injection, evaluating non-deterministic features | `=AI("summarise", A2)` and `=EXTRACT(...)`; the challenge: plain English in, a formula out, validated by the learner's own parser and type checker | new |

### Module 9 — Accessible, tested user interfaces (client: Fieldday)

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 59 | accessibility in depth (labels, focus, screen readers, contrast, axe), mobile-first layout, component tests (Testing Library) and end-to-end tests (Playwright); internationalisation: translated text, locale-aware dates, numbers and currencies | public sign-up forms generated from a table's columns | new |

### Module 10 — Shipping and operating software

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 60 | continuous integration: lint, typecheck, tests in both languages, build verification | a GitHub Actions pipeline that runs the conformance suite too | SP 25 |
| 61 | containers, Compose, swapping a database provider | the server and PostgreSQL in Docker | new |
| 62 | Linux, the shell and the network: bash, files and permissions, processes and signals, SSH and keys, package managers; DNS, TCP, ports, TLS certificates, proxies, CORS properly; WSL on Windows | a Linux server reached over SSH, the app run on it by hand once, so the platform's magic is no longer magic | new |
| 63 | deployment, managed databases, secrets, migrations on deploy, rollback | the app live at a public URL | new |
| 64 | the cloud: accounts and IAM with least privilege, managed databases and storage, serverless functions, infrastructure as code (Terraform), cost and how to keep it near zero; Kubernetes in outline, and why a small team rarely needs it | the deployment described as code, rebuilt from nothing with one command | new |
| 65 | observability: structured logs, health checks, OpenTelemetry, error tracking; incident response and blameless postmortems; product analytics: events, funnels and A/B tests | an incident drill on the live app | new |
| 66 | semver, release notes, production builds, configuration, clean-machine install tests | a tagged release someone else can install | SP 26 |
| E | *Elective:* native desktop apps with .NET MAUI | the sheet as a desktop app; nothing later depends on it | SP 18 |

### Module 11 — Working on a team

| # | Learn and experiment | Apply in the real world |
|---|---|---|
| 67 | reading unfamiliar code fast; the debugger, `git blame` and `git bisect`; characterisation tests; refactoring in small safe steps | a supplied messy C# invoicing app: a bug fixed and a feature added |
| 68 | design docs (RFCs), code review given and received, feature flags, trunk-based development; Git beyond merging: rebase, interactive rebase, cherry-pick, pull requests with required reviews and checks | an RFC for a new spreadsheet feature; reviewing a supplied pull request |
| 69 | working with AI coding assistants: where they help, where they're wrong, tests as the specification, reviewing generated code | a feature built with an assistant, then checked |
| 70 | contributing to open source | a pull request to a real project |

### Module 12 — Interviews

Problem sets with tests, timed, solved with the interview method: clarify, examples, brute force, improve, test out loud. They're in TypeScript, and C# answers are accepted.

| # | You learn |
|---|---|
| 71 | Big-O measured, then reasoned; hash maps; two pointers; sliding window; stacks and queues; binary search |
| 72 | recursion; trees; BFS and DFS; heaps; topological sort; union-find |
| 73 | backtracking; memoisation; dynamic programming (LCS again, now named) |
| 74 | how computers work, for interviews and for debugging: processes and threads, the stack and the heap, garbage collection, caches and why memory layout matters, character encodings, how a request travels from a keypress to a server and back | a measured experiment for each, in C# and TypeScript | new |
| 75 | mock coding interviews: mixed timed problems, talked through |
| 76 | system design on something you know: the spreadsheet service for ten thousand companies (load balancing, replicas, sharding by workspace, queues, consistency trade-offs), measured where possible |
| 77 | system design interviews: the method, and written designs for a URL shortener, a chat app and a news feed |

### Module 13 — Getting hired

| # | You learn |
|---|---|
| 78 | **capstone:** delivering for a client you find yourself (a local business, a club, a friend's project, or a supplied brief): requirements, backlog, sprints, delivery, plus one new feature of your own design, deployed; no step-by-step code |
| 79 | **the job hunt:** a portfolio README; a resume written around evidence; behavioural stories (STAR) drawn from your own retrospectives and change requests; mock technical, design and behavioural interviews; the take-home; reading and negotiating an offer |

## Portfolio: what the learner ends with

1. **The spreadsheet application**, deployed and released, as evidence of every module: a design system, formulas, a matrix language, Python cells, relational tables queried with SQL, Access-style forms and reports, a scripting API with its own editor and debugger, views, permissions, live collaboration, offline sync, automations, user-trained models and language-model functions, an API, an SDK and a command line. Behind it are CI, tests at every level, monitoring and a security write-up.
2. **A scripting environment inside the product**: a typed API, an editor with language services, a debugger for your own language, and extensions with permissions.
3. **A relational database engine of your own**: SQL parser, query engine, B-tree index and write-ahead log, checked query for query against SQLite.
4. **A published library**, kept identical in TypeScript and C# by a shared conformance suite.
5. **Five client releases** with backlogs, acceptance tests, sprint reviews and retrospectives. This is the evidence for "implements business solutions from requirements on an agile team".
6. **A capstone** for a real or chosen client.
7. **An open-source pull request, a design doc and a postmortem.**
8. **A tested interview problem set** and three written system designs.

## What interviewers check, and where it's taught

| They check | Sprints |
|---|---|
| Turning requirements into working software | 10, 17, 22, 34, 46, 59, 78 |
| Agile teamwork | every client release; 68 |
| Front-end skill and styling | 2, 11–14, 59 |
| Building developer tools and APIs | 30–33, 52 |
| Software design and architecture | 37, 50 |
| Linux, networking and the cloud | 62, 64 |
| Back-end skill | 36–42, 49, 52, 54, 55 |
| Machine learning in a product | 56–58 |
| Testing without being asked | 6 on; 40 (conformance); 58 (evaluation sets); 59 |
| Security (and in every module) | 20, 41–43, 45, 52, 58 |
| Databases beyond basic queries | 22–29, 38, 39, 44, 53 |
| Computer science fundamentals | 7–9, 16, 18, 24–27, 31–33, 39, 40, 44, 47, 51, 56, 71–74 |
| Shipping and running software | 60–66 |
| Working in someone else's code | 67–70 |
| System design | 76, 77 |
| Behavioural interview, resume, portfolio | 79 |

## How it's organised in Project Studio

- **Series:** registered in `series.js` as key `spreadsheet` with prefix `spreadsheet-` and `sharedProject: true`, labelled *The Bootcamp — Full-Stack Software Engineer*. Every module works in the one learner project.
- **Chapters are modules:**
  - The existing `spreadsheet-build` folder holds Module 1 (Sprints 0–9). Its lessons stay where they are.
  - Each later module is a chapter folder named for its subject (`spreadsheet-frontend`, `spreadsheet-languages`, `spreadsheet-backend`, `spreadsheet-distributed`, `spreadsheet-ml`, …). Sprint numbers keep running across folders in the file names (`10-01-…`).
- **Learning profile:** `learningProfile.js` changes the `spreadsheet-build` line to describe the bootcamp, and adds a matching line for the series key.
- **Playgrounds** live in the learner's repository under `playground/`, outside the app's source, with their own small tests. Checks in the experiment part run those, so experimenting is checked without touching the app.
- **Lessons** follow the spreadsheet plan's §7 lesson contract and §18 rules, and the Project Studio format in `docs/contributing/project-studio-series.md`.
  - **Client materials** go in each chapter's `support/`: briefs, the client's answers, change requests and messy data. The client's answers are created only after a check confirms the learner wrote their questions.
  - **Agile artefacts** (backlog, sprint plans, retrospectives) are checked for their required parts, never for their wording.
- **Checks for the server:**
  - ASP.NET Core tests run in-process (`WebApplicationFactory`), so no server is left running.
  - SQLite needs no install. Docker arrives in Sprint 61, and the SQLite tests keep running, so checks never need Docker.
- **Outside services** use local stand-ins in the walkthrough: a bare git repository for GitHub, a fake host, a fake language model. The learner does the real thing.

## Spikes before writing

1. **Where the spreadsheet series stands:** walk Sprints 0–7 with the existing walkthrough, and read the spreadsheet plan's lesson-engine requirements (§16) to see which are already met.
2. **.NET on Windows:** the SDK version, `dotnet test` speed, and `WebApplicationFactory` in the walkthrough.
3. **Pyodide's download size** and caching (Sprint 19), and scikit-learn's size inside it (Sprint 56).
4. **Playwright's browser download**, once, with the owner's OK.
5. **Hosting:** a platform with a usable free tier for ASP.NET Core and Postgres in late 2026. Decided in Sprint 63.
6. **Language-model access:** which provider Sprint 58 teaches with, what a learner's full run costs (it must be pennies), and a local open-weights fallback for learners with no API key.

## Decisions made

- **By the owner:**
  - it's a bootcamp, and the spreadsheet is the practice project, not the goal;
  - every subject is learned, then experimented with in a playground, then applied in the real world;
  - use `spreadsheet-build` as that project;
  - C# / ASP.NET Core on the server;
  - keep the matrix language and Pyodide; MAUI becomes an optional elective;
  - styling taught properly; machine learning for users included.
- **By the agent:**
  - four clients, each a release with a mid-release change request;
  - every sprint ends with a challenge and a solution;
  - SQLite through Sprint 60, PostgreSQL from Sprint 61;
  - offline sync in the browser, so it doesn't depend on the elective;
  - interview problems in TypeScript, with C# answers accepted.
- **Written in plan order without review pauses,** once approved. The owner reviews by doing the lessons.

## Progress

| Sprint | Lessons | Walkthrough |
|---|---|---|
| 0–7 | written before this plan (spreadsheet series) | to be re-walked (spike 1) |
| 7.8 (solution to 7.7) onward | not written | |
