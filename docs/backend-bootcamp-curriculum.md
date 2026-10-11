# Backend Developer Bootcamp

Status: authored, in development. Local reference applications are executable; independent extensions, learner pacing, cross-platform Desktop workflows and production deployments still require review. This is a backend learning path paired with the frontend bootcamp, not a claim that completing supplied code alone makes someone job-ready.

Open **Project Studio Desktop → Backend Developer Bootcamp — APIs, Data and Architecture**. Follow FastAPI → Django → ASP.NET Core → NestJS, or enter any framework section independently. Choose a different empty project folder for each section. The series intentionally does not share a project root, dependencies, databases or credentials across frameworks.

## Entry contract

Learners should understand variables, functions and basic control flow. FastAPI and Django assume introductory Python dictionaries and exceptions; NestJS assumes JavaScript objects, promises and basic TypeScript. ASP.NET introduces the C# constructs it uses for learners with experience in another language. This is a bridge from introductory programming/frontend work, not a substitute for language fundamentals.

Each section begins with its own terminal, package management and Git setup. Commands state their working directory; Python setup includes macOS/Linux and PowerShell alternatives. Use Project Studio Desktop for file and executable checks. Web previews cannot run these backend toolchains. Long-running development servers start in a terminal and must be stopped with Ctrl+C; automated checks are finite.

| Section | Project and distinct problem | Local tools | Architecture learned |
|---|---|---|---|
| FastAPI | LensPool: equipment booking and contested availability | Python 3.12/3.13, venv, pip, pytest, Uvicorn | HTTP schemas and dependencies, pure policy, explicit SQL, owner-scoped reads |
| Django | HelpHarbor: employee tickets, state transitions and audit history | Python 3.12/3.13, Django 5.2, management commands | Model–Template–View, forms, sessions, services and ORM transactions |
| ASP.NET Core | Stockroom: inventory reservations without overselling | .NET 10 SDK, NuGet, xUnit | Controllers, request/response records, dependency injection, JWT trust and atomic updates |
| NestJS | Parcel Inbox: authenticated delivery, retry and replay | Node 22.14+ in the Node 22/24 lines, npm, TypeScript | Modules, providers, guards, pipes, durable inbox and a finite worker |

Node's SQLite API is experimental in the Node 22 baseline. The reference deliberately uses local SQLite to make persistence and transactions inspectable. PostgreSQL migration and operating multiple workers are explicit advanced work; SQLite success is not evidence of PostgreSQL locking semantics or production throughput. Framework dependency ranges select a compatible line; learners create and commit resolved locks. The reconstruction tool resolves dependencies afresh and reports what it actually executes.

## Learning sequence inside each framework

| Phase | Learner does | Evidence |
|---|---|---|
| Setup and contract | Create a clean project, identify tools and working directory, define success/failure cases | Tool output, request examples and trust-boundary sketch |
| Language and data boundaries | Distinguish DTOs, domain rules, persistence and representations | Explain who supplies identity, ids, timestamps and editable fields |
| Persistence and concurrency | Inspect constraints, indexes and transactional writes | Query/migration evidence and a schedule that would break a naive implementation |
| Framework composition and security | Wire the transport to validated identity and use cases | Unauthorized requests, object-level isolation and explicit error behavior |
| Runtime verification | Execute real HTTP/database regressions and diagnose failures | Passing reference suite plus a deliberately failing mutation |
| Independent extension and operations | Build new behavior, document tradeoffs, rehearse failure and handoff | Reviewer-run extension, threat model, migration/restore and operations evidence |

Every lesson includes a prediction, guided explanation, independent task with progressive hints, and diagnostic review. Full-file examples are visible by default; one step edits one file. An evidence-file existence check is clearly labeled a submission gate, not a behavioral assessment. Runtime checks establish only their named cases. Completing a supplied reference is practice; passing the independent review is the stronger evidence.

## What is implemented versus assigned

