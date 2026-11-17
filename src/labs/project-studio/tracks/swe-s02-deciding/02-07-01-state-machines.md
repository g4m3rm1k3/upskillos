---
title: "State Machines: States, Events and Guards"
runtime: none
---

Stack Blockfall's pieces in the middle, Up then Space, thirteen times. On the thirteenth, the next piece has no room at the top, and the game stops with `Game.lockPiece: postcondition broken: square 0,3 overlaps a filled square`. The contract from 02-06-01 is right to stop it: the game has reached a situation its code doesn't describe. Blockfall knows how to play, and, since 01-05-03, how to be paused (a `paused` flag, and an `if` in the key handler). It has no idea how to *end*, or how to begin. Each of those is a **state**, and a program that handles states with scattered flags and `if`s gets them wrong in the gaps between: a key that works while paused, a timer that runs on after the end. This lesson writes Blockfall's states down as a **state machine**: a table of every state, every event, and where each event leads, with **guards** for the choices. Then the game runs from the table.

**By the end you can:**

- Describe a program's behaviour as states, events, transitions, guards and actions, with an initial state and terminal states.
- Write a transition table, and drive a program from it.
- Tell a Moore machine (what's shown depends on the state) from a Mealy machine (what's done depends on the transition).
- Test a state machine's transitions directly.

