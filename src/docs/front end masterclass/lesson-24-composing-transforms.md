# Lesson 24 — Linear Algebra II: Composing Transforms

## What you'll learn
- Why `transform: translate(100px, 0) rotate(45deg)` and
  `transform: rotate(45deg) translate(100px, 0)` produce **different**
  results, despite looking like they should just "do both"
- Matrix multiplication order, and why CSS applies transforms right-to-left
- `transform-origin` as effectively a hidden third transform, composed
  alongside whatever you write explicitly
- Building an orbiting element around an arbitrary point using composition, not `sin`/`cos` directly

## What you'll build
Two visually different results from the same two transform functions,
just reordered — then an element that orbits around a point *other than
its own center*, built entirely from composed transforms.

## The question
Lesson 23 established that `translate`, `rotate`, and `scale` are each,
individually, one matrix. What happens when you write two of them in the
same `transform` value — are they applied simultaneously, independently, or
does the order you write them in actually matter?

## 1. Predict

Picture a box at the top-left of the screen. First imagine rotating it 45°
in place, *then* moving it 100px to the right. Now imagine moving it 100px
right *first*, *then* rotating 45° in place. Predict: does the box end up
in the same final position and orientation either way, or somewhere
different?

## 2. Try it

```html
<style>
  .box { width: 60px; height: 60px; background: steelblue;
         position: absolute; top: 100px; left: 100px; }
  .a { transform: translateX(150px) rotate(45deg); }
  .b { transform: rotate(45deg) translateX(150px); }
</style>
<div class="box a"></div>
<div class="box b"></div>
```

Load this and look closely — the two boxes end up in visibly different
positions, despite using the exact same two functions.

### What this code does

**`transform: translateX(150px) rotate(45deg);`**
- **CSS applies multiple transform functions right-to-left, mathematically**
  — despite reading left-to-right on the page. So this actually means:
  first rotate 45° (around the element's own center, by default), *then*
  translate 150px along what is now the *rotated* element's horizontal
  axis... except that's not quite it either, and getting this exactly
  right is precisely why this lesson exists rather than just stating a
  rule to memorize.

**The precise mechanism, stated carefully:**
- Every point on the box gets `rotate(45deg)`'s matrix applied **first**
  (rightmost function, applied first), then the *result* of that gets
  `translateX(150px)`'s matrix applied **second** (leftmost function,
  applied second) — matrix operations compose right-to-left, matching how
  function composition normally works in math generally (`f(g(x))` applies
  `g` first, `f` second, even though `f` is written first).
- Because rotation happens *first*, the translation that follows moves the
  **already-rotated** box along the **page's** fixed horizontal axis (not
  the box's own, now-tilted axis) — the box ends up rotated 45° and shifted
  150px purely horizontally on the actual page.

**`transform: rotate(45deg) translateX(150px);`** — the reverse order
- Now `translateX(150px)`'s matrix applies **first** (it's rightmost here),
  moving the box 150px right while still unrotated. *Then* `rotate(45deg)`
  applies **second**, rotating the box — but critically, **rotating around
  its own current center, which is now 150px to the right of where it
  started** — the translation happened before the rotation, so the
  rotation pivots around the already-shifted position, sending the box
  swinging along an arc rather than ending up in the same final spot as
  version `.a`.

### Mental model

```
transform: F G;   (F written first, G written second)
   ↓ applied mathematically as
F(G(point))   — G's matrix multiplies the point FIRST, then F's matrix
   ↓ meaning
RIGHTMOST function in the CSS value takes effect first
```

This is the direct, complete answer to your Predict question: the two
orderings are **not** equivalent, and the visual difference (straight shift
vs. swinging arc) is the concrete, visible proof.

## 3. Why — this is genuinely how matrix multiplication works, not a CSS quirk

- Lesson 23 established each transform function as one matrix. Applying
  two transforms in sequence is **matrix multiplication** — and a
  foundational, sometimes-surprising fact about matrix multiplication in
  general (true in any context, not just CSS) is that it is **not
  commutative**: for two matrices `A` and `B`, `A × B` does not, in
  general, equal `B × A`. This is a real, formal mathematical fact — CSS
  transforms are simply one concrete place where you can *see* its
  consequences directly, rather than an arbitrary rule CSS's designers
  invented.
- Compare to ordinary number multiplication, which *is* commutative
  (`3 × 5 = 5 × 3`, always) — this is precisely the intuition that makes
  transform-order mistakes so easy to make: nothing about everyday
  arithmetic prepares you for an operation where order genuinely matters,
  so it's worth deliberately unlearning that assumption specifically for
  matrices/transforms.

## 4. Change one thing

```diff
-.a { transform: translateX(150px) rotate(45deg); }
+.a { transform: translateX(150px) rotate(45deg) scale(1); }
```