| Framework | Guided, runnable reference | Independent advanced extensions and acceptance |
|---|---|---|
| FastAPI | Date policy; separate input/output schemas; parameterized SQLite queries; unique booking constraint; expiring hashed random service credentials; ownership enforcement; tests for invalid input, credential expiry, cross-owner access and contested inserts | Revoke credentials; versioned migration; owner-scoped request idempotency; cancellation with audit; simultaneous replay and rollback tests; structured logs, backup restore and an API handoff |
| Django | Required environment secret; local/deployment cookie distinction; built-in session login/logout; explicit form allowlist; owner-filtered pagination; escaped templates; conditional close plus audit in one transaction; CSRF and rollback tests | Technician assignment with permissions; priority migration; query-budget/N+1 work; durable outbox and finite notification worker; retry/crash cases; PostgreSQL transaction tests and deployment settings |
| ASP.NET Core | Controller API; model binding and domain validation; production OIDC/JWT configuration and local development tokens; owner-filtered reads; conditional stock decrement plus reservation transaction; HTTP and contention tests | Real token rejection matrix; failure-injected rollback; reservation release/expiry/confirmation; idempotency; exactly-once restock invariant; migrations/EF Core comparison, metrics and load evidence |
| NestJS | Signed raw-body verification; freshness and body limits; runtime DTO validation; durable duplicate detection; changed-payload conflict; worker transaction; tests for tampering, restart replay and one local ledger effect | Provider-scoped keys and rotation; worker crash/concurrency tests; out-of-order parcel projection; PostgreSQL claims or queue/outbox bridge; bounded retries, dead letters and recovery |

Advanced extensions are assigned engineering projects, not hidden prebuilt solutions or claims of production completeness. The instruction explains the mechanism, failure model and acceptance cases; a reviewer evaluates the learner's implementation. A future guided expansion can split these into smaller lessons after pacing sessions establish where learners need more support.

## The data split and why it exists

A network request is untrusted even when sent by your own frontend. Input DTOs/forms expose only client-editable fields. Authentication supplies the principal. An application use case coordinates a business operation and its transaction. Domain rules explain allowed states and transitions. Persistence supplies durable constraints, relations and atomicity. Output DTOs/templates expose only the intended representation.

These boundaries are not necessarily separate deployments or an interface per class. A modular monolith keeps local transactions straightforward. Extract a module or interface when policy, reuse, independent failure or testing needs justify it. Extract a service only when its operational benefit outweighs distributed consistency and deployment costs.

| Concern | Question the learner must answer |
|---|---|
| Normalization | Which facts belong to users, equipment, tickets, stock or events, and which references connect them? |
| Intentional duplication | Why can an order's historical price differ from today's catalog price? Why keep a receipt log separately from current state? |
| Constraints | Which invariant must hold even if another writer bypasses the form or ORM? |
| Transactions | What must commit together? Which external effects cannot participate? |
| Indexes and pagination | What actual query benefits, what is its ordering, and what write cost follows? |
| Schema evolution | How will existing data and old application versions coexist during an upgrade? |
| Retention | When may credentials, audit records or deduplication keys be removed without violating guarantees? |
| Consistency and retries | What happens if the write commits but the response is lost? |

MVC terminology is compared rather than forced across frameworks. Django views coordinate requests and templates render HTML. ASP.NET controllers serve JSON in this project, while MVC can also render views. FastAPI composition does not impose MVC. Nest's modules organize providers/controllers while guards and pipes address request boundaries.

## Security model and its limits

LensPool uses provisioned service credentials, not an end-user password flow. HelpHarbor uses Django's maintained session and password mechanisms with CSRF protection. Stockroom delegates sign-in to an issuer and validates bearer identity; its test-only principal handler does not verify token cryptography. Parcel Inbox authenticates a sender with HMAC, which is neither encryption nor an operator login system.

