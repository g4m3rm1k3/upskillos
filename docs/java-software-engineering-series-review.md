# Common Ground series completion review

This review covers the guided Software Engineering with Java series in Project Studio, including its optional practice and final handoff. It is an editorial map, not an automated claim that every learner has mastered the material. Read the [curriculum standard](java-software-engineering-curriculum.md) for the teaching rules and the distinction between executable checks and learning evidence.

## Coverage by lesson

Each row identifies a concrete explanation and an observation a learner can use to test it. Existing file names, step order and progress keys remain stable. Repeated syntax builds on earlier guided explanations; optional challenge attempts are never required prerequisites.

| Lesson | Explanation reviewed | Worked observation or independent evidence |
|---|---|---|
| [Start](../src/labs/project-studio/tracks/java-engineering/00-start.md) | Tool roles, paths, requirements, constraints, exclusions and evidence | Scope examples distinguish accepted operations from rejected operations; versions and working directory are inspected |
| [Execution](../src/labs/project-studio/tracks/java-engineering/01-execution.md) | Every token in the first program, call frames, arguments, parsing and branches | Trace 8 minus 3; swap arguments; distinguish stale bytecode, type failure and business failure |
| [Repository](../src/labs/project-studio/tracks/java-engineering/02-repository.md) | Ignore patterns, working tree/index/HEAD, branching, conflicts and revert | Stage one wording, edit another, inspect both diffs; resolve competing meanings |
| [Build](../src/labs/project-studio/tracks/java-engineering/03-build.md) | XML nesting, coordinates, scope, transitive libraries, plugins and phases | Inspect dependency tree and classify configuration, resolution, compiler and discovery errors |
| [TDD](../src/labs/project-studio/tracks/java-engineering/04-behavior.md) | References, null, constructors, exceptions, deferred assertions, normalization and boundaries | Intended red followed by green; null and 80/81 traces; planted boundary mutation |
| [Domain model](../src/labs/project-studio/tracks/java-engineering/05-model.md) | Enums, records, construction invariants, immutable values and switch expressions | Retained TODO/0, DOING/1 and DONE/2 snapshots; ignored return-value prediction |
| [Collections](../src/labs/project-studio/tracks/java-engineering/06-collections.md) | Interface implementation, generic maps/lists, mutable references, snapshots and locking | Old versus fresh snapshots; two commands with the same expected revision |
| [Dependency planning](../src/labs/project-studio/tracks/java-engineering/06b-dependencies.md) | Nested types, collection factories, loops, reverse indexes, callbacks and queue invariants | Chain, independent pair, diamond, unknown node and cycle; explicit counter trace |
| [Design and test quality](../src/labs/project-studio/tracks/java-engineering/07-design.md) | Cohesion/coupling through a storage change; circular and weak assertions | A plausible wrong normalizer passes the weak test and fails the requirement-based test |
| [HTML](../src/labs/project-studio/tracks/java-engineering/08-html.md) | Document tree, attributes, metadata, resources, labels and form behavior | Label targeting, keyboard submission and missing-resource diagnosis |
| [CSS](../src/labs/project-studio/tracks/java-engineering/09-css.md) | Rule syntax, box arithmetic, inheritance, grid, cascade and focus states | Compute a box width, inspect breakpoint behavior and record keyboard/zoom observations |
| [JavaScript](../src/labs/project-studio/tracks/java-engineering/10-javascript.md) | DOM references, callbacks, closures, arrays, objects and rendering | Submit trace; move state initialization; omit clear; show markup-like input as text |
| [HTTP](../src/labs/project-studio/tracks/java-engineering/11-http.md) | Address/port, handler lifetime, encoding, streams, protocol and JSON contract | Inspect real response bytes/headers; distinguish acceptance from a lost response |
| [Spring](../src/labs/project-studio/tracks/java-engineering/12-spring.md) | Parent build, starters, executable archive, managed objects, injection and request conversion | Trace POST through JSON/domain/serialization; distinguish malformed, missing and stale ids |
| [API tests](../src/labs/project-studio/tracks/java-engineering/13-api-tests.md) | Exception advice, builders, MockMvc boundary and test configuration | Classify HTTP and connection failures; identify what a no-socket test cannot establish |
| [Persistence](../src/labs/project-studio/tracks/java-engineering/14-persistence.md) | Schema constraints, file paths, row callbacks and bound values | Map a row into Task; trace INSERT order; plan separate restart/fresh-database observations |
| [Transactions](../src/labs/project-studio/tracks/java-engineering/15-transactions.md) | Composition, deterministic midpoint failure, streams/Optional, transaction callbacks and conditional writes | Inspect post-failure state, stale writes and durable restart separately |
| [Browser API](../src/labs/project-studio/tracks/java-engineering/16-browser-api.md) | Resource movement, origins, promises, HTTP versus network errors, try/catch/finally | Preserve draft on rejection; distinguish accepted save from failed refresh |
| [Frontend tooling](../src/labs/project-studio/tracks/java-engineering/17-react.md) | JSON manifest, TypeScript checking, proxy hops, generated paths and HTML entry | Distinguish source types from runtime validation; trace development and production assets |
| [React state](../src/labs/project-studio/tracks/java-engineering/18-react-state.md) | Generics, destructuring, rendering, effects, cancellation, captured values, JSX, keys and mounting | Render/effect table, failed-save experiment, stale-tab trace and packaged route diagnosis |
| [Security](../src/labs/project-studio/tracks/java-engineering/19-security.md) | Threat sequences, hashing, ordered filters, identity/token/role boundaries and real versus mocked login | Failure matrix plus positive create; actual credential verification and browser login |
| [Discussion](../src/labs/project-studio/tracks/java-engineering/20-discussion.md) | Related data, scoped routes, server-owned author, props/state ownership and unique labels | Forged author rejected as authority; independent drafts across tasks; chronology limitation explicit |
| [Frontend tests](../src/labs/project-studio/tracks/java-engineering/20b-browser-tests.md) | Setup lifetime, network fake, optional access, observable asynchronous assertions and cleanup | Failed save preserves input; success displays row; successful refresh clears stale feedback while preserving a draft; tests do not claim real layout or server integration |
| [Concurrency](../src/labs/project-studio/tracks/java-engineering/21-concurrency.md) | Latch, callable, future, executor lifetime and coordination limits | Count winners; distinguish latch release from guaranteed overlapping database reads |
| [Retries](../src/labs/project-studio/tracks/java-engineering/22-retries.md) | Null-safe equality, policy conjunctions, attempt semantics and pure decision versus executor | Method/status/budget table; ambiguous POST result and outbox duplicate schedule |
| [Search](../src/labs/project-studio/tracks/java-engineering/23-search.md) | Parameter conversion, LIKE escaping, query stages, offset behavior and cost | Literal percent near-miss test; fixed-data page trace and concurrent insertion counterexample |
| [Migration](../src/labs/project-studio/tracks/java-engineering/24-migration.md) | Additive defaults, raw JDBC cursor/resource lifetime and compatibility matrix | Old row survives actual migration script; distinguish local artifact from deployed migration |
| [Operations](../src/labs/project-studio/tracks/java-engineering/25-observability.md) | Filter override, downstream execution, monotonic timing, logging arguments and percentiles | Match request id; inspect instrumentation limits; runbook with discriminating observations |
| [Release](../src/labs/project-studio/tracks/java-engineering/26-release.md) | Workflow nesting, dependency order, packaged entry, durable restart and stopped-database backup | Full local smoke/recovery rehearsal, including two tabs and unauthenticated access |
| [Investigation](../src/labs/project-studio/tracks/java-engineering/27-investigation.md) | Testable hypotheses, deployment configuration, review consequences and focused refactoring | Compare database, port and proxy failures; record reversible repair and recovery evidence |
| [Independent change](../src/labs/project-studio/tracks/java-engineering/28-independent.md) | Bounded brief, outcome-based plan, acceptance cases, review rubric and handoff | Optional unfamiliar-input review; demonstrated/needs-practice/not-assessed evidence |
| [Transfer and finish](../src/labs/project-studio/tracks/java-engineering/29-transfer.md) | Changed assumptions, product/evidence ledger and guided completion versus competence | Explain creation, stale concurrency and missing assets; select a different-domain application |

## Specific gaps closed in the completion pass

- Moved argument parsing and `if` instruction out of the optional Capacity challenge into its preceding guided step.
- Expanded previously terse configuration, adapter, test and framework-integration steps. Repeated constructs name the earlier pattern; new behavior explains who invokes it, what it consumes/returns, and its failure boundary.
- Added concrete review/refactor observations instead of leaving “run tests and refactor” as the whole instruction.
- Finished the release with a packaged-browser, conflict, persistence and recovery procedure. This is local deployment; no unperformed hosted deployment is represented as complete.
- Finished independent assessment with explicit acceptance dimensions, review evidence, repair guidance and a handoff. It remains optional and has no automatic mastery claim.

## Scope of completion

The authored guided series reaches its stated local release and engineering handoff. Every lesson has instructional content; the final application contains no remaining teaching stubs. Optional challenges and future product extensions are intentionally open. Human learning outcomes require learner work and review, so the editorial map and passing software checks do not certify a learner's independent competence.

Executable and browser verification results are recorded in the curriculum guide. The source fragments remain learner-typed; verification reconstruction stays outside the learner experience.
