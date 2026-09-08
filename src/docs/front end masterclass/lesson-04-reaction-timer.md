# Lesson 4 — The Reaction Timer

## What you'll learn
- `setTimeout` vs `setInterval` — one-shot vs repeating scheduled code
- That timers are **not** paused/cancelled automatically — you must clear them yourself
- CSS class toggling as the standard way to drive animation from JS
- A first real appearance of a *time-driven* state change, not just a *click-driven* one

## What you'll build
A grid of squares. At random intervals, one square lights up. Click it before
it fades and your score goes up; miss it and it just disappears. This is the
skeleton every Phase B game loop grows out of.

## The question
Every event so far (`click`) happened because the *user* did something.
What triggers code to run when *nobody* does anything — when the trigger is
just "time passing"?

## 1. Predict

You know from Lesson 1 that `addEventListener` registers code to run later,
triggered by a browser event. Predict: is there a similar "register this to
run later" mechanism triggered by a *clock* instead of a *user action*? What
might the browser need to track differently for something recurring
(happens every N ms, forever) versus something one-shot (happens once, N ms
from now)?

## 2. Try it

Create `src/lesson-04-reaction-timer/index.html`, `style.css`, `script.js`.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Reaction Timer</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Score: <span id="score">0</span></h1>
  <button id="start-btn">Start</button>
  <div id="grid"></div>
</body>
<script src="script.js"></script>
</html>
```

**`script.js`**
```js
const grid = document.getElementById("grid");
const scoreDisplay = document.getElementById("score");
const startBtn = document.getElementById("start-btn");

let score = 0;
let activeCell = null;
let spawnTimerId = null;
let hideTimerId = null;

const cells = [];
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  grid.appendChild(cell);
  cells.push(cell);
}

function spawnTarget() {
  if (activeCell) {
    activeCell.classList.remove("active");
  }

  const randomIndex = Math.floor(Math.random() * cells.length);
  activeCell = cells[randomIndex];
  activeCell.classList.add("active");

  hideTimerId = setTimeout(function () {
    activeCell.classList.remove("active");
    activeCell = null;
  }, 800);
}

function handleCellClick(event) {
  if (event.target.classList.contains("active")) {
    score = score + 1;
    scoreDisplay.textContent = score;
    clearTimeout(hideTimerId);
    event.target.classList.remove("active");
    activeCell = null;
  }
}

function startGame() {
  score = 0;
  scoreDisplay.textContent = score;
  spawnTimerId = setInterval(spawnTarget, 1200);
}

grid.addEventListener("click", handleCellClick);
startBtn.addEventListener("click", startGame);
```

### What this code does

**`const cells = []; for (let i = 0; i < 9; i++) { ... cells.push(cell); }`**
- A plain `for` loop (you already know this) builds 9 `<div>` elements once,
  at load time, and keeps a reference to each in the `cells` array — this is
  separate from, and happens before, any timer logic. Notice: this setup
  runs exactly once; nothing here repeats.

**`let activeCell = null;`**
- `null` is JavaScript's explicit "intentionally no value" marker — distinct
  from `undefined` (which usually means "never assigned"). Using `null` here
  states clearly: "sometimes there is no active target, and that's a normal,
  expected state, not a mistake."
- This variable tracks *which* DOM element (if any) is currently lit up —
  necessary because clicking has to check "is the thing I clicked the
  currently active one," and clearing an old target requires knowing which
  element that was.

**`let spawnTimerId = null; let hideTimerId = null;`**
- Both `setTimeout` and `setInterval` **return a value** (an ID — technically
  an opaque handle, in browsers usually a number) that identifies *that
  specific scheduled timer*, distinct from any other timer running
  concurrently. You must store this ID if you ever want to cancel that timer
  later — there's no other way to refer back to it.

**`spawnTimerId = setInterval(spawnTarget, 1200);`**
- `setInterval(callback, delay)` schedules `callback` to run repeatedly,
  once every `delay` milliseconds, **forever**, until explicitly stopped.
- `spawnTarget` — passed *by reference*, without parentheses. Written as
  `spawnTarget()` instead, it would call the function immediately (once,
  right now) and pass its *return value* (here, `undefined`) to
  `setInterval` — which is not what you want. This exact mistake (adding
  parentheses you shouldn't) is one of the most common beginner bugs with
  timers and callbacks generally.
- `1200` — milliseconds between calls. 1000ms = 1 second, so a new target
  spawns roughly every 1.2 seconds.
- **Critical, easy to miss**: `setInterval` never stops on its own. If you
  never call `clearInterval` on `spawnTimerId`, it keeps firing every 1.2
  seconds *forever*, even after the player closes the game mentally, even if
  you navigate elsewhere in a larger app — this is explored directly in the
  Trap section.

**`hideTimerId = setTimeout(function () { ... }, 800);`**
- `setTimeout(callback, delay)` schedules `callback` to run **exactly once**,
  `delay` milliseconds from now, then never again.
- `800` — less than the `1200` spawn interval, meaning a target visually
  disappears (times out) before the *next* one would spawn — this gap is a
  deliberate design choice, not a JS mechanism; it guarantees at most one
  active target at a time.
- Inside the callback: `activeCell.classList.remove("active")` then
  `activeCell = null` — this is what makes a missed target disappear on its
  own, independent of any click.

**`if (activeCell) { activeCell.classList.remove("active"); }`** (top of `spawnTarget`)
- Defensive cleanup: if a *previous* target is somehow still active when a
  new spawn happens (edge case, e.g. timing drift), remove its highlight
  before lighting up a new one — otherwise two cells could appear active
  simultaneously, contradicting the "exactly one target at a time" design.

**`clearTimeout(hideTimerId);`** (inside `handleCellClick`, on a successful hit)
- This is the other half of the story `setTimeout` set up. Without this
  line, hitting the target would score a point, but the *original* 800ms
  timer would still be pending — and 800ms later, its callback would still
  fire, attempting `activeCell.classList.remove("active")` on whatever
  `activeCell` happens to be pointing at *by then* (possibly a completely
  different, newer target that just spawned), incorrectly hiding it.
  `clearTimeout` cancels a pending, not-yet-fired timer using its ID — this
  is the entire reason the ID had to be stored in a variable in the first
  place.

**`event.target.classList.contains("active")`** (inside `handleCellClick`)
- Event delegation again (Lesson 3) — one listener on `grid`, checking
  `event.target` to see exactly which cell was clicked, and whether it
  happens to currently be the active one. Clicking an *inactive* cell does
  nothing — the `if` simply doesn't run its body.

### What happens

Clicking Start resets the score and begins a repeating 1.2-second cycle:
each tick lights up a random cell and starts an 800ms countdown for it to
un-light itself. A correctly-timed click on the lit cell scores a point and
cancels that countdown early; a missed click, or no click at all, lets the
800ms timeout do the hiding instead.

## 3. Why?

### Mental model

```
Start clicked
   ↓
