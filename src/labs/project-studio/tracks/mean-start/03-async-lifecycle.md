---
title: Async Work — Ordering, Failure and Cancellation
runtime: none
---

Outcome: predict synchronous versus Promise execution, distinguish fail-fast observation from cancellation, and make a deadline reach cooperative work. Complete the JavaScript practice and identity lessons first. Use the same task-board folder. These experiments use built-in Node features and require no server.

### The story so far

You used await to obtain a result. Real applications also need to decide when work starts, which failures are observed and what happens to obsolete work. A loading flag alone cannot answer these questions.

## Trace the order, not the wall clock

JavaScript runs the current synchronous work to completion. Promise callbacks run as microtasks after that stack has finished. A timer schedules later work; its delay is a minimum eligibility delay, not an exact appointment. Do not infer broad timer-versus-I/O ordering guarantees from a single run.

```predict
question: In the trace below, does the Promise callback run before or after the synchronous "end" entry?
explain: After. Scheduling a callback does not interrupt the current synchronous stack. Awaiting the resulting Promise lets the callback finish before the final assertion.
```

```javascript file=server/order-demo.mjs
import assert from 'node:assert/strict';
const trace = ['start'];
const finished = Promise.resolve().then(() => trace.push('promise'));
trace.push('end');
await finished;
assert.deepEqual(trace, ['start', 'end', 'promise']);
console.log(trace.join(' → '));
```

```check
run "node server/order-demo.mjs" stdout="start → end → promise"
```

An async function still executes synchronously until its first await. A long CPU loop inside it can block the event loop. async changes how a result is delivered; it does not automatically move computation to another thread.

## Observe all results when partial success matters

Calling an async function starts its work; await observes the returned Promise. Promise.all rejects when an input rejection is observed, but it does not stop sibling operations. Promise.allSettled waits for all outcomes and labels each fulfilled or rejected. Neither is automatically the right policy: a report may keep partial results, while a business transaction may require all-or-nothing storage behavior.

```javascript file=server/outcomes-demo.mjs
import assert from 'node:assert/strict';
const operations = [Promise.resolve('saved'), Promise.reject(new Error('offline'))];
const outcomes = await Promise.allSettled(operations);
assert.deepEqual(outcomes.map(result => result.status), ['fulfilled', 'rejected']);
assert.equal(outcomes[0].value, 'saved');
assert.equal(outcomes[1].reason.message, 'offline');
console.log('One success, one observed failure');
```

```check
run "node server/outcomes-demo.mjs" stdout="One success, one observed failure"
```

Notice that there is no claim that the successful operation was undone. A rejected Promise is not a database rollback. Later transaction lessons must teach that separate mechanism.

## Pass cancellation to the work

AbortController owns a signal that cooperating operations observe. A deadline that merely wins Promise.race can abandon a result while the underlying operation continues. The function below passes the signal into the operation, aborts it at the deadline and clears the timer in finally. Its contract requires work to honor the signal; it cannot force arbitrary code to stop.

```javascript file=server/deadline.mjs
export async function withDeadline(work, milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) throw new Error('Invalid deadline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
```

## Prove success, failure and cooperative cancellation

Node's Promise-based timer accepts an AbortSignal. This gives us a real cancellable operation without a network dependency. The test asserts behavior rather than a precise elapsed duration, which would be sensitive to machine load. The long operation is aborted, so the cancellation test should not take its full requested delay.

```javascript file=test/deadline.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { withDeadline } from '../server/deadline.mjs';
test('return a successful result and preserve an operation failure', async () => {
  assert.equal(await withDeadline(async () => 'ready', 1000), 'ready');
  await assert.rejects(withDeadline(async () => { throw new Error('storage failed'); }, 1000), /storage failed/);
});
test('a cooperative operation receives an aborted signal', async () => {
  let observed;
  await assert.rejects(withDeadline(signal => {
    observed = signal;
    return pause(1000, 'late', {signal});
  }, 5), {name:'AbortError'});
  assert.equal(observed.aborted, true);
});
test('invalid deadlines fail before starting work', async () => {
  let started = false;
  for (const delay of [0, -1, NaN, Infinity]) {
    await assert.rejects(withDeadline(async () => { started = true; }, delay), /Invalid deadline/);
  }
  assert.equal(started, false);
});
```

```check
run "node --test test/deadline.test.js"
```

## Your turn: control concurrency

Write a separate practice function that processes a list with at most two active operations. Preserve result order even when operations finish in a different order. Choose and document whether failure stops new work or collects all outcomes. Instrument active and maximumActive counters and assert that maximumActive never exceeds two. Handle empty input and a rejected operation.

Do not solve this by sleeping for a guessed duration. Use explicit Promise completion points in your tests so you control which operation finishes first. Save results, reasoning and a counterexample in evidence/async.txt. This file check is a submission gate only; your independently written tests must verify the concurrency bound.

```hints
nudge: A Promise for every input starts too much work before you can limit it.
concept: A small fixed set of workers can claim the next index only when ready.
shape: Have two async worker loops take an index, await its operation and store the result at that index; test completion in reverse order.
```

## Diagnose, explain and review

Remove the signal argument from pause in the cancellation test. The test should fail after the operation completes because it no longer rejects. Restore the argument. This exposes the difference between requesting cancellation and honoring it. Remove await from a try/catch around a rejected async call and explain why the rejection escapes that synchronous catch; test this in an isolated practice file and restore the awaited version.

Checks establish scheduling and cooperative cancellation for these examples. They do not prove network requests, database drivers or CPU-bound code honor the same signal. Later HTTP and Angular work must verify cancellation at their actual boundaries. Reference: [Node's event loop guide](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick).

```check
file evidence/async.txt
```
