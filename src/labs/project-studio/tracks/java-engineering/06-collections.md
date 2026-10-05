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

### Read the three method signatures as promises

A collection holds multiple values. A **list** is an ordered sequence that can contain duplicates. `List<Task>` means a list whose elements must be Task values. The angle brackets supply a **generic type argument**: the same collection abstraction can be used for different element types while the compiler checks each use. Calling `size()` returns the number of elements; reading element zero returns a Task rather than arbitrary Object.

An **interface** declares operations that implementing classes must provide. Each line ends with a semicolon instead of a method body because this contract does not choose an algorithm. `list()` takes no arguments and returns a list. `add(String title)` receives text and returns the created task. `advance(UUID id, long expectedRevision)` needs both identity and the version the caller saw.

Java signatures cannot express every promise. We additionally require list to return a stable, unmodifiable snapshot, and advance to reject a stale revision without changing stored state. Our tests will make these semantic promises visible. Two classes can satisfy the same types yet disagree on whether a list changes later; compiling is not sufficient to establish substitutability.

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

### Implement an interface without implementing its behavior yet

`implements TaskStore` promises that MemoryTasks supplies TaskStore's declared operations. Java verifies their parameter and return types. These implementations are public because callers through the interface must be able to invoke them. The method name and parameter types establish the match; a parameter's local name can differ, so revision here still implements expectedRevision in the interface.

`import java.util.*` makes accessible types directly in that package available by short name, including List and UUID. It does not import subpackages or execute library code. The compiler resolves names used in this file; the asterisk does not construct every collection.

Each stub throws UnsupportedOperationException, as Titles did in the TDD lesson. This gives the test a complete callable shape while making absent behavior explicit. **Predict:** omitting advance entirely would be a compile-time failure to fulfill the interface, while leaving its throwing stub compiles and fails when that operation is invoked. We need the latter to observe a meaningful behavioral red.

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

### A snapshot is an observation at one point in time

`TaskStore store = new MemoryTasks()` constructs a concrete storage object and retains it through an interface-typed reference. The compiler allows the operations declared by TaskStore. At runtime the object's MemoryTasks implementations execute. This separates what a caller needs from which implementation supplies it.

After the first add, the store holds one task. `var snapshot = store.list()` infers `List<Task>` from the method's return type; it does not remove type checking. Adding the second task should change the store to two tasks but leave the snapshot at one. The size assertion distinguishes a snapshot from a live view.

`snapshot::clear` supplies a deferred reference to that particular list's no-argument method. It means the same action as `() -> snapshot.clear()`. JUnit invokes it and expects UnsupportedOperationException because callers must not clear the returned snapshot.

Both advances deliberately send expected revision 0. The first changes the stored value to revision 1. The second is now stale. **Predict:** if the test sent revision 1 on its second call, would a correct implementation throw a stale error? No; that would be a new valid transition, testing a different contract.

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

### Follow keys, values and references

A **map** associates each key with a value. Our key is a UUID and our value is a Task, written `Map<UUID, Task>`. `new LinkedHashMap<>()` creates an empty map; `<>` lets the compiler infer the two type arguments from the declared variable. This implementation remembers insertion order, so listing can reflect the order tasks were added.

The field `tasks` belongs to each MemoryTasks instance. `private` prevents callers directly using that field. `final` prevents assigning a different map to it after construction. It does not prevent `put` changing entries inside the existing map. Distinguish an unchanging reference from an unchanging object.

`tasks.values()` exposes a collection view of the map's current values. Returning it directly would couple callers to later mutations. `List.copyOf(tasks.values())` instead creates an unmodifiable list containing the current Task references. When the map later stores a newer Task for an id, the old snapshot still holds the old immutable Task value. Both copying the collection and immutable elements contribute to this guarantee.

Trace add: normalize/validate through `new Task`, obtain the task's id with `task.id()`, associate that key with the task using `put`, and return the task to the caller. If construction throws, put is never reached, so the map stays unchanged. `put` can also replace an existing key; our advance operation will use that behavior.

**Cost tradeoff:** finding one known id in a hash-based map is expected constant-time under ordinary hashing behavior. Listing must still visit the entries. A map does not make every operation constant-time. Maintaining insertion order also requires bookkeeping. Choose the structure for the actual queries you need.

A thread is an independent path of execution inside a process. `synchronized` ensures only one cooperating synchronized instance method on this same object runs at once, using the object's monitor. Another MemoryTasks instance has a different monitor. A second process has separate memory entirely. This protects a local prototype; it does not establish database or distributed consistency.

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

### Locate the exact moment state changes

`tasks.get(id)` returns the mapped Task or null if this map has no such id. A missing id throws NoSuchElementException. For an existing task, `!=` compares the stored numeric revision with the caller's expected number. A mismatch throws before a new task is stored.

If both checks pass, `current.advance()` computes a new immutable task, and `tasks.put(id, next)` replaces the stored reference. This put is the mutation. Returning next lets the caller see exactly what was stored. If advancing a DONE task throws, the put is skipped and the map still contains the original DONE value.

| Command | Stored before | Expected revision | Outcome / stored after |
|---|---|---|---|
| Editor A advances | TODO, 0 | 0 | DOING, 1 |
| Editor B advances from old screen | DOING, 1 | 0 | Reject; still DOING, 1 |
| B reloads, reviews and advances | DOING, 1 | 1 | DONE, 2 |

**Break it on a practice branch:** remove the revision comparison. The stale-command assertion should fail because the second old request is accepted. Restore it. Then explain why locking only put would be insufficient: two threads could both read revision 0 and pass their checks before either put. The whole read/check/write sequence must be protected.

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

### Compare the old snapshot with a fresh read

After adding two tasks, the old snapshot should contain one and a new list call should contain two. After advancing the first task, inspect the corresponding values in both snapshots: the old immutable task remains TODO while the new read contains DOING. This distinguishes copying the list from merely wrapping a live collection.

Explain why this guarantee needs both an unmodifiable collection and immutable Task elements. A list can reject clear yet still expose mutable elements. If you replace the storage implementation later, retain these observations as contract tests rather than checking that it uses a particular map class.

Run the same suite after completing the implementation. A passing result must replace the earlier behavioral failure. Inspect the diff for changes unrelated to the requirement. Make one small naming or extraction improvement if it helps comprehension, and run the suite again. Tests protect the specified behavior during refactoring; they do not justify adding unrequested behavior.

```check
run "mvn -q test" timeout=180
```
