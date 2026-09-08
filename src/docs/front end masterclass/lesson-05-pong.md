# Lesson 5 — Pong, and Your First Classes

## What you'll learn
- The `<canvas>` element and its 2D drawing context — a different way of putting pixels on screen than anything in Phases A
- `requestAnimationFrame` — the real game loop, and how it differs from Lesson 4's `setInterval`
- **Classes**: what `class`, `constructor`, `this`, and methods actually are and do — not just "how to write one"
- Why two paddles and a ball are a natural fit for classes, when Lesson 1-4's single counters/lists weren't

## What you'll build
Classic Pong: two paddles (one you control with arrow keys, one simple AI),
a bouncing ball, and a score.

## The question
In Lessons 1–4, you had at most one "thing" changing at a time (a count, a
guess, a list, a target cell). Pong has *three* independent moving things — a
ball and two paddles — each with its own position, size, and behavior. If you
tried to track this with the loose-variable style from Phase A, what would
that code start to look like? Sketch it mentally before continuing: how many
separate variables would `ballX`, `ballY`, `ballSpeedX`, `paddle1Y`,
`paddle2Y`... turn into?

## 1. Predict

You already sketched the "many loose variables" version above. Now predict
the opposite direction: what if instead of `ballX` and `ballY` as two
separate top-level variables, you had *one* thing called `ball` that
*contained* both `x` and `y` inside it — and also contained the *behavior*
of moving and bouncing? What language feature lets you bundle related data
**and** the functions that operate on that data into a single unit?

That feature is a **class**. This lesson exists to make that word concrete.

## 2. Try it

