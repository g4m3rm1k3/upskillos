---
title: "Formats That Change: Versions and Data Contracts"
runtime: none
---

Software changes, and the data it saved last year doesn't. Every saved game, settings file, database row and message in a queue was written by some earlier version of a program, and will be read by a later one, or, when people run different versions side by side, by an earlier one. A format that can't say which version wrote it leaves the reader guessing, and guessing is how a full row of Blockfall's board comes back as an empty one, silently. This lesson gives Blockfall a real save, the whole game, so that a reload carries on where you left off, with a version number in it from the start. Then it changes the format, the way formats do get changed, and makes the new Blockfall read old saves (backward compatibility) and the old Blockfall refuse new ones cleanly (forward compatibility). The task writes the format down as a **data contract**.

**By the end you can:**

- Put a version in a format from the first version, and say what it's for.
- Tell backward from forward compatibility, and say which changes break each.
- Migrate old data when a format changes, and test that old saves still load.
- Write a data contract: the fields, their meaning, and the rules for changing them.

**You need:** 02-02-03 (`localStorage`, `loadBest`), 02-04-02 (parsing at the boundary), 01-09-04 (Blockfall's `tests.html`), 01-04-04 (the `Game` class). Blockfall is opened from disk, and reloaded after each change.

## A save with no version

02-02-03 saved Blockfall's best score as `{"rows": 3, "saved": "2026-11-16"}`. Suppose a later Blockfall keeps the five best scores instead, as a list. Both are saved under the same key, in the same browser.

```predict
question: The later Blockfall writes {"scores": [...]}, and someone opens the earlier version again (an old tab, an old copy). What does the earlier version's loadBest do with it?
choice: Shows the best of the five scores
choice: Shows 0, and on the next cleared row overwrites the list with its own format
choice: Shows an error
answer: Shows 0, and on the next cleared row overwrites the list with its own format
explain: loadBest finds no whole number under rows, so it returns 0, as it was written to do for a broken save. Then the first row cleared is a new best, and saveBest writes {"rows": 1, ...} over the list: five scores lost, and no error anywhere. The earlier version couldn't tell "broken" from "newer than me", because the format had no way to say which version wrote it.
```

The fix has to be in the format from its first version, because the old reader is already out there and can't be changed. A **version number** in the data lets every reader ask "do I know this format?" before it reads anything else. If not, it refuses, and leaves the data alone.

## Version 1

Saving the whole game needs a format, and the format gets a module of its own: everything about turning a game into text and back, and nothing else. Create `save.js`:

```js file=blockfall/save.js
// Blockfall's saved game: the format it's stored in, and nothing else. When
// a save is read back it's outside data (02-04-02): an older or newer
// Blockfall may have written it, or a person may have edited it.

// The version of the format this code writes. It goes up whenever the format
// changes in a way that a reader of the old format would get wrong.
const SAVE_VERSION = 1;

class SaveError extends Error {}

// A game's state as text: JSON, with the version first.
function encodeSave(state) {
  return JSON.stringify({
    version: SAVE_VERSION,
    board: state.board,
    shape: state.shape,
    piece: state.piece.map((cell) => [cell.row, cell.col]),
    held: state.held,
    cleared: state.cleared,
  });
}

// Text back into a game's state, or a SaveError that says why it can't be.
// A version this code doesn't know is refused, never guessed at.
function decodeSave(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveError("the save isn't JSON");
  }
  if (data === null || typeof data !== "object") {
    throw new SaveError("the save isn't a JSON object");
  }
  if (data.version !== SAVE_VERSION) {
    if (Number.isInteger(data.version) && data.version > SAVE_VERSION) {
      throw new SaveError(`saved by a newer Blockfall (format ${data.version}); this one reads format ${SAVE_VERSION}`);
    }
    throw new SaveError(`unknown save format ${JSON.stringify(data.version)}`);
  }
  return checkedState(data.board, data.shape, data.piece, data.held, data.cleared);
}

// Every field checked, and the state the game's rules allow (rules.js).
function checkedState(board, shape, piece, held, cleared) {
  const isRow = (n) => Number.isInteger(n) && n >= 0 && n <= FULL;
  if (!Array.isArray(board) || board.length !== ROWS || !board.every(isRow)) {
    throw new SaveError("board must have 20 rows of 10 squares");
  }
  if (typeof shape !== "string" || !Object.hasOwn(SHAPES, shape)) {
    throw new SaveError(`shape ${JSON.stringify(shape)} isn't one of ${Object.keys(SHAPES).join(", ")}`);
  }
  const isCell = (cell) => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger);
  if (!Array.isArray(piece) || piece.length !== 4 || !piece.every(isCell)) {
    throw new SaveError("piece must be four [row, column] squares");
  }
  if (held !== null && (typeof held !== "string" || !Object.hasOwn(SHAPES, held))) {
    throw new SaveError(`held ${JSON.stringify(held)} isn't empty or a shape`);
  }
  if (!Number.isInteger(cleared) || cleared < 0) {
    throw new SaveError("cleared must be a whole number, 0 or more");
  }
  const cells = Object.freeze(piece.map(([row, col]) => Object.freeze({ row: row, col: col })));
  const problems = invariantProblems({ board: board, piece: cells });
  if (problems.length > 0) {
    throw new SaveError("the saved game breaks the rules: " + problems.join("; "));
  }
  return { board: board.slice(), shape: shape, piece: cells, held: held, cleared: cleared };
}
```

`encodeSave` writes the version first, then the state, with the piece's squares as `[row, column]` pairs. `decodeSave` is a boundary parser (02-04-02): it refuses text that isn't JSON or isn't an object, refuses any version but its own, and says why, with a `SaveError`. A version newer than its own gets a message that says exactly that. Then `checkedState` checks every field, and finally asks `invariantProblems` from `rules.js` (01-04-04) whether the saved game obeys the game's rules, so a save in which the piece overlaps a filled square is refused like any other bad data. `Object.hasOwn(SHAPES, shape)` rather than `shape in SHAPES`, because `"toString" in SHAPES` is true: every object inherits that. `class SaveError extends Error {}` makes a kind of error the game can catch on its own, leaving real bugs to crash loudly (01-10-01).

Both pages need the new script, after `rules.js`, which it uses, and before anything that uses it. In `index.html` and in `tests.html`, add this line right after `<script src="rules.js"></script>`:

```
  <script src="save.js"></script>
