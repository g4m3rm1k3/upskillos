---
title: 1.1 — Your folder, your first page
runtime: none
---

### The story so far

You need only basic computer use. This series teaches the rules of Yahtzee and Pig as well as programming. No earlier course, code or compiler is needed.

### What this lesson builds

Create a page in an empty folder and explain the difference between saving source and refreshing the browser.

## Make a place for your work

Create an empty folder named tabletop-workshop. In Project Studio Desktop choose that folder; the built-in editor edits real files there. Browser readers can use a plain-text editor and browser. Show file extensions in your file manager so index.html does not become index.html.txt. Keep this folder for every chapter.

The editor changes text; the browser interprets it. Save with Ctrl+S (Cmd+S on macOS), then refresh the browser. A folder groups files; a filename extension helps tools recognize their format. You do not install Node or Three.js yet.



## Read a complete tiny page

Think of a page as nested boxes with names: a document contains a body; the body contains the main content; main contains a heading, paragraph and button. Draw these boxes on paper before typing. A **tag** such as `<p>` starts an element; `</p>` ends it. The slash marks an ending, not a second paragraph. The text between them is the element's content.

`<!doctype html>` asks for modern HTML behavior. `<html lang="en">` encloses the document and identifies English. `head` holds metadata: UTF-8 character encoding, mobile viewport settings and a tab title. `body` holds visible content. `main` identifies the principal region; `h1` its main heading. `p` is a paragraph. Attributes live in the opening tag: `type="button"` names the button's behavior category. Quotes delimit the attribute value. Indentation exposes nesting for readers; it does not create the nesting.

Predict which title appears in the browser tab and which appears on the page. Then type the small document. The button is intentionally inert: HTML gives it meaning and keyboard focus, but we have not supplied an action.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
</head>
<body>
<main>
  <h1>Tabletop workshop</h1>
  <p>Roll. Think. Play.</p>
  <button type="button">Roll a die</button>
</main>
</body>
</html>
```

**Understand:** doctype selects modern HTML behavior. html encloses the document; lang identifies its language. head holds metadata, not the visible game. charset selects UTF-8 text; viewport tells small screens to use their actual width. title labels the browser tab. body holds visible content. main marks the main region; h1 is its heading; p is a paragraph. A button is an interactive control, but this one has no programmed action yet. Opening and closing tags enclose content. Attributes such as type="button" add information to a tag. Indentation helps humans see nesting. The browser does not require it.

**Engineer:** use a button instead of a clickable paragraph because the browser already gives it focus and keyboard activation.

```check
page index.html "document.querySelector('h1').textContent" "Tabletop workshop"
```

```predict
question: If you edit the heading but do not save, what does refreshing show?
choice: The previously saved heading
choice: The unsaved editor text
answer: The previously saved heading
explain: The browser reads the saved file, not your editor buffer.
```


**Explore, then restore:** Change only the title element, refresh and locate the change. Change only h1 and repeat. Press Tab to focus the button and Enter to activate it: no game action happens yet. Restore the text. Explain why this is not a broken button.

## Try it — Inspect a deliberate mistake

Change the filename to index.html.txt and try opening it. Depending on your system it opens as text instead of a webpage. Restore index.html. Then remove the closing h1 tag and inspect how the browser repairs the document in DevTools (right-click the heading → Inspect). Restore the closing tag: a browser repairing a mistake is not proof the source is correct.



## Your turn — Give the page a purpose

Create practice/welcome.html with a main region, one h1 reading Dice club, and a real button whose visible text is Start playing. Explain why the button does nothing yet.

Write practice/welcome.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/welcome.html "document.querySelector('main h1')?.textContent" "Dice club"
page practice/welcome.html "document.querySelector('button')?.textContent" "Start playing"
```

```hints
nudge: Which elements give meaning to the heading and action?
concept: A button is a control even before you attach behavior.
shape: Use the document shell, then main containing h1 and button.
```