setInterval(spawnTarget, 1200) begins — repeats every 1.2s, forever until cleared
   ↓
each tick: spawnTarget() runs
   ↓
   lights a random cell
   ↓
   setTimeout(hideCallback, 800) scheduled — ONE-SHOT, 800ms from now
   ↓
   ┌─────────────┴─────────────┐
   player clicks the lit cell    player doesn't (or clicks elsewhere)
   ↓                             ↓
   clearTimeout cancels the      the 800ms setTimeout fires on its own,
   pending hideCallback —        hiding the cell without any click
   cell hidden immediately,
   score increments
```

Two timers, two different jobs: `setInterval` for *recurring* game rhythm,
`setTimeout` for a *one-shot* deadline on each individual target.

## 4. Change one thing

```diff
 function startGame() {
   score = 0;
   scoreDisplay.textContent = score;
-  spawnTimerId = setInterval(spawnTarget, 1200);
+  spawnTimerId = setInterval(spawnTarget, 600);
 }
```

**What changed:** the interval, from 1200ms to 600ms — targets now spawn
twice as often.
**What did not change:** the 800ms hide timeout inside `spawnTarget`. Notice
this now creates a real design problem worth reasoning through: with a
600ms spawn rate and an 800ms hide delay, a *new* target can spawn *before*
the previous one's hide timer has fired — meaning the defensive
`if (activeCell) { ... }` check at the top of `spawnTarget` now actually
matters at runtime, rather than being unreachable-in-practice safety code.
This is a good example of two independent numbers (spawn rate, hide delay)
interacting in a way neither number alone reveals.

## 5. Put it in the project

`spawnTimerId`/`hideTimerId` as named, storable IDs — and the discipline of
clearing them at the right moment — is the exact mechanism Phase B's Pong and
Snake games depend on for their game loops (there, via
`requestAnimationFrame` instead of `setInterval`, but the same principle:
something is scheduled to keep running, and something else must be
responsible for eventually stopping it).

## 6. Trap

Click Start, then click Start again without reloading the page. Predict what
happens to the game's speed before running it.

Run it. You'll likely notice targets seem to spawn *faster* than intended,
or multiple cells seem to light independently in ways the design didn't
intend. **The trap: `startGame()` calls `setInterval` again, creating a
*second*, completely independent repeating timer — the first one from the
earlier Start click is never stopped.** `spawnTimerId` gets overwritten with
the *new* timer's ID, so you've now permanently lost the ability to ever
cancel the *original* one — its ID is gone, but the timer itself keeps
running in the background, invisible, forever (or until the page is
closed/reloaded). This is a real, common category of bug: **an orphaned
timer** — one still running that nothing in your program can reach anymore.

## 7. Exercise

Pick at least one:

- **Repair:** Fix the trap above — at the top of `startGame`, add
  `clearInterval(spawnTimerId);` *before* creating the new one, so restarting
  the game never leaves an orphaned timer behind. (Predict first: why does
  this line need to run even the very first time `startGame` is called, when
  `spawnTimerId` is still `null`? Hint: `clearInterval(null)` is safe and
  does nothing — check this claim rather than assuming it.)
- **Predict:** If you added a "Stop" button that only calls
  `clearInterval(spawnTimerId)`, would any currently-lit target's `hideTimerId`
  still fire afterward? Reason about it, then test.
- **Modify:** Add a countdown — the game automatically stops (via
  `clearInterval`) after 30 seconds, showing a final score.
- **Trace:** Write out, step by step, everything that happens — including
  both timers — between clicking Start and the very first target
  disappearing on its own (assume the player never clicks anything).

## What to remember
- `setInterval` repeats forever until you `clearInterval` it, using the ID it
  returned when it was created; `setTimeout` fires once and needs no
  cancellation unless you want to preempt it early.
- Always store a timer's ID in a variable the moment you create it — it's
  your only handle for cancelling it later.
- An "orphaned" timer — one still running that your code has lost the
  reference to — is a real, common bug, not a hypothetical one.
- Time-driven state changes (timers) and user-driven state changes (click
  listeners) can both be mutating the same variables — order and cancellation
  between them matters.

## Next lesson
Lesson 5 starts Phase B, and with it the real reason for classes: Pong needs
a ball *and* two paddles, each with their own position, velocity, and
behavior, running inside a continuous `requestAnimationFrame` loop rather
than a fixed-interval timer. You'll feel the pain of tracking multiple
related variables per game object with loose variables first, then see
exactly what a `class` fixes.
