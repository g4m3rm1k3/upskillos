---
title: Invariants: Rules the State Must Keep
runtime: none
---

The last two lessons each planted a bug in Blockfall, and neither showed an error. In 01-04-02 the T ended up at column 10 and row 34, on squares that don't exist. In 01-04-03 the undone T sat on top of its own locked copy. Both times the game kept running, and the console stayed empty. Yet both times, the state broke a rule that every correct Blockfall obeys, and nobody had written down: the piece is on the board, and it never overlaps a filled square. Rules like these are **invariants**. This lesson writes Blockfall's down as code, checks them after every key, and then makes the game's state an object that only its own methods can change, so the rules have a few guarded doors to watch instead of every line in the file. That's **encapsulation**. It also separates two kinds of object that the game has been mixing: squares, which are just values, and the game itself, which is one thing that changes over time.

**By the end you can:**

- State a program's invariants as conditions on its state, and write a function that reports which are broken.
- Explain when an invariant must hold (between operations, not during them) and use a check to catch a broken one at the moment it breaks.
- Encapsulate state behind a few methods so that outside code can't break its invariants, and find the remaining holes.
- Tell a value object from an entity, and say how each should be compared and changed.

**You need:** 01-04-01 to 01-04-03, in particular the game-state object and undo from 01-04-03. Work in `blockfall`, with `index.html` open in a browser and the console open.

## Rules nobody wrote down

What must be true of Blockfall's state at every moment you could look at it? Go through its parts:

1. **The board** has exactly `ROWS` (20) rows.
2. **Each row** is a whole number from 0 to `FULL` (1023): ten bits, nothing else. A row of 5000 would have bits in columns that don't exist.
3. **The piece** has exactly 4 squares.
4. **Every square of the piece** is on the board: its row from 0 to 19, its column from 0 to 9.
5. **No square of the piece** overlaps a filled square of the board.

Each is an invariant: a condition on the state that the program promises is always true. Written as code, they become a function that looks at a state and lists the rules it breaks. An empty list means the state is sound.

- It takes the state as an argument, `s`, rather than reading the global `state`. That makes it pure (01-04-02): you can ask it about any state, including one you build in the console to see what it says.
- `Number.isInteger(x)` is `true` for whole numbers only: not for `1.5`, and not for something that isn't a number at all.
- Rule 5 is checked only for squares that are on the board, so that a square off the board doesn't read a row that doesn't exist.

Add it after `dropped`:

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

// The game as it was before each lock, most recent last, for undo.
const history = [];

