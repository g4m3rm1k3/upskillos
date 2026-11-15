---
title: Every and Some: Quantifiers, Sets and the First Blockfall Board
runtime: none
---

A falling-block game asks one question many times a second: *can this piece move there?* The answer is a condition, but not one of the fixed-size kind from the last two lessons. A piece has several squares, and the rule is about all of them: it can move when *every* square it would cover is on the board and empty. Get the word "every" wrong and pieces slide into walls or sink through the floor. This lesson starts the course's second project, **Blockfall**, a falling-block game in JavaScript, and uses it to make "every" and "some" precise.

**By the end you can:**

- Write a condition about every member, or some member, of a collection, and negate it correctly: "not every" is "some not".
- Use a predicate, a condition with blanks such as "square (row, col) is free", inside `every` and `some`, and say what each gives for an empty collection.
- Translate between conditions and sets: AND as intersection, OR as union, NOT as complement, "every member is in S" as "is a subset of S".

**You need:** lessons 01-02-01 and 01-02-02, and a web browser. You don't need to know JavaScript: each piece is explained where it first appears. Commands run in the new `blockfall` folder.

## A second project: Blockfall

Blockfall lives beside Kit in the course folder. From the `kit` folder, go up one level and make the new folder:

```
cd ..
mkdir blockfall
cd blockfall
```

Blockfall is JavaScript because it runs in a web page, and a browser runs JavaScript and nothing else. For now it's two files: a page, and the script it loads. There's no server and no tools to install. You open the page straight from disk, as a file.

The page holds a **canvas**, a rectangle the script can draw on, 300 by 600 pixels: room for a board 10 squares wide and 20 tall, 30 pixels each. The `<script src="game.js">` line at the end loads the script after the canvas exists, so the script can find it.

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
  <script src="game.js"></script>
</body>
</html>
```

Save it and open it in your browser, from the terminal or by double-clicking the file:

| Windows | macOS | Linux |
|---|---|---|
| `start index.html` | `open index.html` | `xdg-open index.html` |

You see the title and an empty bordered rectangle. Keep the tab open; after each change you'll reload it (F5, or Cmd+R on macOS).

```check
file blockfall/index.html
page blockfall/index.html "document.getElementById('board').width" 300 -- The canvas should have id="board" and be 300 pixels wide.
```

## Draw the board

A few pieces of JavaScript, each next to its Python equivalent:

| JavaScript | Python | Note |
|---|---|---|
| `const ROWS = 20;` | `ROWS = 20` | `const` names a value that won't be reassigned; `let` names one that will. Statements end with `;` |
| `[]`, `board.push(x)` | `[]`, `board.append(x)` | An array is JavaScript's list |
| `for (let row = 0; row < ROWS; row++) { … }` | `for row in range(ROWS):` | Start; keep going while; step (`row++` adds 1). Blocks are in braces, not indented |
| `function draw() { … }` | `def draw():` | |
| `a === b`, `&&`, `\|\|`, `!` | `a == b`, `and`, `or`, `not` | Use `===`: the older `==` converts types first, so `0 == ""` is true. `&&` and `\|\|` short-circuit like Python's |

The board is an array of 20 rows, each an array of 10 numbers: 0 for an empty square, 1 for a filled one. `new Array(COLS).fill(0)` makes one row of ten zeros. Two rows at the bottom get some filled squares, with a notch in the middle, so that "empty" will mean something.

To draw, the script asks the canvas for its **2D context**, the object with the drawing commands. `fillStyle` sets the colour and `fillRect(x, y, width, height)` fills a rectangle. A square at row `row` and column `col` sits `col * SIZE` pixels from the left and `row * SIZE` from the top, and each is drawn 1 pixel smaller than its slot so the grid shows.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. 0 is an empty square, 1 a filled one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = [];
for (let row = 0; row < ROWS; row++) {
  board.push(new Array(COLS).fill(0));
}
// Some filled squares at the bottom, so that "empty" means something.
board[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
board[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1];

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
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === 1) {
        drawSquare(row, col, "#888");
      }
    }
  }
}

draw();
```

Save it and reload the page: a dark board with grey squares along the bottom, and a notch two squares wide in the bottom row.

Now open the browser's **developer console**: F12 (Cmd+Option+J in Chrome on macOS, Cmd+Option+K in Firefox), then the Console tab. It runs JavaScript inside your page, so you can ask the program questions. Type `board.length` and press Enter: `20`. Then `board[19]`: the bottom row's ten numbers. The console is also where errors appear, in red. Keep it open.

```check
page blockfall/index.html "board.length" 20 errors=none -- game.js should build 20 rows and load without errors in the console.
page blockfall/index.html "board[19].join('')" 1111001111 -- The bottom row should have its two-square notch in columns 4 and 5.
```

## A piece and a predicate

