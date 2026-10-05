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

### Evaluate policy before doing any waiting

`"GET".equals(method)` invokes equals on a known non-null string. If method is null it returns false; reversing it to method.equals("GET") would throw. OR combines GET and HEAD into the read category. HEAD requests response metadata without a response body and, like GET, must not cause a requested state mutation.

The status comparisons recognize throttling or gateway/service availability responses selected by this teaching policy. The final conjunction requires every condition: read method, selected status, nonnegative attempts, and attempts below three. attempts means retries already attempted when consulting this policy; 0 permits the first retry, 2 permits the third, and 3 stops. This definition avoids silently counting the initial request as a retry in one caller but not another.

| Method/status/attempts | Read? | Selected failure? | Budget left? | Decision |
|---|---|---|---|---|
| GET / 503 / 0 | yes | yes | yes | retry |
| POST / 503 / 0 | no | yes | yes | stop |
| GET / 401 / 0 | yes | no | yes | stop |
| GET / 503 / 3 | yes | yes | no | stop |

Returning true does not sleep or send a request. An executor would interpret the decision and manage delays, cancellation and deadlines. **Predict:** a server can commit POST and then lose its response, so retrying merely because the client saw failure can duplicate accepted work. Local exception handling cannot resolve that ambiguity alone.

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

### Explain why each boolean assertion is different evidence

assertTrue requires the policy to permit the selected transient read. assertFalse requires it to stop when the retry budget is exhausted, when the operation is POST, and when the status indicates identity or input correction instead of availability. These are independently meaningful axes; testing five nearby attempt counts without varying method or status would miss different risks.

The policy has no mutable fields, so the same inputs should always yield the same output. That makes it easy to test without clocks or network access. A later executor must separately test when it calls this policy, how it increments attempts, and whether it honors cancellation and deadlines.

**Predict:** changing attempts < 3 to attempts <= 3 grants one additional retry. Write the expected decision for attempts 2 and 3 before modifying the test. The boundary must come from the agreed budget, not from mirroring the operator in the implementation.

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