**What changed:** appended `scale(1)` — the identity scale, doing nothing
geometrically (Lesson 23's "do nothing" configuration).
**What did not change:** the visual result — identical to before, exactly
because `scale(1)` is the identity matrix, and composing anything with an
identity matrix (in either position, left or right) leaves the result
unchanged. **This is worth confirming directly**, since it's a useful,
reliable test: appending or prepending an identity transform never changes
a result, which is a quick way to sanity-check whether you've correctly
identified which matrix is "doing nothing" in a more complex composed
transform.

## 5. Put it in the project — orbiting around an arbitrary point, via composition

```css
.orbiter {
  width: 20px;
  height: 20px;
  background: crimson;
  border-radius: 50%;
  position: absolute;
  top: 150px;
  left: 150px;
  animation: orbit 3s linear infinite;
}

@keyframes orbit {
  from { transform: rotate(0deg) translateX(100px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
}
```

### Code walkthrough

**`rotate(0deg) translateX(100px) rotate(0deg)`** (the `from` stage)
- Read right-to-left, per this lesson's core rule: the **innermost**
  (rightmost) `rotate(0deg)` does nothing yet (0°); `translateX(100px)`
  applies next, shifting the dot 100px right of its own position; the
  **outermost** (leftmost) `rotate(0deg)` also does nothing yet. At this
  exact stage (`from`), nothing has visibly happened beyond the plain
  100px shift.

**`rotate(360deg) translateX(100px) rotate(-360deg)`** (the `to` stage)
- The rightmost `rotate(-360deg)` **counter-rotates the dot itself**, so
  that as the *outer* rotation sweeps it around in a circle, the dot's own
  orientation stays visually upright rather than spinning along with its
  orbit (try removing this inner rotation as an exercise below to see the
  difference directly). The middle `translateX(100px)` is what actually
  places the dot 100px away from the orbit's center (the box's own
  original `top`/`left` position) — **this translate is what turns a
  simple `rotate()` into an actual orbit**, since rotating an element
  around its own center alone, with no translation, would just spin it in
  place with zero orbital movement at all.
- The outer `rotate(360deg)` is what actually sweeps that whole
  already-translated position around a full circle over the animation's
  duration, exactly as `@keyframes`/`animation` (Lesson 16) already taught
  you to interpolate between two states — here, the "two states" happen to
  be composed multi-transform values rather than single properties.

### What happens

Over 3 seconds, linearly, the dot's position is continuously recomputed
by composing three transforms — inner counter-rotation, translation
outward, outer rotation — tracing a full circle around the box's original
position while the dot itself stays visually upright throughout, purely
from ordered composition, with no `sin`/`cos` written anywhere in this CSS
at all (though, as Lesson 23 showed, `rotate()` is secretly using exactly
that math underneath).

## 6. Trap

Predict, then test: remove the inner `rotate(0deg)`/`rotate(-360deg)` pair
entirely, leaving just:
```css
@keyframes orbit {
  from { transform: rotate(0deg) translateX(100px); }
  to   { transform: rotate(360deg) translateX(100px); }
}
```

Run it. **The trap: the dot still orbits correctly in terms of position —
but now visibly spins in place once per orbit too**, since nothing
counter-rotates it back to upright. This might even look acceptable or
even desirable depending on what you're building (a planet spinning on its
axis as it orbits, say) — **the point isn't that one version is "correct"
and the other "wrong,"** it's that the specific visual difference between
"orbiting while staying upright" and "orbiting while also spinning" is
determined entirely by whether that inner counter-rotation is present, a
detail easy to omit accidentally and only notice once you're specifically
looking for it.

## 7. Exercise

- **Predict:** For `transform: scale(2) rotate(45deg)`, applied right-to-
  left, is the element scaled-then-rotated or rotated-then-scaled? Does
  the *order* of scale vs. rotate specifically (as opposed to translate vs.
  rotate) actually produce a visibly different result if scaling is
  uniform (`scale(2)`, not `scale(2, 1)`)? Reason about it, then test both
  orderings to check your prediction.
- **Modify:** Change the orbit's `translateX(100px)` to `translateX(160px)`
  — confirm the orbit radius changes accordingly, without touching either
  `rotate` value.
- **Break:** Reorder the orbit keyframes to
  `translateX(100px) rotate(360deg)` (translate outermost instead of
  innermost). Does the dot still orbit around the box's original position,
  or does something else happen? Explain using this lesson's right-to-left
  rule.
- **Trace:** Using the mental model from Section 2, write out in your own
  words, step by step, exactly what happens to a single point on the
  element for `transform: translate(50px, 0) scale(2) rotate(90deg)` —
  three composed functions, applied in the correct order.

## What to remember
- CSS applies multiple `transform` functions **right-to-left**,
  mathematically — the rightmost function's matrix affects the point
  first.
- Matrix multiplication is **not commutative** — `translate then rotate`
  and `rotate then translate` are genuinely different operations, not a
  CSS-specific quirk, but a real property of matrices in general.
- An identity transform (`scale(1)`, `rotate(0deg)`, `translate(0,0)`)
  composed anywhere in a chain never changes the result — a reliable way to
  sanity-check a composed transform.
- Real effects (like orbiting-while-staying-upright) are often built from
  *multiple* composed transforms with deliberate ordering, not a single
  clever one-liner.

## Next lesson
Lesson 25 leaves geometry behind and moves into calculus — derivatives as
the *rate of change* of a curve, used to reason precisely about why some
easing curves (Lesson 15) feel "snappier" than others, and to build a
simple spring-like motion.
