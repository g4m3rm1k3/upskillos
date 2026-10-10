---
title: 5.2 — Design loading, empty, failure and success states
track: Frontend Developer Bootcamp — Book Finder and HTTP APIs
trackOrder: 50.05
runtime: none
reference: optional
---

Outcome: build an API app that remains understandable on a slow or broken connection. A request has several visible states; a spinner alone cannot explain an error or an empty result. Keep the search input available so a person can correct a query or retry.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
