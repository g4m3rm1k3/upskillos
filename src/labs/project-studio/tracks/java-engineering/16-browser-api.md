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

Create `src/main/resources/static`. Move the HTML and CSS you typed into it using the explorer or `git mv`; also move board.js, then replace its contents in the following steps. These are your existing files, not supplied starter files.

Spring Boot serves this directory from the same origin as the API. Same origin means matching scheme, host and port; it avoids unnecessary CORS configuration. Start the application and open `http://localhost:8080/`. Network requests now have an HTTP origin rather than a file URL.

```check
file src/main/resources/static/index.html
file src/main/resources/static/style.css
```

## Give fetch one error policy

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
