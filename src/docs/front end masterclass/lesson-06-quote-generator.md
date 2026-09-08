# Lesson 6 — The Quote Generator

## What you'll learn
- `fetch` — how JavaScript asks for data from somewhere else on the internet
- `Promise`, `async`, and `await` — what they actually are, not just the syntax
- Wrapping an API call in a small class — reinforcing that classes aren't just for game objects
- Real error handling — networks fail, and pretending they don't is how apps break silently

## What you'll build
A page with a button: click it, and a random quote (fetched from a public
API) appears, with a loading state and error handling.

## The question
Every button click so far has been answered *instantly* — the DOM update
happens in the same tick as the click. Fetching a quote from a server takes
real time (milliseconds to seconds) and can fail (no internet, server down).
How does JavaScript let your code "wait" for something without literally
freezing the whole page while it does?

## 1. Predict

You've used callbacks (Lesson 1's `addEventListener`) — code that runs
*later*, when something happens. Predict: could fetching data work the same
way — "run this function later, once the data arrives"? What might be
awkward about writing an entire app as nested "run this later" callbacks,
one inside another, if step 2 depends on step 1's result and step 3 depends
on step 2's?

(This awkwardness has a real name — "callback hell" — and is exactly what
`async`/`await` was designed to eliminate. Keep this in mind as you read the
`await` explanation below.)

## 2. Try it

Create `src/lesson-06-quote-generator/index.html`, `style.css`, `script.js`.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Quote Generator</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <blockquote id="quote-text">Click for a quote</blockquote>
  <button id="fetch-btn">New Quote</button>
  <p id="error-msg"></p>
</body>
<script src="script.js"></script>
</html>
```

### Building up to it: a bare `fetch` call

```js
fetch("https://api.quotable.io/random")
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    console.log(data.content);
  });
```

### What this code does

**`fetch("https://api.quotable.io/random")`**
- `fetch` is a built-in browser function that starts an HTTP request to the
  given URL. Crucially: it **does not return the response itself**. Network
  requests take real time, and JavaScript in a browser can't just pause the
  entire page while waiting — so `fetch` returns immediately with something
  that *represents* "a result that will exist eventually."
- That something is a **`Promise`** — an object representing a value that
  isn't ready yet, but will be (or will fail trying) at some point in the
  future. `fetch(...)` itself returns a `Promise` synchronously, before any
  actual network response has come back.

**`.then(function (response) { ... })`**
- `.then` is a method every `Promise` has. It registers a callback to run
  **once the promise resolves** (succeeds) — conceptually similar to
  `addEventListener` registering a callback for "once this event happens,"
  except the "event" here is "the network request finished."
- `response` — not the actual quote data yet. It's a `Response` object
  describing the HTTP response (status code, headers, and a *body* that
  hasn't been read/parsed yet).

**`response.json()`**
- Reads and parses the response body as JSON — this is itself *also*
  asynchronous (parsing a potentially large body takes a moment) and *also*
  returns a `Promise`. `.json()` does not return the actual data directly.

**`return response.json();`** (inside the first `.then`)
- Returning a `Promise` from inside a `.then` callback is special: the
  *next* `.then` in the chain automatically waits for that returned promise
  to resolve too, and receives *its* resolved value — not the promise
  object itself. This chaining is what lets you write `.then().then().then()`
  as a sequence of dependent async steps, each waiting for the last.

**second `.then(function (data) { console.log(data.content); })`**
- `data` here is the actual parsed JSON object — by this point, both the
  network fetch *and* the JSON parsing have completed. `data.content` reads
  a property from that quote object (the exact shape depends on the API;
  `quotable.io` returns an object with a `content` field holding the quote
  text).

### The same thing, with `async`/`await`

```js
async function getQuote() {
  const response = await fetch("https://api.quotable.io/random");
  const data = await response.json();
  console.log(data.content);
}
```

**`async function getQuote() { ... }`**
- `async` before `function` does two things: (1) it allows `await` to be
  used inside this function's body, and (2) it makes the function itself
  always return a `Promise`, automatically — even though nothing here
  explicitly writes `return new Promise(...)`.

**`await fetch(...)`**
- `await` **pauses execution of this specific function** (not the entire
  page, not other code) until the promise on its right resolves, then
  "unwraps" it — instead of getting a `Promise` back, `response` is bound
  directly to the resolved `Response` object, as if the line were ordinary,
  synchronous code.
- **This is the direct answer to your Predict question.** `async`/`await`
  doesn't eliminate promises or callbacks under the hood — `fetch` still
  returns a promise exactly as before. What changes is that you get to
  *write* the waiting as sequential, top-to-bottom code (`const response =
  await ...` then the next line, then the next) instead of nesting callbacks
  inside `.then()` chains. The engine is doing the same asynchronous waiting
  either way; `async`/`await` is different syntax for expressing it, not a
  different underlying mechanism.
- **What happens to the rest of the page while `await` is paused?** Nothing
  freezes. Other code (other event listeners, other scripts, rendering)
  continues to run normally — only this one function's *own* execution is
  paused at that line, waiting.

**`await response.json();`**
- Same pattern again — `.json()` still returns a promise, `await` still
  unwraps it, `data` ends up as the actual parsed object directly.

## 3. Why?

### Mental model

```
getQuote() called
   ↓
