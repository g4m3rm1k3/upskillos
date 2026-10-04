---
title: HTML — structure before presentation
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A browser constructs a Document Object Model (DOM) from HTML. Elements provide meaning, interaction and accessibility behavior. We first build a static task board, then add behavior. This keeps failures in structure separate from failures in networking.

## Describe the page and its main content

The doctype selects standards mode. `lang` informs language processing and assistive technology. UTF-8 controls decoding; viewport makes layout width correspond to device width. The stylesheet link requests a separate resource. `main` identifies primary content; headings express document structure, not merely font sizes.

Opening a file directly is enough for this static lesson. Later fetch requests need an HTTP origin. This fragment leaves the document open for the form that follows.

Type this fragment yourself. Start an empty file at `web/index.html`:

```html edit=web/index.html mode=replace
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Common Ground</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>Common Ground</h1>
    <p>A shared place to turn plans into finished work.</p>
```

## Use built-in form behavior

`for` connects the label to the input id. Clicking the label focuses the field; placeholder text alone would not provide this persistent label. A submit button supports keyboard form submission. Required and maxlength improve feedback but cannot enforce backend rules because clients can bypass HTML.

A status region announces updates without stealing focus. A list represents a collection of tasks. The module script runs with module scope and deferred execution, so the DOM is parsed before its top-level code accesses elements.

Open the page, navigate with Tab, submit with Enter and inspect the Accessibility tree in browser developer tools. An empty list is expected; the next lessons supply appearance and behavior.

Type this fragment yourself. Append to `web/index.html`:

```html edit=web/index.html mode=append
    <form id="new-task">
      <label for="title">Task title</label>
      <input id="title" name="title" required maxlength="80">
      <button type="submit">Add task</button>
    </form>
    <p id="message" role="status"></p>
    <ul id="tasks"></ul>
  </main>
  <script type="module" src="board.js"></script>
</body>
</html>
```

```check
file web/index.html
```
