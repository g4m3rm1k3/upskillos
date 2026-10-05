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

### Parse one element before the document

HTML is a markup language describing document structure. `<p>Shared work</p>` has an opening tag, text content, and a closing tag. The browser creates a paragraph **element** containing a text node. Elements nested inside another element become its children in the DOM, the browser's in-memory tree of the document.

`<html lang="en">` adds an attribute named lang with value en. Attributes configure or describe an element. The head contains metadata and resource references; the body contains the page's visible content. The title element names the browser tab, while h1 names the visible main heading. They serve different consumers.

`<!doctype html>` selects the modern HTML parsing/layout mode. It is a declaration, not a visible element. `meta` and `link` are void elements: they do not take closing tags. `charset="utf-8"` identifies the text encoding so bytes decode into the intended characters. The viewport declaration tells mobile browsers to use the device's layout width instead of a wider virtual desktop layout.

`rel="stylesheet"` says what relationship the linked resource has to this document. `href="style.css"` is a relative URL resolved next to the HTML file. The stylesheet does not exist yet, so the browser may report a missing resource while still displaying the document using default styles. Diagnose a failed stylesheet request separately from missing HTML.

**Predict:** changing title alone changes which visible heading? None. It changes the tab title. Edit each in turn and inspect the DOM in developer tools. The Elements panel shows the parsed tree, which can differ from malformed source because the browser attempts error recovery. A page displaying something is not proof its markup is well structured.

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

### Follow keyboard submission without JavaScript

`form` groups controls whose values can be submitted together. Its id lets our script find this specific form. `label for="title"` targets the input with `id="title"`; the matching values connect the visible words to the control. `name="title"` identifies that control in native form submission. An id and a name solve different problems even when they use the same text.

Without a type attribute, this input uses the text type. `required` is a boolean attribute: its presence asks the browser to reject an empty value during native validation. `maxlength="80"` limits user entry length. A value of spaces can still satisfy native required validation; our server's whitespace normalization remains necessary.

`type="submit"` gives the button native form submission behavior, including Enter from the input. Before board.js exists, a valid submission can navigate/reload the page using the browser's default form action. The JavaScript lesson will intercept that event and replace navigation with local behavior. An empty submission should instead show browser validation feedback.

`role="status"` makes later changes to that paragraph available as status announcements to assistive technology. It does not create an error message by itself. `ul` is an unordered list container; our script will create one `li` per task. Keeping semantics gives tools information that styled generic containers would lack.

The script's `type="module"` selects module execution, including separate scope and deferred execution after document parsing. `src` requests the JavaScript resource. Until we write that file, expect a missing-script diagnostic and static HTML only. Do not try to fix that by rewriting the form.

**Experiment:** change for to an unmatched id, click the label, and observe that the input no longer receives focus. Restore it. Then navigate by keyboard and explain which behavior came from native HTML before any framework was installed.

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
