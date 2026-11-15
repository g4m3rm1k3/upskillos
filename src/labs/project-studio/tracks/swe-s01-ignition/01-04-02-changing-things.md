---
title: Changing Things: Mutation, Rebinding and Pure Functions
runtime: none
---

01-04-01 ended on a rule: sharing an object only causes trouble when something changes it. So which objects can change, and which code changes them? Blockfall's `moved` builds four new `{ row, col }` objects every time you press a key, only to throw the old four away. A tempting improvement is to move the squares you already have. This lesson makes that change, watches the T fall straight through the floor of the board, and finds out why from the evidence. Along the way it sorts objects into those that can be changed and those that can't, separates changing an object from rebinding a name, and names the property `moved` had and lost: being a **pure function**.

**By the end you can:**

- Say which Python and JavaScript objects can be changed in place, and predict whether an operation changes an object or rebinds a name (`+=` on a list versus on a number, `+`, string methods).
- Classify a function as pure, as reading outside state, or as having side effects, and say why the difference matters to anyone who calls it.
- Diagnose a function that changes its input from the evidence it leaves, and fix it.
- Write a new feature as a pure function and connect it to the one place that changes the game.

**You need:** 01-04-01 (names, objects, aliasing, identity). Blockfall as 01-03-02 left it. The first step runs in `kit` (`cd ../kit` if you're in `blockfall`); the rest in `blockfall`, with `index.html` open in a browser and the developer console open (F12), as in 01-02-03.

## Two kinds of objects

Some objects can be changed after they're made: they're **mutable**. Lists, dictionaries and sets in Python; arrays and objects in JavaScript. Others can't: they're **immutable**. Numbers, strings, `True`/`False`, `None`, bytes and **tuples** in Python (a tuple is written with round brackets, `(2, 3)`: a sequence like a list, but fixed); numbers, strings and booleans in JavaScript. The difference decides what a line of code does. This file tries the same-looking operations on both kinds:

```python file=kit/change.py
# Which objects can change, and what "changing" a name really does.

a = [1, 2]
alias = a
a += [3]  # a list: += changes the list itself
print("list +=:", a, alias)

b = [1, 2]
alias = b
b = b + [3]  # + builds a new list, and b is rebound to it
print("list +:", b, alias)

n = 5
alias = n
n += 1  # a number can't change: += makes a new number and rebinds n
print("int +=:", n, alias)

s = "abc"
upper = s.upper()  # string methods return new strings
print("str:", s, upper)

point = (2, 3)  # a tuple: a sequence that can't be changed
try:
    point[0] = 9
except TypeError as error:
    print("tuple:", error)
```

`except TypeError as error:` catches the error and names it `error`, so the program can print its message instead of stopping.

```predict
question: In the second block, b = b + [3] runs while alias still names the original list. What does alias show?
choice: [1, 2, 3]
choice: [1, 2]
choice: [3]
answer: [1, 2]
explain: b + [3] builds a new list from the two, and b = … rebinds the name b to that new list. The original list was never touched, and alias still names it: [1, 2]. In the first block, a += [3] on a list changed the list itself, so the alias saw [1, 2, 3]. Two operations that look alike do different things to the objects.
verify: cd kit; .venv/Scripts/python change.py
```

Save it and run `.venv/bin/python change.py` (on Windows, `.venv\Scripts\python change.py`):

```
list +=: [1, 2, 3] [1, 2, 3]
list +: [1, 2, 3] [1, 2]
int +=: 6 5
str: abc ABC
tuple: 'tuple' object does not support item assignment
```

Two things can look like "changing `a`", and they're different acts:

- **In-place change** (mutation) alters the object itself. Every name for it sees the change. Only mutable objects allow it: `append`, `a[i] = …`, `d[key] = …`, and `+=` on a list.
- **Rebinding** makes a name refer to a different object. Only that name is affected. Every `name = …` is a rebinding, and so is `+=` on a number or string, because the number can't change: `n += 1` works out `n + 1`, a new object 6, and points `n` at it, while `alias` still names 5.

`+=` doing one thing for lists and another for numbers is a Python quirk worth remembering: on a mutable object it changes the object, and on an immutable one it can only rebind. A string method never changes the string (it can't); `s.upper()` returns a new one, and code that calls `s.upper()` without using the result has done nothing.

Why have immutable objects at all? Because sharing them is always safe, which is what made `fill(0)` safe in 01-04-01. And Python requires it of dictionary keys. A dictionary finds a key by a number computed from its value (its **hash**); if the key's value could change after it was stored, the dictionary would look in the wrong place for it. So `{(1, 2): "ok"}` works and a list key fails: `.venv/bin/python -c "d = {}; d[[1]] = 2"` stops with a `TypeError` whose message includes `unhashable type: 'list'` (Python 3.14 words it `cannot use 'list' as a dict key (unhashable type: 'list')`).

One boundary: a tuple's immutability is **shallow**. `t = (1, [2])` can't have its items replaced, but its second item is a list, and the list can change: `t[1].append(3)` makes `t` show `(1, [2, 3])`. "Can't be changed" applies to the tuple's slots, not to the objects in them.

```check
run "cd kit; .venv/Scripts/python change.py" stdout="list +=: [1, 2, 3] [1, 2, 3]" -- += on a list changes the list in place, so the alias sees it.
run "cd kit; .venv/Scripts/python change.py" stdout="list +: [1, 2, 3] [1, 2]" -- b = b + [3] builds a new list; the alias keeps the old one.
run "cd kit; .venv/Scripts/python change.py" stdout="int +=: 6 5" -- A number can't change; += rebinds the name to a new number.
run "cd kit; .venv/Scripts/python -c \"t = (1, [2]); t[1].append(3); print(t); d = {}; d[[1]] = 2\"" exit=1 stdout="(1, [2, 3])" stderr="unhashable type: 'list'" -- A tuple's list can still change; a list can't be a dictionary key.
```

## Pure functions and side effects

A function can do two kinds of things: compute a result from its arguments, and change something outside itself. Anything a function does that the caller can observe, apart from returning its result, is a **side effect**: changing an argument, changing a global like `board`, drawing on the canvas, printing, writing a file. A function is **pure** when its result depends only on its arguments and it has no side effects. 01-01-02 called the first half deterministic, with no hidden inputs; pure adds "and changes nothing".

Look at `game.js`'s functions with that in mind:

| Function | Kind | Why |
|---|---|---|
| `moved(cells, dRow, dCol)` | Pure | Builds new squares from its arguments, with `map`, and changes nothing |
| `countBits(n)`, `parity(n)` | Pure | Only their argument; `n = n >> 1` rebinds the function's own name, which nobody else can see |
| `isFree`, `isBlocked`, `canMove`, `isLanded`, `isRowFull` | Read outside state | They change nothing, but their answers depend on `board`, which isn't an argument. The same call can answer differently after a `lock` |
| `lock(cells)` | Side effect | Changes `board` |
| `draw()`, the `keydown` handler | Side effects | Change pixels; the handler rebinds `piece` |

The questions (`isFree`, `canMove`, `isLanded`) change nothing, so you can ask them as often as you like, in any order, from anywhere, including the console, and the game is exactly as it was. That's a property worth checking, not assuming. Reload the page and paste this into the console (if the browser asks, type `allow pasting` first, as in 01-03-02):

```
(() => {
  const before = JSON.stringify([board, piece]);
  isFree(0, 0);
  moved(piece, 1, 0);
  isBlocked(piece, 0, -1);
  canMove(piece, 0, 1);
  isLanded(piece);
  isRowFull(19);
  return JSON.stringify([board, piece]) === before;
})()
```

`JSON.stringify` turns the board and the piece into one string of text, a snapshot of their values (01-04-01 used it to compare arrays by contents). It answers `true`: after all six questions, the state is exactly what it was.

```predict
question: The keydown handler runs piece = moved(piece, dRow, dCol). Is that line an in-place change of the piece, or a rebinding?
choice: An in-place change: the piece's squares are moved
choice: A rebinding: piece is pointed at a new array of new squares
answer: A rebinding: piece is pointed at a new array of new squares
explain: moved returns a new array of new { row, col } objects and leaves the old ones alone, and piece = … points the name piece at the new array. The old squares are left unchanged, and since nothing else refers to them, JavaScript eventually frees their memory. The game's state changes, but only in this one line, in the handler.
```

```check
page blockfall/index.html "(() => { const before = JSON.stringify([board, piece]); isFree(0, 0); moved(piece, 1, 0); isBlocked(piece, 0, -1); canMove(piece, 0, 1); isLanded(piece); isRowFull(19); return JSON.stringify([board, piece]) === before; })()" true errors=none -- Asking the game questions should leave the board and the piece as they were.
```

## A faster move

Every key press makes `moved` build a new array and four new objects, twice: once inside `canMove` to ask whether the move fits, and once in the handler to make it. A natural thought is that this is wasteful, and that `moved` could simply move the squares it's given:

- `cell.row += dRow` changes the `row` property of the object `cell` refers to, in place.
- It returns the same array it was given, so the handler's `piece = moved(piece, …)` still works.

Make that change to `moved`. The rest of the file is as before:

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = new Array(ROWS).fill(0);
// Some filled squares at the bottom. Column 0 is the rightmost bit.
board[19] = 0b1111001111;
board[18] = 0b1100000001;

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
  return board[row] === FULL;
}

// How many 1 bits n has: add the lowest bit, then shift n right so the
// next bit becomes the lowest, until no 1 bits are left.
function countBits(n) {
  let count = 0;
  while (n !== 0) {
    count += n & 1;
    n = n >> 1;
  }
  return count;
}

// The parity of n: 1 if it has an odd number of 1 bits, 0 if even.
function parity(n) {
  return countBits(n) % 2;
}

// A new piece at the top of the board: the squares it covers. This one is a T.
function newPiece() {
  return [
    { row: 0, col: 3 },
    { row: 0, col: 4 },
    { row: 0, col: 5 },
    { row: 1, col: 4 },
  ];
}

// The falling piece.
let piece = newPiece();

// Copy a piece into the board: set the bit of each square it covers.
function lock(cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
// Faster: it moves the squares it's given instead of making new ones.
function moved(cells, dRow, dCol) {
  for (const cell of cells) {
    cell.row += dRow;
    cell.col += dCol;
  }
  return cells;
}

// A piece is blocked when some one of its moved squares isn't free.
function isBlocked(cells, dRow, dCol) {
  return moved(cells, dRow, dCol).some((cell) => !isFree(cell.row, cell.col));
}

// Not blocked means every moved square is free.
function canMove(cells, dRow, dCol) {
  return !isBlocked(cells, dRow, dCol);
}

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
}

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// Arrow keys move the piece, but only to where it fits.
// Space locks a landed piece into the board and starts a new one.
document.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(piece)) {
      lock(piece);
      piece = newPiece();
    }
    draw();
    return;
  }
  let dRow = 0;
  let dCol = 0;
  if (event.key === "ArrowLeft") {
    dCol = -1;
  } else if (event.key === "ArrowRight") {
    dCol = 1;
  } else if (event.key === "ArrowDown") {
    dRow = 1;
  } else {
    return;
  }
  event.preventDefault();
  if (canMove(piece, dRow, dCol)) {
    piece = moved(piece, dRow, dCol);
  }
  draw();
});

