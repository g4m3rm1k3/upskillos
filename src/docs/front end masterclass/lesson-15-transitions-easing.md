# Lesson 15 — Transitions & the Math of Easing

## What you'll learn
- `transition` — what actually triggers it, and what "transitionable" means
- `transform` — why animating this (not `top`/`left`/`width`) is the performant choice
- Easing functions as literal math: a cubic Bézier curve mapping time → progress
- Reading and writing your own `cubic-bezier(...)` curves instead of only using keyword presets

## What you'll build
A button that grows and changes color on hover, first with a linear
transition, then with progressively more custom easing curves, so you can
see the same motion feel completely different.

## The question
`transition-timing-function: ease` doesn't just make something "smoother" —
it's controlling the literal *rate* at which a value moves from its start to
its end. What kind of math describes "how fast, at each instant" for a
motion that isn't constant-speed?

## 1. Predict

Picture a ball rolling to a stop versus a ball at constant speed the whole
way. Predict: for the "rolling to a stop" motion, is the ball moving faster
at the *start* or the *end* of its travel? Keep that picture — it's exactly
what `ease-out` is modeling.

## 2. Try it

```html
<style>
  .box {
    width: 100px;
    height: 100px;
    background: steelblue;
    transition: transform 0.4s linear;
  }
  .box:hover {
    transform: scale(1.3);
  }
</style>
<div class="box"></div>
```

### What this code does

**`transition: transform 0.4s linear;`**
- Shorthand for three values: **which property** to animate (`transform`),
  **how long** (`0.4s`), and **what timing curve** to use (`linear`). This
  line does not itself cause any change — it only says "if `transform`'s
  value changes for any reason, animate that change over 0.4s instead of
  jumping instantly."

**`.box:hover { transform: scale(1.3); }`**
- On hover, `transform`'s value actually changes (from its implicit default
  to `scale(1.3)`). Because `.box` has a `transition` rule watching
  `transform` specifically, this change is what triggers the animation —
  **the `transition` property and the actual value change are two separate
  rules that only work together because they both target the same
  property.**

**`transform: scale(1.3)`**
- **Why `transform` and not `width`/`height` directly?** `transform` (and
  `opacity`) can typically be animated by the browser's compositor — a
  separate, GPU-accelerated step that doesn't require the browser to
  recompute the page's entire layout on every animation frame. Animating
  `width`, `height`, `top`, `left`, or `margin` instead can force a full
  **layout recalculation** on every single frame, which is measurably
  slower and can cause visible jank on lower-powered devices — this is a
  real, practical performance rule, not a stylistic preference.

**`linear`**
- The timing function: progress moves at a perfectly constant rate from 0%
  to 100% over the 0.4s. This is deliberately the *least* natural-feeling
  option — used here first so the next section's curves have an obvious
  baseline to compare against.

## 3. Why — the actual math

Every non-linear CSS timing function (`ease`, `ease-in`, `ease-out`, or a
custom curve) is defined by a **cubic Bézier curve**:

```css
transition-timing-function: cubic-bezier(x1, y1, x2, y2);
```

