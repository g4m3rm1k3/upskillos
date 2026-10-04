---
title: Collections and algorithms — choose for the query
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Our first board stores tasks in memory. That is a deliberate prototype boundary: state disappears on restart and is not shared between processes. It lets us understand storage behavior before SQL and framework configuration enter the picture.

## Define the storage contract

An interface names operations and their types without fixing storage. `List<Task>` uses a generic type parameter so the compiler rejects adding an unrelated value. The expected revision is part of the update contract because a stale caller must not overwrite newer work. Keeping it in the contract now makes the later database change local.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/TaskStore.java`:

```java edit=src/main/java/workspace/TaskStore.java mode=replace
package workspace;
import java.util.List;
import java.util.UUID;

public interface TaskStore {
    List<Task> list();
    Task add(String title);
    Task advance(UUID id, long expectedRevision);
}
```

## Start with a compilable contract

This temporary implementation supplies the types and method signatures needed to compile a test without solving the requirement. Returning the current task or throwing Not implemented is deliberately incomplete behavior. It lets a test fail for a behavioral reason instead of failing because a method does not exist. We replace this short stub only after observing the intended red result.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/MemoryTasks.java`:

```java edit=src/main/java/workspace/MemoryTasks.java mode=replace
package workspace;
import java.util.*;
public final class MemoryTasks implements TaskStore {
    public List<Task> list() { throw new UnsupportedOperationException("Not implemented"); }
    public Task add(String title) { throw new UnsupportedOperationException("Not implemented"); }
    public Task advance(UUID id, long revision) { throw new UnsupportedOperationException("Not implemented"); }
}
```

## Test snapshots and lost-update protection

`var` asks the compiler to infer a local variable's static type; it does not make Java dynamically typed. `snapshot::clear` is a method reference used as a deferred action. A fresh store inside the test isolates it from execution order.

Run this test against the stub. It should fail at the unimplemented operation. Confirm the test was discovered and the source compiled before proceeding to the implementation.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/StoreTest.java`:

```java edit=src/test/java/workspace/StoreTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StoreTest {
    @Test void keepsSnapshotsAndRejectsStaleCommands() {
        TaskStore store = new MemoryTasks();
        Task first = store.add("Build board");
        var snapshot = store.list();
        store.add("Review accessibility");
        assertEquals(1, snapshot.size());
        assertThrows(UnsupportedOperationException.class, snapshot::clear);
        assertEquals(Status.DOING, store.advance(first.id(), 0).status());
        assertThrows(IllegalStateException.class, () -> store.advance(first.id(), 0));
    }
}
```

```check
run "mvn -q test" exit=1 timeout=180 -- Confirm the failure is the deliberately incomplete behavior, not syntax or dependency resolution.
```

## Own mutable state behind a boundary

A map associates keys with values. UUID lookup avoids scanning every task; expected average lookup cost is constant for a hash-based map, while listing still visits all entries. LinkedHashMap preserves insertion order. A plain HashMap would not promise that order.

`private` restricts field access; `final` stops reassignment of the map reference, not mutation of the map. `List.copyOf` returns a snapshot callers cannot structurally modify. `synchronized` acquires this object's monitor for the whole method; cooperating calls on this instance cannot interleave. It does not protect another application process. We will return to that limitation in the concurrency lesson.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/MemoryTasks.java`:

```java edit=src/main/java/workspace/MemoryTasks.java mode=replace
package workspace;
import java.util.*;

public final class MemoryTasks implements TaskStore {
    private final Map<UUID, Task> tasks = new LinkedHashMap<>();
    public synchronized List<Task> list() {
        return List.copyOf(tasks.values());
    }
    public synchronized Task add(String title) {
        Task task = new Task(UUID.randomUUID(), title, Status.TODO, 0);
        tasks.put(task.id(), task);
        return task;
    }
```

## Reject stale edits before replacing state

A lookup can produce null for a missing key. Distinguish absence from a stale revision: one says the resource does not exist, the other says the caller's knowledge is outdated. Validation precedes mutation. If advance throws, the stored task remains unchanged.

This lock covers read, check and write as a single operation. Locking only the final put would leave a race where two callers both read the same revision. The tradeoff is serialized operations on one store; it is adequate for this prototype but not a measured scaling strategy.

Type this fragment yourself. Append to `src/main/java/workspace/MemoryTasks.java`:

```java edit=src/main/java/workspace/MemoryTasks.java mode=append
    public synchronized Task advance(UUID id, long expectedRevision) {
        Task current = tasks.get(id);
        if (current == null) throw new NoSuchElementException("Task not found");
        if (current.revision() != expectedRevision) {
            throw new IllegalStateException("Stale task; reload before editing");
        }
        Task next = current.advance();
        tasks.put(id, next);
        return next;
    }
}
```

## Verify green, then refactor

Run the same suite after completing the implementation. A passing result must replace the earlier behavioral failure. Inspect the diff for changes unrelated to the requirement. Make one small naming or extraction improvement if it helps comprehension, and run the suite again. Tests protect the specified behavior during refactoring; they do not justify adding unrequested behavior.

```check
run "mvn -q test" timeout=180
```
