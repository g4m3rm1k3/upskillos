---
title: 6 — Operate a workflow, not just a page
track: Backend Developer Bootcamp — Django — Service Desk
trackOrder: 51.02
runtime: none
---

Outcome: make an independent workflow extension and prepare an operational handoff. Django trades framework conventions for a coherent integrated stack; preserve those conventions unless a requirement justifies a different boundary.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Build a durable notification path

Add an Outbox model with ticket reference, event type, payload version, created time, processed time and attempt metadata. Insert an event in close_ticket's transaction. Write a management command that claims a bounded batch, sends through a replaceable email adapter and records completion. A crash after send and before completion can cause duplicate delivery: use a provider idempotency key if available and explain the remaining guarantee.

Test rollback (no outbox row), transient failure (row remains retryable), duplicate processing and shutdown between send and acknowledgment. Do not start an infinite worker from Check my work; give the command a finite --once mode.

```predict
question: Does on_commit guarantee an email survives a process crash?
choice: No
choice: Yes
answer: No
explain: Commit hooks are not a durable queue.
```

## Plan the database and deployment change

For multi-instance writes, configure PostgreSQL through environment settings and an installed driver. Run the same suite against PostgreSQL, plus TransactionTestCase tests using separate connections for contention. SQLite tests do not prove PostgreSQL row-lock semantics. Keep transactions short; never use a long transaction as a queue.

Run `python manage.py check --deploy` with deployment settings and address each applicable warning: debug disabled, real hosts, HTTPS and secure cookies, trusted proxy settings and secret handling. Serve with a production WSGI or ASGI server; runserver is a development tool. Migrate as a controlled release job, back up before destructive changes and rehearse restore. Collect static assets if introducing Django admin or static styling. Rate-limit login at the application/ingress and observe failures without logging passwords.

## Write an engineering decision

Compare the server-rendered session workflow with a separate JSON API. A same-origin app reduces origin coordination and can use forms naturally. A separate API supports other clients but requires explicit serialization, authentication and error contracts. Django REST Framework may help later; it does not remove object-level authorization. The later full-stack course will build that client integration rather than this section silently assuming it.

## Your turn: deliver technician assignment and notification

Complete the assignment operation from the earlier exercise and the outbox worker. Submit migrations, permission tests, query-budget evidence, failure/retry tests, deployment checklist and restore transcript. A reviewer must recreate the app, sign in as two employees and a technician, and demonstrate that permissions still hold when requests bypass the page. Explain one decision you would reverse at ten times the traffic.

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
run ".venv/Scripts/python manage.py test --settings=desk.test_settings"
```

## Diagnose, explain and review

If email retries cause duplicates, distinguish at-least-once delivery from exactly-once business effects. Explain why an in-memory callback after commit is not durable job storage.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