fetch(...) starts the network request, returns a Promise immediately
   ↓
await pauses getQuote() here — rest of the page keeps running normally
   ↓
   [ time passes — network round trip happens in the background ]
   ↓
response resolves — getQuote() resumes exactly where it paused
   ↓
await response.json() — pauses again briefly while the body parses
   ↓
data resolves — getQuote() resumes again
   ↓
rest of getQuote()'s body runs normally, synchronously, to the end
```

`await` only pauses the function it's written inside — never the browser,
never other code.

## 4. Change one thing

```diff
 async function getQuote() {
   const response = await fetch("https://api.quotable.io/random");
   const data = await response.json();
-  console.log(data.content);
+  console.log(data.content, "—", data.author);
 }
```

**What changed:** logging an additional field from the already-parsed `data`
object.
**What did not change:** neither `fetch` call, neither `await`, nor the
function's `async` keyword — because this change only touches *what you do
with data once it's already arrived*, not *how or when* it arrives. This
isolates exactly what `await` is responsible for (getting you the resolved
value) versus what ordinary code after it is responsible for (using that
value).

## 5. Put it in the project

Now the full app — with a small class wrapping the API call, a loading
state, and error handling.

```js
class QuoteService {
  constructor(url) {
    this.url = url;
  }

  async getRandomQuote() {
    const response = await fetch(this.url);

    if (!response.ok) {
      throw new Error("Request failed with status " + response.status);
    }

    const data = await response.json();
    return data;
  }
}

const quoteService = new QuoteService("https://api.quotable.io/random");

const quoteText = document.getElementById("quote-text");
const fetchBtn = document.getElementById("fetch-btn");
const errorMsg = document.getElementById("error-msg");

async function loadQuote() {
  fetchBtn.disabled = true;
  quoteText.textContent = "Loading...";
  errorMsg.textContent = "";

  try {
    const data = await quoteService.getRandomQuote();
    quoteText.textContent = data.content + " — " + data.author;
  } catch (error) {
    errorMsg.textContent = "Couldn't load a quote: " + error.message;
    quoteText.textContent = "";
  } finally {
    fetchBtn.disabled = false;
  }
}

