# Lesson 23 — Linear Algebra I: Transforms as Matrices

## What you'll learn
- What `transform: matrix(a, b, c, d, tx, ty)` actually encodes — not a
  mystery six-number soup, a specific, readable structure
- That `translate`, `scale`, and `rotate` are not three unrelated CSS
  features — they're three specific matrices, all doing the same
  underlying operation: transforming a point
- How to read a `matrix()` value and know, without a browser, what it does
- Building a custom skew/shear effect that CSS has no dedicated keyword for, using `matrix()` directly

## What you'll build
The same box, transformed three different ways — first with familiar
`translate`/`scale`/`rotate`, then with the *equivalent* raw `matrix()`
values for each, confirmed to look identical, then one effect (shear) that
only `matrix()` can express directly.

## The question
`transform: translateX(50px)` and `transform: matrix(1, 0, 0, 1, 50, 0)`
produce the *exact same visual result*. Why would CSS have two completely
different-looking ways to say the same thing — and what do those six
numbers in `matrix()` actually mean?

## 1. Predict

You know `translateX(50px)` moves something 50px right, doing nothing else
— no rotation, no resizing. Given that `matrix(1, 0, 0, 1, 50, 0)` does the
identical thing, predict: which of those six numbers do you think
corresponds to "50 pixels right," just by position and value alone?

## 2. Try it

```html
<style>
  .box { width: 60px; height: 60px; background: steelblue; margin: 100px; }
  .a { transform: translateX(50px); }
  .b { transform: matrix(1, 0, 0, 1, 50, 0); }
</style>
<div class="box a"></div>
<div class="box b"></div>
```

Load this and confirm both boxes render in the exact same position.

### What this code does

**`matrix(a, b, c, d, tx, ty)`** — the general form, six numbers, always in
this specific order:

```
| a  c  tx |
| b  d  ty |
| 0  0  1  |
```

- This 3×3 grid (written here for clarity — CSS's `matrix()` syntax lists
  the six meaningful numbers linearly, not visually) is a **transformation
  matrix**. **Every point `(x, y)` on your element gets multiplied by this
  matrix** to produce its new, transformed position — this single
  operation, applied to every point that makes up your element, is the
  entire mechanism behind every 2D CSS transform there is.