```

Save all three files.

```check
contains blockfall/index.html "save.js" -- index.html should load save.js.
contains blockfall/tests.html "save.js" -- tests.html should load save.js.
page blockfall/index.html "(() => { const s = { board: newBoard(), shape: 'T', piece: newPiece('T'), held: null, cleared: 0 }; return JSON.stringify(decodeSave(encodeSave(s))) === JSON.stringify(s); })()" true errors=none -- A state should survive encodeSave and decodeSave unchanged.
page blockfall/index.html "(() => { try { decodeSave(JSON.stringify({ version: 2 })); return 'loaded'; } catch (e) { return e instanceof SaveError && e.message.includes('newer'); } })()" true errors=none -- A save from a newer format should be refused with a SaveError that says so.
```

## Saving and resuming

Now the game uses it: `s` saves, and a page that finds a save carries on from it. Replace `game.js` with:

```js file=blockfall/game.js
// The game on the screen: one Game, drawn on the canvas, driven by the
// keyboard and a timer. The rules it follows are in rules.js, loaded first.

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #shape;
  #held;
  #canHold;
  #history;
  #cleared;

  constructor() {
    this.#board = newBoard();
    this.#shape = "T";
    this.#piece = newPiece(this.#shape);
    this.#held = null;
    this.#canHold = true;
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

  // The shape in the hold slot, or null when it's empty.
  held() {
    return this.#held;
  }

  // Put the falling piece in the hold slot, and bring in the held shape (or,
  // with the slot empty, the next shape in turn) new at the top. Once per
  // piece: after holding, c does nothing until the piece locks.
  hold() {
    if (this.#canHold) {
      const incoming = this.#held ?? nextShape(this.#shape);
      this.#held = this.#shape;
      this.#shape = incoming;
      this.#piece = newPiece(incoming);
      this.#canHold = false;
    }
    this.#check();
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
      this.#canHold = true;
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

  // The game's state as plain values, to be saved. The undo history isn't
  // part of it: a resumed game starts with nothing to undo.
  snapshot() {
    return {
      board: this.#board.slice(),
      shape: this.#shape,
      piece: this.#piece,
      held: this.#held,
      cleared: this.#cleared,
    };
  }

  // A game that carries on from a saved state (decodeSave has checked it).
  // A static method belongs to the class, and can set a new game's fields.
  static fromSnapshot(state) {
    const resumed = new Game();
    resumed.#board = state.board.slice();
    resumed.#shape = state.shape;
    resumed.#piece = state.piece;
    resumed.#held = state.held;
    resumed.#cleared = state.cleared;
    resumed.#check();
    return resumed;
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

// The saved game, kept in the browser between visits, as text in save.js's
// format.
const SAVE_KEY = "blockfall.save";
let loadProblem = null;

// Carry on from the saved game if there is one. If it can't be read, say why
// and start a new game, leaving the save where it is.
function startingGame() {
  const text = localStorage.getItem(SAVE_KEY);
  if (text === null) {
    return new Game();
  }
  try {
    return Game.fromSnapshot(decodeSave(text));
  } catch (error) {
    if (!(error instanceof SaveError)) {
      throw error;
    }
    loadProblem = error.message;
    console.warn("The saved game wasn't loaded: " + error.message);
    return new Game();
  }
}

const game = startingGame();

// The best number of rows cleared, kept in the browser's storage between
// visits, as JSON. The Game itself never touches storage.
const BEST_KEY = "blockfall.best";

// The saved best, or 0 when nothing is saved or what is saved is unreadable.
function loadBest() {
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY));
    return Number.isInteger(saved?.rows) ? saved.rows : 0;
  } catch {
    return 0;
  }
}

