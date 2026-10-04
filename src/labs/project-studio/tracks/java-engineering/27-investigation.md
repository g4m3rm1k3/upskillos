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

On a practice branch, change the datasource URL to a path inside a nonexistent or unwritable parent location in a disposable directory. Start the packaged app and capture the first causal exception, not only the last framework wrapper. Restore the original configuration.

Next run the application twice against the same port. Compare the failure category with the database error. Finally point the frontend development proxy at the wrong port and inspect what the browser sees. Each symptom has a different boundary: persistence, process binding or proxy routing.

Write `operations/incident.md` with timeline, user impact, evidence, root cause, recovery and a prevention test. Do not include credentials. A useful postmortem explains the system conditions that permitted the failure, not just who typed the wrong value.

```check
file operations/incident.md
```

## Review a change as its future maintainer

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
