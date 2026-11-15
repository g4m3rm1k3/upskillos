---
title: "Test First: Red, Green, Refactor, and Blockfall's First Tests"
runtime: none
---

Blockfall has no tests. It's a game: it draws on a canvas, listens for keys and runs on a timer. "Does it work?" has meant "open it and play". That doesn't scale. Every change means playing again, a rule that breaks only in a rare position goes unseen, and nobody remembers to try line clearing after changing rotation. And Blockfall can't even be tested yet, as the first step shows: loading its code starts a game. This lesson separates the rules from the screen, so the rules can be tested without one. Then it adds the feature every falling-block game needs, clearing full rows, **test first**: write a test that fails, write the code that makes it pass, then improve the code while the test keeps it honest. That's **red, green, refactor**. It ends with the kinds of test there are, and how a test can stand in so much for the real code that it stops testing anything.

**By the end you can:**

- Separate pure logic from input, output and time, so that the logic can be tested on its own (a **boundary**).
- Build a minimal test runner, and say what `pytest` was doing for you.
- Work in red-green-refactor: a failing test first, the least code that passes, then a cleanup under the tests' protection.
- Tell unit, integration and end-to-end tests apart, and recognise over-mocking.

**You need:** 01-02-03 to 01-07-01 (Blockfall's code), 01-09-01 to 01-09-03 (what makes a test good), 01-08-01 (Blockfall's repository). Work inside `blockfall`. Open a page from disk with `start PAGE` on Windows, `open PAGE` on macOS or `xdg-open PAGE` on Linux, and reload it after each change.

## A test page that starts a game

The obvious first try at testing Blockfall is a page that loads `game.js` and calls its functions. Make one:

```html file=blockfall/tests.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Blockfall tests</title>
</head>
<body>
  <h1>Blockfall tests</h1>
  <script src="game.js"></script>
</body>
</html>
```

Save it and open `tests.html`, then its developer console (01-02-03). The console shows:

```
Uncaught TypeError: Cannot read properties of null (reading 'getContext')
```

Read the evidence. `game.js` runs from top to bottom as it loads. It makes a `Game`, then looks for the canvas (`document.getElementById("board")`), which this page doesn't have, and stops there. On `index.html` it would carry on, start the timer and listen for keys. Loading `game.js` *is* starting a game. Its rules (`canMove`, `isRowFull`, `dropped`) are mixed into the same file as its screen, its keyboard and its clock, and they can't be loaded without them.

The fix is a **boundary**: a line between code that only computes (given a board and a piece, it returns answers) and code that deals with the outside world (the canvas, the keys, the timer). The computing side is easy to test, because a test can call it, give it inputs and look at the result. The other side is thin, and tested by playing, or by tests that drive a real page. The rest of this lesson builds that boundary.

```check
file blockfall/tests.html -- Create tests.html.
```

## The rules, in a file of their own

Everything in `game.js` above `class Game` is pure. Its constants, the board and the piece functions, and `invariantProblems` take values and return values, and touch nothing else. Move them, unchanged, into a new file `rules.js`, with a comment saying what belongs there:

```js file=blockfall/rules.js
// Blockfall's rules: the board, the pieces and what may happen to them.
// Nothing here draws, listens for keys or keeps time, so a test page can
// load this file and try the rules without a game starting.

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
```

Save it. Nothing loads `rules.js` yet, so the game still works exactly as before (`index.html` loads only `game.js`, which still has its own copies of all this). The next step removes those copies.

```check
contains blockfall/rules.js "function dropped(board, cells)" -- rules.js should hold the board and piece functions from game.js.
contains blockfall/rules.js "function invariantProblems(s)" -- rules.js should hold invariantProblems too.
page blockfall/index.html "typeof game === 'object'" true errors=none -- The game should still run: index.html doesn't load rules.js yet.
```

## The game keeps the screen

Now `game.js` keeps only the game on the screen: `class Game`, drawing, the keys and the timer. Replace it with:

