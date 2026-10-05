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

### Trace coordination without promising a particular scheduler

An executor runs submitted tasks using worker threads. A **Callable<Boolean>** is an action that returns a Boolean when completed; the lambda is its implementation. A CountDownLatch starts with a count of one. await blocks a worker until that count reaches zero. The main test thread will call countDown after submitting both commands.

Both commands capture the same task reference and submit revision 0. The callback returns true when advance succeeds. It catches only IllegalStateException, our conflict category, and returns false for that expected loser. Catching every Exception would misclassify a database outage or programming bug as a correct conflict.

The latch prevents a worker from passing its wait before release. It does **not** prove both workers reached the database read before either writes, nor that their instructions execute simultaneously. A scheduler may run one much earlier. The invariant still requires at most one successful command for the same old revision, whether they overlap tightly or the second arrives later.

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

### Unwrap results and count successes

newFixedThreadPool(2) creates an executor with two worker threads. submit queues the callable and returns a Future immediately; it does not return the eventual Boolean directly. Each Future represents one submitted execution even though both use the same callable object.

After countDown releases waiting work, `first.get(5, TimeUnit.SECONDS)` waits up to five seconds for that result. A failed worker propagates through its Future instead of becoming false. The ternary converts true to 1 and false to 0; adding both terms counts winners. Exactly one establishes the expected observed outcome.

Try-with-resources closes this Java 21 executor on block exit. Closing waits for termination, so the five-second get timeout does not itself impose a hard five-second bound on total resource cleanup if workers remain stuck. A production-grade test harness may also need cancellation and process-level time limits. Distinguish “this assertion has a timeout” from “nothing can hang.”

**Predict:** a test that merely asserted at least one winner would accept two winners and miss a lost update. A test asserting zero conflicts would encode the opposite of our product contract. Define the invariant before deciding what result looks successful.

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

### Compare three operations with one failure schedule

A browser await yields control while a promise is pending; it does not establish a database transaction. A Java executor can run two callables on different worker threads; they can still race on the same data. A database transaction groups participating writes; it does not keep a browser alive or guarantee an external service receives a message.

Suppose an advance commits and the process crashes before sending a notification. A background thread created before the crash is lost with the process. An outbox instead stores a pending-delivery row in the same transaction as the advance. A later worker can discover that row after restart. This moves unfinished work into durable state, but introduces queue growth, retry and duplicate-delivery questions.

Now crash after sending but before marking delivered. The worker may send again after restart. Explain why a durable queue alone promises neither exactly-once effects nor safe unlimited retries. Your decision note should identify the receiver's deduplication contract and the observable delivery states before choosing a worker library.

Write `decisions/010-concurrency.md`. Compare a browser promise, a Java worker thread, and a database transaction. They address scheduling, execution and consistency at different boundaries. “Async” does not imply parallel, atomic or durable.

For a future email notification, do not hold a transaction open while calling a remote provider. A transactional outbox records delivery work with the domain change; a separate worker retries it. Consumers still need deduplication. We will examine the failure contract next without pretending a background thread is a durable queue.

```check
file decisions/010-concurrency.md
```