function saveBest(rows) {
  localStorage.setItem(BEST_KEY, JSON.stringify({ rows: rows, saved: new Date().toISOString().slice(0, 10) }));
}

let best = loadBest();

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
  context.fillText("Held: " + (game.held() ?? "-"), 8, 48);
  context.fillText("Best: " + best, 8, 64);
  if (loadProblem !== null) {
    context.fillText("Save not loaded (see the console)", 8, 80);
  }
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
  c: () => game.hold(),
  s: () => localStorage.setItem(SAVE_KEY, encodeSave(game.snapshot())),
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
ACTIONS.C = ACTIONS.c;
ACTIONS.S = ACTIONS.s;

// Keys that do something once per press. Held down, a key repeats its
// keydown event, with event.repeat set to true (MDN, KeyboardEvent.repeat);
// moving should repeat, but locking, undoing and pausing shouldn't.
const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P", "x", "X", "c", "C", "s", "S"]);

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
  if (game.clearedCount() > best) {
    best = game.clearedCount();
    saveBest(best);
  }
  draw();
});

draw();
```

`snapshot` returns the game's state as plain values (the private fields can't be read from outside, 01-04-04, so the game offers a copy). `fromSnapshot` is a **static** method: it belongs to the class, not to a game, and it can set a new game's private fields because it's written inside the class. It runs `#check` afterwards, so even a resumed game is checked against the rules. The undo history isn't saved: a resumed game has nothing to undo, which is a decision, and the comment records it. `startingGame` reads the save, and if `decodeSave` refuses it, keeps going with a new game, shows `Save not loaded` on the board, and explains in the console, without deleting the save: a save the game can't read might be from a newer version, and is worth keeping. It catches only `SaveError`; anything else is a bug and should stop the page.