Create `src/lesson-05-pong/index.html`, `style.css`, `script.js`.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Pong</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="game" width="600" height="400"></canvas>
</body>
<script src="script.js"></script>
</html>
```

### Building up to it: the canvas itself

**`script.js` (part 1 — just get something drawing)**
```js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = "white";
ctx.fillRect(50, 50, 10, 60);
```

### What this code does

**`canvas.getContext("2d")`**
- `<canvas>` on its own is just a blank rectangular element — it has no
  drawing API itself. `.getContext("2d")` asks the browser for a **drawing
  context** object bound to that specific canvas — think of it as "the pen
  and the rules for how drawing on this canvas works." (`"webgl"` would
  return a completely different, 3D-oriented context — not used here.)
- `ctx` — by convention, this variable name is used almost universally for
  the 2D context. Every subsequent drawing call goes through it, not through
  `canvas` directly.

**`ctx.fillStyle = "black";`**
- A property, not a method — sets the color used by *subsequent* fill
  operations. It stays set until changed again; it's not an argument to
  `fillRect`, it's separate, persistent context state.

**`ctx.fillRect(0, 0, canvas.width, canvas.height)`**
- Draws a filled rectangle: `(x, y, width, height)` — `x`/`y` is the
  **top-left corner**, not the center (a common early mistake). Here it
  covers the entire canvas, effectively clearing it to black — this is the
  standard way to "erase" a canvas each frame, since canvas has no built-in
  concept of removing previously drawn pixels other than drawing over them.
- `canvas.width` / `canvas.height` — properties reflecting the `width="600"
  height="400"` attributes from the HTML.

**Second `fillRect` call** — same method, new `fillStyle` ("white") set
first, drawing a `10`-wide, `60`-tall rectangle at position `(50, 50)`. This
one rectangle is a placeholder — you're about to replace this single
hardcoded paddle-shaped rectangle with something driven by a class.

## 3. Why classes — the deep version

This is the primary concept of this lesson, so it gets full treatment rather
than the "micro" explanations from earlier lessons.

### The problem, concretely

Without classes, drawing and moving one paddle needs at least:
```js
let paddle1Y = 150;
let paddle1X = 20;
const paddle1Width = 10;
const paddle1Height = 60;
let paddle1Speed = 5;
```
Two paddles doubles this to ten loose variables. A ball adds position,
velocity in two directions, and radius — several more. Every function that
needs to "move the paddle" or "check if the ball hit it" has to know and
juggle all these separately-named variables by hand, with nothing stopping
you from, say, accidentally moving `paddle2Y` using `paddle1Speed`.

### What a class actually is

```js
class Paddle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 60;
    this.speed = 5;
  }

  moveUp() {
    this.y = this.y - this.speed;
  }

  moveDown() {
    this.y = this.y + this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
```

Construct-by-construct, at full depth:

**`class Paddle { ... }`**
- `class` is a keyword that declares a **blueprint** — a description of what
  properties and behaviors any `Paddle` will have. It is *not itself* a
  paddle. Nothing exists in memory yet from this declaration alone, the same
  way a blueprint for a house isn't a house. You'll construct actual
  paddle *instances* from this blueprint below.
- `Paddle` — the class name. Convention (not a hard rule): class names are
  capitalized (`PascalCase`), distinguishing them at a glance from ordinary
  variables and functions.

**`constructor(x, y) { ... }`**
- A special method, always named exactly `constructor`, that runs
  **automatically, exactly once**, at the moment a new instance is created
  (you'll trigger this with `new Paddle(...)` below). You never call
  `constructor` yourself directly.
- `x, y` — ordinary function parameters, no different in kind from
  parameters you've already used (e.g. `handleGuess` didn't take
  parameters, but you've used parameters in `forEach(function(todo, index))`
  in Lesson 3). Whatever values you pass into `new Paddle(x, y)` arrive here.
- **Why does a constructor exist at all, rather than just setting properties
  after creating a plain object?** It guarantees every `Paddle` is created
  in a valid, complete state — you cannot end up with a `Paddle` that's
  missing a `width` because you forgot to set it that one time. The
  blueprint enforces what every instance must have.

**`this.x = x;`**
- `this` is the single most important — and most confusing — new keyword in
  this lesson. Inside a method (including the constructor), `this` refers to
  **the specific instance the method is currently running on**. When you
  later write `paddle1.moveUp()`, inside `moveUp`, `this` means `paddle1`;
  call `paddle2.moveUp()`, and inside that same method body, `this` now
  means `paddle2` instead. The method's *code* is shared and written once;
  `this` is what lets that one shared piece of code operate on *different*
  data each time it's called on a different instance.
- `this.x = x;` — takes the `x` parameter (the value passed into the
  constructor) and stores it as a **property** on the instance being built,
  also named `x`. The property name (`this.x`) and the parameter name (`x`)
  are separate things that merely happen to share a name here — a common
  convention, not a language requirement. `this.x = someOtherName;` would
  work identically.
- **What if `this` were removed** — just `x = x;`? This would (mostly) be a
  no-op reassigning the local parameter to itself, and no property would
  ever be attached to the instance. `this.` is what makes the value *stick
  to the object* rather than vanish when the constructor finishes running.

**`this.width = 10; this.height = 60; this.speed = 5;`**
- These aren't parameters — they're fixed values baked directly into every
  `Paddle` the constructor ever creates. Every paddle you make from this
  class starts with the same width, height, and speed, but its own
  independent `x`/`y`, because those alone came from the constructor's
  parameters.

**`moveUp() { this.y = this.y - this.speed; }`**
- A **method** — a function that lives inside the class body and is
  automatically available on every instance. No `function` keyword needed
  inside a class body — this shorthand syntax is specific to classes.
- `this.y = this.y - this.speed;` reads the *calling instance's own* `y` and
  `speed`, not some global variable — this is the payoff of bundling data
  and behavior together. `paddle1.moveUp()` only ever touches `paddle1`'s own
  `y`, never `paddle2`'s, without you having to pass `paddle1` in as an
  argument or track which paddle's variables to use by name.
- Canvas coordinates: `y` increases **downward** (0 is the top), so
  subtracting `speed` moves the paddle *up* on screen — worth stating
  explicitly since it's the opposite of typical math-class y-axis intuition.

**`draw(ctx) { ... }`**
- Another method, taking the canvas context as a parameter so it can draw
  itself. Notice this method reads `this.x`, `this.y`, `this.width`,
  `this.height` — everything it needs to draw is already stored on the
  instance; nothing needs to be passed in except the one thing genuinely
  external to the paddle (the shared drawing surface).

### Creating and using an instance

```js
const paddle1 = new Paddle(20, 150);
paddle1.moveUp();
paddle1.draw(ctx);
```

**`new Paddle(20, 150)`**
- `new` is what actually **constructs an instance** from the class
  blueprint. This is the moment `constructor` runs — `20` and `150` become
  that call's `x` and `y` parameters, and a real object is built in memory
  with `x: 20, y: 150, width: 10, height: 60, speed: 5` as its own
  properties.
- Without `new`, `Paddle(20, 150)` would (in modern JS) throw an error —
  classes generally cannot be called like ordinary functions.
- **This is the direct answer to your Predict question**: `paddle1` is one
  variable that *contains* both data (`x`, `y`, `width`...) and behavior
  (`moveUp`, `draw`) as a single bundled unit — replacing the five-plus
  loose variables per paddle you sketched earlier.

**`paddle1.moveUp();`**
- Calling a method on an instance. Under the hood, JavaScript runs the
  `moveUp` code from the `Paddle` class, with `this` automatically bound to
  `paddle1` for the duration of that call.

## 4. Change one thing

```diff
   moveUp() {
     this.y = this.y - this.speed;
+    if (this.y < 0) {
+      this.y = 0;
+    }
   }
```

**What changed:** `moveUp` now clamps the paddle so it can't move above the
top of the canvas (`y < 0`).
**What did not change:** nothing about the class structure, `constructor`,
or `draw` needed to change — you extended *one method's* behavior in
isolation. This is a direct, concrete benefit of bundling behavior with the
data it operates on: fixing "paddles can move off-screen" required editing
exactly one place, `moveUp`, rather than hunting through every function in
the file that happened to touch `paddle1Y`.

## 5. Put it in the project

Now the full game — a `Ball` class alongside `Paddle`, a
`requestAnimationFrame` loop, and keyboard controls.

```js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

class Paddle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 60;
    this.speed = 5;
  }
  moveUp() {
    this.y = Math.max(0, this.y - this.speed);
  }
  moveDown() {
    this.y = Math.min(canvas.height - this.height, this.y + this.speed);
  }
  draw() {
    ctx.fillStyle = "white";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Ball {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = 8;
    this.speedX = 4;
    this.speedY = 4;
  }
  move() {
    this.x = this.x + this.speedX;
    this.y = this.y + this.speedY;

    if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
      this.speedY = this.speedY * -1;
    }
  }
  draw() {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const player = new Paddle(20, 170);
const ai = new Paddle(canvas.width - 30, 170);
const ball = new Ball();

const keysPressed = {};
document.addEventListener("keydown", function (event) {
  keysPressed[event.key] = true;
});
document.addEventListener("keyup", function (event) {
  keysPressed[event.key] = false;
});

function update() {
  if (keysPressed["ArrowUp"]) player.moveUp();
  if (keysPressed["ArrowDown"]) player.moveDown();

  if (ball.y < ai.y + ai.height / 2) ai.moveUp();
  if (ball.y > ai.y + ai.height / 2) ai.moveDown();

  ball.move();
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  player.draw();
  ai.draw();
  ball.draw();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

### Code walkthrough — the new pieces beyond `Paddle`

**`class Ball { ... }`** follows the identical pattern as `Paddle`: a
constructor establishing initial state, a `move` method mutating `this.x`/
`this.y` based on `this.speedX`/`this.speedY`, and a `draw` method reading
its own state to render itself. Same blueprint idea, different shape.

**`ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)`**
- Draws a circular path: center `(x, y)`, given `radius`, from angle `0` to
  `Math.PI * 2` — a full circle in radians (canvas angles are in radians,
  not degrees; `2π` radians is a complete revolution).
- `ctx.beginPath()` before it, and `ctx.fill()` after — canvas drawing of
  arcs/lines works by first declaring a "path" (`beginPath` starts a fresh
  one), then describing its shape (`arc`), then actually rendering it
  (`fill` or `stroke`). This three-step pattern is specific to canvas's
  non-rectangle drawing and doesn't apply to `fillRect`, which draws
  immediately in one call.

**`if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) { this.speedY *= -1; }`**
- Bounce logic: if the ball's top or bottom edge has crossed the canvas
  boundary, **reverse the vertical speed**. Multiplying by `-1` flips
  positive (moving down) to negative (moving up) or vice versa — this is the
  entire mechanism behind "bouncing" in this style of game; there's no
  special "bounce" function, just a sign flip on velocity.

**`const keysPressed = {};`**
- A plain object used as a lookup table (not a class instance — no blueprint
  needed for something this simple, worth noticing classes aren't *always*
  the right tool). Keys are added dynamically as strings (`"ArrowUp"`,
  `"ArrowDown"`), values are booleans.

**`document.addEventListener("keydown", function (event) { keysPressed[event.key] = true; })`**
- `event.key` — a property on keyboard events giving the actual key pressed
  as a string (`"ArrowUp"`, `"a"`, `" "` for space, etc.).
- `keysPressed[event.key] = true;` — **bracket notation**, not dot notation
  (`keysPressed.event.key` would be wrong — there's no property literally
  named `event`). Bracket notation lets you use a *variable's value* as the
  property name being set, which dot notation cannot do. This is how an
  arbitrary, not-known-in-advance key name becomes an object property.
- **Why track keys in an object instead of reacting directly inside the
  `keydown` listener** (e.g. calling `player.moveUp()` right there)? Because
  `keydown` only fires once per physical key-press-and-hold cycle (with an
  initial repeat delay), not smoothly every frame — tracking *currently held*
  keys in `keysPressed` and checking them inside `update()` (which runs every
  frame) gives smooth, continuous movement instead of jerky, delayed
  movement.

**`function update() { ... } function draw() { ... }`**
- Two separate functions with a clean split: `update` changes state (based
  on input and physics), `draw` only reads state to render pixels — mirrors
  the state/DOM separation from Lesson 1, now applied to canvas instead of
  the DOM.

**`function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }`**
- **This is the real game loop**, and the reason it's not built on
  `setInterval` (Lesson 4) is important:
- `requestAnimationFrame(callback)` asks the browser to call `callback`
  **once**, right before the browser's next repaint — typically ~60 times
  per second on most displays, but this is determined by the *display's*
  refresh rate, not a hardcoded millisecond delay you choose.
- Notice `gameLoop` calls `requestAnimationFrame(gameLoop)` **at its own
  end** — each call schedules the *next* call itself. This is different from
  `setInterval`, which you set up once and it repeats on its own; here, the
  loop re-triggers itself deliberately, every single frame.
- **Why is this better than `setInterval(gameLoop, 16)` (roughly 60fps in
  ms)?** `requestAnimationFrame` automatically pauses when the browser tab
  is inactive/hidden (saving battery/CPU), and stays synchronized with the
  actual display refresh, avoiding the stutter or drift that a fixed
  millisecond `setInterval` can accumulate over time.

**`requestAnimationFrame(gameLoop);`** (the final line, outside any function)
- This is the **one-time kickoff** that starts the entire loop. Without this
  line, `gameLoop` is defined but never called even once — nothing would
  happen at all. Compare to Lesson 4, where `setInterval` itself both
  started *and* sustained repetition from a single call; here, starting
  (this line) and sustaining (the self-call inside `gameLoop`) are two
  separate, explicit responsibilities.

## 6. Trap

Predict, then test: what happens if you accidentally write `Paddle(20, 150)`
inside `update` or anywhere else, forgetting the `new` keyword?

In modern JavaScript, this throws a runtime error —
`TypeError: Class constructor Paddle cannot be invoked without 'new'` —
immediately, loudly, the moment that line runs. This is actually a
*friendlier* trap than it could be: some older JS patterns (plain functions
used as constructors, pre-`class` syntax) would silently produce broken,
half-initialized objects instead of erroring at all. **The trap to
internalize: a class is a blueprint, not a value — you cannot use it
directly as data or call it like a normal function; it exists only to be
instantiated with `new`.**

## 7. Exercise

Pick at least one:

- **Predict:** If `Ball`'s constructor took `x` and `y` as parameters
  (instead of hardcoding `canvas.width / 2`), what would you need to change
  at the `new Ball()` call site? Try it.
- **Modify:** Add horizontal bounce/scoring — when `ball.x` goes past a
  paddle without colliding, increment a score variable for the other side
  and reset the ball to center.
- **Break:** Remove `this.` from every line inside `Paddle`'s `moveUp` (so
  it reads `y = y - speed;`). Run it and read the actual error message
  JavaScript gives you — does it match your prediction from section 3?
- **Compare:** Rewrite `Paddle` (just this one class, as an exercise, not to
  keep) as a plain object-returning function instead of a `class`:
  ```js
  function createPaddle(x, y) {
    return { x, y, width: 10, height: 60, speed: 5,
      moveUp() { this.y -= this.speed; } };
  }
  ```
  What's genuinely different between `new Paddle(20, 150)` and
  `createPaddle(20, 150)` in terms of what you can *do* with the result?
  (Hint: research `instanceof` briefly if you're unsure where to look.)

## What to remember
- A `class` is a blueprint; `new ClassName(...)` builds one actual instance
  from it, running `constructor` exactly once per instance.
- `this` inside a method refers to whichever specific instance the method
  was called on — the same method code runs identically for every instance,
  but operates on that instance's own data.
- Bundling data (`this.x`, `this.speed`) with the behavior that operates on
  it (`moveUp`, `draw`) means each object manages its own state — no more
  juggling a dozen loosely-related, similarly-named top-level variables.
- `requestAnimationFrame` is a self-scheduling loop synced to the display's
  actual refresh rate — different from `setInterval`'s fixed, independent
  timer.

## Next lesson
Lesson 6 steps back to an app (a fetch-based quote generator) and introduces
`async`/`await`, wrapping the API call in a small service class — reinforcing
that classes aren't just for games; they're useful anywhere you want to
bundle related data and behavior, including something as ordinary as "the
thing that knows how to talk to an API."
