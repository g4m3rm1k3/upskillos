---
title: 11.1 — Train without freezing the table
runtime: none
---

### The story so far

The Q-learning module trains in Node. The browser must still respond while training runs.

### What this lesson builds

Move training into a dedicated worker and send progress messages back to the page.

## Give computation its own context

Imagine clicking Roll while a long training loop is running. The browser's main JavaScript thread is still executing that loop, so it cannot run your click handler yet. Making a function `async` does not move its calculations elsewhere: a long synchronous loop still occupies the thread. We need another execution context.

A **dedicated Web Worker** runs JavaScript separately from the page. The page owns the buttons and text. The worker owns the training loop and its table. They communicate with messages. This separates work; it does not make the training algorithm itself cheaper. The browser may schedule that work on another CPU core, but you should not assume a particular machine or speed.

Our message agreement is:

| Direction | Message | Meaning |
| --- | --- | --- |
| Page → worker | `{ episodes: 2000 }` | Train this many games |
| Worker → page | `{ type: 'progress', completed: 1000, count: 2000 }` | Half the requested training games have completed |
| Worker → page | `{ type: 'error', message: '...' }` | Reject the request without training |
| Worker → page | `{ type: 'done', model, report, baseline }` | Training and evaluation finished; a complete result is available |

These are ordinary objects. `type` is a property we chose as a label, not a special JavaScript keyword in this object. Both sides must agree on its spelling. We send data, not strings of code to execute.

Inside a worker, `self` names its global object. It has messaging operations but no `document`: there is no DOM to update. Assigning a function to `self.onmessage` registers a handler; it does not immediately run the body. Later the browser invokes it with an event object. `event.data` contains the object the page sent. `self.postMessage(...)` queues an outgoing message. The page handles it when its event loop can run; sending does not synchronously call the page's handler.

Ordinary objects and arrays in a message are **structured-cloned**: the receiving side gets its own data. Sending the model does not give the page a reference to the worker's live table. Copying a large table has a cost, so progress messages carry counts rather than copying the whole model every time. Transferable buffers are another mechanism; we do not need them here.

The file below defines the worker side only. The page creates the worker and sends its request in lesson 11.4. Until then, use the focused check below; opening this file directly as a webpage is not a way to start it.

```javascript file=trainer.mjs
import { seeded } from './rng.mjs';
import { TARGET } from './pig.mjs';
import { episode, evaluate } from './learning.mjs';

self.onmessage = function (event) {
  const count = event.data?.episodes;
  if (!Number.isInteger(count) || count < 1000 || count > 200000) {
    self.postMessage({ type: 'error', message: 'Choose 1,000 to 200,000 episodes.' });
    return;
  }
  const table = Object.create(null);
  const random = seeded(7);
  let truncated = 0;
  for (let i = 0; i < count; i += 1) {
    if (episode(table, random, 0.2, i % 2) === null) truncated += 1;
    const completed = i + 1;
    if (completed % 1000 === 0) self.postMessage({ type: 'progress', completed, count });
  }
  const report = evaluate(table);
  const baseline = evaluate({});
  const model = { version: 1, game: 'pig', target: TARGET, episodes: count, seed: 7, truncated, table };
  self.postMessage({ type: 'done', model, report, baseline });
};
```

**Read the handler in execution order:**

1. The imports reuse our seeded random generator, Pig target and tested learning functions. `event.data?.episodes` uses optional chaining: if data is `null` or `undefined`, it returns `undefined` instead of trying to read a property from nothing.
2. `Number.isInteger(count)` accepts integer numbers, not a string such as `"2000"`. `!` negates that result. `||` means any of the listed conditions is enough to reject the request. Counts below 1000 or above 200000 are also rejected. The error message is sent, then `return` exits the handler before allocating a table or starting a loop. This is a workload bound for this local demo, not a general security system.
3. `Object.create(null)` creates a dictionary without inherited properties. `const table` prevents reassigning the variable; it does not prevent the training function from adding or changing entries. Each accepted request starts a new table. `seeded(7)` returns the reproducible random function taught earlier; the loop keeps using that same function so its sequence advances.
4. `truncated` counts games that reached the move limit without a winner. Each call to `episode` mutates the table through Q-updates. Its 0.2 argument is the exploration probability; `i % 2` alternates the starting seat 0, 1, 0, 1. `%` gives the remainder after division, not a percentage. A returned `null` increments the truncation count rather than pretending that game was a win or loss.
5. The first iteration has index `i = 0`, but after its episode finishes **one** game has completed. That is why `completed = i + 1`. At i = 999, completed is 1000 and `completed % 1000` is zero, so send progress. At i = 1000 the remainder is one, so send nothing. `{ completed, count }` is property shorthand for `{ completed: completed, count: count }`.
6. Once the loop ends, `evaluate(table)` plays the learned policy without changing it. `evaluate({})` uses an empty table, so our existing fallback policy supplies the baseline's choices. Both calls use the evaluation function's same default seed schedule and starting-seat balance. They do not continue the training random stream.
7. The model object carries a format version, game name, target score, training count, seed, truncation count and table. Those metadata let the later loading code check compatibility. `report` and `baseline` are separate evaluation results. The final message contains all three; only its arrival permits the page to replace its previous model.

