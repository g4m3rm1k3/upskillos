---
title: Bits as Switches: Masks, Flags, Parity and a Board Made of Numbers
runtime: none
---

Blockfall's board is 20 arrays of 10 numbers, and each number is 0 or 1. That's a lot of machinery for very little information: each square answers one yes-or-no question, filled or empty, which is exactly one bit. A row is ten bits, and 01-03-01 showed that ten bits *are* a number. Store each row as one number and the question a falling-block game asks every time a piece lands, "is this row full?", stops being ten checks and becomes one comparison. This lesson teaches the operators that work on a number's bits directly. They're how file formats, network protocols and file permissions pack yes-or-no facts together, and how a single extra bit can catch a corrupted byte.

**By the end you can:**

- Predict what `&`, `|`, `^`, `~`, `<<` and `>>` give for small numbers, bit by bit.
- Use a mask to test, set, clear or flip one bit, and read a number as a set of flags or as fields of bits.
- Store Blockfall's rows as numbers, check the new board against the old one over every square, and test "row is full" in one comparison.
- Say what a parity bit detects, and what it can't.

**You need:** 01-02-03 (Blockfall, and the browser's developer console) and 01-03-01 (binary, hex and place value). Commands run in `blockfall`: `cd ../blockfall` if you're still in `kit`.

## A row is ten bits

Here are the two rows at the bottom of the board, as 01-02-03 left them:

```
board[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1]
board[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]
```

Give each column a bit: column `c` is the bit worth 2ᶜ. Column 0 is the ones bit, column 1 the twos bit, column 9 the 512s bit. A filled square sets its bit. Row 18 has columns 0, 8 and 9 filled, so it's the number 1 + 256 + 512 = 769.

Now write 769 in binary, as JavaScript would: `0b1100000001`. Read it left to right and it seems to say "columns 0, 1 and 9", which is wrong. Binary is written like decimal, with the ones place on the *right*, so the rightmost digit is column 0 and the leftmost is column 9. The written number is the row in a mirror. Only the order of writing is reversed: the value, and which bit means which column, are fixed.

```predict
question: Row 19 is [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]. As a number with column c worth 2^c, what is it in binary?
choice: 0b1111001111
choice: 0b1111110000
choice: 0b0000110000
answer: 0b1111001111
explain: Columns 4 and 5 are empty and the rest are filled. Written with column 0 on the right, that's 1111 00 1111: the row is symmetric, so the mirror doesn't show. 0b0000110000 is the empty squares instead of the filled ones. In decimal it's 1023 − 16 − 32 = 975.
```

Open `blockfall/index.html` in your browser if it isn't open, and in the developer console try `(769).toString(2)`. `toString(2)` spells a number in base 2, like Python's `format(n, "b")`; the brackets round `769` stop JavaScript reading the dot as a decimal point. It shows `'1100000001'`. Then try `0b1111001111`: `975`.

```check
page blockfall/index.html "[(769).toString(2), 0b1111001111].join(' ')" "1100000001 975" errors=none -- 769 is 1100000001 in binary, and 0b1111001111 is 975.
```

## Five operators, every bit at once

01-02-01's AND, OR, XOR and NOT worked on true and false. The **bitwise operators** apply them to every bit position of two numbers at once, column by column, with 1 for true and 0 for false. Take 12 and 10:

```
  12 = 1100              12 = 1100              12 = 1100
  10 = 1010              10 = 1010              10 = 1010
  12 & 10 = 1000 (8)     12 | 10 = 1110 (14)    12 ^ 10 = 0110 (6)
```

- `a & b`, **AND**: 1 where both have a 1.
- `a | b`, **OR**: 1 where either has a 1.
- `a ^ b`, **XOR**: 1 where they differ.
- `~a`, **NOT**: every bit flipped.
- `a << n`, **shift left**: every bit moved `n` places to the left, with 0s coming in on the right. Each place left doubles a bit's worth, so `a << n` is `a × 2ⁿ`: `12 << 1` is 24, and `1 << c` is the number with only bit `c` set.
- `a >> n`, **shift right**: every bit moved `n` places right; the bits that fall off the end are lost. `12 >> 2` is 3 (1100 becomes 11).

```predict
question: In the console, what are 12 & 3 and 12 && 3?
choice: 0 and 3
choice: 0 and true
choice: 3 and 3
choice: 0 and 0
answer: 0 and 3
explain: 12 is 1100 and 3 is 0011: they share no 1 bits, so 12 & 3 is 0. && is the logical AND from 01-02-01. It's short-circuit: 12 is truthy, so it gives back its second operand, 3. One character apart, and one says "nothing in common" while the other says "yes". Mixing them up is a common bug.
```

Try these in the console, and check each against the bits:

```
[12 & 10, 12 | 10, 12 ^ 10, 12 << 1, 12 >> 2, 12 & 3, 12 && 3]
```

It shows `[8, 14, 6, 24, 3, 0, 3]`. Now try `~12`. It's `-13`, not 3. JavaScript's bitwise operators work on 32-bit numbers, and `~` flips all 32 bits, not just the four that 12 uses. All those 1s at the top make the number negative, for reasons lesson 01-03-03 explains. When you only want some bits, AND the result with a number that has 1s just there: `~12 & 15` is `3`, because 15 is `1111`. A number used this way, to select bits, is a **mask**.

```check
page blockfall/index.html "[12 & 10, 12 | 10, 12 ^ 10, 12 << 1, 12 >> 2, 12 & 3, 12 && 3, ~12, ~12 & 15].join(' ')" "8 14 6 24 3 0 3 -13 3" -- & | ^ << >> work bit by bit; && is logical; ~ flips all 32 bits.
```

## Masks pick out bits

With a mask of one bit, `1 << n`, four operations on bit `n` of a number `x` follow from the truth tables:

| To | Write | Why |
|---|---|---|
| Test it | `(x & (1 << n)) !== 0` | AND keeps bit `n` and clears all the others; the result is 0 exactly when bit `n` was 0 |
| Set it | `x \| (1 << n)` | OR with 1 makes a 1; OR with 0 leaves a bit alone |
| Clear it | `x & ~(1 << n)` | `~` makes a mask with every bit set *except* `n`; AND with it clears bit `n` and keeps the rest |
| Flip it | `x ^ (1 << n)` | XOR with 1 flips a bit; XOR with 0 leaves it alone |

For row 18, 769: column 4 is empty, `(769 & (1 << 4)) !== 0` is `false`. Filling it, `769 | (1 << 4)`, gives 785. Emptying column 0, `769 & ~(1 << 0)`, gives 768.

A number used like this, as a row of independent yes-or-no switches, is a set of **flags**. You've met some already. In 01-03-01 octal survived for Unix file permissions. Each permission is a flag, *read* 4, *write* 2, *execute* 1, and three of them fit one octal digit, for the owner, the group and everyone else. `0o755` is `111 101 101`: the owner may read, write and execute; the others may read and execute. Is the owner's execute flag set? `0o755 & 0o100` is 64, not 0, so yes.

Several bits together can also hold a small number, a **bitfield**. The web colour `#1e90ff` from 01-03-01 is one number with three 8-bit fields: red in bits 16 to 23, green in 8 to 15, blue in 0 to 7. To read the green field, shift it down to the bottom and mask off everything above it: `(0x1e90ff >> 8) & 0xff` is 144. Shift, then mask: that's how every packed field in a file format or network header is read.

```predict
question: In 0o755, the owner's three permission bits are bits 6 to 8. What does (0o755 >> 6) & 7 give?
choice: 7
choice: 5
choice: 448
choice: 1
answer: 7
explain: Shifting right by 6 moves the owner's bits down to the bottom: 0o755 >> 6 is 0b111, 7. The mask 7 is 0b111, so it keeps those three bits and nothing else: 7, which is read, write and execute all set. Without the shift, 0o755 & 0o700 is 448, the same bits still sitting in their high places.
```

```check
page blockfall/index.html "[769 & (1 << 4), 769 | (1 << 4), 769 & ~(1 << 0), 769 ^ (1 << 9), 0o755 & 0o100, (0o755 >> 6) & 7, (0x1e90ff >> 8) & 0xff].join(' ')" "0 785 768 257 64 7 144" -- Test with &, set with |, clear with & ~, flip with ^; read a field by shifting, then masking.
```

## The board as numbers

Now give Blockfall a board of numbers. `new Array(ROWS).fill(0)` makes 20 rows, all 0, all empty. The two bottom rows are written as binary literals, column 0 on the right. `draw` tests each square's bit with the "test it" pattern. And `isFree` tests that the bit is 0, written here the way it reads in English: "the row AND the column's bit is 0". **This version has a bug. Don't look for it in the code yet: find it from the game's behaviour.**

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = new Array(ROWS).fill(0);
// Some filled squares at the bottom. Column 0 is the rightmost bit.
board[19] = 0b1111001111;
board[18] = 0b1100000001;

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && board[row] & 1 << col === 0;
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

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
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
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, "#888");
      }
    }
  }
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
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

