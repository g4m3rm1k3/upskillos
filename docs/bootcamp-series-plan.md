# The Bootcamp: full-stack software engineer — plan

**Status:** planned 2026-10-09 with the owner, over several rounds:

1. An ordinary issue-tracker project was rejected as not interesting enough.
2. The owner asked for practice that makes the learner build their own tools and libraries, learn parsing and other computer science, and practise what job listings ask for: turning business requirements into solutions on an agile team.
3. The owner chose to **use the unfinished spreadsheet series (`spreadsheet-build`) as the bootcamp's practice project**, and decided:
   - **the back end is C# / ASP.NET Core**, as the spreadsheet plan already said;
   - **the matrix language and Python-in-the-browser stay; the .NET MAUI desktop app becomes an optional elective.**
4. The owner added two subjects: **styling, taught properly**, and **how to give users access to machine learning**.
5. The owner set the framing: **this is a bootcamp, not an app course.** The spreadsheet is the tool every skill is practised on, not the goal. The plan below is organised by what the learner learns.
6. The owner set the shape of every section: **learn it, experiment with it, then see how it's applied in the real world.** Styling is a styling section first (learn CSS, experiment in a playground), and only then applied to the app. The same goes for every subject. See *Learn, experiment, apply* below.

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
5. **Secure what they build:** threat modelling, authentication and authorisation, the common attacks and their fixes, cryptography used correctly.
6. **Give users machine learning:** models trained from users' own data, models served from a server, language-model features, each evaluated honestly and secured.
7. **Use computer science where it matters:** parsing and interpreters, graphs, caching, concurrency and conflict resolution, complexity.
8. **Ship and run software:** CI, containers, deployment, monitoring, incidents and releases.
9. **Work in code they didn't write,** and contribute to open source.
10. **Get hired:** pass coding, system design and behavioural interviews, with a portfolio that proves the skills.

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
| 2 | **Crumb & Co.**, a bakery with three shops | their old spreadsheets imported, recipes that scale with batch size, stock that warns when it runs low, the app in their brand | "Wholesale customers get tiered prices." |
| 4 | **Northside Clinic** | shared workbooks on a server, appointments with no double booking, privacy, an audit trail | "Reception may see allergies after all, but never notes." |
| 5–6 | **Haul Logistics** | carriers' CSV files, live shared boards, alerts, partner webhooks, weekly reports; then predictions of which shipments will be late | "A new carrier sends dates as `DD/MM/YY`." |
| 7 | **Fieldday**, a volunteer nonprofit | public sign-up forms anyone can use, on their phones | "Half our volunteers use screen readers." |

Every release runs the same way, so the habits stick:

1. **The brief** arrives. The learner writes their questions for the client *before* the supplied answers are created, then compares them.
2. **User stories** with acceptance criteria (*Given / When / Then*) go into `docs/backlog.md`, and the criteria become failing **acceptance tests**.
3. **Estimate and plan** the sprint: what fits, what's cut, what "done" means.
4. **Build**, a story per branch and pull request, with a GitHub Issue for each.
5. **The change request** arrives mid-release. The learner re-plans.
6. **Sprint review** (a demo script run against the acceptance tests) and a **retrospective** in `docs/retros/`.

A client usually needs something the spreadsheet can't do yet. The learner adds it in a general way, then delivers the client's solution with it. This is how product teams split platform work from client work.

### Challenges and solutions

Every sprint ends with a pair, as Sprint 7 already does with 7.7, *Challenge: Negative Numbers*:

- **Challenge.** The learner applies the sprint's skills alone: a spec, the public interface the code must have, and acceptance tests. No code is shown. There's a hint ladder (nudge, concept, shape) but no answer.
- **Solution.** The next lesson goes through a reference solution step by step, explains its choices, and compares it with alternatives.
  - **If the learner's version passes the tests and keeps the public interface, they keep it.** Later sprints depend only on that interface, which is a lesson in itself.
  - **Otherwise they type the reference version,** in small explained steps.

7.7 gets its solution lesson (`07-08-…`) first, as the model for the rest.

### Computer science that comes back

Parsing returns four times, each harder, each needed by a feature:

