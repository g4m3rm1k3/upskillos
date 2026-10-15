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

Start with **one message round trip**, without training. Inside a worker, `self` names its global object. Unlike the page it has no `document` or DOM. Assigning a function to `self.onmessage` registers a handler; the browser calls it when a message arrives. `event.data` is the request object. `event.data?.episodes` uses optional chaining: missing or null data yields `undefined` rather than a property-access error.

`self.postMessage(...)` queues an outgoing object. `type` is a property name we chose, and `'progress'` is a string label. `count` is property shorthand for `count: count`. Zero completed games is honest at this first stage: we have received the request but do not train anything yet. Posting a message does not directly invoke the page's handler.

Predict what happens if this file is merely saved. Nothing: a page must create the worker and send a message. Implement only this small receiver first.

```javascript file=trainer.mjs
self.onmessage = function (event) {
  const count = event.data?.episodes;
  self.postMessage({ type: 'progress', completed: 0, count });
};
```

```check
run "node --check trainer.mjs"
```

This check establishes syntax only. Use the message experiment to observe behavior.

## Observe one message in a scratch page {#message-probe}

Create a disposable page in `scratch/worker-probe.html`. This is a small laboratory for the message boundary, separate from the finished interface. It lets you see each stage work before connecting the game controller.

The HTML button and click handler reuse the events lesson. `pre` preserves newlines; `aria-live="polite"` lets assistive technology announce output without interrupting. `type="module"` enables module features in this script. `new Worker(...)` creates a worker and returns its page-side handle. `new URL('../trainer.mjs', import.meta.url)` resolves the worker file relative to this script's page URL, going up from scratch to the project root. `import.meta.url` is this module's URL; the second argument tells `URL` the starting location. `{ type: 'module' }` permits imports inside the worker.

The page-side `worker.onmessage` receives replies; the worker-side `self.onmessage` receives requests. Keep those directions distinct. The output line joins the message type to its completed count or error text. `??` takes the first non-nullish value, so completed 0 stays 0. `'\n'` appends a newline; `+=` adds to the previous text. `onerror` reports a loading or execution failure; inspect DevTools Console for its details.

`let worker = null` means no worker exists yet. On a later click we terminate the old instance before replacing it. `pagehide` terminates the remaining worker when this scratch page is left. These are resource cleanup decisions, not part of the learning formula.

```html file=scratch/worker-probe.html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Worker message experiment</title></head>
<body>
<button id="send" type="button">Send request</button>
<pre id="output" aria-live="polite"></pre>
<script type="module">
const output = document.getElementById('output');
let worker = null;
document.getElementById('send').addEventListener('click', function () {
  if (worker) worker.terminate();
  output.textContent = '';
  worker = new Worker(new URL('../trainer.mjs', import.meta.url), { type: 'module' });
  worker.onmessage = function (event) {
    const message = event.data;
    output.textContent += message.type + ': ' + (message.completed ?? message.message ?? 'ready') + '\n';
  };
  worker.onerror = function () { output.textContent += 'Worker error: inspect the Console.\n'; };
  worker.postMessage({ episodes: 2000 });
});
window.addEventListener('pagehide', function () { if (worker) worker.terminate(); });
</script>
</body>
</html>
```

**Run:** start `npm run dev` from your project folder. Use the local URL printed in the terminal and append `/scratch/worker-probe.html`. Do not open this experiment with file://: module workers require a suitable origin. Click **Send request**. Expect `progress: 0`. Nothing is trained yet, so no done message should appear. Keep this tab for the following stages and refresh it after saving each change. Stop the dev server with Ctrl+C when you finish.

**Explore:** change the worker's `completed: 0` to `completed: 12`. Predict the output, save, refresh the page and click again. Expect `progress: 12`; the page displays what the worker sends, not a measured training count. Restore 0. Explain which side owns the visible text and which side supplies the number.

```predict
question: Which side writes the scratch page's visible output?
choice: The page's worker.onmessage handler
choice: The worker's self.onmessage handler
answer: The page's worker.onmessage handler
explain: The worker sends data; the page owns the DOM and displays it.
```

## Reject a bad request before doing work {#validate-request}

Our receiver currently accepts any data. Add one guard. `Number.isInteger(count)` accepts integer numbers, not strings such as `"2000"`. `!` negates that result; `||` means any rejection condition is enough. Counts outside 1000–200000 are also rejected. An error message explains the accepted range. `return` exits this handler before the progress reply. These bounds limit the workload of our local demo.