Reload `index.html`, move the piece, and press `s`. Reload again: the piece is where you left it. In the console, `localStorage.getItem("blockfall.save")` shows the saved text, beginning `{"version":1,"board":[0,0,…`. To start fresh, `localStorage.removeItem("blockfall.save")` and reload.

```check
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' })); const saved = JSON.parse(localStorage.getItem(SAVE_KEY)); localStorage.removeItem(SAVE_KEY); return [saved.version, saved.piece[0], saved.board[19]]; })()" [1,[1,3],975] errors=none -- s should save the game, as format 1, with the piece one row down.
page blockfall/index.html "(() => { localStorage.setItem(SAVE_KEY, encodeSave({ ...game.snapshot(), cleared: 7, held: 'I' })); const resumed = startingGame(); localStorage.removeItem(SAVE_KEY); return [resumed.clearedCount(), resumed.held() === 'I', loadProblem === null]; })()" [7,true,true] errors=none -- startingGame should carry on from a save.
page blockfall/index.html "(() => { localStorage.setItem(SAVE_KEY, '{oops'); const resumed = startingGame(); const kept = localStorage.getItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY); return [loadProblem.includes('JSON'), resumed.pieceCount(), kept === '{oops']; })()" [true,0,true] errors=none -- An unreadable save should give a new game and a reason, and be left where it is.
```

## Tests for the format

The format's promises become tests. Add these to the end of `tests.js`:

```js edit=blockfall/tests.js mode=append

// The save format (save.js). refusal() says what decodeSave did with a text:
// loaded it, refused it with a SaveError, or crashed with anything else.
function refusal(text) {
  try {
    decodeSave(text);
    return "loaded";
  } catch (error) {
    return error instanceof SaveError ? "refused" : "crashed: " + error.message;
  }
}

test("a game's state survives a save and a load", () => {
  const state = { board: newBoard(), shape: "I", piece: newPiece("I"), held: "T", cleared: 2 };
  assertEqual(decodeSave(encodeSave(state)), state);
});

test("a save from a newer Blockfall is refused, not guessed at", () => {
  assertEqual(refusal(JSON.stringify({ version: 99, board: [] })), "refused");
});

test("text that isn't a save is refused, not crashed on", () => {
  assertEqual([refusal("{oops"), refusal("null"), refusal("[]"), refusal(JSON.stringify({ version: 1 }))],
    ["refused", "refused", "refused", "refused"]);
});

test("a save that breaks the game's rules is refused", () => {
  const state = { board: newBoard(), shape: "T", piece: moved(newPiece("T"), 18, -3), held: null, cleared: 0 };
  assertEqual(refusal(encodeSave(state)), "refused");
});
```

`refusal` turns "what happened" into a value a test can compare: loaded, refused, or crashed. The third test is the one that matters most for a boundary: text that isn't a save must be *refused*, never crash the page. Reload `tests.html`: `20 passed, 0 failed`.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [20,0] errors=none -- With the four save tests, all 20 should pass.
```

## Version 2

Now the change. A board saved as numbers, `[0, 0, …, 769, 975]`, can't be read or fixed by a person, and a diff of two saves says nothing. Text is better: `"####..####"`. But that changes what `board` means, from numbers to strings, and an old reader given strings would get them wrong.

How wrong? Not with an error. Look at what Blockfall's rules do with a row of text, in the console on `index.html`:

```
["##########" & 1, isRowFull(["##########"], 0)]
```

```
[0, false]
```

JavaScript turns the string into a number for `&`, gets `NaN`, and treats that as 0: a full row reads as an empty one. A reader that took `board` from the JSON without checking would load a version 2 save as an empty board, with no error. That's the failure the version number exists to prevent, and version 1's `decodeSave` prevents it: given a version 2 save, it says `saved by a newer Blockfall (format 2); this one reads format 1`, and the save stays where it is. That's **forward compatibility**: an old reader handling newer data safely. Here, safely means refusing; for some formats it means reading the fields it knows and ignoring the rest, which works only when the new version *added* fields without changing the old ones.

The new code must also read every save the old code wrote: **backward compatibility**. Replace `save.js` with:

```js file=blockfall/save.js
// Blockfall's saved game: the format it's stored in, and nothing else. When
// a save is read back it's outside data (02-04-02): an older or newer
// Blockfall may have written it, or a person may have edited it.

