# Lesson 27 — Interpolation: Building Your Own Easing Function

## What you'll learn
- `lerp` (linear interpolation) — the single formula underlying every
  "blend between two values" operation you've written informally since
  Lesson 8
- Writing your own named easing functions from scratch — `easeInQuad`,
  `easeOutQuad`, `easeInOutQuad` — instead of only ever using CSS's
  built-ins or Lesson 15's `cubic-bezier`
- Applying a hand-written easing function to drive real DOM motion, with no
  CSS `transition`/`animation` involved at all
- How this lesson's `lerp` connects back to nearly everything else in this
  math track — sine motion, springs, matrices, and integration

## What you'll build
A generic `lerp`-based animation helper, three hand-written easing
functions from actual formulas (not memorized keywords), and a final demo
comparing all three side by side, moving the same distance over the same
duration.

## The question
Every lesson in this math track has, at some point, blended between two
values — Lesson 20's `centerY + amplitude * sin(t)`, Lesson 22's
`current += (target - current) * factor`, Lesson 25's spring settling
toward a target. Is there one general formula underlying "blend between A
and B by some amount," that all of these are really specific cases of?

## 1. Predict

If `start = 0` and `end = 100`, predict: what single formula, given a
`progress` value ranging from `0` to `1`, would produce `0` when
`progress = 0`, `100` when `progress = 1`, and exactly `50` when
`progress = 0.5`? (You likely already know this instinctively — this
lesson exists to name and formalize it.)

## 2. Try it

```js
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

console.log(lerp(0, 100, 0));
console.log(lerp(0, 100, 0.5));
console.log(lerp(0, 100, 1));
console.log(lerp(0, 100, 1.5));
```

### What this code does

**`start + (end - start) * progress`**
- **This is `lerp` — linear interpolation — and it's the exact formula
  your Predict answer almost certainly already matched.** `(end - start)`
  is the total distance to cover; multiplying by `progress` (0 to 1) takes
  that *fraction* of the distance; adding it to `start` produces the
  blended value. At `progress = 0`, you get exactly `start`; at
  `progress = 1`, exactly `end`; anywhere between, a proportional blend.
- **This single function is the generalized, named version of a pattern
  you've written slightly differently, several times, across this entire
  math track**: Lesson 22's `dotX += dx * 0.05` is (approximately) `lerp`
  applied repeatedly, a tiny bit each frame, toward a moving target;
  Lesson 20's `centerY + amplitude * sin(t)` is structurally identical to
  `lerp`'s shape (`base + range * blend_factor`), just using `sin(t)`
  instead of a plain `0-to-1 progress` as the blend factor.

**`lerp(0, 100, 1.5)`**
- Notice `progress` isn't actually restricted to `[0, 1]` by the formula
  itself — `1.5` produces `150`, **extrapolating past `end`.** This is
  worth testing directly: `lerp` doesn't clamp anything on its own: it's
  the caller's responsibility to keep `progress` in range if overshoot
  isn't wanted, exactly the same "the math itself doesn't stop overshoot,
  the caller must" lesson from Lesson 15's out-of-range Bézier control
  points.

## 3. Why — building easing functions from scratch

```js
function linear(t) {
  return t;
}

function easeInQuad(t) {
  return t * t;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutQuad(t) {
  if (t < 0.5) {
    return 2 * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 2) / 2;
}
```

**`easeInQuad(t) { return t * t; }`**
- Squaring `t` produces a curve that starts **very flat** (near `t = 0`,
  `t * t` is tiny — e.g. `0.1 * 0.1 = 0.01`) and **steepens** toward the
  end (near `t = 1`, `t * t` approaches `1` rapidly) — this is "ease in":
  slow start, fast finish, purely from squaring a number between 0 and 1
  (recall that squaring any fraction between 0 and 1 makes it *smaller*,
  and that effect is strongest furthest from 1).