draw();
```

```predict
question: Save, reload, and before pressing anything, predict: how many columns will the T move when you press the right arrow once?
choice: 0
choice: 1
choice: 2
answer: 2
explain: The handler calls canMove(piece, 0, 1) first, which calls isBlocked, which calls moved(piece, 0, 1): and moved now moves the piece's own squares one column right. canMove answers "yes, it fits". Then the handler calls moved(piece, 0, 1) again, which moves them another column. One key press, two moves. Asking the question made the move.
```

Save and reload `index.html`. Press the right arrow once: the T jumps two columns. Press it twice more, and on the third press part of the T disappears past the right edge of the board. Press Down a few times: two rows a press, and then the T falls through the floor and out of sight. No error appears in the console.

```check
page blockfall/index.html "(() => { const cells = [{ row: 0, col: 0 }]; const result = moved(cells, 1, 0); return [cells[0].row, result === cells].join(' '); })()" "1 true" errors=none -- This version of moved changes the squares it's given and returns the same array.
```

## Reading the evidence

Read what happened, and test the explanation before fixing anything.

1. **Every move is doubled.** One Right press moves two columns, one Down two rows. Something moves the piece besides the line that's meant to.
2. **The piece goes where it can't.** At the wall the move is refused, yet the piece is in the wall. Type `piece.map((c) => c.col)` in the console after three Right presses: `[8, 9, 10, 9]`. Column 10 doesn't exist.
3. **Hypothesis:** asking `canMove` moves the piece. Test it directly. Reload, then paste:

```
(() => {
  const before = JSON.stringify(piece);
  const answer = canMove(piece, 0, 1);
  return [answer, JSON.stringify(piece) === before];
})()
```

It answers `[true, false]`: the move fits, and the piece is no longer what it was. A question changed the thing it was asked about. That explains all of it. On each press, `canMove` moves the piece once as a side effect of asking; if the answer is yes, the handler moves it again. If the answer is no, the piece has *already* been moved into the wall or the floor, and nothing moves it back. That's how the T ended up at column 10 and below row 19.

The bug isn't in `moved` alone. Changing its input in place is a perfectly good thing for a function to do, if its callers expect it. The bug is that `isBlocked` was written for a pure `moved`, and its whole job is "where *would* this go?". A function that changes its input is a different function, with a different contract, even though its name and its return value look the same. Changing a function's side effects silently breaks every caller that relied on it having none. Put `moved` back, and say in its comment what callers may rely on:

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = new Array(ROWS).fill(0);
// Some filled squares at the bottom. Column 0 is the rightmost bit.
board[19] = 0b1111001111;
board[18] = 0b1100000001;

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
  return board[row] === FULL;
}

// How many 1 bits n has: add the lowest bit, then shift n right so the
// next bit becomes the lowest, until no 1 bits are left.
function countBits(n) {
  let count = 0;
  while (n !== 0) {
    count += n & 1;
    n = n >> 1;
  }
  return count;
}

// The parity of n: 1 if it has an odd number of 1 bits, 0 if even.
function parity(n) {
  return countBits(n) % 2;
}

// A new piece at the top of the board: the squares it covers. This one is a T.
function newPiece() {
  return [
    { row: 0, col: 3 },
    { row: 0, col: 4 },
    { row: 0, col: 5 },
    { row: 1, col: 4 },
  ];
}

// The falling piece.
let piece = newPiece();

// Copy a piece into the board: set the bit of each square it covers.
function lock(cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
// A pure function: it builds new squares and leaves the ones it's given alone,
// so asking "where would it go?" never moves anything.
function moved(cells, dRow, dCol) {
  return cells.map((cell) => ({ row: cell.row + dRow, col: cell.col + dCol }));
}

// A piece is blocked when some one of its moved squares isn't free.
function isBlocked(cells, dRow, dCol) {
  return moved(cells, dRow, dCol).some((cell) => !isFree(cell.row, cell.col));
}

// Not blocked means every moved square is free.
function canMove(cells, dRow, dCol) {
  return !isBlocked(cells, dRow, dCol);
}

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
}

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// Arrow keys move the piece, but only to where it fits.
// Space locks a landed piece into the board and starts a new one.
document.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(piece)) {
      lock(piece);
      piece = newPiece();
    }
    draw();
    return;
  }
  let dRow = 0;
  let dCol = 0;
  if (event.key === "ArrowLeft") {
    dCol = -1;
  } else if (event.key === "ArrowRight") {
    dCol = 1;
  } else if (event.key === "ArrowDown") {
    dRow = 1;
  } else {
    return;
  }
  event.preventDefault();
  if (canMove(piece, dRow, dCol)) {
    piece = moved(piece, dRow, dCol);
  }
  draw();
});

draw();
```

