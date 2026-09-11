# Lesson 25 — Calculus I: Derivatives as Velocity

## What you'll learn
- What a derivative actually is: the instantaneous rate of change of a
  value — not an abstract symbol, a concrete "how fast is this changing
  right now"
- Reading an easing curve's *steepness* (Lesson 15) as literally its
  derivative — connecting calculus directly to something you've already
  built
- Approximating a derivative numerically in code, without symbolic calculus
- Building actual spring physics — an element that overshoots and settles,
  driven by a real physical formula (Hooke's law), not a canned easing curve

## What you'll build
A small numeric experiment showing a curve's derivative computed directly
from code, then a spring-driven element — pull it and release, and it
oscillates and settles realistically, the way no `cubic-bezier` curve
(fixed shape, fixed duration) can quite replicate.

## The question
Lesson 15 said `ease-out` "starts fast, slows down near the end" — a
description in words. Is there a way to express "how fast, at this exact
instant" as an actual number, at any specific point along the curve, not
just a general before/after comparison?

## 1. Predict

Picture a car's speedometer. At any single instant, it shows one number —
not "how far you've gone," but "how fast you're going *right now*."
Predict: if you only had a list of the car's *positions* at many closely-
spaced moments in time (no speedometer at all), could you compute an
approximate "current speed" from just those position numbers alone? What
arithmetic would you need?

## 2. Try it

```js
function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

const t1 = 0.2;
const t2 = 0.201;
const rateOfChange = (easeOutQuad(t2) - easeOutQuad(t1)) / (t2 - t1);

console.log(rateOfChange);
```

### What this code does

**`easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }`**
- A specific, well-known easing function (distinct from Lesson 15's
  Bézier curves, though conceptually the same *kind* of thing: a function
  mapping time `t` in `[0,1]` to progress in `[0,1]`) — "ease out
  quadratic," a common alternative curve shape to Bézier-based easing.
  You don't need to derive this formula yourself; treat it as a given
  black-box function for this lesson, the same way you treated `Math.sin`
  as given in Lesson 20.

**`const t1 = 0.2; const t2 = 0.201;`**
- Two `t` values, extremely close together (0.001 apart) — this small gap
  is deliberate and important, explained next.

**`(easeOutQuad(t2) - easeOutQuad(t1)) / (t2 - t1)`**
- **This is the direct answer to your Predict question, and it's the exact
  definition of a derivative, computed numerically rather than
  symbolically**: `(change in output) / (change in input)`. Precisely the
  "rise over run" slope formula you'd use for a straight line between two
  points — except here, because `t1`/`t2` are so close together, this
  slope approximates the curve's **instantaneous** rate of change at
  `t ≈ 0.2`, rather than the average rate of change over some larger,
  more noticeable span.
- **Why does making the gap tiny matter?** Because the curve itself is not
  straight — its steepness genuinely differs at different points. A large
  gap between `t1`/`t2` would average over a stretch of curve that's
  bending, blurring together regions of different actual steepness. A
  tiny gap captures the steepness at essentially one specific point,
  because over a small enough span, any smooth curve looks approximately
  straight — this is the core intuition behind calculus's actual formal
  definition of a derivative (which uses an infinitely small gap, a
  "limit," rather than a small-but-finite `0.001` — this code is a
  genuine, practical approximation of that formal definition, not a full
  substitute for it, worth being honest about as a real simplification).

### What happens

`rateOfChange` prints a number — roughly `1.6` for this specific curve at
`t ≈ 0.2` — representing "how fast progress is increasing, right at the
20% mark of the animation." This single number is the derivative at that
point: not a description in words like "fast" or "slow," an actual,
computed rate.

## 3. Why — reading Lesson 15's easing curves as their own derivatives

```js
function slopeAt(fn, t, epsilon = 0.001) {
  return (fn(t + epsilon) - fn(t - epsilon)) / (2 * epsilon);
}

console.log("slope near start:", slopeAt(easeOutQuad, 0.05));
console.log("slope near end:", slopeAt(easeOutQuad, 0.95));
```

**`slopeAt(fn, t, epsilon = 0.001)`**
- A reusable, general version of Step 2's calculation — works for *any*
  function `fn`, at *any* point `t`, not hardcoded to one curve or one
  specific `t` value.
- `epsilon = 0.001` — a **default parameter value** (new syntax here): if
  the caller doesn't supply a third argument, `epsilon` automatically
  becomes `0.001`. `epsilon` is a conventional name in math/programming
  for "a small quantity," specifically chosen here to make clear this is
  the "how small a gap" knob from Step 2, generalized and named properly.

**`(fn(t + epsilon) - fn(t - epsilon)) / (2 * epsilon)`**
- A slightly refined version of Step 2's formula — instead of comparing `t`
  to `t + epsilon` (a "forward" difference), this compares `t - epsilon` to
  `t + epsilon` (a "centered" difference), which is a more numerically
  accurate approximation of the true instantaneous slope at `t` itself
  (rather than slightly biased toward the region just after `t`) — a real,
  standard refinement in numerical approximation generally, worth knowing
  the term "centered difference" exists even without deriving why it's
  more accurate in full mathematical detail here.

**Running this against `easeOutQuad` at `t = 0.05` versus `t = 0.95`**
- **This is the direct connection back to Lesson 15.** You'll find the
  slope near the start (`t = 0.05`) is noticeably steeper than the slope
  near the end (`t = 0.95`) for this specific "ease out" curve — this
  *is*, numerically and precisely, what "starts fast, slows down" actually
  means: a **larger derivative** near the start, a **smaller derivative**
  near the end. Lesson 15 described this in words and showed you the
  curve's *shape*; this lesson gives you the actual number quantifying
  "how much faster," at any point you choose to check.

## 4. Change one thing

```diff
 function easeOutQuad(t) {
   return 1 - (1 - t) * (1 - t);
 }
+function linear(t) {
+  return t;
+}

-console.log("slope near start:", slopeAt(easeOutQuad, 0.05));
-console.log("slope near end:", slopeAt(easeOutQuad, 0.95));
+console.log("linear slope at 0.05:", slopeAt(linear, 0.05));
+console.log("linear slope at 0.95:", slopeAt(linear, 0.95));
```

**What changed:** testing `slopeAt` against `linear` (Lesson 15's baseline
"no easing" curve) instead of `easeOutQuad`, at the same two points.
**What did not change:** `slopeAt` itself — reused exactly as-is, since it
works for any function.
**Predict, then verify**: both calls should return (very close to) exactly
`1`, **identical at both points** — this is the precise, numerical meaning
of "linear": a **constant derivative**, the same rate of change everywhere
along the curve, which is exactly what "constant speed" (Lesson 15's
original description of `linear`) means when stated using calculus's actual
vocabulary instead of an everyday word.

## 5. Put it in the project — real spring physics

```js
const dot = document.getElementById("dot");

let position = 0;
let velocity = 0;
const target = 200;
const stiffness = 0.1;
const damping = 0.8;

function loop() {
  const distanceToTarget = target - position;
  const springForce = distanceToTarget * stiffness;

  velocity += springForce;
  velocity *= damping;
  position += velocity;

  dot.style.transform = "translateX(" + position + "px)";
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Code walkthrough

**`let position = 0; let velocity = 0;`**
- Two separate tracked quantities — **this is the core structural idea of
  this section**: position alone (everything from Lessons 20-24) isn't
  enough to model a spring; you need velocity too, because a spring's
  *future* motion depends on how fast it's *currently* moving, not just
  where it currently is.

**`const distanceToTarget = target - position; const springForce = distanceToTarget * stiffness;`**
- **This is Hooke's Law**, a real physics formula: a spring's pulling
  force is proportional to how far it's displaced from its resting point
  — the further from `target`, the stronger the pull back toward it.
  `stiffness` (0.1 here) controls how strong that pull is — a real,
  physical-feeling parameter, not an arbitrary tuning knob: higher
  stiffness genuinely means a "stiffer," snappier spring.

**`velocity += springForce;`**
- **This is the derivative relationship, applied in reverse — going from
  Section 3's "position tells you rate of change" to "rate of change
  updates position."** Force changes velocity (this is Newton's second
  law, `F = ma`, simplified here by treating mass as `1`); velocity, in
  turn, changes position (the next line). This two-step chain — force
  affects velocity, velocity affects position — is the standard structure
  of essentially all physics-based animation, and it directly mirrors the
  derivative relationship from Section 3 read in the opposite direction:
  there, you computed a rate of change *from* position data; here, you're
  using a rate of change *to produce* new position data, frame by frame.

**`velocity *= damping;`**
- Without this line, the spring would oscillate **forever**, never
  settling (real, undamped springs are a genuine, if idealized, physical
  possibility — but visually useless for UI). `damping` (0.8) shrinks
  velocity slightly every frame, bleeding off energy over time so the
  spring eventually comes to rest at `target` — `damping` closer to `1`
  means less energy loss per frame (bouncier, longer-oscillating); closer
  to `0` means more loss (heavily damped, barely any bounce at all).

**`position += velocity;`**
- The direct, familiar accumulation pattern from Lesson 5's ball movement
  — nothing new about this specific line; what's new is that `velocity`
  itself is no longer constant (as it was for Pong's ball) but is
  continuously recalculated every frame from the spring force.

### What happens

Starting at `position = 0` with `target = 200`, the spring force pulls
`position` toward `200`, but because velocity accumulates and only slowly
loses energy via damping, the dot doesn't move directly to `200` and stop —
it overshoots past `200`, gets pulled back by the now-reversed spring
force, overshoots slightly less on the way back, and gradually settles —
genuine, physically-motivated oscillation, distinct from any single fixed
`cubic-bezier` curve, because this motion is recomputed live from physics
every frame rather than following one predetermined shape.

## 6. Trap

Predict, then test: set `damping = 1` (no energy loss at all) and watch
what happens over a longer period than you might initially wait for.

Run it — the dot oscillates back and forth around `200` and **never
actually settles**, continuing indefinitely (in a real, undamped physical
spring, this is completely accurate — perpetual oscillation is exactly
correct physics; it just happens to be useless for a UI element that's
supposed to eventually stop). **The trap: `damping = 1` isn't a bug, and
it isn't "no damping" being unrealistic — it's literally correct spring
physics with zero energy loss, which is a real, describable physical
scenario, just not the one you usually want for an interface.** This is
worth sitting with specifically because it demonstrates the formula is
genuinely modeling real physics, not just producing an arbitrary
"animation effect" — the *parameters* determine whether the result looks
useful for UI, not the underlying formula itself being right or wrong.

## 7. Exercise

- **Predict:** If `stiffness` were increased to `0.3` (keeping `damping`
  at `0.8`), would you expect the spring to reach `target` faster or
  slower, and would you expect more or fewer visible oscillations before
  settling? Test to check.
- **Modify:** Make `target` change dynamically — e.g. set it to the mouse's
  `clientX` position inside a `mousemove` listener — producing an element
  that springs toward wherever you last clicked or moved, rather than a
  single fixed point.
- **Break:** Set `damping` above `1` (e.g. `1.05`). What happens to the
  oscillation's size over time, and can you explain it using the
  "velocity shrinks/grows each frame" description above?
- **Trace:** Using `slopeAt` from Section 3, compute the derivative of
  `easeOutQuad` at `t = 0.5` (the midpoint) — is it larger or smaller than
  its derivative at `t = 0.05`? Does this match or contradict "starts fast,
  slows down" as a description of the whole curve's shape?

## What to remember
- A derivative is `(change in output) / (change in tiny change in input)`
  — the instantaneous rate of change at one specific point, not an average
  over the whole curve.
- Easing curves "feeling" fast or slow at different points is precisely
  their derivative being larger or smaller there — a real number, not just
  a verbal description.
- Spring physics (Hooke's law: force proportional to displacement) tracks
  velocity *and* position together, using force to update velocity, and
  velocity to update position, every frame — genuinely different from a
  fixed easing curve.
- `damping = 1` is real, correct, undamped physics — perpetual oscillation
  is the physically accurate result, not a bug, just usually not what a UI
  needs.

## Next lesson
Lesson 26 goes the other mathematical direction — integration: given a
changing *rate* (like acceleration), how do you accumulate it into
velocity, and velocity into position, building a genuine gravity/bounce
animation from first principles.
