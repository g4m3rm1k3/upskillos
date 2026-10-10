# Backend learning paths

## Product boundary

Backend Lab is a complete browser learning environment. Reading, coding,
simulated requests, SQLite, progress and backups must work without signup or
Electron. Optional account sync supplements local work; it is not a prerequisite.
Only Project Studio may require desktop tooling for these paths.

## Browser improvements, 2026-10-09

Implemented in this change: locally bundled SQLite assets; IndexedDB database
snapshots after requests and SQL; local checklist progress; complete JSON backups
with validation before replacement; immediate editor updates; duplicate-send
protection; visible execution and storage errors; query parsing with URLSearchParams;
response headers; and panel navigation based on the lab container width.

The follow-up adds optional status and exact-JSON response checks. Checks are
saved with requests and included in backups. Invalid check configuration prevents
execution; failed response expectations are reported separately from runtime errors.
JSON object key order is ignored, while value types and array order must match.
History retains the latest runs in memory for the current lab session, including
request, expectations, response, checks and execution/save duration. Loading history
does not send a request; Send explicitly reruns it against the current code and
database. History is not cloud-synced or included in project backups.

The lesson pane is memoized so live editing can update runnable code immediately
without reparsing the lesson on every keystroke. Backup operations disable Send
and SQL execution while their database replacement is in progress.

SQLite remains a browser simulation of a backend: each request reruns the learner's
project. There is no listening HTTP server. Code, saved requests and progress use
localStorage (and the existing optional sync); the database stays local in IndexedDB.
Snapshots wait for SQL transactions to finish. Browser storage may be cleared or
evicted; exported backups include practice credentials and session tables.

Bundling removes the SQLite CDN dependency. It does not establish offline app
installation or offline cold-start support: the app's service worker does not
currently precache all assets. Those require a separate app-level change.

Database saves now compare a revision inside one IndexedDB transaction. A stale
tab cannot overwrite a newer database save, including during backup import. It
shows a conflict warning and retains its in-memory database for export before
reloading. Existing databases without a revision remain readable.

Remaining browser work: table browsing and explicit
seed/reset controls; cross-tab conflict handling for code and progress; worker isolation
for long SQL queries; viewport-shrink handling in the shared floating-window shell; stronger backup recovery when local storage is unavailable.

## Project Studio: planned language-specific series

These are curriculum plans, not published tracks. Start with Python and C#;
choose runtime/framework versions when authoring and verify against official docs.

| Learner | Planned series | Main technology |
|---|---|---|
| Python programmer | Build a Python API | FastAPI, validation models, SQLite, pytest |
| C#/.NET programmer | Build a .NET API | ASP.NET Core, dependency injection, EF Core, integration tests |
| JavaScript/TypeScript programmer | Build a Node API | HTTP foundations, Express, SQLite, automated tests |
| Java programmer | Build a Java API | Spring Boot, validation, persistence, integration tests |

Each path builds a small issue-tracking API with the same observable behavior:
create/list/update issues, filter and paginate, validate input, persist across
restarts, authenticate users, and enforce ownership. The common behavior makes
paths comparable; explanations and implementation must be idiomatic to each language.

Each series should teach, in order:

1. A running endpoint and a real request, then the smallest toolchain setup needed
   to reproduce it. Explain the difference from Backend Lab's simulated requests.
2. Routes, path/query parameters, JSON, status codes and validation through failures.
3. Separate business rules from transport; add useful tests before introducing
   repository and dependency-injection abstractions.
4. SQLite files, migrations, transactions, constraints and isolated test databases.
5. Password hashing using the framework's supported facilities, authentication,
   authorization, secrets and failure cases. Never carry the browser exercise's
   bare SHA-256 password helper into a deployable application.
6. API documentation, logs, integration tests, configuration, packaging and deployment.

