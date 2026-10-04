---
title: Concurrency — reproduce an interleaving, do not guess
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A concurrency defect depends on the order in which operations overlap. Sleep-based tests hope for a schedule; coordination primitives establish one more deliberately. Our database revision condition should allow only one winner when two commands share the same version.

## Start competing workers together

Callable produces a value and can throw checked exceptions. CountDownLatch lets both submitted workers wait until the test releases them. We catch only the expected conflict; unrelated database or programming errors must fail the test rather than being counted as acceptable losers.

Java threads share references, but JDBC transactions use their own connections. A synchronized method on one in-memory store cannot coordinate separate application instances, which is why the database predicate matters.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/ConcurrencyTest.java`:

```java edit=src/test/java/workspace/ConcurrencyTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ConcurrencyTest {
    @Autowired TaskStore store;
    @Test void oneSnapshotCanAdvanceOnlyOnce() throws Exception {
        Task task = store.add("Concurrent review");
        var start = new CountDownLatch(1);
        Callable<Boolean> command = () -> {
            start.await();
            try { store.advance(task.id(), 0); return true; }
            catch (IllegalStateException conflict) { return false; }
        };
```

## Bound waiting and inspect the result

Future represents eventual completion. A timeout makes a hung operation visible rather than waiting forever in the assertion. The executor is closed after use. This exercises two requests in one process; it does not prove every database or distributed deployment behaves identically.

Temporarily remove `AND revision=?` and its matching parameter from the update on a practice branch. Inspect whether this particular schedule catches the bug, then use the stale-version and rollback tests too. One passing concurrency test is not a proof over all interleavings.

Type this fragment yourself. Append to `src/test/java/workspace/ConcurrencyTest.java`:

```java edit=src/test/java/workspace/ConcurrencyTest.java mode=append
        try (var pool = Executors.newFixedThreadPool(2)) {
            Future<Boolean> first = pool.submit(command);
            Future<Boolean> second = pool.submit(command);
            start.countDown();
            int winners = (first.get(5, TimeUnit.SECONDS) ? 1 : 0)
                + (second.get(5, TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, winners);
        }
    }
}
```

```check
run "mvn -q test" timeout=180
```

## Understand what asynchronous does not guarantee

Write `decisions/010-concurrency.md`. Compare a browser promise, a Java worker thread, and a database transaction. They address scheduling, execution and consistency at different boundaries. “Async” does not imply parallel, atomic or durable.

For a future email notification, do not hold a transaction open while calling a remote provider. A transactional outbox records delivery work with the domain change; a separate worker retries it. Consumers still need deduplication. We will examine the failure contract next without pretending a background thread is a durable queue.

```check
file decisions/010-concurrency.md
```
