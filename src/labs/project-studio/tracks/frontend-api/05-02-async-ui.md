---
title: 5.2 — Design loading, empty, failure and success states
track: Frontend Developer Bootcamp — Book Finder and HTTP APIs
trackOrder: 50.05
runtime: none
---

Outcome: build an API app that remains understandable on a slow or broken connection. A request has several visible states; a spinner alone cannot explain an error or an empty result. Keep the search input available so a person can correct a query or retry.

### The story so far

The API function returns normalized books or rejects. Now the screen must tell a coherent story while that happens. An API app is not simply a form followed by results: the person may wait, retry, receive nothing, lose connection or change their mind.

We will make these states explicit and protect the current intent from obsolete responses. The earlier planner’s “data → render” idea still applies, but the data now arrives asynchronously.

## Create the search screen

Before trying this step, make a prediction.

```predict
question: If the earlier search finishes last, should it replace the newer result?
choice: No
choice: Yes
answer: No
explain: The latest user intent owns the display; completion order is not intent order.
```

Use a labeled form, a live status message and a result list. Attribution belongs in the interface. A real product should also explain what query data leaves the device. The browser sends the search text to Open Library when the user submits.

```html file=books/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf Search</title>
  <link rel="stylesheet" href="../cafe/styles.css">
</head>
<body>
  <main>
    <h1>Shelf Search</h1>
    <form id="search"><label for="query">Book title or author</label><input id="query" name="query" required><button>Search books</button></form>
    <p id="status" role="status">Search for a book to begin.</p>
    <ul id="results" aria-label="Search results"></ul>
    <p>Book data: <a href="https://openlibrary.org">Open Library</a></p>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

```check
page books/index.html "document.querySelector('#query').labels[0].textContent" "Book title or author" server=static
```

## Render the request lifecycle

### Plan the state machine before the spinner

A state machine is a set of named situations and allowed transitions. You do not need a library to use the idea.

```text
idle --submit--> loading --success with books--> success
                     |--success without books--> empty
                     |--failure---------------> error
success / empty / error --submit again--------> loading
loading --new submit--------------------------> loading for the new request
```

A loading state should say what is happening. An empty state should help refine the query. An error state should offer recovery without inventing a cause it cannot know. “No books exist” would overclaim; “No books found for this search” describes the actual evidence.

Think of a customer-support ticket number. When a new request supersedes an old one, a reply carrying the old number must not be filed as the answer to the new question. Our sequence counter plays that role. It does not prove cancellation happened; it identifies which result still owns the screen.

AbortController cancels the previous request. A sequence number also prevents an older response from overwriting newer results if cancellation arrives too late. ++ increments then returns the number. finally runs after success or failure; only the latest request clears its busy state. The automated check substitutes fetch with a known response; try the real service separately.

```javascript file=books/app.js
import { searchBooks } from './api.mjs';
const form = document.querySelector('#search');
const status = document.querySelector('#status');
const list = document.querySelector('#results');
let controller;
let sequence = 0;
form.addEventListener('submit', async event => {
  event.preventDefault();
  controller?.abort();
  controller = new AbortController();
  const ticket = ++sequence;
  status.textContent = 'Searching…';
  list.setAttribute('aria-busy', 'true');
  list.replaceChildren();
  try {
    const books = await searchBooks(form.elements.query.value, fetch, controller.signal);
    if (ticket !== sequence) return;
    for (const book of books) {
      const item = document.createElement('li');
      item.textContent = `${book.title} — ${book.author}`;
      list.append(item);
    }
    status.textContent = books.length ? `${books.length} books found.` : 'No books found. Try a different title.';
  } catch (error) {
    if (ticket !== sequence) return;
    status.textContent = error.name === 'AbortError' ? 'Search cancelled.' : 'Could not load books. Check your connection and search again.';
  } finally {
    if (ticket === sequence) list.setAttribute('aria-busy', 'false');
  }
});
```

### Follow the callback’s lifetime

Before awaiting anything, the handler prevents navigation, aborts the previous controller, creates a new one and increments the sequence. `ticket` stores this request’s number. Even if sequence changes later, this invocation’s ticket remains its original value.

The UI immediately announces Searching, marks the list busy and removes old results. That avoids presenting stale results as though they match the new query. Another design could keep old results with an explicit “updating” label; either policy must be clear.

After await, the ticket check asks whether this invocation is still current. If not, it exits. Both the success and error branches need that guard: an old failure can otherwise overwrite a newer success with an error message.

finally also checks ownership. Without that condition, request A could finish after request B starts and clear B’s busy state while B is still loading.

**Rule of thumb:** whenever an asynchronous result can be superseded, identify its owner before applying it. Debouncing can reduce how often requests start, but it does not establish which result is current. Cancellation can save work, but a correctness guard remains useful.

Do not move focus automatically to the first result on every response. A person may still be editing the query. Use the status announcement to communicate change and preserve their active task unless a deliberate interaction requires a focus move.

```check
page books/index.html "(async () => { window.fetch=async()=>({ok:true,json:async()=>({docs:[{key:'/works/1',title:'Test Book'}]})}); const f=document.querySelector('#search'); f.elements.query.value='test'; f.requestSubmit(); await new Promise(r=>setTimeout(r,30)); return document.querySelector('#results').textContent; })()" "Test Book — Unknown author" server=static
```

## Your turn: make empty results actionable

Change the empty-state message to No books found. Try an author name or fewer words. Keep the success count unchanged. Test a fixture with docs: [] and inspect the announced status. Avoid blaming the user for a search miss.

```check
page books/index.html "(async () => { window.fetch=async()=>({ok:true,json:async()=>({docs:[]})}); const f=document.querySelector('#search'); f.elements.query.value='test'; f.requestSubmit(); await new Promise(r=>setTimeout(r,30)); return document.querySelector('#status').textContent; })()" "No books found. Try an author name or fewer words." server=static
```

```hints
nudge: The response can succeed while containing no results.
concept: The message belongs in the success path when the array length is zero.
shape: Change just the empty branch, then test both branches.
```

## Diagnose, explain and review

In DevTools choose a slow network, submit one query and immediately submit another. Only the latest may win. Select Offline and submit again: expect a recoverable error and no permanently busy list. Restore the network setting. Keep focus in the search form; do not force focus into results on every response.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Trace two submissions where A is slow and B is fast. At each completion, state the value of ticket, the current sequence and whether that handler may change the list or busy state. Then explain why empty results and a failed request need different copy even though both can display no list items.