1. **formulas** (Sprint 7, written): tokens, recursive descent, trees;
2. **a matrix language** (Sprint 17): a full interpreter with source locations;
3. **a view language** (Sprint 25), in C#: `status = "open" and due < today()` compiled to parameterised SQL, adding code generation and a second language;
4. **cron schedules** (Sprint 35): "every Monday at 9", with time zones and daylight saving.

The CSV reader (Sprint 15) is a state machine, the parser's simpler cousin. Graphs (Sprint 8), caching (Sprints 8, 37, 40) and conflict resolution (Sprint 32) come back the same way. The interview module then names and drills what the learner has already used.

## The curriculum

Sprints 0–7 are written: 42 lessons in `src/labs/project-studio/tracks/spreadsheet-build/`. Their file names are learners' progress keys and never change. The plan order is the writing order. Lesson counts are estimates: about 5 per sprint plus the challenge and solution, roughly 320 lessons in all.

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
| 12 | **styling and design systems** (the whole sprint is a styling section, in a playground of pages): the box model, the cascade and specificity, flexbox and grid in depth, custom properties as design tokens, spacing and type scales, responsive layout and container queries, theming and dark mode, motion and `prefers-reduced-motion`; CSS Modules, then Tailwind, compared; building accessible components (button, input, menu, dialog); matching a mockup with DevTools; visual regression tests with Playwright screenshots | the bakery's brand guide and mockup turned into the app's look and its own small component library | new |
| 13 | measuring before optimising, the browser's Performance panel, virtualised rendering, memoisation | a sheet with a huge number of rows that stays smooth | SP 11 |
| 14 | the command pattern, undo and redo, relative and absolute references, `git bisect` | undo, copy/paste, fill, `$A$1` | SP 12 |
| 15 | serialisation, versioned file formats, migrations, round-trip tests, async file APIs, a CSV reader as a state machine, streaming a large file | saving workbooks; importing the bakery's messy CSV files | SP 13, extended |
| 16 | modelling typed data; validation; handling a change request; running a sprint review and a retrospective | typed columns, structured tables (`Orders[Total]`), `XLOOKUP`, data validation, conditional formatting: the bakery's tiered prices | new |

### Module 3 — Languages and libraries

The computer science module: interpreters, running code safely, and publishing a library others can use.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 17 | building an interpreter: matrices, indexing, broadcasting, source locations, interpreter errors | a MATLAB-like language in the sheet, compared with OpenMat's transpiler | SP 14 |
| 18 | Web Workers, message protocols, the browser event loop, cancellation | Python and NumPy (Pyodide) running on a selected range | SP 15 |
| 19 | capability boundaries, untrusted code, isolation and what a worker really protects | custom functions like `=TAX(A1)` in several languages | SP 16 |
| 20 | library design: a public API, semver, changelogs, documentation; property-based testing and fuzzing (fast-check); packing and publishing | the formula engine published as its own package | new |

### Module 4 — Back-end engineering and security, in C# (client: Northside Clinic)

A second language, servers, databases and security, driven by a client with legal requirements.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 21 | non-functional requirements (privacy, audit) written so they can be tested; threat modelling from assets | the clinic's brief, backlog and threat model | new |
| 22 | C# from zero: the .NET SDK, types, classes, records, collections, LINQ, exceptions, async, NuGet, xUnit (8–10 lessons) | a console tool that reads a workbook and summarises it | SP 17 |
| 23 | HTTP from the wire up, then ASP.NET Core | saving workbooks through a server | SP 19 |
| 24 | SQL before EF Core, keys, indexes, migrations, transactions; a race condition reproduced and fixed | workbooks stored on the server; appointments that can't double-book | SP 20, extended |
| 25 | a second parser in a second language; code generation; parameterised SQL and why string-built SQL is an injection; query plans; the N+1 problem | filtered, sorted, grouped views compiled to SQL | new |
| 26 | porting code between languages; conformance test suites shared by two implementations | the formula engine in C#, kept identical to the TypeScript one | new |
| 27 | authentication vs authorisation, password hashing, sessions and tokens, policy engines | accounts, sharing, and row- and column-level rules: reception can't read notes | SP 21, extended |
| 28 | attacking your own app: injection, XSS, CSRF, SSRF, denial of service through user code, secrets in git, vulnerable packages | each attack written as a test, run against the app, then fixed | new |
| 29 | event sourcing; rebuilding state from events; diff algorithms (longest common subsequence) | the clinic's audit trail and version history; their sprint review | new |
| 30 | key derivation, authenticated encryption, Web Crypto, key management, threat-model limits | private workbooks the server can't read | SP 23 |

