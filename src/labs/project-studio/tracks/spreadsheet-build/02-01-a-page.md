---
title: 2.1 — A Page in the Browser
runtime: none
---

The spreadsheet will be a web page: the kind of document your browser displays. This sprint puts one on the screen: a grid of cells you can see, written by hand. It won't do anything yet. Making it respond is sprint 3.

Web pages are written in **HTML**, a language for describing what's on a page: a heading here, a paragraph there, a table. HTML isn't a programming language: it has no variables, loops or `if`. It describes; the browser draws.

## Start a branch for the sprint

From now on, each piece of work happens on its own branch (lesson 1.7) and is merged into `main` when it works. Start one for this sprint:

```powershell
git switch -c grid-page
```

```check
git-branch grid-page -- Run git switch -c grid-page
```

## The smallest real page

This step opens a new file, `index.html`. Type:

```html file=index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spreadsheet</title>
  </head>
  <body>
    <h1>Spreadsheet</h1>
    <p>A grid of cells will go here.</p>
  </body>
</html>
```

### How HTML is written

HTML is made of **elements**. Most elements are a pair of **tags** around some content:

```html
<h1>Spreadsheet</h1>
```

`<h1>` is the **opening tag**, `</h1>` (with a `/`) the **closing tag**, and the text between them is the content. `h1` means "heading, level 1", the biggest kind of heading.

Elements go inside other elements, which is called **nesting**. The indentation shows it, the way indentation shows blocks in Python. But in HTML the indentation is only for people: the tags decide what's inside what. Every element you open must be closed, in the reverse order you opened them.

Some elements have no content and no closing tag, like `<meta charset="utf-8">`. The `charset="utf-8"` part is an **attribute**: a setting written inside the opening tag, as `name="value"`.

### Line by line

- **`<!DOCTYPE html>`** says "this is a modern HTML page". It isn't an element; it's always the first line.
- **`<html lang="en">`** contains the whole page. `lang="en"` says it's in English, which screen readers use to pronounce it.
- **`<head>`** holds information *about* the page, which isn't drawn on it:
  - **`<meta charset="utf-8">`** says how the file's characters are encoded, so `é` or `€` show up correctly.
  - **`<title>`** is the text on the browser tab.
- **`<body>`** holds what's drawn on the page: here a heading and a **`<p>`** (paragraph).

```check
file index.html
page index.html "document.title" Spreadsheet label="the tab's title is Spreadsheet" -- The <title> element, inside <head>, holds the tab's title.
page index.html "document.querySelector('h1')?.textContent" Spreadsheet label="the page has the heading Spreadsheet" -- Put <h1>Spreadsheet</h1> inside <body>.
```

## Open it in your browser

```powershell
start index.html
```

`start` (short for `Start-Process`) opens a file with whatever program Windows uses for that kind of file; for `.html`, your web browser. (On macOS: `open index.html`.)

The browser shows a big heading, *Spreadsheet*, and the sentence below it. Look at the tab: *Spreadsheet*, from `<title>`. Look at the address bar: something like `file:///C:/Users/you/Documents/spreadsheet/index.html`. `file://` means the browser is reading a file straight from your disk rather than from a website.

## Change it and refresh

Before you try it, predict:

```predict
question: You change the paragraph's text in the editor, and the editor saves it. What does the browser show?
choice: The new text, straight away
choice: The old text, until you refresh
choice: An error, because the file changed
answer: The old text, until you refresh
explain: The browser read the file once, when it opened it, and drew the page from what it read. It isn't watching the file. Pressing F5 makes it read the file again.
```

Change the paragraph's text in the editor, to anything you like. Look at the browser: nothing changed.

The browser read the file once, when it opened it. It doesn't watch for changes. Press **F5** (or click the refresh button) and your change appears.

Remember this small annoyance: edit, switch to the browser, refresh, every time. In sprint 4 you'll install a tool that does the refresh for you.

## Commit

```powershell
git add index.html
git commit -m "Add a page for the spreadsheet"
```

```check
git-tracked index.html -- git add index.html, then git commit.
git-branch grid-page
```

## Your turn: a page from memory

Without copying from `index.html`, write a complete page of your own: `playground/hello.html`. It needs:

- the first line that every modern page starts with;
- the page's language set to English;
- the character encoding set to UTF-8;
- a tab title of exactly `Hello`;
- a heading and a paragraph that people can see.

Open it in the browser to check it, then commit it.

```check
page playground/hello.html "document.title" Hello label="the tab says Hello" -- The title goes in <title>, inside <head>.
page playground/hello.html "document.documentElement.lang" en label="the page's language is en" -- Set lang="en" on the <html> element.
page playground/hello.html "document.characterSet" UTF-8 label="the page is read as UTF-8" -- <meta charset="utf-8"> goes inside <head>.
page playground/hello.html "document.compatMode" CSS1Compat label="the browser reads it as a modern page" -- The very first line is <!DOCTYPE html>.
page playground/hello.html "!!document.querySelector('body h1') && !!document.querySelector('body p')" true label="the body has a heading and a paragraph"
git-clean -- Commit it: git add playground/hello.html, then git commit.
```

`document.compatMode` is how a page can tell whether the browser treated it as modern: without the first line, browsers fall back to imitating very old ones (*quirks mode*), which changes how CSS behaves.

```hints
nudge: Write it top to bottom: the first line, then `<html>`, then the two parts inside it.
concept: Information *about* the page (encoding, title) goes in `<head>`; what's drawn goes in `<body>`. Both are inside `<html>`, which carries `lang`.
shape: `<!DOCTYPE html>`, `<html lang>`, `<head>` with `<meta charset>` and `<title>`, then `<body>` with `<h1>` and `<p>`.
answer: ~~~html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hello</title>
  </head>
  <body>
    <h1>Hello</h1>
    <p>A page written from memory.</p>
  </body>
</html>
~~~
```
