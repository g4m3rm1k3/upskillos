---
title: 3.3 — The DOM: Building the Grid from Code
runtime: none
---

When the browser reads `index.html`, it doesn't keep the text. It builds a tree of **objects**, one per element, and draws the page from that tree. The tree is called the **DOM** (Document Object Model), and JavaScript can change it: add elements, remove them, change their text. The browser redraws to match.

So instead of typing 2,600 cells, the script can create them.

## An empty table in the page

Replace the hand-typed table in `index.html` with an empty one. It gets an **`id`** attribute, a name unique on the page, so the script can find it:

```html file=index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spreadsheet</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1>Spreadsheet</h1>
    <table id="grid"></table>
    <script src="grid.js"></script>
  </body>
</html>
```

The *Coffee*, *Bagel* and *Tea* rows go away with the hand-typed table. Data comes back in sprint 6, kept somewhere better than the page.

```check
contains index.html "<table id=\"grid\"></table>" -- Replace the whole <table>...</table> with <table id="grid"></table>
lacks index.html "Coffee" -- Remove the hand-typed rows.
```

## Build the table in grid.js

Replace `grid.js` with this. The function is the same; the column-names test from the last lesson has done its job and goes.

```javascript file=grid.js
const columns = 26;
const rows = 100;

function columnName(index) {
  return String.fromCharCode(65 + index);
}

const table = document.querySelector("#grid");

const head = document.createElement("thead");
const headerRow = document.createElement("tr");
headerRow.appendChild(document.createElement("th"));
for (let c = 0; c < columns; c++) {
  const th = document.createElement("th");
  th.textContent = columnName(c);
  headerRow.appendChild(th);
}
head.appendChild(headerRow);
table.appendChild(head);

const body = document.createElement("tbody");
for (let r = 0; r < rows; r++) {
  const tr = document.createElement("tr");
  const rowHeader = document.createElement("th");
  rowHeader.textContent = r + 1;
  tr.appendChild(rowHeader);
  for (let c = 0; c < columns; c++) {
    tr.appendChild(document.createElement("td"));
  }
  body.appendChild(tr);
}
table.appendChild(body);
```

Refresh: a full grid, A to Z across and 1 to 100 down. Scroll down the page and watch the column letters: they stick to the top, as `position: sticky` promised in lesson 2.3. The stylesheet styles these cells exactly as it styled the typed ones, because to CSS a `td` is a `td`, however it was made.

### What each piece does

- **`document`** is an object the browser gives every script: the page itself. Like a Python object, it has **properties** (values, reached with a dot) and **methods** (functions belonging to it, called with a dot and brackets).
- **`document.querySelector("#grid")`** finds the first element matching a CSS selector. `#grid` means "the element whose `id` is `grid`": selectors are the same language as in your stylesheet.
- **`document.createElement("tr")`** makes a new `<tr>` element. It exists only in memory until it's added to the page.
- **`parent.appendChild(child)`** puts `child` inside `parent`, as its last child. The nesting you typed by hand in sprint 2 is now built by calls.
- **`th.textContent = columnName(c)`** sets the text inside an element. `rowHeader.textContent = r + 1` gives a number; the browser turns it into text.
- **The header row** starts with one empty `th`, the corner, then one `th` per column. **The body** has a `tr` per row, each starting with its row number in a `th`, then one empty `td` per column: a loop inside a loop, as you'd write in Python.

Nothing is added to the page until `table.appendChild(head)` and `table.appendChild(body)`. Building the rows in memory first and adding them once is faster than adding 2,600 cells to the live page one at a time.

In DevTools, the **Elements** tab shows the cells as if you'd typed them: the DOM is the page, however it was made. But look at the page's source (right-click → **View page source**): just the empty `<table id="grid"></table>`. The file is the starting point; the DOM is what's on screen now.

```check
page index.html "document.querySelectorAll('thead th').length" 27 label="the header row has the corner plus 26 columns"
page index.html "[...document.querySelectorAll('thead th')].slice(0, 4).map(th => th.textContent).join('|')" "|A|B|C" label="the header starts: corner, A, B, C"
page index.html "document.querySelector('thead th:last-child').textContent" Z label="the last column is Z"
page index.html "document.querySelectorAll('tbody tr').length" 100 label="there are 100 rows"
page index.html "document.querySelector('tbody tr:last-child th').textContent" 100 label="the last row is numbered 100"
page index.html "document.querySelectorAll('tbody td').length" 2600 errors=none label="there are 2,600 cells"
```

## Commit

```powershell
git commit -am "Build the 26 by 100 grid with JavaScript"
```

```check
git-clean
```