### Module 5 — Distributed and asynchronous systems (client: Haul Logistics)

Real-time, offline, background work, scheduling, integrations and reporting.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 31 | splitting a large brief into releases; integration requirements | Haul's brief, and the `DD/MM/YY` change request | new |
| 32 | WebSockets, SignalR, operations vs snapshots, ordering, conflicts, a CRDT by hand | two people editing one workbook | SP 22, extended |
| 33 | local state, operation queues, retries, idempotency, eventual consistency | editing offline in the browser and syncing later | SP 24 (browser) |
| 34 | state machines, job queues, background services, retries and backoff | automations: triggers, conditions in the formula language, actions | new |
| 35 | a cron parser; time zones and daylight saving; testing time with a fake clock | scheduled automations | new |
| 36 | API design with OpenAPI, generated SDKs, command-line tools, API keys and scopes, signed webhooks (HMAC), OAuth 2.0 | an API, a TypeScript SDK, a `dotnet tool` command line, "Sign in with GitHub" | new |
| 37 | aggregation in SQL, caching (an LRU cache by hand, then the framework's), load testing | pivot tables and Haul's weekly report; their sprint review | new |

### Module 6 — Machine learning for your users (Haul Logistics, release 2)

Haul asks which shipments will be late. The learner learns how to put machine learning in users' hands, safely and honestly, and practises it by letting any user train and use models from their own data. As everywhere else, it's built by hand first, then with the professional tool.

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 38 | what a model is; least squares by hand, then gradient descent; train/test splits and why training accuracy lies; scikit-learn; presenting evaluation honestly to non-experts | `=TREND`, `=FORECAST`, and models trained on a range with `=PREDICT(model, A2:D2)`, with a held-out score and overfitting warnings | new |
| 39 | serving models: ONNX, ONNX Runtime in ASP.NET Core, model versioning, logging predictions, drift | Haul's late-shipment model served from the server, with a model registry page | new |
| 40 | building on language models: keeping keys on the server, streaming, caching, cost limits, structured output, prompt injection, evaluating non-deterministic features | `=AI("summarise", A2)` and `=EXTRACT(...)`; the challenge: plain English in, a formula out, validated by the learner's own parser and type checker | new |

### Module 7 — Accessible, tested user interfaces (client: Fieldday)

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 41 | accessibility in depth (labels, focus, screen readers, contrast, axe), mobile-first layout, component tests (Testing Library) and end-to-end tests (Playwright) | public sign-up forms generated from a table's columns | new |

### Module 8 — Shipping and operating software

| # | Learn and experiment | Apply in the real world | Source |
|---|---|---|---|
| 42 | continuous integration: lint, typecheck, tests in both languages, build verification | a GitHub Actions pipeline that runs the conformance suite too | SP 25 |
| 43 | containers, Compose, swapping a database provider | the server and PostgreSQL in Docker | new |
| 44 | deployment, managed databases, secrets, migrations on deploy, rollback | the app live at a public URL | new |
| 45 | observability: structured logs, health checks, OpenTelemetry, error tracking; incident response and blameless postmortems | an incident drill on the live app | new |
| 46 | semver, release notes, production builds, configuration, clean-machine install tests | a tagged release someone else can install | SP 26 |
| E | *Elective:* native desktop apps with .NET MAUI | the sheet as a desktop app; nothing later depends on it | SP 18 |

### Module 9 — Working on a team

| # | Learn and experiment | Apply in the real world |
|---|---|---|
| 47 | reading unfamiliar code fast; the debugger, `git blame` and `git bisect`; characterisation tests; refactoring in small safe steps | a supplied messy C# invoicing app: a bug fixed and a feature added |
| 48 | design docs (RFCs), code review given and received, feature flags, trunk-based development | an RFC for a new spreadsheet feature; reviewing a supplied pull request |
| 49 | working with AI coding assistants: where they help, where they're wrong, tests as the specification, reviewing generated code | a feature built with an assistant, then checked |
| 50 | contributing to open source | a pull request to a real project |

### Module 10 — Interviews

Problem sets with tests, timed, solved with the interview method: clarify, examples, brute force, improve, test out loud. They're in TypeScript, and C# answers are accepted.

| # | You learn |
|---|---|
| 51 | Big-O measured, then reasoned; hash maps; two pointers; sliding window; stacks and queues; binary search |
| 52 | recursion; trees; BFS and DFS; heaps; topological sort; union-find |
| 53 | backtracking; memoisation; dynamic programming (LCS again, now named) |
| 54 | mock coding interviews: mixed timed problems, talked through |
| 55 | system design on something you know: the spreadsheet service for ten thousand companies (load balancing, replicas, sharding by workspace, queues, consistency trade-offs), measured where possible |
| 56 | system design interviews: the method, and written designs for a URL shortener, a chat app and a news feed |

### Module 11 — Getting hired

| # | You learn |
|---|---|
| 57 | **capstone:** delivering for a client you find yourself (a local business, a club, a friend's project, or a supplied brief): requirements, backlog, sprints, delivery, plus one new feature of your own design, deployed; no step-by-step code |
| 58 | **the job hunt:** a portfolio README; a resume written around evidence; behavioural stories (STAR) drawn from your own retrospectives and change requests; mock technical, design and behavioural interviews; the take-home; reading and negotiating an offer |

## Portfolio: what the learner ends with

1. **The spreadsheet application**, deployed and released, as evidence of every module: a design system, formulas, a matrix language, Python cells, typed tables, views, permissions, live collaboration, offline sync, automations, user-trained models and language-model functions, an API, an SDK and a command line. Behind it are CI, tests at every level, monitoring and a security write-up.
2. **A published library**, kept identical in TypeScript and C# by a shared conformance suite.
3. **Four client deliveries** with backlogs, acceptance tests, sprint reviews and retrospectives. This is the evidence for "implements business solutions from requirements on an agile team".
4. **A capstone** for a real or chosen client.
5. **An open-source pull request, a design doc and a postmortem.**
6. **A tested interview problem set** and three written system designs.

## What interviewers check, and where it's taught

| They check | Sprints |
|---|---|
| Turning requirements into working software | 10, 16, 21, 31, 41, 57 |
| Agile teamwork | every client release; 48 |
| Front-end skill and styling | 2, 11, 12, 13, 41 |
| Back-end skill | 23–27, 34, 36 |
| Machine learning in a product | 38–40 |
| Testing without being asked | 6 on; 26 (conformance); 40 (evaluation sets); 41 |
| Security | 27, 28, 30, 36, 40 |
| Databases beyond basic queries | 24, 25, 29, 37 |
| Computer science fundamentals | 7–9, 15, 17, 25, 26, 29, 32, 35, 38, 51–53 |
| Shipping and running software | 42–46 |
| Working in someone else's code | 47–50 |
| System design | 55, 56 |
| Behavioural interview, resume, portfolio | 58 |

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
  - SQLite needs no install. Docker arrives in Sprint 43, and the SQLite tests keep running, so checks never need Docker.
- **Outside services** use local stand-ins in the walkthrough: a bare git repository for GitHub, a fake host, a fake language model. The learner does the real thing.

## Spikes before writing

1. **Where the spreadsheet series stands:** walk Sprints 0–7 with the existing walkthrough, and read the spreadsheet plan's lesson-engine requirements (§16) to see which are already met.
2. **.NET on Windows:** the SDK version, `dotnet test` speed, and `WebApplicationFactory` in the walkthrough.
3. **Pyodide's download size** and caching (Sprint 18), and scikit-learn's size inside it (Sprint 38).
4. **Playwright's browser download**, once, with the owner's OK.
5. **Hosting:** a platform with a usable free tier for ASP.NET Core and Postgres in late 2026. Decided in Sprint 44.
6. **Language-model access:** which provider Sprint 40 teaches with, what a learner's full run costs (it must be pennies), and a local open-weights fallback for learners with no API key.

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
  - SQLite through Sprint 42, PostgreSQL from Sprint 43;
  - offline sync in the browser, so it doesn't depend on the elective;
  - interview problems in TypeScript, with C# answers accepted.
- **Written in plan order without review pauses,** once approved. The owner reviews by doing the lessons.

## Progress

| Sprint | Lessons | Walkthrough |
|---|---|---|
| 0–7 | written before this plan (spreadsheet series) | to be re-walked (spike 1) |
| 7.8 (solution to 7.7) onward | not written | |