Use the [Project Studio lesson standard](project-studio-lesson-standard.md):
predict, observe a failure, explain it, repair it, then make an independent change.
Each language needs an executable walkthrough and checks that reject plausible
wrong answers. Publish an opening chapter only after its real server lifecycle,
requests and database restart behavior have been tested and its rendered lessons
reviewed. Reuse Project Studio's scoped folders, terminal and checks; do not add
desktop runtime requirements to Backend Lab.

## Verification for this browser change

First-request correction (2026-10-10): Lesson 1 previously created an empty file
and instructed the learner to trigger a missing-handler error. New projects now
contain an editable starter returning 200 for `GET /users` and 404 for other
paths. Only untouched legacy blank projects are upgraded. The lesson makes
renaming/restoring the handler a deliberate experiment after a successful request.
The browser walkthrough now presses Send before editing; previously it inserted
a handler first and therefore missed the first-visit experience.
`node node_modules/vitest/vitest.mjs run src/labs/backend-lab` reports **4 files,
31 tests passed**; `node node_modules/typescript/bin/tsc --noEmit` exits 0 without
diagnostics. No executable lesson examples were changed; this is lab Markdown,
not a course-object lesson subject to the course schema checker.
The expanded walkthrough against `http://127.0.0.1:5187` passed, including the
first Send, edited requests, reloads, backups, mobile controls and database tab
conflicts, with no uncaught page errors or SQLite CDN requests. The development
server was stopped afterwards.

Latest database-conflict pass: **29 tests passed**, production build **passed in
3m 42s**, and the expanded production browser walkthrough **passed**, including
three tabs sharing IndexedDB, protection of the winning save and export from the
conflicting tab. The development walkthrough timed out during initial navigation
on this pass; the production run completed without page errors. TypeScript still
reports the same 15 baseline diagnostics. `npm.cmd run docs:check` passed for all
10 contributor files. Logs stay in `.cache/backend-lab-verification`.

- `node node_modules/vitest/vitest.mjs run src/labs/backend-lab`: **4 files, 29 tests passed**. Uses real SQLite/WASM for persistence, backup integrity, transaction preservation, foreign-key enforcement and concurrent writes; component checks cover immediate edits, failed requests, saved progress, expected-response validation and loading history without rerunning it.
- `node scripts/check-backend-lab-browser.cjs http://127.0.0.1:5187` and the same command against `http://127.0.0.1:5188`: **passed against dev and production preview**. The browser walkthrough verifies anonymous edit/send, SQLite, reload persistence, checklists, saved response checks, recorded history, backup export/import and mobile startup at 390 px. It rejects SQLite CDN requests and uncaught page errors. Start a local server first; screenshots and the test backup go under `.cache/backend-lab-browser`. The first-visit welcome is dismissed through its UI. Output: `PASS: anonymous edit/send, real SQLite, reload persistence, checklists, saved response checks, recorded history, backup export/import, 390px controls, no SQLite CDN or page errors.`
- `npm.cmd run docs:check`: **Contributor docs checked: 10 file(s), links, paths and commands all exist.**
- `npm run typecheck` before editing and `node node_modules/typescript/bin/tsc --noEmit` afterwards: **15 existing diagnostics in each, no new diagnostics** (line locations normalized for comparison).
- Production build for the persistence pass: **passed, built in 2m 15s**, with the same browser walkthrough also passing against production preview on port 5188. The final checks/history build also **passed, built in 2m 46s**, and the expanded walkthrough passed against that production preview. The first `npm.cmd run check` exhausted the default 4 GB heap; retry used `node --max-old-space-size=8192 node_modules/vite/bin/vite.js build`.

The lesson changes correct prose and a checklist; no executable lesson examples
were changed. The course-object schema and sandbox-cell validators do not apply
to this lab's Markdown lesson format. Browser review covered the rendered lesson
pane, editor, request client and SQL console. These checks do not establish
cross-browser parity, cross-tab consistency for code/progress, or a complete offline app installation.
