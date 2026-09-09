# Lesson 21 — Trigonometry II: Rotation & Angles

## What you'll learn
- The difference between *moving along* a wave (Lesson 20) and *rotating to
  face* a direction — two genuinely different problems
- `Math.atan2(dy, dx)` — the function that answers "what angle points from
  here to there," and why it's not just `atan(dy/dx)`
- Converting between radians and degrees deliberately, since CSS `rotate()`
  accepts degrees while `Math` functions only speak radians
- Building an element that continuously rotates to face the mouse cursor

## What you'll build
An arrow (or any element) that rotates in real time to always point directly
at the mouse cursor, wherever it moves — plus a simple clock-hand version
using the same underlying angle math.

## The question
Lesson 20 moved a dot *along* a circle using `sin`/`cos` of an
ever-increasing `t`. This lesson asks a different question: given two
points — where an element currently is, and where the mouse currently is —
what angle should that element be rotated to, so it visually points from
one to the other? `sin`/`cos` alone don't answer this; they need an angle
as *input*. Here, the angle is what you need to *find*.

## 1. Predict

Picture an arrow at the center of the screen and a mouse cursor somewhere
up and to the right of it. Predict, roughly (no exact math needed yet): is
the angle you'd need to know here more naturally described as "the ratio of
vertical to horizontal distance between them," or something else entirely?

## 2. Try it

```html
<style>
  #arrow {
    position: absolute;
    left: 200px;
    top: 150px;
    width: 60px;
    height: 4px;
    background: crimson;
    transform-origin: left center;
  }
</style>
<div id="arrow"></div>

<script>
  const arrow = document.getElementById("arrow");
  const originX = 200;
  const originY = 150;

  document.addEventListener("mousemove", function (event) {
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const angleRadians = Math.atan2(dy, dx);
    const angleDegrees = angleRadians * (180 / Math.PI);

    arrow.style.transform = "rotate(" + angleDegrees + "deg)";
  });
</script>
```

### What this code does

**`transform-origin: left center;`**
- By default, `transform`'s rotation pivots around an element's **center**
  (50% 50%). Setting `transform-origin: left center` moves the pivot point
  to the middle of the element's **left edge** instead — for a horizontal
  bar meant to look like an arrow pointing outward from a fixed base, this
  makes it rotate like a clock hand around its base, rather than spinning
  in place around its own middle. This single property is what makes the
  rotation *look* like pointing rather than just spinning.

**`const dx = event.clientX - originX; const dy = event.clientY - originY;`**
- `event.clientX`/`event.clientY` — properties on a `mousemove` event
  giving the cursor's current pixel position relative to the browser
  viewport (a new event property, sibling to `event.target`/`event.key`
  from earlier lessons).
- `dx`/`dy` — the **difference** in x and y between the mouse and the
  arrow's fixed origin point. This is a **vector** (a quantity with both
  magnitude and direction, formally covered next lesson) — but informally,
  right now: it's simply "how far right and how far down the mouse is from
  the arrow's base."

**`Math.atan2(dy, dx)`**
- `atan2` (pronounced "a-tan-two," short for "arctangent, 2-argument
  version") takes **two separate values** — `dy` and `dx` — and returns the
  angle, in radians, of the vector `(dx, dy)` relative to the positive
  x-axis (pointing right).
- **Why not just `Math.atan(dy / dx)` (ordinary single-argument
  arctangent)?** This is the direct answer to your Predict question, and
  the actual reason `atan2` exists as a separate function at all:
  `dy / dx` alone **loses the sign information of each individual
  component** — dividing `(2, 3)` and `(-2, -3)` gives the exact same ratio
  (`1.5`), even though those two vectors point in *completely opposite*
  directions (one up-and-right, one down-and-left). `atan2` takes `dy` and
  `dx` as **separate** arguments specifically so it can use both signs
  together to determine the correct angle across the *entire* 360°
  range — plain `atan` can only ever return an angle within a 180° range,
  fundamentally unable to distinguish some directions from their exact
  opposite. This is a genuine, common gotcha, not a stylistic preference
  for `atan2`.
- **Argument order matters and is easy to get backward**: it's
  `atan2(y, x)`, not `atan2(x, y)` — a real, common source of bugs; this
  order matches the convention that "vertical component first" mirrors how
  you'd say "y over x" describing a slope, even though it feels
  backward compared to how points are usually written `(x, y)`.

**`angleRadians * (180 / Math.PI)`**
- Radians-to-degrees conversion, the direct inverse of a fact you didn't
  need explicitly in Lesson 20 (since `Math.sin`/`cos` stayed entirely in
  radians there): `180` degrees equals `Math.PI` radians, so multiplying by
  `180 / Math.PI` converts any radian value into the equivalent degree
  value. **CSS's `rotate()` function expects degrees** (or another CSS
  angle unit like `turn`/`rad` explicitly stated), while every `Math`
  trigonometric function stays exclusively in radians — this conversion
  line is the necessary bridge between JS's math and CSS's rotation syntax,
  and forgetting it is an extremely common bug (a `rotate(1.57deg)` where
  you meant a quarter turn, because `1.57` radians was used directly as if
  it were degrees).

### What happens

Every mouse movement fires `mousemove`, recomputing `dx`/`dy` from the
arrow's fixed origin to the current cursor position, finding the angle
between them via `atan2`, converting to degrees, and applying it as a CSS
rotation — the arrow visually tracks the cursor continuously, appearing to
"look at" it wherever it moves.

## 3. Why — the same angle math, applied to a clock hand

```js
function updateClock() {
  const now = new Date();
  const seconds = now.getSeconds();
  const angleDegrees = seconds * 6;

  secondHand.style.transform = "rotate(" + angleDegrees + "deg)";
  requestAnimationFrame(updateClock);
}
```

