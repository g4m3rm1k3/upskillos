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

An enum restricts a value to named alternatives. Strings would allow spelling variations such as `doing`, `DOING` and `In Progress` unless every caller validated them. Status is a domain concept, not a screen color. This first board allows forward transitions only; reopening is a later change request.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Status.java`:

```java edit=src/main/java/workspace/Status.java mode=replace
package workspace;
public enum Status { TODO, DOING, DONE }
```

## Start with a compilable contract

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

Run the same suite after completing the implementation. A passing result must replace the earlier behavioral failure. Inspect the diff for changes unrelated to the requirement. Make one small naming or extraction improvement if it helps comprehension, and run the suite again. Tests protect the specified behavior during refactoring; they do not justify adding unrequested behavior.

```check
run "mvn -q test" timeout=180
```