**You need:** 01-01-04 (a program as a state machine), 01-05-03 (Blockfall's keys and timer), 02-06-01 (`contracts.js`). Blockfall is opened from disk and reloaded after each change.

## A game with no idea it's over

Reload `index.html` and try it: Up, Space, thirteen times. The console shows the broken rules and the contract, and the board stops redrawing.

```predict
question: Where does Blockfall's code decide that the game is over?
choice: In Game.lockPiece
choice: In the key handler
choice: Nowhere
answer: Nowhere
explain: There's no code for it at all: lockPiece always makes a new piece, even when it overlaps the stack, and the contract catches the result. "Over" isn't a value anything holds, so nothing can check for it. A situation the program doesn't name is one it can't handle; naming it is the first step.
```

## States, events, transitions

A **state machine** (01-01-04) has:

- **States**: the situations the program can be in, exactly one at a time. Blockfall: `menu`, `playing`, `paused`, `clearing` (rows just cleared, shown for a moment), `over`.
- **Events**: things that happen: a key (`start`, `pause`, `lock`, `move`), or a timer (`cleared`).
- **Transitions**: in this state, on this event, go to that state.
- **Guards**: conditions that choose between transitions for the same event. Locking in `playing` can lead to `over`, `clearing` or `playing`, depending on what the lock does.
- **Actions**: what's done along the way (lock the piece, start a new game).
- An **initial** state (`menu`) and, here, one state that's **terminal** for a game: in `over`, nothing happens except starting again.

Write it as a table. Create `states.js` in `blockfall`:

```js file=blockfall/states.js
// Blockfall's game as a state machine. The game is always in exactly one of
// these states; an event either moves it to a state (perhaps the same one)
// or is ignored.
const STATES = ["menu", "playing", "paused", "clearing", "over"];
const INITIAL_STATE = "menu";

// Every move the game can make: [state, event, guard, next state]. The
// first row whose state and event match, and whose guard is null or true,
// decides, so the order of the lock rows matters. An event with no row in a
// state is ignored there. This table is the whole rule.
const TRANSITIONS = [
  ["menu", "start", null, "playing"],
  ["playing", "move", null, "playing"],
  ["playing", "pause", null, "paused"],
  ["paused", "pause", null, "playing"],
  ["playing", "lock", "blocksNext", "over"],
  ["playing", "lock", "clearsRows", "clearing"],
  ["playing", "lock", null, "playing"],
  ["clearing", "cleared", null, "playing"],
  ["over", "start", null, "playing"],
];

// The state an event leads to, or null if this state ignores it. facts
// holds the guards' answers, worked out when the event happens.
function nextState(state, event, facts = {}) {
  for (const [from, on, guard, to] of TRANSITIONS) {
    if (from === state && on === event && (guard === null || facts[guard] === true)) {
      return to;
    }
  }
  return null;
}

// What a lock would do, worked out without doing it: the facts its guards
// need. Pure, from rules.js's functions: lock a copy, clear it, and see
// whether the next piece would fit at the top.
function lockFacts(board, piece, shape) {
  if (!isLanded(board, piece)) {
    return { clearsRows: false, blocksNext: false };
  }
  const locked = board.slice();
  lock(locked, piece);
  const result = clearFullRows(locked);
  const next = newPiece(nextShape(shape));
  return {
    clearsRows: result.cleared > 0,
    blocksNext: !next.every((cell) => isFree(result.board, cell.row, cell.col)),
  };
}
```

`TRANSITIONS` is the whole behaviour, in nine rows: anything not in it is **ignored**, so in `paused` the arrows do nothing and in `over` only `start` does anything, without a single `if` saying so. The lock rows are in order, and the order is a decision: a lock that both clears rows *and* leaves no room for the next piece ends the game, because the `blocksNext` row comes first. `nextState` reads the table: the first row that matches the state and event, and whose guard holds. It's a pure function, so every transition can be tested directly.

The guards' answers come from `lockFacts`, which works out what a lock *would* do without doing it: lock a copy of the board, clear it, and see whether the next piece fits at the top. That's what keeps `Game.lockPiece` from ever being called when the result would break the rules. The decision happens before the change.

Two classic names for two halves of this. In a **Moore** machine the output depends only on the state: "Paused" is on the screen whenever the state is `paused`, however it got there. In a **Mealy** machine the output belongs to the transition: locking the piece happens on the `playing → clearing` and `playing → playing` transitions, starting a new game on `over → playing`. Blockfall will be both, and the code will show which is which.

## Loading the machine

`states.js` uses `rules.js`'s functions and is used by `game.js`, so it loads between them. In `index.html`, add this line just before `<script src="game.js"></script>`:

```
  <script src="states.js"></script>
```

In `tests.html`, add it just before `<script src="contracts.js"></script>`. Save both. Reload `index.html`: nothing has changed yet, since `game.js` doesn't use the machine.

```check
contains blockfall/index.html "states.js" -- index.html should load states.js, before game.js.
contains blockfall/tests.html "states.js" -- tests.html should load states.js.
page blockfall/tests.html "[nextState('menu', 'start') === 'playing', nextState('over', 'move') === null, testResults.failed]" [true,true,0] errors=none -- The machine should load on the tests page, and every test still pass.
```

## Tests for the machine

Test the table before anything runs from it. Add these to the end of `blockfall/tests.js`:

```js edit=blockfall/tests.js mode=append

// The game's states (states.js).
test("Enter starts a game from the menu, and p pauses and carries on", () => {
  assertEqual([nextState("menu", "start"), nextState("playing", "pause"), nextState("paused", "pause")], ["playing", "paused", "playing"]);
});

test("a state ignores the events it has no transition for", () => {
  assertEqual([nextState("menu", "move"), nextState("paused", "move"), nextState("over", "lock"), nextState("clearing", "pause")], [null, null, null, null]);
});

test("a lock that leaves no room for the next piece ends the game, even if it clears rows", () => {
  assertEqual(nextState("playing", "lock", { clearsRows: true, blocksNext: true }), "over");
});

test("lockFacts sees a lock that clears a row, without changing the board", () => {
  const board = newBoard();
  board[19] = FULL & ~(1 << 4);
  const piece = [16, 17, 18, 19].map((row) => ({ row: row, col: 4 }));
  const before = board.slice();
  assertEqual([lockFacts(board, piece, "I"), board], [{ clearsRows: true, blocksNext: false }, before]);
});
```

The first two tests read the table like a person checking it: starting and pausing go where they should, and states ignore events they have no row for. The third pins down the guard order. The fourth builds a board with a one-square gap in the bottom row and an upright I above it, and checks that `lockFacts` sees the clear coming and leaves the board unchanged. Reload `tests.html`: `32 passed, 0 failed`.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [32,0] errors=none -- With the four machine tests, all 32 should pass.
```

## The game, driven by the table

Now let the table run the game. Replace `game.js` with:

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
  #score;

  constructor() {
    this.#board = newBoard();
    this.#shape = "T";
    this.#piece = newPiece(this.#shape);
    this.#held = null;
    this.#canHold = true;
    this.#history = [];
    this.#cleared = 0;
    this.#score = 0;
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
      this.#history.push({ board: this.#board.slice(), piece: this.#piece, cleared: this.#cleared, score: this.#score });
      lock(this.#board, this.#piece);
      const result = clearFullRows(this.#board);
      this.#board = result.board;
      this.#cleared += result.cleared;
      this.#score += scoreFor(result.cleared);
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

  // The points scored since the game began (SCORING.md).
  score() {
    return this.#score;
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
      this.#cleared = saved.cleared;
      this.#score = saved.score;
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

let game = startingGame();

// The game's state (states.js), and how long the board shows cleared rows.
let state = INITIAL_STATE;
const CLEAR_MS = 300;

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
  context.fillText("Score: " + game.score(), 8, 96);
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
  // What's shown depends only on the state: the Moore part of the machine.
  const MESSAGES = { menu: "Press Enter to start", paused: "Paused", clearing: "Cleared!", over: "Game over: Enter for a new game" };
  if (state in MESSAGES) {
    context.fillStyle = "#ff0";
    context.fillText(MESSAGES[state], 8, 300);
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

// Start the piece falling one row every ms milliseconds. The timer keeps
// running; it moves the piece only while the game is playing. Returns a
// function that stops it.
function startFalling(ms) {
  const timer = setInterval(() => {
    if (state === "playing") {
      game.move(1, 0);
      draw();
    }
  }, ms);
  return () => clearInterval(timer);
}

startFalling(FALL_MS);

// With Shift or Caps Lock, a letter key's event.key is the capital letter
// (MDN: the B key gives "B" with Shift). The letters do the same either way.
ACTIONS.Z = ACTIONS.z;
ACTIONS.X = ACTIONS.x;
ACTIONS.C = ACTIONS.c;
ACTIONS.S = ACTIONS.s;

// Keys that do something once per press. Held down, a key repeats its
// keydown event, with event.repeat set to true (MDN, KeyboardEvent.repeat);
// moving should repeat, but locking, undoing and pausing shouldn't.
const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P", "x", "X", "c", "C", "s", "S"]);

// The event a key stands for: Enter starts, p pauses, Space locks, and every
// other key with an action moves the game along. Keys without one are null.
function eventFor(key) {
  if (key === "Enter") {
    return "start";
  }
  if (key === "p" || key === "P") {
    return "pause";
  }
  if (key === " ") {
    return "lock";
  }
  return ACTIONS[key] === undefined ? null : "move";
}

// An event: ask the machine where it leads; if anywhere, go there and do what
// that transition does (the Mealy part: actions belong to transitions).
function handle(event, key) {
  const facts = event === "lock" ? lockFacts(game.board(), game.piece(), game.shape()) : {};
  const from = state;
  const to = nextState(from, event, facts);
  if (to === null) {
    return;
  }
  state = to;
  if (event === "start" && from === "over") {
    game = new Game();
  } else if (event === "lock" && to !== "over") {
    game.lockPiece();
  } else if (event === "move") {
    ACTIONS[key]();
  }
  if (to === "clearing") {
    setTimeout(() => {
      handle("cleared");
      draw();
    }, CLEAR_MS);
  }
  if (game.clearedCount() > best) {
    best = game.clearedCount();
    saveBest(best);
  }
}

document.addEventListener("keydown", (event) => {
  const name = eventFor(event.key);
  if (name === null) {
    return;
  }
  event.preventDefault();
  if (event.repeat && ONCE_PER_PRESS.has(event.key)) {
    return;
  }
  handle(name, event.key);
  draw();
});

draw();
```

What changed, from the top. `game` is a `let`, since starting again makes a new one, and `state` begins at `INITIAL_STATE`. `draw` ends with the **Moore** part: a message chosen by the state alone. The timer no longer stops and starts: it ticks always, and moves the piece only while the state is `playing`, so pausing is just being in another state. The `paused` flag and `ACTIONS.p` are gone. `eventFor` turns a key into an event. `handle` is the whole engine: work out the facts (only a lock needs any), ask `nextState`, and if the event leads somewhere, go there and do the **Mealy** part, the action that belongs to this transition: a new game when starting from `over`, the lock itself unless the lock ends the game, the key's action for a move. Entering `clearing` sets a timer that sends `cleared` 300 milliseconds later.

Reload `index.html`. It says "Press Enter to start", and the arrows do nothing until you press Enter. Play; p pauses and carries on. Then stack pieces in the middle, Up then Space, until there's no room: "Game over: Enter for a new game", with no broken rules in the console, and Enter starts again.

Commit, in `blockfall`:

```
git add states.js game.js index.html tests.html tests.js
git commit -m "Run the game from a state machine: menu, playing, paused, clearing, over"
```

```check
page blockfall/index.html "(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return [state === 'menu', game.piece()[0].row]; })()" [true,0] errors=none -- The game should start in the menu, which ignores the arrows.
page blockfall/index.html "(() => { for (const key of ['Enter', 'p', 'ArrowDown']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); const paused = [state === 'paused', game.piece()[0].row]; for (const key of ['p', 'ArrowDown']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [paused, state === 'playing', game.piece()[0].row]; })()" [[true,0],true,1] errors=none -- Enter should start, p pause (ignoring the arrows) and carry on.
page blockfall/index.html "(() => { for (let i = 0; i < 13; i++) for (const key of ['ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); const before = state; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); for (let i = 0; i < 13; i++) for (const key of ['ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); const over = [state === 'over', game.pieceCount()]; document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); const still = [state === 'over', game.pieceCount()]; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return [before === 'menu', over, still, state === 'playing', game.pieceCount()]; })()" [true,[true,12],[true,12],true,0] errors=none -- With no room for the next piece the game should be over, with no broken rules, ignore keys, and start a new game on Enter.
page blockfall/index.html "(() => { for (const key of ['Enter', 'ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'ArrowDown', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); const clearing = [state === 'clearing', game.score()]; handle('cleared'); return [clearing, state === 'playing']; })()" [[true,100],true] errors=none -- A lock that clears a row should go to clearing, and the cleared event back to playing.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('TRANSITIONS' in git('show', 'HEAD:states.js').stdout, 'let paused' not in git('show', 'HEAD:game.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit the machine, game.js (with no paused flag left), the pages and the tests.
```

**What else, and why not.** You could keep the flags: `paused`, `over`, `inMenu`, each tested where it matters. With five states that's five flags and the combinations nobody meant (paused *and* over?), each handled, or not, by whichever `if` someone remembered; the table has no combinations, because the state is one value. You could use the **State pattern**: a class per state, each with methods for the events; it scales better when each state has a lot of its own behaviour, and 02-07-02 compares the two. You could draw the machine first as a diagram, which is a fine way to design it; the table is the diagram in a form the program can run and a test can read.

## Your turn: back to the menu

Add one transition: in `paused`, Escape (`event.key` is `"Escape"`) goes back to the menu, as `quit`. From the menu, Enter then carries on **the same game**, since starting from the menu doesn't make a new one. That should take one row in `TRANSITIONS` and one line in `eventFor`. Add a test for it to `tests.js`, reload both pages, and commit `states.js`, `game.js` and `tests.js`.

```hints
nudge: Where does the machine decide what an event does? And where does a key become an event?
concept: A new behaviour is a new row: ["paused", "quit", null, "menu"]. The key needs an event name, so eventFor returns "quit" for "Escape". Nothing else changes: handle already does nothing special for quit, and menu → playing on start keeps the game, because only over → playing makes a new one. Everywhere else, quit is ignored, because no other state has a row for it.
shape: In states.js, after ["paused", "pause", null, "playing"], add ["paused", "quit", null, "menu"]. In game.js's eventFor, before the last line: if (key === "Escape") { return "quit"; }. In tests.js: test("Escape from paused goes to the menu", () => { assertEqual([nextState("paused", "quit"), nextState("playing", "quit")], ["menu", null]); });
answer: In states.js, add after the paused → playing row:
~~~javascript
  ["paused", "quit", null, "menu"],
~~~
In game.js, in eventFor, before the final return:
~~~javascript
  if (key === "Escape") {
    return "quit";
  }
~~~
In tests.js:
~~~javascript
test("Escape from paused goes to the menu, and nowhere else", () => {
  assertEqual([nextState("paused", "quit"), nextState("playing", "quit"), nextState("over", "quit")], ["menu", null, null]);
});
~~~
Then, in blockfall, git add states.js game.js tests.js and git commit -m "Let Escape go back to the menu from paused". The tempting slip is handling Escape in the key handler with an if (state === "paused"), outside the table: it works, and the table no longer tells the whole story.
```

```check
page blockfall/tests.html "[nextState('paused', 'quit') === 'menu', nextState('playing', 'quit') === null, nextState('over', 'quit') === null]" [true,true,true] errors=none -- quit should lead from paused to the menu, and be ignored everywhere else.
page blockfall/index.html "(() => { for (const key of ['Enter', 'ArrowUp', ' ', 'p', 'Escape']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); const menu = [state === 'menu', game.pieceCount()]; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return [menu, state === 'playing', game.pieceCount()]; })()" [[true,1],true,1] errors=none -- Escape while paused should go to the menu, and Enter carry on the same game.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [33,0] errors=none -- With your test, all 33 should pass.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('quit' in git('show', 'HEAD:states.js').stdout, 'Escape' in git('show', 'HEAD:game.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit states.js, game.js and tests.js.
```

**What these checks establish, and what they don't.** They check that the table's transitions are the intended ones, that ignored events are ignored, that the guard order ends a game before clearing, that `lockFacts` predicts without changing anything, and that the running game follows the table: the menu, pausing, the end with no broken rules, a new game, clearing and back. They don't wait for the 300 milliseconds of `clearing` to pass (the check sends `cleared` itself), and they can't tell you that the states are the right ones: whether "clearing" should block keys, or a game over should go back to the menu. Those are design decisions, and the table is where they're now written down for anyone to question.

## What you can do now

- A **state machine**: one current **state**; **events**; **transitions** from state to state; **guards** choosing between transitions; **actions** along the way; an **initial** state and **terminal** ones.
- A **transition table** makes the behaviour one piece of data: what's not in it is **ignored**, and the order of guarded rows is a decision.
- Decide **before** changing: work out a transition's facts first (`lockFacts`), so the change never has to be undone.
- **Moore**: output from the state (what's drawn). **Mealy**: output from the transition (what's done).
- Drive the program from the table, and test the table directly.

**Next:** 02-07-02 goes further with machines: hierarchical states, state explosion, making illegal states unrepresentable, a table versus the State pattern, and testing every pair of state and event. Ledger's transactions get a lifecycle: pending, cleared, reconciled.
