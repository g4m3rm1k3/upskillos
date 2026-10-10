---
title: 3.1 — JavaScript, Seen from Python
runtime: none
experiments: Where JavaScript and Python differ; When the script has an error
teaches: javascript, let, const, strict equality, undefined, arrays, script element, browser console
uses: node, repl, html
---

The grid is typed by hand, and it can't do anything. A browser runs one programming language, **JavaScript**, and this sprint uses it to build the grid and make it respond to clicks and typing.

You already know how to program: variables, `if`, loops, functions, lists, dictionaries. JavaScript has all of them. This sprint shows each one next to the Python you know, and pays most attention to the places where JavaScript behaves differently, because those are where Python habits cause bugs.

## A branch for the sprint

```powershell
git switch -c js-grid
```

```check
git-branch js-grid -- Run git switch -c js-grid
```

## Where JavaScript and Python differ

Open Node's interactive prompt (lesson 0.3). Before you type anything, predict three of the answers:

```predict
question: What does `"1" + 1` give?
choice: 2
choice: The text 11
choice: An error
answer: The text 11
explain: If either side of `+` is a string, JavaScript turns the other side into a string and joins them. Python refuses with a `TypeError`.
verify: node -e "console.log(('1' + 1) === '11' ? 'The text 11' : 'Something else')"
```

```predict
question: What does `1 == "1"` give?
choice: true
choice: false
choice: An error
answer: true
explain: `==` converts its two sides to the same type before comparing, so the string `"1"` becomes the number 1. `===` doesn't convert, and a number is never `===` a string.
verify: node -p "1 == '1'"
```

```predict
question: What does `["A", "B", "C"][5]` give?
choice: undefined
choice: An error
choice: The text C
answer: undefined
explain: Reading past the end of an array gives `undefined`, JavaScript's "nothing there". Python raises `IndexError`.
verify: node -p "['A', 'B', 'C'][5]"
```

Now type all of these, one line at a time, and check your predictions:

```text
PS C:\Users\you\Documents\spreadsheet> node
Welcome to Node.js v24.12.0.
Type ".help" for more information.
> "1" + 1
'11'
> "3" * 2
6
> 1 == "1"
true
> 1 === "1"
false
> let width
undefined
> width
undefined
> typeof width
'undefined'
> const letters = ["A", "B", "C"]
undefined
> letters[5]
undefined
> letters.length
3
> .exit
```

Here is what Python does with the same ideas:

```text
PS C:\Users\you\Documents\spreadsheet> python -c "print('1' + 1)"
Traceback (most recent call last):
  File "<string>", line 1, in <module>
    print('1' + 1)
          ~~~~^~~
TypeError: can only concatenate str (not "int") to str
PS C:\Users\you\Documents\spreadsheet> python -c "print(['A', 'B', 'C'][5])"
Traceback (most recent call last):
  File "<string>", line 1, in <module>
    print(['A', 'B', 'C'][5])
          ~~~~~~~~~~~~~~~^^^
IndexError: list index out of range
```

The pattern: **where Python stops with an error, JavaScript often carries on with an answer.**

- **`"1" + 1` is `'11'`.** If either side of `+` is a string, JavaScript turns the other side into a string and joins them. Python refuses. Other operators go the other way: `"3" * 2` turns `"3"` into a number and gives `6`.
- **`==` converts too.** `1 == "1"` is `true`. **`===`** compares without converting: a number is never `===` a string. This series always uses `===` (and `!==` for "not equal"), and so should you.
- **Nothing there is `undefined`, not an error.** A variable that was never given a value is `undefined`. Reading past the end of an array gives `undefined` too, where Python raises `IndexError`. (JavaScript also has `null`, which means "deliberately empty", like Python's `None`. You'll use `null` yourself and meet `undefined` in bugs.)
- **`let` and `const`** create variables. `let` makes one you can change later; `const` makes one you can't reassign. Use `const` unless you know the value will change.
- **Arrays** are JavaScript's lists: `["A", "B", "C"]`, indexed from 0. `.length` is the length, like Python's `len()`.

