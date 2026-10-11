---
title: 6 — Evolve a transactional modular service
track: Backend Developer Bootcamp — ASP.NET Core — Stock Reservations
trackOrder: 51.03
runtime: none
---

Outcome: extend Stockroom with release and idempotency, and justify when a more complex architecture is warranted.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Design a reservation lifecycle

Introduce held → confirmed or released, with an expiry timestamp in UTC. A release must restore stock exactly once. Put the state transition and stock increment in the same transaction with a conditional predicate. A payment timeout must not hold a database transaction open. Model payment confirmation as a separately retryable operation with an idempotency key.

For a release worker, claim expired holds in bounded batches. Two workers must not both restore the same stock. Test races between confirm and expire, duplicate release, lost response and rollback. A status enum in C# alone does not constrain SQL writes; add a database constraint and a migration.

```predict
question: Will splitting this transaction across two services make consistency simpler?
choice: No
choice: Yes
answer: No
explain: Distributed boundaries require explicit messaging and reconciliation semantics.
```

## Decide on architecture from evidence

Start with a modular monolith: one deployment and one local transaction can serve this workload. Splitting inventory and reservations into separate services removes that easy transaction boundary and creates message/reconciliation work. An outbox can atomically record intended events with business changes; consumers must deduplicate events and handle redelivery.

A repository is useful when it represents meaningful aggregate operations. A generic CRUD wrapper around every EF Core call may hide the exact concurrency behavior you need to understand. Record the decision, alternatives, expected traffic and a measurable trigger for revisiting it.

## Prepare an operational release

Use locked restore, `dotnet test Stock.Tests`, and `dotnet publish Stock.Api -c Release`. Run the published output with production identity and database configuration behind TLS. Package secrets at runtime, not in a container image. Give the process least-privilege storage access; run migrations as a separate controlled job.

Add structured logs, request correlation, dependency timing and metrics for conflict/timeout rates. Keep tokens and personal data out of logs. Define a readiness probe separate from liveness and rehearse database restore. Load-test the expected contention pattern with bounded clients; compare p95 latency, errors and final stock, not just requests per second. Exercise cancellation and shutdown behavior when adopting async database operations.

## Your turn: deliver safe release and retry behavior

Implement reservation release and request idempotency, with migrations and a failure-injection suite. Submit an architecture decision, permission matrix, restore record and operations runbook. A reviewer must race two requests and prove no oversell or double-restock, reject wrong-audience tokens, and recreate the service using the committed locks. Publish an API contract for the later full-stack client, without coupling the inventory model to that UI.

Write your evidence in `evidence/operations.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/operations.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Run the regression suite

Run from this project’s root with its tools installed. A nonzero exit means stop and read the first failure. These are finite tests; no manually running server is required.

```check
run "dotnet test Stock.Tests"
```

## Diagnose, explain and review

If a timeout rises under load, distinguish lock waits, thread-pool pressure and external latency before adding workers. More workers cannot fix a violated inventory invariant.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
