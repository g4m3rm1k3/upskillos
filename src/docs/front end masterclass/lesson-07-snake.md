# Lesson 7 — Snake

## What you'll learn
- Collision detection — how code decides two things on screen have "touched"
- Modeling a growing, changing body as an array *inside* a class (arrays and classes combined, not competing ideas)
- A `Game` class that owns and coordinates other objects, rather than everything living in loose top-level variables
- Grid-based movement, as distinct from Pong's continuous pixel movement

## What you'll build
Classic Snake: a snake that grows when it eats food, dies when it hits
itself or the wall, on an arrow-key-controlled grid.

## The question
Pong's ball and paddles moved *independently* — the ball didn't know or care
where the paddles were, except at the one moment of a bounce check. Snake is
different: the snake's head must constantly know "is this next square food?
Is it my own body? Is it the wall?" How do you check whether one thing has
run into another, in code?

## 1. Predict

You already know how to compare two numbers (`===`, `<`, `>` from Lesson 2).
If a snake's head is at grid position `(3, 4)` and a piece of food is at
`(3, 4)` too, what's the simplest possible check that they've collided?
Predict the check for two *rectangles* (or grid cells) rather than two exact
points — is it one comparison, or several combined?

## 2. Try it

Create `src/lesson-07-snake/index.html`, `style.css`, `script.js`.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Snake</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Score: <span id="score">0</span></h1>
  <canvas id="game" width="400" height="400"></canvas>
</body>
<script src="script.js"></script>
</html>
```

### Building up to it: representing the snake as an array of positions

```js
let snake = [
  { x: 5, y: 5 },
  { x: 4, y: 5 },
  { x: 3, y: 5 }
];
```

### What this code does

**An array of objects, again (Lesson 3's todo pattern), but now geometric.**
- Each `{ x, y }` object is one **grid cell** the snake currently occupies —
  `x`/`y` here are grid coordinates (which column/row), not raw pixels
  (unlike Pong, where `x`/`y` were literal pixel positions).
- `snake[0]` is the **head** — by convention in this code, always the first
  element. `snake[snake.length - 1]` is the **tail** — the last element,
  which is what gets removed when the snake moves without eating (explained
  below).
- **Why an array here, rather than a `Snake` class with a fixed `length`
  property?** Because the snake's length itself *changes* over the game
  (grows when it eats) — an array's `.length` naturally reflects that
  without you tracking a separate counter that could drift out of sync with
  the actual body.

## 3. Why — collision, at grid granularity

Since positions are grid coordinates (whole numbers: column 3, row 4 — not
pixel 187.5), collision between two things at the same grid cell is exactly
equality:

```js
function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}
```

**`a.x === b.x && a.y === b.y`**
- `&&` (logical AND) — the whole expression is `true` only if **both** sides
  are `true`. Two positions only count as "the same cell" if *both*
  coordinates match — matching `x` alone (same column, different row) is not
  a collision.
- This directly answers your Predict question: for grid-aligned objects,
  "did they collide" reduces to "are their coordinates exactly equal" — no
  overlap math needed, unlike Pong's ball-vs-paddle check, which involved a
  range (is the ball's y *within* the paddle's height), not exact equality.
  Grid games and pixel games genuinely need different collision math — this
  is why the lesson picked Snake specifically to show the grid-based version.

## 4. Change one thing

```diff
 function samePosition(a, b) {
-  return a.x === b.x && a.y === b.y;
+  return a.x === b.x || a.y === b.y;
 }
```

**What changed:** `&&` became `||` (logical OR — true if *either* side is
true).
**What did not change:** the function's name, parameters, and the two
comparisons themselves. Predict, then verify by reasoning: with `||`, two
cells in the *same row* but different columns would now incorrectly count as
"colliding," as would two cells in the same column but different rows. This
single-character change quietly breaks correctness in a way that wouldn't
throw any error — worth sitting with, since it's the kind of bug that only
shows up as "the game feels wrong" rather than crashing.

## 5. Put it in the project

Now the full game, with a `Game` class coordinating everything.

```js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const cellSize = 20;
const gridCount = canvas.width / cellSize;

class Game {
  constructor() {
    this.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
    this.direction = { x: 1, y: 0 };
    this.food = this.randomFoodPosition();
    this.score = 0;
    this.gameOver = false;
  }

  randomFoodPosition() {
    return {
      x: Math.floor(Math.random() * gridCount),
      y: Math.floor(Math.random() * gridCount)
    };
  }