Save and reload. Right moves one column and stops at the wall; Down stops on the floor; the paste above answers `[true, true]`.

```check
page blockfall/index.html "(() => { const before = JSON.stringify(piece); const answer = canMove(piece, 0, 1); return [answer, JSON.stringify(piece) === before].join(' '); })()" "true true" errors=none -- canMove should answer without moving the piece: moved must build new squares.
page blockfall/index.html "(() => { for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); return piece.map((c) => c.col).join(','); })()" "6,7,8,7" -- Each Right press should move the T one column.
page blockfall/index.html "(() => { for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return piece.map((c) => c.row).join(','); })()" "18,18,18,19" -- Down should stop the T on the floor.
page blockfall/index.html "(() => { const cells = [{ row: 0, col: 0 }]; const result = moved(cells, 1, 0); return [cells[0].row, result === cells, result[0].row].join(' '); })()" "0 false 1" -- moved should leave its input alone and return new squares.
```

**What else, and why not.** In-place change isn't wrong; it's a trade:

| Way | Cost |
|---|---|
| Change objects in place | No new objects to make, which matters in hot loops over large data. But every alias sees each change, and every caller must know the function changes things |
| Build new objects (pure functions), as `moved` does | Each change makes new objects; the old ones stay valid, so asking "what if?", undo and keeping a history are free. Making four small objects per key press costs nothing a person could notice |
| Freeze objects so nobody can change them: `Object.freeze` in JavaScript | In a classic script like `game.js`, writing to a frozen object is *silently ignored*; only in strict mode (a `"use strict";` line at the top) does it throw a `TypeError`. And freezing is shallow, like a tuple: a frozen array's objects can still change |
| Immutable data by design: Python tuples, frozen dataclasses (module 2.4), libraries such as Immer in JavaScript | Mistakes become errors; updates take more code, or a library |