// The version of the format this code writes. It goes up whenever the format
// changes in a way that a reader of the old format would get wrong.
// Format 2 writes each board row as text, column 0 first ("####..####");
// format 1 wrote each row as a number. Format 1 saves are still read.
const SAVE_VERSION = 2;

class SaveError extends Error {}

// A game's state as text: JSON, with the version first.
function encodeSave(state) {
  return JSON.stringify({
    version: SAVE_VERSION,
    board: state.board.map(rowText),
    shape: state.shape,
    piece: state.piece.map((cell) => [cell.row, cell.col]),
    held: state.held,
    cleared: state.cleared,
  });
}

// Text back into a game's state, or a SaveError that says why it can't be.
// A version this code doesn't know is refused, never guessed at.
function decodeSave(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveError("the save isn't JSON");
  }
  if (data === null || typeof data !== "object") {
    throw new SaveError("the save isn't a JSON object");
  }
  if (data.version === 1) {
    // A migration: format 1's numbers already mean what rowNumber gives.
    return checkedState(data.board, data.shape, data.piece, data.held, data.cleared);
  }
  if (data.version === 2) {
    const board = Array.isArray(data.board) ? data.board.map(rowNumber) : data.board;
    return checkedState(board, data.shape, data.piece, data.held, data.cleared);
  }
  if (Number.isInteger(data.version) && data.version > SAVE_VERSION) {
    throw new SaveError(`saved by a newer Blockfall (format ${data.version}); this one reads format ${SAVE_VERSION}`);
  }
  throw new SaveError(`unknown save format ${JSON.stringify(data.version)}`);
}

// A board row as text: "#" for a filled square, "." for an empty one,
// column 0 first. 0b1111001111 is "####..####".
function rowText(bits) {
  let text = "";
  for (let col = 0; col < COLS; col++) {
    text += (bits & (1 << col)) !== 0 ? "#" : ".";
  }
  return text;
}

// The other way: text of ten "#" and "." back into a row's number, or NaN
// (which checkedState refuses) for anything else.
function rowNumber(text) {
  if (typeof text !== "string" || !/^[#.]{10}$/.test(text)) {
    return NaN;
  }
  let bits = 0;
  for (let col = 0; col < COLS; col++) {
    if (text[col] === "#") {
      bits |= 1 << col;
    }
  }
  return bits;
}

// Every field checked, and the state the game's rules allow (rules.js).
function checkedState(board, shape, piece, held, cleared) {
  const isRow = (n) => Number.isInteger(n) && n >= 0 && n <= FULL;
  if (!Array.isArray(board) || board.length !== ROWS || !board.every(isRow)) {
    throw new SaveError("board must have 20 rows of 10 squares");
  }
  if (typeof shape !== "string" || !Object.hasOwn(SHAPES, shape)) {
    throw new SaveError(`shape ${JSON.stringify(shape)} isn't one of ${Object.keys(SHAPES).join(", ")}`);
  }
  const isCell = (cell) => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger);
  if (!Array.isArray(piece) || piece.length !== 4 || !piece.every(isCell)) {
    throw new SaveError("piece must be four [row, column] squares");
  }
  if (held !== null && (typeof held !== "string" || !Object.hasOwn(SHAPES, held))) {
    throw new SaveError(`held ${JSON.stringify(held)} isn't empty or a shape`);
  }
  if (!Number.isInteger(cleared) || cleared < 0) {
    throw new SaveError("cleared must be a whole number, 0 or more");
  }
  const cells = Object.freeze(piece.map(([row, col]) => Object.freeze({ row: row, col: col })));
  const problems = invariantProblems({ board: board, piece: cells });
  if (problems.length > 0) {
    throw new SaveError("the saved game breaks the rules: " + problems.join("; "));
  }
  return { board: board.slice(), shape: shape, piece: cells, held: held, cleared: cleared };
}
```

`SAVE_VERSION` is 2, and `encodeSave` writes each row with `rowText`. `decodeSave` now knows two versions. For version 2 it turns the text back into numbers with `rowNumber`, which gives `NaN` for anything that isn't ten `#` and `.`, so `checkedState` refuses it. For version 1 it uses the numbers as they are: a **migration**, turning an old version's data into what the current code works with. Here the migration is trivial, because the numbers already mean what `rowNumber` produces; often it isn't (a field renamed, a default chosen for a field that didn't exist). Everything after the version check is shared, so both versions are held to the same rules.