  samePosition(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  update() {
    if (this.gameOver) return;

    const head = this.snake[0];
    const newHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };

    const hitWall = newHead.x < 0 || newHead.x >= gridCount ||
                    newHead.y < 0 || newHead.y >= gridCount;
    const hitSelf = this.snake.some((segment) => this.samePosition(segment, newHead));

    if (hitWall || hitSelf) {
      this.gameOver = true;
      return;
    }

    this.snake.unshift(newHead);

    if (this.samePosition(newHead, this.food)) {
      this.score = this.score + 1;
      scoreDisplay.textContent = this.score;
      this.food = this.randomFoodPosition();
    } else {
      this.snake.pop();
    }
  }

  draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "lime";
    this.snake.forEach((segment) => {
      ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize - 1, cellSize - 1);
    });

    ctx.fillStyle = "red";
    ctx.fillRect(this.food.x * cellSize, this.food.y * cellSize, cellSize - 1, cellSize - 1);

    if (this.gameOver) {
      ctx.fillStyle = "white";
      ctx.font = "30px sans-serif";
      ctx.fillText("Game Over", 110, 200);
    }
  }

  setDirection(newDirection) {
    const isReversal = newDirection.x === -this.direction.x && newDirection.y === -this.direction.y;
    if (!isReversal) {
      this.direction = newDirection;
    }
  }
}

const game = new Game();

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") game.setDirection({ x: 0, y: -1 });
  if (event.key === "ArrowDown") game.setDirection({ x: 0, y: 1 });
  if (event.key === "ArrowLeft") game.setDirection({ x: -1, y: 0 });
  if (event.key === "ArrowRight") game.setDirection({ x: 1, y: 0 });
});

function gameLoop() {
  game.update();
  game.draw();
}

