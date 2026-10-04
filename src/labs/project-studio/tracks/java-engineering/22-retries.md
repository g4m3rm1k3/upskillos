---
title: Failure handling — retries can repeat success
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

The hardest request outcome is “unknown”: the client timed out, but the server may already have committed. Retrying a write can duplicate it. A retry policy must consider the operation, status and attempt budget, not simply catch every exception.

## Express a bounded read retry policy

This pure policy separates a decision from sleeping and networking. Literal.equals safely handles a null method. A bounded attempt count prevents unlimited amplification. A real executor also needs timeouts, backoff with jitter, cancellation and Retry-After handling; this method alone is not a retry engine.

We deliberately do not wire automatic mutation retries into the browser. POST may already have succeeded. Idempotency keys can make repeats recognize an earlier logical command, but require durable storage, request-payload matching and a retention policy.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/RetryPolicy.java`:

```java edit=src/main/java/workspace/RetryPolicy.java mode=replace
package workspace;
public final class RetryPolicy {
    private RetryPolicy() {}
    public static boolean retry(String method, int status, int attempts) {
        boolean read = "GET".equals(method) || "HEAD".equals(method);
        boolean transientFailure = status == 429 || status == 502 || status == 503 || status == 504;
        return read && transientFailure && attempts >= 0 && attempts < 3;
    }
}
```

## Test safety boundaries of retries

A 401 requires identity correction, not rapid repetition. A 400 requires changing the request. Retrying those unchanged requests wastes capacity. The mutation test prevents a future simplification from treating all methods alike.

In `decisions/011-delivery.md`, trace an outbox worker crashing after sending but before recording delivery. Explain why at-least-once processing can still duplicate an email, and what a provider-supported deduplication key would change. Separate a design exercise from a feature implemented in this release.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/RetryTest.java`:

```java edit=src/test/java/workspace/RetryTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class RetryTest {
    @Test void retriesOnlyBoundedTransientReads() {
        assertTrue(RetryPolicy.retry("GET", 503, 0));
        assertFalse(RetryPolicy.retry("GET", 503, 3));
        assertFalse(RetryPolicy.retry("POST", 503, 0));
        assertFalse(RetryPolicy.retry("GET", 401, 0));
        assertFalse(RetryPolicy.retry("GET", 400, 0));
    }
}
```

```check
run "mvn -q test" timeout=180
file decisions/011-delivery.md
```

## Challenge — Decide under uncertainty

Write `challenges/Retry.java`, accepting method, status and attempts. Print `retry` only for GET or HEAD, statuses 429/502/503/504, and attempts from 0 through 2. Otherwise print `stop`. Implement this independently of the application class, then compare your reasoning.

If POST gets retry, your policy has ignored operation semantics. If 401 gets retry, it has confused an authorization problem with transient availability.

This is optional. Use **Defer and continue** to revisit it later. Do challenge experiments on a separate branch or in `challenges/`; subsequent lessons do not depend on your answer.

```check
run "java challenges/Retry.java GET 503 0" stdout="retry"
run "java challenges/Retry.java POST 503 0" stdout="stop"
run "java challenges/Retry.java GET 401 0" stdout="stop"
run "java challenges/Retry.java GET 503 3" stdout="stop"
```
