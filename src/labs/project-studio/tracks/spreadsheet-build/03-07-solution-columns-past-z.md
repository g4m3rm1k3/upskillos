---
title: 3.7 — Solution: Columns Past Z
runtime: none
experiments: Step through it
teaches: bijective numeration, tracing, debugger stepping, loop invariants
uses: while loops, remainder, devtools
---

This lesson explains one solution to the columns challenge, why it works, and why it always finishes. **If yours passed, keep it**: read this to compare, not to replace. If yours didn't pass, this is how to see where it went another way.

## Why it isn't quite base 26

A column name looks like a number written in base 26, with the letters A to Z as its digits. In ordinary base 10, the digits are 0 to 9 and the number after 9 is written `10`: a 1, then a **zero**. Predict what plain base 26 would do at the same point:

```predict
question: In plain base 26 with the digits A = 0, B = 1, … Z = 25, how is the number 26 written?
choice: AA
choice: BA
choice: ZA
answer: BA
explain: 26 is one 26 and nothing left over: the digit for 1 (B), then the digit for 0 (A), so `BA`. But spreadsheets write column 26 as `AA`. Column names have **no zero**: A means 1 in every position, and there's no "A0". That's called **bijective** base 26, and it's why the obvious solution is off by one.
verify: node -e "const d = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; console.log(d[Math.floor(26 / 26)] + d[26 % 26])"
```

## The solution

```javascript
function columnName(index) {
  let name = "";
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}
```

Line by line, for one pass of the loop:

- **`index % 26`** is the last "digit": 0 to 25, so `65 + (index % 26)` is the code of a letter from A to Z.
- **`... + name`** puts that letter **in front of** the name built so far, because the loop works from the last letter backwards, as you'd find the digits of a number by dividing by 10 again and again.
- **`Math.floor(index / 26)`** is what's left after taking that letter off, as in ordinary base 26.
- **`- 1`** is the bijective part. Because A means 1, not 0, in every position, each position counts one more than plain base 26 would, so one comes off before the next letter is worked out.
- **`while (index >= 0)`** stops once nothing is left. A finished name has had its last subtraction take `index` below 0.

## Tracing columnName(27)

Tracing means following the variables by hand, pass by pass. For `columnName(27)`:

| Pass | `index` at the start | `index % 26` | letter | `name` after | `index` after |
|---|---|---|---|---|---|
| 1 | 27 | 1 | B | `B` | 27 / 26 rounded down is 1, minus 1 is **0** |
| 2 | 0 | 0 | A | `AB` | 0 / 26 is 0, minus 1 is **−1** |

`−1` is below 0, so the loop stops: `AB`, column 27. Now predict one yourself:

```predict
question: How many times does the loop run for `columnName(702)`, which is `AAA`?
answer: 3
explain: Once per letter. 702 gives A and leaves 26; 26 gives A and leaves 0; 0 gives A and leaves −1, and the loop stops. Three letters, three passes.
verify: node -e "let index = 702, passes = 0; while (index >= 0) { passes++; index = Math.floor(index / 26) - 1; } console.log(passes)"
```

## Step through it

Watch the trace happen instead of writing it. Start the page as in lesson 3.6, open DevTools (**F12**), and in the **Sources** tab open `grid.js` (**Ctrl+P**, then type its name).

1. Click the line number of `name = String.fromCharCode(…)` to put a **breakpoint** there: the program will pause just before running that line.
2. In the **Console**, type `columnName(28)` and press Enter. The page pauses at your breakpoint.
3. Hover over `index` and `name`, or read them in the **Scope** pane: `28` and `""`.
4. Press **F8** (resume) to run until the breakpoint is reached again: `index` is now `0`, and `name` is `"C"`.
5. Press **F8** once more: the loop ends, and the Console prints `'AC'`. Click the breakpoint again to remove it.

The debugger is lesson 6.5's subject; this is a first taste. Tracing on paper teaches you what to expect; the debugger shows you whether you were right.

## Why it always finishes

A loop that can run forever is a bug, and on user input it's a security bug: anyone who can make it spin freezes the page. So it's worth saying exactly why this one can't:

- **Every pass makes `index` smaller.** For any `index` of 0 or more, `Math.floor(index / 26) - 1` is less than `index`. Numbers that only go down, one whole step at least each time, must eventually go below 0.
- **The loop stops as soon as `index` is below 0.**
- **Bad input finishes immediately.** `columnName(-1)` starts below 0, so the loop never runs and the name is empty. That's the challenge's last check.

A fact like "every pass makes it smaller" is called a **loop invariant**, and it's how professionals convince themselves that a loop ends, without trying every input.

## Your turn: the first four-letter column

Which column is the first to need **four** letters, `AAAA`? Find it with code, not by hand: in `playground/js/four.js`, copy `columnName`, then loop through column numbers until you reach the first whose name is four letters long, and print that number (counted from 0, like `columnName`'s argument).

Before you run it, guess: is it nearer ten thousand, or twenty thousand? Then run it, commit and push.

```check
run "node playground/js/four.js" stdout="18278" label="it prints 18278" -- Print the first number whose name has 4 letters, counting from 0.
git-clean -- Commit it: git add playground, then git commit.
git-pushed -- Push it: git push
```

```hints
nudge: A loop that keeps going until a condition about the name is true, then stops and prints where it stopped.
concept: A string's `.length` is its number of characters. A `while` loop can run "while the name is shorter than 4", adding 1 each pass; when it stops, the number is the first one that wasn't shorter.
shape: Copy the function; `let index = 0;` then `while (columnName(index).length < 4) { index++; }` and `console.log(index)`.
answer: ~~~javascript
function columnName(index) {
  let name = "";
  while (index >= 0) {
    name = String.fromCharCode(65 + (index % 26)) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}

let index = 0;
while (columnName(index).length < 4) {
  index++;
}
console.log(index);
~~~
There are 26 one-letter names, 26 × 26 = 676 two-letter names and 26 × 26 × 26 = 17,576 three-letter ones: 26 + 676 + 17,576 = 18,278 names before the first four-letter one.
```
