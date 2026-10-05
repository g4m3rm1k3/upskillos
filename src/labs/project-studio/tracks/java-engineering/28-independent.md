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

### Define a finish line before writing the implementation

Choose one option, not all three. Write acceptance examples for normal use, an invalid input or state, permission denial, stale or changing data where relevant, and compatibility with existing behavior. Identify the smallest test that should first fail because the new behavior is absent. A compilation failure from a missing method is setup work; it is not the intended behavioral failure.

For a reopened task, decide its destination state and whether the event history records the new revision. For pagination, decide how the UI exposes the next page, empty results and refresh under concurrent insertions. For descriptions, decide old-row defaults, the upgrade path and what an old release can still read. These decisions lead to different code; no single hidden reference solution can grade all defensible briefs.

Prepare a work plan with an outcome, dependency and evidence for each increment. An uncertain API or migration behavior deserves a small bounded experiment first. Record the question and the result so the experiment reduces uncertainty instead of growing into an unreviewed alternate implementation.

### Work through a brief without giving away its implementation

For reopening, first ask whether DONE returns to DOING or TODO. Those alternatives affect workflow, audit history and button meaning. Specify one. State what happens to revision, whether a viewer is denied, and whether an old screen can reopen a task after another change. Then identify the boundaries affected: domain transition, versioned persistence, HTTP contract and UI action.

A useful plan names observable increments: establish the new transition contract; preserve atomic audit behavior; expose authorized transport behavior; make the action understandable on screen. “Edit Task.java, then Controller.java” lists files but does not explain why each change is complete or correct.

For search pagination, specify empty pages and data changing between reads. For descriptions, specify existing rows and old application compatibility. Each option inherits earlier engineering techniques but changes the requirements. If you cannot state an expected observation, investigate the requirement before committing to an implementation.

Choose one change: reopening a completed task with an audit event; adding a paginated search interface; or exposing the description field through a safe schema upgrade. These alternatives exercise different boundaries without requiring another complete application.

Create `decisions/014-change-brief.md`. State the user problem, acceptance examples, non-goals, compatibility constraints, failure cases and a small implementation plan. Identify which tests should fail before the change. For an uncertain library API, run a focused disposable experiment before committing to a design.

Act as technical lead: split the work by observable outcomes rather than arbitrary files, identify dependencies between tasks and record the tradeoff you rejected. An estimate should identify uncertainty, not disguise it as precision.

```check
file decisions/014-change-brief.md
```

## Challenge — Ship and explain the change

### Use this review rubric for the independent result

Ask a peer to select an input you did not rehearse. If working alone, return after a break, hide your implementation notes and use a new case. Self-review is useful evidence but is not equivalent to independent review. Record who reviewed and which observations were made.

| Area | Evidence a reviewer should inspect | A result that needs more practice |
|---|---|---|
| Requirement | Explain the actor, outcome, failure cases and excluded work | The implementation defines the requirement after the fact |
| Reasoning | Trace an unfamiliar input through values and state changes | Explain only method names or repeat comments |
| Tests | Show intended red, green and rejection of a plausible planted regression | Green after changing assertions to match the defect |
| Design | Identify the boundary changed and a rejected alternative with its cost | More layers without a reason tied to change |
| Integrity | Show permission, invalid-state and persistence/compatibility evidence relevant to the brief | Correct happy path with corrupted or unauthorized failure paths |
| Delivery | Reproduce the packaged behavior from the recorded source and configuration | It works only in the author's open editor |
| Reviewability | Present a focused diff, clear decisions, exact checks and honest limitations | Unrelated rewrites or unsupported claims of completion |

For each area write **demonstrated**, **needs practice**, or **not assessed**, followed by the actual evidence. Do not average them into an invented mastery score. If an important area needs practice, select the relevant lesson, make one targeted correction and ask for another review of that evidence. You can still continue to the final synthesis.

### Prepare a handoff another engineer can use

Include the change brief, implementation branch/diff, test commands and outputs, release/recovery observations and unresolved product limits. Explain the smallest way to reproduce one success and one meaningful failure. Record which requirements were checked automatically, manually, or not yet checked.

There is no generated answer to paste and no generic file-existence check that certifies this work. The course supplies the techniques; this optional milestone asks you to select and combine them. A failed attempt belongs in Practice to revisit, not behind a locked next lesson.

Implement the chosen brief on a branch. Write the tests, observe a relevant failure, implement the smallest correct behavior, then refactor. Test an error case and a compatibility case. Submit a reviewable diff with the test commands, evidence and limitations.

There is deliberately no generic automatic pass for this open-ended challenge. A reviewer should check that the implementation satisfies the brief, the tests detect a planted regression, and you can trace the behavior without assistance. Record that review in `decisions/015-independent-review.md`. The practice list keeps this task available; continuing does not certify it.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.