- **This connects directly to Lesson 25**: this curve's derivative
  (computable with Lesson 25's `slopeAt`, as an exercise below) is smaller
  near `t=0` and larger near `t=1` — the exact numerical signature of
  "starts slow, speeds up," now something you can verify with code you
  already wrote two lessons ago, rather than take on faith.

**`easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }`**
- This is the exact function from Lesson 25's derivative example —
  **worth recognizing it's the same formula reappearing here**, now
  explained structurally rather than given as a black box: `(1 - t)`
  flips the input (large when `t` is small, small when `t` is large);
  squaring it, then subtracting from `1`, produces the mirror-image curve
  of `easeInQuad` — fast start, slow finish.

**`easeInOutQuad(t) { if (t < 0.5) { ... } return ...; }`**
- A **piecewise function** — different formulas for different halves of
  the input range, joined at `t = 0.5`. The first half
  (`2 * t * t`) is a rescaled version of `easeInQuad`'s "slow start"
  shape, compressed to reach `0.5` (not `1`) by the midpoint; the second
  half mirrors `easeOutQuad`'s "slow finish" shape for the remaining
  half. `Math.pow(-2 * t + 2, 2)` is JS's exponentiation function
  (equivalent to `(-2 * t + 2) ** 2`) — used here instead of repeated
  multiplication purely for readability with this particular formula
  shape. **The result: slow at both ends, fast through the middle** — a
  genuinely different, deliberately combined shape from either half alone.

## 4. Change one thing

```diff
 function easeInQuad(t) {
-  return t * t;
+  return t * t * t;
 }
```

**What changed:** cubing instead of squaring.
**What did not change:** the overall "starts slow" character of the curve.
**Predict, then verify**: `t * t * t` (informally, "ease in cubic")
produces an even **more exaggerated** slow start than squaring did — for
any `t` strictly between 0 and 1, cubing shrinks the value further than
squaring does (e.g. `0.5² = 0.25`, but `0.5³ = 0.125`), meaning the
early portion of the animation moves even less before catching up sharply
near the end. This directly demonstrates that "ease in" isn't one fixed
curve — it's a whole *family* of curves (quad, cubic, quartic...), all
sharing the same "slow start" character but differing in exactly how
pronounced that effect is, controlled by a single, simple change: the
exponent.

## 5. Put it in the project — driving real motion, no CSS transition/animation at all

```js
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function animate(element, from, to, duration, easingFn) {
  const startTime = performance.now();

  function frame(currentTime) {
    const elapsed = currentTime - startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(rawProgress);
    const currentValue = lerp(from, to, easedProgress);

    element.style.transform = "translateX(" + currentValue + "px)";

    if (rawProgress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

const box = document.getElementById("box");
animate(box, 0, 300, 1000, easeOutQuad);
```

### Code walkthrough

**`function animate(element, from, to, duration, easingFn) { ... }`**
- A genuinely reusable animation helper — takes *any* element, *any* start/
  end values, *any* duration, and **any easing function matching the `(t)
  => number` shape**, including every function you wrote in Section 3, or
  a `cubic-bezier`-equivalent you could write yourself. This is the
  practical, reusable payoff of this entire lesson: a hand-built
  replacement for what `transition`/`animation` (Lessons 15-16) did via
  CSS, now fully explicit and controllable from JS.

**`const rawProgress = Math.min(elapsed / duration, 1);`**
- `elapsed / duration` — what fraction of the total duration has passed,
  as a plain `0-to-1`-ish value (this is the "time" input every easing
  function in Section 3 expects). `Math.min(..., 1)` clamps it so it never
  exceeds `1` even if a frame lands slightly after the animation should
  have ended — directly addressing the "the math itself doesn't stop
  overshoot" caveat from Section 2: here, the *caller* (this `animate`
  function) explicitly enforces the clamp `lerp` itself doesn't.