A common shape for programs, which Blockfall now has, is many pure functions that decide (`moved`, `canMove`, `isLanded`) and a few places that change things (the handler, `lock`, `draw`). The pure ones can be tested by asking them questions; the others are kept small.

## Your turn: a hard drop

Many falling-block games let the player drop a piece straight down to where it lands, with one key. Add it to Blockfall: the up arrow (`"ArrowUp"`) moves the piece to where it would come to rest if it fell straight down. It doesn't lock it: Space still does that.

Write it as a pure function, `dropped(cells)`, which returns the squares where the piece would land and leaves the squares it's given unchanged; and make the `keydown` handler use it on `ArrowUp`. There's no file to compare with; the checks press keys and ask questions, so check the behaviour yourself first: Up, then Space, should leave the same board as 25 presses of Down and then Space.

```hints
nudge: How would you drop the piece by hand with the keys you already have? Write down what you'd do, and what makes you stop. Then: which of the existing functions answers "can it go one more row?"
concept: Falling is a loop: while the piece can move down a row, move it down a row. canMove(cells, 1, 0) is the question, and moved(cells, 1, 0) gives the next position without changing anything. Keep the current position in a local variable and rebind it each time round; the squares the function was given are never touched. Then the handler rebinds piece to the result, the one place the game changes.
shape: function dropped(cells) { let result = cells; while (canMove(result, 1, 0)) { result = moved(result, 1, 0); } return result; } In the keydown handler, before the Space case: if (event.key === "ArrowUp") { event.preventDefault(); piece = dropped(piece); draw(); return; }
answer: After isLanded:
~~~javascript
// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(cells) {
  let result = cells;
  while (canMove(result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
}
~~~
At the start of the keydown handler:
~~~javascript
  if (event.key === "ArrowUp") {
    event.preventDefault();
    piece = dropped(piece);
    draw();
    return;
  }
~~~
The T from the top lands at rows 18, 18, 18, 19. The tempting slip is to drop by changing the squares: while (canMove(cells, 1, 0)) { for (const cell of cells) cell.row += 1; }. In the game it works, because the handler's piece = dropped(piece) gets the same array back. But dropped(piece) in the console then moves the piece, and a caller that only wanted to know where it would land (a shadow showing the landing place, say) would move it: this lesson's bug again. while (!isLanded(result)) is another valid loop condition: "some square below is blocked" is the same question as "can't move down a row".
```

