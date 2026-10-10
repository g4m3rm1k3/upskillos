---
title: 3.4 — Events: Selecting a Cell
runtime: none
---

A spreadsheet always has one **selected cell**, outlined, with its address (like `B3`) shown in a box above the grid. Click another cell and the selection moves. Making that happen means responding to clicks, and that's a new way of programming.

Your Python scripts ran from top to bottom and ended. A page's script runs once, to set things up, and then the page waits. When something happens (a click, a key press) the browser calls a function you gave it in advance. Those happenings are **events**, and the functions are **event listeners**.

## The name box

Add a box for the address, above the table, in `index.html`:

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
    <div id="name-box"></div>
    <table id="grid"></table>
    <script src="grid.js"></script>
  </body>
</html>
```

A **`<div>`** is a plain box with no meaning of its own, used to group or position things. (Spreadsheets call this the *name box*.)

```check
contains index.html "<div id=\"name-box\"></div>" -- Add <div id="name-box"></div> above the table.
```

## Styles for the box and the selection

Add two rules to the end of `style.css`:

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

#name-box {
  display: inline-block;
  min-width: 60px;
  margin-bottom: 8px;
  padding: 4px 8px;
  border: 1px solid var(--grid-line);
  font-size: 13px;
}

td.selected {
  outline: 2px solid #1a73e8;
  outline-offset: -2px;
}
```

- **`#name-box`** selects by `id`, as in `querySelector`. `display: inline-block` makes the box only as wide as it needs (a `div` normally stretches across the whole page).
- **`td.selected`** selects `td` elements that have the **class** `selected`. A class is a label you can put on any number of elements, and add or remove from code. The script will move the `selected` class from cell to cell; this rule makes whichever cell has it look selected. (An `outline` is like a border but takes no space, so the grid doesn't shift; `outline-offset: -2px` draws it just inside the cell.)

The `tbody th` rule is your answer from lesson 2.4's Your turn; if you wrote it differently and it passed, keep yours.

```check
contains style.css "td.selected" -- Add the td.selected rule.
contains style.css "#name-box" -- Add the #name-box rule.
```

## Listening for clicks

Replace `grid.js` with this. The new parts are the click listener in the cell loop, and everything from `nameBox` down:

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
let selected = null;

function cellAt(column, row) {
  return body.rows[row].cells[column + 1];
}

function select(column, row) {
  if (selected !== null) {
    selected.classList.remove("selected");
  }
  selected = cellAt(column, row);
  selected.classList.add("selected");
  nameBox.textContent = columnName(column) + (row + 1);
}

select(0, 0);
```

Refresh. `A1` is outlined and the box says `A1`. Click any cell: the outline and the address follow.

### The listener

```javascript
td.addEventListener("click", () => select(c, r));
```

says: when this cell is clicked, call this function. The function is written in a short form called an **arrow function**: `() => select(c, r)` is a function with no parameters whose whole body is `select(c, r)`. It's like Python's `lambda: select(c, r)`.

You're not calling `select` here. You're handing the browser a function to call **later**, on each click. A function handed over to be called later is a **callback**.

### Each cell remembers its own c and r

The arrow function uses `c` and `r`, but the loop has long finished by the time anyone clicks. How does each cell still know *its* column and row? A function remembers the variables around it when it was made; that's called a **closure**. And because `let` creates a **new** `c` for every pass of the loop, each cell's function remembers a different one.

Python behaves differently, and it's a famous trap: `[lambda: i for i in range(3)]` gives three functions that **all** return 2, because Python's loop has one `i` that keeps changing. JavaScript's `let` gives each pass its own.

### The rest

- **`let selected = null`**: no cell is selected yet. `null` is JavaScript's `None`.
- **`body.rows[row].cells[column + 1]`**: every table element has a `rows` list, and every row a `cells` list. `cells` includes the row-number `th` at index 0, so column 0 (`A`) is at index 1. That `+ 1` is easy to forget; `cellAt` exists so it's written once.
- **`selected.classList.remove("selected")`** and **`.add("selected")`**: an element's `classList` is its set of classes. Taking the class off the old cell and putting it on the new one moves the outline.
- **`columnName(column) + (row + 1)`**: the brackets matter. Without them, `"B" + 2 + 1` is worked out left to right: `"B" + 2` is `"B2"`, and then `"B2" + 1` is `"B21"`. That's lesson 3.1's `"1" + 1` again. With them, `2 + 1` happens first, giving `"B3"`.
- **`select(0, 0);`** at the end selects `A1` when the page opens.

```check
page index.html "document.querySelector('#name-box').textContent" A1 errors=none label="A1 is selected when the page opens"
page index.html "(() => { document.querySelectorAll('tbody tr')[2].querySelectorAll('td')[1].click(); return document.querySelector('#name-box').textContent; })()" B3 label="clicking the cell in column B, row 3 shows B3"
page index.html "(() => { const rows = document.querySelectorAll('tbody tr'); rows[2].querySelectorAll('td')[1].click(); rows[9].querySelectorAll('td')[25].click(); return document.querySelector('#name-box').textContent + ' ' + document.querySelectorAll('td.selected').length; })()" "Z10 1" label="after two clicks, Z10 is shown and only one cell is selected"
page index.html "(() => { const cell = document.querySelectorAll('tbody tr')[4].querySelectorAll('td')[3]; cell.click(); return cell.classList.contains('selected'); })()" true label="the clicked cell is the one outlined"
```

## Break it on purpose: arguments in the wrong order

Change the listener to pass the arguments the other way round:

```javascript
td.addEventListener("click", () => select(r, c));
```

Refresh and click the cell in column B, row 3. The box says `C2`, and the outline jumps to a different cell. Click near the bottom right: the Console shows a red `TypeError`, because some rows are now treated as columns past the end of a row.

`select` takes a column and then a row; both are numbers, so nothing stops you passing them in the wrong order. Bugs like this are common in real code. Sprint 5 changes how a cell's position is passed, so this mistake can't be made silently.

Put the order back (`select(c, r)`), refresh, and check that clicking B3 shows `B3` again.

```check
page index.html "(() => { document.querySelectorAll('tbody tr')[2].querySelectorAll('td')[1].click(); return document.querySelector('#name-box').textContent; })()" B3 label="clicking B3 shows B3 again" -- Put the arguments back in order: select(c, r)
```

## Commit

```powershell
git commit -am "Select a cell by clicking it"
```

```check
git-clean
```
