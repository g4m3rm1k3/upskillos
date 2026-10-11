---
title: 3.2 — Functions and Loops: Naming the Columns
runtime: none
experiments: Predict, then check
teaches: functions, for loops, camelcase, character codes, join
uses: javascript, arrays
---

### The story so far

The page loads a script, `grid.js` (3.1), which prints to the browser's Console. Lesson 3.1 also showed where JavaScript and Python differ: `+` with a string joins text, `===` compares without converting, a missing value is `undefined` rather than an error, and `let` and `const` make variables.

### What this lesson builds

A function that turns a column's position into its letter, used 26 times in a loop. The Console shows:

```text
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

Then you'll find where it goes wrong: the 27th column, which a spreadsheet calls `AA`.

Before the script can build a grid, it needs the column names: A, B, C, all the way to Z. That's a function (turn a column's position into its letter) and a loop (do it 26 times). Both work like Python's, with different punctuation.

## A function

Replace `grid.js` with this:

```javascript file=grid.js
const columns = 26;
const rows = 100;

function columnName(index) {
  return String.fromCharCode(65 + index);
}

const names = [];
for (let i = 0; i < columns; i++) {
  names.push(columnName(i));
}
console.log(names.join(" "));
```

Refresh the page and look at the Console:

```text
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

**`columnName`'s input, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `index` | a column's position, counted from 0 | `2` |
| returns | that column's letter | `"C"` |

**How it finds the letter.** Every character has a number, its **character code**, and the capital letters are numbered in order, `A` to `Z`, from 65 to 90:

| `index` | `65 + index` | `String.fromCharCode(…)` |
|---|---|---|
| 0 | 65 | `"A"` |
| 1 | 66 | `"B"` |
| 2 | 67 | `"C"` |
| 25 | 90 | `"Z"` |
| 26 | 91 | `"["`: not a letter at all |

The last row is this lesson's prediction, below.

### The function, next to Python

```javascript
function columnName(index) {
  return String.fromCharCode(65 + index);
}
```

is Python's

```python
def column_name(index):
    return chr(65 + index)
```

- **`function`** instead of `def`, and the body goes between **`{` `}`** instead of being indented after a `:`. Indent it anyway: JavaScript ignores indentation, but people read it.
- **`return`** works exactly as in Python.
- Names: Python uses `snake_case`; JavaScript's convention is **`camelCase`**: `columnName`, not `column_name`.
- **`String.fromCharCode(65)`** is Python's `chr(65)`: the character with that number. Letters are numbered in order and `A` is 65, so `65 + 0` is `A`, `65 + 1` is `B`, and so on. (`"B".charCodeAt(0)` is Python's `ord("B")`, giving 66.)

### The loop, next to Python

```javascript
for (let i = 0; i < columns; i++) {
  names.push(columnName(i));
}
```

is Python's `for i in range(columns): names.append(column_name(i))`. The round brackets after `for` hold three parts, separated by `;`:

1. **`let i = 0`**: before the loop starts, make a variable `i` set to 0.
2. **`i < columns`**: before each pass, check this. When it's false, the loop ends.
3. **`i++`**: after each pass, add 1 to `i`. (`i++` is short for `i = i + 1`.)

So `i` goes 0, 1, …, 25, the same numbers `range(26)` gives. The first passes and the last, with `names` after each:

| pass | `i` | `i < columns`? | `columnName(i)` | `names` afterwards |
|---|---|---|---|---|
| 1 | 0 | yes | `"A"` | `["A"]` |
| 2 | 1 | yes | `"B"` | `["A", "B"]` |
| … | | | | |
| 26 | 25 | yes | `"Z"` | `["A", …, "Z"]`, 26 items |
| (stop) | 26 | **no** | | the loop ends |

- **`names.push(...)`** adds to the end of an array, like Python's `.append(...)`.
- **`names.join(" ")`** joins the array's items into one string with a space between them: Python's `" ".join(names)`, written the other way round.

```check
page index.html "columnName(0)" A label="columnName(0) is A"
page index.html "columnName(25)" Z label="columnName(25) is Z"
page index.html "true" true console="A B C D E F G H I J K L M N O P Q R S T U V W X Y Z" errors=none label="the Console shows A to Z"
```

## Predict, then check

What is `columnName(26)`, the 27th column? A spreadsheet calls it `AA`.

```predict
question: What does `columnName(26)` return?
choice: AA
choice: [
choice: An error
answer: [
explain: `String.fromCharCode(65 + 26)` is character 91, which comes right after `Z` in the character table, and it's a bracket. The function does exactly what it says; it just wasn't written for more than 26 columns.
verify: page index.html "columnName(26)"
```

Type `columnName(26)` into the Console and press Enter: `'['`. Character 91 comes after `Z` in the character table, and it's a bracket. Try `columnName(27)`, `28` and `29`: `\`, `]` and `^`.

No error, and no warning: a wrong answer that looks like an answer, the pattern from lesson 3.1. The grid only needs A to Z for now, so leave it. Fixing it properly is this sprint's challenge, at the end.

## Commit

```powershell
git commit -am "Name the columns A to Z"
```

```check
git-clean
```

## Your turn: range

Python has `range`; JavaScript doesn't. Write one. In `playground/js/range.js`, write a function `range(n)` that **returns** an array of the numbers from 0 up to, but not including, `n`: `range(4)` is `[0, 1, 2, 3]`, and `range(0)` is an empty array. Below it, log something with it, such as `console.log(range(5).join(" "))`.

Run it with `node playground/js/range.js`, then commit.

```check
file playground/js/range.js -- Create range.js in playground/js.
run "node playground/js/range.js" label="range.js runs without an error"
run "node -e \"eval(require('fs').readFileSync('playground/js/range.js', 'utf8') + ';console.log(JSON.stringify([range(4), range(1), range(0)]))')\"" stdout="[[0,1,2,3],[0],[]]" label="range(4), range(1) and range(0) are right" -- range must return the array, starting at 0 and stopping before n.
git-clean -- Commit it: git add playground, then git commit.
```

The checks call your function with three values, including the edge case `0`: what a function does at its edges is where bugs live.

```hints
nudge: The column-names code in `grid.js` already builds an array in a loop. A function can do the same, and `return` the array.
concept: Start with an empty array, `push` each number, and `return` the array at the end. The loop's condition `i < n` stops before `n`, as Python's `range` does.
shape: `function range(n) {`, an empty array, a `for` loop that pushes `i`, `return`, `}`.
answer: ~~~javascript
function range(n) {
  const numbers = [];
  for (let i = 0; i < n; i++) {
    numbers.push(i);
  }
  return numbers;
}

console.log(range(5).join(" "));
~~~
```
