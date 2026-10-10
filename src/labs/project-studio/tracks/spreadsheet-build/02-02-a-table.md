---
title: 2.2 — A Table: the First Grid
runtime: none
---

Back to the spreadsheet, and the second half of this sprint: putting the styling section to work on a real interface. First the page needs something to style.

A spreadsheet is a grid: columns lettered A, B, C across the top, rows numbered down the side, and cells where they meet. HTML has an element made for grids: the **table**. It's also the right *semantic* choice (Styling 1): a spreadsheet's cells are tabular data, related across rows and down columns, and a screen reader can announce each cell with its row and column headers.

## The table

Replace the paragraph in `index.html` with a table. It's long; type it carefully, and notice how often you repeat yourself.

```html file=index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spreadsheet</title>
  </head>
  <body>
    <h1>Spreadsheet</h1>
    <table>
      <thead>
        <tr>
          <th></th>
          <th>A</th>
          <th>B</th>
          <th>C</th>
          <th>D</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>1</th>
          <td>Item</td>
          <td>Price</td>
          <td>Qty</td>
          <td>Total</td>
        </tr>
        <tr>
          <th>2</th>
          <td>Coffee</td>
          <td>3.50</td>
          <td>2</td>
          <td></td>
        </tr>
        <tr>
          <th>3</th>
          <td>Bagel</td>
          <td>2.25</td>
          <td>3</td>
          <td></td>
        </tr>
        <tr>
          <th>4</th>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
```

### The table's elements

- **`<table>`** contains the whole grid.
- **`<tr>`** is a *table row*. A table is a list of rows; each row is a list of cells.
- **`<td>`** is *table data*: an ordinary cell.
- **`<th>`** is a *table header* cell. The column letters and row numbers are headers, not data, and saying so lets the browser (and screen readers) treat them differently. Browsers show them bold and centred.
- **`<thead>`** and **`<tbody>`** split the rows into the header row and the body rows. The next lesson styles the two parts differently.
- The first `<th>` in the header row is empty: it's the corner above the row numbers.

Before you refresh, count:

```predict
question: How many `<td>` cells (not counting the `<th>` headers) does the table have?
answer: 16
explain: Four body rows, each with four data cells (Item, Price, Qty, Total). The column letters and the row numbers are `<th>` elements, so they don't count.
verify: page index.html "document.querySelectorAll('td').length"
```

Refresh the browser (**F5**): a grid of text, without lines yet.

The empty **Total** cells are on purpose. In sprint 7, `D2` will hold a formula, `=B2*C2`, and show `7` by working it out.

```check
page index.html "[...document.querySelectorAll('thead th')].map(th => th.textContent.trim()).join('|')" "|A|B|C|D" label="the header row is: corner, A, B, C, D"
page index.html "[...document.querySelectorAll('tbody tr')].map(tr => tr.querySelector('th')?.textContent.trim()).join('|')" "1|2|3|4" label="the rows are numbered 1 to 4"
page index.html "document.querySelectorAll('tbody td').length" 16 label="there are 16 data cells (4 rows × 4 columns)"
page index.html "[...document.querySelectorAll('tbody tr')[1].querySelectorAll('td')].map(td => td.textContent.trim()).join('|')" "Coffee|3.50|2|" label="row 2 holds Coffee, 3.50, 2 and an empty Total"
```

## Count the cost

Your table has 4 columns and 4 rows: 16 cells, plus headers, and `index.html` grew to 56 lines. A real sheet starts with columns A to Z and 100 rows: 2,600 cells. Typed the same way, that's nearly 3,000 lines of almost identical HTML, and changing the number of rows would mean typing them all again.

When you notice you're repeating yourself like that, it's a sign the work belongs to a program. In sprint 3, ten lines of JavaScript will build the 2,600 cells for you. For now, a small grid is enough to style.

## Commit

```powershell
git commit -am "Draw a 4 by 4 grid as a table"
```

`-a` works here because `index.html` is already tracked (lesson 1.7).

```check
git-clean -- Commit the table: git commit -am "your message"
run "git log -1 --format=%s" stdout="grid" label="the last commit's message mentions the grid"
```

## Your turn: Tea, and a spare row

Row 4 is empty. Put a third item in it: **Tea**, price **2.75**, quantity **1**, with an empty Total like the others. Then add a **row 5**, empty, so there's always a blank row at the bottom of the sheet, as in a real spreadsheet.

Refresh to check the grid, then commit.

```check
page index.html "[...document.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('th')?.textContent.trim()).join('|')" "1|2|3|4|5" label="the rows are numbered 1 to 5" -- Each row starts with a <th> holding its number.
page index.html "[...document.querySelectorAll('tbody tr')[3].querySelectorAll('td')].map((td) => td.textContent.trim()).join('|')" "Tea|2.75|1|" label="row 4 holds Tea, 2.75, 1 and an empty Total"
page index.html "[...document.querySelectorAll('tbody tr')[4].querySelectorAll('td')].map((td) => td.textContent.trim()).join('|')" "|||" label="row 5 has four empty cells"
page index.html "document.querySelectorAll('tbody td').length" 20 label="20 data cells in all"
git-clean -- Commit it: git commit -am "Add tea, and a spare row"
```

```hints
nudge: Rows 2 and 3 show what a full row looks like; row 4, as it is now, shows an empty one.
concept: Each `<tr>` is one row: a `<th>` with its number, then four `<td>`s. A new row goes after the last `</tr>`, still inside `<tbody>`.
shape: Fill row 4's first three `<td>`s, then copy the whole empty `<tr>…</tr>` below it and change its number.
answer: ~~~html
        <tr>
          <th>4</th>
          <td>Tea</td>
          <td>2.75</td>
          <td>1</td>
          <td></td>
        </tr>
        <tr>
          <th>5</th>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
~~~
```
