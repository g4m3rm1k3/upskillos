# Lesson 28 — Bézier Curves & De Casteljau's Algorithm

## What you'll learn
- What a Bézier curve actually *is*, geometrically — not just the
  `cubic-bezier()` timing function from Lesson 15, but the general curve
  type, with any number of control points
- De Casteljau's algorithm — the actual construction method, built from
  nothing but repeated `lerp` (Lesson 27)
- Implementing `cubic-bezier(x1,y1,x2,y2)`'s curve yourself, from scratch,
  instead of treating it as a browser built-in
- Moving an element along an actual curved path (not just easing a straight
  line), using an SVG `<path>` and the same underlying math

## What you'll build
A visual, step-by-step Bézier curve construction (draggable control
points optional, static demonstration required), then an element that
moves along a genuinely curved SVG path rather than a straight line.

## The question
Lesson 15 treated `cubic-bezier(x1, y1, x2, y2)` as a fact to accept:
"these four numbers define a curve shape." Lesson 27 gave you `lerp`. Is
there a way to *construct* an actual Bézier curve using nothing but
repeated `lerp` calls — turning Lesson 15's black box into something you
can build yourself?

## 1. Predict

You have two points, A and B. You already know `lerp(A, B, 0.5)` gives you
the point exactly halfway between them. Now imagine **three** points, A, B,
C — not necessarily in a straight line. Predict: could you use `lerp`
*between pairs* of these three points, then `lerp` again on the *results*,
to produce a single point that traces a smooth curve as you vary the
progress value from 0 to 1? Sketch this mentally — two intermediate points,
then one final point from those.

## 2. Try it — De Casteljau's algorithm, three points (a quadratic Bézier)

```js
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function quadraticBezier(p0, p1, p2, t) {
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  return lerp(q0, q1, t);
}

console.log(quadraticBezier(0, 50, 100, 0));
console.log(quadraticBezier(0, 50, 100, 0.5));
console.log(quadraticBezier(0, 50, 100, 1));
```

### What this code does

**`p0, p1, p2`** — three **control points** (here, simplified to plain
numbers on one axis; Step 3 extends this to actual 2D `{x, y}` points).
`p1` (the middle one) is *not* a point the curve passes through — it
*pulls* the curve toward it, the same "influences but doesn't necessarily
touch" relationship Lesson 15 mentioned for `cubic-bezier`'s control
points, now made completely concrete.

**`const q0 = lerp(p0, p1, t); const q1 = lerp(p1, p2, t);`**
- **This is the direct answer to your Predict question, and it's the exact
  structure of De Casteljau's algorithm**: `lerp` between the *first pair*
  of points (`p0`→`p1`), and separately between the *second pair*
  (`p1`→`p2`), both using the *same* `t`. This produces two new,
  intermediate points — `q0` and `q1` — that themselves move as `t` varies.

**`return lerp(q0, q1, t);`**
- `lerp` **one more time**, between the two intermediate points from the
  previous step, using the same `t` yet again. **This final result is the
  actual point on the Bézier curve at parameter `t`.** Three points, two
  rounds of `lerp`ing (first pairwise, then on the results) — this
  two-level structure is the entire mechanism, and it generalizes: a
  4-point (cubic) Bézier just adds one more round of pairwise `lerp`ing
  before the final blend, explored in Section 3.

### What happens

At `t=0`, the result equals `p0` exactly (0); at `t=1`, it equals `p2`
exactly (100); at `t=0.5`, it's `50` — but **only because these three
example points happen to lie on a straight line**. Section 3 uses
off-line control points, where the curve visibly bends.

## 3. Why — cubic Bézier (four points), matching `cubic-bezier()` exactly

```js
function cubicBezier(p0, p1, p2, p3, t) {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);

  const d = lerp(a, b, t);
  const e = lerp(b, c, t);

  return lerp(d, e, t);
}
```

**Three levels of `lerp`, six calls total, for four points**
- Level 1 (`a, b, c`): pairwise `lerp` across all three adjacent pairs of
  the four original points.
- Level 2 (`d, e`): pairwise `lerp` across the two adjacent pairs of Level
  1's results.