For a 2000-game request, the message order is progress 1000, progress 2000, then done **after evaluation**. Therefore a full training progress bar does not mean evaluation has finished. For 2500 games, progress messages stop at 2000 and done follows completion of the remaining games and evaluation. The controller sets the bar to full on done.

The worker loop is synchronous inside its own context. Sending a cancellation message to this same worker does not interrupt it: that handler would wait for the current loop to finish. The page can instead call the worker's `terminate()` method. Termination discards unfinished work; it does not return a partial model. We will retain the previous completed model on the page until a replacement arrives. Lesson 11.4 implements that ownership rule.

The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check trainer.mjs"
```

```predict
question: Can this worker call document.getElementById to update the progress bar?
choice: No
choice: Yes
answer: No
explain: It sends a message; the page owns DOM updates.
```

## Check the message agreement {#message-check}

This provided Node test calls the real handler with controlled messages. It does not create a browser worker or prove that the UI stays responsive. It lets us check message shape and completed-game counts without first writing the page controller.

Read the test harness before using it. `test` and `assert` are the built-in test tools used earlier. `globalThis` names the global object of the current JavaScript environment. Node does not provide a browser worker's `self`, so the test temporarily supplies an object with the one outgoing method we need. The short method syntax `postMessage(message) { ... }` defines that object's function. It stores a `structuredClone` of each outgoing message, matching the copying of ordinary data at a real message boundary.

`await import('../trainer.mjs')` loads and executes the real module after the simulated `self` exists. `import(...)` returns a promise; `await` waits for it inside our `async` test callback. The import registers `self.onmessage`. The test calls that handler directly, wrapping the request in `{ data }` just like an event. Setting `messages.length = 0` empties the same array between requests.

`map` builds an array of selected properties, `slice(0, 2)` selects the first two entries without changing the original array, and `every` requires every selected entry to pass its condition. `Object.keys` lists a dictionary's own property names. `try` encloses code that may throw; `finally` runs cleanup whether an assertion passes or throws. `delete globalThis.self` removes the test's temporary global property. None of this harness belongs in the shipped game.

```javascript file=tests/worker.check.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

// Only the worker's message boundary is simulated, not browser scheduling.
test('worker rejects invalid requests and reports completed games', async () => {
  const messages = [];
  globalThis.self = {
    postMessage(message) { messages.push(structuredClone(message)); }
  };
  try {
    await import('../trainer.mjs');
    for (const data of [null, {}, { episodes: '2000' }, { episodes: 999 }, { episodes: 200001 }]) {
      messages.length = 0;
      self.onmessage({ data });
      assert.equal(messages.length, 1);
      assert.equal(messages[0].type, 'error');
    }
    messages.length = 0;
    self.onmessage({ data: { episodes: 2000 } });
    assert.deepEqual(messages.map(message => message.type), ['progress', 'progress', 'done']);
    assert.deepEqual(messages.slice(0, 2).map(message => message.completed), [1000, 2000]);
    assert.ok(messages.slice(0, 2).every(message => message.count === 2000));
    const result = messages[2];
    assert.equal(result.model.episodes, 2000);
    assert.ok(Object.keys(result.model.table).length > 0);
    assert.equal(result.report.wins + result.report.losses + result.report.truncated, 1000);
    assert.equal(result.baseline.wins + result.baseline.losses + result.baseline.truncated, 1000);
  } finally {
    delete globalThis.self;
  }
});
```

Run `node --test tests/worker.check.mjs`. Expect a passing test, no error message, progress at 1000 and 2000, and a final model with evaluation results. The final assertions count completed and truncated evaluation games; they do not demand a particular win rate from this small training budget.

```check
run "node --test tests/worker.check.mjs"
```

## Try it — Identify the blocking boundary

Temporarily change `const completed = i + 1` to `const completed = i`. Run the message check: it must fail because the first progress count is zero even though a game has completed, and the last expected 2000 count is missing. Restore `i + 1` and rerun. Then explain why updating the progress bar from inside this worker would fail even though the training calculations work.

When lesson 11.4 connects the page, run a long training job and try the game's controls while it works. Verify that Stop permits a fresh training request and keeps any previous model. That browser experiment checks responsiveness and cancellation; this synchronous Node harness cannot establish them.

## Your turn — Report progress accurately

Define `solve(completed, total)` returning a fraction between 0 and 1, clamped at either end; assume total is positive. Export the function as `solve`. A progress message with completed 500 and count 1000 should produce 0.5. completed 1200 with count 1000 should produce 1, not overflow the bar; a negative completed value should produce 0. Also check 0 and exactly total.

Then explain in your own words why a fraction of 1 does not authorize replacing the model: the page must wait for a **done** message containing the evaluated model. Draw the messages for a 2500-game job, including what happens between the last progress message and done. The numeric check cannot grade that explanation.

Write practice/01-training-in-a-worker.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-training-in-a-worker.mjs'; if (!(solve(500,1000)===0.5 && solve(1200,1000)===1 && solve(-1,1000)===0)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: The progress bar expects a fraction.
concept: Divide then clamp.
shape: Use min with one and max with zero around completed/total.
```
