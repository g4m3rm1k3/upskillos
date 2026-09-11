# Lesson 26 — Calculus II: Integration & Physics-Based Motion

## What you'll learn
- Integration as the inverse of Lesson 25's derivative — accumulating a
  rate of change back into a total, instead of extracting a rate from a
  total
- Why `position += velocity; velocity += acceleration;` (an accumulation
  pattern you've actually already used, repeatedly, since Lesson 5) *is*
  numerical integration, whether or not it was named that at the time
- Building real gravity — constant downward acceleration — and a bounce
  that loses energy realistically on each impact
- Why smaller time-steps produce more accurate physics, connecting directly
  back to Lesson 25's `epsilon`

## What you'll build
A ball dropped from the top of the screen, falling under constant gravity,
bouncing with realistic energy loss on each impact, eventually coming to
rest — built entirely from accumulation, no keyframes, no fixed curve.

## The question
Lesson 25 went from **position data** to a **rate of change** (a
derivative) by dividing a small change in output by a small change in
input. This lesson asks the reverse question: if you *already know* the
rate of change at every instant (say, gravity is a constant, known
acceleration), how do you work backward to find the actual position over
time?

## 1. Predict

You already wrote `this.x += this.speedX;` in Lesson 5's Pong, and
`state.ballX += state.ballSpeedX;` conceptually in several lessons since.
Predict: is repeatedly adding a rate of change to a running total, once per
frame, actually mathematically related to "integration" as a formal
concept, or is it just a coincidentally similar-looking pattern with no
real connection?

## 2. Try it

```js
let position = 0;
let velocity = 5;

const dt = 1;

for (let frame = 0; frame < 5; frame++) {
  position += velocity * dt;
  console.log("frame", frame, "position:", position);
}
```

### What this code does

**`let position = 0; let velocity = 5;`**
- `velocity` here is **constant** — not itself changing frame to frame,
  deliberately, to isolate exactly one accumulation step before Section 3
  adds a second one (acceleration affecting velocity too).

**`const dt = 1;`**
- `dt` — **conventional shorthand for "delta time," the size of one time
  step.** Set to `1` here for the simplest possible case (each loop
  iteration represents exactly "1 unit of time"). This variable is new
  compared to every accumulation you've written before now, because those
  earlier lessons (Pong, Snake) implicitly assumed each `requestAnimationFrame`
  tick was "one unit of time" without ever naming or questioning that
  assumption directly — this lesson is about making that assumption
  explicit and examining what happens when it's wrong (Section 6).

**`position += velocity * dt;`**
- **This is numerical integration, precisely, and it directly answers your
  Predict question: yes, this pattern is a real instance of integration,
  not a coincidental resemblance.** Formally, integration finds the "area
  under a curve" of a rate-of-change function — and accumulating
  `velocity * dt` repeatedly, once per small time step, *is* exactly how
  you'd approximate that area numerically: each step contributes a thin
  rectangular slice (`velocity` tall, `dt` wide) to a running total, and
  summing many thin slices approximates the true continuous accumulation.
  This specific technique has a name — **Euler integration** (after
  mathematician Leonhard Euler) — the simplest, most common approach used
  in real-time animation/games specifically because it's cheap to compute
  every single frame, even though (as Section 6 shows) it's not perfectly
  accurate.

### What happens

Position increases by exactly `5` each iteration (`0, 5, 10, 15, 20`) —
unsurprising for constant velocity, but worth seeing explicitly stated as
"integration" for a case simple enough to verify by hand, before the next
section adds a second, non-constant layer.

## 3. Why — acceleration, integrated twice

```js
let position = 0;
let velocity = 0;
const acceleration = 9.8;
const dt = 0.1;

for (let frame = 0; frame < 5; frame++) {
  velocity += acceleration * dt;
  position += velocity * dt;
  console.log("frame", frame, "velocity:", velocity.toFixed(2), "position:", position.toFixed(2));
}
```

**`const acceleration = 9.8;`**
- Real Earth gravity, in meters per second squared (a real physical
  constant, not an arbitrary number chosen for this lesson — worth knowing
  it's genuinely the same number used in physics generally, just reused
  here for a CSS pixel context where "meters" and "pixels" are being
  treated as interchangeable units for simplicity).

**`velocity += acceleration * dt;`** (the new line, before position's own
update)
- **This is the exact same integration pattern from Section 2, applied one
  level "earlier": acceleration accumulates into velocity, just as
  velocity accumulates into position.** This is **integration applied
  twice in sequence** — acceleration → velocity is one integration step;
  velocity → position is a second, separate integration step, chained
  together. This directly mirrors Lesson 25's `springForce` → `velocity` →
  `position` chain, except there the "acceleration" (spring force) changed
  every frame based on position; here it's simply constant (gravity never
  changes).