```check
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); return piece.map((c) => c.row).join(',') + ' ' + piece.map((c) => c.col).join(','); })()" "18,18,18,19 3,4,5,4" errors=none -- The up arrow should drop the T straight down to where it lands.
page blockfall/index.html "(() => { const before = JSON.stringify(piece); const result = dropped(piece); return [JSON.stringify(piece) === before, result.map((c) => c.row).join(',')].join(' '); })()" "true 18,18,18,19" -- dropped should return where the piece lands without moving the piece it's given.
page blockfall/index.html "(() => { for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); return piece.map((c) => c.row).join(','); })()" "17,17,17,18" -- Dropped from column 0, the T lands on the filled square in row 18.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); return [board[18], board[19], piece.map((c) => c.row).join(',')].join(' '); })()" "825 991 16,16,16,17" -- Drop, lock, drop again: the second T should land on the first.
```

**What these checks establish, and what they don't.** They press Up from two starting columns and check where the T lands, check that `dropped` leaves its input alone, and drop a second T onto a locked first one. They don't look at the screen, so watch it yourself: Up should move the T in one jump, and it should turn orange, landed. They try only the T and only three places. And "leaves its input alone" is checked by comparing the piece's values before and after; a function could also misbehave by changing `board`, which only the earlier "questions leave the state alone" paste would show. Run that paste again with `dropped(piece);` added to its list of questions.