The teaching repeatedly distinguishes authentication, resource authorization, input validation, browser origin policy and database integrity. It covers mass assignment, SQL parameterization, escaping, secret lifetime/rotation, replay and request budgets. No reference is labeled safe to deploy merely because it passes tests. Production acceptance also needs TLS, operational identity configuration, actual database testing, ingress limits, least privilege, monitoring, dependency review and restore evidence.

## Independent review rubric

The reviewer should start from a clean folder using the learner's instructions, inspect actual persisted state and send requests without the frontend. Do not accept only screenshots of green tests.

| Dimension | Required evidence | Reject when |
|---|---|---|
| Correctness | New positive, boundary and invalid-input tests | Tests only repeat the supplied happy path |
| Authorization | Different authenticated identities and direct HTTP attempts | Hiding a button is treated as access control |
| Data integrity | Race, replay and injected-failure evidence | A preflight read is the only protection against a contested write |
| Architecture | A request trace and decision record with alternatives | Layers are named but their responsibilities cannot be explained |
| Operations | Migration, backup restore, bounded retry and incident instructions | A development server or untested backup is described as a release |
| Independence | An extension designed and implemented without copying its solution | The learner cannot explain or modify their own implementation |

The final demonstration should include a bug deliberately introduced and caught by a test, one tradeoff that changes at greater scale, and a realistic failure incident. This produces assessable portfolio evidence toward backend readiness without promising an employment outcome.

## Verification and author workflow

`node scripts/check-backend-bootcamp.mjs` validates lesson structure without installing tools. `node scripts/check-backend-bootcamp.mjs --run` reconstructs the **actual visible code fences** into fresh temporary projects and executes their framework tests plus their run checks through the real Project Studio Desktop check engine. Python checks select the project virtual environment explicitly; Django uses a dedicated test settings module, so an interactive terminal’s activation and exported secrets are not prerequisites for Check my work. It does not write learner evidence files or pretend to solve independent exercises. `--framework=fastapi`, `django`, `aspnet` or `nestjs` selects a section. `BACKEND_PYTHON` and `BACKEND_DOTNET` can select installed toolchain executables. The runner retains temporary projects for inspection and leaves no servers running. It installs dependencies and requires network access and permission for Nest's temporary loopback listener.

Repository regression coverage lives in [backendBootcamp.test.js](../src/labs/project-studio/backendBootcamp.test.js); reconstruction lives in [check-backend-bootcamp.mjs](../scripts/check-backend-bootcamp.mjs). Run the required Project Studio suite after editing track Markdown. Regenerate facts rather than hand-editing generated inventories.

Verification results for this change are recorded in [backend bootcamp verification](backend-bootcamp-verification.md). Open items remain cross-platform Desktop walkthroughs, real issuer configuration, production database/deployment checks, independent capstone solutions and learner pacing/editorial sessions.

## Full-stack follow-on

Keep full-stack implementation in its own later series. These projects hand off API/schema contracts, error behavior, identities, pagination and operational assumptions. The later series should explicitly teach frontend/backend contract coordination, browser session/OIDC and CSRF choices, CORS, end-to-end tests, deployment topology, accessibility of failure states and incident debugging across the split. It should not silently embed backend service credentials in browser bundles.

## Primary references

- [FastAPI application composition](https://fastapi.tiangolo.com/tutorial/bigger-applications/) and [testing](https://fastapi.tiangolo.com/tutorial/testing/).
- [Django transaction behavior](https://docs.djangoproject.com/en/5.2/topics/db/transactions/) and [testing tools](https://docs.djangoproject.com/en/5.2/topics/testing/tools/).
- [ASP.NET Core resource authorization](https://learn.microsoft.com/en-us/aspnet/core/mvc/security/authorization/resource-based?view=aspnetcore-10.0) and [integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0).
- [NestJS runtime validation](https://docs.nestjs.com/techniques/validation) and [raw request bodies](https://docs.nestjs.com/faq/raw-body).
