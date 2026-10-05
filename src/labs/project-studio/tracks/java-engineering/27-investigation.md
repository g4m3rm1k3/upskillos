---
title: Debug an unfamiliar failure — form and test hypotheses
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Engineering includes diagnosis under uncertainty. Start with a reproducible symptom and a hypothesis that could be disproved. Change one relevant variable at a time, preserve evidence and avoid treating the first plausible story as the cause.

## Investigate a deliberate configuration failure

### Follow evidence from symptom to discriminating experiment

Suppose the browser says it could not load tasks. That observation is consistent with several causes. First inspect whether a request was sent and whether a response arrived. No connection suggests address/process/network investigation. An HTTP 401 suggests identity handling. A 500 with a server-side JDBC cause suggests persistence. These are hypotheses, not interchangeable labels for “backend broken.”

For the database experiment, use an actually unwritable location: some drivers create a missing parent directory, so merely naming a nonexistent directory may succeed. Capture what happened rather than forcing it into the expected story. When running a packaged JAR, editing source application.properties does not change the already-built archive; rebuild it or use the taught environment override. An environment override affects the next process, not one already running.

For port conflict, leave one process listening and start another with the same address and port. The second cannot bind. Stop the extra process after the observation. For a proxy mismatch, the frontend can load but /api requests fail at the forwarding boundary. Restore each condition before trying the next so the evidence has one changing cause.

A useful incident note includes “changing X produced Y, restoring X removed Y” alongside the original symptom. It is stronger than “I restarted and it worked,” which does not identify which state changed.

On a practice branch, change the datasource URL to a path inside a nonexistent or unwritable parent location in a disposable directory. Start the packaged app and capture the first causal exception, not only the last framework wrapper. Restore the original configuration.

Next run the application twice against the same port. Compare the failure category with the database error. Finally point the frontend development proxy at the wrong port and inspect what the browser sees. Each symptom has a different boundary: persistence, process binding or proxy routing.

Write `operations/incident.md` with timeline, user impact, evidence, root cause, recovery and a prevention test. Do not include credentials. A useful postmortem explains the system conditions that permitted the failure, not just who typed the wrong value.

```check
file operations/incident.md
```

## Review a change as its future maintainer

### Review one boundary at a time

Start with a requirement, then trace its path through the diff. For creation: input draft → JSON → authenticated/authorized request → request record → normalized Task → bound INSERT → response → refreshed view. At each boundary ask which representation changed, which validation ran, and which failure leaves state unchanged.

Suppose repeated row mapping is extracted into a helper. A focused refactor should preserve selected columns, conversion order, constructor validation and ordering contract. Existing tests should remain unchanged unless their own structure—not the requirement—needs repair. Adding descriptions in the same diff would mix a product change with that refactor and obscure what caused a regression.

A useful review comment identifies consequence and evidence: “This clears the draft before server acceptance; the failed-save test should demonstrate preservation.” A preference such as “I dislike this name” needs a concrete ambiguity to justify work. Classify findings as correctness, missing evidence, maintainability or preference so the author can prioritize them.

Review your accumulated diff and history. Trace one task creation across browser state, JSON, security, controller, domain validation, JDBC and response rendering. Explain every dependency encountered.

Find a place where a name conceals intent, a test asserts too little, or a repeated mapping deserves extraction. Make one focused refactor with tests green before and after. Keep product behavior constant. If the change needs a new requirement, separate it from the refactor.

In `decisions/013-review.md`, record the concern, why it matters and what evidence resolves it. Review comments should identify consequences, not enforce personal preference without a reason.

```check
run "mvn -q test" timeout=180
file decisions/013-review.md
```

## Challenge — Diagnose a misleading success

Write `challenges/Response.java` that accepts an HTTP status and prints `success` only for 200 through 299 inclusive; otherwise print `failure`. Then explain why a successful status still does not prove the returned JSON matches a client contract.

The transfer is small on purpose: separate transport classification from domain validity. If 300 is accepted, inspect the upper bound; if 199 is accepted, inspect the lower bound.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Response.java 200" stdout="success"
run "java challenges/Response.java 299" stdout="success"
run "java challenges/Response.java 300" stdout="failure"
run "java challenges/Response.java 199" stdout="failure"
```