- The bottom row (`0, 0, 1`) is always fixed for ordinary 2D transforms —
  it exists for mathematical reasons (enabling translation to work via
  matrix multiplication at all, a technique called "homogeneous
  coordinates") that are worth knowing exist but not essential to use
  `matrix()` correctly — CSS's `matrix()` function only ever asks you for
  the six values that actually vary: `a, b, c, d, tx, ty`.

**`tx, ty` — the last two numbers**
- **This directly answers your Predict question**: `tx`/`ty` are literally
  the plain pixel translation — how far right and down, exactly like
  `translate()`'s own arguments. `matrix(1, 0, 0, 1, 50, 0)` — `tx = 50,
  ty = 0` — moves 50px right, 0px down. This is the easiest part of
  `matrix()` to read at a glance, and a reasonable anchor point for reading
  any unfamiliar matrix value: check the last two numbers first.

**`a, b, c, d` — the first four numbers**
- These control **scaling, rotation, and skewing** — anything that isn't a
  plain positional shift. `matrix(1, 0, 0, 1, ...)` — specifically
  `a=1, b=0, c=0, d=1` — is called the **identity** configuration: it
  applies *no* scaling, rotation, or skew whatsoever, leaving the element's
  size/angle completely unchanged. This is *why* `matrix(1, 0, 0, 1, 50,
  0)` behaves identically to plain `translateX(50px)` — with `a,b,c,d`
  fixed at their "do nothing" values, only the translation portion has any
  effect at all.

## 3. Why — scale and rotate as matrices

**`scale(sx, sy)` as a matrix:**
```
matrix(sx, 0, 0, sy, 0, 0)
```
- `a = sx` (horizontal scale factor), `d = sy` (vertical scale factor), and
  `b`/`c` stay `0` (no rotation/skew component involved), `tx`/`ty` stay
  `0` (no translation). `transform: scale(2)` (uniform 2x scale) is exactly
  `matrix(2, 0, 0, 2, 0, 0)` — confirm this yourself by testing both on
  the same element.

**`rotate(θ)` as a matrix:**
```
matrix(cos(θ), sin(θ), -sin(θ), cos(θ), 0, 0)
```
- **This is the direct payoff of Lesson 20's sine/cosine lesson, reappearing
  in a completely different context.** Rotating a point by angle `θ` is
  *defined*, mathematically, using exactly the same `sin`/`cos` functions
  you used to move a dot in a circle — because rotating a *shape* is
  really just rotating *every point that makes it up*, each by the same
  angle, around the same center. `a = cos(θ)`, `b = sin(θ)`, `c = -sin(θ)`,
  `d = cos(θ)` — worth testing directly: compute `cos(45°)` and `sin(45°)`
  (both ≈ 0.707), plug them into `matrix(0.707, 0.707, -0.707, 0.707, 0,
  0)`, and confirm it renders identically to `transform: rotate(45deg)`.

### Mental model

```
translate(tx, ty)  →  matrix(1, 0, 0, 1, tx, ty)
scale(sx, sy)      →  matrix(sx, 0, 0, sy, 0, 0)
rotate(θ)          →  matrix(cos θ, sin θ, -sin θ, cos θ, 0, 0)
```

Three CSS functions that look unrelated on the surface are three specific,
readable fillings of the exact same six-number template.

## 4. Change one thing

```diff
-.b { transform: matrix(1, 0, 0, 1, 50, 0); }
+.b { transform: matrix(1, 0, 0, 1, 50, 30); }
```

**What changed:** `ty` from `0` to `30`.
**What did not change:** `a, b, c, d` — still the identity, still no
scale/rotate/skew.
**Predict, then verify**: the box now moves 50px right **and** 30px down,
identical to `transform: translate(50px, 30px)` — confirming `tx`/`ty` map
directly and independently onto horizontal/vertical translation, exactly
as their position in the matrix suggested.

## 5. Put it in the project — skew, which has no simple standalone function

```css
.skewed {
  transform: matrix(1, 0, 0.5, 1, 0, 0);
}
```

**`c = 0.5`, everything else at identity values**
- CSS does have a dedicated `skew()` function, but seeing it built directly
  from `matrix()` first is more instructive here: `c` (and independently
  `b`) controls **shear** — pushing one axis's points sideways by an amount
  *proportional to their position on the other axis*. With `c = 0.5`, a
  point's `x` position becomes `x + 0.5 * y` — points further down the
  element get pushed further right than points near the top, producing the
  slanted-parallelogram "skew" look, entirely from one off-diagonal number
  in an otherwise-identity matrix.
- **This is worth sitting with precisely because it's the one effect in
  this lesson genuinely easier to reach via `matrix()` directly than by
  composing multiple named functions** — `skewX(θ)` exists too
  (`matrix(1, 0, tan(θ), 1, 0, 0)`, using tangent — the third basic
  trig function, related to but distinct from sine/cosine, not covered
  in depth here), but understanding *why* a single off-diagonal matrix
  value produces this specific slanting effect is the real payoff, more
  than memorizing the `skewX` shorthand.

## 6. Trap

Predict, then test: take `rotate(45deg)`'s matrix form
(`matrix(0.707, 0.707, -0.707, 0.707, 0, 0)`) and swap `b` and `c`:
`matrix(0.707, -0.707, 0.707, 0.707, 0, 0)`.

Run it. **The trap: this doesn't produce a rotation in the opposite
direction, as you might guess from the sign flip — it still produces a
valid-looking rotation, but if you test multiple angles this way, you'll
find swapping `b`/`c` actually reverses the rotation's *direction*
(clockwise becomes counterclockwise) rather than just its angle.** This is
worth confirming directly rather than assuming: `b`/`c`'s specific
positions in the matrix are not interchangeable or symmetric — each has a
distinct geometric role (one governs how much y-movement a change in x
causes, the other the reverse), and swapping them isn't equivalent to
negating the angle, even though the numbers involved look superficially
similar. Precision in which position holds which value is not optional
here — general matrices are **not** symmetric under swapping off-diagonal
entries, a real fact about matrices as a mathematical object, not a
CSS-specific quirk.

## 7. Exercise

- **Predict:** What matrix values represent `scale(1)` combined with no
  rotation and no translation at all — i.e., an element transformed to look
  **exactly like it started**? (This specific matrix has a name: the
  **identity matrix**.)
- **Modify:** Build `matrix(-1, 0, 0, 1, 0, 0)` — predict what visual
  effect a negative `a` alone produces, before testing (hint: think about
  what happens to every point's x-coordinate when multiplied by `-1`).
- **Break:** Try `matrix(0, 1, -1, 0, 0, 0)` — compute what angle this
  corresponds to by matching it against the `rotate(θ)` template above (you
  may need to recall or look up which angle gives `cos(θ) = 0,
  sin(θ) = 1`).
- **Trace:** Write out, using the `scale(sx,sy)` template, the exact matrix
  values for `scale(2, 0.5)` (stretched wide, squashed tall) — then test it
  against `transform: scale(2, 0.5)` directly to confirm your derivation.

## What to remember
- `matrix(a, b, c, d, tx, ty)` isn't an arbitrary six-number format —
  `tx`/`ty` are plain translation; `a, b, c, d` encode scale/rotate/skew,
  all as specific, derivable fillings of the same template.
- `translate`, `scale`, and `rotate` are not unrelated CSS features — they
  are three different matrices, and `rotate(θ)`'s matrix uses the exact
  `sin`/`cos` from Lesson 20, applied to every point of the shape.
- Off-diagonal values (`b`, `c`) control skew/shear — and are not
  symmetric or interchangeable with each other, despite looking
  superficially similar in the matrix layout.
- Building an unfamiliar effect directly from `matrix()` (like skew here)
  is often more instructive than memorizing a shorthand function's
  existence.

## Next lesson
Lesson 24 covers what happens when you apply **more than one** transform to
the same element — `transform: translate(...) rotate(...)` — and why the
*order* you write them in changes the result, using matrix composition to
explain exactly why.
