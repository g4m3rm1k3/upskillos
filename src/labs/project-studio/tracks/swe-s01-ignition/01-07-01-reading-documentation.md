---
title: Reading Documentation
runtime: none
---

Blockfall's keys have worked since 01-02-03, tested by checks that press each key once. Hold a key down and something else happens. Hold `z`, and every lock you've made is undone in a blink. Hold `p`, and the game ends up paused or not depending on how long you held it. Nothing in `game.js` explains this, because the cause isn't in `game.js`: it's in how browsers report keys, and the place that says how is the **documentation**. This lesson starts module 1.7, on reading what other people have written about the tools you use. It's about telling the different kinds of documentation apart, finding the fact you need in a reference and checking it, noticing what a reference doesn't say, and making sure the page you're reading describes the version you actually have.

**By the end you can:**

- Tell a tutorial, a how-to guide, a reference and an explanation apart, and know which to reach for.
- Find a specific behaviour in a reference, quote it, and confirm it with an experiment.
- Notice when a reference is silent on a case, and find out by testing instead of guessing.
- Check which version a page describes, and use changelogs and release notes to find what changed.

**You need:** Blockfall as 01-05-04 left it, with its `ACTIONS` table and pause key (01-05-03); Kit's environment with Ruff (01-06-04). Work in `blockfall`, with `index.html` open and the console open.

## Four kinds of documentation

Documentation comes in kinds, and each answers a different question. A widely used way to sort them, called Diátaxis, has four:

| Kind | Answers | Example |
|---|---|---|
| **Tutorial** | "Teach me, from the start" | A first-steps course; this course |
| **How-to guide** | "How do I do this one thing?" | "How to handle keyboard input in a game" |
| **Reference** | "What exactly does this do?" | MDN's page on `KeyboardEvent.key`; Python's library reference |
| **Explanation** | "Why does it work this way?" | An article on how browsers deliver events |

They fail differently when used for the wrong job. A tutorial skips cases to keep moving; a how-to guide shows one way and assumes your setup; an explanation is rarely precise about details. A **reference** is meant to be complete and exact about one thing, and is dry to read from start to finish. When code behaves in a way you didn't expect, the reference is where the answer usually is.

For the web, the standard reference is **MDN** (MDN Web Docs, developer.mozilla.org), written by browser makers and volunteers. Behind it are the actual **specifications**, the standards that browsers implement (01-07-02 reads one). For Python, it's the library reference at docs.python.org. For a tool such as Ruff, it's the tool's own documentation and its built-in help (`ruff rule F823`, 01-06-04).

```predict
question: You want to know exactly what event.key is for the space bar in a browser. Which kind of documentation do you open?
choice: A tutorial on making a browser game
choice: The reference page for KeyboardEvent.key
choice: An explanation of how the event loop works
answer: The reference page for KeyboardEvent.key
explain: It's a question about one exact value, which is what a reference is for. MDN's table of key values says the space bar is " " (a single space), and also that older browsers returned "Spacebar", which is the kind of detail a tutorial leaves out. A tutorial might show it in passing, but you couldn't tell whether it was the whole story.
```

## A key held down

See the problem before reading about it. Lock two pieces (Up, Space, Up, Space), then hold `z` for a second. Both pieces are gone, although you pressed `z` once. Then hold `p` for a while and let go: sometimes the game is paused, sometimes not.

The reference explains it. MDN's page on `KeyboardEvent.key` says that when a key that produces a character is held, "the event continues to be emitted in a platform implementation dependent interval and the `KeyboardEvent.repeat` read-only property is set to `true`." And the page on `KeyboardEvent.repeat`: it "returns a boolean value that is `true` if the given key is being held down such that it is automatically repeating." So holding a key doesn't send one `keydown`. It sends one, then more, as fast as the system repeats keys, each marked `repeat: true`. Blockfall's handler treats every one as a new press.

Don't take a reference's word for it alone; test what it says. A `KeyboardEvent` can be made with `repeat: true`, just as a held key would make it. Reload, then paste this into the console. It locks two pieces, then sends one `z` and three repeats:

```
(() => {
  stopFalling();
  for (const key of ["ArrowUp", " ", "ArrowUp", " "]) document.dispatchEvent(new KeyboardEvent("keydown", { key }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "z" }));
  for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", repeat: true }));
  return game.pieceCount();
})()
```

It answers `0`: the repeats undid the second lock too. Moving should repeat, since holding Left to slide the piece across is what a player wants. Locking, undoing and pausing should happen once per press. So the handler ignores repeats for those keys. A JavaScript `Set`, like Python's, holds values and answers `has(value)` quickly; it lists the keys that act once per press.

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

// Keys that do something once per press. Held down, a key repeats its
// keydown event, with event.repeat set to true (MDN, KeyboardEvent.repeat);
// moving should repeat, but locking, undoing and pausing shouldn't.
const ONCE_PER_PRESS = new Set([" ", "z", "p"]);

