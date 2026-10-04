---
title: Independent milestone — own a reviewable change
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

You now have a running application whose behavior crosses meaningful boundaries. This milestone asks you to use the course's reasoning without following an implementation fragment. It is optional practice, not a gate: the final synthesis remains available even if you defer it.

## Turn a request into bounded engineering work

Choose one change: reopening a completed task with an audit event; adding a paginated search interface; or exposing the description field through a safe schema upgrade. These alternatives exercise different boundaries without requiring another complete application.

Create `decisions/014-change-brief.md`. State the user problem, acceptance examples, non-goals, compatibility constraints, failure cases and a small implementation plan. Identify which tests should fail before the change. For an uncertain library API, run a focused disposable experiment before committing to a design.

Act as technical lead: split the work by observable outcomes rather than arbitrary files, identify dependencies between tasks and record the tradeoff you rejected. An estimate should identify uncertainty, not disguise it as precision.

```check
file decisions/014-change-brief.md
```

## Challenge — Ship and explain the change

Implement the chosen brief on a branch. Write the tests, observe a relevant failure, implement the smallest correct behavior, then refactor. Test an error case and a compatibility case. Submit a reviewable diff with the test commands, evidence and limitations.

There is deliberately no generic automatic pass for this open-ended challenge. A reviewer should check that the implementation satisfies the brief, the tests detect a planted regression, and you can trace the behavior without assistance. Record that review in `decisions/015-independent-review.md`. The practice list keeps this task available; continuing does not certify it.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.