**The curve, precisely:**
- The curve lives on a graph where the **x-axis is time** (0 to 1, i.e. 0%
  to 100% of the transition's duration) and the **y-axis is progress**
  (0 to 1, i.e. 0% to 100% of the way from the start value to the end
  value).
- The curve always **starts at point (0, 0)** and **ends at point (1, 1)**
  — every timing function, no exceptions, takes the property from fully-start
  to fully-end over the full duration; what differs is the *shape* of the
  path between those two fixed points.
- `cubic-bezier(x1, y1, x2, y2)` defines **two control points** —
  `(x1, y1)` and `(x2, y2)` — that pull the curve toward them without the
  curve necessarily passing through them exactly. This is the same
  mathematical curve type used in vector graphics/font design (if you've
  ever used a pen tool with draggable handles in a design program, this is
  the identical underlying math).
- **What the keyword presets actually equal**, in exact numbers:
  - `linear` — not technically a Bézier curve at all; a straight line, `y = x`.
  - `ease` (the CSS default) — `cubic-bezier(0.25, 0.1, 0.25, 1)`
  - `ease-in` — `cubic-bezier(0.42, 0, 1, 1)`
  - `ease-out` — `cubic-bezier(0, 0, 0.58, 1)`
  - `ease-in-out` — `cubic-bezier(0.42, 0, 0.58, 1)`

**Reading a curve's shape from its numbers, directly answering your Predict
question:**
- `ease-out`'s first control point is `(0, 0)` — pinned at the very start,
  meaning progress rises **steeply immediately** (fast at the start).
- Its second control point, `(0.58, 1)`, has a **y already at 1** while x is
  only `0.58` — meaning progress has nearly finished (reached full value)
  before time has finished (60% of the way through), so the curve
  **flattens out near the end** — motion slows down as it approaches the
  finish. This is exactly "the ball rolling to a stop" from your prediction.
- `ease-in` is the mirror image: starts flat (slow start), then steepens
  sharply near the end (fast finish) — like something accelerating from a
  standstill.

## 4. Change one thing

```diff
   .box {
     ...
-    transition: transform 0.4s linear;
+    transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
   }
```

**What changed:** the timing function, to a curve with control points
*outside* the normal 0-to-1 range (`-0.55` and `1.55`).
**What did not change:** the curve still starts at `(0,0)` and ends `(1,1)`
— those endpoints are fixed regardless of control points.
**Predict, then verify**: control points outside `[0, 1]` produce
**overshoot** — the animated value briefly goes *past* its target (the box
scales up slightly larger than `1.3` momentarily, then settles back), the
classic "bouncy" feeling. This is a real, commonly used effect (informally
called "back easing"), and it's directly explainable from the math: nothing
stops a Bézier curve's y-value from exceeding 1 partway through, even though
it must still equal exactly 1 at the very end.

## 5. Put it in the project

```css
.box {
  width: 100px;
  height: 100px;
  background: steelblue;
  border-radius: 8px;
  transition: transform 0.3s ease-out, background-color 0.3s linear;
}
.box:hover {
  transform: scale(1.15) rotate(3deg);
  background-color: coral;
}
```

**`transition: transform 0.3s ease-out, background-color 0.3s linear;`**
- A **comma-separated list** — multiple properties can each get their own
  independent duration and timing function in a single `transition`
  declaration. Here, the size/rotation change eases out (feels natural,
  physical), while the color change stays linear (color transitions
  generally don't benefit from easing the way spatial motion does — this is
  a real, common professional choice, not an arbitrary example).

**`transform: scale(1.15) rotate(3deg)`**
- Multiple transform functions **space-separated** in one value — both
  apply together, composed (more on exactly how transforms compose in
  Lesson 22-23).

## 6. Trap

Predict, then test: change `.box`'s `transition` to
`transition: all 0.3s ease-out;` (using the `all` keyword instead of naming
specific properties), then add a third hover change:
`.box:hover { transform: scale(1.15); background: coral; border-radius:
50%; }`.

Run it — every changed property animates, which might look like the
convenient outcome. **The trap: `transition: all` also silently animates
*any* property that changes for *any* reason** — including ones you didn't
intend, like a `width`/`height` change from a later CSS rule, a JS-driven
style change, or even certain layout shifts. This can produce confusing,
hard-to-debug unintended animations later in a real project. **Naming
properties explicitly (as in Step 5) is the safer default**; `all` is
convenient for quick prototyping but a common source of "why is this
randomly animating" bugs once a project grows.

## 7. Exercise

- **Predict:** Sketch (on paper or mentally) what `cubic-bezier(0, 0, 1, 1)`
  should produce, given the endpoint rule above. Then check: is it
  identical to `linear`, or subtly different?
- **Modify:** Try `cubic-bezier(0.86, 0, 0.07, 1)` (a common
  "ease-in-out-ish but more dramatic" curve) on the box's `transform` — does
  it feel slower in the middle, faster at both ends, matching what its
  control points' positions would predict?
- **Break:** Remove `transition` entirely and just add/remove the `:hover`
  styles. What's the *only* thing that's different about how the box
  changes state?
- **Trace:** For `ease-in` (`cubic-bezier(0.42, 0, 1, 1)`), explain in your
  own words why its *second* control point being exactly `(1, 1)` (matching
  the curve's own endpoint) results in a fast, steep finish rather than a
  gentle one.

## What to remember
- `transition` only animates a property that *changes value* for some other
  reason (like `:hover`) — it doesn't cause change by itself.
- Animate `transform`/`opacity` for performance; animating `width`/`top`/
  `margin` can force expensive layout recalculation every frame.
- Every timing function is a cubic Bézier curve from `(0,0)` to `(1,1)`;
  control points outside `[0,1]` produce overshoot/bounce — this is
  literal, readable math, not a black box of keyword presets.
- `transition: all` is convenient but animates unintended property changes
  too — name properties explicitly in real projects.

## Next lesson
Lesson 16 moves from single hover transitions to `@keyframes` — animations
with multiple stages and their own internal timing, used to build an actual
loading spinner and skeleton-loading screen from scratch.
