---
teaches: remainder, math.floor, while loops, input validation
uses: functions, dom
title: 3.6 — Challenge: Columns Past Z
runtime: none
---

Lesson 3.2 left a bug in `columnName`: the 27th column comes out as `[` instead of `AA`. Real spreadsheets go on for thousands of columns: after `Z` comes `AA`, `AB`, … `AZ`, then `BA` … `ZZ`, then `AAA`. This lesson's challenge is to make `columnName` give the right name for **any** column number.

## See the bug on the page

Change the first line of `grid.js` so the grid has 30 columns:

```javascript
const columns = 30;
```

Refresh and scroll right. After `Z` the headers are `[`, `\`, `]` and `^`.

## Your turn: columns past Z

Rewrite `columnName(index)` so that, counting from 0:

| index | name |
|---|---|
| 0 | A |
| 25 | Z |
| 26 | AA |
| 27 | AB |
| 51 | AZ |
| 52 | BA |
| 701 | ZZ |
| 702 | AAA |

Keep `const columns = 30;` so you can see `AA` to `AD` on the page.

Work it out on paper first, with a few rows of that table.

Three JavaScript tools you'll need, which work as in Python:

- **`index % 26`** is the remainder after dividing by 26.
- **`Math.floor(index / 26)`** is division rounded down: Python's `//`, which JavaScript doesn't have (lesson 0.3).
- **A `while` loop**: `while (index >= 0) { ... }` repeats while the condition is true.

And one requirement about safety. A function given a value it wasn't designed for must still **finish**: `columnName(-1)` should give an empty name, not loop forever. A loop that never ends on bad input freezes the page for everyone who hits it, which makes it a way to attack a program, and it's the first question the bootcamp asks of anything that runs on user input: *can it run forever?*

Test as you go: the Console can call your function. Type `columnName(26)` and press Enter.

```check
page index.html "columnName(0)" A label="columnName(0) is A"
page index.html "columnName(25)" Z label="columnName(25) is Z"
page index.html "columnName(26)" AA label="columnName(26) is AA"
page index.html "columnName(27)" AB label="columnName(27) is AB"
page index.html "columnName(51)" AZ label="columnName(51) is AZ"
page index.html "columnName(52)" BA label="columnName(52) is BA"
page index.html "columnName(701)" ZZ label="columnName(701) is ZZ"
page index.html "columnName(702)" AAA label="columnName(702) is AAA"
page index.html "document.querySelector('thead th:last-child').textContent" AD errors=none label="the grid's 30th column is headed AD" -- Set const columns = 30; at the top of grid.js.
page index.html "columnName(-1)" "" timeout=5 label="columnName(-1) gives an empty name, and finishes" -- Make sure the loop ends when it starts below 0.
```

```hints
nudge: It's like writing a number in base 26, with the "digits" A to Z, worked out from the **last** letter backwards, the way you'd find the digits of a number by repeated division.
concept: Base 26 has a digit for zero, but column names don't: there's no "A0". So after taking off each letter, subtract one more before dividing again, and `26` becomes `AA` rather than `BA`.
shape: A `while` loop that, on each pass, puts the letter for `index % 26` **in front** of the name built so far, then makes `index` the rest of the number, minus one; it stops when `index` drops below 0.
```

## Merge the sprint and push

```powershell
git commit -am "Name columns past Z: AA, AB, ..."
git switch main
git merge js-grid
git push
git branch -d js-grid
```

```check
git-branch main
git-no-branch js-grid -- After merging, delete the branch: git branch -d js-grid
git-pushed
git-clean
```

## What you've built, and what's wrong with it

Sprint 3 is done. The grid builds itself, cells can be selected and filled, and the column names are right as far as anyone will scroll.

The code has problems too, and you'll feel them soon. Everything is in one file of over 70 lines, and it will only grow. Nothing protects `columnName` from someone breaking it later: you checked it by hand in the Console, and next month you won't. And bugs like `select(r, c)` and `"B" + 2 + 1` are only found by clicking around.

The next sprints take those on, one at a time: splitting the code into files (sprint 4), a tool that checks types before the code runs (sprint 5), and tests that check `columnName` for you every time it changes (sprint 6).
