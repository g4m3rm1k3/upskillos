# Database Engineering — SQL to Reliable Applications

Status: opening chapter implemented in Project Studio on 2026-10-15; the later chapters below are planned. This is not a completed engineering course. Lesson and catalog totals belong in the [generated inventory](../generated/project-inventory.md).

## Product and audience

Build **Issue Desk**, an issue tracker for teams: projects, tickets, assignments, comments, status history, permissions and reporting. The user selected this project. It is a new, standalone series with no dependency on Tabletop, Forge, the backend bootcamp or another programming course.

Begin with files, a terminal and SQL in SQLite. Introduce a client/server database with PostgreSQL only after learners can explain tables, keys, relationships, queries and constraints. SQLite is a useful database in its own right; it is not a pretend server. Explicitly compare its type, foreign-key, concurrency and identity behavior with PostgreSQL instead of implying they are interchangeable.

Use SQL directly before introducing a query builder or ORM. Before writing application code, include an in-series Python bridge covering every construct the application uses. The first integration is a small command-line program; HTTP, pooling and authorization follow after the connection and transaction boundaries are understood. Later chapters should pin tested engine/driver versions and include installation checks for their supported platforms. Do not select a framework simply to avoid teaching the database interface.

## Exit outcomes

Given an unfamiliar application brief, the learner should be able to:

- Identify entities, relationships, invariants and access patterns; justify a schema with a diagram, data dictionary and concrete counterexamples.
- Write and test queries with joins, aggregation, subqueries, common table expressions and window functions; explain their cardinality, NULL behavior and ordering.
- Enforce integrity across all writers with suitable constraints, while separating domain validation from authorization.
- Integrate parameterized SQL with an application and define transaction boundaries, retries, connection ownership and error handling.
- Reproduce a concurrency failure in two sessions and demonstrate a repair using an appropriate constraint, lock, isolation level or version check.
- Evolve populated schemas through compatible migrations, diagnose query performance with execution plans, and restore a backup into a clean environment.
- Present evidence that the system preserves its rules under invalid input, concurrent changes, failed requests and restarts.

These are intended outcomes, not claims about the opening chapter or a learner who has only followed guided code.

## Chapter map and evidence