fetchBtn.addEventListener("click", loadQuote);
```

### Code walkthrough — the new pieces

**`class QuoteService { constructor(url) { this.url = url; } ... }`**
- Same class pattern as Lesson 5's `Paddle`/`Ball`, applied to something
  that isn't a visible game object at all — the class here bundles "a URL to
  fetch from" (data) with "how to fetch and validate a quote from it"
  (behavior). This is the point of the lesson: classes model *any* related
  data + behavior, not just physical things on screen.
- **Why store `url` in the constructor instead of hardcoding it inside
  `getRandomQuote`?** It makes `QuoteService` reusable — you could construct
  a second instance pointed at a different API (a different quote source, or
  even a completely different kind of API) without touching the method's
  code at all.

**`async getRandomQuote() { ... }`**
- A method can be `async` exactly like a standalone function — same rules,
  `await` works inside it identically.

**`if (!response.ok) { throw new Error(...); }`**
- `response.ok` is a boolean property on the `Response` object: `true` for
  successful HTTP status codes (200–299), `false` for error codes (404, 500,
  etc.). **Critically: a failed HTTP request does NOT make `fetch`'s promise
  reject on its own** — a 404 or 500 still resolves successfully as far as
  `fetch` is concerned, because *some* response did come back; you must
  check `.ok` yourself to detect a server-side failure.
- `throw new Error("...")` — manually raises an error. `new Error(...)` (yes,
  a class, `Error` is a built-in one, following the exact same `new`
  pattern from Lesson 5) constructs an error object carrying a `.message`
  string. `throw` interrupts normal execution immediately, propagating
  upward until something catches it — which is exactly what `loadQuote`'s
  `catch` block below does.

**`try { ... } catch (error) { ... } finally { ... }`**
- `try` contains code that might fail. If any line inside `try` throws (an
  explicit `throw`, or a genuine failure like `fetch` rejecting due to no
  network connection at all), execution immediately jumps to `catch`,
  skipping the rest of `try`.
- `catch (error)` — receives whatever was thrown, bound to the parameter
  name you choose (`error` here). `error.message` reads the human-readable
  description, whether it came from your own `throw new Error(...)` or from
  a genuine network failure.
- `finally { ... }` — runs **always**, whether `try` succeeded completely or
  `catch` handled a failure. Here, re-enabling the button belongs in
  `finally` specifically because the button must be re-enabled *either way*
  — success or failure — and putting it in only one branch would leave the
  button permanently disabled on the path you forgot.

**`fetchBtn.disabled = true;`** (before the `try`) / **re-enabled in `finally`**
- This is the loading-state pattern: disable the trigger, show a loading
  message, attempt the async work, and only re-enable once it's fully
  settled (success or failure) — preventing a user from clicking multiple
  times mid-request and firing overlapping fetches.

### What happens

Click "New Quote": button disables, text shows "Loading...", `getQuote`'s
`await` pauses while the network round-trip happens, then either the quote
text and author render (`try` succeeded) or an error message renders
(`catch` ran) — and either way, the button re-enables (`finally`).

## 6. Trap

Predict, then test: temporarily change the URL to something that doesn't
exist, like `"https://api.quotable.io/this-does-not-exist"`, and click the
button.

Run it. Depending on the exact API's behavior, you'll likely see your own
`throw new Error("Request failed with status 404")` caught correctly and
displayed. Now try something more subtle: turn off your network connection
entirely (or use browser devtools to simulate "offline") and click the
button.

**The trap: a genuine network failure (no connection at all) rejects the
`fetch` promise itself**, which is a *different* failure path than the
`response.ok` check — `fetch`'s promise rejecting is caught by the same
`catch` block, but for a completely different underlying reason
(`TypeError: Failed to fetch`, typically, rather than your own thrown
`Error`). **Both paths funnel into the same `catch`, but conflating "the
server responded with an error" and "no response arrived at all" can hide
real problems if you ever need to react differently to each** — worth
noticing now, before it costs you a confusing debugging session later.

## 7. Exercise

Pick at least one:

- **Predict:** If you removed the `if (!response.ok)` check entirely, what
  would `loadQuote` display for a 404 response? (Hint: `response.json()` on
  an error response often still "succeeds" at parsing *something*, just not
  the quote shape you expect — predict what `data.content` would be.)
- **Modify:** Add a request timeout — if the fetch takes longer than 5
  seconds, show a timeout error instead of waiting indefinitely. (Research
  `AbortController` briefly — this is a real, common pattern worth knowing
  exists even if the full mechanism is beyond this lesson's scope.)
- **Break:** Remove `async` from `getRandomQuote` but leave `await` inside
  it. Read the actual error JavaScript gives you.
- **Trace:** Write out, step by step, every pause-and-resume point in
  `loadQuote` from click to final render, for both the success path and the
  network-failure path.

## What to remember
- `fetch` returns a `Promise` immediately; the actual response arrives later,
  without freezing the rest of the page.
- `await` pauses only the function it's written in, unwrapping a promise's
  resolved value as if the code were synchronous — it's different syntax for
  the same async mechanism `.then()` uses, not a different mechanism.
- A failed HTTP status (404, 500) does not automatically reject `fetch`'s
  promise — check `response.ok` yourself and `throw` explicitly if needed.
- `try`/`catch`/`finally` is the standard shape for async error handling:
  attempt, handle failure, and always clean up regardless of outcome.

## Next lesson
Lesson 7 returns to Phase B's games with Snake — multiple *interacting*
objects (a growing snake body, food, a board) instead of Pong's three mostly
independent ones, and collision detection as the mechanism that makes them
actually interact rather than just coexist on screen.
