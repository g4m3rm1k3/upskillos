---
title: 1.1 — Your first page, from an empty folder
track: Frontend Developer Bootcamp — First Page and Developer Tools
trackOrder: 50.01
runtime: none
---

No coding experience is required. A **frontend** is the part of an app a person sees and operates. HTML describes meaning, CSS controls presentation, and JavaScript adds behavior. You will build separate apps in one portfolio folder. Start in this chapter and continue in order; later chapters reuse earlier files.

Use Project Studio in the desktop app for a real project folder, editor, terminal and Check my work. In the browser edition you can read the lessons; edit and run files in your own editor and terminal. Install a current supported Node.js LTS release and Git from their official sites when lesson 1.3 asks for them. You need a modern browser with developer tools. No paid account or API key is required.

Choose an empty folder called frontend-portfolio. A **folder** groups files; a **path** tells the computer which file you mean. café/index.html and cafe/index.html are different paths: use the exact ASCII spelling cafe everywhere. Create the cafe folder and then index.html inside it. Save after every edit.

### How to learn here

Do not try to memorize every tag or command. Learn to connect a visible result to the instruction that caused it. Each lesson gives you a small model, a worked example, a prediction, something to change independently, and a controlled mistake to investigate.

Read the small example and explain it in your own words before typing the complete guided file shown below. Then run it, compare the result with your prediction, and change one thing. If the outcome surprises you, trace the intermediate values or browser rules instead of repeatedly copying the reference. A wrong prediction is useful information about what to revisit.

The **Your turn** task is for independent work. Use the hint ladder one rung at a time; consulting documentation is allowed. The final explanation asks whether you understand the cause, not whether you remember the exact punctuation. Keep a short journal of an observation, its cause and a new test you chose yourself. Material covered and independent mastery are different milestones.

### The story so far

You are starting with nothing but a folder and a browser. There is no framework, build command or JavaScript to understand yet. Your first win is deliberately small: save a text file and see a browser turn it into a page.

A website is not a picture of a page. It is a set of instructions and resources that a browser interprets. The same document can be read aloud, enlarged, printed or rearranged on a phone. That is why we start with meaning rather than a screenshot to copy.

```text
You type HTML → save index.html → browser reads the file → browser builds a document tree → pixels and accessible information
```

Keep that chain in mind. If the screen looks unchanged, one link in the chain may still contain the old version. You do not need to rewrite the whole file to investigate.

## Give the browser a document

### A useful analogy: a document with labeled parts

Think of HTML as the labeled structure of a book: title page, chapters, paragraphs and lists. A designer can print the same book with different fonts without changing which sentences belong to the same paragraph. HTML labels the parts; CSS will supply that typography later.

The analogy has a limit: a web document is also interactive. Links and forms have browser behavior. HTML is therefore more than a way to put text in boxes.

Read this tiny example before the full document:

```html
<p>Good coffee.</p>
```

`<p>` means “a paragraph starts here.” `Good coffee.` is its text content. `</p>` means “this paragraph ends here.” The slash closes the element; it is not decoration. The opening tag, content and closing tag together form an **element**. Indenting the text makes the source easier to read but does not normally add visible spaces on the page.

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

### Read the file from the outside in

| Part | Job | What would be different without it? |
|---|---|---|
| `<!doctype html>` | Ask for modern HTML rendering | Old compatibility behavior can change layout rules. |
| `<html lang="en">` | Enclose the document and identify its language | Assistive tools may pronounce text using the wrong language. |
| `<head>` | Hold information about the page | Metadata and visible content would become harder to distinguish. |
| `charset="UTF-8"` | Explain how text bytes map to characters | Characters such as é can be misread under the wrong encoding. |
| `<title>` | Name the browser tab | Multiple open pages become difficult to distinguish. |
| `<body>` | Contain what people interact with | This is where your visible heading and paragraphs belong. |

The tree is nested: the paragraph is inside body, and body is inside html. Close inner elements before outer ones, just as you close an inner pair of parentheses before its surrounding pair.

**Rule of thumb:** name an element by what it means, not by the size you want. Use a heading because it introduces content. We will use CSS to make it bigger. This is a default, not a ban on visual design: meaning and appearance are separate decisions that should support each other.

**A common trap:** the filename can secretly be `index.html.txt` when an editor saves plain text. Enable filename extensions in your file manager and inspect the complete name. If the browser shows source text instead of the page, confirm the extension before changing tags.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Close the reference and explain why changing `<title>` does not change the visible h1. Then draw the tree with html at the top and head/body underneath. Place the title and paragraph on the correct branches.

You are ready to continue when you can create a new paragraph without copying the whole document, find the saved file, and distinguish a browser tab title from a page heading. Speed does not matter yet.
