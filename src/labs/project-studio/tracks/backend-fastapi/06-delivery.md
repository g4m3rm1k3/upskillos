---
title: 6 — From a working API to an engineering handoff
track: Backend Developer Bootcamp — FastAPI — Equipment Booking
trackOrder: 51.01
runtime: none
---

Outcome: extend LensPool independently and defend its limits. A working development server is one milestone; operating durable data is another.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Design idempotency before retries

Add a booking request key scoped to the authenticated owner. Persist key, normalized request fingerprint, booking id and response in the same transaction. Same key and same body returns the original result; same key and different body returns 409. A missing response does not imply a failed write. Never key this table by token: rotating a credential must not change identity.

Write tests for sequential replay, simultaneous replay, mismatch and another owner using the same key. Use a unique database key for arbitration. An in-memory dictionary loses the guarantee on restart and cannot coordinate multiple workers.

```predict
question: Does a client timeout prove a database transaction rolled back?
choice: No
choice: Yes
answer: No
explain: The server can commit before the response is lost.
```

## Measure and operate

Add structured request logs with a generated request id, route template, status and duration. Exclude Authorization, tokens and raw bodies. Separate liveness (process running) from readiness (can serve required dependencies). Simulate a read-only database, full disk and timeout; document what an operator observes.

Create a CI job that installs the committed lock and runs tests on a clean environment. Deployment should run migrations once as a controlled job, start an ASGI server behind TLS, use a writable persistent volume for SQLite and restrict the app's filesystem permissions. SQLite is a good single-node choice; a PostgreSQL migration must retest locking, uniqueness, isolation and backup/restore under the actual database, not assume equivalent behavior.

Before calling a release ready, restore a backup into a new database and verify bookings. Set a retention policy for expired credentials and completed bookings. Define a latency objective and a workload before benchmarking.

## Prepare for the later full-stack series

Produce an OpenAPI contract, example sanitized requests and an error catalogue. Do not build a frontend here. Explain where an eventual browser session, CSRF protection and origin policy will live. For user authentication, delegate sign-in to a maintained identity provider or implement a carefully reviewed session flow; do not turn a manually provisioned bearer token into a password login shortcut.

## Your turn: ship an independent extension

Implement cancellation with owner checks and an audit record, then idempotent creation. Write tests for cross-owner cancellation, repeated cancellation, slot reuse, concurrent replay and rollback. Submit an architecture decision record, threat model, migration/restore transcript, CI result and a five-minute demonstration. Acceptance requires a reviewer to run your app from an empty folder, reproduce the failures and explain your SQLite/PostgreSQL tradeoff.

Write your evidence in `evidence/delivery.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/delivery.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Run the regression suite

Run from this project’s root with its tools installed. A nonzero exit means stop and read the first failure. These are finite tests; no manually running server is required.

```check
run ".venv/Scripts/python -m pytest -q"
```

## Diagnose, explain and review

A green test suite does not verify backups, TLS or an operator runbook. Walk through an incident: the client timed out but the booking committed. Explain what the client may safely retry and how an operator traces it without seeing credentials.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