**Order matters here, concretely**: `velocity` is updated **before**
`position` uses it, within the same frame — meaning `position` always uses
the *newly updated* velocity, not the previous frame's value. This specific
ordering choice (update velocity first, then use the new velocity for
position) is itself a standard convention, sometimes called "semi-implicit
Euler," slightly more stable than the alternative — worth knowing this
detail exists as a real, non-arbitrary choice, without needing to derive
why it's more stable here.

### Mental model

```
acceleration (constant, or computed each frame)
   ↓  integrate (accumulate × dt)
velocity
   ↓  integrate (accumulate × dt)
position
```

Compare directly to Lesson 25's mental model, which went the **opposite**
direction — position data → derivative → rate of change. This lesson's
chain is that exact relationship, run in reverse: known rates → integrated
→ actual position.

## 4. Change one thing

```diff
-const dt = 0.1;
+const dt = 0.01;
```

**What changed:** the time step, ten times smaller.
**What did not change:** `acceleration`'s value, or the accumulation
formulas themselves.
**Predict, then verify**: with the same `for` loop's 5 iterations, the ball
travels a much shorter total distance — because each individual step now
represents a much smaller slice of real time. **This isn't a bug or an
inconsistency; it's the direct, expected consequence of `dt` meaning "how
much real time this one step represents."** To simulate the *same* total
elapsed time with a smaller `dt`, you'd need **more iterations** (Section
6 explores what happens if you don't adjust for this correctly).

## 5. Put it in the project — a bouncing, energy-losing ball