// Arrow keys move the piece, but only to where it fits. Up drops it.
// Space locks a landed piece into the board and starts a new one.
// Z undoes the last lock, and pressed again, the one before.
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
      history.push({ board: state.board.slice(), piece: state.piece });
      lock(state.piece);
      state.piece = newPiece();
    }
    draw();
    return;
  }
  if (event.key === "z") {
    if (history.length > 0) {
      state = history.pop();
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

Save and reload. In the console, `invariantProblems(state)` answers `[]`: the starting state is sound. Now break a rule deliberately and ask again:

```
state.board[3] = 5000;
invariantProblems(state)
```

It answers `["row 3 holds 5000, not 0 to 1023"]`. You can ask about a state that doesn't exist yet, too: `invariantProblems({ board: newBoard(), piece: moved(newPiece(), 0, 6) })` lists three squares off the right edge. Reload to undo your change to row 3.

```check
page blockfall/index.html "JSON.stringify(invariantProblems(state))" "[]" errors=none -- The starting state should break no rules.
page blockfall/index.html "(() => { state.board[3] = 5000; return JSON.stringify(invariantProblems(state)); })()" "[\"row 3 holds 5000, not 0 to 1023\"]" -- A row above FULL should be reported.
page blockfall/index.html "JSON.stringify(invariantProblems({ board: newBoard(), piece: moved(newPiece(), 0, 6) }))" "[\"square 0,10 is off the board\",\"square 0,11 is off the board\",\"square 1,10 is off the board\"]" -- Squares off the board should be reported, each once.
page blockfall/index.html "JSON.stringify(invariantProblems({ board: newBoard(), piece: moved(newPiece(), 19, 0) }))" "[\"square 19,3 overlaps a filled square\",\"square 20,4 is off the board\"]" -- A square on a filled square should be reported, and one below the board as off it.
page blockfall/index.html "JSON.stringify(invariantProblems({ board: [0, 0], piece: newPiece() }))" "[\"the board has 2 rows, not 20\"]" -- A board of the wrong size should be reported.
```

## Checking after every change

A function that knows the rules is only useful if something asks it. The simplest place is after every key press, since every change to the game happens in response to one. Two changes to the bottom of the file:

- The handler's body becomes a named function, `handleKey(event)`, unchanged inside.
- The listener calls `handleKey`, then `invariantProblems(state)`, and reports any broken rule with `console.error`, which prints a red line in the console.

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

// The game as it was before each lock, most recent last, for undo.
const history = [];

// Arrow keys move the piece, but only to where it fits. Up drops it.
// Space locks a landed piece into the board and starts a new one.
// Z undoes the last lock, and pressed again, the one before.
function handleKey(event) {
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.piece = dropped(state.piece);
    draw();
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(state.piece)) {
      history.push({ board: state.board.slice(), piece: state.piece });
      lock(state.piece);
      state.piece = newPiece();
    }
    draw();
    return;
  }
  if (event.key === "z") {
    if (history.length > 0) {
      state = history.pop();
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
}

// After every key, check the rules, and report any that broke.
document.addEventListener("keydown", (event) => {
  handleKey(event);
  const problems = invariantProblems(state);
  if (problems.length > 0) {
    console.error("Broken rules: " + problems.join("; "));
  }
});

draw();
```

Save, reload, and play: move, drop, lock, undo. The console stays clear. Now re-plant 01-04-03's bug to see what the check does with it. Change the line in the Space case

```
      history.push({ board: state.board.slice(), piece: state.piece });
```

back to the shallow copy, `history.push({ ...state });`, save and reload. Then press Up, Space and `z`. Last lesson, this looked fine on screen. Now, the moment `z` is pressed, the console says:

```
Broken rules: square 18,3 overlaps a filled square; square 18,4 overlaps a filled square; square 18,5 overlaps a filled square; square 19,4 overlaps a filled square
```

That's the hidden locked T, reported at the key press that caused it, without anyone having to suspect undo, move the piece to the right edge, or ask the state questions. Put the line back to the copy that copies the board, and reload.

```predict
question: The check runs after each key, not during it. Inside the Space case, between lock(state.piece) and state.piece = newPiece(), is the state sound?
choice: Yes: lock and newPiece both keep the rules
choice: No: for that moment the piece overlaps the squares it was just locked into
answer: No: for that moment the piece overlaps the squares it was just locked into
explain: lock sets the piece's squares in the board, and until the next line replaces the piece, the piece sits on exactly those filled squares: rule 5 is broken. That's allowed. An invariant has to hold whenever the outside can look, between operations; in the middle of one, the state may pass through broken states, as long as the operation puts it right before it finishes. That's why the check goes after handleKey, not inside lock.
```

```check
page blockfall/index.html "(() => { const keys = ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', ' ', 'z', 'ArrowLeft', 'ArrowUp', ' ', 'ArrowUp', ' ', 'z', 'z', 'z']; for (const key of keys) document.dispatchEvent(new KeyboardEvent('keydown', { key })); return [state.board[18], state.board[19]].join(' '); })()" "769 975" errors=none -- Playing should break no rules, and undoing every lock should bring back the starting board.
page blockfall/index.html "(() => { state.board[0] = 2000; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return typeof handleKey; })()" "function" errors="row 0 holds 2000" -- After a key press, a broken rule should be reported in the console.
```

## Only the game changes the game

The check finds a broken rule after the fact. Better is to make most rule-breaking impossible. Right now any line in the file, or the console, can write `state.board[3] = 5000`. **Encapsulation** means putting the state where only a few functions can reach it, and giving everything else those functions to call. Then the rules only have to be kept in those few places.

JavaScript's tool for this is a **class**. New syntax, all in the next file:

- `class Game { … }` describes a kind of object. `new Game()` makes one, and runs its `constructor` to set it up.
- `#board;` declares a **private field**. Only code written inside the class's braces can read or write `this.#board`. Anywhere else, `game.#board` is not even valid code: a `SyntaxError`, before anything runs. (Some browsers' consoles let you peek at private fields, as a debugging aid. Code in the page never can.)
- A **method** is a function written inside the class, such as `move(dRow, dCol) { … }`, called as `game.move(0, 1)`. Inside it, `this` is the object it was called on, here `game`. `#check()` is a private method: only the class's own methods can call it.

Making the class means the helper functions can no longer reach into a global `state`, because there isn't one. So they take the board as an argument instead (`isFree(board, row, col)`, `canMove(board, cells, dRow, dCol)`, `lock(board, cells)`), which also makes the questions pure, the category 01-04-02's table left them out of. The `Game` class then holds the board, the piece and the undo history privately, and offers six methods: `board()` and `piece()` to look, and `move`, `drop`, `lockPiece` and `undo` to change. Each changing method ends with `this.#check()`. `board()` returns a *copy* (01-04-03), so that changing what it returns can't change the game. The key handler shrinks to choosing a method.

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
function newPiece() {
  return [
    { row: 0, col: 3 },
    { row: 0, col: 4 },
    { row: 0, col: 5 },
    { row: 1, col: 4 },
  ];
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
// so asking "where would it go?" never moves anything.
function moved(cells, dRow, dCol) {
  return cells.map((cell) => ({ row: cell.row + dRow, col: cell.col + dCol }));
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

// Arrow keys move the piece, but only to where it fits. Up drops it.
// Space locks a landed piece into the board and starts a new one.
// Z undoes the last lock, and pressed again, the one before.
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    game.drop();
  } else if (event.key === " ") {
    game.lockPiece();
  } else if (event.key === "z") {
    game.undo();
  } else if (event.key === "ArrowLeft") {
    game.move(0, -1);
  } else if (event.key === "ArrowRight") {
    game.move(0, 1);
  } else if (event.key === "ArrowDown") {
    game.move(1, 0);
  } else {
    return;
  }
  event.preventDefault();
  draw();
});

draw();
```

Save, reload and play: it plays as before. In the console, `state` is gone (`typeof state` is `"undefined"`), and `game` is a `Game`. Try to break a rule from outside:

```
const b = game.board();
b[19] = 0;
game.board()[19]
```

Still `975`: you changed a copy. And `JSON.stringify(game)` is `{}`: private fields aren't visible as properties at all.

But one hole is left. `piece()` returns the game's own piece array, not a copy, and its squares are ordinary objects. So this works:

```
game.piece()[0].row = 50;
```

Nothing stops it. Press Left, and the next check reports `Broken rules: square 50,3 is off the board`. Encapsulation protects only what doesn't escape: an object the class hands out can be changed by whoever receives it. You'll close this hole yourself. Reload to undo it.

```check
page blockfall/index.html "[typeof state, typeof Game, game instanceof Game, game.board()[18], game.board()[19], game.piece().map((c) => c.row).join(',')].join(' ')" "undefined function true 769 975 0,0,0,1" errors=none -- The state should live in a Game object, game, with no global state left.
page blockfall/index.html "(() => { for (let i = 0; i < 2; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return [game.board()[16], game.board()[18], game.board()[19], game.piece().map((c) => c.row).join(',')].join(' '); })()" "0 825 991 16,16,16,17" errors=none -- Drop, lock and undo should work through the game's methods.
page blockfall/index.html "(() => { for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return [game.board()[16], game.piece().map((c) => c.col).join(',')].join(' '); })()" "0 6,7,8,7" errors=none -- Undo should still restore the board.
page blockfall/index.html "(() => { const b = game.board(); b[19] = 0; return [game.board()[19], game.board() === game.board(), JSON.stringify(game)].join(' '); })()" "975 false {}" -- board() should hand out a copy, and the fields should be private.
```

**What else, and why not.**

| Way | Cost |
|---|---|
| Check the rules after every change, as `invariantProblems` does here | Catches breakage the moment it happens, whoever caused it. Costs a little time per change, and only reports: by then the state is already broken. Many projects run such checks only while developing |
| Private fields and a few methods, as `Game` does | Most breakage can't happen at all, and the rules only need keeping in the methods. Everything that reads the state must go through a method, and anything the class hands out must be a copy or unchangeable |
| A closure instead of a class: a function that keeps the state in local variables and returns the methods | The same privacy, older and common in JavaScript; 01-05-03 covers closures |
| Python's convention: a leading underscore, `self._board`, means "private, please" | Not enforced: anyone can still write `game._board`. Python relies on agreement and on tests; `__board` changes the name to discourage access but doesn't forbid it |
| Throw an error instead of printing one | Stops the program at the broken rule instead of carrying on. Better, usually, and module 1.10's subject |

## Values and things

Blockfall has two kinds of object, and they behave differently on purpose.

A square, `{ row: 1, col: 2 }`, is a **value object**: all that matters about it is its value. Two squares with the same row and column are interchangeable. It makes no difference which one a piece holds, and nothing should ever change one: to "move" a square you make a new one, as `moved` does. Compare value objects by value. In JavaScript that takes a function, because `===` on objects compares identity:

```
const a = { row: 1, col: 2 };
const b = { row: 1, col: 2 };
a === b
a.row === b.row && a.col === b.col
```

`false`, then `true`. `invariantProblems` compares squares by their rows and columns, never with `===`, for this reason. (In Python, a tuple `(1, 2)` is a ready-made value object: immutable, and `==` compares values.)

The game is an **entity**: it's *one* game, and stays the same game while its state changes completely. Its identity matters and its value doesn't. Two games with the same board at the same moment are still two different games, and `game === game` is the right comparison. Entities change; they're the reason for encapsulation, because something has to guard how they change.

The usual design is many value objects, which are freely shared, copied and compared, and few entities, which are carefully guarded. Blockfall has that now, except that its value objects can still be changed. That's the hole from the last step.

```check
page blockfall/index.html "(() => { const a = { row: 1, col: 2 }; const b = { row: 1, col: 2 }; return [a === b, a.row === b.row && a.col === b.col, game === game].join(' '); })()" "false true true" -- === compares objects by identity; value objects need comparing by value.
```

## Your turn: squares nobody can change

Close the hole: make every piece the game holds, and every square in it, unchangeable, so that `game.piece()[0].row = 50` has no effect and `game.piece().push(…)` fails. Use `Object.freeze(obj)`, which 01-04-02 introduced: it returns the same object, frozen. Remember what 01-04-02 found about it: in a classic script like `game.js`, writing a property of a frozen object is silently ignored, and freezing is shallow.

Decide where the freezing has to happen. Pieces come from more than one place: follow where `#piece` gets its values. There's no file to compare with; the checks play the game and inspect the piece.

```hints
nudge: List every line that assigns this.#piece, and follow each back to the function that made the array. How many functions make pieces?
concept: Two functions make pieces: newPiece and moved (dropped makes its result with moved, and undo restores a piece that one of them made). Each must freeze both the array and every square in it, because freezing is shallow: a frozen array of ordinary squares still lets you change a square's row. Freezing in only newPiece leaves every piece after the first move unprotected.
shape: In newPiece: return Object.freeze([Object.freeze({ row: 0, col: 3 }), …]). In moved: return Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row + dRow, col: cell.col + dCol }))).
answer: newPiece:
~~~javascript
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
~~~
moved:
~~~javascript
function moved(cells, dRow, dCol) {
  return Object.freeze(cells.map((cell) => Object.freeze({ row: cell.row + dRow, col: cell.col + dCol })));
}
~~~
Two tempting slips: freezing only the arrays, which stops push but not game.piece()[0].row = 50 (the check then reports square 50,3 off the board); and freezing only in newPiece, which protects the first piece until its first move. With moved freezing its result, dropped and undo need nothing: everything they hand back was made by moved or newPiece. Note the difference you'll see in the console: push on a frozen array throws a TypeError even in a classic script, while assigning a frozen property is silently ignored. A "use strict"; line at the top of game.js would make both throw.
```

```check
page blockfall/index.html "(() => { const frozen = () => Object.isFrozen(game.piece()) && game.piece().every((c) => Object.isFrozen(c)); const results = [frozen()]; for (const key of ['ArrowDown', 'ArrowLeft', 'ArrowUp', ' ', 'z']) { document.dispatchEvent(new KeyboardEvent('keydown', { key })); results.push(frozen()); } return results.join(' '); })()" "true true true true true true" errors=none -- The piece and its squares should be frozen at the start and after every move, drop, lock and undo.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); game.piece()[0].row = 50; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return game.piece()[0].row; })()" 0 errors=none -- Changing a square from outside should have no effect, so no rule breaks.
page blockfall/index.html "(() => { try { game.piece().push({ row: 5, col: 5 }); return 'pushed'; } catch (e) { return e.constructor.name; } })()" "TypeError" -- Adding a square to the piece from outside should fail.
page blockfall/index.html "(() => { for (let i = 0; i < 2; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } return [game.board()[16], game.board()[17], game.board()[18], game.board()[19]].join(' '); })()" "56 16 825 991" errors=none -- The game should still play the same.
```

**What these checks establish, and what they don't.** They check that the piece and its squares are frozen after one of each kind of change, that writing a square from outside has no effect, that adding a square fails, and that the game still drops and locks. They don't prove there's no other hole. Here's a way to look for one: list every value a `Game` method returns, and ask whether changing it could change the game. And the invariant check itself is only as good as its rules. It has no rule that the piece is a T, or that its squares are connected, so a bug that turned the T into four scattered squares would pass it. Think of one more rule the game should keep, and add it to `invariantProblems`.

## What you can do now

- An **invariant** is a condition on the state that always holds when the outside can look: between operations, not necessarily during them.
- Writing the invariants as a function that lists broken rules turns silent corruption into a report at the moment it happens; it caught 01-04-03's bug at the key press.
- **Encapsulation** puts state behind a few methods (a `class` with `#private` fields), so the rules need keeping only there. It protects only what doesn't escape: hand out copies or unchangeable objects.
- A **value object** (a square) is defined by its value: compare it by value, never change it, share it freely. An **entity** (the game) is defined by its identity and changes over time: guard it.
- Pure helpers that take what they need as arguments (`isFree(board, row, col)`) are what made the class possible.

```predict
question: A bank account object has a private balance and two methods, deposit(amount) and withdraw(amount). The invariant is "the balance is never negative". Where must the rule be checked, what about deposit(-50), and what does the class's history() method need to return so that the rule stays safe?
explain: Every method that changes the balance must keep it: withdraw must refuse an amount larger than the balance, and deposit must refuse a negative amount, because deposit(-50) is a withdrawal that skipped withdraw's check. And history() must return a copy of its list of transactions (or unchangeable values): if it hands out its own list, anyone can edit the past. An invariant is kept by every door into the state, including the ones that look harmless.
```

**Next:** 01-04-05 reads code nobody explained. You get a short program you didn't write, in a language you know, and find its entry point, follow its data, and expand its densest lines until the logic is visible: the skill every lesson so far has been building towards.