A wrong answer that looks fine is worse than an error, because nothing tells you something went wrong. You'll see it happen in this sprint, and sprint 5 brings a tool that catches many of these mistakes before the code runs.

## A script on the page

JavaScript reaches a web page through a **`<script>`** element. Add one to the end of `<body>` in `index.html`, after the table:

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
      </tbody>
    </table>
    <script src="grid.js"></script>
  </body>
</html>
```

`src="grid.js"` loads the script from a file next to the page. The browser reads the page from top to bottom and runs the script when it reaches it. That's why it goes at the **end** of `<body>`: by then the table above it exists, and the script can work with it.

```check
contains index.html "<script src=\"grid.js\"></script>" -- Add the <script> line just before </body>.
```

## grid.js

This step opens `grid.js`. Type:

```javascript file=grid.js
console.log("grid.js is running");

const columns = 26;
const rows = 100;
console.log("The grid will have", columns * rows, "cells.");
```

Refresh the page in the browser. Nothing on the page changes: `console.log` doesn't write on the page. It writes to the browser's **Console**. Open DevTools (**F12**, lesson 2.4) and click the **Console** tab:

```text
grid.js is running
The grid will have 2600 cells.
```

On the right of each line is `grid.js:1` or `grid.js:5`: the file and line that printed it. Click one, and DevTools shows you that line of your code.

The Console is also a prompt like Node's: type `columns * rows` at the bottom of it and press Enter. Your script's variables are there to inspect.

```check
file grid.js
page index.html "true" true console="The grid will have 2600 cells." errors=none label="the page's console shows: The grid will have 2600 cells." -- Refresh the page with F12 open and read the Console.
```

## When the script has an error

Make a typo on purpose: change the last line's `columns` to `colums`. Refresh.

The Console shows a red message starting **`Uncaught ReferenceError: colums is not defined`**, with `grid.js:5` on its right. It's the same kind of error as lesson 0.4's `missingName`, and you read it the same way: what went wrong, then which line. *Uncaught* means no part of your code was prepared to handle it, so the script stopped there.

The page itself looks perfectly normal. A broken script fails silently as far as the page is concerned: if something you wrote "does nothing", the Console is the first place to look.

Fix the typo and refresh: the red message is gone.

```check
page index.html "true" true console="The grid will have 2600 cells." errors=none label="the script runs without errors" -- Fix the typo (colums → columns) and refresh.
```

## Commit

```powershell
git add grid.js
git commit -am "Run a first script on the page"
```

```check
git-tracked grid.js
git-clean
```

## Your turn: the last sheet

Create `playground/js/sheets.js`. Its first line is exactly:

```javascript
const sheets = ["Sheet1", "Sheet2", "Sheet3"];
```

Then make it print `3 sheets; the last is Sheet3`, **worked out from the array**: the count from its length, and the name from its last item. If someone adds a fourth sheet to the array, the message must still be right without any other change.

Run it with `node playground/js/sheets.js`, then commit it.

```check
file playground/js/sheets.js -- Create sheets.js inside a js folder in the playground.
run "node playground/js/sheets.js" stdout="3 sheets; the last is Sheet3" label="it prints 3 sheets; the last is Sheet3"
run "node -e \"eval(require('fs').readFileSync('playground/js/sheets.js', 'utf8').replace(/Sheet3(.)\]/, (m, q) => 'Sheet3' + q + ', ' + q + 'Totals' + q + ']'))\"" stdout="4 sheets; the last is Totals" label="with a fourth sheet added, the message follows" -- Work the count and the name out from the array, not by writing them in.
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: Two things to work out from `sheets`: how many there are, and which one is last.
concept: `.length` is the number of items. Items are numbered from 0, so the last one is at `length - 1`, not at `length`. `+` joins a number and text into text (`3 + " sheets"` is `"3 sheets"`), as the first prediction showed.
shape: One `console.log` with one argument: the length, joined with `" sheets; the last is "`, joined with the item at the last position.
answer: ~~~javascript
const sheets = ["Sheet1", "Sheet2", "Sheet3"];
console.log(sheets.length + " sheets; the last is " + sheets[sheets.length - 1]);
~~~
```
