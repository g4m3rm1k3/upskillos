---
title: Java reasoning — plan dependent work with a graph
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Tasks often have prerequisites: testing a release depends on building it, while packaging depends on tests. A flat list cannot express that relation. We will build and test a planning utility, separate from HTTP, that either orders work legally or explains why no valid order exists. Integrating dependencies into the UI is later product work.

## Start with a compilable contract

This temporary implementation supplies the types and method signatures needed to compile a test without solving the requirement. Returning the current task or throwing Not implemented is deliberately incomplete behavior. It lets a test fail for a behavioral reason instead of failing because a method does not exist. We replace this short stub only after observing the intended red result.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/DependencyPlan.java`:

```java edit=src/main/java/workspace/DependencyPlan.java mode=replace
package workspace;
import java.util.*;
public final class DependencyPlan {
    private DependencyPlan() {}
    public static List<String> order(Map<String, Set<String>> required) {
        throw new UnsupportedOperationException("Not implemented");
    }
}
```

## Verify a valid order and invalid structures

Set.<String>of explicitly supplies the generic type for an empty set in this expression. Run against the stub and confirm Not implemented is the cause of red. The expected sequence follows the requirement, not the implementation's map iteration order. The cycle and unknown-node examples distinguish structurally different failures.

Add a case with two independent ready tasks and verify alphabetical tie-breaking. Compare this utility with sorting alphabetically alone: sorting labels cannot respect arbitrary prerequisite edges. The transferable skill is choosing a representation and invariant that match the problem.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/DependencyPlanTest.java`:

```java edit=src/test/java/workspace/DependencyPlanTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class DependencyPlanTest {
    @Test void plansAndRejectsImpossibleWork() {
        var graph = Map.of("build", Set.<String>of(), "test", Set.of("build"), "release", Set.of("test"));
        assertEquals(List.of("build", "test", "release"), DependencyPlan.order(graph));
        assertEquals(List.of(), DependencyPlan.order(Map.of()));
        assertThrows(IllegalArgumentException.class,
            () -> DependencyPlan.order(Map.of("a", Set.of("b"), "b", Set.of("a"))));
        assertThrows(IllegalArgumentException.class,
            () -> DependencyPlan.order(Map.of("a", Set.of("missing"))));
    }
}
```

```check
run "mvn -q test" exit=1 timeout=180 -- Confirm the failure is the deliberately incomplete behavior, not syntax or dependency resolution.
```

## Choose representations that express the question

The input maps a task id to the set of ids it requires. A Set excludes duplicate edges. Remaining counts unmet prerequisites; followers maps a finished prerequisite to tasks it can unblock. These two indexes answer different questions efficiently.

Generics describe nested structure: Map<String, Set<String>> means string keys and sets of string values. The compiler checks those relationships; it does not prove the graph has no cycles. Integer is the object wrapper for int because Java generic parameters use reference types. Auto-boxing converts between them as needed.

An empty graph should return an empty plan. Unknown prerequisite ids are invalid input. Multiple valid orders are possible; we choose alphabetical tie-breaking for deterministic behavior and tests.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/DependencyPlan.java`:

```java edit=src/main/java/workspace/DependencyPlan.java mode=replace
package workspace;
import java.util.*;

public final class DependencyPlan {
    private DependencyPlan() {}
    public static List<String> order(Map<String, Set<String>> required) {
        Map<String, Integer> remaining = new HashMap<>();
        Map<String, List<String>> followers = new HashMap<>();
```

## Build the reverse index with explicit loops

An enhanced for loop visits each map entry. The inner loop visits its prerequisite edges. Trace an example on paper: build requires nothing; test requires build; release requires test. Remaining begins at 0,1,1. Followers of build contains test; followers of test contains release.

computeIfAbsent creates a list only when a key has no value. The lambda's parameter is the missing key; its body returns the new value. We then add the dependent id to that list. A priority queue removes the smallest ready id, making the tie-break rule explicit. An ordinary queue would be cheaper when arbitrary valid order is acceptable.

Type this fragment yourself. Append to `src/main/java/workspace/DependencyPlan.java`:

```java edit=src/main/java/workspace/DependencyPlan.java mode=append
        for (var entry : required.entrySet()) {
            remaining.put(entry.getKey(), entry.getValue().size());
            for (String prerequisite : entry.getValue()) {
                if (!required.containsKey(prerequisite)) {
                    throw new IllegalArgumentException("Unknown prerequisite: " + prerequisite);
                }
                followers.computeIfAbsent(prerequisite, key -> new ArrayList<>()).add(entry.getKey());
            }
        }
        PriorityQueue<String> ready = new PriorityQueue<>();
        for (var entry : remaining.entrySet()) {
            if (entry.getValue() == 0) ready.add(entry.getKey());
        }
        List<String> result = new ArrayList<>();
```

## Maintain the algorithm invariant

While repeats until its boolean condition is false. The invariant is that every id in ready has no unfinished prerequisites. Finishing one id reduces each follower's remaining count once. A follower becomes ready exactly when its count reaches zero. getOrDefault supplies an empty list when no task follows an id, avoiding a null branch.

If some nodes remain but none is ready, a cycle prevents progress. A self-dependency is a cycle too. List.copyOf prevents callers from mutating our returned plan. The algorithm visits each vertex and edge; priority-queue operations add a log V factor for ready nodes. Storing the reverse index costs memory but avoids rescanning every dependency after each completed task.

Debug by tracing the invariant and counts, not by memorizing the loop. Predict what happens if a node enters ready twice, and why using a Set for prerequisites helps prevent duplicate-edge counting errors.

Type this fragment yourself. Append to `src/main/java/workspace/DependencyPlan.java`:

```java edit=src/main/java/workspace/DependencyPlan.java mode=append
        while (!ready.isEmpty()) {
            String finished = ready.remove();
            result.add(finished);
            for (String follower : followers.getOrDefault(finished, List.of())) {
                int count = remaining.get(follower) - 1;
                remaining.put(follower, count);
                if (count == 0) ready.add(follower);
            }
        }
        if (result.size() != required.size()) {
            throw new IllegalArgumentException("Dependency cycle");
        }
        return List.copyOf(result);
    }
}
```

## Verify green, then refactor

Run the same suite after completing the implementation. A passing result must replace the earlier behavioral failure. Inspect the diff for changes unrelated to the requirement. Make one small naming or extraction improvement if it helps comprehension, and run the suite again. Tests protect the specified behavior during refactoring; they do not justify adding unrequested behavior.

```check
run "mvn -q test" timeout=180
```