**`seconds * 6`**
- No `atan2` needed here — this is worth noticing precisely as a contrast:
  `atan2` answers "what angle points from A to B," which was necessary in
  Step 2 because the arrow needed to react to an *arbitrary*, unpredictable
  mouse position. A clock hand's angle, by contrast, is **directly known**
  from the current second — no "point A to point B" relationship to solve
  for at all. A full circle is `360°`; 60 seconds make a full revolution;
  `360 / 60 = 6` degrees per second. **Not every rotation problem needs
  `atan2` — only ones where you're solving for "the angle between two
  points," specifically.** Recognizing which category a problem falls into
  (a known/computable angle, vs. an angle you must derive from two
  positions) is itself a real, transferable skill this lesson wants you to
  start noticing.

### Mental model

```
atan2(dy, dx)  →  "what angle points FROM here TO there"
  — needs two points, derives the angle between them

seconds * 6, or any direct formula  →  "I already know the angle"
  — no derivation needed, just compute it directly
```

## 4. Change one thing

```diff
   document.addEventListener("mousemove", function (event) {
     const dx = event.clientX - originX;
     const dy = event.clientY - originY;
-    const angleRadians = Math.atan2(dy, dx);
+    const angleRadians = Math.atan2(dx, dy);
```

**What changed:** swapped the argument order — `atan2(dx, dy)` instead of
`atan2(dy, dx)`.
**What did not change:** everything else, including the degree conversion.
**Predict, then verify**: the arrow's rotation is now **off by a
consistent 90°** from where it should point (mathematically, swapping the
two arguments is equivalent to reflecting the angle across the diagonal
line `y = x`) — the arrow still moves smoothly and responds to the mouse,
just always aimed a quarter-turn away from actually correct. This is
worth testing directly because the bug is *not* obviously broken-looking at
first glance — it still animates, still tracks the mouse in some sense —
making it a good example of a bug that requires knowing the correct
behavior to even notice, not one that crashes or errors.

## 5. Put it in the project

```js
const arrow = document.getElementById("arrow");
const arrowRect = arrow.getBoundingClientRect();
const originX = arrowRect.left;
const originY = arrowRect.top + arrowRect.height / 2;

document.addEventListener("mousemove", function (event) {
  const dx = event.clientX - originX;
  const dy = event.clientY - originY;
  const angleDegrees = Math.atan2(dy, dx) * (180 / Math.PI);
  arrow.style.transform = "rotate(" + angleDegrees + "deg)";
});
```

**`arrow.getBoundingClientRect()`**
- A built-in DOM method (new to this lesson) returning an object describing
  an element's actual current size and position relative to the viewport —
  `{ left, top, right, bottom, width, height, ... }`. This replaces
  hardcoding `originX`/`originY` as fixed numbers (Step 2), instead
  **deriving** the origin from wherever the arrow's `<div>` actually sits
  in the page's real layout — more robust to the arrow being repositioned
  by CSS changes elsewhere, since the origin is always read from the
  element's real, current position rather than assumed.

## 6. Trap

Predict, then test: resize the browser window (or scroll the page, if it's
tall enough to scroll) after the page has loaded, without moving the mouse,
then move the mouse slightly.

Depending on your exact setup, you may notice the arrow briefly points
somewhere subtly wrong immediately after a resize/scroll, correcting itself
only once the mouse moves again. **The trap: `arrowRect`/`originX`/
`originY` are computed once, when the script first runs — not re-read on
every `mousemove`.** If the page layout shifts afterward (a resize, a
scroll, content loading above the arrow and pushing it down), the cached
origin values become stale, silently wrong, until you either recompute them
on a `resize`/`scroll` listener or move `getBoundingClientRect()` inside
the `mousemove` handler itself (at some performance cost, since it'd then
run on every single mouse movement rather than once).

## 7. Exercise

- **Predict:** For a mouse position directly *above* the arrow's origin
  (same x, smaller y — remember `clientY` increases downward, per Lesson
  5's canvas coordinate note), what should `angleDegrees` be? Compute it by
  reasoning about `dx = 0`, then check against your running code.
- **Modify:** Build a minute hand alongside the second hand, using
  `now.getMinutes() * 6` (plus optionally a fractional adjustment from
  seconds, for smoother motion — a good research-and-attempt exercise).
- **Break:** Remove `transform-origin: left center;` entirely, keeping
  everything else. Does the arrow still visually "point" at the mouse, or
  does it look wrong in a specific, describable way?
- **Trace:** Using a mouse position clearly down-and-left of the arrow's
  origin, compute the signs of `dx` and `dy` by hand, and reason through
  roughly which quadrant (in degrees: 0-90, 90-180, 180-270, or 270-360)
  `atan2` should place the resulting angle in — then verify against the
  running code.

## What to remember
- `atan2(dy, dx)` finds the angle *between two points*, using both
  components' signs to correctly cover the full 360° range — plain
  `atan(dy/dx)` cannot do this, since division destroys sign information.
- Not every rotation needs `atan2` — a directly-known angle (like a clock
  hand) is just computed straightforwardly; recognize which kind of
  problem you actually have.
- CSS `rotate()` wants degrees; `Math` trig functions want radians —
  `radians * (180 / Math.PI)` is the necessary, easy-to-forget bridge.
- Cached position values (`getBoundingClientRect()` read once) go stale if
  the layout shifts afterward — a real, recurring category of bug distinct
  from anything covered in earlier lessons.

## Next lesson
Lesson 22 formalizes what `dx`/`dy` informally already were — **vectors** —
covering magnitude, direction, and normalization, used to build a smooth
mouse-following element (not just rotating toward the mouse, but actually
moving toward it at a controlled speed) and a parallax scrolling effect.
