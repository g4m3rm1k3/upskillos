---
title: Tracing with a Debugger
runtime: none
---

You've traced programs by hand all through this course: trace tables in 01-04-05, frames drawn as indentation in 01-05-02. A **debugger** does the tracing for you, on the real program, as it runs. It can stop the program at any line, show you every frame on the call stack and every name in each one, including the variables a closure captured, and then run it one line at a time while you watch the values change. Your browser has one built in. This lesson adds a feature to Blockfall with a bug in it, a bug that reading the code doesn't make obvious, and finds it by stopping the game in the middle of drawing one frame and stepping through the function that's wrong. Then it shows the debugger's other ways in, and when a plain `console.log` is the better tool.

**By the end you can:**

- Stop a running program at a chosen line, with a `debugger;` statement or a breakpoint, and say what the program's state is at that moment.
- Read the Call Stack and Scope panes: which frames exist, and what each frame's local, closure and script names hold.
- Step over, into and out of calls, and use a watch expression to follow a value through a loop.
- Choose between a breakpoint, a conditional breakpoint, a logpoint, "pause on exceptions" and `console.log` for a given question.

**You need:** 01-05-01 to 01-05-03 (calls, frames, closures, Blockfall's falling piece). Work in `blockfall`, with `index.html` open in Chrome, Edge or Firefox. Other browsers have debuggers too, with different names for the same things.

## A ghost one row too deep

Many falling-block games show a **ghost**: an outline of where the falling piece will land, so you can aim. Blockfall can draw one with what it already has. `moved(piece, n, 0)` is the piece moved `n` rows down; all that's needed is `n`, how far the piece can fall.

`dropped` already finds where the piece lands, but it builds a new array of squares for every row on the way down. A new function returns just the number: start at 0, and count up while the move still fits. `draw` uses it to place the ghost, and draws each ghost square as an outline: `context.strokeStyle` is the colour of lines, as `fillStyle` is of fills, and `context.strokeRect(x, y, width, height)` draws a rectangle's outline. The ghost is drawn before the piece, so that the piece covers it once it lands.

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

// How many rows a piece could fall from where it is: the furthest move
// straight down that still fits. Just a number, for drawing the ghost.
function fallDistance(board, cells) {
  let rows = 0;
  while (canMove(board, cells, rows, 0)) {
    rows = rows + 1;
  }
  return rows;
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
  // The ghost: an outline of where the piece will land.
  const ghost = moved(piece, fallDistance(board, piece), 0);
  context.strokeStyle = "#ccc";
  for (const cell of ghost) {
    context.strokeRect(cell.col * SIZE + 1, cell.row * SIZE + 1, SIZE - 3, SIZE - 3);
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

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined || (paused && event.key !== "p")) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save and reload. Watch the ghost as the T falls. It isn't where the T lands. The outline sits one row lower, drawn over the grey squares of the floor, with its stem below the bottom of the board, out of sight. When the T lands, the ghost is still a row below it. No error appears in the console.

```check
page blockfall/index.html "(() => { stopFalling(); return typeof fallDistance(game.board(), game.piece()); })()" "number" errors=none -- fallDistance should return how many rows the piece can fall.
```

## Stopping inside the program

Reading `fallDistance` once, it looks right: count up while the move fits. When a short function looks right and behaves wrong, stop it while it runs and look. Add one line at the start of `fallDistance`: `debugger;` is a statement that pauses the program at that point, whenever the browser's developer tools are open. (With the tools closed, it does nothing.)

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

// How many rows a piece could fall from where it is: the furthest move
// straight down that still fits. Just a number, for drawing the ghost.
function fallDistance(board, cells) {
  debugger;
  let rows = 0;
  while (canMove(board, cells, rows, 0)) {
    rows = rows + 1;
  }
  return rows;
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
  // The ghost: an outline of where the piece will land.
  const ghost = moved(piece, fallDistance(board, piece), 0);
  context.strokeStyle = "#ccc";
  for (const cell of ghost) {
    context.strokeRect(cell.col * SIZE + 1, cell.row * SIZE + 1, SIZE - 3, SIZE - 3);
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

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined || (paused && event.key !== "p")) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save it. Open the developer tools first (F12), then reload the page. The page stops before it has even drawn anything, because the script's last line calls `draw()`, which calls `fallDistance`. The tools switch to Chrome's **Sources** panel (Firefox: **Debugger**), with the `debugger;` line highlighted. The program is frozen at that line: no timer fires and no key does anything until you let it go on.

Before you look at the panes on the right, predict.

```predict
question: The program is paused at the debugger; line in fallDistance, during the first draw at page load. Which frames are on the call stack, from the top?
choice: fallDistance only
choice: fallDistance, then draw, then the script itself
choice: fallDistance, then the setInterval timer, then startFalling
answer: fallDistance, then draw, then the script itself
explain: The last line of game.js calls draw(), and draw calls fallDistance to place the ghost. So there are three frames: fallDistance on top, draw below it, and the script's own top level at the bottom (Chrome lists it as "(anonymous)"). The timer hasn't fired yet, since the page has only just loaded; when it does, a later pause will show its arrow function instead of the script.
```

Now look at the **Call Stack** pane. It lists `fallDistance`, then `draw`, then the script, as a traceback does but newest first. Click `draw` in the list: the editor jumps to the line in `draw` that is waiting for `fallDistance` to return, and the Scope pane changes to `draw`'s names. Click `fallDistance` again to go back.

The **Scope** pane (Firefox: Scopes) shows the names visible in the selected frame, grouped by where they live, the grouping from 01-04-03 and 01-05-01:

- **Local:** `fallDistance`'s own names: `board`, `cells`, and `rows`. Hover over `cells` in the editor or expand it in the pane: four squares with rows 0, 0, 0, 1.
- **Script:** the `let` and `const` names at the top of `game.js`: `game`, `ACTIONS`, `stopFalling`, `paused`, `FALL_MS`, and the rest. They aren't on `window`, but every function in the file can see them.
- **Global:** `window`, with everything the browser provides (and the functions `game.js` declared with `function`).

Click Resume (the ▶ button, or F8). The page draws, and the T starts to fall. Within 0.8 seconds the timer calls `draw` again, and the debugger stops again on the same line. This time the Call Stack shows `fallDistance`, `draw`, and the arrow function inside `startFalling`. In Scope, select that arrow function's frame, and look under **Closure**: there's `timer`, a local name of `startFalling`, which returned long ago, still alive because the closure needs it (01-05-03). The debugger shows you what a closure captured.

```check
contains blockfall/game.js "debugger;" -- fallDistance should start with a debugger; statement.
page blockfall/index.html "(() => { stopFalling(); return fallDistance(game.board(), game.piece()); })()" 19 errors=none -- With the tools closed, debugger; does nothing: fallDistance still runs (and still gives the wrong answer).
```

## Stepping through the loop

Now find the bug. You're paused at `debugger;` with the T at the top. You want to see what the loop does, one turn at a time. Two tools:

- A **watch expression** is an expression the debugger re-evaluates after every step. In the **Watch** pane, click **+** and type `canMove(board, cells, rows, 0)`. Add a second one: `rows`.
- **Step over** (F10, or the arrow curving over a dot) runs the current line, including any function it calls, and stops at the next line in this function. **Step into** (F11) stops inside the function the line calls instead; **step out** (Shift+F11) runs the rest of the current function and stops in its caller.

Step over a few times. The highlight moves to `let rows = 0;`, then into the loop, and `rows` goes 0, 1, 2… while the watched `canMove` stays `true`. Stepping eighteen times round the loop by hand is slow, though, so use a conditional breakpoint for the last turns. Right-click the line number of `rows = rows + 1;` and choose **Add conditional breakpoint** (Firefox: **Add condition**), and type `rows >= 17`. Press Resume: the debugger runs the loop at full speed and stops only when `rows` is 17.

```predict
question: You're stopped at rows = rows + 1 with rows at 17, and the watched canMove(board, cells, rows, 0) says true. Step over until the loop ends. What will rows be when fallDistance returns, and how far does the T really fall?
choice: 18, and the T falls 18 rows
choice: 19, but the T falls only 18 rows
choice: 18, but the T falls 19 rows
answer: 19, but the T falls only 18 rows
explain: At 17 the move fits, so rows becomes 18. canMove(…, 18, 0) is true too, since the T fits 18 rows down, where it lands, so rows becomes 19. canMove(…, 19, 0) is false, because the stem would be at row 20, off the board, and the loop ends with rows at 19. The loop stops at the first distance that doesn't fit, and returns that one. The answer it should give is the last distance that does: 18.
```

Step over until `return rows;` and read `rows`: `19`. And the watch says `canMove(board, cells, rows, 0)` is `false`. The function returns a distance at which the piece *doesn't* fit. That's the bug: an **off-by-one error**, the loop ending one step past what it should report.

The fix is to ask the loop's question about the *next* row: keep going while `rows + 1` still fits. Then the loop ends with `rows` at the last distance that fits. Remove the `debugger;` line too; a forgotten one would stop every reader of your code who has the tools open.

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

// How many rows a piece could fall from where it is: the furthest move
// straight down that still fits. Just a number, for drawing the ghost.
function fallDistance(board, cells) {
  let rows = 0;
  while (canMove(board, cells, rows + 1, 0)) {
    rows = rows + 1;
  }
  return rows;
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
  // The ghost: an outline of where the piece will land.
  const ghost = moved(piece, fallDistance(board, piece), 0);
  context.strokeStyle = "#ccc";
  for (const cell of ghost) {
    context.strokeRect(cell.col * SIZE + 1, cell.row * SIZE + 1, SIZE - 3, SIZE - 3);
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

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined || (paused && event.key !== "p")) {
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save and reload, with the tools open or not. The ghost sits exactly where the T lands, and once the T lands, the T covers it. Remove the conditional breakpoint as well (right-click it, or untick it in the **Breakpoints** pane): breakpoints you set in the tools persist across reloads, though not in the file.

```check
page blockfall/index.html "(() => { stopFalling(); return [fallDistance(game.board(), game.piece()), dropped(game.board(), game.piece())[0].row].join(' '); })()" "18 18" errors=none -- fallDistance should give the last distance that fits: the T falls 18 rows, to row 18.
page blockfall/index.html "(() => { stopFalling(); const b = game.board(); let differ = 0; for (let dRow = 0; dRow < 19; dRow++) for (let dCol = -3; dCol <= 4; dCol++) { const p = moved(game.piece(), dRow, dCol); if (!canMove(b, p, 0, 0)) continue; if (moved(p, fallDistance(b, p), 0)[0].row !== dropped(b, p)[0].row) differ++; } return differ; })()" 0 -- From every position the T can be in, the ghost should be where dropped says the piece lands.
page blockfall/index.html "(() => { stopFalling(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); return fallDistance(game.board(), game.piece()); })()" 0 -- A landed piece can fall no further.
lacks blockfall/game.js "debugger;" -- Remove the debugger; statement once the bug is found.
```

## Other ways in

A breakpoint answers "what is everything, here, now?". Other questions have better tools:

| Tool | Use it when | Cost |
|---|---|---|
| A **breakpoint** (click a line number) or `debugger;` | You know roughly where, and want to see everything there | Stops every time the line runs: in code that runs 60 times a second, that's constantly |
| A **conditional breakpoint** | The line runs often, and only one case is interesting (`rows >= 17`, `cell.col > 9`) | You have to guess the condition |
| A **logpoint** (right-click a line number, **Add logpoint**; Firefox: **Add log**) | You want a value printed every time, without editing the file | Only what you thought to print; the program doesn't stop |
| **Pause on exceptions** (a checkbox in the Breakpoints pane) | Something throws and you want to stop at the line that threw, with all its names | Also stops at errors that the code catches on purpose, unless you choose "uncaught" only |
| `console.log(…)` in the code | You want a record over time, such as every value of `rows` in one tick, or the program is timing-sensitive and stopping it changes what happens | You edit the file, and must remember to take it out; it shows only what you chose |
| A test, or a check like this lesson's | You want the question asked again after every change (module 1.9) | You must know the right answer in advance |

"Pause on exceptions" would have found 01-05-03's `var` bug in one step: tick it, press an arrow key, and the debugger stops on the line that read `MOVES[i][1]`, with `i: 3` right there in the Scope pane under Script.

One caution about stopping: while the program is paused, time still passes. A game, an animation or a network request that depends on timing can behave differently when you step through it than when it runs. If a bug disappears under the debugger, log instead.

## Your turn: count the pieces

Blockfall should show how many pieces are locked in the board: "Pieces: 2" in the top-left corner. A first attempt adds a private field and a method to `Game`, and counts in `lockPiece`. Put it in, as below, and use the debugger to find out why its count is wrong. Then fix it.

The first attempt, in the `Game` class: a field `#locked;` beside the others, `this.#locked = 0;` at the end of the constructor, a method

```
  // How many pieces have been locked.
  pieceCount() {
    return this.#locked;
  }
```

and, as the first line of `lockPiece`, `this.#locked = this.#locked + 1;`. In `draw`, after the background is filled, the text: `context.fillStyle = "#eee";` and `context.fillText("Pieces: " + game.pieceCount(), 8, 16);`.

The count must be the number of pieces locked in the board right now: pressing Space while the piece is in the air locks nothing and must not count, and `z` takes a piece back out of the board, so it must take one off the count.

There's no file to compare with; the checks press keys and ask `game.pieceCount()`. Use the debugger for the diagnosis, not just the fix: put a breakpoint in `lockPiece`, press Space while the T is in the air, and step.

```hints
nudge: Pause in lockPiece when you press Space in mid-air, and step over its lines. Which lines run, and which don't? Then think about what undo does to the board, and whether anything tells the count.
concept: The count is increased on every call of lockPiece, before the "is it landed?" test, so a Space in mid-air counts a piece that was never locked. Moving the increase inside the if fixes that, but undo still never decreases it. Better than keeping a second count in step with the board: the history already has exactly one entry for every lock that's still in the board, because lockPiece pushes one and undo pops one.
shape: Remove #locked and its lines; pieceCount() { return this.#history.length; }. Keep the fillText line in draw.
answer: In the Game class, instead of the #locked field and its three lines:
~~~javascript
  // How many pieces are locked in the board: one for each lock that undo
  // could take back.
  pieceCount() {
    return this.#history.length;
  }
~~~
In draw, after the background:
~~~javascript
  context.fillStyle = "#eee";
  context.fillText("Pieces: " + game.pieceCount(), 8, 16);
~~~
Stepping through lockPiece with the piece in the air shows the count line run and the if's body skipped. The half fix, counting inside the if, passes the mid-air check and fails after an undo: two locks and one z leave it at 2 instead of 1. Deriving the count from the history means there's nothing to keep in step: a count kept separately from what it counts is a second copy of the truth, and copies drift (01-05-01). Counting the filled squares and dividing by 4 would also work today, but not once module 1.9 clears full rows.
```

```check
page blockfall/index.html "(() => { stopFalling(); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return game.pieceCount(); })()" 0 errors=none -- Space in mid-air locks nothing, so it shouldn't count.
page blockfall/index.html "(() => { stopFalling(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return game.pieceCount(); })()" 1 errors=none -- Dropping and locking a piece should count it.
page blockfall/index.html "(() => { stopFalling(); for (let k = 0; k < 2; k++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); } document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return game.pieceCount(); })()" 1 errors=none -- Undo takes a piece out of the board, so it should take one off the count.
page blockfall/index.html "(() => { stopFalling(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); return game.pieceCount(); })()" 0 -- z with nothing to undo shouldn't change the count.
```

**What these checks establish, and what they don't.** They press Space in mid-air, lock one and two pieces, undo, and undo with nothing to undo, reading `game.pieceCount()` after each. They don't check the text on the screen, so look: "Pieces: 0" at the start, going up as you lock and down as you undo. And nothing here can check that you used the debugger: the lesson's evidence for that is yours. You can test it yourself: start from the first attempt again, and see whether you can say, without reading the hints, which line of `lockPiece` ran when it shouldn't have.

## What you can do now

- A **debugger** stops a running program (`debugger;`, or a breakpoint on a line) and shows its state: the **call stack**, newest frame first, and each frame's names by scope (Local, Closure, Script, Global).
- **Step over** runs a line and stops at the next; **step into** follows a call; **step out** finishes the current function. A **watch expression** is re-evaluated at every step.
- A **conditional breakpoint** stops only when a condition holds; a **logpoint** prints without stopping; **pause on exceptions** stops at the line that threw.
- An **off-by-one** loop stops one step late or early. Ask what value the loop variable holds when the loop ends, and whether that's the answer or one past it.
- Stopping changes timing. When a bug depends on time, log instead of stepping.

```predict
question: A function is meant to return the index of the first negative number in a list, or -1 if there's none. On [3, 5, -2, 8] it returns 3, not 2. You set a breakpoint on its return line. Which two values would you watch, and what do you expect to see?
explain: Watch the index variable and the list item at that index, say i and items[i]. If the loop increments i before testing, or tests after moving on, you'll see i = 3 and items[i] = 8 at the return: the loop went one past the item it found. That's the same off-by-one as fallDistance: the loop's variable holds the position after the answer when the loop ends. Stepping one turn at a time from i = 1 would show the exact moment it skips past the -2.
```

**Next:** module 1.6 leaves the program for the tools around it, starting with the shell. 01-06-01 is about finding your way around a computer from a terminal: paths, the folders a command runs in, permissions, and reading a command's own help.