- Level 3 (the return): one final `lerp` between Level 2's two results.
- **This is precisely what `cubic-bezier(x1, y1, x2, y2)` (Lesson 15) is
  computing internally**, with `p0 = (0,0)` and `p3 = (1,1)` fixed (the
  curve's mandatory start/end, from Lesson 15), and `p1 = (x1,y1)`,
  `p2 = (x2,y2)` as the two adjustable control points you supply. **You
  have now built, from first principles using nothing but `lerp`, the exact
  mechanism the browser uses natively for every easing curve in this
  entire curriculum since Lesson 15.**

**Applying it to actual 2D points** (not single numbers):
```js
function lerpPoint(p0, p1, t) {
  return {
    x: lerp(p0.x, p1.x, t),
    y: lerp(p0.y, p1.y, t)
  };
}
```
- The exact same `lerp` formula, applied **independently** to `x` and `y`
  — a genuinely simple extension: 2D `lerp` is just two 1D `lerp`s, one per
  axis, computed separately and paired back together. Swap every `lerp(...)`
  call above for `lerpPoint(...)` and the identical three-level structure
  produces an actual 2D curved point, not just a single number.

### Mental model

```
4 points (0 level)
   ↓ pairwise lerp (3 pairs → 3 points)
3 points (1 level)
   ↓ pairwise lerp (2 pairs → 2 points)
2 points (2 levels)
   ↓ one final lerp
1 point — this IS the curve, at parameter t
```

Repeat this entire process for many `t` values from 0 to 1, and the
resulting sequence of points traces the visible curve.

## 4. Change one thing

```diff
-function cubicBezier(p0, p1, p2, p3, t) {
+function quinticBezier(p0, p1, p2, p3, p4, p5, t) {
   const a = lerp(p0, p1, t);
   const b = lerp(p1, p2, t);
   const c = lerp(p2, p3, t);
+  const cc = lerp(p3, p4, t);
+  const ccc = lerp(p4, p5, t);
```

(Left intentionally incomplete — this is this lesson's exercise territory:
extending the pattern to six points requires one *additional* level of
pairwise `lerp`ing before collapsing down.)

**What this demonstrates, even incomplete**: the pattern **generalizes to
any number of control points** — this is precisely why De Casteljau's
algorithm, not some fixed formula specific to exactly 4 points, is the
"real" definition of a Bézier curve. `cubic-bezier` (4 points) is simply
the specific case CSS chose to expose; the underlying construction method
scales to any count.

## 5. Put it in the project — motion along a real curved path

```html
<svg width="400" height="300" style="position: absolute;">
  <path id="motion-path" d="M 20 250 C 20 50, 380 50, 380 250" fill="none" stroke="#ccc"/>
</svg>
<div id="mover" style="position: absolute; width: 16px; height: 16px;
     background: crimson; border-radius: 50%;"></div>
```

```js
const path = document.getElementById("motion-path");
const mover = document.getElementById("mover");
const pathLength = path.getTotalLength();

function loop(timestamp) {
  const t = (timestamp / 2000) % 1;
  const distance = t * pathLength;
  const point = path.getPointAtLength(distance);

  mover.style.transform = "translate(" + point.x + "px, " + point.y + "px)";
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Code walkthrough

**`d="M 20 250 C 20 50, 380 50, 380 250"`**
- SVG's own path syntax: `M x y` moves the "pen" to a starting point
  without drawing; `C x1 y1, x2 y2, x y` draws a **cubic Bézier curve**
  from the current point to `(x, y)`, using `(x1,y1)`/`(x2,y2)` as the two
  control points — **this is the exact same cubic Bézier structure from
  Section 3**, just expressed in SVG's dedicated path syntax instead of
  raw JS numbers, and now genuinely drawn as a visible curved path on
  screen rather than only used to shape a timing function.

**`path.getTotalLength()` / `path.getPointAtLength(distance)`**
- Two built-in SVG DOM methods (new here): `getTotalLength()` returns the
  curve's actual total length in pixels; `getPointAtLength(distance)`
  returns the `{x, y}` point that many pixels along the curve, measured
  from the start. **Crucially, these measure distance *along the curved
  path itself*, not straight-line/linear progress** — meaning this
  approach automatically handles a subtlety this lesson hasn't needed to
  address until now: a Bézier curve isn't traversed at constant visual
  speed if you just plug `t` directly into the De Casteljau formula
  (curved sections can cover more or less visual distance per unit of
  `t` than straight sections) — using arc length instead of raw `t`
  produces genuinely constant-speed motion along the curve, a real,
  non-obvious detail worth knowing exists even without deriving why `t`
  alone doesn't guarantee it.

### What happens

Every ~2 seconds, `mover` completes one full pass along the curved SVG
path — genuinely following the visible bent shape (up and over, not a
straight line), at a constant visual speed along that curve, computed via
SVG's own built-in path-length machinery rather than manual De Casteljau
calls per frame (though, as Section 3 showed, that same math is exactly
what produced the curve's shape in the first place).

## 6. Trap

Predict, then test: replace `path.getPointAtLength(distance)` with a
direct De Casteljau `t`-based calculation instead (using Section 3's
`cubicBezier`/`lerpPoint` directly, feeding in raw `t` rather than
arc-length distance), applied to the same four control points as the SVG
path above.

Run it, and compare the two side by side (two movers, same curve, two
different progress-driving methods, same total loop duration). **The trap:
the two movers do *not* stay together throughout the animation, even
though they trace the identical visible curve and start/end at the same
time** — the raw-`t` version visibly speeds up through the flatter,
straighter-looking sections of the curve and slows through the more
sharply-bent sections, while the arc-length version moves at a constant
visual pace throughout. **This is the concrete demonstration of the
non-obvious detail flagged in Section 5**: `t` in a Bézier formula is a
parameter controlling the *construction* of the curve, not a guarantee of
constant-speed *traversal* along it — those are two genuinely different
things that happen to coincide only for a straight line.

## 7. Exercise

- **Predict:** For a *quadratic* Bézier (3 points, Section 2) with all
  three points on a perfectly straight line, is the "speed along the curve
  vs. t" problem from Section 6 still present, or does it disappear
  specifically because there's no actual bending? Reason about it, then
  test by comparing raw-`t` vs. arc-length motion along a straight-line
  "curve."
- **Modify:** Change the SVG path's control points (`C 20 50, 380 50, 380
  250` → try `C 200 50, 200 250, 380 250`, for instance) and observe how
  the visible curve shape changes — connect this back to Lesson 15's
  cubic-bezier control-point intuition directly.
- **Complete:** Finish the `quinticBezier` sketch from Section 4 (six
  points, one additional pairwise-lerp level before collapsing) — confirm
  it degenerates correctly to a straight line if all six points are
  collinear and evenly spaced.
- **Trace:** By hand, using Section 2's `quadraticBezier` with
  `p0=0, p1=100, p2=0` (a point that goes out and comes back, not simply
  increasing), compute the result at `t = 0, 0.25, 0.5, 0.75, 1` and sketch
  the resulting shape — confirm a Bézier curve doesn't have to move
  monotonically from start to end.

## What to remember
- A Bézier curve is *constructed*, not just *defined by a formula* — De
  Casteljau's algorithm builds it from nothing but repeated `lerp`, at any
  number of control points, and this is the actual mechanism
  `cubic-bezier()` (Lesson 15) uses internally.
- Middle control points pull the curve toward them without the curve
  necessarily passing through them — the curve only guaranteed to pass
  through the *first* and *last* points.
- SVG's `getPointAtLength`/`getTotalLength` traverse a path by actual arc
  length, producing constant-speed motion along a curve — different from,
  and more correct for motion than, feeding raw `t` directly into a
  Bézier formula.
- The pattern (pairwise lerp, repeated, one fewer point each round) scales
  to any number of control points — cubic (4 points) is just the specific
  case both CSS and SVG paths expose as a dedicated syntax.

## Next lesson
Lesson 29 extends Lesson 23's 2D transform matrices into three dimensions —
`matrix3d`, `perspective`, and `rotateX/Y/Z` — the direct prerequisite for
Lesson 30's quaternions.