**`const easedProgress = easingFn(rawProgress);`**
- **This is where the easing function actually gets used** — not to
  compute a pixel value directly, but to *transform* the plain linear
  `0-to-1` progress into a curved `0-to-1` progress, which is *then* fed
  into `lerp`. This two-step structure — ease the progress, then lerp
  using the eased progress — is the general, reusable pattern any custom
  easing/animation system uses, and it cleanly separates two concerns:
  "what curve shape" (`easingFn`) and "what range of actual values"
  (`lerp`'s `from`/`to`).

**`if (rawProgress < 1) { requestAnimationFrame(frame); }`**
- Unlike Lesson 5/20's loops, which scheduled themselves unconditionally
  forever, this one **stops itself** once the animation completes —
  worth noticing as a real, deliberate difference: a one-shot animation
  (like this) needs an explicit stopping condition; a continuous loop
  (orbiting, spinning) does not.

### What happens

`animate` runs its own private `requestAnimationFrame` loop, computing
real elapsed time each frame, turning that into a `0-to-1` progress,
running it through whichever easing function was passed in, then `lerp`ing
between `from` and `to` using that eased value — producing the exact same
*kind* of motion Lesson 15's `transition: transform 1s ease-out;` would
have, except now entirely hand-built, inspectable, and extensible with any
formula you can write.

## 6. Trap

Predict, then test: call `animate(box, 0, 300, 1000, linear)` and
`animate(box, 0, 300, 1000, easeOutQuad)` on **two different elements** at
the same time, and watch closely which one visually "wins the race" partway
through — not just which finishes first (they finish at the same time,
same `duration`).

Run it. **The trap, worth confirming directly rather than assuming**: the
`easeOutQuad` element is visibly *ahead* of the `linear` one for most of
the animation's duration, despite both starting and ending at the exact
same values, at the exact same time. This is the precise, visual
consequence of `easeOutQuad`'s derivative being *larger* than `1`
(linear's constant derivative) throughout most of its early-to-middle
range, compensated by being *smaller* than `1` right at the very end — the
two curves must cover the identical total distance in the identical total
time (same start, same end, same duration), but *how* they distribute that
distance across the duration differs completely, which is the entire
point of choosing one easing function over another.

## 7. Exercise

- **Predict:** For `easeInOutQuad`, at exactly `t = 0.5`, both piecewise
  branches should agree (the function shouldn't visibly "jump"). Verify
  this by hand: compute `2 * 0.5 * 0.5` from the first branch, and
  `1 - Math.pow(-2 * 0.5 + 2, 2) / 2` from the second — confirm they match.
- **Modify:** Write `easeInCubic`/`easeOutCubic` (using `t*t*t` and its
  mirror), and add them to a side-by-side `animate` comparison against the
  quad versions.
- **Combine:** Use Lesson 25's `slopeAt` function against your own
  `easeOutQuad` here, at `t = 0.1` and `t = 0.9` — confirm the derivative
  is larger near the start, matching this lesson's Trap-section
  observation about which element "wins the race" early on.
- **Trace:** Write, in your own words, how `lerp` (this lesson),
  `sin`/`cos` (Lesson 20), `matrix()` (Lesson 23), and Euler integration
  (Lesson 26) are all specific instances of the same general idea: taking
  some known/computable quantity and using it to produce a position or
  value, frame by frame or point by point. What's the one sentence that
  describes what all four have in common?

## What to remember
- `lerp(start, end, progress) = start + (end - start) * progress` is the
  single general formula underlying nearly every "blend between two
  values" operation across this entire math track, informally reused many
  times before being named here.
- Custom easing functions are just `(t) => number` mappings from `[0,1]`
  to `[0,1]` — squaring/cubing/piecewise-combining are all legitimate,
  understandable ways to build new curve shapes, not mysterious presets.
- The two-step "ease the progress, then lerp using it" pattern is the
  general structure any hand-built animation system uses — separating
  *curve shape* from *value range* cleanly.
- Same start, same end, same duration, but visibly different mid-animation
  position — this is the concrete, visual meaning of two easing functions
  having different derivatives along the way, tying Lesson 25's abstract
  "rate of change" directly to something you can watch happen on screen.

## This closes the math track
Lessons 20-27 took `sin`/`cos` (circular motion), `atan2` (angle-between-
points), vectors (magnitude/direction), matrices (what `transform`
actually is), derivatives (rate of change), integration (accumulating a
rate into a total), and `lerp` (blending between values) — and connected
every one of them back to something visible: an orbiting dot, a rotating
arrow, a following cursor, a composed transform, an easing curve's feel, a
bouncing ball, a hand-built animation. None of this needed to be memorized
as isolated CSS tricks — each lesson's math is the actual, real reason the
corresponding visual behaves the way it does. Combined with Lessons 1-19's
JS/React/backend foundation, you now have both the practical building
blocks and the underlying math that makes advanced, physically-grounded
frontend animation something you can construct from first principles
instead of only ever assembling from someone else's preset.