Reload `index.html`: the game starts as before. Press `s`, and `localStorage.getItem("blockfall.save")` now shows `"board":["..........", …, "#.......##","####..####"]`.

```check
page blockfall/index.html "(() => { const t = encodeSave(game.snapshot()); return [JSON.parse(t).version, JSON.parse(t).board[19] === '####..####', JSON.stringify(decodeSave(t)) === JSON.stringify(game.snapshot())]; })()" [2,true,true] errors=none -- Format 2 should write rows as text and read them back to the same state.
page blockfall/index.html "(() => { const old = JSON.stringify({ version: 1, board: newBoard(), shape: 'T', piece: [[0, 3], [0, 4], [0, 5], [1, 4]], held: null, cleared: 4 }); return decodeSave(old).cleared; })()" 4 errors=none -- A format 1 save should still load.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [20,0] errors=none -- The format 1 tests should all still pass against format 2's code.
```

## Tests for version 2

The last check is worth a second look: the tests written for version 1 all pass against version 2, unchanged, including the round trip. Old tests passing is the first evidence of backward compatibility. Now add what's new. Add these to the end of `tests.js`:

```js edit=blockfall/tests.js mode=append

// Format 2, and format 1 saves read by it.
test("format 2 writes each board row as text, column 0 first", () => {
  const state = { board: newBoard(), shape: "T", piece: newPiece("T"), held: null, cleared: 0 };
  const saved = JSON.parse(encodeSave(state));
  assertEqual([saved.version, saved.board[19], saved.board[18]], [2, "####..####", "#.......##"]);
});

test("a format 1 save still loads, into the same state", () => {
  const state = { board: newBoard(), shape: "I", piece: newPiece("I"), held: "T", cleared: 3 };
  const format1 = JSON.stringify({ version: 1, board: newBoard(), shape: "I", piece: [[0, 3], [0, 4], [0, 5], [0, 6]], held: "T", cleared: 3 });
  assertEqual(decodeSave(format1), state);
});

test("a format 2 board row that isn't ten # and . is refused", () => {
  const saved = JSON.parse(encodeSave({ board: newBoard(), shape: "T", piece: newPiece("T"), held: null, cleared: 0 }));
  saved.board[0] = "....";
  assertEqual(refusal(JSON.stringify(saved)), "refused");
});
```

The second test is the one to keep forever: a version 1 save, written out by hand as version 1 wrote it, must load into the same state. Every format a program has ever written deserves a test like it, because the code that wrote it is gone, and the saves aren't. Reload `tests.html`: `23 passed, 0 failed`. Commit the format, the game and the tests:

```
git add save.js game.js index.html tests.html tests.js
git commit -m "Save and resume games, in a versioned format that reads its old versions"
```

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [23,0] errors=none -- With the format 2 tests, all 23 should pass.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('SAVE_VERSION = 2' in git('show', 'HEAD:save.js').stdout, 'fromSnapshot' in git('show', 'HEAD:game.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit save.js, game.js, the two pages and tests.js in blockfall.
```

## Changes that break, and changes that don't

Which changes need a new version? Ask what an old reader would do with the new data, and what a new reader would do with old data:

| Change | Old reader, new data | New reader, old data | New version? |
|---|---|---|---|
| Add a field old readers don't need | Ignores it: fine | Field missing: needs a default | No, if every reader ignores unknown fields |
| Add a field old readers *must* understand | Ignores it, and is wrong | Needs a default | Yes |
| Remove a field | Missing: breaks | Ignores it: fine | Yes |
| Rename a field | Missing: breaks | Missing: needs the old name too | Yes |
| Change a field's type or meaning | Misreads it, often silently | Must convert | Yes |

Two habits make most changes safe. Readers ignore fields they don't know (`decodeSave` does: it never complains about extra fields), so additions are cheap. And a version number from the start, so the breaking changes can be recognised. For data that lives across systems, add a third: **expand, then contract**. Write both the old and the new form for a while, until every reader understands the new one, and only then stop writing the old. That's how services change their messages without stopping everything at once.

A **data contract** is the agreement between whoever writes data and whoever reads it: the fields, their types and meaning, the versions, and the rules for changing them, written down where both sides can find it. Protocol Buffers (02-04-01) build some of those rules into the format: fields are numbered, and a field's number must never be reused for something else. Without such a format, the contract is a document, kept next to the code that writes the data.

```predict
question: A service sends {"amount": 1250} meaning cents. The team wants to send {"amount": 12.50} meaning dollars instead. What's the safe way to make that change?
explain: Don't change the meaning of an existing field: every reader that still treats amount as cents would charge a hundred times too little, without any error. Add a new field instead, such as "amount_dollars" (or better, keep cents and add "currency"), write both for a while, move every reader to the new field, and only then stop writing the old one: expand, then contract. Record each step in the data contract, so the readers know what's coming.
```

**What else, and why not.** You could skip the version and detect the format from its shape ("if board holds strings, it's the new kind"): that works until two versions have the same shape and different meanings, such as cents and dollars. You could migrate every stored save at once, when the new version first runs: that's right for a database (and stage 7 does it), but saves in other people's browsers can't all be reached, so the reader must keep reading old versions. You could refuse old versions and ask people to start over: that's honest, and sometimes right for a game, and wrong for anything that holds money or work.

## Your turn: the data contract

Write `SAVE-FORMAT.md` in `blockfall`: the contract for Blockfall's saves, for someone who'll write the next version, or a different program that reads saves, without reading `save.js`. Include:

- one opening paragraph: what a save is, where it's stored (the `localStorage` key), and which code reads and writes it;
- a `### Version 2` section and a `### Version 1` section, each describing every field (`version`, `board`, `shape`, `piece`, `held`, `cleared`): its type, what it means, and the values it may take, plus the rule the whole state must obey;
- a `### Rules for changing it` section, as `- ` lines, saying what a reader does with a newer version and with unknown fields, which changes need a new version, and what a new version must still read.

Commit it in `blockfall`.

```hints
nudge: Imagine handing the file to someone writing version 3 in another language. What would they get wrong if a field's meaning weren't written down: which way the columns run, whether rows go top to bottom, what null in held means?
concept: A contract is complete when a reader could write a correct encoder and decoder from it alone. That needs each field's type and meaning, the units and orientation (row 0 at the top, column 0 first, bit c for column c in version 1), the allowed values, the rule across fields (the piece mustn't overlap the board), and the change rules this lesson worked out.
shape: # Blockfall's save format, a paragraph, ### Version 2 (current) with six "- `field`: ..." lines and the rules sentence, ### Version 1 saying how it differs, ### Rules for changing it with four or five "- " lines.
answer: SAVE-FORMAT.md:
~~~markdown
# Blockfall's save format

A saved game is one JSON object, stored in the browser's localStorage under the key `blockfall.save`. save.js is the only code that writes or reads it.

### Version 2 (current)

- `version`: the number 2.
- `board`: 20 strings, the rows from top to bottom, each ten characters, `#` for a filled square and `.` for an empty one, column 0 first.
- `shape`: the falling piece's shape, `"T"` or `"I"`.
- `piece`: the falling piece's four squares, each `[row, column]`, row 0 at the top.
- `held`: the shape in the hold slot, or `null` when it's empty.
- `cleared`: how many rows have been cleared, a whole number, 0 or more.

The game the fields describe must obey the game's rules: the piece on the board, overlapping no filled square.

### Version 1

As version 2, except `board` is 20 numbers from 0 to 1023, one per row, bit c set when column c is filled. Still read; never written.

### Rules for changing it

- A reader refuses a version newer than it knows, with a message, and leaves the save in place.
- A reader ignores fields it doesn't know.
- Adding a field that older readers can safely ignore doesn't change the version.
- Changing what a field means, its type, or removing it, is a new version, and the new reader still reads every older version.
- Every version stays documented here, with what changed.
~~~
Then, in blockfall, git add SAVE-FORMAT.md and git commit -m "Write down the save format as a contract". The tempting slips: describing only version 2 (the reader must still read version 1, so version 1 must be described), and leaving out the orientation of the board, which is exactly what a second implementation gets wrong.
```

```check
file blockfall/SAVE-FORMAT.md -- Write SAVE-FORMAT.md in blockfall.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('../blockfall/SAVE-FORMAT.md').read_text(encoding='utf-8'); print(all(h in t for h in ['### Version 2', '### Version 1', '### Rules for changing it']), 'blockfall.save' in t)\"" stdout="True True" -- SAVE-FORMAT.md should have sections for both versions and the change rules, and name the localStorage key.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('../blockfall/SAVE-FORMAT.md').read_text(encoding='utf-8'); v2 = t.split('### Version 2')[1].split('###')[0]; print([f for f in ['version', 'board', 'shape', 'piece', 'held', 'cleared'] if f not in v2] or 'all described')\"" stdout="all described" -- The Version 2 section should describe all six fields.
run "cd ledger; .venv/Scripts/python -c \"import pathlib; t = pathlib.Path('../blockfall/SAVE-FORMAT.md').read_text(encoding='utf-8'); r = t.split('### Rules for changing it')[1]; print(sum(l.startswith('- ') for l in r.splitlines()) >= 3)\"" stdout="True" -- The change rules should be at least three "- " lines.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:SAVE-FORMAT.md').returncode == 0, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit SAVE-FORMAT.md in blockfall.
```

**What these checks establish, and what they don't.** They check that the format round-trips, refuses newer versions, unreadable text and impossible games; that the game saves, resumes, and keeps a save it can't read; that format 1 saves load in format 2's code and format 1's tests pass unchanged; and that the contract has its sections and names every field. They can't check that the contract is right, or that someone could implement the format from it alone; the way to find out is to give it to someone who hasn't read `save.js`, and see what they ask. And no check here can tell you about the old Blockfall pages still open somewhere: compatibility is a promise about copies of your program you'll never see.

## What you can do now

- Put a **version** in every format from its **first** version; old readers already out there can't be changed later.
- **Backward compatibility**: new code reads old data, through **migrations**, tested with saved examples of every old version. **Forward compatibility**: old code handles newer data safely, by **refusing** what it doesn't know, or by **ignoring unknown fields** when changes are only additions.
- Adding an optional field is cheap; **renaming, removing, or changing a type or meaning** needs a new version. Change meaning with a **new field**, and **expand, then contract**.
- A reader that can't read saved data **keeps** it, and says why.
- A **data contract** writes down fields, meanings, units, orientation, versions and the change rules, for every writer and reader.

**Next:** 02-05-01 starts writing Ledger's specification. Requirements versus implementation, functional and non-functional requirements, constraints, assumptions written down, non-goals, the domain's vocabulary, and the two readers every spec has now: people, and the AI agents they hand it to.