| Chapter | Lesson sequence | Working evidence / independent task |
| --- | --- | --- |
| 01 · First queries and trustworthy records | Terminal and engine; SELECT expressions and aliases; schema versus records; persisted files; projection, WHERE, ORDER BY and LIMIT; identity, presence and range constraints | **Implemented:** `data-foundations/01-01-ask-a-question`, `01-02-records-that-remain`, `01-03-filter-and-order`, `01-04-let-the-database-refuse`. Independent query and room-schema tasks; exact results and rejected writes. |
| 02 · Design before adding tables | Interview the team; one-row meaning; candidate and primary keys; optionality and cardinality; teams/projects/tickets/users; memberships and assignments; foreign keys and deletion policies | Annotate an entity-relationship diagram with actual example rows. Decide whether a user can belong to several teams and a ticket have several assignees. Reject orphan records. Compare two valid designs under changed requirements. |
| 03 · Relational design and durable facts | Repeating groups; insertion/update/deletion anomalies; functional dependencies; first, second and third normal forms; composite keys; fact versus derived value; controlled denormalization | Split a deliberately duplicated project-owner dataset, preserve all facts and reconstruct the original view. Defend what is stored versus calculated. No slogan that more tables are always better. |
| 04 · Query one table accurately | Boolean predicates and parentheses; NULL and three-valued logic; strings and patterns; DISTINCT; CASE; dates/time zones; ranges; stable pagination | Triage inbox with unassigned tickets, equal timestamps and missing estimates. Demonstrate why `= NULL` fails and why page boundaries need a unique tie-breaker. |
| 05 · Combine related records | Inner/left joins; row multiplication; many-to-many joins; anti-joins with NOT EXISTS; correlated subqueries; duplicate diagnosis | Team backlog including projects with no tickets. Predict row counts before joining memberships. Repair a plausible double-counting report without hiding the error with DISTINCT. |
| 06 · Reporting without misleading numbers | COUNT variants, SUM/AVG; GROUP BY/HAVING; conditional aggregation; CTEs; window partitions/order/frame; ranking and running totals | Workload and aging reports with empty groups and reopened tickets. Hand-compute the denominator and time boundaries before SQL. Transfer to an unfamiliar audit dataset. |
| 07 · Change data deliberately | INSERT/UPDATE/DELETE; preview affected rows; transactions, commit and rollback; idempotent imports; conflict handling; validation failures | Update ticket state and append its history atomically. Inject failure between the writes and prove neither partial state remains. Recovery practice uses disposable fixtures, not learner work deletion. |
| 08 · Move to PostgreSQL | Server/database/schema/session; local installation; psql; roles and grants; connection settings; strict types and identity; numeric/time types; dialect differences; reproducible schema and seed | Port the tested relational design and run equivalent fixtures on both engines. Document differences instead of silently changing answers. Create a restricted application role; keep secrets out of files committed to Git. |
| 09 · Application code from the beginning | Python values/functions/control flow/exceptions/modules; connection/cursor lifecycle; parameter binding; transactions; affected-row counts; result mapping; testing with real databases | Start with a one-file CLI that creates and assigns a ticket. Every Python construct taught before use. Show an injection-shaped title stored as data. Explain why parameters cannot replace SQL identifiers; allowlist dynamic sort columns. ORM comparison comes after the working SQL boundary. |
| 10 · Concurrent users and retries | Two-session interleavings; lost update; MVCC and snapshots; READ COMMITTED/REPEATABLE READ/SERIALIZABLE; row locks and lock order; deadlocks; optimistic versions; retry boundaries; unique constraints | Two engineers update one ticket from the same old version. Show the lost edit, then reject stale updates. Demonstrate transaction-level retry after serialization failure without duplicating an external effect. No claim that a single-user test proves concurrency safety. |
| 11 · Permissions and service boundaries | Authentication versus authorization; team/project membership; tenant boundaries; least-privilege database roles; row-level security and its limitations; HTTP request/response basics; pool ownership; timeouts | An authenticated user cannot read another team's ticket, export it, edit it or infer it through a join. Test both allowed and denied cases with the actual application role. Keep database privileges distinct from per-user product permissions. |
| 12 · Migrations and compatibility | Versioned migrations; populated fixtures; expand/backfill/validate/contract; old/new application coexistence; locks; rollback versus forward repair; resumable jobs | Make a required field change without deleting existing tickets. Interrupt a backfill and resume safely. Provide preflight checks and a reviewable recovery procedure. |
| 13 · Performance from measurements | Workload and realistic distributions; EXPLAIN and EXPLAIN ANALYZE; estimates versus actual rows; B-tree and composite indexes; selectivity; partial/covering indexes; statistics; N+1; keyset pagination | Measure a slow team inbox before/after an index and explain the plan. Include write/storage costs. Explain that EXPLAIN ANALYZE executes its statement; use controlled fixtures for mutations. No assertion that every correct query should use an index. |
| 14 · Operating and recovering the system | Backup versus replication; logical/physical backup scope; restore rehearsal; recovery objectives; monitoring locks/slow queries/connections; retention and deletion; audit history; operational runbooks | Restore into a separate clean database and verify relationships and reports. Record how much data could be lost and how long recovery takes. Practice one failure incident with evidence and a rollback/repair decision. |
| 15 · Engineering capstone and transfer | New brief; requirements and tradeoffs; design review; incremental implementation; adversarial tests; migration; load and recovery rehearsal; handoff | Extend Issue Desk with service-level deadlines or dependency tracking without a supplied schema. Then design a different small domain independently. Submit schema, representative SQL, concurrency tests, migration/restore evidence and a tradeoff memo. |

Only implemented chapter folders appear as available lessons. Planned material must not be represented as authored content or counted as completion.

## How each lesson teaches

