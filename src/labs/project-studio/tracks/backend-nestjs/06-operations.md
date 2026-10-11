---
title: 6 — Queues, ordering and an independent handoff
track: Backend Developer Bootcamp — NestJS — Webhook Inbox
trackOrder: 51.04
runtime: none
---

Outcome: evolve a small receiver into an operable ingestion service and defend its delivery contract.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Introduce concurrency deliberately

Move inbox storage to PostgreSQL and implement bounded worker claims, for example using row locks with SKIP LOCKED and lease/retry metadata. Add an index serving the pending-work query. Test abandoned claims and restart recovery against PostgreSQL itself. A lease must expire; a worker must not acknowledge work after losing its claim without a fencing or idempotency strategy.

If adding Redis/BullMQ, keep the database inbox as the durable acceptance boundary and solve the dual-write problem. Enqueueing after a database commit can be lost; enqueueing before commit can expose nonexistent work. An outbox dispatcher bridges the two with at-least-once delivery and consumer deduplication.

```predict
question: Does a queue guarantee events arrive in business order?
choice: No
choice: Yes
answer: No
explain: Retries, multiple producers and concurrency can reorder delivery.
```

## Build a domain projection

A parcel can be dispatched then delivered. Delivery may arrive first. Choose a provider sequence number or event-time reconciliation policy and document missing/late events; arrival order is not business order. Store the receipt log independently from the current-state projection so you can explain and rebuild state.

Replay historical events into a fresh projection and compare results. Version payload schemas and keep old readers during migration. Never reuse an old event id for a materially changed event.

## Define operational and security evidence

Add metrics for accepted, duplicate, rejected, pending age, retry count and dead-letter volume. A queue length of zero with no incoming traffic is different from a stuck worker with growing oldest-event age. Alert on meaningful service objectives and include a runbook action.

Ship using npm ci, npm test and npm run build in CI. Supply secrets at runtime, rotate with overlap, terminate TLS, enforce ingress limits and rehearse database restore. Restrict any operator replay endpoint with separate user authentication and permissions; a sender webhook secret must not grant an admin console. Signing keys are per sender; operator accounts use a maintained identity/session system.

## Your turn: deliver an ordered, recoverable inbox

Implement the parcel projection, crash test and provider-scoped identity extension. Submit a protocol document, threat model, migration, duplicate/out-of-order fixtures, retry/dead-letter policy, metrics and restore transcript. A reviewer must restart the receiver, replay events and show that only intended business effects occur. Compare Nest modules with FastAPI composition, Django services and ASP.NET dependency injection without assuming identical architecture is best for every app.

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
run "npm test"
```

## Diagnose, explain and review

If messages are delivered twice, inspect the acknowledgment boundary before increasing timeouts. Explain the boundary of every “once” claim and demonstrate the failures your implementation tolerates.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
