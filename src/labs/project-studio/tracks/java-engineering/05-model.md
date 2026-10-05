---
title: Model state — values, identity and invariants
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

An invariant is a condition that must remain true for every valid instance. Centralizing invariants prevents each caller from inventing a different definition of a task. A record provides value-oriented structure; it does not decide your business rules.

## Enumerate the allowed states

### Represent a rule instead of relying on spelling

Suppose two callers send `"in progress"` and `"DOING"`. Humans may mean the same state, but those strings differ. An **enum** declares a fixed set of named values: `Status.TODO`, `Status.DOING`, and `Status.DONE`. A variable of type Status can refer to one of those values (or null, which we will reject when constructing a task). It cannot hold arbitrary text.

`public enum Status { TODO, DOING, DONE }` is a complete type declaration. The comma separates constants. `Status.DOING` uses the type name and a dot to select one constant. Naming the possible states does not decide which transitions are legal. That rule belongs in the operation that changes state.

Draw three boxes and two arrows: TODO → DOING → DONE. An arrow describes an allowed command, not just a visual arrangement. There is no arrow out of DONE in our current rule. **Predict:** does defining the enum alone prevent someone constructing a DONE task directly? No. It restricts the vocabulary, not the workflow. Construction and transition rules must be specified separately.

An enum restricts a value to named alternatives. Strings would allow spelling variations such as `doing`, `DOING` and `In Progress` unless every caller validated them. Status is a domain concept, not a screen color. This first board allows forward transitions only; reopening is a later change request.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Status.java`:

```java edit=src/main/java/workspace/Status.java mode=replace
package workspace;
public enum Status { TODO, DOING, DONE }
```

## Start with a compilable contract

### Separate an object from the variable that refers to it

`UUID` is a library type for a 128-bit identifier. Its import allows the short name instead of `java.util.UUID`. Two tasks may both be titled “Review,” so title is unsuitable as a unique identity. A UUID gives each task a separate identity without requiring a single counter in this process.

The record header declares four **components** in order: id, title, status, revision. Java supplies private final fields, a constructor accepting those four values, and accessor methods named `id()`, `title()`, `status()` and `revision()`. An accessor returns a component value; parentheses still mean a method call, even though the method has no arguments. Java also supplies equality and hashing based on all components, plus a text representation useful in diagnostics.

`new Task(id, "Plan", Status.TODO, 0)` constructs one object with those values. Assigning it to `Task before` stores a reference to that object. `before.advance()` invokes an **instance method** on the referenced task. Inside that call, `this` refers to that same object. The stub's `return this` returns the original object unchanged, deliberately failing the transition requirement.

Revision uses `long`, a signed 64-bit integer rather than int's 32 bits. The literal 0 can be widened to long for the constructor. Revision 0 means the initial version; revision 1 means one successful transition. It is not the task's identity, and two different tasks may both be at revision 1.

This temporary implementation supplies the types and method signatures needed to compile a test without solving the requirement. Returning the current task or throwing Not implemented is deliberately incomplete behavior. It lets a test fail for a behavioral reason instead of failing because a method does not exist. We replace this short stub only after observing the intended red result.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Task.java`:

```java edit=src/main/java/workspace/Task.java mode=replace
package workspace;
import java.util.UUID;
public record Task(UUID id, String title, Status status, long revision) {
    public Task advance() { return this; }
}
```

## Observe transitions without internal coupling

### Trace two references through the test

`UUID.randomUUID()` asks the library for a randomly generated identifier. The test does not assert its exact characters; it asserts that advancing preserves whatever identity was assigned. This avoids depending on an irrelevant random value.

After construction, `before` refers to (id A, Plan, TODO, 0). The call assigning `after` should produce (id A, Plan, DOING, 1). `before` must still refer to the original value. The first two assertions inspect both sides: checking only `after` would miss an implementation that also mutated the original.

The last expression chains two method calls inside the deferred lambda. Start from `after`, which should be DOING. Its first `advance()` returns a DONE task. The second invokes advance on that returned task and should throw. Read the dots from left to right, carrying the receiver returned by each call. It does not advance the `after` variable twice in place.

**Predict the stub's failure:** before and after refer to the same TODO object. The first assertion passes, the second expects DOING and fails. The rest of that test method does not run after an assertion failure. That is why one red report does not mean every subsequent assertion was exercised.

