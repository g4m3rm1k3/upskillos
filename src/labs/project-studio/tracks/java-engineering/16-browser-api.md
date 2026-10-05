---
title: Browser networking — state across a fallible boundary
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

The browser and server are separate processes. Fetch returns a promise for a response, and an HTTP error is still a response. We will explicitly handle pending, success and failure while preserving typed input when a save fails.

## Move the static files into the application

### Trace the resource request independently of API code

Spring Boot serves files under static as HTTP resources. The root index.html becomes the page entry; its relative style.css and board.js references cause separate browser requests. A missing script can leave a correctly styled but noninteractive page, while a missing stylesheet leaves functional controls with default presentation. Inspect each request rather than treating the entire page as one result.

Moving a tracked file with git mv updates the working tree and stages the move. Moving it with the explorer also works, but you then stage the changes explicitly. Review the diff so you can distinguish a relocation from the following deliberate replacement of board.js.

An **origin** is a scheme/host/port tuple. localhost and 127.0.0.1 name this machine but are different browser hosts. Use one consistently when testing cookies later. Serving page and API through the same origin lets relative /api paths target the correct server without introducing cross-origin permission configuration.

Create `src/main/resources/static`. Move the HTML and CSS you typed into it using the explorer or `git mv`; also move board.js, then replace its contents in the following steps. These are your existing files, not supplied starter files.

Spring Boot serves this directory from the same origin as the API. Same origin means matching scheme, host and port; it avoids unnecessary CORS configuration. Start the application and open `http://localhost:8080/`. Network requests now have an HTTP origin rather than a file URL.

```check
file src/main/resources/static/index.html
file src/main/resources/static/style.css
```

## Give fetch one error policy

### Follow a promise through three distinct outcomes

A **promise** represents an eventual result or rejection. fetch begins a request and immediately returns a promise. `await` pauses the current async function's continuation; the browser can still handle other events. An async function itself returns a promise even when its source says return a plain value.

If the network cannot produce a response, fetch rejects and execution leaves the current normal path. If a response arrives with status 400 or 500, fetch generally fulfills with a Response object. `response.ok` checks whether status is 200–299; our explicit throw converts an unacceptable HTTP response into a rejected request promise. Finally `response.json()` reads and decodes the body asynchronously and can itself reject for invalid JSON.

The default `options = {}` supplies an empty object when the caller omits options. A backtick-delimited template literal evaluates expressions inside `${...}`; response.status becomes part of the error text. Braces used for a template substitution are not an object literal.

Trace refresh: await request; receive an array; clear old DOM; loop through tasks; create and attach text nodes. If the request rejects, the clear line is never reached, so an existing displayed list remains. **Predict:** why can a server returning an HTML login page with status 200 defeat response.ok alone? The status passes, but JSON parsing fails. Authentication later gets a deliberate API status policy.

An async function returns a promise. Await suspends this function until that promise settles; it does not freeze the entire browser. Response.ok checks the HTTP status range. We parse JSON only after accepting the response, avoiding a misleading JSON error for an HTML failure page.

Default parameters provide an empty options object when none is passed. The template literal embeds values into a string. Rendering still uses textContent, preserving the user-text safety property.

Type this fragment yourself. Start an empty file at `src/main/resources/static/board.js`:

```javascript edit=src/main/resources/static/board.js mode=replace
const form = document.querySelector('#new-task');
const input = document.querySelector('#title');
const list = document.querySelector('#tasks');
const message = document.querySelector('#message');
async function request(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
async function refresh() {
  const tasks = await request('/api/tasks');
  list.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement('li');
    item.textContent = `${task.title} — ${task.status}`;
    list.append(item);
  }
}
```

## Keep feedback and input aligned with the result

### Locate the acceptance boundary

A try block runs the operation; catch receives a thrown/rejected error from its awaited work; finally runs on either path to restore the button. `button.disabled = true` changes a DOM property that stops ordinary button activation. It improves interaction, but cannot stop another tab or client sending a request.

`JSON.stringify({ title: input.value })` converts a JavaScript object into JSON text for the HTTP body. The nested headers object sets Content-Type to tell the server how to decode that text. POST selects creation rather than the default GET.

| Event | Draft | Feedback/control state |
|---|---|---|
| Submission begins | Preserved | Saving, button disabled |
| POST rejects | Preserved | Error, button re-enabled in finally |
| POST accepted | Reset | Saved, refreshing |
| Refresh rejects after accepted POST | Already reset | Error, button re-enabled; save is not undone |

`refresh().catch(...)` at file scope handles the promise from the initial load. Registering a submit handler alone would not load existing tasks. Do not remove this catch and assume the handler's try catches a different asynchronous operation.

**Experiment:** stop the server after loading the page and attempt a save. Then restart and retry deliberately. Record the visible draft and the network result. A timeout after server acceptance remains ambiguous; this UI does not automatically repeat POST because that can create duplicate tasks.

JSON.stringify encodes an object for the request body. Content-Type describes that representation. Finally runs whether the save or refresh fails, re-enabling the control. Input clears only after the server accepts the save; a refresh failure afterward does not undo that save.

Disconnect networking with developer tools and submit. Input should remain. Restore networking and retry. A lost response may still mean the server committed: this first UI avoids automatic retries but does not promise exactly-once creation. Document that limitation rather than hiding it behind a generic success animation.

Type this fragment yourself. Append to `src/main/resources/static/board.js`:

```javascript edit=src/main/resources/static/board.js mode=append
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  message.textContent = 'Saving…';
  try {
    await request('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.value })
    });
    form.reset();
    message.textContent = 'Saved. Refreshing the board…';
    await refresh();
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
refresh().catch(error => { message.textContent = error.message; });
```

```check
file src/main/resources/static/board.js
run "mvn -q test" timeout=180
```