1. Begin with a concrete product question and a tiny dataset the learner can inspect by hand.
2. State what one row represents and predict the output, accepted write or error before running SQL.
3. Explain new terms, operators and syntax before the first code that requires them. Define units, identities and missing values explicitly.
4. Make one meaningful change at a time. Full-file editor snapshots may show accumulated work, but must not introduce an unexplained subsystem.
5. Vary one input, observe the result, diagnose a deliberate mistake and restore the experiment. Include empty sets, duplicates, equality boundaries and NULL where relevant.
6. Assign an independent transfer task with progressive hints and no supplied target. Test valid cases as well as invalid cases.
7. End with an explanation or design decision the checker cannot certify. Name that limit plainly.

Diagrams should explain cardinality or an anomaly, not decorate a large schema. Concurrency lessons need an explicit session-A/session-B timeline and real overlapping transactions. Performance lessons need actual measurements, not fabricated timings or universal plan assertions.

## Assessment and author verification

The opening uses SQLite's CLI test facility (`.testcase` / `.check`) for exact results, and real failed inserts for constraints. The walkthrough rebuilds a fresh learner project and rejects plausible wrong answers: arithmetic instead of multiplication, wrong output units, hardcoded familiar titles, missing equality boundaries, reversed ties, absent primary keys and incorrect range/presence constraints. Failure checks send SQL through standard input and assert its error status and message; valid writes prevent an implementation that rejects everything from passing.

The constant-expression exercise cannot distinguish a hardcoded answer from genuine understanding. Its altered-input explanation is a manual requirement. Later chapters must add generated/varied fixtures, genuine multi-session tests, migration preservation and restore tests as those capabilities are taught. Automated grading must never claim to prove authorization, understanding or operational readiness beyond the behavior it executes.

Author commands:

```text
npx vitest run src/labs/project-studio/data.desktop.test.js
npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"
npm run facts
npm run catalog:check
node scripts/audit-project-studio-lessons.mjs --write
```

The walkthrough selects the platform-appropriate shell but only platforms actually executed may be reported as verified. The opening has no Python, npm or database server dependency for learners; later dependencies require their own taught setup.

## Primary technical references

- [SQLite command-line interface](https://sqlite.org/cli.html): source-file execution, shell commands and CLI checking tools.
- [SQLite SELECT](https://sqlite.org/lang_select.html): result selection and ordering semantics.
- [SQLite constraints and table definitions](https://sqlite.org/lang_createtable.html): identity, presence, CHECK and type behavior.
- [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html): the planned server-based progression. Later lessons must cite the version they actually test.

## Remaining review

The opening is an implementation slice, not completion of the course map. Beginner trials, installation walkthroughs, rendered-lesson review and independent Windows/Linux checks remain open. Application, PostgreSQL, concurrency, migration, permissions and operational exit outcomes remain unimplemented until their lessons and evidence are added.


## Opening verification — 2026-10-15

Executed on macOS with SQLite CLI 3.51.0:

- `npx vitest run src/labs/project-studio/data.desktop.test.js`: `Test Files 1 passed (1)`; `Tests 9 passed (9)`. This reconstructs the lessons through the desktop check engine, runs executable predictions and verifies the deliberately incorrect answers fail their named checks.
- `npx vitest run src/labs/project-studio --exclude "**/*.desktop.test.js"`: `Test Files 2 failed | 51 passed (53)`; `Tests 2 failed | 242 passed (244)`. The same existing Git-repository detection and child-process termination failures remain; the new series introduces no additional failures.
- `npm run facts`: lesson titles, ID map and project facts regenerated successfully; output reported `14 content problem(s)` in the existing inventory. This command's course totals cover the catalog, not Project Studio series.
- `npm run catalog:check`: lesson titles and ID map are current; `Project facts are current`; the same inventory warning remains.
- `npm run docs:check`: `Contributor docs checked: 10 file(s), links, paths and commands all exist.`
- `node scripts/audit-project-studio-lessons.mjs --write`: reports regenerated; exit 1 from four existing `independent task exposes full target` errors elsewhere. The new chapter has no structural errors; human review is still required.
- `git diff --check`: no output.

No full application build, browser rendering check, fresh installer rehearsal or Windows/Linux execution was performed. No database server was installed and no user database was modified.