```js
const ball = document.getElementById("ball");

let position = 0;
let velocity = 0;
const gravity = 1500;
const groundY = 400;
const bounceLoss = 0.7;
let lastTime = performance.now();

function loop(currentTime) {
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  velocity += gravity * dt;
  position += velocity * dt;

  if (position >= groundY) {
    position = groundY;
    velocity *= -bounceLoss;
  }

  ball.style.transform = "translateY(" + position + "px)";
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Code walkthrough — new pieces beyond Section 3

**`let lastTime = performance.now(); const dt = (currentTime - lastTime) / 1000;`**
- **This replaces the fixed, assumed `dt` from every earlier section with a
  real, measured one.** `performance.now()` (new here) returns a
  high-precision current timestamp in milliseconds — similar in spirit to
  the `timestamp` argument `requestAnimationFrame` already passed you back
  in Lesson 20, but usable outside that callback too. Computing `dt` as the
  *actual* elapsed time since the last frame (rather than assuming every
  frame takes exactly the same amount of time) makes the simulation
  correct even if the browser's frame rate genuinely fluctuates — a real,
  important refinement over every earlier lesson's implicit "assume 60fps"
  assumption.

**`if (position >= groundY) { position = groundY; velocity *= -bounceLoss; }`**
- Collision detection against a fixed floor (conceptually similar to
  Lesson 5's Pong wall-bounce, `speedY *= -1`) — but here,
  `velocity *= -bounceLoss` (with `bounceLoss = 0.7`) doesn't just reverse
  direction, it also **shrinks** the velocity to 70% of its pre-bounce
  magnitude. **This is the entire mechanism behind the ball losing energy
  on each bounce and eventually settling** — a perfectly elastic bounce
  (`bounceLoss = 1`) would bounce forever at the same height, exactly
  analogous to Lesson 25's `damping = 1` never settling.
- `position = groundY;` (clamping position exactly to the ground) prevents
  the ball from visually sinking slightly below the floor before the
  velocity reversal takes effect — a small but real correctness detail:
  without it, a large `dt` could let `position` overshoot past `groundY`
  in a single step before the bounce check catches it.

### What happens

The ball starts at rest, gravity continuously integrates into increasing
downward velocity, velocity integrates into increasing downward position,
and each time it reaches the ground, velocity reverses and shrinks —
producing decreasing bounce heights over time, purely from accumulated
physics, no predetermined curve or keyframe describing the bounce shape at
all.

## 6. Trap

Predict, then test: temporarily hardcode `const dt = 0.5;` (a large,
fixed, unrealistic time step) instead of computing it from real elapsed
time, keeping everything else the same.

Run it. **The trap: the ball's motion becomes visibly choppy, and it may
appear to "tunnel" partway through or past the ground before the bounce
check registers, or bounce to an unrealistic, inconsistent height.** This
is a genuine, well-known limitation of Euler integration specifically:
**larger `dt` values accumulate more error per step**, because each step
assumes velocity/acceleration stay constant *during* that entire step,
which becomes a worse and worse approximation as the step gets larger —
directly connecting back to Lesson 25's `epsilon`, where a smaller gap
produced a more accurate derivative approximation for exactly the same
underlying reason: smaller steps mean the "assume it's roughly constant/
straight over this tiny span" approximation holds more truly. **This is
precisely why using the real, measured `dt` (Section 5) rather than a
large assumed constant matters for correctness, not just realism.**

## 7. Exercise

- **Predict:** If `bounceLoss` were `1.0` (no energy loss at all), would
  the ball ever stop bouncing? Compare this directly, in your own words, to
  Lesson 25's `damping = 1` trap — are they the same underlying idea,
  applied to two different physics scenarios?
- **Modify:** Add horizontal motion too — a constant horizontal velocity,
  integrated into horizontal position alongside the existing vertical
  physics, producing a ball that bounces *while* also traveling sideways
  (a real projectile-motion simulation).
- **Break:** Set `gravity` to a negative number. What happens to the
  ball's motion, and can you explain why using the accumulation chain
  (acceleration → velocity → position) rather than just observing the
  visual result?
- **Trace:** Using Section 3's `for` loop code (fixed `dt = 0.1`, 5
  iterations), compute `velocity` and `position` by hand at each iteration
  — confirm your hand-computed numbers match what the code actually logs.

## What to remember
- Integration accumulates a rate of change into a total — `position +=
  velocity * dt` is genuinely, formally integration (specifically Euler
  integration), not just a pattern that happens to resemble it.
- Chaining two integration steps (acceleration → velocity → position)
  models real physics like gravity; this is the same accumulation shape
  Lesson 25's spring used, just with a constant rather than a
  position-dependent force.
- Real, measured `dt` (from `performance.now()` or `requestAnimationFrame`'s
  timestamp) produces correct physics regardless of actual frame rate;
  assuming a fixed `dt` breaks down, visibly, at low frame rates or large
  steps.
- Smaller time steps produce more accurate integration, for the identical
  underlying reason smaller `epsilon` produced more accurate derivatives in
  Lesson 25 — both are approximating a continuous, smooth process using
  small discrete steps.

## Next lesson
Lesson 27 — the final lesson — covers interpolation (`lerp`) properly, and
has you build your own easing function completely from scratch, tying
together derivatives, integration, vectors, and matrices from this entire
math track into one final small project.