This test observes externally meaningful values. It does not assert that a switch or helper method exists. Such implementation assertions would obstruct a valid refactor. Run against the temporary return-this implementation. It should fail on the expected status. The next steps replace the stub, after which this same test must turn green.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/TaskTest.java`:

```java edit=src/test/java/workspace/TaskTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class TaskTest {
    @Test void advancesWithoutChangingTheOriginal() {
        Task before = new Task(UUID.randomUUID(), "Plan", Status.TODO, 0);
        Task after = before.advance();
        assertEquals(Status.TODO, before.status());
        assertEquals(Status.DOING, after.status());
        assertEquals(before.id(), after.id());
        assertEquals(1, after.revision());
        assertThrows(IllegalStateException.class, () -> after.advance().advance());
    }
}
```

```check
run "mvn -q test" exit=1 timeout=180 -- Confirm the failure is the deliberately incomplete behavior, not syntax or dependency resolution.
```

## Construct valid task values

### Validation runs before a usable value escapes

The compact constructor `public Task { ... }` is special record syntax: it receives the header's component parameters without repeating the parameter list. Java assigns the resulting parameter values to the record's fields after this body finishes normally. This lets us normalize the title once for every construction path.

`Objects.requireNonNull(id)` throws if id is null and otherwise returns the argument. We ignore its return because the purpose here is validation. Repeat for status. `title = Titles.normalize(title)` evaluates normalization and reassigns the constructor parameter, so the generated field assignment stores the normalized result. If normalization throws, construction does not return a Task to the caller.

For revision -1, `revision < 0` is true and construction throws. For 0 it is false. A record's generated structure alone would accept invalid values; the constructor establishes our **invariant**, the condition every successfully constructed task must satisfy.

**Inspect a design tradeoff:** a record containing a `List<String>` field would copy the list reference, not automatically copy its contents. A caller holding the same mutable list could still modify it. Our components are immutable value types, so sharing their references does not let callers rewrite a task. Records provide shallow immutability; the component choices matter.

A record declares components and supplies accessors such as `title()`, value equality and a constructor. The compact constructor validates and normalizes arguments before generated field assignment. UUID provides identity independent of a title; titles can repeat. `long` is a signed 64-bit integer. Revision identifies a version of this task, not a date.

References are copied when passed to methods. An immutable task can safely be shared because callers cannot change its fields. A record containing a mutable list would not automatically make that list immutable. We deliberately use immutable component types here. The closing class brace comes after the next method.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Task.java`:

```java edit=src/main/java/workspace/Task.java mode=replace
package workspace;
import java.util.Objects;
import java.util.UUID;

public record Task(UUID id, String title, Status status, long revision) {
    public Task {
        Objects.requireNonNull(id);
        Objects.requireNonNull(status);
        title = Titles.normalize(title);
        if (revision < 0) throw new IllegalArgumentException("Negative revision");
    }
```

## Make a state transition explicit

```predict
question: A variable refers to a TODO task at revision 0. You execute task.advance() but do not save the return value. What does task still refer to?
choice: The original TODO task at revision 0.
choice: A DOING task at revision 1.
answer: The original TODO task at revision 0.
explain: advance returns a newly constructed immutable value. It does not reassign the caller’s task variable. Retain the returned reference if you need the new state.
```

### Evaluate the switch and then the constructor

`Status next = switch (status) { ... };` is an expression producing one value. Java reads this task's status, selects its matching case, and evaluates the expression after `->`. TODO produces Status.DOING; DOING produces Status.DONE; DONE throws instead of producing a status. The semicolon after the closing brace ends the variable declaration.

Next, `Math.addExact(revision, 1)` calculates the next revision. Ordinary integer addition can overflow and wrap; addExact throws an arithmetic exception if the result cannot fit. This prevents returning a task with a wrapped, misleading version. The constructor then validates the new values just as it did for the initial task.

| Receiver | Selected case | Returned task |
|---|---|---|
| A / Plan / TODO / 0 | TODO | A / Plan / DOING / 1 |
| A / Plan / DOING / 1 | DOING | A / Plan / DONE / 2 |
| A / Plan / DONE / 2 | DONE | No return; exception |

`task.advance();` is a valid statement even if its result is unused. For a TODO task it constructs a new value and discards the returned reference. The old variable still refers to TODO. To retain the new value, assign the result. **Transfer:** explain why returning a new value is useful when a caller needs both the old snapshot and new snapshot to review a change.

A switch expression produces a value; each arrow covers a possible enum value. Reaching DONE is an invalid command under today's rule, not a silent success. Returning a new task preserves the old snapshot. `Math.addExact` rejects overflow rather than wrapping a revision negative.

Predict the old and new revisions after `advance`. Explain why `task.advance();` without saving its result does not update a variable. This is a common immutability misunderstanding, not a Java quirk.

Type this fragment yourself. Append to `src/main/java/workspace/Task.java`:

```java edit=src/main/java/workspace/Task.java mode=append
    public Task advance() {
        Status next = switch (status) {
            case TODO -> Status.DOING;
            case DOING -> Status.DONE;
            case DONE -> throw new IllegalStateException("Task is already done");
        };
        return new Task(id, title, next, Math.addExact(revision, 1));
    }
}
```

## Verify green, then refactor

### Review the invariant, not just the test total

Trace one initial task through both valid advances, retaining all three returned values. Their identities should match, their statuses should be TODO/DOING/DONE, and their revisions should be 0/1/2. Calling advance on the last value should throw without changing any earlier value. Explain which constructor rule and which transition rule enforce each observation.

For a focused test improvement, add an observation that the title survives advancing; the existing transition test does not assert that field. Before adding it, ask what plausible defect it would catch: a transition constructing a new task with a different valid title. Establish green, plant that defect on a practice branch, observe the new assertion fail, and restore. This is improving evidence, not changing product behavior.

Run the same suite after completing the implementation. A passing result must replace the earlier behavioral failure. Inspect the diff for changes unrelated to the requirement. Make one small naming or extraction improvement if it helps comprehension, and run the suite again. Tests protect the specified behavior during refactoring; they do not justify adding unrequested behavior.

```check
run "mvn -q test" timeout=180
```
