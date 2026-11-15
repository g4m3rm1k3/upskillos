---
title: Copies and Where State Lives
runtime: none
---

Players make mistakes, so Blockfall should have an undo: press `z` and the last piece you locked comes back, unlocked. The plan is simple: before each lock, save a copy of the game, and on `z`, put the copy back. It runs without an error. It even looks right on screen. But the copy was only one level deep, the board inside it was never copied, and the locked piece is still in the board, hidden under the piece you got back. This lesson is about what a copy copies: **shallow** and **deep** copies, in Python and in JavaScript, and when a shallow one is enough. It also gathers Blockfall's changing state into one object, because you can only save and restore what you can point at.

**By the end you can:**

- Predict which parts of a structure a shallow copy shares with the original, and which a deep copy doesn't, in Python and JavaScript.
- Decide how deep a copy needs to go, from which parts of the structure can still change.
- Say where a program's state lives (in globals, in an object, in a closure) and what each place makes easy or hard.
- Find a copy that shares too much from its evidence, and fix it.

**You need:** 01-04-01 (aliasing, identity) and 01-04-02 (mutable and immutable objects, pure functions, `dropped`). Blockfall as 01-04-02 left it, with the hard drop on the up arrow. The first step runs in `kit` (`cd ../kit` if you're in `blockfall`); the rest in `blockfall`, with `index.html` open and the console open.

## A copy is one level deep

Making a copy of a list makes a new list. The question is what goes in it. Python's `list(grid)` makes a new outer list, and fills it with the items of `grid`: which, for a grid, means references to the *same* rows. That's a **shallow copy**: new at the top level, shared below it. A **deep copy** copies the objects inside too, and the objects inside those, all the way down; Python's standard `copy` module does it with `copy.deepcopy`.

```python file=kit/copies.py
import copy

grid = [[0, 0], [0, 0]]
shallow = list(grid)  # a new outer list, holding the same rows
deep = copy.deepcopy(grid)  # new lists all the way down

shallow.append([9, 9])  # changes only shallow's own outer list
shallow[0][0] = 1  # changes a row that shallow and grid share
deep[1][1] = 2  # changes a row that only deep has

print("grid:   ", grid)
print("shallow:", shallow)
print("deep:   ", deep)
print(shallow is grid, shallow[0] is grid[0], deep[0] is grid[0])
```

```predict
question: After shallow[0][0] = 1 and shallow.append([9, 9]), what will grid show?
choice: [[0, 0], [0, 0]]
choice: [[1, 0], [0, 0]]
choice: [[1, 0], [0, 0], [9, 9]]
answer: [[1, 0], [0, 0]]
explain: shallow is a new outer list, so appending to it adds a slot only to shallow: grid still has two rows. But its first slot refers to the same row object as grid's first slot, so changing a square in that row is seen through grid too. The copy separated the outer lists and shared everything inside them.
verify: cd kit; .venv/Scripts/python copies.py
```

Save it and run `.venv/bin/python copies.py` (Windows: `.venv\Scripts\python copies.py`):

```
grid:    [[1, 0], [0, 0]]
shallow: [[1, 0], [0, 0], [9, 9]]
deep:    [[0, 0], [0, 2]]
False True False
```

The last line says it with identity: `shallow` is a different list from `grid`, but `shallow[0]` *is* `grid[0]`; `deep[0]` isn't. Every everyday way to copy a list in Python is shallow: `list(a)`, `a.copy()`, `a[:]` and `copy.copy(a)`. So is every everyday way in JavaScript: `[...a]`, `a.slice()`, and for objects `{ ...obj }`.

**A shallow copy is complete when the items can't change.** `list([1, 2, 3])` copies a list of numbers, and the copy shares the numbers, but nothing can change a number, so the two lists are independent in every way that matters. Sharing only hurts when something changes a shared object in place (01-04-01, 01-04-02). So how deep a copy must go is a question about mutability: copy every level that someone might change.

```check
run "cd kit; .venv/Scripts/python copies.py" stdout="grid:    [[1, 0], [0, 0]]" -- A shallow copy shares the rows: changing shallow[0][0] changes grid too.
run "cd kit; .venv/Scripts/python copies.py" stdout="deep:    [[0, 0], [0, 2]]" -- copy.deepcopy copies the rows too, so deep's changes are its own.
run "cd kit; .venv/Scripts/python copies.py" stdout="False True False" -- shallow is a new list holding the same rows; deep's rows are new.
```

## One place for the game's state

Blockfall's state, everything that changes while you play, is in two global variables: `board` and `piece`. To save and restore a game, it helps to have one thing to point at. Gather them into one object:

- `newBoard()` makes a fresh starting board each time it's called, the way `newPiece()` makes a fresh T. (It could be one global array. But then anything that changed "the starting board" would change it for every later game: an alias again.)
- `let state = { board: newBoard(), piece: newPiece() };` is the game's state. It's `let`, because undo will rebind it.
- Every `board[…]` becomes `state.board[…]`, and every use of the falling piece `state.piece`. Nothing else changes, and the game plays exactly as before.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

// A new board: 20 rows, with some filled squares at the bottom.
// Column 0 is the rightmost bit.
function newBoard() {
  const board = new Array(ROWS).fill(0);
  board[19] = 0b1111001111;
  board[18] = 0b1100000001;
  return board;
}

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
  return state.board[row] === FULL;
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

// Everything that changes during a game, in one object: the board and
// the falling piece.
let state = { board: newBoard(), piece: newPiece() };

// Copy a piece into the board: set the bit of each square it covers.
function lock(cells) {
  for (const cell of cells) {
    state.board[cell.row] = state.board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (state.board[row] & (1 << col)) === 0;
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

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(cells) {
  let result = cells;
  while (canMove(result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
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
      if ((state.board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(state.piece)) {
    color = "#fa4";
  }
  for (const cell of state.piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// Arrow keys move the piece, but only to where it fits. Up drops it.
// Space locks a landed piece into the board and starts a new one.
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.piece = dropped(state.piece);
    draw();
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(state.piece)) {
      lock(state.piece);
      state.piece = newPiece();
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
  if (canMove(state.piece, dRow, dCol)) {
    state.piece = moved(state.piece, dRow, dCol);
  }
  draw();
});

draw();
```

Save and reload. Play a little: the arrows, Up and Space work as before. In the console, `state` shows the object, with the board's 20 numbers and the piece's four squares.

**Where state lives.** A program's state has to live somewhere, and the place decides who can reach it:

| Place | Here | Makes easy | Makes hard |
|---|---|---|---|
| Global variables | `ROWS`, `COLS`, and before this step `board` and `piece` | Every function can read and change them without being passed anything | Knowing who changes what: any line in the file might. Saving "the game" means remembering every global. In a browser, globals also share a space with the page: type `board` in the console now and you get the `<canvas id="board">` element, because browsers make each element with an `id` a global name |
| One object | `state` | Saving, restoring, copying, printing it all at once; passing the whole game to a function | Functions here still reach it as a global; passing `state` to them as an argument would make them easier to test (module 1.9) |
| A closure | The `keydown` handler is an arrow function that uses `state` and `dropped` from the code around it | Keeping state private to the functions that need it | Seeing it from outside. Closures are 01-05-03's subject |

```check
page blockfall/index.html "[state.board[18], state.board[19], state.piece.map((c) => c.row).join(',')].join(' ')" "769 975 0,0,0,1" errors=none -- The game's state should be one object, state, with the board and the piece in it.
page blockfall/index.html "(() => { for (let i = 0; i < 2; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } return [state.board[16], state.board[17], state.board[18], state.board[19]].join(' '); })()" "56 16 825 991" -- Drop and lock should still work, through state.
page blockfall/index.html "typeof newBoard === 'function' && newBoard() !== newBoard() && newBoard()[19] === 975" true -- newBoard should make a new starting board each time.
```

## Undo

Now the feature. Before each lock, save the state; on `z`, put the saved state back. Two pieces of syntax:

- `{ ...state }` is a JavaScript **object spread**: a new object with the same properties as `state`. It's the object version of `[...array]`.
- `saved` starts as `null`, JavaScript's "no object here", and goes back to `null` after an undo, so you can't undo the same lock twice.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

// A new board: 20 rows, with some filled squares at the bottom.
// Column 0 is the rightmost bit.
function newBoard() {
  const board = new Array(ROWS).fill(0);
  board[19] = 0b1111001111;
  board[18] = 0b1100000001;
  return board;
}

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
  return state.board[row] === FULL;
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

// Everything that changes during a game, in one object: the board and
// the falling piece.
let state = { board: newBoard(), piece: newPiece() };

// Copy a piece into the board: set the bit of each square it covers.
function lock(cells) {
  for (const cell of cells) {
    state.board[cell.row] = state.board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (state.board[row] & (1 << col)) === 0;
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

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(cells) {
  let result = cells;
  while (canMove(result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
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
      if ((state.board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(state.piece)) {
    color = "#fa4";
  }
  for (const cell of state.piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// The game as it was before the last lock, for undo; null when there's
// nothing to undo.
let saved = null;

// Arrow keys move the piece, but only to where it fits. Up drops it.
// Space locks a landed piece into the board and starts a new one.
// Z undoes the last lock.
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.piece = dropped(state.piece);
    draw();
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(state.piece)) {
      saved = { ...state };
      lock(state.piece);
      state.piece = newPiece();
    }
    draw();
    return;
  }
  if (event.key === "z") {
    if (saved !== null) {
      state = saved;
      saved = null;
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
  if (canMove(state.piece, dRow, dCol)) {
    state.piece = moved(state.piece, dRow, dCol);
  }
  draw();
});

draw();
```

Save and reload. Drop the T with Up and lock it with Space: it turns grey and a new T appears at the top. Press `z`: the new T vanishes and the old one is back, orange, where it landed. It looks like undo works.

```check
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return state.piece.map((c) => c.row).join(','); })()" "18,18,18,19" errors=none -- z should bring back the piece that was just locked.
page blockfall/index.html "(() => { const before = JSON.stringify(state); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return JSON.stringify(state) === before; })()" true -- z with nothing to undo should change nothing.
```

## The board was never copied

Try it somewhere else. Reload. Move the T to the right edge (Right four times), drop it with Up, lock it with Space, and press `z`. The T is back at the right edge, orange. Now press Left. It doesn't move, although nothing seems to be in its way.

```predict
question: Before looking at the state: what do you think is stopping the T? Use what you know about { ...state }.
explain: { ...state } made a new outer object, but its board property refers to the same board array as state.board: the copy is shallow. lock then changed that shared array, so the "saved" board has the locked T in it too. Undo put the piece back, on top of its own locked copy. Every move the piece tries overlaps the copy of itself, so every move is blocked. On screen the orange T hides the grey one exactly.
```

Check the hypothesis in the console. Reload, do the same moves (Right four times, Up, Space), and before pressing `z` ask:

```
saved.board === state.board
saved.piece === state.piece
```

`true`, then `false`. The saved state and the live one share a board. They don't share a piece, because the handler *rebinds* `state.piece` to a new T (it assigns a new value to the property), which changes the live object and not the saved one. Now press `z` and ask `state.board[16]`: `896`, the bits of columns 7, 8 and 9 (128 + 256 + 512). The locked T is still in the board, under the restored one.

So how deep does the copy need to go? Go through the state's parts and ask which ones anything changes in place (this lesson's rule):

- **The board** is changed in place: `lock` sets bits in `state.board[…]`. It must be copied. Its items are numbers, which can't change, so a shallow copy of the board, `state.board.slice()`, copies it completely.
- **The piece** is never changed in place. Since 01-04-02, `moved` and `dropped` build new squares, and the handler rebinds `state.piece`. A saved state can share the piece's squares with the live one safely, because nobody changes them. That's 01-04-02's pure functions paying off: they made sharing safe.
- **The state object** itself has its properties reassigned (`state.piece = …`), so the saved one must be a new object. The object literal below makes one.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

// A new board: 20 rows, with some filled squares at the bottom.
// Column 0 is the rightmost bit.
function newBoard() {
  const board = new Array(ROWS).fill(0);
  board[19] = 0b1111001111;
  board[18] = 0b1100000001;
  return board;
}

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
  return state.board[row] === FULL;
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

// Everything that changes during a game, in one object: the board and
// the falling piece.
let state = { board: newBoard(), piece: newPiece() };

// Copy a piece into the board: set the bit of each square it covers.
function lock(cells) {
  for (const cell of cells) {
    state.board[cell.row] = state.board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (state.board[row] & (1 << col)) === 0;
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

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(cells) {
  let result = cells;
  while (canMove(result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
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
      if ((state.board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(state.piece)) {
    color = "#fa4";
  }
  for (const cell of state.piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// The game as it was before the last lock, for undo; null when there's
// nothing to undo.
let saved = null;

// Arrow keys move the piece, but only to where it fits. Up drops it.
// Space locks a landed piece into the board and starts a new one.
// Z undoes the last lock.
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.piece = dropped(state.piece);
    draw();
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(state.piece)) {
      saved = { board: state.board.slice(), piece: state.piece };
      lock(state.piece);
      state.piece = newPiece();
    }
    draw();
    return;
  }
  if (event.key === "z") {
    if (saved !== null) {
      state = saved;
      saved = null;
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
  if (canMove(state.piece, dRow, dCol)) {
    state.piece = moved(state.piece, dRow, dCol);
  }
  draw();
});

draw();
```

Save and reload, and repeat the experiment: lock at the right edge, `z`, Left. The T moves. In the console, after the lock, `saved.board === state.board` is now `false`.

```check
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return [state.board[18], state.board[19], state.piece.map((c) => c.row).join(',')].join(' '); })()" "769 975 18,18,18,19" errors=none -- Undo should restore the board as it was before the lock: save a copy of the board, not the board itself.
page blockfall/index.html "(() => { for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return [state.board[16], state.board[17], state.piece.map((c) => c.col).join(',')].join(' '); })()" "0 0 6,7,8,7" -- After undo at the right edge, the board should be empty there and the T free to move left.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return saved.board !== state.board && saved.board[19] === 975; })()" true -- The saved board should be a separate array holding the board as it was.
```

**What else, and why not.**

| Way | Cost |
|---|---|
| Copy exactly the parts that change, as here | Cheap, but correct only while your reasoning about "what changes" stays true. If someone later makes a function change the piece's squares in place, undo breaks again, silently. The comment on `moved` from 01-04-02 is what protects it |
| `structuredClone(state)` in JavaScript, `copy.deepcopy` in Python: copy everything | Always independent, whatever changes later. Costs a copy of every object each time, and can't copy everything (`structuredClone` refuses functions, for instance) |
| Never change anything in place, so nothing ever needs copying | Undo is then "keep the old state", for free. The board would need a new array on each lock: `lock` returning a new board instead of changing one, the way `moved` returns new squares |
| Save the actions instead of the states, and undo by replaying all but the last | Small to store, and the usual design for editors; needs every action to be reproducible, and replaying gets slower as the history grows |

## Your turn: undo more than once

One undo is often not enough. Change Blockfall so that `z` undoes the last lock, and pressed again, the lock before that, back to the start of the game. Locking after an undo should still work, and `z` with nothing left to undo should do nothing.

You'll need to keep several saved states instead of one. JavaScript arrays have `push(x)`, which adds `x` at the end, and `pop()`, which removes the last item and returns it, so an array can be a **stack**: the last thing saved is the first thing restored. There's no file to compare with; the checks press keys. Try it yourself first: lock three Ts, press `z` four times, and the board should be back to its start, with the first T orange where it landed.

```hints
nudge: What does saved hold, and how many of them do you need now? Which end of the list do you restore from?
concept: A stack of saved states: push a copy before each lock, pop one on z. Each entry needs the same depth of copy as saved did, for the same reason: lock changes the board in place. Pushing state itself saves no copy at all (the history would hold the live object, over and over), and pushing { ...state } shares the board again. Check the stack isn't empty before popping: pop on an empty array returns undefined, and state = undefined would break the game.
shape: Replace let saved = null; with const history = []; (any name works: it's a fresh array that the game only changes with push and pop, so const is right). On Space, before lock: history.push({ board: state.board.slice(), piece: state.piece }). On z: if (history.length > 0) { state = history.pop(); }
answer: Replace the saved declaration with:
~~~javascript
// The game as it was before each lock, most recent last, for undo.
const history = [];
~~~
In the Space case, before lock(state.piece):
~~~javascript
      history.push({ board: state.board.slice(), piece: state.piece });
~~~
And the z case:
~~~javascript
  if (event.key === "z") {
    if (history.length > 0) {
      state = history.pop();
    }
    draw();
    return;
  }
~~~
history.push(state) is the tempting slip: it saves a reference to the live state, so the next lock changes the "saved" one too, and undo restores the present. history.push({ ...state }) restores the piece but leaves every lock in the board, the bug from this lesson in a new place. A copy each time costs 20 numbers per lock, which is nothing; a long game's history could be capped by dropping the oldest entry with history.shift() once it holds, say, 100.
```

```check
page blockfall/index.html "(() => { for (let i = 0; i < 2; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return [state.board[16], state.board[17], state.board[18], state.board[19], state.piece.map((c) => c.row).join(',')].join(' '); })()" "0 0 825 991 16,16,16,17" errors=none -- After two locks, one z should undo only the second.
page blockfall/index.html "(() => { for (let i = 0; i < 2; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } for (let i = 0; i < 2; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return [state.board[16], state.board[17], state.board[18], state.board[19], state.piece.map((c) => c.row).join(',')].join(' '); })()" "0 0 769 975 18,18,18,19" -- A second z should undo the first lock too.
page blockfall/index.html "(() => { for (let i = 0; i < 3; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return [state.board[14], state.board[16], state.board[18], state.board[19]].join(' '); })()" "0 0 769 975" -- Three locks and four z presses should bring back the starting board, and the extra z should do nothing.
page blockfall/index.html "(() => { const before = JSON.stringify(state); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return JSON.stringify(state) === before; })()" true -- z with nothing to undo should change nothing.
```

**What these checks establish, and what they don't.** They lock up to three Ts and undo some or all of them, comparing the board's numbers and the piece's rows with what they should be. They check the board through the state, so they catch a history that shares the board, or holds the live state itself. They don't check the screen, so try it yourself, including locking again after an undo, or what memory the history uses. And they can't tell whether your copy is deep *enough for the future*: they pass with a history that shares the piece's squares, which is correct only while nothing changes those squares in place. If a later lesson ever does, it must copy them too.

## What you can do now

- A **shallow copy** is a new container holding the same items: `list(a)`, `a[:]`, `a.copy()` and `copy.copy(a)` in Python; `[...a]`, `a.slice()` and `{ ...obj }` in JavaScript. A **deep copy** (`copy.deepcopy`, `structuredClone`) copies the items too, all the way down.
- A shallow copy is complete when the items can't change, such as a list of numbers. How deep to copy is a question about what's changed in place: copy every level that something changes.
- Pure functions make sharing safe: because nothing changes a piece's squares, saved states can share them.
- State can live in **globals** (reachable by everything, hard to save or reason about), in **one object** (easy to save, copy and pass), or in a **closure** (private, hard to see from outside).
- A bug can be invisible on screen and plain in the state. When a feature looks right, ask the state: `saved.board === state.board`.

```predict
question: A settings screen keeps defaults = { colors: { piece: "#4af" }, speed: 1 } and makes each player's settings with mine = { ...defaults }. A player changes mine.speed = 2 and mine.colors.piece = "#f44". What happens to defaults, and to the next player's settings, made the same way?
explain: defaults.speed stays 1, because speed is a property of mine's own new object, and assigning it rebinds it there. But mine.colors is the same object as defaults.colors (the spread copied one level), so mine.colors.piece = "#f44" changes the defaults' colour, and every player created after that starts with red pieces. Copy the nested object too ({ ...defaults, colors: { ...defaults.colors } }), use structuredClone, or replace the colours object instead of changing it (mine.colors = { ...mine.colors, piece: "#f44" }).
```

**Next:** 01-04-04 asks what the state object should promise. Blockfall's state has rules nobody wrote down: the piece's squares are always on the board and never overlap a filled square; the board holds 20 rows of numbers below 1024. Those rules are **invariants**, and the state object will start guarding them itself.
