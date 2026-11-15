---
title: Functions as Values: Tables, Closures and a Game Loop
runtime: none
---

Blockfall's key handler is a chain of six `if`s: if the key is `ArrowUp`, drop; else if it's Space, lock; and so on. Every new key adds another branch to the chain. But each branch only says "for this key, call that". That's a lookup, and JavaScript can store the "call that" part as a value in a table, the same way it stores a number. Functions are values: you can put them in objects, pass them to other functions, and return them from functions. This lesson uses that to replace the chain with a table, gives Blockfall what every falling-block game needs, a piece that falls by itself, and meets the feature that makes all of it work, and one of the most famous bugs in JavaScript: the **closure**, a function that remembers the names around it.

**By the end you can:**

- Store functions in a table and choose one to call by a key; say what makes a function **first-class** and what makes another **higher-order**.
- Explain what a closure captures (variables, not their values at the time) and predict what it sees when called later.
- Find the shared-loop-variable bug from its evidence, and fix it in JavaScript (`let`) and in Python (a default argument).
- Run code on a timer with `setInterval`, and stop it again with a function that a closure made.

**You need:** 01-04-04 (Blockfall's `Game` class) and 01-05-01 and 01-05-02 (calls, local names, lifetime, defaults evaluated once). Work in `blockfall`, with `index.html` open in a browser and the console open.

## Functions are values

You've been passing functions around since 01-02-03: `cells.some((cell) => !isFree(…))` hands `some` a function, which `some` calls once per cell. An arrow function such as `() => game.drop()` is an expression whose value is a function, just as `3 + 4` is an expression whose value is a number. Values can be stored, so functions can be too. A language where functions are values like any other has **first-class functions**. A function that takes a function as an argument, like `some`, `map` or `addEventListener`, or returns one, is a **higher-order function**.

So the key handler can look its key up in a table. `ACTIONS` is an object whose keys are key names (`" "` has to be quoted, since a space isn't a valid bare name) and whose values are functions. `ACTIONS[event.key]` gives the function for that key, or `undefined` if there isn't one, and `action()` calls it.

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
function isRowFull(board, row) {
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
// The piece and its squares are frozen: values that nobody can change.
function newPiece() {
  return Object.freeze([
    Object.freeze({ row: 0, col: 3 }),
    Object.freeze({ row: 0, col: 4 }),
    Object.freeze({ row: 0, col: 5 }),
    Object.freeze({ row: 1, col: 4 }),
  ]);
}

// Copy a piece into a board: set the bit of each square it covers.
function lock(board, cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(board, row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
// A pure function: it builds new squares and leaves the ones it's given alone,
// so asking "where would it go?" never moves anything. The new squares are
// frozen, like newPiece's.
function moved(cells, dRow, dCol) {
  return Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row + dRow, col: cell.col + dCol })));
}

// A piece is blocked when some one of its moved squares isn't free.
function isBlocked(board, cells, dRow, dCol) {
  return moved(cells, dRow, dCol).some((cell) => !isFree(board, cell.row, cell.col));
}

// Not blocked means every moved square is free.
function canMove(board, cells, dRow, dCol) {
  return !isBlocked(board, cells, dRow, dCol);
}

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(board, cells) {
  return cells.some((cell) => !isFree(board, cell.row + 1, cell.col));
}

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(board, cells) {
  let result = cells;
  while (canMove(board, result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
}

// The rules the game's state must always obey. Returns a list of the rules
// state s breaks, as sentences; an empty list means s is sound.
function invariantProblems(s) {
  const problems = [];
  if (s.board.length !== ROWS) {
    problems.push("the board has " + s.board.length + " rows, not " + ROWS);
  }
  for (let row = 0; row < s.board.length; row++) {
    const bits = s.board[row];
    if (!Number.isInteger(bits) || bits < 0 || bits > FULL) {
      problems.push("row " + row + " holds " + bits + ", not 0 to " + FULL);
    }
  }
  if (s.piece.length !== 4) {
    problems.push("the piece has " + s.piece.length + " squares, not 4");
  }
  for (const cell of s.piece) {
    const onBoard = cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS;
    if (!onBoard) {
      problems.push("square " + cell.row + "," + cell.col + " is off the board");
    } else if ((s.board[cell.row] & (1 << cell.col)) !== 0) {
      problems.push("square " + cell.row + "," + cell.col + " overlaps a filled square");
    }
  }
  return problems;
}

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #history;

  constructor() {
    this.#board = newBoard();
    this.#piece = newPiece();
    this.#history = [];
  }

  // A copy of the board, so that nobody outside can change the real one.
  board() {
    return this.#board.slice();
  }

  // The falling piece's squares.
  piece() {
    return this.#piece;
  }

  move(dRow, dCol) {
    if (canMove(this.#board, this.#piece, dRow, dCol)) {
      this.#piece = moved(this.#piece, dRow, dCol);
    }
    this.#check();
  }

  drop() {
    this.#piece = dropped(this.#board, this.#piece);
    this.#check();
  }

  // Lock a landed piece into the board and start a new one.
  lockPiece() {
    if (isLanded(this.#board, this.#piece)) {
      this.#history.push({ board: this.#board.slice(), piece: this.#piece });
      lock(this.#board, this.#piece);
      this.#piece = newPiece();
    }
    this.#check();
  }

  // Go back to before the last lock, if there was one.
  undo() {
    if (this.#history.length > 0) {
      const saved = this.#history.pop();
      this.#board = saved.board;
      this.#piece = saved.piece;
    }
    this.#check();
  }

  #check() {
    const problems = invariantProblems({ board: this.#board, piece: this.#piece });
    if (problems.length > 0) {
      console.error("Broken rules: " + problems.join("; "));
    }
  }
}

const game = new Game();

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  const board = game.board();
  const piece = game.piece();
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(board, row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(board, piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// What each key does: a function to call for it. Arrow keys move the piece,
// but only to where it fits; Up drops it; Space locks a landed piece and
// starts a new one; z undoes the last lock.
const ACTIONS = {
  ArrowUp: () => game.drop(),
  " ": () => game.lockPiece(),
  z: () => game.undo(),
  ArrowLeft: () => game.move(0, -1),
  ArrowRight: () => game.move(0, 1),
  ArrowDown: () => game.move(1, 0),
};

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save and reload. Everything plays as before. In the console:

```
typeof ACTIONS.z
ACTIONS.ArrowRight()
game.piece().map((c) => c.col)
```

`"function"`: the table holds a function. Calling `ACTIONS.ArrowRight()` yourself moves the piece, exactly as the key does (`[4, 5, 6, 5]`); it doesn't redraw, because that's the handler's job, so the screen catches up at the next key press. Adding a key is now one line in the table, and the handler never changes.

```check
page blockfall/index.html "[typeof ACTIONS, typeof ACTIONS.z, typeof ACTIONS.q, Object.keys(ACTIONS).length].join(' ')" "object function undefined 6" errors=none -- ACTIONS should map each of the six keys to a function.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); for (let i = 0; i < 2; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return game.piece().map((c) => c.row).join(',') + ' ' + game.piece().map((c) => c.col).join(','); })()" "2,2,2,3 2,3,4,3" errors=none -- The arrow keys should still move the piece, through the table.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); const locked = game.board()[18]; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return [locked, game.board()[18]].join(' '); })()" "825 769" errors=none -- Drop, lock and undo should work through the table.
```

## A table built in a loop

The three arrow keys are nearly the same line three times, differing only in the numbers. A tempting tidy-up: list each move's key and offsets in a table, `MOVES`, and build the three actions in a loop. **This version has a bug.** Make the change and find it from the evidence before reading on.

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
function isRowFull(board, row) {
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
// The piece and its squares are frozen: values that nobody can change.
function newPiece() {
  return Object.freeze([
    Object.freeze({ row: 0, col: 3 }),
    Object.freeze({ row: 0, col: 4 }),
    Object.freeze({ row: 0, col: 5 }),
    Object.freeze({ row: 1, col: 4 }),
  ]);
}

// Copy a piece into a board: set the bit of each square it covers.
function lock(board, cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(board, row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
// A pure function: it builds new squares and leaves the ones it's given alone,
// so asking "where would it go?" never moves anything. The new squares are
// frozen, like newPiece's.
function moved(cells, dRow, dCol) {
  return Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row + dRow, col: cell.col + dCol })));
}

// A piece is blocked when some one of its moved squares isn't free.
function isBlocked(board, cells, dRow, dCol) {
  return moved(cells, dRow, dCol).some((cell) => !isFree(board, cell.row, cell.col));
}

// Not blocked means every moved square is free.
function canMove(board, cells, dRow, dCol) {
  return !isBlocked(board, cells, dRow, dCol);
}

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(board, cells) {
  return cells.some((cell) => !isFree(board, cell.row + 1, cell.col));
}

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(board, cells) {
  let result = cells;
  while (canMove(board, result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
}

// The rules the game's state must always obey. Returns a list of the rules
// state s breaks, as sentences; an empty list means s is sound.
function invariantProblems(s) {
  const problems = [];
  if (s.board.length !== ROWS) {
    problems.push("the board has " + s.board.length + " rows, not " + ROWS);
  }
  for (let row = 0; row < s.board.length; row++) {
    const bits = s.board[row];
    if (!Number.isInteger(bits) || bits < 0 || bits > FULL) {
      problems.push("row " + row + " holds " + bits + ", not 0 to " + FULL);
    }
  }
  if (s.piece.length !== 4) {
    problems.push("the piece has " + s.piece.length + " squares, not 4");
  }
  for (const cell of s.piece) {
    const onBoard = cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS;
    if (!onBoard) {
      problems.push("square " + cell.row + "," + cell.col + " is off the board");
    } else if ((s.board[cell.row] & (1 << cell.col)) !== 0) {
      problems.push("square " + cell.row + "," + cell.col + " overlaps a filled square");
    }
  }
  return problems;
}

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #history;

  constructor() {
    this.#board = newBoard();
    this.#piece = newPiece();
    this.#history = [];
  }

  // A copy of the board, so that nobody outside can change the real one.
  board() {
    return this.#board.slice();
  }

  // The falling piece's squares.
  piece() {
    return this.#piece;
  }

  move(dRow, dCol) {
    if (canMove(this.#board, this.#piece, dRow, dCol)) {
      this.#piece = moved(this.#piece, dRow, dCol);
    }
    this.#check();
  }

  drop() {
    this.#piece = dropped(this.#board, this.#piece);
    this.#check();
  }

  // Lock a landed piece into the board and start a new one.
  lockPiece() {
    if (isLanded(this.#board, this.#piece)) {
      this.#history.push({ board: this.#board.slice(), piece: this.#piece });
      lock(this.#board, this.#piece);
      this.#piece = newPiece();
    }
    this.#check();
  }

  // Go back to before the last lock, if there was one.
  undo() {
    if (this.#history.length > 0) {
      const saved = this.#history.pop();
      this.#board = saved.board;
      this.#piece = saved.piece;
    }
    this.#check();
  }

  #check() {
    const problems = invariantProblems({ board: this.#board, piece: this.#piece });
    if (problems.length > 0) {
      console.error("Broken rules: " + problems.join("; "));
    }
  }
}

const game = new Game();

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  const board = game.board();
  const piece = game.piece();
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(board, row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(board, piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// What each key does: a function to call for it. Up drops the piece; Space
// locks a landed piece and starts a new one; z undoes the last lock.
const ACTIONS = {
  ArrowUp: () => game.drop(),
  " ": () => game.lockPiece(),
  z: () => game.undo(),
};

// The arrow keys move the piece, but only to where it fits: each key's name
// and the rows and columns it moves by.
const MOVES = [
  ["ArrowLeft", 0, -1],
  ["ArrowRight", 0, 1],
  ["ArrowDown", 1, 0],
];
for (var i = 0; i < MOVES.length; i++) {
  ACTIONS[MOVES[i][0]] = () => game.move(MOVES[i][1], MOVES[i][2]);
}

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

```predict
question: Save and reload, then press the left arrow. What happens?
choice: The piece moves left, as before
choice: The piece moves down instead
choice: Nothing moves, and an error appears in the console
answer: Nothing moves, and an error appears in the console
explain: Each arrow function refers to the variable i, and reads it when it's called, not when it's made. By the time you press a key, the loop has finished and i is 3, so the action reads MOVES[3], which doesn't exist: undefined. Reading [1] from undefined is a TypeError. Every arrow key does the same, since all three actions share one i.
```

Save and reload, and press each arrow key. Nothing moves, and the console shows, once per key press:

```
Uncaught TypeError: Cannot read properties of undefined (reading '1')
```

Read the evidence. `(reading '1')` is `MOVES[i][1]`, so `MOVES[i]` is `undefined`: `i` is past the end of `MOVES`. Ask the console what `i` is: type `i`, and it answers `3`. The loop finished long ago, but `i` still exists, and every action reads it now, not as it was when the action was made.

```check
page blockfall/index.html "(() => { const cells = []; for (let k = 0; k < 3; k++) cells.push(typeof ACTIONS[MOVES[k][0]]); return [MOVES.length, cells.join(',')].join(' '); })()" "3 function,function,function" errors=none -- MOVES should list the three arrow keys, and the loop should give each an action.
```

## What a closure captures

A function made inside other code can use the names around it: the arrow functions here use `i`, `MOVES` and `game`, none of which are their own parameters. A function together with the names it uses from around it is a **closure**. The key fact about a closure is that it captures *variables*, not values: it keeps a reference to the variable itself, and reads whatever the variable holds at the moment the function runs. That's what makes closures useful, and it's also this bug.

`var` declares one variable for the whole function it's in. At the top level of a classic script like `game.js`, it even becomes a global, which is why the console could show you `i`. So there's one `i`, all three actions captured that same one, and the loop left it at 3.

`let` (and `const`) are scoped to their block. In a `for (let i = …)` loop, JavaScript makes a fresh `i` for each turn of the loop, holding that turn's value. Each action captures its own `i`, and the third one's `i` stays 2 for ever. One word fixes it:

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
function isRowFull(board, row) {
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
// The piece and its squares are frozen: values that nobody can change.
function newPiece() {
  return Object.freeze([
    Object.freeze({ row: 0, col: 3 }),
    Object.freeze({ row: 0, col: 4 }),
    Object.freeze({ row: 0, col: 5 }),
    Object.freeze({ row: 1, col: 4 }),
  ]);
}

// Copy a piece into a board: set the bit of each square it covers.
function lock(board, cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(board, row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
// A pure function: it builds new squares and leaves the ones it's given alone,
// so asking "where would it go?" never moves anything. The new squares are
// frozen, like newPiece's.
function moved(cells, dRow, dCol) {
  return Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row + dRow, col: cell.col + dCol })));
}

// A piece is blocked when some one of its moved squares isn't free.
function isBlocked(board, cells, dRow, dCol) {
  return moved(cells, dRow, dCol).some((cell) => !isFree(board, cell.row, cell.col));
}

// Not blocked means every moved square is free.
function canMove(board, cells, dRow, dCol) {
  return !isBlocked(board, cells, dRow, dCol);
}

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(board, cells) {
  return cells.some((cell) => !isFree(board, cell.row + 1, cell.col));
}

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(board, cells) {
  let result = cells;
  while (canMove(board, result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
}

// The rules the game's state must always obey. Returns a list of the rules
// state s breaks, as sentences; an empty list means s is sound.
function invariantProblems(s) {
  const problems = [];
  if (s.board.length !== ROWS) {
    problems.push("the board has " + s.board.length + " rows, not " + ROWS);
  }
  for (let row = 0; row < s.board.length; row++) {
    const bits = s.board[row];
    if (!Number.isInteger(bits) || bits < 0 || bits > FULL) {
      problems.push("row " + row + " holds " + bits + ", not 0 to " + FULL);
    }
  }
  if (s.piece.length !== 4) {
    problems.push("the piece has " + s.piece.length + " squares, not 4");
  }
  for (const cell of s.piece) {
    const onBoard = cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS;
    if (!onBoard) {
      problems.push("square " + cell.row + "," + cell.col + " is off the board");
    } else if ((s.board[cell.row] & (1 << cell.col)) !== 0) {
      problems.push("square " + cell.row + "," + cell.col + " overlaps a filled square");
    }
  }
  return problems;
}

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #history;

  constructor() {
    this.#board = newBoard();
    this.#piece = newPiece();
    this.#history = [];
  }

  // A copy of the board, so that nobody outside can change the real one.
  board() {
    return this.#board.slice();
  }

  // The falling piece's squares.
  piece() {
    return this.#piece;
  }

  move(dRow, dCol) {
    if (canMove(this.#board, this.#piece, dRow, dCol)) {
      this.#piece = moved(this.#piece, dRow, dCol);
    }
    this.#check();
  }

  drop() {
    this.#piece = dropped(this.#board, this.#piece);
    this.#check();
  }

  // Lock a landed piece into the board and start a new one.
  lockPiece() {
    if (isLanded(this.#board, this.#piece)) {
      this.#history.push({ board: this.#board.slice(), piece: this.#piece });
      lock(this.#board, this.#piece);
      this.#piece = newPiece();
    }
    this.#check();
  }

  // Go back to before the last lock, if there was one.
  undo() {
    if (this.#history.length > 0) {
      const saved = this.#history.pop();
      this.#board = saved.board;
      this.#piece = saved.piece;
    }
    this.#check();
  }

  #check() {
    const problems = invariantProblems({ board: this.#board, piece: this.#piece });
    if (problems.length > 0) {
      console.error("Broken rules: " + problems.join("; "));
    }
  }
}

const game = new Game();

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  const board = game.board();
  const piece = game.piece();
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(board, row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(board, piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// What each key does: a function to call for it. Up drops the piece; Space
// locks a landed piece and starts a new one; z undoes the last lock.
const ACTIONS = {
  ArrowUp: () => game.drop(),
  " ": () => game.lockPiece(),
  z: () => game.undo(),
};

// The arrow keys move the piece, but only to where it fits: each key's name
// and the rows and columns it moves by.
const MOVES = [
  ["ArrowLeft", 0, -1],
  ["ArrowRight", 0, 1],
  ["ArrowDown", 1, 0],
];
for (let i = 0; i < MOVES.length; i++) {
  ACTIONS[MOVES[i][0]] = () => game.move(MOVES[i][1], MOVES[i][2]);
}

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save and reload: the arrow keys work, and `i` in the console is now `ReferenceError: i is not defined`, because each `i` belongs to its own turn of the loop. (A clearer version still is `for (const [key, dRow, dCol] of MOVES) { ACTIONS[key] = () => game.move(dRow, dCol); }`, which names each part of the row and has no index to get wrong.) This is why modern JavaScript code uses `let` and `const`, never `var`.

Python has the same trap, and no `let` to fix it. A Python `for` loop, or a comprehension, has one loop variable, and a closure captures that variable:

```
.venv/bin/python -c "fs = [lambda: i for i in range(3)]; print([f() for f in fs])"
```

Run it inside `kit`: `[2, 2, 2]`. Three functions, one `i`, and `i` ended at 2. The Python fix uses 01-05-01's rule that a default value is evaluated once, when the function is made: `lambda i=i: i` gives each function its own parameter `i`, whose default is the value `i` held at that moment. `[lambda i=i: i for i in range(3)]` gives `[0, 1, 2]`. The trap that was a bug in 01-05-01 is the tool here.

```check
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); for (let k = 0; k < 2; k++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return game.piece().map((c) => c.row).join(',') + ' ' + game.piece().map((c) => c.col).join(','); })()" "2,2,2,3 2,3,4,3" errors=none -- Each arrow key's action should capture its own i: use let in the loop.
page blockfall/index.html "typeof i" "undefined" -- With let, i belongs to the loop, not the whole script.
run "cd kit; .venv/Scripts/python -c \"fs = [lambda: i for i in range(3)]; gs = [lambda i=i: i for i in range(3)]; print([f() for f in fs], [g() for g in gs])\"" stdout="[2, 2, 2] [0, 1, 2]" -- Python closures capture the loop variable too; a default argument captures its value.
```

## Falling

A falling-block game needs the piece to fall by itself. The browser can call a function every so often: `setInterval(fn, ms)` calls `fn` every `ms` milliseconds, and returns a number, a timer id, which `clearInterval(id)` uses to stop it. Both are higher-order in the first sense: `setInterval` takes the function to call.

Wrap them in a function that starts the falling and *returns the way to stop it*:

- `startFalling(ms)` calls `setInterval` with an arrow function that moves the piece down a row and redraws.
- It returns another arrow function, `() => clearInterval(timer)`. That function is a closure over `timer`, a local name of `startFalling`. When `startFalling` returns, its frame is gone (01-05-02), but `timer` isn't: the closure still refers to it, so it lives as long as the closure does (01-05-01's lifetime, again).
- `let stopFalling = startFalling(FALL_MS);` starts the game falling and keeps the stopper. Whoever holds `stopFalling` can stop the game without knowing anything about timers.

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
function isRowFull(board, row) {
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
// The piece and its squares are frozen: values that nobody can change.
function newPiece() {
  return Object.freeze([
    Object.freeze({ row: 0, col: 3 }),
    Object.freeze({ row: 0, col: 4 }),
    Object.freeze({ row: 0, col: 5 }),
    Object.freeze({ row: 1, col: 4 }),
  ]);
}

// Copy a piece into a board: set the bit of each square it covers.
function lock(board, cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}

// Is the square at (row, col) on the board and empty?
function isFree(board, row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
// A pure function: it builds new squares and leaves the ones it's given alone,
// so asking "where would it go?" never moves anything. The new squares are
// frozen, like newPiece's.
function moved(cells, dRow, dCol) {
  return Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row + dRow, col: cell.col + dCol })));
}

// A piece is blocked when some one of its moved squares isn't free.
function isBlocked(board, cells, dRow, dCol) {
  return moved(cells, dRow, dCol).some((cell) => !isFree(board, cell.row, cell.col));
}

// Not blocked means every moved square is free.
function canMove(board, cells, dRow, dCol) {
  return !isBlocked(board, cells, dRow, dCol);
}

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(board, cells) {
  return cells.some((cell) => !isFree(board, cell.row + 1, cell.col));
}

// Where a piece would come to rest if it fell straight down: keep moving it
// down a row while it can. Pure: the piece it's given doesn't move.
function dropped(board, cells) {
  let result = cells;
  while (canMove(board, result, 1, 0)) {
    result = moved(result, 1, 0);
  }
  return result;
}

// The rules the game's state must always obey. Returns a list of the rules
// state s breaks, as sentences; an empty list means s is sound.
function invariantProblems(s) {
  const problems = [];
  if (s.board.length !== ROWS) {
    problems.push("the board has " + s.board.length + " rows, not " + ROWS);
  }
  for (let row = 0; row < s.board.length; row++) {
    const bits = s.board[row];
    if (!Number.isInteger(bits) || bits < 0 || bits > FULL) {
      problems.push("row " + row + " holds " + bits + ", not 0 to " + FULL);
    }
  }
  if (s.piece.length !== 4) {
    problems.push("the piece has " + s.piece.length + " squares, not 4");
  }
  for (const cell of s.piece) {
    const onBoard = cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS;
    if (!onBoard) {
      problems.push("square " + cell.row + "," + cell.col + " is off the board");
    } else if ((s.board[cell.row] & (1 << cell.col)) !== 0) {
      problems.push("square " + cell.row + "," + cell.col + " overlaps a filled square");
    }
  }
  return problems;
}

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #history;

  constructor() {
    this.#board = newBoard();
    this.#piece = newPiece();
    this.#history = [];
  }

  // A copy of the board, so that nobody outside can change the real one.
  board() {
    return this.#board.slice();
  }

  // The falling piece's squares.
  piece() {
    return this.#piece;
  }

  move(dRow, dCol) {
    if (canMove(this.#board, this.#piece, dRow, dCol)) {
      this.#piece = moved(this.#piece, dRow, dCol);
    }
    this.#check();
  }

  drop() {
    this.#piece = dropped(this.#board, this.#piece);
    this.#check();
  }

  // Lock a landed piece into the board and start a new one.
  lockPiece() {
    if (isLanded(this.#board, this.#piece)) {
      this.#history.push({ board: this.#board.slice(), piece: this.#piece });
      lock(this.#board, this.#piece);
      this.#piece = newPiece();
    }
    this.#check();
  }

  // Go back to before the last lock, if there was one.
  undo() {
    if (this.#history.length > 0) {
      const saved = this.#history.pop();
      this.#board = saved.board;
      this.#piece = saved.piece;
    }
    this.#check();
  }

  #check() {
    const problems = invariantProblems({ board: this.#board, piece: this.#piece });
    if (problems.length > 0) {
      console.error("Broken rules: " + problems.join("; "));
    }
  }
}

const game = new Game();

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  const board = game.board();
  const piece = game.piece();
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(board, row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(board, piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
}

// What each key does: a function to call for it. Up drops the piece; Space
// locks a landed piece and starts a new one; z undoes the last lock.
const ACTIONS = {
  ArrowUp: () => game.drop(),
  " ": () => game.lockPiece(),
  z: () => game.undo(),
};

// The arrow keys move the piece, but only to where it fits: each key's name
// and the rows and columns it moves by.
const MOVES = [
  ["ArrowLeft", 0, -1],
  ["ArrowRight", 0, 1],
  ["ArrowDown", 1, 0],
];
for (let i = 0; i < MOVES.length; i++) {
  ACTIONS[MOVES[i][0]] = () => game.move(MOVES[i][1], MOVES[i][2]);
}

// How often the piece falls one row, in milliseconds.
const FALL_MS = 800;

// Start the piece falling one row every ms milliseconds. Returns a function
// that stops it again.
function startFalling(ms) {
  const timer = setInterval(() => {
    game.move(1, 0);
    draw();
  }, ms);
  return () => clearInterval(timer);
}

let stopFalling = startFalling(FALL_MS);

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save and reload. The T falls a row every 0.8 seconds, stops on the floor and turns orange; Space locks it, and the next one starts falling at once. In the console, `stopFalling()` stops the fall, and the arrow keys still work.

```predict
question: You type stopFalling = startFalling(100) in the console, without calling stopFalling() first. What happens to the game's falling, and why?
choice: It falls faster, every 0.1 seconds instead of 0.8
choice: It falls every 0.1 seconds and every 0.8 seconds: two timers
choice: Nothing changes: one interval replaces the other
answer: It falls every 0.1 seconds and every 0.8 seconds: two timers
explain: startFalling(100) starts a second interval; nothing stopped the first. You rebound the name stopFalling to the new stopper, so the old stopper, the only function that could stop the first timer, is now unreachable. That timer runs until the page is reloaded. A closure that holds the only key to something should be kept, not overwritten.
```

```check
page blockfall/index.html "(async () => { await new Promise((r) => setTimeout(r, 1700)); return game.piece()[0].row >= 1 && game.piece()[0].row <= 3; })()" true errors=none -- The piece should fall by itself, about one row every 0.8 seconds.
page blockfall/index.html "(async () => { stopFalling(); const before = game.piece()[0].row; await new Promise((r) => setTimeout(r, 1700)); return [before, game.piece()[0].row].join(' '); })()" "0 0" -- stopFalling should stop the fall.
page blockfall/index.html "[typeof startFalling, typeof stopFalling, FALL_MS].join(' ')" "function function 800" -- startFalling should return a function that stops it.
```

**What else, and why not.** Ways to drive a game loop in a browser, and what each costs:

| Way | Cost |
|---|---|
| `setInterval(fn, ms)`, as here | Simple, and the right tool for "every 0.8 seconds"; not tied to the screen's refresh, so smooth animation would stutter |
| `requestAnimationFrame(fn)`: calls `fn` once, just before the next screen refresh, usually 60 times a second | Smooth, and pauses in a background tab; `fn` must call it again for the next frame and work out from the time how far to move. The usual choice for animation |
| `setTimeout(fn, ms)`, calling itself again at the end | Like `setInterval`, but each wait starts after the work is done, so slow work can't pile up calls |
| A Python loop with `time.sleep` | How a terminal program would do it; a browser page must never block like that, or it stops responding to keys |

## Your turn: pause

Add a pause key. Pressing `p` stops the piece falling, and pressing it again starts it falling again. While the game is paused, the other keys do nothing: no moving, dropping, locking or undoing. Pausing and carrying on any number of times must leave it falling at its normal rate: one row about every 0.8 seconds, no faster.

There's no file to compare with; the checks press keys and wait. Test it yourself too: pause, wait, press a few arrows, carry on.

```hints
nudge: You need to remember one fact between key presses: are we paused? And you already have the two things a pause needs: something that stops the falling, and something that starts it.
concept: A paused flag, outside the action (a let at the top level, so that it lives between presses). The p action calls stopFalling() when not paused, and when paused sets stopFalling = startFalling(FALL_MS), keeping the new stopper. Then it flips the flag. The handler must ignore every key but p while paused. Starting a new timer without stopping the old one is what makes a game fall faster after each pause.
shape: let paused = false; ACTIONS.p = () => { if (paused) { stopFalling = startFalling(FALL_MS); } else { stopFalling(); } paused = !paused; }; and in the handler: if (action === undefined || (paused && event.key !== "p")) { return; }
answer: Before the keydown handler:
~~~javascript
// While paused, the piece doesn't fall and only p does anything.
let paused = false;

// p pauses the game, and pressed again, carries on.
ACTIONS.p = () => {
  if (paused) {
    stopFalling = startFalling(FALL_MS);
  } else {
    stopFalling();
  }
  paused = !paused;
};
~~~
And in the handler:
~~~javascript
  const action = ACTIONS[event.key];
  if (action === undefined || (paused && event.key !== "p")) {
    return;
  }
~~~
ACTIONS is a const, but adding a property to it is fine: const fixes the name, not the object (01-04-01). The tempting slips: starting a timer on every press of p, so each pause and resume adds one more (the game falls twice as fast after one round, and keeps falling while "paused"); and forgetting to ignore the other keys, so a paused piece can still be moved and dropped. Another valid design keeps one timer running and has its function do nothing while paused: simpler, at the cost of a timer that runs for nothing.
```

```check
page blockfall/index.html "(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); const before = game.piece()[0].row; await new Promise((r) => setTimeout(r, 1700)); return [before, game.piece()[0].row].join(' '); })()" "0 0" errors=none -- While paused, the piece shouldn't fall.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); for (const key of ['ArrowLeft', 'ArrowUp', ' ', 'z']) document.dispatchEvent(new KeyboardEvent('keydown', { key })); return game.piece().map((c) => c.row).join(',') + ' ' + game.piece().map((c) => c.col).join(','); })()" "0,0,0,1 3,4,5,4" -- While paused, the other keys should do nothing.
page blockfall/index.html "(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); await new Promise((r) => setTimeout(r, 900)); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); const before = game.piece()[0].row; await new Promise((r) => setTimeout(r, 1700)); const fell = game.piece()[0].row - before; return fell >= 1 && fell <= 2; })()" true -- Pressing p again should start the piece falling again.
page blockfall/index.html "(async () => { for (let k = 0; k < 6; k++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); const before = game.piece()[0].row; await new Promise((r) => setTimeout(r, 1700)); const fell = game.piece()[0].row - before; return fell >= 1 && fell <= 2; })()" true -- Pausing and carrying on three times should leave the normal rate: no extra timers.
```

**What these checks establish, and what they don't.** They pause and wait, press keys while paused, carry on and count the rows fallen, and pause and carry on three times to catch extra timers. The timing checks allow a range, one or two rows in 1.7 seconds, because a timer's exact moment varies, so a game that fell a little too fast or too slow would pass. They don't look at the screen: there's no "paused" sign, and a player would want one (draw it in `draw()` when `paused` is true: `context.fillText("PAUSED", 100, 300)` after setting `context.fillStyle`). And they don't check the browser tab losing focus: try switching tabs while it's running.

## What you can do now

- Functions are **first-class** values: stored in variables and tables, passed, returned. A table of functions replaces a chain of `if`s that each say "for this, call that".
- A **higher-order function** takes or returns a function: `map`, `some`, `addEventListener`, `setInterval`, and `startFalling`, which returns its own stopper.
- A **closure** is a function with the names it uses from around it. It captures **variables, not values**, and keeps them alive after the code that made them has returned.
- In a loop, `var` (and Python's loop variable) is one variable shared by every closure; `let` makes one per turn. Python's fix is a default argument, evaluated when the function is made.
- A closure can be the only key to something, like a running timer: keep it, don't overwrite it.

```predict
question: A page has three buttons, and code that runs for (var n = 1; n <= 3; n++) { buttons[n - 1].onclick = () => alert("Button " + n); }. What does clicking the first button show, and what are two fixes?
explain: "Button 4": all three closures share the one var n, which the loop left at 4 (the value that ended it, not the last one used). Fix it with let n in the loop, which makes a fresh n for each button; or give each closure its own value by calling a function that takes n as a parameter, such as buttons.forEach((button, index) => { button.onclick = () => alert("Button " + (index + 1)); }), where each call's parameter is its own variable.
```

**Next:** 01-05-04 watches all of this happen. The browser's debugger can stop Blockfall in the middle of a frame, show the call stack and every frame's local names, including the variables a closure captured, and step through one tick of the game line by line.