The falling piece is a list of the squares it covers. Each square is an **object**, JavaScript's equivalent of a small dictionary: `{ row: 0, col: 3 }` has properties `row` and `col`, read as `cell.row` and `cell.col`. This piece is a T: three squares across the top row and one below the middle.

Now the question. One square at a time, it's easy to say: *the square at (row, col) is on the board and empty*. That's a **predicate**, a proposition with blanks in it. It isn't true or false until you fill in a row and a column. `isFree(row, col)` is that predicate. Its order matters, as in 01-02-01: the bounds tests come first and guard `board[row][col]`, which would fail for a row that doesn't exist.

The piece's question is about all four squares at once: *for every square of the moved piece, that square is free*. A statement "for every member of a collection, P holds" is a **universal quantifier**, written ∀ in logic. JavaScript arrays have it built in: `array.every(test)` calls the test on each member and is true when every call is true. It stops at the first false, like `and`.

Two more pieces of syntax:

- `(cell) => isFree(cell.row, cell.col)` is an **arrow function**: a small function with no name, here taking `cell` and returning the result. It's what `every` calls on each member, like Python's `lambda cell: …`.
- `cells.map(f)` makes a new array of `f`'s result for each member, like `[f(c) for c in cells]`. `moved` uses it to make the squares the piece would cover after a move. The arrow function there returns an object, so the object is wrapped in round brackets: `({ row: …, col: … })`. Without them, JavaScript would read the braces as a block.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. 0 is an empty square, 1 a filled one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = [];
for (let row = 0; row < ROWS; row++) {
  board.push(new Array(COLS).fill(0));
}
// Some filled squares at the bottom, so that "empty" means something.
board[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
board[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1];

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && board[row][col] === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
function moved(cells, dRow, dCol) {
  return cells.map((cell) => ({ row: cell.row + dRow, col: cell.col + dCol }));
}

// A piece can move when every one of its moved squares is free.
function canMove(cells, dRow, dCol) {
  return moved(cells, dRow, dCol).every((cell) => isFree(cell.row, cell.col));
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
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === 1) {
        drawSquare(row, col, "#888");
      }
    }
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, "#4af");
  }
}