Before running, predict the difference between sending `{ episodes: 2000 }` and `{ episodes: "2000" }`. They look similar to a reader but only the first contains a number.

```javascript file=trainer.mjs
self.onmessage = function (event) {
  const count = event.data?.episodes;
  if (!Number.isInteger(count) || count < 1000 || count > 200000) {
    self.postMessage({ type: 'error', message: 'Choose 1,000 to 200,000 episodes.' });
    return;
  }
  self.postMessage({ type: 'progress', completed: 0, count });
};
```

```check
run "node --check trainer.mjs"
```

This check establishes syntax only. Use the message experiment to observe behavior.

In the scratch page, temporarily put quotes around 2000 in the outgoing request. Refresh and click: expect one error line and no progress. Try 999, then `null` as the entire request. Both should report the same error without crashing. Restore `{ episodes: 2000 }` and confirm `progress: 0`. Explain why omitting `return` would incorrectly send both an error and a progress reply.

## Train and count completed games {#training-progress}

Now replace the placeholder progress reply with a real loop. Import the earlier seeded random generator and `episode` function. `Object.create(null)` makes a dictionary without inherited properties. `const table` prevents replacing the variable, but does not prevent training from changing its entries. Every request gets a fresh table. `seeded(7)` returns one random function that advances through a reproducible sequence across calls.

`episode(table, random, 0.2, i % 2)` plays and learns from a game. The 0.2 is its exploration probability. `%` is the remainder operator: `i % 2` alternates starting seats 0, 1, 0, 1. If a game hits its move limit, it returns `null`; increment `truncated` instead of pretending that game had a result.

After the first iteration i is still 0, but one game has completed. Use `completed = i + 1`. `completed % 1000 === 0` selects multiples of 1000. Trace these boundary values before running:

| Loop index i | Completed games | Send progress? |
| --- | --- | --- |
| 0 | 1 | No |
| 999 | 1000 | Yes |
| 1000 | 1001 | No |
| 1999 | 2000 | Yes |

Ordinary message data is **structured-cloned**, giving the page its own copy rather than a live reference into this table. Sending the whole table every game would be unnecessary copying. Send only the counts during training.

```javascript file=trainer.mjs
import { seeded } from './rng.mjs';
import { episode } from './learning.mjs';

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
};
```

```check
run "node --check trainer.mjs"
```

This check establishes syntax only. Use the message experiment to observe behavior.

Save, refresh the scratch page and send 2000. Expect `progress: 1000` then `progress: 2000`, with no done line yet. Change the request to 2500 and predict the last progress count. It is still 2000: the remaining 500 games do not reach the next multiple. Restore 2000. Explain why a progress message is evidence of a completed batch, not proof the whole task is finished.

## Evaluate before declaring completion {#finish-training}

Add `TARGET` and `evaluate` to the imports and append the final calculations after the loop. `evaluate(table)` plays the frozen learned policy. `evaluate({})` uses an empty table, which makes the chooser use our baseline fallback. Both calls use the evaluation function's default seed schedule and starting-seat balance; neither continues the training random stream.

Build one model object with its format version, game name, target score, episode count, seed, truncation count and table. The later loader uses metadata to check compatibility. Send it with the two reports in a **done** message. The page may replace its previous model only when this complete result arrives.

The snapshot below retains the receiver, guard and loop you already built; inspect the diff for only the added imports and final lines. Before running, write down the expected message order for 2000 games.

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

```check
run "node --check trainer.mjs"
```

This check establishes syntax only. Use the message experiment to observe behavior.

Refresh and send the request. Expect `progress: 1000`, `progress: 2000`, then `done: ready`. The scratch page intentionally prints a short label instead of dumping the model table. Temporarily request 2500: expect progress at 1000 and 2000 followed by done. Restore 2000. The full controller will set the bar to 100% on done even when the budget is not a multiple of 1000.

Notice the boundary: training progress may be full while evaluation still runs. It is not a promise that the model is ready. The worker's loop is synchronous inside its own context. A cancel **message** would wait for the current handler to finish; the page instead uses `terminate()` to stop that context. Try starting a longer job in this scratch page and clicking again: the old worker is terminated and a new one begins. There is no partial model returned from termination. Retaining the previous completed model belongs to the game controller in lesson 11.4.

## Check the message agreement {#message-check}

This provided Node test calls the real handler with controlled messages. It does not create a browser worker or prove that the UI stays responsive. It lets us check message shape and completed-game counts without depending on the scratch page or the final game controller.

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
