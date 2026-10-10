---
title: 1.1 — Your first page, from an empty folder
track: Frontend Developer Bootcamp — First Page and Developer Tools
trackOrder: 50.01
runtime: none
reference: optional
---

No coding experience is required. A **frontend** is the part of an app a person sees and operates. HTML describes meaning, CSS controls presentation, and JavaScript adds behavior. You will build separate apps in one portfolio folder. Start in this chapter and continue in order; later chapters reuse earlier files.

Use Project Studio in the desktop app for a real project folder, editor, terminal and Check my work. In the browser edition you can read the lessons; edit and run files in your own editor and terminal. Install a current supported Node.js LTS release and Git from their official sites when lesson 1.3 asks for them. You need a modern browser with developer tools. No paid account or API key is required.

Choose an empty folder called frontend-portfolio. A **folder** groups files; a **path** tells the computer which file you mean. café/index.html and cafe/index.html are different paths: use the exact ASCII spelling cafe everywhere. Create the cafe folder and then index.html inside it. Save after every edit.

## Give the browser a document

Type the file below, save it, and open cafe/index.html in your browser. A **tag** such as `<p>` opens an element; `</p>` closes it. Elements can contain text or other elements. The head stores information about the document; body stores visible content. An **attribute** adds information to a start tag. lang describes the language; charset allows characters such as é; viewport lets narrow screens use their actual width. The title labels the browser tab, while h1 labels the page.

```predict
question: Which text appears on the page?
choice: Only the title element
choice: The h1 and paragraph
answer: The h1 and paragraph
explain: The title belongs to the tab. The body contains the visible content.
```

```html file=cafe/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Juniper Café</title>
</head>
<body>
  <h1>Juniper Café</h1>
  <p>Good coffee. A quiet place to pause.</p>
</body>
</html>
```

```check
page cafe/index.html "document.querySelector('h1').textContent" "Juniper Café" server=static
```

## Your turn: add a useful opening time

Add a second paragraph saying Open daily, 8am–4pm. Keep the original introduction. Reload the browser and compare the page with its tab title. Decide which information a visitor needs first.

```check
page cafe/index.html "Array.from(document.querySelectorAll('p')).some(p => p.textContent === 'Open daily, 8am–4pm.')" "true" server=static
```

```hints
nudge: Find where visible paragraphs live.
concept: A paragraph is a p element in the body.
shape: Add a sibling paragraph after the introduction, then save and reload.
```

## Diagnose, explain and review

Temporarily change the tab title to Wrong café. The page heading stays the same. Use Inspect to find h1 in the document tree, then restore the title. If your edit does not appear, check the saved file path and reload. This is your first debugging loop: observe, form a hypothesis, change one thing, verify.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
