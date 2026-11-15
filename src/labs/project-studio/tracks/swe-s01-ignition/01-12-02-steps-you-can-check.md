---
title: "Steps You Can Check: Building a Feature Slice by Slice"
runtime: none
---

`PLAN.md` says what the hold piece must do, in six criteria, and how to get there, in two slices. Now it gets built, and the way it's built matters as much as the code. Each slice gets its tests first where it can, then just enough code. Then it's checked against the plan's criteria, not against a feeling of being finished, and committed on its own, so there's a point to come back to. Between slices, you stop and review. Along the way you'll hear the most expensive sentence in software, "it's done, all the tests pass", at a moment when it's true and the work isn't finished. This lesson is about telling those apart, every time.

**By the end you can:**

- Work through a plan one slice at a time, each slice one task, one diff, one commit.
- Run the test-first loop on a slice, and know which parts tests can reach and which need an end-to-end check.
- Review a slice against its acceptance criteria before starting the next.
- Answer a "done" claim by asking for the evidence, criterion by criterion.

**You need:** 01-12-01 (`PLAN.md`), 01-09-04 (red-green-refactor, `tests.html`), 01-08-03 (going back to a commit). Work inside `blockfall`.

## Slice 1, test first

Slice 1 in `PLAN.md`: "A second shape: the I, and pieces alternating." Criterion 1 says what that means: "Pieces alternate: the first is a T, the second an I, then T, I, and so on." The part of it that's pure rules (what an I looks like, which shape comes after which) can be tested on `tests.html`, so write those tests first. Add them to the end of `tests.js`:

```js edit=blockfall/tests.js mode=append
// Slice 1 of PLAN.md: a second shape, and pieces taking turns.
test("an I is four squares in a row at the top", () => {
  const expected = [
    { row: 0, col: 3 },
    { row: 0, col: 4 },
    { row: 0, col: 5 },
    { row: 0, col: 6 },
  ];
  assertEqual(newPiece("I"), expected);
});

test("a new piece with no shape named is still a T", () => {
  assertEqual(newPiece(), newPiece("T"));
});

test("pieces take turns: after a T an I, after an I a T", () => {
  assertEqual([nextShape("T"), nextShape("I")], ["I", "T"]);
});
```

Three tests, each one rule: the shape of an I, that `newPiece()` with no name still makes a T (so nothing that calls it today changes), and the order. Save and reload `tests.html`:

```
FAIL an I is four squares in a row at the top: expected [{"row":0,"col":3},…,{"row":0,"col":6}], got [{"row":0,"col":3},…,{"row":1,"col":4}]
FAIL pieces take turns: after a T an I, after an I a T: nextShape is not defined
14 passed, 2 failed
```

Red, for the right reasons. `newPiece("I")` ignores its argument and makes a T, and `nextShape` doesn't exist. The middle test passes already, which is fine. It guards behaviour that must *not* change.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [14,2] -- The two new rules should fail before they're written (red).
```

## Green: the rules

Now the least code that passes. In `rules.js`, `newPiece` becomes a lookup in a table of shapes, and `nextShape` gives the order. Replace `rules.js`:

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

// The shapes a piece can have: the squares each covers when it's new, at the
// top of the board, as [row, column]. The second square is the one a piece
// turns about (rotated).
const SHAPES = {
  T: [[0, 3], [0, 4], [0, 5], [1, 4]],
  I: [[0, 3], [0, 4], [0, 5], [0, 6]],
};

// A new piece of the shape named (a T if none is), at the top of the board.
// The piece and its squares are frozen: values that nobody can change.
function newPiece(shape = "T") {
  return Object.freeze(SHAPES[shape].map(([row, col]) => Object.freeze({ row: row, col: col })));
}

// Pieces come in turn: after a T an I, after an I a T (PLAN.md: no randomness).
function nextShape(shape) {
  return shape === "T" ? "I" : "T";
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

// Take every full row out of the board, and put as many empty rows in at
// the top, so that the rows above a cleared one move down. Returns the new
// board and how many rows were cleared. The board it's given isn't changed.
function clearFullRows(board) {
  const kept = [];
  for (let row = 0; row < board.length; row++) {
    if (!isRowFull(board, row)) {
      kept.push(board[row]);
    }
  }
  const cleared = board.length - kept.length;
  return { board: new Array(cleared).fill(0).concat(kept), cleared: cleared };
}

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
```