Save it and reload the page. The grey squares are where they were, with the two-square notch in the bottom row, so `draw` reads the bits correctly. But the T at the top is **orange**, the "landed" colour, and the arrow keys don't move it at all. No error appears in the console.

```check
page blockfall/index.html "board.length + ' ' + board[18] + ' ' + board[19]" "20 769 975" errors=none -- The board should be 20 numbers; board[18] = 0b1100000001 and board[19] = 0b1111001111.
```

## A frozen piece

Read the evidence, from the outside in. The piece is orange, so `isLanded(piece)` is true. And it won't move in any direction, so `canMove` is false everywhere. Both rest on `isFree`, so ask it directly, in the console, about a square that's certainly empty:

```
isFree(0, 0)
```

It answers `0`. Not `false`: the number zero. That's the clue. A chain of `&&` gives back the last operand it evaluated, so the last part of the condition produced a number, and a comparison such as `=== 0` would have produced `true` or `false`. So the `=== 0` didn't run where it was meant to.

It's **operator precedence**: which operator takes its operands first when there are no brackets, as `*` goes before `+`. In JavaScript, `===` comes *before* `&`, and `<<` before both. (C and Java do the same with their `==`.) So the line was read as:

```
board[row] & ((1 << col) === 0)
```

`(1 << col) === 0` is `false`, because `1 << col` is never 0, and `board[row] & false` treats `false` as 0, so the result is always 0. Every square on the board is "not free". `draw` worked because its line has brackets: `(board[row] & (1 << col)) !== 0`. (Python orders these the other way, with comparisons after `&`, so `x & 1 == 0` does what it says there. Moving between languages is exactly when this bites.)