```js file=blockfall/game.js
// The game on the screen: one Game, drawn on the canvas, driven by the
// keyboard and a timer. The rules it follows are in rules.js, loaded first.

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

  // How many pieces are locked in the board: one for each lock that undo
  // could take back.
  pieceCount() {
    return this.#history.length;
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
  context.fillStyle = "#eee";
  context.fillText("Pieces: " + game.pieceCount(), 8, 16);
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
const FALL_MS = 500; // milliseconds between steps down

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

// With Shift or Caps Lock, a letter key's event.key is the capital letter
// (MDN: the B key gives "B" with Shift). The letters do the same either way.
ACTIONS.Z = ACTIONS.z;
ACTIONS.P = ACTIONS.p;

// Keys that do something once per press. Held down, a key repeats its
// keydown event, with event.repeat set to true (MDN, KeyboardEvent.repeat);
// moving should repeat, but locking, undoing and pausing shouldn't.
const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P"]);

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined || (paused && action !== ACTIONS.p)) {
    return;
  }
  if (event.repeat && ONCE_PER_PRESS.has(event.key)) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  action();
  draw();
});

draw();
```

Save it, but don't play yet: `index.html` still loads only `game.js`, which now uses `newBoard`, `canMove` and the rest without defining them. Reload `index.html` and the console says `Uncaught ReferenceError: newBoard is not defined`. That's expected until the next step.

```check
lacks blockfall/game.js "function newBoard()" -- game.js should no longer define the rules: they're in rules.js.
contains blockfall/game.js "class Game" -- game.js should keep the Game class, drawing and the keys.
```

## The page loads both

Classic scripts share one global scope, in the order the page loads them (01-02-03), so `index.html` must load `rules.js` first:

```html file=blockfall/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Blockfall</title>
  <style>
    body { background: #222; color: #eee; font-family: sans-serif; }
    canvas { border: 2px solid #888; }
  </style>
</head>
<body>
  <h1>Blockfall</h1>
  <canvas id="board" width="300" height="600"></canvas>
  <script src="rules.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

Save it and reload `index.html`. The game is exactly as it was: Up drops the T, Space locks it, and rows 18 and 19 hold 825 and 991, as in 01-04-02. Moving code without changing what it does is a **refactoring**. This one was checked by playing, and by the check below, which presses the keys on the real page. That check is the kind of test the next section names: end to end.

```check
matches blockfall/index.html "rules\.js[\s\S]*game\.js" -- index.html should load rules.js before game.js.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return [game.board()[18], game.board()[19], game.pieceCount()]; })()" [825,991,1] errors=none -- The game should play as before: Up then Space locks the T, giving rows 825 and 991.
```

## A test runner of your own

`pytest` found tests, ran each one, caught failures and counted them. Blockfall runs in a browser with no Node and no install, so write the smallest runner that does those four things. It's about 30 lines, and writing it shows what a test runner is. Replace `tests.html`:

```html file=blockfall/tests.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Blockfall tests</title>
  <style>
    body { background: #222; color: #eee; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Blockfall tests</h1>
  <pre id="results"></pre>
  <script>
    // A tiny test runner. test() records a test; runTests() runs every test,
    // catching each one's failure, and counts the results.
    const TESTS = [];

    function test(name, fn) {
      TESTS.push({ name: name, fn: fn });
    }

    // Compare as JSON text, so that arrays and objects compare by contents.
    function assertEqual(actual, expected) {
      const got = JSON.stringify(actual);
      const want = JSON.stringify(expected);
      if (got !== want) {
        throw new Error("expected " + want + ", got " + got);
      }
    }

    function runTests() {
      const results = { passed: 0, failed: 0, failures: [] };
      for (const t of TESTS) {
        try {
          t.fn();
          results.passed += 1;
        } catch (error) {
          results.failed += 1;
          results.failures.push(t.name + ": " + error.message);
        }
      }
      return results;
    }
  </script>
  <script src="rules.js"></script>
  <script src="tests.js"></script>
  <script>
    // Run the tests now that both files are loaded, and show the results.
    window.testResults = runTests();
    const report = testResults.failures.map((failure) => "FAIL " + failure);
    report.push(testResults.passed + " passed, " + testResults.failed + " failed");
    document.getElementById("results").textContent = report.join("\n");
  </script>
</body>
</html>
```

Three scripts, in order. The first is the runner. `test(name, fn)` only *records* a test, the way `pytest` collects them first. `assertEqual` compares as JSON text, so that two arrays with the same contents count as equal (`===` would compare identity, 01-04-01), and throws an `Error` saying what was expected if they differ. `runTests` runs every recorded test inside `try`/`catch`, so one failure can't stop the rest. Then come `rules.js` and `tests.js`, which hold the tests. The last script runs them, shows a report on the page, and keeps the results in `window.testResults`, where the checks (and you, in the console) can read them.

`tests.js` doesn't exist yet, so the page reports `0 passed, 0 failed`. A runner with no tests reports success, which is one more reason to look at the counts.

```check
page blockfall/tests.html "typeof runTests === 'function' && typeof isRowFull === 'function'" true -- tests.html should define the runner and load rules.js, without starting a game.
```

## The first tests

Start with rules that already exist, so you can see the runner work:

```js file=blockfall/tests.js
// Blockfall's tests. Each runs a rule from rules.js on a small board or
// piece, and compares the answer with one worked out by hand.

test("a row of ten filled squares is full", () => {
  const board = newBoard();
  board[5] = 0b1111111111;
  assertEqual(isRowFull(board, 5), true);
});

test("the starting board's bottom row is not full", () => {
  assertEqual(isRowFull(newBoard(), 19), false);
});

test("moved makes new squares and leaves the old ones alone", () => {
  const piece = newPiece();
  const down = moved(piece, 1, 0);
  assertEqual(down[0], { row: 1, col: 3 });
  assertEqual(piece[0], { row: 0, col: 3 });
});
```

Each test builds a small input (`newBoard()`, with one row changed), calls one rule, and compares the answer with one worked out by hand. 1023 bits all set is full; the starting bottom row, 975, isn't. Save it and reload `tests.html`:

```
3 passed, 0 failed
```

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [3,0] errors=none -- tests.html should run the three tests in tests.js, all passing.
```

## Red: a test for code that doesn't exist

Now the new feature. When a row fills up, it should disappear, and the rows above it should move down. Before writing any of it, write down what it must do, as tests. Add these to the end of `tests.js`:

```js edit=blockfall/tests.js mode=append
// Clearing full rows. These were written before clearFullRows existed.
test("with no full rows, nothing is cleared", () => {
  assertEqual(clearFullRows(newBoard()), { board: newBoard(), cleared: 0 });
});

test("a full bottom row goes, and an empty row comes in at the top", () => {
  const board = newBoard();
  board[19] = FULL;
  const expected = [0].concat(board.slice(0, 19));
  assertEqual(clearFullRows(board), { board: expected, cleared: 1 });
});

test("two full rows go, and the row between them moves down", () => {
  const board = newBoard();
  board[17] = FULL;
  board[19] = FULL;
  const expected = [0, 0].concat(board.slice(0, 17), [board[18]]);
  assertEqual(clearFullRows(board), { board: expected, cleared: 2 });
});

test("a full top row goes too", () => {
  const board = newBoard();
  board[0] = FULL;
  assertEqual(clearFullRows(board), { board: newBoard(), cleared: 1 });
});

test("the board it's given isn't changed", () => {
  const board = newBoard();
  board[19] = FULL;
  const before = board.slice();
  clearFullRows(board);
  assertEqual(board, before);
});
```

They describe a function that doesn't exist yet. `clearFullRows(board)` returns a new board and how many rows were cleared. Each test pins down one behaviour, edge cases included: no full rows, one at the bottom, two apart with a row between them, one at the very top, and that the board passed in stays as it was (a pure function, 01-04-02). The expected boards are built from the definition: drop the full rows, put empty ones on top. `[0].concat(board.slice(0, 19))` is "an empty row, then rows 0 to 18", which is what's left above the cleared row 19, moved down.

Save and reload `tests.html`:

```
FAIL with no full rows, nothing is cleared: clearFullRows is not defined
FAIL a full bottom row goes, and an empty row comes in at the top: clearFullRows is not defined
FAIL two full rows go, and the row between them moves down: clearFullRows is not defined
FAIL a full top row goes too: clearFullRows is not defined
FAIL the board it's given isn't changed: clearFullRows is not defined
3 passed, 5 failed
```

This is **red**: the tests fail, for the reason you expect. Red is worth seeing, not skipping. A new test that passes before the code exists is testing nothing (01-09-01's tautology), and seeing it fail first proves it *can* fail. Writing the tests first also forces the questions to be answered before the code: what does it return, what happens at the top row, may it change its input?

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [3,5] -- The five new tests should fail: clearFullRows doesn't exist yet (red).
contains blockfall/tests.js "clearFullRows(board)" -- tests.js should describe clearFullRows.
```

## Green: just enough code

Now write the least code that makes the tests pass. Add this to the end of `rules.js`, where the rules live:

```js edit=blockfall/rules.js mode=append
// Take every full row out of the board, and put as many empty rows in at
// the top, so that the rows above a cleared one move down. Returns the new
// board and how many rows were cleared. The board it's given isn't changed.
function clearFullRows(board) {
  const kept = [];
  for (let row = 0; row < board.length; row++) {
    if (board[row] !== FULL) {
      kept.push(board[row]);
    }
  }
  const cleared = board.length - kept.length;
  return { board: new Array(cleared).fill(0).concat(kept), cleared: cleared };
}
```

It keeps every row that isn't full, in order, then puts `cleared` empty rows in front: `new Array(cleared).fill(0)` is that many zeros, and `concat` joins the two lists into a new array. The board passed in is only read. Save and reload `tests.html`:

```
8 passed, 0 failed
```

This is **green**. The tests say `clearFullRows` does what they describe, and nothing more. They don't say the game clears rows yet: `Game.lockPiece` doesn't call it. That's part of your task.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [8,0] errors=none -- With clearFullRows written, all eight tests should pass (green).
```

## Refactor: improve it while the tests watch

Green code is correct, as far as the tests can tell, but not necessarily good. Look at it again: `board[row] !== FULL` repeats what "full" means, and `isRowFull(board, row)` already says it, in one place. If "full" ever changed (say, the board got wider), the two would have to change together, and one would be forgotten. In `clearFullRows`, change the condition to:

```
    if (!isRowFull(board, row)) {
```

Save and reload `tests.html`: still `8 passed, 0 failed`. That's the **refactor** step: change the structure without changing the behaviour, and let the tests confirm it. Without them, every tidy-up is a risk. With them, a mistake shows up the moment you reload. The cycle repeats for each new behaviour: red (a failing test), green (just enough code), refactor (clean up, still green).

```check
contains blockfall/rules.js "if (!isRowFull(board, row)) {" -- clearFullRows should use isRowFull, not repeat what full means.
lacks blockfall/rules.js "board[row] !== FULL" -- The repeated test for a full row should be gone.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [8,0] errors=none -- The refactored version should still pass all eight tests.
```

## Kinds of test, and stand-ins

The tests in `tests.js` call one function at a time, on values made for the test. They're **unit tests**: fast, exact about which rule broke, and blind to how the pieces fit together. A test of `Game` with the real rules underneath, `lockPiece` really calling `clearFullRows`, would be an **integration test**: it checks that the parts work *together*. The check that pressed Up and Space on `index.html` and read the board is an **end-to-end test**. It goes through the real page, keys and all, like a player, and it's the slowest, and the vaguest about *where* a failure is. A healthy project has many unit tests, fewer integration tests, and a few end-to-end tests over the paths that matter most. Module 8.6 goes further.

To test one part alone, tests sometimes replace the parts it uses with **stand-ins** (also called fakes, stubs or **mocks**). That's useful for a part that's slow, random or outside your control, such as a clock, a network or a payment service. It's easy to overdo. Add this test to the end of `tests.js`:

```js edit=blockfall/tests.js mode=append
// A test with a stand-in: isRowFull is replaced by a fake that calls only
// row 19 full, so this test doesn't depend on the real isRowFull at all.
test("clears the row that isRowFull calls full (with a stand-in)", () => {
  const real = isRowFull;
  isRowFull = (board, row) => row === 19;
  try {
    assertEqual(clearFullRows(newBoard()).cleared, 1);
  } finally {
    isRowFull = real;
  }
});
```

Reload: `9 passed, 0 failed`. Now break the real rule. In `rules.js`, change `isRowFull`'s line to `return board[row] !== 0;`, which calls any row with a square in it full, and reload:

```
FAIL the starting board's bottom row is not full: expected false, got true
FAIL with no full rows, nothing is cleared: expected {"board":[0,0,…,769,975],"cleared":0}, got {"board":[0,0,…,0,0],"cleared":2}
…
4 passed, 5 failed
```

The tests that use the real `isRowFull` fail, and say how. The stand-in test passes, with the game's notion of "full" broken. It tests that `clearFullRows` agrees with a fake, and the fake can't be wrong. That's **over-mocking**: replacing so much of the real code that the test no longer touches what users run. It's common, because a test full of stand-ins is easy to write and always green. Use stand-ins only for what you can't use for real, and keep at least one test where the real parts meet.

Put `isRowFull` back (`return board[row] === FULL;`), delete the stand-in test from `tests.js`, reload (`8 passed, 0 failed`), and commit, in `blockfall`:

```
git add rules.js game.js index.html tests.html tests.js
git commit -m "Move the rules into rules.js, with tests, and add clearFullRows"
```

**What else, and why not.**

| Way to test Blockfall | Cost |
|---|---|
| Play it after every change | Nothing to write; slow, never the same twice, and rare positions go unseen |
| Node with a test runner (`node --test`) | Real tooling; needs Node installed and the rules as modules (Blockfall stays browser-only for now) |
| A small runner in a test page (this lesson) | No install; you maintain the runner, and its reporting is plain |
| Only end-to-end checks on the real page | Close to what players do; slow, and a failure doesn't say which rule |
| Unit tests with stand-ins for everything | Fast and always green; they stop testing the real code (over-mocking) |

```check
contains blockfall/rules.js "return board[row] === FULL;" -- Put isRowFull back.
lacks blockfall/tests.js "with a stand-in" -- Delete the stand-in test.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [8,0] errors=none -- The eight real tests should pass.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); n = subprocess.run(['git', 'cat-file', '-e', 'HEAD:rules.js']).returncode; print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, n == 0)\"" stdout="clean True" -- Commit the new files in blockfall.
```

## Your turn: rotation, test first

Add rotation to Blockfall, test first, and finish the line clearing:

1. **Red.** In `tests.js`, write tests for `rotated(cells)`, which turns a piece a quarter turn **clockwise** about its second square (the T's middle), and returns new squares without changing the ones it's given. Work out the expected squares for the starting T by hand. Reload and see them fail.
2. **Green.** Write `rotated` in `rules.js`. Reload: all pass.
3. **Into the game.** In `game.js`, give `Game` a `rotate()` method that turns the piece only if every turned square is free (`isFree`), and make `x` (and `X`) rotate, once per press. Make `lockPiece` clear full rows with `clearFullRows` after locking.
4. Play it: drop a T so its stem fills a gap, and see a full row disappear. Then commit.

```hints
nudge: On the screen, rows count down and columns count right. A clockwise quarter turn sends the square to the middle's left (0 rows, -1 column away) to just above it (-1 rows, 0 columns), the one above to the right, and so on.
concept: For each square, take its offset from the middle: dr = row - middle.row, dc = col - middle.col. Clockwise, the new offset is (dc, -dr): new row = middle.row + dc, new col = middle.col - dr. For the starting T, (0,3), (0,4), (0,5), (1,4) with middle (0,4), that's (-1,4), (0,4), (1,4), (0,3). Row -1 is above the board, so rotating at the very top is refused by rotate(); press Down first. Good tests: that exact answer, four turns bring a piece back, and the input isn't changed.
shape: function rotated(cells) { const middle = cells[1]; return Object.freeze(cells.map((cell) => Object.freeze({ row: middle.row + (cell.col - middle.col), col: middle.col - (cell.row - middle.row) }))); }. In Game: rotate() { const turned = rotated(this.#piece); if (turned.every((cell) => isFree(this.#board, cell.row, cell.col))) this.#piece = turned; this.#check(); }. In lockPiece, after lock(...): this.#board = clearFullRows(this.#board).board;. ACTIONS gets x: () => game.rotate(), then ACTIONS.X = ACTIONS.x; ONCE_PER_PRESS gets "x" and "X".
answer: Append to tests.js:
~~~js
// Rotation. These were written before rotated existed.
test("a T turns a quarter clockwise about its middle square", () => {
  const expected = [
    { row: -1, col: 4 },
    { row: 0, col: 4 },
    { row: 1, col: 4 },
    { row: 0, col: 3 },
  ];
  assertEqual(rotated(newPiece()), expected);
});

test("four quarter turns bring a piece back where it was", () => {
  const piece = moved(newPiece(), 5, 2);
  assertEqual(rotated(rotated(rotated(rotated(piece)))), piece);
});

test("rotated leaves the piece it's given alone", () => {
  const piece = newPiece();
  rotated(piece);
  assertEqual(piece, newPiece());
});
~~~
Reload: 8 passed, 3 failed (rotated is not defined). Append to rules.js:
~~~js
// The piece turned a quarter turn clockwise about its second square (the
// T's middle). A square dRow below and dCol right of the middle ends up dCol
// below and dRow left of it. Pure, and frozen like moved's squares.
function rotated(cells) {
  const middle = cells[1];
  return Object.freeze(
    cells.map((cell) =>
      Object.freeze({
        row: middle.row + (cell.col - middle.col),
        col: middle.col - (cell.row - middle.row),
      }),
    ),
  );
}
~~~
Reload: 11 passed. In game.js, add rotate() after drop(), as in the shape rung; in lockPiece, the line this.#board = clearFullRows(this.#board).board; between lock(...) and this.#piece = newPiece(); add x: () => game.rotate(), to ACTIONS, ACTIONS.X = ACTIONS.x; after ACTIONS.P, and "x", "X" to ONCE_PER_PRESS. To see a row clear: Down, x, Up, Space puts a T's stem in columns 4's gap; then Down, x, x, x, Right, Up, Space fills column 5, and row 19 disappears. Commit in blockfall. The tempting slip is testing only "four turns bring it back": a counter-clockwise rotated passes that, and so does one that returns the piece unchanged. Only the hand-worked answer pins the direction.
```

```check
page blockfall/tests.html "[testResults.failed, testResults.passed >= 11]" [0,true] errors=none -- All the tests should pass, with your rotation tests added (at least 11).
page blockfall/tests.html "(() => { const real = rotated; rotated = (cells) => cells; const r = runTests(); rotated = real; return r.failed > 0; })()" true -- Your tests should fail if rotated returned the piece unchanged.
page blockfall/tests.html "(() => { const real = rotated; rotated = (cells) => { const m = cells[1]; return cells.map((c) => ({ row: m.row - (c.col - m.col), col: m.col + (c.row - m.row) })); }; const r = runTests(); rotated = real; return r.failed > 0; })()" true -- Your tests should fail if rotated turned the piece counter-clockwise.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return game.piece().map((cell) => [cell.row, cell.col]); })()" [[0,4],[1,4],[2,4],[1,3]] errors=none -- In the game, x should turn the T clockwise.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); return game.piece().map((cell) => [cell.row, cell.col]); })()" [[0,3],[0,4],[0,5],[1,4]] errors=none -- At the very top, a turn that would go off the board should be refused.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'x', 'x', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.board().slice(15), game.pieceCount()]; })()" [[0,0,0,48,889],2] errors=none -- Two Ts that fill row 19 should clear it: lockPiece should call clearFullRows.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Commit your rotation in blockfall.
```

**What these checks establish, and what they don't.** They check the boundary (the rules load on a page with no canvas, and the game still plays), the red, green and refactor states of `clearFullRows`, that your rotation tests fail on two wrong rotations, and, end to end, that `x` turns the T, refuses a turn off the top, and that filling row 19 clears it. They can't tell whether you really wrote the tests first. The red step is something only you see. They don't test rotation for shapes other than the T (Blockfall has only the T), or rotation against the walls and floor, beyond the top edge. And the end-to-end check follows one path through the game. A game has more paths than any test suite, so the unit tests carry most of the weight, and a check that would fail for the wrong code is still the measure of every test.

## What you can do now

- A **boundary** separates pure rules from the screen, the keys and the clock. Pure code can be loaded and tested alone; the rest stays thin.
- A **test runner** collects tests, runs each inside `try`/`catch`, compares (`assertEqual` by contents), and reports counts. `pytest` does this, and more.
- **Red, green, refactor:** a failing test first (and see it fail), the least code that passes, then a cleanup the tests confirm.
- **Unit** tests check one part on made-up inputs; **integration** tests check parts together; **end-to-end** tests drive the real program as a user would.
- **Stand-ins** (mocks) replace parts a test can't use for real. **Over-mocking** replaces so much that the test no longer touches the real code, and stays green when it's broken.

```predict
question: An assistant adds a "hold piece" feature to Blockfall, and its 15 new tests replace Game, the board and the keyboard with stand-ins. All pass. What would you check before trusting the feature?
explain: Which real code the tests run: if Game, the board and the keys are all stand-ins, the tests check that the hold code calls the fakes in the expected order, not that holding works. Break the real feature (make hold do nothing) and see whether any test fails. Ask for unit tests of the hold rule as a pure function on real boards and pieces, and one end-to-end test on index.html that presses the hold key and reads game.piece(). The stand-ins earn their place only where the real thing can't be used, and here everything can.
```

**Next:** module 1.10 is about errors and debugging: errors that help the person who meets them, debugging as an experiment rather than guesswork, and the tools for failures that won't reproduce. It starts with Kit's error messages, including the `LookupError` for an unknown encoding that 01-01-01 left for later.