`SHAPES` lists each shape's squares as `[row, column]` pairs, and `newPiece` turns them into frozen squares, as before. `shape = "T"` is a **default parameter** (01-05-01): `newPiece()` still means a T. The second square of each shape is the one `rotated` turns about, so the I turns about its second square, and nothing in `rotated` changes. Save and reload `tests.html`: `16 passed, 0 failed`.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [16,0] errors=none -- With SHAPES, newPiece(shape) and nextShape, all 16 tests pass (green).
```

## All the tests pass. Is it done?

Every test is green. A collaborator at this point would very reasonably say "slice 1 is done, all tests pass." Check that against the criterion instead of the tests. Open `index.html`, press Up and Space to lock the first piece, and look at the next one, or ask in the console:

```
game.piece().map((cell) => [cell.row, cell.col])
```

```
[[0,3],[0,4],[0,5],[1,4]]
```

Another T. The game never asks for anything else: `Game` still calls `newPiece()` with no shape. The tests are right, and they test the rules, which are done. The *slice* says what a player sees, and a player sees no I at all. "All tests pass" is evidence about what the tests test (01-09-01), and a "done" claim is a claim about the acceptance criteria. Ask for the evidence that matches the claim: for each criterion, show it passing. Here, criterion 1 would fail.

```predict
question: Why didn't any test catch that the game still deals only Ts?
choice: The tests are wrong
choice: The tests only load rules.js, and the game's choice of shape is in game.js
choice: The I piece is broken
answer: The tests only load rules.js, and the game's choice of shape is in game.js
explain: 01-09-04's boundary: tests.html tests the pure rules, and Game, with its keys and timer, lives in game.js, which only an end-to-end check reaches. Unit tests passing says the parts work. Whether the parts are wired together is a different question, answered by an integration or end-to-end check against the criterion.
```

```check
page blockfall/index.html "(() => { for (const key of ['ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return game.piece().map((cell) => [cell.row, cell.col]); })()" [[0,3],[0,4],[0,5],[1,4]] -- With only the rules done, the game still deals a T second: the slice isn't finished.
```

## The game takes turns

Finish the slice in `game.js`. `Game` keeps the shape of its falling piece, starts with a T, and deals `nextShape` of it after each lock. Replace `game.js`:

```js file=blockfall/game.js
// The game on the screen: one Game, drawn on the canvas, driven by the
// keyboard and a timer. The rules it follows are in rules.js, loaded first.

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #shape;
  #history;
  #cleared;

  constructor() {
    this.#board = newBoard();
    this.#shape = "T";
    this.#piece = newPiece(this.#shape);
    this.#history = [];
    this.#cleared = 0;
  }

  // A copy of the board, so that nobody outside can change the real one.
  board() {
    return this.#board.slice();
  }

  // The falling piece's squares.
  piece() {
    return this.#piece;
  }

  // The falling piece's shape: "T" or "I".
  shape() {
    return this.#shape;
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

  // Turn the piece a quarter clockwise, if it fits where it would go.
  rotate() {
    const turned = rotated(this.#piece);
    if (turned.every((cell) => isFree(this.#board, cell.row, cell.col))) {
      this.#piece = turned;
    }
    this.#check();
  }

  // Lock a landed piece into the board and start a new one.
  lockPiece() {
    if (isLanded(this.#board, this.#piece)) {
      this.#history.push({ board: this.#board.slice(), piece: this.#piece });
      lock(this.#board, this.#piece);
      const result = clearFullRows(this.#board);
      this.#board = result.board;
      this.#cleared += result.cleared;
      this.#shape = nextShape(this.#shape);
      this.#piece = newPiece(this.#shape);
    }
    this.#check();
  }

  // How many pieces are locked in the board: one for each lock that undo
  // could take back.
  pieceCount() {
    return this.#history.length;
  }

  // How many full rows have been cleared since the game began.
  clearedCount() {
    return this.#cleared;
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
  context.fillText("Rows: " + game.clearedCount(), 8, 32);
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
  x: () => game.rotate(),
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
ACTIONS.X = ACTIONS.x;

// Keys that do something once per press. Held down, a key repeats its
// keydown event, with event.repeat set to true (MDN, KeyboardEvent.repeat);
// moving should repeat, but locking, undoing and pausing shouldn't.
const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P", "x", "X"]);

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

Three changes: a `#shape` field, `newPiece(this.#shape)` in the constructor and in `lockPiece` (after `this.#shape = nextShape(this.#shape)`), and a `shape()` method so the falling piece's shape can be read from outside. Save and reload `index.html`. Lock the first T, and an I comes in: four squares at the top, in row 0. Lock that, and a T comes. Press Down twice and `x` with an I falling, and it stands upright, turned about its second square. Now criterion 1 passes, end to end. Reload `tests.html` too: still `16 passed`.

Commit the slice, on its own:

```
git add rules.js game.js tests.js
git commit -m "Add the I piece; pieces take turns, T then I"
```

This is a **checkpoint commit**: the game works, the tests pass, and slice 1's criterion holds. If slice 2 goes wrong, `git reset --hard HEAD` (01-08-03) brings you back here, and nothing that was working is lost.

```check
page blockfall/index.html "(() => { for (const key of ['ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.shape() === 'I', game.piece().map((cell) => [cell.row, cell.col])]; })()" [true,[[0,3],[0,4],[0,5],[0,6]]] errors=none -- Criterion 1: the second piece is an I, new at the top.
page blockfall/index.html "(() => { for (const key of ['ArrowUp', ' ', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.shape() === 'T', game.pieceCount()]; })()" [true,2] errors=none -- Criterion 1: the third piece is a T again.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [16,0] errors=none -- Criterion 6: every test still passes.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout; print(sorted(git('show', '--name-only', '--format=', 'HEAD').split()), git('status', '--porcelain').strip() == '')\"" stdout="['game.js', 'rules.js', 'tests.js'] True" -- Commit slice 1 on its own: rules.js, game.js and tests.js, nothing else.
```

## Review the slice before the next

Before starting slice 2, review slice 1 as if someone else had written it, which is exactly what you'd do with an agent's work. Look at the whole change at once:

```
git show --stat HEAD
git show HEAD
```

Go down 01-08-02's checklist against the diff. No test was weakened or deleted: three were added. No signature changed in a way that breaks callers: `newPiece()` with no argument behaves as before. No new dependency, no generated files, no secrets. Nothing unrelated: the undo bug from 01-12-01 is still untouched, as planned. Then go down the plan. Criterion 1 holds, criterion 6 holds, and the other criteria belong to slice 2. Only then start the next slice.

This **review loop** (a small slice, a check against the criteria, a review of the diff, a commit) is how work with a collaborator stays steerable. Each review is small enough to actually read. A mistake costs one slice, not the feature. And the plan stays true, because each slice is checked against it while it's fresh. When the collaborator is an agent, insist on the same rhythm: one slice per request, its diff shown, its evidence shown, and a stop before the next.

**What else, and why not.**

| Way to deliver a feature | Cost |
|---|---|
| All of it in one change | One review of everything; problems surface together, late |
| Horizontal layers (all the data, then all the logic, then the drawing) | Nothing visible to check until the last layer |
| Vertical slices, each checked and committed | More, smaller reviews; every commit works, and any can be returned to |
| Slices with no review between them | Fast; mistakes from slice 1 are built on by slice 2 |

## Your turn: slice 2, holding

Build slice 2 of `PLAN.md`: `Game.hold()`, the `c` key (and `C`), once per piece, and the `Held:` text. It's done when criteria 2 to 6 hold, each shown by a check, not when it seems to work:

2. With the hold slot empty, pressing c puts the falling piece in the slot, and the next piece comes in at the top.
3. With a piece held, pressing c swaps them: the held piece comes in at the top, in the orientation it starts in, and the falling piece goes into the slot.
4. Pressing c again before the piece locks does nothing.
5. The board shows what's held: "Held: T", "Held: I", or "Held: -" when nothing is.
6. Every existing test still passes, and no rule is broken after any key.

Give `Game` a `held()` method that returns the held shape, or `null` when the slot is empty: the checks read it. Try each criterion in the console before you commit. Then commit the slice on its own, and review it as you did slice 1.

```hints
nudge: Game needs to remember two more things: what's in the slot, and whether the falling piece has been held already. Locking a piece is what makes holding possible again.
concept: Two fields: #held (a shape name, or null) and #canHold (true until a hold, true again after a lock). hold() does nothing if #canHold is false. Otherwise the incoming shape is the held one, or, with the slot empty, nextShape of the falling one (criterion 2's "next piece"), and the falling shape goes into the slot. The incoming piece is newPiece(incoming), which puts it at the top in its starting orientation (criterion 3).
shape: In the constructor, this.#held = null; this.#canHold = true;. held() { return this.#held; }. hold() { if (this.#canHold) { const incoming = this.#held ?? nextShape(this.#shape); this.#held = this.#shape; this.#shape = incoming; this.#piece = newPiece(incoming); this.#canHold = false; } this.#check(); }. In lockPiece, after the new piece: this.#canHold = true;. In draw: context.fillText("Held: " + (game.held() ?? "-"), 8, 48);. ACTIONS: c: () => game.hold(), and ACTIONS.C = ACTIONS.c; "c" and "C" in ONCE_PER_PRESS.
answer: The changes to game.js are those in the shape rung: two fields set in the constructor, held() and hold() after shape(), this.#canHold = true; at the end of lockPiece's if, the Held: line in draw after Rows:, c in ACTIONS, ACTIONS.C, and "c", "C" in ONCE_PER_PRESS. ?? is JavaScript's "or, if that's null": this.#held ?? nextShape(this.#shape) is the held shape, or the next one if nothing is held. Then git commit -am "Hold a piece with c, once per piece". To try criterion 3 in the console: c, Up, Space, Up, Space, Down, c leaves an I held and a new T falling. The tempting slip is forgetting #canHold, which passes criteria 2, 3 and 5 and fails 4: pressing c repeatedly swaps forever.
```

```check
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'c']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.held() === 'T', game.shape() === 'I', game.piece().map((cell) => [cell.row, cell.col])]; })()" [true,true,[[0,3],[0,4],[0,5],[0,6]]] errors=none -- Criterion 2: with the slot empty, c holds the T and brings the next piece, an I, in at the top.
page blockfall/index.html "(() => { for (const key of ['c', 'ArrowUp', ' ', 'ArrowUp', ' ', 'ArrowDown', 'c']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.held() === 'I', game.shape() === 'T', game.piece().map((cell) => [cell.row, cell.col])]; })()" [true,true,[[0,3],[0,4],[0,5],[1,4]]] errors=none -- Criterion 3: c swaps the falling I with the held T, which comes in new at the top.
page blockfall/index.html "(() => { for (const key of ['c', 'ArrowDown', 'c']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.held() === 'T', game.shape() === 'I', game.piece().map((cell) => [cell.row, cell.col])]; })()" [true,true,[[1,3],[1,4],[1,5],[1,6]]] errors=none -- Criterion 4: a second c before the piece locks does nothing.
page blockfall/index.html "(() => { const seen = []; const real = context.fillText.bind(context); context.fillText = (text, x, y) => { seen.push(text); real(text, x, y); }; draw(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); context.fillText = real; return seen.filter((text) => text.startsWith('Held')).join('|') === 'Held: -|Held: T'; })()" true errors=none -- Criterion 5: the board shows Held: - and then Held: T.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [16,0] errors=none -- Criterion 6: every test still passes.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True).stdout; print(git('show', '--name-only', '--format=', 'HEAD').split() == ['game.js'], git('status', '--porcelain').strip() == '')\"" stdout="True True" -- Commit slice 2 on its own: only game.js changes.
```

**What these checks establish, and what they don't.** They check each acceptance criterion directly, in the running game: the second shape and its turn, holding into an empty slot, swapping, the once-per-piece rule, what's drawn, and that the tests and the rules still hold, plus that each slice is its own commit touching only what it should. They can't check what the plan left out, which is where the next bugs live. Undo after a hold leaves the slot as it was (out of scope, and written down). The undo bug from 01-12-01 is still there, by design. And these checks are end to end, so they test the feature through one path each. A unit test of `hold`'s rules would need them in `rules.js`, and that's the boundary asking to move again. "Done" here means the six criteria hold. Writing the criteria well is what made that a useful thing to mean.

## What you can do now

- Build from the plan **one slice at a time**: one task, one diff, one **checkpoint commit** that works.
- **Test first** where the rules are pure; check the rest **end to end**, against the criterion it serves.
- "All tests pass" is evidence about the tests. **"Done" is a claim about the acceptance criteria**: ask for each criterion's evidence.
- **Review every slice** before the next: the diff against 01-08-02's checklist, the result against the plan.
- With an agent, keep the same rhythm: one slice per request, the diff and the evidence shown, a stop before the next.

```predict
question: An agent reports: "Hold piece implemented and tested. All 16 tests pass. Ready to merge." Using this lesson, what do you check, in what order, before you believe it?
explain: The diff first (git show): did it touch only what the slice needed, and did it change or delete any test? Then the criteria, one by one, each with its own evidence: run the end-to-end check or try it in the page for criteria 2 to 5, not the test count. The 16 passing tests are the same 16 that passed before hold existed (tests.html doesn't load game.js), so they say nothing about holding at all. Only when each criterion has been shown does "ready to merge" mean something.
```

**Next:** 01-12-03 is the last lesson of stage 1: guard rails for working with collaborators who can act, human or AI. It covers least privilege, approval before anything destructive or irreversible, keeping secrets and production data out of reach, and checking a change before it reaches anyone else.
