---
title: 3.5 — The Formula Bar: Typing into Cells
runtime: none
experiments: An experiment: text that tries to be HTML
teaches: input elements, keyboard events, event objects, focus, xss, innerhtml
uses: events, dom, flexbox
---

You can select a cell; now put something in it. Spreadsheets have a **formula bar**: a text box above the grid that shows what's in the selected cell. You type there, press **Enter**, and the text goes into the cell, and the selection moves down one row, ready for the next entry. In sprint 7 that box is where formulas are typed, which is how it got its name.

## The input

Add a text box beside the name box, and wrap the two in a `div` so they sit in one row:

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
    <div id="toolbar">
      <div id="name-box"></div>
      <input id="formula-bar" autocomplete="off">
    </div>
    <table id="grid"></table>
    <script src="grid.js"></script>
  </body>
</html>
```

**`<input>`** is a box the user can type in. It has no closing tag. `autocomplete="off"` stops the browser offering things you typed into other pages.

```check
contains index.html "<input id=\"formula-bar\"" -- Add the <input id="formula-bar" autocomplete="off"> inside the toolbar div.
```

## Style the toolbar

Add the toolbar's styles to `style.css`, and remove `margin-bottom` from `#name-box` (the toolbar has the margin now):

```css file=style.css
:root {
  --grid-line: #d0d7de;
  --header-bg: #f3f4f6;
  --header-text: #57606a;
}

body {
  font-family: system-ui, sans-serif;
  margin: 24px;
}

table {
  border-collapse: collapse;
}

th,
td {
  border: 1px solid var(--grid-line);
  padding: 4px 8px;
  min-width: 80px;
  height: 24px;
  font-size: 13px;
}

th {
  background: var(--header-bg);
  color: var(--header-text);
  font-weight: 600;
}

thead th {
  position: sticky;
  top: 0;
}

tbody th {
  text-align: right;
}

#toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

#name-box {
  display: inline-block;
  min-width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--grid-line);
  font-size: 13px;
}

#formula-bar {
  width: 360px;
  padding: 4px 8px;
  border: 1px solid var(--grid-line);
  font: inherit;
  font-size: 13px;
}

td.selected {
  outline: 2px solid #1a73e8;
  outline-offset: -2px;
}
```

`display: flex` lays a box's children out in a row (Styling 5), and `gap: 8px` puts space between them. `font: inherit` makes the input use the page's font: form controls don't, unless told to. The formula bar is 360px wide, room for a long formula, and its padding and border match the name box beside it, from the same grid-line token, so the two read as one toolbar.

```check
contains style.css "#formula-bar" -- Add the #formula-bar rule.
page index.html "getComputedStyle(document.querySelector('#toolbar')).display" flex label="the toolbar lays its boxes out in a row"
```

## Keyboard events

Replace `grid.js`. The changes are all after `nameBox`: two variables that remember where the selection is, three new lines in `select`, and a listener for the Enter key.

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
    const td = document.createElement("td");
    td.addEventListener("click", () => select(c, r));
    tr.appendChild(td);
  }
  body.appendChild(tr);
}
table.appendChild(body);

const nameBox = document.querySelector("#name-box");
const formulaBar = document.querySelector("#formula-bar");
let selected = null;
let selectedColumn = 0;
let selectedRow = 0;

function cellAt(column, row) {
  return body.rows[row].cells[column + 1];
}

function select(column, row) {
  if (selected !== null) {
    selected.classList.remove("selected");
  }
  selected = cellAt(column, row);
  selectedColumn = column;
  selectedRow = row;
  selected.classList.add("selected");
  nameBox.textContent = columnName(column) + (row + 1);
  formulaBar.value = selected.textContent;
  formulaBar.focus();
}

formulaBar.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    selected.textContent = formulaBar.value;
    if (selectedRow + 1 < rows) {
      select(selectedColumn, selectedRow + 1);
    }
  }
});

