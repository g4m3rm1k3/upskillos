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

### Work a change through two designs

Assume the requirement is “tasks must survive restarting the process.” In the current design Task controls valid state, while TaskStore describes storage operations. A database adapter can implement those operations and reuse Task's constructor and advance logic. Controller code can keep using the same contract.

Now imagine Task.advance opens a database connection itself. A transition test would need connection configuration even when it only asks whether TODO becomes DOING. A change in database setup would affect a domain operation that should not care where values are stored. That is concrete coupling: one responsibility depends on another's implementation details.

The opposite extreme also costs something. Splitting one subtraction into an interface, factory and adapter creates more names to follow without isolating a meaningful variation. Judge an abstraction by the change it localizes and the understanding it preserves, not by class count.

**Predict and justify:** replacing a map with SQL changes durability and ordering behavior. Which existing test constrains snapshots? Which requirement defines list order? An interface alone cannot preserve a promise nobody wrote down. Record both code-level and semantic compatibility in your storage decision.

Consider adding database persistence. With the current boundary we can replace MemoryTasks while preserving Task and its transition rules. If SQL lived inside Task.advance, a pure domain test would need a database. Conversely, an interface for every trivial helper would add names without isolating a meaningful decision.

Write `decisions/003-storage.md`: compare a list, a map and a relational table for lookup, ordering, durability and concurrent updates. State which workload would make you revisit today's choice. Separate measured evidence from assumptions.

Define cohesion as how closely a module's responsibilities belong together. Coupling is how much one module depends on another's details. An abstraction is useful when its contract hides details callers do not need; a renamed pass-through method may hide nothing.

```check
file decisions/003-storage.md
```

## Make a bad test fail its own review

### Compare observations, not just green indicators

A weak assertion such as assertNotNull(store.add("Plan")) observes only that something was returned. A broken normalizer returning input still satisfies it. The whitespace assertion expects a concrete normalized string independently of the implementation, so that same mutation fails.

A circular assertion computes expected by calling the very operation being tested and compares it with another call. A consistently wrong implementation can satisfy both sides. Repeating the algorithm in the test can have the same weakness if both copies encode the same misunderstanding.

Use this review procedure: name the requirement; choose an example distinguishing correct behavior from a plausible mistake; predict the failure; make that mistake on a disposable branch; run the test; restore the implementation; rerun. If the test stays green, inspect the observation before adding more test lines. More assertions about irrelevant details do not make a test more discriminating.

On a practice branch, write a test that adds a task and merely asserts the returned value is non-null. Replace the title normalization implementation with `return input`. The weak test stays green while blank titles become possible.

Now run TitlesTest. Its examples catch the fault because they encode the requirement rather than repeating the implementation. Restore the implementation. Repeat with a test that calculates its expected value by calling the same method as the actual value: explain why that assertion is circular.

Tests can also fail for irrelevant reasons. A test depending on wall-clock time or execution order can be flaky. Use fixed inputs, fresh state and controllable collaborators. Mocking every internal call can make a test verify choreography rather than behavior; keep real small components together unless an external boundary makes substitution useful.

Record the mutation, the test that missed it and the test that caught it in `decisions/004-test-evidence.md`. A green suite limits uncertainty; it cannot prove untested requirements.

```check
run "mvn -q test" timeout=180
file decisions/004-test-evidence.md
```

## Challenge — A test suite that earns trust

### Choose a collection from its equality rule

An array preserves every argument, including duplicates. A set keeps one entry per distinct value. A mutable `HashSet<String>` can begin empty; its add method records a string if that value is not already present, and size reports the distinct count. Import HashSet from java.util before using its short name. For strings, its equality rule is content equality, so two separately obtained strings containing Fix count as the same value. Fix and fix remain different.

Use an enhanced for loop over args, as you used over prerequisite sets in the graph exercise. Normalize each argument with strip before adding it. A new empty set has size zero, so the no-argument case follows naturally instead of needing a special branch. Explain why normalization must occur before deduplication rather than only when printing.

In `challenges/Unique.java`, accept titles as command-line arguments, normalize surrounding whitespace, remove duplicates case-sensitively and print the number of distinct titles. Use an appropriate collection rather than nested scans. Empty input should print 0.

Before checking, write down whether `Fix` and `fix` should be identical. Our contract says they are different. If your result differs, investigate equality rules before changing the assertion.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Unique.java Fix Fix Review" stdout="2"
run "java challenges/Unique.java Fix fix" stdout="2"
run "java challenges/Unique.java" stdout="0"
```
