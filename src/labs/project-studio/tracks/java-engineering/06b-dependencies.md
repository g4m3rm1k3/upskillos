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

### Build the representation from one concrete plan

“Build before test; test before release” has three tasks and two prerequisite relationships. A **directed graph** models tasks as vertices and prerequisite relations as directed edges. Our input stores each task's prerequisites: build maps to an empty set, test maps to {build}, and release maps to {test}.

A **set** contains each distinct value at most once. `Set<String>` prevents the same prerequisite name being counted twice. `Map<String, Set<String>>` is nested generic syntax: keys are strings; each value is a set of strings. The outer closing `>` ends Map's arguments, while the inner one ends Set's argument.

A plain alphabetical sort would order build, release, test and violate the release dependency. We need a **topological order**, in which every prerequisite appears before the task that depends on it. A cycle such as a requires b and b requires a makes such an order impossible. This is a logic problem independent of HTTP and databases.

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

### Construct the test data from the relationship

`Map.of` accepts alternating key/value arguments. Read the first declaration as three pairs: build → empty set, test → {build}, release → {test}. `Set.of("build")` creates an unmodifiable one-element set. `Set.<String>of()` explicitly selects String as the element type of an empty set, where no element value is available to infer that choice. These factories are suitable fixed test data; attempts to mutate their collections would throw.

`List.of("build", "test", "release")` constructs the expected ordered sequence. List equality compares corresponding elements in order, so the assertion rejects release before test. The empty-map assertion checks the absence of work separately from invalid work. The cycle example defines two existing nodes referring to one another. The missing example refers to a node not declared as a key. Both reject, but for different reasons.

All assertions here are in one method. Against the throwing stub the first assertion stops execution, so the later invalid cases are not yet evidence. They execute once the earlier case passes. In a larger suite, separate test methods give more independent failure reports; the compact grouping here keeps initial typing small.

**Predict:** Map.of's iteration order is not the alphabetical contract. The implementation must choose tie-breaking explicitly. Add two independent names in reverse alphabetical argument order and expect the alphabetical result; otherwise the test may accidentally validate an ordering supplied by its own setup.

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

### Distinguish the source graph from working state

required is caller-owned input and must remain unchanged. remaining is a new map of counters, initially empty. followers is another new map whose values are mutable lists. A HashMap stores key/value associations without promising insertion order; we do not need one here because ready will make the ordering decision.

For a diamond—build before unit and integration, then both before release—remaining should eventually start at 0,1,1,2. Followers of build must contain both unit and integration. Storing only one follower per key would overwrite one edge and leave part of the graph unprocessed. That is why this map's value is List<String>, not String.

The extra maps cost memory proportional to the represented tasks and relations. They let each completion update only its actual dependents instead of scanning the whole input repeatedly. Later performance decisions should name both the saved work and the extra storage.

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

### Expand the loop and callback mentally

`required.entrySet()` gives key/value entries. The enhanced loop `for (var entry : required.entrySet())` takes one entry per iteration; the colon means “from this iterable collection.” `entry.getKey()` reads the task id and `entry.getValue()` reads its prerequisite set. The inner loop visits each name in that set. The outer loop's next task waits until the current task's inner loop finishes.

`remaining.put(id, prerequisites.size())` records how many prerequisites are unfinished. `followers` records the reverse direction: which tasks should be notified when a prerequisite finishes. `containsKey` checks that each prerequisite names a task in our input. Unknown input is different from a cycle among known tasks.

Read `followers.computeIfAbsent(prerequisite, key -> new ArrayList<>()).add(entry.getKey())` in smaller operations. Look up prerequisite in followers. If there is no list, invoke the lambda with that key, obtain a new empty ArrayList, and store it. Whether new or existing, return the list. Finally add the dependent task's name to it. The lambda's `key` is unused because every missing key needs the same kind of empty list. Writing this as explicit lookup/null-check/put/add would express the same logic; the convenience method packages that sequence.

For our three tasks, the completed structures are:

| Id | Remaining prerequisites | Followers |
|---|---|---|
| build | 0 | test |
| test | 1 | release |
| release | 1 | no entry; later treated as empty |

A **priority queue** returns the smallest queued string when remove is called; here that gives alphabetical tie-breaking. It does not promise its internal iteration order is sorted. `ready` initially contains only build. `result` starts as an empty ArrayList, a mutable ordered sequence to which we can append finished ids.

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

### Follow each iteration, including the stopping condition

`while (!ready.isEmpty())` checks before each iteration. `isEmpty()` is true for no elements; `!` negates that boolean. If ready starts empty, the body runs zero times. `remove()` takes the smallest ready id, and `result.add` appends it to the plan.

`getOrDefault(finished, List.of())` reads the follower list, or an empty immutable list when no entry exists. The inner loop then runs zero times for a task with no followers. `remaining.get(follower)` returns an Integer object because generic collections use reference types; Java unboxes it to an int for subtraction. The new count replaces the old count in the map. Only the transition to zero makes a follower ready.

| Iteration | Removed | Count changed | Ready afterward | Result |
|---|---|---|---|---|
| 1 | build | test: 1 → 0 | test | build |
| 2 | test | release: 1 → 0 | release | build, test |
| 3 | release | none | empty | build, test, release |

Now trace a requires b and b requires a. Both counts start at 1; ready is empty; the loop never runs; result size 0 differs from required size 2. The final check detects incomplete processing and throws. An empty input also runs zero iterations, but both sizes are zero, so returning an empty plan is correct.

**Predict:** add an independent task called `docs`. Initially build and docs are ready. Removing build makes test ready, but docs sorts before test and is removed next. The order is build, docs, test, release. Alphabetical tie-breaking applies to *currently ready* tasks, not to the entire graph in advance.

**Transfer:** a spreadsheet formula depends on two other cells. Explain which part of this representation stays the same and which labels change. A useful algorithm is tied to the dependency relation, not to the words build and test.

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

### Check an input that requires combining prerequisites

Trace the diamond from the representation step. Finishing build makes integration and unit ready. Finishing only integration reduces release's count from 2 to 1; release must not become ready yet. Only after unit finishes does its count become 0. This example catches decrement/ready logic that a simple chain can miss.

A useful boundary table includes empty input, an independent pair, a chain, a diamond, an unknown prerequisite and a self-cycle. Write expected outcomes before execution. V names the number of vertices and E the number of edges when discussing complexity. Visiting each vertex and edge takes work proportional to V + E; maintaining the priority queue adds comparison work as the ready set grows. The notation describes growth, not a measured duration in milliseconds.

Run the same suite after completing the implementation. A passing result must replace the earlier behavioral failure. Inspect the diff for changes unrelated to the requirement. Make one small naming or extraction improvement if it helps comprehension, and run the suite again. Tests protect the specified behavior during refactoring; they do not justify adding unrequested behavior.

```check
run "mvn -q test" timeout=180
```