// Each key calls its action, if it has one, and redraws.
document.addEventListener("keydown", (event) => {
  const action = ACTIONS[event.key];
  if (action === undefined || (paused && event.key !== "p")) {
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

Save and reload, and paste the console test again: `1`. Only the first `z` acted. Holding Left still slides the piece. Holding `p` now pauses once and stays paused until you press it again.

```check
page blockfall/index.html "(() => { stopFalling(); for (const key of ['ArrowUp', ' ', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', repeat: true })); return game.pieceCount(); })()" 1 errors=none -- A held z should undo once: ignore keydown events with event.repeat set for z.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', repeat: true })); return paused; })()" true -- A held p should pause once, however long it's held.
page blockfall/index.html "(() => { stopFalling(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); for (let i = 0; i < 2; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true })); return game.piece().map((c) => c.col).join(','); })()" "0,1,2,1" -- Held arrow keys should still repeat: three columns left.
```

## What the reference leaves out

References are exact about what they cover, and silent about the rest. Blockfall's undo is `ACTIONS.z`. What does `event.key` say when Shift is held, or Caps Lock is on? MDN's `KeyboardEvent.key` page answers half of it: "if the pressed key is the B key, the returned value is the string `"b"`. However, if the Shift key is pressed at the same time … the returned value is the string `"B"`." So Shift+Z sends `"Z"`, which isn't in `ACTIONS`, and does nothing. The page doesn't mention Caps Lock at all.

When a reference is silent, don't fill the gap from what seems likely. Find out: either from a deeper source (the specification behind the reference, 01-07-02), or by experiment, which is quicker here. Add a temporary line at the top of the `keydown` handler, `console.log(JSON.stringify(event.key), event.repeat);`, reload, and press `z`, then Shift+Z, then `z` with Caps Lock on. The console shows what your browser, on your keyboard layout, really sends. Then take the line out again. That result is evidence for one browser and one layout, not a rule; a fact you've tested yourself is still worth writing down with what you tested it on.

```check
page blockfall/index.html "(() => { stopFalling(); for (const key of ['ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z' })); return game.pieceCount(); })()" 1 -- As things stand, Shift+Z (key "Z") isn't an action, so the lock stays. Your turn fixes that.
```

## Which version is this page for?

The second trap in documentation is the page that's right about a different version. Two real examples, both measured for this lesson.

**Python.** The address `docs.python.org/3/library/itertools.html` always shows the documentation for the newest Python, which, when this lesson was written, was 3.15.2; every page has a version switcher at the top. It documents `itertools.batched(iterable, n, *, strict=False)`, which groups items into tuples of `n`. At the bottom of the entry: "Added in version 3.12" and "Changed in version 3.13: Added the *strict* option." Those notes matter. Kit's `pyproject.toml` says `requires-python = ">=3.10"` (01-06-05), so a Kit tool that used `batched` would break for some of the people Kit says it supports. On one machine with several Pythons installed:

| Python | `itertools.batched("ABCDEFG", 3, strict=True)` |
|---|---|
| 3.11 | `AttributeError: module 'itertools' has no attribute 'batched'` |
| 3.12 | `TypeError: batched() takes at most 2 arguments (3 given)` |
| 3.14 | Works: `strict=True` raises `ValueError` on the short last batch |

Check your own: `.venv/bin/python --version` in `kit`, and use the switcher to read the docs for that version.

**Ruff.** The documentation for Ruff 0.8.0 said its default configuration was `select = ["E4", "E7", "E9", "F"]`: "Pyflakes (`F`) and a subset of the pycodestyle (`E`) codes". The Ruff 0.17.5 you installed in 01-06-04 enables hundreds of rules by default, across categories such as correctness, suspicious and style. A tutorial written for the older Ruff would tell you its report would be short, and you'd wonder why yours wasn't.

Where to find what changed:

- A **changelog** lists every change, version by version (Ruff's `CHANGELOG.md`, in its repository).
- **Release notes**, or Python's "What's New in Python 3.x", explain the important changes of one release in prose.
- A **migration guide** explains how to move from one major version to the next when things break.
- The "Added in version" and "Changed in version" notes in a reference, as on `batched`.

And on any web page, look for its date: MDN shows "This page was last modified on …" at the bottom. The `KeyboardEvent.repeat` page said Apr 7, 2023; the `KeyboardEvent.key` page said Nov 12, 2026. An old date isn't wrong, since stable things change slowly, but it tells you what the page could have known.

```check
run "cd kit; .venv/Scripts/python -c \"import itertools, sys; print(hasattr(itertools, 'batched') == (sys.version_info >= (3, 12)))\"" stdout="True" -- batched exists from Python 3.12 on, exactly as the reference's "Added in version" note says.
run "cd kit; .venv/Scripts/ruff --version" stdout="ruff 0.17.5" -- Read the documentation for the version you have: here, Ruff 0.17.5.
```

**What else, and why not.** Where else answers come from, and what each costs:

| Source | Cost |
|---|---|
| The reference (MDN, docs.python.org, a tool's docs) | Exact and maintained; dry, and silent on cases its authors didn't think of |
| The specification (01-07-02) | The final word on what browsers and languages must do; long and formal |
| The source code (01-07-03) | The final word on what one program actually does; you have to read it |
| A question-and-answer site, a blog post, a forum | Often exactly your problem, and quick; often for another version, and sometimes wrong |
| An AI assistant | Fast, and can explain; can be confidently wrong or out of date, especially about versions newer than its training (module 1.11). Treat what it says as a lead, and confirm it in the reference |
| An experiment | The truth for your version, browser and machine; only for the case you tried |

## Your turn: capital letters

Make Blockfall's letter keys work with Shift held or Caps Lock on: `"Z"` undoes as `"z"` does, and `"P"` pauses as `"p"` does, including letting the game carry on again while it's paused. Held down, the capitals must act once per press too. Every other key must work exactly as before.

There's no file to compare with; the checks send `"Z"` and `"P"` events and press the other keys.

```hints
nudge: Find every place in the keydown code that names a letter: the ACTIONS table, the once-per-press set, and the paused test. Each one has to know about the capitals.
concept: Two ways: add entries for the capital letters (ACTIONS.Z = ACTIONS.z, the same function under a second key: functions are values, 01-05-03), or turn the key into lower case before looking it up. Lower-casing every key is the tempting one, and it breaks the arrows: "ArrowUp".toLowerCase() is "arrowup", which isn't in the table. The paused test compares event.key with "p", so "P" would be ignored while paused, and the game couldn't carry on; compare the action instead, action !== ACTIONS.p.
shape: After ACTIONS.p is defined: ACTIONS.Z = ACTIONS.z; ACTIONS.P = ACTIONS.p;. ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P"]). In the handler: if (action === undefined || (paused && action !== ACTIONS.p)) { return; }
answer: After ACTIONS.p:
~~~javascript
// With Shift or Caps Lock, a letter key's event.key is the capital letter
// (MDN: the B key gives "B" with Shift). The letters do the same either way.
ACTIONS.Z = ACTIONS.z;
ACTIONS.P = ACTIONS.p;
~~~
The set:
~~~javascript
const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P"]);
~~~
And the paused test in the handler:
~~~javascript
  if (action === undefined || (paused && action !== ACTIONS.p)) {
    return;
  }
~~~
Lower-casing only single letters (if (event.key.length === 1) …) is another valid way; lower-casing every key breaks the arrows and the drop. Forgetting the paused test leaves "P" able to pause but not to carry on.
```

```check
page blockfall/index.html "(() => { stopFalling(); for (const key of ['ArrowUp', ' ', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z' })); for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', repeat: true })); return game.pieceCount(); })()" 1 errors=none -- "Z" should undo, once per press.
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P' })); const pausedNow = paused; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); const col = game.piece()[0].col; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P' })); return [pausedNow, col, paused].join(' '); })()" "true 3 false" -- "P" should pause (the arrows then do nothing) and, pressed again, carry on.
page blockfall/index.html "(() => { stopFalling(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); return game.piece().map((c) => c.row + ':' + c.col).join(','); })()" "17:2,17:3,17:4,18:3" -- The arrow keys should work exactly as before.
```

**What these checks establish, and what they don't.** They send `"Z"` with repeats after two locks, pause and carry on with `"P"` while checking that an arrow is ignored in between, and press the arrows. They make the events in code, as a browser would for those keys, so they don't test your keyboard: press Shift+Z and Caps Lock+P yourself, with your `console.log` line if you're unsure. And they can't tell whether your keyboard layout sends something else entirely (on a French AZERTY keyboard, the key in the Z position sends `"w"`, and `KeyboardEvent.code`, which names the physical key, exists for exactly that). If that matters to you, read `code` on MDN and decide which one a game should use.

## What you can do now

- **Tutorials** teach, **how-to guides** do one task, **references** state exactly what something does, **explanations** say why. When behaviour surprises you, open the reference.
- Quote the reference, then **test it**: `new KeyboardEvent("keydown", { key: "z", repeat: true })` makes the event a held key makes.
- A reference is silent on what its authors didn't cover (Caps Lock). Fill gaps by experiment or a deeper source, never by assumption, and note what you tested on.
- Check the **version** a page describes: Python's version switcher and its "Added in version" notes, a tool's docs for your installed version, changelogs, release notes and "What's New", and the page's date.

```predict
question: A how-to article from 2021 says Ruff only reports pyflakes and a few pycodestyle errors by default, so you don't need a config file to keep it quiet. Your teammate follows it with Ruff 0.17.5 and gets dozens of findings. What went wrong, and how should they have caught it?
explain: The article was right for the Ruff of its time: the 0.8.0 docs say the default select was E4, E7, E9 and F. It's wrong for 0.17.5, whose defaults include hundreds of rules. The article had no version on its claims, and the teammate didn't check. The habit: note the date and version of what you read, check your installed version (ruff --version), and read the docs for that version, or the changelog between the two.
```

**Next:** 01-07-02 reads a standard. RFC 4180 is the short document that says what a CSV file is, and Kit gets a `csv` tool written from it, rule by rule: quoting, commas inside fields, and line breaks inside quotes, which most homemade CSV code gets wrong.