## What you can do now

- **Mutable** objects (lists, dictionaries, sets; JavaScript arrays and objects) can be changed in place. **Immutable** ones (numbers, strings, tuples, `None`; JavaScript primitives) can't, so sharing them is always safe, and only they can be dictionary keys. A tuple's immutability is shallow.
- **In-place change** alters the object, and every alias sees it. **Rebinding** points one name at another object. `+=` changes a list in place but rebinds a number; `+` and string methods always make new objects.
- A **pure** function's result depends only on its arguments, and it has no **side effects**. Some functions change nothing but read outside state (`board`); others change it (`lock`, `draw`).
- A function that starts changing its input has a new contract. Callers written for the old one break silently: `canMove` started making the moves it was asked about.
- Keep the deciding pure and the changing in few places: in Blockfall, the handler is the one place `piece` changes.

```predict
question: A teammate writes Python def add_point(points, p): points.append(p); return points, and calls it as new_points = add_point(old_points, (3, 4)), then compares new_points with old_points to see what changed. What will the comparison show, and why?
explain: No difference at all: new_points == old_points, and in fact new_points is old_points. append changed the caller's list in place, and the function returned that same list. The caller thought it had two versions to compare; it has two names for one. Either make the function pure (return points + [p], a new list) or make it plainly a mutation (append and return nothing, as Python's own list.append does, so nobody mistakes it for a new value).
```

**Next:** 01-04-03 copies things. A copy of a list is a new list, but are its items new too? Blockfall's board, an array of numbers, copies completely with `board.slice()`; its piece, an array of objects, doesn't, and a game-state object holding both is where the curriculum's aliasing bug is waiting.