draw();
```

`for (const cell of piece)` loops over the array's members, like Python's `for cell in piece:`. Save and reload: a blue T at the top. In the console, ask:

```predict
question: The T covers columns 3 to 5. In the console, what does `canMove(piece, 0, -4)` give, a move of four columns left?
choice: true
choice: false
choice: An error
answer: false
explain: Four columns left puts the T's left square at column -1, off the board, so isFree is false for that square, and one false is enough to make every false. `canMove(piece, 0, -3)` is true: column 0 is the edge, still on the board.
```

Try both, and `canMove(piece, 1, 0)` (one row down: true). You're testing the predicate by hand on inputs you chose, the way 01-01-03 tested `measure`.

```check
page blockfall/index.html "canMove(piece, 0, -4)" false errors=none -- canMove should be false when any moved square is off the board.
page blockfall/index.html "canMove(piece, 0, -3)" true -- Column 0 is still on the board.
page blockfall/index.html "isFree(20, 0)" false -- isFree should test the bounds before it reads board[row][col].
```

## Moving with the keys

To move the piece, the page has to react to keys. `document.addEventListener("keydown", handler)` asks the browser to call `handler` every time a key goes down, passing an **event** whose `key` property names the key: `"ArrowLeft"`, `"ArrowRight"`, `"ArrowDown"`. The handler works out the move, moves the piece only if `canMove` says it fits, and redraws. `event.preventDefault()` stops the arrow keys from also scrolling the page.

`else { return; }` leaves the handler early for any other key, so pressing a letter does nothing.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. 0 is an empty square, 1 a filled one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = [];
for (let row = 0; row < ROWS; row++) {
  board.push(new Array(COLS).fill(0));
}
// Some filled squares at the bottom, so that "empty" means something.
board[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
board[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1];

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && board[row][col] === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
function moved(cells, dRow, dCol) {
  return cells.map((cell) => ({ row: cell.row + dRow, col: cell.col + dCol }));
}

// A piece can move when every one of its moved squares is free.
function canMove(cells, dRow, dCol) {
  return moved(cells, dRow, dCol).every((cell) => isFree(cell.row, cell.col));
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
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === 1) {
        drawSquare(row, col, "#888");
      }
    }
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, "#4af");
  }
}

// Arrow keys move the piece, but only to where it fits.
document.addEventListener("keydown", (event) => {
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

Save and reload, then click on the page so it has the keyboard. Press Left until the T stops: it stops against the left wall. Press Right, then Down until it stops. Drop it over the notch (its stem in column 4), and it settles into the notch, with its stem in the bottom row. Over a filled square it rests on top. Every one of those stops is `canMove` returning false.

```check
page blockfall/index.html "(() => { for (let i = 0; i < 10; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return Math.min(...piece.map((c) => c.col)); })()" 0 errors=none -- Pressing Left ten times should stop the piece against the left wall, at column 0.
page blockfall/index.html "(() => { for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return piece.map((c) => c.row).join(','); })()" 18,18,18,19 -- Dropped straight down, the T should settle into the notch: top at row 18, stem at row 19.
```

## The wrong quantifier

Change one word in `canMove`: `.every(` to `.some(`. The comment now lies, but the code reads plausibly: "the piece can move if some square is free". `some` is the other quantifier, coming up next. It's true when at least one member passes.

```predict
question: With `.some(`, reload and press Left about ten times. What happens to the T?
choice: It stops at the wall, as before
choice: It keeps going until only one of its squares is still on the board
choice: It wraps around to the right side
answer: It keeps going until only one of its squares is still on the board
explain: With some, a move is allowed while any one moved square is free. The T slides off the left edge, square by square, and stops only when the next move would leave no square on the board at all. Off-board squares aren't drawn, so you see a single blue square at the edge.
```

Try it. Then reload and press Down a lot. The T sinks into the grey floor and only stops with its stem below the board, at row 20. Read the evidence: the piece never overlapped anything while *every* square had to be free; it overlaps as soon as *one* free square is enough. In the console, `piece` shows the cells, columns -2 to 0 after the slide.

One word separates a correct game from a broken one, and both versions run without an error. Nothing in the console warns you. Only behaviour, or a check of it, tells them apart.

Change `.some(` back to `.every(` and reload: walls and floor hold again.

```check
page blockfall/index.html "(() => { for (let i = 0; i < 10; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); return Math.min(...piece.map((c) => c.col)); })()" 0 -- If the piece slides off the board, canMove should use .every(, not .some(.
```

## Not every means some not

Collisions are often easier to think about from the other side: *the piece is blocked if some square it would cover isn't free*. "Some member passes" is the **existential quantifier**, written ∃. In JavaScript it's `array.some(test)`, which stops at the first true, like `or`.

De Morgan's laws from 01-02-02 extend to quantifiers, because "every" is a long `and` and "some" a long `or`:

| Statement | Equivalent |
|---|---|
| not (every square is free) | some square is not free |
| not (some square is blocked) | every square is not blocked |

So `canMove` can be written as "not blocked", with `isBlocked` saying what a collision is:

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. 0 is an empty square, 1 a filled one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = [];
for (let row = 0; row < ROWS; row++) {
  board.push(new Array(COLS).fill(0));
}
// Some filled squares at the bottom, so that "empty" means something.
board[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
board[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1];

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && board[row][col] === 0;
}

// The piece's squares after a move of dRow rows down and dCol columns right.
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
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === 1) {
        drawSquare(row, col, "#888");
      }
    }
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, "#4af");
  }
}

// Arrow keys move the piece, but only to where it fits.
document.addEventListener("keydown", (event) => {
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

Save and reload; the game plays exactly as before. Prove the rewrite as 01-02-02 did, over every case. A move is fully described by its offsets, so try every offset from 3 rows up to 22 down and 4 columns left to 13 right, which covers every position on and around the board, and count disagreements between the old `every` form and the new `canMove`. Paste this into the console. (The first time you paste into the console, Chrome and Firefox refuse and ask you to type `allow pasting` first: a guard against people being tricked into pasting code they don't understand. Read what you paste.)

```
(() => { let differ = 0; for (let r = -3; r < 23; r++) for (let c = -4; c < 14; c++) { const old = moved(piece, r, c).every((cell) => isFree(cell.row, cell.col)); if (old !== canMove(piece, r, c)) differ++; } return differ; })()
```

It's an arrow function called on the spot, `(() => { … })()`, so its loops can run in one line. It returns `0`.

**Empty collections.** What should `every` and `some` say about an empty array? In the console, `[].every((x) => false)` is `true` and `[].some((x) => true)` is `false`, the same as Python's `all([])` and `any([])` in 01-02-02. "Every member passes" can only be false if some member fails, and an empty array has none, so it's **vacuously true**. Here that means a piece with no squares could move anywhere. That's harmless, but it's the same fact that broke `filter`'s empty `--none` group, and it will turn up again.

**Sets.** Every condition here has a twin in the language of sets. Call F the set of free squares, the squares that are on the board (set B) *and* empty (set E). AND is **intersection**: F = B ∩ E. OR is **union**, and NOT is **complement**, everything outside a set. Then "every moved square is free" says the moved squares form a **subset** of F, and "some moved square isn't free" says they **intersect** F's complement. De Morgan's laws hold for sets too: the complement of A ∩ B is the complement of A ∪ the complement of B. Kit's `filter` is the same: `--all a b` asks whether {a, b} is a subset of the line's terms, and `--none` whether the two sets are **disjoint**, sharing nothing.

```check
page blockfall/index.html "(() => { let differ = 0; for (let r = -3; r < 23; r++) for (let c = -4; c < 14; c++) { const old = moved(piece, r, c).every((cell) => isFree(cell.row, cell.col)); if (old !== canMove(piece, r, c)) differ++; } return differ; })()" 0 errors=none -- canMove should be !isBlocked, and isBlocked should use .some( with !isFree.
page blockfall/index.html "typeof isBlocked" function -- Add an isBlocked function.
```

## Your turn: show when the piece has landed

A piece has **landed** when it can't move down any further. Add a function `isLanded(cells)` that says so, and draw a landed piece in a different colour (say `"#fa4"`, orange), so the player sees it settle.

- Write `isLanded` directly from a quantified sentence of your own, using `some` or `every`, *without calling `canMove` or `isBlocked`*. Write the sentence in a comment above it first.
- Then check in the console that it agrees with `!canMove(cells, 1, 0)` at every offset, with a loop like the one in the last step.
- In `draw`, choose the piece's colour with `isLanded(piece)`.

```hints
nudge: Which squares does the piece need to look at to know it can't go down? And does one bad square make it landed, or do all of them have to be bad?
concept: It has landed when some square directly below one of its squares isn't free: one blocked square below is enough, so it's an existential, some, with not free inside. Negate it with De Morgan and you get "every square below is free", which is the condition for not landed.
shape: function isLanded(cells) returns cells.some((cell) => !isFree(cell.row + 1, cell.col)). In draw, before the loop over the piece: let color = "#4af"; if (isLanded(piece)) { color = "#fa4"; } and use color in drawSquare. For the console check, replace the comparison in the loop with isLanded(moved(piece, r, c)) !== !canMove(moved(piece, r, c), 1, 0).
answer: The function, under isBlocked:
~~~javascript
// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
}
~~~
and in draw:
~~~javascript
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
~~~
The console check returns 0. A tempting mistake is every instead of some ("it has landed when every square below is blocked"): the T would then count as landed only when all four squares below it are blocked, which happens almost never, so it would stay blue on the floor.
```

```check
page blockfall/index.html "isLanded(piece)" false errors=none -- At the start the T is in the air: isLanded(piece) should be false.
page blockfall/index.html "(() => { for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return isLanded(piece); })()" true -- After it drops, isLanded(piece) should be true.
page blockfall/index.html "(() => { let differ = 0; for (let r = -3; r < 23; r++) for (let c = -4; c < 14; c++) { const cells = moved(piece, r, c); if (isLanded(cells) !== !canMove(cells, 1, 0)) differ++; } return differ; })()" 0 -- isLanded(cells) should agree with !canMove(cells, 1, 0) everywhere.
```

**What these checks establish, and what they don't.** They ask `isLanded` about the starting T, about the T after it drops, and at 468 offsets, comparing it with `!canMove(cells, 1, 0)`. They don't look at the colour on screen, so reload and watch it change yourself, and they don't check that you wrote `isLanded` without calling `canMove`. If you did call it, the comparison is tautological, in the sense of 01-02-02: it compares a function with itself. They also try only the T. A piece of another shape, such as an L, has different squares below it; try defining one in the console and asking `isLanded` about it.

## What you can do now

- A **predicate** is a proposition with blanks: `isFree(row, col)`. A **quantifier** turns it into a statement about a whole collection: **every** (∀, `every`, `all`) or **some** (∃, `some`, `any`).
- "Not every member passes" is "some member fails", and "not some" is "every not". Quantifiers obey De Morgan because they are long ANDs and ORs.
- Over an empty collection, `every` is true and `some` is false. Decide deliberately whether that's what your rule should say.
- Conditions and sets are two notations for one idea: AND is intersection, OR union, NOT complement; "every member is in S" is a subset test; "none is in S" means disjoint.
- In a browser, the developer console lets you ask a running page questions: the fastest way to test a predicate by hand.

```predict
question: A code review shows this permission check: `user.roles.some((role) => role.canDelete)`. The specification says "a user may delete only if none of their roles forbids it", and a role has a `forbidsDelete` flag. Is the code right? If not, what should it be?
explain: No. The specification is a "none", a universal: every role does not forbid deletion, which is `user.roles.every((role) => !role.forbidsDelete)`, or by De Morgan `!user.roles.some((role) => role.forbidsDelete)`. The code answers a different question, whether some role grants deletion. Check the empty case too: a user with no roles may delete under "none forbids it", vacuously, and that may not be what the authors meant, which is worth raising in review.
```

**Next:** lesson 01-02-04 finishes logic: every condition can be written in two standard shapes, `filter`'s query is already one of them, and a brute-force search answers "can this query match any line at all?".
