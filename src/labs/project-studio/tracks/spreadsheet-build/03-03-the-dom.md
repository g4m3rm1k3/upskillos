---
title: 3.3 — The DOM: Building the Grid from Code
runtime: none
experiments: The rows
teaches: dom, queryselector, createelement, appendchild, textcontent, nested loops
uses: functions, for loops, selectors, ids
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

Replace `grid.js` with this. The function is the same; the column-names test from the last lesson has done its job and goes. This step builds the header row: the corner and the 26 column letters.

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
```

Refresh: a row of letters, A to Z, styled exactly as the typed headers were, because to CSS a `th` is a `th`, however it was made.

### What each piece does

- **`document`** is an object the browser gives every script: the page itself. Like a Python object, it has **properties** (values, reached with a dot) and **methods** (functions belonging to it, called with a dot and brackets).
- **`document.querySelector("#grid")`** finds the first element matching a CSS selector. `#grid` means "the element whose `id` is `grid`": selectors are the same language as in your stylesheet.
- **`document.createElement("tr")`** makes a new `<tr>` element. It exists only in memory until it's added to the page.
- **`parent.appendChild(child)`** puts `child` inside `parent`, as its last child. The nesting you typed by hand in sprint 2 is now built by calls.
- **`th.textContent = columnName(c)`** sets the text inside an element.
- **The header row** starts with one empty `th`, the corner, then one `th` per column, made in a loop.

```check
page index.html "document.querySelectorAll('thead th').length" 27 label="the header row has the corner plus 26 columns"
page index.html "[...document.querySelectorAll('thead th')].slice(0, 4).map(th => th.textContent).join('|')" "|A|B|C" label="the header starts: corner, A, B, C"
page index.html "document.querySelector('thead th:last-child').textContent" Z label="the last column is Z"
```

## The rows {#rows}

Now the body: 100 rows, each a row number and 26 empty cells. Add the second half:

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

Before you refresh, predict:

```predict
question: How many `<td>` cells will the table have?
answer: 2600
explain: 100 rows, each with 26 `td`s (one per column). The row numbers are `th`s, so they don't count: a loop of 26 inside a loop of 100 makes 26 × 100 = 2,600.
verify: page index.html "document.querySelectorAll('tbody td').length"
```

- **The body** has a `tr` per row, each starting with its row number in a `th`, then one empty `td` per column: **a loop inside a loop**, as you'd write in Python.
- **`rowHeader.textContent = r + 1`** gives a number; the browser turns it into text. Rows are counted from 1 for people, from 0 for the loop.
- **Nothing is added to the page until `table.appendChild(body)`.** Building the rows in memory first and adding them once is faster than adding 2,600 cells to the live page one at a time.

Refresh: a full grid, A to Z across and 1 to 100 down. Scroll down and watch the column letters stick to the top, as `position: sticky` promised in lesson 2.3.

In DevTools, the **Elements** tab shows the cells as if you'd typed them: the DOM is the page, however it was made. But look at the page's source (right-click → **View page source**): just the empty `<table id="grid"></table>`. The file is the starting point; the DOM is what's on screen now.

```check
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

## Your turn: a times table

Make a page that builds a 10 by 10 multiplication table **with JavaScript**, as `grid.js` builds the grid. In `playground/js/times.html`:

- an empty `<table id="times"></table>`;
- a `<script>` after it that fills it with 10 rows of 10 cells, where the cell in row *r*, column *c* (both counted from 1) holds *r × c*.

No `<td>` typed in the HTML: the script makes them all. Open it in the browser, then commit.

```check
page playground/js/times.html "document.querySelectorAll('#times tr').length" 10 label="the table has 10 rows" -- The script should add rows to the table with id times.
page playground/js/times.html "[...document.querySelectorAll('#times tr')].every((tr) => tr.querySelectorAll('td').length === 10)" true label="each row has 10 cells"
page playground/js/times.html "document.querySelectorAll('#times tr')[2].querySelectorAll('td')[3].textContent" 12 label="row 3, column 4 holds 12" -- Count from 1: the first row and column are 1, not 0.
lacks playground/js/times.html "<td" label="no cells typed by hand" -- Make the cells with document.createElement("td").
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: It's the grid's body loop, with a number in each cell instead of nothing.
concept: A `<script>` written straight inside the page (no `src`) runs when the browser reaches it, so put it after the table. The loop variables start at 0 in the grid; here they can start at 1 and go up to 10 (`<= 10`), or you can add 1 when you multiply.
shape: Find the table, then a loop over rows that makes a `tr`, with a loop over columns inside that makes a `td`, sets its `textContent` to the product and appends it; append each row to the table.
answer: ~~~html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Times table</title>
  </head>
  <body>
    <table id="times"></table>
    <script>
      const table = document.querySelector("#times");
      for (let r = 1; r <= 10; r++) {
        const tr = document.createElement("tr");
        for (let c = 1; c <= 10; c++) {
          const td = document.createElement("td");
          td.textContent = r * c;
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
    </script>
  </body>
</html>
~~~
```