setInterval(gameLoop, 150);
```

### Code walkthrough — the new pieces

**`class Game { constructor() { this.snake = [...]; this.direction = {...}; ... } }`**
- Notice everything about the game's state — the snake array, current
  direction, food position, score, game-over flag — lives as properties on
  *one* instance, `game`. Compare this to Lesson 5's Pong, which had three
  separate top-level `const`s (`player`, `ai`, `ball`). Snake's pieces are
  more tightly coupled to each other (the snake needs to know about the food
  and about the walls to decide if it's still alive), so bundling them under
  one `Game` object — rather than three unrelated top-level variables —
  keeps every piece of interrelated state in one obvious place.

**`this.direction = { x: 1, y: 0 };`**
- A **direction vector**, not literal movement yet — `x: 1, y: 0` means
  "moving one cell right, zero cells vertically, per tick." Storing direction
  as `{x, y}` rather than a string like `"right"` means moving the head is
  always just `head.x + direction.x` — one formula handles all four
  directions without an `if`/`else` chain picking a different formula per
  direction.

**`this.snake.some((segment) => this.samePosition(segment, newHead))`**
- `.some(...)` is an array method (sibling to `.forEach` and `.push` you
  already know) that returns `true` as soon as the callback returns `true`
  for *any* element, `false` if none do. Here: "does any segment of the
  current snake occupy the same cell the new head is about to move into?" —
  this is self-collision detection.
- `(segment) => this.samePosition(segment, newHead)` — an **arrow function**,
  a shorter syntax for writing a function, functionally similar to
  `function (segment) { return this.samePosition(segment, newHead); }` here.
  The key detail worth knowing now, without going deep: arrow functions do
  **not** get their own `this` — they use whatever `this` means in the
  surrounding code. Here, that's exactly what you want: `this` inside the
  arrow function still refers to the `Game` instance, letting you call
  `this.samePosition(...)` — a plain `function` expression here would have
  its *own*, different `this` (likely `undefined` in this context), and
  `this.samePosition` would fail.

**`this.snake.unshift(newHead);`**
- `.unshift(...)` adds an element to the **front** of an array (the
  opposite end from `.push`, which adds to the end). The new head becomes
  `snake[0]`, matching the "head is always index 0" convention established
  earlier.

**`this.snake.pop();`** (in the `else` branch, when no food was eaten)
- `.pop()` removes and returns the array's **last** element — the tail.
- **This is how "moving without growing" actually works**: add a new head
  at the front, *and* remove the old tail at the back, same tick — the
  snake's total length stays the same, but every segment has shifted forward
  by one cell. **When food is eaten, `pop()` is skipped** (the `if` branch
  returns before reaching it) — the new head is added but nothing is
  removed, so the snake is now one segment longer. This single skipped line
  is the entire "growing" mechanism.

**`ctx.font = "30px sans-serif"; ctx.fillText("Game Over", 110, 200);`**
- `.font` sets text size/family for subsequent text drawing, same
  persistent-property pattern as `fillStyle` from Lesson 5.
- `.fillText(text, x, y)` draws text with its **baseline** (not top-left) at
  `(x, y)` — a different anchor point than `fillRect`, worth knowing if text
  ever looks vertically misplaced.

**`setDirection(newDirection) { const isReversal = ...; if (!isReversal) { this.direction = newDirection; } }`**
- Prevents the snake from immediately reversing directly into itself (e.g.
  pressing Left while already moving Right, which would make the new head
  immediately overlap the segment right behind it — an unavoidable,
  unfair-feeling death). `-this.direction.x` flips the sign; if the proposed
  new direction is the exact opposite of the current one on both axes, it's
  rejected silently — `this.direction` simply isn't updated, and the next
  `update()` tick continues in the current direction as if the keypress
  hadn't happened.

**`setInterval(gameLoop, 150)`**
- Back to `setInterval` (Lesson 4), not `requestAnimationFrame` (Lesson 5) —
  and this is a deliberate, meaningful choice, not an inconsistency:
  Snake's movement is **discrete** (one grid cell per tick, deliberately
  slow enough to be playable — 150ms between moves), not the smooth,
  every-frame motion Pong needed. `requestAnimationFrame`'s ~60fps would
  make the snake update far faster than intended, requiring you to
  throttle it manually — `setInterval` at a chosen delay is simply the more
  direct tool for "something that should happen every N milliseconds," which
  is exactly Snake's actual movement rhythm.

### What happens

Every 150ms, `gameLoop` runs: `update()` computes where the head is about to
go, checks it against walls and the snake's own body, either ends the game or
moves the snake (growing if food was hit), then `draw()` renders the current
state — snake, food, and a game-over message if applicable — from scratch,
same "clear and rebuild" idea as Lesson 3's todo list, just applied to a
canvas instead of the DOM.

## 6. Trap

Predict, then test: press two arrow keys in the same 150ms tick — for
example, press Down then immediately Right, both before the snake has
visibly moved once.

Depending on timing, you may find the snake seems to accept a direction
change that *should* have been rejected as a reversal, or ignores an input
you expected to register. **The trap: `setDirection` only compares the
*proposed* new direction against `this.direction` — which only updates once
per `update()` tick, not once per keypress.** If two keypresses land within
the same 150ms window, the second overwrites `this.direction` based on
comparing against a value that hasn't been "confirmed" by a tick yet,
potentially allowing a reversal that spans two rapid keypresses even though
neither individual keypress looked like a direct reversal. Real Snake
implementations typically queue only the *next* direction change and apply
it exactly once per tick — a refinement past this lesson's scope, but worth
knowing the simple version has this edge case.

## 7. Exercise

Pick at least one:

- **Predict:** If `this.snake.pop()` were changed to
  `this.snake.pop(); this.snake.pop();` in the no-food branch, what would
  happen to the snake's length over time, and how quickly would the game
  become unplayable?
- **Modify:** Add increasing speed — every 5 points, clear the current
  `setInterval` and start a new one with a smaller delay.
- **Break:** Remove the `hitSelf` check (keep `hitWall`). Play until the
  snake is long enough to run into itself. What actually happens on screen?
- **Trace:** Write out, step by step, exactly what `this.snake` (as an
  array, listing each `{x,y}`) looks like before and after one `update()`
  call where food is eaten, versus one where it isn't.

## What to remember
- Grid-based collision is exact coordinate equality (`&&` of both axes);
  pixel-based collision (Pong) needed range checks instead — the right check
  depends on how positions are represented, not a universal formula.
- `unshift` + `pop` together simulate movement (add new head, remove old
  tail); skipping the `pop` is the entire "growing" mechanism.
- Arrow functions don't have their own `this` — they inherit it from the
  surrounding code, which is exactly why `this.samePosition(...)` works
  correctly inside `.some((segment) => ...)`.
- `setInterval` vs `requestAnimationFrame` is a real design choice tied to
  whether movement is discrete-per-tick (Snake) or continuous-per-frame
  (Pong) — not just two interchangeable timing tools.

## Next lesson
Lesson 8 closes out Phase B with a Weather Dashboard app: a `State` class
holding all the app's data as the single source of truth, methods instead of
free-floating functions, and an explicit look at why this matters as
preparation for React's component state model in Phase C.