select(0, 0);
```

Refresh, then type `Item`, press Enter, type `Coffee`, press Enter. Click `B1`, type `Price`, Enter. It feels like a spreadsheet.

### What's new

- **`formulaBar.value`** is the text in an input. (Other elements have `textContent`; inputs have `value`.)
- **`formulaBar.focus()`** puts the typing cursor in the input. `select` does it every time, so you can click a cell and type straight away.
- **`"keydown"`** happens every time a key is pressed while the input has focus. The browser passes your listener an **event object** describing what happened, here called `event`. **`event.key`** is the name of the key: `"Enter"`, `"a"`, `"ArrowDown"`.
- **`(event) => { ... }`** is an arrow function with a parameter and a body of several statements, in `{ }`. The click listener's `() => select(c, r)` had no parameters and a one-expression body, with no braces.
- **`if (selectedRow + 1 < rows)`**: on the last row, Enter writes the cell but stays put. Without this check, `cellAt` would look for row 101, get `undefined`, and the next line would fail with a `TypeError`.
- **`selectedColumn` and `selectedRow`** remember where the selection is, so the Enter listener knows which cell is below.

Refresh the page and everything you typed is gone. The text was only in the page's DOM, which is rebuilt from the files on every load. Keeping data is sprint 6's job (the data needs a home that isn't the page) and sprint 13's (saving to a file).

```check
page index.html "document.querySelector('#name-box').textContent + ' ' + (document.activeElement === document.querySelector('#formula-bar'))" "A1 true" errors=none label="A1 is selected and the formula bar has the cursor"
page index.html "(() => { document.querySelectorAll('tbody tr')[1].querySelectorAll('td')[1].click(); const bar = document.querySelector('#formula-bar'); bar.value = 'Coffee'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return document.querySelectorAll('tbody tr')[1].querySelectorAll('td')[1].textContent + ' ' + document.querySelector('#name-box').textContent; })()" "Coffee B3" label="typing Coffee into B2 and pressing Enter fills B2 and moves to B3"
page index.html "(() => { const bar = document.querySelector('#formula-bar'); bar.value = 'x'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); return document.querySelectorAll('tbody tr')[0].querySelectorAll('td')[0].textContent + '|' + document.querySelector('#name-box').textContent; })()" "|A1" label="other keys don't write the cell or move"
page index.html "(() => { document.querySelectorAll('tbody tr')[0].querySelectorAll('td')[2].textContent = 'Qty'; document.querySelectorAll('tbody tr')[0].querySelectorAll('td')[2].click(); return document.querySelector('#formula-bar').value; })()" Qty label="selecting a cell shows its text in the formula bar"
page index.html "(() => { document.querySelectorAll('tbody tr')[99].querySelectorAll('td')[0].click(); const bar = document.querySelector('#formula-bar'); bar.value = 'last'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return document.querySelector('#name-box').textContent + ' ' + document.querySelectorAll('tbody tr')[99].querySelectorAll('td')[0].textContent; })()" "A100 last" errors=none label="Enter on the last row writes the cell and stays on A100"
```

## An experiment: text that tries to be HTML {#xss}

A spreadsheet shows whatever people type, and people can type anything, including text that looks like HTML. What happens to it depends on one choice in the code. Click **Create provided playground/js/xss.html** and read it:

```html file=playground/js/xss.html provided
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Text or HTML?</title>
  </head>
  <body>
    <p id="as-text"></p>
    <p id="as-html"></p>
    <script>
      const typed = '<img src="x" onerror="document.title = \'Hacked\'">';
      document.querySelector("#as-text").textContent = typed;
      // Remove the // from the next line, save, and refresh:
      // document.querySelector("#as-html").innerHTML = typed;
    </script>
  </body>
</html>
```

The same text, `typed`, goes into two paragraphs: once as `textContent`, and, when you remove the `//`, once as **`innerHTML`**, which makes the browser read the text **as HTML**. The text is an image whose `src` doesn't exist, with an `onerror` attribute: code the browser runs when the image fails to load.

Open the page, then remove the `//` from the last line, save and refresh. First, predict:

```predict
question: With the `innerHTML` line switched on, what does the browser tab's title say after the refresh?
choice: Text or HTML?
choice: Hacked
answer: Hacked
explain: `innerHTML` turned the typed text into a real `<img>` element. Its image failed to load, so the browser ran the `onerror` code, which changed the title. The `textContent` paragraph just shows the characters, harmlessly.
verify: page playground/js/xss.html "(async () => { await new Promise((done) => setTimeout(done, 500)); return document.title; })()"
```

This is **cross-site scripting** (XSS), one of the most common security holes on the web. If a spreadsheet showed one person's typing with `innerHTML`, anyone could type code that runs in every other viewer's browser: reading their data, acting as them. Here it only changed a title; a real attack would quietly send the victim's session somewhere else.

The rule that prevents it: **anything a person typed goes into the page with `textContent`, never `innerHTML`**. `grid.js` has done that since lesson 3.3, which is why the check below passes: it types the same attack into a cell and confirms nothing runs.

```check
page index.html "(async () => { document.querySelectorAll('tbody tr')[0].querySelectorAll('td')[0].click(); const bar = document.querySelector('#formula-bar'); bar.value = '<img src=\"x\" onerror=\"document.title = 1\">'; bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((done) => setTimeout(done, 500)); return document.title + '|' + document.querySelectorAll('#grid img').length; })()" "Spreadsheet|0" label="typing HTML into a cell shows it as text, and nothing runs"
```

Put the `//` back, so the lab is safe again, before you commit.

## Commit

The lab is a new file, so `git add` it first; `-a` only stages files Git already tracks.

```powershell
git add playground
git commit -am "Type into cells through the formula bar"
```

```check
git-clean
```

## Your turn: a live preview, safely

Make `playground/js/preview.html`: a text box `<input id="source">` and a paragraph `<p id="preview">`. As you type in the box, the paragraph shows exactly what's typed, **as text**: typing `<b>bold</b>` must show those characters, not bold text.

You need one event you haven't used: **`"input"`** fires on a text box every time its text changes, whatever caused the change (a key, a paste, a delete), which makes it better than `"keydown"` for this.

Commit when it works.

```check
page playground/js/preview.html "(() => { const s = document.querySelector('#source'); s.value = 'hello'; s.dispatchEvent(new Event('input')); return document.querySelector('#preview').textContent; })()" hello label="the preview follows the typing"
page playground/js/preview.html "(() => { const s = document.querySelector('#source'); s.value = '<b>bold</b>'; s.dispatchEvent(new Event('input')); const p = document.querySelector('#preview'); return p.textContent === '<b>bold</b>' && p.querySelector('b') === null; })()" true label="HTML is shown as text, never run" -- Which of the two ways of putting text in the page is safe?
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: One listener, on the text box, for the `"input"` event.
concept: Inside the listener, the box's current text is its `.value`. Copying it into the paragraph with `textContent` is safe; `innerHTML` is the XSS from this lesson's experiment.
shape: Find both elements; `source.addEventListener("input", () => { preview.textContent = source.value; });`
answer: ~~~html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Preview</title>
  </head>
  <body>
    <input id="source" autocomplete="off">
    <p id="preview"></p>
    <script>
      const source = document.querySelector("#source");
      const preview = document.querySelector("#preview");
      source.addEventListener("input", () => {
        preview.textContent = source.value;
      });
    </script>
  </body>
</html>
~~~
```