The fix is the brackets. Change `isFree`'s last line:

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = new Array(ROWS).fill(0);
// Some filled squares at the bottom. Column 0 is the rightmost bit.
board[19] = 0b1111001111;
board[18] = 0b1100000001;

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
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

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
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
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, "#888");
      }
    }
  }
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
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

Save and reload: the T is blue and moves again, and dropped straight down it settles into the notch, as in 01-02-03.

"It plays the same" is a weak claim, though. Prove the new board answers exactly as the old one did. This builds the old board of arrays in the console and compares the two `isFree`s on every square, and on a margin of two squares all round it. Paste it into the console. (The first time you paste into the console, Chrome and Firefox refuse and ask you to type `allow pasting` first: a guard against people being tricked into pasting code they don't understand. Read what you paste.)

```
(() => {
  const old = [];
  for (let r = 0; r < 20; r++) old.push(new Array(10).fill(0));
  old[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1];
  old[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1];
  let differ = 0;
  for (let r = -2; r < 22; r++) {
    for (let c = -2; c < 12; c++) {
      const was = r >= 0 && r < 20 && c >= 0 && c < 10 && old[r][c] === 0;
      if (was !== isFree(r, c)) differ++;
    }
  }
  return differ;
})()
```

It returns `0`. (`(() => { … })()` is a function defined and called at once, so its names don't stay behind in the console.) With the unbracketed version it returns 200, every square on the board, because the old `isFree` said `true` or `false` and the broken one said `0`, and `!==` treats a number and a boolean as different.

```check
page blockfall/index.html "(() => { const old = []; for (let r = 0; r < 20; r++) old.push(new Array(10).fill(0)); old[19] = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]; old[18] = [1, 0, 0, 0, 0, 0, 0, 0, 1, 1]; let differ = 0; for (let r = -2; r < 22; r++) for (let c = -2; c < 12; c++) { const was = r >= 0 && r < 20 && c >= 0 && c < 10 && old[r][c] === 0; if (was !== isFree(r, c)) differ++; } return differ; })()" 0 errors=none -- isFree needs brackets: (board[row] & (1 << col)) === 0. Without them, === runs before &.
page blockfall/index.html "(() => { for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return piece.map((c) => c.row).join(','); })()" 18,18,18,19 -- Dropped straight down, the T should still settle into the notch.
page blockfall/index.html "canMove(piece, 0, -4)" false -- The walls should still stop the piece.
```

## A full row is one comparison

A full row has all ten bits set: `0b1111111111`, 1023. Rather than type ten 1s, build it: `1 << COLS` is a 1 followed by ten 0s, 1024, and subtracting 1 turns it into ten 1s, the way 1000 − 1 is 999. Then "is this row full?" is `board[row] === FULL`. The arrays needed `board[row].every((square) => square === 1)`, ten checks; this is one.

`draw` now shows a full row in a lighter grey, so you can see it happen:

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = new Array(ROWS).fill(0);
// Some filled squares at the bottom. Column 0 is the rightmost bit.
board[19] = 0b1111001111;
board[18] = 0b1100000001;

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
  return board[row] === FULL;
}

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
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

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
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
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
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

```predict
question: The bottom row, 0b1111001111, is missing columns 4 and 5. What single number, ORed into it, fills the notch?
choice: 0b110000 (48)
choice: 0b1100 (12)
choice: 0b0000110000 (768)
choice: 0b11 (3)
answer: 0b110000 (48)
explain: Columns 4 and 5 are the bits worth 16 and 32, so the mask is 16 + 32 = 48, which is 0b110000: a 1 in the fifth and sixth places from the right. (1 << 4) | (1 << 5) builds the same number. 768 is the bits for columns 8 and 9, already filled; reading the binary left to right gives that mistake.
```

Save and reload, then fill the notch from the console and redraw:

```
board[19] = board[19] | 0b110000; draw(); [board[19], isRowFull(19)]
```

It shows `[1023, true]`, and the bottom row turns light grey. Reload to get the notch back.

```check
page blockfall/index.html "[FULL, isRowFull(19), (() => { board[19] = board[19] | 0b110000; return isRowFull(19); })()].join(' ')" "1023 false true" errors=none -- FULL should be (1 << COLS) - 1, and isRowFull(row) should compare board[row] with it.
```

**What else, and why not.** Bits aren't the only way to store a board:

| Board as | Cost |
|---|---|
| Arrays of 0 and 1 (01-02-03) | Easy to read and print; "row full" checks every square; a number per square |
| One number per row (now) | "Row full" is one comparison and a row copies as one value; reading it needs bit operations, and the mirror-image binary takes care. JavaScript's bitwise operators use 32 bits, and `1 << 31` is already negative (`-2147483648`), so rows wider than 31 columns would break it. Worse, `1 << 32` is `1`, not an error: JavaScript keeps only the last five bits of a shift count. |
| A `Set` of `"row,col"` strings | Only filled squares stored; good for huge, mostly empty boards; "row full" means looking up every square |
| `BigInt` rows (`1n << 40n`) | No width limit, but slower, and can't be mixed with ordinary numbers |

For a board ten wide, numbers win. Line clearing (module 1.9) will lean on them: removing a full row is deleting one number from an array.

## Parity: one bit that checks the rest

Bits get corrupted. A scratch on a disk, noise on a cable or a cosmic ray can flip one bit, and the data looks just as valid as before. The oldest defence is **parity**. Count the 1 bits; the parity is 0 if the count is even and 1 if it's odd. Store or send that one extra bit with the data. The receiver counts again: if the parity doesn't match, something flipped. Early serial links sent 7-bit ASCII characters with a parity bit as the eighth bit of each byte.

To count bits, look at the lowest one with `n & 1` (it's 1 or 0), add it, then shift `n` right so the next bit becomes the lowest. When no 1 bits are left, `n` is 0. Add these two functions after `isRowFull`; nothing in the game uses them yet, they're for the console.

```javascript file=blockfall/game.js
// The board: 20 rows of 10 squares. Each row is one number: bit c is
// column c, 1 for a filled square and 0 for an empty one.
const ROWS = 20;
const COLS = 10;
const SIZE = 30; // pixels per square

const board = new Array(ROWS).fill(0);
// Some filled squares at the bottom. Column 0 is the rightmost bit.
board[19] = 0b1111001111;
board[18] = 0b1100000001;

// A row with every square filled: ten 1 bits. 1 << COLS is a 1 followed by
// ten 0s, and subtracting 1 turns it into ten 1s, as 1000 - 1 is 999.
const FULL = (1 << COLS) - 1;

// Is every square in the row filled? One comparison, not ten.
function isRowFull(row) {
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

// The falling piece: the squares it covers. This one is a T.
let piece = [
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 1, col: 4 },
];

// Is the square at (row, col) on the board and empty?
function isFree(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
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

// A piece has landed when some square right below one of its squares isn't free.
function isLanded(cells) {
  return cells.some((cell) => !isFree(cell.row + 1, cell.col));
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
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  let color = "#4af";
  if (isLanded(piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
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

Save and reload. Row 18, 769, has three filled squares, so `countBits(769)` is `3` and `parity(769)` is `1`. Now play the corrupted cable: flip one bit with `^` and recount.

```predict
question: parity(769) is 1. What will parity(769 ^ (1 << 4)) and parity(769 ^ (1 << 4) ^ (1 << 7)) give: one flipped bit, then two?
choice: 0, then 1
choice: 0, then 0
choice: 1, then 1
answer: 0, then 1
explain: Flipping one bit changes the count of 1s by one, from 3 to 4, so the parity changes to 0 and the corruption is caught. Flipping a second bit changes the count by one again, to 5, and the parity is back to 1: it matches the stored parity, and two errors pass as no error. Parity detects any odd number of flipped bits and misses any even number, and it can never say which bit flipped.
```

Try both in the console. That limit is why parity is only the first step: error-correcting codes in memory and storage use several check bits, each covering a different group of bits, so they can find which bit flipped and flip it back.

XOR has one more property worth knowing: `x ^ k ^ k` is `x` again, since flipping the same bits twice undoes them. `5 ^ 3 ^ 3` is `5`. Disk arrays use it: store the XOR of several disks on one more disk, and if any one disk dies, XORing the survivors with the parity disk rebuilds it.

One warning about `countBits`: don't give it a negative number, such as `~0`. `>>` copies the top bit in as it shifts, so a negative number stays negative, never reaches 0, and the loop never ends; the tab freezes. 01-03-03 explains why negative numbers have a 1 at the top.

```check
page blockfall/index.html "[countBits(769), parity(769), parity(769 ^ (1 << 4)), parity(769 ^ (1 << 4) ^ (1 << 7)), countBits(FULL), countBits(0)].join(' ')" "3 1 0 1 10 0" errors=none -- countBits should add n & 1 and shift n right until it's 0; parity is countBits(n) % 2.
```

## Your turn: lock the piece in place

So far the T can land but never stays. Make the space bar lock it:

- When the piece has landed, Space copies its squares into the board, setting each square's bit, and a new T appears at the top.
- While the piece is still in the air, Space does nothing.
- Locking a square that is already filled must leave it filled. (The game never does this, but `lock` shouldn't depend on that.)

Write it as a function `lock(cells)`, which sets the board's bits for a list of squares, and handle `" "` (the space key's `event.key`) in the `keydown` handler. Then drop a T into the notch, lock it, and drop the next one on top of it. In the console, `board[18]` and `board[19]` should be `825` and `991`.

```hints
nudge: Locking a square means making its bit 1, whatever it was before. Which of the four mask operations does that?
concept: Setting bit c of a row is row | (1 << c): OR with 1 makes a 1, and OR with 0 leaves the other bits alone. Doing it again changes nothing. + would also work on an empty square, but adds a carry on a filled one; ^ would empty a filled one. The new T has to be a fresh array: a function that returns the starting T each time is the simplest way.
shape: Turn the starting T into function newPiece() { return [ …the four squares… ]; } and let piece = newPiece();. function lock(cells) loops over cells and sets board[cell.row] = board[cell.row] | (1 << cell.col). At the top of the keydown handler: if event.key === " ", preventDefault; if isLanded(piece), lock(piece) and piece = newPiece(); then draw() and return.
answer: Replace the starting piece, and add lock after it:
~~~javascript
// A new piece at the top of the board: the squares it covers. This one is a T.
function newPiece() {
  return [
    { row: 0, col: 3 },
    { row: 0, col: 4 },
    { row: 0, col: 5 },
    { row: 1, col: 4 },
  ];
}

// The falling piece.
let piece = newPiece();

// Copy a piece into the board: set the bit of each square it covers.
function lock(cells) {
  for (const cell of cells) {
    board[cell.row] = board[cell.row] | (1 << cell.col);
  }
}
~~~
And at the top of the keydown handler, before let dRow = 0;:
~~~javascript
  if (event.key === " ") {
    event.preventDefault();
    if (isLanded(piece)) {
      lock(piece);
      piece = newPiece();
    }
    draw();
    return;
  }
~~~
The locked T sets columns 3, 4 and 5 of row 18 (769 + 8 + 16 + 32 = 825) and column 4 of row 19 (975 + 16 = 991). preventDefault stops the browser scrolling the page on Space. Two tempting slips: board[cell.row] += 1 << cell.col, which gives the same numbers in play but turns an already filled square into a carry into the next column; and ^, which empties it. lock([{ row: 19, col: 0 }]) on the starting board shows the difference: 975 with |, 976 with +, 974 with ^.
```

```check
page blockfall/index.html "(() => { for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return [board[18], board[19], piece.map((c) => c.row).join('')].join(' '); })()" "825 991 0001" errors=none -- After dropping and pressing Space, the T's squares should be set in rows 18 and 19, and a new T should start at the top.
page blockfall/index.html "(() => { const before = board.join(','); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); return board.join(',') === before && piece[0].row === 0; })()" true -- Space should do nothing while the piece is in the air.
page blockfall/index.html "(() => { lock([{ row: 19, col: 0 }]); return board[19]; })()" 975 -- lock should set bits with |, so locking a filled square leaves it filled.
page blockfall/index.html "(() => { for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); for (let i = 0; i < 25; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); return piece.map((c) => c.row).join(','); })()" 16,16,16,17 -- The next T should land on top of the locked one.
```

**What these checks establish, and what they don't.** They drop a T, lock it and read the two rows' numbers; press Space in mid-air and check nothing changed; lock a square that's already filled; and drop a second T to see it land on the first. They don't look at the screen, so watch the locked T turn grey yourself. They try one place and one piece, and they don't check what happens when a locked piece completes a row: nothing clears it yet (that's module 1.9), but `isRowFull` should light it up. Make one: in the console, `board[17] = 0b1111110111` leaves only column 3 empty; move a T so that its stem drops into that gap and lock it, and see the row turn light grey.

## What you can do now

- Bitwise **AND, OR, XOR, NOT** apply 01-02-01's operators to every bit position at once; **shifts** move bits left (×2 per place) or right (bits fall off).
- A **mask** selects bits. With `1 << n`: test with `&`, set with `|`, clear with `& ~`, flip with `^`. Read a **bitfield** by shifting it down and masking it.
- **Flags** pack independent yes-or-no facts into one number, as file permissions do. Blockfall's rows are flags, one per square, so "row full" is `board[row] === FULL`, with `FULL = (1 << COLS) - 1`.
- Binary is written with bit 0 on the right, so a row's binary literal is its mirror image.
- Precedence differs between languages: in JavaScript `x & m === 0` means `x & (m === 0)`. Bracket bit operations, always.
- **Parity** is one bit that catches any single flipped bit, and misses any two.

```predict
question: A network protocol packs a header into one 16-bit number: the top 4 bits are a version, the next 4 a header length, and the low 8 bits a set of flags, where bit 3 means "urgent". Write expressions for the version, and for "is the urgent flag set?", for a header h.
explain: The version is in bits 12 to 15, so shift it down by 12 and mask with 4 bits: (h >> 12) & 0xf. (Here the mask is optional, since nothing sits above bit 15, but it says which bits you mean and stays right if the header is ever wider.) The urgent flag is bit 3: (h & (1 << 3)) !== 0, with the brackets, or the same thing written as (h & 0x08) !== 0. The header length is (h >> 8) & 0xf. Shift, then mask, for a field; AND with a one-bit mask for a flag.
```

**Next:** 01-03-03 asks what a number's bits mean when there's a limited number of them. Why is `~12` negative? What happens when a number grows past its width? And which byte comes first when a number takes several? Kit's `hexdump` learns to read 16- and 32-bit numbers from a file, both ways round.
