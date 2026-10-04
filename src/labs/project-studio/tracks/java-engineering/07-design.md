---
title: Design and testing — useful boundaries, misleading green
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

We now have a domain value, a normalization rule, and a storage boundary. That separation is useful because each has a different reason to change. More classes are not automatically better design; extra indirection has a reading and maintenance cost.

## Compare designs against a change

Consider adding database persistence. With the current boundary we can replace MemoryTasks while preserving Task and its transition rules. If SQL lived inside Task.advance, a pure domain test would need a database. Conversely, an interface for every trivial helper would add names without isolating a meaningful decision.

Write `decisions/003-storage.md`: compare a list, a map and a relational table for lookup, ordering, durability and concurrent updates. State which workload would make you revisit today's choice. Separate measured evidence from assumptions.

Define cohesion as how closely a module's responsibilities belong together. Coupling is how much one module depends on another's details. An abstraction is useful when its contract hides details callers do not need; a renamed pass-through method may hide nothing.

```check
file decisions/003-storage.md
```

## Make a bad test fail its own review

On a practice branch, write a test that adds a task and merely asserts the returned value is non-null. Replace the title normalization implementation with `return input`. The weak test stays green while blank titles become possible.

Now run TitlesTest. Its examples catch the fault because they encode the requirement rather than repeating the implementation. Restore the implementation. Repeat with a test that calculates its expected value by calling the same method as the actual value: explain why that assertion is circular.

Tests can also fail for irrelevant reasons. A test depending on wall-clock time or execution order can be flaky. Use fixed inputs, fresh state and controllable collaborators. Mocking every internal call can make a test verify choreography rather than behavior; keep real small components together unless an external boundary makes substitution useful.

Record the mutation, the test that missed it and the test that caught it in `decisions/004-test-evidence.md`. A green suite limits uncertainty; it cannot prove untested requirements.

```check
run "mvn -q test" timeout=180
file decisions/004-test-evidence.md
```

## Challenge — A test suite that earns trust

In `challenges/Unique.java`, accept titles as command-line arguments, normalize surrounding whitespace, remove duplicates case-sensitively and print the number of distinct titles. Use an appropriate collection rather than nested scans. Empty input should print 0.

Before checking, write down whether `Fix` and `fix` should be identical. Our contract says they are different. If your result differs, investigate equality rules before changing the assertion.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Unique.java Fix Fix Review" stdout="2"
run "java challenges/Unique.java Fix fix" stdout="2"
run "java challenges/Unique.java" stdout="0"
```
